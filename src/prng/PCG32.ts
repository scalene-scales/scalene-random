/*
 * Copyright 2023 Scalene Scales
 *
 * PCG Random Number Generation for C.
 *
 * Copyright 2014 Melissa O'Neill <oneill@pcg-random.org>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * For additional information about the PCG random number generation scheme,
 * including its license and other licensing options, visit
 *
 *       http://www.pcg-random.org
 */

import {
  decodeHexStringAsBigintOf64BitsArray,
  encodeBigintOf64BitsArrayAsHexString,
  sanitizeAsHexString_Length32,
} from "@scalene-scales/scalene-binary/dist/lib";
import {
  BITS_IN_UINT32,
  BITS_IN_UINT64,
  TWO_RAISED_TO_32,
  TWO_RAISED_TO_NEGATIVE_32,
  TWO_RAISED_TO_NEGATIVE_53,
} from "@scalene-scales/scalene-binary/dist/lib/constants";
import { THexString_LengthMod16 } from "@scalene-scales/scalene-binary/dist/types";
import { NonEmptyArray } from "ts-essentials";
import { TBase100Probability, TRandomWrapper, TSplitSeed } from "types";

const MULTIPLIER: bigint = 6364136223846793005n;
const BITS_IN_INT32 = BITS_IN_UINT32;

export type TPCG32EncodedState = THexString_LengthMod16 & {
  __type: "PCG32EncodedState";
};
export type TPCG32State = [s: bigint, inc: bigint]; // uint64

function nextPCG32(state: TPCG32State): void {
  const oldState: bigint = state[0];
  const increment: bigint = state[1];

  const nextState: bigint = BigInt.asUintN(
    BITS_IN_UINT64,
    oldState * MULTIPLIER + increment
  );

  state[0] = nextState;
}

function seedPCG32(seed: string): TPCG32State {
  const sanitizedSeed = sanitizeAsHexString_Length32(seed);

  const seededState = BigInt("0x" + sanitizedSeed.substring(0, 16));
  // Note, the increment value must be odd, so just bitwise OR with 1.
  const seededIncrement = BigInt("0x" + sanitizedSeed.substring(17, 16)) | 1n;

  const initialState: TPCG32State = [seededState, seededIncrement];

  // Initialize the seed with the first random to mitigate poor quality seeds.
  nextPCG32(initialState);

  return initialState;
}

function currentValue(state: TPCG32State): bigint {
  const stateValue = state[0];

  const xorshifted: bigint = ((stateValue >> 18n) ^ stateValue) >> 27n;
  const rot: bigint = stateValue >> 59n;

  const value = (xorshifted >> rot) | (xorshifted << (-rot & 31n));
  return value;
}

function uint32(state: TPCG32State): number {
  nextPCG32(state);
  const value = currentValue(state);
  return Number(BigInt.asUintN(BITS_IN_UINT32, value));
}

function random(state: TPCG32State): number {
  const value = uint32(state);
  return value * TWO_RAISED_TO_NEGATIVE_32;
}

function int32(state: TPCG32State): number {
  nextPCG32(state);
  const value = currentValue(state);
  return Number(BigInt.asIntN(BITS_IN_INT32, value));
}

function fract53Value(low32: number, high32: number): number {
  // Take 32 bits from low32 and 21 bits from high32, e.g.:
  // 32 - 11 = 21
  // 21 + 32 = 53
  high32 = high32 >>> 11;
  return (
    (low32 + ((high32 * TWO_RAISED_TO_32) | 0)) * TWO_RAISED_TO_NEGATIVE_53
  );
}

function fract53(state: TPCG32State): number {
  const low32 = uint32(state);
  const high32 = uint32(state);

  return fract53Value(low32, high32);
}

function range(
  state: TPCG32State,
  maxValue: number,
  minValue: number = 0
): number {
  const bound = maxValue - minValue;
  if (bound < 1) {
    return maxValue;
  }

  const threshold = maxValue % bound;
  // Based on https://www.pcg-random.org/posts/bounded-rands.html
  for (;;) {
    const r = uint32(state);
    if (r >= threshold) {
      return minValue + (r % bound);
    }
  }
}

function split(state: TPCG32State): TPCG32State {
  nextPCG32(state);
  const incLow32 = BigInt.asUintN(BITS_IN_UINT32, currentValue(state));
  nextPCG32(state);
  const incHigh32 = BigInt.asUintN(BITS_IN_UINT32, currentValue(state)) << 32n;

  nextPCG32(state);
  const stateLow32 = BigInt.asUintN(BITS_IN_UINT32, currentValue(state));
  nextPCG32(state);
  const stateHigh32 =
    BigInt.asUintN(BITS_IN_UINT32, currentValue(state)) << 32n;

  return [stateLow32 + stateHigh32, incLow32 + incHigh32];
}

function encodePCG32(state: Readonly<TPCG32State>): TPCG32EncodedState {
  return encodeBigintOf64BitsArrayAsHexString(state) as TPCG32EncodedState;
}

