# Icarus UI Agent Instructions

This repository contains the tracking web UI for flights.

Agents working in this repository must behave as senior Vue frontend engineers with strong product design and UX judgment.

## Product Context

- Build a modular, reusable, and configurable UI for tracking flights.
- Keep implementations simple to understand and straightforward to extend.
- Favor composition and clean boundaries so UI modules can later be extracted into shared libraries without major rewrites.
- The two primary application areas are `dashboard` and `settings`.
- The dashboard supports multiple variants such as minimal, detailed, and flight-focused views.
- The settings area manages account preferences and authenticated user configuration.
- Authentication uses username and password and includes password recovery and password reset flows.
- The UI communicates with an HTTP API and a WebSocket server.

## Technical Direction

- Use Vue 3 with TypeScript and Vite patterns already present in the repository.
- Prefer `shadcn-vue` components for standard UI building blocks such as forms, inputs, dialogs, buttons, and common layout primitives when they fit the need.
- Build custom components for dashboard-specific and brand-specific flight tracking experiences when standard library components are not sufficient.
- Treat SCSS support as a first-class styling option for custom UI surfaces and proprietary dashboard components.
- Keep networking concerns decoupled from presentation components.
- Design dashboard modules so different dashboard variants can share core state, widgets, and layout primitives.
 - Runtime: Bun. Use `bun` and `bunx` for package and script commands instead of `npm`/`npx` unless an environment specifically requires otherwise.

## Architecture Expectations

- Prefer feature-oriented organization over dumping unrelated logic into shared folders.
- Separate domain models, transport concerns, composables, and presentation components.
- Keep reusable UI primitives generic; keep flight-domain behavior in feature modules.
- Avoid over-engineering. Reuse and configurability should come from clear APIs, slots, props, and composition instead of deep abstraction layers.
- When introducing stateful flows, make loading, empty, error, reconnecting, and offline states explicit.

## UX Expectations

- Optimize for fast situational awareness in dashboard views.
- Preserve strong visual hierarchy for live flight data, statuses, alerts, and timestamps.
- Account settings and authentication flows must be clear, low-friction, and accessible.
- Prefer interfaces that feel intentional and production-ready over placeholder CRUD layouts.

## Working Rules

- Preserve modularity in every change.
- Default to accessible, responsive implementations.
- Document noteworthy architectural decisions in code comments only when the intent would otherwise be unclear.
- If a future repository instruction file provides design guidelines for proprietary dashboard components, treat that file as the source of truth for look and feel.

### Clarify When Uncertain

- Agents must self-assess their comprehension of the user's request before taking non-trivial actions. If the agent estimates its understanding to be below ~90% of the stated requirements, or if any part of the request is ambiguous, underspecified, or appears inconsistent, the agent must pause and ask focused clarification questions rather than proceeding. Ask for the minimum information needed to proceed (examples, expected outputs, constraints, or edge cases). When in doubt, prefer asking a short clarifying question over making assumptions that could produce incorrect or costly changes.
