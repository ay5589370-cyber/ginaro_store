import ProductCard from './ProductCard.jsx'
import ProductCardSkeleton from './ProductCardSkeleton.jsx'

function ProductGrid({ products, onClearFilters, isLoading = false }) {
  if (isLoading) {
    return (
      <div className="product-grid shop-product-grid" aria-label="Loading products">
        {Array.from({ length: 8 }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="empty-products">
        <h2>No products found.</h2>
        <p>Try changing or clearing some filters.</p>
        <button type="button" onClick={onClearFilters}>
          Clear Filters
        </button>
      </div>
    )
  }

  return (
    <div className="product-grid shop-product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}

export default ProductGrid
