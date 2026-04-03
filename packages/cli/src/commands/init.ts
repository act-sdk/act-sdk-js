import prompts from 'prompts';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { execa } from 'execa';

type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun';
type Framework = 'stdio' | 'nextjs' | 'express' | 'hono';

interface InitOptions {
  skipInstall?: boolean;
}

async function detectPackageManager(cwd: string): Promise<PackageManager> {
  if (await fs.pathExists(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (await fs.pathExists(path.join(cwd, 'yarn.lock'))) return 'yarn';
  if (await fs.pathExists(path.join(cwd, 'bun.lockb'))) return 'bun';
  if (await fs.pathExists(path.join(cwd, 'package-lock.json'))) return 'npm';

  const userAgent = process.env['npm_config_user_agent']?.toLowerCase() ?? '';
  if (userAgent.includes('pnpm')) return 'pnpm';
  if (userAgent.includes('yarn')) return 'yarn';
  if (userAgent.includes('bun')) return 'bun';

  return 'npm';
}

async function installDependencies(
  cwd: string,
  deps: string[],
  packageManager: PackageManager,
): Promise<void> {
  if (packageManager === 'pnpm') {
    await execa('pnpm', ['add', ...deps], { cwd, stdio: 'inherit' });
  } else if (packageManager === 'yarn') {
    await execa('yarn', ['add', ...deps], { cwd, stdio: 'inherit' });
  } else if (packageManager === 'bun') {
    await execa('bun', ['add', ...deps], { cwd, stdio: 'inherit' });
  } else {
    await execa('npm', ['install', ...deps], { cwd, stdio: 'inherit' });
  }
}

function getConfigTemplate(framework: Framework): string {
  return `import { createAct, defineConfig } from '@act-sdk/core';
import { z } from 'zod';

const act = createAct();

// Example action
act.action({
  id: 'greet',
  description: 'Greet a user',
  input: z.object({
    name: z.string().describe('The name of the person to greet'),
  }),
  handler: async ({ name }) => {
    return \`Hello, \${name}!\`;
  },
});

export default defineConfig({
  name: 'my-mcp-server',
  description: 'My MCP server',
  version: '1.0.0',
  act,
});
`;
}

function getStdioHandlerTemplate(): string {
  return `import config from './act-sdk.config.js';
import { createStdioServer } from '@act-sdk/adapters/stdio';

createStdioServer(config);
`;
}

function getNextjsHandlerTemplate(): string {
  return `import config from '@/act-sdk.config';
import { createNextHandler } from '@act-sdk/adapters/nextjs';

// Optional: Add authentication
// export const { GET, POST, DELETE } = createNextHandler(config, {
//   auth: async (req) => {
//     const token = req.headers.get('authorization')?.split(' ')[1];
//     if (!token) return null;
//     // Verify token and return user info
//     return { userId: '123', role: 'admin' };
//   },
// });

export const { GET, POST, DELETE } = createNextHandler(config);
`;
}

function getFrameworkInstructions(framework: Framework, cwd: string): string {
  switch (framework) {
    case 'stdio':
      return `
${chalk.green('✓')} STDIO handler created at ${chalk.cyan('src/mcp-server.ts')}

${chalk.bold('Next steps:')}
1. Add your actions to ${chalk.cyan('act-sdk.config.ts')}
2. Build and run your server:
   ${chalk.cyan('npx tsx src/mcp-server.ts')}

3. Configure in Claude Desktop (${chalk.cyan('~/Library/Application Support/Claude/claude_desktop_config.json')}):
   {
     "mcpServers": {
       "my-mcp-server": {
         "command": "npx",
         "args": ["tsx", "${path.join(cwd, 'src/mcp-server.ts')}"]
       }
     }
   }
`;

    case 'nextjs':
      return `
${chalk.green('✓')} Next.js handler created at ${chalk.cyan('app/api/mcp/route.ts')}

${chalk.bold('Next steps:')}
1. Add your actions to ${chalk.cyan('act-sdk.config.ts')}
2. Start your Next.js dev server:
   ${chalk.cyan('npm run dev')}

3. Your MCP endpoint will be available at:
   ${chalk.cyan('http://localhost:3000/api/mcp')}

4. Configure in Claude Desktop:
   {
     "mcpServers": {
       "my-mcp-server": {
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/inspector", "http://localhost:3000/api/mcp"]
       }
     }
   }
`;

    case 'express':
    case 'hono':
      return `
${chalk.yellow('⚠')} ${framework.toUpperCase()} adapter is coming soon!

For now, you can:
1. Use ${chalk.cyan('STDIO')} or ${chalk.cyan('Next.js')} adapters
2. Check back later for ${framework} support

${chalk.bold('Config file created:')} ${chalk.cyan('act-sdk.config.ts')}
`;

    default:
      return '';
  }
}

export async function init(options: InitOptions): Promise<void> {
  const cwd = process.cwd();

  console.log(chalk.bold('\n🚀 Act-SDK Initialization\n'));

  // Check if already initialized
  const configPath = path.join(cwd, 'act-sdk.config.ts');
  if (await fs.pathExists(configPath)) {
    console.log(chalk.yellow('⚠ act-sdk.config.ts already exists!'));
    const { overwrite } = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: 'Overwrite existing configuration?',
      initial: false,
    });

    if (!overwrite) {
      console.log(chalk.gray('Cancelled.'));
      return;
    }
  }

  // Prompt for framework
  const { framework } = await prompts({
    type: 'select',
    name: 'framework',
    message: 'Choose your framework:',
    choices: [
      { title: 'STDIO (Command-line)', value: 'stdio' },
      { title: 'Next.js', value: 'nextjs' },
      { title: 'Express (Coming Soon)', value: 'express', disabled: true },
      { title: 'Hono (Coming Soon)', value: 'hono', disabled: true },
    ],
    initial: 0,
  });

  if (!framework) {
    console.log(chalk.gray('Cancelled.'));
    return;
  }

  const spinner = ora('Creating configuration...').start();

  try {
    // Create act-sdk.config.ts
    await fs.writeFile(configPath, getConfigTemplate(framework));
    spinner.succeed('Configuration created');

    // Create handler file based on framework
    if (framework === 'stdio') {
      const handlerPath = path.join(cwd, 'src', 'mcp-server.ts');
      await fs.ensureDir(path.dirname(handlerPath));
      await fs.writeFile(handlerPath, getStdioHandlerTemplate());
      spinner.succeed('STDIO handler created');
    } else if (framework === 'nextjs') {
      const handlerPath = path.join(cwd, 'app', 'api', 'mcp', 'route.ts');
      await fs.ensureDir(path.dirname(handlerPath));
      await fs.writeFile(handlerPath, getNextjsHandlerTemplate());
      spinner.succeed('Next.js handler created');
    }

    // Install dependencies
    if (!options.skipInstall) {
      const packageManager = await detectPackageManager(cwd);
      spinner.start('Installing dependencies...');

      const baseDeps = ['@act-sdk/core', 'zod'];
      const adapterDeps =
        framework === 'stdio' || framework === 'nextjs' ? ['@act-sdk/adapters'] : [];

      await installDependencies(cwd, [...baseDeps, ...adapterDeps], packageManager);
      spinner.succeed('Dependencies installed');
    }

    console.log(getFrameworkInstructions(framework, cwd));
  } catch (error) {
    spinner.fail('Failed to initialize');
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}
