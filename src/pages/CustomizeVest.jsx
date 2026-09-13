import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import CustomizationSummary from '../components/customizer/CustomizationSummary.jsx'
import CustomizerSteps from '../components/customizer/CustomizerSteps.jsx'
import DesignControls from '../components/customizer/DesignControls.jsx'
import DesignUploader from '../components/customizer/DesignUploader.jsx'
import TemplateSelector from '../components/customizer/TemplateSelector.jsx'
import TextEditor from '../components/customizer/TextEditor.jsx'
import VestPreview from '../components/customizer/VestPreview.jsx'
import VestSelector from '../components/customizer/VestSelector.jsx'
import ErrorState from '../components/ErrorState.jsx'
import Footer from '../components/Footer.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import Navbar from '../components/Navbar.jsx'
import { customTemplates } from '../data/customTemplates.js'
import { useAuth } from '../context/useAuth.js'
import { useCart } from '../context/useCart.js'
import { useDesigns } from '../context/useDesigns.js'
import { useProducts } from '../context/useProducts.js'
import { useToast } from '../context/useToast.js'
import { getCustomDesignSignedUrl, uploadCustomDesign } from '../services/storageService.js'
import { getCustomizationPricing, hasSideDesign } from '../utils/customizationPricing.js'

function createTextDesign() {
  return {
    value: '',
    font: 'Georgia, serif',
    fontSize: 28,
    color: '#14110c',
    bold: false,
    italic: false,
    align: 'center',
    visible: true,
  }
}

function createSideDesign() {
  return {
    template: null,
    upload: null,
    text: createTextDesign(),
    position: 'center',
    size: 'medium',
  }
}

function createDesignState() {
  return {
    front: createSideDesign(),
    back: createSideDesign(),
  }
}

function hasAnyCustomization(designState) {
  return hasSideDesign(designState.front) || hasSideDesign(designState.back)
}

function revokeUpload(upload) {
  if (upload?.previewUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(upload.previewUrl)
  }
}

function serializeSideDesign(sideDesign) {
  return {
    template: sideDesign.template
      ? {
          templateId: sideDesign.template.templateId || sideDesign.template.id,
          name: sideDesign.template.name,
          category: sideDesign.template.category,
        }
      : null,
    upload: sideDesign.upload
      ? {
          fileName: sideDesign.upload.fileName,
          fileType: sideDesign.upload.fileType,
          fileSize: sideDesign.upload.fileSize,
          uploadedAssetPath: sideDesign.upload.uploadedAssetPath || sideDesign.upload.storagePath || null,
          uploadedAssetUrl: sideDesign.upload.uploadedAssetUrl || null,
        }
      : null,
    text: sideDesign.text.value.trim()
      ? {
          value: sideDesign.text.value,
          fontFamily: sideDesign.text.font,
          fontSize: sideDesign.text.fontSize,
          textColor: sideDesign.text.color,
          bold: sideDesign.text.bold,
          italic: sideDesign.text.italic,
          alignment: sideDesign.text.align,
          visible: sideDesign.text.visible,
          x: 0,
          y: 0,
          scale: 1,
        }
      : null,
    position: sideDesign.position,
    size: sideDesign.size,
  }
}

function getInitialVest(productId, products) {
  if (!productId) return null

  return products.find((product) => String(product.id) === String(productId) && product.customizable) || null
}

function getTemplateById(templateId) {
  return customTemplates.find((template) => String(template.id) === String(templateId)) || null
}

function deserializeTextDesign(text) {
  if (!text) return createTextDesign()

  return {
    value: text.value || '',
    font: text.fontFamily || text.font || 'Georgia, serif',
    fontSize: Number(text.fontSize) || 28,
    color: text.textColor || text.color || '#14110c',
    bold: Boolean(text.bold),
    italic: Boolean(text.italic),
    align: text.alignment || text.align || 'center',
    visible: text.visible === undefined ? true : Boolean(text.visible),
  }
}

