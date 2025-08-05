'use client'

import { toast as sonnerToast } from 'sonner'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Loader2,
  X,
  User,
  Briefcase,
  Calendar,
  Shield
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
  // Toast de sucesso
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

  // Toast de erro
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

  // Toast de aviso
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

  // Toast de informação
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

  // Toast de loading
  loading(message: string, options?: Omit<ToastOptions, 'dismissible'>) {
    return sonnerToast(message, {
      duration: Infinity,
      position: options?.position || 'top-right',
      dismissible: false,
      icon: <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />,
      className: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200'
    })
  }

  // Toast customizado com ícone específico
  custom(message: string, icon: React.ReactNode, className: string, options?: ToastOptions) {
    return sonnerToast(message, {
      duration: options?.duration || 4000,
      position: options?.position || 'top-right',
      dismissible: options?.dismissible !== false,
      icon,
      className,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick
      } : undefined
    })
  }

  // Dismiss um toast específico
  dismiss(toastId?: string | number) {
    return sonnerToast.dismiss(toastId)
  }

  // Dismiss todos os toasts
  dismissAll() {
    return sonnerToast.dismiss()
  }

  // Toasts específicos para entidades do sistema
  client = {
    created: (name: string) => this.success(
      `Cliente "${name}" cadastrado com sucesso!`,
      {
        action: {
          label: 'Ver',
          onClick: () => console.log('View client', name)
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
    
    activated: (name: string) => this.custom(
      `Serviço "${name}" ativado com sucesso!`,
      <Briefcase className="h-5 w-5 text-green-600" />,
      'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200'
    ),
    
    deactivated: (name: string) => this.custom(
      `Serviço "${name}" desativado`,
      <Briefcase className="h-5 w-5 text-yellow-600" />,
      'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200'
    ),
    
    deleted: (name: string) => this.success(`Serviço "${name}" removido com sucesso`),
    
    error: (action: string, name?: string) => this.error(
      `Erro ao ${action} ${name ? `serviço "${name}"` : 'serviço'}. Tente novamente.`
    )
  }

  appointment = {
    created: (clientName: string, time: string) => this.custom(
      `Agendamento criado para ${clientName} às ${time}`,
      <Calendar className="h-5 w-5 text-green-600" />,
      'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200',
      {
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
    
    confirmed: (clientName: string) => this.custom(
      `Agendamento de ${clientName} confirmado`,
      <Calendar className="h-5 w-5 text-blue-600" />,
      'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200'
    ),
    
    error: (action: string) => this.error(`Erro ao ${action} agendamento. Tente novamente.`)
  }

  auth = {
    loginSuccess: (name: string) => this.custom(
      `Bem-vindo(a), ${name}!`,
      <User className="h-5 w-5 text-green-600" />,
      'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200'
    ),
    
    logoutSuccess: () => this.info('Você foi desconectado com sucesso'),
    
    registrationSuccess: () => this.success(
      'Conta criada com sucesso! Verifique seu email para ativar.',
      { duration: 6000 }
    ),
    
    emailVerified: () => this.success(
      'Email verificado! Você já pode fazer login.',
      { duration: 5000 }
    ),
    
    passwordReset: () => this.info(
      'Email de recuperação enviado. Verifique sua caixa de entrada.',
      { duration: 6000 }
    ),
    
    error: (message: string) => this.error(message, { duration: 5000 })
  }

  system = {
    saving: () => this.loading('Salvando alterações...'),
    
    loading: (message: string = 'Carregando...') => this.loading(message),
    
    networkError: () => this.error(
      'Erro de conexão. Verifique sua internet e tente novamente.',
      {
        duration: 8000,
        action: {
          label: 'Tentar novamente',
          onClick: () => window.location.reload()
        }
      }
    ),
    
    maintenance: () => this.warning(
      'Sistema em manutenção. Algumas funcionalidades podem estar indisponíveis.',
      { duration: 10000 }
    ),
    
    updateAvailable: () => this.info(
      'Nova versão disponível!',
      {
        duration: 8000,
        action: {
          label: 'Atualizar',
          onClick: () => window.location.reload()
        }
      }
    ),
    
    lgpdCompliance: () => this.custom(
      'Dados processados conforme LGPD',
      <Shield className="h-5 w-5 text-blue-600" />,
      'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200',
      { duration: 3000 }
    )
  }
}

export const toast = new CustomToast()

// Hook para usar toasts de forma mais organizada
export function useToast() {
  return {
    toast,
    success: toast.success.bind(toast),
    error: toast.error.bind(toast),
    warning: toast.warning.bind(toast),
    info: toast.info.bind(toast),
    loading: toast.loading.bind(toast),
    dismiss: toast.dismiss.bind(toast),
    dismissAll: toast.dismissAll.bind(toast)
  }
}

// Promise-based toast para operações async
export function toastPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string
    success: string | ((data: T) => string)
    error: string | ((error: any) => string)
  }
) {
  const loadingToast = toast.loading(messages.loading)
  
  return promise
    .then((data) => {
      toast.dismiss(loadingToast)
      const successMessage = typeof messages.success === 'function' 
        ? messages.success(data) 
        : messages.success
      toast.success(successMessage)
      return data
    })
    .catch((error) => {
      toast.dismiss(loadingToast)
      const errorMessage = typeof messages.error === 'function'
        ? messages.error(error)
        : messages.error
      toast.error(errorMessage)
      throw error
    })
}