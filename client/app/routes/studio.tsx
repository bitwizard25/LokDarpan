import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { NavLink, Outlet, Link, useLoaderData } from "@remix-run/react";
import { Layout } from "~/components/Layout/Layout";
import { Button } from "~/components/ui/button";
import { requireUserSession } from "~/services/auth.server";
import { cn } from "~/lib/utils";

export const meta: MetaFunction = () => [{ title: "Creator Studio - LokDarpan" }];

export async function loader({ request }: LoaderFunctionArgs) {
    const { user } = await requireUserSession(request);
    return json({ user });
}

const tabs = [
    { to: "/studio", label: "Videos", end: true },
    { to: "/studio/channel", label: "Channel", end: false },
];

export default function StudioLayout() {
    const { user } = useLoaderData<typeof loader>();

    return (
        <Layout user={user}>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="font-display text-2xl font-semibold text-white">Creator Studio</h1>
                    <p className="text-sm text-dark-400">Manage your videos and channel.</p>
                </div>
                <Button asChild className="rounded-full">
                    <Link to="/upload">Upload video</Link>
                </Button>
            </div>

            <nav aria-label="Studio" className="flex gap-1 border-b border-white/10">
                {tabs.map((t) => (
                    <NavLink
                        key={t.to}
                        to={t.to}
                        end={t.end}
                        className={({ isActive }) =>
                            cn(
                                "px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                                isActive
                                    ? "border-primary-500 text-white"
                                    : "border-transparent text-dark-400 hover:text-white",
                            )
                        }
                    >
                        {t.label}
                    </NavLink>
                ))}
            </nav>

            <Outlet />
        </Layout>
    );
}
