const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Set the project root explicitly
config.projectRoot = projectRoot;

// 2. Watch the monorepo root for changes (needed for @callo/shared)
config.watchFolders = [monorepoRoot];

// 3. Force Metro to resolve node_modules from project + monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// 4. Enable symlink support for pnpm
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
