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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Endpoint, Domain, Site, Config, InsertDomain, InsertEndpoint } from "@shared/schema";

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
  const { toast } = useToast();
  const [defaultEndpointId, setDefaultEndpointId] = useState(config.defaultEndpointId || "");
  const [defaultDomainId, setDefaultDomainId] = useState(config.defaultDomainId || "generic");
  const [defaultSiteId, setDefaultSiteId] = useState(config.defaultSiteId || "all-sites");
  const [systemPrompt, setSystemPrompt] = useState(
    config.systemPrompt || "You are a helpful AI assistant. Provide clear, accurate, and helpful responses."
  );

  const [newDomain, setNewDomain] = useState<Partial<InsertDomain>>({});
  const [editingDomainId, setEditingDomainId] = useState<string | null>(null);
  const [editingDomain, setEditingDomain] = useState<Partial<InsertDomain>>({});

  const [newEndpoint, setNewEndpoint] = useState<Partial<InsertEndpoint>>({});
  const [editingEndpointId, setEditingEndpointId] = useState<string | null>(null);
  const [editingEndpoint, setEditingEndpoint] = useState<Partial<InsertEndpoint>>({});

  useEffect(() => {
    setDefaultEndpointId(config.defaultEndpointId || "");
    setDefaultDomainId(config.defaultDomainId || "generic");
    setDefaultSiteId(config.defaultSiteId || "all-sites");
    setSystemPrompt(config.systemPrompt || "You are a helpful AI assistant. Provide clear, accurate, and helpful responses.");
  }, [config]);

  const createDomainMutation = useMutation({
    mutationFn: async (domain: InsertDomain) => {
      const res = await apiRequest("POST", "/api/domains", domain);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      setNewDomain({});
      toast({ title: "Domain created", description: "New domain added successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create domain", variant: "destructive" });
    },
  });

  const updateDomainMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertDomain> }) => {
      const res = await apiRequest("PUT", `/api/domains/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      setEditingDomainId(null);
      toast({ title: "Domain updated", description: "Domain saved successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update domain", variant: "destructive" });
    },
  });

  const deleteDomainMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/domains/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      toast({ title: "Domain deleted", description: "Domain removed successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete domain", variant: "destructive" });
    },
  });

  const createEndpointMutation = useMutation({
    mutationFn: async (endpoint: InsertEndpoint) => {
      const res = await apiRequest("POST", "/api/endpoints", endpoint);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/endpoints"] });
      setNewEndpoint({});
      toast({ title: "Endpoint created", description: "New endpoint added successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create endpoint", variant: "destructive" });
    },
  });

  const updateEndpointMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertEndpoint> }) => {
      const res = await apiRequest("PUT", `/api/endpoints/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/endpoints"] });
      setEditingEndpointId(null);
      toast({ title: "Endpoint updated", description: "Endpoint saved successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update endpoint", variant: "destructive" });
    },
  });

  const deleteEndpointMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/endpoints/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/endpoints"] });
      toast({ title: "Endpoint deleted", description: "Endpoint removed successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete endpoint", variant: "destructive" });
    },
  });

  const handleSave = () => {
    onSave({
      defaultEndpointId: defaultEndpointId || undefined,
      defaultDomainId: defaultDomainId || undefined,
      defaultSiteId: defaultSiteId || undefined,
      systemPrompt: systemPrompt || undefined,
    });
    onOpenChange(false);
  };

  const handleCreateDomain = () => {
    if (!newDomain.name || !newDomain.description || !newDomain.systemPrompt) {
      toast({ title: "Missing fields", description: "Please fill in all domain fields", variant: "destructive" });
      return;
    }
    createDomainMutation.mutate(newDomain as InsertDomain);
  };

  const handleCreateEndpoint = () => {
    if (!newEndpoint.name || !newEndpoint.description || !newEndpoint.type) {
      toast({ title: "Missing fields", description: "Please fill in all endpoint fields", variant: "destructive" });
      return;
    }
    createEndpointMutation.mutate({ ...newEndpoint, isDefault: false } as InsertEndpoint);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure preferences, manage domains, and add custom endpoints.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="preferences" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="preferences" data-testid="tab-preferences">Preferences</TabsTrigger>
            <TabsTrigger value="domains" data-testid="tab-domains">Domains</TabsTrigger>
            <TabsTrigger value="endpoints" data-testid="tab-endpoints">Endpoints</TabsTrigger>
          </TabsList>

          <TabsContent value="preferences" className="space-y-6 py-4">
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
              </div>
            </div>
          </TabsContent>

          <TabsContent value="domains" className="space-y-4 py-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Add New Domain</CardTitle>
                <CardDescription>Create a new business domain for specialized AI responses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Domain name (e.g., Safety & Compliance)"
                  value={newDomain.name || ""}
                  onChange={(e) => setNewDomain({ ...newDomain, name: e.target.value })}
                  data-testid="input-new-domain-name"
                />
                <Input
                  placeholder="Description"
                  value={newDomain.description || ""}
                  onChange={(e) => setNewDomain({ ...newDomain, description: e.target.value })}
                  data-testid="input-new-domain-description"
                />
                <Textarea
                  placeholder="System prompt for this domain..."
                  value={newDomain.systemPrompt || ""}
                  onChange={(e) => setNewDomain({ ...newDomain, systemPrompt: e.target.value })}
                  className="min-h-[80px]"
                  data-testid="input-new-domain-prompt"
                />
                <Button
                  onClick={handleCreateDomain}
                  disabled={createDomainMutation.isPending}
                  className="w-full"
                  data-testid="button-create-domain"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Domain
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Existing Domains</h4>
              {domains.map((domain) => (
                <Card key={domain.id} className="relative">
                  <CardContent className="pt-4">
                    {editingDomainId === domain.id ? (
                      <div className="space-y-2">
                        <Input
                          value={editingDomain.name || ""}
                          onChange={(e) => setEditingDomain({ ...editingDomain, name: e.target.value })}
                          data-testid={`input-edit-domain-name-${domain.id}`}
                        />
                        <Input
                          value={editingDomain.description || ""}
                          onChange={(e) => setEditingDomain({ ...editingDomain, description: e.target.value })}
                          data-testid={`input-edit-domain-description-${domain.id}`}
                        />
                        <Textarea
                          value={editingDomain.systemPrompt || ""}
                          onChange={(e) => setEditingDomain({ ...editingDomain, systemPrompt: e.target.value })}
                          className="min-h-[60px]"
                          data-testid={`input-edit-domain-prompt-${domain.id}`}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => updateDomainMutation.mutate({ id: domain.id, data: editingDomain })}
                            disabled={updateDomainMutation.isPending}
                            data-testid={`button-save-domain-${domain.id}`}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingDomainId(null)}
                            data-testid={`button-cancel-edit-domain-${domain.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{domain.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{domain.description}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingDomainId(domain.id);
                              setEditingDomain({
                                name: domain.name,
                                description: domain.description,
                                systemPrompt: domain.systemPrompt,
                              });
                            }}
                            data-testid={`button-edit-domain-${domain.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteDomainMutation.mutate(domain.id)}
                            disabled={deleteDomainMutation.isPending}
                            data-testid={`button-delete-domain-${domain.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="endpoints" className="space-y-4 py-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Add Custom Endpoint</CardTitle>
                <CardDescription>Add a custom AI agent or model endpoint</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Endpoint name"
                  value={newEndpoint.name || ""}
                  onChange={(e) => setNewEndpoint({ ...newEndpoint, name: e.target.value })}
                  data-testid="input-new-endpoint-name"
                />
                <Input
                  placeholder="Description"
                  value={newEndpoint.description || ""}
                  onChange={(e) => setNewEndpoint({ ...newEndpoint, description: e.target.value })}
                  data-testid="input-new-endpoint-description"
                />
                <Select
                  value={newEndpoint.type || ""}
                  onValueChange={(value) => setNewEndpoint({ ...newEndpoint, type: value as "foundation" | "custom" | "agent" })}
                >
                  <SelectTrigger data-testid="select-new-endpoint-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="foundation">Foundation Model</SelectItem>
                    <SelectItem value="custom">Custom Model</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={newEndpoint.domainId || "none"}
                  onValueChange={(value) => setNewEndpoint({ ...newEndpoint, domainId: value === "none" ? undefined : value })}
                >
                  <SelectTrigger data-testid="select-new-endpoint-domain">
                    <SelectValue placeholder="Link to domain (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific domain</SelectItem>
                    {domains.map((domain) => (
                      <SelectItem key={domain.id} value={domain.id}>
                        {domain.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleCreateEndpoint}
                  disabled={createEndpointMutation.isPending}
                  className="w-full"
                  data-testid="button-create-endpoint"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Endpoint
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Existing Endpoints</h4>
              {endpoints.map((endpoint) => (
                <Card key={endpoint.id} className="relative">
                  <CardContent className="pt-4">
                    {editingEndpointId === endpoint.id ? (
                      <div className="space-y-2">
                        <Input
                          value={editingEndpoint.name || ""}
                          onChange={(e) => setEditingEndpoint({ ...editingEndpoint, name: e.target.value })}
                          data-testid={`input-edit-endpoint-name-${endpoint.id}`}
                        />
                        <Input
                          value={editingEndpoint.description || ""}
                          onChange={(e) => setEditingEndpoint({ ...editingEndpoint, description: e.target.value })}
                          data-testid={`input-edit-endpoint-description-${endpoint.id}`}
                        />
                        <Select
                          value={editingEndpoint.type || ""}
                          onValueChange={(value) => setEditingEndpoint({ ...editingEndpoint, type: value as "foundation" | "custom" | "agent" })}
                        >
                          <SelectTrigger data-testid={`select-edit-endpoint-type-${endpoint.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="foundation">Foundation Model</SelectItem>
                            <SelectItem value="custom">Custom Model</SelectItem>
                            <SelectItem value="agent">Agent</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => updateEndpointMutation.mutate({ id: endpoint.id, data: editingEndpoint })}
                            disabled={updateEndpointMutation.isPending}
                            data-testid={`button-save-endpoint-${endpoint.id}`}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingEndpointId(null)}
                            data-testid={`button-cancel-edit-endpoint-${endpoint.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{endpoint.name}</p>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                              {endpoint.type}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{endpoint.description}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingEndpointId(endpoint.id);
                              setEditingEndpoint({
                                name: endpoint.name,
                                description: endpoint.description,
                                type: endpoint.type,
                                domainId: endpoint.domainId,
                              });
                            }}
                            data-testid={`button-edit-endpoint-${endpoint.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteEndpointMutation.mutate(endpoint.id)}
                            disabled={deleteEndpointMutation.isPending}
                            data-testid={`button-delete-endpoint-${endpoint.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

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
