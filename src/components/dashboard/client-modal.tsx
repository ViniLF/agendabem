'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { 
  User, 
  Mail, 
  Phone, 
  Calendar,
  FileText,
  Save,
  X,
  Loader2,
  Shield,
  AlertTriangle
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
import { useClients } from '@/hooks/use-clients'

// Schema de validação para clientes
const clientFormSchema = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo')
    .trim(),
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email muito longo')
    .toLowerCase()
    .trim()
    .optional()
    .or(z.literal('')),
  phone: z.string()
    .regex(/^(\+55\s?)?(\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}$/, 'Telefone inválido (ex: (11) 99999-9999)')
    .optional()
    .or(z.literal('')),
  birthDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .optional()
    .or(z.literal('')),
  notes: z.string()
    .max(1000, 'Observações muito longas')
    .trim()
    .optional()
    .or(z.literal('')),
  dataConsent: z.boolean()
    .refine(val => val === true, 'Cliente deve consentir com uso dos dados')
})

type ClientFormData = z.infer<typeof clientFormSchema>

interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  birthDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
  status: 'active' | 'inactive'
  totalAppointments: number
  totalSpent: number
  lastAppointment?: string
}

interface ClientModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client?: Client | null
  mode: 'create' | 'edit' | 'view'
}

export default function ClientModal({ 
  open, 
  onOpenChange, 
  client = null, 
  mode = 'create' 
}: ClientModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { createClient, updateClient } = useClients()
  
  const isReadOnly = mode === 'view'
  const isEdit = mode === 'edit'
  const isCreate = mode === 'create'

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      birthDate: '',
      notes: '',
      dataConsent: false
    }
  })

  // Preencher formulário quando cliente for carregado
  useEffect(() => {
    if (client && (isEdit || mode === 'view')) {
      form.reset({
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        birthDate: client.birthDate ? client.birthDate.split('T')[0] : '',
        notes: client.notes || '',
        dataConsent: true // Se já existe, já consentiu
      })
    } else if (isCreate) {
      form.reset({
        name: '',
        email: '',
        phone: '',
        birthDate: '',
        notes: '',
        dataConsent: false
      })
    }
  }, [client, mode, form, isEdit, isCreate])

  const onSubmit = async (data: ClientFormData) => {
    if (isReadOnly) return

    setIsSubmitting(true)

    try {
      // Limpar campos vazios
      const cleanData = {
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        birthDate: data.birthDate || undefined,
        notes: data.notes || undefined,
        dataConsent: data.dataConsent
      }

      let result
      if (isCreate) {
        result = await createClient(cleanData)
      } else if (isEdit && client) {
        result = await updateClient(client.id, cleanData)
      }

      if (result) {
        onOpenChange(false)
        form.reset()
        toast.success(
          isCreate 
            ? 'Cliente cadastrado com sucesso!' 
            : 'Cliente atualizado com sucesso!'
        )
      }
    } catch (error) {
      console.error('Erro ao salvar cliente:', error)
      toast.error('Erro ao salvar cliente. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (isSubmitting) return
    onOpenChange(false)
    form.reset()
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getModalTitle = () => {
    switch (mode) {
      case 'create': return 'Novo Cliente'
      case 'edit': return 'Editar Cliente'
      case 'view': return 'Detalhes do Cliente'
      default: return 'Cliente'
    }
  }

  const getModalDescription = () => {
    switch (mode) {
      case 'create': return 'Cadastre um novo cliente em sua agenda'
      case 'edit': return 'Atualize as informações do cliente'
      case 'view': return 'Visualizar informações detalhadas do cliente'
      default: return ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {getModalTitle()}
          </DialogTitle>
          <DialogDescription>
            {getModalDescription()}
          </DialogDescription>
        </DialogHeader>

        {/* Estatísticas do Cliente (apenas no modo view) */}
        {mode === 'view' && client && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{client.totalAppointments}</p>
              <p className="text-xs text-muted-foreground">Consultas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                R$ {client.totalSpent.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">Total Gasto</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold capitalize">{client.status}</p>
              <p className="text-xs text-muted-foreground">Status</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">
                {client.lastAppointment ? formatDate(client.lastAppointment) : 'Nunca'}
              </p>
              <p className="text-xs text-muted-foreground">Última Consulta</p>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Nome completo */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Nome Completo *
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nome completo do cliente"
                      disabled={isReadOnly || isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email */}
              <FormField
                control={form.control}
                name="email"
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

              {/* Telefone */}
              <FormField
                control={form.control}
                name="phone"
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

            {/* Data de nascimento */}
            <FormField
              control={form.control}
              name="birthDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data de Nascimento
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      disabled={isReadOnly || isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Observações */}
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
                      placeholder="Observações sobre o cliente, histórico médico, preferências..."
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isReadOnly || isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Consentimento LGPD */}
            {!isReadOnly && (
              <FormField
                control={form.control}
                name="dataConsent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        disabled={isSubmitting || (isEdit && !!client)}
                        className="w-4 h-4 text-primary bg-background border-gray-300 rounded focus:ring-primary focus:ring-2"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Consentimento de Dados (LGPD)
                      </FormLabel>
                      <FormDescription>
                        O cliente autoriza o armazenamento e processamento de seus dados pessoais 
                        para fins de agendamento e atendimento, conforme nossa Política de Privacidade.
                      </FormDescription>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            )}

            {/* Informações adicionais no modo visualização */}
            {mode === 'view' && client && (
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Informações do Sistema
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Cliente desde:</span>
                    <p className="font-medium">{formatDate(client.createdAt)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Última atualização:</span>
                    <p className="font-medium">{formatDate(client.updatedAt)}</p>
                  </div>
                </div>
              </div>
            )}
          </form>
        </Form>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            {/* Aviso LGPD */}
            {!isReadOnly && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="h-3 w-3" />
                <span>Dados protegidos pela LGPD</span>
              </div>
            )}

            {/* Botões de ação */}
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
                      {isCreate ? 'Cadastrar' : 'Atualizar'}
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