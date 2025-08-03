import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY não configurada')
  }
  
  if (key.length !== KEY_LENGTH * 2) {
    throw new Error(`ENCRYPTION_KEY deve ter ${KEY_LENGTH * 2} caracteres`)
  }
  
  return Buffer.from(key, 'hex')
}

export function encrypt(text: string): string {
  if (!text) return ''
  
  try {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipher(ALGORITHM, key)
    cipher.setAAD(iv)
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const tag = cipher.getAuthTag()
    
    return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted
  } catch (error) {
    console.error('Erro na criptografia:', error)
    throw new Error('Falha ao criptografar dados')
  }
}

export function decrypt(encryptedData: string): string {
  if (!encryptedData) return ''
  
  try {
    const parts = encryptedData.split(':')
    if (parts.length !== 3) {
      throw new Error('Formato de dados criptografados inválido')
    }
    
    const key = getEncryptionKey()
    const iv = Buffer.from(parts[0], 'hex')
    const tag = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]
    
    const decipher = crypto.createDecipher(ALGORITHM, key)
    decipher.setAAD(iv)
    decipher.setAuthTag(tag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Erro na descriptografia:', error)
    throw new Error('Falha ao descriptografar dados')
  }
}

export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const bcrypt = require('bcryptjs')
    bcrypt.hash(password, 12, (err: Error | null, hash: string) => {
      if (err) reject(err)
      else resolve(hash)
    })
  })
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const bcrypt = require('bcryptjs')
    bcrypt.compare(password, hash, (err: Error | null, result: boolean) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}

export function hashSensitiveData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

export function generateTOTPSecret(): string {
  return crypto.randomBytes(20).toString('hex')
}

export function sanitizeInput(input: string): string {
  if (!input) return ''
  
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .slice(0, 1000)
}