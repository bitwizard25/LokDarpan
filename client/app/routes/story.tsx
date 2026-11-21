import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { ArrowDown, ArrowRight, ArrowUpRight, Play, Sparkles, Users, Video } from "lucide-react";

export const meta: MetaFunction = () => [
    { title: "Our Story - LokDarpan" },
    {
        name: "description",
        content: "LokDarpan is built around a simple idea: the best moments are the ones we get to share.",
    },
];

const people = [
    { initials: "R", name: "Riya", color: "from-rose-400 to-orange-300", note: "this part!" },
    { initials: "A", name: "Aarav", color: "from-sky-300 to-blue-400", note: "ha 😄" },
    { initials: "Y", name: "You", color: "from-amber-200 to-yellow-400", note: "♥" },
];

function SharedMomentIllustration() {
    return (
        <div role="img" aria-label="Illustration of friends sharing a video moment" className="relative mx-auto w-full max-w-[620px]">
            <div className="absolute -inset-8 rounded-full bg-blue-500/[0.12] blur-3xl" />
            <div className="absolute -right-3 top-6 h-28 w-28 rounded-full bg-amber-400/[0.12] blur-3xl md:-right-8" />

            <div className="relative rounded-[2rem] border border-white/[0.11] bg-[#10141d] p-3 shadow-[0_35px_110px_-45px_rgba(59,130,246,0.55)] sm:rounded-[2.5rem] sm:p-4">
                <div className="relative aspect-[1.2/1] overflow-hidden rounded-[1.45rem] bg-[#151d2b] sm:rounded-[2rem]">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_48%_30%,rgba(160,188,255,0.28),transparent_35%),linear-gradient(155deg,#101d33_5%,#29334b_52%,#d77f60_115%)]" />
                    <div className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-[#0b1019] via-[#0b1019]/45 to-transparent" />
                    <div className="absolute left-[13%] top-[20%] h-[34%] w-[22%] rounded-[50%] bg-[#efbd9c]/90 blur-[1px]" />
                    <div className="absolute left-[9%] top-[36%] h-[42%] w-[30%] rounded-t-[48%] bg-gradient-to-b from-[#6f7391] to-[#343c56]" />
                    <div className="absolute right-[17%] top-[17%] h-[39%] w-[24%] rounded-[50%] bg-[#efc9ac]/90 blur-[1px]" />
                    <div className="absolute right-[12%] top-[35%] h-[44%] w-[34%] rounded-t-[48%] bg-gradient-to-b from-[#c98773] to-[#734e5a]" />
                    <div className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white shadow-xl backdrop-blur-md transition-transform duration-300 hover:scale-105 sm:h-[68px] sm:w-[68px]">
                        <Play className="ml-1 h-5 w-5 fill-current sm:h-6 sm:w-6" aria-hidden="true" />
                    </div>
                    <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-[10px] font-medium tracking-[0.14em] text-white/75 backdrop-blur sm:left-7 sm:top-7 sm:text-[11px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.8)]" />
                        A MOMENT, SHARED
                    </div>
                    <div className="absolute bottom-5 left-5 right-5 sm:bottom-7 sm:left-7 sm:right-7">
                        <p className="font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">The good part is better together.</p>
                        <p className="mt-1 text-xs text-white/55 sm:text-sm">A story finds its people.</p>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-4 px-2 pb-1 pt-4 sm:px-3 sm:pt-5">
                    <div className="flex -space-x-2.5" aria-label="Three friends">
                        {people.map((person) => (
                            <div
                                key={person.initials}
                                title={person.name}
                                className={`flex h-9 w-9 items-center justify-center rounded-full border-[2px] border-[#10141d] bg-gradient-to-br ${person.color} text-xs font-bold text-slate-950 sm:h-10 sm:w-10`}
                            >
                                {person.initials}
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/50 sm:text-sm">
                        <span className="hidden sm:inline">Stories find</span> their people
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70">
                            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                    </div>
                </div>
            </div>

            <div className="absolute -left-4 top-[28%] hidden items-center gap-2 rounded-2xl border border-white/10 bg-[#181d29]/90 px-3 py-2.5 shadow-2xl backdrop-blur-md sm:flex md:-left-10">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-400/15 text-rose-200">♥</span>
                <span className="text-xs text-white/75">that ending!</span>
            </div>
            <div className="absolute -right-2 bottom-[23%] hidden items-center gap-2 rounded-2xl border border-white/10 bg-[#181d29]/90 px-3 py-2.5 shadow-2xl backdrop-blur-md sm:flex md:-right-8">
                <span className="text-xs text-white/75">{people[0].note}</span>
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${people[0].color} text-xs font-bold text-slate-950`}>R</span>
            </div>
        </div>
    );
}

function Wordmark() {
    return (
        <Link to="/" className="group inline-flex items-center gap-2.5 text-white no-underline">
            <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-[13px] bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 shadow-[0_5px_22px_-8px_rgba(96,165,250,0.8)]">
                <span className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-white/25 blur-sm" />
                <span className="relative font-display text-lg font-bold leading-none tracking-[-0.08em]">L</span>
            </span>
            <span className="font-display text-[17px] font-semibold tracking-[-0.045em]">LokDarpan</span>
        </Link>
    );
}

export default function StoryRoute() {
    return (
        <div className="relative min-h-screen overflow-hidden bg-[#090b10] text-white selection:bg-blue-400/30 selection:text-white">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[760px] bg-[radial-gradient(ellipse_at_72%_0%,rgba(48,85,161,0.19),transparent_50%),radial-gradient(ellipse_at_8%_20%,rgba(23,49,93,0.2),transparent_36%)]" />
            <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12 lg:py-7">
                <Wordmark />
                <nav aria-label="Main navigation" className="flex items-center gap-5 sm:gap-8">
                    <a href="#why" className="hidden text-sm text-white/55 transition-colors hover:text-white sm:inline">Our idea</a>
                    <Link to="/" className="group inline-flex h-10 items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.045] px-4 text-sm font-medium text-white/85 no-underline transition-all hover:border-white/25 hover:bg-white/[0.09]">
                        Explore videos <ArrowUpRight className="h-3.5 w-3.5 text-white/55 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                    </Link>
                </nav>
            </header>

            <main className="relative z-[1]">
            <section className="relative z-[1] mx-auto grid w-full max-w-7xl items-center gap-10 px-5 pb-24 pt-12 sm:px-8 sm:pb-32 sm:pt-16 lg:min-h-[680px] lg:grid-cols-[0.92fr_1.08fr] lg:gap-12 lg:px-12 lg:pb-36 lg:pt-20">
                <div className="relative z-10 max-w-[540px]">
                    <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-300/15 bg-blue-300/[0.06] px-3 py-1.5 text-[11px] font-medium tracking-[0.14em] text-blue-100/75 sm:text-xs">
                        <Sparkles className="h-3.5 w-3.5 text-blue-200/80" aria-hidden="true" />
                        A SMALL IDEA WITH ROOM TO GROW
                    </div>
                    <h1 className="max-w-[600px] font-display text-[clamp(3.3rem,7.2vw,6.7rem)] font-semibold leading-[0.94] tracking-[-0.075em] text-white">
                        Videos bring us <span className="bg-gradient-to-r from-blue-200 via-blue-300 to-indigo-300 bg-clip-text text-transparent">closer.</span>
                    </h1>
                    <p className="mt-7 max-w-[460px] text-base leading-7 text-white/55 sm:mt-8 sm:text-lg sm:leading-8">
                        The best part of watching is often the person beside you — or the one you wish could be. LokDarpan began with a simple thought: let’s make more room for those shared moments.
                    </p>
                    <div className="mt-9 flex flex-wrap items-center gap-5 sm:mt-10">
                        <Link to="/" className="group inline-flex h-12 items-center gap-3 rounded-full bg-white px-5 text-sm font-semibold text-slate-950 no-underline shadow-[0_8px_30px_-12px_rgba(255,255,255,0.35)] transition-all hover:-translate-y-0.5 hover:bg-blue-50">
                            Find something to watch <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                        </Link>
                        <a href="#why" className="inline-flex items-center gap-2 text-sm text-white/45 no-underline transition-colors hover:text-white/80">
                            The idea <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                    </div>
                </div>

                <div className="relative px-1 py-4 sm:px-8 sm:py-8 lg:px-3">
                    <SharedMomentIllustration />
                    <div className="pointer-events-none absolute -bottom-7 left-1/2 hidden h-24 w-[65%] -translate-x-1/2 rounded-full bg-blue-400/[0.08] blur-3xl lg:block" />
                </div>

                <div className="col-span-full flex items-center gap-3 border-t border-white/[0.07] pt-5 text-[10px] font-medium uppercase tracking-[0.18em] text-white/30 sm:text-[11px] lg:absolute lg:bottom-12 lg:left-12 lg:border-0 lg:pt-0">
                    <span className="h-px w-8 bg-white/20" />
                    Made for the moments we share
                </div>
            </section>

            <section id="why" className="relative scroll-mt-10 border-y border-white/[0.07] bg-[#0d1017]/80">
                <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24 lg:px-12 lg:py-32">
                    <div>
                        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-blue-200/65">The thought behind it</p>
                        <h2 className="max-w-md font-display text-4xl font-medium leading-[1.08] tracking-[-0.06em] text-white sm:text-5xl">
                            A good story has a way of bringing people into the same room.
                        </h2>
                    </div>
                    <div className="max-w-[620px] lg:pt-9">
                        <p className="text-lg leading-8 text-white/55 sm:text-xl sm:leading-9">
                            Sometimes it’s a film you’ve been meaning to watch. Sometimes it’s a creator who says exactly what you needed to hear. Whatever brings you in, sharing that moment can make it mean a little more.
                        </p>
                        <p className="mt-6 text-base leading-7 text-white/40 sm:text-lg sm:leading-8">
                            That’s the idea we’re building around at LokDarpan: a place to discover videos, follow the people behind them, and make watching feel more connected.
                        </p>
                        <div className="mt-9 flex flex-wrap gap-3">
                            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-white/60 sm:text-sm"><Video className="h-4 w-4 text-blue-200/65" aria-hidden="true" /> Stories worth finding</span>
                            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-white/60 sm:text-sm"><Users className="h-4 w-4 text-blue-200/65" aria-hidden="true" /> Moments worth sharing</span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="relative mx-auto grid w-full max-w-7xl gap-10 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[1fr_0.82fr] lg:items-center lg:gap-20 lg:px-12 lg:py-32">
                <div className="order-2 lg:order-1">
                    <div className="relative mx-auto max-w-md rounded-[2rem] border border-white/[0.1] bg-gradient-to-br from-[#141b29] to-[#10131b] p-7 shadow-[0_40px_100px_-60px_rgba(71,103,180,0.55)] sm:p-9">
                        <div className="absolute -right-2 -top-2 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl" />
                        <div className="relative flex items-center justify-between border-b border-white/[0.08] pb-5">
                            <div>
                                <p className="text-[10px] font-medium uppercase tracking-[0.17em] text-white/35">The feeling we’re after</p>
                                <p className="mt-1.5 font-display text-lg font-medium tracking-tight text-white">A little closer</p>
                            </div>
                            <div className="flex -space-x-2">
                                {people.map((person) => <span key={person.initials} className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#131824] bg-gradient-to-br ${person.color} text-[10px] font-bold text-slate-950`}>{person.initials}</span>)}
                            </div>
                        </div>
                        <div className="relative flex items-center justify-center py-10 sm:py-12">
                            <span className="absolute h-40 w-40 rounded-full border border-blue-200/[0.08]" />
                            <span className="absolute h-28 w-28 rounded-full border border-blue-200/[0.1]" />
                            <span className="absolute h-16 w-16 rounded-full border border-blue-200/[0.13]" />
                            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 shadow-[0_12px_40px_-12px_rgba(96,165,250,0.7)]">
                                <Play className="ml-0.5 h-5 w-5 fill-white text-white" aria-hidden="true" />
                            </div>
                            {[
                                "left-5 top-6 bg-rose-300",
                                "right-7 top-5 bg-sky-300",
                                "bottom-5 left-1/2 -translate-x-1/2 bg-amber-200",
                            ].map((position, index) => <span key={index} className={`absolute h-2.5 w-2.5 rounded-full ${position}`} />)}
                        </div>
                        <p className="relative text-center text-xs leading-5 text-white/40">One thing to watch. A few people to share it with.</p>
                    </div>
                </div>

                <div className="order-1 lg:order-2">
                    <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-blue-200/65">Where we’re headed</p>
                    <h2 className="max-w-lg font-display text-4xl font-medium leading-[1.08] tracking-[-0.06em] text-white sm:text-5xl">
                        More than pressing play.
                    </h2>
                    <p className="mt-6 max-w-xl text-base leading-7 text-white/50 sm:text-lg sm:leading-8">
                        We’re shaping LokDarpan around discovery, creators, and the little reactions that turn watching into doing something together. The Theater idea is one way we’re exploring that feeling.
                    </p>
                    <p className="mt-4 max-w-xl text-sm leading-6 text-white/35 sm:text-base sm:leading-7">
                        It’s a work in progress, and it starts with a simple question: what if watching didn’t feel so separate?
                    </p>
                </div>
            </section>

            <section className="relative mx-5 mb-16 overflow-hidden rounded-[2rem] border border-white/[0.09] bg-[#10141d] sm:mx-8 sm:mb-20 lg:mx-auto lg:mb-24 lg:max-w-7xl">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_78%_40%,rgba(59,100,195,0.2),transparent_40%),linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.025))]" />
                <div className="relative flex flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14 lg:flex-row lg:items-center lg:justify-between lg:px-16 lg:py-16">
                    <div className="max-w-2xl">
                        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/55">Come on in</p>
                        <h2 className="font-display text-3xl font-medium leading-tight tracking-[-0.055em] text-white sm:text-4xl lg:text-5xl">
                            Find a story. Bring someone along.
                        </h2>
                        <p className="mt-4 max-w-lg text-sm leading-6 text-white/45 sm:text-base sm:leading-7">See what’s playing on LokDarpan and find your next shared moment.</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-4">
                        <Link to="/" className="group inline-flex h-12 items-center gap-3 rounded-full bg-white px-5 text-sm font-semibold text-slate-950 no-underline transition-all hover:-translate-y-0.5 hover:bg-blue-50">
                            Explore videos <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                        </Link>
                        <Link to="/auth/signup" className="text-sm font-medium text-white/55 no-underline transition-colors hover:text-white">Join LokDarpan <ArrowRight className="ml-1 inline h-3.5 w-3.5" aria-hidden="true" /></Link>
                    </div>
                </div>
            </section>
            </main>

            <footer className="relative z-10 mx-auto flex max-w-7xl flex-col items-start justify-between gap-5 border-t border-white/[0.07] px-5 py-7 sm:flex-row sm:items-center sm:px-8 lg:px-12">
                <Wordmark />
                <p className="text-xs text-white/30">A little more together.</p>
                <Link to="/" className="text-xs text-white/45 no-underline transition-colors hover:text-white/80">Back to videos <ArrowUpRight className="ml-1 inline h-3 w-3" aria-hidden="true" /></Link>
            </footer>
        </div>
    );
}
