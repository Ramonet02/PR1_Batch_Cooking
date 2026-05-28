/**
 * components/prop.js
 *
 * Decorative background prop — uses images from `public/props/`. Renders an
 * `<img>` that's positioned absolutely behind the scroll content. The parent
 * (.device-scroll) is position:relative and content elements get z-index:1
 * via screens.css, so props always sit underneath the UI.
 *
 * Usage (inside a screen's render):
 *   scroll.appendChild(Prop({
 *     src: 'persona_preparando_fiambrera.png',
 *     size: 'md',
 *     style: { top: '60px', right: '-24px' },
 *   }));
 *
 * Sizes: 'sm' | 'md' | 'lg' (max-width: 100 / 140 / 200 px).
 * Tilt: optional rotation in degrees (number) — small angles add personality.
 */
export function Prop({ src, size = 'md', style = {}, tilt = 0 } = {}) {
  const img = document.createElement('img');
  img.className = `prop prop-${size}`;
  img.src = `/props/${src}`;
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  img.draggable = false;
  if (tilt) img.style.transform = `rotate(${tilt}deg)`;
  Object.assign(img.style, style);
  return img;
}
