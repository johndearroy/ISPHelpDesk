import { config } from '../config.js'
import { prisma } from '../db.js'
import { createAiChain } from './chain.js'
import { createOpenRouterProvider } from './openrouter.js'

function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

const provider = config.OPENROUTER_API_KEY
  ? createOpenRouterProvider({
      apiKey: config.OPENROUTER_API_KEY,
      baseUrl: config.OPENROUTER_BASE_URL,
      models: config.OPENROUTER_MODELS,
      timeoutMs: config.AI_TIMEOUT_MS,
      appUrl: config.CLIENT_ORIGIN,
    })
  : null

export const aiChain = createAiChain({
  provider,
  log: (entry) => prisma.aiRequest.create({ data: entry }),
  isOverQuota: async (userId) => {
    const used = await prisma.aiRequest.count({
      where: { userId, status: 'SUCCESS', createdAt: { gte: startOfToday() } },
    })
    return used >= config.AI_DAILY_QUOTA_PER_USER
  },
})

export const aiConfigured = Boolean(provider && provider.models.length > 0)
