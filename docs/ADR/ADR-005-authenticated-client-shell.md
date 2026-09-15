# ADR-005: Authenticated game-client shell composition

Status: accepted  
Date: 2026-08-30

## Context

The first authenticated routes were structurally separated but visually read as
a generic responsive dashboard. That failed the intended transition from the
public site into a game client, especially on mobile when the navigation drawer
covered most of the screen.

## Decision

Keep the existing route and state boundaries, but compose every authenticated
route inside a game-client shell: a Meridian-themed scene layer, persistent
selected-starter signal, compact client navigation, and route-specific content
above the scene. The launcher and hero roster retain their larger interactive
3D showcases; secondary account systems use a lower-opacity ambient showcase so
the shell remains game-like without mounting duplicate heavy scenes everywhere.

The shell remains DOM UI over a renderer-owned visual layer. It does not move
game rules into React or turn account progression into combat state.

## Consequences

- `/game/*` now reads as one authenticated client with persistent identity and
  hero context rather than unrelated CSS pages.
- Mobile navigation is a compact drawer and no longer occupies most of the
  viewport.
- The public marketing surface remains separate from the authenticated client.
- The 3D model/material layer can later be replaced by GLTF assets and animation
  clips without changing route contracts or game-core state.
