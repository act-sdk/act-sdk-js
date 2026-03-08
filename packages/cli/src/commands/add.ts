import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import prompts from 'prompts';
import { execa } from 'execa';

const COMPONENTS: Record<string, () => string> = {
  command: generateCommand,
};

/** shadcn/ui dependencies for the command palette */
const COMMAND_DEPS = [
  'cmdk',
  '@radix-ui/react-dialog',
  'lucide-react',
  'clsx',
  'tailwind-merge',
];

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
  if (!COMPONENTS[component]) {
    console.log(chalk.red(`\n  Unknown component: ${component}`));
    console.log(`  Available: ${Object.keys(COMPONENTS).join(', ')}\n`);
    return;
  }

  const { outputPath } = await prompts({
    type: 'text',
    name: 'outputPath',
    message: 'Where to put the component?',
    initial: `components/act-sdk/${component}.tsx`,
  });

  if (!outputPath) return;

  const spinner = ora(`Adding ${component}...`).start();
  const cwd = process.cwd();

  try {
    await fs.outputFile(path.join(cwd, outputPath), COMPONENTS[component]!());

    if (component === 'command') {
      if (!options?.skipInstall) {
        spinner.text = 'Installing shadcn dependencies (cmdk, dialog, lucide-react)...';
        await installDeps(cwd, COMMAND_DEPS);
      }

      const uiDir = path.join(cwd, 'components', 'ui');
      const commandPath = path.join(uiDir, 'command.tsx');
      const dialogPath = path.join(uiDir, 'dialog.tsx');
      const utilsPath = path.join(cwd, 'lib', 'utils.ts');

      if (!(await fs.pathExists(commandPath))) {
        await fs.ensureDir(uiDir);
        await fs.outputFile(commandPath, generateCommandUI());
      }
      if (!(await fs.pathExists(dialogPath))) {
        await fs.ensureDir(uiDir);
        await fs.outputFile(dialogPath, generateDialogUI());
      }
      if (!(await fs.pathExists(utilsPath))) {
        await fs.ensureDir(path.join(cwd, 'lib'));
        await fs.outputFile(utilsPath, generateUtils());
      }
    }

    spinner.succeed(`Added ${chalk.cyan(component)} to ${chalk.cyan(outputPath)}`);
    console.log(chalk.dim(`\n  Import it with:`));
    console.log(
      `  import { Act${toPascal(component)} } from "@/${outputPath.replace(/\.tsx$/, '').replace(/\\/g, '/')}"\n`,
    );
    if (component === 'command') {
      console.log(chalk.dim(`  Press ${chalk.cyan('⌘K')} or ${chalk.cyan('Ctrl+K')} to open the command palette.\n`));
    }
  } catch (err) {
    spinner.fail(chalk.red(`Failed to add ${component}`));
    throw err;
  }
}

function toPascal(str: string) {
  return str
    .split('-')
    .map((s) => s[0]!.toUpperCase() + s.slice(1))
    .join('');
}

function generateCommand() {
  return `"use client"

import { useAct } from "@act-sdk/react"
import { useEffect, useState } from "react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { SparklesIcon } from "lucide-react"

const EXAMPLE_PROMPTS = [
  "Add 5 and 3",
  "Multiply the numbers in the dashboard",
  "Subtract 10 from 20",
  "What is 100 divided by 4?",
]

export function ActCommand() {
  const { send, status } = useAct()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")

  const loading = status === "submitted" || status === "streaming"

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

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
    setOpen(false)
  }

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Command Palette"
        description="Type what you want to do and let actions run."
      >
        <form onSubmit={handleSubmit}>
          <CommandInput
            value={input}
            onValueChange={setInput}
            placeholder="Type what you want to do..."
            aria-label="Ask in natural language"
            disabled={loading}
          />
        </form>
        <CommandList>
          <CommandEmpty>Type what you want to do…</CommandEmpty>
          <CommandGroup heading="Suggestions">
            {EXAMPLE_PROMPTS.map((prompt) => (
              <CommandItem
                key={prompt}
                onSelect={() => handleSelect(prompt)}
              >
                <span>{prompt}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-900 shadow-xl transition-all hover:scale-105 hover:bg-zinc-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        aria-label="Open command palette"
      >
        <SparklesIcon className="h-5 w-5" />
      </button>
    </>
  )
}
`;
}

