import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ErrorState from '../../components/ErrorState.jsx'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'
import { useProducts } from '../../context/useProducts.js'
import { useToast } from '../../context/useToast.js'
import {
  createAdminProduct,
  getAdminErrorMessage,
  getAdminProductById,
  updateAdminProduct,
} from '../../services/adminService.js'
import { PRODUCT_CATEGORIES, generateProductSlug } from '../../utils/productData.js'

const initialProduct = {
  name: '',
  slug: '',
  category: 'vest',
  price: '',
  originalPrice: '',
  description: '',
  material: '',
  sizes: 'S, M, L, XL',
  colors: '',
  images: '',
  stock: '0',
  rating: '0',
  reviewCount: '0',
  featured: false,
  bestSeller: false,
  active: true,
  customizable: false,
  tags: '',
}

function arrayToText(value) {
  return Array.isArray(value) ? value.join(', ') : ''
}

function imageArrayToText(value) {
  return Array.isArray(value) ? value.join('\n') : ''
}

function textToArray(value) {
  return String(value || '')
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function productToForm(product) {
  return {
    name: product.name || '',
    slug: product.slug || '',
    category: product.category || 'vest',
    price: String(product.price ?? ''),
    originalPrice: product.originalPrice == null ? '' : String(product.originalPrice),
    description: product.description || '',
    material: product.material || '',
    sizes: arrayToText(product.sizes),
    colors: arrayToText(product.colors),
    images: imageArrayToText(product.images),
    stock: String(product.stock ?? 0),
    rating: String(product.rating ?? 0),
    reviewCount: String(product.reviewCount ?? 0),
    featured: Boolean(product.featured),
    bestSeller: Boolean(product.bestSeller),
    active: Boolean(product.active),
    customizable: Boolean(product.customizable),
    tags: arrayToText(product.tags),
  }
}

function formToProduct(form) {
  return {
    name: form.name,
    slug: form.slug || generateProductSlug(form.name),
    category: form.category,
    price: Number(form.price),
    originalPrice: form.originalPrice === '' ? null : Number(form.originalPrice),
    description: form.description,
    material: form.material,
    sizes: textToArray(form.sizes),
    colors: textToArray(form.colors),
    images: textToArray(form.images),
    stock: Number(form.stock),
    rating: Number(form.rating),
    reviewCount: Number(form.reviewCount),
    featured: form.featured,
    bestSeller: form.bestSeller,
    active: form.active,
    customizable: form.customizable,
    tags: textToArray(form.tags),
  }
}

function validateForm(form) {
  const errors = {}

  if (!form.name.trim()) errors.name = 'Product name is required.'
  if (!form.slug.trim() && !generateProductSlug(form.name)) errors.slug = 'Slug is required.'
  if (!PRODUCT_CATEGORIES.includes(form.category)) errors.category = 'Choose a valid category.'
  if (!Number.isFinite(Number(form.price)) || Number(form.price) < 0) errors.price = 'Price must be 0 or higher.'
  if (
    form.originalPrice !== ''
    && (!Number.isFinite(Number(form.originalPrice)) || Number(form.originalPrice) < Number(form.price))
  ) {
    errors.originalPrice = 'Original price must be empty or greater than price.'
  }
  if (!Number.isInteger(Number(form.stock)) || Number(form.stock) < 0) errors.stock = 'Stock must be a non-negative integer.'
  if (!Number.isFinite(Number(form.rating)) || Number(form.rating) < 0 || Number(form.rating) > 5) errors.rating = 'Rating must be 0 to 5.'
  if (!Number.isInteger(Number(form.reviewCount)) || Number(form.reviewCount) < 0) errors.reviewCount = 'Review count must be a non-negative integer.'

  return errors
}

function AdminProductForm() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const { refreshProducts } = useProducts()
  const { showToast } = useToast()
  const [form, setForm] = useState(initialProduct)
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEditing) return undefined

    let isMounted = true

    getAdminProductById(id)
      .then((product) => {
        if (!isMounted) return
        if (!product) {
          setError('Product not found.')
          return
        }
        setForm(productToForm(product))
      })
      .catch((error) => {
        if (isMounted) setError(getAdminErrorMessage(error, 'Unable to load product.'))
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [id, isEditing])

  const title = isEditing ? 'Edit Product' : 'Add Product'
  const generatedSlug = useMemo(() => generateProductSlug(form.name), [form.name])

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'name' && !current.slug ? { slug: generateProductSlug(value) } : {}),
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validateForm(form)
    setFieldErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    setError('')

    try {
      if (isEditing) {
        await updateAdminProduct(id, formToProduct(form))
        showToast('Product updated')
      } else {
        const product = await createAdminProduct(formToProduct(form))
        showToast('Product created')
        navigate(`/admin/products/${product.id}/edit`, { replace: true })
      }

      await refreshProducts()
    } catch (error) {
      const message = getAdminErrorMessage(error, 'Unable to save product.')
      setError(message)
      showToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner label="Loading product" />

  if (error === 'Product not found.') {
    return (
      <ErrorState
        title="Product not found."
        message="Check the product list and try again."
        actionLabel="Back to Products"
        onAction={() => navigate('/admin/products')}
      />
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <span>Catalog</span>
          <h1>{title}</h1>
        </div>
        <Link className="button button-secondary" to="/admin/products">
          Back to Products
        </Link>
      </div>

      <form className="admin-form" onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}

        <div className="admin-form-grid">
          <label>
            <span>Name</span>
            <input value={form.name} onChange={(event) => updateField('name', event.target.value)} />
            {fieldErrors.name && <small>{fieldErrors.name}</small>}
          </label>
          <label>
            <span>Slug</span>
            <input value={form.slug} placeholder={generatedSlug} onChange={(event) => updateField('slug', event.target.value)} />
            {fieldErrors.slug && <small>{fieldErrors.slug}</small>}
          </label>
          <label>
            <span>Category</span>
            <select value={form.category} onChange={(event) => updateField('category', event.target.value)}>
              <option value="vest">Vest</option>
              <option value="pajama">Pajama</option>
              <option value="combo">Combo</option>
            </select>
            {fieldErrors.category && <small>{fieldErrors.category}</small>}
          </label>
          <label>
            <span>Material</span>
            <input value={form.material} onChange={(event) => updateField('material', event.target.value)} />
          </label>
          <label>
            <span>Price</span>
            <input type="number" min="0" value={form.price} onChange={(event) => updateField('price', event.target.value)} />
            {fieldErrors.price && <small>{fieldErrors.price}</small>}
          </label>
          <label>
            <span>Original Price</span>
            <input type="number" min="0" value={form.originalPrice} onChange={(event) => updateField('originalPrice', event.target.value)} />
            {fieldErrors.originalPrice && <small>{fieldErrors.originalPrice}</small>}
          </label>
          <label>
            <span>Stock</span>
            <input type="number" min="0" step="1" value={form.stock} onChange={(event) => updateField('stock', event.target.value)} />
            {fieldErrors.stock && <small>{fieldErrors.stock}</small>}
          </label>
          <label>
            <span>Rating</span>
            <input type="number" min="0" max="5" step="0.1" value={form.rating} onChange={(event) => updateField('rating', event.target.value)} />
            {fieldErrors.rating && <small>{fieldErrors.rating}</small>}
          </label>
          <label>
            <span>Review Count</span>
            <input type="number" min="0" step="1" value={form.reviewCount} onChange={(event) => updateField('reviewCount', event.target.value)} />
            {fieldErrors.reviewCount && <small>{fieldErrors.reviewCount}</small>}
          </label>
          <label>
            <span>Sizes</span>
            <input value={form.sizes} onChange={(event) => updateField('sizes', event.target.value)} />
          </label>
          <label>
            <span>Colors</span>
            <input value={form.colors} onChange={(event) => updateField('colors', event.target.value)} />
          </label>
          <label>
            <span>Tags</span>
            <input value={form.tags} onChange={(event) => updateField('tags', event.target.value)} />
          </label>
        </div>

        <label className="admin-form-wide">
          <span>Description</span>
          <textarea value={form.description} rows="5" onChange={(event) => updateField('description', event.target.value)} />
        </label>

        <label className="admin-form-wide">
          <span>Image URLs</span>
          <textarea value={form.images} rows="5" onChange={(event) => updateField('images', event.target.value)} />
        </label>

        <div className="admin-switch-row">
          {[
            ['active', 'Active'],
            ['featured', 'Featured'],
            ['bestSeller', 'Best Seller'],
            ['customizable', 'Customizable'],
          ].map(([field, label]) => (
            <label key={field}>
              <input
                type="checkbox"
                checked={form[field]}
                onChange={(event) => updateField(field, event.target.checked)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        <div className="admin-form-actions">
          <button type="submit" className="button button-primary" disabled={saving}>
            {saving ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AdminProductForm
