import type { CopywritingFramework, CtaPattern } from "../prompts/types.js";

export interface TemplatePrompts {
  systemPrompt: string;
  visualGuidance: string;
  negativeAdditions: string[];
  scriptStructure?: string;
  narrationGuidance?: string;
  framework?: CopywritingFramework;
  ctaPattern?: CtaPattern;
}

export function buildTemplatePrompt(
  templateId: string,
  inputs: Record<string, unknown>,
): TemplatePrompts | null {
  switch (templateId) {
    case "ugc-product-marketing":
      return buildUgcProductMarketingPrompts(inputs);
    case "storytime-narration":
      return buildStorytimeNarrationPrompts(inputs);
    case "fake-chat":
      return buildFakeChatPrompts(inputs);
    case "fact-card":
      return buildFactCardPrompts(inputs);
    case "quote-card":
      return buildQuoteCardPrompts(inputs);
    case "split-screen":
      return buildSplitScreenPrompts(inputs);
    case "listicle":
      return buildListiclePrompts(inputs);
    case "ai-music-video":
      return buildAiMusicVideoPrompts(inputs);
    case "pov":
      return buildPovPrompts(inputs);
    default:
      return null;
  }
}

function buildUgcProductMarketingPrompts(inputs: Record<string, unknown>): TemplatePrompts {
  const productName = inputs.productName as string ?? "";
  const productDescription = inputs.productDescription as string ?? "";
  const keyFeatures = (inputs.keyFeatures as string[]) ?? [];
  const tone = inputs.tone as string ?? "enthusiastic";
  const productImage = inputs.productImage as string | undefined;

  const toneMap: Record<string, string> = {
    enthusiastic: "energetic, excited, genuine amazement",
    honest: "authentic, balanced, real experience",
    casual: "relatable, everyday language, friend-to-friend",
    professional: "credible, informed, measured praise",
  };

  const featuresList = keyFeatures.length > 0
    ? `Key features to highlight: ${keyFeatures.join(", ")}`
    : "Highlight the most compelling product benefits naturally";

  const imageReference = productImage
    ? `\n\nA product image has been provided by the user. Use it as the primary visual reference: ${productImage}`
    : "";

  return {
    systemPrompt: `You are a UGC (User Generated Content) creator making authentic product marketing content.
Create content that feels like a real person sharing their genuine experience with a product.

Product: ${productName}
Description: ${productDescription}
${featuresList}
Tone: ${toneMap[tone] ?? toneMap.enthusiastic}

CRITICAL RULES:
- Sound like a real person, not an ad
- Include a personal hook in the first 3 seconds
- Show the problem the product solves
- Include a clear call-to-action
- Never use fake statistics or follower counts
- Never include social media handles`,
    visualGuidance: `Lifestyle product photography style. Show the product in a real-life context — hands holding it, it on a desk, in a bathroom, being used naturally. Warm, inviting lighting. The product should be the hero but feel organic, not staged. Avoid stock-photo aesthetics.${imageReference}`,
    negativeAdditions: [
      "stock photo",
      "generic product shot",
      "corporate advertising",
      "overly polished",
      "fake review",
      "infographic",
    ],
    scriptStructure: "Hook (personal story/question) → Problem → Product reveal → Key benefit → Personal result → CTA",
    framework: "aida",
    ctaPattern: "benefit-driven",
  };
}

