# LokDarpan recommendation system plan

Status: **proposal for discussion; not implemented or benchmarked**. Scope: personalized video discovery on Home, related videos on Watch, and Shorts. The goal is a video experience that earns comparison with YouTube on relevance, discovery and viewer trust. We cannot claim parity without comparable data and a controlled evaluation.

## Product direction: ask the viewer first

LokDarpan starts with less behavioral data than an established platform. Its proposed distinction is a short, optional conversation about ordinary moments in a person's day. The answers provide tentative starting hints for a varied feed; actual choices and direct feedback gradually refine it. It should feel like a friendly conversation, not a questionnaire asking people to name video genres or describe their personality.

Use simple questions informed by motivation and context—such as whether someone wants to relax, learn, follow local stories, or discover creators—without claiming to diagnose personality or mental state. Do not infer protected or sensitive traits from answers. These questions are product hypotheses: test whether people understand them, finish them and actually prefer the resulting feed. Preference onboarding gives a cold-start advantage to test; it does not establish recommendation quality or parity with YouTube.

### Proposed onboarding flow

1. Explain: “A few quick questions can help us make your feed feel more like you. You can skip any question and change your choices anytime.” Offer **Skip** and **Change later**. No Aadhaar, network membership, or sensitive personal details are needed.
2. Ask a few ordinary, conversational questions one at a time. Allow multiple answers, “It depends,” and skip. Use neutral, non-leading choices. Do not ask users to select genres or tell us directly which videos they want to watch as the primary onboarding flow.
3. Translate responses into weak, revisable hints; do not present them as facts about the person. Where actual catalogue content is available, optionally show a small set of varied real examples and let the user correct the direction. Do not generate fake catalogue cards.
4. Show a plain-language summary of the suggested feed with edit/remove controls, then build a mixed feed. If the catalogue cannot support a suggestion, omit it and explain where useful.
5. Offer **Tune your feed** later. Explicit exclusions and changes apply immediately, and the viewer can reset preferences separately from deleting watch or search history.

### Example questions for Raj to review

| Question | Suggested optional answers | What it changes |
| --- | --- | --- |
| You have a little time after a long day. What sounds nice? | A good laugh; a story; something calming; trying something new; it depends | Weak initial hints toward entertainment, stories, calming or exploratory content. None implies a personality or mental state. |
| A friend brings up something you haven't heard of. What do you usually do? | Ask how it works; listen to their story; look for a quick answer; explore it later; it depends | Tentative format hints such as explainers, narratives or shorter content, when metadata exists. |
| It's a free afternoon. What might you enjoy doing? | Listening to music; following a match; making or fixing something; hearing local stories; something else | Optional initial topic hints. Show a varied feed and let the viewer change the suggestion. |
| You're waiting for someone and have a few minutes. What feels right? | A quick update; a short story; something funny; I'll save it for later; it depends | A soft suggestion for shorter content; never assume that this describes every session. |
| A conversation gets interesting. How do you like to follow it? | A quick overview; different people's views; a detailed explanation; depends on the topic | Tentative format and length hints, with no fixed mapping to a person's traits. |
| Something unexpected appears in your day. What do you tend to do? | Try it; stick with what I know; a bit of both; it depends | Initial discovery setting only, editable later. Do not infer risk appetite or personality. |

The options are examples, not a scored psychological test. For each answer, keep an explicit versioned mapping to *possible* content features and a low initial confidence; do not infer a precise genre from a vague answer. If evidence or metadata is missing, use a broad mix. Show the viewer a tentative summary—“We could start with stories and practical ideas”—and allow **Looks good**, **Change**, or **Skip**. Language can be set in ordinary settings or a short separate prompt because it cannot be reliably derived from these answers. Avoid deceptive hidden profiling: tell users that responses influence recommendations and let them inspect and delete the resulting preferences.

