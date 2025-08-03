import { NextAuthOptions, DefaultSession } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaClient } from '@prisma/client'
import { verifyPassword } from './crypto'
import { userLoginSchema } from './validation'

const prisma = new PrismaClient()

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
    updateAge: 60 * 60,
  },
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Email e Senha',
      credentials: {
        email: { 
          label: 'Email', 
          type: 'email', 
          placeholder: 'seu@email.com' 
        },
        password: { 
          label: 'Senha', 
          type: 'password' 
        }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email e senha são obrigatórios')
        }

        const validation = userLoginSchema.safeParse(credentials)
        if (!validation.success) {
          throw new Error('Dados inválidos')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || user.deletedAt) {
          throw new Error('Usuário não encontrado')
        }

        const isValidPassword = await verifyPassword(
          credentials.password, 
          user.passwordHash
        )

        if (!isValidPassword) {
          throw new Error('Senha incorreta')
        }

        if (!user.dataConsent) {
          throw new Error('Aceite os termos de privacidade para continuar')
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { 
            lastLogin: new Date()
          }
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          twoFactorEnabled: user.twoFactorEnabled,
          slug: null,
          planId: 'free',
          subscriptionStatus: 'TRIALING'
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! }
        })

        if (existingUser && !existingUser.deletedAt) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { 
              lastLogin: new Date(),
              emailVerified: new Date()
            }
          })
          return true
        }

        if (!existingUser) {
          await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name || '',
              emailVerified: new Date(),
              passwordHash: '',
              dataConsent: false,
              lastLogin: new Date()
            }
          })
        }
      }
      
      return true
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role
        token.twoFactorEnabled = user.twoFactorEnabled
        token.slug = user.slug
        token.planId = user.planId
        token.subscriptionStatus = user.subscriptionStatus
      }

      if (trigger === 'update' && session) {
        token = { ...token, ...session }
      }

      const dbUser = await prisma.user.findUnique({
        where: { email: token.email! }
      })

      if (dbUser) {
        token.role = dbUser.role
        token.twoFactorEnabled = dbUser.twoFactorEnabled
        token.slug = null
        token.dataConsent = dbUser.dataConsent
        token.planId = 'free'
        token.subscriptionStatus = 'TRIALING'
        token.maxAppointments = 50
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.twoFactorEnabled = token.twoFactorEnabled as boolean
        session.user.slug = token.slug as string | null
        session.user.dataConsent = token.dataConsent as boolean
        session.user.planId = token.planId as string
        session.user.subscriptionStatus = token.subscriptionStatus as string
        session.user.maxAppointments = token.maxAppointments as number | null
      }
      return session
    }
  },
  pages: {
    signIn: '/entrar',
    error: '/entrar',
    verifyRequest: '/verificar',
  },
  events: {
    async signIn({ user }) {
      if (user.email) {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'LOGIN',
            resource: 'auth',
            details: {
              provider: 'credentials',
              timestamp: new Date()
            },
            ipAddress: 'unknown',
            userAgent: 'unknown'
          }
        })
      }
    },
    async signOut({ token }) {
      if (token?.sub) {
        await prisma.auditLog.create({
          data: {
            userId: token.sub,
            action: 'LOGOUT',
            resource: 'auth',
            ipAddress: 'unknown',
            userAgent: 'unknown'
          }
        })
      }
    }
  },
  debug: process.env.NODE_ENV === 'development',
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      twoFactorEnabled: boolean
      slug: string | null
      dataConsent: boolean
      planId: string
      subscriptionStatus: string
      maxAppointments: number | null
    } & DefaultSession['user']
  }

  interface User {
    role: string
    twoFactorEnabled: boolean
    slug: string | null
    planId: string
    subscriptionStatus: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    twoFactorEnabled: boolean
    slug: string | null
    dataConsent: boolean
    planId: string
    subscriptionStatus: string
    maxAppointments: number | null
  }
}