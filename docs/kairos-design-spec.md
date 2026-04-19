# KAIROS.AI — Design System & Developer Specification
> Provide this entire document to Cursor (or any AI coding assistant) as context when building Kairos.ai.

---

## 1. BRAND IDENTITY

**Name:** Kairos.ai  
**Tagline:** Decide. Act. Accelerate.  
**Domain:** www.kairos.ai  
**Voice:** Decisive, precise, urgent but calm. Never fluffy. Short sentences. Active verbs.  
**Category:** Decision Intelligence / AI SaaS  

---

## 2. LOGO SPECIFICATION

The Kairos logo is a stylized double-chevron "K" mark.

```
SVG Logo (copy exactly):
<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M6 4L18 16L6 28" stroke="#1B9FE0" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M14 4L26 16L14 28" stroke="rgba(27,159,224,0.45)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

**Wordmark:** "KAIROS" in Syne 800, letter-spacing: 0.06em, all caps.  
**Full lockup:** Logo mark + wordmark, always side by side, never stacked unless icon-only context.  
**Minimum size:** 24px height for mark, 18px for wordmark.  
**Clear space:** Equal to the cap-height of the wordmark on all sides.

---

## 3. COLOR SYSTEM

All colors must be defined as CSS custom properties and referenced consistently.

```css
:root {
  /* Primary */
  --k-blue:         #1B9FE0;   /* Primary brand blue — buttons, links, accents */
  --k-blue-bright:  #38C5FF;   /* Hover states, glows, highlights */
  --k-blue-dim:     #0D6EA3;   /* Pressed states, deep backgrounds */
  --k-blue-ghost:   rgba(27, 159, 224, 0.12);  /* Card backgrounds on dark */
  --k-blue-border:  rgba(27, 159, 224, 0.20);  /* Borders, dividers */
  
  /* Accent */
  --k-orange:       #E87A2A;   /* Urgent/alert state ONLY. Sparingly. */
  --k-green:        #6DCF7A;   /* Success / approved states */
  
  /* Neutral */
  --k-white:        #F0F4FF;   /* Primary text */
  --k-silver:       #A8B8CC;   /* Secondary / body text */
  --k-muted:        rgba(168, 184, 204, 0.5);  /* Placeholder, disabled */
  
  /* Backgrounds */
  --k-bg:           #040810;   /* Page background — near black with blue tint */
  --k-surface:      #060E1E;   /* Card surface */
  --k-surface-2:    #0A1628;   /* Elevated card (nav bars, modals) */
  --k-overlay:      rgba(10, 22, 44, 0.7);  /* Glassmorphism cards */
}
```

**Rules:**  
- Dark backgrounds ONLY. Never use white or light backgrounds.  
- `--k-orange` is reserved exclusively for urgency indicators (alerts, deadlines). Never decorative.  
- Blue is the only accent color for interactive elements.  
- Text on dark backgrounds: `--k-white` for headings, `--k-silver` for body copy.

---

## 4. TYPOGRAPHY

### Font Stack
```css
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

