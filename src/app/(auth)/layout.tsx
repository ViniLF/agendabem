import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | AgendaBem',
    default: 'Entrar | AgendaBem'
  },
  description: 'Faça login ou crie sua conta no AgendaBem - A plataforma completa para gerenciar seus agendamentos',
  keywords: ['agendamento', 'login', 'cadastro', 'profissionais', 'agenda'],
  robots: { index: true, follow: true },
  openGraph: {
    title: 'AgendaBem - Sistema de Agendamentos',
    description: 'A plataforma completa para profissionais gerenciarem seus agendamentos',
    type: 'website',
    locale: 'pt_BR'
  }
}

interface AuthLayoutProps {
  children: React.ReactNode
}

export default async function AuthLayout({ children }: AuthLayoutProps) {
  const session = await getServerSession(authOptions)
  
  // Redirecionar usuários já logados
  if (session?.user) {
    if (!session.user.dataConsent) {
      redirect('/configuracoes/privacidade?redirect=true')
    }
    redirect('/agenda')
  }

  return (
    <div className="min-h-screen">
      {/* Background com gradiente */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900">
        {/* Elementos decorativos */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-blue-200/30 dark:bg-blue-800/30 rounded-full blur-xl animate-pulse" />
        <div className="absolute top-40 right-20 w-32 h-32 bg-indigo-200/20 dark:bg-indigo-800/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-purple-200/25 dark:bg-purple-800/25 rounded-full blur-xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Conteúdo */}
      <div className="relative z-10">
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 z-20 p-6">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4V9a2 2 0 012-2h4a2 2 0 012 2v2m-6 4h8a2 2 0 002-2v-6a2 2 0 00-2-2H8a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                AgendaBem
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-6">
              <a href="#recursos" className="text-gray-600 dark:text-gray-300 hover:text-primary transition-colors">
                Recursos
              </a>
              <a href="#precos" className="text-gray-600 dark:text-gray-300 hover:text-primary transition-colors">
                Preços
              </a>
              <a href="#contato" className="text-gray-600 dark:text-gray-300 hover:text-primary transition-colors">
                Contato
              </a>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="pt-20">
          {children}
        </main>

        {/* Footer */}
        <footer className="relative z-10 mt-auto py-8 px-6">
          <div className="container mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                © 2024 AgendaBem. Todos os direitos reservados.
              </div>
              
              <div className="flex items-center gap-6 text-sm">
                <a href="/privacidade" className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
                  Política de Privacidade
                </a>
                <a href="/termos" className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
                  Termos de Uso
                </a>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-gray-600 dark:text-gray-400">
                    Sistema operacional
                  </span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}