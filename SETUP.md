# Verificar estrutura
ls -la
```

### 1.2 Instalar Dependências
```bash
# Instalar todas as dependências
npm install

# OU usando yarn
yarn install

# OU usando pnpm (recomendado)
pnpm install
```

## 📦 2. Dependências do Projeto

### 2.1 Dependências Principais
```bash
# Framework e Core
npm install next@15.4.5 react@19.1.0 react-dom@19.1.0 typescript@^5

# Banco de Dados e ORM
npm install @prisma/client@^6.13.0 prisma@^6.13.0

# Autenticação
npm install next-auth@^4.24.11 @next-auth/prisma-adapter@^1.0.7

# Formulários e Validação
npm install react-hook-form@^7.62.0 @hookform/resolvers@^5.2.1 zod@^4.0.14

# UI e Styling
npm install tailwindcss@^4 @tailwindcss/postcss@^4
npm install @radix-ui/react-dialog@^1.1.14 @radix-ui/react-dropdown-menu@^2.1.15
npm install @radix-ui/react-label@^2.1.7 @radix-ui/react-slot@^1.2.3
npm install @radix-ui/react-toast@^1.2.14
npm install class-variance-authority@^0.7.1 clsx@^2.1.1 tailwind-merge@^3.3.1
npm install lucide-react@^0.536.0 next-themes@^0.4.6

# Utilitários
npm install date-fns@^4.1.0 sonner@^2.0.7

# Criptografia e Segurança
npm install bcryptjs@^3.0.2 jsonwebtoken@^9.0.2

# Email
npm install nodemailer@^6.10.1

# Pagamentos
npm install @stripe/stripe-js@^7.8.0 stripe@^18.4.0
```

### 2.2 Dependências de Desenvolvimento
```bash
# TypeScript e Tipos
npm install --save-dev @types/node@^20.19.9 @types/react@^19 @types/react-dom@^19
npm install --save-dev @types/bcryptjs@^2.4.6 @types/jsonwebtoken@^9.0.10
npm install --save-dev @types/nodemailer@^6.4.17

# Linting e Qualidade
npm install --save-dev eslint@^9 eslint-config-next@15.4.5 @eslint/eslintrc@^3

# Build Tools
npm install --save-dev tsx@^4.20.3 tw-animate-css@^1.3.6
```

### 2.3 Comando Único para Todas as Dependências
```bash
# Instalar tudo de uma vez
npm install next@15.4.5 react@19.1.0 react-dom@19.1.0 typescript@^5 @prisma/client@^6.13.0 next-auth@^4.24.11 @next-auth/prisma-adapter@^1.0.7 react-hook-form@^7.62.0 @hookform/resolvers@^5.2.1 zod@^4.0.14 tailwindcss@^4 @tailwindcss/postcss@^4 @radix-ui/react-dialog@^1.1.14 @radix-ui/react-dropdown-menu@^2.1.15 @radix-ui/react-label@^2.1.7 @radix-ui/react-slot@^1.2.3 @radix-ui/react-toast@^1.2.14 class-variance-authority@^0.7.1 clsx@^2.1.1 tailwind-merge@^3.3.1 lucide-react@^0.536.0 next-themes@^0.4.6 date-fns@^4.1.0 sonner@^2.0.7 bcryptjs@^3.0.2 jsonwebtoken@^9.0.2 nodemailer@^6.10.1 @stripe/stripe-js@^7.8.0 stripe@^18.4.0 prisma@^6.13.0 @types/node@^20.19.9 @types/react@^19 @types/react-dom@^19 @types/bcryptjs@^2.4.6 @types/jsonwebtoken@^9.0.10 @types/nodemailer@^6.4.17 eslint@^9 eslint-config-next@15.4.5 @eslint/eslintrc@^3 tsx@^4.20.3 tw-animate-css@^1.3.6
```

## ⚙️ 3. Configuração do Ambiente

### 3.1 Variáveis de Ambiente
```bash
# Copiar template de variáveis
cp .env.example .env

# Editar variáveis (use seu editor preferido)
nano .env
# OU
code .env
# OU
vim .env
```

### 3.2 Gerar Chaves Seguras
```bash
# Gerar NextAuth Secret (64+ caracteres)
openssl rand -base64 64

# Gerar Encryption Key (32 bytes = 64 hex)
openssl rand -hex 32

# Gerar JWT Secret alternativo
node -p "require('crypto').randomBytes(64).toString('hex')"
```

### 3.3 Configurar Banco de Dados

#### Opção A: Neon (Recomendado)
```bash
# 1. Criar conta em https://neon.tech/
# 2. Criar novo projeto
# 3. Copiar connection string
# 4. Adicionar no .env:
# DATABASE_URL="postgresql://username:password@host/database?sslmode=require"
```

#### Opção B: PostgreSQL Local
```bash
# Instalar PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Instalar PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Criar banco de dados
sudo -u postgres createdb agendabem

# Criar usuário
sudo -u postgres psql
CREATE USER agendabem WITH PASSWORD 'sua_senha_segura';
GRANT ALL PRIVILEGES ON DATABASE agendabem TO agendabem;
\q

# Configurar no .env
DATABASE_URL="postgresql://agendabem:sua_senha@localhost:5432/agendabem"
```

## 🗄️ 4. Configuração do Prisma

### 4.1 Configurar Prisma
```bash
# Gerar cliente Prisma
npx prisma generate

