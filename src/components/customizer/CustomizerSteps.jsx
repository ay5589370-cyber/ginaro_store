const steps = ['Choose Vest', 'Add Design', 'Customize', 'Review']

function CustomizerSteps({ currentStep }) {
  return (
    <div className="customizer-steps" aria-label="Customization steps">
      {steps.map((step, index) => (
        <div className={index <= currentStep ? 'is-active' : ''} key={step}>
          <span>{index + 1}</span>
          <strong>{step}</strong>
        </div>
      ))}
    </div>
  )
}

export default CustomizerSteps
