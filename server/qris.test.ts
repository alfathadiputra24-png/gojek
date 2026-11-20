import test from 'node:test';
import assert from 'node:assert/strict';
import {
  allocateUniqueQrisAmount,
  crc16ccitt,
  parseMutationAmount,
  parseTLV,
  toDynamic,
  validateQris,
  validateStatic,
} from './qris';

// Exact payload scanned from merchant GoPay QRIS sticker ("ALSTOREE, KESEHATAN & OLAHRAGA", NMID ID1026484173624)
const REAL_GOPAY_STATIC_QRIS =
  '00020101021126610014COM.GO-JEK.WWW01189360091439188017080210G9188017080303UMI51440014ID.CO.QRIS.WWW0215ID10264841736240303UMI5204794153033605802ID5925AlStoree, Kesehatan & Ola6013JAKARTA TIMUR61051335062140703A01110362163040AE2';

test('crc16ccitt matches standard EMVCo check value for "123456789"', () => {
  assert.equal(crc16ccitt('123456789'), '29B1');
});

test('parseTLV parses EMVCo tag-length-value segments accurately', () => {
  const nodes = parseTLV(REAL_GOPAY_STATIC_QRIS);
  assert.equal(nodes[0].tag, '00');
  assert.equal(nodes[0].value, '01');
  assert.equal(nodes.find((n) => n.tag === '01')?.value, '11');
  assert.equal(nodes.find((n) => n.tag === '53')?.value, '360');
  assert.equal(nodes.find((n) => n.tag === '59')?.value, 'AlStoree, Kesehatan & Ola');
  assert.equal(nodes.find((n) => n.tag === '63')?.value, '0AE2');
});

test('validateStatic validates merchant name, NMID, tag 01=11, 000201, and CRC', () => {
  const res = validateStatic(REAL_GOPAY_STATIC_QRIS, {
    expectedMerchantName: 'ALSTOREE, KESEHATAN & OLAHRAGA',
    expectedNmid: 'ID1026484173624',
  });
  assert.equal(res.valid, true);
  assert.equal(res.nmid, 'ID1026484173624');
  assert.equal(res.merchantName, 'AlStoree, Kesehatan & Ola');
  assert.equal(res.merchantCity, 'JAKARTA TIMUR');
});

test('validateStatic throws clear errors on invalid CRC, wrong NMID, wrong merchant, or dynamic tag 01=12', () => {
  assert.throws(
    () => validateStatic(REAL_GOPAY_STATIC_QRIS.slice(0, -4) + 'FFFF'),
    /CRC/i
  );
  assert.throws(
    () => validateStatic(REAL_GOPAY_STATIC_QRIS, { expectedNmid: 'ID9999999999999' }),
    /NMID/i
  );
  assert.throws(
    () => validateStatic(REAL_GOPAY_STATIC_QRIS, { expectedMerchantName: 'TOKO LAIN' }),
    /Tag 59/i
  );
  const { dynamicPayload } = toDynamic(REAL_GOPAY_STATIC_QRIS, 25000);
  assert.throws(() => validateStatic(dynamicPayload), /Tag 01 harus bernilai "11"/);
});

test('toDynamic switches 01=12, strips 54-57 & old 63, inserts 54 between 53 and 58, keeps tag order, and recomputes CRC', () => {
  const result = toDynamic(REAL_GOPAY_STATIC_QRIS, 25347);
  assert.ok(result.dynamicPayload.endsWith(`6304${result.crc}`));

  // Output re-validates
  const revalidated = validateQris(result.dynamicPayload, {
    expectedMerchantName: 'ALSTOREE, KESEHATAN & OLAHRAGA',
    expectedNmid: 'ID1026484173624',
  });
  assert.equal(revalidated.valid, true);
  assert.equal(revalidated.pointOfInitiation, '12');

  const tags = revalidated.nodes.map((n) => n.tag);
  const idx53 = tags.indexOf('53');
  const idx54 = tags.indexOf('54');
  const idx58 = tags.indexOf('58');
  assert.ok(idx53 >= 0 && idx54 === idx53 + 1 && idx58 === idx54 + 1);
  assert.equal(revalidated.nodes[idx54].value, '25347');
  assert.ok(!tags.includes('55') && !tags.includes('56') && !tags.includes('57'));

  // Other tags remain in exact original order
  assert.deepEqual(
    tags.filter((t) => t !== '54'),
    parseTLV(REAL_GOPAY_STATIC_QRIS).map((n) => n.tag)
  );
});

test('toDynamic removes pre-existing tags 55-57 cleanly if present in static payload', () => {
  // Construct a valid static variant containing tag 55=01 before tag 58
  const withoutCrc = REAL_GOPAY_STATIC_QRIS.replace('5802ID', '5502015802ID').slice(0, -4);
  const patchedStatic = withoutCrc + crc16ccitt(withoutCrc);

  const { dynamicPayload } = toDynamic(patchedStatic, 18500);
  const nodes = parseTLV(dynamicPayload);
  assert.equal(nodes.find((n) => n.tag === '55'), undefined);
  assert.equal(nodes.find((n) => n.tag === '54')?.value, '18500');
  assert.equal(validateQris(dynamicPayload).valid, true);
});

test('allocateUniqueQrisAmount assigns unused 1-999 code and prevents collisions', () => {
  const usedCodes = new Set<number>();
  const usedAmounts = new Set<number>();
  for (let i = 1; i <= 998; i++) {
    usedCodes.add(i);
    usedAmounts.add(15000 + i);
  }
  const alloc = allocateUniqueQrisAmount({
    baseTotal: 15000,
    usedCodes,
    usedAmounts,
    enableUniqueCode: true,
  });
  assert.equal(alloc.uniqueCode, 999);
  assert.equal(alloc.finalAmount, 15999);

  const disabled = allocateUniqueQrisAmount({
    baseTotal: 15000,
    usedCodes,
    usedAmounts,
    enableUniqueCode: false,
  });
  assert.equal(disabled.uniqueCode, 0);
  assert.equal(disabled.finalAmount, 15000);
});

test('parseMutationAmount parses Rupiah amounts from GoPay Merchant notifications', () => {
  assert.equal(parseMutationAmount({ text: 'Pembayaran QRIS masuk Rp 25.347 dari GoPay' }), 25347);
  assert.equal(parseMutationAmount({ text: 'Diterima Rp25,347.00' }), 25347);
  assert.equal(parseMutationAmount({ amount: 18421 }), 18421);
});
