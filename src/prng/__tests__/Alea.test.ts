import Alea, * as AleaUtils from "prng/Alea";

const SEEDS = {
  ii: {
    seed: "ii",
    random: [
      {
        value: 0.7371923720929772,
        encoding: "983b24da687331ec3ae63d0a01000000",
      },
      {
        value: 0.9694351863581687,
        encoding: "687331ec3ae63d0aa9a3b8bc2d321b00",
      },
      {
        value: 0.22013063845224679,
        encoding: "3ae63d0aa9a3b8bc85e72cf84f721d00",
      },
      {
        value: 0.31599166593514383,
        encoding: "a9a3b8bc85e72cf8457b5a38e0460100",
      },
      {
        value: 0.4441180245485157,
        encoding: "85e72cf8457b5a386fd4e45034871700",
      },
    ],
  },
} as const;

test("Alea generates known random values for a fixed seed", () => {
  const seed = SEEDS.ii;

  const alea = new Alea(seed.seed);

  for (const random of seed.random) {
    expect(alea.random()).toBe(random.value);
  }
});

test("Alea generates positive integer values", () => {
  const seed = SEEDS.ii;

  const alea = new Alea(seed.seed);

  for (let i = 0; i < 100; i++) {
    const value = alea.uint32();
    expect(Number.isSafeInteger(value)).toBe(true);
    expect(value > 0).toBe(true);
  }
});

test("Alea generates positive and negative integer values", () => {
  const seed = SEEDS.ii;

  const alea = new Alea(seed.seed);

  let hasPositive = false;
  let hasNegative = false;
  for (let i = 0; i < 100; i++) {
    const value = alea.int32();
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

test("Alea generates finite float values", () => {
  const seed = SEEDS.ii;

  const alea = new Alea(seed.seed);

  for (let i = 0; i < 100; i++) {
    const value = alea.random();
    expect(Number.isFinite(value)).toBe(true);
    expect(value < 1 && value >= 0).toBe(true);
  }
});

test("Alea generates finite double values", () => {
  const seed = SEEDS.ii;

  const alea = new Alea(seed.seed);

  for (let i = 0; i < 100; i++) {
    const value = alea.fract53();
    expect(Number.isFinite(value)).toBe(true);
    expect(value < 1 && value >= 0).toBe(true);
  }
});

test("Alea generates integers across a range", () => {
  const seed = SEEDS.ii;
  const max = 100;
  const cycles = 10 * max;

  const alea = new Alea(seed.seed);

  const randomInts = new Set<number>();
  for (let i = 0; i < cycles; i++) {
    randomInts.add(alea.range(max));
  }

  for (let i = 0; i < max; i++) {
    expect(randomInts.has(i)).toBe(true);
  }
});

test("Alea can encode and decode deterministically", () => {
  const seed = SEEDS.ii;

  const initialState = AleaUtils.init(seed.seed);

  let encoding;
  let state: [number, number, number, number] = [
    initialState[0],
    initialState[1],
    initialState[2],
    initialState[3],
  ];

  encoding = AleaUtils.encode(state);
  state = AleaUtils.decode(encoding);
  expect(state).toEqual(initialState);

  for (const random of seed.random) {
    expect(encoding).toBe(random.encoding);
    expect(AleaUtils.random(state)).toBe(random.value);

    encoding = AleaUtils.encode(state);
    state = AleaUtils.decode(encoding);
  }
});

test("Alea can encode and decode split seeds deterministically", () => {
  const seed = SEEDS.ii;

  const initialState = AleaUtils.init(seed.seed);

  const initialSplitState0: [number, number, number, number] = [
    initialState[0],
    initialState[1],
    initialState[2],
    initialState[3],
  ];
  const initialSplitState1 = AleaUtils.split(initialSplitState0);

  expect(initialSplitState0).toEqual([
    0.8289537315722555, 0.49225212121382356, 0.5809025198686868, 928934,
  ]);
  expect(initialSplitState1).toEqual([
    0.9167820902075619, 0.6466059554368258, 0.4091596105135977, 1150567468,
  ]);

  const encodedState0 = AleaUtils.encode(initialSplitState0);
  const decodedState0 = AleaUtils.decode(encodedState0);
  expect(decodedState0).toEqual([
    0.8289537315722555, 0.49225212121382356, 0.5809025198686868, 928934,
  ]);

  const encodedState1 = AleaUtils.encode(initialSplitState1);
  const decodedState1 = AleaUtils.decode(encodedState1);
  expect(decodedState1).toEqual([
    0.9167820902075619, 0.6466059554368258, 0.4091596105135977, 1150567468,
  ]);
});
