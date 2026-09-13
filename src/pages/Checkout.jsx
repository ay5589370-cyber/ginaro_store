import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AddressForm from '../components/checkout/AddressForm.jsx'
import CheckoutProgress from '../components/checkout/CheckoutProgress.jsx'
import CheckoutSummary from '../components/checkout/CheckoutSummary.jsx'
import ContactForm from '../components/checkout/ContactForm.jsx'
import CustomDesignPreviewModal from '../components/checkout/CustomDesignPreviewModal.jsx'
import PaymentMethod from '../components/checkout/PaymentMethod.jsx'
import SavedAddressSelector from '../components/checkout/SavedAddressSelector.jsx'
import ShippingMethod from '../components/checkout/ShippingMethod.jsx'
import Footer from '../components/Footer.jsx'
import Navbar from '../components/Navbar.jsx'
import { useAddresses } from '../context/useAddresses.js'
import { useAuth } from '../context/useAuth.js'
import { useCart } from '../context/useCart.js'
import { useOrders } from '../context/useOrders.js'
import { useProducts } from '../context/useProducts.js'
import { useToast } from '../context/useToast.js'
import { getVariantKey, validateCoupon } from '../utils/cartCalculations.js'
import { getCheckoutTotals } from '../utils/checkoutCalculations.js'
import { isValidEmail, isValidPhone } from '../utils/authValidation.js'
import { getProductCategoryLabel } from '../utils/productData.js'

const emptyAddress = {
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pinCode: '',
  country: 'India',
}

function getStoredCoupon() {
  try {
    return sessionStorage.getItem('ginaro-checkout-coupon') || ''
  } catch {
    return ''
  }
}

function persistCoupon(coupon) {
  try {
    if (coupon) {
      sessionStorage.setItem('ginaro-checkout-coupon', coupon)
    } else {
      sessionStorage.removeItem('ginaro-checkout-coupon')
    }
  } catch {
    // Session storage is optional for the demo checkout.
  }
}

function normalizeCartItem(item, products) {
  const productId = String(item.productId || item.id)
  const product = products.find((product) => String(product.id) === productId)
  const stock = product?.stock ?? item.stock ?? 1
  const quantity = Math.min(Math.max(1, item.quantity), Math.max(1, stock))

  return {
    ...item,
    cartKey: getVariantKey(item),
    productId,
    image: item.image || product?.image,
    category: item.category || (product ? getProductCategoryLabel(product.category) : ''),
    originalPrice: item.type === 'custom' ? item.originalPrice : item.originalPrice || product?.originalPrice,
    stock,
    quantity,
    product,
    hasStockWarning: item.quantity > stock || stock <= 0,
  }
}

function validatePinCode(pinCode, country) {
  if (country.trim().toLowerCase() === 'india') {
    return /^\d{6}$/.test(pinCode.trim())
  }

  return pinCode.trim().length >= 3
}

