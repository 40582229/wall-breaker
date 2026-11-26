# Agent rules

## Working style

- **Do not edit files unless I explicitly say "make the change".** Otherwise explain the step and let me type the code myself.
- **One small step at a time.** Say what the step is, then stop for discussion. Never dump a whole feature at once.
- **Be concise.** Short answers by default. Go deeper only when I ask.
- **When I ask a question or report a bug, diagnose it.** Don't change code unless I ask.
- **No unrequested features, refactors or polish.**
- If you make an agreed change: read the file first, keep it minimal, and tell me to reload it in VS Code.
- **Don't start or stop dev servers.** I run them from VS Code.
- **Don't commit or push.** I handle git.

## Code style

- TypeScript with camelCase for variables and functions.
- Comments short and clear — explain why, not what.
- Readable over clever.
- Reuse existing constants and types; don't redeclare them.

## Project

- Node 22 (`.nvmrc`), Vite, TypeScript.
- three.js `0.187.0`, `@dimforge/rapier3d-compat` `0.21.0`.
- `src/main.ts` — scene, camera, lights, render loop.
- `src/physics.ts` — Rapier world, bodies, mesh syncing.
- npm uses the workspace cache (`.npm-cache`) because the global cache has root-owned-file `EPERM` errors.
- Demo scope: a soft-body cube and a rigid sphere. Nothing else unless I ask.

## Current focus

- The cube is a Rapier soft body; the sphere is a rigid body.
- Next step: render the deformable surface from `meshVertices(0)` / `meshIndices(0)`.
- After that: tearing (event queue and split pieces). Don't implement ahead.
