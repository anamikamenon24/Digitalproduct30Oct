import { useEffect } from 'react'

const SITE = 'Pixelora'
const DEFAULT_DESCRIPTION = 'Pixelora — templates, e-books, presets and mini-courses from independent creators. Buy once, download instantly.'

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

// Sets the tab title, meta description and Open Graph / Twitter share tags for the current page.
// Note: crawlers that don't run JavaScript only see the defaults in index.html.
export function useSeo({ title, description = DEFAULT_DESCRIPTION, image, type = 'website' } = {}) {
  useEffect(() => {
    const full = title ? `${title} · ${SITE}` : `${SITE} — Create faster. Sell smarter.`
    document.title = full
    setMeta('name', 'description', description)
    setMeta('property', 'og:title', full)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:type', type)
    setMeta('property', 'og:site_name', SITE)
    setMeta('property', 'og:url', window.location.href)
    setMeta('property', 'og:image', image || `${window.location.origin}/og-image.png`)
    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', full)
    setMeta('name', 'twitter:description', description)
  }, [title, description, image, type])
}
