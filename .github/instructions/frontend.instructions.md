---
applyTo: "src/**/*.{vue,ts,tsx,js,jsx,scss,css}"
description: "Use when working on Vue UI implementation for the Icarus flight tracking app, including dashboard variants, settings, authentication flows, HTTP and WebSocket integration surfaces, and reusable UI architecture."
---

# Frontend Implementation Instructions

## Stack

- Use Vue 3 Composition API with TypeScript.
- Match the repository's existing Vite-based structure and keep new code easy to move into future shared UI packages.
- Prefer strongly typed props, emits, composables, and API contracts.
 - Runtime: Bun. Replace `npm`/`npx` commands with `bun`/`bunx` in developer documentation and scripts unless a contributor explicitly documents an alternative environment.

## UI Composition

- Use `shadcn-vue` for standard primitives when its patterns fit the requirement.
- Avoid custom-building basic form controls unless the product requirements clearly demand it.
- For flight tracking dashboards, compose feature-specific views from reusable cards, widgets, panels, status badges, maps, lists, timelines, and detail sections.
- Build dashboard variants from shared modules first, then specialize with configuration and feature flags rather than duplicating layouts.

## Styling

- Use SCSS for custom styling where it improves structure, token usage, or component readability.
- Keep styling modular and close to the relevant feature or component.
- Prefer design tokens, CSS variables, and consistent spacing and typography scales over hard-coded one-off values.
- Do not introduce visual noise in dense tracking surfaces; prioritize legibility and data scanning.

## Data And State

- Model HTTP and WebSocket concerns behind composables or service modules instead of embedding transport logic directly in presentational components.
- Design live-updating views for reconnect, stale data, partial data, and loading transitions.
- Keep local UI state separate from server-synchronized state.

### Validation Errors (422)

- If request payload validation (body or query parameters) fails, the backend returns `422` with errors formatted using Zod v4's error response shape. Clients should parse these responses and map field-level errors to form inputs when possible, and otherwise surface a clear, generic validation message to the user.


## Auth And Settings

- Authentication flows must cover sign-in, password recovery request, and password reset.
- Settings screens should favor predictable information architecture and clear save or reset behavior.
- Form validation, error messaging, and submission feedback should be explicit and user-friendly.

### Private HTTP calls authorization

- Most HTTP API calls are authenticated. Each request must include an `Authorization` header with the value `Bearer {{access token}}`.
- The access token is a JWT returned from the backend together with a refresh token on successful registration/login calls.
- The backend attempts to authenticate each request using the access token. If the token is missing, invalid, or expired, the backend returns one of these 401 error shapes:
	- `401 { error: 'Missing or invalid Authorization header' }` — missing token or invalid header format.
	- `401 { error: 'Access token required' }` — a refresh token was passed instead of an access token.
	- `401 { error: 'Invalid or expired access token' }` — token validation failed (format issue or expired).

- Client retry policy: when a request returns `401`, the app should attempt to obtain a new access token using the stored refresh token (refresh tokens have ~90 days validity). If the refresh attempt returns `401` again the user must be logged out and redirected to the sign-in screen.


## Reusability Bar

- Prefer APIs that are simple to consume over APIs that are maximally abstract.
- Reuse via props, slots, variant systems, and composables before introducing inheritance-like patterns.
- If a component is likely to move into a shared library later, keep app-specific copy, business rules, and transport assumptions outside the base component.