import { expect } from '@playwright/test'

export const PASSWORD = 'Test1234!'

// Unique per run + browser so desktop and iPhone runs never share a test user.
export const uniqueEmail = (testInfo, label) =>
  `e2e+${label}-${testInfo.project.name}-${Date.now().toString(36)}@pixelora.test`

// Fails the test if the page logs any console error/warning or throws.
export function watchConsole(page) {
  const problems = []
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      const text = msg.text()
      // A 401 from /api/auth/me is the normal "not logged in" answer; browsers log failed requests.
      if (/status of 401/.test(text)) return
      problems.push(`${msg.type()}: ${text}`)
    }
  })
  page.on('pageerror', (err) => {
    if (/due to access control checks/.test(err.message)) return
    problems.push(`pageerror: ${err.message}`)
  })
  return problems
}

export const isMobile = (testInfo) => testInfo.project.name === 'iphone'

// Opens the cart via the navbar (desktop) or bottom nav (phone).
export async function openCart(page) {
  await page.getByRole('button', { name: /^open cart/i }).first().click()
  await expect(page.getByRole('dialog', { name: /your cart/i })).toBeVisible()
}

export async function signUp(page, { name, email }) {
  await page.getByLabel('Full name').fill(name)
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()
}

// Pays on Stripe Checkout. Offline it's the local stand-in page; with real Stripe test keys it's
// checkout.stripe.com (fields below are Stripe's hosted-page inputs).
export async function payWithTestCard(page) {
  await page.waitForURL(/mock-checkout|checkout\.stripe\.com/, { timeout: 30_000 })
  if (page.url().includes('mock-checkout')) {
    await page.getByLabel('Card number').fill('4242 4242 4242 4242')
    await page.getByRole('button', { name: 'Pay' }).click()
    return
  }
  await page.locator('#cardNumber').fill('4242424242424242')
  await page.locator('#cardExpiry').fill('12 / 34')
  await page.locator('#cardCvc').fill('123')
  await page.locator('#billingName').fill('Test Buyer')
  const zip = page.locator('#billingPostalCode')
  if (await zip.isVisible().catch(() => false)) await zip.fill('10001')
  await page.locator('button[type="submit"]').click()
}
