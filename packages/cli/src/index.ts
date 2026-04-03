import { Command } from 'commander';
import { init } from './commands/init.js';

const program = new Command();

program
  .name('act-sdk')
  .description('CLI for Act SDK - Initialize MCP servers')
  .version('2.0.1');

program
  .command('init')
  .description('Initialize Act SDK in your project')
  .option('--skip-install', 'Skip dependency installation')
  .action(init);

program.parse();