These choices are draft wording, not validated psychological instruments. Avoid asking for health, religion, caste, income, political affiliation or other sensitive details. A search query about a sensitive subject also must not be transformed into a sensitive profile. Some interests can themselves be sensitive, so selection options and handling need a separate product and privacy review before launch.

### Combining stated preferences with behavior

- Initially, selected topics, formats, languages and discovery preference guide candidate selection and ordering. Use a broad mixed feed when answers are absent.
- Update a short-lived interest from searches and deliberate watches only if the viewer permits personalization. A query is weaker evidence than a chosen, meaningfully watched result; one search never permanently changes a preference.
- Maintain separate **explicit choices** and **inferred interests** with timestamps and sources. Never silently overwrite the viewer's explicit selections. Let people inspect, remove and reset inferred interests; a negative control suppresses relevant recommendations promptly.
- Blend stated interests, recent behavior and discovery with configurable weights and confidence. Do not invent fixed weights or claim this blend is optimal before experiments. When signals conflict, offer relevant variety and give explicit exclusions precedence.
- On Home, offer a clear “Because you chose …” or “Based on a recent search” reason only when true, and a link to tune the feed. Do not reveal private searches or preference details to other users.
- Measure onboarding completion and abandonment, preference coverage by the real catalogue, immediate relevance ratings, meaningful watches, return rate and negative feedback. Compare an optional-question cohort against a non-personalized baseline with consent and adequate sample size; examine new viewers separately. Look for accessibility and language differences. Never equate completion of the questionnaire with a good feed.

### Preference API additions (proposed)

`GET /api/v1/user/me/recommendation-preferences` returns editable explicit choices, allowed inferred-interest summaries, and personalization state for the authenticated owner. `PUT` updates validated choices and opt-in state, while `DELETE` resets the chosen scope; distinguish explicit preferences, inferred interests and search/watch history. Guest preferences remain local/session-only unless Raj decides otherwise. Save preferences server-side with clear schema/version and timestamps; validate topics against supported values and keep any free-text answer out of modeling until its purpose is defined. Final contracts and UI remain to be designed and tested.

## 1. Current state

Source inspection on 13 November 2026: `home.service.js` selects popular videos using lifetime views, plus latest videos and shorts. It uses categories and an eligibility filter, but no user-specific ranking. The video model has category, tags, duration, views, likes and visibility. Library models for saves and history have been added, but their end-to-end behavior remains unverified. There is no established impression/event pipeline, recommendation training data, satisfaction model, experiment platform or measured baseline. Other API/UI work remains in progress; see `server/docs/api-progress.md`.

The first target is a reliable personalized feed built on real eligible content. A phased design lets us improve quality as the catalogue and evidence grow, without assuming YouTube-scale data or infrastructure exists.

## 2. Product outcomes and surfaces

- **Home:** a useful mix of familiar interests, fresh videos, followed creators and new discoveries. A visitor can filter by category and recover from irrelevant recommendations.
- **Search-to-feed:** with personalization enabled, use a person's searches and what they choose to watch from the results to inform their Home feed. Explicit preferences remain an important input; search interest should decay and should not permanently define the feed.
- **Watch next:** relevant videos anchored to the video being watched, with enough variety to avoid a repetitive chain.
- **Shorts:** a separate feed with short-form interaction signals; use shared eligibility and metadata while evaluating its ranking independently.
- **Following:** explicit subscriptions remain an understandable chronological or clearly labeled feed; recommendation ranking must not silently replace it.
- **Networks:** friends and family connections are private by default for recommendation purposes. No network membership, interactions or private content are used for recommendations until the owner decides the visibility and consent model.

Primary outcome is sustained viewer satisfaction, assessed with repeat voluntary engagement and direct feedback, alongside meaningful watch time. Clicks, watch time and completion are signals, not proof of satisfaction. Creator discovery, content quality and user control are essential guardrails.

## 3. System flow

