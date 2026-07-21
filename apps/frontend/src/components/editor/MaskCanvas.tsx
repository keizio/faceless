"use client";

import { useRef, useCallback, useImperativeHandle, forwardRef } from "react";

export interface MaskCanvasHandle {
  getMaskDataUrl: () => string | null;
  clearMask: () => void;
  undoLastStroke: () => void;
}

interface MaskCanvasProps {
  width: number;
  height: number;
  brushSize: number;
}

interface Stroke {
  points: { x: number; y: number }[];
}

export const MaskCanvas = forwardRef<MaskCanvasHandle, MaskCanvasProps>(
  ({ width, height, brushSize }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawingRef = useRef(false);
    const strokesRef = useRef<Stroke[]>([]);
    const currentStrokeRef = useRef<Stroke | null>(null);

    const getPos = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
      const rect = canvasRef.current!.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const redrawAllStrokes = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
      ctx.lineWidth = brushSize;

      for (const stroke of strokesRef.current) {
        if (stroke.points.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    }, [width, height, brushSize]);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      isDrawingRef.current = true;
      const pos = getPos(e);
      const stroke: Stroke = { points: [pos] };
      currentStrokeRef.current = stroke;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
      ctx.lineWidth = brushSize;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }, [brushSize]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return;
      const pos = getPos(e);
      currentStrokeRef.current?.points.push(pos);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }, []);

    const handleMouseUp = useCallback(() => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      if (currentStrokeRef.current) {
        strokesRef.current.push(currentStrokeRef.current);
        currentStrokeRef.current = null;
      }
    }, []);

    useImperativeHandle(ref, () => ({
      getMaskDataUrl: () => {
        const canvas = canvasRef.current;
        if (!canvas || strokesRef.current.length === 0) return null;

        const offscreen = document.createElement("canvas");
        offscreen.width = width;
        offscreen.height = height;
        const ctx = offscreen.getContext("2d");
        if (!ctx) return null;

        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, width, height);

        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "white";
        ctx.lineWidth = brushSize;

        for (const stroke of strokesRef.current) {
          if (stroke.points.length < 2) continue;
          ctx.beginPath();
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
          ctx.stroke();
        }

        return offscreen.toDataURL("image/png");
      },
      clearMask: () => {
        strokesRef.current = [];
        currentStrokeRef.current = null;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, width, height);
      },
      undoLastStroke: () => {
        strokesRef.current.pop();
        redrawAllStrokes();
      },
    }));

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0 cursor-crosshair"
        style={{ touchAction: "none" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    );
  },
);

MaskCanvas.displayName = "MaskCanvas";
