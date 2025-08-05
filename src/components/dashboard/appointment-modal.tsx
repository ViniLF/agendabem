'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { 
  Calendar, 
  Clock, 
  User, 
  Briefcase,
  Mail,
  Phone,
  DollarSign,
  FileText,
  Save,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  UserPlus
} from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAppointments } from '@/hooks/use-appointments'
import { useServices } from '@/hooks/use-services'
import { useClients } from '@/hooks/use-clients'

const appointmentFormSchema = z.object({
  date: z.string()
    .min(1, 'Data é obrigatória'),
  time: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário inválido'),
  serviceId: z.string()
    .min(1, 'Selecione um serviço'),
  clientType: z.enum(['existing', 'new']),
  clientId: z.string().optional(),
  clientName: z.string()
    .min(2, 'Nome muito curto')
    .max(100, 'Nome muito longo')
    .trim()
    .optional(),
  clientEmail: z.string()
    .email('Email inválido')
    .toLowerCase()
    .trim()
    .optional(),
  clientPhone: z.string()
    .regex(/^(\+55\s?)?(\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}$/, 'Telefone inválido')
    .optional(),
  notes: z.string()
    .max(500, 'Observações muito longas')
    .trim()
    .optional(),
  requiresPayment: z.boolean().default(false),
  paymentMethod: z.enum(['OFFLINE', 'PIX_OWN', 'INTEGRATED']).default('OFFLINE')
}).refine(data => {
  if (data.clientType === 'existing') {
    return !!data.clientId
  }
  return !!data.clientName
}, {
  message: 'Selecione um cliente ou preencha o nome',
  path: ['clientName']
})

type AppointmentFormData = z.infer<typeof appointmentFormSchema>

interface Appointment {
  id: string
  date: string
  duration: number
  status: string
  clientName?: string
  clientEmail?: string
  clientPhone?: string
  serviceName: string
  servicePrice?: number
  notes?: string
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

interface Service {
  id: string
  name: string
  duration: number
  price: number
  color?: string
  isActive: boolean
}

interface Client {
  id: string
  name: string
  email?: string
  phone?: string
}

interface AppointmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment?: Appointment | null
  mode: 'create' | 'edit' | 'view'
  preselectedDate?: string
  preselectedService?: string
}

