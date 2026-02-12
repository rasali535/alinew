import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, User, Bot, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import axios from 'axios';
import { cn } from '@/lib/utils';

// Access API URL from environment or default to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9090';

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const scrollRef = useRef(null);
    const [showLeadForm, setShowLeadForm] = useState(false);
    const [leadFormData, setLeadFormData] = useState({ name: '', email: '', phone: '' });

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen, showLeadForm]);

    const handleLeadSubmit = async (e) => {
        e.preventDefault();
        if (!leadFormData.name || !leadFormData.email) return;

        setIsLoading(true);
        try {
            await axios.post(`${API_URL}/api/leads`, {
                sessionId,
                ...leadFormData
            });

            localStorage.setItem('chat_lead_info', JSON.stringify(leadFormData));
            setShowLeadForm(false);
            setMessages(prev => [...prev, { role: 'assistant', content: `Nice to meet you, ${leadFormData.name}! How can I help you today?` }]);
        } catch (error) {
            console.error('Failed to save lead info:', error);
            // Allow them to proceed anyway? Or show error?
            // Let's allow proceed to avoid blocking
            setShowLeadForm(false);
            setMessages(prev => [...prev, { role: 'assistant', content: "Thanks! How can I help you today?" }]);
        } finally {
            setIsLoading(false);
        }
    };

    const initChatSession = async () => {
        let storedSessionId = localStorage.getItem('chat_session_id');
        if (storedSessionId === 'undefined' || storedSessionId === 'null') {
            storedSessionId = null;
        }
        const hasLeadInfo = localStorage.getItem('chat_lead_info');

        if (!storedSessionId) {
            try {
                // Create new session
                const response = await axios.post(`${API_URL}/api/sessions`, {
                    userId: `user-${Math.random().toString(36).substr(2, 9)}`, // Simple random ID
                    metadata: { source: 'web_widget' }
                });
                storedSessionId = response.data.id;
                localStorage.setItem('chat_session_id', storedSessionId);
            } catch (error) {
                console.error('Failed to create session:', error);
                return null;
            }
        }

        setSessionId(storedSessionId);

        // Check if we need to collect lead info
        if (!hasLeadInfo) {
            setShowLeadForm(true);
            setMessages([
                {
                    role: 'assistant',
                    content: "Hello! I'm Ziggie, Ras Ali's AI assistant. 🎸 I'm here to help you explore his work in music, sound engineering, and tech development.\n\nI can assist you with:\n• Professional Bass Performance\n• Sound Engineering (Mixing/Mastering)\n• Creative Videography\n• Full-Stack Development\n\nBefore we start, could you please introduce yourself?"
                }
            ]);
        } else {
            // If we have lead info, verify history or just greet
            try {
                const historyRes = await axios.get(`${API_URL}/api/chat/${storedSessionId}`);
                if (historyRes.data.messages && historyRes.data.messages.length > 0) {
                    setMessages(historyRes.data.messages.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    })));
                } else {
                    const leadInfo = JSON.parse(hasLeadInfo);
                    setMessages([
                        {
                            role: 'assistant',
                            content: `Welcome back, ${leadInfo.name}! 👋 I'm Ziggie. How can I assist you with Ras Ali's services today?`
                        }
                    ]);
                }
            } catch (error) {
                console.error('Failed to load history', error);
                setMessages([
                    {
                        role: 'assistant',
                        content: "Hello again! I'm Ziggie, Ras Ali's AI assistant. How can I help you today?"
                    }
                ]);
            }
        }
        return storedSessionId;
    };

    // Initialize session and greeting
    useEffect(() => {
        initChatSession();

        // Auto-open chat after 3 seconds for new visitors
        const hasSeenGreeting = sessionStorage.getItem('has_seen_greeting');
        if (!hasSeenGreeting) {
            const timer = setTimeout(() => {
                setIsOpen(true);
                sessionStorage.setItem('has_seen_greeting', 'true');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleSendMessage = async (e) => {
        e.preventDefault();

        if (!inputValue.trim()) return;

        // Optimistically add user message
        const userMessage = inputValue.trim();
        setInputValue('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        // Check sessionId, retry init if missing
        let currentSessionId = sessionId;
        if (!currentSessionId) {
            currentSessionId = await initChatSession();
            if (!currentSessionId) {
                setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting to the server. Please try again later." }]);
                setIsLoading(false);
                return;
            }
        }

        try {
            const response = await axios.post(`${API_URL}/api/chat`, {
                sessionId: currentSessionId,
                message: userMessage
            });

            const assistantMessage = response.data.response;
            setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
        } catch (error) {
            console.error('Failed to send message:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting right now. Please check your connection." }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Mascot State
    const [mascotState, setMascotState] = useState('idle'); // idle, walking, sleeping
    const [mascotPosition, setMascotPosition] = useState({ bottom: '24px', right: '24px' });
    const idleTimerRef = useRef(null);
    const walkIntervalRef = useRef(null);

    // Reset idle timer on interaction
    const resetIdleTimer = () => {
        if (mascotState === 'sleeping') {
            setMascotState('idle'); // Wake up
        }
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

        idleTimerRef.current = setTimeout(() => {
            if (!isOpen) {
                setMascotState('sleeping');
            }
        }, 15000); // Sleep after 15 seconds of inactivity
    };

    // Handle Walking Logic
    useEffect(() => {
        if (isOpen) {
            setMascotState('chatting');
            return;
        } else if (mascotState === 'chatting') {
            setMascotState('idle');
        }

        if (mascotState === 'sleeping') {
            // Stop walking if sleeping
            if (walkIntervalRef.current) clearInterval(walkIntervalRef.current);
            return;
        }

        // Start walking if idle
        if (mascotState === 'idle' || mascotState === 'walking') {
            if (walkIntervalRef.current) clearInterval(walkIntervalRef.current);

            walkIntervalRef.current = setInterval(() => {
                // Random decision to walk
                if (Math.random() > 0.6) {
                    setMascotState('walking');
                    // Pick random position in bottom right area (screen safe)
                    // Limit to: Bottom 0-20%, Right 0-30% to stay accessible
                    const randomBottom = Math.floor(Math.random() * 150) + 20;
                    const randomRight = Math.floor(Math.random() * 300) + 20;

                    setMascotPosition({
                        bottom: `${randomBottom}px`,
                        right: `${randomRight}px`
                    });

                    // Return to idle after walking
                    setTimeout(() => setMascotState('idle'), 2000); // Walk duration
                }
            }, 5000); // Check every 5s
        }

        return () => {
            if (walkIntervalRef.current) clearInterval(walkIntervalRef.current);
        };
    }, [mascotState, isOpen]);

    // Initial Idle Timer
    useEffect(() => {
        resetIdleTimer();
        window.addEventListener('mousemove', resetIdleTimer);
        window.addEventListener('click', resetIdleTimer);
        return () => {
            window.removeEventListener('mousemove', resetIdleTimer);
            window.removeEventListener('click', resetIdleTimer);
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        };
    }, [isOpen]);

    return (
        <div className="fixed z-50 pointer-events-none" style={{ inset: 0 }}>
            {/* Chat Window - Fixed Position */}
            <div className={cn(
                "absolute bottom-6 right-6 pointer-events-auto transition-all duration-300 origin-bottom-right",
                isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0"
            )}>
                {isOpen && (
                    <Card className="w-[350px] sm:w-[400px] h-[550px] shadow-xl border-border flex flex-col bg-background border-green-500/20">
                        <CardHeader className="p-4 border-b bg-green-500/10 flex flex-row items-center justify-between space-y-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center shadow-md">
                                    <Bot className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-emerald-400">Ziggie</CardTitle>
                                    <p className="text-xs text-muted-foreground">Ras Ali's AI Assistant</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-green-500/20" onClick={() => setIsOpen(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </CardHeader>

                        <CardContent className="flex-1 p-0 overflow-hidden relative">
                            <div ref={scrollRef} className="h-full overflow-y-auto p-4 space-y-4">
                                {messages.map((msg, index) => (
                                    <div
                                        key={index}
                                        className={cn(
                                            "flex w-max max-w-[85%] flex-col gap-2 rounded-2xl px-4 py-3 text-sm shadow-sm whitespace-pre-wrap",
                                            msg.role === 'user'
                                                ? "ml-auto bg-green-600 text-white rounded-br-none"
                                                : "bg-muted/80 backdrop-blur-sm rounded-bl-none border border-border/50"
                                        )}
                                    >
                                        {msg.content}
                                    </div>
                                ))}

                                {/* Lead Form inside Chat */}
                                {showLeadForm && (
                                    <div className="bg-muted/50 p-4 rounded-xl border border-green-500/10 space-y-3 animate-in fade-in zoom-in-95 duration-300">
                                        <p className="text-sm font-medium text-foreground/80 mb-2">Please share your details to continue:</p>
                                        <form onSubmit={handleLeadSubmit} className="space-y-3">
                                            <Input
                                                placeholder="Your Name"
                                                value={leadFormData.name}
                                                onChange={e => setLeadFormData({ ...leadFormData, name: e.target.value })}
                                                required
                                                className="bg-background/80 focus-visible:ring-green-500/50"
                                            />
                                            <Input
                                                placeholder="Email Address"
                                                type="email"
                                                value={leadFormData.email}
                                                onChange={e => setLeadFormData({ ...leadFormData, email: e.target.value })}
                                                required
                                                className="bg-background/80 focus-visible:ring-green-500/50"
                                            />
                                            <Input
                                                placeholder="Phone Number (Optional)"
                                                type="tel"
                                                value={leadFormData.phone}
                                                onChange={e => setLeadFormData({ ...leadFormData, phone: e.target.value })}
                                                className="bg-background/80 focus-visible:ring-green-500/50"
                                            />
                                            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white" disabled={isLoading}>
                                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                                Start Chatting
                                            </Button>
                                        </form>
                                    </div>
                                )}

                                {isLoading && !showLeadForm && (
                                    <div className="flex w-max max-w-[80%] flex-col gap-2 rounded-lg px-3 py-2 text-sm bg-muted/50">
                                        <div className="flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                            <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                            <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce"></span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>

                        <CardFooter className="p-3 border-t bg-background/50 backdrop-blur-md">
                            <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
                                <Input
                                    type="text"
                                    placeholder={showLeadForm ? "Please fill the form above..." : "Type your message..."}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    disabled={isLoading || showLeadForm}
                                    className="flex-1 bg-background/80 focus-visible:ring-green-500/50"
                                />
                                <Button type="submit" size="icon" disabled={isLoading || !inputValue.trim() || showLeadForm} className="bg-green-600 hover:bg-green-700 shadow-sm text-white">
                                    <Send className="h-4 w-4" />
                                    <span className="sr-only">Send</span>
                                </Button>
                            </form>
                        </CardFooter>
                    </Card>
                )}
            </div>

            {/* Living Mascot - Moves Around */}
            {!isOpen && (
                <div
                    className={cn(
                        "absolute pointer-events-auto transition-all duration-[2000ms] ease-in-out cursor-pointer group flex flex-col items-center",
                        mascotState === 'walking' && "animate-bounce" // Bobbing while walking
                    )}
                    style={{
                        bottom: mascotPosition.bottom,
                        right: mascotPosition.right
                    }}
                    onClick={() => {
                        setIsOpen(true);
                        setMascotState('chatting');
                    }}
                    onMouseEnter={() => {
                        if (mascotState === 'sleeping') setMascotState('idle');
                    }}
                >
                    {/* Speech Bubble / Zzz */}
                    {mascotState === 'sleeping' && (
                        <div className="absolute -top-8 right-0 animate-pulse text-blue-400 font-bold text-xl select-none">
                            Zzz...
                        </div>
                    )}

                    <div className={cn(
                        "h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-500",
                        mascotState === 'sleeping'
                            ? "bg-slate-700 scale-90 opacity-80" // Sleeping style
                            : "bg-green-600 hover:bg-green-700 hover:scale-105" // Awake style
                    )}>
                        {mascotState === 'sleeping' ? (
                            <Bot className="h-7 w-7 text-slate-400 rotate-12" /> // Sleeping icon pose
                        ) : (
                            <MessageSquare className="h-7 w-7 text-white" />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
