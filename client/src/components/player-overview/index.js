import { h } from "preact";
import { useState, useCallback } from "preact/hooks";

import clientHref from "../../lib/link";
import { get } from "../../lib/model";

import Loading from "../../components/loading";
import LinkRow from "../../components/link-row/";
import Table from "../../components/table";
import EloChart from "../../components/elo-chart";
import EloScore from "../../components/elo-score";

export default function PlayerOverview({
  balances,
  seasons,
  classification,
  club,
  clubId,
  teams,
  elo,
  gender,
  href,
}) {
  const latestElo = elo && Math.round(elo.data[elo.data.length - 1]);
  const [view, setView] = useState("season");
  const [history, setHistory] = useState(null);
  const [historyPending, setHistoryPending] = useState(false);

  const showLifelong = useCallback(() => {
    setView("lifelong");
    if (history || historyPending || !href) return;
    setHistoryPending(true);
    get("eloHistory")(href)
      .then((data) => {
        setHistory(data);
        setHistoryPending(false);
      })
      .catch(() => setHistoryPending(false));
  }, [history, historyPending, href]);

  const showSeason = useCallback(() => setView("season"), []);

  const chartData =
    view === "lifelong" && history ? history : view === "season" ? elo : null;

  return (
    <div>
      <Table>
        <LinkRow href={clientHref({ clubId })}>
          <td>Verein</td>
          <td>{club}</td>
          <td class="thin">
            <i class="icon-right-open" />
          </td>
        </LinkRow>
        <tr>
          <td>Klassierung</td>
          <td>
            <EloScore value={classification} />
          </td>
        </tr>
        <tr>
          <td>Klassierung (aktuell)</td>
          {latestElo ? (
            <td>
              <EloScore value={latestElo} gender={gender} /> ({latestElo})
            </td>
          ) : (
            <td>lädt...</td>
          )}
        </tr>
      </Table>
      <div class="tabs is-toggle is-small" style="margin-top: 1rem;">
        <ul>
          <li class={view === "season" ? "is-active" : ""}>
            <a onClick={showSeason}>Saison</a>
          </li>
          <li class={view === "lifelong" ? "is-active" : ""}>
            <a onClick={showLifelong}>Lebenslang</a>
          </li>
        </ul>
      </div>
      <div style="margin: 0.5rem 0 1rem;">
        {chartData ? <EloChart {...chartData} /> : <Loading />}
      </div>
      <h2 class="subtitle">Mannschaftseinsätze</h2>
      <Table>
        <tbody>
          {teams.length ? (
            teams.map(({ name, href }) => (
              <LinkRow key={href} href={clientHref(href)}>
                <td>{name}</td>
                <td class="thin">
                  <i class="icon-right-open" />
                </td>
              </LinkRow>
            ))
          ) : (
            <tr>
              <td colSpan="2">(Keine)</td>
            </tr>
          )}
        </tbody>
      </Table>
      <h2 class="subtitle">Einzelbilanzen</h2>
      <Table>
        <tbody>
          {balances.length ? (
            balances.map(({ team, data }) => (
              <tr key={team}>
                <td>{team}</td>
                <td>{data}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="2">(Keine)</td>
            </tr>
          )}
        </tbody>
      </Table>
      <h2 class="subtitle">Saisons</h2>
      <Table>
        <tbody>
          {seasons.map(({ name, href }) => (
            <LinkRow key={href} href={clientHref(href)}>
              <td>{name}</td>
              <td class="thin">
                <i class="icon-right-open" />
              </td>
            </LinkRow>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
