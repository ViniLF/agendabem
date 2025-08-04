'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Calendar, Shield, Zap } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { userLoginSchema, type UserLogin } from '@/lib/validation'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/agenda'

  const form = useForm<UserLogin>({
    resolver: zodResolver(userLoginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  })

  const onSubmit = async (data: UserLogin) => {
    setIsLoading(true)
    
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        toast.error(getErrorMessage(result.error))
        return
      }

      if (result?.ok) {
        // Verificar se a sessão foi criada corretamente
        const session = await getSession()
        
        if (session?.user) {
          toast.success(`Bem-vindo(a), ${session.user.name}!`)
          
          // Verificar se o usuário aceitou os termos de privacidade
          if (!session.user.dataConsent) {
            router.push('/configuracoes/privacidade?redirect=true')
            return
          }
          
          router.push(callbackUrl)
        } else {
          toast.error('Erro ao criar sessão. Tente novamente.')
        }
      }
    } catch (error) {
      console.error('Erro no login:', error)
      toast.error('Erro interno. Tente novamente em alguns minutos.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    
    try {
      await signIn('google', {
        callbackUrl: callbackUrl
      })
    } catch (error) {
      console.error('Erro no login com Google:', error)
      toast.error('Erro ao fazer login com Google. Tente novamente.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row min-h-screen">
          
          {/* Seção de Branding - Lado Esquerdo */}
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md space-y-8">
              <div className="text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-3 mb-6">
                  <div className="bg-primary/10 p-3 rounded-xl">
                    <Calendar className="h-8 w-8 text-primary" />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    AgendaBem
                  </h1>
                </div>
                
                <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  Simplifique seus agendamentos
                </h2>
                
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
                  A plataforma completa para profissionais gerenciarem seus atendimentos 
                  com segurança e praticidade.
                </p>
              </div>

              {/* Features */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                    <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      100% Seguro
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Criptografia de dados e conformidade LGPD
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                    <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Fácil de usar
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Interface intuitiva e responsiva
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Seção de Login - Lado Direito */}
          <div className="flex-1 flex items-center justify-center p-8">
            <Card className="w-full max-w-md">
              <CardHeader className="space-y-2">
                <CardTitle className="text-2xl font-bold text-center">
                  Entrar na sua conta
                </CardTitle>
                <CardDescription className="text-center">
                  Digite suas credenciais para acessar o painel
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    
                    {/* Email */}
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="seu@email.com"
                              autoComplete="email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Senha */}
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                autoComplete="current-password"
                                {...field}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Botão de Login */}
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading}
                    >
                      {isLoading ? 'Entrando...' : 'Entrar'}
                    </Button>
                  </form>
                </Form>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Ou continue com
                    </span>
                  </div>
                </div>

                {/* Login com Google */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continuar com Google
                </Button>

                {/* Links Adicionais */}
                <div className="text-center space-y-2">
                  <Link
                    href="/esqueci-senha"
                    className="text-sm text-primary hover:underline"
                  >
                    Esqueceu sua senha?
                  </Link>
                  
                  <div className="text-sm text-muted-foreground">
                    Não tem uma conta?{' '}
                    <Link
                      href="/cadastro"
                      className="text-primary hover:underline font-medium"
                    >
                      Criar conta grátis
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

// Função para mapear erros de autenticação
function getErrorMessage(error: string): string {
  const errorMessages: Record<string, string> = {
    'CredentialsSignin': 'Email ou senha incorretos',
    'EmailNotVerified': 'Email não verificado. Verifique sua caixa de entrada.',
    'AccountNotLinked': 'Esta conta já está vinculada a outro método de login',
    'SessionRequired': 'Você precisa estar logado para acessar esta página',
    'AccessDenied': 'Acesso negado. Verifique suas permissões.',
    'Verification': 'Token de verificação inválido ou expirado',
    'Default': 'Erro ao fazer login. Tente novamente.'
  }
  
  return errorMessages[error] || errorMessages.Default
}