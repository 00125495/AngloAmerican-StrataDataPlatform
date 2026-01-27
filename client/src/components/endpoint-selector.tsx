import { Check, ChevronDown, Cpu, Bot, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { Endpoint } from "@shared/schema";

const endpointIcons = {
  foundation: Sparkles,
  custom: Cpu,
  agent: Bot,
};

const endpointColors = {
  foundation: "text-amber-500",
  custom: "text-blue-500",
  agent: "text-emerald-500",
};

interface EndpointSelectorProps {
  endpoints: Endpoint[];
  selectedEndpoint: Endpoint | null;
  onSelect: (endpoint: Endpoint) => void;
  disabled?: boolean;
}

export function EndpointSelector({
  endpoints,
  selectedEndpoint,
  onSelect,
  disabled = false,
}: EndpointSelectorProps) {
  const Icon = selectedEndpoint ? endpointIcons[selectedEndpoint.type] : Sparkles;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="justify-between gap-2 min-w-[200px]"
          disabled={disabled}
          data-testid="button-endpoint-selector"
        >
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${selectedEndpoint ? endpointColors[selectedEndpoint.type] : ""}`} />
            <span className="truncate max-w-[150px]">
              {selectedEndpoint?.name || "Select endpoint"}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px]">
        <DropdownMenuLabel>Serving Endpoints</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {endpoints.map((endpoint) => {
          const EndpointIcon = endpointIcons[endpoint.type];
          const isSelected = selectedEndpoint?.id === endpoint.id;
          return (
            <DropdownMenuItem
              key={endpoint.id}
              onClick={() => onSelect(endpoint)}
              className="flex items-start gap-3 py-2"
              data-testid={`menu-item-endpoint-${endpoint.id}`}
            >
              <EndpointIcon className={`h-4 w-4 mt-0.5 ${endpointColors[endpoint.type]}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{endpoint.name}</span>
                  {endpoint.isDefault && (
                    <Badge variant="secondary" className="text-xs">
                      Default
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {endpoint.description}
                </p>
              </div>
              {isSelected && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
