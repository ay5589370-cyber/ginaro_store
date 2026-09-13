function AddressCard({ address, onEdit, onDelete, onSetDefault, isPending = false }) {
  return (
    <article className="address-card">
      <div className="address-card-head">
        <h2>{address.fullName}</h2>
        {address.isDefault && <span>Default</span>}
      </div>
      <p>{address.phone}</p>
      <p>
        {address.line1}
        {address.line2 ? `, ${address.line2}` : ''}, {address.city}, {address.state} {address.pinCode}, {address.country}
      </p>
      <div className="account-card-actions">
        <button type="button" onClick={() => onEdit(address)} disabled={isPending}>
          Edit
        </button>
        <button type="button" onClick={() => onDelete(address.id)} disabled={isPending}>
          Delete
        </button>
        {!address.isDefault && (
          <button type="button" onClick={() => onSetDefault(address.id)} disabled={isPending}>
            Set as Default
          </button>
        )}
      </div>
    </article>
  )
}

export default AddressCard
