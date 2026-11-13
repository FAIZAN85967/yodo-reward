import { useEffect, useRef, useState } from 'react';
import { HelpCircle, RotateCcw, Trophy, Volume2, VolumeX } from 'lucide-react';
import Dice3D, { type DiceRoll } from '@/components/ludo/Dice3D';
import LudoBoard from '@/components/ludo/LudoBoard';
import {
  BASE,
  HOME_PROGRESS,
  LUDO_COLORS,
  PLAYER_COLOR_IDS,
  commitMove,
  createGame,
  legalMoves,
  movePath,
  passTurn,
  type LudoState,
} from '@/components/ludo/ludoEngine';
import Button from '@/components/ui/Button';
import Confetti from '@/components/ui/Confetti';
import Modal from '@/components/ui/Modal';
import { GAME_POINTS } from '@/lib/constants';
import { formatNumber } from '@/lib/format';
import { isSoundEnabled, playCut, playDiceRoll, playMoveStep, playWin, setSoundEnabled } from '@/lib/sound';
import { supabase } from '@/lib/supabase';
import { cardClass } from '@/lib/styles';

const HUMAN_TURN = 0;
const DOOSRA_NAME = 'Doosra Player';
const ROLL_MS = 1100;
const STEP_MS = 230;
const AUTO_MOVE_MS = 450;
const PASS_MS = 900;

interface MovingToken {
  color: number;
  tokenIndex: number;
  progress: number;
  remaining: number[];
}

interface LudoGameProps {
  playerName: string;
  onPointsRecorded: () => Promise<void>;
}

const randomFace = () => Math.floor(Math.random() * 6) + 1;

function startMove(state: LudoState, tokenIndex: number): MovingToken {
  const color = PLAYER_COLOR_IDS[state.turn];
  return {
    color,
    tokenIndex,
    progress: state.tokens[color][tokenIndex],
    remaining: movePath(state, tokenIndex),
  };
}

function someTokenWasCut(before: LudoState, after: LudoState): boolean {
  return PLAYER_COLOR_IDS.some((color) =>
    before.tokens[color].some((progress, i) => progress !== BASE && after.tokens[color][i] === BASE)
  );
}

