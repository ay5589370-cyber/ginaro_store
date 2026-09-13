import { FREE_SHIPPING_THRESHOLD, getCouponDiscount } from './cartCalculations.js'

export const shippingMethods = [
  {
    id: 'standard',
    name: 'Standard Delivery',
    description: '3-7 business days',
    price: 59,
  },
  {
    id: 'express',
    name: 'Express Delivery',
    description: '1-3 business days',
    price: 149,
  },
]

export function getCustomizationCharges(items) {
  return items.reduce(
    (total, item) => total + (item.type === 'custom' ? (item.customizationPrice || 0) * item.quantity : 0),
    0,
  )
}

export function getCheckoutSubtotal(items) {
  return items.reduce((total, item) => {
    const customCharge = item.type === 'custom' ? item.customizationPrice || 0 : 0
    return total + Math.max(0, item.price - customCharge) * item.quantity
  }, 0)
}

export function getShippingCost(methodId, merchandiseTotal, coupon) {
  const method = shippingMethods.find((item) => item.id === methodId) || shippingMethods[0]

  if (method.id === 'standard' && (merchandiseTotal >= FREE_SHIPPING_THRESHOLD || coupon === 'FREESHIP')) {
    return 0
  }

  return method.price
}

export function getCheckoutTotals(items, coupon = '', shippingMethodId = 'standard') {
  const subtotal = getCheckoutSubtotal(items)
  const customizationCharges = getCustomizationCharges(items)
  const orderValue = subtotal + customizationCharges
  const discount = getCouponDiscount(orderValue, coupon)
  const shipping = getShippingCost(shippingMethodId, orderValue, coupon)
  const total = Math.max(0, orderValue - discount + shipping)

  return {
    subtotal,
    customizationCharges,
    orderValue,
    discount,
    shipping,
    total,
    taxesNote: 'Taxes included where applicable',
  }
}

export function getDeliveryEstimate(methodId, fromDate = new Date()) {
  const startOffset = methodId === 'express' ? 1 : 3
  const endOffset = methodId === 'express' ? 3 : 7
  const start = new Date(fromDate)
  const end = new Date(fromDate)
  start.setDate(start.getDate() + startOffset)
  end.setDate(end.getDate() + endOffset)

  const formatter = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
  })

  return `${formatter.format(start)} - ${formatter.format(end)}`
}

export function getCheckoutItemCount(items) {
  return items.reduce((total, item) => total + item.quantity, 0)
}
