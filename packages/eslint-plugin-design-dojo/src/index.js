'use strict';

/**
 * ESLint plugin enforcing @plures/design-dojo component adoption.
 *
 * Rules:
 *  - no-local-primitives: disallow raw HTML primitive elements in Svelte templates;
 *    use design-dojo components (Button, Input, Select, etc.) instead.
 *  - prefer-design-dojo-imports: warn when design-dojo components are imported
 *    from local paths instead of from '@plures/design-dojo'.
 */

// Primitive HTML tags that have design-dojo equivalents
const PRIMITIVE_TAG_MAP = {
  button: 'Button',
  input: 'Input',
  select: 'Select',
  textarea: 'Input',
};

// Design-dojo components that should not be imported locally
const DESIGN_DOJO_COMPONENTS = new Set([
  'Button', 'Input', 'Select', 'Card', 'Badge',
  'Alert', 'EmptyState', 'Toggle', 'Toast', 'Dialog', 'Tooltip',
]);

/** @type {import('eslint').Rule.RuleModule} */
const noLocalPrimitives = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow raw HTML primitive elements; use @plures/design-dojo components instead.',
      recommended: true,
    },
    schema: [],
    messages: {
      useDesignDojo:
        'Use the <{{ component }}> component from @plures/design-dojo instead of a raw <{{ tag }}> element.',
    },
  },
  create(context) {
    return {
      // svelte-eslint-parser exposes SvelteElement nodes for HTML elements
      SvelteElement(node) {
        const tagName =
          node.name && typeof node.name === 'string'
            ? node.name
            : node.name && node.name.name;
        if (!tagName) {return;}
        const component = PRIMITIVE_TAG_MAP[tagName];
        if (component) {
          context.report({
            node,
            messageId: 'useDesignDojo',
            data: { component, tag: tagName },
          });
        }
      },
    };
  },
};

/** @type {import('eslint').Rule.RuleModule} */
const preferDesignDojoImports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer importing design-dojo components from @plures/design-dojo rather than local paths.',
      recommended: false,
    },
    schema: [],
    messages: {
      preferPackageImport:
        "'{{ name }}' should be imported from '@plures/design-dojo', not from a local path.",
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        // Only flag local imports (relative paths), not the package itself
        if (typeof source !== 'string' || source.startsWith('@plures/design-dojo')) {return;}
        if (!source.startsWith('.')) {return;}

        for (const specifier of node.specifiers) {
          const name =
            specifier.type === 'ImportDefaultSpecifier'
              ? specifier.local.name
              : specifier.type === 'ImportSpecifier'
              ? specifier.imported.name
              : null;
          if (name && DESIGN_DOJO_COMPONENTS.has(name)) {
            context.report({
              node,
              messageId: 'preferPackageImport',
              data: { name },
            });
          }
        }
      },
    };
  },
};

module.exports = {
  rules: {
    'no-local-primitives': noLocalPrimitives,
    'prefer-design-dojo-imports': preferDesignDojoImports,
  },
};
