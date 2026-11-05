import { sampleSnake } from "../../src/model";
import { test, expect } from "@playwright/test";
test("draw three parts, assemble, save, run race to finish and persist record", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByLabel("머리 그리기 캔버스")).toBeVisible();
  for (const name of ["머리", "몸통", "꼬리"]) {
    const canvas = page.getByLabel(`${name} 그리기 캔버스`);
    await canvas.scrollIntoViewIfNeeded();
    const b = (await canvas.boundingBox())!;
    await page.mouse.move(b.x + 45, b.y + b.height / 2);
    await page.mouse.down();
    for (let i = 0; i < 18; i++)
      await page.mouse.move(
        b.x + 45 + (i * (b.width - 90)) / 17,
        b.y + b.height / 2 + Math.sin(i * 0.8) * 22,
      );
    await page.mouse.up();
    await page
      .getByRole("button", { name: name === "꼬리" ? /조립!/ : /^다음 ▶$/ })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "반가워, 나의 꼬물이!" }),
  ).toBeVisible();
  await page.getByRole("textbox").fill("테스트 꿈틀이");
  await page.getByRole("button", { name: "경기 준비하러 →" }).click();
  await expect(page.getByText("현재 조작: 자동 달리기")).toBeVisible();
  await page.getByRole("button", { name: "조작 전환 ↔" }).click();
  await expect(page.getByText("현재 조작: 수동 달리기")).toBeVisible();
  await page.getByRole("button", { name: "자동으로 전환 ↔" }).click();
  await page.clock.install();
  await page.getByRole("button", { name: "경주 시작 →" }).click();
  await page.clock.runFor(2000);
  await expect(page.getByTestId("distance")).toHaveText("0.0/ 100m");
  await page.clock.runFor(4500);
  await expect(page.getByTestId("distance")).not.toHaveText("0.0/ 100m");
  await page.getByRole("button", { name: "Ⅱ 일시정지" }).click();
  const before = await page.getByTestId("time").innerText();
  await page.clock.runFor(2000);
  expect(await page.getByTestId("time").innerText()).toBe(before);
  await page.getByRole("button", { name: "계속 달리기 →" }).click();
  await page.clock.runFor(60000);
  await expect(
    page.getByRole("heading", { name: "끝까지 달렸어요!" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "메인 화면", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "테스트 꿈틀이" }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "내 뱀", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "테스트 꿈틀이" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("mobile layout, manual controls, restart, exit and mode reset", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "docs/home-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "샘플 경기", exact: true }).click();
  await page.screenshot({ path: "docs/prepare-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "조작 전환 ↔" }).click();
  await page.clock.install();
  await page.getByRole("button", { name: "경주 시작 →" }).click();
  await page.clock.runFor(3500);
  for (let i = 0; i < 8; i++) {
    await page
      .getByRole("button", {
        name: i % 2 ? "오른쪽 추진" : "왼쪽 추진",
        exact: true,
      })
      .dispatchEvent("pointerdown");
    await page.clock.runFor(340);
  }
  await expect(page.getByTestId("distance")).not.toHaveText("0.0/ 100m");
  await page.screenshot({ path: "docs/race-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Ⅱ 일시정지" }).click();
  await page.getByRole("button", { name: "처음부터 다시" }).click();
  await expect(page.getByTestId("distance")).toHaveText("0.0/ 100m");
  await page.getByRole("button", { name: "Ⅱ 일시정지" }).click();
  await page.getByRole("button", { name: "경기 종료", exact: true }).click();
  await page.getByRole("button", { name: "경기 종료", exact: true }).click();
  await expect(page.getByText("현재 조작: 자동 달리기")).toBeVisible();
  expect(errors).toEqual([]);
});
test("desktop layout has no overflow and screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.screenshot({ path: "docs/home-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "샘플 경기", exact: true }).click();
  await page.screenshot({ path: "docs/prepare-desktop.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("drawing desk supports partial erasing, undo, live stats and movable connections", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const canvas = page.getByLabel("머리 그리기 캔버스"),
    box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + 45, box.y + 120);
  await page.mouse.down();
  for (let i = 0; i <= 20; i++)
    await page.mouse.move(
      box.x + 45 + i * 10,
      box.y + 120 + Math.sin(i / 3) * 15,
    );
  await page.mouse.up();
  await expect(page.getByLabel("그림 분석")).toContainText("머리 완성 중");
  const before = await canvas.screenshot();
  await page.getByRole("button", { name: "▱ 지우개" }).click();
  await page.mouse.move(box.x + 145, box.y + 120);
  await page.mouse.down();
  await page.mouse.move(box.x + 145, box.y + 150);
  await page.mouse.up();
  const erased = await canvas.screenshot();
  expect(erased.equals(before)).toBe(false);
  await page.getByRole("button", { name: "↶ 되돌리기" }).click();
  await page.getByText("연결점 설정", {exact:true}).click();
  await page.getByRole("button", { name: "⊙ 연결점 옮기기" }).click();
  await canvas.click({ position: { x: 100, y: 100 } });
  await expect(
    page.getByRole("button", { name: "⊙ 연결점 이동 중" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: "docs/drawing-mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "이 부위 지우기", exact: true }).click();
  await expect(page.getByLabel("그림 분석")).toContainText("아직 빈 종이");
  await expect(page.getByRole("button", { name: /^다음 ▶$/ })).toBeDisabled();
});

test("mobile touch strokes reach the drawing desk without scrolling the page", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5173");
  const box = (await page.getByLabel("머리 그리기 캔버스").boundingBox())!,
    session = await context.newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.x + 45, y: box.y + 100 }],
  });
  for (let i = 1; i < 20; i++)
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: box.x + 45 + i * 10, y: box.y + 100 + Math.sin(i * 0.4) * 30 },
      ],
    });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.getByRole("button", { name: /^다음 ▶$/ })).toBeEnabled();
  expect(await page.evaluate(() => scrollY)).toBe(0);
  expect(errors).toEqual([]);
  await context.close();
});

