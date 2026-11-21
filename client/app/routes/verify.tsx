import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import {
    json,
    redirect,
    unstable_createMemoryUploadHandler,
    unstable_parseMultipartFormData,
    MaxPartSizeExceededError,
} from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { Layout } from "~/components/Layout/Layout";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { verificationApi, type VerificationDocumentType } from "~/lib/api";
import { requireUserSession } from "~/services/auth.server";

export const meta: MetaFunction = () => [{ title: "Verify your identity - LokDarpan" }];

const MAX_BYTES = 5 * 1024 * 1024;
const DOCUMENT_TYPES: { value: VerificationDocumentType; label: string }[] = [
    { value: "passport", label: "Passport" },
    { value: "driving_licence", label: "Driving licence" },
    { value: "voter_id", label: "Voter ID" },
    { value: "pan", label: "PAN card" },
    { value: "aadhaar_masked", label: "Aadhaar (masked: hide the first 8 digits)" },
];

type ActionData = { error?: string; fieldErrors?: Record<string, string> };

export async function loader({ request }: LoaderFunctionArgs) {
    const { token, user } = await requireUserSession(request);
    const res = await verificationApi.status(token);
    if (res.status === 401) throw redirect("/auth/login");
    return json({ user, verification: res.data, error: res.error });
}

export async function action({ request }: ActionFunctionArgs) {
    const { token } = await requireUserSession(request);

    let form: FormData;
    try {
        form = await unstable_parseMultipartFormData(
            request,
            unstable_createMemoryUploadHandler({ maxPartSize: MAX_BYTES }),
        );
    } catch (err) {
        if (err instanceof MaxPartSizeExceededError) {
            return json<ActionData>({ fieldErrors: { document: "ID photo must be 5 MB or smaller" } }, { status: 400 });
        }
        throw err;
    }

    const legalName = String(form.get("legalName") ?? "").trim();
    const documentType = String(form.get("documentType") ?? "");
    const document = form.get("document");

    const fieldErrors: Record<string, string> = {};
    if (legalName.length < 3 || legalName.length > 100) fieldErrors.legalName = "Enter your full legal name (3-100 characters)";
    if (!DOCUMENT_TYPES.some((d) => d.value === documentType)) fieldErrors.documentType = "Choose a document type";
    if (!(document instanceof File) || document.size === 0) fieldErrors.document = "Attach a photo of your ID";
    if (Object.keys(fieldErrors).length) return json<ActionData>({ fieldErrors }, { status: 400 });

    const body = new FormData();
    body.append("legalName", legalName);
    body.append("documentType", documentType);
    body.append("document", document as File, (document as File).name);

    const res = await verificationApi.submitManual(body, token);
    if (res.error) return json<ActionData>({ error: res.error }, { status: res.status || 400 });
    return redirect("/verify");
}

export default function Verify() {
    const { user, verification, error } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const submitting = navigation.state === "submitting";
    const fe = actionData?.fieldErrors ?? {};
    const status = verification?.status ?? "not_verified";

    return (
        <Layout user={user}>
            <div className="flex max-w-xl flex-col gap-6">
                <div>
                    <h1 className="font-display text-2xl font-semibold text-white">Verify your identity</h1>
                    <p className="text-sm text-dark-400">Required before you can create a channel and upload videos.</p>
                </div>

                {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

                {status === "verified" && (
                    <Card className="border-emerald-500/30 bg-dark-900">
                        <CardHeader>
                            <CardTitle className="text-emerald-400">You&apos;re verified</CardTitle>
                            <CardDescription>You can now create a channel and upload videos.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex gap-3">
                            <Button asChild><Link to="/channel/create">Create channel</Link></Button>
                            <Button asChild variant="outline"><Link to="/studio">Creator Studio</Link></Button>
                        </CardContent>
                    </Card>
                )}

                {status === "pending" && (
                    <Card className="border-white/10 bg-dark-900">
                        <CardHeader>
                            <CardTitle>Under review</CardTitle>
                            <CardDescription>
                                We received your ID{verification?.submittedAt ? ` on ${new Date(verification.submittedAt).toLocaleDateString()}` : ""}.
                                A reviewer will check it shortly. Refresh this page to see the result.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                )}

                {(status === "not_verified" || status === "rejected") && (
                    <Card className="border-white/10 bg-dark-900">
                        <CardHeader>
                            <CardTitle>{status === "rejected" ? "Submit again" : "Manual verification"}</CardTitle>
                            <CardDescription>
                                {status === "rejected" && verification?.rejectionReason ? (
                                    <span className="text-red-400">Your last request was rejected: {verification.rejectionReason}. </span>
                                ) : null}
                                Upload a clear photo of a government ID. It is stored privately and only used to verify you.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form method="post" encType="multipart/form-data" className="flex flex-col gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="legalName">Full legal name</Label>
                                    <Input id="legalName" name="legalName" required minLength={3} maxLength={100} autoComplete="name" />
                                    {fe.legalName && <p role="alert" className="text-xs text-red-400">{fe.legalName}</p>}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="documentType">Document type</Label>
                                    <select
                                        id="documentType"
                                        name="documentType"
                                        required
                                        defaultValue=""
                                        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-white"
                                    >
                                        <option value="" disabled>Choose…</option>
                                        {DOCUMENT_TYPES.map((d) => (
                                            <option key={d.value} value={d.value} className="bg-dark-900">{d.label}</option>
                                        ))}
                                    </select>
                                    {fe.documentType && <p role="alert" className="text-xs text-red-400">{fe.documentType}</p>}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="document">Photo of your ID (JPEG, PNG or WebP, up to 5 MB)</Label>
                                    <Input id="document" name="document" type="file" accept="image/jpeg,image/png,image/webp" required />
                                    {fe.document && <p role="alert" className="text-xs text-red-400">{fe.document}</p>}
                                </div>
                                {actionData?.error && <p role="alert" className="text-sm text-red-400">{actionData.error}</p>}
                                <div>
                                    <Button type="submit" disabled={submitting}>
                                        {submitting ? "Submitting…" : "Submit for review"}
                                    </Button>
                                </div>
                            </Form>
                        </CardContent>
                    </Card>
                )}
            </div>
        </Layout>
    );
}
