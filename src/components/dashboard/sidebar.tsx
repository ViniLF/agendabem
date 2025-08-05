'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { 
  Calendar, 
  Users, 
  Settings, 
  BarChart3, 
  CreditCard,
  User,
  LogOut,
  Menu,
  X,
  Shield,
  Briefcase,
  Bell,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Home,
  Clock,
  FileText,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navigation = [
  { 
    name: 'Dashboard', 
    href: '/agenda', 
    icon: Home,
    description: 'Visão geral dos agendamentos'
  },
  { 
    name: 'Agenda', 
    href: '/agenda/calendario', 
    icon: Calendar,
    description: 'Visualizar e gerenciar horários',
    badge: 'NEW'
  },
  { 
    name: 'Clientes', 
    href: '/clientes', 
    icon: Users,
    description: 'Cadastro e histórico de clientes'
  },
  { 
    name: 'Serviços', 
    href: '/servicos', 
    icon: Briefcase,
    description: 'Gerenciar serviços oferecidos'
  },
  { 
    name: 'Relatórios', 
    href: '/relatorios', 
    icon: BarChart3,
    description: 'Estatísticas e análises'
  },
]

const secondaryNavigation = [
  { 
    name: 'Notificações', 
    href: '/notificacoes', 
    icon: Bell,
    description: 'Configurar lembretes'
  },
  { 
    name: 'Pagamentos', 
    href: '/pagamentos', 
    icon: CreditCard,
    description: 'Histórico e configurações'
  },
]

const settingsNavigation = [
  { 
    name: 'Perfil', 
    href: '/configuracoes/perfil', 
    icon: User,
    description: 'Dados pessoais e profissionais'
  },
  { 
    name: 'Horários', 
    href: '/configuracoes/horarios', 
    icon: Clock,
    description: 'Configurar disponibilidade'
  },
  { 
    name: 'Privacidade', 
    href: '/configuracoes/privacidade', 
    icon: Shield,
    description: 'Dados e conformidade LGPD'
  },
  { 
    name: 'Sistema', 
    href: '/configuracoes', 
    icon: Settings,
    description: 'Configurações gerais'
  },
]

interface DashboardSidebarProps {
  user: {
    id: string
    name: string
    email: string
    role: string
    planId: string
  }
}

export default function DashboardSidebar({ user }: DashboardSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [settingsExpanded, setSettingsExpanded] = useState(false)
  const pathname = usePathname()

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: '/entrar' })
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  const isActivePath = (href: string) => {
    if (href === '/agenda' && pathname === '/agenda') return true
    if (href !== '/agenda' && pathname.startsWith(href)) return true
    return false
  }

  const getPlanColor = (planId: string) => {
    switch (planId) {
      case 'pro': return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30'
      case 'premium': return 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30'
      default: return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
    }
  }

  const getPlanName = (planId: string) => {
    switch (planId) {
      case 'pro': return 'Pro'
      case 'premium': return 'Premium'
      default: return 'Grátis'
    }
  }

  return (
    <>
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="bg-white dark:bg-gray-800 shadow-lg"
        >
          {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out shadow-xl",
        isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="flex flex-col h-full">
          <div className="flex flex-col p-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-3 rounded-xl">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  AgendaBem
                </h1>
                <div className={cn(
                  "text-xs font-medium px-2 py-1 rounded-full inline-block mt-1",
                  getPlanColor(user.planId)
                )}>
                  Plano {getPlanName(user.planId)}
                </div>
              </div>
            </div>

            {user.planId === 'free' && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Upgrade Disponível
                  </span>
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                  Desbloqueie recursos avançados
                </p>
                <Button size="sm" className="w-full text-xs">
                  Ver Planos
                </Button>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            <div className="space-y-1">
              {navigation.map((item) => {
                const isActive = isActivePath(item.href)
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800",
                      isActive 
                        ? 'bg-primary/10 text-primary border border-primary/20' 
                        : 'text-gray-700 dark:text-gray-300'
                    )}
                  >
                    <item.icon className={cn(
                      "h-5 w-5 transition-colors",
                      isActive ? 'text-primary' : 'text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-200'
                    )} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span>{item.name}</span>
                        {item.badge && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>

            <div className="pt-6">
              <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Ferramentas
              </h3>
              <div className="space-y-1">
                {secondaryNavigation.map((item) => {
                  const isActive = isActivePath(item.href)
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileOpen(false)}
                      className={cn(
                        "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800",
                        isActive 
                          ? 'bg-primary/10 text-primary' 
                          : 'text-gray-700 dark:text-gray-300'
                      )}
                    >
                      <item.icon className={cn(
                        "h-4 w-4 transition-colors",
                        isActive ? 'text-primary' : 'text-gray-500 group-hover:text-gray-700'
                      )} />
                      <div>
                        <span>{item.name}</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {item.description}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>

            <div className="pt-6">
              <button
                onClick={() => setSettingsExpanded(!settingsExpanded)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <span>Configurações</span>
                {settingsExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
              
              {settingsExpanded && (
                <div className="mt-2 space-y-1">
                  {settingsNavigation.map((item) => {
                    const isActive = isActivePath(item.href)
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={cn(
                          "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800",
                          isActive 
                            ? 'bg-primary/10 text-primary' 
                            : 'text-gray-700 dark:text-gray-300'
                        )}
                      >
                        <item.icon className={cn(
                          "h-4 w-4 transition-colors",
                          isActive ? 'text-primary' : 'text-gray-500 group-hover:text-gray-700'
                        )} />
                        <div>
                          <span>{item.name}</span>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {item.description}
                          </p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </nav>

          <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
            <Link
              href="/ajuda"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <HelpCircle className="h-4 w-4 text-gray-500" />
              <span>Central de Ajuda</span>
            </Link>
            
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-gray-700 dark:text-gray-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sair da Conta
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}