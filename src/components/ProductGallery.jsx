import { useState } from 'react'
import ProductImage from './ProductImage.jsx'

function ProductGallery({ product }) {
  const images = product.images?.length ? product.images : [product.image]
  const [activeImage, setActiveImage] = useState(images[0])

  return (
    <section className="product-gallery" aria-label={`${product.name} image gallery`}>
      <div className="gallery-thumbnails" aria-label="Product thumbnails">
        {images.map((image, index) => (
          <button
            type="button"
            key={`${image}-${index}`}
            className={activeImage === image ? 'is-active' : ''}
            onClick={() => setActiveImage(image)}
            aria-label={`Show ${product.name} image ${index + 1}`}
          >
            <ProductImage src={image} alt={`${product.name} thumbnail ${index + 1}`} />
          </button>
        ))}
      </div>
      <div className="gallery-main">
        <ProductImage src={activeImage} alt={product.name} loading="eager" />
      </div>
    </section>
  )
}

export default ProductGallery
