import { execSync } from 'node:child_process'

export default function setup() {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL is not set, see server/.env.example')
  }

  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
    stdio: 'ignore',
  })
}
