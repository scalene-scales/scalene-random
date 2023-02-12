import * as AleaUtils from "prng/Alea";
import { NonEmptyArray } from "ts-essentials";

type TAleaEncodedState = string & { __type: "AleaEncodedState" };
type TAleaState = [s0: number, s1: number, s2: number, c: number];

// TODO: Figure out how to make these global types.
type TInitialSeed = string & { __id: "InitialSeed" };
type TNextSeed = (string & { __id: "NextSeed" }) | TInitialSeed;
type TSplitSeed = (string & { __id: "SplitSeed" }) | TInitialSeed;
type TSeed = TNextSeed | TSplitSeed;

type TBase100Probability = number & { __type: "Base100Probability" };

function decode(seed: TSeed): TAleaState {
  return AleaUtils.decode(seed as unknown as TAleaEncodedState);
}

function encodeNextSeed(aleaState: TAleaState): TNextSeed {
  return AleaUtils.encode(aleaState) as unknown as TNextSeed;
}

function encodeSplitSeed(aleaState: TAleaState): TSplitSeed {
  return AleaUtils.encode(aleaState) as unknown as TSplitSeed;
}

function initSeed(): TInitialSeed {
  return AleaUtils.encode(
    AleaUtils.init(crypto.randomUUID())
  ) as unknown as TInitialSeed;
}

function fixedSeed(name: string): TInitialSeed {
  return AleaUtils.encode(AleaUtils.init(name)) as unknown as TInitialSeed;
}

function splitSeed(seed: TSeed): [TNextSeed, TSplitSeed] {
  const alea = decode(seed);
  const [nextAlea, splitAlea] = AleaUtils.split(alea);

  return [encodeNextSeed(nextAlea), encodeSplitSeed(splitAlea)];
}

function splitWrappedSeed<T extends { seed: TSeed }>(wraper: T): TSplitSeed {
  const [nextSeedValue, splitSeedValue] = splitSeed(wraper.seed);
  wraper.seed = nextSeedValue;
  return splitSeedValue;
}

function nextSeed(seed: TSeed): TNextSeed {
  const alea = decode(seed);
  const nextAlea = AleaUtils.next(alea);

  return encodeNextSeed(nextAlea);
}

function randomInt(
  seed: TSeed,
  maxValue: number,
  minValue: number = 0
): [TNextSeed, number] {
  const alea = decode(seed);
  const [nextAlea, intValue] = AleaUtils.range(alea, maxValue, minValue);

  return [encodeNextSeed(nextAlea), intValue];
}

function shuffle<T>(seed: TSeed, deck: Array<T>): TNextSeed {
  let currentSeed = seed;

  // https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle#The_modern_algorithm
  for (let i = 0; i < deck.length - 1; i++) {
    const [newSeed, swapIndex] = randomInt(currentSeed, deck.length, i);
    currentSeed = newSeed;

    const temp = deck[i]!;
    deck[i] = deck[swapIndex]!;
    deck[swapIndex] = temp;
  }

  return nextSeed(seed);
}

function pickOne<T>(
  seed: TSeed,
  choices: Readonly<NonEmptyArray<T>>
): [TNextSeed, T] {
  const [newSeed, pickIndex] = randomInt(seed, choices.length);
  return [newSeed, choices[pickIndex]!];
}

function weightedPickOne<T>(
  seed: TSeed,
  choices: Readonly<NonEmptyArray<[number, T]>>
): [TNextSeed, T] {
  let total = 0;
  for (const choice of choices) {
    total += choice[0];
  }

  const [newSeed, pickTotal] = randomInt(seed, Math.ceil(total));

  total = 0;
  for (const choice of choices) {
    if (total >= pickTotal) {
      return [newSeed, choice[1]];
    }
    total += choice[0];
  }

  // Note, for non integer weights this probably biases toward the beginning.
  return [newSeed, choices[0]![1]];
}

function sampleNonUniquely<T>(
  seed: TSeed,
  population: ReadonlyArray<T>,
  n: number
): [TNextSeed, Array<T>] {
  if (population.length < 1) {
    return [seed as TNextSeed, []];
  }
  let currentSeed = seed;

  const samples: Array<T> = [];
  for (let i = 0; i < n; i++) {
    const [newSeed, sampleIndex] = randomInt(currentSeed, population.length);
    currentSeed = newSeed;

    samples.push(population[sampleIndex]!);
  }

  return [nextSeed(currentSeed), samples];
}

