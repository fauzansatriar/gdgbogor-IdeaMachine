import { useEffect, useRef, useState } from 'react';
import { Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';
import { sfx } from '../utils/audio';

const QUICK_MINUTES = [1, 3, 5, 7, 10] as const;

export function StageTimerView({ isWideProjector = false }: { isWideProjector?: boolean }) {
  const [customMinutes, setCustomMinutes] = useState<number>(5);
  const [customSeconds, setCustomSeconds] = useState<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(5 * 60);
  const [isRunning, setIsRunning] = useState(false);

  const endTimestampRef = useRef<number | null>(null);
  const lastSpokenSecondRef = useRef<number | null>(null);

  const totalConfiguredSeconds = Math.max(1, customMinutes * 60 + customSeconds);

  useEffect(() => {
    if (!isRunning) {
      endTimestampRef.current = null;
      return;
    }

    if (endTimestampRef.current === null) {
      endTimestampRef.current = Date.now() + remainingSeconds * 1000;
    }

    const interval = window.setInterval(() => {
      if (endTimestampRef.current === null) return;
      const diffMs = endTimestampRef.current - Date.now();
      const nextSec = Math.max(0, Math.ceil(diffMs / 1000));

      setRemainingSeconds(nextSec);

      if (nextSec !== lastSpokenSecondRef.current) {
        lastSpokenSecondRef.current = nextSec;
        if (nextSec > 0 && nextSec <= 5) {
          sfx.playTimerCountdownTick(nextSec === 1);
        } else if (nextSec === 0) {
          sfx.playTimerFinish();
          setIsRunning(false);
          endTimestampRef.current = null;
        }
      }
    }, 150);

    return () => window.clearInterval(interval);
  }, [isRunning, remainingSeconds]);

  const applyCustomDuration = (mins: number, secs: number) => {
    const safeMins = Math.max(0, Math.min(99, mins));
    const safeSecs = Math.max(0, Math.min(59, secs));
    const total = safeMins === 0 && safeSecs === 0 ? 60 : safeMins * 60 + safeSecs;
    const finalMins = Math.floor(total / 60);
    const finalSecs = total % 60;

    setIsRunning(false);
    endTimestampRef.current = null;
    lastSpokenSecondRef.current = null;
    setCustomMinutes(finalMins);
    setCustomSeconds(finalSecs);
    setRemainingSeconds(total);
  };

  const handleToggleRun = () => {
    if (remainingSeconds === 0) {
      setRemainingSeconds(totalConfiguredSeconds);
      lastSpokenSecondRef.current = null;
      endTimestampRef.current = Date.now() + totalConfiguredSeconds * 1000;
      setIsRunning(true);
      return;
    }

    if (isRunning) {
      setIsRunning(false);
      endTimestampRef.current = null;
    } else {
      endTimestampRef.current = Date.now() + remainingSeconds * 1000;
      lastSpokenSecondRef.current = remainingSeconds;
      setIsRunning(true);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    endTimestampRef.current = null;
    lastSpokenSecondRef.current = null;
    setRemainingSeconds(totalConfiguredSeconds);
  };

  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const isWarning = remainingSeconds <= 15 && remainingSeconds > 0;
  const isFinished = remainingSeconds === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className="flex-1 min-h-0 flex flex-col items-center justify-center px-4 sm:px-8 py-4"
    >
      {/* Single Unified Stage Timer Title + Quick Presets */}
      <div className="flex flex-col items-center gap-3">
        <div
          className={`font-bold uppercase tracking-widest text-[#1A73E8] ${
            isWideProjector ? 'text-sm' : 'text-xs'
          }`}
        >
          Stage Timer Panggung
        </div>

        {/* Quick Duration Chips */}
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {QUICK_MINUTES.map((m) => {
            const active = customMinutes === m && customSeconds === 0 && !isRunning && remainingSeconds === m * 60;
            return (
              <button
                key={m}
                type="button"
                disabled={isRunning}
                onClick={() => applyCustomDuration(m, 0)}
                className={`min-h-[34px] px-3.5 py-1 rounded-xl text-xs font-bold tabular-nums transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                  active
                    ? 'bg-[#111827] text-white'
                    : 'bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#374151]'
                }`}
              >
                {String(m).padStart(2, '0')}:00
              </button>
            );
          })}
        </div>
      </div>

      {/* Giant Centered Countdown Display */}
      <div
        className={`rounded-[28px] border-2 transition-colors duration-200 ${
          isWideProjector ? 'my-4 px-16 py-8' : 'my-3 sm:my-4 px-8 sm:px-14 py-4 sm:py-7'
        } ${
          isWarning || isFinished
            ? 'bg-[#FEF2F2] border-[#FCA5A5]'
            : 'bg-[#F8FAFC] border-[#CBD5E1]'
        }`}
      >
        <div
          aria-live="polite"
          className={`font-bold tabular-nums tracking-tight leading-none select-none ${
            isWideProjector
              ? 'text-[clamp(5.5rem,18vh,11.5rem)]'
              : 'text-[clamp(4rem,14vh,9.5rem)]'
          } ${
            isWarning || isFinished ? 'text-[#EA4335]' : 'text-[#111827]'
          }`}
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {formattedTime}
        </div>
        <div className={`mt-2.5 text-center font-semibold ${isWideProjector ? 'text-base' : 'text-xs sm:text-sm'}`}>
          {isFinished ? (
            <span className="text-[#EA4335]">
              Waktu Habis!
            </span>
          ) : isWarning ? (
            <span className="text-[#EA4335]">
              Kurang dari 15 detik tersisa
            </span>
          ) : isRunning ? (
            <span className="text-[#1A73E8]">Timer sedang berjalan...</span>
          ) : (
            <span className="text-[#4B5563]">
              Durasi diatur: {String(customMinutes).padStart(2, '0')}:{String(customSeconds).padStart(2, '0')}
            </span>
          )}
        </div>
      </div>

      {/* Custom Duration Picker (Minutes & Seconds) */}
      <div className="mb-4 flex flex-wrap items-center justify-center gap-3 px-4 py-2 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
        <span className="text-xs font-bold text-[#4B5563]">Atur Custom:</span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={isRunning}
            onClick={() => applyCustomDuration(customMinutes - 1, customSeconds)}
            aria-label="Kurangi 1 menit"
            className="w-8 h-8 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] inline-flex items-center justify-center text-[#111827] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Minus className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <label className="inline-flex items-center gap-1 text-xs font-semibold text-[#374151]">
            <input
              type="number"
              min={0}
              max={99}
              disabled={isRunning}
              value={customMinutes}
              onChange={(e) =>
                applyCustomDuration(Number(e.target.value) || 0, customSeconds)
              }
              aria-label="Menit"
              className="w-12 h-8 text-center rounded-lg border border-[#CBD5E1] bg-white text-sm font-bold tabular-nums text-[#111827] focus:outline-2 focus:outline-[#1A73E8] disabled:opacity-50"
            />
            <span>mnt</span>
          </label>
          <button
            type="button"
            disabled={isRunning}
            onClick={() => applyCustomDuration(customMinutes + 1, customSeconds)}
            aria-label="Tambah 1 menit"
            className="w-8 h-8 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] inline-flex items-center justify-center text-[#111827] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        <span className="text-[#CBD5E1]" aria-hidden="true">
          :
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={isRunning}
            onClick={() => applyCustomDuration(customMinutes, customSeconds - 15)}
            aria-label="Kurangi 15 detik"
            className="w-8 h-8 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] inline-flex items-center justify-center text-[#111827] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Minus className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <label className="inline-flex items-center gap-1 text-xs font-semibold text-[#374151]">
            <input
              type="number"
              min={0}
              max={59}
              disabled={isRunning}
              value={customSeconds}
              onChange={(e) =>
                applyCustomDuration(customMinutes, Number(e.target.value) || 0)
              }
              aria-label="Detik"
              className="w-12 h-8 text-center rounded-lg border border-[#CBD5E1] bg-white text-sm font-bold tabular-nums text-[#111827] focus:outline-2 focus:outline-[#1A73E8] disabled:opacity-50"
            />
            <span>dtk</span>
          </label>
          <button
            type="button"
            disabled={isRunning}
            onClick={() => applyCustomDuration(customMinutes, customSeconds + 15)}
            aria-label="Tambah 15 detik"
            className="w-8 h-8 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] inline-flex items-center justify-center text-[#111827] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Primary Timer Controls */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleToggleRun}
          className={`min-h-[48px] px-8 py-3 rounded-2xl text-base font-bold inline-flex items-center gap-2.5 transition-colors whitespace-nowrap cursor-pointer ${
            isRunning
              ? 'bg-[#111827] hover:bg-[#1F2937] text-white'
              : 'bg-[#1A73E8] hover:bg-[#1557B0] text-white shadow-[0_4px_14px_rgba(26,115,232,0.22)]'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-5 h-5" aria-hidden="true" />
              <span>Jeda</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5" aria-hidden="true" />
              <span>{remainingSeconds === 0 ? 'Mulai Ulang' : 'Mulai'}</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="min-h-[48px] px-6 py-3 rounded-2xl border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#111827] text-base font-bold inline-flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          <span>Reset</span>
        </button>
      </div>
    </motion.div>
  );
}
