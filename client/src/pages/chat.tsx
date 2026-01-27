import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ConversationSidebar } from "@/components/conversation-sidebar";
import { ChatMessage, TypingIndicator } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { EndpointSelector } from "@/components/endpoint-selector";
import { SettingsDialog } from "@/components/settings-dialog";
import { EmptyState } from "@/components/empty-state";
import { ThemeToggle } from "@/components/theme-toggle";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Conversation, Endpoint, Config } from "@shared/schema";

export default function Chat() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: endpoints = [], isLoading: endpointsLoading } = useQuery<Endpoint[]>({
    queryKey: ["/api/endpoints"],
  });

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: config = {}, isLoading: configLoading } = useQuery<Config>({
    queryKey: ["/api/config"],
  });

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  );

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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
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

  const isLoading = endpointsLoading || configLoading;

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
          <div className="flex flex-wrap items-center gap-3">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            {isLoading ? (
              <Skeleton className="h-9 w-[200px]" />
            ) : (
              <EndpointSelector
                endpoints={endpoints}
                selectedEndpoint={selectedEndpoint}
                onSelect={setSelectedEndpoint}
                disabled={sendMessageMutation.isPending}
              />
            )}
          </div>
          <ThemeToggle />
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
            <EmptyState onSuggestionClick={handleSendMessage} />
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
                  ? `Message ${selectedEndpoint.name}...`
                  : "Select an endpoint to start chatting..."
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
        onSave={(newConfig) => saveConfigMutation.mutate(newConfig)}
      />
    </>
  );
}
