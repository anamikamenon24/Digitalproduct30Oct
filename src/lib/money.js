// Money helpers shared by the browser and the API, so both always agree on totals.
// All amounts are integer cents; percentages are whole numbers (10 = 10%).

const toCents = (n) => (Number.isFinite(n) ? Math.round(n) : 0)

export function lineTotal(priceCents, quantity = 1) {
  const qty = Number.isInteger(quantity) && quantity > 0 ? quantity : 0
  return Math.max(0, toCents(priceCents)) * qty
}

// items: [{ priceCents, quantity }]. Returns integer cents that are never negative or NaN.
export function computeTotals(items = [], percentOff = 0) {
  const subtotal = items.reduce((sum, i) => sum + lineTotal(i.priceCents, i.quantity), 0)
  const pct = Number.isFinite(percentOff) ? Math.min(100, Math.max(0, percentOff)) : 0
  // Round half up to a whole cent; never discount more than the subtotal.
  const discount = Math.min(subtotal, Math.round((subtotal * pct) / 100))
  return { subtotal, discount, total: subtotal - discount }
}

const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })

// 900 -> "$9.00". Invalid input shows "$0.00" rather than "$NaN".
export const formatCents = (cents) => formatter.format(Number.isFinite(cents) ? Math.round(cents) / 100 : 0)
