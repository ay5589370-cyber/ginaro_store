const statusCopy = {
  orderPlaced: {
    heading: 'Your GINARO order is confirmed',
    message: 'Thank you for your order. We have received it and will begin confirmation shortly.',
  },
  confirmed: {
    heading: 'Your GINARO order has been confirmed',
    message: "We've confirmed your order and will begin preparing it shortly.",
  },
  processing: {
    heading: 'Your GINARO order is being prepared',
    message: "We're preparing your order.",
  },
  shipped: {
    heading: 'Your GINARO order has shipped',
    message: 'Your order is on the way.',
  },
  delivered: {
    heading: 'Your GINARO order has been delivered',
    message: 'Your order has been delivered. We hope you enjoy your GINARO essentials.',
  },
  cancelled: {
    heading: 'Your GINARO order was cancelled',
    message: 'Your order has been cancelled. Since this was a Cash on Delivery order, no online refund is required.',
  },
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function formatCurrency(value) {
  return `₹${Math.max(0, Number(value) || 0).toLocaleString('en-IN')}`
}

function formatDate(value) {
  if (!value) return new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' })
  if (value instanceof Date) return value.toLocaleDateString('en-IN', { dateStyle: 'medium' })
  if (typeof value.toDate === 'function') {
    return value.toDate().toLocaleDateString('en-IN', { dateStyle: 'medium' })
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' })
    : date.toLocaleDateString('en-IN', { dateStyle: 'medium' })
}

export function formatAddress(address = {}) {
  return [
    address.fullName,
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(', ')
}

function buildAppLink(route) {
  const baseUrl = String(process.env.APP_BASE_URL || '').replace(/\/+$/g, '')
  if (!baseUrl) return ''

  const safeRoute = String(route || '/').startsWith('/') ? route : '/'
  return `${baseUrl}${safeRoute}`
}

function getPaymentMethodLabel(method) {
  return String(method || '').toLowerCase() === 'cod' ? 'Cash on Delivery' : 'Selected payment method'
}

function getItemDisplayName(item = {}) {
  if (item.type === 'custom') return item.name || 'Customized Vest'
  return item.name || 'GINARO product'
}

function formatItemVariant(item = {}) {
  return [
    item.size ? `Size ${item.size}` : '',
    item.color ? item.color : '',
    item.type === 'custom' ? 'Customized Vest' : '',
  ]
    .filter(Boolean)
    .join(' / ')
}

function buildItemsHtml(items = []) {
  return items.map((item) => {
    const variant = formatItemVariant(item)
    return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #eee6d8;">
          <strong style="color:#17120d;">${escapeHtml(getItemDisplayName(item))}</strong>
          ${variant ? `<br><span style="color:#6f6253;font-size:13px;">${escapeHtml(variant)}</span>` : ''}
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #eee6d8;text-align:center;color:#17120d;">${Number(item.quantity) || 1}</td>
        <td style="padding:12px 0;border-bottom:1px solid #eee6d8;text-align:right;color:#17120d;">${formatCurrency(item.price)}</td>
      </tr>
    `
  }).join('')
}

function buildItemsText(items = []) {
  return items.map((item) => {
    const variant = formatItemVariant(item)
    return `- ${getItemDisplayName(item)}${variant ? ` (${variant})` : ''} x ${Number(item.quantity) || 1}: ${formatCurrency(item.price)}`
  }).join('\n')
}

function buildTotalsHtml(order) {
  return `
    <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:18px;">
      <tr><td style="padding:5px 0;color:#6f6253;">Subtotal</td><td style="padding:5px 0;text-align:right;color:#17120d;">${formatCurrency(order.subtotal)}</td></tr>
      <tr><td style="padding:5px 0;color:#6f6253;">Shipping</td><td style="padding:5px 0;text-align:right;color:#17120d;">${formatCurrency(order.shippingFee)}</td></tr>
      <tr><td style="padding:5px 0;color:#6f6253;">Discount</td><td style="padding:5px 0;text-align:right;color:#17120d;">-${formatCurrency(order.discount)}</td></tr>
      <tr><td style="padding:12px 0 0;color:#17120d;font-weight:800;border-top:1px solid #eee6d8;">Total</td><td style="padding:12px 0 0;text-align:right;color:#17120d;font-weight:900;border-top:1px solid #eee6d8;">${formatCurrency(order.total)}</td></tr>
    </table>
  `
}

function buildLayout({ title, heading, message, order, ctaLabel, ctaRoute, extraHtml = '' }) {
  const orderLink = buildAppLink(ctaRoute)
  const address = formatAddress(order.shippingAddress)

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f7f1e7;font-family:Arial,Helvetica,sans-serif;color:#17120d;">
    <table role="presentation" style="width:100%;border-collapse:collapse;background:#f7f1e7;padding:24px 0;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" style="width:100%;max-width:640px;border-collapse:collapse;background:#fffaf0;border:1px solid #e7dccb;">
            <tr>
              <td style="padding:26px 28px;border-bottom:1px solid #e7dccb;">
                <div style="font-size:22px;letter-spacing:4px;font-weight:900;color:#17120d;">GINARO</div>
                <div style="margin-top:4px;color:#8a6a1d;font-size:12px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;">Cash on Delivery Order</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 10px;font-size:26px;line-height:1.2;color:#17120d;">${escapeHtml(heading || title)}</h1>
                <p style="margin:0 0 22px;color:#5f554b;line-height:1.55;">${escapeHtml(message)}</p>
                <table role="presentation" style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #eee6d8;margin-bottom:22px;">
                  <tr>
                    <td style="padding:14px;color:#6f6253;font-size:13px;">Order ID<br><strong style="color:#17120d;font-size:15px;">#${escapeHtml(order.id)}</strong></td>
                    <td style="padding:14px;color:#6f6253;font-size:13px;">Order Date<br><strong style="color:#17120d;font-size:15px;">${escapeHtml(formatDate(order.createdAt))}</strong></td>
                    <td style="padding:14px;color:#6f6253;font-size:13px;">Payment<br><strong style="color:#17120d;font-size:15px;">${escapeHtml(getPaymentMethodLabel(order.paymentMethod))}</strong></td>
                  </tr>
                </table>
                <table role="presentation" style="width:100%;border-collapse:collapse;">
                  <thead>
                    <tr>
                      <th align="left" style="padding:0 0 8px;color:#6f6253;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Item</th>
                      <th align="center" style="padding:0 0 8px;color:#6f6253;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Qty</th>
                      <th align="right" style="padding:0 0 8px;color:#6f6253;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Price</th>
                    </tr>
                  </thead>
                  <tbody>${buildItemsHtml(order.items)}</tbody>
                </table>
                ${buildTotalsHtml(order)}
                ${address ? `<p style="margin:22px 0 0;color:#5f554b;line-height:1.5;"><strong style="color:#17120d;">Shipping to:</strong><br>${escapeHtml(address)}</p>` : ''}
                ${extraHtml}
                ${orderLink ? `<p style="margin:26px 0 0;"><a href="${escapeHtml(orderLink)}" style="display:inline-block;background:#17120d;color:#fffaf0;text-decoration:none;font-weight:800;padding:13px 18px;border-radius:4px;">${escapeHtml(ctaLabel)}</a></p>` : ''}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;border-top:1px solid #e7dccb;color:#7b7063;font-size:12px;line-height:1.5;">
                This transactional email was sent for your GINARO order. GINARO currently supports Cash on Delivery only.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function buildText({ heading, message, order, ctaLabel, ctaRoute, extraText = '' }) {
  const orderLink = buildAppLink(ctaRoute)
  const address = formatAddress(order.shippingAddress)

  return [
    'GINARO',
    heading,
    message,
    '',
    `Order ID: #${order.id}`,
    `Payment Method: ${getPaymentMethodLabel(order.paymentMethod)}`,
    `Items:\n${buildItemsText(order.items)}`,
    `Subtotal: ${formatCurrency(order.subtotal)}`,
    `Shipping: ${formatCurrency(order.shippingFee)}`,
    `Discount: -${formatCurrency(order.discount)}`,
    `Total: ${formatCurrency(order.total)}`,
    address ? `Shipping to: ${address}` : '',
    extraText,
    orderLink ? `${ctaLabel}: ${orderLink}` : '',
    'GINARO currently supports Cash on Delivery only.',
  ].filter(Boolean).join('\n')
}

export function buildCustomerOrderEmail(type, order) {
  const copy = statusCopy[type] || statusCopy.orderPlaced
  const subjects = {
    orderPlaced: `GINARO Order Confirmed - #${order.id}`,
    confirmed: 'Your GINARO Order Has Been Confirmed',
    processing: 'Your GINARO Order Is Being Prepared',
    shipped: 'Your GINARO Order Has Shipped',
    delivered: 'Your GINARO Order Has Been Delivered',
    cancelled: 'Your GINARO Order Was Cancelled',
  }
  const extraHtml = type === 'shipped' && (order.courierName || order.trackingNumber)
    ? `<p style="margin:18px 0 0;color:#5f554b;"><strong style="color:#17120d;">Tracking:</strong> ${escapeHtml([order.courierName, order.trackingNumber].filter(Boolean).join(' / '))}</p>`
    : ''
  const extraText = type === 'shipped' && (order.courierName || order.trackingNumber)
    ? `Tracking: ${[order.courierName, order.trackingNumber].filter(Boolean).join(' / ')}`
    : ''
  const ctaLabel = type === 'delivered' ? 'Review Your Purchase' : 'View Your Order'
  const ctaRoute = `/account/orders/${encodeURIComponent(order.id)}`

  return {
    subject: subjects[type] || subjects.orderPlaced,
    html: buildLayout({
      title: subjects[type],
      heading: copy.heading,
      message: copy.message,
      order,
      ctaLabel,
      ctaRoute,
      extraHtml,
    }),
    text: buildText({
      heading: copy.heading,
      message: copy.message,
      order,
      ctaLabel,
      ctaRoute,
      extraText,
    }),
  }
}

export function buildAdminNewOrderEmail(order) {
  const adminRoute = `/admin/orders/${encodeURIComponent(order.id)}`
  const address = order.shippingAddress || {}
  const location = [address.city, address.state, address.postalCode].filter(Boolean).join(', ')
  const message = `A new Cash on Delivery order was placed${location ? ` for ${location}` : ''}.`

  return {
    subject: `New GINARO COD Order - #${order.id}`,
    html: buildLayout({
      title: 'New GINARO order',
      heading: 'New COD order received',
      message,
      order,
      ctaLabel: 'Open Admin Order',
      ctaRoute: adminRoute,
      extraHtml: `<p style="margin:18px 0 0;color:#5f554b;"><strong style="color:#17120d;">Customer:</strong> ${escapeHtml(address.fullName || 'Customer')} / ${escapeHtml(order.userEmail || 'No email')}</p>`,
    }),
    text: buildText({
      heading: 'New COD order received',
      message,
      order,
      ctaLabel: 'Open Admin Order',
      ctaRoute: adminRoute,
      extraText: `Customer: ${address.fullName || 'Customer'} / ${order.userEmail || 'No email'}`,
    }),
  }
}
