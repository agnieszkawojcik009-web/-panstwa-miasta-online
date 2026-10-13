const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, "public")));

const rooms = new Map();
const alphabet = "ABCDEFGHIJKLMNOPRSTUWYZ";
const defaultCategories = ["Państwo", "Miasto", "Zwierzę", "Roślina", "Imię", "Rzecz", "Zawód", "Jedzenie", "Marka samochodu", "Tytuł filmu"];

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = Array.from({ length: 6 }, () => chars[crypto.randomInt(chars.length)]).join("");
  } while (rooms.has(code));
  return code;
}
function cleanName(value) {
  return String(value || "Gracz").trim().slice(0, 18) || "Gracz";
}
function publicRoom(room) {
  return {
    code: room.code, title: room.title, hostId: room.hostId,
    status: room.status, categories: room.categories, duration: room.duration,
    players: [...room.players.values()].map(p => ({
      id: p.id, name: p.name, score: p.score, ready: p.ready,
      answers: room.status === "results" ? p.answers : undefined
    })),
    letter: room.letter, endsAt: room.endsAt,
    results: room.status === "results" ? room.lastResults : undefined,
    round: room.round
  };
}
function broadcast(room) {
  io.to(room.code).emit("room:update", publicRoom(room));
}
function getRoom(socket) {
  const code = socket.data.roomCode;
  return code ? rooms.get(code) : null;
}
function endRound(room) {
  if (room.timer) clearTimeout(room.timer);
  room.timer = null;
  const results = [];
  for (const player of room.players.values()) {
    let points = 0;
    for (const category of room.categories) {
      const answer = (player.answers[category] || "").trim();
      if (answer && answer.toLocaleUpperCase("pl").startsWith(room.letter)) points += 10;
    }
    player.score += points;
    results.push({ id: player.id, name: player.name, answers: { ...player.answers }, points, total: player.score });
  }
  room.lastResults = results.sort((a, b) => b.points - a.points);
  room.status = "results";
  room.endsAt = null;
  broadcast(room);
}
io.on("connection", socket => {
  socket.on("room:create", (payload = {}, reply = () => {}) => {
    const name = cleanName(payload.name);
    const categories = Array.isArray(payload.categories)
      ? [...new Set(payload.categories.map(x => String(x).trim().slice(0, 32)).filter(Boolean))].slice(0, 20)
      : defaultCategories.slice(0, 5);
    if (!categories.length) return reply({ ok: false, error: "Wybierz co najmniej jedną kategorię." });
    const room = {
      code: makeCode(), title: String(payload.title || "Pokój gry").trim().slice(0, 40) || "Pokój gry",
      hostId: socket.id, categories, duration: Math.max(0, Math.min(300, Number(payload.duration) || 90)),
      players: new Map(), status: "lobby", letter: null, endsAt: null,
      round: 0, timer: null, lastResults: []
    };
    room.players.set(socket.id, { id: socket.id, name, score: 0, ready: true, answers: {} });
    rooms.set(room.code, room);
    socket.join(room.code); socket.data.roomCode = room.code;
    reply({ ok: true, room: publicRoom(room) }); broadcast(room);
  });

  socket.on("room:join", (payload = {}, reply = () => {}) => {
    const code = String(payload.code || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return reply({ ok: false, error: "Nie znaleziono pokoju o takim kodzie. Sprawdź kod i spróbuj ponownie." });
    if (room.status !== "lobby") return reply({ ok: false, error: "Ta gra już trwa. Poproś gospodarza o nowy pokój." });
    if (room.players.size >= 12) return reply({ ok: false, error: "Pokój jest pełny (maksymalnie 12 osób)." });
    const player = { id: socket.id, name: cleanName(payload.name), score: 0, ready: true, answers: {} };
    room.players.set(socket.id, player);
    socket.join(room.code); socket.data.roomCode = room.code;
    reply({ ok: true, room: publicRoom(room) }); broadcast(room);
  });

  socket.on("game:start", reply => {
    const room = getRoom(socket);
    if (!room) return reply?.({ ok: false, error: "Najpierw dołącz do pokoju." });
    if (room.hostId !== socket.id) return reply?.({ ok: false, error: "Tylko gospodarz może rozpocząć rundę." });
    if (room.status !== "lobby" && room.status !== "results") return reply?.({ ok: false, error: "Runda już trwa." });
    room.round++;
    room.letter = alphabet[crypto.randomInt(alphabet.length)];
    room.status = "playing"; room.lastResults = [];
    for (const p of room.players.values()) p.answers = {};
    room.endsAt = room.duration ? Date.now() + room.duration * 1000 : null;
    broadcast(room);
    if (room.duration) room.timer = setTimeout(() => endRound(room), room.duration * 1000);
    reply?.({ ok: true });
  });

  socket.on("game:submit", (payload = {}, reply = () => {}) => {
    const room = getRoom(socket);
    if (!room || room.status !== "playing") return reply({ ok: false, error: "Ta runda nie przyjmuje już odpowiedzi." });
    const player = room.players.get(socket.id);
    if (!player) return reply({ ok: false, error: "Nie jesteś graczem w tym pokoju." });
    const answers = {};
    for (const category of room.categories) answers[category] = String(payload.answers?.[category] || "").trim().slice(0, 80);
    player.answers = answers;
    reply({ ok: true });
    socket.emit("game:submitted");
    if ([...room.players.values()].every(p => Object.keys(p.answers).length > 0)) endRound(room);
    else broadcast(room);
  });

  socket.on("game:end", reply => {
    const room = getRoom(socket);
    if (!room) return reply?.({ ok: false, error: "Brak pokoju." });
    if (room.hostId !== socket.id) return reply?.({ ok: false, error: "Tylko gospodarz może zakończyć rundę." });
    if (room.status === "playing") endRound(room);
    reply?.({ ok: true });
  });

  socket.on("disconnect", () => {
    const room = getRoom(socket);
    if (!room) return;
    room.players.delete(socket.id);
    if (!room.players.size) {
      if (room.timer) clearTimeout(room.timer);
      rooms.delete(room.code);
      return;
    }
    if (room.hostId === socket.id) room.hostId = room.players.keys().next().value;
    broadcast(room);
  });
});
server.listen(PORT, () => console.log(`Państwa Miasta działa na porcie ${PORT}`));
