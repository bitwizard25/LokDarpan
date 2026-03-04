import React, { useState } from 'react';

interface AIPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSeek: (timeInSeconds: number) => void;
}

export function AIPanel({ isOpen, onClose, onSeek }: AIPanelProps) {
    const [query, setQuery] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'ai', content: "Hello! I'm your LokDarpan AI assistant. I've analyzed this video. What would you like to know?" },
        { role: 'user', content: "Where do they talk about the primary architecture?" },
        {
            role: 'ai',
            content: "They discuss the primary spatial architecture in detail here:",
            timestamp: { display: "04:20", seconds: 260 }
        }
    ]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setMessages(prev => [...prev, { role: 'user', content: query }]);
        setQuery("");
        setIsThinking(true);

        // Mock AI response
        setTimeout(() => {
            setIsThinking(false);
            setMessages(prev => [...prev, {
                role: 'ai',
                content: "I found another relevant section regarding the glassmorphism foundations:",
                timestamp: { display: "12:05", seconds: 725 }
            }]);
        }, 1500);
    };

    return (
        <div
            className={`fixed inset-x-0 bottom-0 md:inset-x-auto md:top-0 md:right-0 md:bottom-0 w-full md:w-[400px] h-[60vh] md:h-full z-[60] transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-x-full md:translate-y-0'}`}
        >
            <div className="absolute inset-0 bg-dark-950/80 backdrop-blur-2xl md:border-l border-t md:border-t-0 border-white/10 shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.8)] md:shadow-[-20px_0_50px_-20px_rgba(0,0,0,0.8)] flex flex-col rounded-t-3xl md:rounded-none overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent-500/20 flex items-center justify-center">
                            <svg className="w-4 h-4 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h3 className="font-display font-bold text-white text-lg">Nexus AI</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-dark-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6 scrollbar-hide">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'user' ? (
                                <p className="text-dark-400 text-sm leading-relaxed max-w-[85%] text-right">{msg.content}</p>
                            ) : (
                                <div className="max-w-[85%] flex flex-col items-start">
                                    <p className="text-gray-100 text-sm leading-relaxed">{msg.content}</p>

                                    {msg.timestamp && (
                                        <button
                                            onClick={() => onSeek(msg.timestamp!.seconds)}
                                            className="mt-3 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-accent-400 text-xs font-bold hover:bg-white/20 hover:border-accent-400/50 shadow-glow-subtle hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                            </svg>
                                            Jump to {msg.timestamp.display}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    {isThinking && (
                        <div className="flex justify-start">
                            <style>{`
                                @keyframes shimmer {
                                    0% { background-position: 200% center; }
                                    100% { background-position: -200% center; }
                                }
                            `}</style>
                            <p
                                className="text-sm font-medium bg-gradient-to-r from-dark-400 via-gray-100 to-dark-400 bg-clip-text text-transparent"
                                style={{ backgroundSize: '200% auto', animation: 'shimmer 2s linear infinite' }}
                            >
                                Scanning video context...
                            </p>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 md:p-6 border-t border-white/5 bg-transparent shrink-0">
                    <form onSubmit={handleSend} className="relative flex items-center">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ask about this video..."
                            className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl pl-5 pr-12 py-3.5 text-white placeholder-dark-400 focus:ring-1 focus:ring-accent-500/50 focus:border-accent-500/50 text-sm transition-all focus:outline-none"
                        />
                        <button
                            type="submit"
                            disabled={!query.trim()}
                            className="absolute right-2 p-2.5 rounded-xl bg-accent-500 text-dark-900 disabled:opacity-50 disabled:bg-dark-700 disabled:text-dark-500 transition-colors shadow-glow-subtle flex items-center justify-center cursor-pointer"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
