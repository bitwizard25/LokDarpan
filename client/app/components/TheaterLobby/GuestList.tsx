import { GlassContainer } from "~/components/UI/GlassContainer";
import type { User } from "./types";
import { useAppStore } from "~/store/useAppStore";

interface GuestListProps {
    isOpen: boolean;
    onClose: () => void;
    users: User[];
}

export function GuestList({ isOpen, onClose, users }: GuestListProps) {
    const { setTheaterMode } = useAppStore();

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-24 left-6 z-[60] w-72 md:w-80 animate-slide-up origin-bottom-left">
            <GlassContainer className="p-4 rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] bg-black/60 backdrop-blur-2xl flex flex-col max-h-[60vh]">

                {/* Header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                    <h3 className="text-white font-bold tracking-wide">Theater Guests <span className="text-dark-400 text-sm font-normal">({users.length})</span></h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-white/10 text-dark-400 hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* User List Scrollable Area */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                    {users.map((user) => (
                        <div key={user.id} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                {/* Small Avatar Orb */}
                                <div
                                    className={`relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${user.isMuted ? 'opacity-70 grayscale-[50%]' : ''}`}
                                    style={{
                                        background: `linear-gradient(135deg, ${user.color.replace('1)', '0.8)')}, ${user.color.replace('1)', '0.4)')})`,
                                        boxShadow: user.isSpeaking ? `0 0 12px ${user.color.replace('1)', '0.6)')}` : undefined,
                                    }}
                                >
                                    {user.avatar}
                                    {user.isSpeaking && (
                                        <div
                                            className="absolute inset-0 rounded-full border-2 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite] opacity-60"
                                            style={{ borderColor: user.color }}
                                        />
                                    )}
                                </div>

                                <span className={`text-sm font-medium ${user.isSpeaking ? 'text-white' : 'text-dark-300'}`}>
                                    {user.name}
                                </span>
                            </div>

                            {/* Status Icons */}
                            <div className="flex items-center gap-2 relative">
                                {user.isSpeaking && (
                                    <span className="text-primary-400 text-xs font-semibold animate-pulse">Speaking</span>
                                )}
                                {user.isMuted && (
                                    <svg className="w-4 h-4 text-red-500/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11v2a7 7 0 01-14 0v-2m14-4L5 19" />
                                    </svg>
                                )}

                                {/* Hover Reaction Triggers (Simulated) */}
                                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-white/10 rounded-full text-xl hover:scale-110 active:scale-95 absolute right-full mr-2">
                                    🔥
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Controls */}
                <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center">
                    <button className="text-xs font-medium text-dark-300 hover:text-white transition-colors flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-white/5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Copy Invite
                    </button>
                    <button
                        onClick={() => {
                            setTheaterMode(false);
                            onClose();
                        }}
                        className="text-xs font-bold text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-full transition-colors"
                    >
                        Leave Theater
                    </button>
                </div>

            </GlassContainer>
        </div>
    );
}
