import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const DEFAULT_TITLE = 'GINARO | Premium Everyday Clothing'
const DEFAULT_DESCRIPTION = 'Shop GINARO premium everyday vests, pajamas and clothing combos with Cash on Delivery.'

const routeTitles = [
  [/^\/$/, DEFAULT_TITLE],
  [/^\/shop$/, 'Shop | GINARO'],
  [/^\/search$/, 'Search | GINARO'],
  [/^\/cart$/, 'Cart | GINARO'],
  [/^\/customize$/, 'Customize Vest | GINARO'],
  [/^\/login$/, 'Login | GINARO'],
  [/^\/signup$/, 'Create Account | GINARO'],
  [/^\/account(?:\/.*)?$/, 'Account | GINARO'],
  [/^\/admin(?:\/.*)?$/, 'Admin | GINARO'],
  [/^\/checkout$/, 'Checkout | GINARO'],
  [/^\/order-success$/, 'Order Placed | GINARO'],
  [/^\/about$/, 'About | GINARO'],
  [/^\/contact$/, 'Contact | GINARO'],
  [/^\/shipping$/, 'Shipping | GINARO'],
  [/^\/returns$/, 'Returns | GINARO'],
  [/^\/size-guide$/, 'Size Guide | GINARO'],
  [/^\/faq$/, 'FAQ | GINARO'],
  [/^\/privacy$/, 'Privacy Policy | GINARO'],
  [/^\/terms$/, 'Terms | GINARO'],
]

function setMeta(selector, attr, value) {
  const element = document.head.querySelector(selector)
  if (element) element.setAttribute(attr, value)
}

function getTitle(pathname, search) {
  if (pathname === '/search') {
    const query = new URLSearchParams(search).get('q')?.trim()
    return query ? `Search results for "${query}" | GINARO` : 'Search | GINARO'
  }

  if (pathname.startsWith('/product/')) return 'Product | GINARO'

  return routeTitles.find(([pattern]) => pattern.test(pathname))?.[1] || 'Page Not Found | GINARO'
}

function RouteMetadata() {
  const location = useLocation()

  useEffect(() => {
    const title = getTitle(location.pathname, location.search)

    document.title = title
    setMeta('meta[name="description"]', 'content', DEFAULT_DESCRIPTION)
    setMeta('meta[property="og:title"]', 'content', title)
    setMeta('meta[property="og:description"]', 'content', DEFAULT_DESCRIPTION)
  }, [location.pathname, location.search])

  return null
}

export default RouteMetadata
