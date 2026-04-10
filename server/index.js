const { WebSocketServer } = require("ws");
const http = require("http");
const PORT = process.env.PORT || 3001;
const MOVES_META = {
  rock: { limited: false }, paper: { limited: false }, scissors: { limited: false },
  kindergartner: { limited: true }, net: { limited: true }, hammer: { limited: true },
  nuke: { limited: true }, politician: { limited: false },
};
const WINS = {
  rock: ["scissors", "kindergartner", "politician"],
  paper: ["rock", "hammer", "politician"],
  scissors: ["paper", "net", "politician"],
  kindergartner: ["paper", "scissors", "hammer", "nuke", "politician"],
  net: ["rock", "paper", "kindergartner", "nuke", "politician"],
  hammer: ["rock", "scissors", "net", "nuke", "politician"],
  nuke: ["rock", "paper", "scissors", "kindergartner", "net"],
  politician: ["nuke"],
};
function resolve(a, b) {
  if (a === b) return "draw";
  if (WINS[a]?.includes(b)) return "a";
  if (WINS[b]?.includes(a)) return "b";
  return "draw";
}
function randomMove(used) {
  const avail = Object.keys(MOVES_META).filter((m) => !MOVES_META[m].limited || !used.includes(m));
  return avail[Math.floor(Math.random() * avail.length)];
}
const rooms = new Map();
function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do { code = ""; for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]; } while (rooms.has(code));
  return code;
}
function newRoom(code) {
  return { code, players: {}, names: {}, state: "waiting", p1Score: 0, p2Score: 0, round: 0, p1Used: [], p2Used: [], multiplier: 1, moves: {}, history: [], timer: null, timerStart: null };
}
function broadcast(room, msg) { const data = JSON.stringify(msg); Object.values(room.players).forEach((ws) => { if (ws && ws.readyState === 1) ws.send(data); }); }
function sendTo(ws, msg) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); }
function getPublicState(room, forPlayer) {
  const opponent = forPlayer === "p1" ? "p2" : "p1";
  return { code: room.code, state: room.state, you: forPlayer, yourName: room.names[forPlayer] || forPlayer, opponentName: room.names[opponent] || opponent, p1Score: room.p1Score, p2Score: room.p2Score, round: room.round, yourUsed: room[forPlayer + "Used"], opponentUsed: room[opponent + "Used"], multiplier: room.multiplier, history: room.history, yourMove: room.moves[forPlayer] || null, opponentReady: !!room.moves[opponent], timerStart: room.timerStart };
}
function startPickPhase(room) {
  room.state = "picking"; room.moves = {};
  const TIMER_SECONDS = 15; room.timerStart = Date.now();
  broadcast(room, { type: "pick_phase", timerSeconds: TIMER_SECONDS });
  Object.entries(room.players).forEach(([pid, ws]) => { sendTo(ws, { type: "state", ...getPublicState(room, pid) }); });
  room.timer = setTimeout(() => { ["p1", "p2"].forEach((pid) => { if (!room.moves[pid]) { room.moves[pid] = randomMove(room[pid + "Used"]); sendTo(room.players[pid], { type: "auto_picked", move: room.moves[pid] }); } }); resolveRound(room); }, TIMER_SECONDS * 1000);
}
function resolveRound(room) {
  if (room.timer) { clearTimeout(room.timer); room.timer = null; }
  const mA = room.moves.p1; const mB = room.moves.p2;
  const isNukeVsNuke = mA === "nuke" && mB === "nuke";
  const result = resolve(mA, mB);
  if (MOVES_META[mA].limited) room.p1Used.push(mA);
  if (MOVES_META[mB].limited) room.p2Used.push(mB);
  const polNuke = (mA === "politician" && mB === "nuke") || (mB === "politician" && mA === "nuke");
  let pts = 0;
  if (isNukeVsNuke) { room.multiplier += 1; }
  else if (result === "a") { pts = room.multiplier * (polNuke ? 2 : 1); room.p1Score += pts; room.multiplier = 1; }
  else if (result === "b") { pts = room.multiplier * (polNuke ? 2 : 1); room.p2Score += pts; room.multiplier = 1; }
  room.round += 1;
  const roundData = { round: room.round, p1Move: mA, p2Move: mB, result, isNukeVsNuke, points: pts, multiplier: room.multiplier };
  room.history.push(roundData);
  const gameOver = room.p1Score >= 5 || room.p2Score >= 5;
  room.state = gameOver ? "finished" : "reveal";
  Object.entries(room.players).forEach(([pid, ws]) => { sendTo(ws, { type: "round_result", ...roundData, ...getPublicState(room, pid), gameOver }); });
  if (!gameOver) { setTimeout(() => { if (rooms.has(room.code) && room.state === "reveal") startPickPhase(room); }, 4000); }
}
function cleanupRoom(code) { const room = rooms.get(code); if (room) { if (room.timer) clearTimeout(room.timer); rooms.delete(code); } }
const server = http.createServer((req, res) => { res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }); res.end(JSON.stringify({ status: "ok", rooms: rooms.size })); });
const wss = new WebSocketServer({ server });
wss.on("connection", (ws) => {
  let myRoom = null; let myPlayer = null;
  ws.on("message", (raw) => {
    let msg; try { msg = JSON.parse(raw); } catch { return; }
    switch (msg.type) {
      case "create_room": { const code = generateCode(); const room = newRoom(code); room.players.p1 = ws; room.names.p1 = msg.name || "Player 1"; rooms.set(code, room); myRoom = code; myPlayer = "p1"; sendTo(ws, { type: "room_created", code, player: "p1" }); sendTo(ws, { type: "state", ...getPublicState(room, "p1") }); break; }
      case "join_room": { const code = (msg.code || "").toUpperCase(); const room = rooms.get(code); if (!room) { sendTo(ws, { type: "error", message: "Room not found" }); return; } if (room.players.p2) { sendTo(ws, { type: "error", message: "Room is full" }); return; } room.players.p2 = ws; room.names.p2 = msg.name || "Player 2"; myRoom = code; myPlayer = "p2"; sendTo(ws, { type: "room_joined", code, player: "p2" }); sendTo(room.players.p1, { type: "opponent_joined", opponentName: room.names.p2 }); setTimeout(() => { if (rooms.has(code)) startPickPhase(room); }, 1500); break; }
      case "pick_move": { if (!myRoom || !myPlayer) return; const room = rooms.get(myRoom); if (!room || room.state !== "picking") return; if (room.moves[myPlayer]) return; const move = msg.move; if (!MOVES_META[move]) return; if (MOVES_META[move].limited && room[myPlayer + "Used"].includes(move)) return; room.moves[myPlayer] = move; sendTo(ws, { type: "move_confirmed", move }); const oppo = myPlayer === "p1" ? "p2" : "p1"; sendTo(room.players[oppo], { type: "opponent_ready" }); if (room.moves.p1 && room.moves.p2) resolveRound(room); break; }
      case "rematch": { if (!myRoom || !myPlayer) return; const room = rooms.get(myRoom); if (!room || room.state !== "finished") return; room.p1Score = 0; room.p2Score = 0; room.round = 0; room.p1Used = []; room.p2Used = []; room.multiplier = 1; room.moves = {}; room.history = []; broadcast(room, { type: "rematch_start" }); setTimeout(() => { if (rooms.has(room.code)) startPickPhase(room); }, 1000); break; }
      default: break;
    }
  });
  ws.on("close", () => { if (myRoom) { const room = rooms.get(myRoom); if (room) { const oppo = myPlayer === "p1" ? "p2" : "p1"; sendTo(room.players[oppo], { type: "opponent_disconnected" }); cleanupRoom(myRoom); } } });
});
server.listen(PORT, () => { console.log("RPS Deluxe server running on port " + PORT); });
