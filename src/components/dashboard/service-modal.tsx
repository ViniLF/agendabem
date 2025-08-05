'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { 
  Briefcase, 
  Clock, 
  DollarSign, 
  Palette,
  FileText,
  Save,
  X,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Calendar,
  TrendingUp
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
import { useServices } from '@/hooks/use-services'

const serviceFormSchema = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo')
    .trim(),
  description: z.string()
    .max(500, 'Descrição muito longa')
    .trim()
    .optional()
    .or(z.literal('')),
  duration: z.number()
    .min(15, 'Duração mínima de 15 minutos')
    .max(480, 'Duração máxima de 8 horas'),
  price: z.number()
    .min(0, 'Preço não pode ser negativo')
    .max(10000, 'Preço muito alto')
    .optional(),
  color: z.string()
    .regex(/^#[0-9A-F]{6}$/i, 'Cor deve estar no formato hexadecimal')
    .optional(),
  isActive: z.boolean()
})

type ServiceFormData = z.infer<typeof serviceFormSchema>

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

interface ServiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  service?: Service | null
  mode: 'create' | 'edit' | 'view'
}

const colorOptions = [
  { value: '#3B82F6', label: 'Azul', bg: 'bg-blue-500' },
  { value: '#10B981', label: 'Verde', bg: 'bg-green-500' },
  { value: '#8B5CF6', label: 'Roxo', bg: 'bg-purple-500' },
  { value: '#F59E0B', label: 'Amarelo', bg: 'bg-yellow-500' },
  { value: '#EF4444', label: 'Vermelho', bg: 'bg-red-500' },
  { value: '#6B7280', label: 'Cinza', bg: 'bg-gray-500' },
  { value: '#EC4899', label: 'Rosa', bg: 'bg-pink-500' },
  { value: '#14B8A6', label: 'Turquesa', bg: 'bg-teal-500' }
]

const durationOptions = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1h 30min' },
  { value: 120, label: '2 horas' },
  { value: 180, label: '3 horas' },
  { value: 240, label: '4 horas' }
]

export default function ServiceModal({ 
  open, 
  onOpenChange, 
  service = null, 
  mode = 'create' 
}: ServiceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { createService, updateService } = useServices()
  
  const isReadOnly = mode === 'view'
  const isEdit = mode === 'edit'
  const isCreate = mode === 'create'

  const form = useForm({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: '',
      description: '',
      duration: 60,
      price: 0,
      color: '#3B82F6',
      isActive: true
    }
  })

  useEffect(() => {
    if (service && (isEdit || mode === 'view')) {
      form.reset({
        name: service.name || '',
        description: service.description || '',
        duration: service.duration || 60,
        price: service.price || 0,
        color: service.color || '#3B82F6',
        isActive: service.isActive ?? true
      })
    } else if (isCreate) {
      form.reset({
        name: '',
        description: '',
        duration: 60,
        price: 0,
        color: '#3B82F6',
        isActive: true
      })
    }
  }, [service, mode, form, isEdit, isCreate])

  const onSubmit = async (data: ServiceFormData) => {
    if (isReadOnly) return

    setIsSubmitting(true)

    try {
      const cleanData = {
        name: data.name,
        description: data.description || undefined,
        duration: data.duration,
        price: data.price || undefined,
        color: data.color || '#3B82F6',
        isActive: data.isActive
      }

      let result
      if (isCreate) {
        result = await createService(cleanData)
      } else if (isEdit && service) {
        result = await updateService(service.id, cleanData)
      }

      if (result) {
        onOpenChange(false)
        form.reset()
        toast.success(
          isCreate 
            ? 'Serviço criado com sucesso!' 
            : 'Serviço atualizado com sucesso!'
        )
      }
    } catch (error) {
      console.error('Erro ao salvar serviço:', error)
      toast.error('Erro ao salvar serviço. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (isSubmitting) return
    onOpenChange(false)
    form.reset()
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getModalTitle = () => {
    switch (mode) {
      case 'create': return 'Novo Serviço'
      case 'edit': return 'Editar Serviço'
      case 'view': return 'Detalhes do Serviço'
      default: return 'Serviço'
    }
  }

  const getModalDescription = () => {
    switch (mode) {
      case 'create': return 'Configure um novo serviço para sua agenda'
      case 'edit': return 'Atualize as informações do serviço'
      case 'view': return 'Visualizar informações detalhadas do serviço'
      default: return ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            {getModalTitle()}
          </DialogTitle>
          <DialogDescription>
            {getModalDescription()}
          </DialogDescription>
        </DialogHeader>

        {mode === 'view' && service && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{service.appointmentsCount}</p>
              <p className="text-xs text-muted-foreground">Agendamentos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{formatDuration(service.duration)}</p>
              <p className="text-xs text-muted-foreground">Duração</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">R$ {service.price.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Preço</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                {service.isActive ? (
                  <ToggleRight className="h-5 w-5 text-green-600" />
                ) : (
                  <ToggleLeft className="h-5 w-5 text-gray-400" />
                )}
                <span className="text-sm font-semibold">
                  {service.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Status</p>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Nome do Serviço *
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Consulta Inicial, Limpeza de Pele, Corte de Cabelo"
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Descrição
                  </FormLabel>
                  <FormControl>
                    <textarea
                      placeholder="Descreva o que está incluído neste serviço..."
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isReadOnly || isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Duração *
                    </FormLabel>
                    <FormControl>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isReadOnly || isSubmitting}
                        value={field.value}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      >
                        {durationOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Preço (R$)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="10000"
                        step="0.01"
                        placeholder="0.00"
                        disabled={isReadOnly || isSubmitting}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Deixe em branco se o preço varia
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Cor do Serviço
                  </FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map((colorOption) => (
                        <button
                          key={colorOption.value}
                          type="button"
                          disabled={isReadOnly || isSubmitting}
                          onClick={() => field.onChange(colorOption.value)}
                          className={`w-10 h-10 rounded-full border-2 transition-all ${colorOption.bg} ${
                            field.value === colorOption.value
                              ? 'border-gray-900 dark:border-white scale-110'
                              : 'border-gray-300 hover:scale-105'
                          }`}
                          title={colorOption.label}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormDescription>
                    A cor ajuda a identificar o serviço no calendário
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isReadOnly && (
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center gap-2">
                        {field.value ? (
                          <ToggleRight className="h-5 w-5 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-gray-400" />
                        )}
                        Serviço Ativo
                      </FormLabel>
                      <FormDescription>
                        Serviços inativos não aparecem na agenda pública
                      </FormDescription>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        disabled={isSubmitting}
                        className="w-4 h-4 text-primary bg-background border-gray-300 rounded focus:ring-primary focus:ring-2"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            {mode === 'view' && service && (
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Informações do Sistema
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Criado em:</span>
                    <p className="font-medium">{formatDate(service.createdAt)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Última atualização:</span>
                    <p className="font-medium">{formatDate(service.updatedAt)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Último uso:</span>
                    <p className="font-medium">{formatDate(service.lastUsed)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total de agendamentos:</span>
                    <p className="font-medium">{service.appointmentsCount}</p>
                  </div>
                </div>
              </div>
            )}
          </form>
        </Form>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>Configure seus serviços para otimizar a agenda</span>
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
                  disabled={isSubmitting}
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
                      {isCreate ? 'Criar Serviço' : 'Atualizar'}
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