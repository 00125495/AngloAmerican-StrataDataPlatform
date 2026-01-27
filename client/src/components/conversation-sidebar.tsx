import { MessageSquare, Plus, Trash2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { DatabricksWordmark } from "@/components/databricks-logo";
import type { Conversation } from "@shared/schema";

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onOpenSettings: () => void;
  isLoading?: boolean;
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onOpenSettings,
  isLoading = false,
}: ConversationSidebarProps) {
  const sortedConversations = [...conversations].sort(
    (a, b) => b.updatedAt - a.updatedAt
  );

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="p-4 border-b">
        <DatabricksWordmark />
      </SidebarHeader>

      <SidebarContent>
        <div className="p-3">
          <Button
            onClick={onNewConversation}
            className="w-full justify-start gap-2 bg-[#FF0000] hover:bg-[#CC0000] text-white"
            data-testid="button-new-conversation"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <SidebarGroup>
            <SidebarGroupLabel>Conversations</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {isLoading ? (
                  <div className="px-3 space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : sortedConversations.length === 0 ? (
                  <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No conversations yet</p>
                    <p className="text-xs mt-1">Start a new chat to begin</p>
                  </div>
                ) : (
                  sortedConversations.map((conversation) => (
                    <SidebarMenuItem key={conversation.id}>
                      <SidebarMenuButton
                        isActive={conversation.id === activeConversationId}
                        onClick={() => onSelectConversation(conversation.id)}
                        className="group/item relative pr-10"
                        data-testid={`conversation-item-${conversation.id}`}
                      >
                        <MessageSquare className="h-4 w-4 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">
                            {conversation.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {formatDate(conversation.updatedAt)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteConversation(conversation.id);
                          }}
                          data-testid={`button-delete-${conversation.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2"
          onClick={onOpenSettings}
          data-testid="button-settings"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