--font-display: 'Syne', sans-serif;   /* All headings, labels, buttons, numbers */
--font-body:    'DM Sans', sans-serif; /* All body text, descriptions, UI copy */
```

### Type Scale
| Role              | Font     | Size         | Weight | Letter-spacing | Notes                        |
|-------------------|----------|--------------|--------|----------------|------------------------------|
| Hero H1           | Syne     | clamp(52px, 8vw, 110px) | 800 | -0.03em | Line-height: 0.9 |
| Section H2        | Syne     | clamp(32px, 5vw, 64px)  | 800 | -0.03em | Line-height: 1.0 |
| Card Title        | Syne     | 20px         | 700    | -0.01em        | Line-height: 1.2             |
| Eyebrow / Label   | Syne     | 11px         | 600    | 0.22em         | ALL CAPS, color: --k-blue    |
| Body Large        | DM Sans  | 17–18px      | 300    | 0              | Line-height: 1.7             |
| Body              | DM Sans  | 15–16px      | 400    | 0              | Line-height: 1.7             |
| Body Small        | DM Sans  | 13–14px      | 400    | 0              | Line-height: 1.6             |
| Caption           | DM Sans  | 11–12px      | 400    | 0.08em         | color: --k-silver            |
| Stat / Number     | Syne     | clamp(36px, 5vw, 64px) | 800 | -0.03em | Gradient fill    |
| Badge / Chip      | Syne     | 9–10px       | 700    | 0.15em         | ALL CAPS                     |
| Button            | Syne     | 13–14px      | 700    | 0.06em         | ALL CAPS                     |
| Nav Link          | DM Sans  | 13px         | 400    | 0.08em         | ALL CAPS, --k-silver         |

### Gradient Text (for hero emphasis)
```css
.gradient-text {
  background: linear-gradient(105deg, #38C5FF 0%, #86E4FF 50%, #1B9FE0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

---

## 5. SPACING SYSTEM

Uses an 8px base grid. All spacing values must be multiples of 8.

```
4px   — micro gaps (icon to label, badge padding)
8px   — small (within components)
16px  — component internal padding small
24px  — component internal padding standard
32px  — gap between related elements
40px  — section padding horizontal (container)
48px  — card padding
64px  — between major sections within a view
80px  — gap between subsections
120px — major section vertical padding (top + bottom)
```

---

## 6. COMPONENT LIBRARY

### Buttons

```css
/* Primary Button */
.btn-primary {
  padding: 16px 36px;
  border-radius: 4px;                          /* Sharp, not rounded */
  background: var(--k-blue);
  color: #ffffff;
  font-family: var(--font-display);
  font-size: 14px; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
  border: none; cursor: pointer;
  box-shadow: 0 0 40px rgba(27, 159, 224, 0.4);
  transition: box-shadow 0.2s, transform 0.2s, background 0.2s;
}
.btn-primary:hover {
  background: var(--k-blue-bright);
  box-shadow: 0 0 60px rgba(56, 197, 255, 0.6);
  transform: translateY(-2px);
}
.btn-primary:active { transform: translateY(0); }

/* Ghost Button */
.btn-ghost {
  padding: 16px 36px; border-radius: 4px;
  background: transparent;
  border: 1px solid rgba(168, 184, 204, 0.3);
  color: var(--k-silver);
  font-family: var(--font-display);
  font-size: 14px; font-weight: 600;
  letter-spacing: 0.06em; text-transform: uppercase;
}
.btn-ghost:hover {
  border-color: var(--k-blue);
  color: var(--k-blue-bright);
}

/* Outline Blue */
.btn-outline {
  padding: 10px 24px; border-radius: 4px;
  background: transparent;
  border: 1px solid var(--k-blue);
  color: var(--k-blue-bright);
  font-family: var(--font-display);
  font-size: 13px; font-weight: 600;
  letter-spacing: 0.06em; text-transform: uppercase;
}
.btn-outline:hover {
  background: rgba(27, 159, 224, 0.12);
  box-shadow: 0 0 20px rgba(27, 159, 224, 0.3);
}
```

### Cards

```css
.card {
  background: var(--k-overlay);       /* rgba(10, 22, 44, 0.7) */
  backdrop-filter: blur(20px);
  border: 1px solid var(--k-blue-border);
  border-radius: 2px;                  /* Near-square corners — intentional */
  padding: 48px 40px;
  position: relative; overflow: hidden;
  transition: background 0.3s;
}
.card:hover { background: rgba(10, 22, 44, 0.95); }

/* Top highlight line on hover */
.card::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(to right, transparent, var(--k-blue), transparent);
  opacity: 0; transition: opacity 0.3s;
}
.card:hover::before { opacity: 1; }
```

### Badges / Status Chips

```css
.badge { 
  font-family: var(--font-display); font-size: 10px; font-weight: 700;
  padding: 4px 10px; border-radius: 3px;
  letter-spacing: 0.06em; text-transform: uppercase;
}
.badge-urgent  { background: rgba(232,122,42,0.15);  color: #E87A2A; border: 1px solid rgba(232,122,42,0.3); }
.badge-active  { background: rgba(27,159,224,0.12);  color: #38C5FF; border: 1px solid rgba(27,159,224,0.3); }
.badge-review  { background: rgba(109,207,122,0.10); color: #6DCF7A; border: 1px solid rgba(109,207,122,0.25); }
.badge-neutral { background: rgba(168,184,204,0.10); color: #A8B8CC; border: 1px solid rgba(168,184,204,0.2); }
```

### Dividers / Section Labels

```css
.section-label {
  font-family: var(--font-display);
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--k-blue);
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 16px;
}
.section-label::after {
  content: ''; display: block;
  width: 24px; height: 1px; background: var(--k-blue);
}
```

---

## 7. CUSTOM CURSOR

**Every page and the app must use this custom cursor:**

```javascript
// HTML
// <div id="cursor-dot"></div>
// <div id="cursor-ring"></div>
// Add `cursor: none` to `body`

const dot  = document.getElementById('cursor-dot');
const ring = document.getElementById('cursor-ring');
let mx = 0, my = 0, rx = 0, ry = 0;

document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

function animCursor() {
  dot.style.left  = mx + 'px';
  dot.style.top   = my + 'px';
  rx += (mx - rx) * 0.12;
  ry += (my - ry) * 0.12;
  ring.style.left = rx + 'px';
  ring.style.top  = ry + 'px';
  requestAnimationFrame(animCursor);
}
animCursor();
```

```css
body { cursor: none; }

#cursor-dot {
  position: fixed; z-index: 9999;
  width: 8px; height: 8px; border-radius: 50%;
  background: #38C5FF;
  pointer-events: none;
  transform: translate(-50%, -50%);
  transition: transform 0.08s ease;
  box-shadow: 0 0 12px #38C5FF;
}

#cursor-ring {
  position: fixed; z-index: 9998;
  width: 36px; height: 36px; border-radius: 50%;
  border: 1.5px solid rgba(56, 197, 255, 0.5);
  pointer-events: none;
  transform: translate(-50%, -50%);
  transition: width 0.2s, height 0.2s, border-color 0.2s;
}

/* Expand on interactive elements */
a:hover ~ #cursor-ring,
button:hover ~ #cursor-ring {
  width: 56px; height: 56px;
  border-color: #38C5FF;
}
```

**React implementation:**
```jsx
import { useEffect, useRef } from 'react';

export function KairosCursor() {
  const dot  = useRef(null);
  const ring = useRef(null);
  const pos  = useRef({ rx: 0, ry: 0 });
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const move = e => { mouse.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('mousemove', move);

    let raf;
    function tick() {
      pos.current.rx += (mouse.current.x - pos.current.rx) * 0.12;
      pos.current.ry += (mouse.current.y - pos.current.ry) * 0.12;
      if (dot.current) {
        dot.current.style.left  = mouse.current.x + 'px';
        dot.current.style.top   = mouse.current.y + 'px';
      }
      if (ring.current) {
        ring.current.style.left = pos.current.rx + 'px';
        ring.current.style.top  = pos.current.ry + 'px';
      }
      raf = requestAnimationFrame(tick);
    }
    tick();
    return () => { window.removeEventListener('mousemove', move); cancelAnimationFrame(raf); };
  }, []);

  return (
    <>
      <div ref={dot}  className="cursor-dot"  />
      <div ref={ring} className="cursor-ring" />
    </>
  );
}
```

---

## 8. ANIMATION PRINCIPLES

### Scroll Reveal
All major content blocks animate in on scroll. Use IntersectionObserver:

```javascript
const observer = new IntersectionObserver(entries => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 80);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
```

```css
.reveal {
  opacity: 0; transform: translateY(32px);
  transition: opacity 0.7s ease, transform 0.7s ease;
}
.reveal.visible { opacity: 1; transform: none; }
```

### Page Load (Hero)
```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
/* Stagger delays: 0.2s, 0.35s, 0.5s, 0.65s, 0.9s */
.hero-eyebrow { animation: fadeUp 0.7s 0.20s both; }
.hero-h1      { animation: fadeUp 0.8s 0.35s both; }
.hero-sub     { animation: fadeUp 0.8s 0.50s both; }
.hero-actions { animation: fadeUp 0.8s 0.65s both; }
.hero-strip   { animation: fadeUp 0.8s 0.90s both; }
```

### Glow Pulse (Orbs / Background Elements)
```css
@keyframes pulse {
  0%, 100% { transform: scale(1);    opacity: 0.8; }
  50%       { transform: scale(1.08); opacity: 1;   }
}
.glow-orb { animation: pulse 6s ease-in-out infinite; }
```

### Easing Tokens
```css
--ease-out:   cubic-bezier(0.0, 0.0, 0.2, 1.0);   /* Entering elements */
--ease-in:    cubic-bezier(0.4, 0.0, 1.0, 1.0);   /* Exiting elements  */
--ease-inout: cubic-bezier(0.4, 0.0, 0.2, 1.0);   /* Transform / scale */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Bouncy hover      */
```

---

## 9. BACKGROUND & ATMOSPHERE

### Particle Star Field (Canvas)
```javascript
function initStarField(canvasId) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  let stars = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = document.body.scrollHeight;
    stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.2,
      o: Math.random() * 0.7 + 0.2,
      speed: Math.random() * 0.3 + 0.05,
      phase: Math.random() * Math.PI * 2
    }));
  }

  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    t += 0.008;
    stars.forEach(s => {
      const opacity = s.o * (0.6 + 0.4 * Math.sin(t * s.speed + s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 210, 255, ${opacity})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
}
```

### Gradient Orbs (Decorative)
```css
.orb {
  position: absolute; border-radius: 50%;
  pointer-events: none; z-index: 1;
}
.orb-blue {
  width: 600px; height: 600px;
  background: radial-gradient(circle, rgba(27,159,224,0.12) 0%, transparent 70%);
}
.orb-orange {
  width: 400px; height: 400px;
  background: radial-gradient(circle, rgba(232,122,42,0.07) 0%, transparent 70%);
}
```

### Noise Texture Overlay
Add to `body::after` for grain:
```css
body::after {
  content: '';
  position: fixed; inset: 0; z-index: 1;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none; opacity: 0.4;
}
```

---

## 10. NAVIGATION

```
Height: 72px (collapsed: 64px on scroll)
Background: Transparent → rgba(4, 8, 16, 0.95) on scroll
Backdrop: blur(12px) on scroll
Left: Logo mark + wordmark
Center: Nav links (Features, How it Works, Pricing, Docs)
Right: "Get Early Access" outline CTA button
```

**Scroll behavior:**
```javascript
window.addEventListener('scroll', () => {
  const nav = document.getElementById('nav');
  nav.classList.toggle('scrolled', window.scrollY > 50);
});
```

---

## 11. PAGE STRUCTURE (Marketing Site)

```
/
├── <nav>           Fixed, transparent → frosted on scroll
├── <Hero>          Full viewport. H1 + subline + 2 CTAs + tagline strip
├── <Stats>         4 columns: key metrics
├── <Features>      6-card grid with icon, title, description
├── <How It Works>  2-col: steps list + dashboard mockup
├── <Pricing>       3 cards: Starter / Pro (featured) / Enterprise
├── <CTA>           Full-width centered call to action
└── <Footer>        Logo + links + copyright
```

---

## 12. APP / DASHBOARD DESIGN (Decision Hub)

### Layout
```
┌─────────────────────────────────────────────────────┐
│  Sidebar (240px)  │  Main Content Area              │
│  - Logo            │  - Top bar (search, user)        │
│  - Nav items       │  - Decision feed / list          │
│  - Status          │  - Detail panel (right drawer)   │
└─────────────────────────────────────────────────────┘
```

### Sidebar
```css
.sidebar {
  width: 240px; height: 100vh;
  background: var(--k-surface-2);   /* #0A1628 */
  border-right: 1px solid var(--k-blue-border);
  padding: 24px 16px;
  display: flex; flex-direction: column; gap: 8px;
}
.nav-item {
  padding: 10px 16px; border-radius: 6px;
  display: flex; align-items: center; gap: 12px;
  font-family: var(--font-body); font-size: 14px; font-weight: 400;
  color: var(--k-silver); cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.nav-item:hover   { background: rgba(27,159,224,0.06); color: var(--k-white); }
.nav-item.active  { background: rgba(27,159,224,0.12); color: var(--k-blue-bright); }
```

### Decision Row Component
```
┌────────────────────────────────────────────────────────────┐
│ [Icon]  Title                    [Badge]   [Arrow]          │
│         Subtitle / context · time/stakeholders             │
└────────────────────────────────────────────────────────────┘
```

### Priority Order (Visual Hierarchy)
1. `badge-urgent` (orange) — tops of lists, highest contrast
2. `badge-active` (blue) — standard in-progress
3. `badge-review` (green) — ready but not urgent
4. `badge-neutral` (grey) — low priority / informational

---

## 13. ICONOGRAPHY

Use **Lucide** or **Phosphor** icon sets exclusively.  
- Stroke width: `1.5px` (not filled)  
- Default size: `20px` (nav), `24px` (feature), `16px` (inline)  
- Color: inherit from parent (no hardcoded fill)  
- On colored backgrounds: `stroke: var(--k-blue-bright)`

---

## 14. BORDER RADIUS SYSTEM

| Element                   | Radius |
|---------------------------|--------|
| Buttons                   | 4px    |
| Cards                     | 2px    |
| Badges / Chips            | 3px    |
| Modals / Drawers          | 8px    |
| Input fields              | 6px    |
| Avatars                   | 50%    |
| Icon containers           | 6–8px  |
| Images / Mockups          | 12px   |
| Rounded elements (orbs)   | 50%    |

**Rule:** Keep radii small and intentional. This brand is sharp and precise — avoid overly rounded UI.

---

## 15. SCROLLBAR

```css
::-webkit-scrollbar       { width: 4px; }
::-webkit-scrollbar-track { background: var(--k-bg); }
::-webkit-scrollbar-thumb { background: var(--k-blue-dim); border-radius: 2px; }
```

---

## 16. ACCESSIBILITY NOTES

- Minimum contrast: 4.5:1 for body text, 3:1 for large text / UI
- Focus states: `outline: 2px solid var(--k-blue-bright); outline-offset: 3px;`
- All interactive elements: keyboard navigable
- All images: descriptive `alt` text
- Animated elements: respect `prefers-reduced-motion`

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 17. DO / DON'T

| ✅ DO                                        | ❌ DON'T                                   |
|----------------------------------------------|--------------------------------------------|
| Use Syne for all display/heading text        | Use Inter, Roboto, Arial, or system fonts  |
| Dark backgrounds on every surface            | Use white or light grey backgrounds        |
| Single-pixel or 2px border radius on cards  | Use 12–16px rounded corners on cards       |
| Orange ONLY for urgency/alerts               | Use orange as a decorative accent color    |
| Short, punchy heading text                   | Use vague, generic SaaS marketing copy     |
| Animate with purpose and staggered delays    | Animate every element simultaneously       |
| Gradient text for emphasis on hero H1        | Gradient text on body copy or subtext      |
| Dense, rich dark UI with layered depth       | Flat, sparse, minimal white-space layouts  |

---

*Last updated: 2025 · Kairos.ai Brand System v1.0*