# Aplicar migrações (primeira vez)
npx prisma db push

# OU criar migração nomeada
npx prisma migrate dev --name init

# Verificar banco
npx prisma studio
```

### 4.2 Popular Dados Iniciais (Opcional)
```bash
# Criar arquivo de seed
touch prisma/seed.ts

# Executar seed
npx prisma db seed
```

## 📧 5. Configuração de Email (Hostinger)

### 5.1 Configurar Hostinger SMTP
```bash
# No painel da Hostinger:
# 1. Acesse "Email" → "Contas de Email"
# 2. Crie: noreply@seudominio.com
# 3. Configure SMTP:
#    - Host: smtp.hostinger.com
#    - Porta: 465 (SSL) ou 587 (TLS)
#    - Usuário: noreply@seudominio.com
#    - Senha: sua_senha_email

# Adicionar no .env:
SMTP_HOST="smtp.hostinger.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="noreply@seudominio.com"
SMTP_PASS="sua_senha_email"
SMTP_FROM_EMAIL="AgendaBem <noreply@seudominio.com>"
```

### 5.2 Testar Email
```bash
# Executar aplicação
npm run dev

# Testar email (abrir no navegador)
# http://localhost:3000/api/test-email
```

## 🔐 6. Configuração de Autenticação

### 6.1 Google OAuth (Opcional)
```bash
# 1. Acesse: https://console.developers.google.com/
# 2. Crie novo projeto ou selecione existente
# 3. Habilite "Google+ API"
# 4. Crie credenciais OAuth 2.0
# 5. Configure URLs:
#    - JavaScript origins: http://localhost:3000
#    - Redirect URIs: http://localhost:3000/api/auth/callback/google

# Adicionar no .env:
GOOGLE_CLIENT_ID="seu_client_id"
GOOGLE_CLIENT_SECRET="seu_client_secret"
```

## 💳 7. Configuração de Pagamentos (Opcional)

### 7.1 Stripe
```bash
# 1. Criar conta: https://dashboard.stripe.com/register
# 2. Obter chaves de teste
# 3. Configurar webhook endpoint

# Adicionar no .env:
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

### 7.2 Mercado Pago
```bash
# 1. Criar conta: https://www.mercadopago.com.br/developers/
# 2. Criar aplicação
# 3. Obter credenciais de teste

# Adicionar no .env:
MERCADOPAGO_ACCESS_TOKEN="APP_USR-..."
MERCADOPAGO_PUBLIC_KEY="APP_USR-..."
```

## 🚀 8. Executar a Aplicação

### 8.1 Desenvolvimento
```bash
# Iniciar servidor de desenvolvimento
npm run dev

# OU
yarn dev

# OU
pnpm dev

# Aplicação estará em: http://localhost:3000
```

### 8.2 Build de Produção
```bash
# Gerar build otimizado
npm run build

# Iniciar servidor de produção
npm run start

# OU fazer tudo junto
npm run build && npm run start
```

## 🧪 9. Testes e Verificações

### 9.1 Verificar Configurações
```bash
# Testar banco de dados
npx prisma studio

# Testar email
curl http://localhost:3000/api/test-email

# Verificar build
npm run build
npm run lint
```

### 9.2 Endpoints de Teste
```bash
# Email
GET http://localhost:3000/api/test-email

# Conexão SMTP apenas
HEAD http://localhost:3000/api/test-email

# Teste personalizado
POST http://localhost:3000/api/test-email
Content-Type: application/json
{
  "email": "test@example.com",
  "name": "Teste",
  "type": "verification"
}
```

## 🔧 10. Scripts Úteis

### 10.1 Package.json Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "prisma db seed",
    "test:email": "curl http://localhost:3000/api/test-email",
    "clean": "rm -rf .next node_modules",
    "reset": "npm run clean && npm install"
  }
}
```

### 10.2 Comandos de Manutenção
```bash
# Limpar cache
npm run clean

# Reinstalar dependências
npm run reset

# Atualizar dependências
npm update

# Verificar dependências desatualizadas
npm outdated

# Auditoria de segurança
npm audit
npm audit fix
```

## 🚨 11. Solução de Problemas

### 11.1 Problemas Comuns

#### Erro de Conexão com Banco
```bash
# Verificar conexão
npx prisma db pull

# Resetar banco (CUIDADO: apaga dados!)
npx prisma migrate reset

# Verificar URL
echo $DATABASE_URL
```

#### Erro de Email SMTP
```bash
# Verificar configurações
node -e "console.log({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  user: process.env.SMTP_USER,
  from: process.env.SMTP_FROM_EMAIL
})"

# Testar conexão SMTP
telnet smtp.hostinger.com 465
```

#### Erro de Build
```bash
# Limpar cache Next.js
rm -rf .next

# Verificar TypeScript
npx tsc --noEmit

# Verificar ESLint
npx eslint . --ext .ts,.tsx
```

### 11.2 Logs de Debug
```bash
# Habilitar logs detalhados
export DEBUG=*
npm run dev

# Verificar logs do Prisma
export DEBUG="prisma:*"
npm run dev
```

---

🎉 **Parabéns!** Se chegou até aqui, o AgendaBem está configurado e funcionando!