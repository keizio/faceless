"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle, useState, memo } from "react";

export interface FabricCanvasHandle {
  exportAsBlob: () => Promise<Blob | null>;
  setBackgroundImage: (url: string) => Promise<void>;
}

interface FabricCanvasProps {
  backgroundImage: string;
  width: number;
  height: number;
}

const arePropsEqual = (
  prev: FabricCanvasProps,
  next: FabricCanvasProps,
): boolean => {
  if (prev.backgroundImage !== next.backgroundImage) return false;
  if (prev.width !== next.width || prev.height !== next.height) return false;
  return true;
};

export const FabricCanvas = memo(
  forwardRef<FabricCanvasHandle, FabricCanvasProps>(
    ({ backgroundImage, width, height }, ref) => {
      const canvasElRef = useRef<HTMLCanvasElement>(null);
      const fabricRef = useRef<InstanceType<typeof import("fabric").Canvas> | null>(null);
      const fabricModRef = useRef<typeof import("fabric") | null>(null);
      const bgImageUrlRef = useRef("");
      const disposedRef = useRef(false);
      const [canvasReady, setCanvasReady] = useState(false);

      const loadBackgroundImage = async (
        canvas: InstanceType<typeof import("fabric").Canvas>,
        fabricMod: typeof import("fabric"),
        url: string,
      ) => {
        if (url === bgImageUrlRef.current && canvas.backgroundImage) return;
        bgImageUrlRef.current = url;

        try {
          const img = await fabricMod.FabricImage.fromURL(url);
          img.set({
            scaleX: width / (img.width ?? width),
            scaleY: height / (img.height ?? height),
            left: width / 2,
            top: height / 2,
            originX: "center",
            originY: "center",
            selectable: false,
            evented: false,
          } as Record<string, unknown>);
          canvas.backgroundImage = img;
          canvas.renderAll();
        } catch {
          console.error("Failed to load background image:", url);
        }
      };

      useEffect(() => {
        if (!canvasElRef.current) return;

        let disposed = false;

        const initCanvas = async () => {
          const fabricMod = await import("fabric");
          if (disposed || !canvasElRef.current) return;

          fabricModRef.current = fabricMod;

          const canvas = new fabricMod.Canvas(canvasElRef.current, {
            width,
            height,
            selection: false,
            interactive: false,
          });

          if (disposed) {
            canvas.dispose();
            return;
          }

          fabricRef.current = canvas;

          if (backgroundImage) {
            await loadBackgroundImage(canvas, fabricMod, backgroundImage);
            if (disposed) return;
          }

          canvas.renderAll();
          setCanvasReady(true);
        };

        initCanvas();

        return () => {
          disposed = true;
          disposedRef.current = true;
          fabricRef.current?.dispose();
          fabricRef.current = null;
          setCanvasReady(false);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [width, height]);

      useEffect(() => {
        const canvas = fabricRef.current;
        const fabricMod = fabricModRef.current;
        if (!canvas || !fabricMod || !canvasReady) return;

        if (backgroundImage && backgroundImage !== bgImageUrlRef.current) {
          loadBackgroundImage(canvas, fabricMod, backgroundImage);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [backgroundImage, canvasReady]);

      useImperativeHandle(ref, () => ({
        exportAsBlob: () => {
          return new Promise<Blob | null>((resolve) => {
            const tryExport = () => {
              const canvas = fabricRef.current;
              if (!canvas) {
                setTimeout(tryExport, 50);
                return;
              }
              const htmlCanvas = canvas.getElement() as HTMLCanvasElement;
              try {
                htmlCanvas.toBlob((blob) => {
                  resolve(blob ?? null);
                }, "image/png");
              } catch {
                resolve(null);
              }
            };
            tryExport();
          });
        },
        setBackgroundImage: async (url: string) => {
          const canvas = fabricRef.current;
          const fabricMod = fabricModRef.current;
          if (!canvas || !fabricMod) return;
          bgImageUrlRef.current = url;
          await loadBackgroundImage(canvas, fabricMod, url);
        },
      }));

      return (
        <div
          className="relative inline-block overflow-hidden"
          style={{ width, height }}
        >
          <canvas
            ref={canvasElRef}
            width={width}
            height={height}
            style={{ display: canvasReady ? "block" : "none" }}
          />
          {!canvasReady && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>
      );
    },
  ),
  arePropsEqual,
);

FabricCanvas.displayName = "FabricCanvas";
