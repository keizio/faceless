export type ArtStyle =
  | "comic"
  | "cartoon"
  | "anime"
  | "realistic"
  | "cinematic"
  | "pixel-art"
  | "watercolor"
  | "3d-render"
  | "cyberpunk"
  | "vintage"
  | "abstract"
  | "chibi"
  | "minimalist";

export const ART_STYLE_MODIFIERS: Record<ArtStyle, string> = {
  "comic": "Comic book art style, bold ink outlines, halftone dots, vibrant cel-shaded colors, graphic novel aesthetic, Ben-Day dots texture",
  "cartoon": "Cartoon illustration style, exaggerated features, smooth curved lines, bright saturated colors, whimsical playful aesthetic",
  "anime": "Anime art style, Japanese animation aesthetic, large expressive eyes, cel-shading, vibrant hair colors, stylized proportions",
  "realistic": "Photorealistic style, natural skin textures, accurate lighting and shadows, lifelike details, true-to-life proportions, hyper-realistic rendering",
  "cinematic": "Cinematic film style, dramatic mood lighting, rich color grading, film grain texture, lens flares, shallow depth of field, widescreen composition",
  "pixel-art": "Pixel art style, retro 8-bit aesthetic, blocky pixelated rendering, limited color palette, chunky resolution, nostalgic video game look",
  "watercolor": "Watercolor painting style, soft color washes, bleeding edges, paper texture visible, flowing pigments, artistic hand-painted feel",
  "3d-render": "3D rendered CGI style, polygonal modeling, ray-traced lighting, PBR materials, smooth surfaces, digital art, octane render aesthetic",
  "cyberpunk": "Cyberpunk aesthetic, neon glow lighting, dark urban dystopian environment, holographic displays, futuristic tech-noir atmosphere, rain-slicked streets",
  "vintage": "Vintage retro style, warm sepia tones, film grain, faded colors, nostalgic 70s/80s aesthetic, analog photography look",
  "abstract": "Abstract art style, non-representational forms, geometric shapes, color field painting, surreal compositions, experimental visual design",
  "chibi": "Chibi art style, super-deformed proportions, oversized heads compared to tiny bodies, cute kawaii aesthetic, large shiny eyes, simplified features",
  "minimalist": "Minimalist style, clean simple lines, ample negative space, restrained color palette, understated elegance, sparse composition",
};

const ART_STYLE_KEYWORDS: Record<ArtStyle, string[]> = {
  "comic": ["comic", "comic book", "comic style", "graphic novel", "cel-shaded", "cel shaded", "halftone", "ben-day"],
  "cartoon": ["cartoon", "cartoonish", "cartoony", "animated series", "saturday morning"],
  "anime": ["anime", "manga", "japanese animation", "japanese anime", "anime style", "shonen", "shoujo", "studio ghibli"],
  "realistic": ["realistic", "photorealistic", "photoreal", "real life", "real photo", "photograph", "photography", "real world", "natural look", "hyperrealistic", "hyper-realistic"],
  "cinematic": ["cinematic", "movie", "film", "cinema", "filmic", "movie poster", "film still", "hollywood"],
  "pixel-art": ["pixel art", "pixel", "8-bit", "8bit", "16-bit", "16bit", "retro game", "pixelated", "blocky"],
  "watercolor": ["watercolor", "water colour", "watercolour", "aquarelle", "painted", "painting style", "brush stroke"],
  "3d-render": ["3d render", "3d", "cgi", "cgi render", "octane", "blender", "unreal engine", "pbr", "ray traced", "raytracing", "polygon"],
  "cyberpunk": ["cyberpunk", "neon", "dystopian", "cyber", "cyborg", "hologram", "future city", "tech noir", "blade runner"],
  "vintage": ["vintage", "retro", "old school", "70s", "80s", "90s", "nostalgic", "throwback", "polaroid", "film grain"],
  "abstract": ["abstract", "surreal", "geometric", "non-representational", "color field", "expressionist", "cubist", "modern art"],
  "chibi": ["chibi", "kawaii", "cute style", "super deformed", "super-deformed", "sd style"],
  "minimalist": ["minimalist", "minimal", "clean", "simple", "minimalistic", "flat design", "minimalism"],
};

export function detectArtStyle(prompt: string): ArtStyle | null {
  const lower = prompt.toLowerCase();

  const scored: { style: ArtStyle; score: number }[] = [];

  for (const [style, keywords] of Object.entries(ART_STYLE_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        score += keyword.length;
      }
    }
    if (score > 0) {
      scored.push({ style: style as ArtStyle, score });
    }
  }

  if (scored.length === 0) return null;

  scored.sort((a, b) => b.score - a.score);
  return scored[0].style;
}

export function getArtStyleModifier(style: ArtStyle | null | undefined): string {
  if (!style) return "";
  return ART_STYLE_MODIFIERS[style] ?? "";
}