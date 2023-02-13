import Alea, * as AleaUtils from "prng/Alea";

const SEEDS = {
  ii: {
    seed: "ii",
    random: [
      { value: 0.7371923720929772, encoding: "mDsk2mhzMew65j0KAQAAAA==" },
      { value: 0.9694351863581687, encoding: "aHMx7DrmPQqpo7i8LTIbAA==" },
      { value: 0.22013063845224679, encoding: "OuY9CqmjuLyF5yz4T3IdAA==" },
      { value: 0.31599166593514383, encoding: "qaO4vIXnLPhFe1o44EYBAA==" },
      { value: 0.4441180245485157, encoding: "hecs+EV7Wjhv1ORQNIcXAA==" },
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

test("Alea generates finate double values", () => {
  const seed = SEEDS.ii;

  const alea = new Alea(seed.seed);

  for (let i = 0; i < 100; i++) {
    const value = alea.fract53();
    expect(Number.isFinite(value)).toBe(true);
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
  let state = initialState;

  encoding = AleaUtils.encode(state);
  state = AleaUtils.decode(encoding);
  expect(state).toEqual(initialState);

  for (const random of seed.random) {
    expect(encoding).toBe(random.encoding);
    state = AleaUtils.next(state);
    expect(AleaUtils.value(state)).toBe(random.value);

    encoding = AleaUtils.encode(state);
    state = AleaUtils.decode(encoding);
  }
});

test("Alea can encode and decode split seeds deterministically", () => {
  const seed = SEEDS.ii;

  const initialState = AleaUtils.init(seed.seed);
  const [initialSplitState0, initialSplitState1] =
    AleaUtils.split(initialState);

  let encoding;
  let state0 = initialSplitState0;
  let state1 = initialSplitState1;

  encoding = AleaUtils.encode(state0);
  state0 = AleaUtils.decode(encoding);
  expect(state0).toEqual(initialSplitState0);

  encoding = AleaUtils.encode(state1);
  state1 = AleaUtils.decode(encoding);
  expect(state1).toEqual(initialSplitState1);
});
