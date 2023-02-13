import {
  decodeBase64StringAsUint32Array,
  encodeUint32ArrayAsBase64String,
} from "@scalene-scales/scalene-binary/dist/lib";

type TAleaEncodedState = string & { __type: "AleaEncodedState" };

// Note, the state is represented by 3 32 bit decimals and a 32 bit uint.
// Because 32 bit decimals take more bits to represent than 32 bit floats,
// they either need to be converted to uint32 for encoding or stored as float64.
type TAleaState = [s0: number, s1: number, s2: number, c: number];

const N = 0xefc8249d;
const SPACE_CHAR_CODE = 32;
const TWO_RAISED_TO_21 = 0x200000;
const TWO_RAISED_TO_32 = 0x100000000; // 2^32
const TWO_RAISED_TO_NEGATIVE_32 = 2.3283064365386963e-10; // 2^-32
const TWO_RAISED_TO_NEGATIVE_53 = 1.1102230246251565e-16; // 2^-53

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
  let c = 1;

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

function nextAlea(state: TAleaState): TAleaState {
  let s0 = state[0];
  let s1 = state[1];
  let s2 = state[2];
  let c = state[3];

  let t = 2091639 * s0 + c * TWO_RAISED_TO_NEGATIVE_32;
  s0 = s1;
  s1 = s2;
  c = t | 0;
  s2 = t - c;

  return [s0, s1, s2, c];
}

function currentValue(state: TAleaState): number {
  // Note, this returns a 32 bit decimal value.
  return state[2];
}

function currentUint32Value(state: TAleaState): number {
  return state[2] * TWO_RAISED_TO_32;
}

function uint32(state: TAleaState): [TAleaState, number] {
  state = nextAlea(state);
  return [state, currentUint32Value(state)];
}

function int32(state: TAleaState): [TAleaState, number] {
  state = nextAlea(state);
  const value = currentValue(state);
  return [state, (value * TWO_RAISED_TO_32) | 0];
}

function fract53Value(low32: number, high32: number): number {
  return low32 + ((high32 * TWO_RAISED_TO_21) | 0) * TWO_RAISED_TO_NEGATIVE_53;
}

function fract53(state: TAleaState): [TAleaState, number] {
  state = nextAlea(state);
  const low32 = currentValue(state);
  state = nextAlea(state);
  const high32 = currentValue(state);

  return [state, fract53Value(low32, high32)];
}

function range(
  state: TAleaState,
  maxValue: number,
  minValue: number = 0
): [TAleaState, number] {
  const [nextAlea, uint32Value] = uint32(state);

  const rngValue = uint32Value * TWO_RAISED_TO_NEGATIVE_32;
  return [nextAlea, Math.floor(minValue + rngValue * (maxValue - minValue))];
}

function split(state: TAleaState): [TAleaState, TAleaState] {
  // Note, because the encoded string only stores 32 bits per state value,
  // have to use 32 bit values and convert here otherwise precision gets
  // lost between save and restores since the data would be out of range.

  // Note, because Alea just returns state values directly, using values
  // directly leads to a highly correllated state between split seeds.
  // Hack, take two values and XOR them together, I suspect that this
  // doesn't actually decorrelate them particularly well, but ¯\_(ツ)_/¯.

  let random32_0;
  let random32_1;

  state = nextAlea(state);
  random32_0 = currentUint32Value(state);
  state = nextAlea(state);
  random32_1 = currentUint32Value(state);
  const c = (random32_0 ^ random32_1) >>> 0;

  state = nextAlea(state);
  random32_0 = currentUint32Value(state);
  state = nextAlea(state);
  random32_1 = currentUint32Value(state);
  const s2 = ((random32_0 ^ random32_1) >>> 0) * TWO_RAISED_TO_NEGATIVE_32;

  state = nextAlea(state);
  random32_0 = currentUint32Value(state);
  state = nextAlea(state);
  random32_1 = currentUint32Value(state);
  const s1 = ((random32_0 ^ random32_1) >>> 0) * TWO_RAISED_TO_NEGATIVE_32;

  state = nextAlea(state);
  random32_0 = currentUint32Value(state);
  state = nextAlea(state);
  random32_1 = currentUint32Value(state);
  const s0 = ((random32_0 ^ random32_1) >>> 0) * TWO_RAISED_TO_NEGATIVE_32;

  return [state, [s0, s1, s2, c]];
}

function encodeAlea(state: TAleaState): TAleaEncodedState {
  return encodeUint32ArrayAsBase64String([
    state[0] * TWO_RAISED_TO_32,
    state[1] * TWO_RAISED_TO_32,
    state[2] * TWO_RAISED_TO_32,
    state[3],
  ]) as TAleaEncodedState;
}

function decodeAlea(encoding: TAleaEncodedState): TAleaState {
  const uint32State = decodeBase64StringAsUint32Array(encoding);

  return [
    uint32State[0]! * TWO_RAISED_TO_NEGATIVE_32,
    uint32State[1]! * TWO_RAISED_TO_NEGATIVE_32,
    uint32State[2]! * TWO_RAISED_TO_NEGATIVE_32,
    uint32State[3]!,
  ];
}

export { seedAlea as init };
export { nextAlea as next };
export { currentValue as value };
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
    this.state = nextAlea(this.state);
    return currentValue(this.state);
  }

  uint32(): number {
    return this.random() * TWO_RAISED_TO_32;
  }

  int32(): number {
    return this.uint32() | 0;
  }

  fract53(): number {
    return (
      this.random() +
      ((this.random() * 0x200000) | 0) * TWO_RAISED_TO_NEGATIVE_53
    );
  }

  range(maxValue: number, minValue: number = 0): number {
    const rngValue = this.uint32() / TWO_RAISED_TO_32;
    return Math.floor(minValue + rngValue * (maxValue - minValue));
  }

  split(): Alea {
    const s0 = this.fract53();
    const s1 = this.fract53();
    const s2 = this.fract53();
    const c = this.fract53();

    return new Alea([s0, s1, s2, c]);
  }

  encode(): TAleaEncodedState {
    return encodeAlea(this.state);
  }

  static fromEncoding(encoding: TAleaEncodedState): Alea {
    return new Alea(decodeAlea(encoding));
  }
}
