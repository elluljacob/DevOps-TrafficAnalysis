/* ============================================================================
 *  Logger
 * ----------------------------------------------------------------------------
 * Centralized logging utility.
 * Supports log levels, coloured console output, and file logging.
 * Console and file logging can be toggled via environment variables.
 *
 * ENV VARIABLES
 * LOG_TO_CONSOLE=true|false
 * LOG_TO_FILE=true|false
 * ============================================================================
 */

import fs from 'fs'
import path from 'path'

export enum LogLevel {
    INFO  = 'info',
    WARN  = 'warn',
    ERROR = 'error',
    DEBUG = 'debug',
}

/* ============================================================================
 *  Environment configuration
 * ----------------------------------------------------------------------------
 * Defaults:
 *  - Console logging: enabled
 *  - File logging: enabled
 * ============================================================================
 */

const enableConsoleLog = process.env.LOG_TO_CONSOLE !== 'false'
const enableFileLog    = process.env.LOG_TO_FILE !== 'false'

/* ============================================================================
 *  Log file path
 * ----------------------------------------------------------------------------
 * Logs are written to logs/server.log in project root
 * ============================================================================
 */

const logDir  = path.join(process.cwd(), 'logs')
const logFile = path.join(logDir, 'server.log')

/* ============================================================================
 *  Ensure log directory exists
 * ============================================================================
 */

if (enableFileLog && !fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
}

/* ============================================================================
 *  Clear log file on startup
 * ----------------------------------------------------------------------------
 * Overwrites the existing file with empty content
 * ============================================================================
 */

if (enableFileLog) {
    try {
        fs.writeFileSync(logFile, '')

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
}

/* ============================================================================
 *  Console colours
 * ----------------------------------------------------------------------------
 * ANSI codes for coloured output per log level
 * ============================================================================
 */

const colours: Record<LogLevel, string> = {

    [LogLevel.INFO]  : '\x1b[32m',   // green
    [LogLevel.WARN]  : '\x1b[33m',   // yellow
    [LogLevel.ERROR] : '\x1b[31m',   // red
    [LogLevel.DEBUG] : '\x1b[36m',   // cyan
}

const reset = '\x1b[0m'

/* ============================================================================
 *  Log function
 * ----------------------------------------------------------------------------
 * Logs a message with timestamp and level.
 * Writes to console and/or file depending on environment configuration.
 * ============================================================================
 */

export function log(message: string, level: LogLevel = LogLevel.INFO) {

    const timestamp = new Date().toISOString()

    const formattedMessage =
        `[${level.toUpperCase()}]` +
        `[${timestamp}] ${message}`

    /* ================= Console output ================= */

    if (enableConsoleLog) {

        const colour = colours[level] || ''

        switch (level) {

            case LogLevel.INFO:
                console.log(`${colour}${formattedMessage}${reset}`)
            break

            case LogLevel.WARN:
                console.warn(`${colour}${formattedMessage}${reset}`)
            break

            case LogLevel.ERROR:
                console.error(`${colour}${formattedMessage}${reset}`)
            break

            case LogLevel.DEBUG:
                console.debug(`${colour}${formattedMessage}${reset}`)
            break
        }
    }

    /* ================= File output ================= */

    if (enableFileLog) {

        fs.appendFile(
            logFile,
            formattedMessage + '\n',
            err => {

                if (err) {

                    console.error(
                        `[ERROR][${new Date().toISOString()}] ` +
                        `Failed to write to server.log:`,
                        err
                    )
                }
            }
        )
    }
}