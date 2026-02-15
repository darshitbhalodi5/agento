import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.string().min(1).default('postgres://postgres:postgres@localhost:5432/agento'),
  TEMPO_RPC_URL: z.string().url().default('https://rpc.moderato.tempo.xyz'),
  CHAIN_ID: z.coerce.number().int().default(42431),
  APP_BASE_URL: z.string().url().default('http://127.0.0.1:3000'),
  FRONTEND_ORIGINS: z.string().default('http://localhost:3001'),
  DOWNSTREAM_API_URL: z
    .string()
    .url()
    .default('http://localhost:3000/v1/internal/mock/execute'),
  INTERNAL_API_KEY: z.string().min(1).default('agento-dev-key'),
  ENABLE_PAYMENT_SIMULATION: z.coerce.boolean().default(process.env.NODE_ENV !== 'production'),
  SIMULATED_PAYER_ADDRESS: z.string().default('0x88FB1167B01EcE2CAEe65c4E193Ba942D6F73d70'),
})

export const env = envSchema.parse(process.env)