test("faster default, fast-forward cycling, pause and immediate results work together", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "샘플 경기", exact: true }).click();
  await page.clock.install({ time: new Date("2026-11-04T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-11-04T00:00:01Z"));
  await page.getByRole("button", { name: "경주 시작 →" }).click();
  await expect(
    page.getByRole("button", { name: "빨리감기 현재 1배" }),
  ).toBeVisible();
  await page.clock.runFor(2000);
  await expect(page.getByTestId("distance")).toHaveText("0.0/ 100m");
  await page.clock.runFor(2000);
  const before = parseFloat((await page.getByTestId("time").textContent())!);
  await page.getByRole("button", { name: "빨리감기 현재 1배" }).click();
  await page.clock.runFor(1000);
  const after = parseFloat((await page.getByTestId("time").textContent())!);
  expect(after - before).toBeGreaterThan(5.3);
  expect(after - before).toBeLessThan(6.7);
  await page.getByRole("button", { name: "빨리감기 현재 2배" }).click();
  await expect(
    page.getByRole("button", { name: "빨리감기 현재 4배" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "빨리감기 현재 4배" }).click();
  await expect(
    page.getByRole("button", { name: "빨리감기 현재 8배" }),
  ).toBeVisible();
  await expect(page.getByText("기본 3배 · 현재 24배 진행")).toBeVisible();
  await page.getByRole("button", { name: "Ⅱ 일시정지" }).click();
  const paused = await page.getByTestId("time").textContent();
  await page.clock.runFor(1000);
  expect(await page.getByTestId("time").textContent()).toBe(paused);
  await page.getByRole("button", { name: "계속 달리기 →" }).click();
  await page.screenshot({ path: "docs/playback-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "결과보기 →" }).click();
  await expect(
    page.getByRole("heading", { name: "끝까지 달렸어요!" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("kkumul-race:v1")!).records.length,
    ),
  ).toBe(1);
  expect(errors).toEqual([]);
});
test("manual result shortcut reports non-finish honestly without saved personal record", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "샘플 경기", exact: true }).click();
  await page.getByRole("button", { name: "조작 전환 ↔" }).click();
  await page.getByRole("button", { name: "경주 시작 →" }).click();
  await page.getByRole("button", { name: "결과보기 →" }).click();
  await expect(
    page.getByRole("heading", { name: "다음엔 결승선까지!" }),
  ).toBeVisible();
  await expect(page.locator(".my-result")).toContainText("미완주");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("kkumul-race:v1") || '{"records":[]}')
          .records.length,
    ),
  ).toBe(0);
});

