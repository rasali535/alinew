'use client';

import React, { useState } from 'react';
import { Sparkles, X, Send, Bot, User, ChevronUp, Zap, ArrowRight } from 'lucide-react';
import { MariMarkdownMessage } from './MariMarkdownMessage';
import { getRalionApiUrl, getRalionAuthHeaders } from '@/lib/api-config';
import { useOrganization } from '@ralion/auth';

export const FloatingMariAi: React.FC = () => {
  const { organization, user } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: 'USER' | 'MARI'; text: string; id?: string }>>([
    { sender: 'MARI', text: 'Hello! I am Mari, your AI Business Growth Partner. How can I help your business grow today?' }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const quickPrompts = [
    'Show my business performance',
    'Where should we focus today?',
    'Summarize activity',
    'Find growth opportunities'
  ];

  const handleSend = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    const userMsg = { sender: 'USER' as const, text, id: `user-${Date.now()}` };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setIsProcessing(true);
    const apiUrl = getRalionApiUrl('/api/mari/chat');
    let httpStatus = 0;
    let responseText = '';
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
          // Only trust localStorage if no authenticated org/user is resolved yet or if it matches
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
          query: text,
          prompt: text,
          organizationId: activeOrgId,
          messages: newHistory.map(m => ({
            role: m.sender === 'USER' ? 'user' : 'model',
            text: m.text,
          })),
        }),
      });

      httpStatus = res.status;

      if (res.ok) {
        const data = await res.json();
        responseText = data.answer || data.text || "I'm analyzing your business data right now.";
        responseSource = data.responseSource || 'SERVER_MARI_CHAT_API';
        setMessages(prev => [...prev, { sender: 'MARI', text: responseText, id: `mari-${Date.now()}` }]);
      } else {
        fallbackUsed = true;
        responseText = "I am currently synchronizing with your live business data. You can access Growth Studio, CRM, and Campaign tools directly from your workspace.";
        responseSource = 'HTTP_NON_200_FALLBACK';
        setMessages(prev => [
          ...prev,
          {
            sender: 'MARI',
            text: responseText,
            id: `mari-${Date.now()}`
          }
        ]);
      }
    } catch (err: any) {
      fallbackUsed = true;
      responseText = "I'm having trouble connecting to my neural reasoning core right now. Please check your network connection.";
      responseSource = 'NETWORK_ERROR_FALLBACK';
      setMessages(prev => [
        ...prev,
        {
          sender: 'MARI',
          text: responseText,
          id: `mari-${Date.now()}`
        }
      ]);
    } finally {
      console.log('[MARI_FLOATING_TELEMETRY]', {
        MARI_REQUEST_URL: apiUrl,
        MARI_HTTP_STATUS: httpStatus,
        MARI_RESPONSE_ANSWER: responseText,
        MARI_RESPONSE_SOURCE: responseSource,
        MARI_FALLBACK_USED: fallbackUsed,
        MARI_BUILD_VERSION: buildVersion,
      });
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white font-bold text-xs shadow-2xl shadow-purple-500/30 hover:scale-105 transition-all group border border-purple-400/40"
        >
          <Sparkles className="w-4 h-4 animate-pulse text-amber-300" />
          <span>Mari AI</span>
        </button>
      ) : (
        <div className="w-80 sm:w-96 h-[480px] bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl flex flex-col justify-between overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-3.5 border-b border-zinc-800 bg-gradient-to-r from-blue-950/60 to-purple-950/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Mari AI Growth Partner</h4>
                <span className="text-[10px] text-purple-300">Empowered to Prosper</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 rounded text-zinc-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-3 text-xs">
            {messages.map((m, i) => (
              <div key={m.id || i} className={`flex ${m.sender === 'USER' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`p-3 rounded-xl max-w-[88%] leading-relaxed ${
                    m.sender === 'USER' ? 'bg-blue-600 text-white font-medium' : 'bg-zinc-800 border border-zinc-700/60 text-zinc-100'
                  }`}
                >
                  <MariMarkdownMessage text={m.text} isUser={m.sender === 'USER'} />

                  {m.sender === 'MARI' && (
                    <div className="pt-2 mt-2 border-t border-zinc-700/40 flex flex-wrap justify-end gap-1.5">
                      {/* Send to Studio Action */}
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            const clean = m.text
                              .replace(/!\[.*?\]\(.*?\)/g, '')
                              .replace(/[*#_`]/g, '')
                              .replace(/^(Social & Channel Intelligence|Good day!|Based on your|Here is|I recommend)[^\n]*\n+/gi, '')
                              .replace(/\[.*?\]/g, '')
                              .replace(/\s+/g, ' ')
                              .trim()
                              .substring(0, 280);
                            localStorage.setItem('ralion_creative_prompt', clean || m.text.substring(0, 200));
                            window.location.href = '/growth?tab=creatives';
                          }
                          setIsOpen(false);
                        }}
                        className="text-[10px] font-bold text-purple-300 hover:text-white flex items-center gap-1 transition-colors px-2 py-0.5 rounded bg-purple-950/40 border border-purple-500/30"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                        <span>Send to Studio &rarr;</span>
                      </button>

                      {/* Parse bracketed buttons in text */}
                      {(() => {
                        const bracketMatches = m.text.match(/\[([A-Za-z0-9 &—–-]+)\]/g);
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
                              key={`f-bm-${bIdx}`}
                              type="button"
                              onClick={() => {
                                if (typeof window !== 'undefined' && route.includes('growth')) {
                                  const clean = m.text
                                    .replace(/!\[.*?\]\(.*?\)/g, '')
                                    .replace(/[*#_`]/g, '')
                                    .replace(/^(Social & Channel Intelligence|Good day!|Based on your|Here is|I recommend)[^\n]*\n+/gi, '')
                                    .replace(/\[.*?\]/g, '')
                                    .replace(/\s+/g, ' ')
                                    .trim()
                                    .substring(0, 280);
                                  localStorage.setItem('ralion_creative_prompt', clean || m.text.substring(0, 200));
                                }
                                window.location.href = route;
                                setIsOpen(false);
                              }}
                              className="text-[10px] font-semibold text-purple-300 hover:text-white px-2 py-0.5 rounded bg-zinc-800/80 border border-purple-500/30 flex items-center gap-1 transition-all"
                            >
                              <Zap className="w-2.5 h-2.5 text-purple-400" />
                              <span>{label}</span>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="p-2.5 rounded-xl bg-zinc-800 border border-zinc-700/60 text-purple-300 text-xs flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  <span>Mari is reasoning...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompts & Input */}
          <div className="p-3 border-t border-zinc-800 bg-zinc-950/80 flex flex-col gap-2">
            <div className="flex gap-1 overflow-x-auto pb-1">
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(qp)}
                  disabled={isProcessing}
                  className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-400 hover:text-white whitespace-nowrap disabled:opacity-50"
                >
                  {qp}
                </button>
              ))}
            </div>

            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
                placeholder="Ask Mari anything about your business..."
                disabled={isProcessing}
                className="w-full pl-3 pr-10 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => handleSend(input)}
                disabled={!input.trim() || isProcessing}
                className="absolute right-1.5 top-1.5 p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-colors"
              >
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

