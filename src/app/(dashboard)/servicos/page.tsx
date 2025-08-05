'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, MoreHorizontal, Clock, DollarSign, Briefcase, Edit, Trash2, Eye, ToggleLeft, ToggleRight, Filter, Loader2, AlertCircle } from 'lucide-react'
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
import ServiceModal from '@/components/dashboard/service-modal'
import { useConfirmDialog, confirmDeleteService, confirmToggleService } from '@/components/dashboard/confirm-dialog'
import { useServices } from '@/hooks/use-services'
import { toast } from 'sonner'

interface Service {
  id: string
  name: string
  description?: string
  duration: number
  price: number
  color?: string
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  appointmentsCount: number
  lastUsed: string
}

export default function ServicosPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedService, setSelectedService] = useState<Service | null>(null)

  const { showDialog, ConfirmDialog } = useConfirmDialog()

  const { 
    services, 
    stats, 
    loading, 
    error, 
    searchServices, 
    deleteService,
    toggleServiceStatus
  } = useServices()

  useEffect(() => {
    searchServices(searchTerm, statusFilter)
  }, [searchTerm, statusFilter, searchServices])

  const handleSearch = (value: string) => {
    setSearchTerm(value)
  }

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status)
  }

  const handleCreateService = () => {
    setSelectedService(null)
    setModalMode('create')
    setModalOpen(true)
  }

  const handleViewService = (service: Service) => {
    setSelectedService(service)
    setModalMode('view')
    setModalOpen(true)
  }

  const handleEditService = (service: Service) => {
    setSelectedService(service)
    setModalMode('edit')
    setModalOpen(true)
  }

  const handleToggleService = async (service: Service) => {
    const newStatus = !service.isActive
    
    confirmToggleService(
      showDialog,
      service.name,
      service.isActive,
      async () => {
        const success = await toggleServiceStatus(service.id, newStatus)
        if (success) {
          toast.success(`Serviço ${newStatus ? 'ativado' : 'desativado'} com sucesso!`)
        }
      }
    )
  }

  const handleDeleteService = async (service: Service) => {
    confirmDeleteService(
      showDialog,
      service.name,
      async () => {
        await deleteService(service.id)
      },
      service.appointmentsCount
    )
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}min`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Erro ao carregar serviços
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mt-2">{error}</p>
            <Button 
              onClick={() => searchServices(searchTerm, statusFilter)} 
              className="mt-4"
            >
              Tentar Novamente
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Serviços
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure os serviços oferecidos em sua agenda
          </p>
        </div>
        <Button onClick={handleCreateService} disabled={loading}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Serviço
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Serviços</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Serviços Ativos</CardTitle>
              <ToggleRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% do total
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
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Lista de Serviços</CardTitle>
            <div className="flex gap-2">
              <div className="relative flex-1 sm:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar serviços..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  disabled={loading}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" disabled={loading}>
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleStatusFilter('all')}>
                    Todos os serviços
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleStatusFilter('active')}>
                    Apenas ativos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusFilter('inactive')}>
                    Apenas inativos
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Carregando serviços...</span>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Nenhum serviço encontrado' 
                  : 'Nenhum serviço cadastrado'
                }
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm || statusFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Adicione serviços para organizar melhor sua agenda'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Button onClick={handleCreateService}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Serviço
                </Button>
              )}
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
                        {service.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {service.description}
                          </p>
                        )}
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewService(service)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditService(service)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleService(service)}>
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
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDeleteService(service)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-3">
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
                            {service.price > 0 ? `R$ ${service.price.toFixed(2)}` : 'Variável'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
                        <span>{service.appointmentsCount} agendamentos</span>
                        <span>Usado em {formatDate(service.lastUsed)}</span>
                      </div>
                      
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

      <ServiceModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        service={selectedService}
        mode={modalMode}
      />

      <ConfirmDialog />
    </div>
  )
}