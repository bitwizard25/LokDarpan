import React, { useState } from 'react';
import { KineticButton } from '../UI/KineticButton';

interface AIPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSeek: (timeInSeconds: number) => void;
}

export function AIPanel({ isOpen, onClose, onSeek }: AIPanelProps) {
    const [query, setQuery] = useState("");
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

        // Mock AI response
        setTimeout(() => {
            setMessages(prev => [...prev, {
                role: 'ai',
                content: "I found another relevant section regarding the glassmorphism foundations:",
                timestamp: { display: "12:05", seconds: 725 }
            }]);
        }, 1000);
    };

    return (
        <div
            className={`fixed top-0 right-0 bottom-0 w-full md:w-[400px] z-[60] transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
            <div className="absolute inset-0 bg-dark-900/80 backdrop-blur-3xl border-l border-white/10 shadow-[-20px_0_50px_-20px_rgba(0,0,0,0.8)] flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
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
                        className="p-2 rounded-full text-dark-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-dark-800 border border-white/5 text-dark-100 rounded-bl-sm'}`}>
                                <p className="text-sm leading-relaxed">{msg.content}</p>

                                {msg.timestamp && (
                                    <button
                                        onClick={() => onSeek(msg.timestamp!.seconds)}
                                        className="mt-3 px-3 py-1.5 rounded-full bg-accent-500/10 border border-accent-500/30 text-accent-400 text-xs font-bold hover:bg-accent-500/20 hover:border-accent-500/50 hover:shadow-glow-subtle transition-all active:scale-95 flex items-center gap-1.5 inline-flex"
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Jump to {msg.timestamp.display}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Input Area */}
                <div className="p-6 border-t border-white/5 bg-dark-950/50">
                    <form onSubmit={handleSend} className="relative flex items-center">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ask about this video..."
                            className="w-full bg-dark-800 border-none rounded-2xl pl-5 pr-12 py-4 text-white placeholder-dark-400 focus:ring-1 focus:ring-accent-500/50 text-sm"
                        />
                        <button
                            type="submit"
                            disabled={!query.trim()}
                            className="absolute right-2 p-2.5 rounded-xl bg-accent-500 text-dark-900 disabled:opacity-50 disabled:bg-dark-700 disabled:text-dark-500 transition-colors shadow-glow-subtle"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
