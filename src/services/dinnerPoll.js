const { DinnerPoll } = require("./models");
const { getISTDate } = require("./utils");

const DINNER_OPTIONS = ["19:00", "19:30", "20:00", "20:30", "21:00"];

function getTodayDateStr() {
  const d = getISTDate();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h > 12 ? h - 12 : h}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function buildPollKeyboard(votesObj = {}) {
  const counts = {};
  DINNER_OPTIONS.forEach(t => (counts[t] = 0));
  Object.values(votesObj).forEach(t => {
    if (counts[t] !== undefined) counts[t]++;
  });

  const buttons = DINNER_OPTIONS.map(time => ({
    text: counts[time] > 0 ? `${formatTime(time)} (${counts[time]})` : formatTime(time),
    callback_data: `dinner_vote_${time}`
  }));

  return {
    inline_keyboard: [buttons.slice(0, 3), buttons.slice(3)]
  };
}

async function getOrCreateTodayPoll() {
  const date = getTodayDateStr();
  return DinnerPoll.findOneAndUpdate(
    { date },
    { $setOnInsert: { date, votes: {}, messageIds: {}, status: "open" } },
    { upsert: true, new: true }
  );
}

async function getTodayPoll() {
  return DinnerPoll.findOne({ date: getTodayDateStr() });
}

async function castVote(chatId, time) {
  const date = getTodayDateStr();
  return DinnerPoll.findOneAndUpdate(
    { date, status: "open" },
    { $set: { [`votes.${chatId}`]: time } },
    { new: true }
  );
}

async function storeMessageId(date, chatId, messageId) {
  await DinnerPoll.updateOne({ date }, { $set: { [`messageIds.${chatId}`]: messageId } });
}

async function closePoll() {
  const date = getTodayDateStr();
  const poll = await DinnerPoll.findOne({ date });
  if (!poll || poll.status !== "open") return null;

  const votesObj = poll.votes instanceof Map ? Object.fromEntries(poll.votes) : poll.votes;
  const counts = {};
  DINNER_OPTIONS.forEach(t => (counts[t] = 0));
  Object.values(votesObj).forEach(t => {
    if (counts[t] !== undefined) counts[t]++;
  });

  // Winner = most votes; tie-breaks to earlier time (DINNER_OPTIONS is ordered)
  let winner = "20:00";
  let maxCount = -1;
  DINNER_OPTIONS.forEach(t => {
    if (counts[t] > maxCount) {
      maxCount = counts[t];
      winner = t;
    }
  });

  const totalVotes = Object.values(counts).reduce((a, b) => a + b, 0);
  await DinnerPoll.updateOne({ date }, { status: "closed", winningTime: winner });
  return { winner, counts, totalVotes };
}

async function markNotified() {
  await DinnerPoll.updateOne({ date: getTodayDateStr() }, { status: "notified" });
}

module.exports = {
  DINNER_OPTIONS,
  getTodayDateStr,
  formatTime,
  buildPollKeyboard,
  getOrCreateTodayPoll,
  getTodayPoll,
  castVote,
  storeMessageId,
  closePoll,
  markNotified
};
