import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  addAddress as addAddressDocument,
  deleteAddress as deleteAddressDocument,
  getAddressErrorMessage,
  getAddresses,
  getDefaultAddress,
  setDefaultAddress as setDefaultAddressDocument,
  updateAddress as updateAddressDocument,
} from '../services/addressService.js'
import { useAuth } from './useAuth.js'
import { AddressContext } from './addressContextValue.js'

export function AddressProvider({ children }) {
  const { currentUser, authLoading } = useAuth()
  const uid = currentUser?.uid
  const [addresses, setAddresses] = useState([])
  const [addressLoading, setAddressLoading] = useState(false)
  const [addressError, setAddressError] = useState('')
  const [pendingAddressId, setPendingAddressId] = useState('')
  const requestIdRef = useRef(0)

  const refreshAddresses = useCallback(async () => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    if (!uid) {
      setAddresses([])
      setAddressLoading(false)
      setAddressError('')
      return []
    }

    setAddressLoading(true)
    setAddressError('')

    try {
      const nextAddresses = await getAddresses(uid)

      if (requestIdRef.current !== requestId) return nextAddresses

      setAddresses(nextAddresses)
      return nextAddresses
    } catch (error) {
      if (requestIdRef.current === requestId) {
        setAddresses([])
        setAddressError(getAddressErrorMessage(error, 'Unable to load saved addresses.'))
      }

      return []
    } finally {
      if (requestIdRef.current === requestId) {
        setAddressLoading(false)
      }
    }
  }, [uid])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (authLoading) return
      refreshAddresses()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [authLoading, refreshAddresses])

  const addAddress = useCallback(async (address) => {
    if (!uid) {
      return { status: 'auth-required', message: 'Please log in to save addresses.' }
    }

    setPendingAddressId('new')

    try {
      const savedAddress = await addAddressDocument(uid, address)
      const nextAddresses = await refreshAddresses()
      setAddressError('')

      return {
        status: 'saved',
        message: 'Address saved.',
        address: nextAddresses.find((item) => item.id === savedAddress.id) || savedAddress,
      }
    } catch (error) {
      const message = getAddressErrorMessage(error)
      setAddressError(message)

      return { status: 'error', message, validationErrors: error.validationErrors || {} }
    } finally {
      setPendingAddressId('')
    }
  }, [refreshAddresses, uid])

  const updateAddress = useCallback(async (addressId, updates) => {
    if (!uid) {
      return { status: 'auth-required', message: 'Please log in to save addresses.' }
    }

    setPendingAddressId(String(addressId))

    try {
      const savedAddress = await updateAddressDocument(uid, addressId, updates)
      await refreshAddresses()
      setAddressError('')

      return { status: 'saved', message: 'Address saved.', address: savedAddress }
    } catch (error) {
      const message = getAddressErrorMessage(error)
      setAddressError(message)

      return { status: 'error', message, validationErrors: error.validationErrors || {} }
    } finally {
      setPendingAddressId('')
    }
  }, [refreshAddresses, uid])

  const deleteAddress = useCallback(async (addressId) => {
    if (!uid) {
      return { status: 'auth-required', message: 'Please log in to manage addresses.' }
    }

    setPendingAddressId(String(addressId))

    try {
      await deleteAddressDocument(uid, addressId)
      await refreshAddresses()
      setAddressError('')

      return { status: 'deleted', message: 'Address deleted.' }
    } catch (error) {
      const message = getAddressErrorMessage(error, 'Unable to delete address.')
      setAddressError(message)

      return { status: 'error', message }
    } finally {
      setPendingAddressId('')
    }
  }, [refreshAddresses, uid])

  const setDefaultAddress = useCallback(async (addressId) => {
    if (!uid) {
      return { status: 'auth-required', message: 'Please log in to manage addresses.' }
    }

    setPendingAddressId(String(addressId))

    try {
      await setDefaultAddressDocument(uid, addressId)
      await refreshAddresses()
      setAddressError('')

      return { status: 'default-updated', message: 'Default address updated.' }
    } catch (error) {
      const message = getAddressErrorMessage(error, 'Unable to update default address.')
      setAddressError(message)

      return { status: 'error', message }
    } finally {
      setPendingAddressId('')
    }
  }, [refreshAddresses, uid])

  const loadDefaultAddress = useCallback(async () => {
    if (!uid) return null

    try {
      return await getDefaultAddress(uid)
    } catch {
      return null
    }
  }, [uid])

  const value = useMemo(
    () => ({
      addresses,
      addressLoading,
      addressError,
      pendingAddressId,
      refreshAddresses,
      addAddress,
      updateAddress,
      deleteAddress,
      setDefaultAddress,
      getDefaultAddress: loadDefaultAddress,
    }),
    [
      addAddress,
      addressError,
      addressLoading,
      addresses,
      deleteAddress,
      loadDefaultAddress,
      pendingAddressId,
      refreshAddresses,
      setDefaultAddress,
      updateAddress,
    ],
  )

  return <AddressContext.Provider value={value}>{children}</AddressContext.Provider>
}
