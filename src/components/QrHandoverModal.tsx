import { ArrowRight, Download, Eye, ExternalLink, X } from 'lucide-react';
import {
  ParticipantSlot,
  resolveChallengeMission,
} from '../data/pools';
import {
  MissionBriefPayload,
  buildMissionBriefUrl,
} from '../utils/briefCodec';
import { QrCodeSvg } from './QrCodeSvg';
import { ReelIcon } from './ReelIcon';

interface QrHandoverModalProps {
  slot: ParticipantSlot | null;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onClose: () => void;
  onDownloadPdf: (slot: ParticipantSlot) => void;
  onOpenPreview: (payload: MissionBriefPayload) => void;
}

export function QrHandoverModal({
  slot,
  primaryActionLabel,
  onPrimaryAction,
  onClose,
  onDownloadPdf,
  onOpenPreview,
}: QrHandoverModalProps) {
  if (!slot || !slot.challenge) return null;

  const mission = resolveChallengeMission(slot.challenge);
  const briefUrl = buildMissionBriefUrl(slot.number, slot.challenge, slot.name);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202124]/45 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-3xl shadow-[0_24px_60px_rgba(15,23,42,0.22)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 bg-[#F8FAFC]/80 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-[#1A73E8] uppercase tracking-wide">
              QR Handover · Kartu Misi
            </div>
            <h2
              id="qr-modal-title"
              className="text-xl font-bold text-[#202124] tabular-nums"
            >
              Peserta #{slot.number}
              {slot.name.trim() ? ` — ${slot.name.trim()}` : ''}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal QR Code (ESC)"
            className="min-h-[40px] min-w-[40px] p-2 rounded-xl text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4] transition-colors inline-flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 items-center">
          <div className="flex flex-col items-center">
            <div className="p-3 bg-white rounded-2xl shadow-[0_6px_22px_rgba(15,23,42,0.08)]">
              <QrCodeSvg
                url={briefUrl}
                label={`QR Code Kartu Misi Peserta #${slot.number}`}
                className="w-52 h-52"
              />
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="p-3.5 rounded-2xl bg-[#F8F9FA] space-y-2.5">
              <div>
                <div className="text-[11px] font-semibold text-[#1E8E3E]">
                  THE APP · APLIKASI YANG HARUS DIBUAT
                </div>
                <div className="font-semibold text-[#202124] flex items-center gap-1.5 mt-0.5">
                  <ReelIcon name={mission.solution.icon} className="w-4 h-4 text-[#34A853] shrink-0" />
                  <span>{mission.solution.title}</span>
                </div>
                <div className="text-xs text-[#3C4043] mt-1 leading-relaxed">
                  {mission.solution.contextualHowToBuild}
                </div>
              </div>

              <div className="h-px bg-[#E2E8F0]" />

              <div>
                <div className="text-[11px] font-semibold text-[#4285F4]">
                  THE PROBLEM
                </div>
                <div className="font-semibold text-[#202124] flex items-center gap-1.5 mt-0.5">
                  <ReelIcon name={mission.problem.icon} className="w-4 h-4 text-[#4285F4] shrink-0" />
                  <span>{mission.problem.title}</span>
                </div>
              </div>

              <div className="h-px bg-[#E2E8F0]" />

              <div>
                <div className="text-[11px] font-semibold text-[#EA4335]">
                  THE USER
                </div>
                <div className="font-semibold text-[#202124] flex items-center gap-1.5 mt-0.5">
                  <ReelIcon name={mission.targetUser.icon} className="w-4 h-4 text-[#EA4335] shrink-0" />
                  <span>{mission.targetUser.title}</span>
                </div>
              </div>

              <div className="h-px bg-[#E2E8F0]" />

              <div>
                <div className="text-[11px] font-semibold text-[#D97706]">
                  PERANGKAT
                </div>
                <div className="font-semibold text-[#202124] flex items-center gap-1.5 mt-0.5">
                  <ReelIcon name={mission.device.icon} className="w-4 h-4 text-[#D97706] shrink-0" />
                  <span>
                    {mission.device.title} · {mission.device.badgeLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() =>
                  onOpenPreview({
                    participantNumber: slot.number,
                    participantName: slot.name.trim() || undefined,
                    problemId: slot.challenge!.problemId,
                    userId: slot.challenge!.userId,
                    solutionId: slot.challenge!.solutionId,
                    deviceId: slot.challenge!.deviceId,
                    mission,
                  })
                }
                className="min-h-[40px] px-4 py-2 rounded-xl bg-[#E8F0FE] hover:bg-[#D2E3FC] text-[#1967D2] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Eye className="w-4 h-4" aria-hidden="true" />
                <span>Lihat Kartu Misi</span>
              </button>

              <button
                type="button"
                onClick={() => onDownloadPdf(slot)}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#202124] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Download PDF</span>
              </button>

              <a
                href={briefUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[40px] px-3 py-2 rounded-xl text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4] text-xs font-medium inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
              >
                <span>Buka Tab Baru</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-[#F8F9FA] flex flex-wrap items-center justify-between gap-3 text-xs text-[#5F6368]">
          <span>Scan QR dari HP untuk melihat ide aplikasi yang harus dibuat.</span>
          {primaryActionLabel && onPrimaryAction ? (
            <button
              type="button"
              onClick={onPrimaryAction}
              className="min-h-[38px] px-5 py-1.5 rounded-xl bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
            >
              <span>{primaryActionLabel}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : (
            <span>Tekan ESC untuk menutup</span>
          )}
        </div>
      </div>
    </div>
  );
}
