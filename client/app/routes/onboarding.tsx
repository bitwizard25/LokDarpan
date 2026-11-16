import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, useNavigate, Link } from '@remix-run/react';
import { useState } from 'react';
import { Layout } from '~/components/Layout/Layout';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { LazyImage } from '~/components/ui/lazy-image';
import { Check, Play } from '~/components/icons';
import { getUserFromSession } from '~/services/auth.server';
import { getServerApiBaseUrl, recApi } from '~/lib/api';

export const meta: MetaFunction = () => [{ title: 'Personalize Your Feed - LokDarpan' }];

interface OnboardingQuestion {
    id: string;
    text: string;
    multi?: boolean;
    options: { id: string; label: string }[];
}

interface OnboardingData {
    version: string;
    intro: string;
    questions: OnboardingQuestion[];
}

export async function loader({ request }: LoaderFunctionArgs) {
    const session = await getUserFromSession(request);
    const base = getServerApiBaseUrl();
    const token = session?.token || null;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const [onboardingRes, recRes] = await Promise.all([
        fetch(`${base}/recommendation-onboarding`, { headers }).catch(() => null),
        fetch(`${base}/recommendations?limit=12`, { headers }).catch(() => null),
    ]);

    const onboarding: OnboardingData = onboardingRes && onboardingRes.ok
        ? await onboardingRes.json()
        : {
            version: 'v1',
            intro: 'A few quick questions can help us make your feed feel more like you. You can skip any question and change your choices anytime.',
            questions: [],
        };

    const recData = recRes && recRes.ok ? await recRes.json() : { items: [] };

    return json({
        user: session?.user || null,
        token,
        onboarding,
        candidateVideos: recData.items || [],
    });
}

