/**
 * canvas/home-stats.js
 *
 * p5.js sketches for the Home stats section:
 *   - Donut chart of nutritional balance
 *   - Cuisine bubbles
 *   - Cost-per-tupper line chart (last weeks)
 *
 * All three read from state and re-render on subscribe(). Uses instance mode
 * so we don't pollute the global window scope.
 *
 * Colors are inlined here (p5 can't read CSS vars) but match the
 * Mesa Mediterránea palette defined in tokens.css.
 */

import p5 from 'p5';
import { subscribe, getWeekStats, getCostHistory } from '../state.js';

// ── Palette (must mirror tokens.css) ─────────────────────────────────────
const INK         = '#2A241B';
const INK_2       = '#5E5240';
const INK_3       = '#8E8267';
const PAPER       = '#F0E6CF';
const SURFACE     = '#FBF4DF';
const BORDER_SOFT = '#E4D6B0';

const MARINA      = '#3E5FA8';
const TOMATE      = '#D24A33';
const MOSTAZA     = '#D7B23F';
const OLIVA       = '#6F8B3D';
const LAVANDA     = '#8A6BA5';

const CAT_COLORS = {
  proteina:      TOMATE,
  carbohidratos: MOSTAZA,
  verdura:       OLIVA,
  mixto:         LAVANDA,
};
const EMPTY_COLOR = BORDER_SOFT;

const CUISINE_COLORS = {
  mediterraneo: MARINA,
  italiano:     TOMATE,
  asiatico:     '#C26A2A',
  nacional:     OLIVA,
  internacional: LAVANDA,
};

/**
 * Donut chart of nutritional categories — Mesa Mediterránea polish.
 *
 * Visual choices:
 *  - Slices drawn as wide stroked arcs (not PIE) so the line stays clean
 *    even if a category is empty.
 *  - Center number in Fraunces serif, "tuppers" caption in DM Mono.
 *  - Soft warm shadow under the ring for depth (drawn via blur + offset).
 */
export function startNutritionDonut(parentEl) {
  let unsubscribe = null;
  let phase = 0;     // 0→1 entrance animation

  const sketch = (p) => {
    p.setup = () => {
      const size = Math.max(120, parentEl.clientWidth || 160);
      p.createCanvas(size, size);
      p.angleMode(p.RADIANS);
      phase = 0;
    };

    p.draw = () => {
      const W = p.width;
      const H = p.height;
      p.clear();
      // gentle ease-out
      phase = Math.min(1, phase + 0.03);
      const t = 1 - Math.pow(1 - phase, 3);

      const stats = getWeekStats();
      const counts = stats.nutricional;
      const total = (counts.proteina + counts.carbohidratos + counts.verdura + counts.mixto) || 1;

      const cx = W / 2;
      const cy = H / 2;
      // Inset so the stroked ring doesn't get clipped by the canvas edge
      const PADDING = 6;
      const rOuter = Math.min(W, H) / 2 - PADDING;
      const ringW  = Math.max(14, rOuter * 0.28);
      const rMid   = rOuter - ringW / 2;

      // Soft warm shadow under the ring (Mesa Mediterránea palette)
      p.drawingContext.save();
      p.drawingContext.shadowColor = 'rgba(42, 36, 27, 0.10)';
      p.drawingContext.shadowBlur  = 14;
      p.drawingContext.shadowOffsetY = 3;
      p.noFill();
      p.strokeWeight(ringW);
      p.stroke(EMPTY_COLOR);
      p.strokeCap(p.ROUND);
      p.arc(cx, cy, rMid * 2, rMid * 2, 0, p.TWO_PI);
      p.drawingContext.restore();

      // Painted ring slices
      const order = ['proteina', 'carbohidratos', 'verdura', 'mixto'];
      let start = -p.HALF_PI;
      p.noFill();
      p.strokeWeight(ringW);
      p.strokeCap(p.BUTT);
      order.forEach((cat) => {
        const v = counts[cat] || 0;
        if (v <= 0) return;
        const sweep = (v / total) * p.TWO_PI * t;
        if (sweep <= 0.001) { start += sweep; return; }
        p.stroke(CAT_COLORS[cat]);
        p.arc(cx, cy, rMid * 2, rMid * 2, start, start + sweep);
        start += sweep;
      });

      // Number in center (Fraunces) — same baseline rules as design system
      p.noStroke();
      p.fill(INK);
      p.textAlign(p.CENTER, p.CENTER);
      p.textFont('Fraunces');
      p.textStyle(p.BOLD);
      p.textSize(rMid * 0.65);
      p.text(String(stats.total), cx, cy - rMid * 0.06);

      // "tuppers" caption in mono
      p.textFont('DM Mono');
      p.textStyle(p.NORMAL);
      p.textSize(Math.max(9, rMid * 0.18));
      p.fill(INK_3);
      p.text('TUPPERS', cx, cy + rMid * 0.38);

      if (phase >= 1) p.noLoop();
    };

    p.windowResized = () => {
      const size = Math.max(120, parentEl.clientWidth || 160);
      p.resizeCanvas(size, size);
      phase = 0;
      p.loop();
    };
  };

  const instance = new p5(sketch, parentEl);
  unsubscribe = subscribe(() => {
    phase = 0;
    instance.loop();
  });

  // Cleanup function
  return () => {
    if (unsubscribe) unsubscribe();
    instance.remove();
  };
}

