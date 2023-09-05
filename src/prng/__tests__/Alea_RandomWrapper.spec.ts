import { NonEmptyArray } from "ts-essentials/dist/types";
import Alea, * as PRNG from "../Alea";

describe("RandomWrapper", () => {
  it("should generate random numbers with a range of 0", () => {
    const seed = PRNG.encode(PRNG.init("test"));

    const wrapper = Alea.fromEncoding(seed);

    expect([
      wrapper.randomInt(0),
      wrapper.randomInt(1, 1),
      wrapper.randomInt(2, 2),
      wrapper.randomInt(3, 3),
      wrapper.randomInt(4, 4),
    ]).toEqual([0, 1, 2, 3, 4]);
  });

  it("should generate random numbers determinstically", () => {
    const seed = PRNG.encode(PRNG.init("test"));

    const wrapper = Alea.fromEncoding(seed);

    expect([
      wrapper.randomInt(100),
      wrapper.randomInt(100),
      wrapper.randomInt(100),
      wrapper.randomInt(100),
      wrapper.randomInt(100),
    ]).toEqual([42, 78, 60, 67, 51]);
  });

  it("should split a seed should create diverging numbers immediately", () => {
    const max = 100;
    const cycles = 5;
    const duplicateLimit = 0;

    const seed1 = PRNG.init("test");
    const seed2 = PRNG.split(seed1);
    const wrapper1 = Alea.fromEncoding(PRNG.encode(seed1));
    const wrapper2 = Alea.fromEncoding(PRNG.encode(seed2));

    let duplicates;

    duplicates = 0;
    const wrapper1Numbers = new Set<number>();
    for (let i = 0; i < cycles; i++) {
      const wrapper1Number = wrapper1.randomInt(max);
      if (wrapper1Numbers.has(wrapper1Number)) {
        duplicates++;
      }
      wrapper1Numbers.add(wrapper1Number);
    }
    expect(duplicates).toBeLessThanOrEqual(duplicateLimit);

    duplicates = 0;
    for (let i = 0; i < cycles; i++) {
      const wrapper2Number = wrapper2.randomInt(max);
      if (wrapper1Numbers.has(wrapper2Number)) {
        duplicates++;
      }
    }
    expect(duplicates).toBeLessThanOrEqual(duplicateLimit);
  });

  it("should split a seed should create diverging numbers over many numbers", () => {
    const max = 10000;
    const cycles = 100;
    const duplicateLimit = 1;

    const seed1 = PRNG.init("test");
    const seed2 = PRNG.split(seed1);
    const wrapper1 = Alea.fromEncoding(PRNG.encode(seed1));
    const wrapper2 = Alea.fromEncoding(PRNG.encode(seed2));

    let duplicates;

    duplicates = 0;
    const wrapper1Numbers = new Set<number>();
    for (let i = 0; i < cycles; i++) {
      const wrapper1Number = wrapper1.randomInt(max);
      if (wrapper1Numbers.has(wrapper1Number)) {
        duplicates++;
      }
      wrapper1Numbers.add(wrapper1Number);
    }
    expect(duplicates).toBeLessThanOrEqual(duplicateLimit);

    duplicates = 0;
    for (let i = 0; i < cycles; i++) {
      const wrapper2Number = wrapper2.randomInt(max);
      if (wrapper1Numbers.has(wrapper2Number)) {
        duplicates++;
      }
    }
    expect(duplicates).toBeLessThanOrEqual(duplicateLimit);
  });

  it("should weighted pick one should handle one item collections", () => {
    const seed = PRNG.encode(PRNG.init("test"));
    const choices: NonEmptyArray<[number, string]> = [[1, "1"]];

    const wrapper = Alea.fromEncoding(seed);
    const pick = wrapper.weightedPickOne(choices);

    expect(pick).toEqual("1");
  });

  it("should weighted pick one should handle uniform item collections", () => {
    const seed = PRNG.encode(PRNG.init("test"));
    const choices: NonEmptyArray<[number, string]> = [
      [1, "1"],
      [1, "2"],
    ];

    const wrapper = Alea.fromEncoding(seed);
    const counts: Record<string, number> = {};

    for (let i = 0; i < 100; i++) {
      const pick = wrapper.weightedPickOne(choices);
      counts[pick] = (counts[pick] ?? 0) + 1;
    }

    expect(counts).toEqual({ "1": 57, "2": 43 });
  });

  it("should weighted pick one should handle biased item collections", () => {
    const seed = PRNG.encode(PRNG.init("test"));
    const choices: NonEmptyArray<[number, string]> = [
      [1, "1"],
      [10, "2"],
    ];

    const wrapper = Alea.fromEncoding(seed);
    const counts: Record<string, number> = {};

    for (let i = 0; i < 100; i++) {
      const pick = wrapper.weightedPickOne(choices);
      counts[pick] = (counts[pick] ?? 0) + 1;
    }

    expect(counts).toEqual({ "1": 90, "2": 10 });
  });

  it("should sample non uniquely should handle empty populations", () => {
    const seed = PRNG.encode(PRNG.init("test"));
    const population: Array<number> = [];

    const wrapper = Alea.fromEncoding(seed);
    const samples = wrapper.sampleNonUniquely(population, 4);

    expect(samples).toEqual([]);
  });

  it("should sample uniquely should handle empty populations", () => {
    const seed = PRNG.encode(PRNG.init("test"));
    const population: Array<number> = [];

    const wrapper = Alea.fromEncoding(seed);
    const samples = wrapper.sampleUniquely(population, 5);

    expect(samples).toEqual([]);
  });

  it("should sample non uniquely should generate duplicates", () => {
    const seed = PRNG.encode(PRNG.init("test"));
    const population = [0, 1, 2, 3, 4];

    const wrapper = Alea.fromEncoding(seed);
    const samples = wrapper.sampleNonUniquely(population, 4);

    expect(samples).toEqual([2, 3, 0, 2]);
  });

  it("should sample uniquely should not generate duplicates", () => {
    const seed = PRNG.encode(PRNG.init("test"));
    const population = [0, 1, 2, 3, 4];

    const wrapper = Alea.fromEncoding(seed);
    const samples = wrapper.sampleUniquely(population, 5);

    expect(samples).toEqual([2, 3, 0, 4, 1]);
  });

  it("should sample non uniquely should handle over population generation", () => {
    const seed = PRNG.encode(PRNG.init("test"));
    const population = [0, 1, 2, 3, 4];

    const wrapper = Alea.fromEncoding(seed);
    const samples = wrapper.sampleNonUniquely(population, 10);

    expect(samples).toEqual([2, 3, 0, 2, 1, 3, 0, 1, 0, 3]);
  });

  it("should sample uniquely should cap over population generation", () => {
    const seed = PRNG.encode(PRNG.init("test"));
    const population = [0, 1, 2, 3, 4];

    const wrapper = Alea.fromEncoding(seed);
    const samples = wrapper.sampleUniquely(population, 10);

    expect(samples).toEqual([2, 3, 0, 4, 1]);
  });

  it("should sample uniquely should cap over population generation", () => {
    const seed = PRNG.encode(PRNG.init("test"));
    const wrapper = Alea.fromEncoding(seed);
    const population = [0, 1, 2, 3, 4];

    const samples = wrapper.sampleUniquely(population, 10);

    expect(samples).toEqual([2, 3, 0, 4, 1]);
  });
});
