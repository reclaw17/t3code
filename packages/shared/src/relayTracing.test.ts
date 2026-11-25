import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Tracer from "effect/Tracer";
import { FetchHttpClient } from "effect/http";

import {
  layer,
  RelayClientTracer,
  withLocalTracing,
  withRelayClientTracing,
} from "./relayTracing.ts";

function collectingTracer(spans: Array<string>): Tracer.Tracer {
  return Tracer.make({
    span: (options) => {
      const span = new Tracer.NativeSpan(options);
      const end = span.end.bind(span);
      span.end = (endTime, exit) => {
        end(endTime, exit);
        spans.push(span.name);
      };
      return span;
    },
  });
}

describe("layer", () => {
  it.effect("builds no exporter, however it is configured", () =>
    Effect.gen(function* () {
      const tracer = yield* Effect.service(RelayClientTracer).pipe(
        Effect.provide(
          layer(
            {
              tracesUrl: "https://traces.example.com",
              tracesDataset: "relay",
              tracesToken: "token",
            },
            {
              serviceName: "t3code-test",
              runtime: "node",
              serviceInstanceId: "id",
              client: "test",
            },
            { isEnabled: () => true },
          ).pipe(Layer.provide(FetchHttpClient.layer)),
        ),
      );
      expect(Option.isNone(tracer)).toBe(true);
    }),
  );
});

describe("withRelayClientTracing", () => {
  it.effect("uses the product tracer only for relay operations", () =>
    Effect.gen(function* () {
      const userSpans: Array<string> = [];
      const productSpans: Array<string> = [];
      const userTracer = collectingTracer(userSpans);
      const productTracer = collectingTracer(productSpans);

      yield* Effect.void.pipe(Effect.withSpan("user.operation"), Effect.withTracer(userTracer));
      yield* Effect.void.pipe(
        Effect.withSpan("relay.operation"),
        withRelayClientTracing,
        Effect.provideService(RelayClientTracer, Option.some(productTracer)),
        Effect.withTracer(userTracer),
      );

      expect(userSpans).toEqual(["user.operation"]);
      expect(productSpans).toEqual(["relay.operation"]);
    }),
  );
});

describe("withLocalTracing", () => {
  it.effect("keeps local work inside a relay span off the product tracer", () =>
    Effect.gen(function* () {
      const localSpans: Array<string> = [];
      const productSpans: Array<string> = [];
      const localTracer = collectingTracer(localSpans);
      const productTracer = collectingTracer(productSpans);

      yield* Effect.void.pipe(
        Effect.withSpan("relay.connection.nested"),
        Effect.andThen(
          Effect.void.pipe(
            Effect.withSpan("sql.execute"),
            Effect.withSpan("ServerSecretStore.get"),
            withLocalTracing,
          ),
        ),
        Effect.withSpan("environment.orchestration.threadSnapshot"),
        withRelayClientTracing,
        Effect.provideService(RelayClientTracer, Option.some(productTracer)),
        Effect.withTracer(localTracer),
      );

      expect(productSpans).toEqual([
        "relay.connection.nested",
        "environment.orchestration.threadSnapshot",
      ]);
      expect(localSpans).toEqual(["sql.execute", "ServerSecretStore.get"]);
    }),
  );
});
