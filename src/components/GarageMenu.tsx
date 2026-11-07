import React, { useState } from 'react';
import { Play, Settings, Trophy, Gauge, Flag, RefreshCw, Car, Sun, CloudRain } from 'lucide-react';
import { TrackDef, TRACKS, TeamDef, TEAMS, TyreCompound, TYRE_SPECS, WeatherType } from '../types.ts';

interface GarageMenuProps {
  onStartRace: (config: {
    track: TrackDef;
    team: TeamDef;
    tyre: TyreCompound;
    weather: WeatherType;
    laps: number;
    transmission: 'auto' | 'manual';
    steerMode: 'buttons' | 'wheel' | 'tilt';
    aiDifficulty: 'normal' | 'pro' | 'legend';
    cameraMode: 'cockpit' | 'nose' | 'chase' | 'far';
  }) => void;
}

export const GarageMenu: React.FC<GarageMenuProps> = ({ onStartRace }) => {
  const [selectedTrack, setSelectedTrack] = useState<TrackDef>(TRACKS[0]);
  const [selectedTeam, setSelectedTeam] = useState<TeamDef>(TEAMS[0]);
  const [selectedTyre, setSelectedTyre] = useState<TyreCompound>('MEDIUM');
  const [selectedWeather, setSelectedWeather] = useState<WeatherType>('SUNNY');
  const [selectedLaps, setSelectedLaps] = useState<number>(3);
  const [transmission, setTransmission] = useState<'auto' | 'manual'>('auto');
  const [steerMode, setSteerMode] = useState<'buttons' | 'wheel' | 'tilt'>('buttons');
  const [aiDifficulty, setAiDifficulty] = useState<'normal' | 'pro' | 'legend'>('pro');
  const [cameraMode, setCameraMode] = useState<'cockpit' | 'nose' | 'chase' | 'far'>('cockpit');
  const [activeTab, setActiveTab] = useState<'grandprix' | 'setup' | 'controls'>('grandprix');

  const handleStart = () => {
    onStartRace({
      track: selectedTrack,
      team: selectedTeam,
      tyre: selectedTyre,
      weather: selectedWeather,
      laps: selectedLaps,
      transmission,
      steerMode,
      aiDifficulty,
      cameraMode
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-950/95 border-t-4 border-red-600 rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-white/10 my-auto">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-7 bg-red-600 skew-x-[-12deg]" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-black font-racing italic tracking-wider text-white">
                AURORA GRAND PRIX
              </h1>
              <p className="text-xs text-white/60 font-semibold tracking-widest uppercase">
                Mobile F1 Simulator · Android Edition
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveTab('grandprix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'grandprix' ? 'bg-red-600 text-white shadow-md' : 'text-white/60 hover:text-white'
              }`}
            >
              RACE SETUP
            </button>
            <button
              onClick={() => setActiveTab('setup')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'setup' ? 'bg-red-600 text-white shadow-md' : 'text-white/60 hover:text-white'
              }`}
            >
              CAR & TYRES
            </button>
            <button
              onClick={() => setActiveTab('controls')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'controls' ? 'bg-red-600 text-white shadow-md' : 'text-white/60 hover:text-white'
              }`}
            >
              CONTROLS
            </button>
          </div>
        </div>

        {/* Tab 1: Grand Prix & Track Selection */}
        {activeTab === 'grandprix' && (
          <div className="p-6 flex flex-col gap-5">
            {/* Track Selector */}
            <div>
              <span className="text-xs font-black tracking-widest text-white/50 uppercase">SELECT GRAND PRIX CIRCUIT</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                {TRACKS.map((trk) => (
                  <button
                    key={trk.id}
                    onClick={() => setSelectedTrack(trk)}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      selectedTrack.id === trk.id
                        ? 'bg-red-600/20 border-red-500 shadow-lg shadow-red-500/20'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg">{trk.flag}</span>
                      <span className="text-[10px] font-mono-f1 px-1.5 py-0.5 rounded bg-white/10 text-white/80">
                        {trk.difficulty}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-white truncate font-racing">{trk.name}</span>
                    <span className="text-[11px] text-white/60 font-mono-f1">
                      {trk.lengthKm} KM · {trk.turns} TURNS
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Race Parameters (Laps, Weather, AI Difficulty) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Laps */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-white/60">RACE LENGTH</span>
                <div className="flex gap-2">
                  {[1, 3, 5, 10].map((l) => (
                    <button
                      key={l}
                      onClick={() => setSelectedLaps(l)}
                      className={`flex-1 py-2 rounded-lg font-mono-f1 font-bold text-xs border transition-all ${
                        selectedLaps === l
                          ? 'bg-white text-black border-white shadow'
                          : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {l} {l === 1 ? 'LAP' : 'LAPS'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weather */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-white/60">WEATHER CONDITIONS</span>
                <div className="flex gap-2">
                  {(['SUNNY', 'OVERCAST', 'RAIN'] as WeatherType[]).map((w) => (
                    <button
                      key={w}
                      onClick={() => setSelectedWeather(w)}
                      className={`flex-1 py-2 rounded-lg font-bold text-xs border flex items-center justify-center gap-1 transition-all ${
                        selectedWeather === w
                          ? 'bg-white text-black border-white shadow'
                          : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {w === 'SUNNY' && <Sun className="w-3.5 h-3.5 text-amber-500" />}
                      {w === 'RAIN' && <CloudRain className="w-3.5 h-3.5 text-blue-500" />}
                      <span>{w}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Difficulty */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-white/60">AI OPPONENT LEVEL</span>
                <div className="flex gap-2">
                  {(['normal', 'pro', 'legend'] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setAiDifficulty(d)}
                      className={`flex-1 py-2 rounded-lg font-bold text-xs border uppercase transition-all ${
                        aiDifficulty === d
                          ? 'bg-red-600 text-white border-red-500 shadow'
                          : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Team & Tyre Selection */}
        {activeTab === 'setup' && (
          <div className="p-6 flex flex-col gap-5">
            {/* Team Selector */}
            <div>
              <span className="text-xs font-black tracking-widest text-white/50 uppercase">SELECT CONSTRUCTOR TEAM</span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-2">
                {TEAMS.map((tm) => (
                  <button
                    key={tm.id}
                    onClick={() => setSelectedTeam(tm)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-1.5 transition-all ${
                      selectedTeam.id === tm.id
                        ? 'bg-white/15 border-white shadow-lg'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-full border border-black/30" style={{ backgroundColor: tm.primaryHex }} />
                      <span className="text-xs font-black font-racing text-white">{tm.code}</span>
                    </div>
                    <span className="text-xs font-bold text-white/90 truncate">{tm.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tyre Compound Selection */}
            <div>
              <span className="text-xs font-black tracking-widest text-white/50 uppercase">STARTING TYRE COMPOUND</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                {(Object.keys(TYRE_SPECS) as TyreCompound[]).map((compound) => {
                  const spec = TYRE_SPECS[compound];
                  return (
                    <button
                      key={compound}
                      onClick={() => setSelectedTyre(compound)}
                      className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                        selectedTyre === compound
                          ? 'bg-white/15 border-white shadow-lg'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center font-black font-racing text-xs"
                        style={{ backgroundColor: spec.color, color: compound === 'HARD' ? '#111' : '#fff' }}
                      >
                        {compound[0]}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-white">{spec.name}</span>
                        <span className="text-[10px] text-white/60 font-mono-f1">Grip {spec.initialGrip}x</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Controls & Mobile Options */}
        {activeTab === 'controls' && (
          <div className="p-6 flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Steering Mode */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-white/60">STEERING CONTROLS</span>
                <div className="flex flex-col gap-1.5">
                  {[
                    { id: 'buttons', label: 'Touch Arrows (Left/Right)' },
                    { id: 'wheel', label: 'Virtual F1 Steering Wheel' },
                    { id: 'tilt', label: 'Android Gyro / Tilt Sensor' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSteerMode(m.id as any)}
                      className={`p-2.5 rounded-lg text-xs font-bold text-left border transition-all ${
                        steerMode === m.id
                          ? 'bg-red-600 text-white border-red-500'
                          : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Default Camera */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-white/60">DEFAULT CAMERA VIEW</span>
                <div className="flex flex-col gap-1.5">
                  {[
                    { id: 'cockpit', label: 'True Cockpit (Driver POV)' },
                    { id: 'nose', label: 'Nose / Front Wing Cam' },
                    { id: 'chase', label: 'Third-Person Chase Cam' },
                    { id: 'far', label: 'High T-Cam TV View' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCameraMode(c.id as any)}
                      className={`p-2.5 rounded-lg text-xs font-bold text-left border transition-all ${
                        cameraMode === c.id
                          ? 'bg-red-600 text-white border-red-500'
                          : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transmission */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-white/60">TRANSMISSION</span>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => setTransmission('auto')}
                    className={`p-2.5 rounded-lg text-xs font-bold text-left border transition-all ${
                      transmission === 'auto'
                        ? 'bg-red-600 text-white border-red-500'
                        : 'bg-white/5 text-white/70 border-white/10'
                    }`}
                  >
                    Automatic 8-Speed Seamless
                  </button>
                  <button
                    onClick={() => setTransmission('manual')}
                    className={`p-2.5 rounded-lg text-xs font-bold text-left border transition-all ${
                      transmission === 'manual'
                        ? 'bg-red-600 text-white border-red-500'
                        : 'bg-white/5 text-white/70 border-white/10'
                    }`}
                  >
                    Manual Shifting (Paddles)
                  </button>
                </div>
              </div>
            </div>

            {/* Desktop Fallback Legend */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60 flex flex-wrap gap-x-6 gap-y-1">
              <span><b>Keyboard:</b> ↑ / W = Gas</span>
              <span>↓ / S = Brake</span>
              <span>← → / A D = Steer</span>
              <span>Space = DRS</span>
              <span>C = Cam</span>
              <span>R = Reset</span>
            </div>
          </div>
        )}

        {/* Footer Launch CTA */}
        <div className="p-4 sm:p-6 bg-slate-900/90 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{selectedTrack.flag}</span>
            <div className="flex flex-col">
              <span className="text-sm font-black font-racing text-white">{selectedTrack.name}</span>
              <span className="text-xs text-white/60 font-mono-f1">
                {selectedLaps} LAPS · {selectedTeam.name} · {selectedTyre} TYRES
              </span>
            </div>
          </div>

          <button
            onClick={handleStart}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-racing font-black text-base italic tracking-widest shadow-xl shadow-red-600/30 flex items-center gap-2 active:scale-95 transition-all"
          >
            <span>START RACE</span>
            <Play className="w-5 h-5 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
};
