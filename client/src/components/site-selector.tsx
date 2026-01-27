import { MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Site } from "@shared/schema";

interface SiteSelectorProps {
  sites: Site[];
  selectedSite: Site | null;
  onSelect: (site: Site) => void;
  disabled?: boolean;
}

export function SiteSelector({
  sites,
  selectedSite,
  onSelect,
  disabled,
}: SiteSelectorProps) {
  const handleSelect = (siteId: string) => {
    const site = sites.find((s) => s.id === siteId);
    if (site) {
      onSelect(site);
    }
  };

  return (
    <Select
      value={selectedSite?.id || ""}
      onValueChange={handleSelect}
      disabled={disabled}
    >
      <SelectTrigger
        className="w-[160px] sm:w-[180px] gap-2"
        data-testid="select-site"
      >
        {selectedSite ? (
          <div className="flex items-center gap-2 truncate">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{selectedSite.name}</span>
          </div>
        ) : (
          <SelectValue placeholder="Select site..." />
        )}
      </SelectTrigger>
      <SelectContent>
        {sites.map((site) => (
          <SelectItem
            key={site.id}
            value={site.id}
            data-testid={`site-option-${site.id}`}
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" />
              <div className="flex flex-col">
                <span className="font-medium">{site.name}</span>
                <span className="text-xs text-muted-foreground">
                  {site.location}
                </span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