test("abilities and new courses are visible and water course records are stored separately", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "샘플 경기", exact: true }).click();
  await expect(page.getByLabel("체형 능력치")).toBeVisible();
  await expect(page.getByLabel("체형 능력치").getByRole("meter")).toHaveCount(
    6,
  );
  await page.getByRole("button", { name: /물웅덩이 달리기/ }).click();
  await page.getByRole("button", { name: "경주 시작 →" }).click();
  await expect(
    page.getByRole("heading", { name: /물웅덩이 달리기/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "결과보기 →" }).click();
  await expect(
    page.getByRole("heading", { name: "끝까지 달렸어요!" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("kkumul-race:v1")!).records[0].course,
    ),
  ).toBe("puddles");
  expect(errors).toEqual([]);
});
test("shared challenge opens in a fresh browser and races the actual opponent replay", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "샘플 경기", exact: true }).click();
  await page.getByRole("button", { name: /언덕 달리기/ }).click();
  await page.getByRole("button", { name: "경주 시작 →" }).click();
  await page.getByRole("button", { name: "결과보기 →" }).click();
  await page.getByLabel("도전 문구").selectOption("2");
  await page.getByRole("button", { name: "친구에게 도전장 보내기 ↗" }).click();
  await expect(page.getByLabel("친구 도전 링크")).toHaveValue(/\/c\?d=/);
  const url = await page.getByLabel("친구 도전 링크").inputValue();
  const preview = page.getByAltText("내 뱀과 도발 문구가 담긴 공유 썸네일");
  await expect(preview).toBeVisible();
  await expect
    .poll(() => preview.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBe(1200);
  const crawler = await page.request.get(url, {
    headers: { "User-Agent": "KakaoTalk-Scrap" },
  });
  expect(crawler.status()).toBe(200);
  expect(await crawler.text()).toContain(
    'property="og:image:type" content="image/png"',
  );

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const friend = await context.newPage();
  friend.on("pageerror", (e) => errors.push(e.message));
  await friend.goto(url);
  await expect(friend.getByRole("heading", { name: "이겨 봐!" })).toBeVisible();
  await friend.screenshot({
    path: "docs/friend-challenge-mobile.png",
    fullPage: true,
  });
  await expect(
    friend.getByRole("button", { name: "내 뱀으로 도전하기 →", exact: false }),
  ).toBeDisabled();
  await friend.getByRole("button", { name: /내 뱀 그리기/ }).click();
  for (let i = 0; i < 3; i++) {
    await friend.getByRole("button", { name: "샘플 ＋" }).click();
    await friend
      .getByRole("button", { name: i < 2 ? /^다음 ▶$/ : /조립!/ })
      .click();
  }
  await friend.getByRole("textbox").fill("친구의 새 꼬물이");
  await friend.getByRole("button", { name: "경기 준비하러 →" }).click();
  await expect(
    friend.getByRole("button", { name: /언덕 달리기/ }),
  ).toBeDisabled();
  await expect(
    friend.getByRole("button", { name: "조작 전환 ↔" }),
  ).toBeDisabled();
  await friend.getByRole("button", { name: "도전 시작 →" }).click();
  await friend.getByRole("button", { name: "결과보기 →" }).click();
  await expect(friend.locator(".challenge-verdict")).toBeVisible();
  await context.close();
  expect(errors).toEqual([]);
});

