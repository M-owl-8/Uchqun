module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: ['eslint:recommended', 'plugin:security/recommended-legacy'],
  plugins: ['security'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  ignorePatterns: ['scripts/', 'node_modules/'],
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    // These security rules produce too many false positives on legitimate patterns
    'security/detect-object-injection': 'off',
    'security/detect-non-literal-fs-filename': 'off',
    'security/detect-non-literal-require': 'off',
  },
  overrides: [
    {
      // Config and migration files legitimately use console for startup logging
      files: ['config/**/*.js', 'migrations/**/*.js'],
      rules: { 'no-console': 'off' },
    },
    {
      // Tests: unused imports are common when mocking modules
      files: ['__tests__/**/*.js'],
      rules: { 'no-unused-vars': 'off' },
    },
    {
      // Migrations: Sequelize passes (queryInterface, Sequelize) but Sequelize is rarely used
      files: ['migrations/**/*.js'],
      rules: { 'no-unused-vars': 'off' },
    },
  ],
};
