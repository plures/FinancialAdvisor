import js from '@eslint/js';
import typescriptParser from '@typescript-eslint/parser';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import sveltePlugin from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import globals from 'globals';
import designDojoPlugin from '@plures/eslint-plugin-design-dojo';

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
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'error'
    }
  },
  {
    files: ['**/*.svelte'],
    plugins: {
      svelte: sveltePlugin,
      'design-dojo': designDojoPlugin,
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
      'no-undef': 'off',
      'design-dojo/no-local-primitives': 'error',
      'design-dojo/prefer-design-dojo-imports': 'warn',
    }
  },
  {
    // The design-dojo package itself defines the primitive components, so the
    // no-local-primitives rule must not apply to its own source files.
    files: ['packages/design-dojo/src/**/*.svelte'],
    rules: {
      'design-dojo/no-local-primitives': 'off',
      'design-dojo/prefer-design-dojo-imports': 'off',
    }
  },
  {
    // design-dojo motion helpers run in a browser context.
    files: ['packages/design-dojo/src/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2020
      }
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
    files: ['test/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.mocha
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