function buildStorytimeNarrationPrompts(inputs: Record<string, unknown>): TemplatePrompts {
  const storyTopic = inputs.storyTopic as string ?? "";
  const tone = inputs.tone as string ?? "dramatic";
  const hookStyle = inputs.hookStyle as string ?? "question";

  const toneMap: Record<string, string> = {
    dramatic: "intense, suspenseful, building tension",
    humorous: "light, funny, self-deprecating",
    mysterious: "enigmatic, slow reveal, atmospheric",
    inspirational: "uplifting, emotional, triumphant",
    confessional: "raw, vulnerable, honest",
  };

  const hookMap: Record<string, string> = {
    question: "Open with a compelling question that hooks curiosity",
    "shocking-fact": "Start with a surprising fact or statement",
    cliffhanger: "Begin mid-action, drop the viewer into the moment",
    confession: "Start with a personal admission or secret",
  };

  return {
    systemPrompt: `You are a viral storytime content creator for social media.
Create a compelling narrative that hooks viewers in the first 3 seconds and keeps them watching.

Story topic: ${storyTopic}
Tone: ${toneMap[tone] ?? toneMap.dramatic}
Hook style: ${hookMap[hookStyle] ?? hookMap.question}

NARRATIVE STRUCTURE:
1. Hook — Grab attention immediately
2. Setup — Establish context quickly
3. Conflict — Build tension or interest
4. Climax — The peak moment
5. Resolution — Satisfying conclusion
6. CTA — Engage the viewer

CRITICAL RULES:
- Write in conversational, spoken-word style
- Keep sentences short and punchy
- Use emotional language
- Include sensory details
- Never include fake statistics or social media handles`,
    visualGuidance: `Cinematic, atmospheric visuals that match the emotional arc. Moody lighting, dramatic compositions. Each scene should evoke the feeling of that story beat. Use environmental storytelling — show, don't tell.`,
    negativeAdditions: [
      "static",
      "boring",
      "documentary style",
      "educational",
      "tutorial",
    ],
    scriptStructure: "Hook → Setup → Conflict → Climax → Resolution → CTA",
    narrationGuidance: `Write the narration as if speaking directly to a friend. Use pauses, emphasis, and natural speech patterns. The voiceover should carry the emotional weight of the story.`,
    framework: "pas",
    ctaPattern: "curiosity",
  };
}

function buildFakeChatPrompts(inputs: Record<string, unknown>): TemplatePrompts {
  const chatStyle = inputs.chatStyle as string ?? "whatsapp";
  const senderName = inputs.senderName as string ?? "You";
  const receiverName = inputs.receiverName as string ?? "Friend";
  const rawMessages = inputs.messages as Array<string | { sender: string; text: string }> ?? [];

  const chatMessages = rawMessages.map((msg) =>
    typeof msg === "string" ? { sender: "you", text: msg } : { sender: msg.sender ?? "you", text: msg.text ?? "" },
  );
  const dialogueLines = chatMessages
    .map((m) => `${m.sender === "you" ? senderName : receiverName}: ${m.text}`)
    .join("\n");

  return {
    systemPrompt: `You are creating a realistic chat conversation for social media content.
Generate engaging, believable dialogue between two people.

Chat style: ${chatStyle}
Participants: ${senderName} and ${receiverName}

Conversation outline:
${dialogueLines}

RULES:
- Keep messages short and natural (like real texting)
- Include realistic reactions, slang, and emoji where appropriate
- Build toward a punchline, reveal, or emotional moment
- Match the tone of ${chatStyle} conversations
- Never include fake social media statistics or handles`,
    visualGuidance: `Clean phone screen aesthetic. The chat UI will be composited programmatically, so focus on generating a complementary background or context image if needed.`,
    negativeAdditions: [
      "blurry text",
      "unreadable",
      "low resolution",
      "distorted UI",
    ],
    framework: "pas",
    ctaPattern: "personal",
  };
}

function buildFactCardPrompts(inputs: Record<string, unknown>): TemplatePrompts {
  const factText = inputs.factText as string ?? "";
  const topic = inputs.topic as string ?? "";
  const style = inputs.style as string ?? "bold";

  const styleMap: Record<string, string> = {
    bold: "High contrast, dramatic lighting, dark background with bright text",
    minimal: "Clean, white space, subtle colors, elegant",
    neon: "Glowing, cyberpunk aesthetic, dark with neon accents",
    pastel: "Soft colors, gentle gradients, calming",
  };

  return {
    systemPrompt: `You are creating educational fact card content for social media.
Generate a compelling presentation of an interesting fact.

Fact: ${factText}
Topic: ${topic}
Visual style: ${styleMap[style] ?? styleMap.bold}

RULES:
- Keep the fact text concise and impactful
- The visual should complement the fact, not compete with it
- Create atmosphere and mood that matches the topic
- Leave space in the composition for text overlay
- Never include fake statistics beyond the provided fact`,
    visualGuidance: `${styleMap[style] ?? styleMap.bold}. Atmospheric background related to "${topic}". The image should provide visual context and mood while leaving clear space for bold text overlay. Avoid busy or cluttered compositions.`,
    negativeAdditions: [
      "text",
      "words",
      "letters",
      "typography",
      "cluttered",
      "busy background",
    ],
    framework: "aida",
    ctaPattern: "curiosity",
  };
}

