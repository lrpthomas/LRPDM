export let preset: string;
export let testEnvironment: string;
export let roots: string[];
export let testMatch: string[];
export let transform: {
    '^.+\\.(ts|tsx)$': string;
};
export let collectCoverageFrom: string[];
export let globals: {
    'ts-jest': {
        tsconfig: {
            strict: boolean;
            noImplicitAny: boolean;
        };
    };
};
export namespace coverageThreshold {
    namespace global {
        let branches: number;
        let functions: number;
        let lines: number;
        let statements: number;
    }
}
//# sourceMappingURL=jest.config.d.ts.map