import ProductCard from './ProductCard.jsx'

function RelatedProducts({ products }) {
  if (products.length === 0) return null

  return (
    <section className="related-products section-shell">
      <div className="section-heading">
        <span className="eyebrow">Selected for you</span>
        <h2>You May Also Like</h2>
      </div>
      <div className="product-grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}

export default RelatedProducts
