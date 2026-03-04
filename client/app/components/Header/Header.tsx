import { Link, Form, useSubmit } from "@remix-run/react";
import { useState, useEffect } from "react";
import { TheaterLobby } from "~/components/TheaterLobby/TheaterLobby";
import { useAppStore } from "~/store/useAppStore";

interface HeaderProps {
    user?: {
        name: string;
        channel?: string;
    } | null;
}

export function Header({ user }: HeaderProps) {
    const [scrolled, setScrolled] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);
    const { isTheaterMode, setTheaterMode } = useAppStore();
    const [lastScrollY, setLastScrollY] = useState(0);
    const [isHidden, setIsHidden] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            // Show header if scrolling up, hide if scrolling down
            if (currentScrollY > 60) {
                if (currentScrollY > lastScrollY && !searchFocused) {
                    setIsHidden(true); // Scrolling down - hide
                } else {
                    setIsHidden(false); // Scrolling up - show
                }
                setScrolled(true);
            } else {
                setScrolled(false);
                setIsHidden(false);
            }

            setLastScrollY(currentScrollY);
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [lastScrollY, searchFocused]);

    return (
        <header
            className={`fixed top-4 left-4 right-4 md:left-8 md:right-8 z-50 pointer-events-none transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex justify-center ${isHidden ? "-translate-y-[150%]" : "translate-y-0"}`}
        >
            <div
                className={`w-full max-w-7xl transition-all duration-500 pointer-events-auto rounded-full border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] bg-black/40 backdrop-blur-lg px-4 py-3 md:px-6`}
            >
                <div className="flex items-center justify-between gap-4">
                    {/* Brand Logo - Flat Luminous SVG */}
                    <Link to="/" className="flex items-center group shrink-0 transition-opacity">
                        <div className="flex items-center gap-1 select-none">
                            {/* LOK */}
                            <span className="text-white font-extrabold tracking-[0.2em] text-sm md:text-xl font-sans group-hover:text-white/80 transition-colors">
                                LOK
                            </span>

                            {/* The 'D' with the Play Button inside */}
                            <div className="relative flex items-center justify-center">
                                <span className="text-white font-extrabold tracking-[0.2em] text-sm md:text-xl font-sans group-hover:text-white/80 transition-colors">
                                    D
                                </span>
                                {/* Tiny Play Triangle cutting out of the D */}
                                <div className="absolute left-[30%] w-0 h-0 border-t-[3px] md:border-t-[4px] border-t-transparent border-l-[4px] md:border-l-[6px] border-l-[#0A0A0B] border-b-[3px] md:border-b-[4px] border-b-transparent"></div>
                            </div>

                            {/* ARPAN */}
                            <span className="text-white font-extrabold tracking-[0.2em] text-sm md:text-xl font-sans group-hover:text-white/80 transition-colors">
                                ARPAN
                            </span>
                        </div>
                    </Link>

                    {/* Floating Search Bar */}
                    <div className="flex-1 max-w-2xl hidden md:block">
                        <Form action="/search" className={`relative transition-all duration-300 ${searchFocused ? 'scale-[1.02]' : ''}`}>
                            <div className={`flex items-center bg-dark-800/50 border ${searchFocused ? 'border-primary-500/50 shadow-glow-sm bg-dark-900' : 'border-white/5'
                                } rounded-full overflow-hidden transition-all duration-300`}>
                                <span className="pl-4 text-dark-400">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </span>
                                <input
                                    type="text"
                                    name="q"
                                    placeholder="Discover unique content..."
                                    className="w-full bg-transparent border-none text-white placeholder-dark-400 px-4 py-2.5 focus:ring-0 text-sm"
                                    onFocus={() => setSearchFocused(true)}
                                    onBlur={() => setSearchFocused(false)}
                                />
                                <button type="button" className="pr-4 text-dark-400 hover:text-primary-400 transition-colors">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                </button>
                            </div>
                        </Form>
                    </div>

                    {/* Action Hub */}
                    <div className="flex items-center gap-3 shrink-0">
                        {/* Upload Button - Icon Only on mobile */}
                        <Link to="/upload" className="w-10 h-10 md:w-auto md:px-4 md:py-2 rounded-full border border-white/10 hover:border-primary-500/50 flex items-center justify-center gap-2 text-white hover:bg-white/5 transition-all group">
                            <svg className="w-5 h-5 text-dark-300 group-hover:text-primary-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="hidden md:inline font-medium text-sm">Create</span>
                        </Link>

                        {/* Notifications */}
                        <button className="w-10 h-10 rounded-full border border-white/10 hover:border-accent-500/50 flex items-center justify-center text-white hover:bg-white/5 transition-all relative group">
                            <span className="absolute top-2 right-2.5 w-2 h-2 bg-accent-500 rounded-full animate-pulse"></span>
                            <svg className="w-5 h-5 text-dark-300 group-hover:text-accent-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                        </button>

                        {/* Theater Mode */}
                        <div className="relative group">
                            {/* Ambient Pulse Glow Behind Button */}
                            <div className="absolute inset-0 bg-primary-500/20 blur-md rounded-full animate-pulse group-hover:bg-primary-500/40 transition-colors duration-500"></div>
                            <button
                                onClick={() => setTheaterMode(true)}
                                className="relative w-10 h-10 md:w-auto md:px-4 md:py-2 rounded-full border border-primary-500/30 hover:border-primary-500/80 bg-primary-500/20 flex items-center justify-center gap-2 text-primary-400 hover:text-white transition-all active:scale-95"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span className="hidden md:inline font-bold text-sm tracking-wide drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]">Theater</span>
                            </button>
                        </div>

                        {/* User Profile */}
                        {user ? (
                            <Link to="/profile" className="w-10 h-10 rounded-full p-0.5 border-2 border-primary-500/50 hover:border-primary-400 transition-all shadow-glow-sm">
                                <div className="w-full h-full rounded-full bg-dark-800 overflow-hidden">
                                    {/* For now, just show initials. Later fetch channel logo if exists */}
                                    <div className="w-full h-full flex items-center justify-center bg-primary-gradient text-white font-bold text-xs">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                </div>
                            </Link>
                        ) : (
                            <Link to="/auth/login" className="btn-primary flex items-center gap-2">
                                <span className="text-sm">Sign In</span>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
            {isTheaterMode && <TheaterLobby onClose={() => setTheaterMode(false)} />}
        </header>
    );
}
