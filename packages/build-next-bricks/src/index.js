import path from "node:path";
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
            // library: { type: "window", name: packageName },
            filename: "remoteEntry.js",
            // remotes: {
            //   // [packageName === "basic" ? "form" : "basic"]: `${
            //   //   packageName === "basic" ? "form" : "basic"
            //   // }@./bricks/${
            //   //   packageName === "basic" ? "form" : "basic"
            //   // }/dist/remoteEntry.js`
            //   // [packageName === "basic" ? "form" : "basic"]: packageName === "basic" ? "form" : "basic",
            //   basic: "basic",
            //   form: "form",
            // },
            exposes:
              packageName === "basic"
                ? {
                    "./x-button": "./src/x-button/index",
                    "./y-button": "./src/y-button/index",
                  }
                : packageName === "form"
                ? {
                    "./f-input": "./src/f-input/index",
                    "./f-select": "./src/f-select/index",
                  }
                : undefined,
            shared: [
              {
                react: {
                  import: "react",
                  singleton: true,
                  shareKey: "shared-react",
                  shareScope: "default",
                  version: "18.2.0",
                  requiredVersion: "^18.2.0",
                },
                "react-dom": {
                  import: "react-dom",
                  singleton: true,
                  shareKey: "shared-react-dom",
                  shareScope: "default",
                  version: "18.2.0",
                  requiredVersion: "^18.2.0",
                },
              },
              {
                "@next-core/element": {
                  singleton: true,
                  // import: '@next-core/element',
                  // requiredVersion: require('../shared-library/package.json').version,
                },
              },
            ],
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
