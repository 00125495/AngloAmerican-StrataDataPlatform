import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ConversationSidebar } from "@/components/conversation-sidebar";
import { ChatMessage, TypingIndicator } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { DomainSelector } from "@/components/domain-selector";
import { SiteSelector } from "@/components/site-selector";
import { EndpointSelector } from "@/components/endpoint-selector";
import { SettingsDialog } from "@/components/settings-dialog";
import { EmptyState } from "@/components/empty-state";
import { ThemeToggle } from "@/components/theme-toggle";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Conversation, Endpoint, Domain, Site, Config } from "@shared/schema";

interface UserInfo {
  email: string | null;
  displayName: string | null;
  isAuthenticated: boolean;
}

export default function Chat() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: domains = [], isLoading: domainsLoading } = useQuery<Domain[]>({
    queryKey: ["/api/domains"],
  });

  const { data: sites = [], isLoading: sitesLoading } = useQuery<Site[]>({
    queryKey: ["/api/sites"],
  });

  const { data: endpoints = [], isLoading: endpointsLoading } = useQuery<Endpoint[]>({
    queryKey: ["/api/endpoints", selectedDomain?.id],
    queryFn: async () => {
      const url = selectedDomain?.id 
        ? `/api/endpoints?domainId=${selectedDomain.id}`
        : "/api/endpoints";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch endpoints");
      return response.json();
    },
    enabled: true,
  });

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: config = {}, isLoading: configLoading } = useQuery<Config>({
    queryKey: ["/api/config"],
  });

  const { data: userInfo } = useQuery<UserInfo>({
    queryKey: ["/api/user"],
  });

  const getUserInitials = (email: string | null) => {
    if (!email) return "?";
    const parts = email.split("@")[0].split(".");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  );

  useEffect(() => {
    if (domains.length > 0 && !selectedDomain) {
      const defaultDomain = config.defaultDomainId 
        ? domains.find((d) => d.id === config.defaultDomainId)
        : domains.find((d) => d.id === "generic");
      setSelectedDomain(defaultDomain || domains[0]);
    }
  }, [domains, selectedDomain, config.defaultDomainId]);

  useEffect(() => {
    if (sites.length > 0 && !selectedSite) {
      const defaultSite = config.defaultSiteId
        ? sites.find((s) => s.id === config.defaultSiteId)
        : sites.find((s) => s.id === "all-sites");
      setSelectedSite(defaultSite || sites[0]);
    }
  }, [sites, selectedSite, config.defaultSiteId]);

  useEffect(() => {
    if (endpoints.length > 0 && !selectedEndpoint) {
      let defaultEndpoint: Endpoint | undefined;
      
      if (config.defaultEndpointId) {
        defaultEndpoint = endpoints.find((e) => e.id === config.defaultEndpointId);
      }
      
      if (!defaultEndpoint) {
        defaultEndpoint = endpoints.find((e) => e.isDefault) || endpoints[0];
      }
      
      if (defaultEndpoint) {
        setSelectedEndpoint(defaultEndpoint);
      }
    }
  }, [endpoints, selectedEndpoint, config.defaultEndpointId]);

  useEffect(() => {
    if (selectedDomain && endpoints.length > 0) {
      const domainAgent = endpoints.find(
        (e) => e.domainId === selectedDomain.id && e.type === "agent"
      );
      if (domainAgent) {
        setSelectedEndpoint(domainAgent);
      } else if (!endpoints.find((e) => e.id === selectedEndpoint?.id)) {
        const defaultEp = endpoints.find((e) => e.isDefault) || endpoints[0];
        setSelectedEndpoint(defaultEp);
      }
    }
  }, [selectedDomain, endpoints]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeConversation?.messages, isTyping]);

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!selectedEndpoint) throw new Error("No endpoint selected");
      
      const response = await apiRequest("POST", "/api/chat", {
        message,
        conversationId: activeConversationId || undefined,
        endpointId: selectedEndpoint.id,
        domainId: selectedDomain?.id,
        siteId: selectedSite?.id,
      });
      return response.json();
    },
    onMutate: () => {
      setIsTyping(true);
    },
    onSuccess: (data) => {
      setActiveConversationId(data.conversationId);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsTyping(false);
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/conversations/${id}`);
    },
    onSuccess: (_, deletedId) => {
      if (activeConversationId === deletedId) {
        setActiveConversationId(null);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
    },
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (newConfig: Config) => {
      await apiRequest("POST", "/api/config", newConfig);
      return newConfig;
    },
    onSuccess: (newConfig) => {
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
      
      if (newConfig.defaultDomainId) {
        const domain = domains.find(d => d.id === newConfig.defaultDomainId);
        if (domain) setSelectedDomain(domain);
      }
      if (newConfig.defaultSiteId) {
        const site = sites.find(s => s.id === newConfig.defaultSiteId);
        if (site) setSelectedSite(site);
      }
      if (newConfig.defaultEndpointId) {
        const endpoint = endpoints.find(e => e.id === newConfig.defaultEndpointId);
        if (endpoint) setSelectedEndpoint(endpoint);
      }
      
      toast({
        title: "Settings saved",
        description: "Your configuration has been updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = useCallback(
    (message: string) => {
      sendMessageMutation.mutate(message);
    },
    [sendMessageMutation]
  );

  const handleNewConversation = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  const handleDomainChange = useCallback((domain: Domain) => {
    setSelectedDomain(domain);
    setSelectedEndpoint(null);
  }, []);

  const isLoading = endpointsLoading || configLoading || domainsLoading || sitesLoading;

  return (
    <>
      <ConversationSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={setActiveConversationId}
        onNewConversation={handleNewConversation}
        onDeleteConversation={(id) => deleteConversationMutation.mutate(id)}
        onOpenSettings={() => setSettingsOpen(true)}
        isLoading={conversationsLoading}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex flex-wrap items-center gap-2">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            {isLoading ? (
              <>
                <Skeleton className="h-9 w-[160px]" />
                <Skeleton className="h-9 w-[140px]" />
              </>
            ) : (
              <>
                <DomainSelector
                  domains={domains}
                  selectedDomain={selectedDomain}
                  onSelect={handleDomainChange}
                  disabled={sendMessageMutation.isPending}
                />
                <SiteSelector
                  sites={sites}
                  selectedSite={selectedSite}
                  onSelect={setSelectedSite}
                  disabled={sendMessageMutation.isPending}
                />
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {userInfo?.email && (
              <div className="flex items-center gap-2" data-testid="user-info">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getUserInitials(userInfo.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground hidden sm:inline" data-testid="text-user-email">
                  {userInfo.email}
                </span>
              </div>
            )}
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 flex flex-col min-h-0">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="space-y-4 w-full max-w-md px-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-8 w-1/2" />
              </div>
            </div>
          ) : !activeConversation && !isTyping ? (
            <EmptyState 
              onSuggestionClick={handleSendMessage} 
              selectedDomain={selectedDomain}
            />
          ) : (
            <ScrollArea
              ref={scrollRef}
              className="flex-1 scrollbar-thin"
            >
              <div className="max-w-4xl mx-auto">
                {activeConversation?.messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                {isTyping && <TypingIndicator />}
              </div>
            </ScrollArea>
          )}

          <div className="max-w-4xl mx-auto w-full">
            <ChatInput
              onSend={handleSendMessage}
              isLoading={sendMessageMutation.isPending}
              disabled={!selectedEndpoint || isLoading}
              placeholder={
                isLoading
                  ? "Loading..."
                  : selectedEndpoint
                  ? `Message ${selectedDomain?.name || "AI Assistant"}...`
                  : "Select a domain to start chatting..."
              }
            />
          </div>
        </main>
      </div>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        config={config}
        endpoints={endpoints}
        domains={domains}
        sites={sites}
        onSave={(newConfig) => saveConfigMutation.mutate(newConfig)}
      />
    </>
  );
}
