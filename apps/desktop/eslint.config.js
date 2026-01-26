import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import i18next from 'eslint-plugin-i18next';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        localStorage: 'readonly',
        navigator: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        Event: 'readonly',
        KeyboardEvent: 'readonly',
        MouseEvent: 'readonly',
        FormData: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        AbortController: 'readonly',
        Blob: 'readonly',
        FileReader: 'readonly',
        crypto: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        module: 'readonly',
        require: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react': react,
      'react-hooks': reactHooks,
      'i18next': i18next,
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',

      // React rules
      'react/react-in-jsx-scope': 'off', // Not needed in React 17+
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // i18next rules - detect hardcoded strings that should be translated
      'i18next/no-literal-string': ['warn', {
        mode: 'jsx-text-only',
        'jsx-attributes': {
          include: ['placeholder', 'title', 'alt', 'aria-label'],
          exclude: ['className', 'styleName', 'type', 'id', 'name', 'data-testid', 'key', 'href', 'src', 'to', 'role'],
        },
        // Allow certain patterns that don't need translation
        ignoreAllowedTypes: true,
        allowedStrings: [
          // Common non-translatable strings
          '',
          ' ',
          '.',
          ',',
          ':',
          ';',
          '-',
          '|',
          '/',
          '\\',
          '(',
          ')',
          '[',
          ']',
          '{',
          '}',
          '<',
          '>',
          '&',
          '*',
          '#',
          '@',
          '!',
          '?',
          '+',
          '=',
          '%',
          '$',
          '^',
          '~',
          '`',
          '"',
          "'",
          // Technical strings
          'px',
          'em',
          'rem',
          '%',
          'vh',
          'vw',
          'auto',
          'none',
          'inherit',
          'initial',
          // Common component names
          'div',
          'span',
          'button',
          'input',
        ],
        // Ignore strings that match these patterns
        ignorePatterns: [
          // URLs, paths, technical identifiers
          '^https?://',
          '^/',
          '^\\./',
          '^#',
          // CSS classes and similar
          '^[a-z]+(-[a-z]+)*$', // kebab-case identifiers
          // Version numbers, IDs
          '^v?\\d+(\\.\\d+)*$',
          // Template variables
          '\\{\\{.*\\}\\}',
        ],
      }],

      // Disable base ESLint rule that conflicts with TypeScript
      'no-unused-vars': 'off',
      'no-undef': 'off', // TypeScript handles this
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    // Ignore patterns
    ignores: [
      'dist/**',
      'node_modules/**',
      'src-tauri/**',
      'mastra/**',
      '*.config.js',
      '*.config.ts',
      'vite.config.ts',
      'tailwind.config.js',
      'postcss.config.js',
    ],
  },
];
