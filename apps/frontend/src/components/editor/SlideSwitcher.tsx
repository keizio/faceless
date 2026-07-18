"use client";

import { useCanvasEditorStore } from "@/stores/canvas-editor";
import { cn } from "@/lib/utils";

interface SlideSwitcherProps {
  slideCount: number;
  slideImages: string[];
}

export function SlideSwitcher({ slideCount, slideImages }: SlideSwitcherProps) {
  const activeSlideIndex = useCanvasEditorStore((s) => s.activeSlideIndex);
  const setActiveSlide = useCanvasEditorStore((s) => s.setActiveSlide);

  if (slideCount <= 1) return null;

  return (
    <div className="flex items-center gap-2 p-3 border-t border-border/50 overflow-x-auto">
      {Array.from({ length: slideCount }, (_, i) => (
        <button
          key={i}
          onClick={() => setActiveSlide(i)}
          className={cn(
            "relative flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all",
            activeSlideIndex === i
              ? "border-primary ring-2 ring-primary/20"
              : "border-border/50 hover:border-border",
          )}
        >
          {slideImages[i] ? (
            <img
              src={slideImages[i]}
              alt={`Slide ${i + 1}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-muted flex items-center justify-center">
              <span className="text-xs text-muted-foreground">{i + 1}</span>
            </div>
          )}
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 text-center text-[10px] font-medium py-0.5",
              activeSlideIndex === i
                ? "bg-primary text-primary-foreground"
                : "bg-background/80 text-muted-foreground",
            )}
          >
            {i + 1}
          </div>
        </button>
      ))}
    </div>
  );
}
