import { h } from "preact";
import { route } from "preact-router";

import clientHref from "../../lib/link";

const ROW_HEIGHT = 28;
const BAR_X1 = 0;
const BAR_X2 = 100;

export default function ClubEloChart({ players = [] }) {
  if (!players.length) return null;

  const allElos = players.flatMap((p) => [p.startElo, p.endElo]);
  const min = Math.min(...allElos);
  const max = Math.max(...allElos);
  const range = Math.max(max - min, 1);

  const project = (elo) => BAR_X1 + ((elo - min) / range) * (BAR_X2 - BAR_X1);

  return (
    <div class="club-elo-chart">
      {players.map((p) => {
        const x1 = project(p.startElo);
        const x2 = project(p.endElo);
        const up = p.delta > 0;
        const flat = p.delta === 0;
        const color = flat ? "#9e9e9e" : up ? "#43a047" : "#e53935";
        return (
          <div
            key={p.href}
            class="club-elo-row"
            onClick={() => route(clientHref(p.href))}
          >
            <div class="club-elo-name">{p.name}</div>
            <svg
              class="club-elo-bar"
              viewBox={`0 0 ${BAR_X2} ${ROW_HEIGHT}`}
              preserveAspectRatio="none"
            >
              <line
                x1={BAR_X1}
                y1={ROW_HEIGHT / 2}
                x2={BAR_X2}
                y2={ROW_HEIGHT / 2}
                stroke="#eeeeee"
                strokeWidth="1"
              />
              <line
                x1={Math.min(x1, x2)}
                y1={ROW_HEIGHT / 2}
                x2={Math.max(x1, x2)}
                y2={ROW_HEIGHT / 2}
                stroke={color}
                strokeWidth="3"
              />
              <circle cx={x1} cy={ROW_HEIGHT / 2} r="3" fill="#9e9e9e" />
              <circle cx={x2} cy={ROW_HEIGHT / 2} r="4" fill={color} />
            </svg>
            <div class="club-elo-end">{p.endElo}</div>
            <div class="club-elo-delta" style={{ color }}>
              {flat ? "±0" : up ? `+${p.delta}` : p.delta}
            </div>
          </div>
        );
      })}
    </div>
  );
}
