export const FREE_SHIPPING_THRESHOLD = 999
export const STANDARD_SHIPPING = 79

export function getVariantKey(item) {
  if (item.type === 'custom') {
    return `custom-${item.customizationId || item.id}-${item.selectedSize}-${item.selectedColor}`
  }

  return `${item.id}-${item.selectedSize}-${item.selectedColor}`
}

export function getItemSubtotal(item) {
  return item.price * item.quantity
}

export function getOriginalItemSubtotal(item) {
  const originalPrice = item.originalPrice || item.price
  return originalPrice * item.quantity
}

export function getCartSubtotal(items) {
  return items.reduce((total, item) => total + getItemSubtotal(item), 0)
}

export function getOriginalSubtotal(items) {
  return items.reduce((total, item) => total + getOriginalItemSubtotal(item), 0)
}

export function getShipping(subtotal, coupon) {
  if (subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD || coupon === 'FREESHIP') {
    return 0
  }

  return STANDARD_SHIPPING
}

export function getCouponDiscount(subtotal, coupon) {
  if (coupon === 'WELCOME10') {
    return Math.round(subtotal * 0.1)
  }

  if (coupon === 'SAVE100' && subtotal >= FREE_SHIPPING_THRESHOLD) {
    return 100
  }

  return 0
}

export function getCartTotals(items, coupon = '') {
  const subtotal = getCartSubtotal(items)
  const originalSubtotal = getOriginalSubtotal(items)
  const couponDiscount = getCouponDiscount(subtotal, coupon)
  const productSavings = Math.max(0, originalSubtotal - subtotal)
  const shipping = getShipping(subtotal, coupon)
  const total = Math.max(0, subtotal - couponDiscount + shipping)
  const freeShippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)
  const freeShippingProgress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)

  return {
    subtotal,
    originalSubtotal,
    productSavings,
    couponDiscount,
    discount: couponDiscount,
    shipping,
    total,
    freeShippingRemaining,
    freeShippingProgress,
    hasFreeShipping: subtotal >= FREE_SHIPPING_THRESHOLD || coupon === 'FREESHIP',
  }
}

export function validateCoupon(code, subtotal) {
  const coupon = code.trim().toUpperCase()

  if (!coupon) {
    return { coupon: '', valid: false, message: 'Please enter a coupon code.' }
  }

  if (coupon === 'WELCOME10') {
    return { coupon, valid: true, message: 'WELCOME10 applied. You saved 10%.' }
  }

  if (coupon === 'SAVE100') {
    if (subtotal >= FREE_SHIPPING_THRESHOLD) {
      return { coupon, valid: true, message: 'SAVE100 applied. You saved ₹100.' }
    }

    return {
      coupon: '',
      valid: false,
      message: 'SAVE100 works when your subtotal is ₹999 or above.',
    }
  }

  if (coupon === 'FREESHIP') {
    return { coupon, valid: true, message: 'FREESHIP applied. Shipping is free.' }
  }

  return { coupon: '', valid: false, message: 'Invalid coupon code.' }
}
