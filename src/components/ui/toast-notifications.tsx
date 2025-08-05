'use client'

import { toast as sonnerToast } from 'sonner'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Loader2,
  User,
  Briefcase,
  Calendar,
  Shield,
  Clock,
  Mail
} from 'lucide-react'

export interface ToastOptions {
  duration?: number
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center'
  dismissible?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

class CustomToast {
  success(message: string, options?: ToastOptions) {
    return sonnerToast(message, {
      duration: options?.duration || 4000,
      position: options?.position || 'top-right',
      dismissible: options?.dismissible !== false,
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      className: 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200',
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick
      } : undefined
    })
  }

  error(message: string, options?: ToastOptions) {
    return sonnerToast(message, {
      duration: options?.duration || 6000,
      position: options?.position || 'top-right',
      dismissible: options?.dismissible !== false,
      icon: <XCircle className="h-5 w-5 text-red-600" />,
      className: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200',
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick
      } : undefined
    })
  }

  warning(message: string, options?: ToastOptions) {
    return sonnerToast(message, {
      duration: options?.duration || 5000,
      position: options?.position || 'top-right',
      dismissible: options?.dismissible !== false,
      icon: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
      className: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200',
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick
      } : undefined
    })
  }

  info(message: string, options?: ToastOptions) {
    return sonnerToast(message, {
      duration: options?.duration || 4000,
      position: options?.position || 'top-right',
      dismissible: options?.dismissible !== false,
      icon: <Info className="h-5 w-5 text-blue-600" />,
      className: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200',
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick
      } : undefined
    })
  }

  loading(message: string, options?: Omit<ToastOptions, 'dismissible'>) {
    return sonnerToast(message, {
      duration: Infinity,
      position: options?.position || 'top-right',
      dismissible: false,
      icon: <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />,
      className: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200'
    })
  }

  dismiss(toastId?: string | number) {
    return sonnerToast.dismiss(toastId)
  }

  dismissAll() {
    return sonnerToast.dismiss()
  }

  // Toasts específicos para entidades do AgendaBem
  client = {
    created: (name: string) => this.success(
      `Cliente "${name}" cadastrado com sucesso!`,
      {
        action: {
          label: 'Ver detalhes',
          onClick: () => console.log('Navigate to client details')
        }
      }
    ),
    
    updated: (name: string) => this.success(`Cliente "${name}" atualizado com sucesso!`),
    
    deleted: (name: string) => this.success(
      `Cliente "${name}" removido com sucesso`,
      {
        duration: 3000,
        action: {
          label: 'Desfazer',
          onClick: () => this.info('Funcionalidade de desfazer em desenvolvimento')
        }
      }
    ),
    
    error: (action: string, name?: string) => this.error(
      `Erro ao ${action} ${name ? `cliente "${name}"` : 'cliente'}. Tente novamente.`
    )
  }

  service = {
    created: (name: string) => this.success(`Serviço "${name}" criado com sucesso!`),
    
    updated: (name: string) => this.success(`Serviço "${name}" atualizado com sucesso!`),
    
    activated: (name: string) => sonnerToast(
      `Serviço "${name}" ativado com sucesso!`,
      {
        icon: <Briefcase className="h-5 w-5 text-green-600" />,
        className: 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200'
      }
    ),
    
    deactivated: (name: string) => sonnerToast(
      `Serviço "${name}" desativado`,
      {
        icon: <Briefcase className="h-5 w-5 text-yellow-600" />,
        className: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200'
      }
    ),
    
    deleted: (name: string) => this.success(`Serviço "${name}" removido com sucesso`),
    
    error: (action: string, name?: string) => this.error(
      `Erro ao ${action} ${name ? `serviço "${name}"` : 'serviço'}. Tente novamente.`
    )
  }

  appointment = {
    created: (clientName: string, time: string) => sonnerToast(
      `Agendamento criado para ${clientName} às ${time}`,
      {
        icon: <Calendar className="h-5 w-5 text-green-600" />,
        className: 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200',
        action: {
          label: 'Ver agenda',
          onClick: () => console.log('Navigate to calendar')
        }
      }
    ),
    
    updated: (clientName: string) => this.success(`Agendamento de ${clientName} atualizado`),
    
    cancelled: (clientName: string) => this.warning(
      `Agendamento de ${clientName} foi cancelado`,
      {
        action: {
          label: 'Reagendar',
          onClick: () => console.log('Reschedule appointment')
        }
      }
    ),
    
    confirmed: (clientName: string) => sonnerToast(
      `Agendamento de ${clientName} confirmado`,
      {
        icon: <Calendar className="h-5 w-5 text-blue-600" />,
        className: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-