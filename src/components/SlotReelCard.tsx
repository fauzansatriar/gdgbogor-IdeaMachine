import { useRef, useState } from 'react';
import { PoolIconName } from '../data/pools';
import { ReelIcon } from './ReelIcon';

export interface ReelTheme {
  stepLabel: string;
  headerTitle: string;
  gradientClass: string;
  headerTextClass: string;
  accentColor: string;
  softBgClass: string;
  softTextClass: string;
  mysteryImageSrc?: string;
}

export interface ReelDisplayData {
  key: string;
  icon: PoolIconName;
  title: string;
  meta: string;
  description: string;
  bullets?: string[];
  prevTitle?: string;
  nextTitle?: string;
}

interface SlotReelCardProps {
  theme: ReelTheme;
  item: ReelDisplayData;
  isRevealed: boolean;
  isSpinning: boolean;
  isFocusMode?: boolean;
  isWideProjector?: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export function SlotReelCard({
  theme,
  item,
  isRevealed,
  isSpinning,
  isFocusMode = false,
  isWideProjector = false,
  onSwipeLeft,
  onSwipeRight,
}: SlotReelCardProps) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [swipeOffsetX, setSwipeOffsetX] = useState(0);
  const isSwipingRef = useRef(false);

  const hasSwipeHandlers = Boolean(onSwipeLeft || onSwipeRight);

