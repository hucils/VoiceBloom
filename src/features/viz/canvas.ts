import { useCallback, useEffect, useState } from 'react';

/** Chart colours, read from the CSS design tokens so both themes stay in sync. */
export interface ChartColors {
  trace: string;
  band: string;
  bandEdge: string;
  grid: string;
  label: string;
  cursor: string;
  wave: string;
  wavePlayed: string;
  surface: string;
}

const TOKENS: Record<keyof ChartColors, string> = {
  trace: '--vb-chart-trace',
  band: '--vb-chart-band',
  bandEdge: '--vb-chart-band-edge',
  grid: '--vb-chart-grid',
  label: '--vb-chart-label',
  cursor: '--vb-chart-cursor',
  wave: '--vb-chart-wave',
  wavePlayed: '--vb-chart-wave-played',
  surface: '--vb-surface',
};

export function readChartColors(): ChartColors {
  const style = getComputedStyle(document.documentElement);
  const entries = Object.entries(TOKENS).map(([key, token]) => [key, style.getPropertyValue(token).trim() || '#8d84a0']);
  return Object.fromEntries(entries) as unknown as ChartColors;
}

/** Re-reads the colours when the theme class on <html> changes. */
export function useChartColors(): ChartColors {
  const [colors, setColors] = useState(readChartColors);
  useEffect(() => {
    const observer = new MutationObserver(() => setColors(readChartColors()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return colors;
}

/** Tracks an element's width with ResizeObserver; returns a callback ref. */
export function useElementWidth<T extends HTMLElement>(): [(node: T | null) => void, number] {
  const [node, setNode] = useState<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!node) return;
    // ResizeObserver reports the initial size as soon as observation starts.
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  const ref = useCallback((element: T | null) => setNode(element), []);
  return [ref, width];
}

/**
 * Sizes a canvas for the device pixel ratio and returns a cleared context in
 * CSS-pixel coordinates, or null where canvas is unavailable (e.g. tests).
 */
export function prepareCanvas(canvas: HTMLCanvasElement, width: number, height: number): CanvasRenderingContext2D | null {
  if (width <= 0 || height <= 0) return null;
  const ratio = window.devicePixelRatio || 1;
  const pixelWidth = Math.round(width * ratio);
  const pixelHeight = Math.round(height * ratio);
  if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
  if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  return context;
}

export const CHART_FONT = '11px "Inter Variable", ui-sans-serif, system-ui, sans-serif';
