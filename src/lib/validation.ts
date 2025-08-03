import { z } from 'zod'

const phoneRegex = /^(\+55\s?)?(\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}$/
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

export const userRegistrationSchema = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo')
    .trim(),
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email muito longo')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(passwordRegex, 'Senha deve conter: maiúscula, minúscula, número e símbolo'),
  confirmPassword: z.string(),
  phone: z.string()
    .regex(phoneRegex, 'Telefone inválido')
    .optional(),
  dataConsent: z.boolean()
    .refine(val => val === true, 'Você deve aceitar os termos de privacidade')
}).refine(data => data.password === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword']
})

export const userLoginSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .trim()
    .toLowerCase(),
  password: z.string()
    .min(1, 'Senha é obrigatória')
})

export const profileSchema = z.object({
  businessName: z.string()
    .min(2, 'Nome do negócio muito curto')
    .max(100, 'Nome do negócio muito longo')
    .trim()
    .optional(),
  profession: z.string()
    .min(2, 'Profissão muito curta')
    .max(50, 'Profissão muito longa')
    .trim()
    .optional(),
  speciality: z.string()
    .max(100, 'Especialidade muito longa')
    .trim()
    .optional(),
  serviceType: z.enum(['MEDICAL', 'DENTAL', 'BEAUTY', 'THERAPY', 'WELLNESS', 'OTHER']),
  workingDays: z.array(z.number().min(0).max(6))
    .min(1, 'Selecione pelo menos um dia de trabalho')
    .max(7, 'Máximo 7 dias'),
  workingHours: z.object({
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário inválido'),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário inválido')
  }).refine(data => data.start < data.end, {
    message: 'Horário de início deve ser antes do fim'
  }),
  timeSlotDuration: z.number()
    .min(15, 'Duração mínima de 15 minutos')
    .max(480, 'Duração máxima de 8 horas'),
  bookingAdvance: z.number()
    .min(1, 'Antecedência mínima de 1 hora')
    .max(8760, 'Antecedência máxima de 1 ano'),
  address: z.string().max(200, 'Endereço muito longo').trim().optional(),
  city: z.string().max(100, 'Cidade muito longa').trim().optional(),
  state: z.string().max(2, 'Estado deve ter 2 caracteres').trim().optional(),
  zipCode: z.string()
    .regex(/^\d{5}-?\d{3}$/, 'CEP inválido')
    .optional(),
  description: z.string().max(500, 'Descrição muito longa').trim().optional(),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
  slug: z.string()
    .min(3, 'Slug muito curto')
    .max(50, 'Slug muito longo')
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens')
    .optional(),
  paymentMethod: z.enum(['OFFLINE', 'PIX_OWN', 'INTEGRATED']).default('OFFLINE'),
  paymentProvider: z.enum(['STRIPE', 'MERCADOPAGO', 'MANUAL']).default('MANUAL'),
  pixKey: z.string()
    .min(11, 'Chave PIX inválida')
    .max(77, 'Chave PIX muito longa')
    .optional(),
  pixName: z.string()
    .min(2, 'Nome muito curto')
    .max(100, 'Nome muito longo')
    .optional(),
  paymentInstructions: z.string()
    .max(500, 'Instruções muito longas')
    .optional(),
  requirePaymentUpfront: z.boolean().default(false),
  cancellationHours: z.number()
    .min(1, 'Mínimo 1 hora')
    .max(168, 'Máximo 7 dias')
    .default(24),
  noShowFee: z.number()
    .min(0, 'Taxa não pode ser negativa')
    .max(1000, 'Taxa muito alta')
    .optional()
})

