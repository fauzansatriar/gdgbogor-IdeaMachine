import { Download, Eye, FileText, QrCode, X } from 'lucide-react';
import {
  ParticipantSlot,
  resolveChallengeMission,
} from '../data/pools';
import { MissionBriefPayload } from '../utils/briefCodec';
import { ReelIcon } from './ReelIcon';

interface FinalizedRecapModalProps {
  isOpen: boolean;
  slots: ParticipantSlot[];
  onClose: () => void;
  onOpenQr: (slot: ParticipantSlot) => void;
  onOpenPreview: (payload: MissionBriefPayload) => void;
  onDownloadSinglePdf: (slot: ParticipantSlot) => void;
  onDownloadAllPdf: () => void;
}

export function FinalizedRecapModal({
  isOpen,
  slots,
  onClose,
  onOpenQr,
  onOpenPreview,
  onDownloadSinglePdf,
  onDownloadAllPdf,
}: FinalizedRecapModalProps) {
  if (!isOpen) return null;

  const lockedSlots = slots.filter((s) => s.challenge !== null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202124]/45 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recap-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[88vh] bg-white rounded-3xl border border-[#E2E8F0] shadow-[0_20px_50px_rgba(32,33,36,0.18)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#F1F3F4] flex items-center justify-between gap-4 shrink-0">
          <div>
            <div className="text-xs font-semibold text-[#1A73E8] uppercase tracking-wide">
              Finalisasi Hasil · {lockedSlots.length} Peserta Terkunci
            </div>
            <h2
              id="recap-modal-title"
              className="text-xl font-bold text-[#202124]"
            >
              Rekap Ide Aplikasi & Kartu Misi QR
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onDownloadAllPdf}
              disabled={lockedSlots.length === 0}
              className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-45"
            >
              <FileText className="w-4 h-4" aria-hidden="true" />
              <span>Download Semua (PDF)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup Rekap (ESC)"
              className="min-h-[38px] min-w-[38px] p-2 rounded-xl text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4] transition-colors inline-flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-3">
          {lockedSlots.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#5F6368]">
              Belum ada peserta yang dikunci.
            </div>
          ) : (
            lockedSlots.map((slot) => {
              const mission = resolveChallengeMission(slot.challenge!);
              const displayName = slot.name.trim() || `Peserta #${slot.number}`;

              return (
                <div
                  key={slot.number}
                  className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#E8F0FE] text-[#1967D2] text-xs font-bold tabular-nums">
                        Peserta #{slot.number}
                      </span>
                      <span className="text-base font-bold text-[#111827]">
                        {displayName}
                      </span>
                      <span className="text-xs font-semibold text-[#5F6368]">
                        · {mission.device.title} ({mission.device.badgeLabel})
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                      <div className="flex items-start gap-1.5 text-[#374151]">
                        <ReelIcon
                          name={mission.solution.icon}
                          className="w-3.5 h-3.5 text-[#34A853] shrink-0 mt-0.5"
                        />
                        <div>
                          <div className="text-[10px] font-bold text-[#34A853] uppercase">
                            Aplikasi
                          </div>
                          <div className="font-semibold text-[#111827]">
                            {mission.solution.title}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-1.5 text-[#374151]">
                        <ReelIcon
                          name={mission.problem.icon}
                          className="w-3.5 h-3.5 text-[#4285F4] shrink-0 mt-0.5"
                        />
                        <div>
                          <div className="text-[10px] font-bold text-[#4285F4] uppercase">
                            Masalah
                          </div>
                          <div className="font-semibold text-[#111827]">
                            {mission.problem.title}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-1.5 text-[#374151]">
                        <ReelIcon
                          name={mission.targetUser.icon}
                          className="w-3.5 h-3.5 text-[#EA4335] shrink-0 mt-0.5"
                        />
                        <div>
                          <div className="text-[10px] font-bold text-[#EA4335] uppercase">
                            Pengguna
                          </div>
                          <div className="font-semibold text-[#111827]">
                            {mission.targetUser.title}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenQr(slot)}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#E8F0FE] hover:bg-[#D2E3FC] text-[#1967D2] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <QrCode className="w-4 h-4" aria-hidden="true" />
                      <span>QR Code</span>
                    </button>

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
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-[#111827] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4 text-[#5F6368]" aria-hidden="true" />
                      <span>Kartu Misi</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDownloadSinglePdf(slot)}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-[#111827] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-[#5F6368]" aria-hidden="true" />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-6 py-3 bg-[#F8F9FA] border-t border-[#F1F3F4] flex items-center justify-between text-xs text-[#5F6368] shrink-0">
          <span>Semua kartu misi & QR tetap bisa dibuka selama sesi berlangsung.</span>
          <span>Tekan ESC untuk menutup</span>
        </div>
      </div>
    </div>
  );
}
