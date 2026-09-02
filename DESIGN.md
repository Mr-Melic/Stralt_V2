# Design Brief

## Direction

DOFUS 3.0–inspired tactical RPG with Paper Baby Vampires isometric chess aesthetic — sleek dark panels, gold accents, and premium interactive HUD elements for turn-based battle and world exploration.

## Tone

Refined, premium MMORPG visual system with deep navy backgrounds, gold trim, and glowing interactive elements; maximalist in decoration (layered shadows, orbs, glows) but minimalist in information hierarchy (icon-first layout, compact panels).

## Differentiation

Animated colored orbs (AP/MP/HP) as tactile stat displays, chess piece character sprites on isometric tiles, and a skate-rail world with procedural starfield backdrop create an unforgettable blend of tactics depth and playful visual identity.

## Color Palette

| Token              | OKLCH            | Role                                      |
| :----------------- | :--------------- | :---------------------------------------- |
| background         | 0.05 0 0         | Deep navy screen base                    |
| foreground         | 0.96 0 0         | Primary text and UI overlay              |
| card               | 0.10 0 0         | Panel backgrounds, elevated surfaces     |
| primary            | 0.50 0.22 262    | Interactive elements, AP orb             |
| secondary          | 0.45 0.18 39     | Gold/amber accents, borders              |
| accent             | 0.65 0.20 39     | Glowing highlights, focus states         |
| destructive        | 0.55 0.25 29     | HP orb, danger indicators                |
| success            | 0.50 0.20 150    | MP orb, movement range                   |
| muted              | 0.35 0 0         | Dim text, secondary labels               |
| border             | 0.20 0.08 39     | Panel edges, dividers                    |

## Typography

- **Display**: Space Grotesk — bold sans-serif for titles, level/stats, turn indicators
- **Body**: Inter — clean sans-serif for all body text, menu labels, tooltips
- **Mono**: JetBrains Mono — damage values, cooldown timers, AP/MP counters
- **Scale**: Hero 36px/800, Heading 18px/700, Label 11px/500 uppercase, Body 12px/400

## Elevation & Depth

Hierarchy through layered shadows (inset gold glows for panels, radial gradients for orbs), z-index layering (starfield root → game canvas → UI overlays), and surface treatment (gradient-filled panels with alpha borders).

## Structural Zones

| Zone       | Background                   | Border                | Notes                                              |
| :--------- | :--------------------------- | :-------------------- | :------------------------------------------------- |
| Header     | oklch(0.08 0 0) gradient     | oklch(0.65 0.20 39)  | Top bar with XP, name, level, region              |
| Game Area  | oklch(0.05 0 0)              | —                     | Full-screen canvas for world/battle, starfield    |
| Side Panel | oklch(0.08 0 0) gradient     | oklch(0.35 0.12 39)  | Right stats panel (HP/AP/MP orbs, INIT)           |
| Footer     | oklch(0.08 0 0)              | oklch(0.35 0.12 39)  | Battle spell menu, enemy HP bars overlay          |
| Modals     | oklch(0.05 0 0 / 0.95)       | oklch(0.65 0.20 39)  | Login, character creation, post-battle popups    |

## Spacing & Rhythm

Panel padding 8–12px, stat row gap 2px (compact), section headers 5px padding top/bottom, orb grid 8px gap; alternating light/dark backgrounds in multi-row lists (card vs. muted). Micro-spacing (2–4px) around stat values.

## Component Patterns

- **Buttons**: Gold border, dark gradient fill, white text; scale 1.08 on hover, text-shadow on active. Disabled: opacity 0.4, no pointer-events.
- **Orbs (AP/MP/HP)**: 44–56px, radial gradient fill, glowing border, text-center value. Hover: scale 1.08, shadow intensifies.
- **Cards/Panels**: Border 1px gold-dim, gradient fill primary→primary-dark, inset gold glow. Rounded 6–8px.
- **Spell Cards**: Grid flex, gold border, dark bg, hover lift +1px, selected: gold bg + glow.
- **Badges**: Pill-shaped (rounded-full), colored border + tinted bg (blue/red/gold), 10px font uppercase.

## Motion

- **Entrance**: Fade in 0.3s on screen load (modals, panels). Staggered 0.1s per list item.
- **Hover**: Scale +8%, lift -1px, shadow brighten. Timing 0.15s ease. Spell cards glow on hover.
- **Decorative**: Starfield twinkle fade (1–60s random), pulsing glow on selected spells (2s loop), orb border shimmer on active turn.

## Constraints

- Canvas renders pixel-perfect at 120×60 isometric tile size; no CSS transforms on game layer.
- All colors via OKLCH custom properties; never raw hex or rgba in components.
- Semantic panel structure: header div + stat rows + footer; no nested deep nesting.
- Mobile: all interactive targets ≥44px; bottom menu sticks to viewport.
- Accessibility: gold text maintains 4.5:1 contrast on navy; status badges always show color + text.

## Signature Detail

Glowing colored orbs (AP/MP/HP) as tactile stat displays with radial gradients and pulsing shadows, making stats feel like pressable interactive jewels rather than inert numbers.
