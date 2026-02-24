'use client';

import { useAct } from '@act-sdk/react';
import { useState, useRef, useEffect } from 'react';
import type { CSSProperties, ReactNode } from 'react';
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
} from 'lucide-react';

type GenericPart = {
  type: string;
  text?: string;
  state?: string;
  toolCallId?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

function getTextParts(parts: GenericPart[] = []) {
  return parts.filter((part) => part.type === 'text' && typeof part.text === 'string');
}

function getToolParts(parts: GenericPart[] = []) {
  return parts.filter((part) => part.type.startsWith('tool-'));
}

function normalizeUnknown(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function formatJson(value: unknown) {
  if (value === undefined || value === null) return null;
  const parsed = normalizeUnknown(value);
  if (typeof parsed === 'string') return parsed;
  try {
    return JSON.stringify(parsed, null, 2);
  } catch {
    return String(parsed);
  }
}

function ToolStateBadge({ state }: { state?: string }) {
  if (state === 'output-available') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-300">
        <CheckCircle2 className="h-3 w-3" />
        Success
      </span>
    );
  }

  if (state === 'output-error') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-rose-300">
        <AlertTriangle className="h-3 w-3" />
        Error
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
      <Loader2 className="h-3 w-3 animate-spin" />
      Running
    </span>
  );
}

function ToolCallCard({ part }: { part: GenericPart }) {
  const [open, setOpen] = useState(
    part.state === 'output-available' || part.state === 'output-error',
  );
  const input = formatJson(part.input);
  const output = formatJson(part.output);

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

          {part.state === 'output-error' && part.errorText && (
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
  );
}

function ToolJsonBlock({
  title,
  tone,
  children,
}: {
  title: string;
  tone: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-(--copilot-border) bg-(--copilot-bubble)/70 p-2">
      <p className={['mb-1 text-[10px] uppercase tracking-wide', tone].join(' ')}>{title}</p>
      <pre className="overflow-x-auto whitespace-pre-wrap break-all text-[11px] leading-relaxed text-(--copilot-fg)/90">
        {children}
      </pre>
    </div>
  );
}

export function ActAgent() {
  const { messages, send, clearMessages, status } = useAct();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loading = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [open, messages, status]);

  function handleSend(text?: string) {
    const value = (text ?? input).trim();
    if (!value || loading) return;
    send(value);
    setInput('');
  }

  const style = {
    '--copilot-bg': '#09090b',
    '--copilot-fg': '#fafafa',
    '--copilot-border': '#27272a',
    '--copilot-bubble': '#18181b',
    '--copilot-hover': '#27272a',
    '--copilot-muted': '#a1a1aa',
    '--copilot-active': '#22c55e',
    '--copilot-input-bg': '#18181b',
  } as CSSProperties;

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
          'fixed bottom-24 right-6 z-50 flex flex-col',
          'w-[340px] sm:w-[380px]',
          'h-[min(80vh,46rem)]',
          'bg-(--copilot-bg) text-(--copilot-fg)',
          'border border-(--copilot-border)',
          'rounded-2xl shadow-2xl overflow-hidden',
          'transition-all duration-300 ease-out origin-bottom-right',
          open
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none',
        ].join(' ')}
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
            const textParts = getTextParts(m.parts as GenericPart[]);
            const toolParts = getToolParts(m.parts as GenericPart[]);

            return (
              <div key={m.id} className="space-y-2">
                {textParts.length > 0 && (
                  <div
                    className={['flex', m.role === 'user' ? 'justify-end' : 'justify-start'].join(
                      ' ',
                    )}
                  >
                    <div
                      className={[
                        'max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap',
                        m.role === 'user'
                          ? 'bg-(--copilot-fg) text-(--copilot-bg) rounded-br-sm'
                          : 'bg-(--copilot-bubble) text-(--copilot-fg) rounded-bl-sm',
                      ].join(' ')}
                    >
                      {textParts.map((part, i) => (
                        <p key={i} className={i > 0 ? 'mt-2' : ''}>
                          {part.text}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {toolParts.length > 0 && (
                  <div
                    className={['flex', m.role === 'user' ? 'justify-end' : 'justify-start'].join(
                      ' ',
                    )}
                  >
                    <div className="w-full max-w-[90%] space-y-2">
                      {toolParts.map((part, i) => (
                        <ToolCallCard key={part.toolCallId ?? part.type + '-' + i} part={part} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-(--copilot-bubble) px-4 py-2.5 rounded-xl rounded-bl-sm">
                <span className="flex gap-1 items-center h-4">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-(--copilot-muted) animate-bounce"
                      style={{ animationDelay: i * 0.15 + 's' }}
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
              e.preventDefault();
              handleSend();
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
        aria-label={open ? 'Close ACT-SDK Agent' : 'Open ACT-SDK Agent'}
        aria-expanded={open}
        className={[
          'fixed bottom-6 right-6 z-50',
          'w-14 h-14 rounded-full shadow-xl',
          'flex items-center justify-center',
          'bg-(--copilot-fg) text-(--copilot-bg)',
          'transition-all duration-300 ease-out',
          'hover:scale-105 active:scale-95',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--copilot-fg) focus-visible:ring-offset-2',
          'rotate-0',
        ].join(' ')}
      >
        <span
          className={[
            'absolute transition-all duration-200',
            open ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-75',
          ].join(' ')}
          aria-hidden="true"
        >
          <X className="w-5 h-5" />
        </span>
        <span
          className={[
            'absolute transition-all duration-200',
            open ? 'opacity-0 -rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100',
          ].join(' ')}
          aria-hidden="true"
        >
          <Sparkles className="w-5 h-5" />
        </span>
      </button>
    </div>
  );
}
