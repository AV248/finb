import React, { useEffect, useRef, useState } from 'react';
import { GAMES, STOCKS, formatCredits } from '../lib.js';

const trivia = [
  { question: 'A share of a company is…', choices: ['A small ownership stake', 'A guaranteed interest payment', 'A short-term loan to a bank', 'A coupon for its products'], answer: 0, note: 'A share represents fractional ownership; its value can rise or fall.' },
  { question: 'Diversifying an investment portfolio is mainly an attempt to…', choices: ['Remove every risk', 'Spread exposure across different assets', 'Guarantee a profit', 'Avoid tracking performance'], answer: 1, note: 'Diversification can spread risk. It does not remove it or guarantee returns.' },
  { question: 'Compound growth means…', choices: ['Growth is always identical each year', 'Returns can earn returns over time', 'An asset cannot lose value', 'Fees are added to principal'], answer: 1, note: 'Compounding happens when accumulated returns themselves begin to earn returns.' },
  { question: 'A budget is best described as…', choices: ['A plan for how money is earned and used', 'A guarantee that prices will stay fixed', 'A type of stock exchange', 'A measure of a company’s share count'], answer: 0, note: 'A budget is a plan for income, spending, and saving over a period.' },
  { question: 'If an asset’s price falls by 20%, a 20% rise from the new price…', choices: ['Returns it exactly to the original price', 'Leaves it below the original price', 'Pushes it above the original price', 'Has no effect'], answer: 1, note: 'Percentages use different starting bases: 100 → 80 → 96.' },
  { question: 'Liquidity usually refers to…', choices: ['How quickly an asset may be converted to cash', 'The height of its past return', 'Its tax rate', 'How many people own it'], answer: 0, note: 'Liquidity describes how readily something can be traded without a large price impact.' },
];

const quickChallengeBank = {
  'unit-price': { question: 'Which little basket has the lower price per piece?', choices: ['5 for 2 Credits', '8 for 4 Credits', 'They cost the same per piece', 'There is not enough information'], answer: 0, note: 'The first basket is 0.4 Credits per piece; the second is 0.5.' },
  'percent-pop': { question: 'A share falls from 100 to 80 Credits. What rise from 80 returns it to 100?', choices: ['20%', '25%', '10%', '80%'], answer: 1, note: 'The 20-Credit recovery is 25% of the new 80-Credit base.' },
  'asset-spot': { question: 'Which is most clearly a productive business asset?', choices: ['A working oven used by a bakery', 'An unpaid electricity bill', 'A week of advertising spend', 'A customer complaint'], answer: 0, note: 'An oven is a resource the business uses to operate; this is a simplified game example.' },
  'budget-beat': { question: 'What is a budget doing at its most basic?', choices: ['Planning expected income and outflows', 'Guaranteeing a future return', 'Predicting every market price', 'Removing all financial uncertainty'], answer: 0, note: 'A budget is a plan, not a promise or a forecast that must come true.' },
  'liquid-lasso': { question: 'Which asset is usually easiest to spend or transfer quickly?', choices: ['Cash balance', 'A family house', 'A custom-built sculpture', 'A five-year lockup'], answer: 0, note: 'Cash is usually more liquid than property or an asset with a lockup.' },
  'risk-radar': { question: 'Diversification is mainly an attempt to…', choices: ['Spread exposure across different assets', 'Guarantee a profit', 'Remove every kind of risk', 'Make every asset move together'], answer: 0, note: 'Diversification can spread risk; it cannot eliminate risk or promise returns.' },
  'inflation-ink': { question: 'If prices rise while your Credits stay the same, those Credits usually…', choices: ['Buy fewer goods', 'Buy more goods', 'Become a company share', 'Gain guaranteed interest'], answer: 0, note: 'Inflation can reduce purchasing power when prices rise faster than your balance.' },
  'revenue-rush': { question: 'A tiny shop sells 90 cr and spends 65 cr. Before other items, what is the result?', choices: ['25 cr operating surplus', '155 cr profit', '65 cr revenue', '90 cr loss'], answer: 0, note: 'Revenue minus those costs is 25 Credits in this simplified example.' },
  'fee-finder': { question: 'What belongs in the total cost of a subscription?', choices: ['Recurring fees as well as the headline price', 'Only the first day’s price', 'Only its bright marketing banner', 'A competitor’s stock price'], answer: 0, note: 'Recurring charges and applicable fees matter when comparing total cost.' },
  'red-flag': { question: 'A stranger asks you to forward a one-time sign-in code. Best move?', choices: ['Keep it private and stop the request', 'Send it if they sound friendly', 'Post it in your public profile', 'Reuse it as a card CVV'], answer: 0, note: 'Never share one-time authentication codes or passwords.' },
  'compound-pop': { question: 'What makes compound growth different from simple growth?', choices: ['Past returns can earn returns too', 'It can never go down', 'It has no uncertainty', 'It guarantees a fixed payout'], answer: 0, note: 'Compounding means returns may themselves begin to earn returns.' },
  'portfolio-pick': { question: 'Which portfolio is more diversified in this tiny example?', choices: ['Several different asset types', 'Only one company share', 'One collectible in three boxes', 'Only one market sector'], answer: 0, note: 'Different exposures can spread concentration risk, but do not remove it.' },
  'debt-detector': { question: 'The amount originally borrowed is the…', choices: ['Principal', 'Dividend', 'Spread', 'Liquidity'], answer: 0, note: 'Principal is the original amount borrowed, before interest and fees.' },
  'market-mirror': { question: 'A share rose last month. What does that tell you about next month?', choices: ['Nothing guaranteed; future prices can differ', 'It must rise again', 'It cannot fall now', 'The company owes a dividend'], answer: 0, note: 'Past performance is not a guarantee or reliable promise of future results.' },
  'dividend-dash': { question: 'A company dividend is best described as…', choices: ['A distribution that can change or stop', 'Guaranteed interest on every share', 'A share-price floor', 'A bank-card security code'], answer: 0, note: 'Companies may change, reduce, or stop distributions; they are not guaranteed.' },
};
const multiplayerIds = new Set(['duel', 'rally', 'quizduel', 'sprintduel']);
const quickChallengeIds = new Set(Object.keys(quickChallengeBank).concat(['ticker-tap']));

