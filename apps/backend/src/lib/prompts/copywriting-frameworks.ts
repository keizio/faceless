import type { Platform } from "./types.js";

export function renderAidaFramework(): string {
  return `STRUCTURE (AIDA Framework):
ATTENTION: Open with a bold hook — a surprising statement, provocative question, or striking visual cue that stops the scroll within 1-2 seconds.
INTEREST: Build curiosity by introducing a relatable problem, unexpected fact, or compelling narrative that makes the viewer want to keep watching.
DESIRE: Deliver the core value — show benefits, results, or transformation. Make the viewer feel they need this in their life.
ACTION: Close with a clear, low-friction call to action that tells the viewer exactly what to do next.`;
}

export function renderPasFramework(): string {
  return `STRUCTURE (PAS Framework):
PROBLEM: Lead with a specific, relatable pain point. Name the frustration explicitly — make the viewer feel understood.
AGITATE: Amplify the problem — show the cost of inaction, the recurring frustration, or the missed opportunity. Use emotional, visceral language.
SOLUTION: Present the resolution as the natural answer. Show the transformation, the relief, the better state. Make the CTA feel like the obvious next step.`;
}

export function renderFabFramework(features: string[]): string {
  const featureList = features.length > 0
    ? features.map((f) => `- ${f}`).join("\n")
    : "- [Identify key features of the subject]";

  return `STRUCTURE (FAB Framework — Feature → Advantage → Benefit):
Translate features into emotional benefits for the viewer:
${featureList}

For each feature:
1. STATE the feature (what it is)
2. EXPLAIN the advantage (what it does differently)
3. CONNECT to a benefit (why the viewer should care — the emotional or practical payoff)`;
}

export function renderHeadlineFormula(formula: string): string {
  const formulas: Record<string, string> = {
    "how-to": `HEADLINE FORMULA (How-To):
"How to [desired outcome] in [timeframe/effort] without [common pain point]"
"How to [achieve X] even if [objection]"
Example: "How to double your engagement in 7 days without posting more"`,

    list: `HEADLINE FORMULA (List):
"[Number] [adjective] [things] that [benefit/outcome]"
"[Number] ways to [desired result] (number #[last] will surprise you)"
Use odd numbers (5, 7, 9) for higher engagement.`,

    question: `HEADLINE FORMULA (Question):
Ask a question that creates an open loop — the viewer MUST watch to find the answer.
"Have you ever wondered why [common experience]?"
"What if I told you [counterintuitive claim]?"
Target a universal experience or hidden truth.`,

    command: `HEADLINE FORMULA (Command):
Start with a direct, imperative instruction that creates urgency.
"Stop [common mistake] right now"
"Try this [timeframe] hack for [desired result]"
"Save this for when you [situation]"`,

    "curiosity-gap": `HEADLINE FORMULA (Curiosity Gap):
Create a gap between what the viewer knows and what they want to know.
"The [thing] nobody talks about"
"I tried [thing] for [timeframe] — here's what happened"
Hint at a revelation without giving it away in the hook.`,

    testimonial: `HEADLINE FORMULA (Testimonial/Social Proof):
Frame the content as a real experience or transformation.
"I was skeptical until [moment]"
"This changed everything for me"
Use first-person, specific details, and emotional authenticity.`,

    why: `HEADLINE FORMULA (Why):
"Why [surprising subject] [unexpected action/result]"
"Why everything you know about [topic] is wrong"
Challenge assumptions. The "why" format signals explanation and insider knowledge.`,

    secret: `HEADLINE FORMULA (Secret/Insider):
"The secret [group] doesn't want you to know about [topic]"
"What [experts] won't tell you about [subject]"
Position the content as exclusive, hidden knowledge being revealed.`,

    "number-adjective": `HEADLINE FORMULA (Number + Adjective):
"[Number] [powerful adjective] [nouns] that [outcome]"
Use specific, evocative adjectives: shocking, brilliant, hidden, effortless, proven.
Example: "7 Brilliant Hacks That Save You Hours Every Week"`,

    "before-after": `HEADLINE FORMULA (Before/After):
Show the transformation explicitly.
"From [negative state] to [positive state] in [timeframe]"
"I went from [problem] to [solution] — here's exactly how"
The contrast creates urgency and hope simultaneously.`,
  };

  return formulas[formula] ?? formulas["how-to"];
}

