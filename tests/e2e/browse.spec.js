import { test, expect } from '@playwright/test'
import { watchConsole } from './helpers.js'

const CATEGORIES = ['Templates', 'E-books', 'Presets', 'Courses', 'Icons', 'Fonts']
const cardTitles = (page) => page.locator('main a.font-display[href^="/product/"]')

test.describe('Home', () => {
  test('shows the Pixelora brand, headline and tab title; counters animate', async ({ page }) => {
    const problems = watchConsole(page)
    await page.goto('/')
    await expect(page).toHaveTitle(/Pixelora/)
    await expect(page.locator('header').getByText('Pixelora', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Create faster\.\s*Sell smarter\./)
    await expect(page.locator('section').first()).toContainText('Pixelora')
    await expect(page.locator('footer')).toContainText('Pixelora')
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg')

    // The "5-star reviews" counter counts up from 0 to the real database number.
    const stats = await (await page.request.get('/api/stats')).json()
    const shown = page.getByText('5-star reviews').locator('xpath=..').locator('span.tabular-nums > span[aria-hidden]')
    await expect(shown).toHaveText('0')
    const seen = new Set()
    await shown.scrollIntoViewIfNeeded()
    await expect
      .poll(async () => {
        seen.add(Number((await shown.textContent()).replace(/,/g, '')))
        return Math.max(...seen)
      }, { intervals: [50], timeout: 8000 })
      .toBe(stats.fiveStarReviews)
    // At least one in-between value proves it animated rather than jumping straight to the total.
    expect([...seen].some((v) => v > 0 && v < stats.fiveStarReviews)).toBe(true)

    await expect(page.locator('main a[href^="/product/"].font-display')).toHaveCount(4) // featured row
    expect(problems).toEqual([])
  })

  test('"Browse Products" opens the shop', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Browse Products' }).first().click()
    await expect(page).toHaveURL(/\/shop$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/The Shop/)
  })
})

test.describe('Shop', () => {
  test('each category filter shows only that category, and All resets', async ({ page }) => {
    const problems = watchConsole(page)
    await page.goto('/shop')
    await expect(cardTitles(page)).toHaveCount(24)
    for (const c of CATEGORIES) {
      await page.getByRole('button', { name: c, exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`category=${encodeURIComponent(c)}`))
      await expect(page.locator('main [aria-busy="false"]')).toBeVisible()
      await expect(cardTitles(page)).toHaveCount(4)
      await expect
        .poll(async () => [...new Set(await page.locator('main .group span.rounded-full.absolute').allTextContents())])
        .toEqual([c])
    }
    await page.getByRole('button', { name: 'All', exact: true }).click()
    await expect(cardTitles(page)).toHaveCount(24)
    expect(problems).toEqual([])
  })

  test('sorting orders products correctly', async ({ page }) => {
    await page.goto('/shop')
    const prices = async () =>
      (await page.locator('main .group span.text-lg').allTextContents()).map((t) => Number(t.replace(/[$,]/g, '')))
    await page.getByLabel('Sort products').selectOption('price-asc')
    await expect(page).toHaveURL(/sort=price-asc/)
    await expect.poll(async () => (await prices())[0]).toBe(9)
    const asc = await prices()
    expect(asc).toEqual([...asc].sort((a, b) => a - b))
    for (const p of asc) expect(String(p.toFixed(2))).toMatch(/^\d+\.\d{2}$/)

    await page.getByLabel('Sort products').selectOption('price-desc')
    await expect.poll(async () => (await prices())[0]).toBe(79)
    const desc = await prices()
    expect(desc).toEqual([...desc].sort((a, b) => b - a))

    await page.getByLabel('Sort products').selectOption('newest')
    await expect(cardTitles(page).first()).toHaveText('Nova Grotesk Font Family')
  })

  test('prices always show two decimals', async ({ page }) => {
    await page.goto('/shop')
    await expect(page.locator('main .group span.text-lg')).toHaveCount(24)
    const texts = await page.locator('main .group span.text-lg').allTextContents()
    for (const t of texts) expect(t).toMatch(/^\$\d+\.\d{2}$/)
  })

  test('search finds products and shows a friendly empty state', async ({ page }) => {
    await page.goto('/shop')
    await page.getByLabel('Search products').pressSequentially('preset', { delay: 30 })
    await expect(page.getByText(/products? for "preset"/)).toBeVisible()
    await expect(cardTitles(page)).toHaveCount(4)
    await page.getByLabel('Search products').fill('zzqqxx')
    await expect(page.getByText('No matches, yet')).toBeVisible()
    await page.getByRole('link', { name: 'Clear filters' }).click()
    await expect(cardTitles(page)).toHaveCount(24)
  })
})

test.describe('Product detail', () => {
  test('opens from a card; gallery switches images; reviews show', async ({ page }) => {
    const problems = watchConsole(page)
    await page.goto('/shop')
    const first = cardTitles(page).first()
    const title = await first.textContent()
    await first.click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
    await expect(page).toHaveTitle(new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))

    const thumb3 = page.getByRole('button', { name: 'View image 3' })
    await expect(thumb3).toHaveAttribute('aria-pressed', 'false')
    await thumb3.click()
    await expect(thumb3).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'View image 1' })).toHaveAttribute('aria-pressed', 'false')

    await expect(page.getByRole('heading', { name: 'What buyers say' })).toBeVisible()
    expect(await page.getByText('Verified buyer', { exact: false }).count()).toBeGreaterThanOrEqual(3)
    await expect(page.getByRole('heading', { name: 'You may also like' })).toBeVisible()
    expect(problems).toEqual([])
  })

  test('a wrong product link shows "Product not found"', async ({ page }) => {
    await page.goto('/product/not-a-real-product')
    await expect(page.getByText('Product not found')).toBeVisible()
  })
})