function createQuickPrompt(gameId, db) {
  let prompt = quickChallengeBank[gameId];
  if (gameId === 'ticker-tap') {
    const stocks = [...STOCKS].sort(() => Math.random() - 0.5).slice(0, 4);
    const quotes = db?.market?.quotes || {};
    const richest = stocks.reduce((best, stock) => (quotes[stock.symbol]?.price || stock.base) > (quotes[best.symbol]?.price || best.base) ? stock : best, stocks[0]);
    prompt = { question: 'Which ticker has the highest simulated share price right now?', choices: stocks.map(stock => `${stock.symbol} · ${formatCredits(quotes[stock.symbol]?.price || stock.base, 2)} cr`), answer: stocks.findIndex(stock => stock.symbol === richest.symbol), note: 'The ticker prices move on a random-walk simulation; a higher price is not a better investment.' };
  }
  if (!prompt) return null;
  const shuffled = prompt.choices.map((choice, index) => ({ choice, correct: index === prompt.answer })).sort(() => Math.random() - 0.5);
  return { ...prompt, choices: shuffled.map(item => item.choice), answer: shuffled.findIndex(item => item.correct) };
}

const memorySymbols = ['◒', '✳', '◇', '▰'];
const displayNames = {
  reaction: 'Blink & Bank',
  cipher: 'The 4-digit vault',
  quiz: 'Ledger Logic',
  memory: 'Memory Mint',
  sprint: 'Signal Sprint',
  vault21: 'Vault 21',
  forecast: 'Forecast Frenzy',
  duel: 'FAF Market Duel',
  'unit-price': 'Penny Arcade',
  'percent-pop': 'Rebound Room',
  'asset-spot': 'Asset Safari',
  'budget-beat': 'Budget Beat',
  'liquid-lasso': 'Liquid Lasso',
  'risk-radar': 'Risk Radar',
  'inflation-ink': 'Inflation Ink',
  'revenue-rush': 'Revenue Rush',
  'fee-finder': 'Fee Finder',
  'red-flag': 'Red Flag Relay',
  'compound-pop': 'Compound Pop',
  'ticker-tap': 'Ticker Tap',
  'portfolio-pick': 'Portfolio Pick',
  'debt-detector': 'Debt Detective',
  'market-mirror': 'Market Mirror',
  'dividend-dash': 'Dividend Dash',
  rally: 'FAF Market Rally',
  quizduel: 'FAF Ledger Ladder',
  sprintduel: 'FAF Sprint Circuit',
};

function newCode() {
  const digits = '0123456789'.split('').sort(() => Math.random() - 0.5);
  return digits.slice(0, 4).join('');
}

function newSequence() {
  return Array.from({ length: 5 }, () => memorySymbols[Math.floor(Math.random() * memorySymbols.length)]);
}

