import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import axios from 'axios';
import { cn } from '@/lib/utils';

// Access API URL from environment or default to localhost
const getApiUrl = () => {
    let url = import.meta.env.VITE_API_URL;

    // Check if the URL is coming in without a protocol (common on Render)
    if (url && !url.startsWith('http')) {
        url = `https://${url}`;
    }

    // Fallback for local development or missing production env
    if (!url) {
        // If we are on the live site, try the primary Render backend URL
        if (typeof window !== 'undefined' && (window.location.hostname.includes('themaplin.com') || window.location.hostname.includes('onrender.com'))) {
            // Priority 1: Newly named service from render.yaml
            // Priority 2: Original service name
            url = 'https://alinew.onrender.com';
        } else {
            url = 'http://localhost:9090';
        }
    }

    console.log('--- Ziggy Debug ---');
    console.log('Environment variable VITE_API_URL:', import.meta.env.VITE_API_URL);
    console.log('Computed API_URL:', url);
    console.log('-------------------');

    return url;
};

const API_URL = getApiUrl();
const API_KEY = import.meta.env.VITE_API_KEY || 'AIzaSyByz1QviGaYVn3y3ax2S3E1Uhrrhw6J5j0';

// Global axios defaults for easier chat management
const chatAxios = axios.create({
    baseURL: API_URL,
    headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
    },
    timeout: 30000 // Match server timeout for Render stability
});

// Mascot Image Path
const MASCOT_IMAGE = '/assets/images/ziggie-mascot.jpeg';

const QUICK_REPLIES = {
    '🚀 Enterprise Solutions': "Ras Ali Labs provides advanced Enterprise AI technology. Here are our core offerings:\n\n1. Ralion OS (Business Operating System)\n2. Custom LLM & Mari AI Agents\n3. Sovereign Cloud & Database Architecture\n4. USSD-to-Web Infrastructure\n\nWhich area are you looking to explore?",
    '📅 Request Demo': "Let's innovate together! ⚡ I can help you schedule a demo or consultation with the Ras Ali Labs team.\n\nPlease tell me what you specifically need (e.g., 'I want to see Ralion CRM in action' or 'We need a custom AI agent'), and share your email/phone so we can confirm the slot.",
    '📍 Location': "Ras Ali Labs is headquartered in Gaborone, Botswana. 🇧🇼 We build sovereign digital infrastructure for enterprises globally.",
    '🤖 Who is Ziggy?': "Greetings! I'm Ziggy, the primary AI assistant for Ras Ali Labs. I'm powered by the Mari AI reasoning engine. I'm here to guide you through our enterprise systems, documentation, and help connect you with our engineering team."
};

