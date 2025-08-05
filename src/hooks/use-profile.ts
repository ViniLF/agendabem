import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/components/ui/toast-provider'

interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: string
}

interface Profile {
  id: string
  userId: string
  businessName?: string
  profession?: string
  speciality?: string
  serviceType: string
  workingDays: number[]
  workingHours: {
    start: string
    end: string
  }
  timeSlotDuration: number
  bookingAdvance: number
  address?: string
  city?: string
  state?: string
  zipCode?: string
  description?: string
  website?: string
  slug?: string
  paymentMethod: string
  paymentProvider: string
  pixKey?: string
  pixName?: string
  paymentInstructions?: string
  requirePaymentUpfront: boolean
  cancellationHours: number
  noShowFee?: number
  createdAt: string
  updatedAt: string
}

interface ProfileResponse {
  user: User
  profile: Profile | null
}

interface UpdateProfileData {
  user?: {
    name?: string
    phone?: string
  }
  profile?: Partial<Omit<Profile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
}

interface UseProfileReturn {
  user: User | null
  profile: Profile | null
  loading: boolean
  error: string | null
  fetchProfile: () => Promise<void>
  updateProfile: (data: UpdateProfileData) => Promise<boolean>
  createProfile: (data: Partial<Profile>) => Promise<boolean>
  refreshProfile: () => Promise<void>
}

export function useProfile(): UseProfileReturn {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleError = useCallback((error: any, defaultMessage: string) => {
    const message = error?.message || defaultMessage
    setError(message)
    toast.error(message)
    console.error(defaultMessage, error)
  }, [])

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/perfil')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao carregar perfil')
      }

      const data: ProfileResponse = await response.json()
      
      setUser(data.user)
      setProfile(data.profile)
    } catch (error) {
      handleError(error, 'Erro ao carregar perfil')
    } finally {
      setLoading(false)
    }
  }, [handleError])

  const updateProfile = useCallback(async (data: UpdateProfileData): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/perfil', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao atualizar perfil')
      }

      const result = await response.json()
      
      setUser(result.user)
      setProfile(result.profile)

      toast.success('Perfil atualizado com sucesso!')
      return true
    } catch (error) {
      handleError(error, 'Erro ao atualizar perfil')
      return false
    } finally {
      setLoading(false)
    }
  }, [handleError])

  const createProfile = useCallback(async (data: Partial<Profile>): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/perfil', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao criar perfil')
      }

      const result = await response.json()
      
      setProfile(result.profile)

      toast.success('Perfil criado com sucesso!')
      return true
    } catch (error) {
      handleError(error, 'Erro ao criar perfil')
      return false
    } finally {
      setLoading(false)
    }
  }, [handleError])

  const refreshProfile = useCallback(async () => {
    await fetchProfile()
  }, [fetchProfile])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return {
    user,
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
    createProfile,
    refreshProfile,
  }
}