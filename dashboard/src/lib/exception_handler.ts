import { NextResponse } from 'next/server'
import { log, LogLevel } from './logger'

type ApiHandler = () => Promise<NextResponse>

export function handleException(handler: ApiHandler) {
  return async function () {
    try {
      return await handler()
    } catch (err: unknown) {
      log(`Unhandled error: ${(err as Error).message}`, LogLevel.ERROR)
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
  }
}