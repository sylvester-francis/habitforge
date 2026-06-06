export default {
  testRunner: "vitest",
  reporters: ["progress", "clear-text", "html"],
  mutate: ["src/lib/**/*.ts", "!src/lib/**/*.test.ts"],
  coverageAnalysis: "perTest",
  thresholds: { high: 80, low: 60, break: null },
};
