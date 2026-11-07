import React, { useState } from 'react';
import { TyreCompound, TYRE_SPECS } from '../types.ts';
import { Wrench, CheckCircle2 } from 'lucide-react';

interface PitStopModalProps {
  currentTyre: TyreCompound;
  currentWear: number;
  hasDamage: boolean;
  onExecutePitStop: (newTyre: TyreCompound, repairAero: boolean) => void;
  onCancel: () => void;
}

export const PitStopModal: React.FC<PitStopModalProps> = ({
  currentTyre,
  currentWear,
  hasDamage,
  onExecutePitStop,
  onCancel
}) => {
  const [selectedTyre, setSelectedTyre] = useState<TyreCompound>('HARD');
  const [repairAero, setRepairAero] = useState<boolean>(true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-950 border-2 border-amber-500 rounded-2xl shadow-2xl p-5 flex flex-col gap-4 text-white">
        <div className="flex items-center gap-3 border-b border-white/10 pb-3">
          <div className="p-2 rounded-xl bg-amber-500 text-slate-950">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black font-racing italic tracking-wider">BOX BOX — PIT STRATEGY</h3>
            <p className="text-xs text-white/60">Choose new tyre compound & repair options</p>
          </div>
        </div>

        {/* Current status */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex justify-between text-xs">
          <span>Current: <b className="text-amber-400">{currentTyre}</b> ({currentWear.toFixed(0)}% Wear)</span>
          <span>Damage: <b className={hasDamage ? 'text-red-400' : 'text-emerald-400'}>{hasDamage ? 'DAMAGED' : 'CLEAN'}</b></span>
        </div>

        {/* Compound Selection */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-white/70">SELECT NEW TYRES</span>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(TYRE_SPECS) as TyreCompound[]).map((compound) => {
              const spec = TYRE_SPECS[compound];
              return (
                <button
                  key={compound}
                  onClick={() => setSelectedTyre(compound)}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                    selectedTyre === compound
                      ? 'bg-white/20 border-white shadow-md'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-full border border-white flex items-center justify-center font-black text-[10px]"
                    style={{ backgroundColor: spec.color, color: compound === 'HARD' ? '#111' : '#fff' }}
                  >
                    {compound[0]}
                  </div>
                  <span className="text-xs font-black">{spec.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Aero Repair Checkbox */}
        {hasDamage && (
          <label className="flex items-center gap-3 p-3 rounded-xl bg-red-950/40 border border-red-500/40 cursor-pointer">
            <input
              type="checkbox"
              checked={repairAero}
              onChange={(e) => setRepairAero(e.target.checked)}
              className="w-4 h-4 rounded text-red-600 focus:ring-0"
            />
            <div className="flex flex-col text-xs">
              <span className="font-bold text-red-200">Replace Front Wing & Bodywork</span>
              <span className="text-[10px] text-white/60">+3.0s Pit Stop Duration penalty</span>
            </div>
          </label>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold font-racing"
          >
            DISMISS
          </button>
          <button
            onClick={() => onExecutePitStop(selectedTyre, repairAero)}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black font-racing text-xs tracking-wider flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>CONFIRM STRATEGY</span>
          </button>
        </div>
      </div>
    </div>
  );
};
