import { Header } from "~/components/Header/Header";
import { Sidebar } from "~/components/Sidebar/Sidebar";
import { MobileDock } from "~/components/MobileNav/MobileDock";
import { MobileBottomSheet } from "~/components/MobileNav/MobileBottomSheet";

interface LayoutProps {
    children: React.ReactNode;
    user?: {
        name: string;
        channel?: string;
    } | null;
    hideSidebar?: boolean;
}

export function Layout({ children, user, hideSidebar = false }: LayoutProps) {
    return (
        <div className="min-h-screen bg-dark-950 text-dark-100 selection:bg-primary-500/30 font-sans">
            <Header user={user} />
            <div className="flex items-start pt-[124px] md:pt-16">
                {!hideSidebar && <Sidebar className="hidden md:flex sticky top-16 h-[calc(100vh-4rem)]" />}
                <main className="flex-1 min-w-0 px-[clamp(16px,3vw,40px)] pt-6 pb-28 md:pb-12 flex flex-col gap-10">
                    {children}
                </main>
            </div>
            <MobileDock />
            <MobileBottomSheet user={user} />
        </div>
    );
}
