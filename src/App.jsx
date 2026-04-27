import { useState, useEffect, useCallback, useRef } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────

const SPORTS = [
  { key: "baseball_mlb", label: "MLB", icon: "⚾", season: true },
  { key: "americanfootball_nfl", label: "NFL", icon: "🏈", season: false },
  { key: "golf_pga_championship_winner", label: "PGA", icon: "⛳", season: true },
];

const GOLF_MARKETS = [{ key: "outrights", label: "Winner" }];
const MLB_MARKETS = [{ key: "h2h", label: "Moneyline" }, { key: "spreads", label: "Run Line" }, { key: "totals", label: "Totals" }];
const NFL_MARKETS = [{ key: "h2h", label: "Moneyline" }, { key: "spreads", label: "Spread" }, { key: "totals", label: "Total" }];
const TABS = ["SLATE", "PROPS", "PARLAYS", "TRACKER", "CHAT"];

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:       "#1e1f22",
  surface:  "#2b2d31",
  elevated: "#313338",
  border:   "#3f4147",
  muted:    "#4e5058",
  subtle:   "#72767d",
  secondary:"#b5bac1",
  primary:  "#ffffff",
  accent:   "#c8102e",
  navy:     "#003087",
  gold:     "#e8c84a",
  green:    "#23a559",
  red:      "#da373c",
  blue:     "#5865f2",
  teal:     "#1abc9c",
};

