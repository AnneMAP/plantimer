const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for native modules
config.resolver.sourceExts = ['js', 'jsx', 'json', 'ts', 'tsx', 'cjs', 'mjs'];

// Watch additional directories for changes
config.watchFolders = [
  __dirname,
  ...config.watchFolders || []
];

module.exports = config;
