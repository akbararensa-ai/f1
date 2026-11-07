import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, Pause, Play, RefreshCw, Camera, Compass, Radio, Disc, ShieldAlert } from 'lucide-react';
import { TyreCompound, WeatherCondition, PlayerCarDamage } from '../types.ts';

interface ControlsHUDProps {
  onInput: (action: string, isDown: boolean) => void;
  onCameraToggle: () => void;
  onReset: () => void;
  onPauseToggle: () => void;
  onMuteToggle: () => void;
  onPitRequest: () => void;
  onSteerValueChange?: (val: number) => void;
  isMuted: boolean;
  isPaused: boolean;
  steerMode: 'buttons' | 'wheel' | 'tilt';
  camName: string;
  drsAvail: boolean;
  drsOpen: boolean;
  ersLevel: number;
  gear: string | number;
  speedKmh: number;
  inPitLane: boolean;
  pitRequested: boolean;
}

export const MobileControlsHUD: React.FC<ControlsHUDProps> = ({
  onInput,
  onCameraToggle,
  onReset,
  onPauseToggle,
  onMuteToggle,
  onPitRequest,
  onSteerValueChange,
  isMuted,
  isPaused,
  steerMode,
  camName,
  drsAvail,
  drsOpen,
  ersLevel,
  gear,
  speedKmh,
  inPitLane,
  pitRequested
}) => {
  const [wheelAngle, setWheelAngle] = useState(0);
  const [isWheelDragging, setIsWheelDragging] = useState(false);

  // Bind pointer down / up with pointer capture
  const handlePointerStart = (action: string, e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    onInput(action, true);
  };

  const handlePointerEnd = (action: string, e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onInput(action, false);
  };

  // Virtual steering wheel touch handling
  const handleWheelPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsWheelDragging(true);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    calcWheelAngle(e);
  };

  const handleWheelPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isWheelDragging) return;
    calcWheelAngle(e);
  };

  const handleWheelPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsWheelDragging(false);
    setWheelAngle(0);
    if (onSteerValueChange) onSteerValueChange(0);
    onInput('steerLeft', false);
    onInput('steerRight', false);
  };

  const calcWheelAngle = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (deg > 180) deg -= 360;
    // Clamp to -90 to 90 degrees
    const clampedDeg = Math.max(-90, Math.min(90, deg));
    setWheelAngle(clampedDeg);
    const norm = clampedDeg / 90; // -1 to 1
    if (onSteerValueChange) {
      onSteerValueChange(norm);
    } else {
      if (norm < -0.15) {
        onInput('steerLeft', true);
        onInput('steerRight', false);
      } else if (norm > 0.15) {
        onInput('steerRight', true);
        onInput('steerLeft', false);
      } else {
        onInput('steerLeft', false);
        onInput('steerRight', false);
      }
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-30 select-none touch-none">
      {/* Top Bar Quick Utilities */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-auto px-3 py-1 rounded-full hud-glass-dark">
        <button
          onClick={onCameraToggle}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-semibold text-white/90 border border-white/10"
        >
          <Camera className="w-3.5 h-3.5 text-red-500" />
          <span className="uppercase text-[11px] tracking-wider">{camName}</span>
        </button>

        <button
          onClick={onPitRequest}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
            pitRequested
              ? 'bg-amber-500/80 text-black border-amber-300 animate-pulse'
              : 'bg-white/10 text-white/90 border-white/10 hover:bg-white/20'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span className="text-[11px] tracking-wider">{pitRequested ? 'BOX CONFIRMED' : 'BOX THIS LAP'}</span>
        </button>

        <button
          onClick={onReset}
          className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/80 border border-white/10"
          title="Reset to track"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onMuteToggle}
          className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/80 border border-white/10"
          title="Toggle audio"
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
        </button>

        <button
          onClick={onPauseToggle}
          className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/80 border border-white/10"
          title="Pause Game"
        >
          {isPaused ? <Play className="w-3.5 h-3.5 text-amber-400" /> : <Pause className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* LEFT CLUSTER: STEERING (Ergonomic thumb zone) */}
      <div className="absolute left-4 bottom-4 pointer-events-auto flex flex-col gap-2.5">
        {steerMode === 'buttons' && (
          <div className="flex gap-2.5">
            <button
              onPointerDown={e => handlePointerStart('steerLeft', e)}
              onPointerUp={e => handlePointerEnd('steerLeft', e)}
              onPointerCancel={e => handlePointerEnd('steerLeft', e)}
              className="touch-btn w-20 h-20 rounded-2xl bg-slate-900/80 border-2 border-white/30 text-white flex flex-col items-center justify-center shadow-2xl backdrop-blur-md active:bg-red-600 active:border-white"
              aria-label="Steer Left"
            >
              <span className="text-2xl font-bold font-racing">◀</span>
              <span className="text-[10px] text-white/60 font-bold tracking-wider">LEFT</span>
            </button>

            <button
              onPointerDown={e => handlePointerStart('steerRight', e)}
              onPointerUp={e => handlePointerEnd('steerRight', e)}
              onPointerCancel={e => handlePointerEnd('steerRight', e)}
              className="touch-btn w-20 h-20 rounded-2xl bg-slate-900/80 border-2 border-white/30 text-white flex flex-col items-center justify-center shadow-2xl backdrop-blur-md active:bg-red-600 active:border-white"
              aria-label="Steer Right"
            >
              <span className="text-2xl font-bold font-racing">▶</span>
              <span className="text-[10px] text-white/60 font-bold tracking-wider">RIGHT</span>
            </button>
          </div>
        )}

        {steerMode === 'wheel' && (
          <div
            onPointerDown={handleWheelPointerDown}
            onPointerMove={handleWheelPointerMove}
            onPointerUp={handleWheelPointerUp}
            onPointerCancel={handleWheelPointerUp}
            className="w-36 h-36 rounded-full border-4 border-white/30 bg-slate-950/70 backdrop-blur-md shadow-2xl flex items-center justify-center relative cursor-grab active:cursor-grabbing"
            style={{ transform: `rotate(${wheelAngle}deg)` }}
          >
            <div className="w-8 h-8 rounded-full bg-red-600 border-2 border-white flex items-center justify-center shadow-md">
              <Disc className="w-4 h-4 text-white" />
            </div>
            {/* Top center marker */}
            <div className="absolute top-1 w-3 h-4 bg-yellow-400 rounded-sm" />
            <div className="absolute left-1 top-1/2 -translate-y-1/2 w-4 h-8 bg-white/30 rounded" />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-8 bg-white/30 rounded" />
          </div>
        )}

        {steerMode === 'tilt' && (
          <div className="px-4 py-2 rounded-xl hud-glass text-xs font-semibold text-center text-white/80">
            <Compass className="w-4 h-4 mx-auto mb-1 text-emerald-400 animate-spin" />
            <span>TILT DEVICE TO STEER</span>
          </div>
        )}

        {/* Secondary Left Action: Look Back */}
        <div className="flex gap-2">
          <button
            onPointerDown={e => handlePointerStart('lookBack', e)}
            onPointerUp={e => handlePointerEnd('lookBack', e)}
            onPointerCancel={e => handlePointerEnd('lookBack', e)}
            className="touch-btn px-4 py-2 rounded-xl bg-slate-900/70 border border-white/20 text-[11px] font-bold tracking-wider text-white/80 backdrop-blur-sm active:bg-blue-600"
          >
            REAR MIRROR
          </button>
        </div>
      </div>

      {/* RIGHT CLUSTER: BRAKE, THROTTLE, DRS & BOOST (Ergonomic dual-pedal thumb layout) */}
      <div className="absolute right-4 bottom-4 pointer-events-auto flex flex-col items-end gap-2.5">
        {/* Top Tactical: DRS & ERS Boost */}
        <div className="flex items-center gap-2">
          {/* DRS Button */}
          <button
            onPointerDown={e => handlePointerStart('drs', e)}
            onPointerUp={e => handlePointerEnd('drs', e)}
            onPointerCancel={e => handlePointerEnd('drs', e)}
            disabled={!drsAvail}
            className={`touch-btn px-4 py-2 rounded-xl font-racing font-black text-sm tracking-widest border transition-all shadow-lg ${
              drsOpen
                ? 'bg-emerald-500 text-slate-950 border-white shadow-emerald-500/50 scale-105'
                : drsAvail
                ? 'bg-emerald-600/40 text-emerald-300 border-emerald-400 animate-pulse'
                : 'bg-black/40 text-white/30 border-white/10 opacity-60'
            }`}
          >
            DRS {drsOpen ? 'ACTIVE' : drsAvail ? 'READY' : 'OFF'}
          </button>

          {/* ERS Boost Button */}
          <button
            onPointerDown={e => handlePointerStart('boost', e)}
            onPointerUp={e => handlePointerEnd('boost', e)}
            onPointerCancel={e => handlePointerEnd('boost', e)}
            className={`touch-btn px-3 py-2 rounded-xl font-racing font-bold text-xs tracking-wider border backdrop-blur-md ${
              ersLevel > 0.05
                ? 'bg-amber-500/80 text-black border-amber-300 active:bg-amber-400'
                : 'bg-white/5 text-white/30 border-white/10 opacity-50'
            }`}
          >
            ERS {(ersLevel * 100).toFixed(0)}%
          </button>
        </div>

        {/* Primary Pedals */}
        <div className="flex items-end gap-3">
          {/* BRAKE PEDAL */}
          <button
            onPointerDown={e => handlePointerStart('brake', e)}
            onPointerUp={e => handlePointerEnd('brake', e)}
            onPointerCancel={e => handlePointerEnd('brake', e)}
            className="touch-btn w-20 h-28 rounded-2xl bg-gradient-to-t from-red-950/90 via-red-900/80 to-red-800/80 border-2 border-red-500/80 text-white flex flex-col items-center justify-between p-3 shadow-2xl backdrop-blur-md active:border-white active:from-red-600 active:to-red-500"
            aria-label="Brake"
          >
            <span className="text-[10px] font-black tracking-widest text-red-200">BRAKE</span>
            <div className="w-10 h-1 bg-red-400/60 rounded-full my-auto" />
            <span className="text-xl font-black font-racing">REM</span>
          </button>

          {/* THROTTLE PEDAL */}
          <button
            onPointerDown={e => handlePointerStart('throttle', e)}
            onPointerUp={e => handlePointerEnd('throttle', e)}
            onPointerCancel={e => handlePointerEnd('throttle', e)}
            className="touch-btn w-24 h-36 rounded-2xl bg-gradient-to-t from-emerald-950/90 via-emerald-900/80 to-emerald-700/80 border-2 border-emerald-400 text-white flex flex-col items-center justify-between p-4 shadow-2xl backdrop-blur-md active:border-white active:from-emerald-500 active:to-emerald-400"
            aria-label="Throttle"
          >
            <span className="text-[11px] font-black tracking-widest text-emerald-200">THROTTLE</span>
            <div className="flex flex-col gap-1 w-12 my-auto">
              <div className="w-full h-1 bg-emerald-300/60 rounded-full" />
              <div className="w-full h-1 bg-emerald-300/60 rounded-full" />
              <div className="w-full h-1 bg-emerald-300/60 rounded-full" />
            </div>
            <span className="text-2xl font-black font-racing">GAS</span>
          </button>
        </div>
      </div>
    </div>
  );
};
