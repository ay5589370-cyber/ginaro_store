import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  deleteDesign as deleteDesignDocument,
  duplicateDesign as duplicateDesignDocument,
  getDesignAssetPaths,
  getDesignErrorMessage,
  getSavedDesign as getSavedDesignDocument,
  getSavedDesigns,
  saveDesign as saveDesignDocument,
  updateDesign as updateDesignDocument,
} from '../services/designService.js'
import { deleteCustomDesignAsset } from '../services/storageService.js'
import { useAuth } from './useAuth.js'
import { DesignContext } from './designContextValue.js'

export function DesignProvider({ children }) {
  const { currentUser, authLoading } = useAuth()
  const uid = currentUser?.uid
  const [designs, setDesigns] = useState([])
  const [designLoading, setDesignLoading] = useState(false)
  const [designError, setDesignError] = useState('')
  const [pendingDesignId, setPendingDesignId] = useState('')
  const requestIdRef = useRef(0)

  const refreshDesigns = useCallback(async () => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    if (!uid) {
      setDesigns([])
      setDesignLoading(false)
      setDesignError('')
      return []
    }

    setDesignLoading(true)
    setDesignError('')

    try {
      const nextDesigns = await getSavedDesigns(uid)

      if (requestIdRef.current !== requestId) return nextDesigns

      setDesigns(nextDesigns)
      return nextDesigns
    } catch (error) {
      if (requestIdRef.current === requestId) {
        setDesigns([])
        setDesignError(getDesignErrorMessage(error, 'Unable to load saved designs.'))
      }

      return []
    } finally {
      if (requestIdRef.current === requestId) {
        setDesignLoading(false)
      }
    }
  }, [uid])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (authLoading) return
      refreshDesigns()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [authLoading, refreshDesigns])

  const loadDesign = useCallback(async (designId) => {
    if (!uid) {
      return { status: 'auth-required', message: 'Please log in to open this design.', design: null }
    }

    try {
      const design = await getSavedDesignDocument(uid, designId)

      return design
        ? { status: 'loaded', design }
        : { status: 'not-found', message: 'Saved design not found.', design: null }
    } catch (error) {
      return { status: 'error', message: getDesignErrorMessage(error, 'Unable to load saved design.'), design: null }
    }
  }, [uid])

  const saveDesign = useCallback(async (designData) => {
    if (!uid) {
      return { status: 'auth-required', message: 'Please log in to save your design.' }
    }

    setPendingDesignId('new')

    try {
      const savedDesign = await saveDesignDocument(uid, designData)
      await refreshDesigns()
      setDesignError('')

      return { status: 'saved', message: 'Design saved.', design: savedDesign }
    } catch (error) {
      const message = getDesignErrorMessage(error)
      setDesignError(message)

      return { status: 'error', message, validationErrors: error.validationErrors || {} }
    } finally {
      setPendingDesignId('')
    }
  }, [refreshDesigns, uid])

  const updateDesign = useCallback(async (designId, updates) => {
    if (!uid) {
      return { status: 'auth-required', message: 'Please log in to save your design.' }
    }

    setPendingDesignId(String(designId))

    try {
      const savedDesign = await updateDesignDocument(uid, designId, updates)
      await refreshDesigns()
      setDesignError('')

      return { status: 'updated', message: 'Design updated.', design: savedDesign }
    } catch (error) {
      const message = getDesignErrorMessage(error)
      setDesignError(message)

      return { status: 'error', message, validationErrors: error.validationErrors || {} }
    } finally {
      setPendingDesignId('')
    }
  }, [refreshDesigns, uid])

  const deleteDesign = useCallback(async (designId) => {
    if (!uid) {
      return { status: 'auth-required', message: 'Please log in to manage saved designs.' }
    }

    setPendingDesignId(String(designId))

    try {
      const design = designs.find((item) => item.id === designId)
      const assetPaths = getDesignAssetPaths(design)

      if (assetPaths.length > 0) {
        const cleanupResult = await deleteCustomDesignAsset(currentUser, designId)

        if (!cleanupResult.success) {
          return {
            status: 'error',
            message: cleanupResult.error?.message || 'Unable to delete design artwork.',
          }
        }
      }

      await deleteDesignDocument(uid, designId)
      setDesigns((current) => current.filter((design) => design.id !== designId))
      setDesignError('')

      return { status: 'deleted', message: 'Design deleted.' }
    } catch (error) {
      const message = getDesignErrorMessage(error, 'Unable to delete design.')
      setDesignError(message)

      return { status: 'error', message }
    } finally {
      setPendingDesignId('')
    }
  }, [currentUser, designs, uid])

  const duplicateDesign = useCallback(async (designId) => {
    if (!uid) {
      return { status: 'auth-required', message: 'Please log in to manage saved designs.' }
    }

    setPendingDesignId(String(designId))

    try {
      const duplicatedDesign = await duplicateDesignDocument(uid, designId)
      await refreshDesigns()
      setDesignError('')

      return { status: 'duplicated', message: 'Design duplicated.', design: duplicatedDesign }
    } catch (error) {
      const message = getDesignErrorMessage(error, 'Unable to duplicate design.')
      setDesignError(message)

      return { status: 'error', message }
    } finally {
      setPendingDesignId('')
    }
  }, [refreshDesigns, uid])

  const value = useMemo(
    () => ({
      designs,
      designCount: designs.length,
      designLoading,
      designError,
      pendingDesignId,
      refreshDesigns,
      loadDesign,
      saveDesign,
      updateDesign,
      deleteDesign,
      duplicateDesign,
    }),
    [
      deleteDesign,
      designError,
      designLoading,
      designs,
      duplicateDesign,
      loadDesign,
      pendingDesignId,
      refreshDesigns,
      saveDesign,
      updateDesign,
    ],
  )

  return <DesignContext.Provider value={value}>{children}</DesignContext.Provider>
}
