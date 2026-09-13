function ViewSwitcher({ activeView, onChangeView }) {
  return (
    <div className="view-switcher" role="radiogroup" aria-label="Vest view">
      {['front', 'back'].map((view) => (
        <button
          type="button"
          key={view}
          className={activeView === view ? 'is-active' : ''}
          onClick={() => onChangeView(view)}
          role="radio"
          aria-checked={activeView === view}
        >
          {view === 'front' ? 'Front' : 'Back'}
        </button>
      ))}
    </div>
  )
}

export default ViewSwitcher
