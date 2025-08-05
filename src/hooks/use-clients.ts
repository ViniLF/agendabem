import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  birthDate?: string
  createdAt: string
  updatedAt: string
  status: 'active' | 'inactive'
  totalAppointments: number
  totalSpent: number
  lastAppointment?: string
}

interface ClientsResponse {
  clients: Client[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  stats: {
    total: number
    active: number
    inactive: number
  }
}

interface CreateClientData {
  name: string
  email?: string
  phone?: string
  birthDate?: string
  notes?: string
  dataConsent: boolean
}

interface UseClientsReturn {
  clients: Client[]
  stats: ClientsResponse['stats'] | null
  pagination: ClientsResponse['pagination'] | null
  loading: boolean
  error: string | null
  searchClients: (query: string, status?: string, page?: number) => Promise<void>
  createClient: (data: CreateClientData) => Promise<Client | null>
  updateClient: (id: string, data: Partial<CreateClientData>) => Promise<Client | null>
  deleteClient: (id: string) => Promise<boolean>
  getClient: (id: string) => Promise<Client | null>
  refreshClients: () => Promise<void>
}

export function useClients(): UseClientsReturn {
  const [clients, setClients] = useState<Client[]>([])
  const [stats, setStats] = useState<ClientsResponse['stats'] | null>(null)
  const [pagination, setPagination] = useState<ClientsResponse['pagination'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleError = useCallback((error: any, defaultMessage: string) => {
    const message = error?.message || defaultMessage
    setError(message)
    toast.error(message)
    console.error(defaultMessage, error)
  }, [])

  const searchClients = useCallback(async (
    query: string = '', 
    status: string = 'all', 
    page: number = 1
  ) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(query && { search: query }),
        ...(status !== 'all' && { status })
      })

      const response = await fetch(`/api/clientes?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao buscar clientes')
      }

      const data: ClientsResponse = await response.json()
      
      setClients(data.clients)
      setStats(data.stats)
      setPagination(data.pagination)
    } catch (error) {
      handleError(error, 'Erro ao carregar clientes')
    } finally {
      setLoading(false)
    }
  }, [handleError])

  const createClient = useCallback(async (data: CreateClientData): Promise<Client | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/clientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao criar cliente')
      }

      const result = await response.json()
      const newClient = result.client

      setClients(prev => [newClient, ...prev])
      if (stats) {
        setStats(prev => prev ? { ...prev, total: prev.total + 1, active: prev.active + 1 } : null)
      }

      toast.success('Cliente criado com sucesso!')
      return newClient
    } catch (error) {
      handleError(error, 'Erro ao criar cliente')
      return null
    } finally {
      setLoading(false)
    }
  }, [handleError, stats])

  const updateClient = useCallback(async (id: string, data: Partial<CreateClientData>): Promise<Client | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/clientes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao atualizar cliente')
      }

      const result = await response.json()
      const updatedClient = result.client

      setClients(prev => prev.map(client => 
        client.id === id ? updatedClient : client
      ))

      toast.success('Cliente atualizado com sucesso!')
      return updatedClient
    } catch (error) {
      handleError(error, 'Erro ao atualizar cliente')
      return null
    } finally {
      setLoading(false)
    }
  }, [handleError])

  const deleteClient = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/clientes/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao excluir cliente')
      }

      setClients(prev => prev.filter(client => client.id !== id))
      if (stats) {
        setStats(prev => prev ? { ...prev, total: prev.total - 1 } : null)
      }

      toast.success('Cliente removido com sucesso!')
      return true
    } catch (error) {
      handleError(error, 'Erro ao excluir cliente')
      return false
    } finally {
      setLoading(false)
    }
  }, [handleError, stats])

  const getClient = useCallback(async (id: string): Promise<Client | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/clientes/${id}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Cliente não encontrado')
      }

      const client: Client = await response.json()
      return client
    } catch (error) {
      handleError(error, 'Erro ao buscar cliente')
      return null
    } finally {
      setLoading(false)
    }
  }, [handleError])

  const refreshClients = useCallback(async () => {
    await searchClients()
  }, [searchClients])

  useEffect(() => {
    searchClients()
  }, [searchClients])

  return {
    clients,
    stats,
    pagination,
    loading,
    error,
    searchClients,
    createClient,
    updateClient,
    deleteClient,
    getClient,
    refreshClients,
  }
}