1. Client requests a feed with a surface, category and opaque pagination cursor. Server determines viewer context from the existing authenticated session; guests receive non-personalized or session-only results according to the eventual privacy decision.
2. **Eligibility:** retrieve only content the viewer can actually access and play. Exclude deleted, private, unlisted in public discovery, blocked, failed, unplayable and moderation-ineligible videos. Recheck eligibility before response and on playback. Explicitly define policy for missing legacy visibility values and migrate safely.
3. **Candidate generation:** combine independently bounded pools: recent eligible videos, quality-adjusted popular videos, category/topic similarity, followed channels, related-to-seed content, and a controlled new-creator/new-video pool. Deduplicate by video ID. Later add collaborative retrieval and embeddings only after enough data and evaluation exist.
4. **Ranking:** calculate a score from the features below. Start with transparent, configurable normalized signals and conservative defaults; then evaluate a learned ranker against that baseline. Never let a score override access or safety rules.
5. **Re-ranking:** balance creators, topics, freshness and exploration; suppress videos already seen or explicitly rejected. Apply user language preferences and avoid arbitrary exclusion when metadata is missing.
6. **Serve and observe:** return bounded results, opaque stable cursor or snapshot, request ID and reason category where appropriate. Record actual visible impressions and subsequent actions with position, surface, experiment and model version. Do not record private document data.
7. **Fallback:** if personalization, data stores or candidate sources fail, serve a cached eligible diverse recent/popular list; if the catalogue itself is unavailable, return an explicit error and usable retry UI. Never fall back to inaccessible or fabricated content.

The separation between candidate generation and ranking follows a published YouTube research design, not a claim about YouTube's current internal implementation: [Deep Neural Networks for YouTube Recommendations](https://research.google/pubs/deep-neural-networks-for-youtube-recommendations/).

## 4. Parameters and signals

| Parameter | Use | Constraints and missing data |
| --- | --- | --- |
| Eligibility and visibility | Hard gate for every candidate | Verify permission and current playback/moderation status; never learn from or serve inaccessible videos. |
| Impression and position | Denominator for evaluating exposure and position bias | Count only an actually visible card under a documented threshold; deduplicate retries; record surface and position. |
| Click / play start | Relevance hint | Weak alone; normalize by exposure and distinguish accidental starts and autoplay. |
| Watch duration and percentage | Engagement, with duration-aware features | Cap repeated events, filter seeks/background play, and avoid making short or long videos win solely due to length. |
| Completion / early exit / skips | Viewer interest by content type | Separate Shorts and long-form definitions; don’t assume a completed clip means satisfaction. |
| Like, dislike, save, subscribe | Stronger positive or negative intent | Track explicit changes and reversals; weigh sparingly when data is sparse; require real persisted state. |
| Not interested / hide channel | Explicit negative control | Apply immediately and persist per account; support undo. Agree semantics before launch. |
| Topic/category/tags and content similarity | Match current and longer-term interests; related videos | Tags may be missing or misleading; avoid relying on creator-supplied metadata alone. |
| Language and accessibility | Match explicit preferences, captions and available language | Do not infer sensitive attributes; show diverse content when language is unknown or user requests it. |
| Recency and freshness | Surface new material alongside established videos | Use publish time rather than upload/create time when available. Do not automatically discard older evergreen content. |
| Creator affinity and following | Offer relevant familiar creators | Apply per-creator limits and a new-creator pool to prevent concentration. |
| Popularity and quality | Cold-start evidence | Use time-windowed, exposure-aware and smoothed statistics; lifetime views alone reinforce popularity bias. |
| Session context | Adapt to current topic, surface and recent interactions | Bound the window; preserve access to multiple interests and avoid sensitive inference. |
| Search queries and search-result actions | Identify recent interests and generate topic-matched candidates for the user's feed | A query is a weak signal: weight a result the user deliberately watches more than a query or impression. Decay old searches; allow deletion/reset and opt-out. Do not use sensitive queries as interests. |
| Diversity and exploration | Learn interests and expose new creators/videos | Start with a small configurable allocation; log randomization probability and monitor experience. No specific percentage is asserted as optimal. |
| Negative reports / policy status | Prevent harmful or inappropriate distribution | Policy/eligibility is a hard constraint; reports are not automatically proof of violation. |

