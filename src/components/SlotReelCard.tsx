import { useId, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from 'motion/react';
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
  const cardRef = useRef<HTMLElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [swipeOffsetX, setSwipeOffsetX] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const isSwipingRef = useRef(false);

  // 3D Glassmorphism Tilt & Specular Glare Motion Values
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const glareXRaw = useMotionValue(50);
  const glareYRaw = useMotionValue(30);

  const springConfig = { stiffness: 260, damping: 24, mass: 0.5 };
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [9, -9]), springConfig);
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-10, 10]), springConfig);
  const glareX = useSpring(glareXRaw, springConfig);
  const glareY = useSpring(glareYRaw, springConfig);
  const glassGlareBackground = useMotionTemplate`radial-gradient(290px circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.46) 0%, rgba(255,255,255,0.16) 36%, rgba(255,255,255,0) 72%)`;

  const hasSwipeHandlers = Boolean(onSwipeLeft || onSwipeRight);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const normX = (e.clientX - rect.left) / rect.width - 0.5;
    const normY = (e.clientY - rect.top) / rect.height - 0.5;
    pointerX.set(normX);
    pointerY.set(normY);
    glareXRaw.set(((e.clientX - rect.left) / rect.width) * 100);
    glareYRaw.set(((e.clientY - rect.top) / rect.height) * 100);
    if (!isHovered) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    pointerX.set(0);
    pointerY.set(0);
    glareXRaw.set(50);
    glareYRaw.set(30);
  };

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
    <div style={{ perspective: '1150px' }} className="h-full">
      <motion.section
        ref={cardRef}
        aria-label={theme.headerTitle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        animate={{
          y: isHovered && !isSpinning ? -6 : 0,
          scale: isHovered && !isSpinning ? 1.022 : 1,
        }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        style={{
          backgroundColor: isHovered && !isSpinning ? 'rgba(255,255,255,0.76)' : '#FFFFFF',
          backgroundImage: `radial-gradient(124% 108% at 12% 14%, ${theme.primaryColor} 0%, ${theme.midColor} 48%, rgba(255,255,255,0) 84%)`,
          transformStyle: 'preserve-3d',
          rotateX: swipeOffsetX === 0 && !isSpinning ? rotateX : 0,
          rotateY: swipeOffsetX === 0 && !isSpinning ? rotateY : 0,
          x: swipeOffsetX,
        }}
        className={`touch-pan-y group relative flex flex-col justify-between rounded-[28px] overflow-hidden select-none lg:select-auto transition-[box-shadow,background-color] duration-300 ${
          isWideProjector
            ? 'min-h-[300px] lg:h-[clamp(300px,50vh,430px)] p-6 xl:p-7'
            : isFocusMode
              ? 'min-h-[250px] lg:h-[clamp(260px,46vh,360px)] p-5 sm:p-6'
              : 'h-full min-h-[240px] p-5'
        } ${
          isHovered && !isSpinning
            ? 'backdrop-blur-xl shadow-[0_32px_72px_rgba(15,23,42,0.18),inset_0_2px_2px_rgba(255,255,255,0.82),inset_0_-2px_6px_rgba(255,255,255,0.3)]'
            : isSpinning
              ? 'shadow-[0_22px_54px_rgba(15,23,42,0.14)]'
              : 'shadow-[0_18px_46px_rgba(15,23,42,0.08)]'
        }`}
      >
        {/* Subtle secondary organic radial wash matching Figma reference */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{ background: cardBackground, opacity: isHovered && !isSpinning ? 0.84 : 0.92 }}
          aria-hidden="true"
        />

        {/* Interactive 3D Glassmorphism Frosted Sheen & Cursor-Tracked Specular Glare */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
          style={{
            background: glassGlareBackground,
            opacity: isHovered && !isSpinning ? 1 : 0,
          }}
          aria-hidden="true"
        />
        <div
          className={`pointer-events-none absolute inset-0 z-20 transition-opacity duration-300 ${
            isHovered && !isSpinning ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background:
              'linear-gradient(132deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.06) 38%, rgba(255,255,255,0) 64%)',
          }}
          aria-hidden="true"
        />

        {/* Top-Left Stacked Bold White Title (with 3D parallax elevation on hover) */}
        <div
          className="relative z-10 flex items-start justify-between gap-2 shrink-0 transition-transform duration-300"
          style={{ transform: isHovered && !isSpinning ? 'translateZ(26px)' : 'translateZ(0px)' }}
        >
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

      {/* Center Content: Blended Seamless Rolling Aperture & Eased Settle */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col justify-center my-2">
        <AnimatePresence mode="wait">
          {isSpinning ? (
            <motion.div
              key="spinning"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex-1 min-h-0 flex flex-col justify-center overflow-hidden"
            >
              {/* Feathered Radial Mist Blending Into Card Gradient (Zero Boxy Edges) */}
              <div
                className="pointer-events-none absolute -inset-x-4 inset-y-0"
                style={{
                  background:
                    'radial-gradient(ellipse 88% 68% at 50% 50%, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.44) 48%, rgba(255,255,255,0) 84%)',
                }}
                aria-hidden="true"
              />

              {/* Vertically Masked Smooth Rolling Strip */}
              <div
                style={{
                  maskImage:
                    'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.45) 18%, #000 36%, #000 64%, rgba(0,0,0,0.45) 82%, transparent 100%)',
                  WebkitMaskImage:
                    'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.45) 18%, #000 36%, #000 64%, rgba(0,0,0,0.45) 82%, transparent 100%)',
                }}
                className="relative z-10 py-3 overflow-hidden"
              >
                <div
                  key={`${item.key}-${item.title}`}
                  className="reel-tick-glide flex flex-col items-center justify-center gap-2.5 text-center select-none px-2"
                >
                  <div className="text-[11px] font-semibold text-[#475569]/70 truncate max-w-full">
                    {item.prevTitle ?? 'Mengacak...'}
                  </div>

                  <div className="flex flex-col items-center gap-1.5 py-1">
                    <div
                      className={`w-10 h-10 rounded-xl ${theme.softBgClass} ${theme.softTextClass} flex items-center justify-center shadow-[0_4px_14px_rgba(15,23,42,0.06)]`}
                    >
                      <ReelIcon name={item.icon} className="w-5 h-5" />
                    </div>
                    <div
                      className={`${isWideProjector ? 'text-base' : 'text-sm'} font-bold text-[#0F172A] leading-snug line-clamp-2`}
                    >
                      {item.title}
                    </div>
                  </div>

                  <div className="text-[11px] font-semibold text-[#475569]/70 truncate max-w-full">
                    {item.nextTitle ?? 'Mengacak...'}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : isRevealed ? (
            <motion.div
              key={`settled-${item.key}`}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 min-h-0 flex flex-col justify-center"
            >
              <div className="rounded-2xl bg-white/82 backdrop-blur-md p-3.5 shadow-[0_12px_32px_rgba(15,23,42,0.08)] space-y-1.5">
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
            </motion.div>
          ) : (
            <div key="idle" className="flex-1" aria-hidden="true" />
          )}
        </AnimatePresence>
      </div>

      {/* Bottom-Right Glossy Chevron Mark (with 3D parallax elevation on hover) */}
      <div
        className="relative z-10 flex items-end justify-end shrink-0 transition-transform duration-300"
        style={{ transform: isHovered && !isSpinning ? 'translateZ(34px)' : 'translateZ(0px)' }}
      >
        <CardChevronMark
          direction={theme.chevronDirection}
          startColor={theme.chevronStart}
          endColor={theme.chevronEnd}
          className={`transition-all duration-300 ${
            isWideProjector
              ? 'w-14 h-14 xl:w-16 xl:h-16'
              : 'w-11 h-11 sm:w-13 sm:h-13'
          } ${isHovered && !isSpinning ? 'drop-shadow-[0_10px_18px_rgba(15,23,42,0.2)]' : ''}`}
        />
      </div>
    </motion.section>
    </div>
  );
}
