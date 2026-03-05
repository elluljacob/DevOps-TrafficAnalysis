import { NextResponse } from 'next/server'
import { handleException } from '../../src/lib/exception_handler'

// Mock the logger so tests don't write files
jest.mock('../../src/lib/logger', () => ({
  log: jest.fn(),
  LogLevel: { ERROR: 'error' },
}))

describe('handleException()', () => {
  it('returns the handler result when no error is thrown', async () => {
    const handler = jest.fn().mockResolvedValue(
      NextResponse.json({ ok: true }, { status: 200 })
    )
    const wrapped = handleException(handler)
    const res = await wrapped()

    expect(res.status).toBe(200)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('returns 500 when the handler throws', async () => {
    const handler = jest.fn().mockRejectedValue(new Error('boom'))
    const wrapped = handleException(handler)
    const res = await wrapped()

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ error: 'Internal Server Error' })
  })

  it('does not re-throw — always returns a response', async () => {
    const handler = jest.fn().mockRejectedValue(new Error('crash'))
    const wrapped = handleException(handler)

    await expect(wrapped()).resolves.toBeDefined()
  })
})