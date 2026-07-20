import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  {
    title: "AI Content Generation",
    description: "Generate images, videos, slides, and text posts with cutting-edge AI models in seconds.",
    image: "/images/features/ai-generation.png",
  },
  {
    title: "Multi-Platform",
    description: "Create platform-optimized content for TikTok, Instagram, and Facebook with the right aspect ratios.",
    image: "/images/features/multi-platform.png",
  },
  {
    title: "Templates & Brand Kit",
    description: "Save your brand colors, fonts, and styles. Apply them consistently across all content.",
    image: "/images/features/templates.png",
  },
  {
    title: "One-Click Publishing",
    description: "Schedule and publish directly to your social media platforms from one dashboard.",
    image: "/images/features/publish.png",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
            Everything You Need
          </h2>
          <p className="text-lg text-muted-foreground">
            Powerful tools to create, manage, and publish social media content at scale.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="glass depth-2 border-border/50 group/card">
              <CardContent className="p-0">
                <div className="isometric-grid p-4">
                  <div className="isometric-card">
                    <Image
                      src={feature.image}
                      alt={feature.title}
                      width={1024}
                      height={1024}
                      loading="lazy"
                      className="h-auto w-full rounded-xl"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  </div>
                </div>
                <div className="p-4 pt-0">
                  <h3 className="mb-2 text-base font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}