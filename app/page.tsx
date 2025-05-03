'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';

export default function DrawingApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState<'brush' | 'eraser' | 'rectangle' | 'circle'>('brush');
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);

  const prepareCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 80;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctxRef.current = ctx;
  }, [color, brushSize]);

  useEffect(() => {
    prepareCanvas();
    window.addEventListener('resize', prepareCanvas);
    return () => window.removeEventListener('resize', prepareCanvas);
  }, [prepareCanvas]);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev, snapshot]);
    setRedoStack([]);
  };

  const startDrawing = (e: React.MouseEvent) => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    const { offsetX, offsetY } = e.nativeEvent;

    if (tool === 'brush' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
    } else {
      setStartPos({ x: offsetX, y: offsetY });
    }

    setIsDrawing(true);
    saveToHistory();
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing || !ctxRef.current) return;
    const { offsetX, offsetY } = e.nativeEvent;

    const ctx = ctxRef.current;
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = brushSize;
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  };

  const stopDrawing = (e: React.MouseEvent) => {
    if (!ctxRef.current || !canvasRef.current) return;

    const { offsetX, offsetY } = e.nativeEvent;
    const ctx = ctxRef.current;

    if (tool === 'rectangle' && startPos) {
      const width = offsetX - startPos.x;
      const height = offsetY - startPos.y;
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.strokeRect(startPos.x, startPos.y, width, height);
    }

    if (tool === 'circle' && startPos) {
      const radius = Math.sqrt(Math.pow(offsetX - startPos.x, 2) + Math.pow(offsetY - startPos.y, 2));
      ctx.beginPath();
      ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.stroke();
    }

    ctx.closePath();
    setIsDrawing(false);
    setStartPos(null);
  };

  const undo = () => {
    if (!ctxRef.current || !canvasRef.current || history.length === 0) return;

    const newHistory = [...history];
    const last = newHistory.pop()!;
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;

    const currentImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setRedoStack((prev) => [...prev, currentImage]);
    ctx.putImageData(last, 0, 0);
    setHistory(newHistory);
  };

  const redo = () => {
    if (!ctxRef.current || !canvasRef.current || redoStack.length === 0) return;

    const newRedo = [...redoStack];
    const redoLast = newRedo.pop()!;
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;

    const currentImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev, currentImage]);
    ctx.putImageData(redoLast, 0, 0);
    setRedoStack(newRedo);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
    setRedoStack([]);
  };

  const saveAsImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'drawing.png';
    link.href = dataURL;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-6 py-4 bg-white shadow-md">
        <h1 className="text-2xl font-bold">🎨 SketchFlow</h1>
        <div className="space-x-2 flex items-center">
          <button onClick={undo} className="btn">Undo</button>
          <button onClick={redo} className="btn">Redo</button>
          <button onClick={clearCanvas} className="btn">Clear</button>
          <button onClick={saveAsImage} className="btn">Save</button>
        </div>
      </nav>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-4 p-4 bg-white shadow">
        <label className="flex items-center gap-2">
          🎨 Color
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
        <label className="flex items-center gap-2">
          🖌️ Brush
          <input
            type="range"
            min="1"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
          />
        </label>
        {['brush', 'eraser', 'rectangle', 'circle'].map((t) => (
          <button
            key={t}
            className={`btn ${tool === t ? 'bg-blue-500 text-white' : ''}`}
            onClick={() => setTool(t as any)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="border mt-2 mx-auto block bg-white cursor-crosshair"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />

      {/* Footer */}
      <footer className="text-center py-4 text-sm text-gray-600">
        © {new Date().getFullYear()} SketchFlow | Built with Next.js + Tailwind + TypeScript
      </footer>

      {/* Tailwind Button Styling */}
      <style jsx>{`
        .btn {
          @apply px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-200 transition;
        }
      `}</style>
    </div>
  );
}
