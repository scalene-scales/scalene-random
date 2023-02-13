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

const MULTIPLIER: bigint = 6364136223846793005n;
const BITS_IN_INT32 = BITS_IN_UINT32;

type TPCG32EncodedState = THexString_LengthMod16 & {
  __type: "PCG32EncodedState";
};
type TPCG32State = [s: bigint, inc: bigint]; // uint64

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

export { seedPCG32 as init };
export { nextPCG32 as next };
export { random as random };
export { uint32 as uint32 };
export { int32 as int32 };
export { fract53 as fract53 };
export { range as range };
export { split as split };
export { encodePCG32 as encode };
export { decodePCG32 as decode };

export default class PCG32 {
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
}
