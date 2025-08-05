'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, Loader2, Mail, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type VerificationStatus = 'loading' | 'success' | 'error' | 'expired' | 'invalid'

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<VerificationStatus>('loading')
  const [message, setMessage] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [isResending, setIsResending] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  useEffect(() => {
    if (!token || !email) {
      setStatus('invalid')
      setMessage('Link de verificação inválido. Verifique se copiou o link completo do email.')
      return
    }

    setUserEmail(email)
    verifyEmail(token, email)
  }, [token, email])

  const verifyEmail = async (token: string, email: string) => {
    try {
      setStatus('loading')
      
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, email }),
      })

      const result = await response.json()

      if (response.ok) {
        setStatus('success')
        setMessage(result.message || 'Email verificado com sucesso!')
        toast.success('Email verificado! Redirecionando...')
        
        // Redirecionar para login após 3 segundos
        setTimeout(() => {
          router.push('/entrar?message=email-verificado')
        }, 3000)
      } else {
        if (response.status === 410) {
          setStatus('expired')
          setMessage(result.message || 'Link de verificação expirado.')
        } else if (response.status === 400) {
          if (result.message?.includes('já verificado')) {
            setStatus('success')
            setMessage('Este email já foi verificado anteriormente. Você pode fazer login normalmente.')
            setTimeout(() => {
              router.push('/entrar')
            }, 3000)
          } else {
            setStatus('error')
            setMessage(result.message || 'Erro ao verificar email.')
          }
        } else {
          setStatus('error')
          setMessage(result.message || 'Erro ao verificar email.')
        }
      }
    } catch (error) {
      console.error('Erro na verificação:', error)
      setStatus('error')
      setMessage('Erro de conexão. Tente novamente em alguns minutos.')
    }
  }

  const resendVerificationEmail = async () => {
    if (!email) return
    
    setIsResending(true)
    
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Novo email de verificação enviado!')
        setMessage('Um novo email de verificação foi enviado. Verifique sua caixa de entrada.')
      } else {
        toast.error(result.message || 'Erro ao reenviar email')
      }
    } catch (error) {
      console.error('Erro ao reenviar:', error)
      toast.error('Erro de conexão. Tente novamente.')
    } finally {
      setIsResending(false)
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-500" />
      case 'error':
      case 'expired':
      case 'invalid':
        return <XCircle className="h-16 w-16 text-red-500" />
      default:
        return <Mail className="h-16 w-16 text-gray-400" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
      case 'error':
      case 'expired':
      case 'invalid':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
      default:
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
    }
  }

  const getTitle = () => {
    switch (status) {
      case 'loading':
        return 'Verificando seu email...'
      case 'success':
        return 'Email verificado com sucesso!'
      case 'expired':
        return 'Link expirado'
      case 'error':
        return 'Erro na verificação'
      case 'invalid':
        return 'Link inválido'
      default:
        return 'Verificação de email'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className={`${getStatusColor()} border-2`}>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {getStatusIcon()}
            </div>
            <CardTitle className="text-2xl font-bold">
              {getTitle()}
            </CardTitle>
            {userEmail && (
              <CardDescription>
                {userEmail}
              </CardDescription>
            )}
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-gray-700 dark:text-gray-300">
                {message}
              </p>
            </div>

            {/* Ações baseadas no status */}
            <div className="space-y-3">
              {status === 'success' && (
                <div className="space-y-3">
                  <Button 
                    asChild 
                    className="w-full"
                  >
                    <Link href="/entrar">
                      Fazer Login
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                  <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                    Redirecionando automaticamente em alguns segundos...
                  </p>
                </div>
              )}

              {(status === 'expired' || status === 'error') && email && (
                <div className="space-y-3">
                  <Button 
                    onClick={resendVerificationEmail}
                    disabled={isResending}
                    className="w-full"
                    variant="outline"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Reenviando...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Reenviar Email
                      </>
                    )}
                  </Button>
                  <Button 
                    asChild 
                    variant="ghost" 
                    className="w-full"
                  >
                    <Link href="/entrar">
                      Voltar ao Login
                    </Link>
                  </Button>
                </div>
              )}

              {status === 'invalid' && (
                <div className="space-y-3">
                  <Button 
                    asChild 
                    className="w-full"
                  >
                    <Link href="/cadastro">
                      Criar Nova Conta
                    </Link>
                  </Button>
                  <Button 
                    asChild 
                    variant="outline" 
                    className="w-full"
                  >
                    <Link href="/entrar">
                      Fazer Login
                    </Link>
                  </Button>
                </div>
              )}

              {status === 'loading' && (
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Aguarde enquanto verificamos seu email...
                  </p>
                </div>
              )}
            </div>

            {/* Debug info em desenvolvimento */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 p-3 rounded">
                <strong>Debug:</strong><br />
                Token: {token?.slice(0, 10)}...<br />
                Email: {email}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Precisa de ajuda?{' '}
            <Link 
              href="/contato" 
              className="text-primary hover:underline"
            >
              Entre em contato
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}