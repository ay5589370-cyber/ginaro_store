import { useState } from 'react'
import AccountLayout from '../components/account/AccountLayout.jsx'
import AddressCard from '../components/account/AddressCard.jsx'
import ErrorState from '../components/ErrorState.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useAddresses } from '../context/useAddresses.js'
import { useToast } from '../context/useToast.js'
import { isValidPhone } from '../utils/authValidation.js'

const emptyAddress = {
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pinCode: '',
  country: 'India',
  isDefault: false,
}

function Addresses() {
  const {
    addresses,
    addressLoading,
    addressError,
    pendingAddressId,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    refreshAddresses,
  } = useAddresses()
  const { showToast } = useToast()
  const [form, setForm] = useState(emptyAddress)
  const [editingId, setEditingId] = useState('')
  const [errors, setErrors] = useState({})

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  const editAddress = (address) => {
    setEditingId(address.id)
    setForm(address)
  }

  const submitAddress = async (event) => {
    event.preventDefault()
    const nextErrors = {}

    if (!form.fullName.trim()) nextErrors.fullName = 'Enter full name.'
    if (!isValidPhone(form.phone)) nextErrors.phone = 'Enter a valid phone number.'
    if (!form.line1.trim()) nextErrors.line1 = 'Enter address line 1.'
    if (!form.city.trim()) nextErrors.city = 'Enter city.'
    if (!form.state.trim()) nextErrors.state = 'Enter state.'
    if (!/^\d{6}$/.test(form.pinCode.trim())) nextErrors.pinCode = 'Enter a valid 6-digit PIN code.'
    if (!form.country.trim()) nextErrors.country = 'Enter country.'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const result = editingId
      ? await updateAddress(editingId, form)
      : await addAddress(form)

    if (result.status === 'error') {
      setErrors(result.validationErrors || { form: result.message })
      showToast(result.message, 'error')
      return
    }

    showToast(result.message)
    setEditingId('')
    setForm(emptyAddress)
  }

  const handleDeleteAddress = async (addressId) => {
    const result = await deleteAddress(addressId)
    showToast(result.message, result.status === 'error' ? 'error' : 'success')
  }

  const handleSetDefaultAddress = async (addressId) => {
    const result = await setDefaultAddress(addressId)
    showToast(result.message, result.status === 'error' ? 'error' : 'success')
  }

  return (
    <AccountLayout title="Addresses" text="Manage your delivery addresses for future checkout.">
      <div className="address-layout">
        <div className="address-list">
          {addressLoading ? (
            <LoadingSpinner label="Loading addresses" />
          ) : addressError ? (
            <ErrorState
              title="Unable to load addresses right now."
              message="Please try again in a moment."
              actionLabel="Try Again"
              onAction={refreshAddresses}
            />
          ) : addresses.length === 0 ? (
            <section className="account-empty-state">
              <h2>No saved addresses yet.</h2>
              <p>Add a delivery address for faster checkout.</p>
            </section>
          ) : (
            addresses.map((address) => (
              <AddressCard
                key={address.id}
                address={address}
                onEdit={editAddress}
                onDelete={handleDeleteAddress}
                onSetDefault={handleSetDefaultAddress}
                isPending={pendingAddressId === address.id}
              />
            ))
          )}
        </div>

        <section className="account-panel">
          <h2>{editingId ? 'Edit Address' : 'Add New Address'}</h2>
          <form className="account-form" onSubmit={submitAddress} noValidate>
            {[
              ['fullName', 'Full Name'],
              ['phone', 'Phone Number'],
              ['line1', 'Address Line 1'],
              ['line2', 'Address Line 2'],
              ['city', 'City'],
              ['state', 'State'],
              ['pinCode', 'PIN Code'],
              ['country', 'Country'],
            ].map(([key, label]) => (
              <div className="form-field" key={key}>
                <label htmlFor={`address-${key}`}>{label}</label>
                <input
                  id={`address-${key}`}
                  type={key === 'phone' ? 'tel' : 'text'}
                  value={form[key]}
                  onChange={(event) => updateField(key, event.target.value)}
                />
                {errors[key] && <small>{errors[key]}</small>}
              </div>
            ))}
            <label className="check-option">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(event) => updateField('isDefault', event.target.checked)}
              />
              <span>Set as default address</span>
            </label>
            {errors.form && <p className="form-error" aria-live="polite">{errors.form}</p>}
            <button type="submit" className="button button-primary">
              {editingId ? 'Save Address' : 'Add New Address'}
            </button>
          </form>
        </section>
      </div>
    </AccountLayout>
  )
}

export default Addresses
