import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { Endpoint, Domain, Site, Config } from "@shared/schema";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: Config;
  endpoints: Endpoint[];
  domains: Domain[];
  sites: Site[];
  onSave: (config: Config) => void;
}

export function SettingsDialog({
  open,
  onOpenChange,
  config,
  endpoints = [],
  domains = [],
  sites = [],
  onSave,
}: SettingsDialogProps) {
  const [defaultEndpointId, setDefaultEndpointId] = useState(config.defaultEndpointId || "");
  const [defaultDomainId, setDefaultDomainId] = useState(config.defaultDomainId || "generic");
  const [defaultSiteId, setDefaultSiteId] = useState(config.defaultSiteId || "all-sites");
  const [systemPrompt, setSystemPrompt] = useState(
    config.systemPrompt || "You are a helpful AI assistant. Provide clear, accurate, and helpful responses."
  );

  useEffect(() => {
    setDefaultEndpointId(config.defaultEndpointId || "");
    setDefaultDomainId(config.defaultDomainId || "generic");
    setDefaultSiteId(config.defaultSiteId || "all-sites");
    setSystemPrompt(config.systemPrompt || "You are a helpful AI assistant. Provide clear, accurate, and helpful responses.");
  }, [config]);

  const handleSave = () => {
    onSave({
      defaultEndpointId: defaultEndpointId || undefined,
      defaultDomainId: defaultDomainId || undefined,
      defaultSiteId: defaultSiteId || undefined,
      systemPrompt: systemPrompt || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your chat preferences, default domain, site, and model.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Default Domain</h4>
            <div className="space-y-2">
              <Label htmlFor="default-domain">Business Domain</Label>
              <Select value={defaultDomainId} onValueChange={setDefaultDomainId}>
                <SelectTrigger id="default-domain" data-testid="select-default-domain">
                  <SelectValue placeholder="Choose default domain" />
                </SelectTrigger>
                <SelectContent>
                  {domains.map((domain) => (
                    <SelectItem key={domain.id} value={domain.id}>
                      <div className="flex flex-col">
                        <span>{domain.name}</span>
                        <span className="text-xs text-muted-foreground">{domain.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select the business area for AI responses
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-medium">Default Site</h4>
            <div className="space-y-2">
              <Label htmlFor="default-site">Mining Site</Label>
              <Select value={defaultSiteId} onValueChange={setDefaultSiteId}>
                <SelectTrigger id="default-site" data-testid="select-default-site">
                  <SelectValue placeholder="Choose default site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      <div className="flex flex-col">
                        <span>{site.name}</span>
                        <span className="text-xs text-muted-foreground">{site.location}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Focus AI responses on a specific site
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-medium">Default Model</h4>
            <div className="space-y-2">
              <Label htmlFor="default-endpoint">AI Model</Label>
              <Select value={defaultEndpointId} onValueChange={setDefaultEndpointId}>
                <SelectTrigger id="default-endpoint" data-testid="select-default-endpoint">
                  <SelectValue placeholder="Choose default model" />
                </SelectTrigger>
                <SelectContent>
                  {endpoints.map((endpoint) => (
                    <SelectItem key={endpoint.id} value={endpoint.id}>
                      {endpoint.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The model used for new conversations
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-medium">Custom System Prompt</h4>
            <div className="space-y-2">
              <Label htmlFor="system-prompt">System Instructions</Label>
              <Textarea
                id="system-prompt"
                placeholder="You are a helpful AI assistant..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="min-h-[100px]"
                data-testid="input-system-prompt"
              />
              <p className="text-xs text-muted-foreground">
                Custom instructions sent with every conversation (overrides domain prompts)
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-settings">
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid="button-save-settings">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
