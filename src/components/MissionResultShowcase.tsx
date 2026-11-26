import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Laptop,
  MonitorSmartphone,
  Smartphone,
  Tablet,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ContextualMission } from '../data/pools';
import { sfx } from '../utils/audio';
import { buildMissionBriefUrl } from '../utils/briefCodec';
import { QrCodeSvg } from './QrCodeSvg';
import { ReelIcon } from './ReelIcon';

export type RevealStage = 'problem' | 'app' | 'user' | 'brief';

interface MissionResultShowcaseProps {
  mission: ContextualMission;
  participantNumber: number;
  participantName: string;
  revealKey: number;
  stage: RevealStage;
  autoPlay: boolean;
  isWideProjector?: boolean;
  advanceActionLabel: string;
  onSelectStage: (stage: RevealStage, stopAutoPlay?: boolean) => void;
  onConfirmAndAdvance: () => void;
}

const EASE_CINEMATIC: [number, number, number, number] = [0.16, 1, 0.3, 1];

const STAGE_ORDER: RevealStage[] = ['problem', 'app', 'user', 'brief'];

/**
 * Calculates a relaxed, audience-friendly reveal duration in milliseconds
 * proportional to the amount of text displayed in each stage.
 */
function calculateStageDurationMs(
  stage: 'problem' | 'app' | 'user',
  mission: ContextualMission
): number {
  if (stage === 'problem') {
    const charCount =
      mission.problem.title.trim().length +
      mission.problem.description.trim().length;
    return Math.min(13000, Math.max(6500, Math.round(2800 + charCount * 58)));
  }

  if (stage === 'app') {
    const charCount =
      mission.solution.title.trim().length +
      mission.solution.contextualHowToBuild.trim().length +
      mission.solution.contextualFeatures.join(' ').trim().length;
    return Math.min(17500, Math.max(9500, Math.round(3400 + charCount * 50)));
  }

  const charCount =
    mission.targetUser.title.trim().length +
    mission.targetUser.contextualDescription.trim().length;
  return Math.min(13000, Math.max(6500, Math.round(2800 + charCount * 58)));
}

function RevealChevronMark({
  direction,
  variant,
  className = 'w-12 h-9',
}: {
  direction: 'up' | 'down';
  variant: 'red' | 'green';
  className?: string;
}) {
  const reactId = useId();
  const gradId = `chevron-grad-${variant}-${direction}-${reactId.replace(/:/g, '')}`;
  const colors =
    variant === 'green'
      ? { start: '#14532D', end: '#22C55E' }
      : { start: '#991B1B', end: '#EF4444' };

  return (
    <svg
      viewBox="0 0 64 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={gradId}
          x1="32"
          y1={direction === 'down' ? '4' : '40'}
          x2="32"
          y2={direction === 'down' ? '40' : '4'}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={colors.start} />
          <stop offset="100%" stopColor={colors.end} />
        </linearGradient>
      </defs>
      {direction === 'down' ? (
        <path
          d="M11 9.5C14.2 6.3 19.4 6.3 22.6 9.5L32 18.9L41.4 9.5C44.6 6.3 49.8 6.3 53 9.5C56.2 12.7 56.2 17.9 53 21.1L37.8 36.3C34.6 39.5 29.4 39.5 26.2 36.3L11 21.1C7.8 17.9 7.8 12.7 11 9.5Z"
          fill={`url(#${gradId})`}
          stroke="rgba(255,255,255,0.88)"
          strokeWidth="1.6"
        />
      ) : (
        <path
          d="M11 34.5C14.2 37.7 19.4 37.7 22.6 34.5L32 25.1L41.4 34.5C44.6 37.7 49.8 37.7 53 34.5C56.2 31.3 56.2 26.1 53 22.9L37.8 7.7C34.6 4.5 29.4 4.5 26.2 7.7L11 22.9C7.8 26.1 7.8 31.3 11 34.5Z"
          fill={`url(#${gradId})`}
          stroke="rgba(255,255,255,0.88)"
          strokeWidth="1.6"
        />
      )}
    </svg>
  );
}

