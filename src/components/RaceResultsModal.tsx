import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Home, Award } from 'lucide-react';
import { TyreCompound } from '../types.ts';

interface RaceResultsModalProps {
  order: Array<{
    pos: number;
    code: string;
    teamName: string;
    bestLap: number;
    finishTime: number;
    gap: string;
    isPlayer: boolean;
    color: string;
    tyre: TyreCompound;
  }>;
  playerPos: number;
  totalLaps: number;
  trackName: string;
  onRaceAgain: () => void;
  onBackToMenu: () => void;
}

const fmt = (t: number) => {
  if (!isFinite(t) || t <= 0) return '-:--.---';
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(3).padStart(6, '0')}`;
};

export const RaceResultsModal: React.FC<RaceResultsModalProps> = ({
  order,
  playerPos,
  totalLaps,
  trackName,
  onRaceAgain,
  onBackToMenu
}) => {
  useEffect(() => {
    if (playerPos <= 3) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}
    }
  }, [playerPos]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-3xl bg-slate-950 border-t-4 border-red-600 rounded-2xl shadow-2xl border border-white/10 flex flex-col my-auto overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-950 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${playerPos === 1 ? 'bg-amber-500 text-black' : 'bg-red-600 text-white'}`}>
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black font-racing italic tracking-wider text-white">
                {playerPos === 1 ? 'VICTORY! P1 FINISH' : `FINISHED P${playerPos}`}
              </h2>
              <p className="text-xs text-white/60 font-mono-f1">
                {trackName} · {totalLaps} LAPS CLASSIFICATION
              </p>
            </div>
          </div>
        </div>

        {/* Classification Table */}
        <div className="max-h-[50vh] overflow-y-auto p-4">
          <table className="w-full text-left font-racing text-xs">
            <thead>
              <tr className="border-b border-white/10 text-white/50 text-[11px] font-black tracking-wider uppercase">
                <th className="py-2 px-2">POS</th>
                <th className="py-2 px-2">DRIVER</th>
                <th className="py-2 px-2">CONSTRUCTOR</th>
                <th className="py-2 px-2">BEST LAP</th>
                <th className="py-2 px-2 text-right">TIME / GAP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono-f1">
              {order.map((car) => (
                <tr
                  key={car.pos}
                  className={`transition-colors ${
                    car.isPlayer ? 'bg-white text-slate-950 font-black' : 'text-white/80 hover:bg-white/5'
                  }`}
                >
                  <td className="py-2 px-2 font-bold">{car.pos}</td>
                  <td className="py-2 px-2 font-racing font-bold flex items-center gap-2">
                    <span className="w-1.5 h-4 rounded-xs" style={{ backgroundColor: car.color }} />
                    <span>{car.code}</span>
                  </td>
                  <td className="py-2 px-2 font-racing text-white/70 truncate max-w-[140px]">{car.teamName}</td>
                  <td className="py-2 px-2 text-purple-400 font-bold">{fmt(car.bestLap)}</td>
                  <td className="py-2 px-2 text-right font-bold">{car.gap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-900 border-t border-white/10 flex items-center justify-end gap-3">
          <button
            onClick={onBackToMenu}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-racing font-bold text-xs tracking-wider flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>GARAGE MENU</span>
          </button>

          <button
            onClick={onRaceAgain}
            className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-racing font-black text-xs tracking-wider flex items-center gap-2 shadow-lg shadow-red-600/30"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RACE AGAIN</span>
          </button>
        </div>
      </div>
    </div>
  );
};
