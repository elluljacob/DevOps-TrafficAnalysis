
/* ============================================================================
 *  Logger
 * ----------------------------------------------------------------------------
 * Centralized logging utility.
 * Supports log levels, coloured console output, and file logging.
 * Can toggle console logging on/off while always writing to a file.
 * ============================================================================
 */

import fs from 'fs'
import path from 'path'

export enum LogLevel {
    INFO    = 'info',
    WARN    = 'warn',
    ERROR   = 'error',
}

/* ============================================================================
 *  Log file path
 * ----------------------------------------------------------------------------
 * Logs are written to server.log in project root
 * ============================================================================
 */
const logFile = path.join(process.cwd(), 'server.log')

/* ============================================================================
 *  Console logging toggle
 * ----------------------------------------------------------------------------
 * Set to true/false to enable/disable coloured console output
 * ============================================================================
 */
let enableConsoleLog = false
export function toggleConsoleLogging() {
    enableConsoleLog = !enableConsoleLog
}

/* ============================================================================
 *  Clear log file on startup
 * ----------------------------------------------------------------------------
 * Overwrites the existing file with empty content
 * ============================================================================
 */
try {
    fs.writeFileSync(logFile, '') // clears file
    if (enableConsoleLog) {
        console.log(
            `[INFO] [${new Date().toISOString()}]`, 
            `Cleared server.log on startup`
        )
    }
} catch (err) {
    console.error(
        `[ERROR] [${new Date().toISOString()}]`,
        `Failed to clear server.log:`, 
        err
    )
}

/* ============================================================================
 *  Console colours
 * ----------------------------------------------------------------------------
 * ANSI codes for coloured output per log level
 * ============================================================================
 */
const colours: Record<LogLevel, string> = {
    [LogLevel.INFO]     : '\x1b[32m',   // green
    [LogLevel.WARN]     : '\x1b[33m',   // yellow
    [LogLevel.ERROR]    : '\x1b[31m',   // red
}
const reset = '\x1b[0m'

/* ============================================================================
 *  Log function
 * ----------------------------------------------------------------------------
 * Logs a message with a timestamp and level.
 * Writes to console (if enabled) and always to file.
 * ============================================================================
 */
export function log(message: string, level: LogLevel = LogLevel.INFO) {
    const timestamp         = new Date().toISOString()
    const formattedMessage  = 
        `[${level.toUpperCase()}]` +
        `[${timestamp}] ${message}`

    // Console output (optional)
    if (enableConsoleLog) {
        const colour = colours[level] || ''
        switch (level) {
            case LogLevel.INFO:
                console.log     (`${colour}${formattedMessage}${reset}`)
            break
            case LogLevel.WARN:
                console.warn    (`${colour}${formattedMessage}${reset}`)
            break
            case LogLevel.ERROR:
                console.error   (`${colour}${formattedMessage}${reset}`)
            break
        }
    }

    // Append to file asynchronously
    fs.appendFile(logFile, formattedMessage + '\n', err => {
        if (err)
            console.error(
            `[ERROR] [${new Date().toISOString()}]`+
            `Failed to write to server.log:`, err)
        })
    }