function buildQuoteCardPrompts(inputs: Record<string, unknown>): TemplatePrompts {
  const quoteText = inputs.quoteText as string ?? "";
  const author = inputs.author as string | undefined;
  const style = inputs.style as string ?? "elegant";

  const styleMap: Record<string, string> = {
    elegant: "Classic, serif typography feel, warm tones, sophisticated",
    bold: "Modern, sans-serif, high contrast, impactful",
    minimal: "Clean, lots of white space, understated",
    gradient: "Vibrant color gradients, modern, eye-catching",
  };

  return {
    systemPrompt: `You are creating a beautiful quote card for social media.
Generate an atmospheric background that complements the quote.

Quote: "${quoteText}"
${author ? `Author: ${author}` : "No specific author"}
Style: ${styleMap[style] ?? styleMap.elegant}

RULES:
- Create an image that evokes the mood of the quote
- Keep the composition clean with space for text
- The background should enhance, not distract from the words
- Match the emotional tone of the quote
- Never include text in the generated image`,
    visualGuidance: `${styleMap[style] ?? styleMap.elegant}. Atmospheric, moody background that matches the emotional tone of the quote. Clean composition with clear negative space for typography overlay.`,
    negativeAdditions: [
      "text",
      "words",
      "letters",
      "typography",
      "quotes",
      "speech bubbles",
    ],
    framework: "aida",
    ctaPattern: "low-friction",
  };
}

function buildSplitScreenPrompts(inputs: Record<string, unknown>): TemplatePrompts {
  const leftDescription = inputs.leftDescription as string ?? "";
  const rightDescription = inputs.rightDescription as string ?? "";
  const orientation = inputs.orientation as string ?? "horizontal";
  const leftImage = inputs.leftImage as string | undefined;
  const rightImage = inputs.rightImage as string | undefined;

  const leftSource = leftImage
    ? `\n\nUser-provided left image (use as-is): ${leftImage}`
    : `\n\nLeft panel description: ${leftDescription}`;
  const rightSource = rightImage
    ? `\n\nUser-provided right image (use as-is): ${rightImage}`
    : `\n\nRight panel description: ${rightDescription}`;

  return {
    systemPrompt: `You are creating a split-screen comparison visual for social media.
Generate descriptions for two distinct panels that will be composited side by side.

Left panel: ${leftDescription}
Right panel: ${rightDescription}
Orientation: ${orientation === "horizontal" ? "side by side" : "top/bottom"}

RULES:
- Each panel should be visually distinct but stylistically cohesive
- The contrast between panels should be clear
- Both panels should work at half the full image size
- Never include text in the generated images`,
    visualGuidance: `Generate two visually distinct but stylistically cohesive images.${leftSource}${rightSource}${!leftImage && !rightImage ? `\n\nEach image will occupy half the final composition. Ensure both work well at reduced width/height.` : ""}`,
    negativeAdditions: [
      "text",
      "words",
      "split line",
      "divider",
      "watermark",
    ],
    framework: "pas",
    ctaPattern: "benefit-driven",
  };
}

function buildListiclePrompts(inputs: Record<string, unknown>): TemplatePrompts {
  const topic = inputs.topic as string ?? "";
  const itemCount = inputs.itemCount as number ?? 5;
  const items = inputs.items as string[] | undefined;
  const style = inputs.style as string ?? "numbered";

  const itemsList = items && items.length > 0
    ? `Items: ${items.join(", ")}`
    : `Generate ${itemCount} items about: ${topic}`;

  return {
    systemPrompt: `You are creating a listicle (Top X) content piece for social media.
Generate engaging content for a numbered list.

Topic: ${topic}
Number of items: ${itemCount}
${itemsList}
Style: ${style}

RULES:
- Each item should have a clear, punchy title
- Include a brief description for each item
- Order items for maximum engagement (build to the best)
- Keep descriptions concise for visual cards
- Never include fake statistics or social media handles`,
    visualGuidance: `Generate background images for each list item card. Each background should relate to that specific item while maintaining a cohesive visual style across all cards. Leave clear space for numbered text overlay.`,
    negativeAdditions: [
      "numbers",
      "text",
      "words",
      "digits",
      "cluttered",
    ],
    framework: "aida",
    ctaPattern: "curiosity",
  };
}

