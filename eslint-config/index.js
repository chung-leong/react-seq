module.exports = {
  rules: {
    'react-hooks/exhaustive-deps': [
      'warn',
      {
        additionalHooks: "use(Progressive(State)?|Sequential(State)?)"
      }
    ]
  }
};
