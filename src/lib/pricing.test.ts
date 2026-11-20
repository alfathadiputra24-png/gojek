import test from 'node:test';
import assert from 'node:assert/strict';
import { applyVoucher, calculateRideFare, computeOrderTotals, haversineKm } from './pricing';

test('haversineKm returns sensible distance between Monas and Bundaran HI', () => {
  const km = haversineKm(-6.1766, 106.8306, -6.195, 106.823);
  assert.ok(km > 1.8 && km < 3.2, `Expected ~2.2km, got ${km}`);
});

test('calculateRideFare produces deterministic Rupiah pricing', () => {
  const ojek = calculateRideFare('ojek', 3);
  assert.equal(ojek.subtotal, 13000);
  assert.equal(ojek.fee, 2000);

  const taksi = calculateRideFare('taksi', 3);
  assert.equal(taksi.subtotal, 23000);
  assert.equal(taksi.fee, 3000);
});

test('applyVoucher enforces service eligibility, minSubtotal, and maxDiscount', () => {
  const valid = applyVoucher('makan', 60000, 'hemat25');
  assert.equal(valid.discount, 15000);
  assert.equal(valid.appliedCode, 'HEMAT25');

  const wrongService = applyVoucher('ojek', 60000, 'HEMAT25');
  assert.equal(wrongService.discount, 0);
  assert.ok(wrongService.error);

  const tooLow = applyVoucher('makan', 10000, 'HEMAT25');
  assert.equal(tooLow.discount, 0);
  assert.ok(tooLow.error);
});

test('computeOrderTotals combines subtotal, discount, and fee cleanly', () => {
  const res = computeOrderTotals({
    serviceType: 'makan',
    subtotal: 50000,
    fee: 3000,
    voucherCode: 'MAKAN50',
  });
  assert.equal(res.discount, 20000);
  assert.equal(res.total, 33000);
});
