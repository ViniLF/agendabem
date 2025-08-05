import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/components/ui/toast-provider'

interface Appointment {
  id: string
  userId: string
  serviceId?: string
  clientId?: string
  date: string
  duration: number
  status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  clientName?: string
  clientEmail?: string
  clientPhone?: string
  serviceName: string
  servicePrice?: number
  notes?: string
  internalNotes?: string
  requiresPayment: boolean
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED'
  paymentMethod: 'OFFLINE' | 'PIX_OWN' | 'INTEGRATED'
  paidAmount?: number
  paidAt?: string
  confirmationSent: boolean
  reminderSent: boolean
  createdAt: string
  updatedAt: string
  service?: {
    id: string
    name: string
    duration: number
    price?: number
    color?: string
  }
  client?: {
    id: string
    name: string
    email?: string
    phone?: string
  }
}

interface AppointmentsResponse {
  appointments: Appointment[]
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
    scheduled: number
    confirmed: number
    completed: number
    cancelled: number
    todayCount: number
    weekRevenue: number
  }
}

interface CreateAppointmentData {
  date: string
  serviceId?: string
  clientId?: string
  clientName?: string
  clientEmail?: string
  clientPhone?: string
  serviceName: string
  duration: number
  servicePrice?: number
  notes?: string
  requiresPayment?: boolean
  paymentMethod?: 'OFFLINE' | 'PIX_OWN' | 'INTEGRATED'
}

interface UseAppointmentsReturn {
  appointments: Appointment[]
  stats: AppointmentsResponse['stats'] | null
  pagination: AppointmentsResponse['pagination'] | null
  loading: boolean
  error: string | null
  searchAppointments: (filters?: AppointmentFilters) => Promise<void>
  createAppointment: (data: CreateAppointmentData) => Promise<Appointment | null>
  updateAppointment: (id: string, data: Partial<CreateAppointmentData>) => Promise<Appointment | null>
  updateAppointmentStatus: (id: string, status: Appointment['status']) => Promise<boolean>
  deleteAppointment: (id: string) => Promise<boolean>
  getAppointment: (id: string) => Promise<Appointment | null>
  getAvailableSlots: (date: string, serviceId?: string) => Promise<string[]>
  sendConfirmation: (id: string) => Promise<boolean>
  sendReminder: (id: string) => Promise<boolean>
  refreshAppointments: () => Promise<void>
}

interface AppointmentFilters {
  startDate?: string
  endDate?: string
  status?: string
  clientId?: string
  serviceId?: string
  search?: string
  page?: number
  limit?: number
}

