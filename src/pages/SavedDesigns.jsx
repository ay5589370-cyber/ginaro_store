import AccountLayout from '../components/account/AccountLayout.jsx'
import SavedDesignCard from '../components/account/SavedDesignCard.jsx'
import ErrorState from '../components/ErrorState.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useDesigns } from '../context/useDesigns.js'
import { useProducts } from '../context/useProducts.js'
import { useToast } from '../context/useToast.js'

function SavedDesigns() {
  const {
    designs,
    designLoading,
    designError,
    pendingDesignId,
    deleteDesign,
    duplicateDesign,
    refreshDesigns,
  } = useDesigns()
  const { products } = useProducts()
  const { showToast } = useToast()

  const handleDeleteDesign = async (designId) => {
    const result = await deleteDesign(designId)
    showToast(result.message, result.status === 'error' ? 'error' : 'success')
  }

  const handleDuplicateDesign = async (designId) => {
    const result = await duplicateDesign(designId)
    showToast(result.message, result.status === 'error' ? 'error' : 'success')
  }

  return (
    <AccountLayout title="Saved Designs" text="Revisit custom vest concepts and continue editing when ready.">
      {designLoading ? (
        <LoadingSpinner label="Loading saved designs" />
      ) : designError ? (
        <ErrorState
          title="Unable to load saved designs right now."
          message="Please try again in a moment."
          actionLabel="Try Again"
          onAction={refreshDesigns}
        />
      ) : designs.length === 0 ? (
        <section className="account-empty-state">
          <h2>No saved designs yet.</h2>
          <p>Start with a vest, add your artwork or text, and save the design here.</p>
        </section>
      ) : (
        <div className="saved-design-grid">
          {designs.map((design) => (
            <SavedDesignCard
              key={design.id}
              design={design}
              product={products.find((product) => String(product.id) === String(design.productId))}
              isPending={pendingDesignId === design.id}
              onDelete={handleDeleteDesign}
              onDuplicate={handleDuplicateDesign}
            />
          ))}
        </div>
      )}
    </AccountLayout>
  )
}

export default SavedDesigns
