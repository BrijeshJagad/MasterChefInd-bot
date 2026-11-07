import { DinnerPoll } from './models';
import { getISTDate } from './utils';
import logger from './logger';
import { DinnerPollDocument } from '../../types/common';

export const DINNER_OPTIONS: readonly string[] = ['19:00', '19:30', '20:00', '20:30', '21:00'];

export interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface PollClosedResult {
  winner: string;
  counts: Record<string, number>;
  totalVotes: number;
}

export function getTodayDateStr(): string {
  const d = getISTDate();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatTime(hhmm: string): string {
  const parts = hhmm.split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  return `${h > 12 ? h - 12 : h}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function buildPollKeyboard(votesObj: Map<string, string> | Record<string, string> = {}): InlineKeyboardMarkup {
  const counts: Record<string, number> = {};
  DINNER_OPTIONS.forEach(t => (counts[t] = 0));

  const entries: string[] = votesObj instanceof Map 
    ? Array.from(votesObj.values()) 
    : Object.values(votesObj);

  entries.forEach(t => {
    if (counts[t] !== undefined) {
      counts[t] = (counts[t] ?? 0) + 1;
    }
  });

  const buttons: InlineKeyboardButton[] = DINNER_OPTIONS.map(time => {
    const count = counts[time] ?? 0;
    return {
      text: count > 0 ? `${formatTime(time)} (${count})` : formatTime(time),
      callback_data: `dinner_vote_${time}`,
    };
  });

  return {
    inline_keyboard: [buttons.slice(0, 3), buttons.slice(3)],
  };
}

export async function getOrCreateTodayPoll(): Promise<DinnerPollDocument | null> {
  const date = getTodayDateStr();
  return await DinnerPoll.findOneAndUpdate(
    { date },
    { $setOnInsert: { date, votes: {}, messageIds: {}, status: 'open' } },
    { upsert: true, new: true }
  );
}

export async function getTodayPoll(): Promise<DinnerPollDocument | null> {
  return await DinnerPoll.findOne({ date: getTodayDateStr() });
}

export async function castVote(chatId: string | number, time: string): Promise<DinnerPollDocument | null> {
  const date = getTodayDateStr();
  const updatedPoll = await DinnerPoll.findOneAndUpdate(
    { date, status: 'open' },
    { $set: { [`votes.${chatId}`]: time } },
    { new: true }
  );

  logger.info('dinner_poll.vote', `Vote recorded for ${chatId} -> ${time}`, {
    action: 'dinner_poll.vote',
    chatId: String(chatId),
    votedTime: time,
    date,
  });

  return updatedPoll;
}

export async function storeMessageId(date: string, chatId: string | number, messageId: number): Promise<void> {
  await DinnerPoll.updateOne({ date }, { $set: { [`messageIds.${chatId}`]: messageId } });
}

export async function closePoll(): Promise<PollClosedResult | null> {
  const date = getTodayDateStr();
  const poll = await DinnerPoll.findOne({ date });
  if (!poll || poll.status !== 'open') return null;

  const votesObj: Record<string, string> = poll.votes instanceof Map 
    ? Object.fromEntries(poll.votes) 
    : (poll.votes as Record<string, string>);

  const counts: Record<string, number> = {};
  DINNER_OPTIONS.forEach(t => (counts[t] = 0));
  Object.values(votesObj).forEach(t => {
    if (counts[t] !== undefined) {
      counts[t] = (counts[t] ?? 0) + 1;
    }
  });

  // Winner = most votes; tie-breaks to earlier time (DINNER_OPTIONS is ordered)
  let winner = '20:00';
  let maxCount = -1;
  DINNER_OPTIONS.forEach(t => {
    const count = counts[t] ?? 0;
    if (count > maxCount) {
      maxCount = count;
      winner = t;
    }
  });

  const totalVotes = Object.values(counts).reduce((a, b) => a + b, 0);
  await DinnerPoll.updateOne({ date }, { status: 'closed', winningTime: winner });

  logger.info('dinner_poll.closed', `Dinner poll closed for ${date}. Winning time: ${winner} with ${totalVotes} total votes`, {
    action: 'dinner_poll.closed',
    date,
    winner,
    totalVotes,
    counts,
  });

  return { winner, counts, totalVotes };
}

export async function markNotified(): Promise<void> {
  await DinnerPoll.updateOne({ date: getTodayDateStr() }, { status: 'notified' });
}