test("steep hill preview, gradient HUD and hurdle jump button/spacebar are playable", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "샘플 경기", exact: true }).click();
  await page.getByRole("button", { name: /언덕 달리기/ }).click();
  await expect(page.getByLabel("가파른 언덕 두 개")).toBeVisible();
  await expect(
    page.getByText("첫 언덕 최대 42% · 두 번째 언덕 최대 36%"),
  ).toBeVisible();
  await page.clock.install();
  await page.getByRole("button", { name: "경주 시작 →" }).click();
  await page.clock.runFor(4300);
  await expect(page.getByTestId("terrain-status")).toContainText("오르막");
  await page.screenshot({
    path: "docs/steep-hills-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "결과보기 →" }).click();
  await page.getByRole("button", { name: "다른 코스 선택" }).click();
  await page.getByRole("button", { name: /점프 장애물 달리기/ }).click();
  await page.getByRole("button", { name: "조작 전환 ↔" }).click();
  await page.getByRole("button", { name: "경주 시작 →" }).click();
  await page.clock.runFor(3200);
  await page.getByRole("button", { name: /↑ 점프/ }).click();
  await page.clock.runFor(100);
  await expect(page.getByTestId("jump-status")).toHaveText("↑ 점프 중");
  await page.clock.runFor(2000);
  await page.keyboard.press("Space");
  await page.clock.runFor(100);
  await expect(page.getByTestId("jump-status")).toHaveText("↑ 점프 중");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.screenshot({
    path: "docs/hurdles-jump-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "결과보기 →" }).click();
  await page.getByRole("button", { name: "다른 코스 선택" }).click();
  await page.getByRole("button", { name: "경주 시작 →" }).click();
  await page.clock.runFor(4500);
  await page.screenshot({
    path: "docs/hurdles-auto-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("shared challenger with a saved snake can choose it and directly prepare the battle", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "샘플 경기", exact: true }).click();
  await page.getByRole("button", { name: "경주 시작 →" }).click();
  await page.getByRole("button", { name: "결과보기 →" }).click();
  await page.getByRole("button", { name: "친구에게 도전장 보내기 ↗" }).click();
  await expect(page.getByLabel("친구 도전 링크")).toHaveValue(/\/c\?d=/);
  const url = await page.getByLabel("친구 도전 링크").inputValue();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await context.addInitScript(
    (snake) =>
      localStorage.setItem(
        "kkumul-race:v1",
        JSON.stringify({ snakes: [snake], records: [] }),
      ),
    sampleSnake(2),
  );
  const friend = await context.newPage();
  await friend.goto(url);
  await friend.getByRole("button", { name: /내 뱀으로 도전하기/ }).click();
  await expect(
    friend.getByRole("heading", { name: sampleSnake(2).name, exact: true }),
  ).toBeVisible();
  await friend.getByRole("button", { name: "도전 시작 →" }).click();
  await friend.getByRole("button", { name: "결과보기 →" }).click();
  await expect(friend.locator(".challenge-verdict")).toBeVisible();
  await context.close();
});

test("combined course is first, selected by default and completes a main race", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "샘플 경기", exact: true }).click();
  const courses = page.locator(".course-options button");
  await expect(courses.first()).toContainText("종합경기");
  await expect(courses.first()).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("★ 메인 · 종합경기 100m")).toBeVisible();
  await page.getByRole("button", { name: "경주 시작 →" }).click();
  await expect(page.getByLabel("남은 추진 체력")).toBeVisible();
  await page.getByRole("button", { name: "결과보기 →" }).click();
  await expect(
    page.getByRole("heading", { name: "끝까지 달렸어요!" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("kkumul-race:v1")!).records[0].course,
    ),
  ).toBe("combined");
});

