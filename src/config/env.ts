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
})

export const env = envSchema.parse(process.env)
