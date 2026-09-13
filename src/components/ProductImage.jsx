import { useState } from 'react'

function ProductImage({ src, alt, className = '', loading = 'lazy' }) {
  const [hasError, setHasError] = useState(false)

  if (!src || hasError) {
    return (
      <div className={`product-image-fallback ${className}`} role="img" aria-label={alt}>
        <span>GINARO</span>
        <small>Product image coming soon</small>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setHasError(true)}
    />
  )
}

export default ProductImage