test("disconnected body is translucent, blocks assembly and saved race start, and can be repaired", async ({
  page,
}) => {
  const snake = sampleSnake();
  snake.parts.body = {
    ...snake.parts.body,
    strokes: [
      {
        points: [
          { x: 20, y: 200 },
          { x: 200, y: 200 },
        ],
        width: 12,
        color: "#365939",
      },
      {
        points: [
          { x: 270, y: 200 },
          { x: 390, y: 200 },
        ],
        width: 12,
        color: "#365939",
      },
    ],
    anchor: { x: 390, y: 200 },
    anchorManual: true,
  };
  await page.addInitScript(
    (s) =>
      localStorage.setItem(
        "kkumul-race:v1",
        JSON.stringify({ snakes: [s], records: [] }),
      ),
    snake,
  );
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "그리기 단계" })
    .getByRole("button", { name: /몸통/ })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "몸통 부위가 떨어져 있습니다",
  );
  const canvas = page.getByLabel("몸통 그리기 캔버스");
  const alpha = await canvas.evaluate((c: HTMLCanvasElement) => {
    const ctx = c.getContext("2d")!;
    return [100, 300].map(
      (x) =>
        ctx.getImageData(
          Math.floor((x * c.width) / 480),
          Math.floor((201 * c.height) / 420),
          1,
          1,
        ).data[3],
    );
  });
  expect(alpha[0]).toBeLessThan(140);
  expect(alpha[1]).toBeGreaterThan(240);
  await page
    .getByRole("navigation", { name: "그리기 단계" })
    .getByRole("button", { name: /꼬리/ })
    .click();
  await expect(page.getByRole("button", { name: /조립!/ })).toBeDisabled();
  await page.getByRole("button", { name: "내 뱀", exact: true }).click();
  await page.getByRole("button", { name: "경기 준비 →", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "경주 시작 →" }),
  ).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText(
    "몸통 부위가 떨어져 있습니다",
  );
  await page
    .getByRole("button", { name: "✎ 내 뱀 수정", exact: false })
    .click();
  await page
    .getByRole("navigation", { name: "그리기 단계" })
    .getByRole("button", { name: /몸통/ })
    .click();
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(
    box.x + (195 / 480) * box.width,
    box.y + (200 / 420) * box.height,
  );
  await page.mouse.down();
  await page.mouse.move(
    box.x + (275 / 480) * box.width,
    box.y + (200 / 420) * box.height,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "그리기 단계" })
    .getByRole("button", { name: /꼬리/ })
    .click();
  await expect(page.getByRole("button", { name: /조립!/ })).toBeEnabled();
  await page.getByRole("button", { name: /조립!/ }).click();
  await page.getByRole("button", { name: "경기 준비하러 →" }).click();
  await expect(page.getByRole("button", { name: "경주 시작 →" })).toBeEnabled();
});

test("open head eye dots stay opaque and allow assembly while a far detached mark is still blocked", async ({
  page,
}) => {
  const snake = sampleSnake();
  snake.parts.head = {
    ...snake.parts.head,
    strokes: [
      {
        points: [
          { x: 40, y: 140 },
          { x: 45, y: 90 },
          { x: 155, y: 90 },
          { x: 175, y: 140 },
        ],
        width: 6,
        color: "#365939",
      },
      ...[85, 130].map((x) => ({
        points: [{ x, y: 110 }],
        width: 8,
        color: "#263b30",
      })),
    ],
    anchor: { x: 40, y: 140 },
  };
  await page.addInitScript(
    (s) =>
      localStorage.setItem(
        "kkumul-race:v1",
        JSON.stringify({ snakes: [s], records: [] }),
      ),
    snake,
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByText("눈 장식으로 인식한 선은 연결하지 않아도 돼요.", {
      exact: true,
    }),
  ).toBeVisible();
  const canvas = page.getByLabel("머리 그리기 캔버스");
  expect(
    await canvas.evaluate(
      (c: HTMLCanvasElement) =>
        c
          .getContext("2d")!
          .getImageData(
            Math.floor((85 * c.width) / 480),
            Math.floor((110 * c.height) / 420),
            1,
            1,
          ).data[3],
    ),
  ).toBeGreaterThan(240);
  const box = (await canvas.boundingBox())!;
  await canvas.click({
    position: { x: (430 / 480) * box.width, y: (350 / 420) * box.height },
  });
  await expect(page.getByRole("alert")).toContainText(
    "머리 부위가 떨어져 있습니다",
  );
  await page
    .getByRole("navigation", { name: "그리기 단계" })
    .getByRole("button", { name: /꼬리/ })
    .click();
  await expect(page.getByRole("button", { name: /조립!/ })).toBeDisabled();
  await page
    .getByRole("navigation", { name: "그리기 단계" })
    .getByRole("button", { name: /머리/ })
    .click();
  await page.getByRole("button", { name: "↶ 되돌리기" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "그리기 단계" })
    .getByRole("button", { name: /꼬리/ })
    .click();
  await page.getByRole("button", { name: /조립!/ }).click();
  await page.getByRole("button", { name: "경기 준비하러 →" }).click();
  await expect(page.getByRole("button", { name: "경주 시작 →" })).toBeEnabled();
});

