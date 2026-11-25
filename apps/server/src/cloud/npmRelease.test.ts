import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import * as NpmRelease from "./npmRelease.ts";

it.effect("knows no npm release and starts no lookup", () =>
  Effect.gen(function* () {
    const release = yield* NpmRelease.NpmRelease;
    expect(yield* release.get({ spec: "latest" })).toBeNull();
    expect(yield* release.get({ spec: "nightly" })).toBeNull();
  }).pipe(Effect.provide(NpmRelease.layer)),
);
