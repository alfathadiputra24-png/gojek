import crypto from 'node:crypto';

export interface TlvNode {
  tag: string;
  length: number;
  value: string;
}

export interface ValidateStaticOptions {
  expectedMerchantName?: string;
  expectedNmid?: string;
}

export interface QrisValidationResult {
  valid: true;
  nodes: TlvNode[];
  pointOfInitiation: string;
  merchantName: string;
  merchantCity: string;
  nmid: string;
  crc: string;
}

/**
 * CRC16-CCITT-FALSE:
 * Polynomial: 0x1021, Initial Value: 0xFFFF, No XOR out, No reflection.
 */
export function crc16ccitt(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= (input.charCodeAt(i) & 0xff) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Parse EMVCo TLV string (2-digit numeric tag, 2-digit decimal length, value).
 */
export function parseTLV(payload: string): TlvNode[] {
  if (typeof payload !== 'string' || payload.length === 0) {
    throw new Error('Payload QRIS kosong.');
  }
  const nodes: TlvNode[] = [];
  let cursor = 0;
  while (cursor < payload.length) {
    if (cursor + 4 > payload.length) {
      throw new Error(`Segment TLV tidak lengkap pada indeks ${cursor}.`);
    }
    const tag = payload.slice(cursor, cursor + 2);
    const lenStr = payload.slice(cursor + 2, cursor + 4);
    if (!/^\d{2}$/.test(tag) || !/^\d{2}$/.test(lenStr)) {
      throw new Error(`Tag atau panjang TLV tidak valid pada indeks ${cursor} ("${tag}${lenStr}").`);
    }
    const length = Number.parseInt(lenStr, 10);
    if (cursor + 4 + length > payload.length) {
      throw new Error(`Panjang TLV melebihi payload pada tag ${tag} (indeks ${cursor}).`);
    }
    const value = payload.slice(cursor + 4, cursor + 4 + length);
    nodes.push({ tag, length, value });
    cursor += 4 + length;
  }
  return nodes;
}

export function serializeTLV(nodes: TlvNode[]): string {
  return nodes
    .map((n) => {
      const len = String(n.value.length).padStart(2, '0');
      if (n.value.length > 99) {
        throw new Error(`Nilai tag ${n.tag} melebihi batas 99 karakter EMVCo.`);
      }
      return `${n.tag}${len}${n.value}`;
    })
    .join('');
}

function normalizeMerchantText(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toUpperCase();
}

function validateCoreQris(
  payload: string,
  expectedPoi: '11' | '12' | 'any',
  options: ValidateStaticOptions = {}
): QrisValidationResult {
  if (typeof payload !== 'string' || !payload.trim()) {
    throw new Error('QRIS_STATIC_PAYLOAD belum dikonfigurasi atau kosong.');
  }
  const trimmed = payload.trim();

  if (!trimmed.startsWith('000201')) {
    throw new Error('Payload QRIS harus diawali dengan "000201".');
  }

  if (trimmed.length < 16 || trimmed.slice(-8, -4) !== '6304') {
    throw new Error('Tag CRC "6304" tidak ditemukan pada akhir payload QRIS.');
  }

  const nodes = parseTLV(trimmed);
  const lastNode = nodes[nodes.length - 1];
  if (!lastNode || lastNode.tag !== '63' || lastNode.length !== 4) {
    throw new Error('Tag 63 (CRC) harus berada di akhir payload dengan panjang 4 karakter.');
  }

  const declaredCrc = lastNode.value.toUpperCase();
  const bodyWith6304 = trimmed.slice(0, -4);
  const computedCrc = crc16ccitt(bodyWith6304);
  if (declaredCrc !== computedCrc) {
    throw new Error(`Checksum CRC QRIS tidak cocok (terbaca ${declaredCrc}, seharusnya ${computedCrc}).`);
  }

  const poiNode = nodes.find((n) => n.tag === '01');
  if (!poiNode) {
    throw new Error('Tag 01 (Point of Initiation Method) tidak ditemukan.');
  }
  if (expectedPoi !== 'any' && poiNode.value !== expectedPoi) {
    throw new Error(
      `Tag 01 harus bernilai "${expectedPoi}" (${expectedPoi === '11' ? 'QRIS Statis' : 'QRIS Dinamis'}), terbaca "${poiNode.value}".`
    );
  }
  if (poiNode.value !== '11' && poiNode.value !== '12') {
    throw new Error(`Nilai tag 01 tidak valid ("${poiNode.value}").`);
  }

  const merchantName = nodes.find((n) => n.tag === '59')?.value.trim() || '';
  if (!merchantName) {
    throw new Error('Tag 59 (Merchant Name) tidak ditemukan pada payload QRIS.');
  }

  const expectedMerchant = options.expectedMerchantName ?? 'ALSTOREE, KESEHATAN & OLAHRAGA';
  if (expectedMerchant.trim()) {
    const actualNorm = normalizeMerchantText(merchantName);
    const expectedNorm = normalizeMerchantText(expectedMerchant);
    // EMVCo Tag 59 allows up to 25 chars; real GoPay stickers truncate >25-char names cleanly
    const expectedPrefix25 = expectedNorm.slice(0, 25).trim();
    const firstWord = expectedNorm.split(/[\s,]+/)[0] || expectedNorm;
    const matches =
      actualNorm.includes(expectedNorm) ||
      (expectedPrefix25.length >= 6 && actualNorm.includes(expectedPrefix25)) ||
      (firstWord.length >= 4 && actualNorm.includes(firstWord));
    if (!matches) {
      throw new Error(
        `Tag 59 merchant name ("${merchantName}") tidak sesuai dengan merchant yang diharapkan ("${expectedMerchant}").`
      );
    }
  }

  const expectedNmid = (options.expectedNmid ?? 'ID1026484173624').trim().toUpperCase();
  const merchantAccountNodes = nodes.filter((n) => {
    const num = Number.parseInt(n.tag, 10);
    return num >= 26 && num <= 51;
  });
  if (merchantAccountNodes.length === 0) {
    throw new Error('Tag informasi akun merchant (26-51) tidak ditemukan pada payload QRIS.');
  }

  let foundNmid = '';
  for (const acc of merchantAccountNodes) {
    if (acc.value.toUpperCase().includes(expectedNmid)) {
      foundNmid = expectedNmid;
      break;
    }
    try {
      const subNodes = parseTLV(acc.value);
      const sub02 = subNodes.find((s) => s.tag === '02')?.value.trim();
      if (sub02 && /^ID\d{10,}$/i.test(sub02) && !foundNmid) {
        foundNmid = sub02.toUpperCase();
      }
    } catch {
      // ignore non-TLV merchant proprietary tags
    }
  }

  if (expectedNmid && foundNmid !== expectedNmid) {
    throw new Error(
      `NMID "${expectedNmid}" tidak ditemukan dalam tag akun merchant (26/51).`
    );
  }

  const merchantCity = nodes.find((n) => n.tag === '60')?.value.trim() || 'JAKARTA';

  return {
    valid: true,
    nodes,
    pointOfInitiation: poiNode.value,
    merchantName,
    merchantCity,
    nmid: foundNmid || expectedNmid,
    crc: computedCrc,
  };
}

/**
 * Strict startup & pre-conversion validator for static QRIS payloads.
 * Throws a clear Error if any EMVCo / merchant / NMID check fails.
 */
export function validateStatic(
  payload: string,
  options: ValidateStaticOptions = {}
): QrisValidationResult {
  return validateCoreQris(payload, '11', options);
}

/**
 * Re-validates either static ("11") or dynamic ("12") QRIS payloads.
 */
export function validateQris(
  payload: string,
  options: ValidateStaticOptions = {}
): QrisValidationResult {
  return validateCoreQris(payload, 'any', options);
}

/**
 * Converts a validated static QRIS payload into a dynamic QRIS payload with integer Rupiah tag 54.
 */
export function toDynamic(
  payload: string,
  amount: number,
  options: ValidateStaticOptions = {}
): {
  dynamicPayload: string;
  amount: number;
  merchantName: string;
  merchantCity: string;
  nmid: string;
  crc: string;
} {
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) {
    throw new Error('Nominal dinamis QRIS harus berupa bilangan bulat Rupiah > 0 tanpa pemisah.');
  }

  const validated = validateStatic(payload, options);

  // Strip tag 63 (CRC) and any existing tags 54..57 (amount / tip indicators)
  const stripped = validated.nodes.filter(
    (n) => !['54', '55', '56', '57', '63'].includes(n.tag)
  );

  const amountStr = String(amount);
  const amountNode: TlvNode = {
    tag: '54',
    length: amountStr.length,
    value: amountStr,
  };

  const nextNodes: TlvNode[] = [];
  let inserted54 = false;

  for (const node of stripped) {
    if (node.tag === '01') {
      nextNodes.push({ tag: '01', length: 2, value: '12' });
      continue;
    }
    const tagNum = Number.parseInt(node.tag, 10);
    if (!inserted54 && tagNum > 54) {
      nextNodes.push(amountNode);
      inserted54 = true;
    }
    nextNodes.push(node);
  }

  if (!inserted54) {
    nextNodes.push(amountNode);
  }

  const unsignedBody = serializeTLV(nextNodes) + '6304';
  const crc = crc16ccitt(unsignedBody);

  return {
    dynamicPayload: `${unsignedBody}${crc}`,
    amount,
    merchantName: validated.merchantName,
    merchantCity: validated.merchantCity,
    nmid: validated.nmid,
    crc,
  };
}

