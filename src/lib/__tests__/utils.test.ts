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
    ]).toEqual([54, 70, 72, 18, 40]);
  });

  it("splitting a seed should create diverging numbers", () => {
    const seed = RandomUtils.fixedSeed("test");
    const [seed1, seed2] = RandomUtils.splitSeed(seed);
    const wrapped1 = RandomUtils.wrap({ seed: seed1 });
    const wrapped2 = RandomUtils.wrap({ seed: seed2 });

    const wrapped1Numbers = [
      wrapped1.randomInt(1000),
      wrapped1.randomInt(1000),
      wrapped1.randomInt(1000),
      wrapped1.randomInt(1000),
      wrapped1.randomInt(1000),
    ];

    for (const _wrapped1Number of wrapped1Numbers) {
      expect(wrapped1Numbers).not.toContain(wrapped2.randomInt(1000));
    }
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

    expect(counts).toEqual({ "1": 47, "2": 53 });
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

    expect(counts).toEqual({ "1": 93, "2": 7 });
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

    expect(samples).toEqual([2, 3, 3, 0]);
  });

  it("sampling uniquely should not generate duplicates", () => {
    const seed = RandomUtils.fixedSeed("test");
    const population = [0, 1, 2, 3, 4];

    const [_newSeed, samples] = RandomUtils.sampleUniquely(seed, population, 5);

    expect(samples).toEqual([2, 3, 4, 1, 0]);
  });

  it("sampling non uniquely should handle over population generation", () => {
    const seed = RandomUtils.fixedSeed("test");
    const population = [0, 1, 2, 3, 4];

    const [_newSeed, samples] = RandomUtils.sampleNonUniquely(
      seed,
      population,
      10
    );

    expect(samples).toEqual([2, 3, 3, 0, 2, 3, 1, 1, 4, 2]);
  });

  it("sampling uniquely should cap over popultion generation", () => {
    const seed = RandomUtils.fixedSeed("test");
    const population = [0, 1, 2, 3, 4];

    const [_newSeed, samples] = RandomUtils.sampleUniquely(
      seed,
      population,
      10
    );

    expect(samples).toEqual([2, 3, 4, 1, 0]);
  });
});
