import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth.js'
import { useCart } from '../../context/useCart.js'
import { useProducts } from '../../context/useProducts.js'
import { useToast } from '../../context/useToast.js'
import { useWishlist } from '../../context/useWishlist.js'
import { lockBodyScroll } from '../../utils/bodyScrollLock.js'
import { sendAssistantMessage } from '../../services/aiService.js'
import { formatPrice } from '../../utils/formatters.js'
import { parseShoppingCommand } from '../../utils/aiCommandParser.js'
import {
  getRecentSearches,
  getRecentlyViewedIds,
} from '../../utils/productDiscovery.js'
import { getProductCategoryLabel, normalizeProductCategory } from '../../utils/productData.js'
import AIChatHeader from './AIChatHeader.jsx'
import AIChatInput from './AIChatInput.jsx'
import AIFloatingButton from './AIFloatingButton.jsx'
import AIMessage from './AIMessage.jsx'
import AISuggestionChips from './AISuggestionChips.jsx'

const assistantPages = ['/', '/shop', '/cart', '/customize']
const suggestionPrompts = [
  'Find a vest',
  'Shop pajamas',
  'Best sellers',
  'Under ₹999',
  'Customize a vest',
]

function createMessage(role, data) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    ...data,
  }
}

function getStoredMessages() {
  try {
    return JSON.parse(sessionStorage.getItem('ginaro-ai-chat')) || []
  } catch {
    return []
  }
}

function getRecentAssistantProductIds(messages) {
  return messages
    .flatMap((message) => [
      ...(message.products || []),
      ...(message.comparison || []),
    ])
    .map((product) => String(product.id))
    .filter(Boolean)
    .reverse()
    .filter((productId, index, ids) => ids.indexOf(productId) === index)
    .reverse()
    .slice(-10)
}

function getCurrentProduct(location, products) {
  const match = location.pathname.match(/^\/product\/([^/]+)/)
  if (!match) return null

  return products.find(
    (product) => String(product.id) === match[1] || product.slug === match[1],
  ) || null
}

function getFilterSummary(filters) {
  const parts = []
  if (filters.category) parts.push(filters.categoryLabel || getProductCategoryLabel(filters.category))
  if (filters.color) parts.push(filters.color)
  if (filters.size) parts.push(filters.size)
  if (filters.maxPrice) parts.push(`under ${formatPrice(filters.maxPrice)}`)
  if (filters.material) parts.push(filters.material)
  if (filters.materialKeyword) parts.push('cotton')
  if (filters.bestSeller) parts.push('best sellers')
  if (filters.featured) parts.push('featured')
  return parts.length ? parts.join(', ') : 'matching products'
}

function getProductInfoText(product, fields, selectedSize, selectedColor) {
  const lines = []

  if (selectedSize) {
    const sizeStatus = product.sizes.includes(selectedSize) ? 'is available' : 'is not listed'
    lines.push(`${product.name} ${sizeStatus} in ${selectedSize}.`)
  }

  if (selectedColor) {
    const colorStatus = product.colors.includes(selectedColor) ? 'is available' : 'is not listed'
    lines.push(`${product.name} ${colorStatus} in ${selectedColor}.`)
  }

  fields.forEach((field) => {
    if (field === 'material') lines.push(`Material: ${product.material}.`)
    if (field === 'price') lines.push(`Price: ${formatPrice(product.price)}${product.originalPrice ? `, originally ${formatPrice(product.originalPrice)}` : ''}.`)
    if (field === 'stock') lines.push(product.stock > 0 ? `Stock: ${product.stock} available.` : 'Stock: Out of stock.')
    if (field === 'sizes') lines.push(`Sizes: ${product.sizes.join(', ')}.`)
    if (field === 'colors') lines.push(`Colors: ${product.colors.join(', ')}.`)
    if (field === 'rating') lines.push(`Rating: ${product.rating} out of 5.`)
    if (field === 'description') lines.push(product.description)
  })

  if (lines.length === 0) {
    lines.push(`${product.name} is ${formatPrice(product.price)}, made from ${product.material}, and rated ${product.rating}.`)
  }

  return lines.join(' ')
}

function normalizeSize(value) {
  const size = value.trim().toUpperCase()
  return ['S', 'M', 'L', 'XL', 'XXL'].includes(size) ? size : ''
}

function normalizeColor(value) {
  return ['White', 'Black', 'Grey', 'Navy', 'Brown'].find(
    (color) => color.toLowerCase() === value.trim().toLowerCase(),
  ) || ''
}

