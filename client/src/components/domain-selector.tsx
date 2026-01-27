import { Bot, Mountain, Factory, Leaf, Truck, TrendingUp, HardHat } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Domain } from "@shared/schema";

const iconMap: Record<string, typeof Bot> = {
  Bot,
  Mountain,
  Factory,
  Leaf,
  Truck,
  TrendingUp,
  HardHat,
};

interface DomainSelectorProps {
  domains: Domain[];
  selectedDomain: Domain | null;
  onSelect: (domain: Domain) => void;
  disabled?: boolean;
}

export function DomainSelector({
  domains,
  selectedDomain,
  onSelect,
  disabled,
}: DomainSelectorProps) {
  const handleSelect = (domainId: string) => {
    const domain = domains.find((d) => d.id === domainId);
    if (domain) {
      onSelect(domain);
    }
  };

  const getIcon = (iconName?: string) => {
    const IconComponent = iconName ? iconMap[iconName] : Bot;
    return IconComponent || Bot;
  };

  return (
    <Select
      value={selectedDomain?.id || ""}
      onValueChange={handleSelect}
      disabled={disabled}
    >
      <SelectTrigger
        className="w-[180px] sm:w-[220px] gap-2"
        data-testid="select-domain"
      >
        {selectedDomain ? (
          <div className="flex items-center gap-2 truncate">
            {(() => {
              const Icon = getIcon(selectedDomain.icon);
              return <Icon className="h-4 w-4 shrink-0" />;
            })()}
            <span className="truncate">{selectedDomain.name}</span>
          </div>
        ) : (
          <SelectValue placeholder="Select domain..." />
        )}
      </SelectTrigger>
      <SelectContent>
        {domains.map((domain) => {
          const Icon = getIcon(domain.icon);
          return (
            <SelectItem
              key={domain.id}
              value={domain.id}
              data-testid={`domain-option-${domain.id}`}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-medium">{domain.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {domain.description}
                  </span>
                </div>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
