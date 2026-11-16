import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { Layout } from "~/components/Layout/Layout";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { studioApi } from "~/lib/api";
import { logout, requireUserSession } from "~/services/auth.server";

export const meta: MetaFunction = () => [{ title: "Settings - LokDarpan" }];

type ActionData = {
    section?: "profile" | "password" | "delete";
    ok?: boolean;
    message?: string;
    error?: string;
    fieldErrors?: Record<string, string>;
};

export async function loader({ request }: LoaderFunctionArgs) {
    const { token, user } = await requireUserSession(request);
    const res = await studioApi.getMe(token);
    if (res.status === 401) throw redirect("/auth/login");
    return json({ user, profile: res.data?.user ?? null, error: res.error });
}

export async function action({ request }: ActionFunctionArgs) {
    const { token } = await requireUserSession(request);
    const form = await request.formData();
    const intent = String(form.get("intent") ?? "");

    if (intent === "profile") {
        const displayName = String(form.get("displayName") ?? "").trim();
        if (displayName.length < 3 || displayName.length > 50) {
            return json<ActionData>(
                { section: "profile", fieldErrors: { displayName: "Display name must be 3-50 characters" } },
                { status: 400 },
            );
        }
        const res = await studioApi.updateProfile(
            {
                displayName,
                bio: String(form.get("bio") ?? "").trim(),
                avatarUrl: String(form.get("avatarUrl") ?? "").trim() || undefined,
            },
            token,
        );
        return res.error
            ? json<ActionData>({ section: "profile", error: res.error }, { status: res.status || 400 })
            : json<ActionData>({ section: "profile", ok: true, message: "Profile saved" });
    }

    if (intent === "password") {
        const currentPassword = String(form.get("currentPassword") ?? "");
        const newPassword = String(form.get("newPassword") ?? "");
        const confirm = String(form.get("confirmPassword") ?? "");
        const fieldErrors: Record<string, string> = {};
        if (!currentPassword) fieldErrors.currentPassword = "Enter your current password";
        if (newPassword.length < 6) fieldErrors.newPassword = "Use at least 6 characters";
        if (newPassword !== confirm) fieldErrors.confirmPassword = "Passwords do not match";
        if (Object.keys(fieldErrors).length) {
            return json<ActionData>({ section: "password", fieldErrors }, { status: 400 });
        }
        const res = await studioApi.changePassword({ currentPassword, newPassword }, token);
        return res.error
            ? json<ActionData>({ section: "password", error: res.error }, { status: res.status || 400 })
            : json<ActionData>({ section: "password", ok: true, message: "Password updated" });
    }

    if (intent === "delete") {
        const res = await studioApi.deleteAccount(String(form.get("password") ?? ""), token);
        if (res.error) return json<ActionData>({ section: "delete", error: res.error }, { status: res.status || 400 });
        return logout(request);
    }

    return json<ActionData>({ error: "Unknown action" }, { status: 400 });
}

function Status({ data, section }: { data?: ActionData; section: ActionData["section"] }) {
    if (!data || data.section !== section) return null;
    if (data.error) return <p role="alert" className="text-sm text-red-400">{data.error}</p>;
    if (data.ok) return <p role="status" className="text-sm text-emerald-400">{data.message}</p>;
    return null;
}

export default function Settings() {
    const { user, profile } = useLoaderData<typeof loader>();
    const data = useActionData<typeof action>();
    const navigation = useNavigation();
    const busy = (intent: string) =>
        navigation.state === "submitting" && navigation.formData?.get("intent") === intent;
    const fe = data?.fieldErrors ?? {};

    return (
        <Layout user={user}>
            <div className="flex max-w-2xl flex-col gap-6">
                <div>
                    <h1 className="font-display text-2xl font-semibold text-white">Settings</h1>
                    <p className="text-sm text-dark-400">Account and profile.</p>
                </div>

                <Card className="border-white/10 bg-dark-900">
                    <CardHeader>
                        <CardTitle>Profile</CardTitle>
                        <CardDescription>{profile?.email ?? user?.email}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form method="post" className="flex flex-col gap-4">
                            <input type="hidden" name="intent" value="profile" />
                            <div className="grid gap-2">
                                <Label htmlFor="displayName">Display name</Label>
                                <Input
                                    id="displayName"
                                    name="displayName"
                                    defaultValue={profile?.displayName ?? profile?.name ?? user?.name}
                                    required
                                    minLength={3}
                                    maxLength={50}
                                />
                                {fe.displayName && <p role="alert" className="text-xs text-red-400">{fe.displayName}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="bio">Bio</Label>
                                <Textarea id="bio" name="bio" defaultValue={profile?.bio} rows={3} maxLength={1000} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="avatarUrl">Avatar image URL</Label>
                                <Input id="avatarUrl" name="avatarUrl" type="url" defaultValue={profile?.avatarUrl} />
                            </div>
                            <Status data={data} section="profile" />
                            <div>
                                <Button type="submit" disabled={busy("profile")}>
                                    {busy("profile") ? "Saving…" : "Save profile"}
                                </Button>
                            </div>
                        </Form>
                    </CardContent>
                </Card>

                <Card className="border-white/10 bg-dark-900">
                    <CardHeader>
                        <CardTitle>Identity verification</CardTitle>
                        <CardDescription>
                            {profile?.identityVerified
                                ? "Your identity is verified."
                                : "Verify your identity to create a channel and upload videos."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-3">
                        <Button asChild variant="outline">
                            <Link to="/verify">{profile?.identityVerified ? "View status" : "Verify identity"}</Link>
                        </Button>
                        {profile?.isAdmin && (
                            <Button asChild variant="outline">
                                <Link to="/admin/verifications">Review verification requests</Link>
                            </Button>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-white/10 bg-dark-900">
                    <CardHeader>
                        <CardTitle>Password</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Form method="post" className="flex flex-col gap-4">
                            <input type="hidden" name="intent" value="password" />
                            <div className="grid gap-2">
                                <Label htmlFor="currentPassword">Current password</Label>
                                <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" />
                                {fe.currentPassword && <p role="alert" className="text-xs text-red-400">{fe.currentPassword}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="newPassword">New password</Label>
                                <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" />
                                {fe.newPassword && <p role="alert" className="text-xs text-red-400">{fe.newPassword}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="confirmPassword">Confirm new password</Label>
                                <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" />
                                {fe.confirmPassword && <p role="alert" className="text-xs text-red-400">{fe.confirmPassword}</p>}
                            </div>
                            <Status data={data} section="password" />
                            <div>
                                <Button type="submit" disabled={busy("password")}>
                                    {busy("password") ? "Updating…" : "Update password"}
                                </Button>
                            </div>
                        </Form>
                    </CardContent>
                </Card>

                <Card className="border-red-500/30 bg-dark-900">
                    <CardHeader>
                        <CardTitle className="text-red-400">Delete account</CardTitle>
                        <CardDescription>Deletes your account, saved videos, history and playlists. Your videos are made private and comments you posted stay. Enter your password to confirm.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form method="post" className="flex flex-col gap-4">
                            <input type="hidden" name="intent" value="delete" />
                            <Input name="password" type="password" autoComplete="current-password" aria-label="Password" required />
                            <Status data={data} section="delete" />
                            <div>
                                <Button type="submit" variant="destructive" disabled={busy("delete")}>
                                    {busy("delete") ? "Deleting…" : "Delete my account"}
                                </Button>
                            </div>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
