import AIProductCard from './AIProductCard.jsx'

function AIProductResults({ products, onViewProduct, onAddProduct, onCustomize }) {
  return (
    <div className="ai-product-results">
      {products.slice(0, 4).map((product) => (
        <AIProductCard
          key={product.id}
          product={product}
          onViewProduct={onViewProduct}
          onAddProduct={onAddProduct}
          onCustomize={onCustomize}
        />
      ))}
    </div>
  )
}

export default AIProductResults
