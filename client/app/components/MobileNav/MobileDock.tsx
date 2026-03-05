import { Link, useLocation } from "@remix-run/react";
import { useAppStore } from "~/store/useAppStore";

const dockItems = [
    { icon: "home", label: "Home", path: "/" },
    { icon: "compass", label: "Discover", path: "/explore" },
    { icon: "create", label: "Create", path: "/upload" },
    { icon: "theater", label: "Theater", path: null }, // opens theater mode
    { icon: "profile", label: "Profile", path: null }, // opens bottom sheet
];

export function MobileDock() {
    const location = useLocation();
    const { setTheaterMode, setTheaterLobbyOpen, setMobileSheetOpen } = useAppStore();
    const isWatchPage = location.pathname.startsWith("/watch");

    return (
        <nav className="fixed bottom-6 left-4 right-4 z-50 md:hidden">
            <div className="flex items-center justify-around bg-white/5 border border-white/10 backdrop-blur-2xl rounded-full px-2 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                {dockItems.map((item) => {
                    const isActive = item.path ? location.pathname === item.path : false;
                    const isCreate = item.icon === "create";

                    if (item.icon === "theater" && !isWatchPage) return null;

                    const handleTap = () => {
                        if (item.icon === "theater") {
                            setTheaterMode(true);
                            setTheaterLobbyOpen(true);
                        } else if (item.icon === "profile") {
                            setMobileSheetOpen(true);
                        }
                    };

                    const content = (
                        <div className="flex flex-col items-center gap-0.5">
                            <div
                                className={`flex items-center justify-center transition-all duration-200 active:scale-90 ${isCreate
                                        ? "w-12 h-12 -mt-4 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 shadow-[0_0_20px_rgba(59,130,246,0.4)] border-2 border-white/20"
                                        : "w-10 h-10 rounded-full"
                                    } ${isActive ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "text-dark-400"}`}
                            >
                                {getDockIcon(item.icon, isActive || isCreate)}
                            </div>
                            <span
                                className={`text-[10px] font-medium transition-colors ${isActive ? "text-white" : "text-dark-500"
                                    } ${isCreate ? "mt-1" : ""}`}
                            >
                                {item.label}
                            </span>
                        </div>
                    );

                    if (item.path) {
                        return (
                            <Link key={item.icon} to={item.path} className="flex-1 flex justify-center">
                                {content}
                            </Link>
                        );
                    }

                    return (
                        <button key={item.icon} onClick={handleTap} className="flex-1 flex justify-center">
                            {content}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}

function getDockIcon(name: string, active: boolean) {
    const strokeColor = active ? "currentColor" : "currentColor";
    const strokeWidth = active ? 2.5 : 2;

    switch (name) {
        case "home":
            return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={strokeColor}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            );
        case "compass":
            return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={strokeColor}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M9 9l3 3m0 0l3 3m-3-3l3-3m-3 3l-3 3" />
                </svg>
            );
        case "create":
            return (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="white">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
            );
        case "theater":
            return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={strokeColor}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            );
        case "profile":
            return (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={strokeColor}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            );
        default:
            return null;
    }
}
