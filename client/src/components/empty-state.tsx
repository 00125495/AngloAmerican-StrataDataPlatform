import { Sparkles, MessageSquare, Database } from "lucide-react";
import { AngloStrataIcon } from "@/components/databricks-logo";
import type { Domain } from "@shared/schema";

const features = [
  {
    icon: MessageSquare,
    title: "Conversational AI",
    description: "Natural language interactions with your AI models",
  },
  {
    icon: AngloStrataIcon,
    title: "Domain Specialists",
    description: "AI agents tailored for specific business areas",
  },
  {
    icon: Database,
    title: "Context Aware",
    description: "Full conversation history for multi-turn interactions",
  },
];

const domainSuggestions: Record<string, string[]> = {
  "generic": [
    "What capabilities does Anglo Strata offer?",
    "Help me understand mining operations data",
    "What insights can you provide from our data?",
    "How can AI help improve our processes?",
  ],
  "mining-ops": [
    "Analyze production metrics from the last shift",
    "What's the current equipment availability rate?",
    "Show safety incident trends this month",
    "Compare production targets vs actual output",
  ],
  "geological": [
    "Summarize the latest drill hole assay results",
    "What's the current ore grade estimate?",
    "Analyze geological mapping data for Block A",
    "Compare exploration targets by mineral potential",
  ],
  "processing": [
    "What's the current plant recovery rate?",
    "Analyze throughput bottlenecks this week",
    "Compare grinding efficiency across circuits",
    "Show metallurgical balance for the past month",
  ],
  "sustainability": [
    "What are our current carbon emissions?",
    "Analyze water usage efficiency trends",
    "Show progress on ESG commitments",
    "Compare environmental KPIs across sites",
  ],
  "supply-chain": [
    "What's the current inventory status?",
    "Analyze vendor delivery performance",
    "Show procurement cost trends",
    "Compare logistics efficiency by route",
  ],
  "finance": [
    "Analyze cost per tonne this quarter",
    "What's the capital expenditure status?",
    "Compare budget variance by department",
    "Show financial performance metrics",
  ],
};

interface EmptyStateProps {
  onSuggestionClick: (suggestion: string) => void;
  selectedDomain?: Domain | null;
}

export function EmptyState({ onSuggestionClick, selectedDomain }: EmptyStateProps) {
  const suggestions = selectedDomain?.id 
    ? (domainSuggestions[selectedDomain.id] || domainSuggestions["generic"])
    : domainSuggestions["generic"];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-center w-20 h-20 mb-6">
        <AngloStrataIcon className="h-16 w-16" />
      </div>

      <h1 className="text-2xl font-semibold text-center mb-2">
        Welcome to Anglo <span className="text-[#FF0000]">Strata</span>
      </h1>
      <p className="text-muted-foreground text-center mb-8 max-w-md">
        {selectedDomain && selectedDomain.id !== "generic" 
          ? `${selectedDomain.name} - ${selectedDomain.description}`
          : "Mining intelligence through AI-powered conversations. Select a domain and start chatting."}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 w-full">
        {features.map((feature, index) => (
          <div
            key={feature.title}
            className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50"
          >
            {index === 1 ? (
              <feature.icon className="h-6 w-6 mb-2" />
            ) : (
              <feature.icon className="h-6 w-6 text-primary mb-2" />
            )}
            <h3 className="font-medium text-sm mb-1">{feature.title}</h3>
            <p className="text-xs text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>

      <div className="w-full">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-[#FF0000]" />
          <span className="text-sm font-medium">
            {selectedDomain && selectedDomain.id !== "generic" 
              ? `Try asking about ${selectedDomain.name.toLowerCase()}`
              : "Try asking"}
          </span>
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
