import fs from 'fs'
import { log, LogLevel, toggleConsoleLogging } from '../../src/lib/logger'

jest.mock('fs')

const mockAppendFile = jest.mocked(fs.appendFile)
const mockWriteFileSync = jest.mocked(fs.writeFileSync)

beforeEach(() => jest.clearAllMocks())

describe('log()', () => {
  it('writes an INFO message to file', () => {
    log('hello world', LogLevel.INFO)

    expect(mockAppendFile).toHaveBeenCalledTimes(1)
    const written = mockAppendFile.mock.calls[0][1] as string
    expect(written).toContain('[INFO]')
    expect(written).toContain('hello world')
  })

  it('defaults to INFO level', () => {
    log('default level')
    const written = mockAppendFile.mock.calls[0][1] as string
    expect(written).toContain('[INFO]')
  })

  it('writes ERROR level messages', () => {
    log('something broke', LogLevel.ERROR)
    const written = mockAppendFile.mock.calls[0][1] as string
    expect(written).toContain('[ERROR]')
  })

  it('includes a timestamp in the output', () => {
    log('timestamp test', LogLevel.INFO)
    const written = mockAppendFile.mock.calls[0][1] as string
    // ISO timestamp pattern
    expect(written).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })
})

describe('toggleConsoleLogging()', () => {
  it('toggles without throwing', () => {
    expect(() => toggleConsoleLogging()).not.toThrow()
    toggleConsoleLogging() // reset
  })
})

it('writes to console when console logging is enabled', () => {
  const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
  toggleConsoleLogging() // turn on
  log('visible message', LogLevel.INFO)
  expect(consoleSpy).toHaveBeenCalled()
  toggleConsoleLogging() // reset
  consoleSpy.mockRestore()
})

it('handles fs.appendFile errors gracefully', () => {
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  // Trigger the error callback
  mockAppendFile.mockImplementationOnce((_path, _data, cb) => cb(new Error('disk full')))
  log('trigger error', LogLevel.INFO)
  expect(consoleErrorSpy).toHaveBeenCalled()
  consoleErrorSpy.mockRestore()
})

it('uses console.warn for WARN level when console logging is enabled', () => {
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation()
  toggleConsoleLogging()
  log('warn message', LogLevel.WARN)
  expect(warnSpy).toHaveBeenCalled()
  toggleConsoleLogging()
  warnSpy.mockRestore()
})