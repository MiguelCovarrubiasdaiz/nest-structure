module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'drizzle.config.ts'],
  rules: {
    '@typescript-eslint/no-explicit-any': 2,
    '@typescript-eslint/no-unused-vars': 2,
    '@typescript-eslint/lines-between-class-members': 2,
  },
};