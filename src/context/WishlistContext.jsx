import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  addToWishlist as addWishlistDocument,
  clearWishlist as clearWishlistDocuments,
  getWishlist,
  getWishlistErrorMessage,
  removeFromWishlist as removeWishlistDocument,
} from '../services/wishlistService.js'
import { useAuth } from './useAuth.js'
import { WishlistContext } from './wishlistContextValue.js'

export function WishlistProvider({ children }) {
  const { currentUser, authLoading } = useAuth()
  const uid = currentUser?.uid
  const [wishlistItems, setWishlistItems] = useState([])
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [wishlistError, setWishlistError] = useState('')
  const [pendingWishlistIds, setPendingWishlistIds] = useState([])
  const requestIdRef = useRef(0)

  const wishlistIds = useMemo(
    () => wishlistItems.map((item) => String(item.productId)),
    [wishlistItems],
  )

  const refreshWishlist = useCallback(async () => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    if (!uid) {
      setWishlistItems([])
      setWishlistLoading(false)
      setWishlistError('')
      return []
    }

    setWishlistLoading(true)
    setWishlistError('')

    try {
      const items = await getWishlist(uid)

      if (requestIdRef.current !== requestId) return items

      setWishlistItems(items)
      return items
    } catch (error) {
      if (requestIdRef.current === requestId) {
        setWishlistItems([])
        setWishlistError(getWishlistErrorMessage(error))
      }

      return []
    } finally {
      if (requestIdRef.current === requestId) {
        setWishlistLoading(false)
      }
    }
  }, [uid])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (authLoading) return
      refreshWishlist()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [authLoading, refreshWishlist])

  const setPending = useCallback((productId, isPending) => {
    const id = String(productId)

    setPendingWishlistIds((current) => {
      if (isPending) {
        return current.includes(id) ? current : [...current, id]
      }

      return current.filter((currentId) => currentId !== id)
    })
  }, [])

  const isWishlistUpdating = useCallback(
    (productId) => pendingWishlistIds.includes(String(productId)),
    [pendingWishlistIds],
  )

  const addWishlistItem = useCallback(async (product) => {
    if (!uid) {
      return { status: 'auth-required', message: 'Please log in to save items to your wishlist.' }
    }

    const productId = String(product?.id || product?.productId || '')

    if (!productId) return { status: 'error', message: 'Unable to update wishlist.' }

    setPending(productId, true)

    try {
      const item = await addWishlistDocument(uid, product)

      setWishlistItems((current) => {
        const withoutExisting = current.filter((currentItem) => currentItem.productId !== productId)
        return [...withoutExisting, item]
      })
      setWishlistError('')

      return { status: 'added', message: 'Added to wishlist.' }
    } catch (error) {
      const message = getWishlistErrorMessage(error)
      setWishlistError(message)
      return { status: 'error', message }
    } finally {
      setPending(productId, false)
    }
  }, [setPending, uid])

  const removeWishlistItem = useCallback(async (productId) => {
    if (!uid) {
      return { status: 'auth-required', message: 'Please log in to save items to your wishlist.' }
    }

    const id = String(productId)
    setPending(id, true)

    try {
      await removeWishlistDocument(uid, id)
      setWishlistItems((current) => current.filter((item) => String(item.productId) !== id))
      setWishlistError('')

      return { status: 'removed', message: 'Removed from wishlist.' }
    } catch (error) {
      const message = getWishlistErrorMessage(error)
      setWishlistError(message)
      return { status: 'error', message }
    } finally {
      setPending(id, false)
    }
  }, [setPending, uid])

  const toggleWishlist = useCallback(async (product) => {
    const productId = String(product?.id || product?.productId || product || '')

    if (wishlistIds.includes(productId)) {
      return removeWishlistItem(productId)
    }

    return addWishlistItem(product)
  }, [addWishlistItem, removeWishlistItem, wishlistIds])

  const isWishlisted = useCallback((productId) => wishlistIds.includes(String(productId)), [wishlistIds])

  const clearWishlist = useCallback(async () => {
    if (!uid) {
      setWishlistItems([])
      return { status: 'cleared' }
    }

    try {
      await clearWishlistDocuments(uid)
      setWishlistItems([])
      setWishlistError('')
      return { status: 'cleared' }
    } catch (error) {
      const message = getWishlistErrorMessage(error)
      setWishlistError(message)
      return { status: 'error', message }
    }
  }, [uid])

  const value = useMemo(
    () => ({
      wishlistItems,
      wishlistIds,
      wishlistCount: wishlistItems.length,
      wishlistLoading,
      wishlistError,
      pendingWishlistIds,
      addWishlistItem,
      removeWishlistItem,
      toggleWishlist,
      isWishlisted,
      isWishlistUpdating,
      refreshWishlist,
      clearWishlist,
      addToWishlist: addWishlistItem,
      removeFromWishlist: removeWishlistItem,
    }),
    [
      addWishlistItem,
      clearWishlist,
      isWishlistUpdating,
      isWishlisted,
      pendingWishlistIds,
      refreshWishlist,
      removeWishlistItem,
      toggleWishlist,
      wishlistError,
      wishlistIds,
      wishlistItems,
      wishlistLoading,
    ],
  )

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}
