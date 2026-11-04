import type { Stats } from "./model";
import { ABILITIES, abilityScore, bodyTip, bodyType } from "./abilities";
export default function AbilityPanel({
  stats,
  compact = false,
}: {
  stats: Stats;
  compact?: boolean;
}) {
  return (
    <section
      className={`ability-panel ${compact ? "compact" : ""}`}
      aria-label="체형 능력치"
    >
      <div className="ability-heading">
        <b>체형 능력치</b>
        <span>{bodyType(stats)}</span>
      </div>
      <div className="morphology-values">
        <span>
          길이 <b>{(stats.length * 100).toFixed(0)}cm</b>
        </span>
        <span>
          무게 <b>{stats.mass.toFixed(1)}kg</b>
        </span>
        <span>
          크기 <b>{(stats.size * 100).toFixed(0)}cm</b>
        </span>
      </div>
      <div className="ability-bars">
        {ABILITIES.map((rule) => (
          <div key={rule.key} title={rule.hint}>
            <label>
              {rule.label}
              <b>{abilityScore(stats, rule.key)}</b>
            </label>
            <meter
              aria-label={rule.label}
              min="0"
              max="100"
              value={abilityScore(stats, rule.key)}
            />
          </div>
        ))}
      </div>
      <p className="body-tip">{bodyTip(stats)}</p>
      <details className="ability-rulebook">
        <summary>길이·무게·크기 규칙 보기</summary>
        <div className="power-readout">
          <span>
            추진 출력 <b>{stats.drivePower.toFixed(0)}W</b>
          </span>
          <span>
            정면 면적 <b>{stats.frontalArea.toFixed(2)}m²</b>
          </span>
          <span>
            저항계수 <b>{stats.dragCoefficient.toFixed(2)}</b>
          </span>
        </div>
        <p>
          능력치는 0~100점이에요. 크기는 몸통 굵기와 머리·몸통이 차지하는 체격을
          뜻해요.
        </p>
        <table>
          <thead>
            <tr>
              <th>체형 변화</th>
              <th>이점</th>
              <th>부담</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>몸이 길어짐</td>
              <td>직진 안정·출력 여유</td>
              <td>무게·회전 부담</td>
            </tr>
            <tr>
              <td>무게가 늘어남</td>
              <td>접지 한계 증가</td>
              <td>가속·경사·지면저항</td>
            </tr>
            <tr>
              <td>몸통이 굵어짐</td>
              <td>접지력·지구력</td>
              <td>무게·크기 증가</td>
            </tr>
            <tr>
              <td>머리가 커짐</td>
              <td>부위 개성 유지</td>
              <td>무게·저항·균형 부담</td>
            </tr>
          </tbody>
        </table>
        <p>
          저항은 밀도 × 저항계수 × 정면면적 × 속도² ÷ 2로 계산해요. 같은
          추진력이라면 무거울수록 가속이 느려요. CPU에도 같은 규칙을 적용해요.
        </p>
      </details>
    </section>
  );
}
