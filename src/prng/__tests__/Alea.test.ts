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
