import PCG32, * as PCG32Utils from "prng/PCG32";

const SEEDS = {
  ii: {
    seed: "ii",
    random: [
      {
        value: 2967722637,
        encoding: "e2806ab3d20baea70f00000000000000",
      },
      {
        value: 2413344349,
        encoding: "c9c5327b05b66dc40f00000000000000",
      },
      {
        value: 772216574,
        encoding: "647b08a2aed6623f0f00000000000000",
      },
      {
        value: 1878044186,
        encoding: "a34ce8313a335cf40f00000000000000",
      },
      {
        value: 282466764,
        encoding: "b655b90299b7c23f0f00000000000000",
      },
    ],
  },
} as const;

// Workaround for https://github.com/facebook/jest/issues/11617.
function stringify(arr: ReadonlyArray<bigint>): Array<string> {
  return arr.map((item) => item.toString());
}

function expectEqualBigintArrays(
  received: ReadonlyArray<bigint>,
  expected: ReadonlyArray<bigint>
) {
  expect(stringify(received)).toEqual(stringify(expected));
}

test("PCG32 generates known random values for a fixed seed", () => {
  const seed = SEEDS.ii;

  const pcg32 = new PCG32(seed.seed);

  for (const random of seed.random) {
    expect(pcg32.uint32()).toBe(random.value);
  }
});

test("PCG32 generates positive integer values", () => {
  const seed = SEEDS.ii;

  const pcg32 = new PCG32(seed.seed);

  for (let i = 0; i < 100; i++) {
    const value = pcg32.uint32();
    expect(Number.isSafeInteger(value)).toBe(true);
    expect(value > 0).toBe(true);
  }
});

test("PCG32 generates positive and negative integer values", () => {
  const seed = SEEDS.ii;

  const pcg32 = new PCG32(seed.seed);

  let hasPositive = false;
  let hasNegative = false;
  for (let i = 0; i < 100; i++) {
    const value = pcg32.int32();
    expect(Number.isSafeInteger(value)).toBe(true);
    if (value > 0) {
      hasPositive = true;
    }
    if (value < 0) {
      hasNegative = true;
    }
  }
  expect(hasNegative).toBe(true);
  expect(hasPositive).toBe(true);
});

test("PCG32 generates finite float values", () => {
  const seed = SEEDS.ii;

  const pcg32 = new PCG32(seed.seed);

  for (let i = 0; i < 100; i++) {
    const value = pcg32.random();
    expect(Number.isFinite(value)).toBe(true);
    expect(value < 1 && value >= 0).toBe(true);
  }
});

test("PCG32 generates finite double values", () => {
  const seed = SEEDS.ii;

  const pcg32 = new PCG32(seed.seed);

  for (let i = 0; i < 100; i++) {
    const value = pcg32.fract53();
    expect(Number.isFinite(value)).toBe(true);
    expect(value < 1 && value >= 0).toBe(true);
  }
});

test("PCG32 generates integers across a range", () => {
  const seed = SEEDS.ii;
  const max = 100;
  const cycles = 10 * max;

  const pcg32 = new PCG32(seed.seed);

  const randomInts = new Set<number>();
  for (let i = 0; i < cycles; i++) {
    randomInts.add(pcg32.range(max));
  }

  for (let i = 0; i < max; i++) {
    expect(randomInts.has(i)).toBe(true);
  }
});

test("PCG32 generates integers with a range of 0", () => {
  const seed = SEEDS.ii;

  const alea = new PCG32(seed.seed);

  expect(alea.range(0)).toBe(0);
});

test("PCG32 can encode and decode deterministically", () => {
  const seed = SEEDS.ii;

  const initialState = PCG32Utils.init(seed.seed);

  let encoding;
  let state: [bigint, bigint] = [initialState[0], initialState[1]];

  encoding = PCG32Utils.encode(state);
  state = PCG32Utils.decode(encoding);
  expectEqualBigintArrays(state, initialState);

  for (const random of seed.random) {
    expect(encoding).toBe(random.encoding);
    expect(PCG32Utils.uint32(state)).toBe(random.value);

    encoding = PCG32Utils.encode(state);
    state = PCG32Utils.decode(encoding);
  }
});

test("PCG32 can encode and decode split seeds deterministically", () => {
  const seed = SEEDS.ii;

  const initialState = PCG32Utils.init(seed.seed);

  const initialSplitState0: [bigint, bigint] = [
    initialState[0],
    initialState[1],
  ];
  const initialSplitState1 = PCG32Utils.split(initialSplitState0);

  expectEqualBigintArrays(initialSplitState0, [4594436437674907062n, 15n]);
  expectEqualBigintArrays(initialSplitState1, [
    8066138360085157630n,
    10365235055909132941n,
  ]);

  const encodedState0 = PCG32Utils.encode(initialSplitState0);
  const decodedState0 = PCG32Utils.decode(encodedState0);
  expectEqualBigintArrays(decodedState0, [4594436437674907062n, 15n]);

  const encodedState1 = PCG32Utils.encode(initialSplitState1);
  const decodedState1 = PCG32Utils.decode(encodedState1);
  expectEqualBigintArrays(decodedState1, [
    8066138360085157630n,
    10365235055909132941n,
  ]);
});
