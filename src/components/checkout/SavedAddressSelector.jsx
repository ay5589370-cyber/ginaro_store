function SavedAddressSelector({ addresses, selectedAddressId, onSelect, onUseDifferent }) {
  if (addresses.length === 0) return null

  return (
    <div className="saved-address-selector">
      <div className="checkout-subhead">
        <h3>Saved Addresses</h3>
        <button type="button" onClick={onUseDifferent}>
          Use a Different Address
        </button>
      </div>
      <div className="saved-address-options">
        {addresses.map((address) => (
          <label className={selectedAddressId === address.id ? 'is-selected' : ''} key={address.id}>
            <input
              type="radio"
              name="saved-address"
              checked={selectedAddressId === address.id}
              onChange={() => onSelect(address.id)}
            />
            <span>
              <strong>{address.fullName}</strong>
              {address.line1}, {address.city}, {address.state} {address.pinCode}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

export default SavedAddressSelector
