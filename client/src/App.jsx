import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════ GAME CONSTANTS ═══════════════════════ */
const MOVES = {
  rock: { emoji: "🪨", label: "Rock", limited: false },
  paper: { emoji: "📄", label: "Paper", limited: false },
  scissors: { emoji: "✂️", label: "Scissors", limited: false },
  kindergartner: { emoji: "👶", label: "Kid", limited: true },
  net: { emoji: "🥅", label: "Net", limited: true },
  hammer: { emoji: "🔨", label: "Hammer", limited: true },
  nuke: { emoji: "☢️", label: "Nuke", limited: true },
  politician: { emoji: "🤵", label: "Politician", limited: false },
};
const UNLIMITED = Object.entries(MOVES).filter(([, v]) => !v.limited);
const LIMITED = Object.entries(MOVES).filter(([, v]) => v.limited);
const WINS_NEEDED = 5;

function resolve(a, b) {
  if (a === b) return "draw";
  const w = {
    rock: ["scissors", "kindergartner", "politician"],
    paper: ["rock", "hammer", "politician"],
    scissors: ["paper", "net", "politician"],
    kindergartner: ["paper", "scissors", "hammer", "nuke", "politician"],
    net: ["rock", "paper", "kindergartner", "nuke", "politician"],
    hammer: ["rock", "scissors", "net", "nuke", "politician"],
    nuke: ["rock", "paper", "scissors", "kindergartner", "net"],
    politician: ["nuke"],
  };
  if (w[a]?.includes(b)) return "a";
  if (w[b]?.includes(a)) return "b";
  return "draw";
}

/* ═══════════════════════ AI ═══════════════════════ */
function easyAI(used) {
  const a = Object.keys(MOVES).filter((m) => !MOVES[m].limited || !used.includes(m));
  return a[Math.floor(Math.random() * a.length)];
}
function hardAI(used, oppUsed, rnd) {
  const a = Object.keys(MOVES).filter((m) => !MOVES[m].limited || !used.includes(m));
  const w = {}; a.forEach((m) => (w[m] = 1));
  if (!oppUsed.includes("nuke")) { if (w.hammer !== undefined) w.hammer += 3; if (w.politician !== undefined) w.politician *= 0.1; }
  if (oppUsed.includes("nuke") && w.politician !== undefined) w.politician += 2;
  if (rnd < 6) ["kindergartner","net","hammer","nuke"].forEach((m) => { if (w[m] !== undefined) w[m] += 2; });
  if (w.paper !== undefined) w.paper += 1; if (w.net !== undefined) w.net += 1.5; if (w.rock !== undefined) w.rock += 0.8;
  if (rnd >= 6) ["rock","paper","scissors"].forEach((m) => { if (w[m] !== undefined) w[m] += 1; });
  if (rnd < 3 && w.nuke !== undefined) w.nuke *= 0.3;
  const t = Object.values(w).reduce((s, v) => s + v, 0);
  let r = Math.random() * t;
  for (const [m, v] of Object.entries(w)) { r -= v; if (r <= 0) return m; }
  return a[0];
}

/* ═══════════════════════ MESSAGES ═══════════════════════ */
const MSGS = {
  p1: ["Crushed it!", "Boom!", "Devastating!", "Unstoppable!", "Masterful!"],
  p2: ["Strikes back!", "Countered!", "Outplayed!", "Nice read!", "Big play!"],
  draw: ["Stalemate!", "Mirror match!", "Deadlock!", "Great minds!", "Evenly matched!"],
  nuke_draw: ["MUTUAL DESTRUCTION!", "Both nukes cancel out!", "Nuclear standoff!", "Armageddon averted!"],
};
function pickMsg(t) { const a = MSGS[t] || MSGS.draw; return a[Math.floor(Math.random() * a.length)]; }

/* ═══════════════════════ SERVER URL ═══════════════════════ */
// ⚠️ CHANGE THIS to your deployed server URL (wss:// for production)
const WS_URL = typeof window !== "undefined" && window.location.hostname === "localhost"
  ? "ws://localhost:3001"
  : "wss://rps-deluxe-production-2e2e.up.railway.app";

