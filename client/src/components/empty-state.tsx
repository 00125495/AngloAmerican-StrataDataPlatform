import { Sparkles, MessageSquare, Zap, Shield } from "lucide-react";
import { DatabricksLogo } from "@/components/databricks-logo";

const features = [
  {
    icon: MessageSquare,
    title: "Conversational AI",
    description: "Natural language interactions with your Databricks models",
  },
  {
    icon: Zap,
    title: "Real-time Streaming",
    description: "See responses as they're generated for faster feedback",
  },
  {
    icon: Shield,
    title: "Context Aware",
    description: "Full conversation history passed to your agents",
  },
];

const suggestions = [
  "Analyze the sales data from last quarter",
  "What are the top performing products?",
  "Generate a summary of customer feedback",
  "Help me understand the data pipeline status",
];

interface EmptyStateProps {
  onSuggestionClick: (suggestion: string) => void;
}

export function EmptyState({ onSuggestionClick }: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
        <DatabricksLogo className="h-8 w-8" />
      </div>

      <h1 className="text-2xl font-semibold text-center mb-2">
        Welcome to Databricks AI Chat
      </h1>
      <p className="text-muted-foreground text-center mb-8 max-w-md">
        Connect to your Databricks serving endpoints and agents. Start a conversation or try one of the suggestions below.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 w-full">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50"
          >
            <feature.icon className="h-6 w-6 text-primary mb-2" />
            <h3 className="font-medium text-sm mb-1">{feature.title}</h3>
            <p className="text-xs text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>

      <div className="w-full">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Try asking</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => onSuggestionClick(suggestion)}
              className="text-left p-3 rounded-lg border bg-card hover-elevate text-sm transition-colors"
              data-testid={`button-suggestion-${suggestion.slice(0, 20).replace(/\s/g, '-')}`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
