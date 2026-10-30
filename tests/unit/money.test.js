import { describe, it, expect } from 'vitest'
import { computeTotals, formatCents, lineTotal } from '../../src/lib/money.js'

describe('computeTotals', () => {
  it('adds several products with quantities', () => {
    const items = [{ priceCents: 1500, quantity: 2 }, { priceCents: 4500, quantity: 1 }, { priceCents: 900, quantity: 3 }]
    expect(computeTotals(items)).toEqual({ subtotal: 10200, discount: 0, total: 10200 })
  })

  it('applies a 10% discount', () => {
    expect(computeTotals([{ priceCents: 1500, quantity: 1 }, { priceCents: 1800, quantity: 1 }], 10)).toEqual({ subtotal: 3300, discount: 330, total: 2970 })
  })

  it('rounds to whole cents (never half-cents)', () => {
    // 10% of $9.99 is 99.9 cents -> 100 cents.
    const r = computeTotals([{ priceCents: 999, quantity: 1 }], 10)
    expect(r).toEqual({ subtotal: 999, discount: 100, total: 899 })
    for (let cents = 1; cents <= 5000; cents += 37) {
      for (const pct of [5, 10, 15, 33, 50]) {
        const t = computeTotals([{ priceCents: cents, quantity: 1 }], pct)
        expect(Number.isInteger(t.subtotal) && Number.isInteger(t.discount) && Number.isInteger(t.total)).toBe(true)
        expect(t.subtotal - t.discount).toBe(t.total)
      }
    }
  })

  it('is never negative and never NaN, whatever the input', () => {
    const weird = [
      [[{ priceCents: -500, quantity: 1 }], 10],
      [[{ priceCents: 1000, quantity: -2 }], 10],
      [[{ priceCents: NaN, quantity: 1 }], 10],
      [[{ priceCents: 1000, quantity: 1 }], 150],
      [[{ priceCents: 1000, quantity: 1 }], -20],
      [[{ priceCents: 1000, quantity: 1 }], NaN],
      [[{ priceCents: undefined, quantity: undefined }], undefined],
      [[], 10],
      [undefined, 10],
    ]
    for (const [items, pct] of weird) {
      const t = computeTotals(items, pct)
      for (const v of Object.values(t)) {
        expect(Number.isNaN(v)).toBe(false)
        expect(v).toBeGreaterThanOrEqual(0)
      }
    }
    expect(computeTotals([{ priceCents: 1000, quantity: 1 }], 150).total).toBe(0)
  })

  it('lineTotal ignores fractional or invalid quantities', () => {
    expect(lineTotal(1000, 1.5)).toBe(0)
    expect(lineTotal(1000, 3)).toBe(3000)
  })
})

describe('formatCents', () => {
  it.each([
    [900, '$9.00'],
    [905, '$9.05'],
    [4500, '$45.00'],
    [7900, '$79.00'],
    [2970, '$29.70'],
    [0, '$0.00'],
    [123456, '$1,234.56'],
  ])('%i -> %s', (cents, text) => {
    expect(formatCents(cents)).toBe(text)
  })

  it('shows $0.00 rather than $NaN for bad input', () => {
    expect(formatCents(NaN)).toBe('$0.00')
    expect(formatCents(undefined)).toBe('$0.00')
  })

  it('never shows more than two decimals', () => {
    expect(formatCents(999.6)).toBe('$10.00')
    expect(formatCents(1)).toBe('$0.01')
  })
})