function getDeviceIndicatorMeta(deviceId: string) {
  switch (deviceId) {
    case 'desktop':
      return { label: 'Desktop', Icon: Laptop };
    case 'tablet-kiosk':
      return { label: 'Tablet', Icon: Tablet };
    case 'cross-platform':
      return { label: 'Mobile & Desktop', Icon: MonitorSmartphone };
    case 'mobile':
    default:
      return { label: 'Mobile', Icon: Smartphone };
  }
}

const stageVariants = {
  enter: (dir: number) => ({
    opacity: 0,
    x: dir >= 0 ? 44 : -44,
    scale: 0.975,
    filter: 'blur(6px)',
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    filter: 'blur(0px)',
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir >= 0 ? -44 : 44,
    scale: 0.975,
    filter: 'blur(6px)',
  }),
};

export function MissionResultShowcase({
  mission,
  participantNumber,
  participantName,
  revealKey,
  stage,
  autoPlay,
  isWideProjector = false,
  advanceActionLabel,
  onSelectStage,
  onConfirmAndAdvance,
}: MissionResultShowcaseProps) {
  const [isQrZoomed, setIsQrZoomed] = useState(false);
  const [transitionDir, setTransitionDir] = useState<number>(1);
  const prevStageRef = useRef<RevealStage>(stage);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isSwipingRef = useRef(false);
  const [swipeOffsetX, setSwipeOffsetX] = useState(0);

  useEffect(() => {
    const prevIdx = STAGE_ORDER.indexOf(prevStageRef.current);
    const nextIdx = STAGE_ORDER.indexOf(stage);
    if (prevIdx !== nextIdx) {
      setTransitionDir(nextIdx >= prevIdx ? 1 : -1);
      prevStageRef.current = stage;
    }
  }, [stage]);

  useEffect(() => {
    setIsQrZoomed(false);
  }, [revealKey, stage]);

  const briefUrl = useMemo(
    () =>
      buildMissionBriefUrl(
        participantNumber,
        {
          problemId: mission.problem.id,
          userId: mission.targetUser.id,
          solutionId: mission.solution.id,
          deviceId: mission.device.id,
          mission,
        },
        participantName
      ),
    [mission, participantName, participantNumber]
  );

  const stageDurationMs = useMemo(() => {
    if (stage === 'brief') return 0;
    return calculateStageDurationMs(stage, mission);
  }, [mission, stage]);

  useEffect(() => {
    if (!autoPlay || stage === 'brief') return;

    const nextStage: RevealStage =
      stage === 'problem' ? 'app' : stage === 'app' ? 'user' : 'brief';

    const timeout = window.setTimeout(() => {
      setTransitionDir(1);
      if (nextStage === 'brief') {
        sfx.playFanfare();
      } else {
        sfx.playReelStop(nextStage === 'app' ? 1 : 2);
      }
      onSelectStage(nextStage, false);
    }, stageDurationMs);

    return () => window.clearTimeout(timeout);
  }, [autoPlay, onSelectStage, revealKey, stage, stageDurationMs]);

  const navigateStage = (targetStage: RevealStage, stopAutoPlay = true) => {
    const curIdx = STAGE_ORDER.indexOf(stage);
    const nextIdx = STAGE_ORDER.indexOf(targetStage);
    if (curIdx === nextIdx) return;

    setTransitionDir(nextIdx > curIdx ? 1 : -1);
    if (targetStage === 'brief') {
      sfx.playFanfare();
    } else if (nextIdx > curIdx) {
      sfx.playReelStop(nextIdx);
    }
    onSelectStage(targetStage, stopAutoPlay);
  };

  const handleAdvance = () => {
    const curIdx = STAGE_ORDER.indexOf(stage);
    if (curIdx < STAGE_ORDER.length - 1) {
      navigateStage(STAGE_ORDER[curIdx + 1], true);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    isSwipingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;

    if (!isSwipingRef.current) {
      if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        isSwipingRef.current = true;
      } else {
        return;
      }
    }

    const curIdx = STAGE_ORDER.indexOf(stage);
    const atStart = curIdx === 0 && dx > 0;
    const atEnd = curIdx === STAGE_ORDER.length - 1 && dx < 0;
    const factor = atStart || atEnd ? 0.18 : 0.42;
    setSwipeOffsetX(Math.max(-80, Math.min(80, dx * factor)));
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current) {
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

    const curIdx = STAGE_ORDER.indexOf(stage);
    if (dx < 0 && curIdx < STAGE_ORDER.length - 1) {
      navigateStage(STAGE_ORDER[curIdx + 1], true);
    } else if (dx > 0 && curIdx > 0) {
      navigateStage(STAGE_ORDER[curIdx - 1], true);
    }
  };

  const handleTouchCancel = () => {
    touchStartRef.current = null;
    isSwipingRef.current = false;
    setSwipeOffsetX(0);
  };

  const displayName = participantName.trim();
  const deviceIndicator = getDeviceIndicatorMeta(mission.device.id);
  const DeviceIndicatorIcon = deviceIndicator.Icon;

  return (
    <div className="w-full flex flex-col">
      {/* Main Swipeable Stage Viewport (No Step Tab Bar) */}
      <div
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
        className="touch-pan-y w-full"
      >
        <AnimatePresence mode="wait" custom={transitionDir}>
          {stage === 'problem' && (
            <motion.section
              key={`stage-problem-${revealKey}`}
              custom={transitionDir}
              variants={stageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.54, ease: EASE_CINEMATIC }}
              aria-label="The Problem"
              className={`relative w-full rounded-3xl bg-white shadow-[0_22px_60px_rgba(234,67,53,0.12)] overflow-hidden flex flex-col justify-between ${
                isWideProjector
                  ? 'min-h-[410px] xl:min-h-[460px]'
                  : 'min-h-[340px] sm:min-h-[390px]'
              }`}
            >
              {/* Top Fading Red-to-White Banner */}
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.55, delay: 0.08, ease: EASE_CINEMATIC }}
                style={{
                  background:
                    'linear-gradient(90deg, #EA4335 0%, #EA4335 42%, rgba(234, 67, 53, 0.45) 68%, rgba(255, 255, 255, 0) 90%)',
                }}
                className={`relative z-10 flex items-center justify-between ${
                  isWideProjector ? 'px-10 py-5' : 'px-6 py-4 sm:px-9 sm:py-5'
                }`}
              >
                <div className="flex items-center gap-3.5 sm:gap-5">
                  <h2
                    className={`font-bold text-white tracking-tight leading-none ${
                      isWideProjector
                        ? 'text-4xl xl:text-5xl'
                        : 'text-2xl sm:text-4xl'
                    }`}
                  >
                    The Problem
                  </h2>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.72, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.48, delay: 0.24, ease: EASE_CINEMATIC }}
                  >
                    <RevealChevronMark
                      direction="up"
                      variant="red"
                      className={
                        isWideProjector
                          ? 'w-12 h-9 sm:w-14 sm:h-10'
                          : 'w-9 h-7 sm:w-11 sm:h-8'
                      }
                    />
                  </motion.div>
                </div>

                <button
                  type="button"
                  onClick={handleAdvance}
                  title="Lanjut ke tahap berikutnya"
                  className="rounded-xl px-3 py-1.5 text-xs font-bold text-[#64748B] hover:text-[#111827] hover:bg-[#F1F5F9] inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Lanjut</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </motion.div>

              {/* Spacious White Reveal Stage */}
              <div
                className={`relative z-10 flex-1 flex flex-col items-center justify-center text-center mx-auto ${
                  isWideProjector
                    ? 'px-14 py-9 max-w-4xl'
                    : 'px-6 py-7 sm:px-12 sm:py-9 max-w-3xl'
                }`}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.78 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.48, delay: 0.28, ease: EASE_CINEMATIC }}
                  className={`rounded-2xl bg-[#FEE2E2] text-[#EA4335] flex items-center justify-center mb-5 shadow-xs ${
                    isWideProjector ? 'w-20 h-20' : 'w-16 h-16'
                  }`}
                >
                  <ReelIcon
                    name={mission.problem.icon}
                    className={isWideProjector ? 'w-10 h-10' : 'w-8 h-8'}
                  />
                </motion.div>

                <motion.h3
                  initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.6, delay: 0.48, ease: EASE_CINEMATIC }}
                  className={`font-bold text-[#111827] tracking-tight leading-tight text-balance ${
                    isWideProjector
                      ? 'text-4xl xl:text-5xl'
                      : 'text-2xl sm:text-4xl'
                  }`}
                >
                  {mission.problem.title}
                </motion.h3>

                <motion.p
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.62, delay: 0.88, ease: EASE_CINEMATIC }}
                  className={`mt-4 text-[#4B5563] leading-relaxed text-balance ${
                    isWideProjector
                      ? 'text-xl xl:text-2xl'
                      : 'text-base sm:text-xl'
                  }`}
                >
                  {mission.problem.description}
                </motion.p>
              </div>

              <div className="relative z-10 h-1.5 w-full bg-[#F1F5F9]">
                {autoPlay && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{
                      duration: stageDurationMs / 1000,
                      ease: 'linear',
                    }}
                    style={{ transformOrigin: 'left' }}
                    className="h-full bg-[#EA4335]"
                  />
                )}
              </div>
            </motion.section>
          )}

          {stage === 'app' && (
            <motion.section
              key={`stage-app-${revealKey}`}
              custom={transitionDir}
              variants={stageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.54, ease: EASE_CINEMATIC }}
              aria-label="The App"
              className={`relative w-full rounded-3xl bg-white shadow-[0_22px_60px_rgba(52,168,83,0.13)] overflow-hidden flex flex-col justify-between ${
                isWideProjector
                  ? 'min-h-[410px] xl:min-h-[460px]'
                  : 'min-h-[340px] sm:min-h-[390px]'
              }`}
            >
              {/* Top Fading Green-to-White Banner */}
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.55, delay: 0.08, ease: EASE_CINEMATIC }}
                style={{
                  background:
                    'linear-gradient(90deg, #34A853 0%, #34A853 42%, rgba(52, 168, 83, 0.45) 68%, rgba(255, 255, 255, 0) 90%)',
                }}
                className={`relative z-10 flex items-center justify-between ${
                  isWideProjector ? 'px-10 py-5' : 'px-6 py-4 sm:px-9 sm:py-5'
                }`}
              >
                <div className="flex items-center gap-3.5 sm:gap-5">
                  <h2
                    className={`font-bold text-white tracking-tight leading-none ${
                      isWideProjector
                        ? 'text-4xl xl:text-5xl'
                        : 'text-2xl sm:text-4xl'
                    }`}
                  >
                    The App
                  </h2>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.72, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.48, delay: 0.24, ease: EASE_CINEMATIC }}
                  >
                    <RevealChevronMark
                      direction="down"
                      variant="green"
                      className={
                        isWideProjector
                          ? 'w-12 h-9 sm:w-14 sm:h-10'
                          : 'w-9 h-7 sm:w-11 sm:h-8'
                      }
                    />
                  </motion.div>
                </div>

                <button
                  type="button"
                  onClick={handleAdvance}
                  title="Lanjut ke tahap berikutnya"
                  className="rounded-xl px-3 py-1.5 text-xs font-bold text-[#64748B] hover:text-[#111827] hover:bg-[#F1F5F9] inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Lanjut</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </motion.div>

              {/* Spacious White Reveal Stage */}
              <div
                className={`relative z-10 flex-1 flex flex-col items-center justify-center text-center mx-auto ${
                  isWideProjector
                    ? 'px-12 py-7 max-w-5xl'
                    : 'px-6 py-6 sm:px-10 sm:py-7 max-w-4xl'
                }`}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.78 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.48, delay: 0.28, ease: EASE_CINEMATIC }}
                  className={`rounded-2xl bg-[#E6F4EA] text-[#1E8E3E] flex items-center justify-center mb-3.5 shadow-xs ${
                    isWideProjector ? 'w-16 h-16' : 'w-14 h-14'
                  }`}
                >
                  <ReelIcon
                    name={mission.solution.icon}
                    className={isWideProjector ? 'w-8 h-8' : 'w-7 h-7'}
                  />
                </motion.div>

                <motion.h3
                  initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.6, delay: 0.48, ease: EASE_CINEMATIC }}
                  className={`font-bold text-[#111827] tracking-tight leading-tight text-balance ${
                    isWideProjector
                      ? 'text-3xl xl:text-4xl'
                      : 'text-2xl sm:text-3xl'
                  }`}
                >
                  {mission.solution.title}
                </motion.h3>

                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.62, delay: 0.88, ease: EASE_CINEMATIC }}
                  className={`mt-3 text-[#374151] leading-relaxed text-balance ${
                    isWideProjector
                      ? 'text-lg xl:text-xl max-w-4xl'
                      : 'text-sm sm:text-lg max-w-3xl'
                  }`}
                >
                  {mission.solution.contextualHowToBuild}
                </motion.p>

                <div
                  className={`mt-5 w-full grid grid-cols-1 md:grid-cols-3 text-left ${
                    isWideProjector ? 'gap-3.5' : 'gap-2.5'
                  }`}
                >
                  {mission.solution.contextualFeatures.map((feat, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.52,
                        delay: 1.3 + idx * 0.32,
                        ease: EASE_CINEMATIC,
                      }}
                      className={`flex items-start gap-2.5 rounded-2xl bg-[#F8FAFC] shadow-[0_2px_10px_rgba(15,23,42,0.04)] font-medium text-[#1F2937] leading-snug ${
                        isWideProjector
                          ? 'px-5 py-3.5 text-sm xl:text-base'
                          : 'px-4 py-3 text-xs sm:text-sm'
                      }`}
                    >
                      <span
                        className="mt-1.5 w-2 h-2 rounded-full bg-[#34A853] shrink-0"
                        aria-hidden="true"
                      />
                      <span>{feat}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="relative z-10 h-1.5 w-full bg-[#F1F5F9]">
                {autoPlay && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{
                      duration: stageDurationMs / 1000,
                      ease: 'linear',
                    }}
                    style={{ transformOrigin: 'left' }}
                    className="h-full bg-[#34A853]"
                  />
                )}
              </div>
            </motion.section>
          )}

          {stage === 'user' && (
            <motion.section
              key={`stage-user-${revealKey}`}
              custom={transitionDir}
              variants={stageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.54, ease: EASE_CINEMATIC }}
              aria-label="The User"
              style={{
                background:
                  'linear-gradient(180deg, #F8FAFF 0%, #DBEAFE 32%, #3B82F6 76%, #1A73E8 100%)',
              }}
              className={`relative w-full rounded-3xl shadow-[0_24px_64px_rgba(26,115,232,0.22)] overflow-hidden flex flex-col justify-between ${
                isWideProjector
                  ? 'min-h-[410px] xl:min-h-[460px]'
                  : 'min-h-[340px] sm:min-h-[390px]'
              }`}
            >
              {/* Centered Floating Card with Overlapping "The User" Pill + Bottom-Right Mobile/Desktop Indicator */}
              <div
                className={`relative z-10 flex-1 flex items-center justify-center ${
                  isWideProjector
                    ? 'px-12 pt-11 pb-7'
                    : 'px-5 sm:px-10 pt-10 pb-6'
                }`}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.52, delay: 0.12, ease: EASE_CINEMATIC }}
                  className={`relative w-full rounded-[28px] bg-white/98 shadow-[0_20px_54px_rgba(15,23,42,0.16)] flex flex-col items-center justify-center text-center ${
                    isWideProjector
                      ? 'max-w-4xl min-h-[295px] px-14 pt-12 pb-14'
                      : 'max-w-3xl min-h-[245px] sm:min-h-[270px] px-6 sm:px-12 pt-11 pb-14'
                  }`}
                >
                  {/* Overlapping Top-Center Pill Header */}
                  <motion.div
                    initial={{ opacity: 0, y: -12, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.48, delay: 0.2, ease: EASE_CINEMATIC }}
                    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  >
                    <span
                      className={`inline-flex items-center justify-center rounded-full bg-[#111827] text-white shadow-[0_8px_22px_rgba(15,23,42,0.24)] font-bold tracking-tight whitespace-nowrap ${
                        isWideProjector
                          ? 'px-9 py-2.5 text-2xl'
                          : 'px-7 py-2 text-lg sm:text-xl'
                      }`}
                    >
                      The User
                    </span>
                  </motion.div>

                  {/* Top-right subtle advance */}
                  <button
                    type="button"
                    onClick={handleAdvance}
                    title="Buka Kartu Misi"
                    className="absolute top-3.5 right-4 rounded-xl px-3 py-1 text-xs font-bold text-[#64748B] hover:text-[#111827] hover:bg-[#F1F5F9] inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Lanjut</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>

                  {/* Target User Icon + Title + Description */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.78 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.48, delay: 0.3, ease: EASE_CINEMATIC }}
                    className={`rounded-2xl bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center mb-4 shadow-xs ${
                      isWideProjector ? 'w-16 h-16' : 'w-14 h-14'
                    }`}
                  >
                    <ReelIcon
                      name={mission.targetUser.icon}
                      className={isWideProjector ? 'w-8 h-8' : 'w-7 h-7'}
                    />
                  </motion.div>

                  <motion.h3
                    initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.58, delay: 0.48, ease: EASE_CINEMATIC }}
                    className={`font-bold text-[#111827] tracking-tight leading-tight text-balance ${
                      isWideProjector
                        ? 'text-3xl xl:text-4xl'
                        : 'text-2xl sm:text-3xl'
                    }`}
                  >
                    {mission.targetUser.title}
                  </motion.h3>

                  <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.84, ease: EASE_CINEMATIC }}
                    className={`mt-3 text-[#4B5563] leading-relaxed text-balance max-w-2xl ${
                      isWideProjector
                        ? 'text-lg xl:text-xl'
                        : 'text-sm sm:text-lg'
                    }`}
                  >
                    {mission.targetUser.contextualDescription}
                  </motion.p>

                  {/* Bottom-Right Mobile / Desktop Indicator */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 1.12, ease: EASE_CINEMATIC }}
                    aria-label={`Target perangkat: ${deviceIndicator.label}`}
                    className={`absolute bottom-3.5 right-4 sm:bottom-4 sm:right-5 inline-flex items-center gap-2 rounded-xl bg-[#F1F5F9] text-[#111827] font-bold shadow-[0_4px_14px_rgba(15,23,42,0.06)] ${
                      isWideProjector ? 'px-4 py-2 text-sm' : 'px-3.5 py-1.5 text-xs sm:text-sm'
                    }`}
                  >
                    <DeviceIndicatorIcon
                      className="w-4 h-4 text-[#1A73E8] shrink-0"
                      aria-hidden="true"
                    />
                    <span>{deviceIndicator.label}</span>
                  </motion.div>
                </motion.div>
              </div>

              <div className="relative z-10 h-1.5 w-full bg-white/30">
                {autoPlay && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{
                      duration: stageDurationMs / 1000,
                      ease: 'linear',
                    }}
                    style={{ transformOrigin: 'left' }}
                    className="h-full bg-white"
                  />
                )}
              </div>
            </motion.section>
          )}

          {stage === 'brief' && (
            /* Direct Final Kartu Misi (No Mission Brief wrapper, No Download PDF/Open Tab, No Scan QR text) */
            <motion.section
              key={`stage-brief-${revealKey}`}
              custom={transitionDir}
              variants={stageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: EASE_CINEMATIC }}
              aria-label="Kartu Misi"
              className="w-full max-w-5xl mx-auto bg-white rounded-3xl shadow-[0_18px_48px_rgba(15,23,42,0.08)] overflow-hidden"
            >
              {/* Card Header */}
              <div
                className={`bg-[#F8FAFC]/70 flex items-center justify-between gap-4 ${
                  isWideProjector ? 'px-7 py-3.5' : 'px-6 py-3'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="px-2.5 py-1 rounded-lg bg-[#E8F0FE] text-[#1A73E8] text-xs font-bold uppercase tracking-wider shrink-0">
                    Kartu Misi
                  </span>
                  <h2
                    className={`font-bold text-[#111827] truncate ${
                      isWideProjector ? 'text-2xl' : 'text-lg sm:text-xl'
                    }`}
                  >
                    {displayName || `Peserta #${participantNumber}`}
                  </h2>
                </div>

                <span className="text-xs font-bold text-[#64748B] tabular-nums shrink-0">
                  Peserta #{participantNumber}
                </span>
              </div>

              {/* Body: QR on Left (Clean, No Scan Text) + Full Kartu Misi on Right */}
              <div
                className={`grid grid-cols-1 items-center ${
                  isWideProjector
                    ? 'md:grid-cols-[240px_1fr] gap-6 px-7 py-4'
                    : 'md:grid-cols-[216px_1fr] gap-5 px-6 py-4'
                }`}
              >
                {/* Left QR Column (Razor-Sharp Vector SVG, Tap to Enlarge) */}
                <div className="flex flex-col items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setIsQrZoomed(true)}
                    aria-label={`Perbesar QR Code Kartu Misi ${displayName || `Peserta #${participantNumber}`}`}
                    className="p-2.5 bg-white rounded-2xl shadow-[0_6px_22px_rgba(15,23,42,0.08)] hover:shadow-[0_10px_28px_rgba(26,115,232,0.18)] transition-all cursor-zoom-in"
                  >
                    <QrCodeSvg
                      url={briefUrl}
                      label={`QR Code Kartu Misi ${displayName || `Peserta #${participantNumber}`}`}
                      className={
                        isWideProjector ? 'w-52 h-52' : 'w-44 h-44 sm:w-48 sm:h-48'
                      }
                    />
                  </button>
                </div>

                {/* Right Kartu Misi Content */}
                <div
                  className={`rounded-2xl bg-[#F8FAFC] space-y-2.5 min-w-0 ${
                    isWideProjector ? 'p-4' : 'p-3.5'
                  }`}
                >
                  {/* THE APP */}
                  <div>
                    <div className="text-[10px] font-bold text-[#1E8E3E] uppercase tracking-wider">
                      THE APP
                    </div>
                    <div
                      className={`font-bold text-[#111827] mt-0.5 ${
                        isWideProjector ? 'text-lg' : 'text-sm sm:text-base'
                      }`}
                    >
                      {mission.solution.title}
                    </div>
                    <p
                      className={`text-[#374151] mt-1 leading-snug ${
                        isWideProjector ? 'text-sm' : 'text-xs sm:text-[13px]'
                      }`}
                    >
                      {mission.solution.contextualHowToBuild}
                    </p>
                    <ul className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                      {mission.solution.contextualFeatures.map((feat, idx) => (
                        <li
                          key={idx}
                          className={`flex items-start gap-1.5 rounded-xl bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] px-2.5 py-1.5 font-medium text-[#1F2937] leading-snug ${
                            isWideProjector ? 'text-xs' : 'text-[11px]'
                          }`}
                        >
                          <span
                            className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#34A853] shrink-0"
                            aria-hidden="true"
                          />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="h-px bg-[#E2E8F0]" />

                  {/* THE PROBLEM & THE USER */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] font-bold text-[#EA4335] uppercase tracking-wider">
                        THE PROBLEM
                      </div>
                      <div
                        className={`font-bold text-[#111827] mt-0.5 leading-snug ${
                          isWideProjector ? 'text-sm' : 'text-xs sm:text-[13px]'
                        }`}
                      >
                        {mission.problem.title}
                      </div>
                      <p className="mt-0.5 text-[11px] sm:text-xs text-[#4B5563] leading-snug">
                        {mission.problem.description}
                      </p>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-[#4285F4] uppercase tracking-wider">
                        THE USER
                      </div>
                      <div
                        className={`font-bold text-[#111827] mt-0.5 leading-snug ${
                          isWideProjector ? 'text-sm' : 'text-xs sm:text-[13px]'
                        }`}
                      >
                        {mission.targetUser.title}
                      </div>
                      <p className="mt-0.5 text-[11px] sm:text-xs text-[#4B5563] leading-snug">
                        {mission.targetUser.contextualDescription}
                      </p>
                    </div>
                  </div>

                  <div className="h-px bg-[#E2E8F0]" />

                  {/* PERANGKAT */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[10px] font-bold text-[#D97706] uppercase tracking-wider">
                      PERANGKAT
                    </div>
                    <div
                      className={`font-semibold text-[#111827] flex items-center gap-1.5 ${
                        isWideProjector ? 'text-sm' : 'text-xs sm:text-[13px]'
                      }`}
                    >
                      <DeviceIndicatorIcon
                        className="w-3.5 h-3.5 text-[#D97706] shrink-0"
                        aria-hidden="true"
                      />
                      <span>
                        {deviceIndicator.label} · {mission.device.title}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clean Footer Bar (No Scan QR text) */}
              <div
                className={`bg-[#F8FAFC]/80 flex items-center justify-end ${
                  isWideProjector ? 'px-7 py-3' : 'px-6 py-2.5'
                }`}
              >
                <button
                  type="button"
                  onClick={onConfirmAndAdvance}
                  className={`rounded-xl bg-[#1A73E8] hover:bg-[#1557B0] text-white font-bold inline-flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer shadow-[0_6px_18px_rgba(26,115,232,0.22)] ${
                    isWideProjector
                      ? 'min-h-[44px] px-6 py-2 text-sm'
                      : 'min-h-[40px] px-5 py-1.5 text-xs sm:text-sm'
                  }`}
                >
                  <span>{advanceActionLabel}</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {/* Enlarged High-Contrast QR Overlay for Stage / Back-Row Scanning */}
      {isQrZoomed && stage === 'brief' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/45 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label={`QR Code ${displayName || `Peserta #${participantNumber}`}`}
          onClick={() => setIsQrZoomed(false)}
        >
          <div
            className="relative bg-white rounded-3xl p-6 sm:p-8 shadow-[0_24px_64px_rgba(15,23,42,0.28)] flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsQrZoomed(false)}
              aria-label="Tutup perbesaran QR"
              className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#111827] inline-flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            <div className="text-center pr-6 pl-6">
              <span className="px-2.5 py-0.5 rounded-lg bg-[#E8F0FE] text-[#1A73E8] text-xs font-bold uppercase tracking-wider">
                Kartu Misi · #{participantNumber}
              </span>
              <h3 className="mt-1.5 text-xl sm:text-2xl font-bold text-[#111827]">
                {displayName || `Peserta #${participantNumber}`}
              </h3>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-2xl">
              <QrCodeSvg
                url={briefUrl}
                label={`QR Code Besar ${displayName || `Peserta #${participantNumber}`}`}
                className="w-64 h-64 sm:w-80 sm:h-80"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
