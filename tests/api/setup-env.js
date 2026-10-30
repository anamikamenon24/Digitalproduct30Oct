// Runs before every backend test file. Never reads .env, so tests can't touch real Neon/Stripe.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'pglite:memory'
process.env.JWT_SECRET = 'test-only-secret-0123456789-abcdefghijklmnopqrstuvwxyz'
process.env.STRIPE_MOCK = '1'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_only_secret'
delete process.env.STRIPE_SECRET_KEY
delete process.env.VERCEL
process.env.NODE_ENV = 'test'
