import { RULES_VERSION, type Snake, type Mode } from "./model";
import type { CourseId } from "./courses";
import { validSnake } from "./storage";
import type { Race } from "./physics";
export type ReplayInput = { time: number; side: number };
export type Challenge = {
  v: 1;
  rules: string;
  snake: Snake;
  course: CourseId;
  mode: Mode;
  inputs: ReplayInput[];
  targetTime: number;
};
const MAX_TEXT = 260000,
  MAX_LINK = 24000;
async function readBounded(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > MAX_TEXT) {
        await reader.cancel();
        throw new Error("도전장 데이터가 너무 커요.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
export function validChallenge(value: unknown): value is Challenge {
  try {
    if (!value || typeof value !== "object") return false;
    const c = value as Challenge;
    let last = -1;
    return (
      c.v === 1 &&
      c.rules === RULES_VERSION &&
      validSnake(c.snake) &&
      ["sprint", "hills", "puddles"].includes(c.course) &&
      ["auto", "manual"].includes(c.mode) &&
      Number.isFinite(c.targetTime) &&
      c.targetTime > 0 &&
      c.targetTime <= 90 &&
      Array.isArray(c.inputs) &&
      c.inputs.length <= 2000 &&
      c.inputs.every((input) => {
        const valid =
          Number.isFinite(input.time) &&
          input.time >= 0 &&
          input.time <= 90 &&
          input.time >= last &&
          (input.side === -1 || input.side === 1);
        last = input.time;
        return valid;
      })
    );
  } catch {
    return false;
  }
}
export async function challengeLink(race: Race, base: string) {
  const r = race.racers[0];
  if (r.finish === null)
    throw new Error("먼저 완주한 뒤 도전장을 보낼 수 있어요.");
  const challenge: Challenge = {
    v: 1,
    rules: RULES_VERSION,
    snake: r.snake,
    course: race.course,
    mode: race.mode,
    inputs: race.inputs,
    targetTime: r.finish,
  };
  const bytes = new TextEncoder().encode(JSON.stringify(challenge));
  if (bytes.length > MAX_TEXT)
    throw new Error(
      "그림이 너무 복잡해요. 선을 조금 줄인 뒤 다시 공유해 주세요.",
    );
  const compressed = await readBounded(
    new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate")),
  );
  let binary = "";
  for (let i = 0; i < compressed.length; i += 4096)
    binary += String.fromCharCode(...compressed.subarray(i, i + 4096));
  const payload = btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  const url = new URL(base);
  if (!["https:", "http:"].includes(url.protocol))
    throw new Error("온라인 게임 주소에서 도전장을 공유해 주세요.");
  url.hash = "challenge=" + payload;
  if (url.href.length > MAX_LINK)
    throw new Error(
      "그림이 너무 복잡해 링크를 만들지 못했어요. 선을 조금 줄여 주세요.",
    );
  return url.href;
}
export async function readChallenge(hash: string): Promise<Challenge | null> {
  if (!hash.startsWith("#challenge=")) return null;
  if (hash.length > MAX_LINK)
    throw new Error("도전 링크가 너무 길거나 손상됐어요.");
  try {
    const text = atob(hash.slice(11).replaceAll("-", "+").replaceAll("_", "/"));
    const bytes = Uint8Array.from(text, (c) => c.charCodeAt(0));
    const result = await readBounded(
      new Blob([bytes])
        .stream()
        .pipeThrough(new DecompressionStream("deflate")),
    );
    const challenge: unknown = JSON.parse(new TextDecoder().decode(result));
    if (!validChallenge(challenge)) throw new Error();
    return challenge;
  } catch {
    throw new Error(
      "도전장을 열지 못했어요. 현재 규칙으로 새 링크를 받아주세요.",
    );
  }
}
