/* eslint-disable no-console */
import { loadScript } from "./loadScript.js";

declare const __webpack_init_sharing__: (scope: string) => Promise<unknown>;
declare const __webpack_share_scopes__: Record<string, unknown>;

interface WebpackContainer {
  init(arg: unknown): Promise<unknown>;
  get(module: string): Promise<Function>;
}

function loadComponent(scope: string, module: string) {
  return async () => {
    // Initializes the share scope. This fills it with known provided modules from this build and all remotes
    await __webpack_init_sharing__("default");
    const container = window[scope] as unknown as WebpackContainer; // or get the container somewhere else
    // Initialize the container, it may provide shared modules
    await container.init(__webpack_share_scopes__.default);
    const factory = await container.get(module);
    return factory();
  };
}

loadScript("./bricks/basic/dist/remoteEntry.js")
  .then(() =>
    Promise.all([
      loadComponent("basic", "./x-button")(),
      loadComponent("basic", "./y-button")(),
    ])
  )
  .then(
    (o) => {
      console.log("[basic] loadComponent:", o);
    },
    (err) => {
      console.error("[basic] loadScript / loadComponent failed:", err);
    }
  );

loadScript("./bricks/form/dist/remoteEntry.js")
  .then(() =>
    Promise.all([
      loadComponent("form", "./f-input")(),
      loadComponent("form", "./f-select")(),
    ])
  )
  .then(
    (o) => {
      console.log("[form] loadComponent:", o);
    },
    (err) => {
      console.error("[form] loadScript / loadComponent failed:", err);
    }
  );
