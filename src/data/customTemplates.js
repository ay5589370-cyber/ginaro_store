const makeTemplateImage = (title, accent = '#c99a2e', bg = '#14110c') => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="360" height="360" viewBox="0 0 360 360">
      <rect width="360" height="360" rx="18" fill="${bg}"/>
      <circle cx="180" cy="180" r="118" fill="none" stroke="${accent}" stroke-width="8"/>
      <text x="180" y="168" text-anchor="middle" font-family="Georgia, serif" font-size="34" font-weight="700" fill="#fffaf0">${title}</text>
      <text x="180" y="211" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" letter-spacing="5" fill="${accent}">GINARO</text>
    </svg>
  `

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export const templateCategories = [
  'All',
  'Minimal',
  'Typography',
  'Gym',
  'Sports',
  'College',
  'Festival',
  'Logo Style',
]

export const customTemplates = [
  {
    id: 'minimal-mark',
    name: 'Clean Initial Mark',
    category: 'Minimal',
    previewImage: makeTemplateImage('GN'),
    fullDesignImage: makeTemplateImage('GN'),
  },
  {
    id: 'typography-identity',
    name: 'Wear Your Identity',
    category: 'Typography',
    previewImage: makeTemplateImage('IDENTITY', '#e0bb5f'),
    fullDesignImage: makeTemplateImage('IDENTITY', '#e0bb5f'),
  },
  {
    id: 'gym-discipline',
    name: 'Daily Discipline',
    category: 'Gym',
    previewImage: makeTemplateImage('TRAIN', '#d7cfc2'),
    fullDesignImage: makeTemplateImage('TRAIN', '#d7cfc2'),
  },
  {
    id: 'sports-number',
    name: 'Club Number',
    category: 'Sports',
    previewImage: makeTemplateImage('09', '#c99a2e', '#202b3b'),
    fullDesignImage: makeTemplateImage('09', '#c99a2e', '#202b3b'),
  },
  {
    id: 'college-crest',
    name: 'Campus Crest',
    category: 'College',
    previewImage: makeTemplateImage('CREST', '#fffaf0', '#6f4b32'),
    fullDesignImage: makeTemplateImage('CREST', '#fffaf0', '#6f4b32'),
  },
  {
    id: 'festival-drop',
    name: 'Festival Drop',
    category: 'Festival',
    previewImage: makeTemplateImage('JOY', '#e0bb5f', '#211c16'),
    fullDesignImage: makeTemplateImage('JOY', '#e0bb5f', '#211c16'),
  },
  {
    id: 'logo-style-premium',
    name: 'Premium Logo Badge',
    category: 'Logo Style',
    previewImage: makeTemplateImage('LOGO', '#c99a2e'),
    fullDesignImage: makeTemplateImage('LOGO', '#c99a2e'),
  },
]
