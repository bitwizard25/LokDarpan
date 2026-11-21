import { Link, Form, useLocation } from "@remix-run/react";
import { TheaterLobby } from "~/components/TheaterLobby/TheaterLobby";
import { useAppStore } from "~/store/useAppStore";
import { Search, Plus, Theater } from "~/components/icons";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

interface HeaderProps {
    user?: {
        name: string;
        channel?: string;
    } | null;
}

function SearchForm({ className = "" }: { className?: string }) {
    return (
        <Form role="search" action="/search" className={`relative ${className}`}>
            <Search size={18} className="absolute left-4 top-3.5 pointer-events-none text-dark-400" />
            <input
                type="search"
                name="q"
                aria-label="Search"
                placeholder="Search videos, channels, live"
                className="w-full h-11 box-border pl-12 pr-4 rounded-full border border-white/15 bg-white/5 text-white text-base placeholder-dark-400 outline-none transition-colors focus:border-primary-400 focus:bg-white/10 focus:ring-0"
            />
        </Form>
    );
}

function Account({ user, size }: { user: HeaderProps["user"]; size: string }) {
    if (!user) {
        return (
            <Link to="/auth/login" className="btn-primary shrink-0">
                <span className="text-sm">Sign In</span>
            </Link>
        );
    }
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                aria-label="Account menu"
                className={`${size} shrink-0 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-semibold text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500`}
            >
                {user.name.charAt(0).toUpperCase()}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-dark-900 border-white/10 text-white">
                <DropdownMenuLabel className="truncate">{user.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/profile">Your profile</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/studio">Creator Studio</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/upload">Upload video</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/settings">Settings</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/auth/logout">Sign out</Link></DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function Header({ user }: HeaderProps) {
    const { isTheaterMode, setTheaterMode, isTheaterLobbyOpen, setTheaterLobbyOpen } = useAppStore();
    const location = useLocation();
    const isWatchPage = location.pathname.startsWith("/watch");

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-dark-950/90 backdrop-blur-xl border-b border-white/10">
            {/* Desktop / tablet */}
            <div className="hidden md:flex h-16 box-border items-center gap-4 pl-6 pr-4 lg:pr-10">
                <Link to="/" className="font-display font-bold text-xl tracking-tight text-white no-underline shrink-0">
                    LokDarpan
                </Link>

                <SearchForm className="flex-1 max-w-[560px] mx-auto" />

                <div className="flex items-center gap-3 shrink-0">
                    <Link to="/upload" className="h-10 px-4 rounded-full border border-white/15 hover:bg-white/10 flex items-center gap-2 text-white text-sm font-medium transition-all active:scale-95">
                        <Plus size={18} />
                        Create
                    </Link>

                    {isWatchPage && (
                        <button
                            type="button"
                            onClick={() => {
                                setTheaterMode(true);
                                setTheaterLobbyOpen(true);
                            }}
                            className="h-10 px-4 rounded-full border border-primary-500/40 bg-primary-500/15 hover:bg-primary-500/30 flex items-center gap-2 text-primary-300 hover:text-white text-sm font-semibold transition-all active:scale-95"
                        >
                            <Theater size={18} variant="outline" />
                            Theater
                        </button>
                    )}

                    <Account user={user} size="w-10 h-10" />
                </div>
            </div>

            {/* Mobile */}
            <div className="md:hidden flex flex-col gap-2 px-4 pt-2 pb-4">
                <div className="h-12 flex items-center justify-between">
                    <Link to="/" className="font-display font-bold text-xl text-white no-underline">LokDarpan</Link>
                    <Account user={user} size="w-11 h-11" />
                </div>
                <SearchForm />
            </div>

            {isWatchPage && isTheaterLobbyOpen && (
                <TheaterLobby
                    onClose={() => {
                        setTheaterLobbyOpen(false);
                        if (!isTheaterMode) setTheaterMode(false);
                    }}
                    onEnter={() => setTheaterLobbyOpen(false)}
                />
            )}
        </header>
    );
}
