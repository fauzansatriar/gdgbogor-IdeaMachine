import { ArrowLeft, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { GdgBogorLogo, GoogleSpectrumBar } from './BrandMark';
import { ReelIcon } from './ReelIcon';
import { MissionBriefPayload, resolveMissionDetails } from '../utils/briefCodec';

interface MissionBriefViewProps {
  payload: MissionBriefPayload;
  isPreview?: boolean;
  onExitPreview?: () => void;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function MissionBriefView({
  payload,
  isPreview = false,
  onExitPreview,
}: MissionBriefViewProps) {
  const {
    participantNumber,
    participantName,
    problem,
    targetUser,
    solution,
    device,
  } = resolveMissionDetails(payload);

  return (
    <div className="h-dvh overflow-hidden bg-[#F8FAFC] text-[#111827] flex flex-col">
      {/* Compact Header */}
      <header className="shrink-0 bg-white border-b border-[#E2E8F0] px-4 sm:px-8 h-12 flex items-center">
        <div className="w-full max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <GdgBogorLogo className="h-5 sm:h-6 w-auto shrink-0" />
            <span className="text-[#CBD5E1] select-none" aria-hidden="true">
              |
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-[#E8F0FE] text-[#1967D2] text-xs font-bold tabular-nums shrink-0">
              Peserta #{participantNumber}
            </span>
            {participantName && (
              <span className="text-sm font-bold text-[#111827] truncate">
                {participantName}
              </span>
            )}
          </div>

          {isPreview && onExitPreview && (
            <button
              type="button"
              onClick={onExitPreview}
              className="min-h-[34px] px-3 py-1.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-xs font-semibold text-[#111827] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Kembali</span>
            </button>
          )}
        </div>
      </header>

      {/* One-Page Fit-Screen Content (No Scroll) */}
      <main className="flex-1 min-h-0 px-4 sm:px-8 py-3 sm:py-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-5xl flex flex-col gap-2.5 sm:gap-3">
          {/* 1. THE APP — Aplikasi yang Harus Dibuat */}
          <motion.article
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.36, delay: 0.04, ease: EASE_OUT_EXPO }}
            className="bg-white rounded-2xl border-2 border-[#10B981]/60 overflow-hidden shadow-[0_6px_22px_rgba(15,23,42,0.05)]"
          >
            <div className="px-4 py-2 bg-gradient-to-r from-[#34A853] to-[#0D9488] text-white flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-white/20 text-[11px] font-bold uppercase tracking-wider shrink-0">
                The App
              </span>
              <span className="text-xs font-semibold text-white/95 truncate">
                Aplikasi yang Harus Dibuat
              </span>
            </div>

            <div className="p-3.5 sm:px-5 sm:py-4 space-y-2.5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#E6F4EA] text-[#1E8E3E] flex items-center justify-center shrink-0 mt-0.5">
                  <ReelIcon name={solution.icon} className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <motion.h1
                    initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.32, delay: 0.16, ease: EASE_OUT_EXPO }}
                    className="text-base sm:text-xl font-bold text-[#111827] leading-snug"
                  >
                    {solution.title}
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.32, delay: 0.26, ease: EASE_OUT_EXPO }}
                    className="text-xs sm:text-sm text-[#374151] leading-relaxed max-w-4xl"
                  >
                    {solution.contextualHowToBuild}
                  </motion.p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 border-t border-[#F1F5F9]">
                {solution.contextualFeatures.map((feat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.26,
                      delay: 0.36 + i * 0.08,
                      ease: EASE_OUT_EXPO,
                    }}
                    className="flex items-start gap-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5 sm:py-2 text-xs sm:text-[13px] font-medium text-[#1F2937] leading-snug"
                  >
                    <span
                      className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#34A853] shrink-0"
                      aria-hidden="true"
                    />
                    <span>{feat}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.article>

          {/* 2. THE PROBLEM & 3. THE USER */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
            <motion.article
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.36, delay: 0.64, ease: EASE_OUT_EXPO }}
              className="bg-white rounded-2xl border border-[#CBD5E1] p-3.5 sm:p-4 flex flex-col gap-2"
            >
              <div>
                <span className="px-2 py-0.5 rounded-md bg-[#E8F0FE] text-[#1A73E8] text-[10px] font-bold uppercase tracking-wider">
                  The Problem
                </span>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center shrink-0 mt-0.5">
                  <ReelIcon name={problem.icon} className="w-4 h-4" />
                </div>
                <div className="min-w-0 space-y-1">
                  <motion.h2
                    initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.3, delay: 0.76, ease: EASE_OUT_EXPO }}
                    className="text-sm sm:text-base font-bold text-[#111827] leading-snug"
                  >
                    {problem.title}
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.86, ease: EASE_OUT_EXPO }}
                    className="text-xs sm:text-[13px] text-[#374151] leading-relaxed"
                  >
                    {problem.description}
                  </motion.p>
                </div>
              </div>
            </motion.article>

            <motion.article
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.36, delay: 1.0, ease: EASE_OUT_EXPO }}
              className="bg-white rounded-2xl border border-[#CBD5E1] p-3.5 sm:p-4 flex flex-col gap-2"
            >
              <div>
                <span className="px-2 py-0.5 rounded-md bg-[#FEE2E2] text-[#EA4335] text-[10px] font-bold uppercase tracking-wider">
                  The User
                </span>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#FEE2E2] text-[#EA4335] flex items-center justify-center shrink-0 mt-0.5">
                  <ReelIcon name={targetUser.icon} className="w-4 h-4" />
                </div>
                <div className="min-w-0 space-y-1">
                  <motion.h2
                    initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.3, delay: 1.12, ease: EASE_OUT_EXPO }}
                    className="text-sm sm:text-base font-bold text-[#111827] leading-snug"
                  >
                    {targetUser.title}
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 1.22, ease: EASE_OUT_EXPO }}
                    className="text-xs sm:text-[13px] text-[#374151] leading-relaxed"
                  >
                    {targetUser.contextualDescription}
                  </motion.p>
                </div>
              </div>
            </motion.article>
          </div>

          {/* Compact Footer Strip: Device Info + Build Action */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 1.34, ease: EASE_OUT_EXPO }}
            className="bg-white rounded-2xl border border-[#E2E8F0] px-4 py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0">
                <ReelIcon name={device.icon} className="w-4 h-4" />
              </div>
              <div className="min-w-0 text-xs sm:text-[13px] leading-snug flex flex-wrap items-center gap-x-1.5">
                <span className="font-bold uppercase text-[#B45309] text-[11px]">
                  Perangkat:
                </span>
                <span className="font-bold text-[#111827]">{device.title}</span>
                <span className="text-[#4B5563] hidden md:inline">
                  · {device.badgeLabel}
                </span>
              </div>
            </div>

            <a
              href="https://ai.studio/build"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[40px] px-5 py-2 rounded-xl bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <span>Buka ai.studio/build</span>
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
          </motion.div>
        </div>
      </main>

      <GoogleSpectrumBar />
    </div>
  );
}