function decodePCG32(encoding: TPCG32EncodedState): TPCG32State {
  const bigintState = decodeHexStringAsBigintOf64BitsArray(encoding);

  return [bigintState[0]!, bigintState[1]!];
}

export {
  decodePCG32 as decode,
  encodePCG32 as encode,
  fract53 as fract53,
  seedPCG32 as init,
  int32 as int32,
  nextPCG32 as next,
  random as random,
  range as range,
  split as split,
  uint32 as uint32,
};

export default class PCG32 implements TRandomWrapper {
  private state: TPCG32State;

  constructor(seed: string | TPCG32State) {
    if (Array.isArray(seed)) {
      this.state = seed;
    } else {
      this.state = seedPCG32(seed);
    }
  }

  random(): number {
    return random(this.state);
  }

  uint32(): number {
    return uint32(this.state);
  }

  int32(): number {
    return int32(this.state);
  }

  fract53(): number {
    return fract53(this.state);
  }

  range(maxValue: number, minValue: number = 0): number {
    return range(this.state, maxValue, minValue);
  }

  split(): PCG32 {
    const splitState = split(this.state);

    return new PCG32(splitState);
  }

  encode(): TPCG32EncodedState {
    return encodePCG32(this.state);
  }

  static fromEncoding(encoding: TPCG32EncodedState): PCG32 {
    return new PCG32(decodePCG32(encoding));
  }

  /** TRandomWrapper methods */

  advanceRNG(times: number = 1): void {
    if (times < 1) {
      return;
    }

    for (let i = 0; i < times; i++) {
      nextPCG32(this.state);
    }
  }

  randomInt(maxValue: number, minValue: number = 0): number {
    if (maxValue - minValue === 0) {
      return maxValue;
    }

    return range(this.state, maxValue, minValue);
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

    // https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle#The_modern_algorithm
    for (let i = 0; i < deck.length - 1; i++) {
      const swapIndex = range(this.state, deck.length, i);

      const temp = deck[i]!;
      deck[i] = deck[swapIndex]!;
      deck[swapIndex] = temp;
    }
  }

  pickOne<R>(choices: Readonly<NonEmptyArray<R>>): R {
    if (choices.length === 1) {
      return choices[0];
    }

    const pickIndex = this.randomInt(choices.length);
    return choices[pickIndex]!;
  }

  weightedPickOne<R>(choices: Readonly<NonEmptyArray<[number, R]>>): R {
    if (choices.length === 1) {
      return choices[0][1];
    }

    let total = 0;
    for (const choice of choices) {
      total += choice[0];
    }

    const pickTotal = this.randomInt(Math.ceil(total));

    total = 0;
    for (const choice of choices) {
      if (total >= pickTotal) {
        return choice[1];
      }
      total += choice[0];
    }

    return choices[0][1];
  }

  sampleUniquely<R>(population: ReadonlyArray<R>, n: number): Array<R> {
    if (population.length === 0 || n === 0) {
      return [];
    }

    const limit = Math.min(population.length, n);

    const samples: Array<R> = [];
    const rawSamples: { [index: number]: R } = {};
    for (let i = 0; i < limit; i++) {
      const sampleIndex = range(this.state, population.length, i);

      const temp = i in rawSamples ? rawSamples[i]! : population[i]!;
      rawSamples[i] =
        sampleIndex in rawSamples
          ? rawSamples[sampleIndex]!
          : population[sampleIndex]!;
      rawSamples[sampleIndex] = temp;

      const sample = i in rawSamples ? rawSamples[i]! : population[i]!;
      samples.push(sample);
    }

    return samples;
  }

  *sampleUniquelyGenerator<R>(
    population: ReadonlyArray<R>
  ): Generator<R, void, void> {
    // Note, don't need to pass through seed state since it's modified in place.
    const rawSamples: { [index: number]: R } = {};
    for (let i = 0; i < population.length; i++) {
      const sampleIndex = range(this.state, population.length, i);

      const temp = i in rawSamples ? rawSamples[i]! : population[i]!;
      rawSamples[i] =
        sampleIndex in rawSamples
          ? rawSamples[sampleIndex]!
          : population[sampleIndex]!;
      rawSamples[sampleIndex] = temp;

      yield i in rawSamples ? rawSamples[i]! : population[i]!;
    }
  }

  sampleNonUniquely<R>(population: ReadonlyArray<R>, n: number): Array<R> {
    if (population.length === 0 || n === 0) {
      return [];
    }

    const samples: Array<R> = [];
    for (let i = 0; i < n; i++) {
      const sampleIndex = range(this.state, population.length);

      samples.push(population[sampleIndex]!);
    }

    return samples;
  }

  splitSeed(): TSplitSeed {
    const splitState = split(this.state);

    return encodePCG32(splitState) as unknown as TSplitSeed;
  }
}