function Checkout() {
  const navigate = useNavigate()
  const { cartItems, clearCart } = useCart()
  const { products, refreshProducts } = useProducts()
  const { currentUser, isLoggedIn, userProfile } = useAuth()
  const { createOrder, pendingOrderId } = useOrders()
  const { showToast } = useToast()
  const {
    addresses,
    addressLoading,
    addAddress,
  } = useAddresses()
  const availableAddresses = isLoggedIn ? addresses : []
  const defaultAddress = availableAddresses.find((address) => address.isDefault) || availableAddresses[0] || emptyAddress
  const [selectedAddressId, setSelectedAddressId] = useState(defaultAddress.id || '')
  const [showAddressForm, setShowAddressForm] = useState(!isLoggedIn || availableAddresses.length === 0)
  const [contact, setContact] = useState({
    email: userProfile?.email || currentUser?.email || '',
    phone: userProfile?.phone || '',
  })
  const [address, setAddress] = useState({ ...emptyAddress, ...defaultAddress })
  const [saveAddress, setSaveAddress] = useState(false)
  const [shippingMethod, setShippingMethod] = useState('standard')
  const [coupon, setCoupon] = useState(getStoredCoupon)
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [errors, setErrors] = useState({})
  const [previewItem, setPreviewItem] = useState(null)
  const isPlacingOrder = pendingOrderId === 'new'

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setContact((current) => ({
        email: current.email || userProfile?.email || currentUser?.email || '',
        phone: current.phone || userProfile?.phone || '',
      }))
    }, 0)

    return () => window.clearTimeout(timer)
  }, [currentUser?.email, userProfile?.email, userProfile?.phone])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!isLoggedIn) {
        setSelectedAddressId('')
        setShowAddressForm(true)
        return
      }

      if (addressLoading) return

      if (defaultAddress.id) {
        setSelectedAddressId((currentId) => currentId || defaultAddress.id)
        setAddress((currentAddress) =>
          currentAddress.line1 || currentAddress.addressLine1
            ? currentAddress
            : { ...emptyAddress, ...defaultAddress },
        )
        setShowAddressForm(false)
      } else {
        setSelectedAddressId('')
        setShowAddressForm(true)
      }
    }, 0)

    return () => window.clearTimeout(timer)
  }, [addressLoading, defaultAddress, isLoggedIn])

  const normalizedItems = useMemo(
    () => cartItems.map((item) => normalizeCartItem(item, products)).filter((item) => item.name),
    [cartItems, products],
  )
  const hasStockIssue = normalizedItems.some((item) => item.hasStockWarning)
  const totals = useMemo(
    () => getCheckoutTotals(normalizedItems, coupon, shippingMethod),
    [normalizedItems, coupon, shippingMethod],
  )

  const updateContact = (key, value) => {
    setContact((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  const updateAddress = (key, value) => {
    setAddress((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  const selectSavedAddress = (addressId) => {
    const nextAddress = availableAddresses.find((item) => item.id === addressId)
    setSelectedAddressId(addressId)
    if (nextAddress) setAddress({ ...emptyAddress, ...nextAddress })
    setShowAddressForm(false)
    setErrors((current) => ({ ...current, address: '', fullName: '', phoneAddress: '', line1: '', city: '', state: '', pinCode: '', country: '' }))
  }

  const handleCouponApply = (nextCoupon) => {
    const result = nextCoupon ? validateCoupon(nextCoupon, totals.orderValue) : { valid: true, coupon: '' }
    const validCoupon = result.valid ? result.coupon : ''
    setCoupon(validCoupon)
    persistCoupon(validCoupon)
  }

  const removeCoupon = () => {
    setCoupon('')
    persistCoupon('')
  }

  const validateCheckout = () => {
    const nextErrors = {}

    if (!isLoggedIn) nextErrors.auth = 'Please log in to place your order.'
    if (normalizedItems.length === 0) nextErrors.cart = 'Your cart is empty.'
    if (!isValidEmail(contact.email)) nextErrors.email = 'Enter a valid email address.'
    if (!isValidPhone(contact.phone)) nextErrors.phone = 'Enter a valid phone number.'

    if (!address.fullName.trim()) nextErrors.fullName = 'Enter the full name.'
    if (!isValidPhone(address.phone)) nextErrors.phoneAddress = 'Enter a valid delivery phone number.'
    if (!address.line1.trim()) nextErrors.line1 = 'Enter address line 1.'
    if (!address.city.trim()) nextErrors.city = 'Enter the city.'
    if (!address.state.trim()) nextErrors.state = 'Enter the state.'
    if (!validatePinCode(address.pinCode, address.country)) nextErrors.pinCode = 'Enter a valid PIN code.'
    if (!address.country.trim()) nextErrors.country = 'Enter the country.'

    if (!shippingMethod) nextErrors.shippingMethod = 'Select a shipping method.'
    if (!paymentMethod) nextErrors.paymentMethod = 'Select a payment method.'

    if (!termsAccepted) nextErrors.terms = 'Please agree before placing the demo order.'
    if (hasStockIssue) nextErrors.stock = 'Please update or remove items with stock changes before checkout.'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const saveAddressDraft = async () => {
    if (!saveAddress || !isLoggedIn) return true

    const result = await addAddress({
      ...address,
      isDefault: availableAddresses.length === 0,
    })

    if (result.status === 'error') {
      setErrors((current) => ({
        ...current,
        ...(result.validationErrors || {}),
        address: result.message,
      }))
      showToast(result.message, 'error')
      return false
    }

    showToast('Address saved.')
    return true
  }

  const buildOrderPayload = () => ({
    items: normalizedItems.map((item) => ({
      type: item.type === 'custom' ? 'custom' : 'product',
      productId: item.productId,
      designId: item.designId,
      name: item.name,
      image: item.image,
      price: item.price,
      quantity: item.quantity,
      size: item.selectedSize,
      color: item.selectedColor,
      customizationPrice: item.customizationPrice || 0,
      frontDesign: item.frontDesign,
      backDesign: item.backDesign,
    })),
    shippingAddress: address,
    totals,
    couponCode: coupon,
    shippingMethod,
    paymentMethod,
    paymentStatus: 'pending',
    orderStatus: 'pending',
    userEmail: currentUser?.email || userProfile?.email || contact.email,
  })

  const finishSuccessfulOrder = (orderId, message = 'Order placed successfully.') => {
    clearCart()
    refreshProducts()
    persistCoupon('')
    showToast(message)
    navigate(`/order-success?order=${orderId}`)
  }

  const placeCodOrder = async () => {
    const result = await createOrder(buildOrderPayload())

    if (result.status === 'error' || result.status === 'auth-required') {
      setErrors((current) => ({
        ...current,
        ...(result.validationErrors || {}),
        order: result.message,
      }))
      showToast(result.message || 'Unable to place your order.', 'error')
      return false
    }

    finishSuccessfulOrder(result.order.id)
    return true
  }

  const placeOrder = async () => {
    if (isPlacingOrder) return
    if (!validateCheckout()) return

    const addressSaved = await saveAddressDraft()
    if (!addressSaved) return

    await placeCodOrder()
  }

  if (normalizedItems.length === 0) {
    return (
      <div className="page checkout-page">
        <Navbar />
        <main>
          <section className="checkout-page-header section-shell">
            <div className="breadcrumb" aria-label="Breadcrumb">
              <Link to="/">Home</Link>
              <span>/</span>
              <Link to="/cart">Cart</Link>
              <span>/</span>
              <span>Checkout</span>
            </div>
            <h1>Checkout</h1>
            <p>Complete your order securely.</p>
          </section>
          <section className="checkout-empty section-shell">
            <span aria-hidden="true">□</span>
            <h2>Your cart is empty.</h2>
            <p>Add your everyday essentials before starting checkout.</p>
            <Link className="button button-primary" to="/shop">
              Go to Shop
            </Link>
          </section>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="page checkout-page">
      <Navbar />
      <main>
        <section className="checkout-page-header section-shell">
          <div className="breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <Link to="/cart">Cart</Link>
            <span>/</span>
            <span>Checkout</span>
          </div>
          <h1>Checkout</h1>
          <p>Complete your order securely.</p>
        </section>

        <section className="checkout-workspace section-shell">
          <CheckoutProgress />
          <div className="checkout-layout">
            <div className="checkout-main">
              {errors.cart && <p className="checkout-error" aria-live="polite">{errors.cart}</p>}
              {errors.auth && <p className="checkout-error" aria-live="polite">{errors.auth}</p>}
              {errors.order && <p className="checkout-error" aria-live="polite">{errors.order}</p>}
              <ContactForm contact={contact} errors={errors} onChange={updateContact} />

              <section className="checkout-panel">
                <div className="checkout-panel-head">
                  <h2>Delivery Address</h2>
                </div>
                {isLoggedIn && availableAddresses.length > 0 && !showAddressForm && (
                  <SavedAddressSelector
                    addresses={availableAddresses}
                    selectedAddressId={selectedAddressId}
                    onSelect={selectSavedAddress}
                    onUseDifferent={() => setShowAddressForm(true)}
                  />
                )}
                {showAddressForm && (
                  <AddressForm
                    address={address}
                    errors={{ ...errors, phone: errors.phoneAddress }}
                    saveAddress={saveAddress}
                    onChange={updateAddress}
                    onSaveAddressChange={setSaveAddress}
                  />
                )}
              </section>

              <ShippingMethod
                selectedMethod={shippingMethod}
                orderValue={totals.orderValue}
                coupon={coupon}
                onChange={setShippingMethod}
              />
              {errors.shippingMethod && <p className="checkout-error">{errors.shippingMethod}</p>}

              <PaymentMethod
                method={paymentMethod}
                errors={errors}
                onMethodChange={(method) => {
                  setPaymentMethod(method || 'cod')
                  setErrors((current) => ({ ...current, paymentMethod: '', order: '' }))
                }}
              />
            </div>

            <CheckoutSummary
              items={normalizedItems}
              totals={totals}
              coupon={coupon}
              errors={errors}
              termsAccepted={termsAccepted}
              hasStockIssue={hasStockIssue}
              isPlacingOrder={isPlacingOrder}
              onApplyCoupon={handleCouponApply}
              onRemoveCoupon={removeCoupon}
              onTermsChange={(checked) => {
                setTermsAccepted(checked)
                setErrors((current) => ({ ...current, terms: '' }))
              }}
              onPlaceOrder={placeOrder}
              onViewDesign={setPreviewItem}
            />
          </div>
        </section>
      </main>
      <Footer />
      <CustomDesignPreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
    </div>
  )
}

export default Checkout
