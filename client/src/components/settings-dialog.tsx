import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import type { Endpoint, Config } from "@shared/schema";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: Config;
  endpoints: Endpoint[];
  onSave: (config: Config) => void;
}

export function SettingsDialog({
  open,
  onOpenChange,
  config,
  endpoints,
  onSave,
}: SettingsDialogProps) {
  const [databricksHost, setDatabricksHost] = useState(config.databricksHost || "");
  const [defaultEndpointId, setDefaultEndpointId] = useState(config.defaultEndpointId || "");
  const [systemPrompt, setSystemPrompt] = useState(
    config.systemPrompt || "You are a helpful AI assistant connected to Databricks. Provide clear, accurate, and helpful responses."
  );

  const handleSave = () => {
    onSave({
      databricksHost: databricksHost || undefined,
      defaultEndpointId: defaultEndpointId || undefined,
      systemPrompt: systemPrompt || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your Databricks connection and chat preferences.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Databricks Connection</h4>
            <div className="space-y-2">
              <Label htmlFor="databricks-host">Workspace URL</Label>
              <Input
                id="databricks-host"
                placeholder="https://your-workspace.cloud.databricks.com"
                value={databricksHost}
                onChange={(e) => setDatabricksHost(e.target.value)}
                data-testid="input-databricks-host"
              />
              <p className="text-xs text-muted-foreground">
                Your Databricks workspace URL for API calls
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-medium">Default Endpoint</h4>
            <div className="space-y-2">
              <Label htmlFor="default-endpoint">Select Default</Label>
              <Select value={defaultEndpointId} onValueChange={setDefaultEndpointId}>
                <SelectTrigger id="default-endpoint" data-testid="select-default-endpoint">
                  <SelectValue placeholder="Choose default endpoint" />
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
                The endpoint used for new conversations
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-medium">System Prompt</h4>
            <div className="space-y-2">
              <Label htmlFor="system-prompt">Prompt</Label>
              <Textarea
                id="system-prompt"
                placeholder="You are a helpful AI assistant..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="min-h-[100px]"
                data-testid="input-system-prompt"
              />
              <p className="text-xs text-muted-foreground">
                Instructions sent with every conversation
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
