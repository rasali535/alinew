'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useOrganization } from '@ralion/auth';
import { authFetch, getRalionApiUrl, MARI_BUILD_VERSION } from '@/lib/api-config';

export interface MariConversationMessage {
  id: string;
  sender: 'USER' | 'MARI';
  text: string;
  timestamp: number;
  actions?: any[];
  tokens?: { totalTokens?: number };
}

export interface MariConversationContextType {
  messages: MariConversationMessage[];
  input: string;
  setInput: (value: string) => void;
  isProcessing: boolean;
  sendMessage: (
    text: string,
    activeScreen?: { route: string; label: string }
  ) => Promise<void>;
  clearConversation: () => void;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  isFloatingOpen: boolean;
  openFloating: () => void;
  closeFloating: () => void;
  toggleFloating: () => void;
  addVoiceTranscript: (sender: 'USER' | 'MARI', text: string) => void;
  activeOrgId: string;
  activeWorkspaceId: string;
}

const DEFAULT_WELCOME_MESSAGE: MariConversationMessage = {
  id: 'mari-initial-welcome',
  sender: 'MARI',
  text: 'Hello! I am Mari, your AI Business Growth Partner. How can I help your business grow today?',
  timestamp: Date.now(),
};

const MariConversationContext = createContext<MariConversationContextType | null>(null);

