const icons = {
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  heart: (
    <path d="M20.4 5.7a5.2 5.2 0 0 0-7.4 0L12 6.8l-1-1.1a5.2 5.2 0 0 0-7.4 7.4l1 1L12 21l7.4-6.9 1-1a5.2 5.2 0 0 0 0-7.4Z" />
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  cart: (
    <>
      <path d="M6 6h15l-1.8 8.4a2 2 0 0 1-2 1.6H9a2 2 0 0 1-2-1.7L5.5 3H3" />
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  x: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  leaf: (
    <>
      <path d="M20 4C12 4 6 9.5 6 16a4 4 0 0 0 4 4c6.5 0 10-7.5 10-16Z" />
      <path d="M6 20c1.6-5.2 5.2-8.6 11-11" />
    </>
  ),
  fit: (
    <>
      <path d="M6 4h12l2 5-3 1.5V20H7V10.5L4 9l2-5Z" />
      <path d="M9 4c.4 1.8 1.5 3 3 3s2.6-1.2 3-3" />
    </>
  ),
  return: (
    <>
      <path d="M9 7H5v4" />
      <path d="M5.5 11A7.5 7.5 0 1 0 8 5.4L5 8.5" />
    </>
  ),
  shield: (
    <path d="M12 3 5 6v5.5c0 4.6 3 7.9 7 9.5 4-1.6 7-4.9 7-9.5V6l-7-3Z" />
  ),
  spark: (
    <>
      <path d="M12 3l1.6 5.1L19 10l-5.4 1.9L12 17l-1.6-5.1L5 10l5.4-1.9L12 3Z" />
      <path d="M5 16l.7 2.3L8 19l-2.3.7L5 22l-.7-2.3L2 19l2.3-.7L5 16Z" />
    </>
  ),
  message: (
    <>
      <path d="M4 5h16v11H8l-4 4V5Z" />
      <path d="M8 9h8" />
      <path d="M8 13h5" />
    </>
  ),
  mail: (
    <>
      <path d="M4 6h16v12H4V6Z" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
}

function Icon({ name, className = '', size = 22 }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      {icons[name]}
    </svg>
  )
}

export default Icon
