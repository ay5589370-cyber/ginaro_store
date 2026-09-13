function AddressForm({ address, errors, saveAddress, onChange, onSaveAddressChange }) {
  const fields = [
    ['fullName', 'Full Name', 'text', 'name'],
    ['phone', 'Phone Number', 'tel', 'tel'],
    ['line1', 'Address Line 1', 'text', 'address-line1'],
    ['line2', 'Address Line 2', 'text', 'address-line2'],
    ['city', 'City', 'text', 'address-level2'],
    ['state', 'State', 'text', 'address-level1'],
    ['pinCode', 'PIN Code', 'text', 'postal-code'],
    ['country', 'Country', 'text', 'country-name'],
  ]

  return (
    <div className="checkout-form-grid">
      {fields.map(([key, label, type, autoComplete]) => (
        <div className="form-field" key={key}>
          <label htmlFor={`delivery-${key}`}>{label}</label>
          <input
            id={`delivery-${key}`}
            type={type}
            value={address[key]}
            onChange={(event) => onChange(key, event.target.value)}
            autoComplete={autoComplete}
            aria-invalid={Boolean(errors[key])}
          />
          {errors[key] && <small>{errors[key]}</small>}
        </div>
      ))}
      <label className="check-option checkout-save-address">
        <input
          type="checkbox"
          checked={saveAddress}
          onChange={(event) => onSaveAddressChange(event.target.checked)}
        />
        <span>Save this address for future orders</span>
      </label>
    </div>
  )
}

export default AddressForm
