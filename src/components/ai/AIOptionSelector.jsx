function AIOptionSelector({ label, options, onSelect }) {
  return (
    <div className="ai-option-selector" aria-label={label}>
      {options.map((option) => (
        <button type="button" key={option} onClick={() => onSelect(option)}>
          {option}
        </button>
      ))}
    </div>
  )
}

export default AIOptionSelector
