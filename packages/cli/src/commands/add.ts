import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import prompts from 'prompts';
import { execa } from 'execa';

const COMPONENTS: Record<string, { normalized: 'chat'; generate: () => string }> = {
  chat: {
    normalized: 'chat',
    generate: generateChat,
  },
  command: {
    normalized: 'chat',
    generate: generateChat,
  },
};

async function detectPackageManager(cwd: string): Promise<'pnpm' | 'npm' | 'yarn' | 'bun'> {
  if (await fs.pathExists(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (await fs.pathExists(path.join(cwd, 'yarn.lock'))) return 'yarn';
  if (await fs.pathExists(path.join(cwd, 'bun.lockb'))) return 'bun';
  if (await fs.pathExists(path.join(cwd, 'package-lock.json'))) return 'npm';
  const ua = process.env['npm_config_user_agent']?.toLowerCase() ?? '';
  if (ua.includes('pnpm')) return 'pnpm';
  if (ua.includes('yarn')) return 'yarn';
  if (ua.includes('bun')) return 'bun';
  return 'npm';
}

async function installDeps(cwd: string, deps: string[]) {
  const pm = await detectPackageManager(cwd);
  const cmd = pm === 'pnpm' ? 'pnpm' : pm === 'yarn' ? 'yarn' : pm === 'bun' ? 'bun' : 'npm';
  const args = pm === 'npm' ? ['install', ...deps] : ['add', ...deps];
  await execa(cmd, args, { cwd, stdio: 'inherit' });
  return pm;
}

export async function add(component: string, options?: { skipInstall?: boolean }) {
  const componentDef = COMPONENTS[component];

  if (!componentDef) {
    console.log(chalk.red(`\n  Unknown component: ${component}`));
    console.log(`  Available: ${Object.keys(COMPONENTS).join(', ')}\n`);
    return;
  }

  const { normalized, generate } = componentDef;
  const { outputPath } = await prompts({
    type: 'text',
    name: 'outputPath',
    message: 'Where to put the component?',
    initial: `components/act-sdk/${normalized}.tsx`,
  });

  if (!outputPath) return;

  const spinner = ora(`Adding ${normalized}...`).start();
  const cwd = process.cwd();

  try {
    await fs.outputFile(path.join(cwd, outputPath), generate());

    if (!options?.skipInstall) {
      spinner.text = 'Installing chat widget dependencies...';
      await installDeps(cwd, ['lucide-react']);
    }

    spinner.succeed(`Added ${chalk.cyan(normalized)} to ${chalk.cyan(outputPath)}`);
    console.log(chalk.dim(`\n  Import it with:`));
    console.log(
      `  import { Act${toPascal(normalized)} } from "@/${outputPath.replace(/\.tsx$/, '').replace(/\\/g, '/')}"\n`,
    );
    console.log(chalk.dim(`  Mount it anywhere in your app to give users a simple chat widget.\n`));
  } catch (err) {
    spinner.fail(chalk.red(`Failed to add ${normalized}`));
    throw err;
  }
}

function toPascal(str: string) {
  return str
    .split('-')
    .map((s) => s[0]!.toUpperCase() + s.slice(1))
    .join('');
}

function generateChat() {
  return `"use client"

import { useAct } from "@act-sdk/react"
import { useMemo, useState } from "react"
import { MessageSquareIcon, SendIcon, SparklesIcon, XIcon } from "lucide-react"

const EXAMPLE_PROMPTS = [
  "Where do I find billing?",
  "Update user user@gmail.com to admin",
  "Open the customer settings page",
]

export function ActChat() {
  const { messages, send, status } = useAct()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")

  const loading = status === "submitted" || status === "streaming"
  const visibleMessages = useMemo(
    () =>
      messages.flatMap((message) =>
        message.parts
          ?.filter((part) => part.type === "text")
          .map((part) => ({
            id: message.id,
            role: message.role,
            text: part.text,
          })) ?? []
      ),
    [messages]
  )

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const value = input.trim()
    if (!value || loading) return
    send(value)
    setInput("")
  }

  function handleSelect(prompt: string) {
    if (loading) return
    send(prompt)
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[32rem] w-[24rem] flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-white">
                <SparklesIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">Act Chat</p>
                <p className="text-xs text-zinc-500">Ask your app to navigate or take action</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
              aria-label="Close chat"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-zinc-50 px-4 py-4">
            {visibleMessages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-zinc-600">Try one of these:</p>
                <div className="flex flex-col gap-2">
                  {EXAMPLE_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleSelect(prompt)}
                      className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-left text-sm text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-100"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              visibleMessages.map((message, index) => (
                <div
                  key={message.id + "-" + index}
                  className={
                    message.role === "user"
                      ? "ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-zinc-900 px-3 py-2 text-sm text-white"
                      : "max-w-[85%] rounded-2xl rounded-bl-md bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm"
                  }
                >
                  {message.text}
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-zinc-200 bg-white p-3">
            <div className="flex items-end gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask the app to do something..."
                aria-label="Ask in natural language"
                disabled={loading}
                rows={2}
                className="max-h-28 min-h-[2.5rem] flex-1 resize-none border-0 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
              />
              <button
                type="submit"
                disabled={loading || input.trim().length === 0}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
                aria-label="Send message"
              >
                <SendIcon className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-900 shadow-xl transition-all hover:scale-105 hover:bg-zinc-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        aria-label="Open chat widget"
      >
        <MessageSquareIcon className="h-5 w-5" />
      </button>
    </>
  )
}
`;
}
