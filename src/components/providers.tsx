'use client'

import React, { ReactNode, useEffect, useState, createContext, useContext } from 'react'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <SessionProvider
      refetchInterval={5 * 60}
      refetchOnWindowFocus={true}
      refetchWhenOffline={false}
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem={true}
        disableTransitionOnChange={false}
        storageKey="agendabem-theme"
      >
        {/* Toast Provider */}
        <Toaster
          position="top-right"
          richColors={true}
          closeButton={true}
          duration={4000}
          expand={false}
          visibleToasts={3}
          toastOptions={{
            style: {
              background: 'var(--background)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
            },
            className: 'group toast',
            descriptionClassName: 'group-[.toast]:text-muted-foreground',
            actionButtonStyle: {
              background: 'var(--primary)',
              color: 'var(--primary-foreground)',
            },
            cancelButtonStyle: {
              background: 'var(--muted)',
              color: 'var(--muted-foreground)',
            },
          }}
        />

        {/* Error Boundary Wrapper */}
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </ThemeProvider>
    </SessionProvider>
  )
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends React.Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Error Boundary capturou um erro:', error, errorInfo)

    if (process.env.NODE_ENV === 'production') {
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md mx-auto text-center p-6">
            <div className="bg-destructive/10 p-4 rounded-lg mb-4">
              <svg
                className="h-8 w-8 text-destructive mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <h2 className="text-lg font-semibold text-destructive mb-2">
                Ops! Algo deu errado
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Ocorreu um erro inesperado. Nossa equipe foi notificada.
              </p>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: undefined })
                  window.location.reload()
                }}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left bg-muted p-4 rounded-lg text-xs">
                <summary className="cursor-pointer font-medium mb-2">
                  Detalhes do erro (dev)
                </summary>
                <pre className="whitespace-pre-wrap text-red-600 dark:text-red-400">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

interface AppContextType {
  version: string
  environment: 'development' | 'production' | 'test'
  features: {
    maintenanceMode: boolean
    registrationEnabled: boolean
    googleLoginEnabled: boolean
    twoFactorEnabled: boolean
  }
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const appConfig: AppContextType = {
    version: '1.0.0',
    environment: (process.env.NODE_ENV as any) || 'development',
    features: {
      maintenanceMode: process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true',
      registrationEnabled: process.env.NEXT_PUBLIC_REGISTRATION_ENABLED !== 'false',
      googleLoginEnabled: !!process.env.GOOGLE_CLIENT_ID,
      twoFactorEnabled: process.env.NEXT_PUBLIC_2FA_ENABLED === 'true',
    }
  }

  return (
    <AppContext.Provider value={appConfig}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp deve ser usado dentro de AppProvider')
  }
  return context
}

export function RootProviders({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <Providers>
        {children}
      </Providers>
    </AppProvider>
  )
}