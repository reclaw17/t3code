import {
  ServerNpmReleaseError,
  ServerNpmReleaseInput,
  type ServerNpmRelease,
} from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

export class NpmRelease extends Context.Service<
  NpmRelease,
  {
    readonly get: (
      input: ServerNpmReleaseInput,
    ) => Effect.Effect<ServerNpmRelease | null, ServerNpmReleaseError>;
  }
>()("t3/cloud/npmRelease") {}

const decodeInput = Schema.decodeUnknownEffect(ServerNpmReleaseInput);

// This fork looks up no release on npm: the `t3` package there belongs to the upstream project,
// and asking about it on a timer would report this machine to the registry.
export const layer = Layer.succeed(NpmRelease, {
  get: Effect.fn("NpmRelease.get")(function* (input) {
    yield* decodeInput(input).pipe(
      Effect.mapError(
        () => new ServerNpmReleaseError({ reason: "Invalid release version or track." }),
      ),
    );
    return null;
  }),
});
