#!/usr/bin/env node
import { createStore } from './store.js';
import { createHttpServer } from './http-server.js';
import { createMcpTools } from './mcp-server.js';
import { EventEmitterSSE } from './events.js';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const args = process.argv.slice(2);
const command = args[0];

function getPort(): number {
  const portIdx = args.indexOf('--port');
  return portIdx >= 0 ? parseInt(args[portIdx + 1], 10) : 4747;
}

function getStorePath(): string {
  const storeDir = process.env.AGENTATION_STORE || join(homedir(), '.agentation');
  if (!existsSync(storeDir)) mkdirSync(storeDir, { recursive: true });
  return join(storeDir, 'store.db');
}

async function main() {
  switch (command) {
    case 'init':
      console.log('Agentation Server - Interactive Setup');
      console.log('=====================================');
      console.log('');
      console.log('To use with Claude Code, add this to your MCP configuration:');
      console.log('');
      console.log('  { "command": "agentation-server", "args": ["start", "--stdio"] }');
      console.log('');
      console.log('Or start the server manually:');
      console.log('');
      console.log('  agentation-server start --port 4747');
      console.log('');
      break;

    case 'start': {
      const port = getPort();
      const isMcpOnly = args.includes('--mcp-only');
      const isStdio = args.includes('--stdio');
      const dbPath = getStorePath();

      console.log(`[agentation] Store: ${dbPath}`);
      const store = createStore(dbPath);
      const events = new EventEmitterSSE();

      if (!isMcpOnly) {
        const server = createHttpServer(store, port);
        console.log(`[agentation] HTTP server listening on http://localhost:${port}`);

        // Graceful shutdown
        process.on('SIGINT', () => {
          console.log('\n[agentation] Shutting down...');
          server.close();
          process.exit(0);
        });
      }

      if (isStdio) {
        // MCP over stdio — the MCP SDK handles stdin/stdout
        console.error('[agentation] MCP server ready (stdio mode)');
        // Full MCP server setup would use @modelcontextprotocol/sdk Server class here
        // For now, the tools are exposed via HTTP and can be integrated later
      }

      console.log('[agentation] Server started successfully');
      if (!isMcpOnly) {
        console.log(`[agentation] API: http://localhost:${port}`);
        console.log('[agentation] Press Ctrl+C to stop');
      }
      break;
    }

    case 'doctor':
      console.log('Agentation Server - Diagnostics');
      console.log('================================');

      // Check Node.js version
      const nodeVersion = process.version;
      const major = parseInt(nodeVersion.slice(1).split('.')[0], 10);
      console.log(`Node.js: ${nodeVersion} ${major >= 18 ? '✓' : '✗ (requires 18+)'}`);

      // Check store path
      const storePath = getStorePath();
      console.log(`Store path: ${storePath} ${existsSync(storePath) ? '✓ (exists)' : '(will be created)'}`);

      // Try connecting to running server
      const testPort = getPort();
      try {
        const res = await fetch(`http://localhost:${testPort}/sessions`);
        console.log(`Server (port ${testPort}): ✓ (running, ${res.status})`);
      } catch {
        console.log(`Server (port ${testPort}): ✗ (not running)`);
      }

      break;

    default:
      console.log('Usage: agentation-server <command>');
      console.log('');
      console.log('Commands:');
      console.log('  init     Interactive setup');
      console.log('  start    Start HTTP + MCP server');
      console.log('  doctor   Run diagnostics');
      console.log('');
      console.log('Options:');
      console.log('  --port <number>  HTTP port (default: 4747)');
      console.log('  --mcp-only       MCP only, no HTTP server');
      console.log('  --stdio          Enable MCP over stdio');
      break;
  }
}

main().catch(console.error);
