import { Command } from 'commander';
import { init } from './commands/init';
import { add } from './commands/add';
import { sync } from './commands/sync';

const program = new Command();

program.name('act-sdk').description('CLI for Act SDK').version('0.1.0');

program.command('init').description('Scaffold Act SDK into your project').action(init);

program
  .command('add')
  .description('Add a UI component to your project')
  .argument('<component>', 'Component to add e.g. agent')
  .action(add);

program
  .command('sync')
  .description('Sync action definitions to the cloud')
  .option('-c, --config <path>', 'Path to config file', 'act-sdk.config.ts')
  .option('-p, --project <path>', 'Project path', process.cwd())
  .action(sync);

program.parse();
