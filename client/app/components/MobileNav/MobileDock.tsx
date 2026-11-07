import { Link, useLocation } from "@remix-run/react";
import { useAppStore } from "~/store/useAppStore";
import {
    RiHome5Line, RiHome5Fill, RiCompass3Line, RiCompass3Fill, RiPlayCircleLine, RiPlayCircleFill,
    RiAddCircleLine, RiTv2Line, RiTv2Fill, RiUser3Line, RiUser3Fill,
} from "@remixicon/react";

const ICONS: Record<string, { Line: typeof RiHome5Line; Fill: typeof RiHome5Fill }> = {
    home: { Line: RiHome5Line, Fill: RiHome5Fill },
    explore: { Line: RiCompass3Line, Fill: RiCompass3Fill },
    shorts: { Line: RiPlayCircleLine, Fill: RiPlayCircleFill },
    create: { Line: RiAddCircleLine, Fill: RiAddCircleLine },
    theater: { Line: RiTv2Line, Fill: RiTv2Fill },
    profile: { Line: RiUser3Line, Fill: RiUser3Fill },
};

const dockItems = [
    { icon: "home", label: "Home", path: "/" },
    { icon: "explore", label: "Explore", path: "/explore" },
    { icon: "shorts", label: "Shorts", path: "/shorts" },
    { icon: "create", label: "Create", path: "/upload" },
    { icon: "theater", label: "Theater", path: null as string | null }, // watch pages only: opens theater lobby
    { icon: "profile", label: "Profile", path: null as string | null }, // opens bottom sheet
];

export function MobileDock() {
    const location = useLocation();
    const { setTheaterMode, setTheaterLobbyOpen, setMobileSheetOpen } = useAppStore();
    const isWatchPage = location.pathname.startsWith("/watch");

    return (
        <nav
            aria-label="Main"
            className="fixed left-0 right-0 bottom-0 z-50 h-16 flex md:hidden bg-dark-950/90 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)]"
        >
            {dockItems.map((item) => {
                if (item.icon === "theater" && !isWatchPage) return null;
                const isActive = item.path ? location.pathname === item.path : false;

                const { Line, Fill } = ICONS[item.icon];
                const content = (
                    <>
                        {isActive && <span className="absolute top-0 w-6 h-[3px] rounded-b-[3px] bg-primary-500" />}
                        {isActive ? <Fill size={24} /> : <Line size={24} />}
                        {item.label}
                    </>
                );
                const cls = `relative flex-1 flex flex-col items-center justify-center gap-1 text-xs transition-colors ${isActive ? "text-white font-semibold" : "text-dark-400 font-medium active:text-white"}`;

                if (item.path) {
                    return (
                        <Link key={item.icon} to={item.path} aria-current={isActive ? "page" : undefined} className={cls}>
                            {content}
                        </Link>
                    );
                }
                return (
                    <button
                        key={item.icon}
                        type="button"
                        onClick={() => {
                            if (item.icon === "theater") {
                                setTheaterMode(true);
                                setTheaterLobbyOpen(true);
                            } else {
                                setMobileSheetOpen(true);
                            }
                        }}
                        className={cls}
                    >
                        {content}
                    </button>
                );
            })}
        </nav>
    );
}