export default function Onboarding() {
    const { user, token, onboarding, candidateVideos } = useLoaderData<typeof loader>();
    const navigate = useNavigate();

    // Steps: 0: Intro, 1..N: Questions, N+1: Video Pick (if >= 6 videos), N+2: Preview/Summary
    const questions = onboarding.questions || [];
    const hasVideoStep = candidateVideos.length >= 6;
    const totalQuestions = questions.length;
    const videoStepIndex = totalQuestions + 1;
    const summaryStepIndex = hasVideoStep ? totalQuestions + 2 : totalQuestions + 1;

    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string[]>>({});
    const [pickedVideoIds, setPickedVideoIds] = useState<string[]>([]);
    const [previewData, setPreviewData] = useState<{
        languages: string[];
        discovery: string;
        keyLabels: { key: string; label: string }[];
    } | null>(null);
    const [saving, setSaving] = useState(false);

    const toggleOption = (questionId: string, optionId: string) => {
        setAnswers((prev) => {
            const current = prev[questionId] || [];
            const next = current.includes(optionId)
                ? current.filter((id) => id !== optionId)
                : [...current, optionId];
            return { ...prev, [questionId]: next };
        });
    };

    const toggleVideo = (videoId: string) => {
        setPickedVideoIds((prev) =>
            prev.includes(videoId) ? prev.filter((id) => id !== videoId) : [...prev, videoId]
        );
    };

    const handleSkipAll = async () => {
        setSaving(true);
        if (token) {
            try {
                await recApi.updatePreferences(
                    {
                        onboarding: { skipped: true },
                    },
                    token
                );
            } catch {
                // Ignore failure on skip
            }
        }
        navigate('/');
    };

    const goToNextStep = async () => {
        const next = currentStep + 1;
        if (next === summaryStepIndex) {
            // Fetch preview
            await fetchPreviewAndAdvance(next);
        } else {
            setCurrentStep(next);
        }
    };

    const fetchPreviewAndAdvance = async (targetStep: number) => {
        setSaving(true);
        const formattedAnswers = Object.entries(answers).map(([qId, opts]) => ({
            questionId: qId,
            optionIds: opts,
        }));

        try {
            const res = await recApi.previewOnboarding(formattedAnswers, pickedVideoIds, token || undefined);
            if (res.data) {
                setPreviewData(res.data);
            } else {
                setPreviewData({
                    languages: ['hi', 'en'],
                    discovery: 'balanced',
                    keyLabels: [],
                });
            }
            setCurrentStep(targetStep);
        } catch {
            setPreviewData({
                languages: ['hi', 'en'],
                discovery: 'balanced',
                keyLabels: [],
            });
            setCurrentStep(targetStep);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveAndFinish = async () => {
        setSaving(true);
        const formattedAnswers = Object.entries(answers).map(([qId, opts]) => ({
            questionId: qId,
            optionIds: opts,
        }));

        const languages = previewData?.languages || [];
        const explicitKeys = (previewData?.keyLabels || []).map((k) => k.key);

        if (token) {
            try {
                await recApi.updatePreferences(
                    {
                        personalizationEnabled: true,
                        languages,
                        explicitKeys,
                        onboarding: {
                            answers: formattedAnswers,
                            pickedVideoIds,
                            skipped: false,
                        },
                    },
                    token
                );
            } catch (err) {
                console.error('Failed to save preferences:', err);
            }
        } else {
            // Write to ld_hints cookie for guest (180 days, SameSite=Lax)
            const hints = {
                keys: explicitKeys,
                languages,
            };
            const cookieVal = encodeURIComponent(JSON.stringify(hints));
            document.cookie = `ld_hints=${cookieVal}; max-age=${180 * 86400}; path=/; SameSite=Lax`;
        }

        setSaving(false);
        navigate('/');
    };

    return (
        <Layout user={user}>
            <div className="mx-auto flex max-w-xl flex-col items-center justify-center py-8 px-4 text-white">
                {/* Intro Screen */}
                {currentStep === 0 && (
                    <Card className="w-full border-white/10 bg-dark-900 p-6 md:p-8">
                        <CardContent className="flex flex-col gap-6 text-center">
                            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary-600/20 text-primary-400">
                                <Play size={28} />
                            </div>
                            <div className="space-y-2">
                                <h1 className="font-display text-2xl md:text-3xl font-bold">
                                    Personalize your LokDarpan feed
                                </h1>
                                <p className="text-sm md:text-base text-dark-300 leading-relaxed">
                                    {onboarding.intro}
                                </p>
                            </div>
                            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center">
                                <Button
                                    type="button"
                                    onClick={() => setCurrentStep(1)}
                                    className="w-full sm:w-auto px-8"
                                >
                                    Start
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleSkipAll}
                                    className="w-full sm:w-auto text-dark-400 hover:text-white"
                                >
                                    Skip
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Question Screens */}
                {currentStep >= 1 && currentStep <= totalQuestions && (
                    <Card className="w-full border-white/10 bg-dark-900 p-6 md:p-8">
                        {(() => {
                            const qIndex = currentStep - 1;
                            const q = questions[qIndex];
                            const selectedOpts = answers[q.id] || [];

                            return (
                                <CardContent className="flex flex-col gap-6">
                                    <div className="flex items-center justify-between text-xs text-dark-400">
                                        <span>Question {currentStep} of {totalQuestions}</span>
                                        <button
                                            type="button"
                                            onClick={handleSkipAll}
                                            className="hover:text-white underline"
                                        >
                                            Skip onboarding
                                        </button>
                                    </div>

                                    <h2 className="font-display text-xl font-semibold leading-snug">
                                        {q.text}
                                    </h2>

                                    <div className="grid gap-2.5 sm:grid-cols-2">
                                        {q.options.map((opt) => {
                                            const active = selectedOpts.includes(opt.id);
                                            return (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => toggleOption(q.id, opt.id)}
                                                    className={`flex items-center justify-between p-3.5 rounded-xl border text-sm text-left transition-colors ${
                                                        active
                                                            ? 'border-primary-500 bg-primary-600/20 text-white font-medium'
                                                            : 'border-white/10 bg-white/5 text-dark-200 hover:bg-white/10 hover:text-white'
                                                    }`}
                                                >
                                                    <span>{opt.label}</span>
                                                    {active && <Check size={16} className="text-primary-400" />}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={goToNextStep}
                                            className="text-dark-400 hover:text-white"
                                        >
                                            Skip question
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={goToNextStep}
                                            className="px-6"
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </CardContent>
                            );
                        })()}
                    </Card>
                )}

                {/* Video Pick Step */}
                {hasVideoStep && currentStep === videoStepIndex && (
                    <Card className="w-full border-white/10 bg-dark-900 p-6 md:p-8">
                        <CardContent className="flex flex-col gap-6">
                            <div className="flex items-center justify-between text-xs text-dark-400">
                                <span>Choose sample videos (optional)</span>
                                <button
                                    type="button"
                                    onClick={handleSkipAll}
                                    className="hover:text-white underline"
                                >
                                    Skip onboarding
                                </button>
                            </div>

                            <div>
                                <h2 className="font-display text-xl font-semibold">
                                    Pick videos you like
                                </h2>
                                <p className="text-sm text-dark-400 mt-1">
                                    Select any videos that look interesting to give your recommendations a head start.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1">
                                {candidateVideos.slice(0, 12).map((v: any) => {
                                    const selected = pickedVideoIds.includes(v.id);
                                    return (
                                        <button
                                            key={v.id}
                                            type="button"
                                            onClick={() => toggleVideo(v.id)}
                                            className={`relative rounded-xl overflow-hidden border text-left group transition-all ${
                                                selected
                                                    ? 'border-primary-500 ring-2 ring-primary-500'
                                                    : 'border-white/10 hover:border-white/30'
                                            }`}
                                        >
                                            <div className="aspect-video w-full bg-dark-800">
                                                {v.thumbnailUrl ? (
                                                    <LazyImage src={v.thumbnailUrl} wrapperClassName="w-full h-full" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-dark-600">
                                                        <Play size={24} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-2 bg-dark-950/80">
                                                <p className="text-xs font-medium text-white line-clamp-2">
                                                    {v.title}
                                                </p>
                                                <p className="text-[11px] text-dark-400 truncate mt-0.5">
                                                    {v.channel?.name || 'Creator'}
                                                </p>
                                            </div>
                                            {selected && (
                                                <span className="absolute top-1.5 right-1.5 size-5 rounded-full bg-primary-600 flex items-center justify-center text-white">
                                                    <Check size={12} />
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={goToNextStep}
                                    className="text-dark-400 hover:text-white"
                                >
                                    Skip
                                </Button>
                                <Button
                                    type="button"
                                    disabled={saving}
                                    onClick={goToNextStep}
                                    className="px-6"
                                >
                                    {saving ? 'Loading preview…' : 'Continue'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Summary / Review Step */}
                {currentStep === summaryStepIndex && (
                    <Card className="w-full border-white/10 bg-dark-900 p-6 md:p-8">
                        <CardContent className="flex flex-col gap-6">
                            <div className="space-y-1">
                                <h2 className="font-display text-xl font-semibold">
                                    Here is what we tailored for you
                                </h2>
                                <p className="text-sm text-dark-400">
                                    Based on your answers, your feed will highlight these topics and formats.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-xs uppercase tracking-wider text-dark-400 mb-2 font-semibold">
                                        Your Topics & Formats
                                    </h3>
                                    {previewData?.keyLabels && previewData.keyLabels.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {previewData.keyLabels.map((item) => (
                                                <span
                                                    key={item.key}
                                                    className="px-3 py-1 rounded-full text-xs font-medium bg-primary-600/20 text-primary-300 border border-primary-500/30"
                                                >
                                                    {item.label}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-dark-300 italic">
                                            General discovery across top categories.
                                        </p>
                                    )}
                                </div>

                                {previewData?.languages && previewData.languages.length > 0 && (
                                    <div>
                                        <h3 className="text-xs uppercase tracking-wider text-dark-400 mb-2 font-semibold">
                                            Languages
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {previewData.languages.map((lang) => (
                                                <span
                                                    key={lang}
                                                    className="px-2.5 py-0.5 rounded-md text-xs bg-white/10 text-white font-mono uppercase"
                                                >
                                                    {lang}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-2 pt-4 border-t border-white/10 sm:flex-row sm:justify-between">
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setCurrentStep(1)}
                                        className="text-sm"
                                    >
                                        Change
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={handleSkipAll}
                                        className="text-dark-400 hover:text-white text-sm"
                                    >
                                        Skip
                                    </Button>
                                </div>
                                <Button
                                    type="button"
                                    disabled={saving}
                                    onClick={handleSaveAndFinish}
                                    className="px-8"
                                >
                                    {saving ? 'Saving…' : 'Looks good'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </Layout>
    );
}
