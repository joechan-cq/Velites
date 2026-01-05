export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  testMatch: [
    '<rootDir>/server/test/**/*.test.ts'
  ],
  moduleFileExtensions: ['ts', 'js', 'json', 'node']
};