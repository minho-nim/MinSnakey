import Workshop from "./Workshop";
import { useEffect, useRef, useState } from "react";
import {
  analyze,
  drawing,
  sampleSnake,
  type Drawing,
  type Mode,
  type PartName,
  type Snake,
} from "./model";
import {
  advance,
  DEFAULT_PLAYBACK_RATE,
  finishRace,
  createRace,
  previewRacer,
  propel,
  standings,
  type Race,
} from "./physics";
import { renderPreview, renderRace } from "./render";
import { best, load, save, type Saved } from "./storage";
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
    [playbackRate,setPlaybackRate]=useState(DEFAULT_PLAYBACK_RATE);
  const rateRef=useRef(playbackRate);
  rateRef.current=playbackRate;
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
      if (e.code === "Space") {
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
  const showResults=()=>{if(done.current)return;finishRace(race);done.current=true;onDone()};
  const changeSpeed=()=>{const rates=[1.5,3,6];setPlaybackRate(rates[(rates.indexOf(playbackRate)+1)%rates.length])};
  void tick;
  const p = race.racers[0],
    rank = standings(race).indexOf(p) + 1;
  return (
    <section className="race-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">THE LITTLE BIG RACE</span>
          <h1>
            100m 달리기{" "}
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
      <div className="race-actions">
        <button className="secondary speed-button" aria-label={`빨리감기 현재 ${playbackRate}배`} onClick={changeSpeed}>⏩ 빨리감기 <b>{playbackRate}×</b></button>
        <button className="primary result-shortcut" onClick={showResults}>결과보기 →</button>
      </div>
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
          className="race-canvas"
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
        {race.mode === "manual" && <p className="result-hint">결과보기는 지금까지의 조작 상태에서 추가 입력 없이 계산해요.</p>}
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
      "home" | "draw" | "preview" | "prepare" | "race" | "result"
    >("draw");
  const [snake, setSnake] = useState<Snake>(
      () => load().snakes[0] || { ...sampleSnake(), id: crypto.randomUUID() },
    ),
    [step, setStep] = useState(0),
    [mode, setMode] = useState<Mode>("auto"),
    [notice, setNotice] = useState(""),
    [race, setRace] = useState<Race | null>(null),
    [previousBest, setPreviousBest] = useState<number | null>(null);
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
  const persist = (value: Saved) => {
    setSaved(value);
    if (!save(value))
      notify(
        "브라우저 저장 공간이 부족해요. 이번 변경은 현재 화면에서만 유지돼요.",
      );
  };
  const prepare = (s = snake) => {
    setSnake(s);
    setMode("auto");
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
  };
  const saveSnake = () => {
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
    setRace(createRace(snake, mode));
    setPage("race");
    window.scrollTo(0, 0);
  };
  const finishRef = useRef<() => void>(() => {});
  finishRef.current = () => {
    if (!race) return;
    const time = race.racers[0].finish;
    setPreviousBest(best(saved, snake.id, mode));
    if (time !== null)
      persist({
        ...saved,
        records: [
          ...saved.records,
          { snakeId: snake.id, mode, time, date: Date.now() },
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
          <span className="brand-mark">〰</span>꼬물 레이스
          <span className="version">v0.3</span>
        </button>
        <span className="header-note">DRAW IT. RACE IT.</span>
        <span className="local-badge">
          <i />내 브라우저에 저장
        </span>
      </header>
      <main>
        {page === "home" && (
          <section className="game-lobby">
            <div className="arcade-title">
              <span className="mini-title">내 낙서가 진짜 달린다!</span>
              <h1>
                꼬물<span>레이스</span>
                <i>〰</i>
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
        {page === "draw" && (
          <Workshop
            snake={snake}
            parts={editParts}
            step={step}
            onStep={setStep}
            onChange={setEditParts}
            onAssemble={saveSnake}
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
              <span className="tag">머리 + 몸통 + 꼬리 · 연결 완료</span>
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
            <div className="stats-row">
              <span>
                가속력 <b>{stat.acceleration.toFixed(1)}</b>
              </span>
              <span>
                최고 속도 <b>{stat.maxSpeed.toFixed(1)}</b>
              </span>
              <span>
                유연성 <b>{Math.round(stat.flex * 100)}</b>
              </span>
            </div>
            <p className="muted small">
              체형으로 계산한 특성이에요. 실제 기록은 경기에서 확인하세요.
            </p>
            <div className="center-actions">
              <button className="secondary" onClick={() => edit()}>
                그림 수정
              </button>
              <button
                className="primary"
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
            <div className="prepare-grid">
              <div className="racer-profile">
                <span className="eyebrow">YOUR RACER</span>
                <Preview snake={snake} />
                <h2>{snake.name}</h2>
                <button className="text-button" onClick={() => edit()}>
                  ✎ 내 뱀 수정
                </button>
                <div className="profile-stats">
                  {[
                    ["가속력", stat.acceleration / 5],
                    ["최고 속도", stat.maxSpeed / 10],
                    ["유연성", stat.flex / 1.3],
                  ].map(([label, v]) => (
                    <div key={String(label)}>
                      <span>{label}</span>
                      <meter min="0" max="1" value={Number(v)} />
                    </div>
                  ))}
                </div>
                <div className="best-record">
                  <small>
                    나의 {mode === "auto" ? "자동" : "수동"} 최고 기록
                  </small>
                  <strong>{fmt(best(saved, snake.id, mode))}</strong>
                </div>
              </div>
              <div className="race-options">
                <h3>
                  <span>01</span> 어떤 레이스를 달릴까요?
                </h3>
                <div className="course-options">
                  <button className="course selected" aria-pressed="true">
                    <span className="course-icon">⚑</span>
                    <div>
                      <b>100m 달리기</b>
                      <small>직선 트랙 · 4마리 · 스피드 승부</small>
                    </div>
                    <span className="check">✓</span>
                  </button>
                  <button className="course" disabled>
                    <span className="course-icon">⌁</span>
                    <div>
                      <b>코스 달리기</b>
                      <small>다양한 지형에서 펼치는 모험</small>
                    </div>
                    <span className="tag">준비 중</span>
                  </button>
                </div>
                <h3>
                  <span>02</span> 오늘의 출전 선수
                </h3>
                <div className="competitors">
                  {[snake, ...[1, 2, 3].map(sampleSnake)].map((s, i) => (
                    <div key={i}>
                      <Preview snake={s} />
                      <b>{s.name}</b>
                      <small>{i === 0 ? "나" : "CPU 0" + i}</small>
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
                    100m · 4마리 · {mode === "auto" ? "자동" : "수동"} 달리기
                  </span>
                  <button className="primary start-button" onClick={start}>
                    경주 시작 <span>→</span>
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
              setRace(createRace(snake, mode));
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
              100m 달리기 · {mode === "auto" ? "자동" : "수동"} 모드
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
        <span>〰 꼬물 레이스</span>
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
