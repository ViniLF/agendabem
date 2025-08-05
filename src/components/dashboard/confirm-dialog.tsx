'use client'

import { useState } from 'react'
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  Loader2,
  Shield,
  User,
  Briefcase
} from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void> | void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive' | 'warning'
  entity?: 'client' | 'service' | 'appointment' | 'generic'
  entityName?: string
  additionalInfo?: string[]
  loading?: boolean
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'default',
  entity = 'generic',
  entityName,
  additionalInfo = [],
  loading = false
}: ConfirmDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleConfirm = async () => {
    if (isProcessing || loading) return

    setIsProcessing(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (error) {
      console.error('Erro na confirmação:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = () => {
    if (isProcessing || loading) return
    onOpenChange(false)
  }

  const getVariantStyles = () => {
    switch (variant) {
      case 'destructive':
        return {
          iconBg: 'bg-red-100 dark:bg-red-900/20',
          iconColor: 'text-red-600 dark:text-red-400',
          titleColor: 'text-red-900 dark:text-red-100',
          confirmButton: 'bg-red-600 hover:bg-red-700 text-white'
        }
      case 'warning':
        return {
          iconBg: 'bg-yellow-100 dark:bg-yellow-900/20',
          iconColor: 'text-yellow-600 dark:text-yellow-400',
          titleColor: 'text-yellow-900 dark:text-yellow-100',
          confirmButton: 'bg-yellow-600 hover:bg-yellow-700 text-white'
        }
      default:
        return {
          iconBg: 'bg-blue-100 dark:bg-blue-900/20',
          iconColor: 'text-blue-600 dark:text-blue-400',
          titleColor: 'text-blue-900 dark:text-blue-100',
          confirmButton: 'bg-primary hover:bg-primary/90'
        }
    }
  }

  const getEntityIcon = () => {
    switch (entity) {
      case 'client':
        return <User className="h-6 w-6" />
      case 'service':
        return <Briefcase className="h-6 w-6" />
      case 'appointment':
        return <Shield className="h-6 w-6" />
      default:
        return variant === 'destructive' ? <Trash2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />
    }
  }

  const styles = getVariantStyles()
  const isDisabled = isProcessing || loading

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-4 mb-2">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${styles.iconBg}`}>
              <div className={styles.iconColor}>
                {getEntityIcon()}
              </div>
            </div>
            <div className="flex-1">
              <DialogTitle className={`text-lg font-semibold ${styles.titleColor}`}>
                {title}
              </DialogTitle>
              {entityName && (
                <p className="text-sm text-muted-foreground mt-1">
                  {entityName}
                </p>
              )}
            </div>
          </div>
          <DialogDescription className="text-gray-600 dark:text-gray-300">
            {description}
          </DialogDescription>
        </DialogHeader>

        {additionalInfo.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Informações importantes:
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              {additionalInfo.map((info, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-gray-400 mt-1">•</span>
                  <span>{info}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {variant === 'destructive' && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-red-800 dark:text-red-200">
                  Atenção: Esta ação não pode ser desfeita
                </p>
                <p className="text-red-700 dark:text-red-300 mt-1">
                  Certifique-se de que realmente deseja continuar.
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isDisabled}
              className="flex-1 sm:flex-none"
            >
              <X className="h-4 w-4 mr-2" />
              {cancelText}
            </Button>
            
            <Button
              onClick={handleConfirm}
              disabled={isDisabled}
              className={`flex-1 sm:flex-none min-w-[120px] ${styles.confirmButton}`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  {variant === 'destructive' ? (
                    <Trash2 className="h-4 w-4 mr-2" />
                  ) : (
                    <Shield className="h-4 w-4 mr-2" />
                  )}
                  {confirmText}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Hook para usar o ConfirmDialog de forma mais simples
export function useConfirmDialog() {
  const [dialogState, setDialogState] = useState<{
    open: boolean
    props: Omit<ConfirmDialogProps, 'open' | 'onOpenChange'>
  }>({
    open: false,
    props: {
      onConfirm: () => {},
      title: '',
      description: ''
    }
  })

  const showDialog = (props: Omit<ConfirmDialogProps, 'open' | 'onOpenChange'>) => {
    setDialogState({
      open: true,
      props
    })
  }

  const hideDialog = () => {
    setDialogState(prev => ({
      ...prev,
      open: false
    }))
  }

  const ConfirmDialogComponent = () => (
    <ConfirmDialog
      {...dialogState.props}
      open={dialogState.open}
      onOpenChange={hideDialog}
    />
  )

  return {
    showDialog,
    hideDialog,
    ConfirmDialog: ConfirmDialogComponent,
    isOpen: dialogState.open
  }
}

// Funções helper para casos comuns
export const confirmDeleteClient = (
  showDialog: (props: any) => void,
  clientName: string,
  onConfirm: () => Promise<void>,
  appointmentsCount?: number
) => {
  const additionalInfo = []
  if (appointmentsCount && appointmentsCount > 0) {
    additionalInfo.push(`${appointmentsCount} agendamento(s) será(ão) mantido(s) no histórico`)
    additionalInfo.push('Os dados serão removidos conforme a LGPD')
  }

  showDialog({
    title: 'Excluir Cliente',
    description: `Tem certeza que deseja excluir o cliente "${clientName}"? Esta ação removerá permanentemente todos os dados pessoais.`,
    confirmText: 'Excluir Cliente',
    variant: 'destructive',
    entity: 'client',
    entityName: clientName,
    additionalInfo,
    onConfirm
  })
}

export const confirmDeleteService = (
  showDialog: (props: any) => void,
  serviceName: string,
  onConfirm: () => Promise<void>,
  appointmentsCount?: number
) => {
  const additionalInfo = []
  if (appointmentsCount && appointmentsCount > 0) {
    additionalInfo.push(`${appointmentsCount} agendamento(s) utilizaram este serviço`)
    additionalInfo.push('Considere desativar ao invés de excluir')
  }

  showDialog({
    title: 'Excluir Serviço',
    description: `Tem certeza que deseja excluir o serviço "${serviceName}"? Esta ação não pode ser desfeita.`,
    confirmText: 'Excluir Serviço',
    variant: 'destructive',
    entity: 'service',
    entityName: serviceName,
    additionalInfo,
    onConfirm
  })
}

export const confirmToggleService = (
  showDialog: (props: any) => void,
  serviceName: string,
  isActive: boolean,
  onConfirm: () => Promise<void>
) => {
  const action = isActive ? 'desativar' : 'ativar'
  const actionUpper = isActive ? 'Desativar' : 'Ativar'
  
  showDialog({
    title: `${actionUpper} Serviço`,
    description: `Deseja ${action} o serviço "${serviceName}"? ${isActive ? 'Ele não aparecerá mais na agenda pública.' : 'Ele voltará a aparecer na agenda pública.'}`,
    confirmText: `${actionUpper} Serviço`,
    variant: 'warning',
    entity: 'service',
    entityName: serviceName,
    onConfirm
  })
}