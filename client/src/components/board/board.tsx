import React, { useRef, useEffect, useCallback, useState } from "react";
import { Socket } from "../../Shared/socket";

interface CanvasBoardProps {
  color: string;
  size: number;
  tool: "brush" | "eraser";
}

interface Point {
  x: number;
  y: number;
}

interface DrawLineProps {
  start: Point;
  end: Point;
  color: string;
  size: number;
}

export const Board: React.FC<CanvasBoardProps> = ({ color, size, tool }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const lastMouse = useRef<Point>({ x: 0, y: 0 });

  // State for other users' cursors
  const [cursors, setCursors] = useState<{
    [key: string]: { x: number; y: number; color: string };
  }>({});

  // --- HELPER: DRAWING FUNCTION ---
  const drawLine = (ctx: CanvasRenderingContext2D, data: DrawLineProps) => {
    ctx.beginPath();
    ctx.moveTo(data.start.x, data.start.y);
    ctx.lineTo(data.end.x, data.end.y);
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  // --- 1. INITIAL SETUP & RESIZE ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (canvas && container) {
      const { width, height } = container.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
    }

    // Listen for history on join (so we see what was already drawn)
    Socket.on("initial-history", (history: DrawLineProps[]) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx && canvas) {
        // Clear and redraw everything
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        history.forEach((line) => drawLine(ctx, line));
      }
    });

    return () => {
      Socket.off("initial-history");
    };
  }, []);

  // --- 2. SOCKET EVENT LISTENERS ---
  useEffect(() => {
    const handleDrawLine = (data: DrawLineProps) => {
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) drawLine(ctx, data);
    };

    const handleClear = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const handleCursorUpdate = (data: {
      id: string;
      pos: Point;
      color: string;
    }) => {
      setCursors((prev) => ({
        ...prev,
        [data.id]: { x: data.pos.x, y: data.pos.y, color: data.color },
      }));
    };


    Socket.on("draw-line", handleDrawLine);
    Socket.on("canvas-clear", handleClear);
    Socket.on("cursor-update", handleCursorUpdate);

    return () => {
      Socket.off("draw-line", handleDrawLine);
      Socket.off("canvas-clear", handleClear);
      Socket.off("cursor-update", handleCursorUpdate);
    };
  }, []);

  // --- 3. MOUSE HANDLING ---
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      // A. Emit Cursor Position (for User Indicators)
      Socket.emit("cursor-move", { x: currentX, y: currentY });

      // B. Drawing Logic
      if (isDrawing.current) {
        const ctx = canvas.getContext("2d");
        const currentMouse = { x: currentX, y: currentY };

        // Determine color based on tool
        const drawColor = tool === "eraser" ? "#FFFFFF" : color;

        if (ctx) {
          // 1. Draw locally (Instant feedback)
          drawLine(ctx, {
            start: lastMouse.current,
            end: currentMouse,
            color: drawColor,
            size: size,
          });

          // 2. Emit to Server (Sync)
          Socket.emit("draw-line", {
            start: lastMouse.current,
            end: currentMouse,
            color: drawColor,
            size: size,
          });
        }
        lastMouse.current = currentMouse;
      }
    },
    [color, size, tool],
  );

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    const rect = canvasRef.current!.getBoundingClientRect();
    lastMouse.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const stopDrawing = useCallback(() => {
    isDrawing.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      className="board"
      style={{ position: "relative", width: "100%", height: "100%" }}
    > 
      {Object.entries(cursors).map(([id, cursor]) => (
        <div
          key={id}
          style={{
            position: "absolute",
            left: cursor.x,
            top: cursor.y,
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            backgroundColor: cursor.color,
            pointerEvents: "none",  
            transform: "translate(-50%, -50%)",  
            zIndex: 10,
            border: "1px solid white",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -20,
              left: 10,
              fontSize: 10,
              background: cursor.color,
              color: "#fff",
              padding: "2px 4px",
              borderRadius: 4,
            }}
          >
            User
          </div>
        </div>
      ))}

      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        style={{
          display: "block",
          background: "#FFFFFF",
          cursor: tool === "eraser" ? "crosshair" : "default",
        }}
      />
    </div>
  );
};
