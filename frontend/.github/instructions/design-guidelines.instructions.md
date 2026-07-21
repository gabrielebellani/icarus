---
applyTo: "src/**/*.{vue,scss,css}"
description: "Use when implementing proprietary dashboard visuals or custom flight tracking UI that should follow Icarus-specific design guidelines instead of only default component library styling."
---

# Icarus Dashboard Design Guidelines

Use these rules for custom dashboard and flight-tracking surfaces. They define the current Icarus visual language for proprietary data widgets and should override generic styling instincts when building operational UI.

## Design Intent

- Optimize for fast situational awareness first, polish second.
- Prefer compact, high-contrast layouts that let users scan identifiers, status, times, progress, and alerts in a few seconds.
- Keep the interface restrained and technical. The goal is confident operational readability, not consumer marketing aesthetics.

## Visual Direction

- Custom flight widgets should use a dark, instrument-like surface rather than default light card styling.
- Favor near-black backgrounds with subtle elevation steps instead of white panels with borders.
- Use rounded corners and clean separators, but avoid heavy outlines or thick boxed sections.
- Prefer a calm, dense layout with a few strong accents rather than many competing highlight colors.

## Core Surface Tokens

For proprietary tracking surfaces, start from a palette close to the current flight widgets:

- Base background: deep near-black blue-violet such as `oklch(0.1 0.02 270)`.
- Elevated background: a slightly lifted tone such as `oklch(0.15 0.025 270)`.
- Primary text: near-white such as `oklch(0.97 0 0)`.
- Muted text: desaturated cool gray such as `oklch(0.52 0.01 270)`.
- Dividers and inactive tracks: very dark muted tones around `oklch(0.18 0.025 270)` to `oklch(0.2 0.04 270)`.

Accent semantics should stay consistent across widgets:

- Positive or on-time: green.
- Early: blue.
- Late, cancelled, or problematic: red.
- Active progress or motion: blue-to-indigo gradient, not flat neon fills.

Do not introduce unrelated accent systems unless the feature genuinely adds a new semantic state.

## Typography And Hierarchy

- Make the most operationally important values the largest elements in the card.
- In flight tracking views, IATA or ICAO identifiers, airport codes, core timestamps, and progress state should dominate visually.
- Labels, metadata, and secondary descriptors should be noticeably smaller and muted.
- Prefer strong weight contrast over many font families or decorative letterforms.
- Use tabular numerals for times, durations, percentages, and numeric operational values.
- Tighten tracking slightly on large codes and times to create a more technical display feel.

As a rule of thumb:

- Primary codes and times should read from across the room.
- Status chips and secondary values should remain readable without competing with primary information.
- Helper labels should guide interpretation but never become the focal point.

## Layout And Spacing

- Group content into clear horizontal bands: header, route or progress, status, detail rows.
- Use spacing to separate information layers, not to create decorative emptiness.
- Dense layouts are acceptable if alignment is crisp and the reading order is obvious.
- Prefer internal padding and subtle elevation changes over nested cards inside cards.
- When a card contains progress, keep the progress element wide and visually anchored to the main route information.

## Cards, Panels, And Dividers

- Custom tracking cards should feel like a single composed surface.
- Use soft radii around the outer shell.
- Use thin, low-contrast dividers to separate sections.
- Prefer section backgrounds or tone shifts over strong borders.
- Avoid default `var(--card)` and `var(--border)` styling for proprietary tracking widgets when it breaks the dark operational language.

## Status And Motion

- Status chips must encode meaning immediately with both text and color.
- Keep status treatments compact and pill-shaped.
- Progress bars should be thick enough to be meaningful, not hairline decorative rules.
- Plane or motion icons can be used when they help orientation, but they should stay simple and functional.
- Use animation sparingly. Favor width transitions, subtle fades, and state transitions over looping or ornamental motion.

## Fullscreen And Large-Format Behavior

- Fullscreen widgets must scale typography and key visual elements aggressively, not proportionally through a parent font-size alone.
- When a card expands fullscreen, increase the size of primary codes, times, progress bars, and icons enough to take advantage of viewing distance.
- Preserve the same information hierarchy in fullscreen; do not add extra clutter just because more space is available.
- Maintain comfortable outer margins so the card feels framed and intentional rather than edge-to-edge.

## Responsive Behavior

- Preserve hierarchy on smaller screens by reducing secondary content before shrinking primary operational values too far.
- Allow layout stacks or simplified detail sections when horizontal room is limited.
- Do not rely on hover-only affordances for essential controls.
- Keep dense operational widgets readable on laptop widths before optimizing for very large displays.

## Standard Controls Versus Custom Surfaces

- Continue using `shadcn-vue` for standard controls such as buttons, inputs, dialogs, selects, and form structure.
- Blend standard controls into custom surfaces through spacing and surrounding layout, not by heavily restyling every primitive.
- Reserve fully custom styling for proprietary widgets, route visualizations, tracking cards, and glanceable dashboard panels.

## Things To Avoid

- Bright decorative gradients used purely as ornament.
- Light-theme default cards mixed into dark operational panels without a deliberate contrast reason.
- Excessive shadows, glassmorphism, glowing edges, or marketing-style hero treatments.
- Low-contrast muted-on-muted text in dense information areas.
- Over-fragmenting data into too many small boxes.
- Introducing new status colors without semantic justification.

## Implementation Bias

- Define local CSS variables at the component root for proprietary widgets and reuse them through nested elements.
- Keep styles scoped and modular.
- When introducing a new custom tracking surface, align its tokens, corner radius, divider treatment, and accent logic with the existing minimal and detailed flight cards unless a stronger product requirement overrides that decision.