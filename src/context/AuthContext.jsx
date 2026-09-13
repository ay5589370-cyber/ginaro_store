import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getAuthErrorMessage,
  isFirebaseConfigured,
  loginUser,
  logoutUser,
  registerUser,
  resetPassword as sendResetPassword,
  subscribeToAuthChanges,
  updateUserDisplayName,
} from '../services/authService.js'
import {
  ensureUserProfile,
  getFirestoreErrorMessage,
  updateUserProfile,
} from '../services/userService.js'
import { AuthContext } from './authContextValue.js'

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(isFirebaseConfigured)
  const [profileLoading, setProfileLoading] = useState(false)
  const [authError, setAuthError] = useState(() =>
    isFirebaseConfigured ? '' : getAuthErrorMessage({ code: 'auth/configuration-not-ready' }),
  )
  const [profileError, setProfileError] = useState('')
  const pendingSignupProfileRef = useRef(null)
  const profileRequestIdRef = useRef(0)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      return undefined
    }

    const unsubscribe = subscribeToAuthChanges(
      (user) => {
        const requestId = profileRequestIdRef.current + 1
        profileRequestIdRef.current = requestId
        setCurrentUser(user)
        setUserProfile(null)
        setAuthError('')
        setAuthLoading(false)

        if (!user) {
          setProfileLoading(false)
          setProfileError('')
          pendingSignupProfileRef.current = null
          return
        }

        setProfileLoading(true)
        const pendingProfile = pendingSignupProfileRef.current
        ensureUserProfile(user, pendingProfile || {})
          .then((profile) => {
            if (profileRequestIdRef.current !== requestId) return
            setUserProfile(profile)
            setProfileError('')
          })
          .catch((error) => {
            if (profileRequestIdRef.current !== requestId) return
            setUserProfile(null)
            setProfileError(getFirestoreErrorMessage(error))
          })
          .finally(() => {
            if (profileRequestIdRef.current !== requestId) return
            setProfileLoading(false)
            pendingSignupProfileRef.current = null
          })
      },
      (error) => {
        profileRequestIdRef.current += 1
        setCurrentUser(null)
        setUserProfile(null)
        setAuthError(getAuthErrorMessage(error))
        setProfileError('')
        setProfileLoading(false)
        setAuthLoading(false)
      },
    )

    return unsubscribe
  }, [])

  const login = useCallback(async ({ email, password }) => {
    const user = await loginUser({ email, password })
    setCurrentUser(user)
    return user
  }, [])

  const signup = useCallback(async ({ firstName, lastName, email, phone, password }) => {
    const displayName = [firstName, lastName].filter(Boolean).join(' ').trim()
    const profileData = { firstName, lastName, displayName, email, phone }
    pendingSignupProfileRef.current = profileData

    try {
      const result = await registerUser({ email, password, displayName })
      const profile = await ensureUserProfile(result.user, profileData)
      setCurrentUser(result.user)
      setUserProfile(profile)
      setProfileError('')
      pendingSignupProfileRef.current = null
      return result
    } catch (error) {
      if (error?.code?.startsWith('auth/')) {
        pendingSignupProfileRef.current = null
      } else {
        setProfileError(getFirestoreErrorMessage(error))
      }
      throw error
    }
  }, [])

  const resetPassword = useCallback((email) => sendResetPassword(email), [])

  const updateProfile = useCallback(async ({ firstName, lastName, phone, photoURL, displayName }) => {
    if (!currentUser) {
      const error = new Error('No authenticated user is available.')
      error.code = 'auth/no-current-user'
      throw error
    }

    const nextDisplayName = displayName || [firstName, lastName].filter(Boolean).join(' ').trim()
    const updatedProfile = await updateUserProfile(currentUser.uid, {
      firstName,
      lastName,
      phone,
      displayName: nextDisplayName,
      photoURL: photoURL ?? userProfile?.photoURL ?? currentUser.photoURL,
    })
    const user = await updateUserDisplayName(nextDisplayName)
    setCurrentUser({ ...user })
    setUserProfile(updatedProfile)
    return { user, profile: updatedProfile }
  }, [currentUser, userProfile?.photoURL])

  const logout = useCallback(async () => {
    await logoutUser()
    setCurrentUser(null)
    setUserProfile(null)
    setProfileError('')
    setProfileLoading(false)
  }, [])

  const value = useMemo(
    () => ({
      currentUser,
      userProfile,
      isLoggedIn: Boolean(currentUser),
      authLoading,
      profileLoading,
      authError,
      profileError,
      login,
      signup,
      resetPassword,
      updateProfile,
      logout,
    }),
    [
      authError,
      authLoading,
      currentUser,
      login,
      logout,
      profileError,
      profileLoading,
      resetPassword,
      signup,
      updateProfile,
      userProfile,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
