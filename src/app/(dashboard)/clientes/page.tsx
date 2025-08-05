import { Metadata } from 'next'
import { Plus, Search, Filter, MoreHorizontal, Phone, Mail, Calendar, User, Eye, Edit, Trash2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export const metadata: Metadata = {
  title: 'Clientes',
  description: 'Gerencie seus clientes e histórico de atendimentos'
}

// Mock data - futuramente virá do banco
const clients = [
  {
    id: 1,
    name: 'Ana Silva',
    email: 'ana.silva@email.com',
    phone: '(11) 99999-1234',
    lastAppointment: '2024-08-01',
    totalAppointments: 8,
    totalSpent: 1200.00,
    status: 'active',
    createdAt: '2024-01-15'
  },
  {
    id: 2,
    name: 'Carlos Santos',
    email: 'carlos.santos@email.com',
    phone: '(11) 99999-5678',
    lastAppointment: '2024-07-28',
    totalAppointments: 3,
    totalSpent: 450.00,
    status: 'active',
    createdAt: '2024-06-10'
  },
  {
    id: 3,
    name: 'Maria Costa',
    email: 'maria.costa@email.com',
    phone: '(11) 99999-9012',
    lastAppointment: '2024-07-15',
    totalAppointments: 12,
    totalSpent: 1800.00,
    status: 'active',
    createdAt: '2023-11-20'
  },
  {
    id: 4,
    name: 'João Oliveira',
    email: null,
    phone: '(11) 99999-3456',
    lastAppointment: '2024-06-20',
    totalAppointments: 1,
    totalSpent: 200.00,
    status: 'inactive',
    createdAt: '2024-06-15'
  },
  {
    id: 5,
    name: 'Fernanda Lima',
    email: 'fernanda.lima@email.com',
    phone: '(11) 99999-7890',
    lastAppointment: '2024-08-03',
    totalAppointments: 5,
    totalSpent: 750.00,
    status: 'active',
    createdAt: '2024-03-05'
  }
]

const stats = {
  totalClients: clients.length,
  activeClients: clients.filter(c => c.status === 'active').length,
  newThisMonth: clients.filter(c => new Date(c.createdAt) > new Date('2024-08-01')).length,
  avgAppointments: Math.round(clients.reduce((acc, c) => acc + c.totalAppointments, 0) / clients.length)
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    case 'inactive':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }
}

function getStatusText(status: string) {
  switch (status) {
    case 'active':
      return 'Ativo'
    case 'inactive':
      return 'Inativo'
    default:
      return 'Desconhecido'
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR')
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function ClientesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Clientes
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gerencie seus clientes e histórico de atendimentos
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeClients}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.activeClients / stats.totalClients) * 100)}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novos este Mês</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newThisMonth}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média de Consultas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgAppointments}</div>
            <p className="text-xs text-muted-foreground">
              Por cliente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Lista de Clientes</CardTitle>
            <div className="flex gap-2">
              <div className="relative flex-1 sm:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome, email ou telefone..."
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Nenhum cliente cadastrado
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Comece adicionando seu primeiro cliente
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Cliente
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-white">
                        {getInitials(client.name)}
                      </span>
                    </div>

                    {/* Client Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">
                          {client.name}
                        </h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(client.status)}`}>
                          {getStatusText(client.status)}
                        </span>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-gray-600 dark:text-gray-400">
                        {client.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{client.email}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span>{client.phone}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-gray-500 dark:text-gray-500 mt-1">
                        <span>Última consulta: {formatDate(client.lastAppointment)}</span>
                        <span>{client.totalAppointments} consultas</span>
                        <span>R$ {client.totalSpent.toFixed(2)} total</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Calendar className="h-4 w-4 mr-1" />
                        Agendar
                      </Button>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Calendar className="h-4 w-4 mr-2" />
                          Novo Agendamento
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}