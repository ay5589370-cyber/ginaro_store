import { useEffect, useMemo, useState } from 'react'
import { CartContext } from './cartContextValue.js'
import { getVariantKey } from '../utils/cartCalculations.js'

const MAX_CART_ITEM_QUANTITY = 20

function toSafeString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function toSafeNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function normalizeCartQuantity(quantity, stock = MAX_CART_ITEM_QUANTITY) {
  const safeStock = Math.max(1, Math.min(MAX_CART_ITEM_QUANTITY, Math.trunc(toSafeNumber(stock, MAX_CART_ITEM_QUANTITY))))
  const safeQuantity = Math.trunc(toSafeNumber(quantity, 1))

  return Math.min(safeStock, Math.max(1, safeQuantity))
}

function normalizeStoredCartItem(item) {
  if (!item || typeof item !== 'object') return null

  const id = toSafeString(item.id || item.productId)
  const name = toSafeString(item.name)
  const price = Math.max(0, toSafeNumber(item.price))

  if (!id || !name || price <= 0) return null

  const stock = Math.max(0, Math.trunc(toSafeNumber(item.stock, MAX_CART_ITEM_QUANTITY)))
  const quantityStockLimit = stock > 0 ? stock : 1

  return {
    ...item,
    id,
    productId: toSafeString(item.productId || id),
    name,
    image: toSafeString(item.image),
    selectedSize: toSafeString(item.selectedSize),
    selectedColor: toSafeString(item.selectedColor),
    price,
    originalPrice: Math.max(0, toSafeNumber(item.originalPrice || price)),
    stock,
    quantity: normalizeCartQuantity(item.quantity, quantityStockLimit),
  }
}

function getStoredCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem('ginaro-cart')) || []

    return Array.isArray(parsed) ? parsed.map(normalizeStoredCartItem).filter(Boolean) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(getStoredCart)

  useEffect(() => {
    localStorage.setItem('ginaro-cart', JSON.stringify(cartItems))
  }, [cartItems])

  const addToCart = (item) => {
    const normalizedItem = normalizeStoredCartItem(item)
    if (!normalizedItem) return

    setCartItems((currentItems) => {
      const existingIndex = currentItems.findIndex(
        (cartItem) =>
          getVariantKey(cartItem) === getVariantKey(normalizedItem) &&
          cartItem.selectedSize === normalizedItem.selectedSize &&
          cartItem.selectedColor === normalizedItem.selectedColor,
      )

      if (existingIndex === -1) {
        return [...currentItems, normalizedItem]
      }

      return currentItems.map((cartItem, index) =>
        index === existingIndex
          ? {
              ...cartItem,
              quantity: normalizeCartQuantity(
                cartItem.quantity + normalizedItem.quantity,
                cartItem.stock || normalizedItem.stock || MAX_CART_ITEM_QUANTITY,
              ),
            }
          : cartItem,
      )
    })
  }

  const updateCartQuantity = (variantKey, quantity, stockLimit) => {
    setCartItems((currentItems) =>
      currentItems.map((item) => {
        if (getVariantKey(item) !== variantKey) return item

        const maxQuantity = Math.max(1, Math.min(MAX_CART_ITEM_QUANTITY, stockLimit || item.stock || 1))
        return {
          ...item,
          stock: stockLimit || item.stock,
          quantity: normalizeCartQuantity(quantity, maxQuantity),
        }
      }),
    )
  }

  const removeFromCart = (variantKey) => {
    setCartItems((currentItems) =>
      currentItems.filter((item) => getVariantKey(item) !== variantKey),
    )
  }

  const clearCart = () => {
    setCartItems([])
  }

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0)

  const value = useMemo(
    () => ({
      cartItems,
      cartCount,
      addToCart,
      updateCartQuantity,
      removeFromCart,
      clearCart,
    }),
    [cartItems, cartCount],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
