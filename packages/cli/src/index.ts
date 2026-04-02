import { Command } from 'commander';
import { init } from './commands/init';
import { add } from './commands/add';
import { sync } from './commands/sync';
import { generateManifest } from './commands/generate-manifest';

const program = new Command();

program.name('act-sdk').description('CLI for Act SDK').version('0.1.0');

program
  .command('init')
  .description('Scaffold Act SDK into your project')
  .option('--skip-install', 'Do not install dependencies automatically')
  .action(init);

program
  .command('add')
  .description('Add the Act chat widget component to your project')
  .argument('<component>', 'Component to add (chat)')
  .option('--skip-install', 'Do not install dependencies automatically')
  .action(async (component: string, opts: { skipInstall?: boolean }) => {
    await add(component, opts);
  });

program
  .command('sync')
  .description('Sync action and route definitions to the cloud')
  .option('-c, --config <path>', 'Path to config file', 'act-sdk.config.ts')
  .option('-p, --project <path>', 'Project path', process.cwd())
  .action(sync);

program
  .command('generate-manifest')
  .description('Generate act.manifest.json from discovered Act actions and routes')
  .option('-c, --config <path>', 'Path to config file', 'act-sdk.config.ts')
  .option('-p, --project <path>', 'Project path', process.cwd())
  .action(generateManifest);

program.parse();
