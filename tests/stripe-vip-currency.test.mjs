import test from 'node:test'
import assert from 'node:assert/strict'
import { getVipPriceCents } from '../server/utils/stripe-vip-catalog.mjs'

test('returns the same nominal VIP prices for BRL, USD and EUR', () => {
  assert.equal(getVipPriceCents('monthly', 'BRL'), 2990)
  assert.equal(getVipPriceCents('monthly', 'USD'), 2990)
  assert.equal(getVipPriceCents('monthly', 'EUR'), 2990)
  assert.equal(getVipPriceCents('lifetime', 'BRL'), 10990)
  assert.equal(getVipPriceCents('lifetime', 'USD'), 10990)
  assert.equal(getVipPriceCents('lifetime', 'EUR'), 10990)
})

test('returns no amount for unsupported plan or currency', () => {
  assert.equal(getVipPriceCents('monthly', 'CAD'), null)
  assert.equal(getVipPriceCents('unknown', 'USD'), null)
})
