export class SeededSequence {
  private state: number;

  constructor(seed: number) {
    this.state = Math.max(1, seed >>> 0);
  }

  next(): number {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(items: T[]): T {
    return items[this.int(0, items.length - 1)];
  }
}

export function deterministicSeed(level: number, attempt: number): number {
  return level * 1000003 + attempt;
}

export function complementOf(value: number): number {
  return value === 5 ? 5 : 10 - value;
}

export function isMatchingValue(a: number, b: number): boolean {
  return a === b || a + b === 10;
}
