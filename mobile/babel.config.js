// Standard Expo babel config. Add plugins here later if you introduce
// react-native-reanimated or other babel-dependent libraries.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
