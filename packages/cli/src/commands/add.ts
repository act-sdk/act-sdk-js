import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import prompts from 'prompts';

const COMPONENTS: Record<string, () => string> = {
  chatbot: generateChatbot,
  'command-bar': generateCommandBar,
};

export async function add(component: string) {
  if (!COMPONENTS[component]) {
    console.log(chalk.red(`\n  Unknown component: ${component}`));
    console.log(`  Available: ${Object.keys(COMPONENTS).join(', ')}\n`);
    return;
  }

  const { outputPath } = await prompts({
    type: 'text',
    name: 'outputPath',
    message: 'Where to put the component?',
    initial: `components/act/${component}.tsx`,
  });

  const spinner = ora(`Adding ${component}...`).start();

  await fs.outputFile(path.join(process.cwd(), outputPath), COMPONENTS[component]!());

  spinner.succeed(`Added ${chalk.cyan(component)} to ${chalk.cyan(outputPath)}`);
  console.log(chalk.dim(`\n  Import it with:`));
  console.log(
    `  import { Act${toPascal(component)} } from "@/${outputPath.replace('.tsx', '')}"\n`,
  );
}

function toPascal(str: string) {
  return str
    .split('-')
    .map((s) => s[0]!.toUpperCase() + s.slice(1))
    .join('');
}

function generateChatbot() {
  return `"use client"

import { useAct } from "@act/react"
import { useState } from "react"

export function ActChatbot() {
  const { messages, send } = useAct()
  const [input, setInput] = useState("")

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id}>
            {message.parts.map((part, i) => {
              switch (part.type) {
                case "text":
                  return (
                    <div
                      key={i}
                      className={\`flex \${message.role === "user" ? "justify-end" : "justify-start"}\`}
                    >
                      <div
                        className={\`rounded-2xl px-4 py-2 max-w-sm text-sm \${
                          message.role === "user"
                            ? "bg-zinc-900 text-white"
                            : "bg-zinc-100 text-zinc-900"
                        }\`}
                      >
                        {part.text}
                      </div>
                    </div>
                  )

                case "tool-execute_action": {
                  const callId = part.toolCallId
                  switch (part.state) {
                    case "input-streaming":
                      return <ActionCard key={callId} state="loading">Thinking...</ActionCard>
                    case "input-available":
                      return (
                        <ActionCard key={callId} state="running">
                          Running <strong>{part.input.actionId}</strong>
                        </ActionCard>
                      )
                    case "output-available": {
                      const output = JSON.parse(part.output)
                      return (
                        <ActionCard key={callId} state={output.status}>
                          <span className="font-medium">{output.actionId}</span>
                          {output.payload && (
                            <pre className="text-xs mt-1 opacity-60">
                              {JSON.stringify(output.payload, null, 2)}
                            </pre>
                          )}
                        </ActionCard>
                      )
                    }
                    case "output-error":
                      return <ActionCard key={callId} state="error">{part.errorText}</ActionCard>
                  }
                  break
                }
              }
            })}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!input.trim()) return
          send(input)
          setInput("")
        }}
        className="p-4 border-t flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me to do something..."
          className="flex-1 rounded-lg border px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="rounded-lg bg-zinc-900 text-white px-4 py-2 text-sm disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  )
}

type CardState = "loading" | "running" | "success" | "error"

const cardStyles: Record<CardState, string> = {
  loading: "bg-zinc-100 text-zinc-500 border-zinc-200",
  running: "bg-blue-50 text-blue-700 border-blue-200",
  success: "bg-green-50 text-green-700 border-green-200",
  error:   "bg-red-50 text-red-700 border-red-200",
}

const cardIcons: Record<CardState, string> = {
  loading: "⏳",
  running: "⚡",
  success: "✓",
  error:   "✕",
}

function ActionCard({ state, children }: { state: CardState; children: React.ReactNode }) {
  return (
    <div className={\`rounded-xl border px-4 py-3 text-sm flex gap-3 items-start my-1 \${cardStyles[state]}\`}>
      <span className="mt-0.5">{cardIcons[state]}</span>
      <div className="flex-1">{children}</div>
    </div>
  )
}
`;
}

function generateCommandBar() {
  return `"use client"

import { useAct } from "@act/react"
import { useEffect, useState } from "react"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command"

export function ActCommandBar() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const { send, actions } = useAct()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const handleSelect = async (actionId: string) => {
    setOpen(false)
    await send(actionId)
  }

  const handleSubmit = async () => {
    if (!input.trim()) return
    setOpen(false)
    await send(input)
    setInput("")
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Ask me to do something..."
        value={input}
        onValueChange={setInput}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
      />
      <CommandList>
        <CommandEmpty>Press enter to send your message</CommandEmpty>
        {actions.map((action) => (
          <CommandItem
            key={action.id}
            value={action.id}
            onSelect={() => handleSelect(action.description)}
          >
            <span className="font-medium">{action.description}</span>
            <span className="ml-2 text-xs text-muted-foreground">{action.id}</span>
          </CommandItem>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
`;
}
