import { Link, useLocation } from "@remix-run/react";
import { useState } from "react";
import { House, Compass, TrendUp, PlayCircle, UsersThree, BookmarkSimple, CaretLeft, CaretRight } from "@phosphor-icons/react";

const navItems = [
    { label: "Home", path: "/", Icon: House },
    { label: "Explore", path: "/explore", Icon: Compass },
    { label: "Trending", path: "/trending", Icon: TrendUp },
    { label: "Shorts", path: "/shorts", Icon: PlayCircle },
    { label: "Following", path: "/following", Icon: UsersThree },
    { label: "Library", path: "/library", Icon: BookmarkSimple },
];

interface SidebarProps {
    className?: string;
}

/**
 * Collapsible navigation. Until the viewer toggles it, it follows the breakpoint:
 * icon rail below xl, full labels at xl and up. After a toggle the choice sticks.
 */
export function Sidebar({ className = "" }: SidebarProps) {
    const location = useLocation();
    const [collapsed, setCollapsed] = useState<boolean | null>(null);

    const width = collapsed === null ? "w-[72px] xl:w-60" : collapsed ? "w-[72px]" : "w-60";
    const showLabel = collapsed === null ? "hidden xl:inline" : collapsed ? "hidden" : "inline";
    const showFooter = collapsed === null ? "hidden xl:flex" : collapsed ? "hidden" : "flex";
    const showExpand = collapsed === null ? "flex xl:hidden" : collapsed ? "flex" : "hidden";

    return (
        <nav
            aria-label="Main"
            className={`${width} shrink-0 flex-col gap-1 box-border px-3 py-4 border-r border-white/10 overflow-y-auto scrollbar-hide ${className}`}
        >
            {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                    <Link
                        key={item.path}
                        to={item.path}
                        aria-current={isActive ? "page" : undefined}
                        aria-label={item.label}
                        title={item.label}
                        className={`relative h-12 flex items-center gap-4 px-3 rounded-xl text-base transition-colors duration-150 ${isActive
                            ? "bg-white/10 text-white font-semibold"
                            : "text-dark-400 font-medium hover:bg-white/5 hover:text-white"
                            }`}
                    >
                        {isActive && <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-[3px] bg-primary-500" />}
                        <item.Icon size={24} weight={isActive ? "duotone" : "light"} className="shrink-0" />
                        <span className={showLabel}>{item.label}</span>
                    </Link>
                );
            })}

            <div className="mt-auto pt-4 border-t border-white/10 flex flex-col gap-2">
                <div className={`${showFooter} items-center gap-4 pl-3`}>
                    <Link to="/profile" className="text-sm text-dark-400 hover:text-white transition-colors">Settings</Link>
                    <button
                        type="button"
                        onClick={() => setCollapsed(true)}
                        aria-label="Collapse sidebar to icons"
                        title="Collapse"
                        className="ml-auto w-11 h-11 flex items-center justify-center rounded-xl border border-white/10 text-dark-200 hover:bg-white/10 hover:text-white transition-colors"
                    >
                        <CaretLeft size={20} weight="light" />
                    </button>
                </div>
                <button
                    type="button"
                    onClick={() => setCollapsed(false)}
                    aria-label="Expand sidebar"
                    title="Expand"
                    className={`${showExpand} w-12 h-12 items-center justify-center rounded-xl border border-white/10 text-dark-200 hover:bg-white/10 hover:text-white transition-colors`}
                >
                    <CaretRight size={20} weight="light" />
                </button>
            </div>
        </nav>
    );
}