// ─── Utilities ────────────────────────────────────────────────────────────────
function americanToDecimal(a) { return a > 0 ? a / 100 + 1 : 100 / Math.abs(a) + 1; }
function impliedProb(a) { return (1 / americanToDecimal(a)) * 100; }
function formatAmerican(o) { return o > 0 ? `+${o}` : `${o}`; }
function edgeCalc(price, fair) { return fair - impliedProb(price); }
function clvCalc(betOdds, closeOdds) { return impliedProb(closeOdds) - impliedProb(betOdds); }
function roiColor(v) { return v > 0 ? C.green : v < 0 ? C.red : C.subtle; }
function edgeLabel(e) {
  if (e > 6) return { label: "STRONG VALUE", bg: C.green, color: "#fff" };
  if (e > 3) return { label: "VALUE", bg: C.gold, color: "#1a1a1a" };
  if (e > 0) return { label: "SLIGHT EDGE", bg: C.muted, color: C.secondary };
  if (e < -4) return { label: "AVOID", bg: "#da373c30", color: C.red };
  return null;
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const S = {
  app: { minHeight: "100vh", background: C.bg, color: C.primary, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" },
  header: { borderBottom: `1px solid ${C.border}`, padding: "0 16px", background: C.surface, position: "sticky", top: 0, zIndex: 100 },
  headerInner: { maxWidth: "900px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "52px" },
  main: { maxWidth: "900px", margin: "0 auto", padding: "16px" },
  card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "16px", marginBottom: "10px" },
  tabBar: { display: "flex", gap: "2px", marginBottom: "16px", background: C.elevated, borderRadius: "8px", padding: "4px", border: `1px solid ${C.border}` },
  tab: (a) => ({ flex: 1, padding: "7px 4px", background: a ? C.surface : "transparent", border: a ? `1px solid ${C.border}` : "1px solid transparent", borderRadius: "6px", color: a ? C.primary : C.subtle, fontSize: "12px", fontWeight: a ? 600 : 400, cursor: "pointer", transition: "all 0.1s", textAlign: "center", letterSpacing: "0.03em" }),
  sportTab: (a) => ({ padding: "6px 14px", background: a ? C.accent : C.elevated, border: `1px solid ${a ? C.accent : C.border}`, borderRadius: "6px", color: a ? "#fff" : C.secondary, fontSize: "13px", fontWeight: a ? 700 : 400, cursor: "pointer", transition: "all 0.1s" }),
  mktTab: (a) => ({ padding: "5px 12px", background: a ? C.elevated : "transparent", border: `1px solid ${a ? C.border : "transparent"}`, borderRadius: "5px", color: a ? C.primary : C.subtle, fontSize: "12px", cursor: "pointer", transition: "all 0.1s" }),
  btn: (v = "primary") => ({ background: v === "primary" ? C.accent : v === "navy" ? C.navy : v === "ghost" ? "transparent" : C.elevated, color: v === "ghost" ? C.subtle : "#fff", border: v === "ghost" ? `1px solid ${C.border}` : "none", borderRadius: "6px", padding: "8px 16px", fontWeight: 600, fontSize: "13px", cursor: "pointer", transition: "all 0.15s" }),
  input: { background: C.elevated, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "9px 12px", color: C.primary, fontSize: "13px", outline: "none", width: "100%", boxSizing: "border-box" },
  label: { color: C.subtle, fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "5px", display: "block" },
  sectionTitle: { fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", color: C.subtle, textTransform: "uppercase", marginBottom: "12px" },
  tag: (bg, color) => ({ background: bg, color, fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "3px", letterSpacing: "0.05em" }),
  gameRow: { background: C.elevated, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "12px 14px", marginBottom: "8px" },
  outcomeRow: (edge) => ({ background: C.bg, border: `1px solid ${edge ? C.navy + "80" : C.border}`, borderRadius: "6px", padding: "10px 12px", marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }),
  oddsNum: (e) => ({ fontSize: "22px", fontWeight: 800, color: e > 3 ? C.green : e > 0 ? C.primary : C.secondary }),
  bubble: (role) => ({ background: role === "user" ? C.navy + "40" : C.elevated, border: `1px solid ${role === "user" ? C.navy + "60" : C.border}`, borderRadius: role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px", padding: "10px 14px", marginBottom: "8px", maxWidth: "85%", alignSelf: role === "user" ? "flex-end" : "flex-start", color: C.primary, fontSize: "13px", lineHeight: 1.6 }),
};

function Badge({ e }) {
  const info = edgeLabel(e);
  if (!info) return null;
  return <span style={S.tag(info.bg, info.color)}>{info.label}</span>;
}

// ─── Slate ────────────────────────────────────────────────────────────────────
function SlateTab({ games, sport, market, setMarket, loading, error, remaining }) {
  const markets = sport.includes("golf") ? GOLF_MARKETS : sport.includes("football") ? NFL_MARKETS : MLB_MARKETS;
  return (
    <div>
      <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap", alignItems: "center" }}>
        {markets.map(m => <button key={m.key} style={S.mktTab(market === m.key)} onClick={() => setMarket(m.key)}>{m.label}</button>)}
        {remaining && <span style={{ color: C.muted, fontSize: "11px", marginLeft: "auto" }}>{remaining} API calls left</span>}
      </div>
      {error && <div style={{ background: "#da373c15", border: `1px solid ${C.red}40`, borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", color: C.red, fontSize: "13px" }}>⚠ {error}</div>}
      {loading ? <div style={{ textAlign: "center", padding: "40px", color: C.subtle, fontSize: "13px" }}>Fetching live odds...</div>
        : games.length === 0 ? <div style={{ textAlign: "center", padding: "40px", color: C.subtle, fontSize: "13px" }}>No games found for this market</div>
        : games.map(g => <GameCard key={g.id} game={g} market={market} sport={sport} />)}
    </div>
  );
}

function GameCard({ game, market, sport }) {
  const isGolf = sport.includes("golf");
  const isTotals = market === "totals";
  const isSpreads = market === "spreads";

  const outcomeNames = [];
  game.bookmakers.forEach(bk => {
    if (!["draftkings", "fanduel"].includes(bk.key)) return;
    bk.markets?.find(m => m.key === market)?.outcomes?.forEach(o => {
      if (!outcomeNames.includes(o.name)) outcomeNames.push(o.name);
    });
  });
  if (!outcomeNames.length) return null;

  const outcomeData = outcomeNames.map(name => {
    const dkBk = game.bookmakers.find(b => b.key === "draftkings");
    const fdBk = game.bookmakers.find(b => b.key === "fanduel");
    const dkOut = dkBk?.markets?.find(m => m.key === market)?.outcomes?.find(o => o.name === name);
    const fdOut = fdBk?.markets?.find(m => m.key === market)?.outcomes?.find(o => o.name === name);
    const dkPrice = dkOut?.price, fdPrice = fdOut?.price;
    const dkPoint = dkOut?.point, fdPoint = fdOut?.point;
    const prices = [dkPrice, fdPrice].filter(Boolean);
    const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
    const bestPrice = dkPrice && fdPrice ? Math.max(dkPrice, fdPrice) : dkPrice || fdPrice;
    const bestBook = bestPrice === fdPrice && fdPrice !== dkPrice ? "FD" : "DK";
    const bestPoint = bestBook === "FD" ? fdPoint : dkPoint;
    return { name, dkPrice, fdPrice, dkPoint, fdPoint, avgPrice, bestPrice, bestBook, bestPoint };
  });

  const total = outcomeData.reduce((s, o) => s + (o.avgPrice ? impliedProb(o.avgPrice) : 0), 0);
  const withFair = outcomeData.map(o => ({ ...o, fair: o.avgPrice ? (impliedProb(o.avgPrice) / total) * 100 : 50 }));
  const gameTime = new Date(game.commence_time);

  return (
    <div style={S.gameRow}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
        <div>
          {isGolf
            ? <div style={{ color: C.primary, fontWeight: 700, fontSize: "15px" }}>{game.sport_title || "PGA Tournament"}</div>
            : <>
                <div style={{ color: C.primary, fontWeight: 700, fontSize: "15px" }}>{game.away_team}</div>
                <div style={{ color: C.muted, fontSize: "11px", margin: "1px 0" }}>@</div>
                <div style={{ color: C.primary, fontWeight: 700, fontSize: "15px" }}>{game.home_team}</div>
              </>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: C.blue, fontSize: "12px", fontWeight: 600 }}>{gameTime.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
          <div style={{ color: C.subtle, fontSize: "11px" }}>{gameTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
        </div>
      </div>

      {withFair.slice(0, isGolf ? 10 : undefined).map(o => {
        if (!o.bestPrice) return null;
        const e = edgeCalc(o.bestPrice, o.fair);
        const lineDiff = o.dkPrice && o.fdPrice && o.dkPrice !== o.fdPrice;
        return (
          <div key={o.name} style={S.outcomeRow(e > 3)}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px", flexWrap: "wrap" }}>
                <span style={{ color: C.primary, fontSize: "13px", fontWeight: 600 }}>{o.name}</span>
                {(isSpreads || isTotals) && o.bestPoint !== undefined && (
                  <span style={{ color: C.secondary, fontSize: "12px" }}>
                    {isTotals ? (o.name === "Over" ? `O ${o.bestPoint}` : `U ${o.bestPoint}`) : (o.bestPoint > 0 ? `+${o.bestPoint}` : `${o.bestPoint}`)}
                  </span>
                )}
                <Badge e={e} />
              </div>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <span style={{ color: C.muted, fontSize: "11px" }}>Implied <span style={{ color: C.secondary }}>{impliedProb(o.bestPrice).toFixed(1)}%</span></span>
                <span style={{ color: C.muted, fontSize: "11px" }}>Fair <span style={{ color: C.secondary }}>{o.fair.toFixed(1)}%</span></span>
                <span style={{ color: C.muted, fontSize: "11px" }}>Edge <span style={{ color: e > 0 ? C.green : C.red }}>{e > 0 ? "+" : ""}{e.toFixed(1)}%</span></span>
                {lineDiff && <span style={{ color: C.blue, fontSize: "11px" }}>DK {formatAmerican(o.dkPrice)} · FD {formatAmerican(o.fdPrice)}</span>}
              </div>
            </div>
            <div style={{ textAlign: "right", minWidth: "65px" }}>
              <div style={S.oddsNum(e)}>{formatAmerican(o.bestPrice)}</div>
              <div style={{ color: C.muted, fontSize: "10px" }}>{o.bestBook}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
function PropsTab({ apiKey, sport }) {
  const [propGames, setPropGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [props, setProps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingProps, setLoadingProps] = useState(false);
  const [filter, setFilter] = useState("");
  const isGolf = sport.includes("golf");
  const isNFL = sport.includes("football");

  useEffect(() => {
    setSelectedGame(null); setProps([]);
    const fetch_ = async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${apiKey}&regions=us&markets=h2h&oddsFormat=american`);
        const data = await res.json();
        setPropGames(Array.isArray(data) ? data : []);
      } catch { setPropGames([]); }
      setLoading(false);
    };
    fetch_();
  }, [sport, apiKey]);

  const fetchProps = async (game) => {
    setSelectedGame(game); setLoadingProps(true); setProps([]);
    const mkts = isGolf ? "golfer_top_5,golfer_top_10,golfer_top_20,golfer_make_cut"
      : isNFL ? "player_pass_tds,player_pass_yds,player_rush_yds,player_reception_yds,player_anytime_td"
      : "batter_hits,batter_total_bases,pitcher_strikeouts,batter_home_runs,batter_rbis";
    try {
      const res = await fetch(`https://api.the-odds-api.com/v4/sports/${sport}/events/${game.id}/odds?apiKey=${apiKey}&regions=us&markets=${mkts}&oddsFormat=american&bookmakers=draftkings,fanduel`);
      const data = await res.json();
      const all = [];
      data.bookmakers?.forEach(bk => {
        bk.markets?.forEach(mkt => {
          mkt.outcomes?.forEach(o => {
            const ex = all.find(p => p.market === mkt.key && p.name === o.name && p.description === o.description && p.point === o.point);
            if (ex) { ex.books[bk.key] = o.price; if (o.price > ex.bestPrice) { ex.bestPrice = o.price; ex.bestBook = bk.key === "draftkings" ? "DK" : "FD"; } }
            else all.push({ market: mkt.key, name: o.name, description: o.description, point: o.point, bestPrice: o.price, bestBook: bk.key === "draftkings" ? "DK" : "FD", books: { [bk.key]: o.price } });
          });
        });
      });
      all.forEach(p => {
        const prices = Object.values(p.books);
        const avg = prices.map(americanToDecimal).reduce((a, b) => a + b, 0) / prices.length;
        p.fair = (1 / avg) * 100;
        p.edge = edgeCalc(p.bestPrice, p.fair);
        p.implied = impliedProb(p.bestPrice);
        p.dkPrice = p.books["draftkings"];
        p.fdPrice = p.books["fanduel"];
      });
      all.sort((a, b) => b.edge - a.edge);
      setProps(all);
    } catch { setProps([]); }
    setLoadingProps(false);
  };

  const filtered = props.filter(p => !filter || p.name?.toLowerCase().includes(filter.toLowerCase()) || p.description?.toLowerCase().includes(filter.toLowerCase()));
  const mktLabel = (k) => k.replace(/_/g, " ").replace(/batter |pitcher |player |golfer /g, "");

  return (
    <div>
      <div style={S.sectionTitle}>Select Game</div>
      {loading ? <div style={{ color: C.subtle, fontSize: "13px", textAlign: "center", padding: "30px" }}>Loading games...</div>
        : propGames.length === 0 ? <div style={{ color: C.subtle, fontSize: "13px", textAlign: "center", padding: "30px" }}>No games found</div>
        : propGames.slice(0, 12).map(g => (
          <div key={g.id} onClick={() => fetchProps(g)} style={{ ...S.gameRow, cursor: "pointer", borderColor: selectedGame?.id === g.id ? C.accent : C.border, transition: "border-color 0.1s" }}>
            <div style={{ color: C.primary, fontWeight: 600, fontSize: "14px" }}>{isGolf ? g.sport_title : `${g.away_team} @ ${g.home_team}`}</div>
            <div style={{ color: C.subtle, fontSize: "11px", marginTop: "2px" }}>{new Date(g.commence_time).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
          </div>
        ))}

      {selectedGame && (
        <div style={{ marginTop: "16px" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px", flexWrap: "wrap" }}>
            <div style={{ ...S.sectionTitle, marginBottom: 0 }}>Props — {selectedGame.away_team || ""} {selectedGame.home_team ? `@ ${selectedGame.home_team}` : ""}</div>
            <input style={{ ...S.input, maxWidth: "180px" }} placeholder="Filter player..." value={filter} onChange={e => setFilter(e.target.value)} />
          </div>
          {loadingProps ? <div style={{ color: C.subtle, fontSize: "13px", textAlign: "center", padding: "30px" }}>Loading props...</div>
            : filtered.length === 0 ? <div style={{ color: C.subtle, fontSize: "13px", textAlign: "center", padding: "20px" }}>No props found</div>
            : filtered.map((p, i) => (
              <div key={i} style={S.outcomeRow(p.edge > 3)}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px", flexWrap: "wrap" }}>
                    <span style={{ color: C.primary, fontSize: "13px", fontWeight: 600 }}>{p.description || p.name}</span>
                    <span style={{ color: C.subtle, fontSize: "11px" }}>{mktLabel(p.market)}{p.point !== undefined ? ` ${p.point}` : ""}</span>
                    <Badge e={p.edge} />
                  </div>
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <span style={{ color: C.muted, fontSize: "11px" }}>Implied <span style={{ color: C.secondary }}>{p.implied.toFixed(1)}%</span></span>
                    <span style={{ color: C.muted, fontSize: "11px" }}>Fair <span style={{ color: C.secondary }}>{p.fair.toFixed(1)}%</span></span>
                    <span style={{ color: C.muted, fontSize: "11px" }}>Edge <span style={{ color: p.edge > 0 ? C.green : C.red }}>{p.edge > 0 ? "+" : ""}{p.edge.toFixed(1)}%</span></span>
                    {p.dkPrice && p.fdPrice && p.dkPrice !== p.fdPrice && <span style={{ color: C.blue, fontSize: "11px" }}>DK {formatAmerican(p.dkPrice)} · FD {formatAmerican(p.fdPrice)}</span>}
                  </div>
                </div>
                <div style={{ textAlign: "right", minWidth: "60px" }}>
                  <div style={S.oddsNum(p.edge)}>{formatAmerican(p.bestPrice)}</div>
                  <div style={{ color: C.muted, fontSize: "10px" }}>{p.bestBook}</div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ─── Parlays ──────────────────────────────────────────────────────────────────
function ParlaysTab() {
  const [legs, setLegs] = useState([]);
  const [stake, setStake] = useState("10");
  const [name, setName] = useState(""), [game, setGame] = useState(""), [price, setPrice] = useState("");

  const combinedOdds = legs.reduce((acc, leg) => acc * americanToDecimal(leg.price), 1);
  const parlayAmerican = legs.length > 1 ? (combinedOdds >= 2 ? Math.round((combinedOdds - 1) * 100) : Math.round(-100 / (combinedOdds - 1))) : 0;
  const payout = parseFloat(stake || 0) * (combinedOdds - 1);

  const addLeg = () => {
    if (!name || !price) return;
    setLegs([...legs, { name, game, price: parseInt(price) }]);
    setName(""); setGame(""); setPrice("");
  };

  return (
    <div>
      <div style={{ ...S.card, background: C.elevated, borderLeft: `3px solid ${C.blue}`, marginBottom: "14px" }}>
        <div style={{ color: C.secondary, fontSize: "13px", lineHeight: 1.6 }}>
          💬 <strong style={{ color: C.primary }}>AI Parlay Suggestions</strong> — Use the <strong>Chat</strong> tab to ask for correlated parlay ideas on today's slate.
        </div>
      </div>
      <div style={S.card}>
        <div style={S.sectionTitle}>Parlay Builder</div>
        {legs.length === 0
          ? <div style={{ color: C.subtle, fontSize: "13px", textAlign: "center", padding: "16px 0" }}>Add legs below</div>
          : <>
              {legs.map((leg, i) => (
                <div key={i} style={{ ...S.outcomeRow(false), marginBottom: "6px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: C.primary, fontSize: "13px", fontWeight: 600 }}>{leg.name}</div>
                    {leg.game && <div style={{ color: C.subtle, fontSize: "11px" }}>{leg.game}</div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: C.primary }}>{formatAmerican(leg.price)}</div>
                    <button onClick={() => setLegs(legs.filter((_, idx) => idx !== i))} style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: "18px" }}>×</button>
                  </div>
                </div>
              ))}
              <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "14px", marginTop: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ color: C.secondary, fontSize: "13px" }}>{legs.length}-leg parlay</span>
                  <span style={{ fontSize: "26px", fontWeight: 800, color: C.primary }}>{legs.length > 1 ? formatAmerican(parlayAmerican) : "—"}</span>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}><span style={S.label}>Stake ($)</span><input style={S.input} type="number" value={stake} onChange={e => setStake(e.target.value)} /></div>
                  <div style={{ flex: 1, textAlign: "right" }}><span style={S.label}>Potential Win</span><div style={{ color: C.green, fontSize: "22px", fontWeight: 800 }}>${payout.toFixed(2)}</div></div>
                </div>
              </div>
            </>}
        <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: `1px solid ${C.border}` }}>
          <div style={S.sectionTitle}>Add Leg</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
            <div><span style={S.label}>Selection</span><input style={S.input} placeholder="e.g. Yankees ML" value={name} onChange={e => setName(e.target.value)} /></div>
            <div><span style={S.label}>Game (optional)</span><input style={S.input} placeholder="NYY @ BOS" value={game} onChange={e => setGame(e.target.value)} /></div>
            <div style={{ gridColumn: "1 / -1" }}><span style={S.label}>Odds (American)</span><input style={S.input} placeholder="-110" value={price} onChange={e => setPrice(e.target.value)} onKeyDown={e => e.key === "Enter" && addLeg()} /></div>
          </div>
          <button style={S.btn()} onClick={addLeg}>Add Leg</button>
        </div>
      </div>
    </div>
  );
}

// ─── Tracker ──────────────────────────────────────────────────────────────────
function TrackerTab() {
  const [bets, setBets] = useState(() => { try { return JSON.parse(localStorage.getItem("sl_bets") || "[]"); } catch { return []; } });
  const [deposits, setDeposits] = useState(() => { try { return JSON.parse(localStorage.getItem("sl_deposits") || "[]"); } catch { return []; } });
  const [bankroll, setBankroll] = useState(() => parseFloat(localStorage.getItem("sl_bankroll") || "250"));
  const [form, setForm] = useState({ selection: "", sport: "MLB", betType: "straight", odds: "", edge: "", stake: "", result: "pending", closeOdds: "" });
  const [showForm, setShowForm] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showKelly, setShowKelly] = useState(false);
  const [depositAmt, setDepositAmt] = useState("");
  const [kOdds, setKOdds] = useState(""), [kEdge, setKEdge] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const saveBets = b => { localStorage.setItem("sl_bets", JSON.stringify(b)); setBets(b); };
  const saveDeposits = d => { localStorage.setItem("sl_deposits", JSON.stringify(d)); setDeposits(d); };
  const saveBankroll = v => { localStorage.setItem("sl_bankroll", String(v)); setBankroll(v); };

  const calcKelly = (odds, edgePct, br) => {
    if (!odds || !edgePct || !br) return null;
    const dec = americanToDecimal(parseInt(odds));
    const prob = parseFloat(edgePct) / 100 + impliedProb(parseInt(odds)) / 100;
    const b = dec - 1;
    const full = (b * prob - (1 - prob)) / b;
    return Math.max(0, (full / 2) * br);
  };

  const kellySuggestion = calcKelly(kOdds, kEdge, bankroll);
  const formKelly = form.odds && form.edge ? calcKelly(form.odds, form.edge, bankroll) : null;

  const addBet = () => {
    if (!form.selection || !form.odds || !form.stake) return;
    saveBets([{ ...form, id: Date.now(), date: new Date().toLocaleDateString(), odds: parseInt(form.odds), stake: parseFloat(form.stake), closeOdds: form.closeOdds ? parseInt(form.closeOdds) : null, edge: form.edge ? parseFloat(form.edge) : null, kellySuggested: formKelly ? parseFloat(formKelly.toFixed(2)) : null }, ...bets]);
    setForm({ selection: "", sport: "MLB", betType: "straight", odds: "", edge: "", stake: "", result: "pending", closeOdds: "" });
    setShowForm(false);
  };

  const addDeposit = () => {
    if (!depositAmt) return;
    saveDeposits([{ id: Date.now(), amount: parseFloat(depositAmt), date: new Date().toLocaleDateString() }, ...deposits]);
    saveBankroll(bankroll + parseFloat(depositAmt));
    setDepositAmt(""); setShowDeposit(false);
  };

  const updateResult = (id, result) => {
    const updated = bets.map(b => {
      if (b.id !== id) return b;
      const pnl = result === "win" ? b.stake * (americanToDecimal(b.odds) - 1) : result === "loss" ? -b.stake : 0;
      const cur = parseFloat(localStorage.getItem("sl_bankroll") || "250");
      saveBankroll(cur + pnl);
      return { ...b, result };
    });
    saveBets(updated);
  };

  const deleteBet = id => saveBets(bets.filter(b => b.id !== id));

  const settled = bets.filter(b => b.result !== "pending");
  const wins = settled.filter(b => b.result === "win");
  const losses = settled.filter(b => b.result === "loss");
  const totalStaked = settled.reduce((s, b) => s + b.stake, 0);
  const netPnl = wins.reduce((s, b) => s + b.stake * (americanToDecimal(b.odds) - 1), 0) - losses.reduce((s, b) => s + b.stake, 0);
  const roi = totalStaked > 0 ? (netPnl / totalStaked) * 100 : 0;
  const winRate = settled.length > 0 ? (wins.length / settled.length) * 100 : 0;
  const totalDeposited = deposits.reduce((s, d) => s + d.amount, 0);
  const truePnl = bankroll - totalDeposited;
  const sortedSettled = [...settled].reverse();
  let streak = 0, streakType = "";
  for (const b of sortedSettled) {
    if (!streak) { streakType = b.result; streak = 1; } else if (b.result === streakType) streak++; else break;
  }

  const filteredBets = activeFilter === "all" ? bets : activeFilter === "straight" ? bets.filter(b => b.betType === "straight") : activeFilter === "parlay" ? bets.filter(b => b.betType !== "straight") : bets.filter(b => b.result === "pending");

  return (
    <div>
      {/* Bankroll */}
      <div style={{ ...S.card, borderLeft: `3px solid ${C.accent}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
          <div>
            <div style={S.label}>Current Bankroll</div>
            <div style={{ color: bankroll >= totalDeposited ? C.green : C.red, fontSize: "32px", fontWeight: 800, lineHeight: 1 }}>${bankroll.toFixed(2)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={S.label}>True P&L</div>
            <div style={{ color: roiColor(truePnl), fontSize: "22px", fontWeight: 700 }}>{truePnl >= 0 ? "+" : ""}${truePnl.toFixed(2)}</div>
            <div style={{ color: C.subtle, fontSize: "11px" }}>${totalDeposited.toFixed(0)} deposited</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button style={{ ...S.btn("navy"), fontSize: "12px", padding: "6px 12px" }} onClick={() => setShowDeposit(!showDeposit)}>+ Deposit</button>
          <button style={{ ...S.btn("secondary"), fontSize: "12px", padding: "6px 12px" }} onClick={() => setShowKelly(!showKelly)}>⚡ Kelly Calc</button>
        </div>
        {showDeposit && (
          <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${C.border}` }}>
            <span style={S.label}>Log Deposit</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <input style={{ ...S.input, flex: 1 }} placeholder="Amount ($)" type="number" value={depositAmt} onChange={e => setDepositAmt(e.target.value)} />
              <button style={S.btn()} onClick={addDeposit}>Add</button>
            </div>
            {deposits.slice(0, 3).map(d => (
              <div key={d.id} style={{ display: "flex", justifyContent: "space-between", color: C.subtle, fontSize: "12px", padding: "3px 0", marginTop: "6px" }}>
                <span>{d.date}</span><span style={{ color: C.green }}>+${d.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
        {showKelly && (
          <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${C.border}` }}>
            <span style={S.label}>Half Kelly Calculator</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
              <div><span style={S.label}>Odds</span><input style={S.input} placeholder="+110" value={kOdds} onChange={e => setKOdds(e.target.value)} /></div>
              <div><span style={S.label}>Edge %</span><input style={S.input} placeholder="5.0" value={kEdge} onChange={e => setKEdge(e.target.value)} /></div>
            </div>
            {kellySuggestion !== null && (
              <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "12px", textAlign: "center" }}>
                <div style={S.label}>Recommended Bet Size</div>
                <div style={{ color: C.green, fontSize: "26px", fontWeight: 800 }}>${kellySuggestion.toFixed(2)}</div>
                <div style={{ color: C.subtle, fontSize: "11px" }}>{((kellySuggestion / bankroll) * 100).toFixed(1)}% of bankroll</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", marginBottom: "14px" }}>
        {[
          { label: "ROI", value: `${roi >= 0 ? "+" : ""}${roi.toFixed(1)}%`, color: roiColor(roi), sub: `${settled.length} settled` },
          { label: "Win Rate", value: `${winRate.toFixed(1)}%`, color: winRate > 52.4 ? C.green : C.secondary, sub: `${wins.length}W ${losses.length}L` },
          { label: "Net P&L", value: `${netPnl >= 0 ? "+" : ""}$${Math.abs(netPnl).toFixed(2)}`, color: roiColor(netPnl), sub: `$${totalStaked.toFixed(0)} staked` },
          { label: "Streak", value: streak > 0 ? `${streak} ${streakType === "win" ? "W" : "L"}` : "—", color: streakType === "win" ? C.green : streakType === "loss" ? C.red : C.secondary, sub: "current" },
        ].map(s => (
          <div key={s.label} style={{ ...S.card, padding: "12px", textAlign: "center" }}>
            <div style={{ color: s.color, fontSize: "22px", fontWeight: 800 }}>{s.value}</div>
            <div style={{ color: C.subtle, fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
            <div style={{ color: C.muted, fontSize: "10px" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Log bet */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div style={S.sectionTitle}>Bet Log</div>
        <button style={S.btn()} onClick={() => setShowForm(!showForm)}>+ Log Bet</button>
      </div>

      {showForm && (
        <div style={{ ...S.card, marginBottom: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
            <div style={{ gridColumn: "1 / -1" }}><span style={S.label}>Selection</span><input style={S.input} placeholder="e.g. Luis Gil o4.5 Ks" value={form.selection} onChange={e => setForm({ ...form, selection: e.target.value })} /></div>
            <div><span style={S.label}>Sport</span><select style={S.input} value={form.sport} onChange={e => setForm({ ...form, sport: e.target.value })}><option>MLB</option><option>NFL</option><option>PGA</option></select></div>
            <div><span style={S.label}>Bet Type</span><select style={S.input} value={form.betType} onChange={e => setForm({ ...form, betType: e.target.value })}><option value="straight">Straight</option><option value="parlay">Parlay</option><option value="sgp">SGP</option><option value="nrfi">NRFI</option><option value="f5">First 5</option></select></div>
            <div><span style={S.label}>Odds</span><input style={S.input} placeholder="+131" value={form.odds} onChange={e => setForm({ ...form, odds: e.target.value })} /></div>
            <div><span style={S.label}>Edge % (from app)</span><input style={S.input} placeholder="5.2" value={form.edge} onChange={e => setForm({ ...form, edge: e.target.value })} /></div>
            <div>
              <span style={S.label}>Stake ($){formKelly ? ` — Kelly: $${formKelly.toFixed(2)}` : ""}</span>
              <input style={{ ...S.input, borderColor: formKelly ? C.navy : C.border }} placeholder={formKelly ? `Suggested: $${formKelly.toFixed(2)}` : "10.00"} value={form.stake} onChange={e => setForm({ ...form, stake: e.target.value })} />
            </div>
            <div><span style={S.label}>Result</span><select style={S.input} value={form.result} onChange={e => setForm({ ...form, result: e.target.value })}><option value="pending">Pending</option><option value="win">Win</option><option value="loss">Loss</option><option value="push">Push</option></select></div>
          </div>
          <button style={S.btn()} onClick={addBet}>Save Bet</button>
        </div>
      )}

      <div style={{ display: "flex", gap: "4px", marginBottom: "12px" }}>
        {["all", "straight", "parlay", "pending"].map(f => <button key={f} style={S.mktTab(activeFilter === f)} onClick={() => setActiveFilter(f)}>{f}</button>)}
      </div>

      {filteredBets.length === 0
        ? <div style={{ color: C.subtle, fontSize: "13px", textAlign: "center", padding: "30px" }}>No bets logged yet</div>
        : filteredBets.map(bet => {
          const win = bet.result === "win", loss = bet.result === "loss";
          const pnl = win ? bet.stake * (americanToDecimal(bet.odds) - 1) : loss ? -bet.stake : 0;
          const betClv = bet.closeOdds ? clvCalc(bet.odds, bet.closeOdds) : null;
          return (
            <div key={bet.id} style={{ ...S.gameRow, borderLeft: `3px solid ${win ? C.green : loss ? C.red : bet.result === "pending" ? C.muted : C.subtle}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", flexWrap: "wrap" }}>
                    <span style={{ color: C.primary, fontSize: "13px", fontWeight: 600 }}>{bet.selection}</span>
                    <span style={S.tag(C.surface, C.subtle)}>{bet.sport}</span>
                    <span style={S.tag(C.surface, C.subtle)}>{bet.betType}</span>
                    {bet.result !== "pending" && <span style={S.tag(win ? C.green + "30" : loss ? C.red + "30" : C.surface, win ? C.green : loss ? C.red : C.secondary)}>{bet.result.toUpperCase()}</span>}
                  </div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <span style={{ color: C.subtle, fontSize: "11px" }}>{bet.date}</span>
                    <span style={{ color: C.subtle, fontSize: "11px" }}>Odds <span style={{ color: C.secondary }}>{formatAmerican(bet.odds)}</span></span>
                    <span style={{ color: C.subtle, fontSize: "11px" }}>Stake <span style={{ color: C.secondary }}>${bet.stake}</span></span>
                    {bet.edge && <span style={{ color: C.subtle, fontSize: "11px" }}>Edge <span style={{ color: C.teal }}>+{bet.edge}%</span></span>}
                    {betClv !== null && <span style={{ color: C.subtle, fontSize: "11px" }}>CLV <span style={{ color: betClv > 0 ? C.teal : C.red }}>{betClv > 0 ? "+" : ""}{betClv.toFixed(1)}%</span></span>}
                  </div>
                </div>
                <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                  {bet.result !== "pending"
                    ? <div style={{ color: pnl > 0 ? C.green : pnl < 0 ? C.red : C.secondary, fontSize: "16px", fontWeight: 700 }}>{pnl > 0 ? "+" : ""}${pnl.toFixed(2)}</div>
                    : <div style={{ display: "flex", gap: "4px" }}>
                        <button style={{ ...S.btn("secondary"), padding: "3px 8px", fontSize: "11px" }} onClick={() => updateResult(bet.id, "win")}>W</button>
                        <button style={{ ...S.btn("secondary"), padding: "3px 8px", fontSize: "11px" }} onClick={() => updateResult(bet.id, "loss")}>L</button>
                      </div>}
                  <button onClick={() => deleteBet(bet.id)} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: "14px" }}>✕</button>
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
function ChatTab({ games, sport, market }) {
  const [messages, setMessages] = useState([{ role: "assistant", content: "I'm your sharp betting analyst. Ask me about any pick, request parlay ideas, or ask me to analyze today's slate. I'll be honest — if a bet has no edge, I'll tell you." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages); setInput(""); setLoading(true);
    const slateContext = games.slice(0, 8).map(g => {
      const dk = g.bookmakers?.find(b => b.key === "draftkings");
      const outcomes = dk?.markets?.find(m => m.key === market)?.outcomes || [];
      return `${g.away_team || ""} @ ${g.home_team}: ${outcomes.map(o => `${o.name} ${formatAmerican(o.price)}`).join(", ")}`;
    }).join("\n");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: `You are a sharp, brutally honest sports betting analyst. NEVER validate a bad bet just because the user likes it. Always lead with the math. If a bet has no edge, say so. Be concise and direct.\n\nCurrent slate (${sport}, ${market}):\n${slateContext || "No slate loaded"}`,
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.content?.[0]?.text || "No response." }]);
    } catch (err) {
      setMessages([...newMessages, { role: "assistant", content: "Connection error — the Anthropic API requires a backend proxy when running on Vercel. This will be fixed in the next update." }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "65vh" }}>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", paddingBottom: "8px" }}>
        {messages.map((m, i) => <div key={i} style={S.bubble(m.role)}>{m.content}</div>)}
        {loading && <div style={{ ...S.bubble("assistant"), color: C.subtle }}>Analyzing...</div>}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", gap: "8px", paddingTop: "12px", borderTop: `1px solid ${C.border}` }}>
        <input style={{ ...S.input, flex: 1 }} placeholder="Ask about a pick, request parlay ideas..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") send(); }} />
        <button style={S.btn()} onClick={send} disabled={loading}>Send</button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("sharpline_key") || "");
  const [keyInput, setKeyInput] = useState("");
  const [tab, setTab] = useState("SLATE");
  const [sport, setSport] = useState("baseball_mlb");
  const [market, setMarket] = useState("h2h");
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(null);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const fetchOdds = useCallback(async (key, s, m) => {
    if (!key) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`https://api.the-odds-api.com/v4/sports/${s}/odds/?apiKey=${key}&regions=us&markets=${m}&oddsFormat=american&bookmakers=draftkings,fanduel`);
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "API error"); }
      setRemaining(res.headers.get("x-requests-remaining"));
      const data = await res.json();
      setGames(Array.isArray(data) ? data : []);
      setInitialLoaded(true);
    } catch (e) { setError(e.message); setGames([]); }
    setLoading(false);
  }, []);

  // Fetch on sport/market change only after initial load
  useEffect(() => { if (apiKey && initialLoaded) fetchOdds(apiKey, sport, market); }, [sport, market]);

  const connectKey = k => { localStorage.setItem("sharpline_key", k); setApiKey(k); fetchOdds(k, sport, market); };
  const handleSportChange = s => { setSport(s); setMarket(s.includes("golf") ? "outrights" : "h2h"); };

  if (!apiKey) return (
    <div style={S.app}>
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ width: "100%", maxWidth: "400px" }}>
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div style={{ fontSize: "28px", fontWeight: 800, color: C.primary, marginBottom: "6px" }}>Sharp<span style={{ color: C.accent }}>Line</span></div>
            <div style={{ color: C.subtle, fontSize: "13px" }}>Your sharp betting analyst</div>
          </div>
          <div style={S.card}>
            <div style={{ color: C.primary, fontWeight: 700, fontSize: "16px", marginBottom: "6px" }}>Connect The Odds API</div>
            <div style={{ color: C.secondary, fontSize: "13px", lineHeight: 1.6, marginBottom: "16px" }}>
              Get a free key at <a href="https://the-odds-api.com" target="_blank" rel="noopener noreferrer" style={{ color: C.blue }}>the-odds-api.com</a> — 500 requests/month free.
            </div>
            <input style={{ ...S.input, marginBottom: "10px" }} type="text" placeholder="Paste your API key..." value={keyInput} onChange={e => setKeyInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && keyInput.trim()) connectKey(keyInput.trim()); }} />
            <button style={{ ...S.btn(), width: "100%" }} onClick={() => { if (keyInput.trim()) connectKey(keyInput.trim()); }}>Connect & Launch</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={S.app}>
      <div style={S.header}>
        <div style={S.headerInner}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: C.accent }} />
            <span style={{ fontSize: "18px", fontWeight: 800, color: C.primary }}>Sharp<span style={{ color: C.accent }}>Line</span></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {remaining && <span style={{ color: C.muted, fontSize: "11px" }}>{remaining} calls</span>}
            <button style={{ ...S.btn("ghost"), fontSize: "11px", padding: "4px 10px" }} onClick={() => fetchOdds(apiKey, sport, market)}>{loading ? "..." : "↻"}</button>
            <button style={{ ...S.btn("ghost"), fontSize: "11px", padding: "4px 10px" }} onClick={() => { localStorage.removeItem("sharpline_key"); setApiKey(""); }}>Key</button>
          </div>
        </div>
      </div>

      <div style={S.main}>
        <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap" }}>
          {SPORTS.map(s => (
            <button key={s.key} style={S.sportTab(sport === s.key)} onClick={() => handleSportChange(s.key)}>
              {s.icon} {s.label}{!s.season && s.key.includes("football") ? <span style={{ color: C.muted, fontSize: "10px", marginLeft: "4px" }}>OFF</span> : ""}
            </button>
          ))}
        </div>
        <div style={S.tabBar}>
          {TABS.map(t => <button key={t} style={S.tab(tab === t)} onClick={() => setTab(t)}>{t}</button>)}
        </div>
        {tab === "SLATE" && <SlateTab games={games} sport={sport} market={market} setMarket={setMarket} loading={loading} error={error} remaining={remaining} />}
        {tab === "PROPS" && <PropsTab apiKey={apiKey} sport={sport} />}
        {tab === "PARLAYS" && <ParlaysTab />}
        {tab === "TRACKER" && <TrackerTab />}
        {tab === "CHAT" && <ChatTab games={games} sport={sport} market={market} />}
      </div>
    </div>
  );
}
