module.exports = {
  extends: 'airbnb-base',
  rules: {
    'no-use-before-define': 'off',
    'no-console': 'off',
  },
  plugins: ['import'],
  globals: {
    console: true,
  },
};