All numerical weights, time windows, creator caps, exploration allocations, impression thresholds and freshness decay values are **tunable hypotheses**, to be set after baseline data and experiments. Use smoothing and minimum evidence for low-exposure videos. Retain an interpretable reason breakdown internally without exposing sensitive information.

## 5. Data and instrumentation

Define a versioned event schema for `impression`, `click`, `play_start`, `watch_progress`, `play_end`, `like`, `dislike`, `save`, `subscribe`, `not_interested`, `hide_channel`, and optionally a concise satisfaction prompt. Each event needs event ID, schema version, UTC timestamp, pseudonymous account or session ID, video ID, surface, request ID, item position, and action-specific fields. Recommendation decisions log candidate source, model/policy version, experiment assignment and exploration propensity where relevant. Authenticate server-side actions, use bounded event batches, deduplicate event IDs, validate ownership and timestamps, and account for late/out-of-order delivery. Avoid relying on the current `viewedBy` array for detailed, unbounded event history.

For search, add separate `search_submitted` and search-result impression/click/play events linked by a search request ID; a search submission need not have a video ID. Record only the data needed for personalization under the chosen privacy and retention policy. Derive a temporary topic preference from eligible, non-sensitive queries and subsequent deliberate watches; do not treat a search as an endorsement. Search ranking and Home ranking remain distinct surfaces, but their events can inform the same permissioned preference profile. Search history deletion and recommendation reset must remove or rebuild derived search-based preferences and invalidate affected caches.

Distinguish **impressions** from results returned by the API: a card is an impression only after it is actually visible. A watch-progress event records incremental active playback, not repeated cumulative seconds added together. Define seek, pause, background, replay and autoplay treatment, and prevent retry inflation. Account for data deletion, retention limits, access control, aggregation and consent choices before collection. Do not use Aadhaar/DigiLocker verification data or network membership as recommendation features by default.

Start with the existing Node/Fastify and MongoDB stack. Use separate bounded event storage and background aggregation rather than growing arrays on user/video documents. Add queues and analytical storage only when data volume or operational needs justify them. Define indexes, retention/TTL, idempotency, backpressure, replay and data export before launching instrumentation. Keep ingestion independent from playback: a logging outage must not make the app unusable.

## 6. Cold start and candidate strategy

