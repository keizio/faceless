"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-20">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 right-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl float-3d" style={{ animationDelay: "0s" }} />
        <div className="absolute -bottom-48 left-1/4 h-96 w-96 rounded-full bg-[hsl(var(--accent-secondary))]/5 blur-3xl float-3d" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/3 left-1/2 h-64 w-64 rounded-full bg-primary/3 blur-3xl float-3d" style={{ animationDelay: "4s" }} />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            AI-Powered Content Creation
          </div>

          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Create{" "}
            <span className="bg-gradient-to-r from-primary to-[hsl(var(--accent-secondary))] bg-clip-text text-transparent">
              Stunning Content
            </span>{" "}
            with AI
          </h1>

          <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
            Generate images, videos, slides, and text posts optimized for TikTok,
            Instagram, and Facebook. No design skills needed.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/login">
              <Button size="lg" className="h-12 gap-2 px-8 text-base">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                Explore Features
              </Button>
            </Link>
          </div>
        </div>

        <div className="isometric-grid mx-auto mt-16 max-w-5xl">
          <div className="isometric-card">
            <Image
              src="/images/hero-banner.png"
              alt="Faceless AI Content Generator"
              width={2688}
              height={1536}
              priority
              className="h-auto w-full rounded-2xl depth-3"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 80vw"
            />
          </div>
        </div>
      </div>
    </section>
  );
}