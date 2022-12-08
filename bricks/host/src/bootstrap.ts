/* eslint-disable no-console */
import { loadScript } from "./loadScript.js";

declare const __webpack_init_sharing__: (scope: string) => Promise<unknown>;
declare const __webpack_share_scopes__: Record<string, unknown>;

interface WebpackRuntimeContainer {
  init(arg: unknown): Promise<unknown>;
  get(module: string): Promise<Function>;
}

// https://github.com/module-federation/module-federation-examples/blob/eda9493f3991a423479fd834cfb1d7b241d9d1f0/advanced-api/dynamic-remotes/app1/src/App.js
async function loadBrick(scope: string, module: string) {
  // Initializes the share scope. This fills it with known provided modules from this build and all remotes
  await __webpack_init_sharing__("default");
  const container = window[scope] as unknown as WebpackRuntimeContainer; // or get the container somewhere else
  // Initialize the container, it may provide shared modules
  await container.init(__webpack_share_scopes__.default);
  const factory = await container.get(module);
  return factory();
}

loadScript("./bricks/basic/dist/remoteEntry.js")
  .then(() =>
    Promise.all([
      loadBrick("bricks/basic", "./x-button"),
      loadBrick("bricks/basic", "./y-button"),
    ])
  )
  .then(
    () => {
      console.log("[basic] loadBrick done");
    },
    (err) => {
      console.error("[basic] loadScript / loadBrick failed:", err);
    }
  );

loadScript("./bricks/form/dist/remoteEntry.js")
  .then(() =>
    Promise.all([
      // loadBrick("bricks/form", "./f-input"),
      // loadBrick("bricks/form", "./f-select"),
      loadBrick("bricks/form", "./all"),
    ])
  )
  .then(
    () => {
      console.log("[form] loadBrick done");
    },
    (err) => {
      console.error("[form] loadScript / loadBrick failed:", err);
    }
  );
