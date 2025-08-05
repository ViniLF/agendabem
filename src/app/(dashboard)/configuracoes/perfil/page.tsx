import { Metadata } from 'next'
import { Save, User, Mail, Phone, MapPin, Briefcase, Clock, Calendar, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
// Removido imports incorretos de Select

export const metadata: Metadata = {
  title: 'Perfil - Configurações',
  description: 'Configure seus dados pessoais e profissionais'
}

// Mock data - futuramente virá da sessão/banco
const profile = {
  name: 'Dr. João Silva',
  email: 'joao.silva@email.com',
  phone: '(11) 99999-1234',
  businessName: 'Clínica São João',
  profession: 'Médico',
  speciality: 'Cardiologia',
  serviceType: 'MEDICAL',
  address: 'Rua das Flores, 123',
  city: 'São Paulo',
  state: 'SP',
  zipCode: '01234-567',
  description: 'Médico cardiologista com mais de 10 anos de experiência...',
  website: 'https://clinicasaojoao.com.br',
  workingDays: [1, 2, 3, 4, 5], // Segunda a sexta
  workingHours: {
    start: '08:00',
    end: '18:00'
  },
  timeSlotDuration: 60,
  bookingAdvance: 24
}

const serviceTypes = [
  { value: 'MEDICAL', label: 'Médico' },
  { value: 'DENTAL', label: 'Dentista' },
  { value: 'BEAUTY', label: 'Beleza/Estética' },
  { value: 'THERAPY', label: 'Terapia' },
  { value: 'WELLNESS', label: 'Bem-estar' },
  { value: 'OTHER', label: 'Outros' }
]

const weekDays = [
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' }
]

export default function PerfilPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Configurações do Perfil
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gerencie seus dados pessoais e configurações da agenda
          </p>
        </div>
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Salvar Alterações
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dados Pessoais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Dados Pessoais
              </CardTitle>
              <CardDescription>
                Informações básicas do seu perfil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    defaultValue={profile.name}
                    placeholder="Seu nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue={profile.email}
                    placeholder="seu@email.com"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  defaultValue={profile.phone}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </CardContent>
          </Card>

          {/* Dados Profissionais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Dados Profissionais
              </CardTitle>
              <CardDescription>
                Informações sobre sua atividade profissional
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Nome do Negócio</Label>
                  <Input
                    id="businessName"
                    defaultValue={profile.businessName}
                    placeholder="Nome da clínica/consultório"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profession">Profissão</Label>
                  <Input
                    id="profession"
                    defaultValue={profile.profession}
                    placeholder="Ex: Médico, Dentista, Psicólogo"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="speciality">Especialidade</Label>
                  <Input
                    id="speciality"
                    defaultValue={profile.speciality}
                    placeholder="Ex: Cardiologia, Ortodontia"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serviceType">Tipo de Atendimento</Label>
                  <select 
                    id="serviceType"
                    defaultValue={profile.serviceType}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-foreground file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {serviceTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <textarea
                  id="description"
                  defaultValue={profile.description}
                  rows={3}
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Descreva sua experiência e especialidades..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website (opcional)</Label>
                <Input
                  id="website"
                  type="url"
                  defaultValue={profile.website}
                  placeholder="https://seusite.com.br"
                />
              </div>
            </CardContent>
          </Card>

          {/* Endereço */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Endereço
              </CardTitle>
              <CardDescription>
                Localização do seu consultório/clínica
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  defaultValue={profile.address}
                  placeholder="Rua, número, complemento"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    defaultValue={profile.city}
                    placeholder="Cidade"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    defaultValue={profile.state}
                    placeholder="UF"
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">CEP</Label>
                  <Input
                    id="zipCode"
                    defaultValue={profile.zipCode}
                    placeholder="00000-000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Horários de Funcionamento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Horários
              </CardTitle>
              <CardDescription>
                Configure seus horários de atendimento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Dias de Funcionamento</Label>
                <div className="space-y-2">
                  {weekDays.map((day) => (
                    <label key={day.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        defaultChecked={profile.workingDays.includes(day.value)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Início</Label>
                  <Input
                    id="startTime"
                    type="time"
                    defaultValue={profile.workingHours.start}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">Fim</Label>
                  <Input
                    id="endTime"
                    type="time"
                    defaultValue={profile.workingHours.end}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slotDuration">Duração dos Slots</Label>
                <select 
                  id="slotDuration"
                  defaultValue={profile.timeSlotDuration}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value={15}>15 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={45}>45 minutos</option>
                  <option value={60}>1 hora</option>
                  <option value={90}>1h 30min</option>
                  <option value={120}>2 horas</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bookingAdvance">Antecedência Mínima</Label>
                <select 
                  id="bookingAdvance"
                  defaultValue={profile.bookingAdvance}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value={1}>1 hora</option>
                  <option value={2}>2 horas</option>
                  <option value={4}>4 horas</option>
                  <option value={12}>12 horas</option>
                  <option value={24}>24 horas</option>
                  <option value={48}>48 horas</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Segurança */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                Alterar Senha
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Configurar 2FA
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Logs de Acesso
              </Button>
            </CardContent>
          </Card>

          {/* Ações */}
          <Card className="bg-gray-50 dark:bg-gray-800/50">
            <CardContent className="pt-6 space-y-3">
              <Button className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Salvar Alterações
              </Button>
              <Button variant="outline" className="w-full">
                Cancelar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}