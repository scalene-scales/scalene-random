import RandomUtils from "lib/utils";
import { NonEmptyArray } from "ts-essentials";

describe("RandomUtils should", () => {
  it("initSeed should generate distinct seeds", () => {
    const checks = 10;
    const seeds = new Set<string>([]);

    for (let i = 0; i < checks; i++) {
      seeds.add(RandomUtils.initSeed());
    }

    expect(seeds.size).toEqual(checks);
  });

  it("generate random numbers determinstically", () => {
    const seed = RandomUtils.fixedSeed("test");
    const wrapped = RandomUtils.wrap({ seed: seed });

    expect([
      wrapped.randomInt(100),
      wrapped.randomInt(100),
      wrapped.randomInt(100),
      wrapped.randomInt(100),
      wrapped.randomInt(100),
    ]).toEqual([42, 78, 60, 67, 51]);
  });

  it("splitting a seed should create diverging numbers immediately", () => {
    const max = 100;
    const cycles = 5;
    const duplicateLimit = 0;

    const seed = RandomUtils.fixedSeed("test");
    const [seed1, seed2] = RandomUtils.splitSeed(seed);
    const wrapped1 = RandomUtils.wrap({ seed: seed1 });
    const wrapped2 = RandomUtils.wrap({ seed: seed2 });

    let duplicates;

    duplicates = 0;
    const wrapped1Numbers = new Set<number>();
    for (let i = 0; i < cycles; i++) {
      const wrapped1Number = wrapped1.randomInt(max);
      if (wrapped1Numbers.has(wrapped1Number)) {
        duplicates++;
      }
      wrapped1Numbers.add(wrapped1Number);
    }
    expect(duplicates).toBeLessThanOrEqual(duplicateLimit);

    duplicates = 0;
    for (let i = 0; i < cycles; i++) {
      const wrapped2Number = wrapped2.randomInt(max);
      if (wrapped1Numbers.has(wrapped2Number)) {
        duplicates++;
      }
    }
    expect(duplicates).toBeLessThanOrEqual(duplicateLimit);
  });

  it("splitting a seed should create diverging numbers over many numbers", () => {
    const max = 10000;
    const cycles = 100;
    const duplicateLimit = 1;

    const seed = RandomUtils.fixedSeed("test");
    const [seed1, seed2] = RandomUtils.splitSeed(seed);
    const wrapped1 = RandomUtils.wrap({ seed: seed1 });
    const wrapped2 = RandomUtils.wrap({ seed: seed2 });

    let duplicates;

    duplicates = 0;
    const wrapped1Numbers = new Set<number>();
    for (let i = 0; i < cycles; i++) {
      const wrapped1Number = wrapped1.randomInt(max);
      if (wrapped1Numbers.has(wrapped1Number)) {
        duplicates++;
      }
      wrapped1Numbers.add(wrapped1Number);
    }
    expect(duplicates).toBeLessThanOrEqual(duplicateLimit);

    duplicates = 0;
    for (let i = 0; i < cycles; i++) {
      const wrapped2Number = wrapped2.randomInt(max);
      if (wrapped1Numbers.has(wrapped2Number)) {
        duplicates++;
      }
    }
    expect(duplicates).toBeLessThanOrEqual(duplicateLimit);
  });

  it("weighted pick one should handle one item collections", () => {
    const seed = RandomUtils.fixedSeed("test");
    const choices: NonEmptyArray<[number, string]> = [[1, "1"]];

    const [_newSeed, pick] = RandomUtils.weightedPickOne(seed, choices);

    expect(pick).toEqual("1");
  });

  it("weighted pick one should handle uniform item collections", () => {
    const seed = RandomUtils.fixedSeed("test");
    const choices: NonEmptyArray<[number, string]> = [
      [1, "1"],
      [1, "2"],
    ];

    const wrapper = RandomUtils.wrapper(seed);
    const counts: Record<string, number> = {};

    for (let i = 0; i < 100; i++) {
      const pick = wrapper.weightedPickOne(choices);
      counts[pick] = (counts[pick] ?? 0) + 1;
    }

    expect(counts).toEqual({ "1": 57, "2": 43 });
  });

  it("weighted pick one should handle biased item collections", () => {
    const seed = RandomUtils.fixedSeed("test");
    const choices: NonEmptyArray<[number, string]> = [
      [1, "1"],
      [10, "2"],
    ];

    const wrapper = RandomUtils.wrapper(seed);
    const counts: Record<string, number> = {};

    for (let i = 0; i < 100; i++) {
      const pick = wrapper.weightedPickOne(choices);
      counts[pick] = (counts[pick] ?? 0) + 1;
    }

    expect(counts).toEqual({ "1": 90, "2": 10 });
  });

  it("sampling non uniquely should handle empty populations", () => {
    const seed = RandomUtils.fixedSeed("test");
    const population: Array<number> = [];

    const [_newSeed, samples] = RandomUtils.sampleNonUniquely(
      seed,
      population,
      4
    );

    expect(samples).toEqual([]);
  });

  it("sampling uniquely should handle empty populations", () => {
    const seed = RandomUtils.fixedSeed("test");
    const population: Array<number> = [];

    const [_newSeed, samples] = RandomUtils.sampleUniquely(seed, population, 5);

    expect(samples).toEqual([]);
  });

  it("sampling non uniquely should generate duplicates", () => {
    const seed = RandomUtils.fixedSeed("test");
    const population = [0, 1, 2, 3, 4];

    const [_newSeed, samples] = RandomUtils.sampleNonUniquely(
      seed,
      population,
      4
    );

    expect(samples).toEqual([2, 3, 0, 2]);
  });

  it("sampling uniquely should not generate duplicates", () => {
    const seed = RandomUtils.fixedSeed("test");
    const population = [0, 1, 2, 3, 4];

    const [_newSeed, samples] = RandomUtils.sampleUniquely(seed, population, 5);

    expect(samples).toEqual([2, 3, 0, 4, 1]);
  });

  it("sampling non uniquely should handle over population generation", () => {
    const seed = RandomUtils.fixedSeed("test");
    const population = [0, 1, 2, 3, 4];

    const [_newSeed, samples] = RandomUtils.sampleNonUniquely(
      seed,
      population,
      10
    );

    expect(samples).toEqual([2, 3, 0, 2, 1, 3, 0, 1, 0, 3]);
  });

  it("sampling uniquely should cap over popultion generation", () => {
    const seed = RandomUtils.fixedSeed("test");
    const population = [0, 1, 2, 3, 4];

    const [_newSeed, samples] = RandomUtils.sampleUniquely(
      seed,
      population,
      10
    );

    expect(samples).toEqual([2, 3, 0, 4, 1]);
  });
});
