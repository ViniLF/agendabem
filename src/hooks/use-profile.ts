import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/components/ui/toast-provider'

interface Service {
  id: string
  name: string
  description?: string
  duration: number
  price: number
  color?: string
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  appointmentsCount: number
  lastUsed: string
}

interface ServicesResponse {
  services: Service[]
  stats: {
    total: number
    active: number
    inactive: number
    avgDuration: number
    avgPrice: number
  }
}

interface CreateServiceData {
  name: string
  description?: string
  duration: number
  price?: number
  color?: string
  isActive?: boolean
}

interface UseServicesReturn {
  services: Service[]
  stats: ServicesResponse['stats'] | null
  loading: boolean
  error: string | null
  searchServices: (query?: string, status?: string) => Promise<void>
  createService: (data: CreateServiceData) => Promise<Service | null>
  updateService: (id: string, data: Partial<CreateServiceData>) => Promise<Service | null>
  deleteService: (id: string) => Promise<boolean>
  toggleServiceStatus: (id: string, isActive: boolean) => Promise<boolean>
  getService: (id: string) => Promise<Service | null>
  refreshServices: () => Promise<void>
}

export function useServices(): UseServicesReturn {
  const [services, setServices] = useState<Service[]>([])
  const [stats, setStats] = useState<ServicesResponse['stats'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleError = useCallback((error: any, defaultMessage: string) => {
    const message = error?.message || defaultMessage
    setError(message)
    toast.error(message)
    console.error(defaultMessage, error)
  }, [])

  const searchServices = useCallback(async (
    query: string = '', 
    status: string = 'all'
  ) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        ...(query && { search: query }),
        ...(status !== 'all' && { status })
      })

      const response = await fetch(`/api/servicos?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao buscar serviços')
      }

      const data: ServicesResponse = await response.json()
      
      setServices(data.services)
      setStats(data.stats)
    } catch (error) {
      handleError(error, 'Erro ao carregar serviços')
    } finally {
      setLoading(false)
    }
  }, [handleError])

  const createService = useCallback(async (data: CreateServiceData): Promise<Service | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/servicos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao criar serviço')
      }

      const result = await response.json()
      const newService = result.service

      setServices(prev => [newService, ...prev])
      if (stats) {
        setStats(prev => prev ? {
          ...prev,
          total: prev.total + 1,
          active: newService.isActive ? prev.active + 1 : prev.active
        } : null)
      }

      toast.success('Serviço criado com sucesso!')
      return newService
    } catch (error) {
      handleError(error, 'Erro ao criar serviço')
      return null
    } finally {
      setLoading(false)
    }
  }, [handleError, stats])

  const updateService = useCallback(async (id: string, data: Partial<CreateServiceData>): Promise<Service | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/servicos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao atualizar serviço')
      }

      const result = await response.json()
      const updatedService = result.service

      setServices(prev => prev.map(service => 
        service.id === id ? { ...service, ...updatedService } : service
      ))

      toast.success('Serviço atualizado com sucesso!')
      return updatedService
    } catch (error) {
      handleError(error, 'Erro ao atualizar serviço')
      return null
    } finally {
      setLoading(false)
    }
  }, [handleError])

  const deleteService = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/servicos/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao excluir serviço')
      }

      setServices(prev => prev.filter(service => service.id !== id))
      if (stats) {
        setStats(prev => prev ? { ...prev, total: prev.total - 1 } : null)
      }

      toast.success('Serviço removido com sucesso!')
      return true
    } catch (error) {
      handleError(error, 'Erro ao excluir serviço')
      return false
    } finally {
      setLoading(false)
    }
  }, [handleError, stats])

  const toggleServiceStatus = useCallback(async (id: string, isActive: boolean): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/servicos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao alterar status do serviço')
      }

      setServices(prev => prev.map(service => 
        service.id === id ? { ...service, isActive } : service
      ))

      if (stats) {
        setStats(prev => {
          if (!prev) return null
          const activeChange = isActive ? 1 : -1
          return {
            ...prev,
            active: prev.active + activeChange,
            inactive: prev.inactive - activeChange
          }
        })
      }

      toast.success(`Serviço ${isActive ? 'ativado' : 'desativado'} com sucesso!`)
      return true
    } catch (error) {
      handleError(error, 'Erro ao alterar status do serviço')
      return false
    } finally {
      setLoading(false)
    }
  }, [handleError, stats])

  const getService = useCallback(async (id: string): Promise<Service | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/servicos/${id}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Serviço não encontrado')
      }

      const service: Service = await response.json()
      return service
    } catch (error) {
      handleError(error, 'Erro ao buscar serviço')
      return null
    } finally {
      setLoading(false)
    }
  }, [handleError])

  const refreshServices = useCallback(async () => {
    await searchServices()
  }, [searchServices])

  useEffect(() => {
    searchServices()
  }, [searchServices])

  return {
    services,
    stats,
    loading,
    error,
    searchServices,
    createService,
    updateService,
    deleteService,
    toggleServiceStatus,
    getService,
    refreshServices,
  }
}