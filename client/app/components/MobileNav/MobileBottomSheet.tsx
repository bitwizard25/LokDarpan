import { Link } from "@remix-run/react";
import { useEffect } from "react";
import { useAppStore } from "~/store/useAppStore";

interface MobileBottomSheetProps {
    user?: {
        name: string;
        channel?: string;
    } | null;
}

const menuItems = [
    { icon: "library", label: "Your Library", path: "/library" },
    { icon: "clock", label: "Watch Later", path: "/watch-later" },
    { icon: "download", label: "Downloads", path: "/downloads" },
    { icon: "settings", label: "Settings", path: "/settings" },
    { icon: "help", label: "Help & Feedback", path: "/help" },
];

export function MobileBottomSheet({ user }: MobileBottomSheetProps) {
    const { isMobileSheetOpen, setMobileSheetOpen } = useAppStore();

    // Lock body scroll when sheet is open
    useEffect(() => {
        if (isMobileSheetOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isMobileSheetOpen]);

    return (
        <div className="md:hidden">
            {/* Overlay */}
            <div
                className={`fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isMobileSheetOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                    }`}
                onClick={() => setMobileSheetOpen(false)}
            />

            {/* Sheet */}
            <div
                className={`fixed bottom-0 left-0 right-0 z-[60] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isMobileSheetOpen ? "translate-y-0" : "translate-y-full"
                    }`}
                style={{ height: "70vh" }}
            >
                <div className="h-full bg-dark-900/95 backdrop-blur-2xl rounded-t-3xl border-t border-x border-white/10 flex flex-col overflow-hidden">
                    {/* Drag Handle */}
                    <div className="flex justify-center pt-3 pb-4 cursor-grab" onClick={() => setMobileSheetOpen(false)}>
                        <div className="w-10 h-1 rounded-full bg-dark-600" />
                    </div>

                    {/* User Section */}
                    <div className="px-6 pb-5 border-b border-white/5">
                        {user ? (
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-xl border-2 border-white/20 shadow-glow-sm">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-semibold text-lg truncate">{user.name}</p>
                                    {user.channel && (
                                        <p className="text-dark-400 text-sm truncate">@{user.channel}</p>
                                    )}
                                </div>
                                <Link
                                    to="/profile"
                                    onClick={() => setMobileSheetOpen(false)}
                                    className="px-4 py-2 rounded-full border border-white/10 text-sm text-dark-300 hover:text-white hover:border-white/20 transition-colors"
                                >
                                    View
                                </Link>
                            </div>
                        ) : (
                            <Link
                                to="/auth/login"
                                onClick={() => setMobileSheetOpen(false)}
                                className="flex items-center justify-center gap-3 w-full py-3.5 bg-white text-black font-semibold rounded-xl active:scale-[0.97] transition-transform"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                </svg>
                                Sign In
                            </Link>
                        )}
                    </div>

                    {/* Menu Items */}
                    <div className="flex-1 overflow-y-auto px-4 py-4">
                        <ul className="space-y-1">
                            {menuItems.map((item) => (
                                <li key={item.path}>
                                    <Link
                                        to={item.path}
                                        onClick={() => setMobileSheetOpen(false)}
                                        className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-dark-300 hover:text-white hover:bg-white/5 active:scale-[0.97] transition-all"
                                    >
                                        {getMenuIcon(item.icon)}
                                        <span className="font-medium">{item.label}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Upgrade CTA */}
                    <div className="px-6 pb-8 pt-4 border-t border-white/5">
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-primary-900/40 to-dark-900 border border-white/5 text-center">
                            <p className="text-xs text-dark-400 mb-2">Go Ad-Free with Premium</p>
                            <button className="w-full py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-semibold text-white transition-colors active:scale-[0.97]">
                                Upgrade
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function getMenuIcon(name: string) {
    switch (name) {
        case "library":
            return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            );
        case "clock":
            return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
        case "download":
            return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            );
        case "settings":
            return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            );
        case "help":
            return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
        default:
            return null;
    }
}
