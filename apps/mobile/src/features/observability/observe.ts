import Constants from "expo-constants";
import { Observe } from "expo-observe";

// Importing expo-observe installs its global JS error handler. This fork never dispatches what
// it collects: the setting is hidden and dispatching stays off.
const appVariant: unknown = Constants.expoConfig?.extra?.appVariant;

export const crashReportingAvailable = false;

interface PromiseRejectionTracker {
  readonly enablePromiseRejectionTracker?: (options: {
    readonly allRejections: boolean;
    readonly onUnhandled: (id: number, rejection: unknown) => void;
  }) => void;
}

// React Native tracks unhandled rejections only in development, for LogBox; Observe has no hook.
if (!__DEV__) {
  const hermes: PromiseRejectionTracker | undefined = Reflect.get(globalThis, "HermesInternal");
  hermes?.enablePromiseRejectionTracker?.({
    allRejections: true,
    onUnhandled: (_id, rejection) => Observe.reportError(rejection),
  });
}

export async function setCrashReportsEnabled(enabled: boolean) {
  Observe.configure({
    dispatchingEnabled: crashReportingAvailable && enabled,
    ...(typeof appVariant === "string" ? { environment: appVariant } : {}),
  });
}

void setCrashReportsEnabled(false);
