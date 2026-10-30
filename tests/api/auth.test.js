import { describe, it, expect, afterAll } from 'vitest'
import { agent, testEmail, PASSWORD, cleanup, getApp } from './helpers.js'
import request from 'supertest'

afterAll(cleanup)

const cookieOf = (res) => (res.headers['set-cookie'] || []).find((c) => c.startsWith('px_session='))

describe('POST /api/auth/signup', () => {
  it('creates an account, sets an httpOnly session cookie and never returns the password hash', async () => {
    const a = await agent()
    const email = testEmail('signup')
    const res = await a.post('/api/auth/signup').send({ email, password: PASSWORD, fullName: 'Sam Signup' })
    expect(res.status).toBe(201)
    expect(res.body.user).toMatchObject({ email, fullName: 'Sam Signup' })
    expect(JSON.stringify(res.body)).not.toMatch(/password|hash/i)
    const cookie = cookieOf(res)
    expect(cookie).toMatch(/HttpOnly/)
    expect(cookie).toMatch(/SameSite=Lax/)
  })

  it('treats email case-insensitively and blocks a duplicate email', async () => {
    const a = await agent()
    const email = testEmail('dupe')
    expect((await a.post('/api/auth/signup').send({ email, password: PASSWORD, fullName: 'First' })).status).toBe(201)
    const again = await (await agent()).post('/api/auth/signup').send({ email: email.toUpperCase(), password: PASSWORD, fullName: 'Second' })
    expect(again.status).toBe(409)
    expect(again.body.error).toMatch(/already exists/i)
  })

  it.each([
    ['empty', ''],
    ['too short', 'Ab1'],
    ['no number', 'abcdefgh'],
    ['no letter', '12345678'],
    ['missing', undefined],
  ])('blocks a weak password (%s)', async (_label, password) => {
    const res = await (await agent()).post('/api/auth/signup').send({ email: testEmail('weak'), password, fullName: 'Weak Pw' })
    expect(res.status).toBe(400)
    expect(res.body.field).toBe('password')
  })

  it('rejects an invalid email and a missing name', async () => {
    const a = await agent()
    expect((await a.post('/api/auth/signup').send({ email: 'not-an-email', password: PASSWORD, fullName: 'X Y' })).body.field).toBe('email')
    expect((await a.post('/api/auth/signup').send({ email: testEmail('noname'), password: PASSWORD, fullName: '' })).body.field).toBe('fullName')
  })

  it('only accepts POST', async () => {
    expect((await (await agent()).get('/api/auth/signup')).status).toBe(405)
  })
})

describe('login, me and logout', () => {
  it('logs in, returns the user from /me, and logout clears the cookie', async () => {
    const email = testEmail('login')
    await (await agent()).post('/api/auth/signup').send({ email, password: PASSWORD, fullName: 'Lee Login' })

    const a = await agent()
    expect((await a.get('/api/auth/me')).status).toBe(401)

    const login = await a.post('/api/auth/login').send({ email, password: PASSWORD })
    expect(login.status).toBe(200)
    expect(login.body.user.email).toBe(email)

    const me = await a.get('/api/auth/me')
    expect(me.status).toBe(200)
    expect(me.body.user).toMatchObject({ email, fullName: 'Lee Login' })

    const out = await a.post('/api/auth/logout')
    expect(out.status).toBe(200)
    expect(cookieOf(out)).toMatch(/Max-Age=0/)
    expect((await a.get('/api/auth/me')).status).toBe(401)
  })

  it('fails with a wrong password, and gives the same message for an unknown email', async () => {
    const email = testEmail('wrongpw')
    await (await agent()).post('/api/auth/signup').send({ email, password: PASSWORD, fullName: 'Wrong Pw' })
    const wrong = await (await agent()).post('/api/auth/login').send({ email, password: 'Nope12345' })
    const unknown = await (await agent()).post('/api/auth/login').send({ email: testEmail('ghost'), password: PASSWORD })
    expect(wrong.status).toBe(401)
    expect(unknown.status).toBe(401)
    expect(wrong.body.error).toBe(unknown.body.error)
    expect(cookieOf(wrong)).toBeUndefined()
  })

  it('rejects empty login fields', async () => {
    expect((await (await agent()).post('/api/auth/login').send({})).status).toBe(400)
  })

  it('treats a tampered or forged session cookie as logged out', async () => {
    const app = await getApp()
    const forged = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.invalidsignature'
    const res = await request(app).get('/api/auth/me').set('Cookie', `px_session=${forged}`)
    expect(res.status).toBe(401)
  })
})
