import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'

function CustomVestBanner() {
  return (
    <section className="section-shell feature-banner custom-banner">
      <div>
        <span className="feature-kicker">
          <Icon name="spark" size={18} />
          Custom Vest
        </span>
        <h2>Make It Yours.</h2>
        <p>
          Create a vest that represents your style. Choose a vest, add your own
          artwork, text or logo, or start from one of our free templates.
        </p>
      </div>
      <Link className="button button-primary" to="/customize">
        Start Customizing
      </Link>
    </section>
  )
}

export default CustomVestBanner
