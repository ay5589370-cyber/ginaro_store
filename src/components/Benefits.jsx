import Icon from './Icon.jsx'

const benefits = [
  {
    icon: 'leaf',
    title: 'Premium Cotton',
    text: 'Soft breathable materials selected for everyday comfort.',
  },
  {
    icon: 'fit',
    title: 'Perfect Fit',
    text: 'Designed for comfortable everyday movement.',
  },
  {
    icon: 'return',
    title: 'Easy Returns',
    text: 'Simple and customer-friendly returns.',
  },
  {
    icon: 'shield',
    title: 'Secure Shopping',
    text: 'Your shopping experience stays safe and protected.',
  },
]

function Benefits() {
  return (
    <section className="benefits-section section-shell">
      {benefits.map((benefit) => (
        <article className="benefit-item" key={benefit.title}>
          <span className="benefit-icon">
            <Icon name={benefit.icon} />
          </span>
          <h3>{benefit.title}</h3>
          <p>{benefit.text}</p>
        </article>
      ))}
    </section>
  )
}

export default Benefits
