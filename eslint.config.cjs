// ESLint v9 flat config for TS + Vue 3 across the monorepo
// Docs: https://eslint.org/docs/latest/use/configure/migration-guide

// @eslint/js provides base JS recommended rules
const js = require('@eslint/js');
// Use the plugin + parser directly to avoid depending on the helper meta package
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
// Vue 3 plugin (flat configs available under 'flat/*')
const vue = require('eslint-plugin-vue');
const vueParser = require('vue-eslint-parser');

module.exports = [
  // Ignore common build and cache directories
  {
    ignores: [
      'node_modules/',
      'dist/',
      'out/',
      '**/.vite/',
      '**/.nuxt/',
      '**/.output/',
      '**/coverage/',
      // Ignore config files themselves
      'eslint.config.*',
      '.eslintrc.*',
      '**/*.config.js',
      '**/*.config.cjs',
      '**/*.config.mjs',
    ],
  },

  // Base JS recommended rules
  js.configs.recommended,

  // Vue 3 recommended (flat) for .vue SFCs
  ...vue.configs['flat/recommended'],

  // TypeScript for .ts/.tsx files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      // Type-aware: let TS handle globals/types like RequestInit, process, etc.
      'no-undef': 'off',
      // Do not fail CI on any usage; warn instead to allow incremental typing
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Enable TS parsing inside <script> blocks of Vue SFCs
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      // Inside <script lang="ts"> blocks, rely on TS for globals
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Project-wide rules
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/ban-ts-comment': 'warn',
    },
  },


];