/**
 * Floating cuisine bubbles — one per cuisine type, size = frequency.
 *
 * Visual choices:
 *  - Orbits and radii are computed so bubbles NEVER touch the canvas edges
 *    (max float offset is factored in too — no clipping).
 *  - Each bubble gets a soft warm drop shadow (Mesa Mediterránea ink-line).
 *  - Inner highlight (cream) gives a slight gouache feel.
 */
export function startCuisineBubbles(parentEl) {
  let unsubscribe = null;
  let frame = 0;

  const sketch = (p) => {
    let bubbles = [];

    function rebuild() {
      const stats = getWeekStats();
      const W = p.width;
      const H = p.height;
      const entries = Object.entries(stats.cocinas);
      const total = entries.reduce((a, [, v]) => a + v, 0) || 1;

      // Safety margins so bubbles never get clipped by the card border
      const PADDING = 8;
      const FLOAT_OFFSET = 4; // matches the sin/cos float in draw()
      const n = entries.length;

      // Compute a max radius that fits visually for the number of bubbles
      const maxR = Math.min(34, (W - PADDING * 2) / (n === 1 ? 2 : 3));
      const minR = 18;

      bubbles = entries.map(([cocina, count], i) => {
        const ratio = total > 0 ? count / total : 0;
        const r = Math.max(minR, Math.min(maxR, minR + ratio * (maxR - minR) * 2));

        // Distance from center, clamped so the bubble + float wobble fit inside
        const maxOrbit = (W / 2) - r - PADDING - FLOAT_OFFSET;
        const desiredOrbit = (W * 0.22);
        const orbit = n === 1 ? 0 : Math.min(maxOrbit, desiredOrbit);

        // Start at the top, rotate cleanly
        const angle = (i / Math.max(n, 1)) * p.TWO_PI - p.HALF_PI;

        return {
          cocina,
          count,
          color: CUISINE_COLORS[cocina] || INK_3,
          baseX: W / 2 + Math.cos(angle) * orbit,
          baseY: H / 2 + Math.sin(angle) * orbit,
          r,
          phase: Math.random() * p.TWO_PI,
        };
      });
    }

    p.setup = () => {
      const size = Math.max(120, parentEl.clientWidth || 160);
      p.createCanvas(size, size);
      rebuild();
    };

    p.draw = () => {
      p.clear();
      frame += 1;
      // Single noStroke()/textAlign() pass for each bubble; we toggle stroke
      // only for the painted hairline.
      bubbles.forEach((b) => {
        const offsetY = Math.sin(frame / 50 + b.phase) * 3;
        const offsetX = Math.cos(frame / 70 + b.phase) * 2;
        const cx = b.baseX + offsetX;
        const cy = b.baseY + offsetY;

        // Warm drop shadow under each bubble
        p.drawingContext.save();
        p.drawingContext.shadowColor = 'rgba(42, 36, 27, 0.18)';
        p.drawingContext.shadowBlur  = 10;
        p.drawingContext.shadowOffsetY = 3;
        p.noStroke();
        p.fill(b.color);
        p.circle(cx, cy, b.r * 2);
        p.drawingContext.restore();

        // Subtle cream highlight (top-left) — gives a hand-painted feel
        p.noStroke();
        p.fill('rgba(251, 244, 223, 0.18)');
        p.circle(cx - b.r * 0.28, cy - b.r * 0.32, b.r * 0.9);

        // Ink hairline outline
        p.noFill();
        p.stroke('rgba(42, 36, 27, 0.22)');
        p.strokeWeight(1);
        p.circle(cx, cy, b.r * 2);

        // Count number in cream
        p.noStroke();
        p.fill('#FBF4DF');
        p.textAlign(p.CENTER, p.CENTER);
        p.textFont('Fraunces');
        p.textStyle(p.BOLD);
        p.textSize(b.r * 0.85);
        p.text(String(b.count), cx, cy);
      });
    };

    p.windowResized = () => {
      const size = Math.max(120, parentEl.clientWidth || 160);
      p.resizeCanvas(size, size);
      rebuild();
    };

    p.__rebuild = rebuild;
  };

  const instance = new p5(sketch, parentEl);
  unsubscribe = subscribe(() => {
    if (instance.__rebuild) instance.__rebuild();
  });

  return () => {
    if (unsubscribe) unsubscribe();
    instance.remove();
  };
}

