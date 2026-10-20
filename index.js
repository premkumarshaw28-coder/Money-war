
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../client")));

const STARTING_CAPITAL = 1000000;
const assets = [
  ["govt-bonds","Government Bonds"],
  ["corp-bonds","Corporate Bonds"],
  ["fd","Fixed Deposit"],
  ["large-cap","Large-Cap Stocks"],
  ["small-cap","Small-Cap Stocks"],
  ["technology","Technology"],
  ["healthcare","Healthcare"],
  ["infrastructure","Infrastructure"],
  ["gold","Gold"],
  ["reits","REITs"],
  ["green-energy","Green Energy"],
  ["cash","Cash"]
];

const defaultImpacts = {
  "govt-bonds": 3, "corp-bonds": 1, "fd": 1, "large-cap": -3,
  "small-cap": -6, "technology": -5, "healthcare": -2,
  "infrastructure": -4, "gold": 4, "reits": -3,
  "green-energy": -5, "cash": 1
};

function makeTeams() {
  return Array.from({length: 12}, (_, i) => ({
    id: `T${String(i+1).padStart(2,"0")}`,
    name: `Team ${String(i+1).padStart(2,"0")}`,
    joined: false,
    locked: false,
    portfolio: Object.fromEntries(assets.map(([id]) => [id, 0])),
    aiReasoning: "",
    aiScore: 0,
    finalValue: null,
    returnPct: null,
    performancePoints: 0,
    totalScore: 0
  }));
}

const state = {
  competitionName: "AI MONEY WAR",
  phase: "setup",
  startedAt: null,
  endsAt: null,
  durationSeconds: 420,
  eventName: "Interest Rate Shock",
  eventDescription: "Rates rise and risk assets react. Build a resilient portfolio.",
  impacts: {...defaultImpacts},
  teams: makeTeams(),
  resultsPublished: false
};

function publicState() {
  return {
    competitionName: state.competitionName,
    phase: state.phase,
    startedAt: state.startedAt,
    endsAt: state.endsAt,
    durationSeconds: state.durationSeconds,
    eventName: state.eventName,
    eventDescription: state.eventDescription,
    impacts: state.impacts,
    assets,
    teams: state.teams.map(t => ({
      id:t.id,name:t.name,joined:t.joined,locked:t.locked,
      finalValue:t.finalValue,returnPct:t.returnPct,
      performancePoints:t.performancePoints,totalScore:t.totalScore,
      hasReasoning: !!t.aiReasoning
    }))
  };
}

function calculateResults() {
  for (const t of state.teams) {
    if (!t.locked) {
      t.finalValue = null; t.returnPct = null; t.performancePoints = 0; t.totalScore = t.aiScore || 0;
      continue;
    }
    let value = 0;
    for (const [id, amount] of Object.entries(t.portfolio)) {
      value += Number(amount || 0) * (1 + Number(state.impacts[id] || 0)/100);
    }
    t.finalValue = Math.round(value);
    t.returnPct = Number(((value/STARTING_CAPITAL - 1)*100).toFixed(2));
  }
  const ranked = [...state.teams]
    .filter(t => t.finalValue !== null)
    .sort((a,b) => b.finalValue - a.finalValue);
  const points = [90,82,75,69,63,58,53,48,43,38,33,28];
  ranked.forEach((t,i) => {
    t.performancePoints = points[i] ?? 20;
    t.totalScore = t.performancePoints + Number(t.aiScore || 0);
  });
}

function emitState() { io.emit("state", publicState()); }

io.on("connection", socket => {
  socket.emit("state", publicState());

  socket.on("joinTeam", ({teamId}) => {
    const t = state.teams.find(x => x.id === teamId);
    if (!t) return socket.emit("errorMessage","Invalid team code.");
    t.joined = true;
    socket.data.teamId = teamId;
    socket.join(teamId);
    emitState();
  });

  socket.on("savePortfolio", ({teamId, portfolio, aiReasoning}) => {
    const t = state.teams.find(x => x.id === teamId);
    if (!t || t.locked || state.phase !== "investment") return;
    const clean = {};
    let total = 0;
    for (const [id] of assets) {
      const n = Math.max(0, Math.round(Number(portfolio?.[id] || 0)));
      clean[id] = n;
      total += n;
    }
    if (total !== STARTING_CAPITAL) return socket.emit("errorMessage", "Portfolio must total exactly ₹10,00,000.");
    t.portfolio = clean;
    t.aiReasoning = String(aiReasoning || "").slice(0,4000);
    emitState();
  });

  socket.on("lockPortfolio", ({teamId, portfolio, aiReasoning}) => {
    const t = state.teams.find(x => x.id === teamId);
    if (!t || t.locked || state.phase !== "investment") return;
    const clean = {};
    let total = 0;
    for (const [id] of assets) {
      const n = Math.max(0, Math.round(Number(portfolio?.[id] || 0)));
      clean[id] = n; total += n;
    }
    if (total !== STARTING_CAPITAL) return socket.emit("errorMessage","Portfolio must total exactly ₹10,00,000.");
    t.portfolio = clean;
    t.aiReasoning = String(aiReasoning || "").slice(0,4000);
    t.locked = true;
    emitState();
  });

  socket.on("adminStart", ({durationSeconds=420}) => {
    state.phase = "investment";
    state.startedAt = Date.now();
    state.durationSeconds = Number(durationSeconds) || 420;
    state.endsAt = state.startedAt + state.durationSeconds*1000;
    state.resultsPublished = false;
    emitState();
  });

  socket.on("adminRevealShock", ({eventName,eventDescription,impacts}) => {
    if (eventName) state.eventName = String(eventName).slice(0,120);
    if (eventDescription) state.eventDescription = String(eventDescription).slice(0,300);
    for (const [id] of assets) {
      const v = Number(impacts?.[id]);
      if (Number.isFinite(v)) state.impacts[id] = Math.max(-100, Math.min(100, v));
    }
    state.phase = "results";
    calculateResults();
    state.resultsPublished = true;
    emitState();
  });

  socket.on("adminSetAIScore", ({teamId, score}) => {
    const t = state.teams.find(x => x.id === teamId);
    if (!t) return;
    t.aiScore = Math.max(0, Math.min(10, Number(score) || 0));
    if (state.resultsPublished) calculateResults();
    emitState();
  });

  socket.on("adminReset", () => {
    state.phase = "setup"; state.startedAt=null; state.endsAt=null;
    state.eventName="Interest Rate Shock";
    state.eventDescription="Rates rise and risk assets react. Build a resilient portfolio.";
    state.impacts={...defaultImpacts};
    state.teams=makeTeams(); state.resultsPublished=false;
    emitState();
  });
});

app.get("/api/health", (_,res)=>res.json({ok:true, service:"AI MONEY WAR"}));
app.get("*", (_,res)=>res.sendFile(path.join(__dirname,"../client/index.html")));

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", ()=>console.log(`AI MONEY WAR running on port ${PORT}`));
