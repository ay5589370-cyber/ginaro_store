import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import AccountLayout from '../components/account/AccountLayout.jsx'
import ErrorState from '../components/ErrorState.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import ProductImage from '../components/ProductImage.jsx'
import { useCart } from '../context/useCart.js'
import { useProducts } from '../context/useProducts.js'
import { useToast } from '../context/useToast.js'
import { useWishlist } from '../context/useWishlist.js'
import { formatPrice } from '../utils/formatters.js'
import { getProductCategoryLabel } from '../utils/productData.js'

function Wishlist() {
  const { addToCart } = useCart()
  const { products, loading, error, refreshProducts } = useProducts()
  const { showToast } = useToast()
  const {
    wishlistItems,
    wishlistLoading,
    wishlistError,
    removeWishlistItem,
    isWishlistUpdating,
    refreshWishlist,
  } = useWishlist()
  const wishlistProducts = useMemo(
    () => wishlistItems.map((item) => {
      const liveProduct = products.find((product) => String(product.id) === String(item.productId))

      return liveProduct || {
        id: item.productId,
        productId: item.productId,
        name: item.name,
        price: item.price,
        originalPrice: null,
        image: item.image,
        images: item.image ? [item.image] : [],
        category: item.category,
        material: 'Product currently unavailable.',
        sizes: [],
        colors: [],
        stock: 0,
        rating: 0,
        reviewCount: 0,
        active: false,
      }
    }),
    [products, wishlistItems],
  )

  const addWishlistItemToCart = (product) => {
    if (product.stock === 0) return

    addToCart({
      id: product.id,
      productId: product.id,
      name: product.name,
      image: product.images?.[0] || product.image,
      selectedSize: product.sizes[0],
      selectedColor: product.colors[0],
      price: product.price,
      originalPrice: product.originalPrice,
      category: getProductCategoryLabel(product.category),
      quantity: 1,
      stock: product.stock,
    })
    showToast(`${product.name} added to cart.`)
  }

  return (
    <AccountLayout title="Wishlist" text="Products you saved for later.">
      {wishlistLoading || loading ? (
        <LoadingSpinner label="Loading wishlist" />
      ) : (wishlistError || (error && products.length === 0)) ? (
        <ErrorState
          title={wishlistError ? 'Unable to load wishlist right now.' : 'Unable to load products right now.'}
          message="Please try again in a moment."
          actionLabel="Try Again"
          onAction={wishlistError ? refreshWishlist : refreshProducts}
        />
      ) : wishlistProducts.length === 0 ? (
        <section className="account-empty-state">
          <h2>Your wishlist is empty.</h2>
          <p>Save products you love and find them here.</p>
          <Link className="button button-primary" to="/shop">
            Explore Products
          </Link>
        </section>
      ) : (
        <>
          <div className="wishlist-grid">
            {wishlistProducts.map((product) => (
              <article className="wishlist-card" key={product.id}>
                <ProductImage src={product.images?.[0] || product.image} alt={product.name} />
                <div>
                  <span>{getProductCategoryLabel(product.category)}</span>
                  <h2>{product.name}</h2>
                  <p>{product.material}</p>
                  <strong>{formatPrice(product.price)}</strong>
                </div>
                <div className="account-card-actions">
                  <Link to={`/product/${product.id}`}>View Product</Link>
                  <button type="button" onClick={() => addWishlistItemToCart(product)} disabled={product.stock === 0}>
                    {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                  </button>
                  <button
                    type="button"
                    disabled={isWishlistUpdating(product.id)}
                    onClick={async () => {
                      const result = await removeWishlistItem(product.id)
                      showToast(result.message, result.status === 'error' ? 'error' : 'success')
                    }}
                  >
                    Remove from Wishlist
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </AccountLayout>
  )
}

export default Wishlist