export function useAppointments(): UseAppointmentsReturn {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [stats, setStats] = useState<AppointmentsResponse['stats'] | null>(null)
  const [pagination, setPagination] = useState<AppointmentsResponse['pagination'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleError = useCallback((error: any, defaultMessage: string) => {
    const message = error?.message || defaultMessage
    setError(message)
    toast.error(message)
    console.error(defaultMessage, error)
  }, [])

  const searchAppointments = useCallback(async (filters: AppointmentFilters = {}) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      
      if (filters.startDate) params.set('startDate', filters.startDate)
      if (filters.endDate) params.set('endDate', filters.endDate)
      if (filters.status) params.set('status', filters.status)
      if (filters.clientId) params.set('clientId', filters.clientId)
      if (filters.serviceId) params.set('serviceId', filters.serviceId)
      if (filters.search) params.set('search', filters.search)
      if (filters.page) params.set('page', filters.page.toString())
      if (filters.limit) params.set('limit', filters.limit.toString())

      const response = await fetch(`/api/agendamentos?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao buscar agendamentos')
      }

      const data: AppointmentsResponse = await response.json()
      
      setAppointments(data.appointments)
      setStats(data.stats)
      setPagination(data.pagination)
    } catch (error) {
      handleError(error, 'Erro ao carregar agendamentos')
    } finally {
      setLoading(false)
    }
  }, [handleError])

  const createAppointment = useCallback(async (data: CreateAppointmentData): Promise<Appointment | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/agendamentos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao criar agendamento')
      }

      const result = await response.json()
      const newAppointment = result.appointment

      setAppointments(prev => [newAppointment, ...prev])
      if (stats) {
        setStats(prev => prev ? { 
          ...prev, 
          total: prev.total + 1,
          scheduled: prev.scheduled + 1 
        } : null)
      }

      toast.success('Agendamento criado com sucesso!')
      return newAppointment
    } catch (error) {
      handleError(error, 'Erro ao criar agendamento')
      return null
    } finally {
      setLoading(false)
    }
  }, [handleError, stats])

  const updateAppointment = useCallback(async (id: string, data: Partial<CreateAppointmentData>): Promise<Appointment | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/agendamentos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao atualizar agendamento')
      }

      const result = await response.json()
      const updatedAppointment = result.appointment

      setAppointments(prev => prev.map(appointment => 
        appointment.id === id ? updatedAppointment : appointment
      ))

      toast.success('Agendamento atualizado com sucesso!')
      return updatedAppointment
    } catch (error) {
      handleError(error, 'Erro ao atualizar agendamento')
      return null
    } finally {
      setLoading(false)
    }
  }, [handleError])

  const updateAppointmentStatus = useCallback(async (id: string, status: Appointment['status']): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/agendamentos/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao atualizar status')
      }

      setAppointments(prev => prev.map(appointment => 
        appointment.id === id ? { ...appointment, status } : appointment
      ))

      const statusMessages = {
        CONFIRMED: 'Agendamento confirmado',
        COMPLETED: 'Agendamento concluído',
        CANCELLED: 'Agendamento cancelado',
        NO_SHOW: 'Marcado como não compareceu'
      }

      toast.success(statusMessages[status] || 'Status atualizado')
      return true
    } catch (error) {
      handleError(error, 'Erro ao atualizar status')
      return false
    } finally {
      setLoading(false)
    }
  }, [handleError])

  const deleteAppointment = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/agendamentos/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao excluir agendamento')
      }

      setAppointments(prev => prev.filter(appointment => appointment.id !== id))
      if (stats) {
        setStats(prev => prev ? { ...prev, total: prev.total - 1 } : null)
      }

      toast.success('Agendamento removido com sucesso!')
      return true
    } catch (error) {
      handleError(error, 'Erro ao excluir agendamento')
      return false
    } finally {
      setLoading(false)
    }
  }, [handleError, stats])

  const getAppointment = useCallback(async (id: string): Promise<Appointment | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/agendamentos/${id}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Agendamento não encontrado')
      }

      const appointment: Appointment = await response.json()
      return appointment
    } catch (error) {
      handleError(error, 'Erro ao buscar agendamento')
      return null
    } finally {
      setLoading(false)
    }
  }, [handleError])

  const getAvailableSlots = useCallback(async (date: string, serviceId?: string): Promise<string[]> => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ date })
      if (serviceId) params.set('serviceId', serviceId)

      const response = await fetch(`/api/agendamentos/slots?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao buscar horários')
      }

      const result = await response.json()
      return result.slots || []
    } catch (error) {
      handleError(error, 'Erro ao buscar horários disponíveis')
      return []
    } finally {
      setLoading(false)
    }
  }, [handleError])

  const sendConfirmation = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/agendamentos/${id}/confirmation`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Erro ao enviar confirmação')
      }

      setAppointments(prev => prev.map(appointment => 
        appointment.id === id ? { ...appointment, confirmationSent: true } : appointment
      ))

      toast.success('Confirmação enviada com sucesso!')
      return true
    } catch (error) {
      toast.error('Erro ao enviar confirmação')
      return false
    }
  }, [])

  const sendReminder = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/agendamentos/${id}/reminder`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Erro ao enviar lembrete')
      }

      setAppointments(prev => prev.map(appointment => 
        appointment.id === id ? { ...appointment, reminderSent: true } : appointment
      ))

      toast.success('Lembrete enviado com sucesso!')
      return true
    } catch (error) {
      toast.error('Erro ao enviar lembrete')
      return false
    }
  }, [])

  const refreshAppointments = useCallback(async () => {
    await searchAppointments()
  }, [searchAppointments])

  useEffect(() => {
    searchAppointments()
  }, [searchAppointments])

  return {
    appointments,
    stats,
    pagination,
    loading,
    error,
    searchAppointments,
    createAppointment,
    updateAppointment,
    updateAppointmentStatus,
    deleteAppointment,
    getAppointment,
    getAvailableSlots,
    sendConfirmation,
    sendReminder,
    refreshAppointments,
  }
}