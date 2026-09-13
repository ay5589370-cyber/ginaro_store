function ProductCardSkeleton() {
  return (
    <article className="product-card product-card-skeleton" aria-hidden="true">
      <div className="skeleton-image" />
      <div className="product-details">
        <div className="skeleton-line short" />
        <div className="skeleton-line title" />
        <div className="skeleton-line medium" />
        <div className="skeleton-button" />
      </div>
    </article>
  )
}

export default ProductCardSkeleton
