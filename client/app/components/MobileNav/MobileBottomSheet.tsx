import { Link } from "@remix-run/react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "~/components/ui/drawer";
import { ScrollArea } from "~/components/ui/scroll-area";
import { useAppStore } from "~/store/useAppStore";
import { Library, Clock, Download, SettingsGear, Help } from "~/components/icons";

interface MobileBottomSheetProps {
    user?: {
        name: string;
        channel?: string;
    } | null;
}

const menuItems = [
    { Icon: Library, label: "Your Library", path: "/library" },
    { Icon: Clock, label: "Watch Later", path: "/watch-later" },
    { Icon: Download, label: "Downloads", path: "/downloads" },
    { Icon: SettingsGear, label: "Settings", path: "/settings" },
    { Icon: Help, label: "Help & Feedback", path: "/help" },
];

export function MobileBottomSheet({ user }: MobileBottomSheetProps) {
    const { isMobileSheetOpen, setMobileSheetOpen } = useAppStore();
    const close = () => setMobileSheetOpen(false);

    return (
        <div className="md:hidden">
            <Drawer open={isMobileSheetOpen} onOpenChange={setMobileSheetOpen}>
                <DrawerContent className="max-h-[70vh] bg-dark-900/95 backdrop-blur-2xl border-white/10 pb-[env(safe-area-inset-bottom)]">
                    <DrawerHeader className="px-6 pb-5 border-b border-white/5 text-left">
                        <DrawerTitle className="sr-only">Menu</DrawerTitle>
                        <DrawerDescription className="sr-only">Account and library shortcuts</DrawerDescription>
                        {user ? (
                            <div className="flex items-center gap-4">
                                <Avatar className="size-14 border-2 border-white/20">
                                    <AvatarFallback className="bg-gradient-to-br from-primary-500 to-accent-500 text-white font-bold text-xl">
                                        {user.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-semibold text-lg truncate">{user.name}</p>
                                    {user.channel && <p className="text-dark-400 text-sm truncate">@{user.channel}</p>}
                                </div>
                                <Button asChild variant="outline" size="sm" className="rounded-full">
                                    <Link to="/profile" onClick={close}>View</Link>
                                </Button>
                            </div>
                        ) : (
                            <Button asChild size="lg" className="w-full rounded-xl">
                                <Link to="/auth/login" onClick={close}>Sign In</Link>
                            </Button>
                        )}
                    </DrawerHeader>

                    <ScrollArea className="flex-1 px-4 py-4 overflow-y-auto">
                        <ul className="space-y-1">
                            {menuItems.map((item) => (
                                <li key={item.path}>
                                    <Link
                                        to={item.path}
                                        onClick={close}
                                        className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-dark-300 hover:text-white hover:bg-white/5 active:scale-[0.97] transition-all"
                                    >
                                        <item.Icon size={20} className="text-dark-400 group-hover:text-white" />
                                        <span className="font-medium">{item.label}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </ScrollArea>

                    <DrawerFooter className="px-6 pb-8 pt-4 border-t border-white/5">
                        <Card className="p-4 rounded-2xl bg-gradient-to-br from-primary-900/40 to-dark-900 border-white/5 text-center">
                            <p className="text-xs text-dark-400 mb-2">Go Ad-Free with Premium</p>
                            <Button variant="secondary" className="w-full rounded-xl">Upgrade</Button>
                        </Card>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        </div>
    );
}
