import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../firebase/firebase.js'

const ADDRESSES_COLLECTION = 'addresses'
const ADDRESS_TYPES = new Set(['home', 'work', 'other'])

function getConfigurationError() {
  const error = new Error('Firestore addresses are not configured.')
  error.code = 'addresses/configuration-not-ready'
  return error
}

function requireUid(uid) {
  if (!uid) {
    const error = new Error('Sign in before managing saved addresses.')
    error.code = 'addresses/auth-required'
    throw error
  }
}

function requireDb() {
  if (!db || !isFirebaseConfigured) {
    throw getConfigurationError()
  }

  return db
}

function getAddressesCollection(uid) {
  return collection(requireDb(), 'users', uid, ADDRESSES_COLLECTION)
}

function getAddressDocument(uid, addressId) {
  return doc(requireDb(), 'users', uid, ADDRESSES_COLLECTION, String(addressId))
}

function toSafeString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeAddressType(type) {
  const value = toSafeString(type).toLowerCase()
  return ADDRESS_TYPES.has(value) ? value : 'home'
}

export function normalizeAddressForFirestore(address = {}) {
  return {
    fullName: toSafeString(address.fullName),
    phone: toSafeString(address.phone),
    addressLine1: toSafeString(address.addressLine1 ?? address.line1),
    addressLine2: toSafeString(address.addressLine2 ?? address.line2),
    city: toSafeString(address.city),
    state: toSafeString(address.state),
    postalCode: toSafeString(address.postalCode ?? address.pinCode),
    country: toSafeString(address.country) || 'India',
    type: normalizeAddressType(address.type),
    isDefault: Boolean(address.isDefault),
  }
}

export function normalizeAddressForClient(addressId, address = {}) {
  return {
    id: String(address.id || addressId),
    fullName: address.fullName || '',
    phone: address.phone || '',
    addressLine1: address.addressLine1 || '',
    addressLine2: address.addressLine2 || '',
    city: address.city || '',
    state: address.state || '',
    postalCode: address.postalCode || '',
    country: address.country || 'India',
    type: address.type || 'home',
    isDefault: Boolean(address.isDefault),
    createdAt: address.createdAt || null,
    updatedAt: address.updatedAt || null,
    line1: address.addressLine1 || '',
    line2: address.addressLine2 || '',
    pinCode: address.postalCode || '',
  }
}

export function validateAddress(address = {}) {
  const normalizedAddress = normalizeAddressForFirestore(address)
  const errors = {}

  if (!normalizedAddress.fullName) errors.fullName = 'Enter full name.'
  if (!normalizedAddress.phone) errors.phone = 'Enter a phone number.'
  if (!normalizedAddress.addressLine1) errors.line1 = 'Enter address line 1.'
  if (!normalizedAddress.city) errors.city = 'Enter city.'
  if (!normalizedAddress.state) errors.state = 'Enter state.'
  if (!normalizedAddress.postalCode) errors.pinCode = 'Enter postal code.'
  if (!normalizedAddress.country) errors.country = 'Enter country.'

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    address: normalizedAddress,
  }
}

export function getAddressErrorMessage(error, fallback = 'Unable to save address.') {
  const messages = {
    'addresses/auth-required': 'Please log in to manage saved addresses.',
    'addresses/configuration-not-ready': 'Saved addresses are not configured. Please try again later.',
    'addresses/invalid-address': 'Please check the address fields and try again.',
    'addresses/not-found': 'Address not found.',
    'permission-denied': 'You do not have permission to update these addresses.',
    unavailable: 'Saved addresses are temporarily unavailable. Please try again.',
  }

  return messages[error?.code] || fallback
}

async function getAddressSnapshots(uid) {
  requireUid(uid)
  const snapshot = await getDocs(getAddressesCollection(uid))

  return snapshot.docs
}

function sortAddresses(addresses) {
  return [...addresses].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.id.localeCompare(b.id))
}

export async function getAddresses(uid) {
  const addressDocs = await getAddressSnapshots(uid)

  return sortAddresses(
    addressDocs.map((addressDoc) => normalizeAddressForClient(addressDoc.id, addressDoc.data())),
  )
}

