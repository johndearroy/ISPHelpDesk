import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../src/app.js'
import { createUser, loginAs, resetDatabase } from './helpers.js'

beforeEach(resetDatabase)

const validUser = {
  name: 'Karim Hasan',
  email: 'karim@example.com',
  password: 'karim1234',
  area: 'Mirpur',
}

describe('auth', () => {
  it('registers a customer and sets the auth cookie', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser).expect(201)

    expect(res.body).toMatchObject({ email: 'karim@example.com', role: 'CUSTOMER' })
    expect(res.body.passwordHash).toBeUndefined()
    expect(res.headers['set-cookie'][0]).toMatch(/^token=.+HttpOnly/)
  })

  it('rejects invalid registration data with field errors', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'K', email: 'not-an-email', password: 'short', area: 'Mars' })
      .expect(400)

    expect(Object.keys(res.body.error.details)).toEqual(
      expect.arrayContaining(['name', 'email', 'password', 'area']),
    )
  })

  it('does not allow choosing a role on registration', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, role: 'ADMIN' })
      .expect(201)

    expect(res.body.role).toBe('CUSTOMER')
  })

  it('rejects a duplicate email', async () => {
    await request(app).post('/api/auth/register').send(validUser).expect(201)
    await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, email: 'KARIM@example.com' })
      .expect(409)
  })

  it('rejects a wrong password', async () => {
    const user = await createUser()
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'wrong-password1' })
      .expect(401)

    expect(res.body.error.message).toBe('Invalid email or password')
  })

  it('returns 401 for protected routes without a token', async () => {
    await request(app).get('/api/auth/me').expect(401)
  })

  it('returns 401 for a tampered token', async () => {
    await request(app).get('/api/auth/me').set('Cookie', 'token=abc.def.ghi').expect(401)
  })

  it('returns the current user and logs out', async () => {
    const user = await createUser('AGENT')
    const agent = await loginAs(user)

    const res = await agent.get('/api/auth/me').expect(200)
    expect(res.body).toMatchObject({ id: user.id, role: 'AGENT' })

    await agent.post('/api/auth/logout').expect(204)
    await agent.get('/api/auth/me').expect(401)
  })
})
