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
cons
