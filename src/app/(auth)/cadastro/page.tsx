'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Calendar, Shield, Zap, Check, X } from 'lucide-react'
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
import { userRegistrationSchema, type UserRegistration } from '@/lib/validation'

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number
    feedback: string[]
    isStrong: boolean
  }>({ score: 0, feedback: [], isStrong: false })
  
  const router = useRouter()

  const form = useForm<UserRegistration>({
    resolver: zodResolver(userRegistrationSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      dataConsent: false
    }
  })

  const watchPassword = form.watch('password')

  // Verificar força da senha em tempo real
  useEffect(() => {
    if (watchPassword) {
      const strength = checkPasswordStrength(watchPassword)
      setPasswordStrength(strength)
    } else {
      setPasswordStrength({ score: 0, feedback: [], isStrong: false })
    }
  }, [watchPassword])

  const onSubmit = async (data: UserRegistration) => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.message || 'Erro ao criar conta')
        return
      }

      toast.success('Conta criada com sucesso!')
      toast.info('Verifique seu email para ativar a conta')
      
      // Redirecionar para login
      router.push('/entrar?message=conta-criada')
      
    } catch (error) {
      console.error('Erro no cadastro:', error)
      toast.error('Erro interno. Tente novamente em alguns minutos.')
    } finally {
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
                  Comece gratuitamente hoje
                </h2>
                
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
                  Junte-se a milhares de profissionais que já simplificaram 
                  seus agendamentos com nossa plataforma.
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
                      Dados protegidos
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Criptografia de ponta e conformidade LGPD
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                    <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Configuração rápida
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Comece a receber agendamentos em minutos
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Seção de Cadastro - Lado Direito */}
          <div className="flex-1 flex items-center justify-center p-8">
            <Card className="w-full max-w-md">
              <CardHeader className="space-y-2">
                <CardTitle className="text-2xl font-bold text-center">
                  Criar conta grátis
                </CardTitle>
                <CardDescription className="text-center">
                  Preencha os dados abaixo para começar
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    
                    {/* Nome */}
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome completo</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Seu nome completo"
                              autoComplete="name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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

                    {/* Telefone */}
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone (opcional)</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="(11) 99999-9999"
                              autoComplete="tel"
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
                                autoComplete="new-password"
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
                          
                          {/* Indicador de força da senha */}
                          {watchPassword && (
                            <div className="space-y-2">
                              <div className="flex gap-1">
                                {[...Array(4)].map((_, i) => (
                                  <div
                                    key={i}
                                    className={`h-1 w-full rounded ${
                                      i < passwordStrength.score / 2
                                        ? passwordStrength.score < 4
                                          ? 'bg-yellow-500'
                                          : passwordStrength.score < 6
                                          ? 'bg-orange-500'
                                          : 'bg-green-500'
                                        : 'bg-gray-200 dark:bg-gray-700'
                                    }`}
                                  />
                                ))}
                              </div>
                              <div className="text-xs space-y-1">
                                {passwordStrength.feedback.map((feedback, i) => (
                                  <div key={i} className="flex items-center gap-1 text-muted-foreground">
                                    <X className="h-3 w-3 text-red-500" />
                                    <span>{feedback}</span>
                                  </div>
                                ))}
                                {passwordStrength.isStrong && (
                                  <div className="flex items-center gap-1 text-green-600">
                                    <Check className="h-3 w-3" />
                                    <span>Senha forte!</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Confirmar Senha */}
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmar senha</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                autoComplete="new-password"
                                {...field}
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                              >
                                {showConfirmPassword ? (
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

                    {/* Checkbox LGPD */}
                    <FormField
                      control={form.control}
                      name="dataConsent"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="w-4 h-4 text-primary bg-background border-gray-300 rounded focus:ring-primary focus:ring-2"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <Label className="text-sm">
                              Aceito os{' '}
                              <Link href="/termos" className="text-primary hover:underline">
                                termos de uso
                              </Link>
                              {' '}e{' '}
                              <Link href="/privacidade" className="text-primary hover:underline">
                                política de privacidade
                              </Link>
                            </Label>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />

                    {/* Botão de Cadastro */}
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading || !passwordStrength.isStrong}
                    >
                      {isLoading ? 'Criando conta...' : 'Criar conta grátis'}
                    </Button>
                  </form>
                </Form>

                {/* Links Adicionais */}
                <div className="text-center space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Já tem uma conta?{' '}
                    <Link
                      href="/entrar"
                      className="text-primary hover:underline font-medium"
                    >
                      Fazer login
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

// Função para verificar força da senha
function checkPasswordStrength(password: string): {
  score: number
  feedback: string[]
  isStrong: boolean
} {
  const feedback: string[] = []
  let score = 0
  
  if (password.length >= 8) score += 1
  else feedback.push('Deve ter pelo menos 8 caracteres')
  
  if (password.length >= 12) score += 1
  
  if (/[a-z]/.test(password)) score += 1
  else feedback.push('Deve conter pelo menos uma letra minúscula')
  
  if (/[A-Z]/.test(password)) score += 1
  else feedback.push('Deve conter pelo menos uma letra maiúscula')
  
  if (/[0-9]/.test(password)) score += 1
  else feedback.push('Deve conter pelo menos um número')
  
  if (/[^a-zA-Z0-9]/.test(password)) score += 1
  else feedback.push('Deve conter pelo menos um símbolo')
  
  if (!/(.)\1{2,}/.test(password)) score += 1
  else feedback.push('Não deve ter caracteres repetidos consecutivos')
  
  const commonPasswords = ['123456', 'password', 'admin', 'qwerty']
  if (!commonPasswords.includes(password.toLowerCase())) score += 1
  else feedback.push('Não use senhas comuns')
  
  return {
    score,
    feedback,
    isStrong: score >= 6
  }
}