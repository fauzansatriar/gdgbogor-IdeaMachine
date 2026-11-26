import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Dices,
  FileText,
  Flag,
  Maximize2,
  Minimize2,
  Pencil,
  RotateCcw,
  User,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { GdgBogorLogo, GoogleSpectrumBar } from './components/BrandMark';
import { CoverView } from './components/CoverView';
import { FinalizedRecapModal } from './components/FinalizedRecapModal';
import { MissionBriefView } from './components/MissionBriefView';
import { MissionResultShowcase, RevealStage } from './components/MissionResultShowcase';
import { QrHandoverModal } from './components/QrHandoverModal';
import { ReelDisplayData, ReelTheme, SlotReelCard } from './components/SlotReelCard';
import { StageTimerView } from './components/StageTimerView';
import {
  ContextualMission,
  DEVICE_TARGETS,
  PROBLEMS,
  ParticipantSlot,
  SOLUTIONS,
  TARGET_USERS,
  buildContextualMission,
  getDeviceById,
  resolveChallengeMission,
} from './data/pools';
import { sfx } from './utils/audio';
import { MissionBriefPayload, decodeBriefToken } from './utils/briefCodec';
import { downloadAllSummaryPdf, downloadParticipantPdf } from './utils/pdfExport';
import { useProjectorDisplay } from './hooks/useProjectorDisplay';

type AppPage = 'cover' | 'machine' | 'timer';

interface StoredState {
  participants: ParticipantSlot[];
  activeTurn: 1 | 2 | 3 | 4 | 5;
}

const STORAGE_KEY = 'gdg_bogor_idea_machine_v4';

const INITIAL_PARTICIPANTS: ParticipantSlot[] = [
  { number: 1, name: '', challenge: null, lockedAt: null },
  { number: 2, name: '', challenge: null, lockedAt: null },
  { number: 3, name: '', challenge: null, lockedAt: null },
  { number: 4, name: '', challenge: null, lockedAt: null },
  { number: 5, name: '', challenge: null, lockedAt: null },
];

const REEL_THEMES: [ReelTheme, ReelTheme, ReelTheme, ReelTheme] = [
  {
    stepLabel: '01 · MASALAH',
    headerTitle: 'Masalah Sehari-hari',
    gradientClass: 'from-[#4285F4] to-[#2563EB]',
    headerTextClass: 'text-white',
    accentColor: '#4285F4',
    softBgClass: 'bg-[#E8F0FE]',
    softTextClass: 'text-[#1A73E8]',
  },
  {
    stepLabel: '02 · PENGGUNA',
    headerTitle: 'Siapa Penggunanya',
    gradientClass: 'from-[#EA4335] to-[#FB7185]',
    headerTextClass: 'text-white',
    accentColor: '#EA4335',
    softBgClass: 'bg-[#FEE2E2]',
    softTextClass: 'text-[#EA4335]',
  },
  {
    stepLabel: '03 · IDE APLIKASI',
    headerTitle: 'Aplikasi yang Dibuat',
    gradientClass: 'from-[#34A853] to-[#06B6D4]',
    headerTextClass: 'text-white',
    accentColor: '#34A853',
    softBgClass: 'bg-[#E6F4EA]',
    softTextClass: 'text-[#1E8E3E]',
  },
  {
    stepLabel: '04 · PERANGKAT',
    headerTitle: 'Dipakai di Mana',
    gradientClass: 'from-[#FBBF24] to-[#F59E0B]',
    headerTextClass: 'text-[#111827]',
    accentColor: '#D97706',
    softBgClass: 'bg-[#FEF3C7]',
    softTextClass: 'text-[#B45309]',
  },
];

function loadInitialState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { participants: INITIAL_PARTICIPANTS, activeTurn: 1 };
    }
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    if (Array.isArray(parsed.participants) && parsed.participants.length === 5) {
      const normalized: ParticipantSlot[] = parsed.participants.map((item, idx) => ({
        number: ([1, 2, 3, 4, 5] as const)[idx],
        name: typeof item?.name === 'string' ? item.name : '',
        challenge: item?.challenge ?? null,
        lockedAt: typeof item?.lockedAt === 'string' ? item.lockedAt : null,
      }));
      const turn =
        parsed.activeTurn && parsed.activeTurn >= 1 && parsed.activeTurn <= 5
          ? parsed.activeTurn
          : 1;
      return { participants: normalized, activeTurn: turn };
    }
  } catch {
    // Ignore corrupted storage
  }
  return { participants: INITIAL_PARTICIPANTS, activeTurn: 1 };
}

function pickRandomIndex(length: number, exclude?: number): number {
  if (length <= 1) return 0;
  let next = Math.floor(Math.random() * length);
  if (exclude !== undefined && next === exclude) {
    next = (next + 1 + Math.floor(Math.random() * (length - 1))) % length;
  }
  return next;
}