function deserializeSideDesign(sideDesign) {
  if (!sideDesign) return createSideDesign()

  const templateId = sideDesign.template?.templateId || sideDesign.template?.id
  const template = templateId ? getTemplateById(templateId) : null
  const uploadUrl = sideDesign.upload?.signedPreviewUrl || sideDesign.upload?.uploadedAssetUrl || ''

  return {
    template: template
      ? { ...template, visible: true }
      : sideDesign.template
        ? {
            id: templateId,
            name: sideDesign.template.name,
            category: sideDesign.template.category,
            fullDesignImage: sideDesign.template.fullDesignImage || '',
            previewImage: sideDesign.template.previewImage || '',
            visible: Boolean(sideDesign.template.fullDesignImage),
          }
        : null,
    upload: sideDesign.upload
      ? {
          fileName: sideDesign.upload.fileName,
          fileType: sideDesign.upload.fileType,
          fileSize: sideDesign.upload.fileSize,
          uploadedAssetPath: sideDesign.upload.uploadedAssetPath,
          uploadedAssetUrl: sideDesign.upload.uploadedAssetUrl || null,
          previewUrl: uploadUrl,
          visible: Boolean(uploadUrl),
        }
      : null,
    text: deserializeTextDesign(sideDesign.text),
    position: sideDesign.position || 'center',
    size: sideDesign.size || 'medium',
  }
}

async function attachSignedUploadUrl(user, designId, sideDesign) {
  const storagePath = sideDesign?.upload?.uploadedAssetPath

  if (!storagePath) return sideDesign

  const signedUrlResult = await getCustomDesignSignedUrl(user, designId, storagePath)

  if (!signedUrlResult.success) return sideDesign

  return {
    ...sideDesign,
    upload: {
      ...sideDesign.upload,
      signedPreviewUrl: signedUrlResult.signedUrl,
    },
  }
}

