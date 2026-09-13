import { useContext } from 'react'
import { DesignContext } from './designContextValue.js'

export function useDesigns() {
  const context = useContext(DesignContext)

  if (!context) {
    throw new Error('useDesigns must be used within a DesignProvider')
  }

  return context
}
