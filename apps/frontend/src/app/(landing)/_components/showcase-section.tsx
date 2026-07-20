import Image from "next/image";

const CONTENT_TYPES = [
  { label: "AI Images", description: "Stunning visuals for any platform" },
  { label: "Video Clips", description: "Short-form videos with AI voiceover" },
  { label: "Slide Decks", description: "Multi-image carousel content" },
  { label: "Text Posts", description: "AI-written captions and copy" },
];

export function ShowcaseSection() {
  return (
    <section id="showcase" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
            Content You Can Create
          </h2>
          <p className="text-lg text-muted-foreground">
            From eye-catching images to engaging videos — generate any format for any platform.
          </p>
        </div>

        <div className="isometric-grid mx-auto max-w-5xl">
          <div className="isometric-card mb-12">
            <Image
              src="/images/content-showcase.png"
              alt="Content showcase"
              width={2048}
              height={1024}
              loading="lazy"
              className="h-auto w-full rounded-2xl depth-2"
              sizes="(max-width: 768px) 100vw, 80vw"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {CONTENT_TYPES.map((type) => (
            <div
              key={type.label}
              className="glass rounded-xl border-border/50 p-4 text-center depth-1"
            >
              <h3 className="mb-1 text-sm font-semibold text-foreground">
                {type.label}
              </h3>
              <p className="text-xs text-muted-foreground">
                {type.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}