import React from 'react';
import { TyreCompound, WeatherCondition, PlayerCarDamage } from '../types.ts';

interface RacingHUDProps {
  currentPos: number;
  totalCars: number;
  currentLap: number;
  totalLaps: number;
  lapTime: number;
  lastLapTime: number;
  bestLapTime: number;
  sectorTimes: [number, number, number];
  currentSector: number;
  speedKmh: number;
  rpm: number;
  gear: number | string;
  ersLevel: number;
  drsOpen: boolean;
  drsAvail: boolean;
  tyreCompound: TyreCompound;
  tyreWear: number;
  tyreTemps: [number, number, number, number]; // FL, FR, RL, RR
  damage: PlayerCarDamage;
  leaderboard: Array<{
    pos: number;
    code: string;
    gap: string;
    color: string;
    isPlayer: boolean;
    tyre: TyreCompound;
  }>;
  flagStatus: 'GREEN' | 'YELLOW' | 'RED' | 'SAFETY_CAR' | 'CHEQUERED';
  inPitLane: boolean;
  pitLimiter: boolean;
  deltaToBest: number;
}

const fmt = (t: number) => {
  if (!isFinite(t) || t <= 0) return '-:--.---';
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(3).padStart(6, '0')}`;
};

export const RacingHUD: React.FC<RacingHUDProps> = ({
  currentPos,
  totalCars,
  currentLap,
  totalLaps,
  lapTime,
  lastLapTime,
  bestLapTime,
  sectorTimes,
  currentSector,
  speedKmh,
  rpm,
  gear,
  ersLevel,
  drsOpen,
  drsAvail,
  tyreCompound,
  tyreWear,
  tyreTemps,
  damage,
  leaderboard,
  flagStatus,
  inPitLane,
  pitLimiter,
  deltaToBest
}) => {
  // RPM LED count: 16 LEDs (green -> red -> purple/blue)
  const rpmPct = Math.max(0, Math.min(1, (rpm - 4000) / 8500));
  const litCount = Math.round(rpmPct * 16);

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-20 overflow-hidden">
      {/* ────────────────── TOP LEFT: LEADERBOARD & RACE POSITION ────────────────── */}
      <div className="absolute top-2 left-2 flex flex-col gap-1 w-48 sm:w-56 scale-90 sm:scale-100 origin-top-left">
        {/* Header with Flag Status */}
        <div className="flex items-center justify-between px-2.5 py-1 rounded-t-md bg-white text-slate-950 font-racing font-black text-xs tracking-wider shadow-md">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px]">LAP</span>
            <span className="text-[14px] font-mono-f1">{Math.min(currentLap, totalLaps)}/{totalLaps}</span>
          </div>
          <div className="flex items-center gap-1">
            {flagStatus === 'GREEN' && <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-600 text-white">TRACK CLEAR</span>}
            {flagStatus === 'YELLOW' && <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-400 text-slate-950 animate-pulse">YELLOW FLAG</span>}
            {flagStatus === 'CHEQUERED' && <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-900 text-white">FINISH</span>}
          </div>
        </div>

        {/* Compact 10-Row Live Timing Tower */}
        <div className="flex flex-col rounded-b-md overflow-hidden hud-glass-dark divide-y divide-white/5 border border-white/10 shadow-xl">
          {leaderboard.slice(0, 10).map((row) => (
            <div
              key={row.pos}
              className={`flex items-center justify-between px-2 py-0.5 text-xs font-racing transition-colors ${
                row.isPlayer ? 'bg-white text-slate-950 font-black' : 'text-white/90'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-4 text-center font-mono-f1 text-[11px] font-bold">{row.pos}</span>
                <span className="w-1.5 h-3.5 rounded-xs" style={{ backgroundColor: row.color }} />
                <span className="tracking-wider font-extrabold">{row.code}</span>
              </div>
              <div className="flex items-center gap-1.5 text-right font-mono-f1 text-[11px]">
                <span
                  className="w-2.5 h-2.5 rounded-full border border-black/40 text-[8px] flex items-center justify-center font-black"
                  style={{
                    backgroundColor: row.tyre === 'SOFT' ? '#ff2323' : row.tyre === 'MEDIUM' ? '#ffd400' : '#f0f2f5',
                    color: row.tyre === 'HARD' ? '#111' : '#fff'
                  }}
                >
                  {row.tyre[0]}
                </span>
                <span className={row.pos === 1 ? 'text-amber-300 font-bold' : ''}>{row.gap}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ────────────────── TOP RIGHT: LAP TIMING & SECTORS ────────────────── */}
      <div className="absolute top-2 right-2 flex flex-col items-end gap-1 scale-90 sm:scale-100 origin-top-right">
        {/* Main Timing Banner */}
        <div className="flex items-stretch rounded-md overflow-hidden hud-glass-dark border border-white/10 shadow-xl">
          {/* Position Block */}
          <div className="flex flex-col items-center justify-center bg-white text-slate-950 px-3 py-1 border-r-4 border-red-600 font-racing">
            <span className="text-[10px] font-bold tracking-widest text-slate-600">POS</span>
            <span className="text-3xl font-black italic leading-none">P{currentPos}</span>
            <span className="text-[9px] font-bold text-slate-500">/{totalCars}</span>
          </div>

          {/* Time Block */}
          <div className="flex flex-col px-3 py-1.5 min-w-[150px]">
            <span className="text-[10px] font-black tracking-widest text-white/50">LAP TIME</span>
            <span className="text-2xl font-black font-mono-f1 text-white tracking-wider leading-none my-0.5">
              {fmt(lapTime)}
            </span>
            <div className="flex items-center justify-between text-[11px] font-mono-f1 text-white/70 mt-1 border-t border-white/10 pt-0.5">
              <span>BEST <b className="text-purple-400 font-bold">{fmt(bestLapTime)}</b></span>
              <span>LAST <b className="text-white/90">{fmt(lastLapTime)}</b></span>
            </div>
          </div>
        </div>

        {/* 3 Sector Indicators */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-md hud-glass border border-white/10">
          <span className="text-[10px] font-bold text-white/50 tracking-wider">SECTORS:</span>
          {[0, 1, 2].map((sIdx) => {
            const time = sectorTimes[sIdx];
            const isCurrent = currentSector === sIdx;
            return (
              <div
                key={sIdx}
                className={`px-2 py-0.5 rounded text-[11px] font-mono-f1 font-bold ${
                  time > 0
                    ? 'bg-purple-600 text-white'
                    : isCurrent
                    ? 'bg-amber-400 text-slate-950 animate-pulse'
                    : 'bg-white/10 text-white/40'
                }`}
              >
                S{sIdx + 1} {time > 0 ? time.toFixed(3) : isCurrent ? '...' : '--'}
              </div>
            );
          })}
        </div>

        {/* Delta Time Badge */}
        {deltaToBest !== 0 && (
          <div
            className={`px-2 py-0.5 rounded text-[11px] font-mono-f1 font-black ${
              deltaToBest < 0 ? 'bg-emerald-600/90 text-white' : 'bg-red-600/90 text-white'
            }`}
          >
            DELTA {deltaToBest > 0 ? `+${deltaToBest.toFixed(3)}` : deltaToBest.toFixed(3)}
          </div>
        )}
      </div>

      {/* ────────────────── BOTTOM CENTER / DASHBOARD TELEMETRY ────────────────── */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto">
        {/* RPM LED Bar */}
        <div className="flex items-center gap-0.5 p-1 rounded-t-lg bg-black/80 border-t border-x border-white/20">
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className="w-2.5 sm:w-3.5 h-2 rounded-xs transition-colors duration-75"
              style={{
                backgroundColor:
                  i < litCount
                    ? i < 5
                      ? '#10b981' // Green
                      : i < 11
                      ? '#ef4444' // Red
                      : '#8b5cf6' // Purple shift light
                    : '#1e293b'
              }}
            />
          ))}
        </div>

        {/* Dashboard Core Display */}
        <div className="flex items-center gap-4 px-4 py-2 rounded-b-xl hud-glass-dark border border-white/20 shadow-2xl">
          {/* Tyre & ERS Status Left */}
          <div className="flex flex-col gap-1 w-24">
            <div className="flex items-center justify-between text-[10px] font-black font-racing tracking-wider">
              <span className="text-white/60">ERS</span>
              <span className="text-amber-400 font-mono-f1">{(ersLevel * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-100"
                style={{ width: `${ersLevel * 100}%` }}
              />
            </div>

            {/* 4 Tyre Temperatures & Wear */}
            <div className="grid grid-cols-2 gap-1 mt-1">
              {tyreTemps.map((t, idx) => (
                <div
                  key={idx}
                  className="px-1 py-0.5 rounded text-[9px] font-mono-f1 text-center font-bold"
                  style={{
                    backgroundColor: t > 115 ? '#ef4444' : t < 80 ? '#0284c7' : '#10b981',
                    color: '#fff'
                  }}
                >
                  {t}°C
                </div>
              ))}
            </div>
            <span className="text-[9px] text-center text-white/50 font-mono-f1">
              TYRE {tyreCompound} ({tyreWear.toFixed(0)}%)
            </span>
          </div>

          {/* Central Gear & Speedometer */}
          <div className="flex flex-col items-center px-3 border-x border-white/10">
            <span className="text-5xl sm:text-6xl font-black font-racing italic leading-none tracking-tight text-white drop-shadow-md">
              {gear}
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-3xl font-black font-mono-f1 text-white tracking-wider">
                {Math.round(speedKmh)}
              </span>
              <span className="text-[10px] font-black text-white/60">KM/H</span>
            </div>
          </div>

          {/* Tactical Status Right: DRS, Pit & Aero Damage */}
          <div className="flex flex-col gap-1.5 min-w-[90px]">
            {/* DRS indicator badge */}
            <div
              className={`px-2 py-1 rounded text-center font-racing font-black text-xs tracking-wider border ${
                drsOpen
                  ? 'bg-emerald-500 text-slate-950 border-white'
                  : drsAvail
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500 animate-pulse'
                  : 'bg-black/40 text-white/30 border-white/10'
              }`}
            >
              DRS {drsOpen ? 'ACTIVE' : drsAvail ? 'AVAILABLE' : 'OFF'}
            </div>

            {/* Pit limiter / Damage info */}
            {inPitLane ? (
              <div className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-black text-center animate-pulse">
                PIT LANE (80 KM/H)
              </div>
            ) : (
              <div className="text-[10px] font-mono-f1 text-white/70">
                WING: {damage.frontWing > 30 ? <span className="text-red-400">DMG {damage.frontWing}%</span> : <span className="text-emerald-400">OK</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