/* ═══════════════════════ HUGE CSS ═══════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=Space+Mono:wght@700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0c0a1a;--bg2:#1a1035;--surface:rgba(255,255,255,0.04);--border:rgba(255,255,255,0.08);--text:#e2e8f0;--muted:#64748b;--accent:#a78bfa;--cyan:#22d3ee;--orange:#f97316;--green:#10b981;--red:#ef4444;--pink:#f472b6;--blue:#3b82f6}
body{background:var(--bg);color:var(--text);font-family:'Outfit',sans-serif}
.app{min-height:100vh;background:linear-gradient(145deg,var(--bg) 0%,var(--bg2) 40%,#0f172a 100%);display:flex;justify-content:center;padding:16px;overflow-x:hidden}
.inner{max-width:540px;width:100%}

@keyframes fadeInUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes scaleIn{from{opacity:0;transform:scale(0.7)}to{opacity:1;transform:scale(1)}}
@keyframes bounceIn{0%{opacity:0;transform:scale(0.3)}50%{transform:scale(1.08)}70%{transform:scale(0.95)}100%{opacity:1;transform:scale(1)}}
@keyframes slideInLeft{from{opacity:0;transform:translateX(-60px) rotate(-8deg)}to{opacity:1;transform:translateX(0) rotate(0)}}
@keyframes slideInRight{from{opacity:0;transform:translateX(60px) rotate(8deg)}to{opacity:1;transform:translateX(0) rotate(0)}}
@keyframes countPop{0%{transform:scale(0.3);opacity:0}40%{transform:scale(1.3);opacity:1}100%{transform:scale(1);opacity:1}}
@keyframes nukeFlash{0%{background:rgba(255,100,0,0)}15%{background:rgba(255,100,0,0.4)}50%{background:rgba(255,60,0,0.2)}100%{background:rgba(255,100,0,0)}}
@keyframes doubleStakesPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05);opacity:0.85}}
@keyframes floatUp{0%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-80px) scale(1.6)}}
@keyframes victoryBounce{0%,100%{transform:translateY(0)}30%{transform:translateY(-20px)}50%{transform:translateY(-10px)}70%{transform:translateY(-15px)}}
@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
@keyframes timerPulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0)}50%{box-shadow:0 0 0 8px rgba(239,68,68,0.2)}}
@keyframes spin{to{transform:rotate(360deg)}}

/* Menu */
.menu{padding-top:24px;padding-bottom:40px;display:flex;flex-direction:column;gap:22px}
.logo-emojis{font-size:42px;letter-spacing:14px;text-align:center;animation:bounceIn 0.8s ease both}
.logo-title{font-family:'Space Mono',monospace;font-size:42px;font-weight:700;text-align:center;letter-spacing:5px;background:linear-gradient(90deg,var(--cyan),var(--accent),var(--pink));background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:shimmer 3s linear infinite,fadeInUp 0.6s ease 0.2s both}
.logo-sub{text-align:center;font-size:11px;color:var(--muted);letter-spacing:3px;text-transform:uppercase;margin-top:4px;animation:fadeIn 0.6s ease 0.4s both}
.sec-title{font-size:10px;font-weight:700;letter-spacing:3px;color:var(--muted);text-transform:uppercase;text-align:center;margin-bottom:6px;animation:fadeIn 0.4s ease both}
.menu-cards{display:flex;gap:10px}
.menu-card{flex:1;border:none;border-radius:16px;padding:20px 10px;cursor:pointer;text-align:center;font-family:inherit;transition:transform 0.25s cubic-bezier(.34,1.56,.64,1),box-shadow 0.25s;animation:fadeInUp 0.5s ease both}
.menu-card:hover{transform:translateY(-5px) scale(1.03)}
.menu-card:active{transform:translateY(-1px) scale(0.97)}
.c-easy{background:linear-gradient(135deg,#064e3b,#065f46);box-shadow:0 4px 20px rgba(16,185,129,0.15);animation-delay:0.5s}
.c-hard{background:linear-gradient(135deg,#7f1d1d,#991b1b);box-shadow:0 4px 20px rgba(239,68,68,0.15);animation-delay:0.6s}
.c-local{background:linear-gradient(135deg,#1e3a5f,#1e40af);box-shadow:0 4px 20px rgba(59,130,246,0.15);animation-delay:0.5s}
.c-online{background:linear-gradient(135deg,#581c87,#7e22ce);box-shadow:0 4px 20px rgba(168,85,247,0.15);animation-delay:0.6s}
.c-emoji{font-size:30px;margin-bottom:4px}
.c-ttl{font-size:16px;font-weight:800;color:#f1f5f9;letter-spacing:1px}
.c-desc{font-size:9px;color:#94a3b8;margin-top:3px;line-height:1.4}

/* How to play */
.htp{background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;animation:fadeInUp 0.5s ease 0.7s both}
.htp-header{padding:14px 16px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;user-select:none}
.htp-header:hover{background:rgba(255,255,255,0.02)}
.htp-title{font-size:14px;font-weight:800;color:var(--accent);letter-spacing:1px}
.htp-arrow{font-size:18px;color:var(--muted);transition:transform 0.3s}
.htp-arrow.open{transform:rotate(180deg)}
.htp-body{padding:0 16px 16px;display:flex;flex-direction:column;gap:16px;animation:fadeIn 0.3s ease both}
.htp-section{display:flex;flex-direction:column;gap:6px}
.htp-sub{font-size:11px;font-weight:700;letter-spacing:2px;color:var(--cyan);text-transform:uppercase}
.htp-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 12px}
.htp-item{display:flex;align-items:center;gap:7px}
.htp-emoji{font-size:20px;flex-shrink:0;width:28px;text-align:center}
.htp-text{font-size:10px;color:#cbd5e1;line-height:1.35}
.htp-text b{color:var(--text);font-weight:700}
.htp-note{font-size:10px;color:var(--muted);line-height:1.4;padding:8px 10px;background:rgba(255,255,255,0.03);border-radius:8px;border-left:3px solid var(--accent)}

/* Online lobby */
.lobby{display:flex;flex-direction:column;align-items:center;gap:18px;padding:40px 16px;animation:fadeInUp 0.5s ease both}
.lobby-title{font-family:'Space Mono',monospace;font-size:28px;font-weight:700;color:var(--accent);letter-spacing:2px}
.lobby-sub{font-size:13px;color:var(--muted);text-align:center}
.lobby-code-box{background:var(--surface);border:2px dashed var(--accent);border-radius:16px;padding:24px 40px;text-align:center}
.lobby-code{font-family:'Space Mono',monospace;font-size:48px;font-weight:700;letter-spacing:12px;color:var(--cyan)}
.lobby-code-label{font-size:10px;color:var(--muted);margin-top:4px;letter-spacing:2px;text-transform:uppercase}
.lobby-input{background:rgba(255,255,255,0.06);border:1px solid var(--border);border-radius:12px;padding:12px 16px;font-size:16px;color:var(--text);font-family:inherit;text-align:center;width:100%;max-width:280px;outline:none;transition:border-color 0.2s}
.lobby-input:focus{border-color:var(--accent)}
.lobby-input::placeholder{color:#475569}
.lobby-btn{padding:12px 36px;border-radius:12px;border:none;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer;color:#fff;transition:transform 0.2s cubic-bezier(.34,1.56,.64,1)}
.lobby-btn:hover{transform:scale(1.05)}
.lobby-btn:active{transform:scale(0.97)}
.lobby-btn.primary{background:linear-gradient(135deg,var(--accent),var(--pink))}
.lobby-btn.green{background:linear-gradient(135deg,var(--green),var(--cyan))}
.lobby-btn.back{background:rgba(255,255,255,0.06);color:var(--muted);font-size:13px;padding:8px 20px}
.lobby-or{font-size:12px;color:#475569;font-weight:600;letter-spacing:2px}
.lobby-waiting{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:14px}
.lobby-spinner{width:20px;height:20px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin 0.8s linear infinite}
.lobby-err{color:var(--red);font-size:12px;font-weight:600}
.lobby-name-row{display:flex;gap:8px;width:100%;max-width:320px}

/* Game */
.game{display:flex;flex-direction:column;gap:12px;position:relative}
.game-header{display:flex;align-items:center;justify-content:space-between;gap:6px;animation:fadeIn 0.3s ease both}
.back-btn{background:var(--surface);border:1px solid var(--border);color:var(--muted);border-radius:8px;padding:5px 10px;cursor:pointer;font-size:11px;font-family:inherit;transition:background 0.2s}
.back-btn:hover{background:rgba(255,255,255,0.08)}
.badge{padding:3px 10px;border-radius:20px;font-size:10px;font-weight:600}
.badge-diff{background:rgba(167,139,250,0.15);color:var(--accent)}
.badge-round{background:var(--surface);color:var(--muted)}

.scoreboard{display:flex;align-items:center;justify-content:center;gap:16px;padding:14px 0;background:var(--surface);border-radius:16px;border:1px solid var(--border);animation:fadeInUp 0.4s ease 0.1s both}
.score-block{text-align:center;min-width:70px}
.score-name{font-size:9px;font-weight:700;letter-spacing:2px;color:var(--muted);text-transform:uppercase;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:0 auto}
.score-num{font-family:'Space Mono',monospace;font-size:38px;font-weight:700;color:#f1f5f9;line-height:1.1;margin-top:2px;transition:transform 0.3s cubic-bezier(.34,1.56,.64,1)}
.score-num.pop{transform:scale(1.3)}
.score-vs{text-align:center}
.vs-text{font-size:12px;font-weight:800;color:#475569;letter-spacing:3px}
.first-to{font-size:8px;color:#475569;margin-top:1px}

.double-stakes{text-align:center;padding:7px;border-radius:10px;background:linear-gradient(90deg,rgba(249,115,22,0.15),rgba(239,68,68,0.15));border:1px solid rgba(249,115,22,0.3);font-size:11px;font-weight:700;color:var(--orange);letter-spacing:1px;animation:doubleStakesPulse 1s ease infinite}

/* Timer bar */
.timer-bar-wrap{height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;position:relative}
.timer-bar{height:100%;border-radius:3px;transition:width 0.5s linear}
.timer-label{text-align:center;font-size:11px;font-weight:700;color:var(--muted);margin-top:2px}
.timer-label.urgent{color:var(--red);animation:timerPulse 0.6s ease infinite}

.arsenal{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:8px 12px;animation:fadeInUp 0.4s ease 0.2s both}
.arsenal-title{font-size:9px;font-weight:700;letter-spacing:2px;color:var(--muted);text-transform:uppercase;margin-bottom:5px;text-align:center}
.arsenal-row{display:flex;align-items:center;justify-content:center;gap:7px;flex-wrap:wrap}
.arsenal-item{text-align:center;min-width:36px;transition:opacity 0.4s,transform 0.4s}
.arsenal-item.used{opacity:0.2;transform:scale(0.85)}
.arsenal-emoji{font-size:17px}
.arsenal-label{font-size:7px;color:var(--muted);font-weight:600;margin-top:1px}
.arsenal-div{width:1px;height:22px;background:var(--border);margin:0 2px}

.turn-screen{position:fixed;top:0;left:0;right:0;bottom:0;background:linear-gradient(145deg,#0c0a1a,#1a1035);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:200;gap:14px;animation:fadeIn 0.3s ease both}
.turn-icon{font-size:56px;animation:bounceIn 0.6s ease both}
.turn-text{font-size:24px;font-weight:800;letter-spacing:2px;color:#f1f5f9;animation:fadeInUp 0.5s ease 0.2s both}
.turn-sub{font-size:12px;color:var(--muted);animation:fadeIn 0.5s ease 0.4s both}
.turn-btn{margin-top:8px;padding:12px 40px;border-radius:14px;border:none;font-size:14px;font-weight:700;font-family:inherit;cursor:pointer;color:#fff;background:linear-gradient(135deg,var(--accent),var(--pink));transition:transform 0.2s cubic-bezier(.34,1.56,.64,1);animation:fadeInUp 0.5s ease 0.5s both}
.turn-btn:hover{transform:scale(1.06)}
.turn-btn:active{transform:scale(0.97)}

.move-section{display:flex;flex-direction:column;gap:10px;animation:fadeInUp 0.4s ease 0.3s both}
.pick-label{font-size:11px;font-weight:700;letter-spacing:2px;color:var(--muted);text-transform:uppercase;text-align:center}
.move-group-label{font-size:9px;font-weight:600;color:#475569;margin-bottom:5px;letter-spacing:1px;padding-left:4px}
.move-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.move-btn{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:10px 3px;cursor:pointer;text-align:center;font-family:inherit;color:var(--text);transition:transform 0.2s cubic-bezier(.34,1.56,.64,1),box-shadow 0.2s,background 0.2s;position:relative;overflow:hidden}
.move-btn::after{content:'';position:absolute;inset:0;border-radius:14px;background:radial-gradient(circle at center,rgba(255,255,255,0.1),transparent 70%);opacity:0;transition:opacity 0.2s}
.move-btn:hover::after{opacity:1}
.move-btn:hover{transform:translateY(-4px) scale(1.06);box-shadow:0 8px 24px rgba(0,0,0,0.3)}
.move-btn:active{transform:translateY(-1px) scale(0.97)}
.move-btn.limited{background:linear-gradient(135deg,rgba(167,139,250,0.08),rgba(244,114,182,0.08));border:1px solid rgba(167,139,250,0.2)}
.move-btn.used{opacity:0.25;cursor:not-allowed;background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.04)}
.move-btn.used:hover{transform:none;box-shadow:none}
.move-btn.used::after{display:none}
.move-btn.selected{border-color:var(--cyan);box-shadow:0 0 16px rgba(34,211,238,0.3);background:rgba(34,211,238,0.08)}
.move-emoji{font-size:22px;margin-bottom:2px}
.move-label{font-size:8px;font-weight:600;color:#94a3b8}

.picked-banner{text-align:center;padding:16px;background:rgba(34,211,238,0.06);border:1px solid rgba(34,211,238,0.2);border-radius:12px;animation:scaleIn 0.3s ease both}
.picked-emoji{font-size:40px;margin-bottom:4px}
.picked-text{font-size:12px;color:var(--cyan);font-weight:700;letter-spacing:1px}
.picked-waiting{font-size:10px;color:var(--muted);margin-top:4px}

.countdown-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:150}
.countdown-num{font-family:'Space Mono',monospace;font-size:120px;font-weight:700;color:var(--cyan);text-shadow:0 0 80px rgba(34,211,238,0.5);animation:countPop 0.35s ease both}

.result-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:120;cursor:pointer;padding:16px;animation:fadeIn 0.2s ease both}
.result-overlay.nuke-flash{animation:fadeIn 0.2s ease both,nukeFlash 0.8s ease both}
.result-card{background:linear-gradient(145deg,#1e1b3a,#0f172a);border-radius:22px;padding:26px 20px;text-align:center;max-width:380px;width:100%;border:1px solid rgba(255,255,255,0.1);box-shadow:0 24px 80px rgba(0,0,0,0.6);animation:bounceIn 0.5s ease both}
.result-moves{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:16px}
.result-move-box{text-align:center}
.result-move-emoji{font-size:44px}
.result-move-emoji.left{animation:slideInLeft 0.5s ease 0.1s both}
.result-move-emoji.right{animation:slideInRight 0.5s ease 0.1s both}
.result-move-name{font-size:9px;color:var(--muted);margin-top:2px;font-weight:600}
.result-vs{font-size:26px;animation:scaleIn 0.3s ease 0.2s both}
.result-banner{padding:8px 0;border-radius:10px;font-size:18px;font-weight:900;letter-spacing:3px;color:#fff;margin-bottom:6px;animation:scaleIn 0.4s ease 0.3s both}
.result-msg{font-size:12px;color:#cbd5e1;margin-bottom:3px;animation:fadeIn 0.4s ease 0.5s both}
.result-points{font-size:10px;color:var(--orange);font-weight:700;animation:fadeIn 0.4s ease 0.55s both}
.tap-text{font-size:9px;color:#374151;margin-top:6px;animation:fadeIn 0.5s ease 0.6s both}

.mini-history{display:flex;justify-content:center;gap:5px;padding:2px 0 8px;flex-wrap:wrap}
.mini-dot{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;animation:scaleIn 0.3s ease both;transition:transform 0.2s}
.mini-dot:hover{transform:scale(1.2)}

.final{padding:24px 0 40px;display:flex;flex-direction:column;gap:16px}
.final-badge{border-radius:22px;padding:32px 20px;text-align:center;animation:bounceIn 0.7s ease both;position:relative;overflow:hidden}
.final-badge::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 30% 40%,rgba(255,255,255,0.1),transparent 60%)}
.final-icon{font-size:52px;animation:victoryBounce 1s ease 0.3s both;position:relative;z-index:1}
.final-title{font-family:'Space Mono',monospace;font-size:30px;font-weight:700;letter-spacing:4px;color:#fff;margin-top:6px;position:relative;z-index:1}
.final-score{font-family:'Space Mono',monospace;font-size:44px;font-weight:700;color:rgba(255,255,255,0.9);margin-top:4px;position:relative;z-index:1}
.history-box{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:12px;animation:fadeInUp 0.5s ease 0.3s both}
.history-title{font-size:10px;font-weight:700;letter-spacing:2px;color:var(--muted);text-transform:uppercase;margin-bottom:6px}
.history-row{display:flex;align-items:center;justify-content:space-between;padding:5px 10px;margin-bottom:2px;border-radius:8px;background:rgba(255,255,255,0.02)}
.history-round{font-size:9px;color:var(--muted);font-weight:700;width:24px}
.history-moves{font-size:14px;flex:1;text-align:center}
.history-result{font-size:9px;font-weight:800;letter-spacing:1px;width:50px;text-align:right}
.history-pts{font-size:7px;color:var(--orange);font-weight:600}
.btn-row{display:flex;gap:8px}
.play-again-btn{flex:1;background:linear-gradient(135deg,#7c3aed,var(--accent));border:none;border-radius:14px;padding:14px 0;font-size:15px;font-weight:800;color:#fff;cursor:pointer;letter-spacing:2px;font-family:inherit;transition:transform 0.2s cubic-bezier(.34,1.56,.64,1);animation:fadeInUp 0.5s ease 0.5s both}
.play-again-btn:hover{transform:translateY(-3px) scale(1.03)}
.play-again-btn:active{transform:scale(0.97)}
.float-emoji{position:fixed;font-size:32px;pointer-events:none;z-index:250;animation:floatUp 1.2s ease forwards}

.disconnected{text-align:center;padding:20px;color:var(--red);font-weight:700;font-size:14px;animation:fadeIn 0.3s ease both}
`;

/* ═══════════════════════ COMPONENT ═══════════════════════ */
export default function RPSDeluxe() {
  const [screen, setScreen] = useState("menu"); // menu, lobby, game, result
  const [mode, setMode] = useState(null); // easy, hard, local, online
  const [showHTP, setShowHTP] = useState(false);

  // Local + AI state
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [round, setRound] = useState(0);
  const [p1Used, setP1Used] = useState([]);
  const [p2Used, setP2Used] = useState([]);
  const [multiplier, setMultiplier] = useState(1);
  const [history, setHistory] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [turnScreen, setTurnScreen] = useState(false);
  const [p1Move, setP1Move] = useState(null);
  const [roundResult, setRoundResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [scorePop, setScorePop] = useState(null);

  // Online state
  const [lobbyMode, setLobbyMode] = useState(null); // "create" | "join"
  const [roomCode, setRoomCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [myPlayer, setMyPlayer] = useState(null);
  const [opponentName, setOpponentName] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [lobbyError, setLobbyError] = useState("");
  const [onlineState, setOnlineState] = useState(null);
  const [myMove, setMyMove] = useState(null);
  const [oppReady, setOppReady] = useState(false);
  const [timer, setTimer] = useState(15);
  const [disconnected, setDisconnected] = useState(false);

  // Shared
  const [floats, setFloats] = useState([]);
  const floatId = useRef(0);
  const timerRef = useRef(null);
  const wsRef = useRef(null);
  const timerIntervalRef = useRef(null);

  const isLocal = mode === "local";
  const isOnline = mode === "online";
  const p1Label = isLocal ? "Player 1" : isOnline ? (myPlayer === "p1" ? (playerName || "You") : (opponentName || "Opponent")) : "You";
  const p2Label = isLocal ? "Player 2" : isOnline ? (myPlayer === "p2" ? (playerName || "You") : (opponentName || "Opponent")) : "AI";

  /* ─── Cleanup ─── */
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  /* ─── Floats ─── */
  function spawnFloats(emoji, count = 5) {
    const nf = [];
    for (let i = 0; i < count; i++)
      nf.push({ id: ++floatId.current, emoji, left: 10 + Math.random() * 80, bottom: 10 + Math.random() * 25, delay: Math.random() * 0.4 });
    setFloats((f) => [...f, ...nf]);
    setTimeout(() => setFloats((f) => f.filter((fl) => !nf.find((n) => n.id === fl.id))), 1600);
  }

  /* ─── Timer for online ─── */
  function startTimer(seconds) {
    setTimer(seconds);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    const start = Date.now();
    timerIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const remaining = Math.max(0, seconds - elapsed);
      setTimer(remaining);
      if (remaining <= 0) clearInterval(timerIntervalRef.current);
    }, 200);
  }

  /* ═══ LOCAL / AI LOGIC ═══ */
  function startOfflineGame(m) {
    setMode(m); setP1Score(0); setP2Score(0); setRound(0);
    setP1Used([]); setP2Used([]); setMultiplier(1); setHistory([]);
    setRoundResult(null); setShowResult(false);
    setCurrentPlayer(1); setTurnScreen(false); setP1Move(null);
    setScorePop(null); setFloats([]); setScreen("game");
  }

  const executeRound = useCallback((moveA, moveB) => {
    const isNukeVsNuke = moveA === "nuke" && moveB === "nuke";
    const result = resolve(moveA, moveB);
    const nP1U = MOVES[moveA].limited ? [...p1Used, moveA] : p1Used;
    const nP2U = MOVES[moveB].limited ? [...p2Used, moveB] : p2Used;
    let nP1 = p1Score, nP2 = p2Score, nM = multiplier, pts = 0, mt = "draw";
    if (isNukeVsNuke) { mt = "nuke_draw"; nM = multiplier + 1; spawnFloats("☢️", 8); }
    else if (result === "a") { pts = multiplier; nP1 += pts; mt = "p1"; nM = 1; spawnFloats(MOVES[moveA].emoji, 4); }
    else if (result === "b") { pts = multiplier; nP2 += pts; mt = "p2"; nM = 1; spawnFloats(MOVES[moveB].emoji, 4); }
    const rd = { round: round + 1, p1Move: moveA, p2Move: moveB, result, isNukeVsNuke, message: pickMsg(mt), points: pts, multiplier };
    setP1Used(nP1U); setP2Used(nP2U); setP1Score(nP1); setP2Score(nP2); setMultiplier(nM);
    setRound((r) => r + 1); setRoundResult(rd); setHistory((h) => [...h, rd]); setShowResult(true);
    if (result === "a") { setScorePop("p1"); setTimeout(() => setScorePop(null), 400); }
    if (result === "b") { setScorePop("p2"); setTimeout(() => setScorePop(null), 400); }
    setTimeout(() => { setAnimating(false); if (nP1 >= WINS_NEEDED || nP2 >= WINS_NEEDED) setTimeout(() => setScreen("result"), 1000); }, 300);
  }, [p1Score, p2Score, p1Used, p2Used, round, multiplier]);

  function playMoveAI(move) {
    if (animating) return;
    setAnimating(true); setCountdown(3);
    let c = 3;
    timerRef.current = setInterval(() => {
      c--; if (c > 0) setCountdown(c);
      else { clearInterval(timerRef.current); setCountdown(null); executeRound(move, mode === "easy" ? easyAI(p2Used) : hardAI(p2Used, p1Used, round)); }
    }, 400);
  }

  function playMoveLocal(move) {
    if (animating) return;
    if (currentPlayer === 1) { setP1Move(move); setTurnScreen(true); setCurrentPlayer(2); }
    else {
      setAnimating(true); setTurnScreen(false); setCountdown(3);
      let c = 3; const fm = p1Move;
      timerRef.current = setInterval(() => {
        c--; if (c > 0) setCountdown(c);
        else { clearInterval(timerRef.current); setCountdown(null); executeRound(fm, move); setP1Move(null); setCurrentPlayer(1); }
      }, 400);
    }
  }

  function dismissResult() {
    setShowResult(false);
    if (isLocal && p1Score < WINS_NEEDED && p2Score < WINS_NEEDED) setTurnScreen(true);
  }

  /* ═══ ONLINE LOGIC ═══ */
  function connectWS(onOpen) {
    if (wsRef.current) wsRef.current.close();
    setDisconnected(false);
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => { if (onOpen) onOpen(ws); };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      switch (msg.type) {
        case "room_created":
          setRoomCode(msg.code); setMyPlayer(msg.player); setWaiting(true);
          break;
        case "room_joined":
          setRoomCode(msg.code); setMyPlayer(msg.player); setWaiting(false); setScreen("game");
          break;
        case "opponent_joined":
          setOpponentName(msg.opponentName); setWaiting(false); setScreen("game");
          break;
        case "state":
          setOnlineState(msg);
          setP1Score(msg.p1Score); setP2Score(msg.p2Score);
          setRound(msg.round); setMultiplier(msg.multiplier); setHistory(msg.history);
          if (msg.you === "p1") { setP1Used(msg.yourUsed); setP2Used(msg.opponentUsed); }
          else { setP1Used(msg.opponentUsed); setP2Used(msg.yourUsed); }
          break;
        case "pick_phase":
          setMyMove(null); setOppReady(false); setShowResult(false);
          setAnimating(false); setCountdown(null);
          startTimer(msg.timerSeconds);
          break;
        case "move_confirmed":
          setMyMove(msg.move);
          break;
        case "opponent_ready":
          setOppReady(true);
          break;
        case "auto_picked":
          setMyMove(msg.move);
          break;
        case "round_result": {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          const isNukeVsNuke = msg.isNukeVsNuke;
          const result = msg.result;
          const myP = msg.you;
          let mt = "draw";
          if (isNukeVsNuke) { mt = "nuke_draw"; spawnFloats("☢️", 8); }
          else if (result === "a") { mt = myP === "p1" ? "p1" : "p2"; spawnFloats(MOVES[msg.p1Move].emoji, 4); }
          else if (result === "b") { mt = myP === "p2" ? "p1" : "p2"; spawnFloats(MOVES[msg.p2Move].emoji, 4); }
          const rd = {
            round: msg.round, p1Move: myP === "p1" ? msg.p1Move : msg.p2Move,
            p2Move: myP === "p1" ? msg.p2Move : msg.p1Move,
            result: myP === "p1" ? result : (result === "a" ? "b" : result === "b" ? "a" : result),
            isNukeVsNuke, message: pickMsg(mt), points: msg.points, multiplier: msg.multiplier,
          };
          setP1Score(msg.p1Score); setP2Score(msg.p2Score);
          setMultiplier(msg.multiplier); setRound(msg.round);
          if (myP === "p1") { setP1Used(msg.yourUsed); setP2Used(msg.opponentUsed); }
          else { setP1Used(msg.opponentUsed); setP2Used(msg.yourUsed); }
          setHistory(msg.history.map((h) => {
            if (myP === "p2") return { ...h, p1Move: h.p2Move, p2Move: h.p1Move, result: h.result === "a" ? "b" : h.result === "b" ? "a" : h.result };
            return h;
          }));
          setRoundResult(rd); setShowResult(true);
          const winner = result === "a" ? "p1" : result === "b" ? "p2" : null;
          if (winner) {
            const meWon = winner === myP;
            setScorePop(meWon ? "p1" : "p2"); setTimeout(() => setScorePop(null), 400);
          }
          if (msg.gameOver) setTimeout(() => setScreen("result"), 3500);
          break;
        }
        case "rematch_start":
          setP1Score(0); setP2Score(0); setRound(0); setP1Used([]); setP2Used([]);
          setMultiplier(1); setHistory([]); setRoundResult(null); setShowResult(false);
          setMyMove(null); setOppReady(false); setScreen("game");
          break;
        case "opponent_disconnected":
          setDisconnected(true);
          break;
        case "error":
          setLobbyError(msg.message);
          break;
      }
    };

    ws.onclose = () => {
      if (screen === "game" || screen === "result") setDisconnected(true);
    };
  }

  function createRoom() {
    setLobbyError("");
    connectWS((ws) => {
      ws.send(JSON.stringify({ type: "create_room", name: playerName || "Player 1" }));
    });
    setLobbyMode("create");
  }

  function joinRoom() {
    if (!inputCode.trim()) { setLobbyError("Enter a room code"); return; }
    setLobbyError("");
    connectWS((ws) => {
      ws.send(JSON.stringify({ type: "join_room", code: inputCode.trim(), name: playerName || "Player 2" }));
    });
  }

  function sendMove(move) {
    if (!wsRef.current || myMove) return;
    wsRef.current.send(JSON.stringify({ type: "pick_move", move }));
  }

  function requestRematch() {
    if (wsRef.current) wsRef.current.send(JSON.stringify({ type: "rematch" }));
  }

  function goToMenu() {
    if (wsRef.current) wsRef.current.close();
    setScreen("menu"); setMode(null); setLobbyMode(null); setRoomCode("");
    setInputCode(""); setWaiting(false); setLobbyError("");
    setOnlineState(null); setMyMove(null); setOppReady(false);
    setDisconnected(false); setPlayerName("");
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  }

  /* ═══ DERIVED ═══ */
  const gameOver = p1Score >= WINS_NEEDED || p2Score >= WINS_NEEDED;
  const activeUsed = isLocal ? (currentPlayer === 1 ? p1Used : p2Used) : isOnline ? p1Used : p1Used;
  const styleTag = <style dangerouslySetInnerHTML={{ __html: CSS }} />;

  /* ═══════════════════════ HOW TO PLAY ═══════════════════════ */
  const htpSection = (
    <div className="htp">
      <div className="htp-header" onClick={() => setShowHTP(!showHTP)}>
        <span className="htp-title">📖 How to Play</span>
        <span className={`htp-arrow ${showHTP ? "open" : ""}`}>▼</span>
      </div>
      {showHTP && (
        <div className="htp-body">
          <div className="htp-section">
            <div className="htp-sub">🎯 Goal</div>
            <div className="htp-text">First to <b>5 wins</b> in a best-of-9 match. Pick your move each round and outsmart your opponent!</div>
          </div>

          <div className="htp-section">
            <div className="htp-sub">🪨 The Basics</div>
            <div className="htp-grid">
              <div className="htp-item"><span className="htp-emoji">🪨</span><span className="htp-text"><b>Rock</b> beats Scissors</span></div>
              <div className="htp-item"><span className="htp-emoji">📄</span><span className="htp-text"><b>Paper</b> beats Rock</span></div>
              <div className="htp-item"><span className="htp-emoji">✂️</span><span className="htp-text"><b>Scissors</b> beats Paper</span></div>
              <div className="htp-item"><span className="htp-emoji">🤵</span><span className="htp-text"><b>Politician</b> — only beats Nuke, loses to everything else</span></div>
            </div>
          </div>

          <div className="htp-section">
            <div className="htp-sub">⚡ Special Moves (one use each!)</div>
            <div className="htp-grid">
              <div className="htp-item"><span className="htp-emoji">👶</span><span className="htp-text"><b>Kindergartner</b> beats everything <b>except Rock</b></span></div>
              <div className="htp-item"><span className="htp-emoji">🥅</span><span className="htp-text"><b>Net</b> beats everything <b>except Scissors</b></span></div>
              <div className="htp-item"><span className="htp-emoji">🔨</span><span className="htp-text"><b>Hammer</b> beats everything <b>except Paper</b></span></div>
              <div className="htp-item"><span className="htp-emoji">☢️</span><span className="htp-text"><b>Nuke</b> beats everything <b>except Hammer</b></span></div>
            </div>
          </div>

          <div className="htp-section">
            <div className="htp-sub">🔺 Special Triangle</div>
            <div className="htp-text">Among the specials: <b>Hammer</b> beats Net → <b>Net</b> beats Kindergartner → <b>Kindergartner</b> beats Hammer</div>
          </div>

          <div className="htp-section">
            <div className="htp-sub">☢️ Nuke vs Nuke Rule</div>
            <div className="htp-note">If both players pick Nuke, <b>nobody scores</b> and the <b>next round is worth double points</b>! If it happens again, it stacks (3x, 4x...).</div>
          </div>

          <div className="htp-section">
            <div className="htp-sub">🎮 Game Modes</div>
            <div className="htp-text">
              <b>Easy AI</b> — random picks, great for learning<br/>
              <b>Hard AI</b> — strategic, adapts to your playstyle<br/>
              <b>Local 2P</b> — pass & play on one device<br/>
              <b>Online</b> — play a friend on a different device with a room code (15-second turn timer!)
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /* ═══════════════════════ RENDERS ═══════════════════════ */

  // ── MENU ──
  if (screen === "menu") {
    return (<>{styleTag}<div className="app"><div className="inner menu">
      <div>
        <div className="logo-emojis">🪨 📄 ✂️</div>
        <h1 className="logo-title">RPS DELUXE</h1>
        <div className="logo-sub">Best of 9 • Special Moves • Pure Chaos</div>
      </div>

      {htpSection}

      <div>
        <div className="sec-title" style={{animationDelay:"0.4s"}}>VS Computer</div>
        <div className="menu-cards">
          <button className="menu-card c-easy" onClick={() => startOfflineGame("easy")}><div className="c-emoji">🌱</div><div className="c-ttl">Easy</div><div className="c-desc">Random picks, learn the ropes</div></button>
          <button className="menu-card c-hard" onClick={() => startOfflineGame("hard")}><div className="c-emoji">🔥</div><div className="c-ttl">Hard</div><div className="c-desc">Strategic AI, adapts to you</div></button>
        </div>
      </div>
      <div>
        <div className="sec-title" style={{animationDelay:"0.45s"}}>VS Friend</div>
        <div className="menu-cards">
          <button className="menu-card c-local" onClick={() => startOfflineGame("local")}><div className="c-emoji">🎮</div><div className="c-ttl">Local</div><div className="c-desc">Pass & play, same device</div></button>
          <button className="menu-card c-online" onClick={() => { setMode("online"); setScreen("lobby"); setLobbyMode(null); }}><div className="c-emoji">🌐</div><div className="c-ttl">Online</div><div className="c-desc">Play a friend on another device</div></button>
        </div>
      </div>
    </div></div></>);
  }

  // ── ONLINE LOBBY ──
  if (screen === "lobby") {
    return (<>{styleTag}<div className="app"><div className="inner lobby">
      <div className="lobby-title">Online Play</div>

      {!lobbyMode && (<>
        <input className="lobby-input" placeholder="Your name (optional)" value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={16} />
        <button className="lobby-btn primary" onClick={createRoom}>Create Room</button>
        <div className="lobby-or">— OR —</div>
        <div className="lobby-name-row">
          <input className="lobby-input" placeholder="Room code" value={inputCode} onChange={(e) => setInputCode(e.target.value.toUpperCase())} maxLength={4} style={{letterSpacing:6,fontFamily:"'Space Mono',monospace",fontSize:20}} />
        </div>
        <button className="lobby-btn green" onClick={joinRoom}>Join Room</button>
      </>)}

      {lobbyMode === "create" && waiting && (<>
        <div className="lobby-code-box">
          <div className="lobby-code">{roomCode}</div>
          <div className="lobby-code-label">Share this code with your friend</div>
        </div>
        <div className="lobby-waiting"><div className="lobby-spinner" />Waiting for opponent...</div>
      </>)}

      {lobbyError && <div className="lobby-err">{lobbyError}</div>}
      <button className="lobby-btn back" onClick={goToMenu}>← Back to Menu</button>
    </div></div></>);
  }

  // ── FINAL RESULT ──
  if (screen === "result") {
    const meWon = isOnline ? (myPlayer === "p1" ? p1Score >= WINS_NEEDED : p2Score >= WINS_NEEDED) : p1Score >= WINS_NEEDED;
    const winLabel = isLocal ? (p1Score >= WINS_NEEDED ? "Player 1 Wins!" : "Player 2 Wins!") : isOnline ? (meWon ? "VICTORY!" : "DEFEAT") : (meWon ? "VICTORY!" : "DEFEAT");
    return (<>{styleTag}<div className="app"><div className="inner final">
      <div className="final-badge" style={{ background: meWon || isLocal ? "linear-gradient(135deg,#059669,#22d3ee)" : "linear-gradient(135deg,#dc2626,#f97316)" }}>
        <div className="final-icon">{meWon || isLocal ? "🏆" : "💀"}</div>
        <div className="final-title">{winLabel}</div>
        <div className="final-score">{p1Score} – {p2Score}</div>
      </div>
      <div className="history-box">
        <div className="history-title">Match History</div>
        {history.map((h, i) => (
          <div key={i} className="history-row" style={{
            borderLeft: h.result === "a" ? "3px solid var(--cyan)" : h.result === "b" ? "3px solid var(--orange)" : h.isNukeVsNuke ? "3px solid var(--red)" : "3px solid #475569",
          }}>
            <span className="history-round">R{h.round}</span>
            <span className="history-moves">{MOVES[h.p1Move]?.emoji} vs {MOVES[h.p2Move]?.emoji}</span>
            <span className="history-result" style={{ color: h.result === "a" ? "var(--cyan)" : h.result === "b" ? "var(--orange)" : h.isNukeVsNuke ? "var(--red)" : "#94a3b8" }}>
              {h.result === "a" ? (isOnline ? "YOU" : isLocal ? "P1" : "WIN") : h.result === "b" ? (isOnline ? "OPP" : isLocal ? "P2" : "LOSS") : h.isNukeVsNuke ? "☢️☢️" : "DRAW"}
              {h.points > 1 && <div className="history-pts">+{h.points}pts</div>}
            </span>
          </div>
        ))}
      </div>
      {disconnected && <div className="disconnected">Opponent disconnected</div>}
      <div className="btn-row">
        <button className="play-again-btn" onClick={() => { if (isOnline && !disconnected) requestRematch(); else goToMenu(); }}>
          {isOnline && !disconnected ? "Rematch" : "Menu"}
        </button>
        {isOnline && <button className="play-again-btn" onClick={goToMenu} style={{background:"rgba(255,255,255,0.06)",color:"var(--muted)",flex:"0 0 auto",padding:"14px 20px"}}>Menu</button>}
      </div>
    </div></div></>);
  }

  // ── GAME ──
  const renderMoveGrid = (onPick, disabledOverride, selectedMove) => (
    <div className="move-section">
      <div className="pick-label">{isLocal ? `Player ${currentPlayer} — Pick your move` : isOnline ? "Pick your move" : "Pick your move"}</div>
      <div>
        <div className="move-group-label">♾️ Unlimited</div>
        <div className="move-grid">
          {UNLIMITED.map(([key, val]) => (
            <button key={key} className={`move-btn ${selectedMove === key ? "selected" : ""}`} onClick={() => onPick(key)} disabled={disabledOverride || animating}>
              <div className="move-emoji">{val.emoji}</div><div className="move-label">{val.label}</div>
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="move-group-label">⚡ Limited (one use)</div>
        <div className="move-grid">
          {LIMITED.map(([key, val]) => {
            const used = activeUsed.includes(key);
            return (
              <button key={key} className={`move-btn limited ${used ? "used" : ""} ${selectedMove === key ? "selected" : ""}`} onClick={() => !used && onPick(key)} disabled={disabledOverride || animating || used}>
                <div className="move-emoji">{used ? "✗" : val.emoji}</div><div className="move-label">{used ? "Used" : val.label}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderArsenal = (label, usedArr) => (
    <div className="arsenal">
      <div className="arsenal-title">{label}</div>
      <div className="arsenal-row">
        {LIMITED.map(([key, val]) => { const used = usedArr.includes(key); return (<div key={key} className={`arsenal-item ${used ? "used" : ""}`}><div className="arsenal-emoji">{used ? "✗" : val.emoji}</div><div className="arsenal-label">{used ? "Used" : val.label}</div></div>); })}
        <div className="arsenal-div" />
        {UNLIMITED.map(([key, val]) => (<div key={key} className="arsenal-item"><div className="arsenal-emoji">{val.emoji}</div><div className="arsenal-label">∞</div></div>))}
      </div>
    </div>
  );

  const timerPct = isOnline ? Math.max(0, (timer / 15) * 100) : 0;
  const timerColor = timer > 7 ? "var(--cyan)" : timer > 3 ? "var(--orange)" : "var(--red)";

  return (<>{styleTag}<div className="app"><div className="inner game">
    <div className="game-header">
      <button className="back-btn" onClick={goToMenu}>← Menu</button>
      <span className="badge badge-diff">{mode === "easy" ? "🌱 Easy" : mode === "hard" ? "🔥 Hard" : mode === "local" ? "🎮 Local" : `🌐 ${roomCode}`}</span>
      <span className="badge badge-round">Round {Math.min(round + 1, 9)}</span>
    </div>

    <div className="scoreboard">
      <div className="score-block"><div className="score-name">{p1Label}</div><div className={`score-num ${scorePop === "p1" ? "pop" : ""}`}>{p1Score}</div></div>
      <div className="score-vs"><div className="vs-text">VS</div><div className="first-to">First to {WINS_NEEDED}</div></div>
      <div className="score-block"><div className="score-name">{p2Label}</div><div className={`score-num ${scorePop === "p2" ? "pop" : ""}`}>{p2Score}</div></div>
    </div>

    {multiplier > 1 && <div className="double-stakes">☢️ NEXT ROUND WORTH {multiplier}x POINTS! ☢️</div>}

    {/* Timer bar for online */}
    {isOnline && !showResult && !myMove && (
      <div>
        <div className="timer-bar-wrap"><div className="timer-bar" style={{ width: `${timerPct}%`, background: timerColor }} /></div>
        <div className={`timer-label ${timer <= 5 ? "urgent" : ""}`}>{Math.ceil(timer)}s</div>
      </div>
    )}

    {/* Arsenal */}
    {!isLocal && !isOnline && renderArsenal("🤖 AI's Arsenal", p2Used)}
    {isOnline && renderArsenal(`🎯 ${p2Label}'s Arsenal`, p2Used)}
    {isLocal && currentPlayer === 1 && !turnScreen && renderArsenal("🎮 Player 2's Arsenal", p2Used)}
    {isLocal && currentPlayer === 2 && !turnScreen && renderArsenal("🎮 Player 1's Arsenal", p1Used)}

    {disconnected && <div className="disconnected">⚠️ Opponent disconnected<br/><button className="lobby-btn back" onClick={goToMenu} style={{marginTop:8}}>Back to Menu</button></div>}

    {/* Turn screen (local) */}
    {turnScreen && (
      <div className="turn-screen">
        <div className="turn-icon">{currentPlayer === 1 ? "☝️" : "✌️"}</div>
        <div className="turn-text">Player {currentPlayer}'s Turn</div>
        <div className="turn-sub">Hand the device over — no peeking!</div>
        <button className="turn-btn" onClick={() => setTurnScreen(false)}>I'm Ready</button>
      </div>
    )}

    {countdown !== null && <div className="countdown-overlay"><div className="countdown-num" key={countdown}>{countdown}</div></div>}

    {showResult && roundResult && !countdown && (
      <div className={`result-overlay ${roundResult.isNukeVsNuke ? "nuke-flash" : ""}`} onClick={() => { if (!isOnline) dismissResult(); }}>
        <div className="result-card">
          <div className="result-moves">
            <div className="result-move-box"><div className="result-move-emoji left">{MOVES[roundResult.p1Move]?.emoji}</div><div className="result-move-name">{p1Label}: {MOVES[roundResult.p1Move]?.label}</div></div>
            <div className="result-vs">⚔️</div>
            <div className="result-move-box"><div className="result-move-emoji right">{MOVES[roundResult.p2Move]?.emoji}</div><div className="result-move-name">{p2Label}: {MOVES[roundResult.p2Move]?.label}</div></div>
          </div>
          <div className="result-banner" style={{
            background: roundResult.isNukeVsNuke ? "linear-gradient(90deg,#dc2626,#f97316,#dc2626)" : roundResult.result === "a" ? "linear-gradient(90deg,#059669,#22d3ee)" : roundResult.result === "b" ? "linear-gradient(90deg,#dc2626,#f97316)" : "linear-gradient(90deg,#475569,#64748b)",
          }}>
            {roundResult.isNukeVsNuke ? "☢️ MUTUAL DESTRUCTION ☢️" : roundResult.result === "a" ? `${p1Label.toUpperCase()} WINS!` : roundResult.result === "b" ? `${p2Label.toUpperCase()} WINS!` : "DRAW!"}
          </div>
          <div className="result-msg">{roundResult.message}</div>
          {roundResult.points > 1 && <div className="result-points">+{roundResult.points} points!</div>}
          {roundResult.isNukeVsNuke && <div className="result-points">Next round worth {multiplier}x!</div>}
          <div className="tap-text">{isOnline ? "next round starting..." : "tap to continue"}</div>
        </div>
      </div>
    )}

    {/* Online: show picked state or move grid */}
    {isOnline && !disconnected && !showResult && (
      myMove ? (
        <div className="picked-banner">
          <div className="picked-emoji">{MOVES[myMove]?.emoji}</div>
          <div className="picked-text">You picked {MOVES[myMove]?.label}!</div>
          <div className="picked-waiting">{oppReady ? "Both ready — revealing..." : "Waiting for opponent..."}</div>
        </div>
      ) : (
        !gameOver && renderMoveGrid(sendMove, false, null)
      )
    )}

    {/* Offline: show move grid */}
    {!isOnline && !gameOver && !turnScreen && renderMoveGrid(isLocal ? playMoveLocal : playMoveAI, false, null)}

    {history.length > 0 && <div className="mini-history">
      {history.slice(-6).map((h, i) => (
        <div key={i} className="mini-dot" style={{
          background: h.isNukeVsNuke ? "var(--red)" : h.result === "a" ? "var(--cyan)" : h.result === "b" ? "var(--orange)" : "#475569",
          animationDelay: `${i * 0.05}s`,
        }} title={`R${h.round}`}>
          {h.isNukeVsNuke ? "☢️" : h.result === "a" ? MOVES[h.p1Move]?.emoji : h.result === "b" ? MOVES[h.p2Move]?.emoji : "🤝"}
        </div>
      ))}
    </div>}
  </div></div>
  {floats.map((f) => (<div key={f.id} className="float-emoji" style={{ left: `${f.left}%`, bottom: `${f.bottom}%`, animationDelay: `${f.delay}s` }}>{f.emoji}</div>))}
  </>);
}