/**
 * Cost-per-tupper line chart — last weeks + current week (highlighted).
 * Layout is wide (2:1 aspect ratio). Marina line, tomate accent on the
 * current week with a glow halo and value label.
 */
export function startCostLine(parentEl) {
  let unsubscribe = null;
  let phase = 0;     // 0→1 entrance animation

  const sketch = (p) => {
    p.setup = () => {
      const w = parentEl.clientWidth || 320;
      const h = Math.round(w * 0.5);
      p.createCanvas(w, h);
      phase = 0;
    };

    p.draw = () => {
      const W = p.width;
      const H = p.height;
      p.clear();
      phase = Math.min(1, phase + 0.025);
      const t = 1 - Math.pow(1 - phase, 3);

      const history = getCostHistory();
      if (!history.length) { p.noLoop(); return; }

      const padding = { top: 22, right: 14, bottom: 26, left: 36 };
      const innerW = W - padding.left - padding.right;
      const innerH = H - padding.top - padding.bottom;

      const values = history.map((h) => h.avgCost || 0);
      const peakRaw = Math.max(...values, 1);
      const maxVal = Math.max(peakRaw * 1.18, 1);
      const minVal = 0;

      // Position mapping
      const xs = history.map((_, i) =>
        history.length === 1
          ? padding.left + innerW / 2
          : padding.left + (i / (history.length - 1)) * innerW
      );
      const ys = history.map((h) =>
        padding.top + (1 - ((h.avgCost || 0) - minVal) / (maxVal - minVal)) * innerH
      );

      // ── Reference grid lines ─────────────────────────────────
      const numLines = 3;
      p.strokeWeight(1);
      p.stroke(BORDER_SOFT);
      p.drawingContext.setLineDash([3, 4]);
      for (let i = 0; i <= numLines; i++) {
        const y = padding.top + (i / numLines) * innerH;
        p.line(padding.left, y, W - padding.right, y);
      }
      p.drawingContext.setLineDash([]);

      // ── Y axis labels (mono, ink-3) ──────────────────────────
      p.noStroke();
      p.fill(INK_3);
      p.textFont('DM Mono');
      p.textSize(9);
      p.textAlign(p.RIGHT, p.CENTER);
      for (let i = 0; i <= numLines; i++) {
        const v = maxVal - (i / numLines) * (maxVal - minVal);
        const y = padding.top + (i / numLines) * innerH;
        const lbl = v >= 10
          ? Math.round(v) + '€'
          : v.toFixed(1).replace('.', ',') + '€';
        p.text(lbl, padding.left - 6, y);
      }

      // ── X axis labels (week number) ─────────────────────────
      p.textAlign(p.CENTER, p.TOP);
      history.forEach((h, i) => {
        const wkMatch = (h.week || '').match(/W(\d+)/);
        const lbl = wkMatch ? `W${wkMatch[1]}` : h.week;
        const isCurrent = !!h.current;
        p.fill(isCurrent ? INK_2 : INK_3);
        if (isCurrent) p.textStyle(p.BOLD);
        p.text(lbl, xs[i], H - padding.bottom + 6);
        if (isCurrent) p.textStyle(p.NORMAL);
      });

      // ── Line ────────────────────────────────────────────────
      // Reveal proportionally to phase
      const visiblePoints = Math.max(1, Math.ceil(history.length * t));
      const drawCount = Math.min(visiblePoints, history.length);

      p.noFill();
      p.stroke(MARINA);
      p.strokeWeight(2.4);
      p.strokeJoin(p.ROUND);
      p.strokeCap(p.ROUND);
      p.beginShape();
      if (drawCount === 1) {
        // Single point: just draw a tiny segment so the user sees something
        p.curveVertex(xs[0] - 1, ys[0]);
        p.curveVertex(xs[0],     ys[0]);
        p.curveVertex(xs[0] + 1, ys[0]);
      } else {
        // curveVertex needs duplicated endpoints for nice curves
        p.curveVertex(xs[0], ys[0]);
        for (let i = 0; i < drawCount; i++) {
          p.curveVertex(xs[i], ys[i]);
        }
        const lastIdx = drawCount - 1;
        p.curveVertex(xs[lastIdx], ys[lastIdx]);
      }
      p.endShape();

      // ── Points ──────────────────────────────────────────────
      p.noStroke();
      for (let i = 0; i < drawCount; i++) {
        const isCurrent = !!history[i].current;

        if (isCurrent) {
          // Soft tomato halo behind the current week
          const haloPulse = 1 + Math.sin(p.frameCount * 0.06) * 0.08;
          p.fill('rgba(210, 74, 51, 0.18)');
          p.circle(xs[i], ys[i], 18 * haloPulse);
        }
        // Outer dot
        p.fill(isCurrent ? TOMATE : MARINA);
        p.circle(xs[i], ys[i], isCurrent ? 10 : 6);
        // Inner highlight (paper)
        p.fill(PAPER);
        p.circle(xs[i], ys[i], isCurrent ? 5 : 2.5);
      }

      // ── Current value label on top of the last point ────────
      const last = history[history.length - 1];
      if (last && drawCount === history.length && last.avgCost > 0) {
        const lastX = xs[xs.length - 1];
        const lastY = ys[ys.length - 1];
        p.fill(INK);
        p.textFont('DM Sans');
        p.textStyle(p.BOLD);
        p.textSize(12);

        const labelText = last.avgCost.toFixed(2).replace('.', ',') + '€';
        const labelW = p.textWidth(labelText) + 12;
        const labelH = 18;
        let labelX = lastX - labelW / 2;
        const labelY = Math.max(padding.top + 2, lastY - 22);

        // Keep label inside the canvas horizontally
        if (labelX < padding.left) labelX = padding.left;
        if (labelX + labelW > W - padding.right) labelX = W - padding.right - labelW;

        // Pill behind label
        p.fill('rgba(251, 244, 223, 0.95)');
        p.stroke(TOMATE);
        p.strokeWeight(1.2);
        p.rect(labelX, labelY - labelH / 2, labelW, labelH, 8, 6, 7, 5);

        p.noStroke();
        p.fill(TOMATE);
        p.textAlign(p.CENTER, p.CENTER);
        p.text(labelText, labelX + labelW / 2, labelY);
        p.textStyle(p.NORMAL);
      }

      if (phase >= 1 && drawCount === history.length) {
        // Don't fully noLoop because of the gentle halo pulse on current pt.
        // Slow down by skipping draws.
        if (p.frameCount % 4 !== 0) p.noLoop = p.noLoop;
      }
    };

    p.windowResized = () => {
      const w = parentEl.clientWidth || 320;
      const h = Math.round(w * 0.5);
      p.resizeCanvas(w, h);
      phase = 0;
      p.loop();
    };
  };

  const instance = new p5(sketch, parentEl);
  unsubscribe = subscribe(() => {
    phase = 0;
    instance.loop();
  });

  return () => {
    if (unsubscribe) unsubscribe();
    instance.remove();
  };
}