function* sampleUniquelyGenerator<T>(
  seed: TSeed,
  population: ReadonlyArray<T>
): Generator<[TSeed, T], TNextSeed, TSeed> {
  let currentSeed = seed;

  const rawSamples: { [index: number]: T } = {};
  for (let i = 0; i < population.length; i++) {
    const [newSeed, sampleIndex] = randomInt(currentSeed, population.length, i);

    const temp = i in rawSamples ? rawSamples[i]! : population[i]!;
    rawSamples[i] =
      sampleIndex in rawSamples
        ? rawSamples[sampleIndex]!
        : population[sampleIndex]!;
    rawSamples[sampleIndex] = temp;

    currentSeed = yield [
      newSeed,
      i in rawSamples ? rawSamples[i]! : population[i]!,
    ];
  }

  return nextSeed(currentSeed);
}

function sampleUniquely<T>(
  seed: TSeed,
  population: ReadonlyArray<T>,
  n: number
): [TNextSeed, Array<T>] {
  let currentSeed = seed;

  const generator = sampleUniquelyGenerator(currentSeed, population);
  const samples: Array<T> = [];
  for (let i = 0; i < n; i++) {
    const next = generator.next(currentSeed);
    if (!next.done) {
      const [newSeed, sample] = next.value;
      samples.push(sample);
      currentSeed = newSeed;
    } else {
      return [nextSeed(currentSeed), samples];
    }
  }

  return [nextSeed(currentSeed), samples];
}

class Wrapper<T extends { seed: TSeed }> {
  #wrapped: T;

  constructor(wrapped: T) {
    this.#wrapped = wrapped;
  }

  randomInt(maxValue: number, minValue: number = 0): number {
    const [nextSeed, value] = randomInt(this.#wrapped.seed, maxValue, minValue);
    this.#wrapped.seed = nextSeed;
    return value;
  }

  roll(probabilty: TBase100Probability): boolean {
    return this.randomInt(100) < probabilty;
  }

  shuffle<R>(deck: Array<R>): void {
    this.#wrapped.seed = shuffle(this.#wrapped.seed, deck);
  }

  pickOne<R>(choices: Readonly<NonEmptyArray<R>>): R {
    const [nextSeed, value] = pickOne(this.#wrapped.seed, choices);
    this.#wrapped.seed = nextSeed;
    return value;
  }

  weightedPickOne<R>(choices: Readonly<NonEmptyArray<[number, R]>>): R {
    const [nextSeed, value] = weightedPickOne(this.#wrapped.seed, choices);
    this.#wrapped.seed = nextSeed;
    return value;
  }

  sampleUniquely<R>(population: ReadonlyArray<R>, n: number): Array<R> {
    const [nextSeed, value] = sampleUniquely(this.#wrapped.seed, population, n);
    this.#wrapped.seed = nextSeed;
    return value;
  }

  *sampleUniquelyGenerator<R>(
    population: ReadonlyArray<R>
  ): Generator<R, void, void> {
    const generator = sampleUniquelyGenerator(this.#wrapped.seed, population);
    for (let i = 0; i < population.length; i++) {
      const next = generator.next(this.#wrapped.seed);
      if (!next.done) {
        const [newSeed, sample] = next.value;
        yield sample;
        this.#wrapped.seed = newSeed;
      } else {
        return;
      }
    }
  }

  sampleNonUniquely<R>(population: ReadonlyArray<R>, n: number): Array<R> {
    const [nextSeed, value] = sampleNonUniquely(
      this.#wrapped.seed,
      population,
      n
    );
    this.#wrapped.seed = nextSeed;
    return value;
  }

  splitSeed(): TSplitSeed {
    const [nextSeed, retSeed] = splitSeed(this.#wrapped.seed);

    this.#wrapped.seed = nextSeed;
    return retSeed;
  }
}
export type TRandomUtilsWrapper = Wrapper<{ seed: TSeed }>;

function wrap<T extends { seed: TSeed }>(wrapped: T): TRandomUtilsWrapper {
  return new Wrapper(wrapped);
}

function wrapper(splitSeed: TSplitSeed): TRandomUtilsWrapper {
  return new Wrapper({ seed: splitSeed });
}

const RandomUtils = {
  initSeed,
  fixedSeed,
  splitSeed,
  splitWrappedSeed,
  nextSeed,
  pickOne,
  weightedPickOne,
  sampleNonUniquely,
  sampleUniquely,
  wrap,
  wrapper,
  shuffle,
  randomInt,
};

export default RandomUtils;
