import { Link } from 'react-router-dom'

const footerLinks = {
  Shop: [
    ['Vests', '/shop?category=vests'],
    ['Pajamas', '/shop?category=pajamas'],
    ['Combos', '/shop?category=combo-packs'],
    ['Customize Vest', '/customize'],
  ],
  Help: [
    ['Contact Us', '/contact'],
    ['Shipping', '/shipping'],
    ['Returns', '/returns'],
    ['Size Guide', '/size-guide'],
    ['FAQ', '/faq'],
  ],
  Company: [
    ['About Us', '/about'],
    ['Privacy Policy', '/privacy'],
    ['Terms & Conditions', '/terms'],
  ],
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="section-shell footer-grid">
        <div className="footer-brand">
          <img src="/assets/logo.png" alt="GINARO official logo" />
          <h2>GINARO</h2>
          <p>
            Premium everyday vests, pajamas, and comfort-first clothing combos
            crafted for a clean daily wardrobe.
          </p>
        </div>

        {Object.entries(footerLinks).map(([title, links]) => (
          <div className="footer-column" key={title}>
            <h3>{title}</h3>
            {links.map(([label, to]) => (
              <Link to={to} key={label}>
                {label}
              </Link>
            ))}
          </div>
        ))}

        <div className="footer-column social-column">
          <h3>Social</h3>
          <a href="https://www.instagram.com/" target="_blank" rel="noreferrer">Instagram</a>
          <a href="https://www.facebook.com/" target="_blank" rel="noreferrer">Facebook</a>
          <a href="https://www.youtube.com/" target="_blank" rel="noreferrer">YouTube</a>
        </div>
      </div>
      <div className="footer-bottom section-shell">
        <span>© 2026 GINARO. All rights reserved.</span>
        <span>Wear Your Identity</span>
      </div>
    </footer>
  )
}

export default Footer