function AIAssistant() {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { addToCart } = useCart()
  const { showToast } = useToast()
  const { wishlistIds } = useWishlist()
  const { products } = useProducts()
  const currentProduct = useMemo(() => getCurrentProduct(location, products), [location, products])
  const productsById = useMemo(
    () => new Map(products.map((product) => [String(product.id), product])),
    [products],
  )
  const isVisiblePage =
    assistantPages.includes(location.pathname) || location.pathname.startsWith('/product/')
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState(getStoredMessages)
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [pendingAdd, setPendingAdd] = useState(null)
  const inputRef = useRef(null)
  const messagesRef = useRef(null)

  useEffect(() => {
    sessionStorage.setItem('ginaro-ai-chat', JSON.stringify(messages.slice(-30)))
  }, [messages])

  useEffect(() => {
    if (!isOpen) return undefined

    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 80)
    return () => window.clearTimeout(focusTimer)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return undefined

    const mobileQuery = window.matchMedia('(max-width: 700px)')
    let unlockBodyScroll = () => {}
    const syncBodyScroll = () => {
      unlockBodyScroll()
      unlockBodyScroll = mobileQuery.matches ? lockBodyScroll() : () => {}
    }

    syncBodyScroll()
    mobileQuery.addEventListener('change', syncBodyScroll)

    return () => {
      mobileQuery.removeEventListener('change', syncBodyScroll)
      unlockBodyScroll()
    }
  }, [isOpen])

  useEffect(() => {
    messagesRef.current?.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, isTyping])

  if (!isVisiblePage) return null

  const appendAssistantMessage = (message) => {
    setMessages((current) => [...current, createMessage('assistant', message)])
  }

  const getTrustedProductsByIds = (ids = []) =>
    ids
      .map((id) => productsById.get(String(id)))
      .filter(Boolean)
      .filter((product) => product.active !== false)

  const getActionLabel = (action) => {
    if (action.type === 'suggest_add_to_cart') return 'Add to Cart'

    const routeLabels = {
      '/cart': 'Open Cart',
      '/shop': 'Shop All',
      '/shop?category=vest': 'Shop Vests',
      '/shop?category=pajama': 'Shop Pajamas',
      '/shop?category=combo': 'Shop Combos',
      '/customize': 'Customize Vest',
      '/account/orders': 'Track Orders',
      '/login': 'Login',
    }

    return routeLabels[action.route] || 'Open'
  }

  const buildServerResponseMessage = (response) => {
    const products = getTrustedProductsByIds(response.productIds)
    const comparison = getTrustedProductsByIds(response.comparisonProductIds).slice(0, 2)
    const actions = []

    if (response.action === 'suggest_add_to_cart') {
      const product = productsById.get(String(response.actionProductId))
      if (product && product.active !== false) {
        actions.push({
          label: 'Add to Cart',
          type: 'suggest_add_to_cart',
          product,
        })
      }
    }

    if (response.action === 'navigate' && response.actionRoute) {
      const action = { type: 'navigate', route: response.actionRoute }
      actions.push({
        label: getActionLabel(action),
        type: 'navigate',
        route: response.actionRoute,
      })
    }

    if (products.length === 1 && response.intent === 'product_info') {
      actions.push({ label: 'View Product', type: 'view_product', product: products[0] })
    }

    response.suggestions?.slice(0, 3).forEach((prompt) => {
      actions.push({ label: prompt, type: 'prompt', prompt })
    })

    return {
      text: response.reply || "Sorry, I couldn't process that right now.",
      ...(products.length > 0 ? { products } : {}),
      ...(comparison.length > 1 ? { comparison } : {}),
      ...(actions.length > 0 ? { actions } : {}),
    }
  }

  const addNormalProductToCart = (product, selectedSize, selectedColor) => {
    addToCart({
      id: product.id,
      productId: product.id,
      name: product.name,
      image: product.images?.[0] || product.image,
      selectedSize,
      selectedColor,
      price: product.price,
      originalPrice: product.originalPrice,
      category: getProductCategoryLabel(product.category),
      quantity: 1,
      stock: product.stock,
    })
  }

  const buildAddFlowMessage = (product, size = '', color = '') => {
    if (!product) {
      return {
        text: 'I could not identify the exact product to add. Choose one of these matching products first.',
        actions: [{ label: 'View All Products', type: 'navigate', route: '/shop' }],
      }
    }

    if (product.stock === 0) {
      return {
        text: `${product.name} is currently out of stock.`,
        actions: [{ label: 'See Similar', type: 'search_similar', product }],
      }
    }

    const selectedSize = normalizeSize(size)
    const selectedColor = normalizeColor(color)

    if (!selectedSize || !product.sizes.includes(selectedSize)) {
      setPendingAdd({ product, selectedSize: '', selectedColor, step: 'size' })
      return {
        text: `Sure. Which size would you like for ${product.name}?`,
        options: product.sizes,
        optionLabel: `Select size for ${product.name}`,
      }
    }

    if (!selectedColor || !product.colors.includes(selectedColor)) {
      setPendingAdd({ product, selectedSize, selectedColor: '', step: 'color' })
      return {
        text: `Which color would you like for ${product.name}?`,
        options: product.colors,
        optionLabel: `Select color for ${product.name}`,
      }
    }

    addNormalProductToCart(product, selectedSize, selectedColor)
    showToast(`${product.name} added to cart.`)
    setPendingAdd(null)
    return {
      text: `${product.name}, ${selectedSize}, ${selectedColor} has been added to your cart.`,
      actions: [{ label: 'View Cart', type: 'navigate', route: '/cart' }],
    }
  }

  const buildResponse = (parsed) => {
    if (parsed.intent === 'search_products') {
      if (parsed.products.length === 0) {
        return {
          text: "I couldn't find an exact match. Try removing the price filter, choosing another color, or viewing all products.",
          actions: [{ label: 'View All Products', type: 'navigate', route: '/shop' }],
        }
      }

      return {
        text: `I found ${parsed.products.length} ${getFilterSummary(parsed.filters)}. Here are the strongest matches.`,
        products: parsed.products,
      }
    }

    if (parsed.intent === 'product_info') {
      return {
        text: getProductInfoText(
          parsed.product,
          parsed.fields,
          parsed.selectedSize,
          parsed.selectedColor,
        ),
        actions: [{ label: 'View Product', type: 'view_product', product: parsed.product }],
      }
    }

    if (parsed.intent === 'add_to_cart') {
      if (!parsed.product) {
        const matchingProducts = products
          .filter((product) =>
            Object.keys(parsed.filters).length > 0
              ? normalizeProductCategory(product.category) === normalizeProductCategory(parsed.filters.category) || !parsed.filters.category
              : true,
          )
          .slice(0, 4)

        return {
          text: 'I found a few products that may fit. Choose Add to Cart on the one you want.',
          products: matchingProducts,
        }
      }

      return buildAddFlowMessage(parsed.product, parsed.selectedSize, parsed.selectedColor)
    }

    if (parsed.intent === 'navigate') {
      window.setTimeout(() => navigate(parsed.navigation.route), 120)
      return {
        text: `Opening ${parsed.navigation.label}.`,
      }
    }

    if (parsed.intent === 'customize') {
      return {
        text: 'You can upload your own artwork, use free templates or add custom text.',
        actions: [
          {
            label: 'Open Customizer',
            type: 'navigate',
            route: parsed.navigation.route,
          },
        ],
      }
    }

    if (parsed.intent === 'compare_products') {
      if (parsed.products.length < 2) {
        return {
          text: 'I need two product names to compare. For example, compare Premium Cotton Vest and Classic Ribbed Vest.',
          actions: [{ label: 'Show Best Sellers', type: 'prompt', prompt: 'Show best-selling vests' }],
        }
      }

      return {
        text: `Here is a quick comparison of ${parsed.products[0].name} and ${parsed.products[1].name}.`,
        comparison: parsed.products,
      }
    }

    return {
      text: 'I can currently help you find products by category, price, size, color and material.',
      actions: suggestionPrompts.slice(0, 3).map((prompt) => ({
        label: prompt,
        type: 'prompt',
        prompt,
      })),
    }
  }

  const respondWithDelay = (responseBuilder) => {
    setIsTyping(true)
    window.setTimeout(() => {
      const response = typeof responseBuilder === 'function' ? responseBuilder() : responseBuilder
      appendAssistantMessage(response)
      setIsTyping(false)
    }, 260)
  }

  const handleSend = async (rawMessage) => {
    const text = rawMessage.trim()
    if (!text) return

    setInputValue('')
    const userMessage = createMessage('user', { text })
    const previousMessages = messages
    setMessages((current) => [...current, userMessage])

    if (pendingAdd) {
      respondWithDelay(() => {
        const requestedSize = pendingAdd.step === 'size' ? normalizeSize(text) : pendingAdd.selectedSize
        const requestedColor = pendingAdd.step === 'color' ? normalizeColor(text) : pendingAdd.selectedColor
        return buildAddFlowMessage(pendingAdd.product, requestedSize, requestedColor)
      })
      return
    }

    setIsTyping(true)

    try {
      const response = await sendAssistantMessage({
        message: text,
        messages: previousMessages,
        currentUser,
        context: {
          currentProductId: currentProduct?.id || '',
          pagePath: `${location.pathname}${location.search}`,
          recentSearches: getRecentSearches(),
          recentlyViewedIds: getRecentlyViewedIds(),
          recentProductIds: getRecentAssistantProductIds(previousMessages),
          wishlistProductIds: wishlistIds,
        },
      })

      appendAssistantMessage(buildServerResponseMessage(response))
    } catch (error) {
      console.warn('GINARO AI service unavailable', {
        code: error.code || 'AI_CHAT_FAILED',
        status: error.status || null,
      })

      const fallbackResponse = buildResponse(parseShoppingCommand(text, products, { currentProduct }))
      appendAssistantMessage({
        ...fallbackResponse,
        text: `${fallbackResponse.text} Sorry, I couldn't reach the AI service right now, so I used the basic store assistant.`,
      })
    } finally {
      setIsTyping(false)
    }
  }

  const handleOptionSelect = (option) => {
    if (!pendingAdd) return

    setMessages((current) => [...current, createMessage('user', { text: option })])
    respondWithDelay(() => {
      const requestedSize = pendingAdd.step === 'size' ? option : pendingAdd.selectedSize
      const requestedColor = pendingAdd.step === 'color' ? option : pendingAdd.selectedColor
      return buildAddFlowMessage(pendingAdd.product, requestedSize, requestedColor)
    })
  }

  const handleAction = (action) => {
    if (action.type === 'navigate') {
      navigate(action.route)
      setIsOpen(false)
    }

    if (action.type === 'view_product') {
      navigate(`/product/${action.product.id}`)
      setIsOpen(false)
    }

    if (action.type === 'prompt') {
      handleSend(action.prompt)
    }

    if (action.type === 'suggest_add_to_cart') {
      respondWithDelay(() => buildAddFlowMessage(action.product))
    }

    if (action.type === 'search_similar') {
      respondWithDelay(
        buildResponse({
          intent: 'search_products',
          filters: { category: action.product.category },
          products: products.filter(
            (product) =>
              normalizeProductCategory(product.category) === normalizeProductCategory(action.product.category)
              && product.id !== action.product.id,
          ),
        }),
      )
    }
  }

  const viewProduct = (product) => {
    navigate(`/product/${product.id}`)
    setIsOpen(false)
  }

  const customizeProduct = (product) => {
    navigate(`/customize?product=${product.id}`)
    setIsOpen(false)
  }

  const clearChat = () => {
    setMessages([])
    setPendingAdd(null)
    setInputValue('')
    sessionStorage.removeItem('ginaro-ai-chat')
  }

  return (
    <>
      <AIFloatingButton
        isOpen={isOpen}
        isRaised={location.pathname === '/cart'}
        onOpen={() => setIsOpen(true)}
      />

      {isOpen && (
        <section className="ai-assistant-panel" role="dialog" aria-modal="true" aria-label="GINARO Assistant">
          <AIChatHeader onClose={() => setIsOpen(false)} onClear={clearChat} />

          <div className="ai-chat-messages" ref={messagesRef}>
            {messages.length === 0 && (
              <div className="ai-welcome-state">
                <span className="eyebrow">Shopping help</span>
                <h3>Hi! I'm the GINARO Shopping Assistant.</h3>
                <p>
                  I can help you find vests, pajamas, combos, or customized products.
                </p>
                <AISuggestionChips suggestions={suggestionPrompts} onSelect={handleSend} />
              </div>
            )}

            {messages.map((message) => (
              <AIMessage
                key={message.id}
                message={message}
                onAction={handleAction}
                onOptionSelect={handleOptionSelect}
                onViewProduct={viewProduct}
                onAddProduct={(product) => respondWithDelay(() => buildAddFlowMessage(product))}
                onCustomize={customizeProduct}
              />
            ))}

            {isTyping && (
              <div className="ai-typing" aria-label="Assistant is typing">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>

          <AIChatInput
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSend}
            isTyping={isTyping}
            inputRef={inputRef}
          />
          <p className="ai-disclaimer">Product information is based on current store data.</p>
        </section>
      )}
    </>
  )
}

export default AIAssistant
