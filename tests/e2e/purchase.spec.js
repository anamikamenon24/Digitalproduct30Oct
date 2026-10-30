import { test, expect } from '@playwright/test'
import { watchConsole, uniqueEmail, openCart, signUp, payWithTestCard, PASSWORD } from './helpers.js'

// The full buyer journey, in order: cart while logged out -> sign up -> WELCOME10 -> pay -> library
// -> download -> account -> review -> logout.
test.describe.configure({ mode: 'serial' })

const PRODUCTS = [
  { slug: 'pixel-mono', title: 'Pixel Mono', cents: 1500 },
  { slug: 'golden-hour-presets', title: 'Golden Hour Collection', cents: 1800 },
]
// $15.00 + $18.00 = $33.00, minus 10% ($3.30) = $29.70
const EXPECTED_TOTAL = '$29.70'

test('full purchase journey', async ({ page, context }, testInfo) => {
  test.setTimeout(180_000) // a long, many-page journey; WebKit on Windows is slower
  const problems = watchConsole(page)
  const reviewText = `Crisp pixels, great for my game UI! (${testInfo.project.name})`
  const email = uniqueEmail(testInfo, 'buyer')

  // 1. Add two products to the cart while logged out.
  for (const p of PRODUCTS) {
    await page.goto(`/product/${p.slug}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(p.title)
    await page.getByRole('button', { name: 'Add to cart' }).filter({ visible: true }).first().click()
    await expect(page.getByRole('status').getByText(`${p.title} added to cart`)).toBeVisible()
  }
  await expect(page.getByRole('button', { name: /^open cart, 2 items/i }).first()).toBeVisible()

  // 2. Refresh: the cart is still there.
  await page.reload()
  await expect(page.getByRole('button', { name: /^open cart, 2 items/i }).first()).toBeVisible()

  // 3. Apply WELCOME10 in the cart drawer; a wrong code shows an error first.
  await openCart(page)
  const drawer = page.getByRole('dialog', { name: /your cart/i })
  await drawer.getByLabel('Discount code').fill('NOTACODE')
  await drawer.getByRole('button', { name: 'Apply' }).click()
  await expect(drawer.getByRole('alert')).toContainText(/isn't valid/)
  await drawer.getByLabel('Discount code').fill('welcome10')
  await drawer.getByRole('button', { name: 'Apply' }).click()
  await expect(drawer.getByText('WELCOME10 applied')).toBeVisible()
  await expect(drawer.getByText(EXPECTED_TOTAL)).toBeVisible()

  // 4. Checkout asks to log in; switch to sign up; the cart is kept.
  await drawer.getByRole('button', { name: 'Checkout' }).click()
  await expect(page).toHaveURL(/\/login\?next=%2Fcheckout/)
  await expect(page.getByText(/Your cart \(2 items\) is saved/)).toBeVisible()
  await page.getByRole('link', { name: 'Create an account' }).click()
  await expect(page).toHaveURL(/\/signup\?next=%2Fcheckout/)
  await signUp(page, { name: 'Test Buyer', email })
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.getByTestId('checkout-total')).toHaveText(EXPECTED_TOTAL)
  await expect(page.getByText(email)).toBeVisible()

  // 5. Pay with the Stripe test card -> success page with confetti, only once the order is paid.
  await page.getByRole('button', { name: `Pay ${EXPECTED_TOTAL}` }).click()
  await payWithTestCard(page)
  await expect(page).toHaveURL(/\/success\/PX-/, { timeout: 30_000 })
  await expect(page.getByRole('heading', { name: /You're all set!/ })).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('success-total')).toHaveText(EXPECTED_TOTAL)
  await expect(page.locator('body > canvas')).toHaveCount(1) // canvas-confetti draws on a body-level canvas
  const orderNumber = (page.url().match(/PX-[A-Z0-9]+/) || [])[0]
  expect(orderNumber).toBeTruthy()
  await expect(page.getByRole('button', { name: /^open cart, 0 items/i }).first()).toBeVisible() // cart cleared after paying

  // 6. My Library shows both products, and a download works.
  await page.goto('/library')
  for (const p of PRODUCTS) await expect(page.getByRole('link', { name: p.title, exact: true })).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('link', { name: 'Download Pixel Mono' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('pixel-mono-sample.txt')
  const body = await (await page.request.get((await page.getByRole('link', { name: 'Download Pixel Mono' }).getAttribute('href')))).text()
  expect(body).toContain('Pixel Mono')

  // 7. Account shows the order as paid with the right total.
  await page.goto('/account')
  const row = page.getByTestId('order-row').filter({ hasText: orderNumber })
  await expect(row).toContainText('Paid')
  await expect(row).toContainText(EXPECTED_TOTAL)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Test Buyer')

  // 8. Leave a review and see it on the product page.
  await page.goto('/product/pixel-mono')
  await page.getByRole('button', { name: '5 stars' }).click()
  await page.getByLabel(/Your review/).fill(reviewText)
  await page.getByRole('button', { name: 'Post review' }).click()
  await expect(page.getByText(reviewText)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Post review' })).toHaveCount(0) // one review per product

  // 9. The data survives a refresh.
  await page.reload()
  await expect(page.getByText(reviewText)).toBeVisible()

  // 10. Log out: protected pages send you to log in, and the file can't be downloaded any more.
  await page.goto('/account')
  await page.getByRole('main').getByRole('button', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/$/)
  for (const path of ['/library', '/account', '/checkout']) {
    await page.goto(path)
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path)}`))
  }
  const libraryRes = await page.request.get('/api/library')
  expect(libraryRes.status()).toBe(401)

  // 11. Logging back in restores everything (data is stored in the database, not the browser).
  await context.clearCookies()
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page).toHaveURL(/\/account$/)
  await page.goto('/library')
  await expect(page.getByRole('link', { name: 'Pixel Mono', exact: true })).toBeVisible()

  expect(problems).toEqual([])
})

test('another user cannot download someone else\'s purchase', async ({ browser }, testInfo) => {
  const baseURL = testInfo.project.use.baseURL
  const ctx = await browser.newContext({ baseURL })
  const page = await ctx.newPage()
  await page.goto('/signup')
  await signUp(page, { name: 'Other Person', email: uniqueEmail(testInfo, 'other') })
  await expect(page).toHaveURL(/\/account$/)
  const products = await (await page.request.get('/api/products?q=pixel%20mono')).json()
  const id = products.products[0].productId
  const res = await page.request.get(`/api/download/${id}`)
  expect(res.status()).toBe(403)
  expect(await res.text()).not.toContain('Pixel Mono\nby')
  await page.goto('/library')
  await expect(page.getByText('Your library is empty')).toBeVisible()
  await ctx.close()

  const anon = await browser.newContext({ baseURL })
  const res2 = await anon.request.get(`/api/download/${id}`, { failOnStatusCode: false })
  expect(res2.status()).toBe(401)
  await anon.close()
})
