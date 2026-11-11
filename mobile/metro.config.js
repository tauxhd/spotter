// Let the app import the web app's shared, platform-free logic from ../src/lib (maths, data, workout helpers, 3D body),
// so the phone and the website always compute PRs, volume and strength levels the same way.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, "../src/lib")];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")];
config.resolver.assetExts.push("glb"); // the 3D muscle model
module.exports = config;
