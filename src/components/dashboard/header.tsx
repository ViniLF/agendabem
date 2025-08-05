'use client'

import { useState } from 'react'
import { Bell, Search, Sun, Moon, Plus, Filter } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface DashboardHeaderProps {
  user: {
    id: string
    name: string
    email: string
  }
  title?: string
  showSearch?: boolean
  showActions?: boolean
}

export default function DashboardHeader({ 
  user, 
  title = "Dashboard", 
  showSearch = true,
  showActions = true 
}: DashboardHeaderProps) {
  const { theme, setTheme } = useTheme()
  const [searchValue, setSearchValue] = useState('')
  
  // Mock notifications - futuramente virá do banco
  const [notifications] = useState([
    {
      id: 1,
      title: 'Novo agendamento',
      message: 'João Silva agendou para amanhã às 14h',
      time: '5 min atrás',
      unread: true,
      type: 'appointment'
    },
    {
      id: 2,
      title: 'Lembrete',
      message: 'Consulta com Maria em 30 minutos',
      time: '25 min atrás',
      unread: true,
      type: 'reminder'
    },
    {
      id: 3,
      title: 'Pagamento recebido',
      message: 'R$ 150,00 de Pedro Costa',
      time: '2h atrás',
      unread: false,
      type: 'payment'
    }
  ])

  const unreadCount = notifications.filter(n => n.unread).length

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Implementar busca
    console.log('Buscar:', searchValue)
  }

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 lg:ml-72">
      <div className="flex items-center justify-between">
        {/* Left side - Title and Search */}
        <div className="flex items-center gap-6 flex-1">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {title}
            </h1>
          </div>

          {showSearch && (
            <form onSubmit={handleSearch} className="hidden md:block max-w-md flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar clientes, agendamentos..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="pl-10 bg-gray-50 dark:bg-gray-800 border-0 focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </form>
          )}
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-3">
          {showActions && (
            <>
              {/* Quick Actions */}
              <div className="hidden lg:flex items-center gap-2">
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Agendamento
                </Button>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notificações</span>
                {unreadCount > 0 && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                    {unreadCount} novas
                  </span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma notificação</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <DropdownMenuItem key={notification.id} className="flex flex-col items-start p-4 cursor-pointer">
                      <div className="flex items-start justify-between w-full">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium">{notification.title}</h4>
                            {notification.unread && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {notification.time}
                          </p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
              
              {notifications.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-center justify-center">
                    <span className="text-sm text-primary hover:underline cursor-pointer">
                      Ver todas as notificações
                    </span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 pl-3 pr-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Ver perfil
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <a href="/configuracoes/perfil">Editar Perfil</a>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <a href="/configuracoes">Configurações</a>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <a href="/configuracoes/privacidade">Privacidade</a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile search */}
      {showSearch && (
        <div className="md:hidden mt-4">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-10 bg-gray-50 dark:bg-gray-800 border-0"
              />
            </div>
          </form>
        </div>
      )}
    </header>
  )
}