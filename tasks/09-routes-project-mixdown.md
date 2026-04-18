# Task 09: Routes — /api/project/new and /api/mixdown/all

## Dependencies
- 03-osc-infra.md

## Goal

Rewire the two fire-and-forget routes to use `RtClient` directly (no refetch,
no await on reply).

## Files

### Modify

- `server/src/routes/project.ts`
- `server/src/routes/mixdown.ts`
- The corresponding test files (if any — check `server/src/routes/`)

## Changes

### `project.ts`

```ts
import type { RtClient } from "../osc/client.js";

export default function projectRoutes(rt: RtClient) {
  return async function (app: FastifyInstance) {
    app.post("/api/project/new", async () => {
      await rt.send("/rt/project/new");
      return { ok: true };
    });
  };
}
```

(URL remains `/api/project/new` — the PRD's `/api/projects/new` text was a
typo; the existing SPA client uses the singular.)

### `mixdown.ts`

```ts
import type { RtClient } from "../osc/client.js";

export default function mixdownRoutes(rt: RtClient) {
  return async function (app: FastifyInstance) {
    app.post<{ Body: { output_dir?: string } }>(
      "/api/mixdown/all",
      async (req) => {
        const { output_dir } = req.body ?? {};
        await rt.send("/rt/mixdown/all", { output_dir: output_dir ?? undefined });
        return { ok: true };
      },
    );
  };
}
```

## TDD

If tests for these routes exist, update them to inject a fake `RtClient` and
assert the `rt.send` call. If no tests exist, do not add new suites for these
two trivial routes — the type system and the eventual integration test cover
them.

## Acceptance

- `pnpm -F server test` passes.
- Neither file imports `DispatcherClient`.

## Commit

```
refactor(server): move project/new and mixdown/all to RtClient fire-and-forget
```
