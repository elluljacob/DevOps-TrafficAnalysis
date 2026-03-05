import fs from 'fs'
import { log, LogLevel } from '../../src/lib/logger'

jest.mock('fs')

const mockAppendFile = jest.mocked(fs.appendFile)

beforeEach(() => {
  jest.clearAllMocks()
})

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
    // Check the second argument of the first call to appendFile
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
    // Matches ISO timestamp pattern: YYYY-MM-DDTHH:mm:ss
    expect(written).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })

  it('handles fs.appendFile errors gracefully', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    
    // Trigger the error callback by manually calling the 3rd argument (cb)
    mockAppendFile.mockImplementationOnce((_path, _data, cb: any) => {
        cb(new Error('disk full'))
    })

    log('trigger error', LogLevel.INFO)
    
    expect(consoleErrorSpy).toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })
})