export function renderCtaPattern(pattern: string): string {
  const patterns: Record<string, string> = {
    "low-friction": `CTA PATTERN (Low-Friction):
Make the ask effortless and non-committal:
"Save this for later"
"Follow for more tips like this"
"Share with someone who needs to hear this"
The viewer should feel zero pressure — just a natural next step.`,

    "benefit-driven": `CTA PATTERN (Benefit-Driven):
Frame the CTA around what the viewer gains:
"Follow to get [specific benefit] every week"
"Save this and try it today — you'll see results by [timeframe]"
"Comment [keyword] and I'll send you the full guide"
Always tie the action to a concrete outcome.`,

    urgency: `CTA PATTERN (Urgency):
Create time pressure or scarcity:
"This won't work forever — try it before [deadline]"
"Only a few people know this — share before it blows up"
"Do this TODAY and thank me tomorrow"
Use sparingly — only when genuine urgency exists.`,

    command: `CTA PATTERN (Direct Command):
Be explicit and authoritative:
"Tap the link in bio right now"
"Follow me for part 2"
"Comment your answer below"
Short, imperative, unambiguous.`,

    personal: `CTA PATTERN (Personal/Relational):
Build connection and invite dialogue:
"I'd love to hear your take — what do you think?"
"Drop a [emoji] if this resonated with you"
"Which one are you? Comment below"
Make the viewer feel seen and invited.`,

    curiosity: `CTA PATTERN (Curiosity/Cliffhanger):
Open a new loop that demands follow-up:
"Wait until you see what happens next..."
"Part 2 is even crazier — follow so you don't miss it"
"The real secret? I'll reveal it in my next post"
Create anticipation for future content.`,
  };

  return patterns[pattern] ?? patterns["low-friction"];
}

export function renderPersuasionPrinciple(principle: string): string {
  const principles: Record<string, string> = {
    reciprocity: `PERSUASION (Reciprocity):
Give value first — a free tip, useful insight, or genuine help. The viewer will naturally want to give back (follow, share, engage). Lead with generosity.`,

    scarcity: `PERSUASION (Scarcity):
Highlight what's limited — time, availability, exclusivity. "This only works until...", "Most people don't know this yet..." Create FOMO without being manipulative.`,

    authority: `PERSUASION (Authority):
Establish credibility through specific expertise, results, or credentials. "After 10 years of...", "We tested this with 10,000 users..." Use data and specificity, not vague claims.`,

    consistency: `PERSUASION (Consistency/Commitment):
Get a small yes first, then build. "If you agree that [universal truth]...", "You already know that [common belief]..." Then connect to your CTA as the natural next step.`,

    liking: `PERSUASION (Liking):
Build rapport through similarity, compliments, or relatability. Share personal stories, use conversational tone, show vulnerability. People engage with people they like.`,

    "social-proof": `PERSUASION (Social Proof):
Show that others are already doing it — but never fabricate numbers. "Join thousands who...", "Trending because...", "Everyone's talking about..." Use real momentum.`,
  };

  return principles[principle] ?? principles["social-proof"];
}

export function renderToneByChannel(platform: Platform): string {
  const toneMap: Record<Platform, string> = {
    tiktok: `TONE FOR TIKTOK:
- Conversational, casual, like talking to a friend
- Use slang and trending language naturally
- Emoji-friendly but not overdone
- Fast-paced, punchy sentences
- Hook within the first line — no warm-up
- Sound like a real person, not a brand`,

    instagram: `TONE FOR INSTAGRAM:
- Polished but authentic
- Storytelling-oriented — paint a picture
- Line breaks for readability
- Mix of aspirational and relatable
- Hashtags: 15-25, mix of popular and niche
- First line is the hook — it shows in the preview`,

    facebook: `TONE FOR FACEBOOK:
- Conversational and community-oriented
- Ask questions to drive comments
- Slightly longer form is acceptable
- Shareable, informational tone
- Hashtags: 3-5 maximum
- Write for sharing — make it worth passing along`,

    twitter: `TONE FOR TWITTER/X:
- Punchy, concise, quotable
- Under 280 characters for the main message
- Thread-friendly — break complex ideas into parts
- 1-2 hashtags maximum
- Bold takes, hot opinions, or sharp observations
- Every word must earn its place`,

    generic: `TONE:
- Professional yet approachable
- Clear, concise, universal appeal
- Adapt to the specific content type
- Focus on value delivery over platform tricks`,
  };

  return toneMap[platform] ?? toneMap.generic;
}

export function renderVoiceMatrix(voice: string): string {
  const voices: Record<string, string> = {
    authoritative: `VOICE: Authoritative
Confident, direct, commanding. Short declarative sentences. No hedging. State facts and opinions with certainty. The viewer trusts you because you sound like you know exactly what you're talking about.`,

    conversational: `VOICE: Conversational
Warm, casual, like chatting with a knowledgeable friend. Use contractions, colloquialisms, and natural speech patterns. Ask rhetorical questions. Include asides and parenthetical thoughts.`,

    inspirational: `VOICE: Inspirational
Uplifting, energetic, forward-looking. Use vivid imagery and emotional language. Focus on possibility and transformation. Short, powerful sentences mixed with longer flowing ones. Paint the vision.`,

    educational: `VOICE: Educational
Clear, structured, patient. Break complex ideas into digestible pieces. Use analogies and examples. Signal transitions ("First...", "Here's the key insight..."). Make the viewer feel smarter.`,

    humorous: `VOICE: Humorous
Witty, self-aware, playful. Use timing, callbacks, and unexpected twists. Self-deprecation works. Don't force jokes — let humor arise from honest observation. Keep it relatable, not try-hard.`,

    provocative: `VOICE: Provocative
Bold, challenging, contrarian. Question assumptions. State unpopular opinions with conviction. Use pattern interrupts — say something unexpected. The goal is to make the viewer think, not just nod along.`,
  };

  return voices[voice] ?? voices["conversational"];
}
