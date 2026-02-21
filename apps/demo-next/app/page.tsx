'use client';

import { ActProvider, useAct } from '@act-sdk/react';
import { act, actSdkConfig } from '@/act-sdk.config';
import { useState, useRef, useEffect } from 'react';
import { z } from 'zod';

// ── Native app functions wrapped with act.action ──────────
// These work from buttons AND from the AI chat
function useCalculatorActions(
  setResult: (r: number | string) => void,
  setHistory: (fn: (h: string[]) => string[]) => void,
) {
  const add = act.action({
    id: 'add_numbers',
    description: 'Add two numbers together',
    input: z.object({ a: z.number(), b: z.number() }),
  })(async ({ a, b }) => {
    const result = a + b;
    setResult(result);
    setHistory((h) => [`${a} + ${b} = ${result}`, ...h.slice(0, 9)]);
  });

  const subtract = act.action({
    id: 'subtract_numbers',
    description: 'Subtract one number from another',
    input: z.object({ a: z.number(), b: z.number() }),
  })(async ({ a, b }) => {
    const result = a - b;
    setResult(result);
    setHistory((h) => [`${a} - ${b} = ${result}`, ...h.slice(0, 9)]);
  });

  const multiply = act.action({
    id: 'multiply_numbers',
    description: 'Multiply two numbers together',
    input: z.object({ a: z.number(), b: z.number() }),
  })(async ({ a, b }) => {
    const result = a * b;
    setResult(result);
    setHistory((h) => [`${a} × ${b} = ${result}`, ...h.slice(0, 9)]);
  });

  const divide = act.action({
    id: 'divide_numbers',
    description: 'Divide one number by another',
    input: z.object({ a: z.number(), b: z.number() }),
  })(async ({ a, b }) => {
    if (b === 0) {
      setResult('Cannot divide by zero');
      return;
    }
    const result = a / b;
    setResult(result);
    setHistory((h) => [`${a} ÷ ${b} = ${result}`, ...h.slice(0, 9)]);
  });

  return { add, subtract, multiply, divide };
}

// ── Root — provider wraps everything ─────────────────────
export default function Page() {
  const [result, setResult] = useState<number | string>('—');
  const [history, setHistory] = useState<string[]>([]);

  // Actions have access to state setters — same state updated by buttons OR AI
  const actions = useCalculatorActions(setResult, setHistory);

  return (
    <ActProvider act={act} config={actSdkConfig}>
      <App result={result} history={history} actions={actions} />
    </ActProvider>
  );
}

