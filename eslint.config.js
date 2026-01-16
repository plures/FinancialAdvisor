import js from '@eslint/js';
import typescriptParser from '@typescript-eslint/parser';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import sveltePlugin from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module'
      },
      globals: {
        ...globals.node,
        ...globals.es2020
      }
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin
    },
    rules: {
      'curly': 'warn',
      'eqeqeq': 'warn',
      'no-throw-literal': 'warn',
      'semi': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off'
    }
  },
  {
    files: ['**/*.svelte'],
    plugins: {
      svelte: sveltePlugin
    },
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: typescriptParser,
        ecmaVersion: 2020,
        sourceType: 'module'
      },
      globals: {
        ...globals.browser,
        ...globals.es2020
      }
    },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off'
    }
  },
  {
    files: ['src/lib/pluresdb/store.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2020
      }
    }
  },
  {
    ignores: [
      'out/**',
      'dist/**',
      '**/*.d.ts',
      'node_modules/**',
      '.vscode-test/**',
      'build/**',
      '.svelte-kit/**'
    ]
  }
];
