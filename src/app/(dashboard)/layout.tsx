import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Metadata } from 'next'
import DashboardSidebar from '@/components/dashboard/sidebar'
import DashboardHeader from '@/components/dashboard/header'

export const metadata: Metadata = {
  title: {
    template: '%s | Dashboard - AgendaBem',
    default: 'Dashboard - AgendaBem'
  },
  description: 'Gerencie seus agendamentos, clientes e configurações',
  robots: { index: false, follow: false }
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await getServerSession(authOptions)
  
  // Verificar autenticação
  if (!session?.user) {
    redirect('/entrar')
  }
  
  // Verificar consentimento LGPD
  if (!session.user.dataConsent) {
    redirect('/configuracoes/privacidade?redirect=true')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <DashboardSidebar user={session.user} />
      
      <div className="lg:ml-72">
        {/* Header */}
        <DashboardHeader user={session.user} />
        
        {/* Main Content */}
        <main className="px-6 py-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}