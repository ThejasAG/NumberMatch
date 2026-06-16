import { mkdir, writeFile } from "node:fs/promises";

export async function writeReports(name: string, json: unknown, markdown: string): Promise<void> {
  await mkdir("reports", { recursive: true });
  await writeFile(`reports/${name}.json`, JSON.stringify(json, null, 2));
  await writeFile(`reports/${name}.md`, markdown);
}

export function percent(value: number): string {
  return `${Math.round(value * 10000) / 100}%`;
}

export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function envCount(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}
