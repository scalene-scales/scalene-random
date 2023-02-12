import Alea, * as AleaUtils from "prng/Alea";

const SEEDS = {
  ii: {
    seed: "ii",
    random: [
      0.7371923720929772, 0.9694351863581687, 0.22013063845224679,
      0.31599166593514383, 0.4441180245485157,
    ],
  },
} as const;

test("Alea generates known random values for a fixed seed", () => {
  const seed = SEEDS.ii;

  const alea = new Alea(seed.seed);

  for (const random of seed.random) {
    expect(alea.random()).toBe(random);
  }
});

test("Alea can encode and decode deterministically", () => {
  const seed = SEEDS.ii;

  const initialState = AleaUtils.init(seed.seed);

  const encoding = AleaUtils.encode(initialState);
  expect(encoding).toBe("AAAAc4dE6z8AAABtLobtPwAAAHTMe6Q/AAAAAAAA8D8=");

  let state = AleaUtils.decode(encoding);
  expect(state).toEqual(initialState);

  state = AleaUtils.next(state);
  expect(AleaUtils.value(state)).toBe(seed.random[0]);

  state = AleaUtils.next(state);
  expect(AleaUtils.value(state)).toBe(seed.random[1]);

  state = AleaUtils.next(state);
  expect(AleaUtils.value(state)).toBe(seed.random[2]);
});