const LOCAL_KNOWLEDGBASE = [
    {
        patterns: [/service/i, /what.*do/i, /offer/i, /help.*with/i],
        response: "Ras Ali Labs offers premium Enterprise AI and Software solutions:\n\n• **Enterprise AI**: Custom LLMs, Mari AI Reasoning Agents, and Vector Database Search.\n• **Business Operating Systems**: Implementation of Ralion OS tailored for Funeral, Logistics, and Health sectors.\n• **Software Architecture**: Micro-frontends, Supabase integrations, and high-performance React applications.\n• **Automation**: Event-driven business triggers and USSD-to-Web gateways.\n\nWhich of these solutions are you looking for?"
    },
    {
        patterns: [/demo/i, /book/i, /hire/i, /schedule/i, /consultation/i, /meeting/i],
        response: "Ready to transform your enterprise? 🚀 To schedule a demo or consultation with Ras Ali Labs, just drop your details (Name, Email/Phone) and tell me a bit about your organization's needs. I'll make sure our engineering team connects with you ASAP!"
    },
    {
        patterns: [/who.*ras/i, /about.*ras/i, /company/i, /labs/i],
        response: "Ras Ali Labs is a premier enterprise AI technology company based in Gaborone, Botswana. 🇧🇼\n\nWe build intelligent operating systems, business automation platforms, and sovereign digital infrastructure designed to help organizations automate operations and make smarter decisions."
    },
    {
        patterns: [/work/i, /portfolio/i, /project/i, /example/i, /product/i, /system/i],
        response: "Our ecosystem includes several flagship products and platforms! 🚀\n\n• **Ralion OS**: The comprehensive AI business operating system.\n• **Mari AI Engine**: Embedded reasoning and document intelligence.\n• **TradeGrid Africa**: Sovereign B2B trade infrastructure.\n• **Custom Platforms**: Various high-performance digital platforms across logistics, education, and finance.\n\nYou can explore our 'Products' or 'Works' sections for a deeper look."
    },
    {
        patterns: [/price/i, /cost/i, /how.*much/i, /rate/i, /pricing/i],
        response: "Enterprise pricing varies depending on the scale of the implementation, required AI reasoning capabilities, and infrastructure demands. 💎 To give you an accurate quote for Ralion OS or a custom build, we'll need a few details about your enterprise. Shall we get your contact info so our team can send you a breakdown?"
    },
    {
        patterns: [/hello/i, /hi /i, /yo/i, /hey/i],
        response: "Greetings! Ziggy here. Systems online. How can I assist you with Ras Ali Labs' enterprise solutions today?"
    }
];

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

    const handleQuickReply = (key) => {
        const text = QUICK_REPLIES[key];
        setMessages(prev => [
            ...prev,
            { role: 'user', content: key },
            { role: 'assistant', content: text }
        ]);
    };

    const handleLeadSubmit = async (e) => {
        e.preventDefault();
        if (!leadFormData.name || !leadFormData.email) return;

        setIsLoading(true);
        try {
            await chatAxios.post('/api/leads', {
                sessionId,
                ...leadFormData,
                source: 'ziggy_web_intro'
            });

            localStorage.setItem('chat_lead_info', JSON.stringify(leadFormData));
            setShowLeadForm(false);
            setMessages(prev => [...prev, { role: 'assistant', content: `Excellent! Nice to meet you, ${leadFormData.name}. 🚀 How can I help you explore Ras Ali Labs' ecosystem today?` }]);
        } catch (error) {
            console.error('Failed to save lead info:', error);
            setShowLeadForm(false);
            setMessages(prev => [...prev, { role: 'assistant', content: "Thanks for the info! How can I help you with our enterprise solutions today?" }]);
        } finally {
            setIsLoading(false);
        }
    };

    const initChatSession = async () => {
        const hasLeadInfo = localStorage.getItem('chat_lead_info');

        // 1. Immediately Set Greeting (Crucial for UX)
        if (!hasLeadInfo) {
            setShowLeadForm(true);
            setMessages([
                {
                    role: 'assistant',
                    content: "Greetings! I'm Ziggy, the AI assistant for Ras Ali Labs. ⚡ I'm here to help you navigate our enterprise systems, Ralion OS, and AI automation solutions.\n\nI can assist you with product demos, documentation, or technical consultations.\n\nBefore we dive in, what's your name?"
                }
            ]);
        } else {
            const leadInfo = JSON.parse(hasLeadInfo);
            setMessages([
                {
                    role: 'assistant',
                    content: `Welcome back, ${leadInfo.name}! 🚀 Ziggy here. How can I assist you with our enterprise solutions today?`
                }
            ]);
        }

        // 2. Resolve Session ID
        let storedSessionId = localStorage.getItem('chat_session_id');
        if (storedSessionId === 'undefined' || storedSessionId === 'null') {
            storedSessionId = null;
        }

        if (!storedSessionId) {
            try {
                console.log('Ziggy attempting connection to:', `${API_URL}/api/sessions`);
                const response = await chatAxios.post('/api/sessions', {
                    userId: `user-${Math.random().toString(36).substr(2, 9)}`,
                    metadata: { source: 'web_ziggy' }
                });
                storedSessionId = response.data.id;
                localStorage.setItem('chat_session_id', storedSessionId);
                console.log('Ziggy Connected! Session:', storedSessionId);
            } catch (error) {
                console.error('Ziggy Connection Error:', error.message);
            }
        }

        setSessionId(storedSessionId);

        // 3. Load History if available
        if (storedSessionId && hasLeadInfo) {
            try {
                const historyRes = await chatAxios.get(`/api/chat/${storedSessionId}`);
                if (historyRes.data.messages && historyRes.data.messages.length > 0) {
                    setMessages(historyRes.data.messages.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    })));
                }
            } catch (error) {
                console.warn('Could not sync history:', error.message);
                if (error.response?.status === 404) {
                    console.log('Invalid session ID detected. Clearing for next run.');
                    localStorage.removeItem('chat_session_id');
                }
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

        // --- PHASE 1: Local Knowledge Check (Non-AI) ---
        const localMatch = LOCAL_KNOWLEDGBASE.find(item =>
            item.patterns.some(pattern => pattern.test(userMessage))
        );

        if (localMatch) {
            // Artificial delay for "Ziggy is thinking" vibe
            setTimeout(() => {
                setMessages(prev => [...prev, { role: 'assistant', content: localMatch.response }]);
                setIsLoading(false);
            }, 600);
            return;
        }

        // --- PHASE 2: AI Backend Call ---
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
            const response = await chatAxios.post('/api/chat', {
                sessionId: currentSessionId,
                message: userMessage
            });

            const assistantMessage = response.data.response;
            setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
        } catch (error) {
            console.error('Ziggy Send Error:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data,
                config: error.config
            });
            setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting right now. Status: " + (error.response?.status || 'Network Error') }]);
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
                                <div className="w-10 h-10 rounded-full border border-green-500/30 overflow-hidden shadow-sm bg-white">
                                    <img
                                        src={MASCOT_IMAGE}
                                        alt="Ziggy Mascot"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-emerald-400">Ziggy</CardTitle>
                                    <p className="text-xs text-muted-foreground">Ras Ali Labs AI Assistant</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-green-500/20" onClick={() => setIsOpen(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </CardHeader>

                        <CardContent className="flex-1 p-0 overflow-hidden relative flex flex-col">
                            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
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
                                        {msg.role !== 'user' ? (
                                            <div className="flex items-start gap-2">
                                                <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 mt-0.5 border border-green-500/20">
                                                    <img src={MASCOT_IMAGE} alt="Bot" className="w-full h-full object-cover" />
                                                </div>
                                                <div>{msg.content}</div>
                                            </div>
                                        ) : (
                                            <div>{msg.content}</div>
                                        )}
                                    </div>
                                ))}

                                {/* Quick Replies */}
                                {!showLeadForm && messages.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-2 pb-4">
                                        {Object.keys(QUICK_REPLIES).map((key) => (
                                            <button
                                                key={key}
                                                onClick={() => handleQuickReply(key)}
                                                className="px-3 py-1.5 rounded-full border border-green-500/30 bg-green-500/5 text-[11px] text-green-400 hover:bg-green-500/20 transition-all"
                                            >
                                                {key}
                                            </button>
                                        ))}
                                    </div>
                                )}

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
                        mascotState === 'walking' && "animate-bounce", // Bobbing while walking
                        mascotState === 'idle' && "animate-pulse" // Breathing/Pulse when idle
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
                        "h-16 w-16 rounded-full shadow-lg flex items-center justify-center transition-all duration-500 border-2 border-green-500/50 bg-white overflow-hidden",
                        mascotState === 'sleeping'
                            ? "grayscale opacity-80 scale-95" // Sleeping style
                            : "hover:scale-110 hover:shadow-green-500/50 shadow-green-500/20" // Awake style
                    )}>
                        <img
                            src={MASCOT_IMAGE}
                            alt="Ziggie Mascot"
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
