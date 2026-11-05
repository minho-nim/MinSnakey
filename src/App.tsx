import Brand from "./Brand";
import { snakeConnections } from "./connectivity";
import { TAUNTS } from "./share-copy";
import {
  readChallenge,
  socialChallengeURLs,
  type Challenge,
} from "./challenge";
import {
  COURSES,
  courseInfo,
  terrainAt,
  obstaclesFor,
  type CourseId,
} from "./courses";
import AbilityPanel from "./AbilityPanel";
import Workshop from "./Workshop";
import { useEffect, useRef, useState } from "react";
import {
  analyze,
  RULES_VERSION,
  drawing,
  sampleSnake,
  matchedOpponents,
  type Drawing,
  type Mode,
  type PartName,
  type Snake,
} from "./model";
import {
  advance,
  DEFAULT_PLAYBACK_RATE,
  finishRace,
  jump,
  createRace,
  previewRacer,
  propel,
  standings,
  verifyChallengeRecord,
  type Race,
} from "./physics";
import { renderPreview, renderRace } from "./render";
import { best, previousRulesBest, load, save, type Saved } from "./storage";
const fmt = (n: number | null) => (n === null ? "—" : `${n.toFixed(2)}초`);
function Preview({
  snake,
  className = "",
}: {
  snake: Snake;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let frame = 0;
    const tick = (t: number) => {
      if (ref.current)
        renderPreview(ref.current, previewRacer(snake, t / 1000));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [snake]);
  return (
    <canvas
      ref={ref}
      className={`snake-preview ${className}`}
      aria-label={`${snake.name} 움직임 미리보기`}
    />
  );
}
function RaceView({
  race,
  onDone,
  onExit,
  onRestart,
}: {
  race: Race;
  onDone: () => void;
  onExit: () => void;
  onRestart: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    camera = useRef({ x: -2 }),
    [tick, setTick] = useState(0),
    [confirmExit, setConfirmExit] = useState(false),
    [playbackRate, setPlaybackRate] = useState(DEFAULT_PLAYBACK_RATE);
  const rateRef = useRef(playbackRate);
  rateRef.current = playbackRate;
  const done = useRef(false);
  useEffect(() => {
    done.current = false;
    camera.current = { x: -2 };
    let frame = 0,
      last = 0,
      lastUi = 0;
    const animate = (now: number) => {
      const dt = last ? (now - last) / 1000 : 0;
      last = now;
      advance(race, dt, rateRef.current);
      if (canvas.current)
        renderRace(canvas.current, race, camera.current, race.paused ? 0 : dt);
      if (now - lastUi > 65) {
        setTick((t) => t + 1);
        lastUi = now;
      }
      if (race.done && !done.current) {
        done.current = true;
        onDone();
        return;
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    const down = (e: KeyboardEvent) => {
      if (["a", "A", "ArrowLeft", "d", "D", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        if (!e.repeat)
          propel(race, ["a", "A", "ArrowLeft"].includes(e.key) ? -1 : 1);
      }
      if (
        obstaclesFor(race.course).length > 0 &&
        ["Space", "ArrowUp", "KeyW"].includes(e.code)
      ) {
        e.preventDefault();
        if (!e.repeat) jump(race);
        return;
      }
      if (e.code === "Space" || e.code === "KeyP") {
        e.preventDefault();
        race.paused = !race.paused;
        setTick((t) => t + 1);
      }
    };
    const hidden = () => {
      if (document.hidden) {
        race.paused = true;
        setTick((t) => t + 1);
      }
    };
    window.addEventListener("keydown", down);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", down);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [race, onDone]);
  const showResults = () => {
    if (done.current) return;
    finishRace(race);
    done.current = true;
    onDone();
  };
  const changeSpeed = () => {
    const rates = [3, 6, 12, 24];
    setPlaybackRate(rates[(rates.indexOf(playbackRate) + 1) % rates.length]);
  };
  void tick;
  const p = race.racers[0],
    rank = standings(race).indexOf(p) + 1;
  return (
    <section className="race-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">THE LITTLE BIG RACE</span>
          <h1>
            {courseInfo(race.course).name}{" "}
            <span className="tag">
              {race.mode === "auto" ? "자동" : "수동"}
            </span>
          </h1>
        </div>
        <button
          onClick={() => {
            race.paused = true;
            setTick((t) => t + 1);
          }}
          className="secondary"
        >
          Ⅱ 일시정지
        </button>
      </div>
      {race.challenge && (
        <div className="challenge-banner">
          <b>{race.challenge.snake.name}의 기록에 도전 중</b>
          <span>
            목표 {fmt(race.challenge.targetTime)} · 친구의 실제 경기 재생
          </span>
        </div>
      )}
      <div className="race-actions">
        <button
          className="secondary speed-button"
          aria-label={`빨리감기 현재 ${playbackRate / DEFAULT_PLAYBACK_RATE}배`}
          onClick={changeSpeed}
        >
          ⏩ 빨리감기{" "}
          <b>
            {playbackRate === DEFAULT_PLAYBACK_RATE
              ? "기본"
              : playbackRate / DEFAULT_PLAYBACK_RATE + "×"}
          </b>
        </button>
        <button className="primary result-shortcut" onClick={showResults}>
          결과보기 →
        </button>
      </div>
      <div className="race-status-line">
        <span>기본 3배 · 현재 {playbackRate}배 진행</span>
        {["combined", "hills"].includes(race.course) && (
          <strong data-testid="terrain-status">
            {terrainAt(race.course, p.distance).grade > 0.03
              ? "↗ 오르막"
              : terrainAt(race.course, p.distance).grade < -0.03
                ? "↘ 내리막"
                : "— 평지"}{" "}
            {Math.abs(terrainAt(race.course, p.distance).grade) > 0.03
              ? Math.round(
                  Math.abs(terrainAt(race.course, p.distance).grade) * 100,
                ) + "%"
              : ""}
          </strong>
        )}
        {obstaclesFor(race.course).length > 0 && (
          <strong data-testid="jump-status">
            {race.time < p.stumbleUntil
              ? "앗! 넘어짐 · 속도 감소"
              : p.jumpHeight > 0
                ? "↑ 점프 중"
                : `장애물 충돌 ${p.obstacleHits.length}회`}
          </strong>
        )}
      </div>
      <p className="water-status" aria-hidden={terrainAt(race.course, p.distance).waterDepth <= 0} style={{visibility: terrainAt(race.course, p.distance).waterDepth > 0 ? "visible" : "hidden"}}>
          {p.waterDrag === 0 && p.jumpHeight > 0
            ? "↗ 물 위로 점프 중 · 물 저항 없음"
            : "≈ 물에 닿은 부위만 저항을 받아요"}
      </p>
      <div className="race-hud">
        <div>
          <small>경기 시간</small>
          <strong data-testid="time">
            {race.time.toFixed(2)}
            <em>초</em>
          </strong>
        </div>
        <div>
          <small>현재 순위</small>
          <strong>
            {rank}
            <em>/ 4</em>
          </strong>
        </div>
        <div>
          <small>달린 거리</small>
          <strong data-testid="distance">
            {p.distance.toFixed(1)}
            <em>/ 100m</em>
          </strong>
        </div>
        <div>
          <small>현재 속도</small>
          <strong>
            {p.speed.toFixed(1)}
            <em>m/s</em>
          </strong>
        </div>
      </div>
      <div className="track-wrap">
        <canvas
          ref={canvas}
          className={`race-canvas ${["combined", "hills", "hurdles"].includes(race.course) ? "terrain-canvas" : ""}`}
          aria-label="4마리 뱀의 100m 경주"
        />
        {race.countdown > 0 && !race.paused && (
          <div className="countdown">
            <span>준비됐나요?</span>
            <strong>{Math.ceil(race.countdown)}</strong>
          </div>
        )}
        {race.countdown === 0 && race.time < 0.6 && !race.paused && (
          <div className="countdown go">
            <strong>GO!</strong>
          </div>
        )}
      </div>
      <div className="race-bottom">
        <div className="race-progress">
          <div>
            <b>나의 100m</b>
            <span>{Math.min(100, p.distance).toFixed(1)}%</span>
          </div>
          <progress max="100" value={p.distance} />
        </div>
        <div className="stamina-display">
          <span>
            추진 체력{" "}
            <b>{Math.round(Math.max(0, (p.energy - 0.55) / 0.45) * 100)}%</b>
          </span>
          <progress
            aria-label="남은 추진 체력"
            value={Math.max(0, (p.energy - 0.55) / 0.45)}
            max="1"
          />
        </div>
        {obstaclesFor(race.course).length > 0 && race.mode === "manual" && (
          <button
            className="jump-button"
            disabled={
              race.paused ||
              race.countdown > 0 ||
              p.finish !== null ||
              p.jumpHeight > 0
            }
            onClick={() => jump(race)}
          >
            ↑ 점프 <small>SPACE · W · ↑</small>
          </button>
        )}
        {obstaclesFor(race.course).length > 0 && race.mode === "auto" && (
          <p className="jump-hint">
            자동으로 점프해요. 부딪히면 속도가 줄어요!
          </p>
        )}
        {race.mode === "auto" ? (
          <p className="spectator">
            빨리감기로 빠르게 보거나 결과보기로 바로 확인할 수 있어요.
          </p>
        ) : (
          <div className="controls">
            <button
              aria-label="왼쪽 추진"
              disabled={race.paused || race.countdown > 0 || p.finish !== null}
              onPointerDown={(e) => {
                e.preventDefault();
                propel(race, -1);
              }}
            >
              ← <span>A · 왼쪽</span>
            </button>
            <p>
              좌우를 번갈아
              <br />
              <b>일정한 리듬으로!</b>
            </p>
            <button
              aria-label="오른쪽 추진"
              disabled={race.paused || race.countdown > 0 || p.finish !== null}
              onPointerDown={(e) => {
                e.preventDefault();
                propel(race, 1);
              }}
            >
              <span>D · 오른쪽</span> →
            </button>
          </div>
        )}
        {race.mode === "manual" && (
          <p className="result-hint">
            결과보기는 지금까지의 조작 상태에서 추가 입력 없이 계산해요.
          </p>
        )}
        {p.finish !== null && (
          <p>완주했어요! 다른 선수들을 기다리는 중입니다.</p>
        )}
      </div>
      {race.paused && (
        <div className="overlay">
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-label="경기 일시정지"
          >
            <span className="eyebrow">TAKE A BREATHER</span>
            <h2>{confirmExit ? "경기를 그만둘까요?" : "잠깐, 숨 고르기"}</h2>
            <p>
              {confirmExit
                ? "이번 경기의 기록은 저장되지 않아요."
                : "꼬물이도 잠시 쉬고 있어요."}
            </p>
            {confirmExit ? (
              <>
                <button className="primary" onClick={onExit}>
                  경기 종료
                </button>
                <button
                  className="secondary"
                  onClick={() => setConfirmExit(false)}
                >
                  돌아가기
                </button>
              </>
            ) : (
              <>
                <button
                  className="primary"
                  autoFocus
                  onClick={() => {
                    race.paused = false;
                    setTick((t) => t + 1);
                  }}
                >
                  계속 달리기 →
                </button>
                <button className="secondary" onClick={onRestart}>
                  처음부터 다시
                </button>
                <button
                  className="text-button"
                  onClick={() => setConfirmExit(true)}
                >
                  경기 종료
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
export default function App() {
  const [saved, setSaved] = useState<Saved>(load),
    [page, setPage] = useState<
      "home" | "draw" | "preview" | "prepare" | "race" | "result" | "challenge"
    >("draw");
  const [snake, setSnake] = useState<Snake>(
      () => load().snakes[0] || { ...sampleSnake(), id: crypto.randomUUID() },
    ),
    [step, setStep] = useState(0),
    [mode, setMode] = useState<Mode>("auto"),
    [course, setCourse] = useState<CourseId>("combined"),
    [notice, setNotice] = useState(""),
    [race, setRace] = useState<Race | null>(null),
    [previousBest, setPreviousBest] = useState<number | null>(null),
    [incoming, setIncoming] = useState<Challenge | null>(null),
    [shareURL, setShareURL] = useState(""),
    [sharePreview, setSharePreview] = useState(""),
    [taunt, setTaunt] = useState(0),
    [sharing, setSharing] = useState(false);
  const [editParts, setEditParts] = useState<Record<PartName, Drawing>>(
      load().snakes[0]?.parts || {
        head: drawing([], "head"),
        body: drawing([], "body"),
        tail: drawing([], "tail"),
      },
    ),
    [editName, setEditName] = useState("나의 꼬물이");
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = (message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 4500);
  };
  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );
  useEffect(() => {
    let active = true;
    readChallenge(window.location.hash)
      .then((challenge) => {
        if (!active || !challenge) return;
        if (!verifyChallengeRecord(challenge))
          throw new Error(
            "도전 기록이 현재 규칙과 맞지 않아요. 새 링크를 받아주세요.",
          );
        setIncoming(challenge);
        setCourse(challenge.course);
        setMode(challenge.mode);
        setPage("challenge");
      })
      .catch((error) => {
        if (active) notify(error.message);
      });
    return () => {
      active = false;
    };
  }, []);
  const leaveChallenge = () => {
    setIncoming(null);
    setShareURL("");
    history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
    setPage("home");
  };
  const createChallenge = async () => {
    if (!race || sharing) return;
    setSharing(true);
    try {
      const base = location.hostname.endsWith(".chatgpt.site")
        ? "https://minho-nim.github.io/MinSnakey/"
        : location.href;
      const urls = await socialChallengeURLs(race, base, taunt);
      setShareURL(urls.share);
      setSharePreview(urls.image);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "도전 링크를 만들지 못했어요.",
      );
    } finally {
      setSharing(false);
    }
  };
  const copyChallenge = async () => {
    try {
      await navigator.clipboard.writeText(shareURL);
      notify("도전 링크를 복사했어요. 친구에게 보내주세요!");
    } catch {
      notify("아래 주소를 길게 눌러 복사해 주세요.");
    }
  };
  const persist = (value: Saved) => {
    setSaved(value);
    if (!save(value))
      notify(
        "브라우저 저장 공간이 부족해요. 이번 변경은 현재 화면에서만 유지돼요.",
      );
  };
  const prepare = (s = snake) => {
    setSnake(s);
    setMode(incoming?.mode || "auto");
    if (incoming) setCourse(incoming.course);
    setPage("prepare");
    window.scrollTo(0, 0);
  };
  const edit = (fresh = false) => {
    setEditParts(
      fresh
        ? {
            head: drawing([], "head"),
            body: drawing([], "body"),
            tail: drawing([], "tail"),
          }
        : snake.parts,
    );
    setEditName(fresh ? "나의 꼬물이" : snake.name);
    setStep(0);
    if (fresh) setSnake({ ...sampleSnake(), id: crypto.randomUUID() });
    setPage("draw");
    window.scrollTo(0, 0);
  };
  const saveSnake = () => {
    const check = snakeConnections({ ...snake, parts: editParts });
    if (!check.connected) {
      notify(check.message);
      return;
    }
    const value: Snake = {
      ...snake,
      name: editName.trim() || "이름 없는 꼬물이",
      parts: editParts,
    };
    setSnake(value);
    persist({
      ...saved,
      snakes: [value, ...saved.snakes.filter((s) => s.id !== value.id)].slice(
        0,
        20,
      ),
    });
    setPage("preview");
  };
  const start = () => {
    const check = snakeConnections(snake);
    if (!check.connected) {
      notify(check.message);
      return;
    }
    setShareURL("");
    setRace(createRace(snake, mode, course, incoming, crypto.getRandomValues(new Uint32Array(1))[0] || 1));
    setPage("race");
    window.scrollTo(0, 0);
  };
  const finishRef = useRef<() => void>(() => {});
  finishRef.current = () => {
    if (!race) return;
    const time = race.racers[0].finish;
    setPreviousBest(best(saved, snake.id, mode, RULES_VERSION, course));
    if (time !== null)
      persist({
        ...saved,
        records: [
          ...saved.records,
          {
            snakeId: snake.id,
            mode,
            time,
            date: Date.now(),
            rulesVersion: RULES_VERSION,
            course,
          },
        ].slice(-200),
      });
    setPage("result");
  };
  const onDone = useRef(() => finishRef.current()).current;
  const stat = analyze(snake);
  return (
    <div className={`game-shell page-${page}`}>
      <div className="stadium-scenery" aria-hidden="true">
        <div className="crowd" />
        <div className="stadium-rail" />
        <div className="stadium-floor" />
      </div>
      <header className="site-header">
        <button
          className="brand"
          onClick={() => {
            if (page === "race") {
              race!.paused = true;
              notify("경기 일시정지 메뉴에서 종료할 수 있어요.");
              return;
            }
            setPage("home");
          }}
        >
          <Brand />
        </button>
        <span className="header-note">DRAW IT. RACE IT.</span>
        <span className="local-badge">
          <i />내 브라우저에 저장
        </span>
      </header>
      <main>
        {page === "challenge" && incoming && (
          <section className="challenge-page">
            <span className="eyebrow">도전장이 도착했어요!</span>
            <h1 className="challenge-taunt">
              {TAUNTS[incoming.taunt ?? 0].title}
            </h1>
            <p className="taunt-subtitle">
              {TAUNTS[incoming.taunt ?? 0].subtitle}
            </p>
            <div className="challenge-opponent">
              <Preview snake={incoming.snake} />
              <h2>{incoming.snake.name}</h2>
              <p>
                {courseInfo(incoming.course).name} ·{" "}
                {incoming.mode === "auto" ? "자동" : "수동"} 달리기
              </p>
              <strong>{fmt(incoming.targetTime)}</strong>
            </div>
            <p className="challenge-explainer">
              친구의 실제 경기를 재생해 같은 조건으로 대결해요.
              <br />내 뱀을 골라 기록에 도전해 보세요!
            </p>
            {saved.snakes.length > 0 ? (
              <div className="challenge-my-racer">
                <label>
                  도전할 내 뱀
                  <select
                    aria-label="도전할 내 뱀"
                    value={snake.id}
                    onChange={(e) =>
                      setSnake(
                        saved.snakes.find((s) => s.id === e.target.value) ||
                          saved.snakes[0],
                      )
                    }
                  >
                    {saved.snakes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Preview snake={snake} />
                <b>{snake.name}</b>
              </div>
            ) : (
              <p className="empty-own-racer">
                아직 저장한 내 뱀이 없어요.
                <br />새 뱀을 그린 뒤 바로 도전할 수 있어요.
              </p>
            )}
            <div className="challenge-paths">
              <button
                className="primary"
                disabled={!saved.snakes.length}
                onClick={() =>
                  prepare(
                    saved.snakes.find((s) => s.id === snake.id) ||
                      saved.snakes[0],
                  )
                }
              >
                내 뱀으로 도전하기 →<small>저장한 뱀을 골라 경기 준비</small>
              </button>
              <button className="secondary" onClick={() => edit(true)}>
                ✎ 내 뱀 그리기<small>머리·몸통·꼬리를 그리고 바로 도전</small>
              </button>
            </div>
            <button className="text-button" onClick={leaveChallenge}>
              혼자 연습하기
            </button>
          </section>
        )}
        {page === "home" && (
          <section className="game-lobby">
            <div className="arcade-title">
              <span className="mini-title">내 낙서가 진짜 달린다!</span>
              <h1>
                <Brand large />
              </h1>
            </div>
            <div className="lobby-paper">
              <Preview snake={snake} />
              <h2>오늘은 어떤 뱀으로 달릴까?</h2>
              <p>머리 · 몸통 · 꼬리를 그리고 100m에 도전!</p>
              <button className="primary" onClick={() => edit(true)}>
                ＋ 내 뱀 그리기
              </button>
              <button
                className="text-button"
                onClick={() => prepare(sampleSnake())}
              >
                샘플로 먼저 달려보기 ↗
              </button>
            </div>
            <section className="garage">
              <h2>
                내 뱀 <span className="count">{saved.snakes.length}</span>
              </h2>
              <div className="snake-grid">
                {saved.snakes.map((s) => (
                  <article className="snake-card" key={s.id}>
                    <Preview snake={s} />
                    <h3>{s.name}</h3>
                    <p>
                      자동 최고 <b>{fmt(best(saved, s.id, "auto"))}</b>
                    </p>
                    <button className="secondary" onClick={() => prepare(s)}>
                      경기 준비 →
                    </button>
                  </article>
                ))}
                {!saved.snakes.length && (
                  <p className="empty-garage">
                    아직 저장한 뱀이 없어요. 첫 꼬물이를 그려보세요!
                  </p>
                )}
              </div>
            </section>
          </section>
        )}
        {page === "draw" && incoming && (
          <div className="challenge-banner">
            <b>{incoming.snake.name}에게 도전할 내 뱀을 그려주세요!</b>
            <span>조립 후 같은 코스로 바로 연결돼요.</span>
          </div>
        )}
        {page === "draw" && (
          <Workshop
            snake={snake}
            parts={editParts}
            step={step}
            onStep={setStep}
            onChange={setEditParts}
            onAssemble={() => saveSnake()}
            onQuickStart={saveSnake}
            onHome={() => setPage("home")}
            onSample={() => prepare(sampleSnake())}
          />
        )}
        {page === "preview" && (
          <section className="preview-page">
            <span className="eyebrow">HELLO, LITTLE RACER</span>
            <h1>반가워, 나의 꼬물이!</h1>
            <p className="muted">내가 그린 선이 움직이기 시작했어요.</p>
            <div className="assembled">
              <Preview snake={snake} />
              <span className="tag">
                {snakeConnections(snake).connected
                  ? "머리 + 몸통 + 꼬리 · 연결 완료"
                  : "연결을 확인해 주세요"}
              </span>
            </div>
            <label className="name-field">
              꼬물이 이름
              <input
                maxLength={24}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="이름을 지어주세요"
              />
            </label>
            {!snakeConnections(snake).connected && (
              <p className="connection-warning" role="alert">
                {snakeConnections(snake).message}
              </p>
            )}
            <AbilityPanel stats={stat} />
            <div className="center-actions">
              <button className="secondary" onClick={() => edit()}>
                그림 수정
              </button>
              <button
                className="primary"
                disabled={!snakeConnections(snake).connected}
                onClick={() => {
                  const s = {
                    ...snake,
                    name: editName.trim() || "나의 꼬물이",
                  };
                  persist({
                    ...saved,
                    snakes: [
                      s,
                      ...saved.snakes.filter((v) => v.id !== s.id),
                    ].slice(0, 20),
                  });
                  prepare(s);
                }}
              >
                경기 준비하러 →
              </button>
            </div>
          </section>
        )}
        {page === "prepare" && (
          <section className="prepare-page">
            <button className="back" onClick={() => setPage("home")}>
              ← 메인으로
            </button>
            <div className="section-heading">
              <div>
                <span className="eyebrow">ON YOUR MARKS</span>
                <h1>경기 준비</h1>
              </div>
              <span className="muted">작은 몸으로, 큰 도전</span>
            </div>
            {incoming && (
              <div className="challenge-banner">
                <b>
                  {incoming.snake.name}의 기록 {fmt(incoming.targetTime)}에
                  도전!
                </b>
                <span>코스와 조작 방식은 친구와 같게 고정돼요.</span>
                <button className="text-button" onClick={leaveChallenge}>
                  도전 종료
                </button>
              </div>
            )}
            {!snakeConnections(snake).connected && (
              <p className="connection-warning" role="alert">
                {snakeConnections(snake).message} 위의 내 뱀 수정에서 고칠 수
                있어요.
              </p>
            )}
            <div className="prepare-grid">
              <div className="racer-profile">
                <span className="eyebrow">YOUR RACER</span>
                <Preview snake={snake} />
                <h2>{snake.name}</h2>
                <button className="text-button" onClick={() => edit()}>
                  ✎ 내 뱀 수정
                </button>
                <AbilityPanel stats={stat} compact />
                <div className="best-record">
                  <small>
                    나의 {mode === "auto" ? "자동" : "수동"} 최고 기록
                  </small>
                  <strong>
                    {fmt(best(saved, snake.id, mode, RULES_VERSION, course))}
                  </strong>
                </div>
                <p className="record-rule-note">
                  최고 기록은 현재 체형 규칙 기준이에요.
                  {previousRulesBest(saved, snake.id, mode, course) !==
                    null && (
                    <span>
                      이전 규칙 최고:{" "}
                      {fmt(previousRulesBest(saved, snake.id, mode, course))}
                    </span>
                  )}
                </p>
              </div>
              <div className="race-options">
                <h3>
                  <span>01</span> 어떤 레이스를 달릴까요?
                </h3>
                {course === "combined" && (
                  <div className="combined-preview">
                    <b>★ 메인 · 종합경기 100m</b>
                    <p>
                      0–20m 출발 가속 → 20–42m 언덕 → 50–72m 물웅덩이 → 80·92m
                      점프
                    </p>
                    <small>
                      가벼움의 가속 · 긴 몸의 출력과 지구력 · 큰 체격의 무게와
                      저항, 모든 구간의 합으로 승부!
                    </small>
                  </div>
                )}
                {course === "hills" && (
                  <div className="hill-preview">
                    <svg
                      viewBox="0 0 360 76"
                      role="img"
                      aria-label="가파른 언덕 두 개"
                    >
                      <path
                        d="M0 66 L40 66 C65 66 75 10 105 10 S145 66 170 66 L190 66 C215 66 225 22 250 22 S285 66 310 66 L360 66"
                        fill="none"
                        stroke="#7c9854"
                        strokeWidth="7"
                      />
                      <path
                        d="M0 70 H360"
                        stroke="#c3cdad"
                        strokeDasharray="4 4"
                      />
                    </svg>
                    <span>첫 언덕 최대 42% · 두 번째 언덕 최대 36%</span>
                  </div>
                )}
                <div className="course-options">
                  {COURSES.map((c) => (
                    <button
                      key={c.id}
                      className={`course ${c.id === "combined" ? "main-course" : ""} ${course === c.id ? "selected" : ""}`}
                      aria-pressed={course === c.id}
                      disabled={!!incoming}
                      onClick={() => setCourse(c.id)}
                    >
                      <span className="course-icon">{c.icon}</span>
                      <div>
                        <b>{c.name}</b>
                        <small>{c.description}</small>
                      </div>
                      {course === c.id && <span className="check">✓</span>}
                    </button>
                  ))}
                </div>
                <h3>
                  <span>02</span> 오늘의 출전 선수
                </h3>
                <p className="class-note">
                  전체 크기 자동 보정 · 내 뱀과 비슷한 기본 능력의 NPC가
                  출전해요. 친구의 뱀·기록은 그대로예요.
                </p>
                <div className="competitors">
                  {[
                    snake,
                    ...(incoming
                      ? [incoming.snake, ...matchedOpponents(snake).slice(1)]
                      : matchedOpponents(snake)),
                  ].map((s, i) => (
                    <div key={i}>
                      <Preview snake={s} />
                      <b>{s.name}</b>
                      <small>
                        {i === 0
                          ? "나"
                          : incoming && i === 1
                            ? "친구 기록"
                            : "CPU 0" + i}
                      </small>
                    </div>
                  ))}
                </div>
                <h3>
                  <span>03</span> 어떻게 달릴까요?
                </h3>
                <div className="mode-panel">
                  <div>
                    <span className="mode-icon">
                      {mode === "auto" ? "〰" : "↔"}
                    </span>
                    <div>
                      <b>
                        현재 조작:{" "}
                        {mode === "auto" ? "자동 달리기" : "수동 달리기"}
                      </b>
                      <p>
                        {mode === "auto"
                          ? "뱀이 자신의 능력치와 물리 규칙에 따라 자동으로 달립니다."
                          : "좌우 버튼 또는 A / D 키를 번갈아 눌러 추진을 조절해요."}
                      </p>
                    </div>
                  </div>
                  <button
                    className="secondary"
                    disabled={!!incoming}
                    onClick={() => setMode(mode === "auto" ? "manual" : "auto")}
                  >
                    {mode === "auto" ? "조작 전환" : "자동으로 전환"} ↔
                  </button>
                </div>
                <p className="small muted">
                  경기가 시작되면 조작 방식을 바꿀 수 없어요.
                </p>
                <div className="start-area">
                  <span>
                    {courseInfo(course).name} · 4마리 ·{" "}
                    {mode === "auto" ? "자동" : "수동"} 달리기
                  </span>
                  <button
                    className="primary start-button"
                    disabled={!snakeConnections(snake).connected}
                    onClick={start}
                  >
                    {incoming ? "도전 시작" : "경주 시작"} <span>→</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
        {page === "race" && race && (
          <RaceView
            key={
              race.racers[0].snake.id + String(race.racers[0].snake.createdAt)
            }
            race={race}
            onDone={onDone}
            onExit={() => prepare()}
            onRestart={() => {
              setRace(createRace(snake, mode, course, incoming, crypto.getRandomValues(new Uint32Array(1))[0] || 1));
            }}
          />
        )}
        {page === "result" && race && (
          <section className="result-page">
            <span className="eyebrow">WHAT A LITTLE ADVENTURE!</span>
            <h1>
              {race.racers[0].finish === null
                ? "다음엔 결승선까지!"
                : "끝까지 달렸어요!"}
            </h1>
            <p className="muted">
              {courseInfo(course).name} · {mode === "auto" ? "자동" : "수동"}{" "}
              모드
            </p>
            <div className="result-hero">
              <Preview snake={snake} />
              <div>
                <span className="tag">
                  {race.racers[0].finish !== null
                    ? `${standings(race).indexOf(race.racers[0]) + 1}위`
                    : "미완주"}
                </span>
                <h2>{fmt(race.racers[0].finish)}</h2>
                <b>
                  {race.racers[0].finish !== null &&
                  (previousBest === null ||
                    race.racers[0].finish < previousBest)
                    ? "✦ 새로운 개인 최고 기록!"
                    : `이전 최고 ${fmt(previousBest)}`}
                </b>
                <p>최고 속도 {race.racers[0].peak.toFixed(2)}m/s</p>
              </div>
            </div>
            <div className="race-breakdown" aria-label="구간별 경기 분석">
              <div>
                <small>출발 20m</small>
                <b>{fmt(race.racers[0].telemetry.split20)}</b>
              </div>
              <div>
                <small>물 접촉 평균 속도</small>
                <b>
                  {race.racers[0].telemetry.waterTime > 0
                    ? (
                        race.racers[0].telemetry.waterDistance /
                        race.racers[0].telemetry.waterTime
                      ).toFixed(1) + "m/s"
                    : "물 접촉 없음"}
                </b>
              </div>
              <div>
                <small>걸린 부위</small>
                <b>
                  {(["head", "body", "tail"] as const)
                    .map(
                      (k) =>
                        `${{ head: "머리", body: "몸통", tail: "꼬리" }[k]} ${race.racers[0].hitParts.filter((h) => h.part === k).length}회`,
                    )
                    .join(" · ")}
                </b>
              </div>
              <div>
                <small>착지</small>
                <b>{race.racers[0].telemetry.landings}회</b>
              </div>
            </div>
            <div className="result-table">
              <div className="table-header">
                <span>순위</span>
                <span>선수</span>
                <span>완주 기록</span>
              </div>
              {standings(race).map((r, i) => (
                <div
                  key={r.snake.id}
                  className={r === race.racers[0] ? "my-result" : ""}
                >
                  <b>{r.finish !== null ? i + 1 : "—"}</b>
                  <span>
                    {r.snake.name} {r === race.racers[0] && <small>나</small>}
                  </span>
                  <strong>
                    {r.finish === null ? "미완주" : fmt(r.finish)}
                  </strong>
                </div>
              ))}
            </div>
            {race.timedOut && (
              <p className="muted">90초 제한 시간이 지나 경기가 종료됐어요.</p>
            )}
            <div className="center-actions">
              <button className="primary" onClick={start}>
                다시 달리기 ↻
              </button>
              <button className="secondary" onClick={() => edit()}>
                내 뱀 수정
              </button>
            </div>
            {race.challenge && (
              <div className="challenge-verdict">
                {race.racers[0].finish === null
                  ? "이번에는 완주하지 못했어요."
                  : Math.abs(race.racers[0].finish! - race.racers[1].finish!) <
                      0.02
                    ? "친구와 같은 기록이에요!"
                    : race.racers[0].finish! < race.racers[1].finish!
                      ? `도전 성공! 친구보다 ${(race.racers[1].finish! - race.racers[0].finish!).toFixed(2)}초 빨랐어요!`
                      : `친구의 기록까지 ${(race.racers[0].finish! - race.racers[1].finish!).toFixed(2)}초! 다시 도전해 보세요.`}
              </div>
            )}
            {race.racers[0].finish !== null && (
              <div className="share-challenge">
                <label className="taunt-picker">
                  친구에게 한마디
                  <select
                    aria-label="도전 문구"
                    value={taunt}
                    onChange={(e) => {
                      setTaunt(+e.target.value);
                      setShareURL("");
                      setSharePreview("");
                    }}
                  >
                    {TAUNTS.map((t, i) => (
                      <option key={t.title} value={i}>
                        {t.title} {t.subtitle}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  className="primary"
                  disabled={sharing}
                  onClick={createChallenge}
                >
                  {sharing ? "도전장 만드는 중…" : "친구에게 도전장 보내기 ↗"}
                </button>
                {shareURL && (
                  <div className="share-link-box">
                    <div className="social-card-preview">
                      <img
                        src={sharePreview}
                        alt="내 뱀과 도발 문구가 담긴 공유 썸네일"
                      />
                    </div>

                    <label>
                      친구에게 보낼 도전 링크
                      <input
                        aria-label="친구 도전 링크"
                        readOnly
                        value={shareURL}
                        onClick={(e) => e.currentTarget.select()}
                      />
                    </label>
                    <button className="secondary" onClick={copyChallenge}>
                      링크 복사
                    </button>
                    <p>
                      이 링크를 카톡에 붙이면 내 뱀과 도전 문구가 썸네일로
                      보여요. 누르면 GitHub 게임의 도전 화면으로 이동해요.
                    </p>
                  </div>
                )}
              </div>
            )}
            <div className="result-links">
              <button className="text-button" onClick={() => prepare()}>
                다른 코스 선택
              </button>
              <button className="text-button" onClick={() => setPage("home")}>
                메인 화면
              </button>
            </div>
          </section>
        )}
      </main>
      <footer>
        <Brand />
        <p>작은 낙서의 커다란 레이스.</p>
        <small>로그인 없이 · 외부 AI 없이 · 내 기기에만 저장</small>
      </footer>
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </div>
  );
}