- **New or signed-out viewer:** ask for optional topics/languages, or provide a diverse recent/popular mix. No compulsory questionnaire. Explicitly label personalization settings and provide a reset.
- **New video:** use title, description, category, tags, language and creator information where available; give limited, measured exploration exposure. Content-based similarity is useful when interaction data is sparse, but metadata alone is not a quality guarantee. [Google Research: Content-based Related Video Recommendations](https://research.google/pubs/content-based-related-video-recommendations/).
- **New creator:** mix eligible new creators into candidate pools, measure exposure and satisfaction by cohort, and cap concentration without guaranteeing impressions.
- **Sparse catalogue:** fewer honest, distinct recommendations and clear empty states are better than fabricated videos or repeated cards.
- **Established viewer:** combine recent session interest with a decayed longer-term profile, followed creators and discovery candidates. Let explicit negative feedback override inferred interest.
- **After a search:** add a bounded search-interest candidate pool matching recent topics. Increase confidence when the viewer chooses and watches relevant results; fade an isolated query over time. Keep other interests and exploration represented, so a single search does not dominate Home.

Candidate pool sizes, exploration rates and exposure quotas are configuration experiments, not fixed promises. Measure candidate coverage and recall before investing in a complex ranker: a ranker cannot rescue relevant content absent from its candidates. Google research discusses exploration in relation to accuracy, diversity, novelty and serendipity: [Values of Exploration in Recommender Systems](https://research.google/pubs/values-of-exploration-in-recommender-systems/).

## 7. Interfaces and UI integration

Proposed contracts; existing endpoints must be inspected and adapted rather than duplicated blindly:

- `GET /api/v1/home`: preserve the current home response shape where possible; add personalized sections and a request ID. Accept a category, limit and cursor. Never return user tokens or private features.
- `GET /api/v1/video/:videoId/related`: contextual eligible recommendations for Watch. Validate access to the seed and viewer access to candidates.
- `GET /api/v1/shorts/feed`: short-form feed and continuation. Confirm route naming against the existing video catalogue before implementation.
- `POST /api/v1/recommendation-events`: bounded validated batch of exposure and playback events. Server attributes identity; never trust a submitted user ID.
- `PUT /api/v1/user/me/recommendation-preferences`: explicit topics/languages and controls, with clear defaults and deletion/reset behavior.
- `PUT /api/v1/user/me/recommendation-feedback/:videoId`: explicit hide/not-interested action; support reversal. Decide whether hide-channel deserves a separate endpoint.

Home must actually render the returned cards, selected category, honest section labels, stable links and loading/empty/error states. Watch must render related cards and honor access. Shorts must record actual visibility and playback. Add useful **Not interested**, **Don't recommend this channel**, and optional **Why this video?** controls when backend semantics are ready. For signed-out users, clearly describe session-only behavior if enabled. Pagination must not reshuffle or duplicate cards within one feed snapshot; filter deleted or newly restricted items again at serve time.

An API is complete only when its intended UI is integrated and verified, consistent with the project rule. Group testing can happen after feature implementation, as requested.

## 8. Delivery phases and gates

1. **Prerequisites:** finish working catalogue, playback, access checks, identity/session, basic save/reaction states and production-safe API contracts. Fix duplicate Watch route conflict. Establish sample fixtures and a local test environment. No recommendations should use incomplete/missing data as facts.
2. **Measurement foundation:** ship event contracts, viewability/playback instrumentation, deduplication, privacy controls, basic dashboards and a frozen non-personalized baseline. Audit event loss, duplicates and eligibility leaks.
3. **MVP retrieval and ranking:** bounded category/following/recent/popular/similar candidate sources; transparent score; explicit feedback, simple creator caps and configured exploration; snapshot pagination and robust fallback. Integrate Home and Watch. Shorts gets separate ranking once its data and route exist.
4. **Quality iteration:** add language/topic matching, content-based similarity, calibrated ranking, negative feedback, creator diversity and new-content exploration. Evaluate offline and run small controlled experiments. Add embedding or collaborative retrieval only when data volume, evaluation and serving cost support it.
5. **Advanced scale:** consider a trained two-stage model, approximate nearest-neighbor retrieval, feature store and periodic model refresh when measurements show the simpler system is a bottleneck. Version features/models and retain fallback/rollback. Avoid introducing a model or costly vector infrastructure just to imitate a competitor.

Each phase has a written acceptance checklist, data dependencies, UI behavior and rollout/rollback plan. Prioritize safe end-to-end function over the number of APIs shipped.

## 9. Evaluation and competitive ambition

Establish a **baseline first**: a chronological/recent and a smoothed popularity feed, plus simple category matching. Track results separately for Home, Watch and Shorts; logged-in vs guest, new vs returning viewers, languages, device classes and new vs established creators. Use temporal train/validation/test splits and point-in-time features to prevent leakage. Report candidate recall, Recall@K/NDCG@K and coverage against held-out interactions, but recognize that historical logs reflect the old exposure policy. Compare to simple baselines, document uncertainty, and use randomized exposure/propensity data when available. Offline gains are a screening signal, not proof of user benefit.

For online tests use randomized stable assignment, a predeclared primary metric and guardrails, sample size/power or a documented minimum-detectable effect, experiment duration, exclusion rules, and stop/rollback criteria before launch. Small traffic means results can be inconclusive; do not claim improvements from tiny samples. Monitor:

- Viewer outcomes: voluntary return rate, engaged watch time per viewer, meaningful playback and survey-based satisfaction where available.
- Guardrails: negative feedback, rapid skips, reports, repeat exposures, playback failures, latency/error rate, diversity and new-creator exposure.
- Integrity: event completeness/deduplication, eligible-content violations, candidate-source coverage and skew by position or cohort.
- Creator ecosystem: exposure and engagement distribution, new-video discovery and concentration; do not optimize raw views alone.

Set numerical targets only after baseline measurements. To compare with YouTube, choose a consented user study with the same tasks, audience, content availability and observation period; record relevance ratings, discovery and return intent, plus confidence intervals. An unmatched comparison to YouTube's global metrics cannot establish parity. Proposed checkpoints are hypotheses, not measured performance.

## 10. Operational and safety requirements

Use timeouts, bounded queries, indexes, circuit breakers and cached fallbacks; set latency and freshness budgets after measuring the current stack. Keep model/feature versions, traceable request IDs, structured error rates and dashboards. Recheck permissions at serving and playback, invalidate caches when visibility or moderation status changes, and honor account deletion and recommendation reset through raw events, derived features and caches. Avoid storing private content or sensitive identity information in features or logs.

Before public release, review abuse resistance (bots, repeated playback, coordinated likes, clickbait), sensitive-topic treatment and moderation escalation. Restrict access to behavioral data, document retention, and provide a simple opt-out or personalization reset according to the product decision. These are engineering requirements to design and validate, not claims that current behavior meets them.

## 11. Open questions for Raj

1. Who is LokDarpan's first audience, and what should make its Home feed valuable compared with YouTube for them?
2. Should the first release focus on long videos, Shorts, local-language content, or a combination?
3. Which languages and regions should users be able to select initially, and should location be used at all?
4. What is the initial catalogue and expected number of active viewers/creators? What infrastructure and monthly budget are available?
5. Should guests have session-only personalization, or receive the same non-personalized feed until they sign in?
6. Should family/friend networks ever influence discovery, and if so what visibility and opt-in should each member have?
7. Should creators be allowed to select categories/languages and edit tags, and who verifies inaccurate metadata?
8. What are the rules for private, unlisted, age-restricted, disputed and moderated content, including shares inside networks?
9. What feedback controls should viewers get at launch, and should a dislike affect the entire channel or only a video/topic?
10. How do we define a meaningful view, visible impression, autoplay, completion and retention for each surface?
11. What is an acceptable data retention period, personalization opt-out and deletion/reset experience?
12. What quality indicators matter most: viewer return, satisfaction survey, watch time, creator discovery, or another outcome? What tradeoffs are unacceptable?
13. How should new creators receive exploration exposure, and should any editorial selections be clearly labeled?
14. When will a real test database and representative, permission-safe catalogue be available for end-to-end evaluation?
15. Should search history personalize Home for signed-in users by default, or only after opt-in? Should guests have session-only search personalization?
16. How long should search-derived interests persist, and should clearing search history also clear those interests automatically?

## References

- [Deep Neural Networks for YouTube Recommendations](https://research.google/pubs/deep-neural-networks-for-youtube-recommendations/) (2016): two-stage retrieval/ranking research.
- [Content-based Related Video Recommendations](https://research.google/pubs/content-based-related-video-recommendations/) (2016): content signals for sparse/new videos.
- [Values of Exploration in Recommender Systems](https://research.google/pubs/values-of-exploration-in-recommender-systems/) (2021): exploration and recommendation-quality dimensions.
- [Attribute-based Propensity for Unbiased Learning in Recommender Systems](https://research.google/pubs/attribute-based-propensity-for-unbiased-learning-in-recommender-systems-algorithm-and-case-studies/) (2020): exposure and propensity considerations.
