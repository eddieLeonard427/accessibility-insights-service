module.exports = {
    clearMocks: true,
    globals: {
        'ts-jest': {
            tsConfig: '<rootDir>/tsconfig.json',
        },
    },
    moduleDirectories: ['node_modules'],
    moduleFileExtensions: ['ts', 'js'],
    testPathIgnorePatterns: [],
    // This ensures that failures in beforeAll/beforeEach result in dependent tests not trying to run.
    // See https://github.com/facebook/jest/issues/2713
    testRunner: 'jest-circus/runner',
    transform: {
        '^.+\\.(ts)$': 'ts-jest',
    },
    testMatch: ['**/*.spec.ts'],
    verbose: true,
    coverageDirectory: './test-results/unit/coverage',
    coverageReporters: ['json', 'lcov', 'text', 'cobertura'],
};
