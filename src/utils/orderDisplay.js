export const ORDER_STATUS_LABELS = Object.freeze({
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
})

export const PAYMENT_STATUS_LABELS = Object.freeze({
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
})

export const PAYMENT_METHOD_LABELS = Object.freeze({
  cod: 'Cash on Delivery',
  online: 'Online Payment',
  upi: 'UPI',
  card: 'Credit / Debit Card',
  netbanking: 'Net Banking',
})

export function getOrderStatusLabel(status) {
  return ORDER_STATUS_LABELS[status] || 'Pending'
}

export function getPaymentStatusLabel(status) {
  return PAYMENT_STATUS_LABELS[status] || 'Pending'
}

export function getPaymentMethodLabel(method) {
  return PAYMENT_METHOD_LABELS[method] || 'Selected payment'
}

export function getOrderTimelineStage(status) {
  const stages = {
    pending: 'Order Placed',
    confirmed: 'Confirmed',
    processing: 'Confirmed',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Order Placed',
  }

  return stages[status] || 'Order Placed'
}

export function formatOrderAddress(address = {}) {
  return [
    address.fullName,
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(', ')
}
