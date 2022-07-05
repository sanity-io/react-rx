export default {
  preset: 'ts-jest',
  // verbose: true,
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost/',
  },
  globals: {
    'ts-jest': {
      warnOnly: true,
    },
  },
  rootDir: 'src',
}