  const handleTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    if (!hasSwipeHandlers || e.touches.length !== 1) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    isSwipingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLElement>) => {
    if (!hasSwipeHandlers || !touchStartRef.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;

    if (!isSwipingRef.current) {
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        isSwipingRef.current = true;
      } else {
        return;
      }
    }

    const clamped = Math.max(-72, Math.min(72, dx * 0.45));
    setSwipeOffsetX(clamped);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLElement>) => {
    if (!hasSwipeHandlers || !touchStartRef.current) {
      setSwipeOffsetX(0);
      return;
    }

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const wasHorizontalSwipe =
      Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.15;

    touchStartRef.current = null;
    isSwipingRef.current = false;
    setSwipeOffsetX(0);

    if (!wasHorizontalSwipe) return;

    if (dx < 0) {
      onSwipeLeft?.();
    } else {
      onSwipeRight?.();
    }
  };

  const handleTouchCancel = () => {
    touchStartRef.current = null;
    isSwipingRef.current = false;
    setSwipeOffsetX(0);
  };

  return (
    <section
      aria-label={`${theme.stepLabel}: ${theme.headerTitle}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      style={
        swipeOffsetX !== 0
          ? {
              transform: `translate3d(${swipeOffsetX}px, 0, 0)`,
              transition: 'none',
            }
          : {
              transform: 'translate3d(0, 0, 0)',
              transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
            }
      }
      className={`touch-pan-y flex flex-col rounded-2xl border-2 transition-colors duration-200 bg-white overflow-hidden select-none lg:select-auto ${
        isWideProjector
          ? 'min-h-[280px] lg:h-[clamp(290px,50vh,430px)]'
          : isFocusMode
            ? 'min-h-[240px] lg:h-[clamp(250px,46vh,360px)]'
            : 'h-full min-h-[220px]'
      } ${
        isSpinning
          ? 'reel-chassis-spinning border-[#1A73E8] shadow-[0_10px_28px_rgba(26,115,232,0.16)]'
          : 'border-[#CBD5E1]'
      }`}
    >
      {/* Clean Google Gradient Header */}
      <div
        className={`px-4 py-2.5 flex items-center justify-between gap-2 bg-gradient-to-r ${theme.gradientClass} ${theme.headerTextClass} shrink-0`}
      >
        <div className="min-w-0">
          <div
            className={`${isWideProjector ? 'text-xs' : 'text-[11px]'} font-bold opacity-95 tracking-wider truncate`}
          >
            {theme.stepLabel}
          </div>
          <h2
            className={`${isWideProjector ? 'text-base' : 'text-sm'} font-bold leading-tight truncate`}
          >
            {theme.headerTitle}
          </h2>
        </div>
      </div>

      {/* Classic Slot Machine Drum Aperture */}
      <div
        className={`relative flex-1 min-h-0 flex flex-col justify-between bg-white overflow-hidden ${
          isWideProjector ? 'p-6' : isFocusMode ? 'p-5' : 'p-4'
        }`}
      >
        {/* Top & Bottom Cylindrical Drum Shading */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-slate-900/[0.06] to-transparent z-20"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-slate-900/[0.06] to-transparent z-20"
          aria-hidden="true"
        />

        {/* Classic Payline Markers on Left/Right Edge */}
        <div
          className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r bg-[#CBD5E1]/80 z-20"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-l bg-[#CBD5E1]/80 z-20"
          aria-hidden="true"
        />

        {!isRevealed && !isSpinning ? (
          /* Clean Transparent 3D Glassmorphism Question Mark Only */
          <div className="flex-1 flex items-center justify-center p-2">
            {theme.mysteryImageSrc ? (
              <img
                src={theme.mysteryImageSrc}
                alt={`Ikon misteri ${theme.headerTitle}`}
                referrerPolicy="no-referrer"
                className={`object-contain select-none pointer-events-none drop-shadow-[0_14px_20px_rgba(15,23,42,0.14)] ${
                  isWideProjector
                    ? 'w-40 h-40'
                    : isFocusMode
                      ? 'w-32 h-32 sm:w-36 sm:h-36'
                      : 'w-28 h-28'
                }`}
              />
            ) : null}
          </div>
        ) : isSpinning ? (
          /* Dramatic CSS Blur + Vibration + Vertical Streak Drum Spin */
          <div className="relative flex-1 min-h-0 flex flex-col justify-center overflow-hidden">
            <div
              className="pointer-events-none absolute inset-x-0 -top-full h-[200%] reel-streak-overlay opacity-45 z-10"
              style={{
                background:
                  'repeating-linear-gradient(to bottom, transparent 0px, transparent 18px, rgba(26,115,232,0.06) 19px, rgba(26,115,232,0.06) 24px)',
              }}
              aria-hidden="true"
            />

            <div className="reel-drum-spinning flex flex-col items-center justify-center gap-3 py-2 text-center select-none">
              <div
                className={`${isWideProjector ? 'text-sm' : 'text-xs'} font-semibold text-[#64748B] opacity-60 truncate max-w-full px-3`}
              >
                {item.prevTitle ?? 'Mengacak...'}
              </div>

              <div className="w-full px-3 py-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col items-center gap-2">
                <div
                  className={`${isWideProjector ? 'w-14 h-14' : 'w-12 h-12'} rounded-xl ${theme.softBgClass} ${theme.softTextClass} flex items-center justify-center`}
                >
                  <ReelIcon name={item.icon} className={isWideProjector ? 'w-7 h-7' : 'w-6 h-6'} />
                </div>
                <div
                  className={`${isWideProjector ? 'text-lg' : 'text-[15px]'} font-bold text-[#111827] leading-snug`}
                >
                  {item.title}
                </div>
              </div>

              <div
                className={`${isWideProjector ? 'text-sm' : 'text-xs'} font-semibold text-[#64748B] opacity-60 truncate max-w-full px-3`}
              >
                {item.nextTitle ?? 'Mengacak...'}
              </div>
            </div>
          </div>
        ) : (
          /* Settled Reveal */
          <div
            key={item.key}
            className="reel-stop-snap flex-1 flex flex-col justify-start gap-2.5"
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl ${theme.softBgClass} ${theme.softTextClass} flex items-center justify-center shrink-0 mt-0.5`}
              >
                <ReelIcon name={item.icon} className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3
                  className={`font-bold text-[#111827] leading-snug text-balance ${
                    isWideProjector ? 'text-xl' : isFocusMode ? 'text-lg' : 'text-[15.5px]'
                  }`}
                >
                  {item.title}
                </h3>
                <p className="mt-0.5 text-xs font-semibold text-[#4B5563]">
                  {item.meta}
                </p>
              </div>
            </div>

            <div className="h-px bg-[#E2E8F0] shrink-0" />

            <p
              className={`leading-relaxed text-[#1F2937] ${
                isWideProjector ? 'text-[15px]' : isFocusMode ? 'text-[14px]' : 'text-[12.5px]'
              }`}
            >
              {item.description}
            </p>
          </div>
        )}

        {/* Crisp Footer Status (shown during spin or when revealed) */}
        {(isSpinning || isRevealed) && (
          <div className="pt-2.5 mt-3 border-t border-[#F1F5F9] flex items-center justify-between text-[11.5px] font-medium text-[#4B5563] shrink-0">
            <span>{isSpinning ? 'Berputar cepat...' : 'Hasil terbuka'}</span>
            <span className="tabular-nums font-bold text-[#111827]">
              {isSpinning ? 'SPIN' : 'OPEN'}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
