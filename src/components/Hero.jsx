import { Link } from 'react-router-dom'

function Hero() {
  return (
    <section className="hero-section">
      <div className="section-shell hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">Premium everyday essentials</span>
          <h1>Comfort Made for Everyday Life.</h1>
          <p>
            GINARO brings soft, reliable vests and pajamas made with thoughtful
            fabrics, clean fits, and the kind of comfort you reach for every day.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/">
              Shop Now
            </Link>
            <Link className="button button-secondary" to="/customize">
              Customize Your Vest
            </Link>
          </div>
        </div>

        <div className="hero-visual" aria-label="GINARO product showcase">
          <div className="product-feature large">
            <img src="/assets/item5.png" alt="GINARO premium clothing combo" />
          </div>
          <div className="product-feature small top">
            <img src="/assets/item1.png" alt="GINARO cotton vest" />
          </div>
          <div className="product-feature small bottom">
            <img src="/assets/item4.png" alt="GINARO pajama product" />
          </div>
          <div className="hero-note">
            <strong>Soft cotton feel</strong>
            <span>Built for repeat wear</span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
