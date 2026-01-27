import { User, Bot, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Message } from "@shared/schema";

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`group flex gap-4 py-6 px-4 message-fade-in ${
        isUser ? "bg-transparent" : "bg-muted/30"
      }`}
      data-testid={`message-${message.role}-${message.id}`}
    >
      <Avatar className="h-8 w-8 shrink-0 border">
        <AvatarFallback className={isUser ? "bg-primary text-primary-foreground" : "bg-card"}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {isUser ? "You" : "AI Assistant"}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="whitespace-pre-wrap leading-relaxed">
            {message.content}
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse rounded-sm" />
            )}
          </p>
        </div>

        {!isUser && !isStreaming && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={handleCopy}
              data-testid={`button-copy-${message.id}`}
            >
              {copied ? (
                <Check className="h-3 w-3 mr-1" />
              ) : (
                <Copy className="h-3 w-3 mr-1" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-4 py-6 px-4 bg-muted/30 message-fade-in">
      <Avatar className="h-8 w-8 shrink-0 border">
        <AvatarFallback className="bg-card">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex items-center gap-1 pt-2">
        <div className="typing-indicator flex gap-1">
          <span className="w-2 h-2 bg-muted-foreground rounded-full" />
          <span className="w-2 h-2 bg-muted-foreground rounded-full" />
          <span className="w-2 h-2 bg-muted-foreground rounded-full" />
        </div>
      </div>
    </div>
  );
}
