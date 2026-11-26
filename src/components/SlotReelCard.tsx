import { useId, useRef, useState } from 'react';
import { PoolIconName } from '../data/pools';
import { ReelIcon } from './ReelIcon';

export type ChevronDirection = 'up' | 'down' | 'right' | 'left';

export interface ReelTheme {
  stepLabel: string;
  headerTitle: string;
  titleTop: string;
  titleBottom: string;
  chevronDirection: ChevronDirection;
  primaryColor: string;
  midColor: string;
  chevronStart: string;
  chevronEnd: string;
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

function CardChevronMark({
  direction,
  startColor,
  endColor,
  className = 'w-14 h-14',
}: {
  direction: ChevronDirection;
  startColor: string;
  endColor: string;
  className?: string;
}) {
  const reactId = useId();
  const gradId = `card-chevron-${reactId.replace(/:/g, '')}`;
  const rotation =
    direction === 'up'
      ? 180
      : direction === 'right'
        ? -90
        : direction === 'left'
          ? 90
          : 0;

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={gradId}
          x1="32"
          y1="14"
          x2="32"
          y2="52"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={startColor} />
          <stop offset="100%" stopColor={endColor} />
        </linearGradient>
      </defs>
      <g transform={`rotate(${rotation} 32 32)`}>
        <path
          d="M11 19.5C14.4 16.1 19.9 16.1 23.3 19.5L32 28.2L40.7 19.5C44.1 16.1 49.6 16.1 53 19.5C56.4 22.9 56.4 28.4 53 31.8L38.1 46.7C34.7 50.1 29.3 50.1 25.9 46.7L11 31.8C7.6 28.4 7.6 22.9 11 19.5Z"
          fill={`url(#${gradId})`}
          stroke="rgba(255,255,255,0.92)"
          strokeWidth="1.4"
        />
      </g>
    </svg>
  );
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

  const cardBackground = `radial-gradient(128% 112% at 14% 16%, ${theme.primaryColor} 0%, ${theme.midColor} 46%, rgba(255,255,255,0) 84%), linear-gradient(180deg, ${theme.primaryColor} 0%, #FFFFFF 100%)`;

  return (
    <section
      aria-label={theme.headerTitle}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      style={{
        backgroundColor: '#FFFFFF',
        backgroundImage: `radial-gradient(124% 108% at 12% 14%, ${theme.primaryColor} 0%, ${theme.midColor} 48%, rgba(255,255,255,0) 84%)`,
        ...(swipeOffsetX !== 0
          ? {
              transform: `translate3d(${swipeOffsetX}px, 0, 0)`,
              transition: 'none',
            }
          : {
              transform: 'translate3d(0, 0, 0)',
              transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
            }),
      }}
      className={`touch-pan-y relative flex flex-col justify-between rounded-[28px] bg-white overflow-hidden select-none lg:select-auto transition-shadow duration-200 ${
        isWideProjector
          ? 'min-h-[300px] lg:h-[clamp(300px,50vh,430px)] p-6 xl:p-7'
          : isFocusMode
            ? 'min-h-[250px] lg:h-[clamp(260px,46vh,360px)] p-5 sm:p-6'
            : 'h-full min-h-[240px] p-5'
      } ${
        isSpinning
          ? 'reel-chassis-spinning shadow-[0_22px_54px_rgba(15,23,42,0.16)]'
          : 'shadow-[0_18px_46px_rgba(15,23,42,0.08)]'
      }`}
    >
      {/* Subtle secondary organic radial wash matching Figma reference */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: cardBackground, opacity: 0.92 }}
        aria-hidden="true"
      />

      {/* Top-Left Stacked Bold White Title */}
      <div className="relative z-10 flex items-start justify-between gap-2 shrink-0">
        <h2
          className={`font-bold text-white tracking-tight leading-[1.06] ${
            isWideProjector
              ? 'text-3xl xl:text-4xl'
              : isFocusMode
                ? 'text-2xl sm:text-3xl'
                : 'text-2xl'
          }`}
        >
          <span className="block">{theme.titleTop}</span>
          <span className="block">{theme.titleBottom}</span>
        </h2>
      </div>

      {/* Center Content: Clean Reference Space When Idle, Rolling Glass Strip When Spinning */}
      {isSpinning ? (
        <div className="relative z-10 flex-1 min-h-0 flex flex-col justify-center overflow-hidden my-2">
          <div className="reel-drum-spinning rounded-2xl bg-white/90 backdrop-blur-md px-3.5 py-4 shadow-[0_12px_32px_rgba(15,23,42,0.12)] flex flex-col items-center justify-center gap-2 text-center select-none">
            <div className="text-[11px] font-semibold text-[#64748B] opacity-65 truncate max-w-full">
              {item.prevTitle ?? 'Mengacak...'}
            </div>

            <div className="flex flex-col items-center gap-1.5 py-1">
              <div
                className={`w-10 h-10 rounded-xl ${theme.softBgClass} ${theme.softTextClass} flex items-center justify-center`}
              >
                <ReelIcon name={item.icon} className="w-5 h-5" />
              </div>
              <div
                className={`${isWideProjector ? 'text-base' : 'text-sm'} font-bold text-[#111827] leading-snug line-clamp-2`}
              >
                {item.title}
              </div>
            </div>

            <div className="text-[11px] font-semibold text-[#64748B] opacity-65 truncate max-w-full">
              {item.nextTitle ?? 'Mengacak...'}
            </div>
          </div>
        </div>
      ) : isRevealed ? (
        <div
          key={item.key}
          className="reel-stop-snap relative z-10 flex-1 min-h-0 flex flex-col justify-center my-2"
        >
          <div className="rounded-2xl bg-white/94 backdrop-blur-md p-3.5 shadow-[0_12px_32px_rgba(15,23,42,0.1)] space-y-1.5">
            <div className="flex items-start gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl ${theme.softBgClass} ${theme.softTextClass} flex items-center justify-center shrink-0`}
              >
                <ReelIcon name={item.icon} className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#111827] leading-snug">
                  {item.title}
                </h3>
                <p className="text-[11px] font-semibold text-[#64748B] truncate">
                  {item.meta}
                </p>
              </div>
            </div>
            <p className="text-xs text-[#374151] leading-relaxed line-clamp-3">
              {item.description}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1" aria-hidden="true" />
      )}

      {/* Bottom-Right Glossy Chevron Mark */}
      <div className="relative z-10 flex items-end justify-end shrink-0">
        <CardChevronMark
          direction={theme.chevronDirection}
          startColor={theme.chevronStart}
          endColor={theme.chevronEnd}
          className={
            isWideProjector
              ? 'w-14 h-14 xl:w-16 xl:h-16'
              : 'w-11 h-11 sm:w-13 sm:h-13'
          }
        />
      </div>
    </section>
  );
}
