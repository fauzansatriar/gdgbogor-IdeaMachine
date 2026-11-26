import { useState } from 'react';
import { Download, FileText, QrCode, RotateCcw } from 'lucide-react';
import {
  ParticipantSlot,
  getProblemById,
} from '../data/pools';
import { ReelIcon } from './ReelIcon';

interface ParticipantBoardProps {
  slots: ParticipantSlot[];
  activeTurn: 1 | 2 | 3 | 4 | 5;
  onSelectTurn: (num: 1 | 2 | 3 | 4 | 5) => void;
  onOpenQr: (slot: ParticipantSlot) => void;
  onDownloadSinglePdf: (slot: ParticipantSlot) => void;
  onDownloadAllPdf: () => void;
  onResetAll: () => void;
}

export function ParticipantBoard({
  slots,
  activeTurn,
  onSelectTurn,
  onOpenQr,
  onDownloadSinglePdf,
  onDownloadAllPdf,
  onResetAll,
}: ParticipantBoardProps) {
  const [confirmingReset, setConfirmingReset] = useState(false);
  const lockedCount = slots.filter((s) => s.challenge !== null).length;

  const handleResetClick = () => {
    if (!confirmingReset) {
      setConfirmingReset(true);
      setTimeout(() => setConfirmingReset(false), 3500);
      return;
    }
    setConfirmingReset(false);
    onResetAll();
  };

  return (
    <section
      aria-labelledby="board-heading"
      className="shrink-0 bg-[#F8FAFC]/80 border border-[#E2E8F0] rounded-2xl px-3 py-2.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-xs">
          <h2 id="board-heading" className="font-semibold text-[#475569]">
            Antrean 5 Peserta
          </h2>
          <span className="text-[#CBD5E1]" aria-hidden="true">
            ·
          </span>
          <span className="text-[#64748B] tabular-nums">
            <strong className="text-[#1E293B]">{lockedCount}/5</strong> terkunci
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onDownloadAllPdf}
            disabled={lockedCount === 0}
            className="min-h-[30px] px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F1F5F9] text-[11.5px] font-semibold text-[#334155] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            <FileText className="w-3.5 h-3.5 text-[#1A73E8]" aria-hidden="true" />
            <span>Download Semua (PDF)</span>
          </button>

          <button
            type="button"
            onClick={handleResetClick}
            className={`min-h-[30px] px-2.5 py-1 rounded-lg text-[11.5px] font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              confirmingReset
                ? 'bg-[#EA4335] text-white hover:bg-[#D93025]'
                : 'border border-[#E2E8F0] bg-white hover:bg-[#FEF2F2] text-[#DC2626]'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{confirmingReset ? 'Konfirmasi Reset?' : 'Reset Semua'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {slots.map((slot) => {
          const isTurn = activeTurn === slot.number;
          const hasChallenge = slot.challenge !== null;
          const problem = hasChallenge
            ? getProblemById(slot.challenge!.problemId)
            : null;
          const displayName = slot.name.trim();

          return (
            <div
              key={slot.number}
              role="button"
              tabIndex={0}
              onClick={() => onSelectTurn(slot.number)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectTurn(slot.number);
                }
              }}
              aria-pressed={isTurn}
              className={`rounded-xl border px-2.5 py-2 flex items-center justify-between gap-2 transition-all cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-[#1A73E8] ${
                isTurn
                  ? 'bg-white border-[#1A73E8] ring-2 ring-[#1A73E8]/15'
                  : hasChallenge
                    ? 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1]'
                    : 'bg-white/60 border-[#E2E8F0] hover:bg-white'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-bold text-[#64748B] tabular-nums shrink-0">
                    #{slot.number}
                  </span>
                  <span className="text-xs font-bold text-[#111827] truncate">
                    {displayName || `Peserta #${slot.number}`}
                  </span>
                  <span
                    className={`text-[10.5px] font-bold shrink-0 ${
                      isTurn
                        ? 'text-[#1A73E8]'
                        : hasChallenge
                          ? 'text-[#16A34A]'
                          : 'text-[#94A3B8]'
                    }`}
                  >
                    {isTurn ? '· Aktif' : hasChallenge ? '· Siap' : '· Kosong'}
                  </span>
                </div>

                {hasChallenge && problem ? (
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#475569] truncate">
                    <ReelIcon
                      name={problem.icon}
                      className="w-3 h-3 text-[#1A73E8] shrink-0"
                    />
                    <span className="truncate font-medium">{problem.title}</span>
                  </div>
                ) : (
                  <div className="mt-0.5 text-[11px] text-[#94A3B8] truncate">
                    {isTurn
                      ? displayName
                        ? 'Siap diputar / dikunci'
                        : 'Isi nama peserta dulu'
                      : 'Klik pilih giliran'}
                  </div>
                )}
              </div>

              {hasChallenge && (
                <div
                  className="flex items-center gap-1 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onOpenQr(slot)}
                    title={`Buka QR Code ${displayName || `Peserta #${slot.number}`}`}
                    aria-label={`QR Code ${displayName || `Peserta #${slot.number}`}`}
                    className="w-7 h-7 rounded-lg bg-[#E8F0FE] hover:bg-[#D2E3FC] text-[#1967D2] inline-flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDownloadSinglePdf(slot)}
                    title={`Download Mission_Peserta_${slot.number}.pdf`}
                    aria-label={`Download PDF ${displayName || `Peserta #${slot.number}`}`}
                    className="w-7 h-7 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F1F5F9] text-[#334155] inline-flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
