import 'dotenv/config'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? '',
      OPENROUTER_API_KEY: '',
    },
    globalSetup: './tests/globalSetup.ts',
    fileParallelism: false,
  },
})
