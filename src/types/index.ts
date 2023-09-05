import { NonEmptyArray } from "ts-essentials/dist/types";

export type TBase100Probability = number & { __type: "Base100Probability" };

export type TInitialSeed = string & { __id: "InitialSeed" };
export type TNextSeed = (string & { __id: "NextSeed" }) | TInitialSeed;
export type TSplitSeed = (string & { __id: "SplitSeed" }) | TInitialSeed;
export type TSeed = TNextSeed | TSplitSeed;

export interface TRandomWrapper {
  advanceRNG(times?: number): void;

  random(): number;

  randomInt(maxValue: number, minValue?: number): number;

  roll(probabilty: TBase100Probability): boolean;

  shuffle<R>(deck: Array<R>): void;

  pickOne<R>(choices: Readonly<NonEmptyArray<R>>): R;

  weightedPickOne<R>(choices: Readonly<NonEmptyArray<[number, R]>>): R;

  sampleUniquely<R>(population: ReadonlyArray<R>, n: number): Array<R>;

  sampleUniquelyGenerator<R>(
    population: ReadonlyArray<R>
  ): Generator<R, void, void>;

  sampleNonUniquely<R>(population: ReadonlyArray<R>, n: number): Array<R>;

  splitSeed(): TSplitSeed;
}
