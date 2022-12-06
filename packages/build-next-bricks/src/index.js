import path from "node:path";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import webpack from "webpack";
import rimraf from "rimraf";
// import HtmlWebpackPlugin from "HtmlWebpackPlugin";

const { SourceMapDevToolPlugin } = webpack;
const { ModuleFederationPlugin } = webpack.container;

const startTime = Date.now();

try {
  const outputPath = path.join(process.cwd(), "dist");
  const isDevelopment = process.env.NODE_ENV === "development";

  await new Promise((resolve, reject) => {
    rimraf(outputPath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });

  // const packageName = process.cwd().split(path.sep).pop();

  const packageJsonFile = await readFile(
    path.join(process.cwd(), "package.json"),
    { encoding: "utf-8" }
  );
  const packageJson = JSON.parse(packageJsonFile);
  const packageName = packageJson.name.split("/").pop();
  const libName = `bricks/${packageName}`;

  const require = createRequire(import.meta.url);

  const sharedPackages = ["react", "react-dom", "@next-core/element"];

  const shared = Object.fromEntries(
    await Promise.all(
      sharedPackages.map(async (dep) => {
        const depPackageJsonPath = require.resolve(`${dep}/package.json`, {
          paths: [process.cwd()],
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
        devtool: false,
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
        plugins: [
          new SourceMapDevToolPlugin({
            filename: "[file].map",
            exclude: ["polyfill", "316", "784"],
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
