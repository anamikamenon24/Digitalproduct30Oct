import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { watchConsole, uniqueEmail, signUp, isMobile } from './helpers.js'

const PUBLIC_PAGES = ['/', '/shop', '/shop?category=Fonts', '/product/nova-grotesk', '/login', '/signup', '/nope-404']
const PRIVATE_PAGES = ['/library', '/account', '/checkout']

async function settle(page) {
  await page.waitForLoadState('networkidle')
  // Let entrance animations finish so axe checks final colours/contrast, not mid-fade.
  await page.waitForTimeout(900)
}

test.describe('no console errors or warnings', () => {
  test('public pages', async ({ page }) => {
    const problems = watchConsole(page)
    for (const path of PUBLIC_PAGES) {
      await page.goto(path)
      await settle(page)
    }
    expect(problems).toEqual([])
  })

  test('logged-in pages', async ({ page }, testInfo) => {
    const problems = watchConsole(page)
    await page.goto('/signup')
    await signUp(page, { name: 'Quality Checker', email: uniqueEmail(testInfo, 'quality') })
    await expect(page).toHaveURL(/\/account$/)
    for (const path of [...PRIVATE_PAGES, '/']) {
      await page.goto(path)
      await settle(page)
    }
    expect(problems).toEqual([])
  })
})

test.describe('layout', () => {
  test('no horizontal scrolling at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    for (const path of [...PUBLIC_PAGES]) {
      await page.goto(path)
      await settle(page)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow, `${path} scrolls sideways by ${overflow}px`).toBeLessThanOrEqual(0)
    }
  })

  test('phone shows the bottom nav; desktop shows the top nav', async ({ page }, testInfo) => {
    await page.goto('/')
    const bottomNav = page.locator('nav.fixed.bottom-0')
    const topLinks = page.locator('header ul')
    if (isMobile(testInfo)) {
      await expect(bottomNav).toBeVisible()
      await expect(topLinks).toBeHidden()
    } else {
      await expect(bottomNav).toBeHidden()
      await expect(topLinks).toBeVisible()
    }
  })

  test('phone product page has a sticky add-to-cart bar', async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo), 'phone only')
    await page.goto('/product/nova-grotesk')
    const bar = page.locator('div.fixed.bottom-\\[84px\\]')
    await expect(bar).toBeVisible()
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2))
    await expect(bar).toBeVisible()
    await expect(bar.getByRole('button', { name: 'Add to cart' })).toBeVisible()
  })
})

test.describe('accessibility (axe)', () => {
  for (const theme of ['dark', 'light']) {
    test(`no serious problems in ${theme} mode`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('pixelora-theme', t), theme)
      const report = []
      for (const path of PUBLIC_PAGES) {
        await page.goto(path)
        await settle(page)
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
        for (const v of results.violations.filter((x) => ['serious', 'critical'].includes(x.impact))) {
          report.push(`${path} [${v.id}] ${v.help}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)
        }
      }
      expect(report).toEqual([])
    })
  }

  test('every button and link has a name; images have alt text', async ({ page }) => {
    for (const path of PUBLIC_PAGES) {
      await page.goto(path)
      await settle(page)
      const unnamed = await page.evaluate(() =>
        [...document.querySelectorAll('button, a[href]')]
          .filter((el) => el.getClientRects().length && !el.closest('[aria-hidden="true"]') && el.tabIndex !== -1)
          .filter((el) => !(el.getAttribute('aria-label') || el.textContent.trim() || el.getAttribute('title')))
          .map((el) => el.outerHTML.slice(0, 80)),
      )
      expect(unnamed, path).toEqual([])
      const noAlt = await page.evaluate(() => [...document.querySelectorAll('img:not([alt])')].map((i) => i.src))
      expect(noAlt, path).toEqual([])
    }
  })
})

test.describe('keyboard', () => {
  test('skip link, tabbing to the cart, and Escape closes the drawer', async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo), 'keyboard test runs on desktop')
    await page.goto('/')
    await settle(page)
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()

    const cart = page.getByRole('button', { name: /^open cart/i }).first()
    for (let i = 0; i < 15 && !(await cart.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press('Tab')
    await expect(cart).toBeFocused()
    await page.keyboard.press('Enter')
    const drawer = page.getByRole('dialog', { name: /your cart/i })
    await expect(drawer).toBeVisible()
    await expect(page.getByRole('button', { name: 'Close cart' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
    await expect(cart).toBeFocused() // focus returns to the cart button
  })

  test('the main buttons work from the keyboard', async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo), 'keyboard test runs on desktop')
    await page.goto('/product/pixel-mono')
    await settle(page)
    const add = page.getByRole('button', { name: 'Add to cart' }).first()
    await add.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: /^open cart, [1-9]/i }).first()).toBeVisible()
  })
})

test.describe('SEO', () => {
  test('every page has its own title and a meta description', async ({ page }) => {
    const titles = new Set()
    for (const path of PUBLIC_PAGES) {
      await page.goto(path)
      await settle(page)
      const title = await page.title()
      expect(title, path).toMatch(/Pixelora/)
      titles.add(title)
      const desc = await page.locator('meta[name="description"]').getAttribute('content')
      expect(desc?.length, `${path} description`).toBeGreaterThan(40)
    }
    expect(titles.size).toBeGreaterThanOrEqual(5)
  })

  test('product pages have Open Graph share tags', async ({ page }) => {
    await page.goto('/product/nova-grotesk')
    await settle(page)
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Nova Grotesk Font Family/)
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /\$45\.00/)
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'product')
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /^https?:\/\/.+/)
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image')
  })
})

test('private files cannot be opened by URL', async ({ request }) => {
  for (const url of ['/storage/pixel-mono-sample.txt', '/STORAGE/pixel-mono-sample.txt', '/%73torage/pixel-mono-sample.txt', '/.env', '/db/seed.sql', '/server/app.js']) {
    const res = await request.get(url)
    expect(res.status(), url).toBe(404)
  }
})
