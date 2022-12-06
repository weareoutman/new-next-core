import path from "node:path";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import webpack from "webpack";
import rimraf from "rimraf";
// import HtmlWebpackPlugin from "HtmlWebpackPlugin";

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

  const packageName = process.cwd().split(path.sep).pop();

  const packageJsonFile = await readFile(
    path.join(process.cwd(), "package.json"),
    { encoding: "utf-8" }
  );
  const packageJson = JSON.parse(packageJsonFile);

  const require = createRequire(import.meta.url);
  const elementPackageJsonPath = require.resolve(
    "@next-core/element/package.json",
    [process.cwd()]
  );
  const elementPackageJsonFile = await readFile(elementPackageJsonPath, {
    encoding: "utf-8",
  });
  const elementPackageJson = JSON.parse(elementPackageJsonFile);

  const shared = [
    {
      react: {
        singleton: true,
        version: "18.2.0",
        requiredVersion: "^18.0.0",
      },
      "react-dom": {
        singleton: true,
        version: "18.2.0",
        requiredVersion: "^18.0.0",
      },
    },
    {
      "@next-core/element": {
        singleton: true,
        version: elementPackageJson.version,
        requiredVersion: packageJson.dependencies?.["@next-core/element"],
      },
    },
  ];

  console.log(packageName, "shared:", shared);

  await new Promise((resolve, reject) => {
    webpack(
      {
        entry: {
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
          new ModuleFederationPlugin({
            name: packageName,
            filename: "remoteEntry.js",
            exposes:
              packageName === "basic"
                ? {
                    "./x-button": "./src/x-button",
                    "./y-button": "./src/y-button",
                  }
                : packageName === "form"
                ? {
                    "./f-input": "./src/f-input",
                    "./f-select": "./src/f-select",
                  }
                : undefined,
            shared,
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
