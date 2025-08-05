import { Metadata } from 'next'
import { Plus, Calendar, Clock, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Agenda - Dashboard',
  description: 'Visualize e gerencie seus agendamentos'
}

// Mock data - futuramente virá do banco de dados
const todayAppointments = [
  {
    id: 1,
    clientName: 'João Silva',
    service: 'Consulta',
    time: '09:00',
    duration: 60,
    status: 'confirmed'
  },
  {
    id: 2,
    clientName: 'Maria Santos',
    service: 'Retorno',
    time: '14:30',
    duration: 30,
    status: 'pending'
  },
  {
    id: 3,
    clientName: 'Pedro Costa',
    service: 'Primeira consulta',
    time: '16:00',
    duration: 90,
    status: 'confirmed'
  }
]

const stats = [
  {
    title: 'Agendamentos Hoje',
    value: todayAppointments.length,
    icon: Calendar,
    color: 'bg-blue-500'
  },
  {
    title: 'Próximo Atendimento',
    value: '09:00',
    icon: Clock,
    color: 'bg-green-500'
  },
  {
    title: 'Total de Clientes',
    value: '24',
    icon: Users,
    color: 'bg-purple-500'
  }
]

function getStatusColor(status: string) {
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

export default function AgendaPage() {
  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Agenda
          </h1>
          <p className="text-gray-600 dark:text-gray-400 capitalize">
            {today}
          </p>
        </div>
        <Button className="sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Novo Agendamento
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Today's Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Agendamentos de Hoje</CardTitle>
            <CardDescription>
              {todayAppointments.length} agendamentos para hoje
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {todayAppointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Nenhum agendamento para hoje
                </p>
                <Button variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Agendamento
                </Button>
              </div>
            ) : (
              todayAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {appointment.time}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {appointment.duration}min
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {appointment.clientName}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {appointment.service}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                    {getStatusText(appointment.status)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Funcionalidades mais utilizadas
            </CardDescription>
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
              Ver Calendário Completo
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Clock className="h-4 w-4 mr-3" />
              Configurar Horários
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Atividade Recente</CardTitle>
          <CardDescription>
            Últimas ações realizadas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-gray-600 dark:text-gray-400">João Silva agendou para amanhã às 14h</span>
              <span className="text-gray-500 dark:text-gray-500 ml-auto">5 min atrás</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-gray-600 dark:text-gray-400">Maria Santos cancelou agendamento</span>
              <span className="text-gray-500 dark:text-gray-500 ml-auto">1h atrás</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="w-2 h-2 bg-purple-500 rounded-full" />
              <span className="text-gray-600 dark:text-gray-400">Novo cliente cadastrado: Pedro Costa</span>
              <span className="text-gray-500 dark:text-gray-500 ml-auto">2h atrás</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}