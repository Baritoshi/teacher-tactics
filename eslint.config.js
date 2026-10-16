import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', '.local-tools/**'] },
  { files: ['src/**/*.{ts,tsx}', 'vite.config.ts'], extends: [js.configs.recommended, ...tseslint.configs.recommended],
    rules: { '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }] } },
);
