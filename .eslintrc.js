module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint'],
  env: {
    node: true,
    es6: true
  },
  rules: {
    '@typescript-eslint/semi': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    'curly': 'warn',
    'eqeqeq': 'warn',
    'no-throw-literal': 'warn',
    'semi': 'off',
    'prefer-const': 'error',
    'no-var': 'error',
    'no-unused-vars': 'off'
  },
  ignorePatterns: ['out', 'dist', '**/*.d.ts', 'node_modules', '.vscode-test']
};