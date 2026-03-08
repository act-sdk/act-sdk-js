'use client';

import { useAct } from '@act-sdk/react';
import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Message, MessageContent } from '@/components/ai-elements/message';
import { Conversation, ConversationContent } from '@/components/ai-elements/conversation';
import { Reasoning, ReasoningTrigger } from '@/components/ai-elements/reasoning';
import { cn } from '@/lib/utils';
import { Calendar, Calculator, Smile, SparklesIcon } from 'lucide-react';

type GenericPart = {
  type: string;
  text?: string;
};

function getTextParts(parts: GenericPart[] = []) {
  return parts.filter((p) => p.type === 'text' && typeof p.text === 'string');
}

const EXAMPLE_PROMPTS = [
  'Add 5 and 3',
  'Multiply the numbers in the calculator',
  'Subtract 10 from 20',
  'What is 100 divided by 4?',
];

export function ActCommand(): ReactElement {
  const { messages, send, clearMessages, status } = useAct();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const commandRef = useRef<HTMLDivElement>(null);
  const loading = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (open) {
      const inputEl = commandRef.current?.querySelector<HTMLInputElement>('input');
      setTimeout(() => inputEl?.focus(), 150);
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = input.trim();
    if (!value || loading) return;
    send(value);
    setInput('');
  }

  function handleSuggestionClick(suggestion: string) {
    send(suggestion);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader className="sr-only">
          <DialogTitle>Command palette</DialogTitle>
          <DialogDescription>Ask what you want to do in natural language</DialogDescription>
        </DialogHeader>
        <DialogContent
          className={cn(
            'flex max-h-[85vh] flex-col gap-0 sm:max-w-xl',
            'outline! border-none! outline-border! outline-solid!',
          )}
          showCloseButton={true}
        >
          {/* Command palette UI — input is the user intent */}
          <div ref={commandRef} className="border-b px-2 py-2">
            <Command className="max-w-full rounded-lg border-none shadow-none">
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
                    <CommandItem key={prompt} onSelect={() => handleSuggestionClick(prompt)}>
                      <Smile className="mr-2 h-4 w-4" />
                      <span>{prompt}</span>
                    </CommandItem>
                  ))}
                  <CommandItem onSelect={() => handleSuggestionClick('Open the calendar view')}>
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>Open calendar</span>
                  </CommandItem>
                  <CommandItem
                    onSelect={() => handleSuggestionClick('Calculate 20% tip for the total')}
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    <span>Quick calculator</span>
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </div>

          {/* Messages */}
          <Conversation className="min-h-0 flex-1 overflow-y-auto">
            <ConversationContent className="gap-4 p-4">
              {messages.map((m) => {
                const textParts = getTextParts(m.parts as GenericPart[]);

                return (
                  <div key={m.id} className="space-y-3">
                    {textParts.length > 0 && (
                      <Message from={m.role}>
                        <MessageContent>
                          {textParts.map((part, i) => (
                            <div key={i} className="whitespace-pre-wrap">
                              {part.text}
                            </div>
                          ))}
                        </MessageContent>
                      </Message>
                    )}
                  </div>
                );
              })}

              {loading && (
                // @ts-expect-error - Reasoning React 19 typing compat
                <Reasoning
                  isStreaming
                  defaultOpen={false}
                  className="not-prose text-xs text-muted-foreground"
                >
                  {/* @ts-expect-error - ReasoningTrigger React 19 typing compat */}
                  <ReasoningTrigger className="gap-1 text-xs" />
                </Reasoning>
              )}
            </ConversationContent>
          </Conversation>

          {messages.length > 0 && (
            <div className="border-t px-4 py-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearMessages}
                className="text-muted-foreground"
              >
                Clear conversation
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-900 shadow-xl transition-all hover:scale-105 hover:bg-zinc-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        aria-label="Open command palette"
      >
        <SparklesIcon className="size-5" />
      </button>
    </>
  );
}
