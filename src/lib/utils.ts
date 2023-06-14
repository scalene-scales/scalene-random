import { THexString_LengthMod8 } from "@scalene-scales/scalene-binary/dist/types";
import { NonEmptyArray } from "ts-essentials";
import { v4 as uuidv4 } from "uuid";
import * as PRNG from "../prng/Alea";
import {
  TBase100Probability,
  TInitialSeed,
  TNextSeed,
  TRandomWrapper,
  TSeed,
  TSplitSeed,
} from "../types";

type TEncodedState = THexString_LengthMod8 & { __type: "AleaEncodedState" }; // TAleaEncodedState
type TPRNGState = [s0: number, s1: number, s2: number, c: number]; // TAleaState

function decode(seed: TSeed): TPRNGState {
  return PRNG.decode(seed as unknown as TEncodedState);
}

function encodeNextSeed(prng: TPRNGState): TNextSeed {
  return PRNG.encode(prng) as unknown as TNextSeed;
}

function encodeSplitSeed(prng: TPRNGState): TSplitSeed {
  return PRNG.encode(prng) as unknown as TSplitSeed;
}

function initSeed(): TInitialSeed {
  return PRNG.encode(PRNG.init(uuidv4())) as unknown as TInitialSeed;
}

function fixedSeed(name: string): TInitialSeed {
  return PRNG.encode(PRNG.init(name)) as unknown as TInitialSeed;
}

function splitSeed(seed: TSeed): [TNextSeed, TSplitSeed] {
  const alea = decode(seed);
  const splitAlea = PRNG.split(alea);

  return [encodeNextSeed(alea), encodeSplitSeed(splitAlea)];
}

function splitWrappedSeed<T extends { seed: TSeed }>(wraper: T): TSplitSeed {
  const [nextSeedValue, splitSeedValue] = splitSeed(wraper.seed);
  wraper.seed = nextSeedValue;
  return splitSeedValue;
}

function advanceRNG(seed: TSeed, times: number = 1): TNextSeed {
  const prng = decode(seed);

  for (let i = 0; i < times; i++) {
    PRNG.next(prng);
  }

  return encodeNextSeed(prng);
}

function randomInt(
  seed: TSeed,
  maxValue: number,
  minValue: number = 0
): [TNextSeed, number] {
  const prng = decode(seed);
  const intValue = PRNG.range(prng, maxValue, minValue);

  return [encodeNextSeed(prng), intValue];
}

function shuffle<T>(seed: TSeed, deck: Array<T>): TNextSeed {
  const prng = decode(seed);

  // https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle#The_modern_algorithm
  for (let i = 0; i < deck.length - 1; i++) {
    const swapIndex = PRNG.range(prng, deck.length, i);

    const temp = deck[i]!;
    deck[i] = deck[swapIndex]!;
    deck[swapIndex] = temp;
  }

  return encodeNextSeed(prng);
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
  const prng = decode(seed);

  const samples: Array<T> = [];
  for (let i = 0; i < n; i++) {
    const sampleIndex = PRNG.range(prng, population.length);

    samples.push(population[sampleIndex]!);
  }

  return [encodeNextSeed(prng), samples];
}

function* sampleUniquelyGenerator<T>(
  seed: TSeed,
  population: ReadonlyArray<T>
): Generator<[TSeed, T], TNextSeed, TSeed> {
  let currentSeed = seed;

  const rawSamples: { [index: number]: T } = {};
  for (let i = 0; i < population.length; i++) {
    // Note, have to decode-encode because RNG may advance between generator calls.
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

  return currentSeed as TNextSeed;
}

function sampleUniquely<T>(
  seed: TSeed,
  population: ReadonlyArray<T>,
  n: number
): [TNextSeed, Array<T>] {
  const prng = decode(seed);
  const limit = Math.min(population.length, n);

  const samples: Array<T> = [];
  const rawSamples: { [index: number]: T } = {};
  for (let i = 0; i < limit; i++) {
    const sampleIndex = PRNG.range(prng, population.length, i);

    const temp = i in rawSamples ? rawSamples[i]! : population[i]!;
    rawSamples[i] =
      sampleIndex in rawSamples
        ? rawSamples[sampleIndex]!
        : population[sampleIndex]!;
    rawSamples[sampleIndex] = temp;

    const sample = i in rawSamples ? rawSamples[i]! : population[i]!;
    samples.push(sample);
  }

  return [encodeNextSeed(prng), samples];
}

class Wrapper<T extends { seed: TSeed }> implements TRandomWrapper {
  #wrapped: T;

  constructor(wrapped: T) {
    this.#wrapped = wrapped;
  }

  advanceRNG(times: number = 1): void {
    if (times < 1) {
      return;
    }

    this.#wrapped.seed = advanceRNG(this.#wrapped.seed, times);
  }

  randomInt(maxValue: number, minValue: number = 0): number {
    if (maxValue - minValue === 0) {
      return maxValue;
    }

    const [nextSeed, value] = randomInt(this.#wrapped.seed, maxValue, minValue);
    this.#wrapped.seed = nextSeed;
    return value;
  }

  roll(probabilty: TBase100Probability): boolean {
    if (probabilty >= 100) {
      return true;
    } else if (probabilty === 0) {
      return false;
    }

    return this.randomInt(100) < probabilty;
  }

  shuffle<R>(deck: Array<R>): void {
    if (deck.length === 0) {
      return;
    }

    this.#wrapped.seed = shuffle(this.#wrapped.seed, deck);
  }

  pickOne<R>(choices: Readonly<NonEmptyArray<R>>): R {
    if (choices.length === 1) {
      return choices[0];
    }

    const [nextSeed, value] = pickOne(this.#wrapped.seed, choices);
    this.#wrapped.seed = nextSeed;
    return value;
  }

  weightedPickOne<R>(choices: Readonly<NonEmptyArray<[number, R]>>): R {
    if (choices.length === 1) {
      return choices[0][1];
    }

    const [nextSeed, value] = weightedPickOne(this.#wrapped.seed, choices);
    this.#wrapped.seed = nextSeed;
    return value;
  }

  sampleUniquely<R>(population: ReadonlyArray<R>, n: number): Array<R> {
    if (population.length === 0 || n === 0) {
      return [];
    }

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
    if (population.length === 0 || n === 0) {
      return [];
    }

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

function wrap<T extends { seed: TSeed }>(wrapped: T): TRandomWrapper {
  return new Wrapper(wrapped);
}

function wrapper(splitSeed: TSplitSeed): TRandomWrapper {
  return new Wrapper({ seed: splitSeed });
}

const RandomUtils = {
  initSeed,
  fixedSeed,
  splitSeed,
  splitWrappedSeed,
  advanceRNG,
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
