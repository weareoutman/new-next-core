import path from "node:path";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import webpack from "webpack";
import rimraf from "rimraf";
// import HtmlWebpackPlugin from "HtmlWebpackPlugin";

const require = createRequire(import.meta.url);

const { SourceMapDevToolPlugin } = webpack;
const { ModuleFederationPlugin } = webpack.container;

const startTime = Date.now();

try {
  const packageDir = process.cwd();
  const outputPath = path.join(packageDir, "dist");
  const isDevelopment = process.env.NODE_ENV === "development";

  const packageJsonFile = await readFile(
    path.join(packageDir, "package.json"),
    { encoding: "utf-8" }
  );
  const packageJson = JSON.parse(packageJsonFile);
  const packageName = packageJson.name.split("/").pop();
  const libName = `bricks/${packageName}`;

  const sharedPackages = ["react", "react-dom", "@next-core/element"];

  const shared = Object.fromEntries(
    await Promise.all(
      sharedPackages.map(async (dep) => {
        const depPackageJsonPath = require.resolve(`${dep}/package.json`, {
          paths: [packageDir],
        });
        const depPackageJsonFile = await readFile(depPackageJsonPath, {
          encoding: "utf-8",
        });
        const depPackageJson = JSON.parse(depPackageJsonFile);
        return [
          dep,
          {
            singleton: true,
            version: depPackageJson.version,
            requiredVersion: packageJson.dependencies?.[dep],
          },
        ];
      })
    )
  );

  // console.log(packageName, "shared:", shared);

  await new Promise((resolve, reject) => {
    rimraf(outputPath, (err) => {
      if (err) {
        console.error("Failed to clean dist:");
        reject(err);
      } else {
        resolve();
      }
    });
  });

  await new Promise((resolve, reject) => {
    webpack(
      {
        entry: {
          ...(libName === "bricks/host"
            ? {
                polyfill: "./src/polyfill",
              }
            : null),
          index: "./src/index",
        },
        mode: isDevelopment ? "development" : "production",
        devServer: {
          static: {
            directory: outputPath,
          },
          port: 3001,
        },
        output: {
          path: outputPath,
          // filename: isDevelopment ? "[name].bundle.js" : "[name].[contenthash].js",
          filename: "[name].bundle.js",
          publicPath: "auto",
          hashDigestLength: 8,
        },
        resolve: {
          extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
          extensionAlias: {
            ".js": [".ts", ".tsx", ".js", ".jsx"],
          },
        },
        module: {
          rules: [
            {
              test: /\.[tj]sx?$/,
              loader: "babel-loader",
              exclude: /node_modules/,
              options: {
                rootMode: "upward",
              },
            },
          ],
        },
        devtool: false,
        plugins: [
          new SourceMapDevToolPlugin({
            filename: "[file].map",
            // Do not generate source map for these vendors:
            exclude: [
              "polyfill",
              "316", // ReactDOM
              "784", // React
            ],
          }),
          new ModuleFederationPlugin({
            name: libName,
            shared,
            ...(libName === "bricks/host"
              ? null
              : {
                  library: { type: "window", name: libName },
                  filename: "remoteEntry.js",
                  exposes:
                    libName === "bricks/basic"
                      ? {
                          "./x-button": {
                            import: "./src/x-button",
                            name: "x-button",
                          },
                          "./y-button": {
                            import: "./src/y-button",
                            name: "y-button",
                          },
                        }
                      : {
                          "./f-input": {
                            import: "./src/f-input",
                            name: "f-input",
                          },
                          "./f-select": {
                            import: "./src/f-select",
                            name: "f-select",
                          },
                          "./all": {
                            import: "./src/bootstrap",
                            name: "all",
                          },
                        },
                }),
          }),
          // new HtmlWebpackPlugin({
          //   template: './public/index.html',
          // }),
        ],
      },
      (err, stats) => {
        if (err || stats.hasErrors()) {
          console.error("Failed to build bricks:");
          reject(err || stats.toString());
        } else {
          resolve();
        }
      }
    );
  });
} catch (e) {
  console.error(e);
  process.exitCode = 1;
}

// Done
console.log(
  `Build bricks done in ${((Date.now() - startTime) / 1000).toFixed(2)}s.`
);