export default function GameModal({ gameId, user, db, opponent, onClose, onComplete, onMoveMarket }) {
  const [phase, setPhase] = useState('idle');
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState('');
  const [targetCode, setTargetCode] = useState(newCode);
  const [guess, setGuess] = useState('');
  const [clues, setClues] = useState([]);
  const [quizSet, setQuizSet] = useState(() => [...trivia].sort(() => Math.random() - 0.5).slice(0, 3));
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [sequence, setSequence] = useState(newSequence);
  const [memoryProgress, setMemoryProgress] = useState([]);
  const [sprintCount, setSprintCount] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(8);
  const [stake, setStake] = useState(10);
  const [marketSymbol, setMarketSymbol] = useState('NVA');
  const [direction, setDirection] = useState('up');
  const [quickPrompt, setQuickPrompt] = useState(() => createQuickPrompt(gameId, db));
  const [rallyRound, setRallyRound] = useState(1);
  const [rallyPlayerScore, setRallyPlayerScore] = useState(0);
  const [rallyRivalScore, setRallyRivalScore] = useState(0);
  const [rivalQuizScore, setRivalQuizScore] = useState(0);
  const [opponentSprintCount] = useState(() => 19 + Math.floor(Math.random() * 18));
  const startedAt = useRef(0);
  const reactionTimer = useRef(null);
  const reactionMissTimer = useRef(null);
  const memoryTimer = useRef(null);
  const marketTimer = useRef(null);
  const roundNumber = useRef(0);
  const completedRounds = useRef(new Set());
  const sprintCountRef = useRef(0);

  useEffect(() => () => {
    window.clearTimeout(reactionTimer.current);
    window.clearTimeout(reactionMissTimer.current);
    window.clearTimeout(memoryTimer.current);
    window.clearTimeout(marketTimer.current);
  }, []);

  useEffect(() => {
    if (phase !== 'sprint') return undefined;
    const endAt = Date.now() + 8000;
    const interval = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (Date.now() >= endAt) finishSprint();
    }, 100);
    return () => window.clearInterval(interval);
    // The click count is read from a ref so the clock doesn't restart on each tap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const complete = (payload) => {
    const round = roundNumber.current;
    if (completedRounds.current.has(round)) return;
    completedRounds.current.add(round);
    setResult(payload);
    setPhase('result');
    setMessage(payload.message || 'Round complete.');
    onComplete({ gameId, ...payload });
  };

  const resetRound = () => {
    roundNumber.current += 1;
    setResult(null);
    setMessage('');
    setPhase('idle');
  };

  const startReaction = () => {
    window.clearTimeout(reactionTimer.current);
    window.clearTimeout(reactionMissTimer.current);
    resetRound();
    setPhase('waiting');
    setMessage('Hold your nerve. Not yet.');
    const delay = 1300 + Math.random() * 2400;
    reactionTimer.current = window.setTimeout(() => {
      setPhase('go');
      setMessage('NOW.');
      startedAt.current = performance.now();
      reactionMissTimer.current = window.setTimeout(() => {
        complete({ credits: 0, liberals: 0, won: false, title: 'Blink & Bank · missed the flash', message: 'A little too patient. The moment slipped past.' });
      }, 3500);
    }, delay);
  };

  const hitReaction = () => {
    if (phase === 'waiting') {
      window.clearTimeout(reactionTimer.current);
      complete({ credits: 0, liberals: 0, won: false, title: 'Blink & Bank · false start', message: 'False start. The vault is very strict about green.' });
      return;
    }
    if (phase !== 'go') return;
    window.clearTimeout(reactionMissTimer.current);
    const milliseconds = Math.round(performance.now() - startedAt.current);
    const credits = milliseconds < 260 ? 40 : milliseconds < 390 ? 30 : milliseconds < 600 ? 20 : milliseconds < 900 ? 10 : 5;
    const liberals = milliseconds < 390 ? 2 : milliseconds < 600 ? 1 : 0;
    complete({ credits, liberals, won: milliseconds < 600, reactionMs: milliseconds, title: `Blink & Bank · ${milliseconds} ms`, message: `${milliseconds} ms. ${milliseconds < 260 ? 'Ridiculously quick.' : milliseconds < 500 ? 'Sharp hands.' : 'Every millisecond counts.'}` });
  };

  const submitCipher = (event) => {
    event.preventDefault();
    if (phase === 'result' || !/^\d{4}$/.test(guess)) return;
    const exact = guess.split('').filter((digit, index) => digit === targetCode[index]).length;
    const close = guess.split('').filter((digit, index) => targetCode.includes(digit) && digit !== targetCode[index]).length;
    const nextClues = [...clues, { guess, exact, close }];
    setClues(nextClues);
    setGuess('');
    if (exact === 4) {
      complete({ credits: 35, liberals: 4, won: true, title: 'The 4-digit vault · cracked', message: `Clean break. You found ${targetCode} in ${nextClues.length} ${nextClues.length === 1 ? 'try' : 'tries'}.` });
    } else if (nextClues.length >= 6) {
      complete({ credits: 0, liberals: 0, won: false, title: 'The 4-digit vault · timed out', message: `The code was ${targetCode}. The vault resets whenever you're ready.` });
    }
  };

  const answerQuiz = (choice) => {
    if (phase === 'result') return;
    const question = quizSet[quizIndex];
    const correct = choice === question.answer;
    const nextScore = quizScore + (correct ? 1 : 0);
    setQuizScore(nextScore);
    const rivalCorrect = gameId === 'quizduel' && Math.random() < 0.67;
    const nextRivalScore = rivalQuizScore + (rivalCorrect ? 1 : 0);
    if (gameId === 'quizduel') setRivalQuizScore(nextRivalScore);
    if (quizIndex < quizSet.length - 1) {
      setMessage(gameId === 'quizduel'
        ? `You ${nextScore} · ${opponent?.username || 'Rival'} ${nextRivalScore}. ${question.note}`
        : (correct ? `Exactly. ${question.note}` : `Not quite. ${question.note}`));
      setQuizIndex(index => index + 1);
      return;
    }
    if (gameId === 'quizduel') {
      const won = nextScore > nextRivalScore;
      const tied = nextScore === nextRivalScore;
      complete({
        credits: (won ? 38 : tied ? 20 : 8) + nextScore * 4,
        liberals: won ? 6 : tied ? 2 : nextScore,
        won,
        title: `FAF Ledger Ladder · ${nextScore} to ${nextRivalScore}`,
        message: `${nextScore} correct versus ${nextRivalScore} for ${opponent?.username || 'your rival'}. ${won ? 'Top rung is yours.' : tied ? 'A perfect tie. Very civilised.' : 'Good match. The ladder is yours to climb again.'}`,
      });
      return;
    }
    const perfect = nextScore === quizSet.length;
    complete({
      credits: nextScore * 12 + (perfect ? 15 : 0),
      liberals: nextScore + (perfect ? 3 : 0),
      won: nextScore > 0,
      title: `Ledger Logic · ${nextScore} of ${quizSet.length}`,
      message: perfect ? 'A perfect little ledger. Keep the real-world caveats in mind.' : `${nextScore} right. ${question.note}`,
    });
  };

  const answerQuick = (choice) => {
    if (phase === 'result' || !quickPrompt) return;
    const correct = choice === quickPrompt.answer;
    complete({
      credits: correct ? 18 : 4,
      liberals: correct ? 3 : 0,
      won: correct,
      title: `${title || 'Quick challenge'} · ${correct ? 'nailed it' : 'new angle'}`,
      message: `${correct ? 'Brightly done.' : 'Good puzzle; keep the note.'} ${quickPrompt.note}`,
    });
  };

  const startMemory = () => {
    setSequence(newSequence());
    setMemoryProgress([]);
    setMessage('Memorize the sequence…');
    setPhase('showing');
    window.clearTimeout(memoryTimer.current);
    memoryTimer.current = window.setTimeout(() => setPhase(current => current === 'showing' ? 'memory-input' : current), 1450);
  };

  const tapMemory = (symbol) => {
    if (phase !== 'memory-input') return;
    const index = memoryProgress.length;
    const next = [...memoryProgress, symbol];
    setMemoryProgress(next);
    if (symbol !== sequence[index]) {
      complete({ credits: 0, liberals: 0, won: false, title: 'Memory Mint · sequence slipped', message: `The pattern was ${sequence.join('  ')}. Your memory is still legal tender here.` });
      return;
    }
    if (next.length === sequence.length) {
      complete({ credits: 28, liberals: 4, won: true, title: 'Memory Mint · stamped', message: 'Perfect recall. Five symbols, one very tidy brain.' });
    }
  };

  const startSprint = () => {
    resetRound();
    sprintCountRef.current = 0;
    setSprintCount(0);
    setSecondsLeft(8);
    setPhase('sprint');
  };

  const tapSprint = () => {
    if (phase !== 'sprint') return;
    sprintCountRef.current += 1;
    setSprintCount(sprintCountRef.current);
  };

  const finishSprint = () => {
    if (phase !== 'sprint') return;
    const count = sprintCountRef.current;
    if (gameId === 'sprintduel') {
      const won = count > opponentSprintCount;
      const tied = count === opponentSprintCount;
      complete({ credits: won ? 45 : tied ? 24 : 8, liberals: won ? 6 : tied ? 3 : 1, won, title: `FAF Sprint Circuit · ${count}–${opponentSprintCount}`, message: `${count} taps to ${opponentSprintCount} for ${opponent?.username || 'your rival'}. ${won ? 'The circuit is yours.' : tied ? 'A dead-even sprint.' : 'Strong thumbs from both sides; run it back.'}` });
      return;
    }
    const credits = Math.min(40, count * 2);
    const liberals = count >= 18 ? 2 : count >= 10 ? 1 : 0;
    complete({ credits, liberals, won: count >= 10, title: `Signal Sprint · ${count} taps`, message: `${count} clean taps. ${credits} Credits have cleared the sprint.` });
  };

  const playVault = (pick) => {
    if (Number(user.credits) < stake) return;
    const dice = [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
    const roll = dice[0] + dice[1];
    if (roll === 7) {
      complete({ dice, credits: 0, liberals: 0, won: false, title: `Vault 21 · ${roll}`, message: 'Seven. The bank returns your stake — no loss, no drama.' });
    } else {
      const win = pick === 'low' ? roll <= 6 : roll >= 8;
      const net = win ? stake : -stake;
      complete({ dice, credits: net, liberals: win ? 1 : 0, won: win, title: `Vault 21 · rolled ${roll}`, message: `${roll} is ${win ? 'your side' : 'the other side'}. Net ${win ? '+' : '−'}${formatCredits(stake)} Credits.` });
    }
  };

  const settleForecast = (isDuel = false, pick = direction) => {
    if (!isDuel && phase === 'thinking') return;
    const symbol = isDuel ? STOCKS[Math.floor(Math.random() * STOCKS.length)].symbol : marketSymbol;
    setPhase('thinking');
    setMessage('The exchange is opening the next tick…');
    window.clearTimeout(marketTimer.current);
    marketTimer.current = window.setTimeout(() => {
      const move = onMoveMarket(symbol);
      const actual = move.next >= move.previous ? 'up' : 'down';
      if (isDuel) {
        const opponentPick = Math.random() < 0.5 ? 'up' : 'down';
        const playerCorrect = pick === actual;
        const opponentCorrect = opponentPick === actual;
        if (gameId === 'rally') {
          const nextPlayer = rallyPlayerScore + (playerCorrect ? 1 : 0);
          const nextRival = rallyRivalScore + (opponentCorrect ? 1 : 0);
          if (rallyRound < 3) {
            setRallyPlayerScore(nextPlayer);
            setRallyRivalScore(nextRival);
            setRallyRound(round => round + 1);
            setPhase('round-ready');
            setMessage(`${symbol} went ${actual.toUpperCase()}. Score ${nextPlayer}–${nextRival}; call round ${rallyRound + 1}.`);
            return;
          }
          const won = nextPlayer > nextRival;
          const tied = nextPlayer === nextRival;
          const outcome = won ? 'rally won' : tied ? 'rally tied' : 'rival takes the rally';
          complete({ credits: nextPlayer * 12 + (won ? 24 : tied ? 12 : 0), liberals: nextPlayer * 2 + (won ? 4 : tied ? 2 : 0), won, title: `FAF Market Rally · ${nextPlayer}–${nextRival}`, message: `Final score ${nextPlayer}–${nextRival}. You ${outcome}. The three market ticks were simulated; there was no entry fee.` });
        } else {
          const credits = playerCorrect ? (opponentCorrect ? 15 : 40) : (opponentCorrect ? 0 : 5);
          const liberals = playerCorrect ? (opponentCorrect ? 2 : 5) : 0;
          const outcome = playerCorrect ? (opponentCorrect ? 'A dead heat' : 'You take the round') : (opponentCorrect ? `${opponent?.username || 'Your rival'} called it` : 'Both calls missed');
          complete({ credits, liberals, won: playerCorrect, title: `FAF duel · ${outcome}`, message: `${symbol} closed ${actual.toUpperCase()} at ${formatCredits(move.next, 2)}. ${outcome}. No entry fee, no hard feelings.` });
        }
      } else {
        const won = pick === actual;
        complete({ credits: won ? 30 : 0, liberals: won ? 3 : 0, won, title: `Forecast Frenzy · ${symbol} ${actual}`, message: `${symbol} went ${actual.toUpperCase()} to ${formatCredits(move.next, 2)}. ${won ? 'Nice read.' : 'The market zigged.'} No credits were staked.` });
      }
    }, 950);
  };

  const restartCipher = () => {
    roundNumber.current += 1;
    setTargetCode(newCode());
    setClues([]);
    setGuess('');
    setResult(null);
    setPhase('idle');
    setMessage('');
  };

  const restartQuiz = () => {
    roundNumber.current += 1;
    setQuizSet([...trivia].sort(() => Math.random() - 0.5).slice(0, 3));
    setQuizIndex(0);
    setQuizScore(0);
    setRivalQuizScore(0);
    setResult(null);
    setPhase('idle');
    setMessage('');
  };

  const restartQuick = () => {
    roundNumber.current += 1;
    setQuickPrompt(createQuickPrompt(gameId, db));
    setResult(null);
    setPhase('idle');
    setMessage('');
  };

  const restartMemory = () => {
    roundNumber.current += 1;
    setSequence(newSequence());
    setMemoryProgress([]);
    setResult(null);
    setPhase('idle');
    setMessage('');
  };

  const restartStandard = () => {
    if (gameId === 'cipher') return restartCipher();
    if (gameId === 'quiz' || gameId === 'quizduel') return restartQuiz();
    if (gameId === 'memory') return restartMemory();
    if (gameId === 'sprint' || gameId === 'sprintduel') return startSprint();
    if (gameId === 'reaction') return startReaction();
    if (quickChallengeIds.has(gameId)) return restartQuick();
    if (gameId === 'rally') {
      roundNumber.current += 1;
      setRallyRound(1);
      setRallyPlayerScore(0);
      setRallyRivalScore(0);
    }
    roundNumber.current += 1;
    setResult(null);
    setMessage('');
    setPhase('idle');
  };

  const title = displayNames[gameId] || 'FINB game';
  const closeOnBackdrop = (event) => {
    if (event.target === event.currentTarget) onClose();
  };
  const activeQuestion = quizSet[quizIndex];
  const marketQuote = db.market.quotes[marketSymbol];
  const gameDefinition = GAMES.find(game => game.id === gameId);
  const isMultiplayer = multiplayerIds.has(gameId);

  return (
    <div className="modal-scrim" onMouseDown={closeOnBackdrop}>
      <section className={`game-modal game-modal-${gameId}`} role="dialog" aria-modal="true" aria-labelledby="game-modal-title">
        <div className="modal-cap">
          <div className="modal-kicker"><span className="live-pip" /> FINB PLAY FLOOR <span className="cap-slash">/</span> {isMultiplayer ? 'FAF MULTIPLAYER MATCH' : 'ROUND IN PROGRESS'}</div>
          <button className="icon-button modal-close" type="button" onClick={onClose} aria-label="Close game">×</button>
        </div>
        <div className="game-modal-head">
          <div className={`game-emblem emblem-${gameId}`}>{gameId === 'vault21' ? '21' : gameId === 'cipher' ? '⌘' : gameId === 'quiz' || gameId === 'quizduel' ? '∑' : gameId === 'memory' ? '▦' : gameId === 'sprint' || gameId === 'sprintduel' ? '⌁' : gameDefinition?.icon || '↗'}</div>
          <div>
            <h2 id="game-modal-title">{title}</h2>
            <p>{isMultiplayer ? `Matched with ${opponent?.username || 'a random-floor player'}` : gameId === 'vault21' ? 'Virtual Credits only · no outside value' : quickChallengeIds.has(gameId) ? 'One bright little skill challenge. No stake; fictional Credits only.' : 'One round. All play. No real-world value.'}</p>
          </div>
          {isMultiplayer && <div className="opponent-chip"><span className="avatar avatar-small">{String(opponent?.username || 'F').slice(0, 1)}</span><span><small>YOUR RIVAL</small><b>{opponent?.username || 'Random player'}</b></span></div>}
        </div>

        {gameId === 'reaction' && (
          <div className="reaction-board">
            <div className={`reaction-orbit reaction-${phase}`}><span className="orbit-label">{phase === 'go' ? 'GO' : phase === 'waiting' ? 'WAIT' : phase === 'result' ? (result?.won ? 'NICE' : 'OOPS') : 'READY'}</span><i /></div>
            <p className="game-instruction">{phase === 'idle' ? 'Tap start. Wait for the field to turn citron, then hit the button.' : message || 'Hold steady…'}</p>
            {phase === 'result' ? <ResultPanel result={result} onAgain={restartStandard} /> : phase === 'idle' ? <button className="button button-dark button-wide" onClick={startReaction}>Start the clock <span>↗</span></button> : <button className={`button button-wide reaction-hit ${phase === 'go' ? 'is-go' : 'is-wait'}`} onClick={hitReaction}>{phase === 'go' ? 'HIT IT' : 'WAIT FOR GREEN'}</button>}
            <div className="micro-rule"><span>NO ENTRY FEE</span><span>BEST UNDER 260 MS → 40 CR</span></div>
          </div>
        )}

        {gameId === 'cipher' && (
          <div className="cipher-board">
            <div className="cipher-copy"><span className="eyebrow">THE TELLER LEFT CLUES</span><p>Find the secret four-digit code. Digits do not repeat.</p></div>
            <div className="cipher-slots" aria-label={`${clues.length} of 6 attempts`}>{Array.from({ length: 6 }, (_, index) => <span className={index < clues.length ? 'slot-filled' : ''} key={index}>{clues[index]?.guess || '· · · ·'}</span>)}</div>
            {clues.length > 0 && <div className="cipher-clues">{clues.map((item, index) => <div className="clue-row" key={`${item.guess}-${index}`}><code>{item.guess}</code><span><b>{item.exact}</b> in place</span><span><b>{item.close}</b> nearby</span></div>)}</div>}
            {phase === 'result' ? <ResultPanel result={result} onAgain={restartStandard} /> : <form className="cipher-form" onSubmit={submitCipher}><label className="sr-only" htmlFor="cipher-guess">Four-digit guess</label><input id="cipher-guess" inputMode="numeric" autoComplete="off" maxLength={4} minLength={4} pattern="[0-9]{4}" placeholder="0000" value={guess} onChange={event => setGuess(event.target.value.replace(/\D/g, '').slice(0, 4))} required /><button className="button button-dark" disabled={guess.length !== 4}>Try the vault <span>↗</span></button></form>}
            <div className="micro-rule"><span>{6 - clues.length} TRIES LEFT</span><span>35 CR + 4 LP IF CRACKED</span></div>
          </div>
        )}

        {(gameId === 'quiz' || gameId === 'quizduel') && (
          <div className="quiz-board">
            {phase === 'result' ? <ResultPanel result={result} onAgain={restartStandard} /> : <>
              <div className="quiz-progress"><span>QUESTION {quizIndex + 1} / {quizSet.length}</span><div>{quizSet.map((_, index) => <i className={index < quizIndex ? 'done' : index === quizIndex ? 'current' : ''} key={index} />)}</div><b>{gameId === 'quizduel' ? `${quizScore} — ${rivalQuizScore}` : `${quizScore} right`}</b></div>
              <h3>{activeQuestion?.question}</h3>
              <div className="answer-list">{activeQuestion?.choices.map((choice, index) => <button key={choice} className="answer-option" onClick={() => answerQuiz(index)}><span>{String.fromCharCode(65 + index)}</span>{choice}<b>↗</b></button>)}</div>
              {message && <div className="inline-feedback">{message}</div>}
            </>}
            <div className="micro-rule"><span>LEARN A LITTLE</span><span>SIMULATION, NOT FINANCIAL ADVICE</span></div>
          </div>
        )}

        {quickChallengeIds.has(gameId) && quickPrompt && (
          <div className="quick-challenge-board">
            {phase === 'result' ? <ResultPanel result={result} onAgain={restartStandard} /> : <>
              <div className="quick-challenge-top"><span className="eyebrow">CHALLENGE / 01</span><span>+18 CR · +3 LP</span></div>
              <h3>{quickPrompt.question}</h3>
              <div className="answer-list quick-answer-list">{quickPrompt.choices.map((choice, index) => <button key={`${index}-${choice}`} className="answer-option" onClick={() => answerQuick(index)}><span>{String.fromCharCode(65 + index)}</span>{choice}<b>↗</b></button>)}</div>
            </>}
            <div className="micro-rule"><span>NO ENTRY FEE</span><span>LEARN · PLAY · REPEAT</span></div>
          </div>
        )}

        {gameId === 'memory' && (
          <div className="memory-board">
            <p className="game-instruction">{phase === 'idle' ? 'A five-symbol sequence flashes once. Play it back in order.' : phase === 'showing' ? 'Keep your eyes on the mint.' : phase === 'memory-input' ? `Your turn · ${memoryProgress.length} of ${sequence.length}` : message}</p>
            <div className={`memory-preview ${phase === 'showing' ? 'is-showing' : ''}`} aria-live="polite">{phase === 'showing' ? sequence.map((symbol, index) => <span style={{ animationDelay: `${index * 180}ms` }} key={`${symbol}-${index}`}>{symbol}</span>) : phase === 'memory-input' ? memoryProgress.map((symbol, index) => <span key={`${symbol}-${index}`}>{symbol}</span>) : phase === 'result' ? (result?.won ? '✳  ✳  ✳' : '◌  ◌  ◌') : '✳  ◇  ◒'}</div>
            {phase === 'result' ? <ResultPanel result={result} onAgain={restartStandard} /> : phase === 'idle' ? <button className="button button-dark button-wide" onClick={startMemory}>Show me the pattern <span>↗</span></button> : phase === 'memory-input' ? <div className="symbol-pad">{memorySymbols.map(symbol => <button key={symbol} onClick={() => tapMemory(symbol)} aria-label={`Choose ${symbol}`}>{symbol}</button>)}</div> : <div className="waiting-note"><i className="loader-dot" /> Memorize…</div>}
            <div className="micro-rule"><span>FIVE SYMBOLS</span><span>28 CR + 4 LP</span></div>
          </div>
        )}

        {(gameId === 'sprint' || gameId === 'sprintduel') && (
          <div className="sprint-board">
            <div className="sprint-score"><span><small>YOUR TAPS</small><b>{sprintCount}</b></span><strong>{phase === 'sprint' ? `00:0${secondsLeft}` : '00:08'}</strong><span><small>{gameId === 'sprintduel' ? 'RIVAL TAPS' : 'ROUND'}</small><b>{gameId === 'sprintduel' ? opponentSprintCount : '01'}</b></span></div>
            {phase === 'result' ? <ResultPanel result={result} onAgain={restartStandard} /> : phase === 'sprint' ? <button className="sprint-tap" onClick={tapSprint} aria-label="Tap to sprint"><span>+</span><small>KEEP TAPPING</small></button> : <><p className="game-instruction">{gameId === 'sprintduel' ? `Beat ${opponent?.username || 'your rival'}’s ${opponentSprintCount} taps in eight seconds.` : 'Bank two Credits per tap. A fast little thumb is an asset.'}</p><button className="button button-dark button-wide" onClick={startSprint}>Start 8-second sprint <span>↗</span></button></>}
            <div className="micro-rule"><span>{gameId === 'sprintduel' ? 'FAF · FRIENDLY TAP RACE' : 'CAP: 40 CR'}</span><span>{gameId === 'sprintduel' ? '8 SECONDS · NO ENTRY FEE' : 'NO MULTIPLIER / NO STAKE'}</span></div>
          </div>
        )}

        {gameId === 'vault21' && (
          <div className="vault-board">
            <div className="vault-die-row"><span className="dice-face">{phase === 'result' ? result?.dice?.[0] : '·'}</span><span className="vault-equals">+</span><span className="dice-face">{phase === 'result' ? result?.dice?.[1] : '·'}</span></div>
            <div className="stake-row"><span>YOUR VIRTUAL STAKE</span><div>{[10, 25, 50].map(value => <button className={stake === value ? 'selected' : ''} onClick={() => setStake(value)} disabled={phase === 'result' || Number(user.credits) < value} key={value}>{value} cr</button>)}</div></div>
            {phase === 'result' ? <ResultPanel result={result} onAgain={restartStandard} /> : <>
              <p className="game-instruction">Pick a side of seven. Low is 2–6, high is 8–12. Seven returns your stake.</p>
              <div className="side-picks"><button onClick={() => playVault('low')} disabled={Number(user.credits) < stake}><small>02 — 06</small><b>LOW</b></button><span>7</span><button onClick={() => playVault('high')} disabled={Number(user.credits) < stake}><small>08 — 12</small><b>HIGH</b></button></div>
              {Number(user.credits) < stake && <p className="inline-feedback">Not enough Credits for that stake. Try an earning game first.</p>}
            </>}
            <div className="micro-rule"><span>VIRTUAL CREDITS ONLY</span><span>NO CASH VALUE / NO REAL BETS</span></div>
          </div>
        )}

        {gameId === 'forecast' && (
          <div className="forecast-board">
            {phase === 'result' ? <ResultPanel result={result} onAgain={restartStandard} /> : <>
              <div className="forecast-price"><label htmlFor="forecast-symbol">CHOOSE A SIMULATED SHARE</label><select id="forecast-symbol" value={marketSymbol} onChange={event => setMarketSymbol(event.target.value)} disabled={phase === 'thinking'}>{STOCKS.map(stock => <option value={stock.symbol} key={stock.symbol}>{stock.symbol} · {stock.name}</option>)}</select><b>{formatCredits(marketQuote?.price, 2)} <small>cr / share</small></b></div>
              <p className="game-instruction">Your call: does the next tick go up or down? No Credits at risk.</p>
              <div className="side-picks forecast-picks"><button onClick={() => { setDirection('up'); settleForecast(false, 'up'); }} disabled={phase === 'thinking'}><small>▲ NEXT TICK</small><b>UP</b></button><button onClick={() => { setDirection('down'); settleForecast(false, 'down'); }} disabled={phase === 'thinking'}><small>▼ NEXT TICK</small><b>DOWN</b></button></div>
              {phase === 'thinking' && <div className="waiting-note"><i className="loader-dot" /> {message}</div>}
            </>}
            <div className="micro-rule"><span>30 CR + 3 LP ON A HIT</span><span>SIMULATED MARKET</span></div>
          </div>
        )}

        {(gameId === 'duel' || gameId === 'rally') && (
          <div className="duel-board">
            {phase === 'result' ? <ResultPanel result={result} onAgain={restartStandard} /> : <>
              <div className="duel-matchup"><div><span className="avatar">{String(user.username).slice(0, 1)}</span><small>YOU</small><b>{user.username}</b></div><i>VS</i><div><span className="avatar avatar-rival">{String(opponent?.username || 'F').slice(0, 1)}</span><small>RANDOM FLOOR</small><b>{opponent?.username || 'A new face'}</b></div></div>
              {gameId === 'rally' && <div className="rally-scoreboard"><span>{rallyPlayerScore}</span><small>ROUND {rallyRound} / 3</small><span>{rallyRivalScore}</span></div>}
              <p className="game-instruction">{gameId === 'rally' ? `Round ${rallyRound} of 3. Call the next market tick; correct calls move your side up.` : 'One random share gets one next-tick call. Choose your direction. No entry fee.'}</p>
              <div className="side-picks forecast-picks"><button onClick={() => settleForecast(true, 'up')} disabled={phase === 'thinking'}><small>▲ THE CALL</small><b>UP</b></button><button onClick={() => settleForecast(true, 'down')} disabled={phase === 'thinking'}><small>▼ THE CALL</small><b>DOWN</b></button></div>
              {phase === 'thinking' && <div className="waiting-note"><i className="loader-dot" /> {message}</div>}
              {gameId === 'rally' && phase === 'round-ready' && <div className="inline-feedback">{message}</div>}
            </>}
            <div className="micro-rule"><span>FAF · {gameId === 'rally' ? 'BEST OF THREE' : 'FIND A FRIEND'}</span><span>{gameId === 'rally' ? 'UP TO 60 CR · NO ENTRY FEE' : 'WIN: 40 CR + 5 LP'}</span></div>
          </div>
        )}
        <p className="game-legal">FINB is a fictional game. All Credits and Liberals are in-game points with no monetary value.</p>
      </section>
    </div>
  );
}

function ResultPanel({ result, onAgain }) {
  if (!result) return null;
  const gain = Number(result.credits || 0);
  return (
    <div className={`game-result ${result.won ? 'result-win' : ''}`}>
      <div className="result-stamp">{result.won ? '✳' : '↻'}</div>
      <div><span className="eyebrow">{result.won ? 'ROUND BANKED' : 'ROUND CLOSED'}</span><h3>{result.message}</h3><p>{gain > 0 ? `+${formatCredits(gain)} Credits` : gain < 0 ? `−${formatCredits(Math.abs(gain))} Credits` : 'No Credits moved'}{result.liberals ? ` · +${result.liberals} Liberals` : ''}</p></div>
      <button className="button button-outline" onClick={onAgain}>Play again <span>↻</span></button>
    </div>
  );
}
