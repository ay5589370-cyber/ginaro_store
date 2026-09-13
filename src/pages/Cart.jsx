import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import CartItem from '../components/CartItem.jsx'
import CartSummary from '../components/CartSummary.jsx'
import EmptyCart from '../components/EmptyCart.jsx'
import Footer from '../components/Footer.jsx'
import Navbar from '../components/Navbar.jsx'
import { useCart } from '../context/useCart.js'
import { useProducts } from '../context/useProducts.js'
import { getCartTotals } from '../utils/cartCalculations.js'
import { formatPrice } from '../utils/formatters.js'
import { getProductCategoryLabel } from '../utils/productData.js'

function normalizeCartItem(item, products) {
  const productId = String(item.productId || item.id)
  const product = products.find((product) => String(product.id) === productId)
  const stock = product?.stock ?? item.stock ?? 1
  const quantity = Math.min(Math.max(1, item.quantity), Math.max(1, stock))

  return {
    ...item,
    productId,
    image: item.image || product?.image,
    category: item.category || (product ? getProductCategoryLabel(product.category) : ''),
    originalPrice: item.type === 'custom' ? item.originalPrice : item.originalPrice || product?.originalPrice,
    stock,
    quantity,
    originalQuantity: item.quantity,
    product,
    hasStockWarning: item.quantity > stock,
  }
}

function Cart() {
  const { cartItems } = useCart()
  const { products } = useProducts()
  const [coupon, setCoupon] = useState(() => {
    try {
      return sessionStorage.getItem('ginaro-checkout-coupon') || ''
    } catch {
      return ''
    }
  })

  const normalizedItems = useMemo(
    () => cartItems.map((item) => normalizeCartItem(item, products)).filter((item) => item.name),
    [cartItems, products],
  )
  const hasStockIssue = normalizedItems.some((item) => item.hasStockWarning || item.stock <= 0)
  const totals = useMemo(() => getCartTotals(normalizedItems, coupon), [normalizedItems, coupon])

  const handleApplyCoupon = (nextCoupon) => {
    setCoupon(nextCoupon)
    try {
      if (nextCoupon) {
        sessionStorage.setItem('ginaro-checkout-coupon', nextCoupon)
      } else {
        sessionStorage.removeItem('ginaro-checkout-coupon')
      }
    } catch {
      // Coupon persistence is optional for the frontend demo.
    }
  }

  return (
    <div className="page cart-page">
      <Navbar />
      <main>
        <section className="cart-page-header section-shell">
          <div className="breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>Cart</span>
          </div>
          <h1>Your Cart</h1>
          <p>Review your items before checkout.</p>
        </section>

        {normalizedItems.length === 0 ? (
          <EmptyCart />
        ) : (
          <section className="cart-layout section-shell">
            <div className="cart-items-panel">
              <div className="cart-list-head">
                <h2>Cart Items</h2>
                <span>{normalizedItems.length} {normalizedItems.length === 1 ? 'item' : 'items'}</span>
              </div>
              <div className="cart-items-list">
                {normalizedItems.map((item) => (
                  <CartItem
                    key={`${item.id}-${item.selectedSize}-${item.selectedColor}`}
                    item={item}
                    product={item.product}
                  />
                ))}
              </div>
            </div>

            <CartSummary
              totals={totals}
              coupon={coupon}
              onApplyCoupon={handleApplyCoupon}
              hasStockIssue={hasStockIssue}
            />
          </section>
        )}
      </main>
      <Footer />

      {normalizedItems.length > 0 && (
        <div className="mobile-checkout-bar" aria-label="Mobile checkout summary">
          <div>
            <span>Total</span>
            <strong>{formatPrice(totals.total)}</strong>
          </div>
          {hasStockIssue ? <span className="is-disabled">Update Cart</span> : <Link to="/checkout">Checkout</Link>}
        </div>
      )}
    </div>
  )
}

export default Cart
