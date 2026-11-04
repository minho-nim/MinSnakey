import { PART_DRAW_TIPS, partTraitLabels } from "./part-physics";
import Brand from "./Brand";
import { drawingConnection, snakeConnections } from "./connectivity";
import { abilityScore } from "./abilities";
import AbilityPanel from "./AbilityPanel";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointer,
} from "react";
import {
  analyze,
  drawing,
  names,
  sampleSnake,
  type Drawing,
  type PartName,
  type Point,
  type Snake,
  type Stroke,
} from "./model";
import { snakeRig, bodyRig, eraseStrokes, inkArea } from "./geometry";
import { fitCanvas, renderPreview } from "./render";
import { createRacer } from "./physics";
const W = 480,
  H = 420;
type Tool = "pen" | "eraser" | "anchor";
const colors = [
  "#365939",
  "#dc7b39",
  "#7461a1",
  "#2d88a0",
  "#d26974",
  "#2c2926",
];
const parts: PartName[] = ["head", "body", "tail"];
function Pad({
  value,
  kind,
  tool,
  color,
  width,
  onChange,
  onLive,
}: {
  value: Drawing;
  kind: PartName;
  tool: Tool;
  color: string;
  width: number;
  onChange: (d: Drawing) => void;
  onLive: (d: Drawing | null) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    active = useRef<Stroke | null>(null),
    erased = useRef<Drawing | null>(null),
    pointer = useRef<number | null>(null),
    cursor = useRef<Point | null>(null),
    lastLive = useRef(0);
  const paint = () => {
    if (!canvas.current) return;
    const { ctx, w, h } = fitCanvas(canvas.current);
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.scale(w / W, h / H);
    ctx.strokeStyle = "#e7dfcf";
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    const raw = erased.current || value;
    const d = active.current
      ? {
          ...drawing([...raw.strokes, active.current], kind),
          ...(raw.anchorManual || (kind !== "body" && raw.strokes.length > 0)
            ? { anchor: raw.anchor, anchorManual: raw.anchorManual }
            : {}),
        }
      : raw;
    if (!d.strokes.length) {
      ctx.save();
      ctx.strokeStyle = "#69816d66";
      ctx.lineWidth = kind === "body" ? 16 : kind === "head" ? 10 : 12;
      ctx.setLineDash([8, 10]);
      ctx.beginPath();
      if (kind === "head") ctx.ellipse(265, 210, 58, 40, 0, 0, Math.PI * 2);
      else for (let i = 0; i <= 50; i++) {
        const t = i / 50, x = kind === "body" ? 65 + 350 * t : 190 + 100 * t;
        const y = 210 + Math.sin(t * Math.PI * 3) * (kind === "body" ? 25 : 15);
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }
    const connection = drawingConnection(d, kind);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let strokeIndex = 0; strokeIndex < d.strokes.length; strokeIndex++) {
      const s = d.strokes[strokeIndex];
      ctx.globalAlpha = connection.detached.includes(strokeIndex) ? 0.28 : 1;
      ctx.beginPath();
      s.points.forEach((p, i) =>
        i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
      );
      if (s.points.length === 1)
        ctx.lineTo(s.points[0].x + 0.01, s.points[0].y);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const anchor =
      d.strokes.length || d.anchorManual
        ? kind === "body" && !d.anchorManual
          ? bodyRig(d).source[0]
          : d.anchor
        : { x: kind === "head" ? 80 : kind === "tail" ? 400 : 440, y: 210 };
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "#aab49a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(15, anchor.y);
    ctx.lineTo(W - 15, anchor.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(anchor.x, anchor.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#e5ae49";
    ctx.fill();
    ctx.strokeStyle = "#3c4433";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#776e59";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      kind === "body" ? "머리 연결점" : "몸통 연결점",
      Math.max(50, Math.min(W - 50, anchor.x)),
      anchor.y + 27,
    );
    if (kind === "body" && d.strokes.length) {
      const tail = bodyRig(d).source.at(-1)!;
      ctx.beginPath();
      ctx.arc(tail.x, tail.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#76b7b0";
      ctx.fill();
      ctx.strokeStyle = "#315c59";
      ctx.stroke();
      ctx.fillStyle = "#476b65";
      ctx.fillText(
        "꼬리 연결점",
        Math.max(50, Math.min(W - 50, tail.x)),
        tail.y - 18,
      );
    }
    if (tool === "eraser" && cursor.current) {
      ctx.beginPath();
      ctx.arc(cursor.current.x, cursor.current.y, width * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "#fffdf180";
      ctx.fill();
      ctx.strokeStyle = "#b34b39";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  };
  useEffect(() => {
    paint();
    const observer = new ResizeObserver(paint);
    if (canvas.current) observer.observe(canvas.current);
    return () => observer.disconnect();
  }, [value, kind, tool, color, width]);
  const point = (e: ReactPointer<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(W, ((e.clientX - r.left) / r.width) * W)),
      y: Math.max(0, Math.min(H, ((e.clientY - r.top) / r.height) * H)),
    };
  };
  const update = (p: Point) => {
    cursor.current = p;
    if (tool === "pen" && active.current) {
      const last = active.current.points.at(-1)!;
      if (
        Math.hypot(p.x - last.x, p.y - last.y) > 1 &&
        active.current.points.length < 3000
      )
        active.current.points.push(p);
    }
    if (tool === "eraser") {
      const d = erased.current || value;
      erased.current = {
        ...d,
        strokes: eraseStrokes(d.strokes, p, width * 1.5),
      };
    }
    if (tool === "anchor")
      erased.current = { ...value, anchor: p, anchorManual: true };
    if (performance.now() - lastLive.current > 45) {
      let snapshot =
        erased.current ||
        drawing(
          [
            ...value.strokes,
            ...(active.current
              ? [{ ...active.current, points: [...active.current.points] }]
              : []),
          ],
          kind,
        );
      if (
        (value.anchorManual || (kind !== "body" && value.strokes.length > 0)) &&
        tool !== "anchor"
      )
        snapshot = {
          ...snapshot,
          anchor: value.anchor,
          anchorManual: value.anchorManual,
        };
      onLive(snapshot);
      lastLive.current = performance.now();
    }
    paint();
  };
  const finish = (e: ReactPointer<HTMLCanvasElement>) => {
    if (e.pointerId !== pointer.current) return;
    let result =
      erased.current ||
      (active.current
        ? drawing([...value.strokes, active.current], kind)
        : value);
    if (
      (value.anchorManual || (kind !== "body" && value.strokes.length > 0)) &&
      tool !== "anchor"
    )
      result = {
        ...result,
        anchor: value.anchor,
        anchorManual: value.anchorManual,
      };
    pointer.current = null;
    active.current = null;
    erased.current = null;
    onChange(result);
    onLive(null);
    paint();
  };
  return (
    <canvas
      ref={canvas}
      className="workshop-pad"
      aria-label={`${names[kind]} 그리기 캔버스`}
      onPointerDown={(e) => {
        if (
          pointer.current !== null ||
          (tool === "pen" && value.strokes.length >= 100)
        )
          return;
        e.currentTarget.setPointerCapture(e.pointerId);
        pointer.current = e.pointerId;
        const p = point(e);
        if (tool === "pen") active.current = { color, width, points: [p] };
        update(p);
      }}
      onPointerMove={(e) => {
        cursor.current = point(e);
        if (pointer.current === e.pointerId) update(cursor.current);
        else paint();
      }}
      onPointerUp={finish}
      onPointerCancel={finish}
      onLostPointerCapture={finish}
      onPointerLeave={() => {
        cursor.current = null;
        paint();
      }}
    />
  );
}
export default function Workshop({
  snake,
  parts: values,
  step,
  onStep,
  onChange,
  onAssemble,
  onHome,
  onSample,
}: {
  snake: Snake;
  parts: Record<PartName, Drawing>;
  step: number;
  onStep: (s: number) => void;
  onChange: (p: Record<PartName, Drawing>) => void;
  onAssemble: () => void;
  onHome: () => void;
  onSample: () => void;
}) {
  const [tool, setTool] = useState<Tool>("pen"),
    [color, setColor] = useState(colors[0]),
    [width, setWidth] = useState(10),
    [live, setLive] = useState<Drawing | null>(null);
  const history = useRef<Record<PartName, Drawing[]>>({
    head: [],
    body: [],
    tail: [],
  });
  const kind = parts[step],
    current = live || values[kind];
  const draft = { ...snake, parts: { ...values, [kind]: current } },
    connections = snakeConnections(draft),
    stats = analyze(draft),
    rig = snakeRig(draft),
    ink = inkArea(current.strokes),
    preview = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const pose = createRacer(draft);
    const paint = () => {
      if (preview.current) renderPreview(preview.current, pose);
    };
    paint();
    const observer = new ResizeObserver(paint);
    if (preview.current) observer.observe(preview.current);
    return () => observer.disconnect();
  }, [values, live]);
  useEffect(() => {
    setWidth(kind === "head" ? 10 : kind === "body" ? 16 : 12);
  }, [kind]);
  const commit = (d: Drawing) => {
    history.current[kind] = [...history.current[kind], values[kind]].slice(-40);
    onChange({ ...values, [kind]: d });
  };
  const undo = () => {
    const previous = history.current[kind].pop();
    if (previous) onChange({ ...values, [kind]: previous });
    setLive(null);
  };
  const switchPart = (index: number) => {
    setLive(null);
    onStep(index);
    window.scrollTo(0, 0);
  };
  return (
    <section className="workshop">
      <div className="arcade-title">
        <span className="mini-title">내 낙서가 진짜 달린다!</span>
        <h1>
          <Brand large />
        </h1>
      </div>
      <nav className="part-tabs" aria-label="그리기 단계">
        {parts.map((p, i) => (
          <button
            key={p}
            aria-pressed={step === i}
            className={step === i ? "chosen" : ""}
            onClick={() => switchPart(i)}
          >
            <span>{i + 1}</span>
            {names[p]}
            {values[p].strokes.length > 0 && (
              <small>
                {drawingConnection(values[p], p).connected ? "✓" : "!"}
              </small>
            )}
          </button>
        ))}
      </nav>
      <div className="arcade-tools">
        <button onClick={undo} disabled={!history.current[kind].length}>
          ↶ 되돌리기
        </button>
        <button
          aria-pressed={tool === "eraser"}
          onClick={() => setTool(tool === "eraser" ? "pen" : "eraser")}
        >
          ▱ 지우개
        </button>
        <button className="danger" onClick={() => commit(drawing([], kind))}>
          전체 삭제
        </button>
      </div>
      <div className="live-ability-strip" aria-label="실시간 주요 능력치">
        {(
          [
            { key: "acceleration", label: "가속력" },
            { key: "maxSpeed", label: "최고속도" },
            { key: "traction", label: "접지력" },
          ] as const
        ).map((a) => (
          <div key={a.key}>
            <span>{a.label}</span>
            <strong>
              {Object.values(draft.parts).some((p) => p.strokes.length)
                ? abilityScore(stats, a.key)
                : "—"}
            </strong>
          </div>
        ))}
      </div>
      <div
        className="part-draw-guide"
        aria-label={`${names[kind]} 그리기 참고`}
      >
        <b>{PART_DRAW_TIPS[kind].title}</b>
        <small>점선 크기로 그리면 NPC와 비슷한 체급이에요.</small>
        <div>
          {PART_DRAW_TIPS[kind].tips.map((tip) => (
            <span key={tip}>{tip}</span>
          ))}
        </div>
        <small>{PART_DRAW_TIPS[kind].note}</small>
        {!!current.strokes.length && (
          <p>{partTraitLabels(stats, kind).join(" · ")}</p>
        )}
      </div>
      <div className="creation-stage">
        <div className="paper-heading">
          <span>
            <b>{names[kind]} 그리기</b>
            <small>{step + 1} / 3</small>
          </span>
          <button
            title="샘플 넣기"
            onClick={() => commit(sampleSnake().parts[kind])}
          >
            샘플 ＋
          </button>
        </div>
        <Pad
          key={kind}
          value={values[kind]}
          kind={kind}
          tool={tool}
          color={color}
          width={width}
          onChange={commit}
          onLive={setLive}
        />
        {!current.strokes.length && (
          <div className="canvas-instruction">
            <b>
              {kind === "head"
                ? "연결점에서 나만의 머리를 그려봐!"
                : kind === "body"
                  ? "쭉, 꼬불꼬불! 몸통을 그려봐!"
                  : "끝까지 개성 있게, 꼬리를 그려봐!"}
            </b>
            <span>
              {kind === "body"
                ? "꼬리 ← 왼쪽 · 오른쪽 → 머리"
                : "노란 점은 몸통과 연결되는 자리예요"}
            </span>
          </div>
        )}
        <div className="paper-footer">
          <div className="swatches">
            {colors.map((c) => (
              <button
                aria-label={`${c} 색상`}
                aria-pressed={c === color && tool === "pen"}
                key={c}
                style={{ background: c }}
                onClick={() => {
                  setColor(c);
                  setTool("pen");
                }}
              />
            ))}
          </div>
          <label>
            <input
              aria-label="펜 굵기"
              type="range"
              min="3"
              max="24"
              value={width}
              onChange={(e) => setWidth(+e.target.value)}
            />
            <span>{width}</span>
          </label>
        </div>
      </div>
      <div className="shape-readout" role="status" aria-label="그림 분석">
        <span>
          몸통 길이{" "}
          <b>
            {(draft.parts.body.strokes.length ? rig.length * 100 : 0).toFixed(
              0,
            )}
            cm
          </b>{" "}
          · 무게{" "}
          <b>
            {(Object.values(draft.parts).some((p) => p.strokes.length)
              ? stats.mass
              : 0
            ).toFixed(1)}
            kg
          </b>{" "}
          · 크기 <b>{(stats.size * 100).toFixed(0)}cm</b>
        </span>
        <strong>
          {!ink
            ? "아직 빈 종이!"
            : kind === "body"
              ? `굴곡 ${rig.curve.toFixed(1)} · 그린 형태로 움직여요`
              : `${names[kind]} 완성 중! 크기도 무게에 반영돼요`}
        </strong>
      </div>
      <div className="workshop-options">
        <button onClick={() => commit(drawing(current.strokes, kind))}>
          연결점 자동 맞춤
        </button>

        <button
          aria-pressed={tool === "anchor"}
          onClick={() => setTool(tool === "anchor" ? "pen" : "anchor")}
        >
          ⊙ 연결점 {tool === "anchor" ? "이동 중" : "옮기기"}
        </button>
        <span>
          {tool === "anchor"
            ? "종이를 눌러 연결할 자리를 정해요"
            : tool === "eraser"
              ? "문지르면 지나간 부분만 지워져요"
              : "원하는 모양 그대로, 자유롭게!"}
        </span>
      </div>
      {kind === "head" && connections.reports.head.eyes.length > 0 && (
        <p className="class-note" role="status">
          눈 장식으로 인식한 선은 연결하지 않아도 돼요.
        </p>
      )}
      {!connections.reports[kind].missing &&
        !connections.reports[kind].connected && (
          <p className="connection-warning" role="alert">
            {names[kind]} 부위가 떨어져 있습니다. 흐린 선을 이어 붙이거나
            연결점을 선 위로 옮겨 주세요.
          </p>
        )}
      {step === 2 && connections.invalid.some((p) => p !== kind) && (
        <p className="connection-warning" role="alert">
          {connections.message}
        </p>
      )}
      <div className="arcade-bottom">
        <button onClick={onHome}>내 뱀</button>
        <button
          className="next-draw"
          disabled={
            step < 2
              ? !values[kind].strokes.length
              : !snakeConnections({ ...snake, parts: values }).connected
          }
          onClick={() => (step < 2 ? switchPart(step + 1) : onAssemble())}
        >
          {step < 2 ? "다음" : "조립!"} <span>▶</span>
        </button>
        <button onClick={onSample}>샘플 경기</button>
      </div>
      {Object.values(draft.parts).some((p) => p.strokes.length) && (
        <AbilityPanel stats={stats} compact />
      )}
      <details className="assembly-peek">
        <summary>
          내 뱀 조립 미리보기 <span>⌄</span>
        </summary>
        <canvas
          ref={preview}
          className="assembly-canvas"
          aria-label="그린 뱀 실시간 조립 미리보기"
        />
      </details>
    </section>
  );
}
