import { getDb } from '../../src/lib/database'

// Mock the pg Pool entirely
jest.mock('pg', () => {
  const mockQuery = jest.fn().mockResolvedValue({ rows: [] })
  const MockPool = jest.fn().mockImplementation(() => ({ query: mockQuery }))
  return { Pool: MockPool }
})

beforeEach(() => {
  // Reset the global pool cache between tests
  global.__pgPool = undefined
  global.__pgInitPromise = undefined
})

describe('getDb()', () => {
  it('returns a Pool instance', async () => {
    const db = await getDb()
    expect(db).toBeDefined()
    expect(typeof db.query).toBe('function')
  })

  it('returns the same instance on repeated calls (singleton)', async () => {
    const db1 = await getDb()
    const db2 = await getDb()
    expect(db1).toBe(db2)
  })
})

it('throws after all retries are exhausted', async () => {
  process.env.DB_RETRY_MAX = '2'
  process.env.DB_RETRY_INTERVAL_MS = '10'

  jest.resetModules()
  jest.mock('pg', () => ({
    Pool: jest.fn().mockImplementation(() => ({
      query: jest.fn().mockRejectedValue(new Error('connection refused'))
    }))
  }))

  const { getDb: getDbFresh } = require('../../src/lib/database')
  global.__pgPool = undefined
  global.__pgInitPromise = undefined

  await expect(getDbFresh()).rejects.toThrow('All retry attempts failed')

  delete process.env.DB_RETRY_MAX
  delete process.env.DB_RETRY_INTERVAL_MS
}, 5_000)