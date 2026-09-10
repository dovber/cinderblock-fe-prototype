import path from 'node:path'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

const srcRoot = path.resolve('src')
const boundaries = {
  meta: { type: 'problem', schema: [], messages: { boundary: 'Keep dependencies flowing app → prototypes → shared; prototypes must remain independent.' } },
  create(context) {
    function check(node) {
      const value = node.source?.value
      if (typeof value !== 'string' || !value.startsWith('.')) return
      const from = path.relative(srcRoot, context.filename).split(path.sep)
      const to = path.relative(srcRoot, path.resolve(path.dirname(context.filename), value)).split(path.sep)
      if (
        (from[0] === 'shared' && to[0] !== 'shared') ||
        (from[0] === 'prototypes' && !(to[0] === 'shared' || (to[0] === 'prototypes' && from[1] === to[1])))
      ) context.report({ node, messageId: 'boundary' })
    }
    return { ImportDeclaration: check, ExportNamedDeclaration: check, ExportAllDeclaration: check, ImportExpression: check }
  },
}

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'work/**', 'outputs/**'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh, architecture: { rules: { boundaries } } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'architecture/boundaries': 'error',
    },
  },
)
