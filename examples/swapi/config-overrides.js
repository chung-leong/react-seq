module.exports = function override(config) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    url: false,
  };
  return config;
}
