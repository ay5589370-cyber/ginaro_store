const defaultSuggestions = [
  'Show best-selling vests',
  'Vests under ₹500',
  'Best pajama for summer',
  'Show combo packs',
  'Customize a vest',
]

function AISuggestionChips({ suggestions = defaultSuggestions, onSelect }) {
  return (
    <div className="ai-suggestion-chips" aria-label="Suggested assistant prompts">
      {suggestions.map((suggestion) => (
        <button type="button" key={suggestion} onClick={() => onSelect(suggestion)}>
          {suggestion}
        </button>
      ))}
    </div>
  )
}

export default AISuggestionChips
