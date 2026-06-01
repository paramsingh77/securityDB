import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    ignores: ['client/dist/**', 'node_modules/**'],
  },
  {
    files: ['client/src/**/*.{js,jsx}', 'server/src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        console: 'readonly',
        clearTimeout: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
        Headers: 'readonly',
        process: 'readonly',
        setInterval: 'readonly',
        setTimeout: 'readonly',
        URLSearchParams: 'readonly',
        window: 'readonly',
      },
    },
  },
  {
    files: ['client/src/**/*.js', 'server/src/**/*.js'],
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['client/src/**/*.jsx'],
    rules: {
      'no-unused-vars': 'off',
    },
  },
];