test("part drawing tips stay simple, assembly preview is still, and tail anchors do not jump when adding detail", async ({
  page,
}) => {
  const snake = sampleSnake();
  await page.addInitScript(
    (s) =>
      localStorage.setItem(
        "kkumul-race:v1",
        JSON.stringify({ snakes: [s], records: [] }),
      ),
    snake,
  );
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "그리기 단계" })
    .getByRole("button", { name: /꼬리/ })
    .click();
  await expect(page.getByLabel("꼬리 그리기 참고")).toContainText(
    "물속 추진과 착지",
  );
  await expect(page.getByLabel("꼬리 그리기 참고")).toContainText(
    "오른쪽 연결점에서 왼쪽",
  );
  await page.getByText("내 뱀 조립 미리보기", { exact: false }).click();
  const preview = page.getByLabel("그린 뱀 실시간 조립 미리보기");
  const first = await preview.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.waitForTimeout(400);
  expect(await preview.evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(
    first,
  );
  const canvas = page.getByLabel("꼬리 그리기 캔버스");
  const marker = () =>
    canvas.evaluate((c: HTMLCanvasElement) => {
      const data = c
        .getContext("2d")!
        .getImageData(0, 0, c.width, c.height).data;
      let x = 0,
        n = 0;
      for (let i = 0; i < data.length; i += 4)
        if (
          data[i] === 229 &&
          data[i + 1] === 174 &&
          data[i + 2] === 73 &&
          data[i + 3] > 240
        ) {
          x += (i / 4) % c.width;
          n++;
        }
      return x / Math.max(1, n);
    });
  const before = await marker(),
    box = (await canvas.boundingBox())!;
  await canvas.click({
    position: { x: (435 / 480) * box.width, y: (240 / 420) * box.height },
  });
  expect(Math.abs((await marker()) - before)).toBeLessThan(1);
  await page.getByText("연결점 설정", {exact:true}).click();
  await page.getByRole("button", { name: "연결점 자동 맞춤" }).click();
  expect(await marker()).toBeGreaterThan(before + 30);
  await page.getByRole("button", { name: "↶ 되돌리기" }).click();
  expect(Math.abs((await marker()) - before)).toBeLessThan(1);
  await page.getByRole("button", { name: "↶ 되돌리기" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
});
test("results explain start, actual water speed and the part that hit an obstacle", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "샘플 경기", exact: true }).click();
  await page.getByRole("button", { name: "경주 시작 →" }).click();
  await page.getByRole("button", { name: "결과보기 →" }).click();
  const panel = page.getByLabel("구간별 경기 분석");
  await expect(panel).toContainText("출발 20m");
  await expect(panel).toContainText("물 접촉 평균 속도");
  await expect(panel).toContainText("머리");
  await expect(panel).toContainText("꼬리");
  await expect(panel).toContainText("착지");
});
