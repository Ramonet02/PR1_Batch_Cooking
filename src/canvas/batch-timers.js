/**
 * canvas/batch-timers.js
 *
 * p5.js sketch for a single circular cooking timer.
 *
 *   Background ring         → bg-alt
 *   Progress arc (shrinks)  → primary  when remaining > 30%
 *                             warning  when remaining ≤ 30%
 *                             error + pulse  when completed
 *   Center                  → emoji + mm:ss + label
 *
 * One instance per timer card. The sketch reads the timer object live each
 * frame via getTimerRemaining(), so the parent screen doesn't need to push
 * tick updates — p5's draw loop is the tick.
 *
 * Returns a cleanup function that removes the canvas.
 */

import p5 from 'p5';
import { getTimerRemaining } from '../state.js';

const COLOR_RING_BG    = '#E5DDD3';
const COLOR_RING_RUN   = '#4A7856';
const COLOR_RING_WARN  = '#E8A838';
const COLOR_RING_DONE  = '#C0524A';
const COLOR_TEXT       = '#1A1714';
const COLOR_TEXT_SOFT  = '#6B6560';

/**
 * Start the timer canvas inside `parentEl` for a given timer object.
 * @param {HTMLElement} parentEl
 * @param {() => object} getTimer — function returning the live timer object
 *   (we pass a getter so the canvas always sees the current state, even if
 *    the array reference changes).
 * @returns {() => void} cleanup
 */
export function startTimerCanvas(parentEl, getTimer) {
  const sketch = (p) => {
    let pulse = 0;

    p.setup = () => {
      const size = parentEl.clientWidth || 120;
      p.createCanvas(size, size);
      p.angleMode(p.RADIANS);
      p.frameRate(30);
      p.textFont('DM Sans');
    };

    p.draw = () => {
      const t = getTimer();
      if (!t) { p.clear(); return; }

      const W = p.width;
      const H = p.height;
      p.clear();

      const remaining = getTimerRemaining(t);
      const ratio = t.totalSec > 0 ? remaining / t.totalSec : 0;
      const cx = W / 2;
      const cy = H / 2;

      // Outer ring sizing
      const stroke = Math.max(6, Math.floor(W * 0.07));
      const rOuter = (Math.min(W, H) - stroke) / 2 - 4;

      // Pulse when completed
      let pulseScale = 1;
      if (t.completed) {
        pulse += 0.08;
        pulseScale = 1 + Math.sin(pulse) * 0.035;
      } else {
        pulse = 0;
      }

      // Background ring
      p.noFill();
      p.stroke(COLOR_RING_BG);
      p.strokeWeight(stroke);
      p.strokeCap(p.ROUND);
      p.circle(cx, cy, rOuter * 2 * pulseScale);

      // Progress arc
      let arcColor = COLOR_RING_RUN;
      if (t.completed) arcColor = COLOR_RING_DONE;
      else if (ratio <= 0.3) arcColor = COLOR_RING_WARN;

      if (ratio > 0 && !t.completed) {
        p.stroke(arcColor);
        const start = -p.HALF_PI;
        const sweep = ratio * p.TWO_PI;
        p.arc(cx, cy, rOuter * 2 * pulseScale, rOuter * 2 * pulseScale, start, start + sweep);
      } else if (t.completed) {
        // Full pulsing ring when done
        p.stroke(arcColor);
        p.circle(cx, cy, rOuter * 2 * pulseScale);
      }

      // Center: emoji
      p.noStroke();
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(rOuter * 0.55);
      p.text(t.emoji || '⏱', cx, cy - rOuter * 0.25);

      // Time
      p.fill(t.completed ? COLOR_RING_DONE : COLOR_TEXT);
      p.textStyle(p.BOLD);
      p.textSize(rOuter * 0.34);
      p.text(formatTime(remaining), cx, cy + rOuter * 0.25);
    };

    p.windowResized = () => {
      const size = parentEl.clientWidth || 120;
      p.resizeCanvas(size, size);
    };
  };

  const instance = new p5(sketch, parentEl);
  return () => instance.remove();
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
