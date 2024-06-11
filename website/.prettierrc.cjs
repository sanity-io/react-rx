const sanityConfig = require('@sanity/prettier-config')

console.log(sanityConfig)

module.exports = {
  ...sanityConfig,
  overrides: [
    ...sanityConfig.overrides,
    {
      files: [
        'src/examples/**/*.js',
        'src/examples/**/*.jsx',
        'src/examples/**/*.ts',
        'src/examples/**/*.tsx',
      ],
      options: {
        // Because the split view in Sandpack makes the space narrow we format the code accordingly
        printWidth: 50,
        tabWidth: 2,
        singleQuote: true,
        quoteProps: 'consistent',
        bracketSpacing: false,
      },
    },
  ],
}