export function MariConversationProvider({ children }: { children: React.ReactNode }) {
  const { organization, workspace, user } = useOrganization();

  const orgId = organization?.id || '';
  const wsId = workspace?.id || '';
  const userId = user?.uid || (user as any)?.id || 'user';

  const [messages, setMessages] = useState<MariConversationMessage[]>([DEFAULT_WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFloatingOpen, setIsFloatingOpen] = useState(false);

  // Track the current workspace key to prevent cross-tenant race conditions
  const currentWorkspaceKeyRef = useRef<string>('');
  const activeRequestControllerRef = useRef<AbortController | null>(null);

  const getStorageKey = useCallback((oId: string, wId: string, uId: string) => {
    return `ralion:mari:conv:${oId}:${wId}:${uId}`;
  }, []);

  const getVoiceStorageKey = useCallback((oId: string, wId: string, uId: string) => {
    return `ralion:${oId}:${wId}:${uId}:mari:last_conversation`;
  }, []);

  // Save conversation to local cache securely scoped to active workspace
  const persistConversation = useCallback(
    (targetMessages: MariConversationMessage[], oId: string, wId: string, uId: string) => {
      if (!oId || !wId || typeof window === 'undefined') return;
      try {
        const fullKey = getStorageKey(oId, wId, uId);
        localStorage.setItem(fullKey, JSON.stringify(targetMessages));

        // Sync legacy voice key with last 12 messages for WebRTC voice models
        const voiceKey = getVoiceStorageKey(oId, wId, uId);
        const voiceHistory = targetMessages.slice(-12).map((m) => ({
          sender: m.sender,
          text: m.text,
        }));
        localStorage.setItem(voiceKey, JSON.stringify(voiceHistory));

        // Dispatch window event so voice control stays aware of recent context
        window.dispatchEvent(
          new CustomEvent('ralion:mari-voice-conversation', {
            detail: { messages: voiceHistory },
          })
        );
      } catch (e) {
        console.warn('[MARI_CONVERSATION] Local cache write warning:', e);
      }
    },
    [getStorageKey, getVoiceStorageKey]
  );

  // Load conversation when organization or workspace switches
  useEffect(() => {
    if (!orgId || !wsId) {
      setMessages([DEFAULT_WELCOME_MESSAGE]);
      setInput('');
      setIsProcessing(false);
      return;
    }

    const nextWorkspaceKey = `${orgId}:${wsId}:${userId}`;

    // Abort any in-flight request from previous tenant
    if (activeRequestControllerRef.current) {
      activeRequestControllerRef.current.abort();
      activeRequestControllerRef.current = null;
    }

    currentWorkspaceKeyRef.current = nextWorkspaceKey;
    setIsProcessing(false);
    setInput('');

    // Load tenant-isolated conversation from local storage
    if (typeof window !== 'undefined') {
      try {
        const fullKey = getStorageKey(orgId, wsId, userId);
        const stored = localStorage.getItem(fullKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            return;
          }
        }
      } catch (e) {
        console.warn('[MARI_CONVERSATION] Local cache read warning:', e);
      }
    }

    // Default initial message if no previous conversation in this workspace
    setMessages([DEFAULT_WELCOME_MESSAGE]);
  }, [orgId, wsId, userId, getStorageKey]);

  // Unified send message function
  const sendMessage = useCallback(
    async (text: string, activeScreen?: { route: string; label: string }) => {
      const trimmed = text.trim();
      if (!trimmed || isProcessing) return;

      const activeOrgId = orgId;
      const activeWorkspaceId = wsId;
      const activeUserId = userId;
      const workspaceKeyAtSend = `${activeOrgId}:${activeWorkspaceId}:${activeUserId}`;

      if (!activeOrgId || !activeWorkspaceId) {
        console.warn('[MARI_CONVERSATION] Cannot send message: organization workspace context not ready.');
        return;
      }

      const userMsg: MariConversationMessage = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender: 'USER',
        text: trimmed,
        timestamp: Date.now(),
      };

      const newHistory = [...messages, userMsg];
      setMessages(newHistory);
      setInput('');
      setIsProcessing(true);
      persistConversation(newHistory, activeOrgId, activeWorkspaceId, activeUserId);

      // Create abort controller for request lifecycle
      const controller = new AbortController();
      activeRequestControllerRef.current = controller;

      const apiUrl = getRalionApiUrl('/api/mari/chat');
      let httpStatus = 0;
      let responseText = '';
      let responseSource = 'UNKNOWN';
      let fallbackUsed = false;
      let buildVersion = MARI_BUILD_VERSION;
      let detectedIntent: string | undefined = undefined;
      let modelAttempted: string | null = null;
      let modelSucceeded: boolean = false;
      let fallbackReason: string | null = null;
      let actionsSuggested: any[] | undefined = undefined;
      let usageTokens: { totalTokens?: number } | undefined = undefined;

      try {
        const res = await authFetch('/api/mari/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-organization-id': activeOrgId,
            'x-workspace-id': activeWorkspaceId,
          },
          body: JSON.stringify({
            query: trimmed,
            prompt: trimmed,
            organizationId: activeOrgId,
            workspaceId: activeWorkspaceId,
            activeScreen: activeScreen || { route: '/mari-ai', label: 'Mari Assistant' },
            messages: newHistory.map((m) => ({
              role: m.sender === 'USER' ? 'user' : 'model',
              text: m.text,
            })),
          }),
        });

        httpStatus = res.status;

        // Discard result if user switched workspace during transit
        if (currentWorkspaceKeyRef.current !== workspaceKeyAtSend) {
          console.warn('[MARI_CONVERSATION] Response discarded due to workspace switch during request.');
          return;
        }

        if (res.ok) {
          const data = await res.json();
          responseText = data.answer || data.text || '';
          if (!data.success || !responseText) throw new Error('Invalid Mari server response');

          responseSource = data.responseSource || 'SERVER_MARI_CHAT_API';
          fallbackUsed =
            data.fallbackUsed !== undefined
              ? data.fallbackUsed
              : responseSource === 'local_grounded' &&
                data.detectedIntent !== 'GREETING' &&
                data.detectedIntent !== 'FACEBOOK_CONNECTION_STATUS' &&
                data.detectedIntent !== 'CREATIVE_STUDIO';
          buildVersion = data.buildVersion || MARI_BUILD_VERSION;
          detectedIntent = data.detectedIntent;
          modelAttempted = data.modelAttempted;
          modelSucceeded = Boolean(data.modelSucceeded);
          fallbackReason = data.fallbackReason;
          actionsSuggested = data.actionsSuggested;
          usageTokens = data.usage ? { totalTokens: data.usage.totalTokens } : undefined;

          const mariMsg: MariConversationMessage = {
            id: `mari-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            sender: 'MARI',
            text: responseText,
            timestamp: Date.now(),
            actions: actionsSuggested,
            tokens: usageTokens,
          };

          setMessages((prev) => {
            const updated = [...prev, mariMsg];
            persistConversation(updated, activeOrgId, activeWorkspaceId, activeUserId);
            return updated;
          });
        } else {
          fallbackUsed = true;
          fallbackReason = `HTTP_${httpStatus}`;
          responseText = "Mari couldn't complete that request right now. Please retry.";
          responseSource = 'HTTP_ERROR';

          const mariErrorMsg: MariConversationMessage = {
            id: `mari-${Date.now()}`,
            sender: 'MARI',
            text: responseText,
            timestamp: Date.now(),
          };

          setMessages((prev) => {
            const updated = [...prev, mariErrorMsg];
            persistConversation(updated, activeOrgId, activeWorkspaceId, activeUserId);
            return updated;
          });
        }
      } catch (err: any) {
        if (currentWorkspaceKeyRef.current !== workspaceKeyAtSend) return;

        fallbackUsed = true;
        fallbackReason = err?.name === 'AbortError' ? 'ABORTED' : 'NETWORK_ERROR';
        responseText = "Mari couldn't reach the server right now. Please retry.";
        responseSource = 'NETWORK_ERROR';

        const mariNetworkErrorMsg: MariConversationMessage = {
          id: `mari-${Date.now()}`,
          sender: 'MARI',
          text: responseText,
          timestamp: Date.now(),
        };

        setMessages((prev) => {
          const updated = [...prev, mariNetworkErrorMsg];
          persistConversation(updated, activeOrgId, activeWorkspaceId, activeUserId);
          return updated;
        });
      } finally {
        if (currentWorkspaceKeyRef.current === workspaceKeyAtSend) {
          console.log('[MARI_SHARED_TELEMETRY]', {
            MARI_REQUEST_URL: apiUrl,
            MARI_HTTP_STATUS: httpStatus,
            MARI_RESPONSE_HAS_ANSWER: Boolean(responseText),
            MARI_RESPONSE_SOURCE: responseSource,
            MARI_FALLBACK_USED: fallbackUsed,
            MARI_BUILD_VERSION: buildVersion,
            MARI_DETECTED_INTENT: detectedIntent,
            MARI_MODEL_ATTEMPTED: modelAttempted,
            MARI_MODEL_SUCCEEDED: modelSucceeded,
            MARI_FALLBACK_REASON: fallbackReason,
          });
          setIsProcessing(false);
          activeRequestControllerRef.current = null;
        }
      }
    },
    [messages, isProcessing, orgId, wsId, userId, persistConversation]
  );

  // Add voice transcript seamlessly into conversation
  const addVoiceTranscript = useCallback(
    (sender: 'USER' | 'MARI', text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const newMsg: MariConversationMessage = {
        id: `voice-${sender.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender,
        text: trimmed,
        timestamp: Date.now(),
      };

      setMessages((prev) => {
        // Prevent duplicate voice transcription if identical message was added within last 2 seconds
        const last = prev[prev.length - 1];
        if (last && last.sender === sender && last.text === trimmed && Date.now() - last.timestamp < 2000) {
          return prev;
        }
        const updated = [...prev, newMsg];
        persistConversation(updated, orgId, wsId, userId);
        return updated;
      });
    },
    [orgId, wsId, userId, persistConversation]
  );

  const clearConversation = useCallback(() => {
    setMessages([DEFAULT_WELCOME_MESSAGE]);
    setInput('');
    persistConversation([DEFAULT_WELCOME_MESSAGE], orgId, wsId, userId);
  }, [orgId, wsId, userId, persistConversation]);

  const openDrawer = useCallback(() => {
    setIsFloatingOpen(false);
    setIsDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const toggleDrawer = useCallback(() => {
    setIsDrawerOpen((prev) => {
      const next = !prev;
      if (next) setIsFloatingOpen(false);
      return next;
    });
  }, []);

  const openFloating = useCallback(() => {
    setIsDrawerOpen(false);
    setIsFloatingOpen(true);
  }, []);

  const closeFloating = useCallback(() => {
    setIsFloatingOpen(false);
  }, []);

  const toggleFloating = useCallback(() => {
    setIsFloatingOpen((prev) => {
      const next = !prev;
      if (next) setIsDrawerOpen(false);
      return next;
    });
  }, []);

  const contextValue: MariConversationContextType = {
    messages,
    input,
    setInput,
    isProcessing,
    sendMessage,
    clearConversation,
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    isFloatingOpen,
    openFloating,
    closeFloating,
    toggleFloating,
    addVoiceTranscript,
    activeOrgId: orgId,
    activeWorkspaceId: wsId,
  };

  return (
    <MariConversationContext.Provider value={contextValue}>
      {children}
    </MariConversationContext.Provider>
  );
}

export function useMariConversation(): MariConversationContextType {
  const context = useContext(MariConversationContext);
  if (!context) {
    throw new Error('useMariConversation must be used within a MariConversationProvider');
  }
  return context;
}
