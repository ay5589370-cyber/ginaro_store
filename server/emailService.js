import { FieldValue } from 'firebase-admin/firestore'
import { getAdminFirestore } from './firebaseAdmin.js'
import {
  buildAdminNewOrderEmail,
  buildCustomerOrderEmail,
} from './emailTemplates.js'

const RESEND_EMAIL_URL = 'https://api.resend.com/emails'
const RESEND_TIMEOUT_MS = 10000
const EMAIL_NOTIFICATIONS_COLLECTION = 'emailNotifications'
const ORDERS_COLLECTION = 'orders'
const customerNotificationTypes = new Set([
  'orderPlaced',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
])
const orderStatusToEmailType = {
  confirmed: 'confirmed',
  processing: 'processing',
  shipped: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled',
}

function toSafeString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function getEmailConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY || '',
    from: process.env.EMAIL_FROM || '',
    adminEmail: process.env.ADMIN_NOTIFICATION_EMAIL || '',
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toSafeString(email))
}

function normalizeRecipient(email) {
  return toSafeString(email).toLowerCase()
}

function getNotificationId(orderId, type) {
  return `${String(orderId).replace(/[^A-Za-z0-9_-]/g, '_')}_${type}`
}

function getProviderErrorCode(status) {
  if (status === 401 || status === 403) return 'RESEND_AUTH_FAILED'
  if (status === 429) return 'RESEND_RATE_LIMITED'
  if (status >= 500) return 'RESEND_UNAVAILABLE'
  return 'RESEND_SEND_FAILED'
}

function safeLogEmailFailure({ type, orderId, code }) {
  console.warn('GINARO email notification failed', {
    type,
    orderId,
    code,
  })
}

async function sendEmailWithResend({ to, subject, html, text }) {
  const config = getEmailConfig()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS)

  if (!config.apiKey || !config.from) {
    const error = new Error('Email service is not configured.')
    error.code = 'EMAIL_CONFIG_MISSING'
    throw error
  }

  try {
    const response = await fetch(RESEND_EMAIL_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.from,
        to,
        subject,
        html,
        text,
      }),
    })

    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      const error = new Error('Email provider request failed.')
      error.code = getProviderErrorCode(response.status)
      error.status = response.status
      throw error
    }

    return {
      providerMessageId: payload.id || '',
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      error.code = 'RESEND_TIMEOUT'
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
}

async function writeOrderEmailEvent(orderId, type, event) {
  const safeEvent = {
    status: event.status,
    notificationId: event.notificationId || null,
    recipientKind: event.recipientKind || null,
    createdAt: event.createdAt || null,
    sentAt: event.sentAt || null,
    errorCode: event.errorCode || null,
  }

  await getAdminFirestore()
    .collection(ORDERS_COLLECTION)
    .doc(String(orderId))
    .set(
      {
        emailEvents: {
          [type]: safeEvent,
        },
      },
      { merge: true },
    )
}

async function reserveNotification({ type, order, recipient, recipientKind }) {
  const db = getAdminFirestore()
  const notificationId = getNotificationId(order.id, type)
  const notificationRef = db.collection(EMAIL_NOTIFICATIONS_COLLECTION).doc(notificationId)
  const event = {
    orderId: String(order.id),
    userId: toSafeString(order.userId),
    type,
    recipient,
    recipientKind,
    status: 'pending',
    provider: 'resend',
    createdAt: FieldValue.serverTimestamp(),
    sentAt: null,
    errorCode: null,
  }

  try {
    await notificationRef.create(event)
    await writeOrderEmailEvent(order.id, type, {
      notificationId,
      recipientKind,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    })

    return { reserved: true, notificationId, notificationRef }
  } catch (error) {
    if (error.code === 6 || error.code === 'already-exists') {
      return { reserved: false, status: 'skipped', reason: 'duplicate' }
    }

    safeLogEmailFailure({ type, orderId: order.id, code: error.code || 'EMAIL_RESERVE_FAILED' })
    return { reserved: false, status: 'failed', reason: 'EMAIL_RESERVE_FAILED' }
  }
}

async function markNotificationSent({ notificationRef, order, type, providerMessageId }) {
  const sentEvent = {
    status: 'sent',
    providerMessageId,
    sentAt: FieldValue.serverTimestamp(),
    errorCode: null,
  }

  await notificationRef.set(sentEvent, { merge: true })
  await writeOrderEmailEvent(order.id, type, sentEvent)
}

async function markNotificationFailed({ notificationRef, order, type, code }) {
  const failedEvent = {
    status: 'failed',
    sentAt: null,
    errorCode: code,
  }

  await notificationRef.set(failedEvent, { merge: true })
  await writeOrderEmailEvent(order.id, type, failedEvent)
}

function buildTemplate(type, order, recipientKind) {
  if (recipientKind === 'admin') return buildAdminNewOrderEmail(order)
  return buildCustomerOrderEmail(type, order)
}

export async function sendOrderEmailNotificationOnce({ type, order, recipient, recipientKind = 'customer' }) {
  const email = normalizeRecipient(recipient)
  const config = getEmailConfig()

  if (!order?.id) return { status: 'skipped', reason: 'missing-order' }
  if (!isValidEmail(email)) return { status: 'skipped', reason: 'invalid-recipient' }
  if (!config.apiKey || !config.from) {
    safeLogEmailFailure({ type, orderId: order.id, code: 'EMAIL_CONFIG_MISSING' })
    return { status: 'skipped', reason: 'EMAIL_CONFIG_MISSING' }
  }

  const reservation = await reserveNotification({ type, order, recipient: email, recipientKind })

  if (!reservation.reserved) return reservation

  try {
    const template = buildTemplate(type, order, recipientKind)
    const sendResult = await sendEmailWithResend({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    await markNotificationSent({
      notificationRef: reservation.notificationRef,
      order,
      type,
      providerMessageId: sendResult.providerMessageId,
    })

    return {
      status: 'sent',
      type,
      notificationId: reservation.notificationId,
    }
  } catch (error) {
    const code = error.code || 'EMAIL_SEND_FAILED'
    safeLogEmailFailure({ type, orderId: order.id, code })
    await markNotificationFailed({
      notificationRef: reservation.notificationRef,
      order,
      type,
      code,
    }).catch(() => {})

    return { status: 'failed', type, reason: code }
  }
}

export async function sendOrderPlacedNotifications(order) {
  const config = getEmailConfig()
  const results = []

  results.push(await sendOrderEmailNotificationOnce({
    type: 'orderPlaced',
    order,
    recipient: order.userEmail,
    recipientKind: 'customer',
  }))

  if (config.adminEmail) {
    results.push(await sendOrderEmailNotificationOnce({
      type: 'adminNewOrder',
      order,
      recipient: config.adminEmail,
      recipientKind: 'admin',
    }))
  }

  return results
}

export async function sendOrderStatusNotification(order) {
  const type = orderStatusToEmailType[order?.orderStatus]

  if (!type || !customerNotificationTypes.has(type)) {
    return { status: 'skipped', reason: 'unsupported-status' }
  }

  return sendOrderEmailNotificationOnce({
    type,
    order,
    recipient: order.userEmail,
    recipientKind: 'customer',
  })
}
