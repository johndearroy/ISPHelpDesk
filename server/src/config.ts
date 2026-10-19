import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET should be at least 16 characters'),
  JWT_EXPIRES_DAYS: z.coerce.number().int().positive().default(7),
  OPENROUTER_API_KEY: z.string().default(''),
  OPENROUTER_BASE_URL: z.url().default('https://openrouter.ai/api/v1'),
  OPENROUTER_MODELS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((model) => model.trim())
        .filter(Boolean),
    ),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  AI_DAILY_QUOTA_PER_USER: z.coerce.number().int().positive().default(50),
  OUTAGE_MIN_TICKETS: z.coerce.number().int().min(2).default(5),
  OUTAGE_WINDOW_MINUTES: z.coerce.number().int().positive().default(30),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables')
  console.error(z.prettifyError(parsed.error))
  process.exit(1)
}

export const config = parsed.data
