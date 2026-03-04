import React, { useState } from "react";

interface User {
    id: string;
    name: string;
    avatar: string;
    color: string;
    isSpeaking?: boolean;
    isTyping?: boolean;
}

const mockUsers: User[] = [
    { id: "1", name: "You", avatar: "A", color: "rgba(59, 130, 246, 1)" },
    { id: "2", name: "Sarah", avatar: "S", color: "rgba(236, 72, 153, 1)", isSpeaking: true },
    { id: "3", name: "Mike", avatar: "M", color: "rgba(16, 185, 129, 1)", isTyping: true },
    { id: "4", name: "Emma", avatar: "E", color: "rgba(245, 158, 11, 1)" },
];

export function TheaterLobby({ onClose, onEnter }: { onClose: () => void, onEnter: () => void }) {
    const [invited, setInvited] = useState(false);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-dark-950/90 backdrop-blur-2xl px-4 animate-fade-in">
            {/* Ambient Background for Lobby */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[40%] h-[40%] bg-primary-500/10 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-[30%] h-[30%] bg-accent-500/10 rounded-full blur-[100px] animate-pulse" />
            </div>

            <div className="relative z-10 w-full max-w-2xl glass-panel p-8 md:p-12 rounded-3xl border-white/10 shadow-minimal-hover transform animate-slide-up flex flex-col items-center text-center">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-dark-400 hover:text-white transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 p-[2px] mb-6 shadow-glow-subtle">
                    <div className="w-full h-full bg-dark-900 rounded-[14px] flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </div>
                </div>

                <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">Theater Lobby</h2>
                <p className="text-dark-400 mb-10 max-w-sm">Invite friends to your spatial room. Content syncs automatically when everyone is ready.</p>

                {/* Spatial Avatars */}
                <div className="flex justify-center items-center gap-4 md:gap-8 mb-12">
                    {mockUsers.map((user) => (
                        <div key={user.id} className="relative flex flex-col items-center group">
                            <div className="relative">
                                {/* Pulsing Audio Ring */}
                                {user.isSpeaking && (
                                    <div
                                        className="absolute inset-0 rounded-full animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite] opacity-60 pointer-events-none"
                                        style={{ backgroundColor: user.color }}
                                    />
                                )}
                                <div
                                    className={`relative z-10 w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-xl font-bold text-white transition-all duration-500 ${user.isSpeaking ? 'scale-110 ring-2 ring-offset-4 ring-offset-dark-900 border-transparent' : 'hover:scale-105 border border-white/10'
                                        }`}
                                    style={{
                                        background: `linear-gradient(135deg, ${user.color.replace('1)', '0.8)')}, ${user.color.replace('1)', '0.4)')})`,
                                        boxShadow: user.isSpeaking ? `0 0 40px ${user.color.replace('1)', '0.6)')}` : `0 0 15px ${user.color.replace('1)', '0.2)')}`,
                                        borderColor: user.isSpeaking ? user.color : undefined
                                    }}
                                >
                                    {user.avatar}
                                </div>
                            </div>

                            <span className="mt-4 text-sm font-medium text-white">{user.name}</span>

                            {/* Status Indicators */}
                            <div className="absolute -bottom-8 flex justify-center text-xs">
                                {user.isSpeaking && (
                                    <span className="text-primary-400 animate-pulse bg-primary-500/10 px-2.5 py-1 rounded-full backdrop-blur-md border border-primary-500/20 font-medium">Speaking...</span>
                                )}
                                {user.isTyping && (
                                    <span className="text-dark-300 animate-bounce bg-white/5 px-2.5 py-1 rounded-full backdrop-blur-md border border-white/10 font-medium">Typing...</span>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Invite Button */}
                    <button
                        onClick={() => setInvited(true)}
                        className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center bg-dark-800 border-2 border-dashed border-white/20 text-white hover:border-primary-500 hover:text-primary-400 hover:bg-primary-500/10 transition-all active:scale-95`}
                    >
                        {invited ? (
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        )}
                    </button>
                </div>

                <button
                    onClick={onEnter}
                    className="w-full md:w-auto px-10 py-4 btn-primary rounded-xl text-lg relative overflow-hidden group"
                >
                    <span className="relative z-10 font-bold tracking-wide">Enter Theater</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-accent-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </button>
            </div>
        </div>
    );
}

