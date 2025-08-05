import { Metadata } from 'next'
import { Plus, Calendar, Clock, Users, TrendingUp, AlertCircle, CheckCircle2, XCircle, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export const metadata: Metadata = {
  title: 'Dashboard - Agenda',
  description: 'Visão geral dos seus agendamentos e estatísticas'
}

// Mock data - futuramente virá do banco de dados
const todayAppointments = [
  {
    id: 1,
    clientName: 'Ana Silva',
    service: 'Consulta Inicial',
    time: '09:00',
    duration: 60,
    status: 'confirmed',
    phone: '(11) 99999-1234',
    price: 150.00
  },
  {
    id: 2,
    clientName: 'Carlos Santos',
    service: 'Retorno',
    time: '10:30',
    duration: 30,
    status: 'pending',
    phone: '(11) 99999-5678',
    price: 80.00
  },
  {
    id: 3,
    clientName: 'Maria Costa',
    service: 'Avaliação',
    time: '14:00',
    duration: 45,
    status: 'confirmed',
    phone: '(11) 99999-9012',
    price: 120.00
  },
  {
    id: 4,
    clientName: 'João Oliveira',
    service: 'Primeira consulta',
    time: '16:00',
    duration: 90,
    status: 'pending',
    phone: '(11) 99999-3456',
    price: 200.00
  }
]

const weekStats = {
  totalAppointments: 28,
  confirmedAppointments: 24,
  pendingAppointments: 4,
  cancelledAppointments: 2,
  totalRevenue: 3750.00,
  newClients: 5
}

const upcomingAppointments = [
  { time: '09:00', client: 'Ana Silva', status: 'confirmed' },
  { time: '10:30', client: 'Carlos Santos', status: 'pending' },
  { time: '14:00', client: 'Maria Costa', status: 'confirmed' }
]

function getStatusIcon(status: string) {
  switch (status) {
    case 'confirmed':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-600" />
    case 'cancelled':
      return <XCircle className="h-4 w-4 text-red-600" />
    default:
      return <AlertCircle className="h-4 w-4 text-gray-400" />
  }
}

function getStatusText(status: string) {
  switch (status) {
    case 'confirmed':
      return 'Confirmado'
    case 'pending':
      return 'Pendente'
    case 'cancelled':
      return 'Cancelado'
    default:
      return 'Desconhecido'
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'confirmed':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
    case 'cancelled':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }
}

export default function AgendaPage() {
  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const nextAppointment = upcomingAppointments.find(apt => apt.status === 'confirmed')

  return (
    <div className="space-y-6">
      {/* Header com ações rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Boa tarde! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-400 capitalize">
            {today}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Ver Calendário
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayAppointments.length}</div>
            <p className="text-xs text-muted-foreground">
              {todayAppointments.filter(apt => apt.status === 'confirmed').length} confirmados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximo Atendimento</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nextAppointment?.time || '--:--'}</div>
            <p className="text-xs text-muted-foreground">
              {nextAppointment?.client || 'Nenhum agendamento'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita da Semana</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {weekStats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              +12% em relação à semana anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novos Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weekStats.newClients}</div>
            <p className="text-xs text-muted-foreground">
              Esta semana
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agendamentos de Hoje */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Agendamentos de Hoje</CardTitle>
              <CardDescription>
                {todayAppointments.length} agendamentos para hoje
              </CardDescription>
            </CardHeader>
            <CardContent>
              {todayAppointments.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Nenhum agendamento hoje
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Que tal aproveitar para organizar sua agenda?
                  </p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Agendamento
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {todayAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[60px]">
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">
                            {appointment.time}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {appointment.duration}min
                          </p>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {appointment.clientName}
                            </h4>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(appointment.status)}`}>
                              {getStatusText(appointment.status)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {appointment.service} • R$ {appointment.price.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {appointment.phone}
                          </p>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Confirmar</DropdownMenuItem>
                          <DropdownMenuItem>Editar</DropdownMenuItem>
                          <DropdownMenuItem>Reagendar</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">Cancelar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar com resumos */}
        <div className="space-y-6">
          {/* Resumo da Semana */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo da Semana</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total de agendamentos</span>
                <span className="font-semibold">{weekStats.totalAppointments}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Confirmados</span>
                <span className="font-semibold text-green-600">{weekStats.confirmedAppointments}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Pendentes</span>
                <span className="font-semibold text-yellow-600">{weekStats.pendingAppointments}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Cancelados</span>
                <span className="font-semibold text-red-600">{weekStats.cancelledAppointments}</span>
              </div>
            </CardContent>
          </Card>

          {/* Ações Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="h-4 w-4 mr-3" />
                Novo Agendamento
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-3" />
                Cadastrar Cliente
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-3" />
                Ver Calendário
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Clock className="h-4 w-4 mr-3" />
                Configurar Horários
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}