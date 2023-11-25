const path = require("path");

module.exports = {
  target: "node",
  entry: path.resolve(__dirname, "src", "loadRelatedEntities.ts"),
  module: {
    rules: [
      {
        test: /\.s(par)?ql$/,
        type: 'asset/source',
        exclude: /node_modules/,
      },
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  optimization: {
    usedExports: true,
  },
  output: {
    path: path.resolve(__dirname, "public", "dist", "loadRelated"),
    filename: "[name].js"
  },
  mode: "development",
};
