import { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { sfx } from '../utils/audio';

const WAVE_BAR_COUNT = 44;

const NORMAL_BAR_PALETTE = [
  'from-[#60A5FA]/55 to-[#DBEAFE]/20',
  'from-[#38BDF8]/55 to-[#E0F2FE]/20',
  'from-[#34D399]/55 to-[#DCFCE7]/20',
  'from-[#FBBF24]/50 to-[#FEF3C7]/20',
  'from-[#F87171]/50 to-[#FEE2E2]/20',
] as const;

const DRAMATIC_BAR_PALETTE = [
  'from-[#DC2626]/70 to-[#FEE2E2]/20',
  'from-[#EA4335]/70 to-[#FFEDD5]/20',
  'from-[#F97316]/70 to-[#FEF3C7]/20',
  'from-[#F59E0B]/65 to-[#FEF9C3]/20',
] as const;

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
        if (nextSec > 0 && nextSec <= 10) {
          sfx.playTimerCountdownTick(nextSec <= 3);
        } else if (nextSec === 0) {
          sfx.playTimerFinish();
          setIsRunning(false);
          endTimestampRef.current = null;
        }
      }
    }, 120);

    return () => window.clearInterval(interval);
  }, [isRunning, remainingSeconds]);

  const applyCustomDuration = (mins: number, secs: number) => {
    let safeMins = Math.max(0, Math.min(99, Math.floor(mins)));
    let safeSecs = Math.floor(secs);

    if (safeSecs < 0) {
      if (safeMins > 0) {
        safeMins -= 1;
        safeSecs = 55;
      } else {
        safeSecs = 0;
      }
    } else if (safeSecs > 59) {
      if (safeMins < 99) {
        safeMins += 1;
        safeSecs = 0;
      } else {
        safeSecs = 59;
      }
    }

    const total = Math.max(5, safeMins * 60 + safeSecs);
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
  const isDramatic = remainingSeconds <= 10 && remainingSeconds > 0;
  const isFinished = remainingSeconds === 0;
  const progressRatio = Math.max(0, Math.min(1, remainingSeconds / totalConfiguredSeconds));

  const waveBars = useMemo(
    () =>
      Array.from({ length: WAVE_BAR_COUNT }, (_, idx) => {
        const norm = idx / (WAVE_BAR_COUNT - 1);
        const envelope = 0.45 + 0.55 * Math.sin(norm * Math.PI);
        const harmonic = 0.72 + 0.28 * Math.sin(idx * 0.85);
        return {
          id: idx,
          baseScale: Number((0.22 + 0.36 * envelope * harmonic).toFixed(3)),
          peakScale: Number((0.58 + 0.42 * envelope * harmonic).toFixed(3)),
          delay: Number(((idx % 12) * 0.12).toFixed(2)),
          duration: Number((1.65 + (idx % 5) * 0.22).toFixed(2)),
        };
      }),
    []
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex-1 min-h-0 flex flex-col items-center justify-center px-4 sm:px-8 py-4 overflow-hidden bg-white"
    >
      {/* Soft Ambient Gradient Background Layer */}
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
          isDramatic || isFinished
            ? 'opacity-100 bg-[radial-gradient(circle_at_center,rgba(234,67,53,0.12)_0%,rgba(249,115,22,0.08)_40%,transparent_72%)]'
            : 'opacity-100 bg-[radial-gradient(circle_at_top,rgba(66,133,244,0.08)_0%,rgba(52,168,83,0.05)_42%,transparent_75%)]'
        }`}
        aria-hidden="true"
      />

      {/* Subtle Bottom Gradient Audio Bar Wave Background */}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-0 flex items-end justify-between gap-1 sm:gap-1.5 px-2 sm:px-6 overflow-hidden ${
          isWideProjector ? 'h-40 xl:h-48' : 'h-28 sm:h-36'
        }`}
        aria-hidden="true"
      >
        {waveBars.map((bar, idx) => {
          const palette =
            isDramatic || isFinished ? DRAMATIC_BAR_PALETTE : NORMAL_BAR_PALETTE;
          const colorClass = palette[idx % palette.length];
          const minY = isDramatic
            ? Math.min(0.95, bar.baseScale * 1.4)
            : isRunning
              ? bar.baseScale * 1.08
              : bar.baseScale * 0.78;
          const maxY = isDramatic
            ? Math.min(1, bar.peakScale * 1.15)
            : isRunning
              ? bar.peakScale
              : bar.peakScale * 0.65;

          return (
            <motion.div
              key={bar.id}
              animate={{
                scaleY: [minY, maxY, minY],
                opacity: isDramatic ? [0.65, 0.95, 0.65] : [0.48, 0.8, 0.48],
              }}
              transition={{
                duration: isDramatic ? bar.duration * 0.55 : bar.duration,
                repeat: Infinity,
                repeatType: 'mirror',
                ease: 'easeInOut',
                delay: bar.delay,
              }}
              style={{ transformOrigin: 'bottom center' }}
              className={`flex-1 h-full rounded-t-full bg-gradient-to-t ${colorClass}`}
            />
          );
        })}

        {/* Soft Mist Fade so Wave Blends Gently into Background */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-white via-white/75 to-transparent" />
      </div>

      {/* Foreground Centered Timer Content */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-4xl">
        {/* Gradient Countdown Stage Card */}
        <div className="relative flex items-center justify-center">
          {/* Expanding Soft Glow Aura During Final 10 Seconds (Stroke-Free) */}
          <AnimatePresence>
            {isDramatic && (
              <motion.div
                key={`pulse-${remainingSeconds}`}
                initial={{ opacity: 0.45, scale: 0.96 }}
                animate={{ opacity: 0, scale: 1.12 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-none absolute inset-0 rounded-[34px] bg-gradient-to-br from-[#EA4335]/28 via-[#F97316]/20 to-[#FBBF24]/20 blur-md"
                aria-hidden="true"
              />
            )}
          </AnimatePresence>

          {/* Outer Soft Gradient Halo Frame */}
          <div
            className={`relative rounded-[32px] p-[2px] transition-all duration-300 ${
              isWideProjector ? 'my-4' : 'my-3 sm:my-4'
            } ${
              isDramatic || isFinished
                ? 'bg-gradient-to-br from-[#EF4444]/60 via-[#F97316]/55 to-[#FBBF24]/55 shadow-[0_24px_64px_rgba(234,67,53,0.22)]'
                : isRunning
                  ? 'bg-gradient-to-br from-[#4285F4]/35 via-[#06B6D4]/25 to-[#34A853]/35 shadow-[0_20px_54px_rgba(26,115,232,0.14)]'
                  : 'bg-gradient-to-br from-[#DBEAFE]/70 via-[#F8FAFC] to-[#DCFCE7]/70 shadow-[0_14px_40px_rgba(15,23,42,0.08)]'
            }`}
          >
            <div
              className={`relative rounded-[30px] overflow-hidden backdrop-blur-md transition-colors duration-300 ${
                isWideProjector
                  ? 'px-16 py-9'
                  : 'px-8 sm:px-14 py-5 sm:py-8'
              } ${
                isDramatic || isFinished
                  ? 'bg-gradient-to-br from-[#FFF5F5]/95 via-white/95 to-[#FFFBEB]/95'
                  : 'bg-gradient-to-br from-[#F8FAFF]/95 via-white/95 to-[#F3FBF6]/95'
              }`}
            >
              {/* Giant Gradient Countdown Digits */}
              <motion.div
                key={isDramatic ? `dramatic-${remainingSeconds}` : 'steady'}
                initial={
                  isDramatic
                    ? { scale: 1.13, opacity: 0.78 }
                    : false
                }
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                aria-live="polite"
                className={`font-bold tabular-nums tracking-tight leading-none select-none bg-clip-text text-transparent ${
                  isWideProjector
                    ? 'text-[clamp(6rem,19vh,12rem)]'
                    : 'text-[clamp(4.25rem,15vh,9.8rem)]'
                } ${
                  isDramatic || isFinished
                    ? 'bg-gradient-to-b from-[#B91C1C] via-[#EA4335] to-[#F59E0B]'
                    : isRunning
                      ? 'bg-gradient-to-br from-[#0F172A] via-[#1D4ED8] to-[#0284C7]'
                      : 'bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155]'
                }`}
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {formattedTime}
              </motion.div>

              {/* Status Label */}
              <div
                className={`mt-3 text-center font-bold ${
                  isWideProjector ? 'text-base' : 'text-xs sm:text-sm'
                }`}
              >
                {isFinished ? (
                  <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-gradient-to-r from-[#EA4335] to-[#F59E0B] text-white shadow-xs">
                    Waktu Habis!
                  </span>
                ) : isDramatic ? (
                  <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-gradient-to-r from-[#DC2626] via-[#EA4335] to-[#F59E0B] text-white shadow-xs animate-pulse">
                    {remainingSeconds} Detik Terakhir!
                  </span>
                ) : isRunning ? (
                  <span className="text-[#1A73E8]">Timer sedang berjalan...</span>
                ) : (
                  <span className="text-[#4B5563]">
                    Durasi: {String(customMinutes).padStart(2, '0')}:
                    {String(customSeconds).padStart(2, '0')}
                  </span>
                )}
              </div>

              {/* Subtle Gradient Progress Bar Along Card Bottom */}
              <div className="absolute inset-x-0 bottom-0 h-1.5 bg-[#E2E8F0]/55">
                <div
                  style={{ width: `${progressRatio * 100}%` }}
                  className={`h-full transition-[width] duration-200 ${
                    isDramatic || isFinished
                      ? 'bg-gradient-to-r from-[#DC2626] via-[#EA4335] to-[#FBBF24]'
                      : 'bg-gradient-to-r from-[#4285F4] via-[#06B6D4] to-[#34A853]'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stroke-Free Custom Duration Picker Only */}
        <div className="mb-4 flex flex-wrap items-center justify-center gap-3 px-4 py-2.5 rounded-2xl bg-white/95 backdrop-blur-md shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={isRunning}
              onClick={() => applyCustomDuration(customMinutes - 1, customSeconds)}
              aria-label="Kurangi 1 menit"
              className="w-8 h-8 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] inline-flex items-center justify-center text-[#111827] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                className="w-12 h-8 text-center rounded-lg bg-[#F8FAFC] text-sm font-bold tabular-nums text-[#111827] focus:outline-2 focus:outline-[#1A73E8] disabled:opacity-50"
              />
              <span>mnt</span>
            </label>
            <button
              type="button"
              disabled={isRunning}
              onClick={() => applyCustomDuration(customMinutes + 1, customSeconds)}
              aria-label="Tambah 1 menit"
              className="w-8 h-8 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] inline-flex items-center justify-center text-[#111827] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <span className="text-[#CBD5E1] font-bold" aria-hidden="true">
            :
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={isRunning}
              onClick={() => applyCustomDuration(customMinutes, customSeconds - 5)}
              aria-label="Kurangi 5 detik"
              className="w-8 h-8 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] inline-flex items-center justify-center text-[#111827] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                className="w-12 h-8 text-center rounded-lg bg-[#F8FAFC] text-sm font-bold tabular-nums text-[#111827] focus:outline-2 focus:outline-[#1A73E8] disabled:opacity-50"
              />
              <span>dtk</span>
            </label>
            <button
              type="button"
              disabled={isRunning}
              onClick={() => applyCustomDuration(customMinutes, customSeconds + 5)}
              aria-label="Tambah 5 detik"
              className="w-8 h-8 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] inline-flex items-center justify-center text-[#111827] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
            className={`min-h-[48px] px-8 py-3 rounded-2xl text-base font-bold inline-flex items-center gap-2.5 transition-all whitespace-nowrap cursor-pointer ${
              isRunning
                ? 'bg-[#111827] hover:bg-[#1F2937] text-white'
                : 'bg-gradient-to-r from-[#1A73E8] to-[#2563EB] hover:from-[#1557B0] hover:to-[#1D4ED8] text-white shadow-[0_6px_20px_rgba(26,115,232,0.26)]'
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
            className="min-h-[48px] px-6 py-3 rounded-2xl bg-white/95 hover:bg-[#F1F5F9] text-[#111827] text-base font-bold inline-flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer shadow-[0_6px_18px_rgba(15,23,42,0.07)]"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
