import { Command } from 'commander';
import { init } from './commands/init';
import { add } from './commands/add';
import { generate } from './commands/generate';

const program = new Command();

program.name('act-sdk').description('CLI for Act SDK').version('0.1.0');

program.command('init').description('Scaffold Act SDK into your project').action(init);

program
  .command('add')
  .description('Add a UI component to your project')
  .argument('<component>', 'Component to add e.g. chatbot, command-bar')
  .action(add);

program
  .command('generate')
  .description('Generate action definitions from wrapped functions')
  .option('-o, --output <path>', 'Output path for config', 'act-sdk.config.ts')
  .action(generate);

program.parse();
