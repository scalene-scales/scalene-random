import * as AleaUtils from "prng/Alea";
import * as PCG32Utils from "prng/PCG32";

const TEST_UUID = "e7e3c27f-ccca-4830-b700-83ab59a7a6b8";

// const CYCLES = 100000;
const CYCLES = 1;
const RANGE_MAX = 100;

test("PCG32 uint32 performance", () => {
  let state;
  let encoding;

  state = PCG32Utils.init(TEST_UUID);
  encoding = PCG32Utils.encode(state);

  // console.time("PCG32 uint32");
  for (let i = 0; i < CYCLES; i++) {
    state = PCG32Utils.decode(encoding);
    PCG32Utils.uint32(state);
    encoding = PCG32Utils.encode(state);
  }
  // console.timeEnd("PCG32 uint32");
});

test("Alea uint32 performance", () => {
  let state;
  let encoding;

  state = AleaUtils.init(TEST_UUID);
  encoding = AleaUtils.encode(state);

  // console.time("Alea uint32");
  for (let i = 0; i < CYCLES; i++) {
    state = AleaUtils.decode(encoding);
    AleaUtils.uint32(state);
    encoding = AleaUtils.encode(state);
  }
  // console.timeEnd("Alea uint32");
});

test("PCG32 range performance", () => {
  let state;
  let encoding;

  state = PCG32Utils.init(TEST_UUID);
  encoding = PCG32Utils.encode(state);

  // console.time("PCG32 range");
  for (let i = 0; i < CYCLES; i++) {
    state = PCG32Utils.decode(encoding);
    PCG32Utils.range(state, RANGE_MAX);
    encoding = PCG32Utils.encode(state);
  }
  // console.timeEnd("PCG32 range");
});

test("Alea range performance", () => {
  let state;
  let encoding;

  state = AleaUtils.init(TEST_UUID);
  encoding = AleaUtils.encode(state);

  // console.time("Alea range");
  for (let i = 0; i < CYCLES; i++) {
    state = AleaUtils.decode(encoding);
    AleaUtils.range(state, RANGE_MAX);
    encoding = AleaUtils.encode(state);
  }
  // console.timeEnd("Alea range");
});

// Results: Alea is~1.5x as fast as PCG32.
