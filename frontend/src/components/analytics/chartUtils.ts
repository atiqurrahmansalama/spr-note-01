/**
 * Mathematical and SVG Path Utilities for Recitation Progress Trends Chart
 */

export const computeNiceYAxis = (maxVal: number): { max: number; ticks: number[] } => {
  if (maxVal <= 0) return { max: 4, ticks: [4, 3, 2, 1, 0] };
  if (maxVal <= 3.5) return { max: 4, ticks: [4, 3, 2, 1, 0] };

  // Tight ~10% headroom above maxVal to prevent excessive empty space (e.g. max 50 shows 55)
  const niceMax = Math.max(4, Math.ceil(maxVal * 1.1));
  const t3 = Math.round(niceMax * 0.75);
  const t2 = Math.round(niceMax * 0.5);
  const t1 = Math.round(niceMax * 0.25);

  const ticks = [niceMax, t3, t2, t1, 0];
  return { max: niceMax, ticks };
};

export const formatTickValue = (val: number): string => {
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}K`;
  return String(val);
};

// Splits dateStr into month (top) and day (bottom) for 2-line staggered rendering
export const parseDateParts = (dateStr: string, label: string): { month: string; day: string } => {
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const month = d.toLocaleDateString("en-US", { month: "short" });
      const day = String(d.getDate());
      return { month, day };
    }
  } catch {}
  const split = label.trim().split(" ");
  if (split.length >= 2) return { month: split[0], day: split[1] };
  return { month: "", day: label };
};

// Generates an ultra-smooth Catmull-Rom spline path with monotonic clamping to strictly prevent underflow/overflow
export const generateSmoothPath = (
  pts: Array<{ x: number; y: number }>,
  minY: number = 0,
  maxY: number = 220
): string => {
  if (pts.length === 0) return "";
  const clampY = (y: number) => Math.min(maxY, Math.max(minY, y));

  if (pts.length === 1) {
    const y0 = clampY(pts[0].y);
    return `M ${pts[0].x.toFixed(1)},${y0.toFixed(1)} L ${(pts[0].x + 1).toFixed(1)},${y0.toFixed(1)}`;
  }

  let d = `M ${pts[0].x.toFixed(1)},${clampY(pts[0].y).toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;

    const p1y = clampY(p1.y);
    const p2y = clampY(p2.y);

    // If both adjacent points are at the baseline, draw a direct flat line
    if (Math.abs(p1y - maxY) < 0.1 && Math.abs(p2y - maxY) < 0.1) {
      d += ` L ${p2.x.toFixed(1)},${maxY.toFixed(1)}`;
      continue;
    }

    let cp1x = p1.x + (p2.x - p0.x) / 6;
    let cp1y = p1.y + (p2.y - p0.y) / 6;
    let cp2x = p2.x - (p3.x - p1.x) / 6;
    let cp2y = p2.y - (p3.y - p1.y) / 6;

    // Strict clamping so control points NEVER overshoot above minY or undershoot below maxY
    cp1y = clampY(cp1y);
    cp2y = clampY(cp2y);

    // If a point is on the baseline, flatten the approach tangent so it never dips below 0
    if (Math.abs(p1y - maxY) < 0.5) cp1y = maxY;
    if (Math.abs(p2y - maxY) < 0.5) cp2y = maxY;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
};

export const extendCoordsToEdges = (
  coords: Array<{ x: number; y: number }>,
  canvasW: number
): Array<{ x: number; y: number }> => {
  if (coords.length === 0 || canvasW <= 0) return [];
  if (coords.length === 1) {
    return [
      { x: 0, y: coords[0].y },
      { x: canvasW / 2, y: coords[0].y },
      { x: canvasW, y: coords[0].y },
    ];
  }

  const first = coords[0];
  const last = coords[coords.length - 1];

  const prepend = first.x > 0 ? [{ x: 0, y: first.y }] : [];
  const append = last.x < canvasW ? [{ x: canvasW, y: last.y }] : [];

  return [...prepend, ...coords, ...append];
};

export const generateAreaPath = (
  pts: Array<{ x: number; y: number }>,
  bottomY: number,
  minY: number = 0,
  canvasW?: number
): string => {
  if (pts.length === 0) return "";
  const extendedPts = canvasW ? extendCoordsToEdges(pts, canvasW) : pts;
  const linePath = generateSmoothPath(extendedPts, minY, bottomY);
  const firstX = extendedPts[0].x.toFixed(1);
  const lastX = extendedPts[extendedPts.length - 1].x.toFixed(1);
  return `${linePath} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
};
