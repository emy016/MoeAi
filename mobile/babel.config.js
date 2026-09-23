// Standard Expo babel config. Add plugins here later if you introduce
// react-native-reanimated or other babel-dependent libraries.

/**
 * `import { PlusIcon } from 'react-native-heroicons/solid'` goes through the
 * package's barrel file, which pulls every Heroicon in that style (~300 each,
 * ~1,200 in total) into the bundle; Metro does not tree-shake them away. This
 * rewrites each named import to the icon's own file at build time, so the
 * source keeps the readable form and only the icons actually used ship.
 */
function heroiconsPerIcon({ types: t }) {
  const STYLE = /^react-native-heroicons\/(solid|outline|mini|micro)$/;
  return {
    name: 'heroicons-per-icon',
    visitor: {
      ImportDeclaration(path) {
        const match = STYLE.exec(path.node.source.value);
        if (!match) return;
        const specifiers = path.node.specifiers;
        if (!specifiers.length || !specifiers.every((s) => t.isImportSpecifier(s))) return;
        path.replaceWithMultiple(specifiers.map((specifier) => t.importDeclaration(
          [t.importDefaultSpecifier(t.identifier(specifier.local.name))],
          t.stringLiteral(`react-native-heroicons/${match[1]}/esm/${specifier.imported.name}`),
        )));
      },
    },
  };
}

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [heroiconsPerIcon],
  };
};