function CustomizeVest() {
  const [searchParams] = useSearchParams()
  const productId = searchParams.get('product')
  const designId = searchParams.get('design')
  const {
    products,
    loading: productsLoading,
    error: productsError,
    refreshProducts,
  } = useProducts()
  const vestProducts = useMemo(
    () => products.filter((product) => product.customizable),
    [products],
  )
  const { currentUser, authLoading } = useAuth()
  const uid = currentUser?.uid
  const { addToCart } = useCart()
  const {
    loadDesign,
    saveDesign: saveUserDesign,
    updateDesign: updateUserDesign,
    pendingDesignId,
  } = useDesigns()
  const { showToast } = useToast()
  const [selectedVest, setSelectedVest] = useState(null)
  const [selectedColor, setSelectedColor] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [activeView, setActiveView] = useState('front')
  const [designState, setDesignState] = useState(createDesignState)
  const [validationMessage, setValidationMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [savedDesignId, setSavedDesignId] = useState('')
  const [designLoadError, setDesignLoadError] = useState('')
  const [isRestoringDesign, setIsRestoringDesign] = useState(Boolean(designId))
  const [isSavingDesign, setIsSavingDesign] = useState(false)

  const activeSideDesign = designState[activeView]
  const pricing = useMemo(
    () => getCustomizationPricing(selectedVest, designState),
    [selectedVest, designState],
  )
  const currentStep = !selectedVest
    ? 0
    : hasAnyCustomization(designState)
      ? selectedSize && selectedColor
        ? 3
        : 2
      : 1

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (designId) return
      const initialVest = getInitialVest(productId, vestProducts)

      if (!initialVest) return

      setSelectedVest((currentVest) => currentVest || initialVest)
      setSelectedColor((currentColor) => currentColor || initialVest.colors[0] || '')
    }, 0)

    return () => window.clearTimeout(timer)
  }, [designId, productId, vestProducts])

  useEffect(() => {
    let isMounted = true
    const timer = window.setTimeout(() => {
      if (!designId) {
        setIsRestoringDesign(false)
        setDesignLoadError('')
        setSavedDesignId('')
        return
      }

      if (authLoading || productsLoading) {
        setIsRestoringDesign(true)
        return
      }

      if (!uid) {
        setIsRestoringDesign(false)
        setDesignLoadError('Please log in to open this saved design.')
        return
      }

      setIsRestoringDesign(true)
      setDesignLoadError('')

      loadDesign(designId)
        .then((result) => {
          if (!isMounted) return

          if (!result.design) {
            setDesignLoadError(result.message || 'Saved design not found.')
            return
          }

          const vest = getInitialVest(result.design.productId, vestProducts)

          if (!vest) {
            setDesignLoadError('The base vest for this saved design is no longer available.')
            return
          }

          return Promise.all([
            attachSignedUploadUrl(currentUser, result.design.id, result.design.frontDesign),
            attachSignedUploadUrl(currentUser, result.design.id, result.design.backDesign),
          ]).then(([frontDesign, backDesign]) => {
            if (!isMounted) return

            setSavedDesignId(result.design.id)
            setSelectedVest(vest)
            setSelectedColor(result.design.baseColor || vest.colors[0] || '')
            setSelectedSize(result.design.size || '')
            setQuantity(1)
            setActiveView(result.design.frontDesign ? 'front' : result.design.backDesign ? 'back' : 'front')
            setDesignState({
              front: deserializeSideDesign(frontDesign),
              back: deserializeSideDesign(backDesign),
            })
            setValidationMessage('')
            setSuccessMessage('')
          })
        })
        .catch(() => {
          if (isMounted) setDesignLoadError('Unable to load saved design.')
        })
        .finally(() => {
          if (isMounted) setIsRestoringDesign(false)
        })
    }, 0)

    return () => {
      isMounted = false
      window.clearTimeout(timer)
    }
  }, [authLoading, currentUser, designId, loadDesign, productsLoading, uid, vestProducts])

  const updateActiveSide = (updater) => {
    setDesignState((currentDesign) => ({
      ...currentDesign,
      [activeView]: updater(currentDesign[activeView]),
    }))
  }

  const selectVest = (vest) => {
    setSelectedVest(vest)
    setSelectedColor(vest.colors[0] || '')
    setSelectedSize('')
    setQuantity(1)
    setSavedDesignId('')
    setValidationMessage('')
    setSuccessMessage('')
  }

  const handleApplyTemplate = (template) => {
    updateActiveSide((sideDesign) => ({
      ...sideDesign,
      template: { ...template, visible: true },
    }))
    setSuccessMessage('')
  }

  const handleUpload = (upload) => {
    updateActiveSide((sideDesign) => {
      revokeUpload(sideDesign.upload)
      return {
        ...sideDesign,
        upload,
      }
    })
    setSuccessMessage('')
  }

  const handleRemoveUpload = () => {
    updateActiveSide((sideDesign) => {
      revokeUpload(sideDesign.upload)
      return {
        ...sideDesign,
        upload: null,
      }
    })
  }

  const resetDesign = () => {
    const shouldConfirm = hasAnyCustomization(designState)
    if (shouldConfirm && !window.confirm('Clear your current vest design?')) return

    revokeUpload(designState.front.upload)
    revokeUpload(designState.back.upload)
    setDesignState(createDesignState())
    setValidationMessage('')
    setSuccessMessage('Design reset. Your selected vest is still ready.')
    showToast('Design reset.')
  }

  const buildDesignPayload = (nextDesignState = designState) => ({
    productId: selectedVest.id,
    productName: selectedVest.name,
    baseColor: selectedColor,
    size: selectedSize,
    frontDesign: serializeSideDesign(nextDesignState.front),
    backDesign: serializeSideDesign(nextDesignState.back),
    previewImageUrl: null,
    uploadedAssetUrls: [],
    price: pricing.totalPrice,
    status: 'saved',
  })

  const uploadPendingAssets = async (nextDesignId) => {
    let nextDesignState = designState

    for (const side of ['front', 'back']) {
      const upload = nextDesignState[side].upload

      if (!upload?.file || upload.uploadedAssetPath) continue

      setSuccessMessage(`Uploading ${side} design artwork...`)

      const uploadResult = await uploadCustomDesign(currentUser, upload.file, {
        designId: nextDesignId,
        side,
      })

      if (!uploadResult.success) {
        const error = new Error(uploadResult.error?.message || 'Unable to upload design artwork.')
        error.code = uploadResult.error?.code || 'storage/upload-failed'
        throw error
      }

      nextDesignState = {
        ...nextDesignState,
        [side]: {
          ...nextDesignState[side],
          upload: {
            ...upload,
            uploadedAssetPath: uploadResult.storagePath,
            uploadedAssetUrl: null,
            previewUrl: upload.previewUrl,
            visible: true,
          },
        },
      }

      await updateUserDesign(nextDesignId, buildDesignPayload(nextDesignState))
      setDesignState(nextDesignState)
    }

    return nextDesignState
  }

  const saveDesign = async () => {
    if (!selectedVest) {
      setValidationMessage('Choose a vest before saving your design.')
      setSuccessMessage('')
      return
    }

    if (!selectedColor || !selectedSize) {
      setValidationMessage('Please choose a vest color and size before saving.')
      setSuccessMessage('')
      return
    }

    if (!uid) {
      setValidationMessage('Please log in to save your design.')
      setSuccessMessage('')
      showToast('Please log in to save your design.', 'error')
      return
    }

    setIsSavingDesign(true)

    try {
      const payload = buildDesignPayload()
      const result = savedDesignId
        ? await updateUserDesign(savedDesignId, payload)
        : await saveUserDesign(payload)

      if (result.status === 'error' || result.status === 'auth-required') {
        setValidationMessage(result.message || 'Unable to save your design. Please try again.')
        setSuccessMessage('')
        showToast(result.message || 'Unable to save your design. Please try again.', 'error')
        return
      }

      const nextDesignId = result.design?.id || savedDesignId
      setSavedDesignId(nextDesignId)
      const nextDesignState = await uploadPendingAssets(nextDesignId)
      const hasNewUploads = nextDesignState !== designState
      const finalResult = hasNewUploads
        ? await updateUserDesign(nextDesignId, buildDesignPayload(nextDesignState))
        : result

      if (finalResult.status === 'error') {
        setValidationMessage(finalResult.message || 'Unable to save your design. Please try again.')
        setSuccessMessage('')
        showToast(finalResult.message || 'Unable to save your design. Please try again.', 'error')
        return
      }

      setDesignState(nextDesignState)
      setSavedDesignId(nextDesignId)
      setValidationMessage('')
      setSuccessMessage(finalResult.message || result.message)
      showToast(finalResult.message || result.message)
    } catch (error) {
      const message = error?.message || 'Unable to save your design. Please try again.'
      setValidationMessage(message)
      setSuccessMessage('')
      showToast(message, 'error')
    } finally {
      setIsSavingDesign(false)
    }
  }

  const addCustomizedVestToCart = () => {
    if (!selectedVest || !selectedSize || !selectedColor) {
      setValidationMessage('Please choose a vest, size and color before adding to cart.')
      setSuccessMessage('')
      return
    }

    const customizationId = `custom-${selectedVest.id}-${Date.now()}`

    addToCart({
      id: customizationId,
      customizationId,
      productId: selectedVest.id,
      type: 'custom',
      name: `${selectedVest.name} - Custom Design`,
      image: selectedVest.images?.[0] || selectedVest.image,
      selectedSize,
      selectedColor,
      category: 'Custom Vest',
      quantity,
      stock: selectedVest.stock,
      price: pricing.totalPrice,
      basePrice: pricing.basePrice,
      customizationPrice: pricing.customizationPrice,
      totalPrice: pricing.totalPrice,
      frontDesign: serializeSideDesign(designState.front),
      backDesign: serializeSideDesign(designState.back),
      createdAt: new Date().toISOString(),
    })

    setValidationMessage('')
    setSuccessMessage('Customized vest added to cart.')
    showToast('Customized vest added to cart.')
  }

  return (
    <div className="page customize-page">
      <Navbar />
      <main>
        <section className="customize-hero section-shell">
          <div className="breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>Customize Vest</span>
          </div>
          <h1>Design Your Own Vest</h1>
          <p>
            Create something that&apos;s completely yours. Start with a vest, add your artwork,
            logo or text, and preview your design before ordering.
          </p>
        </section>

        <section className="customizer-workspace section-shell">
          {productsLoading ? (
            <LoadingSpinner label="Loading customizable products" />
          ) : isRestoringDesign ? (
            <LoadingSpinner label="Loading saved design" />
          ) : productsError && products.length === 0 ? (
            <ErrorState
              title="Unable to load products right now."
              message="Please try again in a moment."
              actionLabel="Try Again"
              onAction={refreshProducts}
            />
          ) : designLoadError && !selectedVest ? (
            <ErrorState
              title="Unable to load saved design."
              message={designLoadError}
            />
          ) : (
            <>
              <CustomizerSteps currentStep={currentStep} />

              <div className="customizer-layout">
            <div className="customizer-controls" id="choose-vest">
              <VestSelector
                vests={vestProducts}
                selectedVest={selectedVest}
                onSelectVest={selectVest}
              />

              <section className="customizer-card">
                <div className="customizer-section-head">
                  <h2>Vest Color</h2>
                </div>
                {selectedVest ? (
                  <div className="custom-color-row" role="radiogroup" aria-label="Select vest color">
                    {selectedVest.colors.map((color) => (
                      <button
                        type="button"
                        key={color}
                        className={selectedColor === color ? 'is-selected' : ''}
                        onClick={() => setSelectedColor(color)}
                        role="radio"
                        aria-checked={selectedColor === color}
                      >
                        <span className={`swatch swatch-${color.toLowerCase()}`} />
                        <em>{color}</em>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="customizer-muted">Choose a vest to see available colors.</p>
                )}
              </section>

              <TemplateSelector
                selectedTemplate={activeSideDesign.template}
                onApplyTemplate={handleApplyTemplate}
                onRemoveTemplate={() =>
                  updateActiveSide((sideDesign) => ({ ...sideDesign, template: null }))
                }
              />

              <DesignUploader
                upload={activeSideDesign.upload}
                onUpload={handleUpload}
                onRemoveUpload={handleRemoveUpload}
              />

              <TextEditor
                textDesign={activeSideDesign.text}
                onChangeText={(text) => updateActiveSide((sideDesign) => ({ ...sideDesign, text }))}
                onClearText={() =>
                  updateActiveSide((sideDesign) => ({ ...sideDesign, text: createTextDesign() }))
                }
              />

              <DesignControls
                position={activeSideDesign.position}
                size={activeSideDesign.size}
                onChangePosition={(position) =>
                  updateActiveSide((sideDesign) => ({ ...sideDesign, position }))
                }
                onChangeSize={(size) =>
                  updateActiveSide((sideDesign) => ({ ...sideDesign, size }))
                }
              />
            </div>

            <VestPreview
              selectedVest={selectedVest}
              selectedColor={selectedColor}
              activeView={activeView}
              onChangeView={setActiveView}
              sideDesign={activeSideDesign}
            />

            <CustomizationSummary
              selectedVest={selectedVest}
              selectedColor={selectedColor}
              selectedSize={selectedSize}
              quantity={quantity}
              designState={designState}
              pricing={pricing}
              validationMessage={validationMessage}
              successMessage={successMessage}
              onSelectSize={(size) => {
                setSelectedSize(size)
                setValidationMessage('')
              }}
              onChangeQuantity={setQuantity}
              onAddToCart={addCustomizedVestToCart}
              onSaveDesign={saveDesign}
              onResetDesign={resetDesign}
              isSavingDesign={isSavingDesign || pendingDesignId === 'new' || (savedDesignId && pendingDesignId === savedDesignId)}
            />
              </div>
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default CustomizeVest