export default function LudoGame({ playerName, onPointsRecorded }: LudoGameProps) {
  const [game, setGame] = useState<LudoState>(createGame);
  const [roll, setRoll] = useState<DiceRoll>({ id: 0, face: 1 });
  const [rolling, setRolling] = useState(false);
  const [moving, setMoving] = useState<MovingToken | null>(null);
  const [earned, setEarned] = useState<number | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled);
  const recordedRef = useRef(false);

  const names = [playerName, DOOSRA_NAME];
  const busy = rolling || moving !== null;
  const canRoll = !busy && game.dice === null && game.winner === null;
  const isHumanTurn = game.turn === HUMAN_TURN;
  const movable = game.winner === null && !busy ? legalMoves(game) : [];

  const shownTokens = moving
    ? game.tokens.map((row, color) =>
        row.map((progress, i) => (color === moving.color && i === moving.tokenIndex ? moving.progress : progress))
      )
    : game.tokens;

  useEffect(() => {
    if (!rolling) return;
    const id = window.setTimeout(() => {
      setRolling(false);
      setGame((g) => ({ ...g, dice: roll.face }));
    }, ROLL_MS);
    return () => window.clearTimeout(id);
  }, [rolling, roll]);

  useEffect(() => {
    if (game.dice === null || game.winner !== null || busy) return;
    const moves = legalMoves(game);
    if (moves.length === 0) {
      const id = window.setTimeout(() => setGame((g) => passTurn(g)), PASS_MS);
      return () => window.clearTimeout(id);
    }
    if (moves.length === 1) {
      const only = moves[0];
      const id = window.setTimeout(() => setMoving(startMove(game, only)), AUTO_MOVE_MS);
      return () => window.clearTimeout(id);
    }
  }, [game, busy]);

  useEffect(() => {
    if (!moving) return;
    if (moving.remaining.length === 0) {
      const next = commitMove(game, moving.tokenIndex);
      if (someTokenWasCut(game, next)) playCut();
      setGame(next);
      setMoving(null);
      return;
    }
    const id = window.setTimeout(() => {
      playMoveStep();
      setMoving((m) => m && { ...m, progress: m.remaining[0], remaining: m.remaining.slice(1) });
    }, STEP_MS);
    return () => window.clearTimeout(id);
  }, [moving, game]);

  useEffect(() => {
    if (game.winner === null || recordedRef.current) return;
    recordedRef.current = true;
    playWin();
    const won = game.winner === HUMAN_TURN;
    (async () => {
      const { error } = await supabase.rpc('record_ludo_result', { p_won: won });
      if (error) {
        setSaveError(true);
        return;
      }
      setEarned(GAME_POINTS.play + (won ? GAME_POINTS.win : 0));
      await onPointsRecorded();
    })();
  }, [game.winner, onPointsRecorded]);

  const handleRoll = () => {
    if (!canRoll) return;
    const face = randomFace();
    setRoll((prev) => ({ id: prev.id + 1, face }));
    setRolling(true);
    playDiceRoll();
  };

  const handleTokenClick = (tokenIndex: number) => {
    if (busy || !movable.includes(tokenIndex)) return;
    setMoving(startMove(game, tokenIndex));
  };

  const startNewGame = () => {
    recordedRef.current = false;
    setEarned(null);
    setSaveError(false);
    setGame(createGame());
  };

  const toggleSound = () => {
    setSoundEnabled(!soundOn);
    setSoundOn(!soundOn);
  };

  const headline = isHumanTurn ? 'Aapki Baari' : 'Doosre ki Baari';
  const status = (() => {
    if (rolling) return 'Dice ghoom rahi hai...';
    if (moving) return 'Goti chal rahi hai...';
    if (game.dice === null) return isHumanTurn ? 'Dice phenkein' : 'Doosra player dice phenke ga';
    if (movable.length === 0) return `${game.dice} aaya, koi chal nahi. Turn badal raha hai`;
    if (movable.length === 1) return `${game.dice} aaya, goti khud chal rahi hai`;
    return `${game.dice} aaya, jo goti chalani hai us par tap karein`;
  })();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setShowRules(true)}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
        >
          <HelpCircle className="h-4 w-4" />
          Rules
        </button>
        <button
          type="button"
          onClick={toggleSound}
          aria-label={soundOn ? 'Awaz band karein' : 'Awaz chalayein'}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
        >
          {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          {soundOn ? 'Awaz On' : 'Awaz Off'}
        </button>
      </div>

      <section className="grid grid-cols-2 gap-3">
        {PLAYER_COLOR_IDS.map((color, index) => {
          const home = game.tokens[color].filter((p) => p === HOME_PROGRESS).length;
          const active = game.winner === null && game.turn === index;
          return (
            <div
              key={color}
              className={`rounded-2xl border-2 bg-white p-3 shadow-sm transition-all duration-300 sm:p-4 ${
                active ? 'border-emerald-500 animate-glow' : 'border-stone-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: LUDO_COLORS[color].hex }} />
                <p className="truncate font-bold text-stone-900">{names[index]}</p>
              </div>
              <p className="mt-1 text-xs text-stone-600">
                {LUDO_COLORS[color].name} | Center mein: {home}/4
              </p>
            </div>
          );
        })}
      </section>

      <LudoBoard
        tokens={shownTokens}
        movableTokens={movable}
        movableColor={moving ? null : PLAYER_COLOR_IDS[game.turn]}
        onTokenClick={handleTokenClick}
      />

      <section className={`${cardClass} flex flex-col items-center gap-5 text-center`}>
        <div>
          <p
            className={`text-2xl font-extrabold sm:text-3xl ${isHumanTurn ? 'text-emerald-800' : 'text-amber-700'}`}
            role="status"
          >
            {game.winner === null ? headline : ''}
          </p>
          <p className="mt-1 text-sm text-stone-600">{game.winner === null ? status : ''}</p>
        </div>

        <div className="flex items-center gap-6">
          <Dice3D roll={roll} size={104} disabled={!canRoll} onRoll={handleRoll} />
          <div className="flex min-w-[5.5rem] flex-col items-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-stone-500">Dice</span>
            <span className="text-6xl font-black leading-none text-stone-900 tabular-nums" aria-live="polite">
              {game.dice ?? '-'}
            </span>
          </div>
        </div>

        {canRoll && (
          <p className="text-sm font-semibold text-stone-700">
            {isHumanTurn ? 'Dice par tap karein' : 'Doosre player ki baari hai'}
          </p>
        )}
      </section>

      {game.winner !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 p-4 animate-fade-in">
          <Confetti />
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl animate-pop">
            <Trophy className="mx-auto h-14 w-14 text-gold-500" />
            <h2 className="mt-3 text-2xl font-extrabold text-stone-900">
              {game.winner === HUMAN_TURN ? `Mubarak Ho ${playerName}!` : `${DOOSRA_NAME} jeet gaya!`}
            </h2>
            <p className="mt-2 text-sm text-stone-600">Sab 4 goti ghar pohanch gayin.</p>
            {earned !== null && (
              <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                +{formatNumber(earned)} Points mil gaye
              </p>
            )}
            {saveError && (
              <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                Points save nahi ho sake. Internet check karein.
              </p>
            )}
            <Button variant="gold" className="mt-6 w-full" onClick={startNewGame}>
              <RotateCcw className="h-4 w-4" />
              Naya Game
            </Button>
          </div>
        </div>
      )}

      {showRules && (
        <Modal title="Yodo Ludo Rules" onClose={() => setShowRules(false)}>
          <ul className="list-disc space-y-2 pl-5 text-sm text-stone-700">
            <li>Goti ko ghar se nikalne ke liye dice par 6 aana zaroori hai.</li>
            <li>6 aane par dobara chance milta hai.</li>
            <li>Agar goti dusre player ki goti par ruke to wo wapas ghar chali jati hai. Star wale khane safe hain.</li>
            <li>Goti center tak theek dice ki ginti se pohanchti hai.</li>
            <li>Sab 4 goti center mein pohanchane wala player jeet jata hai.</li>
            <li>Har game par {GAME_POINTS.play} Points, jeetne par {GAME_POINTS.win} Points extra milte hain.</li>
          </ul>
        </Modal>
      )}
    </div>
  );
}
