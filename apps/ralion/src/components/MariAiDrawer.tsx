'use client';

import React, { useState } from 'react';
import { X, Send, Sparkles, Bot, FileText, Zap, CornerDownLeft, ArrowRight } from 'lucide-react';
import { processMariQuery, generateMarketingCampaign } from '@ralion/ai';
import { Button, Badge } from '@ralion/ui';
import { MariMarkdownMessage } from './MariMarkdownMessage';
import { useOrganization } from '@ralion/auth';

import { getRalionApiUrl, getRalionAuthHeaders } from '@/lib/api-config';

export interface MariAiDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (route: string) => void;
}

export const MariAiDrawer: React.FC<MariAiDrawerProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const { organization, user } = useOrganization();
  const [messages, setMessages] = useState<Array<{ sender: 'USER' | 'MARI'; text: string; actions?: any[]; tokens?: { totalTokens?: number } }>>([
    {
      sender: 'MARI',
      text: "Hello! I am Mari AI, your sovereign AI Business Growth Partner. Ask me anything about your growth strategy, market positioning, revenue, or tell me to generate marketing content!"
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSend = () => {
    if (!inputQuery.trim() || isProcessing) return;

    const userText = inputQuery.trim();
    const newHistory = [...messages, { sender: 'USER' as const, text: userText }];
    setMessages(newHistory);
    setInputQuery('');
    setIsProcessing(true);

    const fetchResponse = async () => {
      const apiUrl = getRalionApiUrl('/api/mari/chat');
      let httpStatus = 0;
      let respText = '';
      let responseSource = 'UNKNOWN';
      let fallbackUsed = false;
      const buildVersion = '2026.09.06-v2';

      try {
        const authHeaders = await getRalionAuthHeaders();
        let activeOrgId: string = organization?.id || (user as any)?.id || (user as any)?.userId || '';
        try {
          const stored = typeof window !== 'undefined'
            ? (localStorage.getItem('ralion_active_org_id') || localStorage.getItem('ralion_active_workspace_id') || localStorage.getItem('ralion_workspace_id'))
            : null;
          if (stored && stored !== 'org_default' && stored !== 'default') {
            if (!activeOrgId) activeOrgId = stored;
          }
        } catch {}

        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
            'x-organization-id': activeOrgId,
            'x-workspace-id': activeOrgId,
          },
          body: JSON.stringify({
            query: userText,
            prompt: userText,
            organizationId: activeOrgId,
            activeScreen: { route: '/mari-ai', label: 'Mari Business Drawer' },
            messages: newHistory.map(m => ({
              role: m.sender === 'USER' ? 'user' : 'model',
              text: m.text,
            })),
          }),
        });

        httpStatus = res.status;

        if (res.ok) {
          const data = await res.json();
          respText = data.answer || data.text || "I've reviewed your business intelligence.";
          responseSource = data.responseSource || 'SERVER_MARI_CHAT_API';
          setMessages(prev => [
            ...prev,
            {
              sender: 'MARI',
              text: respText,
              actions: data.actionsSuggested || [],
              tokens: data.usage ? { totalTokens: data.usage.totalTokens } : undefined,
            }
          ]);
        } else {
          fallbackUsed = true;
          respText = "I am ready to assist with your growth strategy, campaign planning, and business analysis.";
          responseSource = 'HTTP_NON_200_FALLBACK';
          setMessages(prev => [
            ...prev,
            {
              sender: 'MARI',
              text: respText,
            }
          ]);
        }
      } catch (err: any) {
        fallbackUsed = true;
        respText = "I'm having trouble connecting to my neural reasoning core right now. Please check your network connection.";
        responseSource = 'NETWORK_ERROR_FALLBACK';
        setMessages(prev => [
          ...prev,
          {
            sender: 'MARI',
            text: respText,
          }
        ]);
      } finally {
        console.log('[MARI_DRAWER_TELEMETRY]', {
          MARI_REQUEST_URL: apiUrl,
          MARI_HTTP_STATUS: httpStatus,
          MARI_RESPONSE_ANSWER: respText,
          MARI_RESPONSE_SOURCE: responseSource,
          MARI_FALLBACK_USED: fallbackUsed,
          MARI_BUILD_VERSION: buildVersion,
        });
        setIsProcessing(false);
      }
    };
    
    fetchResponse();
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-zinc-950/95 backdrop-blur-2xl border-l border-zinc-800/90 shadow-2xl z-50 flex flex-col justify-between animate-in slide-in-from-right duration-300">
      {/* Drawer Header */}
      <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Mari AI Assistant
              <Badge variant="purple" className="text-[10px] font-mono">Ras Ali AI</Badge>
            </h2>
            <p className="text-[10px] text-zinc-400">Enterprise Intelligence & RAG Core</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex flex-col gap-2 ${msg.sender === 'USER' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                msg.sender === 'USER'
                  ? 'bg-blue-600 text-white font-medium rounded-tr-none shadow-md'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-none shadow-lg'
              }`}
            >
              {msg.sender === 'MARI' && (
                <div className="flex items-center justify-between gap-1.5 mb-1 text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1"><Bot className="w-3 h-3" /> Mari AI</span>
                  {msg.tokens?.totalTokens && (
                    <span className="text-[9px] text-zinc-500 font-mono font-normal normal-case">
                      {msg.tokens.totalTokens} tokens
                    </span>
                  )}
                </div>
              )}
              <MariMarkdownMessage text={msg.text} isUser={msg.sender === 'USER'} />
            </div>

            {/* Mari Creative Collaboration Action */}
            {msg.sender === 'MARI' && (
              <div className="flex flex-wrap gap-1.5 mt-1 max-w-[85%]">
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      const cleanPrompt = msg.text
                        .replace(/<svg[\s\S]*?<\/svg>/gi, '')
                        .replace(/!\[.*?\]\(.*?\)/g, '')
                        .replace(/[*#_`]/g, '')
                        .replace(/^(Social & Channel Intelligence|Good day!|Based on your|Here is|I recommend)[^\n]*\n+/gi, '')
                        .replace(/\[.*?\]/g, '')
                        .replace(/\bsvg[A-Za-z0-9 ]*/gi, '')
                        .replace(/\s+/g, ' ')
                        .trim()
                        .substring(0, 280);
                      localStorage.setItem('ralion_creative_prompt', cleanPrompt || msg.text.substring(0, 200));
                    }
                    if (onNavigate) {
                      onNavigate('/growth?tab=creatives');
                    }
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-950/40 border border-purple-500/40 text-[11px] font-bold text-purple-300 hover:bg-purple-600/20 hover:border-purple-400 transition-all shadow-sm"
                >
                  <Sparkles className="w-3 h-3 text-purple-400 shrink-0" />
                  <span>Send Prompt to Creative Studio</span>
                </button>

                {/* Parse bracketed buttons in text e.g. [Create Reel] | [Create Visual] | [Open Growth Studio] */}
                {(() => {
                  const bracketMatches = msg.text.match(/\[([A-Za-z0-9 &—–-]+)\]/g);
                  if (!bracketMatches) return null;
                  const knownActions: Record<string, string> = {
                    'create reel': '/growth?tab=creatives',
                    'create visual': '/growth?tab=creatives',
                    'open growth studio': '/growth',
                    'connect facebook': '/growth?tab=channels',
                    'connect facebook page': '/growth?tab=channels',
                    'generate creative': '/growth?tab=creatives',
                    'view crm pipeline': '/crm',
                    'sync website': '/settings',
                    'add business knowledge': '/settings',
                    'review sales pipeline': '/crm',
                    'view tasks queue': '/tasks',
                    'open billing & finance': '/billing',
                  };
                  return bracketMatches.map((bm, bIdx) => {
                    const label = bm.replace(/^\[|\]$/g, '').trim();
                    const route = knownActions[label.toLowerCase()];
                    if (!route) return null;
                    return (
                      <button
                        key={`bm-${bIdx}`}
                        onClick={() => {
                          if (typeof window !== 'undefined' && route.includes('growth')) {
                            const cleanPrompt = msg.text
                              .replace(/!\[.*?\]\(.*?\)/g, '')
                              .replace(/[*#_`]/g, '')
                              .replace(/^(Social & Channel Intelligence|Good day!|Based on your|Here is|I recommend)[^\n]*\n+/gi, '')
                              .replace(/\[.*?\]/g, '')
                              .replace(/\s+/g, ' ')
                              .trim()
                              .substring(0, 280);
                            localStorage.setItem('ralion_creative_prompt', cleanPrompt || msg.text.substring(0, 200));
                          }
                          if (onNavigate) onNavigate(route);
                          onClose();
                        }}
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-zinc-900 border border-purple-500/30 text-[10px] font-semibold text-purple-300 hover:bg-purple-900/30 transition-all"
                      >
                        <Zap className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                        <span>{label}</span>
                      </button>
                    );
                  });
                })()}
              </div>
            )}

            {/* Suggested Actions */}
            {msg.actions && msg.actions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1 max-w-[85%]">
                {msg.actions.map((act, aIdx) => (
                  <button
                    key={aIdx}
                    onClick={() => {
                      if (act.type === 'NAVIGATE' && onNavigate) {
                        const route = typeof act.payload === 'object' && act.payload?.route
                          ? act.payload.route
                          : (typeof act.payload === 'string' && act.payload.startsWith('/') ? act.payload : '/growth');
                        onNavigate(route);
                      }
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-blue-500/30 text-[11px] font-semibold text-blue-400 hover:bg-blue-600/10 hover:border-blue-400 transition-all shadow-sm"
                  >
                    <Zap className="w-3 h-3 text-blue-400" />
                    {act.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {isProcessing && (
          <div className="flex items-center gap-2 text-xs text-zinc-400 italic">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            Mari AI is calculating insights &amp; creative concepts...
          </div>
        )}
      </div>

      {/* Input Form & Quick Collaboration Pills */}
      <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/40 flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setInputQuery('Brainstorm 3 viral social media marketing poster concepts for our business');
            }}
            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-300 hover:text-white shrink-0 transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-purple-400" /> Creative Prompts
          </button>
          <button
            type="button"
            onClick={() => {
              setInputQuery('Draft a high-converting Facebook post with caption, image concept, and hashtags');
            }}
            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-300 hover:text-white shrink-0 transition-colors flex items-center gap-1"
          >
            <Zap className="w-3 h-3 text-blue-400" /> Draft Social Post
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Mari: 'Generate 3 poster concepts' or 'Draft ad'..."
            className="w-full pl-4 pr-12 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
          />
          <button
            onClick={handleSend}
            disabled={!inputQuery.trim()}
            className="absolute right-2 top-2 p-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
