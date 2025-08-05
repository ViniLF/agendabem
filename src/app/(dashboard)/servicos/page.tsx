import { Metadata } from 'next'
import { Plus, Search, MoreHorizontal, Clock, DollarSign, Briefcase, Edit, Trash2, Eye, ToggleLeft, ToggleRight } from 'lucide-react'
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
  title: 'Serviços',
  description: 'Gerencie os serviços oferecidos em sua agenda'
}

// Mock data - futuramente virá do banco
const services = [
  {
    id: 1,
    name: 'Consulta Inicial',
    description: 'Primeira consulta com avaliação completa do paciente',
    duration: 60,
    price: 150.00,
    color: '#3B82F6',
    isActive: true,
    appointmentsCount: 24,
    lastUsed: '2024-08-03'
  },
  {
    id: 2,
    name: 'Consulta de Retorno',
    description: 'Consulta de acompanhamento e reavaliação',
    duration: 30,
    price: 80.00,
    color: '#10B981',
    isActive: true,
    appointmentsCount: 45,
    lastUsed: '2024-08-02'
  },
  {
    id: 3,
    name: 'Avaliação Especializada',
    description: 'Avaliação detalhada com exames específicos',
    duration: 90,
    price: 250.00,
    color: '#8B5CF6',
    isActive: true,
    appointmentsCount: 12,
    lastUsed: '2024-07-30'
  },
  {
    id: 4,
    name: 'Procedimento Rápido',
    description: 'Procedimentos de menor complexidade',
    duration: 15,
    price: 50.00,
    color: '#F59E0B',
    isActive: true,
    appointmentsCount: 8,
    lastUsed: '2024-07-28'
  },
  {
    id: 5,
    name: 'Consulta Online',
    description: 'Atendimento remoto via videochamada',
    duration: 45,
    price: 100.00,
    color: '#EF4444',
    isActive: false,
    appointmentsCount: 3,
    lastUsed: '2024-06-15'
  }
]

const stats = {
  totalServices: services.length,
  activeServices: services.filter(s => s.isActive).length,
  avgDuration: Math.round(services.reduce((acc, s) => acc + s.duration, 0) / services.length),
  avgPrice: services.reduce((acc, s) => acc + s.price, 0) / services.length
}

function formatDuration(minutes: number) {
  if (minutes < 60) {
    return `${minutes}min`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR')
}

export default function ServicosPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Serviços
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure os serviços oferecidos em sua agenda
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Serviço
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Serviços</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalServices}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Serviços Ativos</CardTitle>
            <ToggleRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeServices}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.activeServices / stats.totalServices) * 100)}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duração Média</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(stats.avgDuration)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Preço Médio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats.avgPrice.toFixed(0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Lista de Serviços</CardTitle>
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar serviços..."
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Nenhum serviço cadastrado
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Adicione serviços para organizar melhor sua agenda
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Serviço
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service) => (
                <Card
                  key={service.id}
                  className={`relative transition-all duration-200 hover:shadow-lg ${
                    !service.isActive ? 'opacity-60' : ''
                  }`}
                >
                  {/* Color indicator */}
                  <div
                    className="absolute top-0 left-0 w-1 h-full rounded-l-lg"
                    style={{ backgroundColor: service.color }}
                  />
                  
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-base">{service.name}</CardTitle>
                          {service.isActive ? (
                            <ToggleRight className="h-4 w-4 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {service.description}
                        </p>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
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
                            {service.isActive ? (
                              <>
                                <ToggleLeft className="h-4 w-4 mr-2" />
                                Desativar
                              </>
                            ) : (
                              <>
                                <ToggleRight className="h-4 w-4 mr-2" />
                                Ativar
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {/* Price and Duration */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600 dark:text-gray-400">
                            {formatDuration(service.duration)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-gray-500" />
                          <span className="font-semibold text-gray-900 dark:text-white">
                            R$ {service.price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Usage Stats */}
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
                        <span>{service.appointmentsCount} agendamentos</span>
                        <span>Usado em {formatDate(service.lastUsed)}</span>
                      </div>
                      
                      {/* Usage Bar */}
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{
                            backgroundColor: service.color,
                            width: `${Math.min((service.appointmentsCount / 50) * 100, 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center flex-shrink-0">
              <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Dicas para Organizar seus Serviços
              </h3>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Use cores diferentes para categorizar tipos de atendimento</li>
                <li>• Defina durações realistas incluindo tempo de preparação</li>
                <li>• Mantenha descrições claras para que clientes entendam o serviço</li>
                <li>• Desative serviços não oferecidos temporariamente ao invés de excluir</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}