/**
 * Allocates a unique 1..999 Rupiah code not currently held by any active pending QRIS order.
 */
export function allocateUniqueQrisAmount(params: {
  baseTotal: number;
  usedCodes: ReadonlySet<number>;
  usedAmounts: ReadonlySet<number>;
  enableUniqueCode: boolean;
}): {
  baseTotal: number;
  uniqueCode: number;
  finalAmount: number;
} {
  const baseTotal = Math.round(params.baseTotal);
  if (!Number.isFinite(baseTotal) || baseTotal <= 0) {
    throw new Error('Total tagihan QRIS harus lebih besar dari Rp 0.');
  }

  if (!params.enableUniqueCode) {
    return { baseTotal, uniqueCode: 0, finalAmount: baseTotal };
  }

  const candidates: number[] = [];
  for (let code = 1; code <= 999; code++) {
    if (!params.usedCodes.has(code) && !params.usedAmounts.has(baseTotal + code)) {
      candidates.push(code);
    }
  }

  if (candidates.length === 0) {
    throw new Error('Slot kode unik QRIS (1-999) sedang penuh. Selesaikan atau batalkan pesanan tertunda.');
  }

  const picked = candidates[crypto.randomInt(0, candidates.length)];
  return {
    baseTotal,
    uniqueCode: picked,
    finalAmount: baseTotal + picked,
  };
}

/**
 * Parses an integer Rupiah amount from a raw number or GoPay Merchant notification text
 * (e.g. "Pembayaran QRIS masuk Rp 25.347" or "25347").
 */
export function parseMutationAmount(input: { amount?: unknown; text?: string }): number | null {
  if (typeof input.amount === 'number' && Number.isFinite(input.amount) && input.amount > 0) {
    return Math.round(input.amount);
  }
  if (typeof input.amount === 'string' && input.amount.trim()) {
    const cleaned = input.amount.replace(/,\d{2}$/, '').replace(/[^\d]/g, '');
    const parsed = Number.parseInt(cleaned, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  if (typeof input.text === 'string' && input.text.trim()) {
    const rpMatch = input.text.match(/(?:rp\.?\s*)([\d.,]+)/i);
    const rawNum = rpMatch ? rpMatch[1] : input.text.match(/\b(\d{1,3}(?:[.,]\d{3})+|\d{4,9})\b/)?.[1];
    if (rawNum) {
      const noDecimals = rawNum.replace(/,\d{2}$/, '').replace(/\.\d{2}$/, '');
      const digits = noDecimals.replace(/[^\d]/g, '');
      const parsed = Number.parseInt(digits, 10);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  return null;
}