// ── Main app layout ───────────────────────────────────────
function App({
  result,
  history,
  actions,
}: {
  result: number | string;
  history: string[];
  actions: ReturnType<typeof useCalculatorActions>;
}) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');

  const numA = parseFloat(a) || 0;
  const numB = parseFloat(b) || 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row">
      {/* ── Left: Real calculator UI ── */}
      <div className="md:w-1/2 flex flex-col gap-6 p-8 border-r border-zinc-800">
        {/* Title */}
        <div>
          <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">
            Act SDK — Demo
          </span>
          <h1 className="text-2xl font-bold mt-1">Calculator</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Buttons and AI call the{' '}
            <span className="text-zinc-300 font-mono text-xs bg-zinc-900 px-1.5 py-0.5 rounded">
              same function
            </span>
          </p>
        </div>

        {/* Inputs */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-zinc-500 block mb-1">A</label>
            <input
              type="number"
              value={a}
              onChange={(e) => setA(e.target.value)}
              placeholder="0"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-2xl font-mono outline-none focus:border-zinc-600 transition-colors"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-zinc-500 block mb-1">B</label>
            <input
              type="number"
              value={b}
              onChange={(e) => setB(e.target.value)}
              placeholder="0"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-2xl font-mono outline-none focus:border-zinc-600 transition-colors"
            />
          </div>
        </div>

        {/* Buttons — call wrapped functions directly */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: '+ Add', fn: () => actions.add({ a: numA, b: numB }) },
            { label: '− Subtract', fn: () => actions.subtract({ a: numA, b: numB }) },
            { label: '× Multiply', fn: () => actions.multiply({ a: numA, b: numB }) },
            { label: '÷ Divide', fn: () => actions.divide({ a: numA, b: numB }) },
          ].map(({ label, fn }) => (
            <button
              key={label}
              onClick={fn}
              className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl py-4 text-lg font-semibold transition-colors"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Result — updates whether button OR AI called the function */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-6 py-5">
          <p className="text-xs text-zinc-500 mb-2">Result</p>
          <p className="text-5xl font-mono font-bold tracking-tight">{result}</p>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-2">
              History
            </p>
            <div className="space-y-1.5">
              {history.map((h, i) => (
                <div
                  key={i}
                  className="text-sm font-mono text-zinc-400 bg-zinc-900 px-4 py-2 rounded-lg"
                >
                  {h}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Right: Chat ── */}
      <div className="md:w-1/2 flex flex-col">
        <Chat />
      </div>
    </div>
  );
}

// ── Chat uses useAct — same act instance, same functions ──
function Chat() {
  const { messages, send, status, actions } = useAct();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const isLoading = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    send(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full min-h-screen md:min-h-0">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">AI Assistant</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-zinc-500">live</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {/* Empty state suggestions */}
        {messages.length === 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs text-zinc-600 uppercase tracking-widest font-semibold">
              Try asking
            </p>
            {[
              'Add 25 and 17',
              'What is 144 divided by 12?',
              'Multiply 8 by 9',
              'Subtract 33 from 100',
            ].map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="w-full text-left text-sm text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 px-4 py-2.5 rounded-lg transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Message list */}
        {messages.map((message) => (
          <div key={message.id} className="space-y-2">
            {message.parts.map((part, i) => {
              // Text bubble
              if (part.type === 'text' && part.text) {
                return (
                  <div
                    key={i}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs text-sm rounded-2xl px-4 py-2.5 leading-relaxed ${
                        message.role === 'user'
                          ? 'bg-zinc-100 text-zinc-900 rounded-br-sm'
                          : 'bg-zinc-900 text-zinc-100 rounded-bl-sm'
                      }`}
                    >
                      {part.text}
                    </div>
                  </div>
                );
              }

              // Tool call states
              if (part.type === 'tool-executeAction') {
                const id = part.toolCallId;
                switch (part.state) {
                  case 'input-streaming':
                    return (
                      <ToolBadge
                        key={id}
                        icon="⏳"
                        className="text-zinc-500 bg-zinc-900 border-zinc-800"
                      >
                        Thinking...
                      </ToolBadge>
                    );

                  case 'output-available': {
                    const out = part.output as {
                      actionId: string;
                      status: string;
                      payload: unknown;
                    };
                    return (
                      <ToolBadge
                        key={id}
                        icon={out.status === 'success' ? '✓' : '✕'}
                        className={
                          out.status === 'success'
                            ? 'text-emerald-300 bg-emerald-950 border-emerald-900'
                            : 'text-red-300 bg-red-950 border-red-900'
                        }
                      >
                        <span className="font-mono">{out.actionId}</span>
                        <span className="opacity-60 ml-1 text-xs">→ result updated</span>
                      </ToolBadge>
                    );
                  }
                  case 'output-error':
                    return (
                      <ToolBadge
                        key={id}
                        icon="✕"
                        className="text-red-300 bg-red-950 border-red-900"
                      >
                        {part.errorText}
                      </ToolBadge>
                    );
                }
              }
            })}
          </div>
        ))}

        {/* Loading dots */}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex gap-1 px-4 py-3 bg-zinc-900 rounded-2xl rounded-bl-sm w-fit">
            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 px-6 py-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me to calculate..."
            disabled={isLoading}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-zinc-600 transition-colors disabled:opacity-50 placeholder:text-zinc-600"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-zinc-100 text-zinc-900 font-semibold text-sm px-5 rounded-xl hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
        <p className="text-xs text-zinc-700 text-center mt-2">
          AI calls the same functions as the buttons above
        </p>
      </div>
    </div>
  );
}

// ── Tool badge component ──────────────────────────────────
function ToolBadge({
  icon,
  className,
  children,
}: {
  icon: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${className}`}
    >
      <span>{icon}</span>
      <span>{children}</span>
    </div>
  );
}
