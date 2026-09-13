import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth.js'
import { useCart } from '../../context/useCart.js'
import { useToast } from '../../context/useToast.js'
import { getCustomDesignSignedUrl } from '../../services/storageService.js'
import ProductImage from '../ProductImage.jsx'

function hasDesign(sideDesign) {
  return Boolean(sideDesign?.template || sideDesign?.upload || sideDesign?.text)
}

function SavedDesignCard({ design, product, onDelete, onDuplicate, isPending = false }) {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { addToCart } = useCart()
  const { showToast } = useToast()
  const [signedPreviewUrl, setSignedPreviewUrl] = useState('')
  const productName = product?.name || design.productName || design.vestName || 'Saved Custom Vest'
  const privatePreviewPath = design.previewImagePath
    || design.frontDesign?.upload?.uploadedAssetPath
    || design.backDesign?.upload?.uploadedAssetPath
  const image = signedPreviewUrl || design.previewImageUrl || product?.images?.[0] || product?.image || ''
  const basePrice = product?.price || design.price || 0
  const customizationPrice = Math.max(0, (design.price || basePrice) - basePrice)
  const frontAdded = hasDesign(design.frontDesign)
  const backAdded = hasDesign(design.backDesign)

  useEffect(() => {
    let isMounted = true
    const timer = window.setTimeout(() => {
      if (!currentUser || !privatePreviewPath) {
        setSignedPreviewUrl('')
        return
      }

      getCustomDesignSignedUrl(currentUser, design.id, privatePreviewPath)
        .then((result) => {
          if (isMounted && result.success) {
            setSignedPreviewUrl(result.signedUrl)
          }
        })
        .catch(() => {
          if (isMounted) setSignedPreviewUrl('')
        })
    }, 0)

    return () => {
      isMounted = false
      window.clearTimeout(timer)
    }
  }, [currentUser, design.id, privatePreviewPath])

  const addDesignToCart = () => {
    if (!product) {
      showToast('This product is currently unavailable.', 'error')
      return
    }

    addToCart({
      id: `saved-${design.id}`,
      customizationId: `saved-${design.id}`,
      designId: design.id,
      productId: product.id,
      type: 'custom',
      name: `${product.name} - Saved Custom Design`,
      image,
      selectedSize: design.size,
      selectedColor: design.baseColor || design.color,
      category: 'Custom Vest',
      quantity: 1,
      stock: product.stock,
      price: design.price || product.price,
      basePrice,
      customizationPrice,
      totalPrice: design.price || product.price,
      frontDesign: design.frontDesign,
      backDesign: design.backDesign,
    })
    showToast('Added custom design to cart.')
  }

  return (
    <article className="saved-design-card">
      <div className="saved-design-preview">
        <ProductImage src={image} alt={`${productName} saved design preview`} />
        <span>Custom</span>
      </div>
      <div>
        <h2>{productName}</h2>
        <p>Color: {design.baseColor || design.color || 'Not selected'}</p>
        <p>Size: {design.size || 'Not selected'}</p>
        <p>
          Front: {frontAdded ? 'Added' : 'None'} / Back: {backAdded ? 'Added' : 'None'}
        </p>
        <small>{design.lastEdited ? `Last edited ${design.lastEdited}` : 'Recently saved'}</small>
      </div>
      <div className="account-card-actions">
        <button type="button" onClick={() => navigate(`/customize?design=${design.id}`)} disabled={isPending}>
          Edit Design
        </button>
        <button type="button" onClick={() => onDuplicate(design.id)} disabled={isPending}>
          Duplicate
        </button>
        <button type="button" onClick={addDesignToCart} disabled={isPending || !product}>
          Add to Cart
        </button>
        <button type="button" onClick={() => onDelete(design.id)} disabled={isPending}>
          Delete
        </button>
      </div>
    </article>
  )
}

export default SavedDesignCard
