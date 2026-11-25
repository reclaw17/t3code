import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";

import * as ServerConfig from "../config.ts";
import * as AnalyticsService from "./AnalyticsService.ts";

const analyticsOff = AnalyticsService.layer.pipe(
  Layer.provideMerge(
    ServerConfig.ServerConfig.layerTest(process.cwd(), { prefix: "t3-telemetry-off-" }),
  ),
  Layer.provide(
    ConfigProvider.layer(
      ConfigProvider.fromUnknown({
        T3CODE_TELEMETRY_ENABLED: true,
        T3CODE_POSTHOG_KEY: "phc_test_key",
        T3CODE_POSTHOG_HOST: "http://localhost",
      }),
    ),
  ),
);

it.layer(NodeServices.layer)("AnalyticsService test", (it) => {
  it.effect("queues nothing and writes no install id when the environment enables telemetry", () =>
    Effect.gen(function* () {
      const analytics = yield* AnalyticsService.AnalyticsService;
      assert.strictEqual(yield* analytics.record("test.event", { index: 1 }), false);
      yield* analytics.flush;
      yield* analytics.recordOwners([{ source: "connect", ownerId: "owner" }], "server");
      const config = yield* ServerConfig.ServerConfig;
      const fileSystem = yield* FileSystem.FileSystem;
      assert.isFalse(yield* fileSystem.exists(config.anonymousIdPath));
    }).pipe(Effect.provide(analyticsOff)),
  );
});
