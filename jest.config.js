module.exports = {
  preset: 'ts-jest',
  globals: {
    'ts-jest': {
      warnOnly: true,
    },
  },
  testEnvironment: 'jsdom',
  rootDir: 'src',
}
