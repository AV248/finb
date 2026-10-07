'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { sfx } from '@/lib/audio';
import type { SoloGameProps } from './VaultRush';

/* ------------------------------------------------------------------ *
 * Cipher Vault — six turns to crack the teller's four-digit code.
 * ------------------------------------------------------------------ */
export function CipherVault({ onFinish }: SoloGameProps) {
  const [target] = useState(() => {
    const digits = '0123456789'.split('').sort(() => Math.random() - 0.5);
    return digits.slice(0, 4).join('');
  });
  const [guess, setGuess] = useState('');
  const [clues, setClues] = useState<{ guess: string; exact: number; close: number }[]>([]);
  const [done, setDone] = useState(false);

  const submit = () => {
    if (!/^\d{4}$/.test(guess) || done) return;
    const exact = guess.split('').filter((digit, index) => digit === target[index]).length;
    const close = guess.split('').filter((digit, index) => target.includes(digit) && digit !== target[index]).length;
    const next = [...clues, { guess, exact, close }];
    setClues(next);
    setGuess('');
    if (exact === 4) {
      setDone(true);
      sfx.perfect();
      const reward = Math.max(20, 90 - next.length * 12);
      onFinish({
        credits: reward,
        liberals: 5,
        won: true,
        score: next.length,
        title: `Cipher Vault · cracked in ${next.length}`,
        message: `The code was ${target}. ${next.length} guesses — vault cracked, ${reward} Credits released.`,
      });
    } else if (next.length >= 6) {
      setDone(true);
      sfx.bad();
      onFinish({
        credits: 8,
        liberals: 1,
        won: false,
        score: 0,
        title: 'Cipher Vault · timed out',
        message: `The code was ${target}. The vault resets whenever you are ready.`,
      });
    } else {
      sfx.tap();
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-white/65">Find the four-digit code. Digits never repeat. Each guess reports exact positions and nearby digits.</p>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} className={`chip ${index < clues.length ? 'chip-lime' : ''}`}>
            {clues[index]?.guess ?? '····'}
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="field max-w-[180px] text-center font-mono text-2xl tracking-[0.4em]"
          value={guess}
          inputMode="numeric"
          maxLength={4}
          onChange={event => setGuess(event.target.value.replace(/\D/g, '').slice(0, 4))}
          onKeyDown={event => event.key === 'Enter' && submit()}
          placeholder="0000"
        />
        <button className="btn btn-flame" onClick={submit} disabled={guess.length !== 4 || done}>
          Try the vault
        </button>
      </div>
      <div className="space-y-1">
        {clues.map((clue, index) => (
          <motion.div key={`${clue.guess}-${index}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="jelly-flat flex items-center gap-3 px-3 py-2">
            <code className="font-mono text-sm text-cream-100">{clue.guess}</code>
            <span className="text-[11px] text-lime-300">{clue.exact} in place</span>
            <span className="text-[11px] text-flame-300">{clue.close} nearby</span>
          </motion.div>
        ))}
      </div>
      <p className="text-[11px] text-white/45">Six attempts. Fewer guesses means a bigger payout.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Ticker Sniper — fast financial literacy against a shrink clock.
 * ------------------------------------------------------------------ */
const PROMPTS = [
  { q: 'A share is…', options: ['A small ownership stake', 'Guaranteed interest', 'A short loan', 'A product coupon'], answer: 0 },
  { q: 'Diversifying mainly tries to…', options: ['Remove all risk', 'Spread exposure', 'Guarantee profit', 'Fix prices'], answer: 1 },
  { q: 'Compounding means…', options: ['Returns stay flat', 'Returns can earn returns', 'Fees shrink', 'Prices never move'], answer: 1 },
  { q: 'Liquidity describes…', options: ['How fast an asset becomes cash', 'Height of past returns', 'Tax rate', 'Number of owners'], answer: 0 },
  { q: 'A budget is…', options: ['A plan for money in and out', 'A price guarantee', 'A stock exchange', 'A share class'], answer: 0 },
  { q: 'Inflation reduces…', options: ['Your purchasing power', 'Your share count', 'Bank opening hours', 'Dividend dates'], answer: 0 },
  { q: 'Principal is…', options: ['The original borrowed amount', 'A dividend', 'A trading fee', 'A share price'], answer: 0 },
  { q: 'Past performance…', options: ['Guarantees the future', 'Says nothing certain about the future', 'Predicts inflation', 'Sets interest rates'], answer: 1 },
];

export function TickerSniper({ onFinish }: SoloGameProps) {
  const deck = useMemo(() => [...PROMPTS].sort(() => Math.random() - 0.5).slice(0, 8), []);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const end = (finalScore: number, finalStreak: number) => {
    if (finished) return;
    setFinished(true);
    const credits = finalScore * 22 + finalStreak * 15;
    sfx.reward();
    onFinish({
      credits,
      liberals: 3 + Math.floor(finalScore / 3),
      won: finalScore >= 4,
      score: finalScore,
      title: `Ticker Sniper · ${finalScore} correct`,
      message: `${finalScore} of ${deck.length} prompts in 45 seconds with a ${finalStreak}-streak finish. ${credits} Credits for the quick reading.`,
    });
  };

  useEffect(() => {
    if (finished) return undefined;
    const interval = setInterval(() => {
      setTimeLeft(value => {
        if (value <= 1) {
          clearInterval(interval);
          end(score, streak);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, score, streak]);

  const answer = (choice: number) => {
    if (finished) return;
    const prompt = deck[index];
    const correct = choice === prompt.answer;
    const nextScore = score + (correct ? 1 : 0);
    const nextStreak = correct ? streak + 1 : 0;
    setScore(nextScore);
    setStreak(nextStreak);
    setFeedback(correct ? 'Correct — payout up.' : 'Missed. Streak reset.');
    if (correct) sfx.good();
    else sfx.bad();
    if (index === deck.length - 1) {
      end(nextScore, nextStreak);
      return;
    }
    setIndex(value => value + 1);
  };

  const prompt = deck[Math.min(index, deck.length - 1)];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip chip-flame">⏱ {timeLeft}s</span>
        <span className="chip chip-lime">SCORE {score}</span>
        <span className="chip">STREAK {streak}</span>
        <span className="chip">Q {index + 1}/{deck.length}</span>
      </div>
      <div className="meter h-2">
        <i style={{ width: `${(timeLeft / 45) * 100}%` }} />
      </div>
      <h3 className="text-lg text-cream-100">{prompt.q}</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {prompt.options.map((option, position) => (
          <button key={option} className="jelly-flat p-3 text-left text-xs text-cream-100 transition hover:neon-edge-flame" onClick={() => answer(position)} disabled={finished}>
            <span className="mr-2 font-mono text-flame-300">{String.fromCharCode(65 + position)}</span>
            {option}
          </button>
        ))}
      </div>
      {feedback && <div className="text-[11px] text-lime-300">{feedback}</div>}
      <p className="text-[11px] text-white/45">Every prompt is a teaching moment. Speed multiplies the payout; accuracy builds the streak.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Interest Ladder — compounding, rung by rung.
 * ------------------------------------------------------------------ */
function ladder(level: number) {
  const principal = 100 * Math.pow(2, level % 3);
  const rate = [5, 8, 12, 15][level % 4];
  const years = 2 + (level % 3);
  const amount = Math.round(principal * Math.pow(1 + rate / 100, years));
  return { principal, rate, years, amount, question: `${principal} Credits at ${rate}% compound interest for ${years} years — roughly how much do you end with?` };
}

export function InterestLadder({ onFinish }: SoloGameProps) {
  const [rung, setRung] = useState(0);
  const [lives, setLives] = useState(3);
  const [earned, setEarned] = useState(0);
  const [level, setLevel] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [slip, setSlip] = useState(0);
  const round = useMemo(() => ladder(level), [level]);

  const options = useMemo(() => {
    const set = new Set<number>([round.amount]);
    while (set.size < 4) {
      const drift = round.amount * (0.55 + Math.random() * 0.9);
      set.add(Math.max(1, Math.round(drift)));
    }
    return [...set].sort(() => Math.random() - 0.5);
  }, [round]);

  const end = (finalRung: number, finalEarned: number) => {
    if (finished) return;
    setFinished(true);
    sfx.reward();
    onFinish({
      credits: finalEarned,
      liberals: 3 + finalRung,
      won: finalRung >= 4,
      score: finalRung,
      title: `Interest Ladder · rung ${finalRung}`,
      message: `Climbed ${finalRung} rungs and banked ${finalEarned} Credits of simulated compounding payout.`,
    });
  };

  const answer = (value: number) => {
    if (finished) return;
    if (value === round.amount) {
      const nextRung = rung + 1;
      const gain = 20 + nextRung * 12;
      setRung(nextRung);
      setEarned(total => total + gain);
      setLevel(value => value + 1);
      setFeedback(`Exactly ${round.amount.toLocaleString()} Credits. +${gain}.`);
      sfx.perfect();
      if (nextRung >= 10) end(nextRung, earned + gain);
    } else {
      const nextLives = lives - 1;
      setLives(nextLives);
      setSlip(value => value + 1);
      setLevel(value => Math.max(0, value - 1));
      setFeedback(`Closer to ${round.amount.toLocaleString()} Credits. One rung down.`);
      sfx.bad();
      if (nextLives <= 0) end(Math.max(0, rung - 1), earned);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip chip-lime">RUNG {rung}/10</span>
        <span className="chip chip-flame">¢ {earned}</span>
        <span className="chip">{'❤️'.repeat(Math.max(0, lives))}</span>
        <span className="chip">SLIPS {slip}</span>
      </div>
      <div className="flex items-end gap-1">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className={`flex-1 rounded-t-md border border-white/10 ${index < rung ? 'bg-gradient-to-t from-flame-500 to-lime-400' : 'bg-white/6'}`} style={{ height: 18 + index * 7 }} />
        ))}
      </div>
      <h3 className="text-lg text-cream-100">{round.question}</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map(option => (
          <button key={option} className="jelly-flat p-3 text-left font-mono text-sm text-cream-100 transition hover:neon-edge-lime" onClick={() => answer(option)} disabled={finished}>
            {option.toLocaleString()} cr
          </button>
        ))}
      </div>
      {feedback && <div className="text-[11px] text-lime-300">{feedback}</div>}
      <p className="text-[11px] text-white/45">Compound growth: amount = principal × (1 + rate)^years. Every wrong answer costs a heart and one rung.</p>
    </div>
  );
}
