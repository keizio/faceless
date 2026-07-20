import Image from "next/image";

const STEPS = [
  {
    number: "01",
    title: "Describe Your Idea",
    description: "Tell AI what you want to create — a product launch, a tutorial, or a brand story. Just a few words is enough.",
    image: "/images/steps/step-describe.png",
  },
  {
    number: "02",
    title: "AI Generates Content",
    description: "Our AI models create images, videos, slides, or text optimized for your chosen platform and audience.",
    image: "/images/steps/step-generate.png",
  },
  {
    number: "03",
    title: "Review & Publish",
    description: "Fine-tune the results, apply your brand kit, and publish directly to your social media channels.",
    image: "/images/steps/step-review.png",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground">
            Three simple steps to create professional social media content.
          </p>
        </div>

        <div className="relative grid grid-cols-1 gap-8 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.number} className="relative flex flex-col items-center text-center">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {step.number}
              </div>

              <div className="isometric-grid mb-6 w-full">
                <div className="isometric-card">
                  <Image
                    src={step.image}
                    alt={step.title}
                    width={1024}
                    height={1024}
                    loading="lazy"
                    className="h-auto w-full rounded-xl depth-2"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
              </div>

              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                {step.description}
              </p>

              {index < STEPS.length - 1 && (
                <div className="absolute right-0 top-12 hidden md:block">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-border"
                    style={{ transform: "translateX(50%)" }}
                  >
                    <path
                      d="M5 12H19M19 12L14 7M19 12L14 17"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}