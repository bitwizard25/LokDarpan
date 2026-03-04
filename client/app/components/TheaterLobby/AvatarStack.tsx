import { useState } from "react";
import { useAppStore } from "~/store/useAppStore";
import { GuestList } from "./GuestList";
import { mockUsers } from "./types";

export function AvatarStack() {
    const { isTheaterMode } = useAppStore();
    const [isGuestListOpen, setIsGuestListOpen] = useState(false);

    if (!isTheaterMode) return null;

    const displayUsers = mockUsers.slice(0, 3);
    const remainingCount = mockUsers.length - displayUsers.length;

    return (
        <>
            <div className="fixed bottom-6 left-6 z-50 animate-slide-up hover:scale-105 active:scale-95 transition-transform duration-300">
                <button
                    onClick={() => setIsGuestListOpen(true)}
                    className="flex items-center -space-x-3 cursor-pointer group"
                >
                    {displayUsers.map((user, index) => (
                        <div
                            key={user.id}
                            className="relative w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-[#0A0A0B] flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all duration-300"
                            style={{
                                background: `linear-gradient(135deg, ${user.color.replace('1)', '0.8)')}, ${user.color.replace('1)', '0.4)')})`,
                                zIndex: displayUsers.length - index,
                            }}
                        >
                            {/* Speaking Indicator Ring */}
                            {user.isSpeaking && (
                                <div
                                    className="absolute inset-0 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-50 z-0 pointer-events-none"
                                    style={{ backgroundColor: user.color }}
                                />
                            )}
                            <span className="relative z-10 text-sm md:text-base">{user.avatar}</span>
                        </div>
                    ))}

                    {/* Remaining Count Indicator */}
                    {remainingCount > 0 && (
                        <div
                            className="relative w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-[#0A0A0B] bg-dark-800 flex items-center justify-center font-bold text-white text-xs md:text-sm shadow-[0_0_15px_rgba(0,0,0,0.5)] z-0"
                        >
                            +{remainingCount}
                        </div>
                    )}
                </button>
            </div>

            {/* Render the expandable Guest List Panel conditionally */}
            <GuestList
                isOpen={isGuestListOpen}
                onClose={() => setIsGuestListOpen(false)}
                users={mockUsers}
            />
        </>
    );
}
