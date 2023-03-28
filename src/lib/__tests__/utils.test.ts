import RandomUtils from "lib/utils";
import { NonEmptyArray } from "ts-essentials/dist/types";

describe("RandomUtils", () => {
  it("should initSeed should generate distinct seeds", () => {
    const checks = 10;
    const seeds = new Set<string>([]);

    for (let i = 0; i < checks; i++) {
      seeds.add(RandomUtils.initSeed());
    }

    expect(seeds.size).toEqual(checks);
  });

  it("should generate random numbers with a range of 0", () => {
    const seed = RandomUtils.fixedSeed("test");
    const wrapped = RandomUtils.wrap({ seed: seed });

    expect([
      wrapped.randomInt(0),
      wrapped.randomInt(1, 1),
      wrapped.randomInt(2, 2),
      wrapped.randomInt(3, 3),
      wrapped.randomInt(4, 4),
    ]).toEqual([0, 1, 2, 3, 4]);
  });

  it("should generate random numbers determinstically", () => {
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

  it("should split a seed should create diverging numbers immediately", () => {
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

  it("should split a seed should create diverging numbers over many numbers", () => {
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

  it("should weighted pick one should handle one item collections", () => {
    const seed = RandomUtils.fixedSeed("test");
    const choices: NonEmptyArray<[number, string]> = [[1, "1"]];

    const [_newSeed, pick] = RandomUtils.weightedPickOne(seed, choices);

    expect(pick).toEqual("1");
  });

  it("should weighted pick one should handle uniform item collections", () => {
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

  it("should weighted pick one should handle biased item collections", () => {
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

  it("should sample non uniquely should handle empty populations", () => {
    const seed = RandomUtils.fixedSeed("test");
    const population: Array<number> = [];

    const [_newSeed, samples] = RandomUtils.sampleNonUniquely(
      seed,
      population,
      4
    );

    expect(samples).toEqual([]);
  });

  it("should sample uniquely should handle empty populations", () => {
    const seed = RandomUtils.fixedSeed("test");
    const population: Array<number> = [];

    const [_newSeed, samples] = RandomUtils.sampleUniquely(seed, population, 5);

    expect(samples).toEqual([]);
  });

  it("should sample non uniquely should generate duplicates", () => {
    const seed = RandomUtils.fixedSeed("test");
    const population = [0, 1, 2, 3, 4];

    const [_newSeed, samples] = RandomUtils.sampleNonUniquely(
      seed,
      population,
      4
    );

    expect(samples).toEqual([2, 3, 0, 2]);
  });

  it("should sample uniquely should not generate duplicates", () => {
    const seed = RandomUtils.fixedSeed("test");
    const population = [0, 1, 2, 3, 4];

    const [_newSeed, samples] = RandomUtils.sampleUniquely(seed, population, 5);

    expect(samples).toEqual([2, 3, 0, 4, 1]);
  });

  it("should sample non uniquely should handle over population generation", () => {
    const seed = RandomUtils.fixedSeed("test");
    const population = [0, 1, 2, 3, 4];

    const [_newSeed, samples] = RandomUtils.sampleNonUniquely(
      seed,
      population,
      10
    );

    expect(samples).toEqual([2, 3, 0, 2, 1, 3, 0, 1, 0, 3]);
  });

  it("should sample uniquely should cap over population generation", () => {
    const seed = RandomUtils.fixedSeed("test");
    const population = [0, 1, 2, 3, 4];

    const [_newSeed, samples] = RandomUtils.sampleUniquely(
      seed,
      population,
      10
    );

    expect(samples).toEqual([2, 3, 0, 4, 1]);
  });

  it("should sample uniquely should cap over population generation with wrapper", () => {
    const seed = RandomUtils.fixedSeed("test");
    const rng = RandomUtils.wrapper(seed);
    const population = [0, 1, 2, 3, 4];

    const samples = rng.sampleUniquely(population, 10);

    expect(samples).toEqual([2, 3, 0, 4, 1]);
  });
});
