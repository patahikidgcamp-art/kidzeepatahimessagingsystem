import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, Zap } from 'lucide-react';

export interface CustomDurationSelectorProps {
  durationMs: number;
  onChangeDurationMs: (ms: number) => void;
  disabled?: boolean;
  label?: string;
  totalItems?: number;
}

const PRESET_OPTIONS = [
  { label: '2s', ms: 2000 },
  { label: '5s', ms: 5000 },
  { label: '10s', ms: 10000 },
  { label: '15s', ms: 15000 },
  { label: '30s', ms: 30000 },
  { label: '1 min', ms: 60000 },
  { label: '2 min', ms: 120000 },
  { label: '5 min', ms: 300000 },
];

export const CustomDurationSelector: React.FC<CustomDurationSelectorProps> = ({
  durationMs,
  onChangeDurationMs,
  disabled = false,
  label = 'Message Sending Duration (Delay Between Messages)',
  totalItems,
}) => {
  // Determine initial unit and numeric value
  const initialIsMinutes = durationMs >= 60000 && durationMs % 60000 === 0;
  const [unit, setUnit] = useState<'seconds' | 'minutes'>(initialIsMinutes ? 'minutes' : 'seconds');
  const [value, setValue] = useState<number>(
    initialIsMinutes ? Math.round(durationMs / 60000) : Math.max(1, Math.round(durationMs / 1000))
  );

  // Sync internal state when durationMs changes externally
  useEffect(() => {
    if (durationMs >= 60000 && durationMs % 60000 === 0) {
      setUnit('minutes');
      setValue(Math.round(durationMs / 60000));
    } else {
      setUnit('seconds');
      setValue(Math.max(1, Math.round(durationMs / 1000)));
    }
  }, [durationMs]);

  const handleValueChange = (newVal: number) => {
    const sanitized = Math.max(1, isNaN(newVal) ? 1 : newVal);
    setValue(sanitized);
    const ms = unit === 'minutes' ? sanitized * 60 * 1000 : sanitized * 1000;
    onChangeDurationMs(ms);
  };

  const handleUnitChange = (newUnit: 'seconds' | 'minutes') => {
    setUnit(newUnit);
    let newMs = 0;
    if (newUnit === 'minutes') {
      const mins = Math.max(1, Math.min(value, 15));
      setValue(mins);
      newMs = mins * 60 * 1000;
    } else {
      const secs = value <= 15 ? value * 60 : value;
      setValue(secs);
      newMs = secs * 1000;
    }
    onChangeDurationMs(newMs);
  };

  const handlePresetClick = (ms: number) => {
    onChangeDurationMs(ms);
  };

  // Formatted duration description
  const totalSeconds = Math.round(durationMs / 1000);
  const minutesPart = Math.floor(totalSeconds / 60);
  const secondsPart = totalSeconds % 60;

  let formattedDuration = '';
  if (minutesPart > 0 && secondsPart > 0) {
    formattedDuration = `${minutesPart}m ${secondsPart}s`;
  } else if (minutesPart > 0) {
    formattedDuration = `${minutesPart} minute${minutesPart > 1 ? 's' : ''}`;
  } else {
    formattedDuration = `${secondsPart} second${secondsPart !== 1 ? 's' : ''}`;
  }

  // Estimated batch finish time
  let estimatedTotalTime = '';
  if (totalItems && totalItems > 0) {
    const totalEstSec = (totalItems - 1) * totalSeconds;
    const estMin = Math.floor(totalEstSec / 60);
    const estSec = totalEstSec % 60;
    if (estMin > 0 && estSec > 0) {
      estimatedTotalTime = `~${estMin}m ${estSec}s`;
    } else if (estMin > 0) {
      estimatedTotalTime = `~${estMin} min`;
    } else {
      estimatedTotalTime = `~${estSec} sec`;
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-emerald-600" />
          <span>{label}</span>
        </label>
        <span className="text-[11px] font-mono text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
          Every {formattedDuration}
        </span>
      </div>

      {/* Quick Preset Buttons */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold text-slate-500 mr-1">Presets:</span>
        {PRESET_OPTIONS.map((preset) => {
          const isSelected = durationMs === preset.ms;
          return (
            <button
              key={preset.ms}
              type="button"
              disabled={disabled}
              onClick={() => handlePresetClick(preset.ms)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80'
              } disabled:opacity-50`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Custom Input + Unit Selector */}
      <div className="flex items-center gap-2 pt-1">
        <div className="flex-1 flex rounded-xl border border-slate-300 overflow-hidden bg-white focus-within:ring-2 focus-within:ring-emerald-500">
          <input
            type="number"
            min={1}
            max={unit === 'minutes' ? 15 : 600}
            value={value}
            disabled={disabled}
            onChange={(e) => handleValueChange(Number(e.target.value))}
            className="w-full px-3 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-hidden"
            placeholder="Custom delay..."
          />
          <div className="flex bg-slate-100 border-l border-slate-200 p-0.5 text-[11px] font-bold">
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleUnitChange('seconds')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                unit === 'seconds'
                  ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Seconds
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleUnitChange('minutes')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                unit === 'minutes'
                  ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Minutes
            </button>
          </div>
        </div>

        {estimatedTotalTime && (
          <span className="text-[11px] text-slate-500 shrink-0 font-medium hidden sm:inline">
            Total est: <strong>{estimatedTotalTime}</strong> ({totalItems} items)
          </span>
        )}
      </div>

      {/* Anti-Spam Guidance Hint */}
      <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>
          {durationMs >= 15000 ? (
            <strong className="text-emerald-700">Recommended for Safe School Dispatch:</strong>
          ) : (
            <strong className="text-amber-700">Fast Delivery:</strong>
          )}{' '}
          {durationMs >= 15000
            ? 'Delays of 15s to 2 mins prevent WhatsApp spam detection when sending bulk notices.'
            : 'Shorter intervals are quick, but consider 15s+ for large class parent cohorts.'}
        </span>
      </div>
    </div>
  );
};
