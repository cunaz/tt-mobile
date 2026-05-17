import { h } from "preact";
import { useMemo, useState } from "preact/hooks";

import { eloMin, getLabel } from "../../lib/elo";

const COLORS = [
  "#e53935", "#1e88e5", "#43a047", "#fb8c00", "#8e24aa",
  "#00897b", "#3949ab", "#f4511e", "#6d4c41", "#546e7a",
  "#d81b60", "#7cb342", "#039be5", "#5e35b1", "#c0ca33",
  "#00acc1", "#ec407a", "#ff7043", "#26a69a", "#ab47bc",
];

const VIEW_W = 400;
const VIEW_H = 240;
const PAD_LEFT = 30;
const PAD_RIGHT = 5;
const PAD_TOP = 10;
const PAD_BOTTOM = 30;
const CHART_W = VIEW_W - PAD_LEFT - PAD_RIGHT;
const CHART_H = VIEW_H - PAD_TOP - PAD_BOTTOM;

const AUTO_HIDE_THRESHOLD = 20;
const DEFAULT_VISIBLE = 15;

const colorOf = (i) => COLORS[i % COLORS.length];

export default function ClubEloChart({ players = [] }) {
  if (!players.length) return null;

  const sorted = useMemo(
    () => [...players].sort((a, b) => b.endElo - a.endElo),
    [players],
  );

  const [hidden, setHidden] = useState(() => {
    if (sorted.length <= AUTO_HIDE_THRESHOLD) return new Set();
    return new Set(sorted.slice(DEFAULT_VISIBLE).map((p) => p.href));
  });

  const toggle = (href) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      return next;
    });

  const visible = sorted.filter(
    (p) => !hidden.has(p.href) && Array.isArray(p.series) && p.series.length >= 2,
  );

  return (
    <div class="club-elo-chart">
      {visible.length > 0 ? (
        <Chart players={visible} indexOf={(p) => sorted.indexOf(p)} />
      ) : (
        <p class="has-text-grey is-size-7">(Keine sichtbaren Spieler)</p>
      )}
      <Legend players={sorted} hidden={hidden} toggle={toggle} />
    </div>
  );
}

function Chart({ players, indexOf }) {
  const allElos = players.flatMap((p) => p.series);
  const yMin = Math.min(...allElos) * 0.99;
  const yMax = Math.max(...allElos) * 1.01;

  const projY = (y) => PAD_TOP + ((yMax - y) / (yMax - yMin)) * CHART_H;

  const gridLines = eloMin
    .map((min, i) => ({ y: projY(min), label: getLabel(i) }))
    .filter(({ y }) => y > PAD_TOP + 4 && y < PAD_TOP + CHART_H);

  const startDate = players
    .map((p) => p.startDate)
    .filter(Boolean)
    .sort()[0];
  const endDate = players
    .map((p) => p.endDate)
    .filter(Boolean)
    .sort()
    .slice(-1)[0];

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width="100%"
      class="club-elo-chart-svg"
    >
      {gridLines.map(({ y, label }) => [
        <text
          key={`t${label}`}
          x={PAD_LEFT - 4}
          y={y + 3}
          textAnchor="end"
          fontSize="9"
          fill="#9e9e9e"
        >
          {label}
        </text>,
        <line
          key={`l${label}`}
          x1={PAD_LEFT}
          y1={y}
          x2={PAD_LEFT + CHART_W}
          y2={y}
          stroke="#eeeeee"
          strokeWidth="1"
        />,
      ])}
      {players.map((p) => {
        const color = colorOf(indexOf(p));
        const step = CHART_W / (p.series.length - 1);
        const points = p.series
          .map((y, i) => `${PAD_LEFT + i * step},${projY(y)}`)
          .join(" ");
        return (
          <polyline
            key={p.href}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={points}
          />
        );
      })}
      {startDate && (
        <text x={PAD_LEFT} y={VIEW_H - 12} fontSize="10" fill="#9e9e9e">
          {startDate}
        </text>
      )}
      {endDate && (
        <text
          x={PAD_LEFT + CHART_W}
          y={VIEW_H - 12}
          fontSize="10"
          fill="#9e9e9e"
          textAnchor="end"
        >
          {endDate}
        </text>
      )}
    </svg>
  );
}

function Legend({ players, hidden, toggle }) {
  return (
    <ul class="club-elo-legend">
      {players.map((p, i) => {
        const isHidden = hidden.has(p.href);
        const color = colorOf(i);
        const deltaLabel =
          p.delta > 0
            ? ` (+${p.delta})`
            : p.delta < 0
              ? ` (${p.delta})`
              : "";
        return (
          <li
            key={p.href}
            class={`club-elo-legend-item${isHidden ? " is-hidden" : ""}`}
            onClick={() => toggle(p.href)}
          >
            <span
              class="club-elo-legend-dot"
              style={{ backgroundColor: isHidden ? "#bdbdbd" : color }}
            />
            <span class="club-elo-legend-name">{p.name}</span>
            <span class="club-elo-legend-end">
              {p.endElo}
              {deltaLabel}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
