import { createStdioServer } from '@act-sdk/adapters/stdio'
import { config } from './act-sdk.config.js'

// Create STDIO server - no auth required for CLI usage
createStdioServer(config)