export const serviceSchema = z.object({
  name: z.string()
    .min(2, 'Nome do serviço muito curto')
    .max(100, 'Nome do serviço muito longo')
    .trim(),
  description: z.string()
    .max(500, 'Descrição muito longa')
    .trim()
    .optional(),
  duration: z.number()
    .min(15, 'Duração mínima de 15 minutos')
    .max(480, 'Duração máxima de 8 horas'),
  price: z.number()
    .min(0, 'Preço não pode ser negativo')
    .max(10000, 'Preço muito alto')
    .optional(),
  color: z.string()
    .regex(/^#[0-9A-F]{6}$/i, 'Cor deve estar no formato hexadecimal')
    .optional(),
  isActive: z.boolean().default(true)
})

export const clientSchema = z.object({
  name: z.string()
    .min(2, 'Nome muito curto')
    .max(100, 'Nome muito longo')
    .trim(),
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email muito longo')
    .toLowerCase()
    .trim()
    .optional(),
  phone: z.string()
    .regex(phoneRegex, 'Telefone inválido')
    .optional(),
  birthDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .optional(),
  notes: z.string()
    .max(1000, 'Observações muito longas')
    .trim()
    .optional(),
  dataConsent: z.boolean()
    .refine(val => val === true, 'Cliente deve consentir com uso dos dados')
})

export const appointmentSchema = z.object({
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, 'Data/hora inválida'),
  serviceId: z.string().cuid().optional(),
  clientId: z.string().cuid().optional(),
  clientName: z.string()
    .min(2, 'Nome muito curto')
    .max(100, 'Nome muito longo')
    .trim()
    .optional(),
  clientEmail: z.string()
    .email('Email inválido')
    .toLowerCase()
    .trim()
    .optional(),
  clientPhone: z.string()
    .regex(phoneRegex, 'Telefone inválido')
    .optional(),
  serviceName: z.string()
    .min(2, 'Nome do serviço muito curto')
    .max(100, 'Nome do serviço muito longo')
    .trim(),
  duration: z.number()
    .min(15, 'Duração mínima de 15 minutos')
    .max(480, 'Duração máxima de 8 horas'),
  servicePrice: z.number()
    .min(0, 'Preço não pode ser negativo')
    .optional(),
  notes: z.string()
    .max(500, 'Observações muito longas')
    .trim()
    .optional(),
  requiresPayment: z.boolean().default(false),
  paymentMethod: z.enum(['OFFLINE', 'PIX_OWN', 'INTEGRATED']).default('OFFLINE')
})

export const subscriptionSchema = z.object({
  planId: z.enum(['free', 'pro', 'premium']),
  paymentMethod: z.enum(['card', 'pix', 'boleto']).optional(),
  couponCode: z.string().optional()
})

export const paymentConfigSchema = z.object({
  method: z.enum(['OFFLINE', 'PIX_OWN', 'INTEGRATED']),
  provider: z.enum(['STRIPE', 'MERCADOPAGO', 'MANUAL']).optional(),
  pixKey: z.string().optional(),
  pixName: z.string().optional(),
  instructions: z.string().max(500).optional(),
  requireUpfront: z.boolean().default(false),
  cancellationHours: z.number().min(1).max(168).default(24),
  noShowFee: z.number().min(0).optional()
})

export const paymentSchema = z.object({
  amount: z.number().min(0.01, 'Valor mínimo R$ 0,01'),
  currency: z.string().default('BRL'),
  provider: z.enum(['STRIPE', 'MERCADOPAGO', 'MANUAL']),
  method: z.enum(['card', 'pix', 'boleto', 'cash']),
  description: z.string().min(1, 'Descrição obrigatória'),
  appointmentId: z.string().cuid().optional(),
  metadata: z.record(z.string(), z.any()).optional()
})

export type UserRegistration = z.infer<typeof userRegistrationSchema>
export type UserLogin = z.infer<typeof userLoginSchema>
export type Profile = z.infer<typeof profileSchema>
export type Service = z.infer<typeof serviceSchema>
export type Client = z.infer<typeof clientSchema>
export type Appointment = z.infer<typeof appointmentSchema>
export type PaymentConfig = z.infer<typeof paymentConfigSchema>
export type Payment = z.infer<typeof paymentSchema>
export type Subscription = z.infer<typeof subscriptionSchema>