function buildPovPrompts(inputs: Record<string, unknown>): TemplatePrompts {
  const povText = inputs.povText as string ?? "";
  const condition = inputs.condition as string ?? "";
  const avatarMood = inputs.avatarMood as string ?? "natural";

  const moodMap: Record<string, string> = {
    natural: "neutral, natural expression, relaxed, authentic",
    happy: "joyful smile, bright eyes, positive energy, laughing or grinning",
    sad: "melancholy expression, tearful eyes, downturned mouth, sorrowful",
    angry: "furious scowl, intense glare, clenched jaw, aggressive posture",
    surprised: "wide eyes, dropped jaw, shocked expression, frozen in place",
    serious: "stern expression, focused gaze, tight lips, determined",
    playful: "mischievous grin, playful eyes, cheeky smile, energetic",
    scared: "wide eyes, fearful expression, recoiling, nervous",
    confused: "furrowed brow, tilted head, puzzled expression, bewildered",
  };

  return {
    systemPrompt: `You are creating a POV (Point of View) social media content piece.
The viewer sees the scene through the eyes of the avatar character.
Generate a POV-style scene that feels immersive and relatable.

POV text: "${povText}"
Scene condition: ${condition}
Avatar mood: ${moodMap[avatarMood] ?? moodMap.natural}

CRITICAL RULES:
- The scene should feel like a first-person perspective of the avatar
- Show the avatar's reaction to the situation through their expression and body language
- The POV text will be overlaid as a chip at the top of the final output
- Create a compelling, cinematic visual that matches the mood
- Keep the composition clear with space for the POV text overlay at the top
- Never include fake social media statistics or handles
- The visual should immediately convey the scenario and the avatar's emotional reaction`,
    visualGuidance: `POV perspective shot. First-person or over-the-shoulder angle showing the avatar's reaction to "${condition}". The avatar's mood is ${avatarMood}. Cinematic framing with the avatar's face/expression clearly visible. The top of the frame should have clear space for POV text chip overlay.`,
    negativeAdditions: [
      "text",
      "words",
      "letters",
      "typography",
      "cluttered",
      "busy composition",
      "watermark",
    ],
    narrationGuidance: "No narration needed for POV content. The visual and POV text overlay tell the story.",
    framework: "pas",
    ctaPattern: "personal",
  };
}

function buildAiMusicVideoPrompts(inputs: Record<string, unknown>): TemplatePrompts {
  const moodOrGenre = inputs.moodOrGenre as string ?? "";
  const visualStyle = inputs.visualStyle as string ?? "abstract";

  const styleMap: Record<string, string> = {
    abstract: "Surreal, flowing shapes, color fields, particle effects, dreamlike",
    cinematic: "Film-like scenes, dramatic lighting, narrative vignettes",
    anime: "Japanese animation style, vibrant colors, expressive characters",
    nature: "Landscape photography, natural beauty, organic movement",
    retro: "80s/90s aesthetic, neon grids, VHS effects, synthwave",
  };

  return {
    systemPrompt: `You are creating a music video concept for AI generation.
Generate visual scene descriptions that match the musical mood.

Mood/Genre: ${moodOrGenre}
Visual style: ${styleMap[visualStyle] ?? styleMap.abstract}

RULES:
- Scenes should flow with the rhythm and mood of the music
- Each scene should be visually striking on its own
- Maintain visual coherence across scenes
- Focus on movement, color, and atmosphere
- Never include text or lyrics in the visual descriptions`,
    visualGuidance: `${styleMap[visualStyle] ?? styleMap.abstract}. Scenes that flow with the musical energy of "${moodOrGenre}". Emphasize movement, color transitions, and atmospheric visuals. Each scene should feel like a frame from a music video.`,
    negativeAdditions: [
      "static",
      "boring",
      "text",
      "words",
      "low energy",
      "corporate",
    ],
    narrationGuidance: "No narration needed — this is a music video. Focus on visual storytelling through imagery and movement.",
  };
}