export default function App() {
  const [urlBriefPayload] = useState<MissionBriefPayload | null>(() => {
    if (typeof window === 'undefined') return null;
    const token = new URLSearchParams(window.location.search).get('brief');
    return token ? decodeBriefToken(token) : null;
  });

  const { isWideProjector } = useProjectorDisplay();
  const [previewBrief, setPreviewBrief] = useState<MissionBriefPayload | null>(null);
  const [activePage, setActivePage] = useState<AppPage>('cover');
  const [sfxEnabled, setSfxEnabled] = useState(true);

  const initialStored = useMemo(() => loadInitialState(), []);
  const [participants, setParticipants] = useState<ParticipantSlot[]>(
    initialStored.participants
  );
  const [activeTurn, setActiveTurn] = useState<1 | 2 | 3 | 4 | 5>(
    initialStored.activeTurn
  );

  const initialActiveSlot = initialStored.participants.find(
    (s) => s.number === initialStored.activeTurn
  );
  const [participantNameInput, setParticipantNameInput] = useState<string>(
    () => initialActiveSlot?.name ?? ''
  );
  const [isNameConfirmed, setIsNameConfirmed] = useState<boolean>(() =>
    Boolean(initialActiveSlot?.name?.trim() || initialActiveSlot?.challenge)
  );
  const [hasSpun, setHasSpun] = useState<boolean>(
    Boolean(initialActiveSlot?.challenge)
  );
  const [activeMission, setActiveMission] = useState<ContextualMission | null>(() =>
    initialActiveSlot?.challenge
      ? resolveChallengeMission(initialActiveSlot.challenge)
      : null
  );
  const [reelIndices, setReelIndices] = useState<[number, number, number, number]>(() => {
    if (initialActiveSlot?.challenge) {
      const p = PROBLEMS.findIndex((x) => x.id === initialActiveSlot.challenge!.problemId);
      const u = TARGET_USERS.findIndex((x) => x.id === initialActiveSlot.challenge!.userId);
      const s = SOLUTIONS.findIndex((x) => x.id === initialActiveSlot.challenge!.solutionId);
      const d = DEVICE_TARGETS.findIndex((x) => x.id === initialActiveSlot.challenge!.deviceId);
      return [p >= 0 ? p : 0, u >= 0 ? u : 0, s >= 0 ? s : 0, d >= 0 ? d : 0];
    }
    return [0, 0, 0, 0];
  });

  const [spinningCols, setSpinningCols] = useState<[boolean, boolean, boolean, boolean]>([
    false,
    false,
    false,
    false,
  ]);
  const [revealGeneration, setRevealGeneration] = useState(0);
  const [revealStage, setRevealStage] = useState<RevealStage>('brief');
  const [isStageAutoPlay, setIsStageAutoPlay] = useState(false);

  const [qrModalSlot, setQrModalSlot] = useState<ParticipantSlot | null>(null);
  const [isRecapOpen, setIsRecapOpen] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    message: string;
    tone: 'info' | 'warning' | 'success';
  } | null>(null);

  const timersRef = useRef<number[]>([]);
  const snackbarTimerRef = useRef<number | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const spinRequestIdRef = useRef(0);
  const spinAbortRef = useRef<AbortController | null>(null);
  const seenIdeasRef = useRef<string[]>(
    initialStored.participants
      .flatMap((slot) => {
        if (!slot.challenge) return [];
        const m = resolveChallengeMission(slot.challenge);
        return [m.problem.title, m.solution.title];
      })
      .slice(-24)
  );

  const showSnackbar = useCallback(
    (message: string, tone: 'info' | 'warning' | 'success' = 'info') => {
      setSnackbar({ message, tone });
      if (snackbarTimerRef.current) {
        window.clearTimeout(snackbarTimerRef.current);
      }
      snackbarTimerRef.current = window.setTimeout(() => {
        setSnackbar(null);
      }, 3600);
    },
    []
  );

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ participants, activeTurn })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [participants, activeTurn]);

  useEffect(() => {
    return () => {
      spinAbortRef.current?.abort();
      timersRef.current.forEach((id) => {
        window.clearInterval(id);
        window.clearTimeout(id);
      });
    };
  }, []);

  const isAnySpinning = spinningCols.some(Boolean);
  const lockedCount = participants.filter((s) => s.challenge !== null).length;
  const allSlotsLocked = lockedCount === 5;
  const machineStep: 'name' | 'spin' | 'lock' = !isNameConfirmed
    ? 'name'
    : !hasSpun || isAnySpinning
      ? 'spin'
      : 'lock';

  useEffect(() => {
    if (activePage === 'machine' && machineStep === 'name' && !qrModalSlot) {
      const id = window.setTimeout(() => nameInputRef.current?.focus(), 60);
      return () => window.clearTimeout(id);
    }
  }, [activePage, activeTurn, machineStep, qrModalSlot]);

  const handleToggleSfx = () => {
    const next = !sfxEnabled;
    setSfxEnabled(next);
    sfx.setEnabled(next);
    showSnackbar(next ? 'Efek suara diaktifkan' : 'Efek suara dimatikan (Muted)', 'info');
  };

  const toggleNativeFullscreen = useCallback(() => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement
          .requestFullscreen()
          .then(() => setIsNativeFullscreen(true))
          .catch(() => setIsNativeFullscreen(false));
      } else if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen()
          .then(() => setIsNativeFullscreen(false))
          .catch(() => {});
      }
    } catch {
      // Ignore fullscreen errors in embedded frames
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsNativeFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const clearSpinTimers = useCallback(() => {
    timersRef.current.forEach((id) => {
      window.clearInterval(id);
      window.clearTimeout(id);
    });
    timersRef.current = [];
  }, []);

  const spinAll = useCallback(async () => {
    if (isAnySpinning) return;

    clearSpinTimers();
    spinAbortRef.current?.abort();

    const requestId = ++spinRequestIdRef.current;
    const abortController = new AbortController();
    spinAbortRef.current = abortController;

    const hadMissionBefore = hasSpun && activeMission !== null;
    const previousMission = activeMission;

    const poolsLengths = [
      PROBLEMS.length,
      TARGET_USERS.length,
      SOLUTIONS.length,
      DEVICE_TARGETS.length,
    ];
    const columns = [0, 1, 2, 3] as const;
    const lastCol = 3;
    const spinStartedAt = Date.now();

    setActiveMission(null);
    setHasSpun(true);
    setSpinningCols([true, true, true, true]);
    setRevealStage('problem');
    setIsStageAutoPlay(true);

    const tickIntervals: number[] = [];
    columns.forEach((colIdx, orderIdx) => {
      const tickInterval = window.setInterval(() => {
        setReelIndices((prev) => {
          const next: [number, number, number, number] = [...prev] as [
            number,
            number,
            number,
            number,
          ];
          next[colIdx] = (next[colIdx] + 1) % poolsLengths[colIdx];
          return next;
        });
        if (orderIdx === 0 || colIdx === lastCol) {
          sfx.playSpinTick(1 + colIdx * 0.06);
        }
      }, 65);
      tickIntervals[colIdx] = tickInterval;
      timersRef.current.push(tickInterval);
    });

    try {
      const fetchMission = async () =>
        fetch('/api/generate-mission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortController.signal,
          body: JSON.stringify({
            previousIdeas: seenIdeasRef.current,
            participantName: participantNameInput.trim() || undefined,
          }),
        });

      let response = await fetchMission();
      if (
        (response.status === 502 || response.status === 503 || response.status === 504) &&
        !abortController.signal.aborted
      ) {
        await new Promise((r) => window.setTimeout(r, 700));
        response = await fetchMission();
      }

      const contentType = response.headers.get('content-type') || '';
      const data = (
        contentType.includes('application/json')
          ? await response.json().catch(() => ({}))
          : {}
      ) as {
        mission?: {
          problem: ContextualMission['problem'];
          targetUser: ContextualMission['targetUser'];
          solution: ContextualMission['solution'];
          deviceId: string;
        };
        error?: string;
      };

      if (!response.ok || !data.mission) {
        throw new Error(
          data.error || 'Gagal membuat ide baru dari Gemini. Silakan coba Spin lagi.'
        );
      }

      if (requestId !== spinRequestIdRef.current) return;

      const resolvedDevice = getDeviceById(data.mission.deviceId);
      const resolvedMission: ContextualMission = {
        problem: data.mission.problem,
        targetUser: data.mission.targetUser,
        solution: data.mission.solution,
        device: resolvedDevice,
      };

      seenIdeasRef.current = Array.from(
        new Set([
          ...seenIdeasRef.current,
          resolvedMission.problem.title,
          resolvedMission.solution.title,
        ])
      ).slice(-25);

      const elapsed = Date.now() - spinStartedAt;
      const baseDelay = Math.max(0, 950 - elapsed);
      const stopOffsets = [0, 380, 760, 1140];

      setActiveMission(resolvedMission);

      columns.forEach((colIdx) => {
        const stopTimeout = window.setTimeout(() => {
          if (requestId !== spinRequestIdRef.current) return;

          window.clearInterval(tickIntervals[colIdx]);

          if (colIdx === lastCol) {
            const devIdx = DEVICE_TARGETS.findIndex(
              (d) => d.id === resolvedDevice.id
            );
            setReelIndices((prev) => [
              prev[0],
              prev[1],
              prev[2],
              devIdx >= 0 ? devIdx : pickRandomIndex(DEVICE_TARGETS.length, prev[3]),
            ]);
          }

          setSpinningCols((prev) => {
            const next: [boolean, boolean, boolean, boolean] = [...prev] as [
              boolean,
              boolean,
              boolean,
              boolean,
            ];
            next[colIdx] = false;
            return next;
          });

          sfx.playReelStop(colIdx);

          if (colIdx === lastCol) {
            setRevealStage('problem');
            setIsStageAutoPlay(true);
            setRevealGeneration((g) => g + 1);
            window.setTimeout(() => sfx.playFanfare(), 140);
          }
        }, baseDelay + stopOffsets[colIdx]);
        timersRef.current.push(stopTimeout);
      });
    } catch (error: unknown) {
      if (abortController.signal.aborted || requestId !== spinRequestIdRef.current) {
        return;
      }
      clearSpinTimers();
      setSpinningCols([false, false, false, false]);
      if (hadMissionBefore && previousMission) {
        setActiveMission(previousMission);
        setHasSpun(true);
      } else {
        setActiveMission(null);
        setHasSpun(false);
      }
      sfx.playWarningBeep();
      const message =
        error instanceof Error
          ? error.message
          : 'Gagal terhubung ke Gemini. Coba spin ulang sebentar lagi.';
      showSnackbar(message, 'warning');
    }
  }, [
    activeMission,
    clearSpinTimers,
    hasSpun,
    isAnySpinning,
    participantNameInput,
    showSnackbar,
  ]);

  const handleConfirmName = (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleaned = participantNameInput.trim();
    if (!cleaned) {
      sfx.playWarningBeep();
      showSnackbar(`Masukkan nama Peserta #${activeTurn} terlebih dahulu.`, 'warning');
      nameInputRef.current?.focus();
      return;
    }

    setParticipants((prev) =>
      prev.map((s) => (s.number === activeTurn ? { ...s, name: cleaned } : s))
    );
    setParticipantNameInput(cleaned);
    setIsNameConfirmed(true);
  };

  const buildCurrentChallenge = useCallback(
    (missionToLock: ContextualMission) => ({
      problemId: missionToLock.problem.id,
      userId: missionToLock.targetUser.id,
      solutionId: missionToLock.solution.id,
      deviceId: missionToLock.device.id,
      mission: missionToLock,
    }),
    []
  );

  const handleLockAndAdvance = (missionToLock: ContextualMission) => {
    if (isAnySpinning || !hasSpun) return;

    const currentSlot = participants.find((s) => s.number === activeTurn);
    const finalName =
      participantNameInput.trim() || currentSlot?.name?.trim() || `Peserta #${activeTurn}`;

    const challenge = buildCurrentChallenge(missionToLock);

    const updatedSlot: ParticipantSlot = {
      number: activeTurn,
      name: finalName,
      challenge,
      lockedAt: new Date().toISOString(),
    };

    const nextParticipants = participants.map((s) =>
      s.number === activeTurn ? updatedSlot : s
    );

    setParticipants(nextParticipants);
    sfx.playLockConfirm();

    const nextEmpty =
      nextParticipants.find((s) => s.number > activeTurn && s.challenge === null) ??
      nextParticipants.find((s) => s.challenge === null);

    if (nextEmpty) {
      setActiveTurn(nextEmpty.number);
      setParticipantNameInput(nextEmpty.name);
      setIsNameConfirmed(Boolean(nextEmpty.name.trim()));
      setActiveMission(null);
      setHasSpun(false);
      setRevealStage('brief');
      setIsStageAutoPlay(false);
      showSnackbar(
        `Hasil dikunci ke ${finalName} (#${activeTurn}). Lanjut ke Peserta #${nextEmpty.number}`,
        'success'
      );
    } else {
      setActivePage('timer');
      showSnackbar(
        `Seluruh 5 peserta telah terkunci! Stage Timer dibuka.`,
        'success'
      );
    }
  };

  const handleFinalizeSession = useCallback(() => {
    if (lockedCount === 0) {
      sfx.playWarningBeep();
      showSnackbar('Kunci minimal 1 peserta sebelum masuk ke Stage Timer.', 'warning');
      return;
    }
    setQrModalSlot(null);
    setIsRecapOpen(false);
    setActivePage('timer');
    showSnackbar(`Finalisasi selesai (${lockedCount} peserta). Stage Timer siap dimulai!`, 'success');
  }, [lockedCount, showSnackbar]);

  const handleCloseQrModal = useCallback(() => {
    setQrModalSlot(null);
    if (activePage === 'machine' && allSlotsLocked) {
      setActivePage('timer');
      showSnackbar('Seluruh 5 peserta telah terkunci! Stage Timer dibuka.', 'success');
    }
  }, [activePage, allSlotsLocked, showSnackbar]);

  const handleResetAll = () => {
    spinAbortRef.current?.abort();
    clearSpinTimers();
    seenIdeasRef.current = [];
    setSpinningCols([false, false, false, false]);
    setParticipants(INITIAL_PARTICIPANTS);
    setActiveTurn(1);
    setParticipantNameInput('');
    setIsNameConfirmed(false);
    setActiveMission(null);
    setHasSpun(false);
    setRevealStage('brief');
    setIsStageAutoPlay(false);
    setQrModalSlot(null);
    setIsRecapOpen(false);
    setConfirmingReset(false);
    setActivePage('machine');
    showSnackbar('Sesi baru dimulai. Silakan masukkan nama Peserta #1.', 'info');
  };

  const handleResetButtonClick = () => {
    if (!confirmingReset) {
      setConfirmingReset(true);
      window.setTimeout(() => setConfirmingReset(false), 3500);
      return;
    }
    handleResetAll();
  };

  const handleDownloadSinglePdf = async (slot: ParticipantSlot) => {
    try {
      await downloadParticipantPdf(slot);
      showSnackbar(`Mission_Peserta_${slot.number}.pdf diunduh`, 'success');
    } catch {
      showSnackbar('Gagal membuat file PDF peserta.', 'warning');
    }
  };

  const handleDownloadAllPdf = () => {
    const hasAny = participants.some((s) => s.challenge !== null);
    if (!hasAny) {
      showSnackbar('Belum ada peserta yang dikunci.', 'warning');
      return;
    }
    downloadAllSummaryPdf(participants);
    showSnackbar('Idea_Machine_Rekap_5_Peserta.pdf diunduh', 'success');
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewBrief) {
          setPreviewBrief(null);
          return;
        }
        if (qrModalSlot) {
          handleCloseQrModal();
          return;
        }
        if (isRecapOpen) {
          setIsRecapOpen(false);
          return;
        }
      }

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toUpperCase() ?? '';
      const isInteractiveTarget = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(tag);

      if (e.code === 'KeyF' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (urlBriefPayload || previewBrief || qrModalSlot || isRecapOpen || isInteractiveTarget) {
          return;
        }
        e.preventDefault();
        toggleNativeFullscreen();
        return;
      }

      if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
        if (
          urlBriefPayload ||
          previewBrief ||
          qrModalSlot ||
          isRecapOpen ||
          activePage !== 'machine' ||
          machineStep !== 'lock' ||
          isInteractiveTarget
        ) {
          return;
        }
        const order: RevealStage[] = ['problem', 'app', 'user', 'brief'];
        const currentIdx = order.indexOf(revealStage);
        if (e.code === 'ArrowRight' && currentIdx < order.length - 1) {
          e.preventDefault();
          const next = order[currentIdx + 1];
          if (next === 'brief') sfx.playFanfare();
          else sfx.playReelStop(currentIdx + 1);
          setIsStageAutoPlay(false);
          setRevealStage(next);
        } else if (e.code === 'ArrowLeft' && currentIdx > 0) {
          e.preventDefault();
          setIsStageAutoPlay(false);
          setRevealStage(order[currentIdx - 1]);
        }
        return;
      }

      if (e.code === 'Space') {
        if (
          urlBriefPayload ||
          previewBrief ||
          qrModalSlot ||
          isRecapOpen ||
          activePage !== 'machine' ||
          machineStep === 'name'
        ) {
          return;
        }
        if (isInteractiveTarget) {
          return;
        }
        e.preventDefault();
        spinAll();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activePage,
    handleCloseQrModal,
    isRecapOpen,
    machineStep,
    previewBrief,
    qrModalSlot,
    revealStage,
    spinAll,
    toggleNativeFullscreen,
    urlBriefPayload,
  ]);

  if (urlBriefPayload) {
    return <MissionBriefView payload={urlBriefPayload} />;
  }

  if (previewBrief) {
    return (
      <MissionBriefView
        payload={previewBrief}
        isPreview
        onExitPreview={() => {
          setPreviewBrief(null);
          if (activePage === 'machine' && allSlotsLocked) {
            setActivePage('timer');
          }
        }}
      />
    );
  }

  const rawProblem = PROBLEMS[reelIndices[0]];
  const rawUser = TARGET_USERS[reelIndices[1]];
  const rawSolution = SOLUTIONS[reelIndices[2]];
  const rawDevice = DEVICE_TARGETS[reelIndices[3]];

  const fallbackMission = buildContextualMission(
    rawProblem,
    rawUser,
    rawSolution,
    rawDevice
  );

  const contextualMission: ContextualMission = activeMission ?? fallbackMission;

  const prevProblem = PROBLEMS[(reelIndices[0] - 1 + PROBLEMS.length) % PROBLEMS.length];
  const nextProblem = PROBLEMS[(reelIndices[0] + 1) % PROBLEMS.length];
  const prevUser = TARGET_USERS[(reelIndices[1] - 1 + TARGET_USERS.length) % TARGET_USERS.length];
  const nextUser = TARGET_USERS[(reelIndices[1] + 1) % TARGET_USERS.length];
  const prevSolution = SOLUTIONS[(reelIndices[2] - 1 + SOLUTIONS.length) % SOLUTIONS.length];
  const nextSolution = SOLUTIONS[(reelIndices[2] + 1) % SOLUTIONS.length];
  const prevDevice = DEVICE_TARGETS[(reelIndices[3] - 1 + DEVICE_TARGETS.length) % DEVICE_TARGETS.length];
  const nextDevice = DEVICE_TARGETS[(reelIndices[3] + 1) % DEVICE_TARGETS.length];

  const col0Mission = !spinningCols[0] && activeMission ? activeMission : fallbackMission;
  const col1Mission = !spinningCols[1] && activeMission ? activeMission : fallbackMission;
  const col2Mission = !spinningCols[2] && activeMission ? activeMission : fallbackMission;
  const col3Mission = !spinningCols[3] && activeMission ? activeMission : fallbackMission;

  const reelItems: [
    ReelDisplayData,
    ReelDisplayData,
    ReelDisplayData,
    ReelDisplayData,
  ] = [
    {
      key: col0Mission.problem.id,
      icon: col0Mission.problem.icon,
      title: col0Mission.problem.title,
      meta: col0Mission.problem.domain,
      description: col0Mission.problem.description,
      prevTitle: prevProblem.title,
      nextTitle: nextProblem.title,
    },
    {
      key: `${col1Mission.targetUser.id}-${col1Mission.problem.id}`,
      icon: col1Mission.targetUser.icon,
      title: col1Mission.targetUser.title,
      meta: col1Mission.targetUser.context,
      description: col1Mission.targetUser.contextualDescription,
      prevTitle: prevUser.title,
      nextTitle: nextUser.title,
    },
    {
      key: `${col2Mission.solution.id}-${col2Mission.problem.id}-${col2Mission.targetUser.id}`,
      icon: col2Mission.solution.icon,
      title: col2Mission.solution.title,
      meta: col2Mission.solution.techStack,
      description: col2Mission.solution.contextualHowToBuild,
      bullets: col2Mission.solution.contextualFeatures,
      prevTitle: prevSolution.title,
      nextTitle: nextSolution.title,
    },
    {
      key: col3Mission.device.id,
      icon: col3Mission.device.icon,
      title: col3Mission.device.title,
      meta: `${col3Mission.device.badgeLabel} · ${col3Mission.device.layoutHint}`,
      description: col3Mission.device.description,
      prevTitle: prevDevice.title,
      nextTitle: nextDevice.title,
    },
  ];

  const nextEmptyAfterCurrent =
    participants.find((s) => s.number > activeTurn && s.challenge === null) ??
    participants.find((s) => s.number !== activeTurn && s.challenge === null);

  const advanceActionLabel = nextEmptyAfterCurrent
    ? `Lanjut ke Peserta #${nextEmptyAfterCurrent.number}`
    : 'Finalisasi & Buka Stage Timer';

  return (
    <div
      className={`h-screen overflow-hidden text-[#111827] flex flex-col ${
        activePage === 'cover' || activePage === 'timer' ? 'bg-white' : 'bg-[#F8FAFC]'
      }`}
    >
      {/* Light-Mode Floating Pill Navbar (Mode Fokus & Fullscreen) */}
      {(activePage !== 'cover' || isNativeFullscreen) && (
        <header className="shrink-0 pt-3 pb-1 px-4 flex justify-center z-20">
          <nav
            aria-label="Navigasi Mode Fokus"
            className="max-w-full bg-white/95 backdrop-blur-md border border-[#CBD5E1] shadow-[0_8px_28px_rgba(15,23,42,0.08)] rounded-full p-1.5 pl-4 inline-flex items-center gap-1.5 sm:gap-2"
          >
            {/* Brand -> Back to Cover */}
            <button
              type="button"
              onClick={() => setActivePage('cover')}
              className="flex items-center gap-2 shrink-0 cursor-pointer text-left hover:opacity-80 transition-opacity pr-1"
              title="Kembali ke halaman Cover"
            >
              <GdgBogorLogo className="h-5 w-auto" />
              <span className="hidden sm:inline text-sm font-bold tracking-tight text-[#111827] whitespace-nowrap">
                Idea Machine
              </span>
            </button>

            <span className="h-4 w-px bg-[#E2E8F0] shrink-0" aria-hidden="true" />

            {/* Current Context Item */}
            {activePage === 'cover' ? (
              <span className="px-2 py-1 text-xs font-semibold text-[#4B5563] whitespace-nowrap">
                Cover
              </span>
            ) : activePage === 'machine' ? (
              <span className="px-2 py-1 text-xs font-bold text-[#1A73E8] tabular-nums whitespace-nowrap">
                Peserta #{activeTurn}/5
              </span>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsRecapOpen(true)}
                  className="h-8 px-3 rounded-full hover:bg-[#F1F5F9] text-[#111827] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#1A73E8]" aria-hidden="true" />
                  <span>Rekap ({lockedCount})</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetButtonClick}
                  className={`h-8 px-3 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                    confirmingReset
                      ? 'bg-[#EA4335] text-white hover:bg-[#D93025]'
                      : 'hover:bg-[#FEF2F2] text-[#DC2626]'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{confirmingReset ? 'Yakin?' : 'Sesi Baru'}</span>
                </button>
              </div>
            )}

            {/* Utility Icon: SFX */}
            <button
              type="button"
              onClick={handleToggleSfx}
              aria-pressed={sfxEnabled}
              title={sfxEnabled ? 'Matikan Efek Suara' : 'Aktifkan Efek Suara'}
              aria-label={sfxEnabled ? 'Matikan Efek Suara' : 'Aktifkan Efek Suara'}
              className={`w-8 h-8 rounded-full inline-flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                sfxEnabled
                  ? 'hover:bg-[#F1F5F9] text-[#1A73E8]'
                  : 'bg-[#FEF2F2] text-[#DC2626]'
              }`}
            >
              {sfxEnabled ? (
                <Volume2 className="w-4 h-4" aria-hidden="true" />
              ) : (
                <VolumeX className="w-4 h-4" aria-hidden="true" />
              )}
            </button>

            {/* Right Contrasting Pill CTA (Light-Mode Accent Pill) */}
            {activePage === 'machine' && lockedCount > 0 ? (
              <>
                <button
                  type="button"
                  onClick={toggleNativeFullscreen}
                  title="Layar Penuh Proyektor (F)"
                  aria-label="Toggle Layar Penuh"
                  className="w-8 h-8 rounded-full hover:bg-[#F1F5F9] text-[#4B5563] hover:text-[#111827] inline-flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                >
                  {isNativeFullscreen ? (
                    <Minimize2 className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Maximize2 className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleFinalizeSession}
                  disabled={isAnySpinning}
                  title={`Finalisasi (${lockedCount}/5) & Buka Stage Timer`}
                  aria-label={`Finalisasi (${lockedCount}/5)`}
                  className="h-8 px-3.5 rounded-full bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors shrink-0 cursor-pointer disabled:opacity-45"
                >
                  <Flag className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="tabular-nums">{lockedCount}/5</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={toggleNativeFullscreen}
                title="Layar Penuh Proyektor (F)"
                aria-label="Toggle Layar Penuh"
                className="h-8 px-3.5 rounded-full bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors shrink-0 cursor-pointer"
              >
                {isNativeFullscreen ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">Keluar</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">Fullscreen</span>
                  </>
                )}
              </button>
            )}
          </nav>
        </header>
      )}

      {/* Main Content — Every Section Centered in Mode Fokus */}
      {activePage === 'cover' ? (
        <main className="flex-1 min-h-0 flex flex-col bg-white">
          <CoverView
            isWideProjector={isWideProjector}
            onStartMachine={() => {
              if (allSlotsLocked) {
                setActivePage('timer');
              } else {
                setActivePage('machine');
              }
            }}
          />
        </main>
      ) : activePage === 'timer' ? (
        <main className="flex-1 min-h-0 flex flex-col bg-white">
          <StageTimerView isWideProjector={isWideProjector} />
        </main>
      ) : machineStep === 'name' ? (
        /* Step 1 (Mode Fokus): Centered Participant Name Input */
        <motion.main
          key={`name-step-${activeTurn}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 min-h-0 w-full px-4 sm:px-8 py-4 flex flex-col items-center justify-center"
        >
          <div className="w-full max-w-xl flex flex-col items-center gap-5">
            {/* Centered Name Entry Card */}
            <form
              onSubmit={handleConfirmName}
              className="w-full bg-white rounded-3xl border border-[#CBD5E1] p-6 sm:p-8 shadow-[0_12px_36px_rgba(15,23,42,0.06)] space-y-5"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center shrink-0">
                  <User className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#1A73E8] tabular-nums">
                    Antrean {activeTurn} dari 5
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-[#111827] leading-tight">
                    Masukkan Nama Peserta #{activeTurn}
                  </h1>
                </div>
              </div>

              <p className="text-sm text-[#4B5563] leading-relaxed">
                Tulis nama peserta yang maju ke panggung dulu sebelum memutar mesin ide
                aplikasinya.
              </p>

              <div className="space-y-3">
                <label htmlFor="participant-name-input" className="sr-only">
                  Nama Peserta #{activeTurn}
                </label>
                <input
                  id="participant-name-input"
                  ref={nameInputRef}
                  type="text"
                  value={participantNameInput}
                  onChange={(e) => setParticipantNameInput(e.target.value)}
                  placeholder={`Ketik nama peserta #${activeTurn}...`}
                  maxLength={50}
                  className="w-full min-h-[52px] px-4 py-3 rounded-2xl border-2 border-[#CBD5E1] bg-[#F8FAFC] focus:bg-white focus:border-[#1A73E8] focus:outline-none text-base sm:text-lg font-semibold text-[#111827] placeholder:font-normal placeholder:text-[#94A3B8] transition-colors"
                />

                <button
                  type="submit"
                  className="w-full min-h-[50px] px-6 py-3 rounded-2xl bg-[#1A73E8] hover:bg-[#1557B0] text-white text-base font-bold inline-flex items-center justify-center gap-2.5 transition-colors cursor-pointer shadow-[0_6px_20px_rgba(26,115,232,0.24)]"
                >
                  <span>Lanjut Putar Mesin</span>
                  <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </form>

            {lockedCount > 0 && (
              <button
                type="button"
                onClick={handleFinalizeSession}
                className="text-xs sm:text-sm font-semibold text-[#4B5563] hover:text-[#111827] underline underline-offset-4 cursor-pointer transition-colors"
              >
                Sudah selesai dengan {lockedCount} peserta? Finalisasi & Buka Timer →
              </button>
            )}
          </div>
        </motion.main>
      ) : (
        /* Steps 2 & 3 (Mode Fokus): Fit-Screen Centered Stage */
        <motion.main
          key={`machine-focus-${activeTurn}`}
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className={`flex-1 min-h-0 w-full py-2 flex flex-col items-center justify-center ${
            isWideProjector ? 'px-10 xl:px-14' : 'px-4 sm:px-8'
          }`}
        >
          <div
            className={`w-full flex flex-col ${
              isWideProjector ? 'max-w-[1480px] gap-3' : 'max-w-[1360px] gap-2'
            }`}
          >
            {/* Clean Participant Context Header (No Step Pills) */}
            <div className="flex items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`rounded-lg bg-[#1A73E8] text-white font-bold tabular-nums shrink-0 ${
                    isWideProjector ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs'
                  }`}
                >
                  Peserta #{activeTurn}
                </span>
                <span
                  className={`font-bold text-[#111827] truncate ${
                    isWideProjector ? 'text-lg sm:text-xl' : 'text-base sm:text-lg'
                  }`}
                >
                  {participantNameInput.trim() || `Peserta #${activeTurn}`}
                </span>
                {!isAnySpinning && (
                  <button
                    type="button"
                    onClick={() => setIsNameConfirmed(false)}
                    className="px-2 py-0.5 rounded-lg text-xs font-semibold text-[#5F6368] hover:text-[#111827] hover:bg-white border border-transparent hover:border-[#E2E8F0] inline-flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" aria-hidden="true" />
                    <span>Ubah Nama</span>
                  </button>
                )}
              </div>
            </div>

            {machineStep === 'spin' ? (
              /* Spinning / Mystery View: 4 Equal Slot Drums */
              <div
                className={`rounded-3xl bg-[#F1F5F9] border border-[#CBD5E1] shadow-[0_12px_40px_rgba(15,23,42,0.06)] ${
                  isWideProjector ? 'p-4 sm:p-5' : 'p-3 sm:p-4'
                }`}
              >
                <div
                  className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-stretch ${
                    isWideProjector ? 'gap-4' : 'gap-3'
                  }`}
                >
                  {([0, 1, 2, 3] as const).map((idx) => (
                    <SlotReelCard
                      key={idx}
                      theme={REEL_THEMES[idx]}
                      item={reelItems[idx]}
                      isRevealed={hasSpun}
                      isSpinning={spinningCols[idx]}
                      isFocusMode
                      isWideProjector={isWideProjector}
                    />
                  ))}
                </div>
              </div>
            ) : (
              /* Revealed Result View: Cinematic Stage-by-Stage Reveal -> Direct QR Handover Brief */
              <MissionResultShowcase
                mission={contextualMission}
                participantNumber={activeTurn}
                participantName={participantNameInput}
                revealKey={revealGeneration}
                stage={revealStage}
                autoPlay={isStageAutoPlay}
                isWideProjector={isWideProjector}
                advanceActionLabel={advanceActionLabel}
                onSelectStage={(nextStage, stopAutoPlay) => {
                  if (stopAutoPlay) setIsStageAutoPlay(false);
                  setRevealStage(nextStage);
                }}
                onOpenPreview={(payload) => setPreviewBrief(payload)}
                onDownloadPdf={() =>
                  handleDownloadSinglePdf({
                    number: activeTurn,
                    name: participantNameInput.trim(),
                    challenge: buildCurrentChallenge(contextualMission),
                    lockedAt: new Date().toISOString(),
                  })
                }
                onConfirmAndAdvance={() => handleLockAndAdvance(contextualMission)}
              />
            )}

            {/* Step-Focused Centered Action Bar */}
            {machineStep === 'spin' ? (
              <div className="flex items-center justify-center pt-1">
                <button
                  type="button"
                  onClick={spinAll}
                  disabled={isAnySpinning}
                  className={`rounded-2xl bg-[#1A73E8] hover:bg-[#1557B0] text-white font-bold inline-flex items-center justify-center gap-2.5 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed shadow-[0_8px_24px_rgba(26,115,232,0.28)] ${
                    isWideProjector ? 'min-h-[54px] px-10 py-3 text-lg' : 'min-h-[48px] px-8 py-2.5 text-base'
                  }`}
                >
                  <Dices className="w-5 h-5" aria-hidden="true" />
                  <span>
                    {isAnySpinning ? 'Meracik Ide dengan Gemini...' : 'Spin Buka Kejutan (SPACE)'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-3 pt-0.5">
                <button
                  type="button"
                  onClick={spinAll}
                  disabled={isAnySpinning}
                  className={`rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#111827] font-bold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-45 ${
                    isWideProjector ? 'min-h-[46px] px-7 py-2 text-base' : 'min-h-[42px] px-6 py-1.5 text-sm'
                  }`}
                >
                  <Dices className="w-4 h-4 text-[#1A73E8]" aria-hidden="true" />
                  <span>Spin Ulang (SPACE)</span>
                </button>
              </div>
            )}
          </div>
        </motion.main>
      )}

      {/* QR Code Handover Modal */}
      <QrHandoverModal
        slot={qrModalSlot}
        primaryActionLabel={
          activePage === 'machine'
            ? allSlotsLocked
              ? 'Finalisasi & Buka Stage Timer'
              : `Lanjut ke Peserta #${activeTurn}`
            : undefined
        }
        onPrimaryAction={activePage === 'machine' ? handleCloseQrModal : undefined}
        onClose={handleCloseQrModal}
        onDownloadPdf={handleDownloadSinglePdf}
        onOpenPreview={(payload) => {
          setQrModalSlot(null);
          setPreviewBrief(payload);
        }}
      />

      {/* Finalized Recap Modal (Accessible from Stage Timer Header) */}
      <FinalizedRecapModal
        isOpen={isRecapOpen}
        slots={participants}
        onClose={() => setIsRecapOpen(false)}
        onOpenQr={(slot) => {
          setIsRecapOpen(false);
          setQrModalSlot(slot);
        }}
        onOpenPreview={(payload) => {
          setIsRecapOpen(false);
          setPreviewBrief(payload);
        }}
        onDownloadSinglePdf={handleDownloadSinglePdf}
        onDownloadAllPdf={handleDownloadAllPdf}
      />

      {/* Non-Blocking Flat Google Snackbar */}
      {snackbar && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 max-w-[92vw] sm:max-w-md px-4 py-2.5 rounded-xl bg-[#111827] text-white text-xs sm:text-sm font-medium shadow-[0_8px_24px_rgba(17,24,39,0.28)] flex items-center gap-3"
        >
          <CheckCircle2
            className={`w-4 h-4 shrink-0 ${
              snackbar.tone === 'warning'
                ? 'text-[#FBBC04]'
                : snackbar.tone === 'success'
                  ? 'text-[#34A853]'
                  : 'text-[#8AB4F8]'
            }`}
            aria-hidden="true"
          />
          <span>{snackbar.message}</span>
          <button
            type="button"
            onClick={() => setSnackbar(null)}
            aria-label="Tutup notifikasi"
            className="p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Persistent Corner Hotkey Help Overlay */}
      <aside
        aria-label="Panduan Tombol Cepat Presentasi"
        className="fixed bottom-3.5 right-4 z-30 hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-xs border border-[#CBD5E1] shadow-[0_6px_18px_rgba(15,23,42,0.08)] text-[11px] font-semibold text-[#475569] pointer-events-none select-none"
      >
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded-md bg-[#F1F5F9] border border-[#CBD5E1] text-[10px] font-bold text-[#111827]">
            F
          </kbd>
          <span>{isNativeFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}</span>
        </div>

        <span className="h-3 w-px bg-[#CBD5E1]" aria-hidden="true" />

        <div
          className={`flex items-center gap-1.5 transition-opacity ${
            activePage === 'machine' && machineStep !== 'name'
              ? 'text-[#1A73E8] opacity-100'
              : 'opacity-70'
          }`}
        >
          <kbd className="px-1.5 py-0.5 rounded-md bg-[#F1F5F9] border border-[#CBD5E1] text-[10px] font-bold text-[#111827]">
            SPACE
          </kbd>
          <span>Putar Mesin</span>
        </div>
      </aside>

      {/* Bottom 4-Color Google Spectrum Line */}
      <GoogleSpectrumBar />
    </div>
  );
}
