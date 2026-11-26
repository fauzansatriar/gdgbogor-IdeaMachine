import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Download, ExternalLink, Eye } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ContextualMission } from '../data/pools';
import { sfx } from '../utils/audio';
import {
  MissionBriefPayload,
  buildMissionBriefUrl,
  generateQrDataUrl,
} from '../utils/briefCodec';
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
  onOpenPreview: (payload: MissionBriefPayload) => void;
  onDownloadPdf: () => void;
  onConfirmAndAdvance: () => void;
}

const EASE_CINEMATIC: [number, number, number, number] = [0.16, 1, 0.3, 1];

const STAGE_STEPS: { id: RevealStage; num: string; label: string }[] = [
  { id: 'problem', num: '01', label: 'The Problem' },
  { id: 'app', num: '02', label: 'The App' },
  { id: 'user', num: '03', label: 'The User' },
  { id: 'brief', num: '04', label: 'Mission Brief' },
];

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
  onOpenPreview,
  onDownloadPdf,
  onConfirmAndAdvance,
}: MissionResultShowcaseProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

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

  useEffect(() => {
    let active = true;
    generateQrDataUrl(briefUrl, 340)
      .then((dataUrl) => {
        if (active) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [briefUrl]);

  const stageDurationMs = useMemo(() => {
    if (stage === 'brief') return 0;
    return calculateStageDurationMs(stage, mission);
  }, [mission, stage]);

  useEffect(() => {
    if (!autoPlay || stage === 'brief') return;

    const nextStage: RevealStage =
      stage === 'problem' ? 'app' : stage === 'app' ? 'user' : 'brief';

    const timeout = window.setTimeout(() => {
      if (nextStage === 'brief') {
        sfx.playFanfare();
      } else {
        sfx.playReelStop(nextStage === 'app' ? 1 : 2);
      }
      onSelectStage(nextStage, false);
    }, stageDurationMs);

    return () => window.clearTimeout(timeout);
  }, [autoPlay, onSelectStage, revealKey, stage, stageDurationMs]);

  const nextStepLabel =
    stage === 'problem'
      ? 'Lanjut ke The App'
      : stage === 'app'
        ? 'Lanjut ke The User'
        : 'Buka Mission Brief + QR';

  const handleAdvance = () => {
    if (stage === 'problem') {
      sfx.playReelStop(1);
      onSelectStage('app', true);
    } else if (stage === 'app') {
      sfx.playReelStop(2);
      onSelectStage('user', true);
    } else if (stage === 'user') {
      sfx.playFanfare();
      onSelectStage('brief', true);
    }
  };

  const displayName = participantName.trim();

  return (
    <div className={`w-full flex flex-col ${isWideProjector ? 'gap-2.5' : 'gap-2'}`}>
      {/* Subtle Cinematic Stage Progress Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="tablist"
          aria-label="Tahapan Reveal Hasil"
        >
          {STAGE_STEPS.map((item) => {
            const isActive = stage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelectStage(item.id, true)}
                className={`rounded-lg font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                  isWideProjector ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'
                } ${
                  isActive
                    ? 'bg-[#111827] text-white shadow-xs'
                    : 'bg-white/80 hover:bg-white text-[#64748B] hover:text-[#111827] border border-[#E2E8F0]'
                }`}
              >
                <span className="tabular-nums opacity-75">{item.num}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {stage !== 'brief' && (
          <button
            type="button"
            onClick={handleAdvance}
            className={`rounded-lg bg-[#E8F0FE] hover:bg-[#D2E3FC] text-[#1967D2] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer ${
              isWideProjector ? 'px-3.5 py-1.5 text-xs' : 'px-3 py-1 text-[11px]'
            }`}
          >
            <span>{nextStepLabel}</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Main Stage Viewport */}
      <AnimatePresence mode="wait">
        {stage === 'problem' && (
          <motion.section
            key={`stage-problem-${revealKey}`}
            aria-label="The Problem"
            initial={{ opacity: 0, y: 24, scale: 0.96, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -18, scale: 0.96, filter: 'blur(6px)' }}
            transition={{ duration: 0.58, ease: EASE_CINEMATIC }}
            className={`relative w-full rounded-3xl bg-white border-2 border-[#4285F4]/45 shadow-[0_20px_60px_rgba(66,133,244,0.12)] overflow-hidden flex flex-col justify-between ${
              isWideProjector
                ? 'min-h-[380px] xl:min-h-[430px]'
                : 'min-h-[300px] sm:min-h-[360px]'
            }`}
          >
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(66,133,244,0.09),transparent_60%)]"
              aria-hidden="true"
            />

            <div className="relative z-10 px-6 py-4 sm:px-10 sm:py-5 border-b border-[#E2E8F0]/80 flex items-center justify-between">
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.16, ease: EASE_CINEMATIC }}
                className="flex items-center gap-2.5"
              >
                <span
                  className={`px-3 py-1 rounded-lg bg-[#E8F0FE] text-[#1A73E8] font-bold uppercase tracking-wider ${
                    isWideProjector ? 'text-sm' : 'text-xs'
                  }`}
                >
                  The Problem
                </span>
                <span
                  className={`font-semibold text-[#64748B] ${
                    isWideProjector ? 'text-sm' : 'text-xs'
                  }`}
                >
                  Masalah Sehari-hari
                </span>
              </motion.div>

              <span
                className={`font-bold tabular-nums text-[#94A3B8] ${
                  isWideProjector ? 'text-sm' : 'text-xs'
                }`}
              >
                01 / 03
              </span>
            </div>

            <div
              className={`relative z-10 flex-1 flex flex-col items-center justify-center text-center mx-auto ${
                isWideProjector
                  ? 'px-14 py-10 max-w-4xl'
                  : 'px-6 py-8 sm:px-12 sm:py-10 max-w-3xl'
              }`}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.48, delay: 0.24, ease: EASE_CINEMATIC }}
                className={`rounded-2xl bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center mb-5 shadow-xs ${
                  isWideProjector ? 'w-20 h-20' : 'w-16 h-16'
                }`}
              >
                <ReelIcon
                  name={mission.problem.icon}
                  className={isWideProjector ? 'w-10 h-10' : 'w-8 h-8'}
                />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.62, delay: 0.48, ease: EASE_CINEMATIC }}
                className={`font-bold text-[#111827] tracking-tight leading-tight text-balance ${
                  isWideProjector
                    ? 'text-4xl xl:text-5xl'
                    : 'text-2xl sm:text-4xl'
                }`}
              >
                {mission.problem.title}
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.88, ease: EASE_CINEMATIC }}
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
                  className="h-full bg-[#4285F4]"
                />
              )}
            </div>
          </motion.section>
        )}

        {stage === 'app' && (
          <motion.section
            key={`stage-app-${revealKey}`}
            aria-label="The App"
            initial={{ opacity: 0, y: 24, scale: 0.96, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -18, scale: 0.96, filter: 'blur(6px)' }}
            transition={{ duration: 0.58, ease: EASE_CINEMATIC }}
            className={`relative w-full rounded-3xl bg-white border-2 border-[#10B981]/55 shadow-[0_20px_60px_rgba(16,185,129,0.13)] overflow-hidden flex flex-col justify-between ${
              isWideProjector
                ? 'min-h-[380px] xl:min-h-[430px]'
                : 'min-h-[300px] sm:min-h-[360px]'
            }`}
          >
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_center,rgba(52,168,83,0.09),transparent_65%)]"
              aria-hidden="true"
            />

            <div className="relative z-10 px-6 py-4 sm:px-10 sm:py-5 bg-gradient-to-r from-[#34A853] to-[#0D9488] text-white flex items-center justify-between">
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.16, ease: EASE_CINEMATIC }}
                className="flex items-center gap-2.5"
              >
                <span
                  className={`px-3 py-1 rounded-lg bg-white/20 font-bold uppercase tracking-wider ${
                    isWideProjector ? 'text-sm' : 'text-xs'
                  }`}
                >
                  The App
                </span>
                <span
                  className={`font-semibold text-white/95 ${
                    isWideProjector ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
                  }`}
                >
                  Aplikasi yang Harus Dibuat
                </span>
              </motion.div>

              <span
                className={`font-bold tabular-nums text-white/85 ${
                  isWideProjector ? 'text-sm' : 'text-xs'
                }`}
              >
                02 / 03
              </span>
            </div>

            <div
              className={`relative z-10 flex-1 flex flex-col items-center justify-center text-center mx-auto ${
                isWideProjector
                  ? 'px-12 py-8 max-w-5xl'
                  : 'px-6 py-6 sm:px-10 sm:py-7 max-w-4xl'
              }`}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.48, delay: 0.24, ease: EASE_CINEMATIC }}
                className={`rounded-2xl bg-[#E6F4EA] text-[#1E8E3E] flex items-center justify-center mb-3.5 ${
                  isWideProjector ? 'w-16 h-16' : 'w-14 h-14'
                }`}
              >
                <ReelIcon
                  name={mission.solution.icon}
                  className={isWideProjector ? 'w-8 h-8' : 'w-7 h-7'}
                />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.62, delay: 0.48, ease: EASE_CINEMATIC }}
                className={`font-bold text-[#111827] tracking-tight leading-tight text-balance ${
                  isWideProjector
                    ? 'text-3xl xl:text-4xl'
                    : 'text-2xl sm:text-3xl'
                }`}
              >
                {mission.solution.title}
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.88, ease: EASE_CINEMATIC }}
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
                      delay: 1.35 + idx * 0.34,
                      ease: EASE_CINEMATIC,
                    }}
                    className={`flex items-start gap-2.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] font-medium text-[#1F2937] leading-snug ${
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
            aria-label="The User"
            initial={{ opacity: 0, y: 24, scale: 0.96, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -18, scale: 0.96, filter: 'blur(6px)' }}
            transition={{ duration: 0.58, ease: EASE_CINEMATIC }}
            className={`relative w-full rounded-3xl bg-white border-2 border-[#EA4335]/45 shadow-[0_20px_60px_rgba(234,67,53,0.12)] overflow-hidden flex flex-col justify-between ${
              isWideProjector
                ? 'min-h-[380px] xl:min-h-[430px]'
                : 'min-h-[300px] sm:min-h-[360px]'
            }`}
          >
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(234,67,53,0.09),transparent_60%)]"
              aria-hidden="true"
            />

            <div className="relative z-10 px-6 py-4 sm:px-10 sm:py-5 border-b border-[#E2E8F0]/80 flex items-center justify-between">
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.16, ease: EASE_CINEMATIC }}
                className="flex items-center gap-2.5"
              >
                <span
                  className={`px-3 py-1 rounded-lg bg-[#FEE2E2] text-[#EA4335] font-bold uppercase tracking-wider ${
                    isWideProjector ? 'text-sm' : 'text-xs'
                  }`}
                >
                  The User
                </span>
                <span
                  className={`font-semibold text-[#64748B] ${
                    isWideProjector ? 'text-sm' : 'text-xs'
                  }`}
                >
                  Siapa Penggunanya
                </span>
              </motion.div>

              <span
                className={`font-bold tabular-nums text-[#94A3B8] ${
                  isWideProjector ? 'text-sm' : 'text-xs'
                }`}
              >
                03 / 03
              </span>
            </div>

            <div
              className={`relative z-10 flex-1 flex flex-col items-center justify-center text-center mx-auto ${
                isWideProjector
                  ? 'px-14 py-10 max-w-4xl'
                  : 'px-6 py-8 sm:px-12 sm:py-9 max-w-3xl'
              }`}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.48, delay: 0.24, ease: EASE_CINEMATIC }}
                className={`rounded-2xl bg-[#FEE2E2] text-[#EA4335] flex items-center justify-center mb-5 shadow-xs ${
                  isWideProjector ? 'w-20 h-20' : 'w-16 h-16'
                }`}
              >
                <ReelIcon
                  name={mission.targetUser.icon}
                  className={isWideProjector ? 'w-10 h-10' : 'w-8 h-8'}
                />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.62, delay: 0.48, ease: EASE_CINEMATIC }}
                className={`font-bold text-[#111827] tracking-tight leading-tight text-balance ${
                  isWideProjector
                    ? 'text-4xl xl:text-5xl'
                    : 'text-2xl sm:text-4xl'
                }`}
              >
                {mission.targetUser.title}
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.88, ease: EASE_CINEMATIC }}
                className={`mt-4 text-[#4B5563] leading-relaxed text-balance ${
                  isWideProjector
                    ? 'text-xl xl:text-2xl'
                    : 'text-base sm:text-xl'
                }`}
              >
                {mission.targetUser.contextualDescription}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.25, ease: EASE_CINEMATIC }}
                className={`mt-5 inline-flex items-center gap-2 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] font-bold text-[#92400E] ${
                  isWideProjector ? 'px-4 py-2 text-sm' : 'px-3.5 py-1.5 text-xs'
                }`}
              >
                <ReelIcon name={mission.device.icon} className="w-4 h-4 text-[#B45309]" />
                <span>
                  Perangkat: {mission.device.title} · {mission.device.badgeLabel}
                </span>
              </motion.div>
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

        {stage === 'brief' && (
          /* Direct Final QR Handover · Mission Brief Section */
          <motion.section
            key={`stage-brief-${revealKey}`}
            aria-label="QR Handover Mission Brief"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.48, ease: EASE_CINEMATIC }}
            className="w-full max-w-4xl mx-auto bg-white rounded-3xl border border-[#CBD5E1] shadow-[0_18px_48px_rgba(15,23,42,0.08)] overflow-hidden"
          >
            {/* Card Header */}
            <div
              className={`border-b border-[#F1F3F4] flex items-center justify-between gap-4 ${
                isWideProjector ? 'px-7 py-3.5' : 'px-6 py-3'
              }`}
            >
              <div>
                <div className="text-[11px] font-bold text-[#1A73E8] uppercase tracking-wider">
                  QR HANDOVER · MISSION BRIEF
                </div>
                <h2
                  className={`font-bold text-[#111827] tabular-nums ${
                    isWideProjector ? 'text-2xl' : 'text-lg sm:text-xl'
                  }`}
                >
                  Peserta #{participantNumber}
                  {displayName ? ` — ${displayName}` : ''}
                </h2>
              </div>
            </div>

            {/* Body: QR on Left, Concise Summary + Actions on Right */}
            <div
              className={`grid grid-cols-1 items-center ${
                isWideProjector
                  ? 'md:grid-cols-[260px_1fr] gap-6 px-7 py-4'
                  : 'md:grid-cols-[232px_1fr] gap-5 px-6 py-4'
              }`}
            >
              {/* Left QR Column */}
              <div className="flex flex-col items-center">
                <div className="p-2.5 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR Code Mission Brief Peserta #${participantNumber}`}
                      className={`block ${
                        isWideProjector ? 'w-52 h-52' : 'w-44 h-44 sm:w-48 sm:h-48'
                      }`}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div
                      className={`bg-[#F8F9FA] rounded-xl flex items-center justify-center text-xs text-[#5F6368] ${
                        isWideProjector ? 'w-52 h-52' : 'w-44 h-44 sm:w-48 sm:h-48'
                      }`}
                    >
                      Membuat QR Code...
                    </div>
                  )}
                </div>
                <p
                  className={`mt-2 text-center text-[#5F6368] leading-snug max-w-[24ch] ${
                    isWideProjector ? 'text-xs' : 'text-[11px]'
                  }`}
                >
                  Scan dari kamera HP untuk membuka kartu misi
                </p>
              </div>

              {/* Right Summary + Action Buttons */}
              <div className="space-y-3 min-w-0">
                <div
                  className={`rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 ${
                    isWideProjector ? 'p-4' : 'p-3.5'
                  }`}
                >
                  <div>
                    <div className="text-[10px] font-bold text-[#1E8E3E] uppercase tracking-wider">
                      THE APP · APLIKASI YANG HARUS DIBUAT
                    </div>
                    <div
                      className={`font-bold text-[#111827] flex items-center gap-1.5 mt-0.5 ${
                        isWideProjector ? 'text-base' : 'text-sm sm:text-[15px]'
                      }`}
                    >
                      <ReelIcon
                        name={mission.solution.icon}
                        className="w-4 h-4 text-[#34A853] shrink-0"
                      />
                      <span>{mission.solution.title}</span>
                    </div>
                    <p
                      className={`text-[#374151] mt-1 leading-snug ${
                        isWideProjector ? 'text-[13px]' : 'text-xs'
                      }`}
                    >
                      {mission.solution.contextualHowToBuild}
                    </p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {mission.solution.contextualFeatures.map((feat, idx) => (
                        <li
                          key={idx}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-[#E2E8F0] px-2.5 py-1 text-[11px] font-medium text-[#1F2937]"
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-[#34A853] shrink-0"
                            aria-hidden="true"
                          />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="h-px bg-[#E2E8F0]" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <div className="text-[10px] font-bold text-[#4285F4] uppercase tracking-wider">
                        THE PROBLEM
                      </div>
                      <div
                        className={`font-semibold text-[#111827] flex items-center gap-1.5 mt-0.5 ${
                          isWideProjector ? 'text-sm' : 'text-xs sm:text-[13px]'
                        }`}
                      >
                        <ReelIcon
                          name={mission.problem.icon}
                          className="w-3.5 h-3.5 text-[#4285F4] shrink-0"
                        />
                        <span className="leading-snug">{mission.problem.title}</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-[#EA4335] uppercase tracking-wider">
                        THE USER
                      </div>
                      <div
                        className={`font-semibold text-[#111827] flex items-center gap-1.5 mt-0.5 ${
                          isWideProjector ? 'text-sm' : 'text-xs sm:text-[13px]'
                        }`}
                      >
                        <ReelIcon
                          name={mission.targetUser.icon}
                          className="w-3.5 h-3.5 text-[#EA4335] shrink-0"
                        />
                        <span className="leading-snug">{mission.targetUser.title}</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-[#E2E8F0]" />

                  <div>
                    <div className="text-[10px] font-bold text-[#D97706] uppercase tracking-wider">
                      PERANGKAT
                    </div>
                    <div
                      className={`font-semibold text-[#111827] flex items-center gap-1.5 mt-0.5 ${
                        isWideProjector ? 'text-sm' : 'text-xs sm:text-[13px]'
                      }`}
                    >
                      <ReelIcon
                        name={mission.device.icon}
                        className="w-3.5 h-3.5 text-[#D97706] shrink-0"
                      />
                      <span>
                        {mission.device.title} · {mission.device.badgeLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Inline Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenPreview({
                        participantNumber,
                        participantName: displayName || undefined,
                        problemId: mission.problem.id,
                        userId: mission.targetUser.id,
                        solutionId: mission.solution.id,
                        deviceId: mission.device.id,
                        mission,
                      })
                    }
                    className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#E8F0FE] hover:bg-[#D2E3FC] text-[#1967D2] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Eye className="w-4 h-4" aria-hidden="true" />
                    <span>Lihat Kartu Misi</span>
                  </button>

                  <button
                    type="button"
                    onClick={onDownloadPdf}
                    className="min-h-[38px] px-4 py-1.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#111827] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Download className="w-4 h-4" aria-hidden="true" />
                    <span>Download PDF</span>
                  </button>

                  <a
                    href={briefUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[38px] px-3 py-1.5 rounded-xl text-[#5F6368] hover:text-[#111827] hover:bg-[#F1F5F9] text-xs font-medium inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>Buka Tab Baru</span>
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </div>

            {/* Footer Bar matching Final Photo Layout */}
            <div
              className={`bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 ${
                isWideProjector ? 'px-7 py-3' : 'px-6 py-2.5'
              }`}
            >
              <span className="text-xs text-[#5F6368]">
                Scan QR dari HP untuk melihat ide aplikasi yang harus dibuat.
              </span>

              <button
                type="button"
                onClick={onConfirmAndAdvance}
                className={`rounded-xl bg-[#1A73E8] hover:bg-[#1557B0] text-white font-bold inline-flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer shadow-[0_6px_18px_rgba(26,115,232,0.22)] ${
                  isWideProjector
                    ? 'min-h-[42px] px-6 py-2 text-sm'
                    : 'min-h-[38px] px-5 py-1.5 text-xs sm:text-sm'
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
  );
}
