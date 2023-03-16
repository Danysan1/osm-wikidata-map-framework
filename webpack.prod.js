const { merge } = require("webpack-merge"); // https://webpack.js.org/guides/production/
const common = require("./webpack.common.js");

module.exports = merge(common, {
  mode: "production",
  devtool: "source-map",
});
