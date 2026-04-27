import { useState, useEffect, useCallback, useRef } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────

const SPORTS = [
  { key: "baseball_mlb", label: "MLB", icon: "⚾", season: true },
  { key: "americanfootball_nfl", label: "NFL", icon: "🏈", season: false },
  { key: "golf_pga_championship_winner", label: "PGA", icon: "⛳", season: true },
];

const GOLF_MARKETS = [
  { key: "outrights", label: "Winner" },
  { key: "h2h", label: "Matchups" },
];

const MLB_MARKETS = [
  { key: "h2h", label: "Moneyline" },
  { key: "spreads", label: "Run Line" },
  { key: "totals", label: "Totals" },
];

const NFL_MARKETS = [
  { key: "h2h", label: "Moneyline" },
  { key: "spreads", label: "Spread" },
  { key: "totals", label: "Total" },
];

const TABS = ["SLATE", "PROPS", "PARLAYS", "TRACKER", "CHAT"];

const TARGET_BOOKS = ["draftkings", "fanduel"];

// ─── Utilities ────────────────────────────────────────────────────────────────

function americanToDecimal(a) { return a > 0 ? a / 100 + 1 : 100 / Math.abs(a) + 1; }
function impliedProb(a) { return (1 / americanToDecimal(a)) * 100; }
function formatAmerican(o) { return o > 0 ? `+${o}` : `${o}`; }
function fairProb(outcomes) {
  const total = outcomes.reduce((s, o) => s + impliedProb(o.price), 0);
  return outcomes.map(o => ({ ...o, fair: (impliedProb(o.price) / total) * 100 }));
}
function edge(price, fair) { return fair - impliedProb(price); }
function clv(betOdds, closeOdds) {
  return impliedProb(closeOdds) - impliedProb(betOdds);
}
function roiColor(v) { return v > 0 ? "#00ff87" : v < 0 ? "#ff4444" : "#718096"; }
function edgeLabel(e) {
  if (e > 6) return { label: "STRONG VALUE", bg: "#00ff87", color: "#0a0a0a" };
  if (e > 3) return { label: "VALUE", bg: "#ffe600", color: "#0a0a0a" };
  if (e > 0) return { label: "SLIGHT EDGE", bg: "#2d3748", color: "#a0aec0" };
  if (e < -4) return { label: "AVOID", bg: "#ff444430", color: "#ff6b6b" };
  return null;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  app: { minHeight: "100vh", background: "#060810", color: "#e2e8f0", fontFamily: "'DM Sans', sans-serif" },
  header: { borderBottom: "1px solid #0f1420", padding: "0 16px", background: "#060810", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(12px)" },
  headerInner: { maxWidth: "900px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "52px" },
  logo: { fontFamily: "'Bebas Neue', sans-serif", fontSize: "24px", letterSpacing: "0.12em", color: "#fff" },
  logoAccent: { color: "#00e5ff" },
  dot: { width: "7px", height: "7px", borderRadius: "50%", background: "#00e5ff", boxShadow: "0 0 10px #00e5ff", marginRight: "10px" },
  main: { maxWidth: "900px", margin: "0 auto", padding: "16px" },
  card: { background: "linear-gradient(135deg, #0c0f18 0%, #0a0d16 100%)", border: "1px solid #131826", borderRadius: "12px", padding: "20px", marginBottom: "12px", position: "relative", overflow: "hidden" },
  cardAccent: { position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, #00e5ff, #7c3aed, transparent)" },
  tabBar: { display: "flex", gap: "4px", marginBottom: "20px", background: "#0c0f18", borderRadius: "10px", padding: "4px", border: "1px solid #131826" },
  tab: (active) => ({ flex: 1, padding: "8px 4px", background: active ? "linear-gradient(135deg, #00e5ff15, #7c3aed15)" : "transparent", border: active ? "1px solid #00e5ff30" : "1px solid transparent", borderRadius: "7px", color: active ? "#00e5ff" : "#4a5568", fontFamily: "'Bebas Neue', sans-serif", fontSize: "13px", letterSpacing: "0.1em", cursor: "pointer", transition: "all 0.15s", textAlign: "center" }),
  sportTab: (active) => ({ padding: "7px 14px", background: active ? "#00e5ff" : "#0c0f18", border: `1px solid ${active ? "#00e5ff" : "#131826"}`, borderRadius: "8px", color: active ? "#060810" : "#718096", fontFamily: "'Bebas Neue', sans-serif", fontSize: "14px", letterSpacing: "0.08em", cursor: "pointer", transition: "all 0.15s" }),
  mktTab: (active) => ({ padding: "5px 12px", background: active ? "#131826" : "transparent", border: `1px solid ${active ? "#1e2740" : "transparent"}`, borderRadius: "6px", color: active ? "#e2e8f0" : "#4a5568", fontSize: "12px", fontFamily: "monospace", cursor: "pointer", transition: "all 0.15s" }),
  btn: (variant = "primary") => ({
    background: variant === "primary" ? "linear-gradient(135deg, #00e5ff, #7c3aed)" : variant === "ghost" ? "transparent" : "#131826",
    color: variant === "primary" ? "#060810" : variant === "ghost" ? "#4a5568" : "#e2e8f0",
    border: variant === "ghost" ? "1px solid #1e2740" : "none",
    borderRadius: "8px", padding: "8px 16px", fontWeight: 700, fontFamily: "'Bebas Neue', sans-serif",
    letterSpacing: "0.08em", cursor: "pointer", fontSize: "13px", transition: "all 0.2s",
  }),
  input: { background: "#0a0d16", border: "1px solid #131826", borderRadius: "8px", padding: "10px 14px", color: "#e2e8f0", fontSize: "13px", fontFamily: "monospace", outline: "none", width: "100%", boxSizing: "border-box" },
  label: { color: "#4a5568", fontSize: "11px", fontFamily: "monospace", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px", display: "block" },
  sectionTitle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: "13px", letterSpacing: "0.15em", color: "#00e5ff", marginBottom: "14px" },
  tag: (bg, color) => ({ background: bg, color: color, fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "3px", letterSpacing: "0.08em", fontFamily: "'DM Sans', sans-serif" }),
  gameRow: { background: "#080b14", border: "1px solid #0f1420", borderRadius: "8px", padding: "12px 14px", marginBottom: "8px" },
  outcomeRow: (hasEdge) => ({ background: "#060810", border: `1px solid ${hasEdge ? "#00e5ff20" : "#0f1420"}`, borderRadius: "6px", padding: "10px 12px", marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }),
  odds: (e) => ({ fontFamily: "'Bebas Neue', sans-serif", fontSize: "24px", fontWeight: 400, color: e > 3 ? "#00e5ff" : e > 0 ? "#a0aec0" : "#4a5568" }),
  chatBubble: (role) => ({ background: role === "user" ? "linear-gradient(135deg, #00e5ff15, #7c3aed15)" : "#0c0f18", border: `1px solid ${role === "user" ? "#00e5ff20" : "#131826"}`, borderRadius: role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px", padding: "12px 16px", marginBottom: "10px", maxWidth: "85%", alignSelf: role === "user" ? "flex-end" : "flex-start", color: "#e2e8f0", fontSize: "13px", lineHeight: 1.65 }),
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ e }) {
  const info = edgeLabel(e);
  if (!info) return null;
  return <span style={S.tag(info.bg, info.color)}>{info.label}</span>;
}

function BookOdds({ bookmakers, outcomeName, market }) {
  const dk = bookmakers.find(b => b.key === "draftkings");
  const fd = bookmakers.find(b => b.key === "fanduel");
  const getPrice = (bk) => bk?.markets?.find(m => m.key === market)?.outcomes?.find(o => o.name === outcomeName)?.price;
  const dkPrice = getPrice(dk);
  const fdPrice = getPrice(fd);
  const best = dkPrice && fdPrice ? (dkPrice >= fdPrice ? { price: dkPrice, book: "DK" } : { price: fdPrice, book: "FD" }) : dkPrice ? { price: dkPrice, book: "DK" } : fdPrice ? { price: fdPrice, book: "FD" } : null;
  if (!best) return null;
  return { best, dkPrice, fdPrice };
}

// ─── Slate Tab ────────────────────────────────────────────────────────────────

function SlateTab({ games, sport, market, setMarket, loading, error, onRefresh, remaining }) {
  const markets = sport === "baseball_mlb" ? MLB_MARKETS : sport === "americanfootball_nfl" ? NFL_MARKETS : GOLF_MARKETS;

  return (
    <div>
      <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap", alignItems: "center" }}>
        {markets.map(m => (
          <button key={m.key} style={S.mktTab(market === m.key)} onClick={() => setMarket(m.key)}>{m.label}</button>
        ))}
        <button style={{ ...S.btn("ghost"), marginLeft: "auto", fontSize: "11px", padding: "5px 10px" }} onClick={onRefresh} disabled={loading}>
          {loading ? "..." : "↻ REFRESH"}
        </button>
        {remaining && <span style={{ color: "#2d3748", fontSize: "10px", fontFamily: "monospace" }}>{remaining} left</span>}
      </div>

      {error && <div style={{ background: "#1a0808", border: "1px solid #ff444430", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", color: "#ff6b6b", fontSize: "12px" }}>⚠ {error}</div>}

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#2d3748", fontFamily: "monospace", fontSize: "12px" }}>Fetching live odds...</div>
      ) : games.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#2d3748", fontFamily: "monospace", fontSize: "12px" }}>No games found for this market</div>
      ) : (
        games.map(game => <GameCard key={game.id} game={game} market={market} sport={sport} />)
      )}
    </div>
  );
}

function GameCard({ game, market, sport }) {
  const isGolf = sport.includes("golf");
  const outcomes = [];
  game.bookmakers.forEach(bk => {
    if (!TARGET_BOOKS.includes(bk.key)) return;
    bk.markets?.find(m => m.key === market)?.outcomes?.forEach(o => {
      if (!outcomes.find(x => x.name === o.name)) outcomes.push(o);
    });
  });
  if (!outcomes.length) return null;

  const withFair = fairProb(outcomes.map(o => {
    const best = ["draftkings", "fanduel"].map(bk => {
      const b = game.bookmakers.find(x => x.key === bk);
      return b?.markets?.find(m => m.key === market)?.outcomes?.find(x => x.name === o.name)?.price;
    }).filter(Boolean);
    const avgPrice = best.length ? best.reduce((a, b) => a + b, 0) / best.length : o.price;
    return { ...o, price: avgPrice };
  }));

  const gameTime = new Date(game.commence_time);

  return (
    <div style={S.gameRow}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div>
          {isGolf ? (
            <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "16px", letterSpacing: "0.06em" }}>{game.sport_title || "PGA Tournament"}</div>
          ) : (
            <>
              <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "16px", letterSpacing: "0.06em" }}>{game.away_team}</div>
              <div style={{ color: "#2d3748", fontSize: "10px", margin: "1px 0", fontFamily: "monospace" }}>@</div>
              <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "16px", letterSpacing: "0.06em" }}>{game.home_team}</div>
            </>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#00e5ff", fontSize: "11px", fontFamily: "monospace" }}>{gameTime.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
          <div style={{ color: "#2d3748", fontSize: "10px", fontFamily: "monospace" }}>{gameTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
        </div>
      </div>

      {withFair.slice(0, isGolf ? 8 : 10).map(o => {
        const dkBk = game.bookmakers.find(b => b.key === "draftkings");
        const fdBk = game.bookmakers.find(b => b.key === "fanduel");
        const dkPrice = dkBk?.markets?.find(m => m.key === market)?.outcomes?.find(x => x.name === o.name)?.price;
        const fdPrice = fdBk?.markets?.find(m => m.key === market)?.outcomes?.find(x => x.name === o.name)?.price;
        const bestPrice = dkPrice && fdPrice ? Math.max(dkPrice, fdPrice) : dkPrice || fdPrice;
        const bestBook = bestPrice === fdPrice && fdPrice !== dkPrice ? "FD" : "DK";
        if (!bestPrice) return null;
        const e = edge(bestPrice, o.fair);

        return (
          <div key={o.name} style={S.outcomeRow(e > 3)}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span style={{ color: "#e2e8f0", fontSize: "13px", fontWeight: 500 }}>{o.name}</span>
                <Badge e={e} />
              </div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <span style={{ color: "#2d3748", fontSize: "10px", fontFamily: "monospace" }}>
                  Implied <span style={{ color: "#4a5568" }}>{impliedProb(bestPrice).toFixed(1)}%</span>
                </span>
                <span style={{ color: "#2d3748", fontSize: "10px", fontFamily: "monospace" }}>
                  Fair <span style={{ color: "#718096" }}>{o.fair.toFixed(1)}%</span>
                </span>
                <span style={{ color: "#2d3748", fontSize: "10px", fontFamily: "monospace" }}>
                  Edge <span style={{ color: e > 0 ? "#00e5ff" : "#ff4444" }}>{e > 0 ? "+" : ""}{e.toFixed(1)}%</span>
                </span>
                {dkPrice && fdPrice && dkPrice !== fdPrice && (
                  <span style={{ color: "#7c3aed", fontSize: "10px", fontFamily: "monospace" }}>
                    DK {formatAmerican(dkPrice)} · FD {formatAmerican(fdPrice)}
                  </span>
                )}
              </div>
            </div>
            <div style={{ textAlign: "right", minWidth: "70px" }}>
              <div style={S.odds(e)}>{formatAmerican(bestPrice)}</div>
              <div style={{ color: "#2d3748", fontSize: "10px" }}>{bestBook}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Props Tab ────────────────────────────────────────────────────────────────

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
    setSelectedGame(null);
    setProps([]);
    const fetchGames = async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${apiKey}&regions=us&markets=h2h&oddsFormat=american`);
        const data = await res.json();
        setPropGames(Array.isArray(data) ? data : []);
      } catch { setPropGames([]); }
      setLoading(false);
    };
    fetchGames();
  }, [sport, apiKey]);

  const fetchProps = async (game) => {
    setSelectedGame(game);
    setLoadingProps(true);
    setProps([]);
    const propMarkets = isGolf
      ? "golfer_top_5,golfer_top_10,golfer_top_20,golfer_make_cut"
      : isNFL
        ? "player_pass_tds,player_pass_yds,player_rush_yds,player_reception_yds,player_anytime_td"
        : "batter_hits,batter_total_bases,pitcher_strikeouts,batter_home_runs,batter_rbis";
    try {
      const res = await fetch(`https://api.the-odds-api.com/v4/sports/${sport}/events/${game.id}/odds?apiKey=${apiKey}&regions=us&markets=${propMarkets}&oddsFormat=american&bookmakers=draftkings,fanduel`);
      const data = await res.json();
      const allProps = [];
      data.bookmakers?.forEach(bk => {
        bk.markets?.forEach(mkt => {
          mkt.outcomes?.forEach(o => {
            const existing = allProps.find(p => p.market === mkt.key && p.name === o.name && p.description === o.description);
            if (existing) {
              existing.books[bk.key] = o.price;
              if (o.price > existing.bestPrice) { existing.bestPrice = o.price; existing.bestBook = bk.key === "draftkings" ? "DK" : "FD"; }
            } else {
              allProps.push({ market: mkt.key, name: o.name, description: o.description, point: o.point, bestPrice: o.price, bestBook: bk.key === "draftkings" ? "DK" : "FD", books: { [bk.key]: o.price } });
            }
          });
        });
      });
      // Calculate edge using cross-book implied prob
      allProps.forEach(p => {
        const prices = Object.values(p.books);
        const avgDecimal = prices.map(americanToDecimal).reduce((a, b) => a + b, 0) / prices.length;
        const fairPct = (1 / avgDecimal) * 100;
        p.edge = edge(p.bestPrice, fairPct);
        p.fair = fairPct;
        p.implied = impliedProb(p.bestPrice);
      });
      allProps.sort((a, b) => b.edge - a.edge);
      setProps(allProps);
    } catch { setProps([]); }
    setLoadingProps(false);
  };

  const filtered = props.filter(p =>
    !filter || p.name?.toLowerCase().includes(filter.toLowerCase()) || p.description?.toLowerCase().includes(filter.toLowerCase())
  );

  const marketLabel = (key) => key.replace(/_/g, " ").replace("batter ", "").replace("pitcher ", "").replace("player ", "").replace("golfer ", "");

  if (isGolf) {
    return (
      <div>
        <div style={S.sectionTitle}>PGA PROPS</div>
        {loading ? <div style={{ color: "#2d3748", fontFamily: "monospace", fontSize: "12px", textAlign: "center", padding: "30px" }}>Loading tournaments...</div> : (
          propGames.length === 0 ? <div style={{ color: "#2d3748", fontFamily: "monospace", fontSize: "12px", textAlign: "center", padding: "30px" }}>No active PGA events found</div> : (
            propGames.map(g => (
              <div key={g.id} style={{ ...S.gameRow, cursor: "pointer", border: selectedGame?.id === g.id ? "1px solid #00e5ff30" : "1px solid #0f1420" }} onClick={() => fetchProps(g)}>
                <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "15px" }}>{g.sport_title}</div>
                <div style={{ color: "#4a5568", fontSize: "11px", fontFamily: "monospace" }}>{new Date(g.commence_time).toLocaleDateString()}</div>
              </div>
            ))
          )
        )}
        {selectedGame && <PropResults props={filtered} loading={loadingProps} filter={filter} setFilter={setFilter} marketLabel={marketLabel} />}
      </div>
    );
  }

  return (
    <div>
      <div style={S.sectionTitle}>SELECT GAME</div>
      {loading ? <div style={{ color: "#2d3748", fontFamily: "monospace", fontSize: "12px", textAlign: "center", padding: "30px" }}>Loading games...</div> : (
        propGames.slice(0, 8).map(g => (
          <div key={g.id} style={{ ...S.gameRow, cursor: "pointer", border: selectedGame?.id === g.id ? "1px solid #00e5ff30" : "1px solid #0f1420" }} onClick={() => fetchProps(g)}>
            <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "14px" }}>{g.away_team} @ {g.home_team}</div>
            <div style={{ color: "#4a5568", fontSize: "10px", fontFamily: "monospace" }}>{new Date(g.commence_time).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
          </div>
        ))
      )}
      {selectedGame && <PropResults props={filtered} loading={loadingProps} filter={filter} setFilter={setFilter} marketLabel={marketLabel} />}
    </div>
  );
}

function PropResults({ props, loading, filter, setFilter, marketLabel }) {
  return (
    <div style={{ marginTop: "16px" }}>
      <input style={S.input} placeholder="Filter by player name..." value={filter} onChange={e => setFilter(e.target.value)} />
      <div style={{ marginTop: "12px" }}>
        {loading ? (
          <div style={{ color: "#2d3748", fontFamily: "monospace", fontSize: "12px", textAlign: "center", padding: "30px" }}>Loading props...</div>
        ) : props.length === 0 ? (
          <div style={{ color: "#2d3748", fontFamily: "monospace", fontSize: "12px", textAlign: "center", padding: "20px" }}>No props found</div>
        ) : (
          props.map((p, i) => (
            <div key={i} style={S.outcomeRow(p.edge > 3)}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px", flexWrap: "wrap" }}>
                  <span style={{ color: "#e2e8f0", fontSize: "13px", fontWeight: 500 }}>{p.description || p.name}</span>
                  <span style={{ color: "#4a5568", fontSize: "11px", fontFamily: "monospace" }}>{marketLabel(p.market)}{p.point ? ` ${p.point}` : ""}</span>
                  <Badge e={p.edge} />
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <span style={{ color: "#2d3748", fontSize: "10px", fontFamily: "monospace" }}>Implied <span style={{ color: "#4a5568" }}>{p.implied.toFixed(1)}%</span></span>
                  <span style={{ color: "#2d3748", fontSize: "10px", fontFamily: "monospace" }}>Fair <span style={{ color: "#718096" }}>{p.fair.toFixed(1)}%</span></span>
                  <span style={{ color: "#2d3748", fontSize: "10px", fontFamily: "monospace" }}>Edge <span style={{ color: p.edge > 0 ? "#00e5ff" : "#ff4444" }}>{p.edge > 0 ? "+" : ""}{p.edge.toFixed(1)}%</span></span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={S.odds(p.edge)}>{formatAmerican(p.bestPrice)}</div>
                <div style={{ color: "#2d3748", fontSize: "10px" }}>{p.bestBook}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Parlays Tab ──────────────────────────────────────────────────────────────

function ParlaysTab({ games, sport, apiKey }) {
  const [legs, setLegs] = useState([]);
  const [suggestion, setSuggestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [stake, setStake] = useState("10");

  const combinedOdds = legs.reduce((acc, leg) => acc * americanToDecimal(leg.price), 1);
  const parlayAmerican = combinedOdds >= 2 ? Math.round((combinedOdds - 1) * 100) : Math.round(-100 / (combinedOdds - 1));
  const impliedParlayProb = legs.reduce((acc, leg) => acc * (leg.fair / 100), 1) * 100;
  const parlayEdge = impliedParlayProb - impliedProb(parlayAmerican);
  const payout = parseFloat(stake) * (combinedOdds - 1);

  const suggestParlay = async () => {
    setLoading(true);
    setSuggestion("");
    const slate = games.slice(0, 6).map(g => {
      const dk = g.bookmakers.find(b => b.key === "draftkings");
      const outcomes = dk?.markets?.find(m => m.key === "h2h")?.outcomes || [];
      return `${g.away_team} @ ${g.home_team}: ${outcomes.map(o => `${o.name} ${formatAmerican(o.price)}`).join(", ")}`;
    }).join("\n");

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are a sharp sports betting analyst specializing in parlay construction. Your job is to find CORRELATED parlay legs that have genuine positive expected value. Be brutally honest - if there's no good parlay on this slate, say so. Never recommend a parlay just to recommend one. Focus on: 1) Correlated outcomes (same game parlays where outcomes are related), 2) Line value on each leg, 3) Combined implied probability vs fair probability. Format: suggest 1-2 specific parlays with exact legs, odds, reasoning, and a clear EV assessment. Be direct and data-driven.`,
          messages: [{ role: "user", content: `Analyze this ${sport} slate and suggest the best correlated parlay opportunities:\n\n${slate}\n\nSuggest 1-2 specific parlays with reasoning. If no good value exists, say so clearly.` }]
        })
      });
      const data = await res.json();
      setSuggestion(data.content?.[0]?.text || "No suggestion available.");
    } catch { setSuggestion("Error fetching suggestion."); }
    setLoading(false);
  };

  const removeLeg = (i) => setLegs(legs.filter((_, idx) => idx !== i));

  return (
    <div>
      {/* AI Suggestion */}
      <div style={S.card}>
        <div style={S.cardAccent} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div style={S.sectionTitle}>AI PARLAY SUGGESTIONS</div>
          <button style={S.btn()} onClick={suggestParlay} disabled={loading || !games.length}>
            {loading ? "ANALYZING..." : "SUGGEST PARLAYS"}
          </button>
        </div>
        {suggestion ? (
          <div style={{ color: "#a0aec0", fontSize: "13px", lineHeight: 1.7 }}>{suggestion}</div>
        ) : (
          <div style={{ color: "#2d3748", fontSize: "12px", fontFamily: "monospace", textAlign: "center", padding: "10px 0" }}>
            Load slate data then click Suggest Parlays
          </div>
        )}
      </div>

      {/* Manual Builder */}
      <div style={S.card}>
        <div style={S.cardAccent} />
        <div style={S.sectionTitle}>PARLAY BUILDER</div>

        {legs.length === 0 ? (
          <div style={{ color: "#2d3748", fontSize: "12px", fontFamily: "monospace", textAlign: "center", padding: "20px 0" }}>
            Add legs manually below
          </div>
        ) : (
          <>
            {legs.map((leg, i) => (
              <div key={i} style={{ ...S.outcomeRow(false), marginBottom: "6px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#e2e8f0", fontSize: "13px" }}>{leg.name}</div>
                  <div style={{ color: "#4a5568", fontSize: "11px", fontFamily: "monospace" }}>{leg.game}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={S.odds(0)}>{formatAmerican(leg.price)}</div>
                  <button onClick={() => removeLeg(i)} style={{ background: "transparent", border: "none", color: "#ff4444", cursor: "pointer", fontSize: "16px" }}>×</button>
                </div>
              </div>
            ))}

            <div style={{ background: "#0a0d16", border: "1px solid #131826", borderRadius: "8px", padding: "14px", marginTop: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "#4a5568", fontSize: "12px", fontFamily: "monospace" }}>{legs.length}-leg parlay</span>
                <span style={S.odds(parlayEdge)}>{formatAmerican(parlayAmerican)}</span>
              </div>
              <div style={{ display: "flex", gap: "16px", marginBottom: "10px", flexWrap: "wrap" }}>
                <span style={{ color: "#2d3748", fontSize: "11px", fontFamily: "monospace" }}>True prob <span style={{ color: "#718096" }}>{impliedParlayProb.toFixed(1)}%</span></span>
                <span style={{ color: "#2d3748", fontSize: "11px", fontFamily: "monospace" }}>Implied <span style={{ color: "#718096" }}>{impliedProb(parlayAmerican).toFixed(1)}%</span></span>
                <span style={{ color: "#2d3748", fontSize: "11px", fontFamily: "monospace" }}>Edge <span style={{ color: parlayEdge > 0 ? "#00e5ff" : "#ff4444" }}>{parlayEdge > 0 ? "+" : ""}{parlayEdge.toFixed(1)}%</span></span>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <span style={S.label}>STAKE ($)</span>
                  <input style={{ ...S.input, padding: "6px 10px" }} type="number" value={stake} onChange={e => setStake(e.target.value)} />
                </div>
                <div style={{ flex: 1, textAlign: "right" }}>
                  <span style={S.label}>POTENTIAL WIN</span>
                  <div style={{ color: "#00e5ff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "22px" }}>${payout.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Add leg manually */}
        <AddLegForm onAdd={(leg) => setLegs([...legs, leg])} />
      </div>
    </div>
  );
}

function AddLegForm({ onAdd }) {
  const [name, setName] = useState("");
  const [game, setGame] = useState("");
  const [price, setPrice] = useState("");
  const [fair, setFair] = useState("");

  const add = () => {
    if (!name || !price) return;
    onAdd({ name, game, price: parseInt(price), fair: parseFloat(fair) || impliedProb(parseInt(price)) });
    setName(""); setGame(""); setPrice(""); setFair("");
  };

  return (
    <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid #0f1420" }}>
      <div style={S.sectionTitle}>ADD LEG</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
        <div><span style={S.label}>SELECTION</span><input style={S.input} placeholder="e.g. Yankees ML" value={name} onChange={e => setName(e.target.value)} /></div>
        <div><span style={S.label}>GAME</span><input style={S.input} placeholder="e.g. NYY @ BOS" value={game} onChange={e => setGame(e.target.value)} /></div>
        <div><span style={S.label}>ODDS (American)</span><input style={S.input} placeholder="-110" value={price} onChange={e => setPrice(e.target.value)} /></div>
        <div><span style={S.label}>YOUR FAIR % (opt)</span><input style={S.input} placeholder="52.4" value={fair} onChange={e => setFair(e.target.value)} /></div>
      </div>
      <button style={S.btn()} onClick={add}>ADD LEG</button>
    </div>
  );
}

// ─── Tracker Tab ──────────────────────────────────────────────────────────────

function TrackerTab() {
  const [bets, setBets] = useState(() => { try { return JSON.parse(localStorage.getItem("sharpline_bets") || "[]"); } catch { return []; } });
  const [deposits, setDeposits] = useState(() => { try { return JSON.parse(localStorage.getItem("sharpline_deposits") || "[]"); } catch { return []; } });
  const [bankroll, setBankroll] = useState(() => parseFloat(localStorage.getItem("sharpline_bankroll") || "250"));
  const [form, setForm] = useState({ selection: "", sport: "MLB", betType: "straight", odds: "", edge: "", stake: "", result: "pending", closeOdds: "" });
  const [showForm, setShowForm] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showKelly, setShowKelly] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [kellyOdds, setKellyOdds] = useState("");
  const [kellyEdge, setKellyEdge] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const saveBets = (b) => { localStorage.setItem("sharpline_bets", JSON.stringify(b)); setBets(b); };
  const saveDeposits = (d) => { localStorage.setItem("sharpline_deposits", JSON.stringify(d)); setDeposits(d); };
  const saveBankroll = (v) => { localStorage.setItem("sharpline_bankroll", v); setBankroll(v); };

  // Kelly Calculator
  const calcKelly = (odds, edgePct, bankrollAmt) => {
    if (!odds || !edgePct || !bankrollAmt) return null;
    const decimal = americanToDecimal(parseInt(odds));
    const prob = (parseFloat(edgePct) / 100) + impliedProb(parseInt(odds)) / 100;
    const q = 1 - prob;
    const b = decimal - 1;
    const fullKelly = (b * prob - q) / b;
    const halfKelly = fullKelly / 2;
    return Math.max(0, halfKelly * bankrollAmt);
  };

  const kellySuggestion = calcKelly(kellyOdds, kellyEdge, bankroll);

  // Auto-populate stake from Kelly when odds/edge entered in bet form
  const formKelly = form.odds && form.edge ? calcKelly(form.odds, form.edge, bankroll) : null;

  const addBet = () => {
    if (!form.selection || !form.odds || !form.stake) return;
    const bet = { ...form, id: Date.now(), date: new Date().toLocaleDateString(), odds: parseInt(form.odds), stake: parseFloat(form.stake), closeOdds: form.closeOdds ? parseInt(form.closeOdds) : null, edge: form.edge ? parseFloat(form.edge) : null, kellySuggested: formKelly ? parseFloat(formKelly.toFixed(2)) : null };
    saveBets([bet, ...bets]);
    setForm({ selection: "", sport: "MLB", betType: "straight", odds: "", edge: "", stake: "", result: "pending", closeOdds: "" });
    setShowForm(false);
  };

  const addDeposit = () => {
    if (!depositAmount) return;
    const dep = { id: Date.now(), amount: parseFloat(depositAmount), date: new Date().toLocaleDateString() };
    saveDeposits([dep, ...deposits]);
    saveBankroll(bankroll + parseFloat(depositAmount));
    setDepositAmount("");
    setShowDeposit(false);
  };

  const updateResult = (id, result) => {
    const updated = bets.map(b => {
      if (b.id !== id) return b;
      const win = result === "win";
      const loss = result === "loss";
      const pnl = win ? b.stake * (americanToDecimal(b.odds) - 1) : loss ? -b.stake : 0;
      const newBankroll = bankroll + pnl;
      saveBankroll(newBankroll);
      return { ...b, result };
    });
    saveBets(updated);
  };

  const deleteBet = (id) => saveBets(bets.filter(b => b.id !== id));

  // Stats
  const settled = bets.filter(b => b.result !== "pending");
  const wins = settled.filter(b => b.result === "win");
  const losses = settled.filter(b => b.result === "loss");
  const straights = settled.filter(b => b.betType === "straight");
  const parlays = settled.filter(b => b.betType === "parlay");
  const totalStaked = settled.reduce((s, b) => s + b.stake, 0);
  const totalWon = wins.reduce((s, b) => s + b.stake * (americanToDecimal(b.odds) - 1), 0);
  const totalLost = losses.reduce((s, b) => s + b.stake, 0);
  const netPnl = totalWon - totalLost;
  const roi = totalStaked > 0 ? (netPnl / totalStaked) * 100 : 0;
  const winRate = settled.length > 0 ? (wins.length / settled.length) * 100 : 0;
  const clvBets = bets.filter(b => b.closeOdds);
  const avgClv = clvBets.length > 0 ? clvBets.reduce((s, b) => s + clv(b.odds, b.closeOdds), 0) / clvBets.length : null;
  const totalDeposited = deposits.reduce((s, d) => s + d.amount, 0);
  const truePnl = bankroll - totalDeposited;

  // Current streak
  const sortedSettled = [...settled].reverse();
  let streak = 0;
  let streakType = "";
  for (const b of sortedSettled) {
    if (streak === 0) { streakType = b.result; streak = 1; }
    else if (b.result === streakType) streak++;
    else break;
  }

  const filteredBets = activeFilter === "all" ? bets : activeFilter === "straight" ? bets.filter(b => b.betType === "straight") : activeFilter === "parlay" ? bets.filter(b => b.betType === "parlay") : bets.filter(b => b.result === "pending");

  return (
    <div>
      {/* Bankroll Header */}
      <div style={{ ...S.card, marginBottom: "14px" }}>
        <div style={S.cardAccent} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
          <div>
            <div style={{ color: "#4a5568", fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "4px" }}>CURRENT BANKROLL</div>
            <div style={{ color: bankroll >= totalDeposited ? "#00e5ff" : "#ff4444", fontFamily: "'Bebas Neue', sans-serif", fontSize: "36px", lineHeight: 1 }}>${bankroll.toFixed(2)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#4a5568", fontSize: "10px", fontFamily: "monospace", marginBottom: "2px" }}>TRUE P&L</div>
            <div style={{ color: roiColor(truePnl), fontFamily: "'Bebas Neue', sans-serif", fontSize: "22px" }}>{truePnl >= 0 ? "+" : ""}${truePnl.toFixed(2)}</div>
            <div style={{ color: "#2d3748", fontSize: "10px", fontFamily: "monospace" }}>vs ${totalDeposited.toFixed(0)} deposited</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button style={{ ...S.btn(), fontSize: "11px", padding: "6px 12px" }} onClick={() => setShowDeposit(!showDeposit)}>+ DEPOSIT</button>
          <button style={{ ...S.btn("secondary"), fontSize: "11px", padding: "6px 12px" }} onClick={() => setShowKelly(!showKelly)}>⚡ KELLY CALC</button>
        </div>

        {showDeposit && (
          <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #0f1420" }}>
            <div style={S.sectionTitle}>LOG DEPOSIT</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input style={{ ...S.input, flex: 1 }} placeholder="Amount ($)" type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
              <button style={S.btn()} onClick={addDeposit}>ADD</button>
            </div>
            {deposits.length > 0 && (
              <div style={{ marginTop: "10px" }}>
                {deposits.slice(0, 3).map(d => (
                  <div key={d.id} style={{ display: "flex", justifyContent: "space-between", color: "#4a5568", fontSize: "11px", fontFamily: "monospace", padding: "3px 0" }}>
                    <span>{d.date}</span>
                    <span style={{ color: "#00e5ff" }}>+${d.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", color: "#718096", fontSize: "11px", fontFamily: "monospace", paddingTop: "6px", borderTop: "1px solid #0f1420", marginTop: "4px" }}>
                  <span>TOTAL DEPOSITED</span>
                  <span>${totalDeposited.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {showKelly && (
          <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #0f1420" }}>
            <div style={S.sectionTitle}>HALF KELLY CALCULATOR</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
              <div><span style={S.label}>ODDS (American)</span><input style={S.input} placeholder="+110" value={kellyOdds} onChange={e => setKellyOdds(e.target.value)} /></div>
              <div><span style={S.label}>EDGE %</span><input style={S.input} placeholder="5.0" value={kellyEdge} onChange={e => setKellyEdge(e.target.value)} /></div>
            </div>
            {kellySuggestion !== null && (
              <div style={{ background: "#060810", border: "1px solid #00e5ff20", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                <div style={{ color: "#4a5568", fontSize: "10px", fontFamily: "monospace", marginBottom: "4px" }}>RECOMMENDED BET SIZE</div>
                <div style={{ color: "#00e5ff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "28px" }}>${kellySuggestion.toFixed(2)}</div>
                <div style={{ color: "#2d3748", fontSize: "10px", fontFamily: "monospace" }}>{((kellySuggestion / bankroll) * 100).toFixed(1)}% of bankroll</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", marginBottom: "14px" }}>
        {[
          { label: "ROI", value: `${roi >= 0 ? "+" : ""}${roi.toFixed(1)}%`, color: roiColor(roi), sub: `${settled.length} bets` },
          { label: "WIN RATE", value: `${winRate.toFixed(1)}%`, color: winRate > 52.4 ? "#00e5ff" : "#718096", sub: `${wins.length}W ${losses.length}L` },
          { label: "NET P&L", value: `${netPnl >= 0 ? "+" : ""}$${Math.abs(netPnl).toFixed(2)}`, color: roiColor(netPnl), sub: `$${totalStaked.toFixed(0)} staked` },
          { label: "AVG CLV", value: avgClv !== null ? `${avgClv >= 0 ? "+" : ""}${avgClv.toFixed(1)}%` : "N/A", color: avgClv > 0 ? "#00e5ff" : "#718096", sub: `${clvBets.length} tracked` },
        ].map(s => (
          <div key={s.label} style={{ ...S.card, padding: "12px", textAlign: "center" }}>
            <div style={S.cardAccent} />
            <div style={{ color: s.color, fontFamily: "'Bebas Neue', sans-serif", fontSize: "24px" }}>{s.value}</div>
            <div style={{ color: "#2d3748", fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em" }}>{s.label}</div>
            <div style={{ color: "#1a2030", fontSize: "10px", fontFamily: "monospace" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Streak + Type breakdown */}
      {settled.length > 0 && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
          <div style={{ ...S.card, flex: 1, padding: "10px", textAlign: "center" }}>
            <div style={S.cardAccent} />
            <div style={{ color: streakType === "win" ? "#00ff87" : "#ff4444", fontFamily: "'Bebas Neue', sans-serif", fontSize: "20px" }}>{streak} {streakType === "win" ? "W" : "L"}</div>
            <div style={{ color: "#2d3748", fontSize: "10px", fontFamily: "monospace" }}>CURRENT STREAK</div>
          </div>
          <div style={{ ...S.card, flex: 1, padding: "10px", textAlign: "center" }}>
            <div style={S.cardAccent} />
            <div style={{ color: "#718096", fontFamily: "'Bebas Neue', sans-serif", fontSize: "20px" }}>{straights.length}/{parlays.length}</div>
            <div style={{ color: "#2d3748", fontSize: "10px", fontFamily: "monospace" }}>STRAIGHT/PARLAY</div>
          </div>
        </div>
      )}

      {/* Log bet header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div style={S.sectionTitle}>BET LOG</div>
        <button style={S.btn()} onClick={() => setShowForm(!showForm)}>+ LOG BET</button>
      </div>

      {/* Bet form */}
      {showForm && (
        <div style={{ ...S.card, marginBottom: "14px" }}>
          <div style={S.cardAccent} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
            <div style={{ gridColumn: "1 / -1" }}><span style={S.label}>SELECTION</span><input style={S.input} placeholder="e.g. Luis Gil o4.5 Ks" value={form.selection} onChange={e => setForm({ ...form, selection: e.target.value })} /></div>
            <div>
              <span style={S.label}>SPORT</span>
              <select style={S.input} value={form.sport} onChange={e => setForm({ ...form, sport: e.target.value })}>
                <option>MLB</option><option>NFL</option><option>PGA</option>
              </select>
            </div>
            <div>
              <span style={S.label}>BET TYPE</span>
              <select style={S.input} value={form.betType} onChange={e => setForm({ ...form, betType: e.target.value })}>
                <option value="straight">Straight</option>
                <option value="parlay">Parlay</option>
                <option value="sgp">SGP</option>
                <option value="nrfi">NRFI</option>
                <option value="f5">First 5</option>
              </select>
            </div>
            <div><span style={S.label}>ODDS</span><input style={S.input} placeholder="+131" value={form.odds} onChange={e => setForm({ ...form, odds: e.target.value })} /></div>
            <div><span style={S.label}>EDGE % (from app)</span><input style={S.input} placeholder="5.2" value={form.edge} onChange={e => setForm({ ...form, edge: e.target.value })} /></div>
            <div>
              <span style={S.label}>STAKE ($){formKelly ? ` — Kelly: $${formKelly.toFixed(2)}` : ""}</span>
              <input style={{ ...S.input, border: formKelly ? "1px solid #00e5ff30" : "1px solid #131826" }} placeholder={formKelly ? `Suggested: $${formKelly.toFixed(2)}` : "10.00"} value={form.stake} onChange={e => setForm({ ...form, stake: e.target.value })} />
            </div>
            <div><span style={S.label}>CLOSING ODDS (CLV)</span><input style={S.input} placeholder="-115 (optional)" value={form.closeOdds} onChange={e => setForm({ ...form, closeOdds: e.target.value })} /></div>
            <div>
              <span style={S.label}>RESULT</span>
              <select style={S.input} value={form.result} onChange={e => setForm({ ...form, result: e.target.value })}>
                <option value="pending">Pending</option>
                <option value="win">Win</option>
                <option value="loss">Loss</option>
                <option value="push">Push</option>
              </select>
            </div>
          </div>
          <button style={S.btn()} onClick={addBet}>SAVE BET</button>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "12px" }}>
        {["all", "straight", "parlay", "pending"].map(f => (
          <button key={f} style={S.mktTab(activeFilter === f)} onClick={() => setActiveFilter(f)}>{f.toUpperCase()}</button>
        ))}
      </div>

      {filteredBets.length === 0 ? (
        <div style={{ color: "#2d3748", fontSize: "12px", fontFamily: "monospace", textAlign: "center", padding: "30px" }}>No bets logged yet</div>
      ) : (
        filteredBets.map(bet => {
          const win = bet.result === "win";
          const loss = bet.result === "loss";
          const pnl = win ? bet.stake * (americanToDecimal(bet.odds) - 1) : loss ? -bet.stake : 0;
          const betClv = bet.closeOdds ? clv(bet.odds, bet.closeOdds) : null;
          const kellyDeviation = bet.kellySuggested && bet.stake ? ((bet.stake - bet.kellySuggested) / bet.kellySuggested * 100) : null;
          return (
            <div key={bet.id} style={{ ...S.gameRow, marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", flexWrap: "wrap" }}>
                    <span style={{ color: "#e2e8f0", fontSize: "13px", fontWeight: 500 }}>{bet.selection}</span>
                    <span style={S.tag("#131826", "#4a5568")}>{bet.sport}</span>
                    <span style={S.tag("#0a0d16", "#2d3748")}>{bet.betType?.toUpperCase()}</span>
                    {bet.result !== "pending" && (
                      <span style={S.tag(win ? "#00ff8720" : loss ? "#ff444420" : "#131826", win ? "#00ff87" : loss ? "#ff4444" : "#718096")}>
                        {bet.result.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <span style={{ color: "#2d3748", fontSize: "10px", fontFamily: "monospace" }}>{bet.date}</span>
                    <span style={{ color: "#2d3748", fontSize: "10px", fontFamily: "monospace" }}>Odds <span style={{ color: "#718096" }}>{formatAmerican(bet.odds)}</span></span>
                    <span style={{ color: "#2d3748", fontSize: "10px", fontFamily: "monospace" }}>Stake <span style={{ color: "#718096" }}>${bet.stake}</span></span>
                    {bet.edge && <span style={{ color: "#2d3748", fontSize: "10px", fontFamily: "monospace" }}>Edge <span style={{ color: "#00e5ff" }}>+{bet.edge}%</span></span>}
                    {betClv !== null && <span style={{ color: "#2d3748", fontSize: "10px", fontFamily: "monospace" }}>CLV <span style={{ color: betClv > 0 ? "#00e5ff" : "#ff4444" }}>{betClv > 0 ? "+" : ""}{betClv.toFixed(1)}%</span></span>}
                    {kellyDeviation !== null && Math.abs(kellyDeviation) > 20 && <span style={{ color: "#ffe600", fontSize: "10px", fontFamily: "monospace" }}>⚠ {kellyDeviation > 0 ? "Over" : "Under"} Kelly</span>}
                  </div>
                </div>
                <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                  {bet.result !== "pending" ? (
                    <div style={{ color: pnl > 0 ? "#00ff87" : pnl < 0 ? "#ff4444" : "#718096", fontFamily: "'Bebas Neue', sans-serif", fontSize: "18px" }}>
                      {pnl > 0 ? "+" : ""}${pnl.toFixed(2)}
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button style={{ ...S.btn("secondary"), padding: "4px 8px", fontSize: "11px" }} onClick={() => updateResult(bet.id, "win")}>W</button>
                      <button style={{ ...S.btn("secondary"), padding: "4px 8px", fontSize: "11px" }} onClick={() => updateResult(bet.id, "loss")}>L</button>
                    </div>
                  )}
                  <button onClick={() => deleteBet(bet.id)} style={{ background: "transparent", border: "none", color: "#2d3748", cursor: "pointer", fontSize: "12px" }}>✕</button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Chat Tab ─────────────────────────────────────────────────────────────────

function ChatTab({ games, sport, market }) {
  const [messages, setMessages] = useState([{
    role: "assistant",
    content: "I'm your sharp betting analyst. Ask me about any pick you're considering, request analysis on the current slate, or ask me to build a parlay. I'll give you honest analysis — if a bet doesn't have value, I'll tell you."
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const slateContext = games.slice(0, 8).map(g => {
      const dk = g.bookmakers?.find(b => b.key === "draftkings");
      const outcomes = dk?.markets?.find(m => m.key === market)?.outcomes || [];
      return `${g.away_team || ""} @ ${g.home_team}: ${outcomes.map(o => `${o.name} ${formatAmerican(o.price)}`).join(", ")}`;
    }).join("\n");

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are a sharp, brutally honest sports betting analyst. You work with real odds data to identify genuine value bets. 

CRITICAL RULES:
- NEVER validate a bad bet just because the user likes it
- Always lead with the math — implied probability vs fair odds
- If a bet has no edge, say so clearly and directly upfront
- If there's no good play on the slate, say so
- Be concise and direct — no fluff
- When a bet IS good value, be enthusiastic and specific about why
- Focus on: edge%, closing line value, correlated parlay opportunities

Current slate (${sport}, ${market}):
${slateContext || "No slate data loaded — answer based on general principles"}`,
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.content?.[0]?.text || "Error getting response." }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Connection error. Please try again." }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "60vh" }}>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", paddingBottom: "8px" }}>
        {messages.map((m, i) => (
          <div key={i} style={S.chatBubble(m.role)}>{m.content}</div>
        ))}
        {loading && <div style={{ ...S.chatBubble("assistant"), color: "#2d3748" }}>Analyzing...</div>}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", gap: "8px", paddingTop: "12px", borderTop: "1px solid #0f1420" }}>
        <input
          style={{ ...S.input, flex: 1 }}
          placeholder="Ask about a pick, request parlay ideas..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") send(); }}
        />
        <button style={S.btn()} onClick={send} disabled={loading}>SEND</button>
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

  const fetchOdds = useCallback(async (key = apiKey, s = sport, m = market) => {
    if (!key) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`https://api.the-odds-api.com/v4/sports/${s}/odds/?apiKey=${key}&regions=us&markets=${m}&oddsFormat=american&bookmakers=draftkings,fanduel`);
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "API error"); }
      setRemaining(res.headers.get("x-requests-remaining"));
      const data = await res.json();
      setGames(Array.isArray(data) ? data : []);
    } catch (e) { setError(e.message); setGames([]); }
    setLoading(false);
  }, [apiKey, sport, market]);

  useEffect(() => { if (apiKey) fetchOdds(apiKey, sport, market); }, [sport, market]);

  const connectKey = (k) => {
    localStorage.setItem("sharpline_key", k);
    setApiKey(k);
    fetchOdds(k, sport, market);
  };

  const handleSportChange = (s) => {
    setSport(s);
    const defaultMarket = s.includes("golf") ? "outrights" : "h2h";
    setMarket(defaultMarket);
  };

  if (!apiKey) {
    return (
      <div style={S.app}>
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ width: "100%", maxWidth: "420px" }}>
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "8px" }}>
                <div style={S.dot} />
                <span style={{ ...S.logo, fontSize: "36px" }}>SHARP<span style={S.logoAccent}>LINE</span></span>
              </div>
              <div style={{ color: "#4a5568", fontSize: "13px" }}>Your sharp betting analyst</div>
            </div>
            <div style={S.card}>
              <div style={S.cardAccent} />
              <div style={{ marginBottom: "16px" }}>
                <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "18px", letterSpacing: "0.08em", marginBottom: "6px" }}>CONNECT THE ODDS API</div>
                <div style={{ color: "#4a5568", fontSize: "12px", lineHeight: 1.6 }}>
                  Get a free key at{" "}
                  <a href="https://the-odds-api.com" target="_blank" rel="noopener noreferrer" style={{ color: "#00e5ff" }}>the-odds-api.com</a>
                  {" "}— 500 requests/month free. Your key is saved locally.
                </div>
              </div>
              <input style={{ ...S.input, marginBottom: "10px" }} type="text" placeholder="Paste your API key..." value={keyInput} onChange={e => setKeyInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && keyInput.trim()) connectKey(keyInput.trim()); }} />
              <button style={{ ...S.btn(), width: "100%" }} onClick={() => { if (keyInput.trim()) connectKey(keyInput.trim()); }}>
                CONNECT & LAUNCH
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.app}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      <div style={S.header}>
        <div style={S.headerInner}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={S.dot} />
            <span style={S.logo}>SHARP<span style={S.logoAccent}>LINE</span></span>
          </div>
          <div style={{ display: "flex", align: "center", gap: "12px" }}>
            {remaining && <span style={{ color: "#1a2740", fontSize: "10px", fontFamily: "monospace" }}>{remaining} API calls</span>}
            <button style={{ ...S.btn("ghost"), fontSize: "10px", padding: "4px 8px" }} onClick={() => { localStorage.removeItem("sharpline_key"); setApiKey(""); }}>
              KEY
            </button>
          </div>
        </div>
      </div>

      <div style={S.main}>
        {/* Sport selector */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap" }}>
          {SPORTS.map(s => (
            <button key={s.key} style={S.sportTab(sport === s.key)} onClick={() => handleSportChange(s.key)}>
              {s.icon} {s.label}
              {!s.season && s.key.includes("football") && <span style={{ color: "#2d3748", fontSize: "10px", marginLeft: "4px" }}>OFF</span>}
            </button>
          ))}
        </div>

        {/* Tab bar */}
        <div style={S.tabBar}>
          {TABS.map(t => (
            <button key={t} style={S.tab(tab === t)} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "SLATE" && <SlateTab games={games} sport={sport} market={market} setMarket={setMarket} loading={loading} error={error} onRefresh={() => fetchOdds()} remaining={remaining} />}
        {tab === "PROPS" && <PropsTab apiKey={apiKey} sport={sport} />}
        {tab === "PARLAYS" && <ParlaysTab games={games} sport={sport} apiKey={apiKey} />}
        {tab === "TRACKER" && <TrackerTab />}
        {tab === "CHAT" && <ChatTab games={games} sport={sport} market={market} />}
      </div>
    </div>
  );
}