export async function addAddress(uid, address) {
  requireUid(uid)
  const validation = validateAddress(address)

  if (!validation.isValid) {
    const error = new Error('Address validation failed.')
    error.code = 'addresses/invalid-address'
    error.validationErrors = validation.errors
    throw error
  }

  const existingAddresses = await getAddresses(uid)
  const addressRef = doc(getAddressesCollection(uid))
  const shouldBeDefault = Boolean(address.isDefault) || existingAddresses.length === 0
  const batch = writeBatch(requireDb())
  const addressId = addressRef.id

  if (shouldBeDefault) {
    existingAddresses.forEach((existingAddress) => {
      batch.update(getAddressDocument(uid, existingAddress.id), {
        isDefault: false,
        updatedAt: serverTimestamp(),
      })
    })
  }

  batch.set(addressRef, {
    id: addressId,
    ...validation.address,
    isDefault: shouldBeDefault,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await batch.commit()

  return normalizeAddressForClient(addressId, {
    id: addressId,
    ...validation.address,
    isDefault: shouldBeDefault,
  })
}

export async function updateAddress(uid, addressId, updates) {
  requireUid(uid)
  const addressRef = getAddressDocument(uid, addressId)
  const existingSnapshot = await getDoc(addressRef)

  if (!existingSnapshot.exists()) {
    const error = new Error('Address not found.')
    error.code = 'addresses/not-found'
    throw error
  }

  const currentAddress = normalizeAddressForClient(existingSnapshot.id, existingSnapshot.data())
  const nextAddress = {
    ...currentAddress,
    ...updates,
    isDefault: updates.isDefault ?? currentAddress.isDefault,
  }
  const validation = validateAddress(nextAddress)

  if (!validation.isValid) {
    const error = new Error('Address validation failed.')
    error.code = 'addresses/invalid-address'
    error.validationErrors = validation.errors
    throw error
  }

  const shouldBeDefault = Boolean(nextAddress.isDefault)

  if (shouldBeDefault) {
    const existingAddresses = await getAddresses(uid)
    const batch = writeBatch(requireDb())

    existingAddresses
      .filter((existingAddress) => existingAddress.id !== addressId)
      .forEach((existingAddress) => {
        batch.update(getAddressDocument(uid, existingAddress.id), {
          isDefault: false,
          updatedAt: serverTimestamp(),
        })
      })

    batch.set(addressRef, {
      id: String(addressId),
      ...validation.address,
      isDefault: true,
      updatedAt: serverTimestamp(),
    }, { merge: true })

    await batch.commit()
  } else {
    await updateDoc(addressRef, {
      ...validation.address,
      id: String(addressId),
      updatedAt: serverTimestamp(),
    })
  }

  const snapshot = await getDoc(addressRef)
  return snapshot.exists() ? normalizeAddressForClient(snapshot.id, snapshot.data()) : null
}

export async function deleteAddress(uid, addressId) {
  requireUid(uid)
  const addresses = await getAddresses(uid)
  const deletedAddress = addresses.find((address) => address.id === addressId)
  const remainingAddresses = addresses.filter((address) => address.id !== addressId)
  const batch = writeBatch(requireDb())

  batch.delete(getAddressDocument(uid, addressId))

  if (deletedAddress?.isDefault && remainingAddresses.length > 0) {
    batch.update(getAddressDocument(uid, remainingAddresses[0].id), {
      isDefault: true,
      updatedAt: serverTimestamp(),
    })
  }

  await batch.commit()

  return { success: true }
}

export async function setDefaultAddress(uid, addressId) {
  requireUid(uid)
  const addresses = await getAddresses(uid)

  if (!addresses.some((address) => address.id === addressId)) {
    const error = new Error('Address not found.')
    error.code = 'addresses/not-found'
    throw error
  }

  const batch = writeBatch(requireDb())

  addresses.forEach((address) => {
    batch.update(getAddressDocument(uid, address.id), {
      isDefault: address.id === addressId,
      updatedAt: serverTimestamp(),
    })
  })

  await batch.commit()

  return { success: true }
}

export async function getDefaultAddress(uid) {
  const addresses = await getAddresses(uid)
  return addresses.find((address) => address.isDefault) || null
}
