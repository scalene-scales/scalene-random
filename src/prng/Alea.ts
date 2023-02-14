// Copyright (C) 2023 by Scalene Scales
// Copyright (C) 2010 by Johannes Baagøe <baagoe@baagoe.org>

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import {
  decodeHexStringAsUint32Array,
  encodeUint32ArrayAsHexString,
} from "@scalene-scales/scalene-binary/dist/lib";
import {
  TWO_RAISED_TO_21,
  TWO_RAISED_TO_32,
  TWO_RAISED_TO_NEGATIVE_32,
  TWO_RAISED_TO_NEGATIVE_53,
} from "@scalene-scales/scalene-binary/dist/lib/constants";
import { THexString_LengthMod8 } from "@scalene-scales/scalene-binary/dist/types";

type TAleaEncodedState = THexString_LengthMod8 & { __type: "AleaEncodedState" };

// Note, the state is represented by 3 32 bit decimals and a 32 bit uint.
// Because 32 bit decimals take more bits to represent than 32 bit floats,
// they either need to be converted to uint32 for encoding or stored as float64.
type TAleaState = [s0: number, s1: number, s2: number, c: number];

const N = 0xefc8249d;
const SPACE_CHAR_CODE = 32;

function mashCharCode(n: number, charCode: number): number {
  n += charCode;
  let h = 0.02519603282416938 * n;
  n = h >>> 0;
  h -= n;
  h *= n;
  n = h >>> 0;
  h -= n;
  n += h * TWO_RAISED_TO_32;

  return n;
}

function mashString(n: number, seed: string): number {
  for (let i = 0; i < seed.length; i++) {
    n = mashCharCode(n, seed.charCodeAt(i));
  }
  return n;
}

function mashValue(n: number): number {
  return (n >>> 0) * TWO_RAISED_TO_NEGATIVE_32;
}

function seedAlea(seed: string): TAleaState {
  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  const c = 1;

  let n = N;

  n = mashCharCode(n, SPACE_CHAR_CODE);
  s0 = mashValue(n);
  n = mashCharCode(n, SPACE_CHAR_CODE);
  s1 = mashValue(n);
  n = mashCharCode(n, SPACE_CHAR_CODE);
  s2 = mashValue(n);

  n = mashString(n, seed);
  s0 -= mashValue(n);
  if (s0 < 0) {
    s0 += 1;
  }
  n = mashString(n, seed);
  s1 -= mashValue(n);
  if (s1 < 0) {
    s1 += 1;
  }
  n = mashString(n, seed);
  s2 -= mashValue(n);
  if (s2 < 0) {
    s2 += 1;
  }

  return [s0, s1, s2, c];
}

function nextAlea(state: TAleaState): void {
  let s0 = state[0];
  let s1 = state[1];
  let s2 = state[2];
  let c = state[3];

  const t = 2091639 * s0 + c * TWO_RAISED_TO_NEGATIVE_32;
  s0 = s1;
  s1 = s2;
  c = t | 0;
  s2 = t - c;

  state[0] = s0;
  state[1] = s1;
  state[2] = s2;
  state[3] = c;
}

function currentValue(state: TAleaState): number {
  // Note, this returns a 32 bit decimal value.
  return state[2];
}

function random(state: TAleaState): number {
  nextAlea(state);
  const value = currentValue(state);
  return value;
}

function uint32(state: TAleaState): number {
  nextAlea(state);
  const value = currentValue(state);
  return value * TWO_RAISED_TO_32;
}

function int32(state: TAleaState): number {
  nextAlea(state);
  const value = currentValue(state);
  return (value * TWO_RAISED_TO_32) | 0;
}

function fract53Value(low32: number, high32: number): number {
  // Note, the multiply only affects the high order bits because low32 and high32 are already decimal values.
  return low32 + ((high32 * TWO_RAISED_TO_21) | 0) * TWO_RAISED_TO_NEGATIVE_53;
}

function fract53(state: TAleaState): number {
  nextAlea(state);
  const low32 = currentValue(state);
  nextAlea(state);
  const high32 = currentValue(state);

  return fract53Value(low32, high32);
}

function range(
  state: TAleaState,
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

function split(state: TAleaState): TAleaState {
  // Note, because the encoded string only stores 32 bits per state value,
  // have to use 32 bit values and convert here otherwise precision gets
  // lost between save and restores since the data would be out of range.

  // Note, because Alea just returns state values directly, using values
  // directly leads to a highly correllated state between split seeds.
  // Hack, take two values and XOR them together, I suspect that this
  // doesn't actually decorrelate them particularly well, but ¯\_(ツ)_/¯.

  let random32_0;
  let random32_1;

  random32_0 = uint32(state);
  random32_1 = uint32(state);
  const c = (random32_0 ^ random32_1) >>> 0;

  random32_0 = uint32(state);
  random32_1 = uint32(state);
  const s2 = ((random32_0 ^ random32_1) >>> 0) * TWO_RAISED_TO_NEGATIVE_32;

  random32_0 = uint32(state);
  random32_1 = uint32(state);
  const s1 = ((random32_0 ^ random32_1) >>> 0) * TWO_RAISED_TO_NEGATIVE_32;

  random32_0 = uint32(state);
  random32_1 = uint32(state);
  const s0 = ((random32_0 ^ random32_1) >>> 0) * TWO_RAISED_TO_NEGATIVE_32;

  return [s0, s1, s2, c];
}

function encodeAlea(state: Readonly<TAleaState>): TAleaEncodedState {
  return encodeUint32ArrayAsHexString([
    state[0] * TWO_RAISED_TO_32,
    state[1] * TWO_RAISED_TO_32,
    state[2] * TWO_RAISED_TO_32,
    state[3],
  ]) as TAleaEncodedState;
}

function decodeAlea(encoding: TAleaEncodedState): TAleaState {
  const uint32State = decodeHexStringAsUint32Array(encoding);

  return [
    uint32State[0]! * TWO_RAISED_TO_NEGATIVE_32,
    uint32State[1]! * TWO_RAISED_TO_NEGATIVE_32,
    uint32State[2]! * TWO_RAISED_TO_NEGATIVE_32,
    uint32State[3]!,
  ];
}

export { seedAlea as init };
export { nextAlea as next };
export { random as random };
export { uint32 as uint32 };
export { int32 as int32 };
export { fract53 as fract53 };
export { range as range };
export { split as split };
export { encodeAlea as encode };
export { decodeAlea as decode };

export default class Alea {
  private state: TAleaState;

  constructor(seed: string | TAleaState) {
    if (Array.isArray(seed)) {
      this.state = seed;
    } else {
      this.state = seedAlea(seed);
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

  split(): Alea {
    const splitState = split(this.state);

    return new Alea(splitState);
  }

  encode(): TAleaEncodedState {
    return encodeAlea(this.state);
  }

  static fromEncoding(encoding: TAleaEncodedState): Alea {
    return new Alea(decodeAlea(encoding));
  }
}
