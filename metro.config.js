const { getDefaultConfig } = require("expo/metro-config");
const nodeLibs = require("node-libs-expo");

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  ...nodeLibs
};

module.exports = config;
