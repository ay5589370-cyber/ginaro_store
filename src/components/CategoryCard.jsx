import { Link } from 'react-router-dom'

function CategoryCard({ category }) {
  return (
    <article className="category-card">
      <div className="category-image">
        <img src={category.image} alt={`${category.title} category`} />
      </div>
      <div className="category-content">
        <h3>{category.title}</h3>
        <p>{category.description}</p>
        <Link to={`/shop?category=${category.slug}`}>Shop Now</Link>
      </div>
    </article>
  )
}

export default CategoryCard