export default function AppointmentModal({ 
  open, 
  onOpenChange, 
  appointment = null, 
  mode = 'create',
  preselectedDate,
  preselectedService
}: AppointmentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  
  const { createAppointment, updateAppointment, getAvailableSlots } = useAppointments()
  const { services } = useServices()
  const { clients } = useClients()
  
  const isReadOnly = mode === 'view'
  const isEdit = mode === 'edit'
  const isCreate = mode === 'create'

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      date: preselectedDate || '',
      time: '',
      serviceId: preselectedService || '',
      clientType: 'existing',
      clientId: '',
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      notes: '',
      requiresPayment: false,
      paymentMethod: 'OFFLINE'
    }
  })

  const watchDate = form.watch('date')
  const watchServiceId = form.watch('serviceId')
  const watchClientType = form.watch('clientType')

  useEffect(() => {
    if (appointment && (isEdit || mode === 'view')) {
      const appointmentDate = new Date(appointment.date)
      form.reset({
        date: appointmentDate.toISOString().split('T')[0],
        time: appointmentDate.toTimeString().slice(0, 5),
        serviceId: appointment.service?.id || '',
        clientType: appointment.client ? 'existing' : 'new',
        clientId: appointment.client?.id || '',
        clientName: appointment.clientName || '',
        clientEmail: appointment.clientEmail || '',
        clientPhone: appointment.clientPhone || '',
        notes: appointment.notes || '',
        requiresPayment: false,
        paymentMethod: 'OFFLINE'
      })
    }
  }, [appointment, mode, form, isEdit])

  useEffect(() => {
    const service = services.find(s => s.id === watchServiceId)
    setSelectedService(service || null)
  }, [watchServiceId, services])

  useEffect(() => {
    if (watchDate && watchServiceId) {
      loadAvailableSlots(watchDate, watchServiceId)
    }
  }, [watchDate, watchServiceId])

  const loadAvailableSlots = async (date: string, serviceId: string) => {
    try {
      const slots = await getAvailableSlots(date, serviceId)
      setAvailableSlots(slots)
    } catch (error) {
      console.error('Erro ao carregar horários:', error)
      setAvailableSlots([])
    }
  }

  const onSubmit = async (data: AppointmentFormData) => {
    if (isReadOnly) return

    setIsSubmitting(true)

    try {
      const appointmentData = {
        date: `${data.date}T${data.time}:00`,
        serviceId: data.serviceId,
        clientId: data.clientType === 'existing' ? data.clientId : undefined,
        clientName: data.clientType === 'new' ? data.clientName : undefined,
        clientEmail: data.clientType === 'new' ? data.clientEmail : undefined,
        clientPhone: data.clientType === 'new' ? data.clientPhone : undefined,
        serviceName: selectedService?.name || 'Serviço',
        duration: selectedService?.duration || 60,
        servicePrice: selectedService?.price,
        notes: data.notes,
        requiresPayment: data.requiresPayment,
        paymentMethod: data.paymentMethod
      }

      let result
      if (isCreate) {
        result = await createAppointment(appointmentData)
      } else if (isEdit && appointment) {
        result = await updateAppointment(appointment.id, appointmentData)
      }

      if (result) {
        onOpenChange(false)
        form.reset()
        toast.success(
          isCreate 
            ? 'Agendamento criado com sucesso!' 
            : 'Agendamento atualizado com sucesso!'
        )
      }
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error)
      toast.error('Erro ao salvar agendamento. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (isSubmitting) return
    onOpenChange(false)
    form.reset()
  }

  const getModalTitle = () => {
    switch (mode) {
      case 'create': return 'Novo Agendamento'
      case 'edit': return 'Editar Agendamento'
      case 'view': return 'Detalhes do Agendamento'
      default: return 'Agendamento'
    }
  }

  const getModalDescription = () => {
    switch (mode) {
      case 'create': return 'Agende um novo atendimento para seu cliente'
      case 'edit': return 'Atualize as informações do agendamento'
      case 'view': return 'Visualizar detalhes do agendamento'
      default: return ''
    }
  }

  const activeServices = services.filter(s => s.isActive)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {getModalTitle()}
          </DialogTitle>
          <DialogDescription>
            {getModalDescription()}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Data *
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        disabled={isReadOnly || isSubmitting}
                        min={new Date().toISOString().split('T')[0]}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serviceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Serviço *
                    </FormLabel>
                    <FormControl>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isReadOnly || isSubmitting}
                        {...field}
                      >
                        <option value="">Selecione um serviço</option>
                        {activeServices.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name} - {service.duration}min
                            {service.price && ` - R$ ${service.price.toFixed(2)}`}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Horário *
                  </FormLabel>
                  <FormControl>
                    {availableSlots.length > 0 ? (
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isReadOnly || isSubmitting}
                        {...field}
                      >
                        <option value="">Selecione um horário</option>
                        {availableSlots.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4" />
                        {watchDate && watchServiceId 
                          ? 'Nenhum horário disponível'
                          : 'Selecione uma data e serviço primeiro'
                        }
                      </div>
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="clientType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Cliente</FormLabel>
                    <FormControl>
                      <div className="flex gap-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            value="existing"
                            checked={field.value === 'existing'}
                            onChange={() => field.onChange('existing')}
                            disabled={isReadOnly || isSubmitting}
                            className="text-primary"
                          />
                          <span className="text-sm">Cliente Existente</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            value="new"
                            checked={field.value === 'new'}
                            onChange={() => field.onChange('new')}
                            disabled={isReadOnly || isSubmitting}
                            className="text-primary"
                          />
                          <span className="text-sm">Novo Cliente</span>
                        </label>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchClientType === 'existing' ? (
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Cliente *
                      </FormLabel>
                      <FormControl>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={isReadOnly || isSubmitting}
                          {...field}
                        >
                          <option value="">Selecione um cliente</option>
                          {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                              {client.name}
                              {client.phone && ` - ${client.phone}`}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="clientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <UserPlus className="h-4 w-4" />
                          Nome do Cliente *
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nome completo"
                            disabled={isReadOnly || isSubmitting}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="cliente@email.com"
                            disabled={isReadOnly || isSubmitting}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Telefone
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="(11) 99999-9999"
                            disabled={isReadOnly || isSubmitting}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Observações
                  </FormLabel>
                  <FormControl>
                    <textarea
                      placeholder="Observações sobre o agendamento..."
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isReadOnly || isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedService && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 mb-2">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">Resumo do Serviço</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-blue-600 dark:text-blue-400">Serviço:</span>
                    <p className="font-medium">{selectedService.name}</p>
                  </div>
                  <div>
                    <span className="text-blue-600 dark:text-blue-400">Duração:</span>
                    <p className="font-medium">{selectedService.duration} minutos</p>
                  </div>
                  {selectedService.price && (
                    <div>
                      <span className="text-blue-600 dark:text-blue-400">Preço:</span>
                      <p className="font-medium">R$ {selectedService.price.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>
        </Form>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Agendamento será confirmado automaticamente</span>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4 mr-2" />
                {isReadOnly ? 'Fechar' : 'Cancelar'}
              </Button>
              
              {!isReadOnly && (
                <Button
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={isSubmitting || !watchDate || !watchServiceId}
                  className="min-w-[120px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {isCreate ? 'Agendar' : 'Atualizar'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}