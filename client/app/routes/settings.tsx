import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { useState } from "react";
import { Layout } from "~/components/Layout/Layout";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { X } from "~/components/icons";
import { studioApi, recApi } from "~/lib/api";
import { logout, requireUserSession } from "~/services/auth.server";

export const meta: MetaFunction = () => [{ title: "Settings - LokDarpan" }];

type ActionData = {
    section?: "profile" | "password" | "delete" | "tune-feed";
    ok?: boolean;
    message?: string;
    error?: string;
    fieldErrors?: Record<string, string>;
};

export async function loader({ request }: LoaderFunctionArgs) {
    const { token, user } = await requireUserSession(request);
    const [studioRes, recRes] = await Promise.all([
        studioApi.getMe(token),
        recApi.getPreferences(token).catch(() => ({ data: null, error: null })),
    ]);
    if (studioRes.status === 401) throw redirect("/auth/login");
    return json({
        user,
        profile: studioRes.data?.user ?? null,
        preferences: recRes.data ?? null,
        error: studioRes.error,
    });
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

    if (intent === "tune-feed") {
        const personalizationEnabled = form.get("personalizationEnabled") === "on";
        const discovery = String(form.get("discovery") ?? "balanced");
        const languages = form.getAll("languages").map(String);
        const explicitKeysStr = String(form.get("explicitKeys") ?? "");
        const explicitKeys = explicitKeysStr ? explicitKeysStr.split(",").filter(Boolean) : [];
        const excludedKeysStr = String(form.get("excludedKeys") ?? "");
        const excludedKeys = excludedKeysStr ? excludedKeysStr.split(",").filter(Boolean) : [];

        const res = await recApi.updatePreferences(
            { personalizationEnabled, discovery, languages, explicitKeys, excludedKeys },
            token,
        );
        return res.error
            ? json<ActionData>({ section: "tune-feed", error: res.error }, { status: 400 })
            : json<ActionData>({ section: "tune-feed", ok: true, message: "Feed preferences saved" });
    }

    if (intent === "reset-inferred") {
        const res = await recApi.resetPreferences("inferred", token);
        return res.error
            ? json<ActionData>({ section: "tune-feed", error: res.error }, { status: 400 })
            : json<ActionData>({ section: "tune-feed", ok: true, message: "Watch history influences reset" });
    }

    if (intent === "reset-all") {
        const res = await recApi.resetPreferences("all", token);
        return res.error
            ? json<ActionData>({ section: "tune-feed", error: res.error }, { status: 400 })
            : json<ActionData>({ section: "tune-feed", ok: true, message: "All feed preferences reset" });
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

const AVAILABLE_LANGUAGES = [
    { id: "hi", label: "Hindi" },
    { id: "en", label: "English" },
    { id: "mr", label: "Marathi" },
    { id: "bn", label: "Bengali" },
    { id: "te", label: "Telugu" },
    { id: "ta", label: "Tamil" },
    { id: "gu", label: "Gujarati" },
    { id: "kn", label: "Kannada" },
];

export default function Settings() {
    const { user, profile, preferences } = useLoaderData<typeof loader>();
    const data = useActionData<typeof action>();
    const navigation = useNavigation();
    const busy = (intent: string) =>
        navigation.state === "submitting" && navigation.formData?.get("intent") === intent;
    const fe = data?.fieldErrors ?? {};

    const [explicitKeys, setExplicitKeys] = useState<string[]>(preferences?.explicitKeys || []);
    const [excludedKeys, setExcludedKeys] = useState<string[]>(preferences?.excludedKeys || []);

    const removeExplicitKey = (key: string) => {
        setExplicitKeys((prev) => prev.filter((k) => k !== key));
    };

    const removeExcludedKey = (key: string) => {
        setExcludedKeys((prev) => prev.filter((k) => k !== key));
    };

    return (
        <Layout user={user}>
            <div className="flex max-w-2xl flex-col gap-6">
                <div>
                    <h1 className="font-display text-2xl font-semibold text-white">Settings</h1>
                    <p className="text-sm text-dark-400">Account, profile, and feed preferences.</p>
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

                {/* Tune Your Feed Card */}
                <Card className="border-white/10 bg-dark-900">
                    <CardHeader>
                        <CardTitle>Tune your feed</CardTitle>
                        <CardDescription>
                            Personalize recommendations using your watch history, likes, and selected topics.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form method="post" className="flex flex-col gap-6">
                            <input type="hidden" name="intent" value="tune-feed" />
                            <input type="hidden" name="explicitKeys" value={explicitKeys.join(",")} />
                            <input type="hidden" name="excludedKeys" value={excludedKeys.join(",")} />

                            {/* Personalization Switch */}
                            <div className="flex items-center justify-between rounded-xl bg-white/5 p-4 border border-white/5">
                                <div className="space-y-0.5">
                                    <Label htmlFor="personalizationEnabled" className="text-sm font-medium text-white cursor-pointer">
                                        Personalization enabled
                                    </Label>
                                    <p className="text-xs text-dark-400">
                                        When on, your feed adapts based on your activity and chosen interests.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    id="personalizationEnabled"
                                    name="personalizationEnabled"
                                    defaultChecked={preferences?.personalizationEnabled ?? true}
                                    className="size-5 rounded border-white/20 bg-dark-800 text-primary-600 focus:ring-primary-500"
                                />
                            </div>

                            {/* Language Selection */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-white">Preferred Languages</Label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {AVAILABLE_LANGUAGES.map((lang) => {
                                        const isChecked = preferences?.languages?.includes(lang.id) ?? (lang.id === "hi" || lang.id === "en");
                                        return (
                                            <label
                                                key={lang.id}
                                                className="flex items-center gap-2 rounded-lg bg-white/5 p-2.5 border border-white/5 text-xs text-white cursor-pointer hover:bg-white/10 transition-colors"
                                            >
                                                <input
                                                    type="checkbox"
                                                    name="languages"
                                                    value={lang.id}
                                                    defaultChecked={isChecked}
                                                    className="size-4 rounded border-white/20 bg-dark-800 text-primary-600"
                                                />
                                                <span>{lang.label}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Discovery Level */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-white">Discovery Level</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: "low", label: "Less variety", desc: "Stick close to your habits" },
                                        { id: "balanced", label: "Balanced", desc: "A healthy mix of new & familiar" },
                                        { id: "high", label: "More discovery", desc: "Frequently suggest fresh topics" },
                                    ].map((d) => (
                                        <label
                                            key={d.id}
                                            className="flex flex-col gap-1 rounded-xl bg-white/5 p-3 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="discovery"
                                                    value={d.id}
                                                    defaultChecked={(preferences?.discovery || "balanced") === d.id}
                                                    className="size-4 text-primary-600 border-white/20 bg-dark-800"
                                                />
                                                <span className="text-xs font-semibold text-white">{d.label}</span>
                                            </div>
                                            <span className="text-[11px] text-dark-400 pl-6 leading-tight">{d.desc}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Chosen Topics */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-white">Chosen Topics</Label>
                                {explicitKeys.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {explicitKeys.map((key) => (
                                            <span
                                                key={key}
                                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-primary-600/20 text-primary-300 border border-primary-500/30"
                                            >
                                                <span>{key}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeExplicitKey(key)}
                                                    className="size-3.5 rounded-full hover:bg-primary-500/30 inline-flex items-center justify-center"
                                                    aria-label={`Remove topic ${key}`}
                                                >
                                                    <X size={10} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-dark-400 italic">No topics chosen yet.</p>
                                )}
                            </div>

                            {/* Excluded Topics */}
                            {excludedKeys.length > 0 && (
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-white">Excluded Topics</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {excludedKeys.map((key) => (
                                            <span
                                                key={key}
                                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-red-500/20 text-red-300 border border-red-500/30"
                                            >
                                                <span>{key}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeExcludedKey(key)}
                                                    className="size-3.5 rounded-full hover:bg-red-500/30 inline-flex items-center justify-center"
                                                    aria-label={`Unblock ${key}`}
                                                >
                                                    <X size={10} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Inferred Topics ("From what you watch") */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium text-white">From what you watch</Label>
                                    {preferences?.inferredKeys && preferences.inferredKeys.length > 0 && (
                                        <Button
                                            type="submit"
                                            name="intent"
                                            value="reset-inferred"
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs text-dark-400 hover:text-white h-auto py-1 px-2"
                                            disabled={busy("reset-inferred")}
                                        >
                                            {busy("reset-inferred") ? "Resetting…" : "Reset"}
                                        </Button>
                                    )}
                                </div>
                                {preferences?.inferredKeys && preferences.inferredKeys.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {preferences.inferredKeys.map((key: string) => (
                                            <span
                                                key={key}
                                                className="px-2.5 py-1 rounded-full text-xs bg-white/5 text-dark-300 border border-white/5"
                                            >
                                                {key}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-dark-400 italic">No inferred interests yet.</p>
                                )}
                            </div>

                            <Status data={data} section="tune-feed" />

                            <div className="flex flex-col gap-3 pt-3 border-t border-white/10 sm:flex-row sm:items-center sm:justify-between">
                                <Button type="submit" disabled={busy("tune-feed")}>
                                    {busy("tune-feed") ? "Saving…" : "Save preferences"}
                                </Button>
                                <div className="flex gap-2">
                                    <Button asChild variant="outline" size="sm">
                                        <Link to="/onboarding">Answer questions again</Link>
                                    </Button>
                                    <Button
                                        type="submit"
                                        name="intent"
                                        value="reset-all"
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                        disabled={busy("reset-all")}
                                    >
                                        {busy("reset-all") ? "Resetting…" : "Reset everything"}
                                    </Button>
                                </div>
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
