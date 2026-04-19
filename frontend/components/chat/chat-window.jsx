import { AlertCircle, Bot, LoaderCircle, User, Wrench } from 'lucide-react';
import {
  getMessageText,
  humanizeToolPart,
  stripChartBlocks,
} from '@/lib/chat-helpers';

function ToolStatus({ part }) {
  const label = humanizeToolPart(part.type);
  const running = part.state === 'input-streaming' || part.state === 'input-available';

  return (
    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
      <Wrench className="size-3" />
      <span>{label}</span>
      {running && <LoaderCircle className="size-3 animate-spin" />}
    </div>
  );
}

export function ChatWindow({ messages, status, error }) {
  return (
    <div className="space-y-5">
      {messages.map((message) => {
        const isAssistant = message.role === 'assistant';
        const text = stripChartBlocks(getMessageText(message));

        return (
          <div key={message.id} className="flex gap-3">
            <div className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
              isAssistant ? 'bg-foreground text-background' : 'bg-secondary text-foreground'
            }`}>
              {isAssistant ? <Bot className="size-3.5" /> : <User className="size-3.5" />}
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-xs font-medium text-muted-foreground">
                {isAssistant ? 'DeepEconometrics' : 'Tu'}
              </p>

              {text && (
                <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground">
                  {text}
                </div>
              )}

              {message.parts
                .filter((part) => part.type.startsWith('tool-'))
                .map((part) => (
                  <ToolStatus key={part.toolCallId} part={part} />
                ))}
            </div>
          </div>
        );
      })}

      {status === 'submitted' && (
        <div className="flex gap-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
            <Bot className="size-3.5" />
          </div>
          <div className="pt-1.5">
            <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
          </div>
        </div>
      )}

      {status === 'error' && error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50/80 px-3 py-2 text-sm text-red-700 dark:border-red-950 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error.message}</span>
        </div>
      )}
    </div>
  );
}