function generateCommandUI() {
  return `"use client"

import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import { SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
        className
      )}
      {...props}
    />
  )
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof Dialog> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className={cn("overflow-hidden p-0", className)}
        showCloseButton={showCloseButton}
      >
        <Command className="**:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div
      data-slot="command-input-wrapper"
      className="flex h-9 items-center gap-2 border-b px-3"
    >
      <SearchIcon className="size-4 shrink-0 opacity-50" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          "flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto",
        className
      )}
      {...props}
    />
  )
}

function CommandEmpty({
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className="py-6 text-center text-sm"
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("-mx-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
`;
}

function generateDialogUI() {
  return `"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import * as DialogPrimitive from "@radix-ui/react-dialog"

import { cn } from "@/lib/utils"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <button className="inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground">
            Close
          </button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
`;
}

function generateUtils() {
  return `import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
`;
}

function generateAgent() {
  return `"use client"

import { useAct } from "@act-sdk/react"
import { useState, useRef, useEffect } from "react"
import type { CSSProperties, ReactNode } from "react"
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react"

type GenericPart = {
  type: string
  text?: string
  state?: string
  toolCallId?: string
  input?: unknown
  output?: unknown
  errorText?: string
}

function getTextParts(parts: GenericPart[] = []) {
  return parts.filter((part) => part.type === "text" && typeof part.text === "string")
}

function getToolParts(parts: GenericPart[] = []) {
  return parts.filter((part) => part.type.startsWith("tool-"))
}

function normalizeUnknown(value: unknown): unknown {
  if (typeof value !== "string") return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function formatJson(value: unknown) {
  if (value === undefined || value === null) return null
  const parsed = normalizeUnknown(value)
  if (typeof parsed === "string") return parsed
  try {
    return JSON.stringify(parsed, null, 2)
  } catch {
    return String(parsed)
  }
}

function ToolStateBadge({ state }: { state?: string }) {
  if (state === "output-available") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-300">
        <CheckCircle2 className="h-3 w-3" />
        Success
      </span>
    )
  }

  if (state === "output-error") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-rose-300">
        <AlertTriangle className="h-3 w-3" />
        Error
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
      <Loader2 className="h-3 w-3 animate-spin" />
      Running
    </span>
  )
}

function ToolCallCard({ part }: { part: GenericPart }) {
  const [open, setOpen] = useState(part.state === "output-available" || part.state === "output-error")
  const input = formatJson(part.input)
  const output = formatJson(part.output)

  return (
    <div className="rounded-xl border border-(--copilot-border) bg-black/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-(--copilot-hover)"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-(--copilot-fg)/10 text-(--copilot-fg)">
              <Wrench className="h-3.5 w-3.5" />
            </span>
            <span className="truncate text-xs font-medium uppercase tracking-wide text-(--copilot-fg)/90">
              Action execution
            </span>
            <ToolStateBadge state={part.state} />
          </div>
          <p className="mt-1 text-[11px] text-(--copilot-muted)">Processing your request</p>
        </div>
        <span className="text-(--copilot-muted)">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
      </button>

      {open && (
        <div className="space-y-2 border-t border-(--copilot-border) px-3 py-2.5">
          {input && (
            <ToolJsonBlock title="Input" tone="text-sky-300">
              {input}
            </ToolJsonBlock>
          )}

          {part.state === "output-error" && part.errorText && (
            <div className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-2.5 py-2 text-xs text-rose-200">
              {part.errorText}
            </div>
          )}

          {output && (
            <ToolJsonBlock title="Output" tone="text-emerald-300">
              {output}
            </ToolJsonBlock>
          )}
        </div>
      )}
    </div>
  )
}

function ToolJsonBlock({
  title,
  tone,
  children,
}: {
  title: string
  tone: string
  children: ReactNode
}) {
  return (
    <div className="rounded-lg border border-(--copilot-border) bg-(--copilot-bubble)/70 p-2">
      <p className={["mb-1 text-[10px] uppercase tracking-wide", tone].join(" ")}>{title}</p>
      <pre className="overflow-x-auto whitespace-pre-wrap break-all text-[11px] leading-relaxed text-(--copilot-fg)/90">
        {children}
      </pre>
    </div>
  )
}

export function ActAgent() {
  const { messages, send, clearMessages, status } = useAct()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const loading = status === "submitted" || status === "streaming"

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150)
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [open, messages, status])

  function handleSend(text?: string) {
    const value = (text ?? input).trim()
    if (!value || loading) return
    send(value)
    setInput("")
  }

  const style = {
    "--copilot-bg": "#09090b",
    "--copilot-fg": "#fafafa",
    "--copilot-border": "#27272a",
    "--copilot-bubble": "#18181b",
    "--copilot-hover": "#27272a",
    "--copilot-muted": "#a1a1aa",
    "--copilot-active": "#22c55e",
    "--copilot-input-bg": "#18181b",
  } as CSSProperties

  return (
    <div style={style}>
      {open && (
        <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setOpen(false)} />
      )}

      <div
        role="dialog"
        aria-label="ACT-SDK Agent"
        aria-modal="true"
        className={[
          "fixed bottom-24 right-6 z-50 flex flex-col",
          "w-[340px] sm:w-[380px]",
          "h-[min(80vh,46rem)]",
          "bg-(--copilot-bg) text-(--copilot-fg)",
          "border border-(--copilot-border)",
          "rounded-2xl shadow-2xl overflow-hidden",
          "transition-all duration-300 ease-out origin-bottom-right",
          open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none",
        ].join(" ")}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-(--copilot-border)">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-(--copilot-fg)">
              <Sparkles className="w-3.5 h-3.5 text-(--copilot-bg)" />
            </span>
            <span className="text-sm font-semibold tracking-tight">ACT-SDK Agent</span>
            <span className="flex h-2 w-2 relative ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-(--copilot-fg) opacity-30" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-(--copilot-active)" />
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={clearMessages}
              aria-label="Reset conversation"
              className="p-1.5 rounded-lg hover:bg-(--copilot-hover) transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-(--copilot-muted)" />
            </button>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close ACT-SDK Agent"
              className="p-1.5 rounded-lg hover:bg-(--copilot-hover) transition-colors"
            >
              <ChevronDown className="w-4 h-4 text-(--copilot-muted)" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth">
          {messages.map((m) => {
            const textParts = getTextParts(m.parts as GenericPart[])
            const toolParts = getToolParts(m.parts as GenericPart[])

            return (
              <div key={m.id} className="space-y-2">
                {textParts.length > 0 && (
                  <div className={["flex", m.role === "user" ? "justify-end" : "justify-start"].join(" ")}>
                    <div
                      className={[
                        "max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap",
                        m.role === "user"
                          ? "bg-(--copilot-fg) text-(--copilot-bg) rounded-br-sm"
                          : "bg-(--copilot-bubble) text-(--copilot-fg) rounded-bl-sm",
                      ].join(" ")}
                    >
                      {textParts.map((part, i) => (
                        <p key={i} className={i > 0 ? "mt-2" : ""}>
                          {part.text}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {toolParts.length > 0 && (
                  <div className={["flex", m.role === "user" ? "justify-end" : "justify-start"].join(" ")}>
                    <div className="w-full max-w-[90%] space-y-2">
                      {toolParts.map((part, i) => (
                        <ToolCallCard key={part.toolCallId ?? part.type + "-" + i} part={part} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-(--copilot-bubble) px-4 py-2.5 rounded-xl rounded-bl-sm">
                <span className="flex gap-1 items-center h-4">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-(--copilot-muted) animate-bounce"
                      style={{ animationDelay: i * 0.15 + "s" }}
                    />
                  ))}
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-4 py-3 border-t border-(--copilot-border)">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-center gap-2 bg-(--copilot-input-bg) rounded-xl px-3 py-2"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What can I do for you today?"
              aria-label="Message ACT-SDK Agent"
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-(--copilot-muted) text-(--copilot-fg)"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={!input.trim() || loading}
              className="flex items-center justify-center w-7 h-7 rounded-lg bg-(--copilot-fg) text-(--copilot-bg) disabled:opacity-30 transition-opacity"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
          <p className="text-center text-[10px] text-(--copilot-muted) mt-2">
            ActSDK Agent can make mistakes. Please verify important actions and information.
          </p>
        </div>
      </div>

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close ACT-SDK Agent" : "Open ACT-SDK Agent"}
        aria-expanded={open}
        className={[
          "fixed bottom-6 right-6 z-50",
          "w-14 h-14 rounded-full shadow-xl",
          "flex items-center justify-center",
          "bg-(--copilot-fg) text-(--copilot-bg)",
          "transition-all duration-300 ease-out",
          "hover:scale-105 active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--copilot-fg) focus-visible:ring-offset-2",
          "rotate-0",
        ].join(" ")}
      >
        <span
          className={[
            "absolute transition-all duration-200",
            open ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-75",
          ].join(" ")}
          aria-hidden="true"
        >
          <X className="w-5 h-5" />
        </span>
        <span
          className={[
            "absolute transition-all duration-200",
            open ? "opacity-0 -rotate-90 scale-75" : "opacity-100 rotate-0 scale-100",
          ].join(" ")}
          aria-hidden="true"
        >
          <Sparkles className="w-5 h-5" />
        </span>
      </button>
    </div>
  )
}
`;
}
