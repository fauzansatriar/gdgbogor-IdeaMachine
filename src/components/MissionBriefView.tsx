import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Laptop,
  MonitorSmartphone,
  Printer,
  RotateCcw,
  Smartphone,
  Tablet,
} from 'lucide-react';
import { motion, useScroll, useSpring, useTransform } from 'motion/react';
import { GdgBogorLogo, GoogleSpectrumBar } from './BrandMark';
import { ReelIcon } from './ReelIcon';
import { MissionBriefPayload, resolveMissionDetails } from '../utils/briefCodec';

interface MissionBriefViewProps {
  payload: MissionBriefPayload;
  isPreview?: boolean;
  onExitPreview?: () => void;
}

const EASE_PAPER_FEED: [number, number, number, number] = [0.16, 1, 0.3, 1];

const BARCODE_WEIGHTS = [
  3, 1, 2, 1, 4, 1, 2, 3, 1, 1, 3, 2, 1, 4, 2, 1, 2, 1, 3, 1, 2, 4, 1, 2, 1, 3,
  1, 2, 1, 1, 3, 2, 4, 1, 2, 1, 3, 1, 2, 1,
];

function ReceiptZigZagEdge({
  flip = false,
  fill = '#FFFFFF',
}: {
  flip?: boolean;
  fill?: string;
}) {
  return (
    <svg
      viewBox="0 0 400 12"
      preserveAspectRatio="none"
      className={`w-full h-3 block ${flip ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <path
        d="M0,12 L0,2 L10,10 L20,2 L30,10 L40,2 L50,10 L60,2 L70,10 L80,2 L90,10 L100,2 L110,10 L120,2 L130,10 L140,2 L150,10 L160,2 L170,10 L180,2 L190,10 L200,2 L210,10 L220,2 L230,10 L240,2 L250,10 L260,2 L270,10 L280,2 L290,10 L300,2 L310,10 L320,2 L330,10 L340,2 L350,10 L360,2 L370,10 L380,2 L390,10 L400,2 L400,12 Z"
        fill={fill}
      />
    </svg>
  );
}

function ReceiptTearDivider() {
  return (
    <div className="relative my-5 flex items-center" aria-hidden="true">
      <div className="-ml-6 sm:-ml-7 w-4 h-7 rounded-r-full bg-[#E8EEF5] shadow-[inset_-2px_0_4px_rgba(15,23,42,0.08)] shrink-0" />
      <div className="flex-1 border-t-2 border-dashed border-[#CBD5E1] mx-1.5" />
      <div className="-mr-6 sm:-mr-7 w-4 h-7 rounded-l-full bg-[#E8EEF5] shadow-[inset_2px_0_4px_rgba(15,23,42,0.08)] shrink-0" />
    </div>
  );
}

function getDeviceMeta(deviceId: string) {
  switch (deviceId) {
    case 'desktop':
      return { label: 'Desktop / Laptop', Icon: Laptop };
    case 'tablet-kiosk':
      return { label: 'Tablet', Icon: Tablet };
    case 'cross-platform':
      return { label: 'Mobile & Desktop', Icon: MonitorSmartphone };
    case 'mobile':
    default:
      return { label: 'Mobile (HP)', Icon: Smartphone };
  }
}

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

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [printCycle, setPrintCycle] = useState(0);
  const [isPrinting, setIsPrinting] = useState(true);

  const { scrollYProgress } = useScroll({
    container: scrollContainerRef,
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 26,
    mass: 0.45,
  });

  // Scroll-linked 3D receipt tilt & rolling bottom curl
  const paperTiltX = useTransform(smoothProgress, [0, 0.5, 1], [4, 0, -4]);
  const sheenTranslateY = useTransform(smoothProgress, [0, 1], ['-18%', '72%']);
  const bottomCurlScaleY = useTransform(smoothProgress, [0, 0.8, 1], [1.2, 1, 0.72]);
  const bottomCurlRotateX = useTransform(smoothProgress, [0, 1], [-28, -6]);

  useEffect(() => {
    setIsPrinting(true);
    const timer = window.setTimeout(() => {
      setIsPrinting(false);
    }, 1650);
    return () => window.clearTimeout(timer);
  }, [printCycle]);

  const handleReplayRoll = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    setPrintCycle((c) => c + 1);
  };

  const deviceMeta = getDeviceMeta(device.id);
  const DeviceIcon = deviceMeta.Icon;
  const displayParticipant = participantName?.trim() || `Peserta #${participantNumber}`;
  const receiptNumber = `GDG-${String(participantNumber).padStart(2, '0')}26`;

  return (
    <div
      ref={scrollContainerRef}
      className="h-dvh overflow-y-auto overflow-x-hidden overscroll-y-contain bg-[radial-gradient(circle_at_top,#FFFFFF_0%,#EDF2F7_52%,#E2E8F0_100%)] text-[#111827] flex flex-col"
    >
      <GoogleSpectrumBar />

      {/* Top Optional Preview Nav */}
      {isPreview && onExitPreview && (
        <div className="sticky top-0 z-30 px-4 pt-3 flex justify-center pointer-events-none">
          <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-white/95 backdrop-blur-md shadow-[0_8px_24px_rgba(15,23,42,0.1)] px-2 py-1.5">
            <button
              type="button"
              onClick={onExitPreview}
              className="px-3 py-1 rounded-full hover:bg-[#F1F5F9] text-xs font-bold text-[#111827] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Kembali</span>
            </button>
          </div>
        </div>
      )}

      {/* Centered 3D Receipt Printer + Rolling Paper Stage */}
      <main className="w-full max-w-[440px] mx-auto px-4 pt-5 pb-16 flex flex-col items-center">
        {/* 3D Thermal Printer Head / Slot */}
        <div className="relative z-20 w-full rounded-t-3xl rounded-b-2xl bg-gradient-to-b from-[#FFFFFF] via-[#F1F5F9] to-[#DCE3EC] shadow-[0_14px_34px_rgba(15,23,42,0.12),inset_0_2px_0_rgba(255,255,255,0.9)] px-5 pt-4 pb-3.5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-[#1A73E8]" aria-hidden="true" />
              <span className="font-mono text-[11px] font-bold tracking-widest text-[#334155] uppercase">
                IDEA MACHINE · BILL
              </span>
            </div>

            {/* 4 Google Status LEDs */}
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span
                className={`w-2 h-2 rounded-full bg-[#4285F4] ${
                  isPrinting ? 'animate-pulse' : ''
                }`}
              />
              <span
                className={`w-2 h-2 rounded-full bg-[#EA4335] ${
                  isPrinting ? 'animate-pulse' : ''
                }`}
              />
              <span
                className={`w-2 h-2 rounded-full bg-[#FBBC04] ${
                  isPrinting ? 'animate-pulse' : ''
                }`}
              />
              <span
                className={`w-2 h-2 rounded-full bg-[#34A853] ${
                  isPrinting ? 'animate-pulse' : ''
                }`}
              />
            </div>
          </div>

          {/* Recessed Dark Thermal Paper Exit Slit */}
          <div className="relative h-4 w-full rounded-full bg-[#0F172A] shadow-[inset_0_4px_8px_rgba(0,0,0,0.9),0_1px_0_rgba(255,255,255,0.8)] flex items-center justify-center">
            <div className="w-[94%] h-[2px] rounded-full bg-[#334155]/60" />
          </div>
        </div>

        {/* 3D Perspective Paper Emergence Wrapper (clipped tightly to printer slit) */}
        <div
          className="relative z-10 w-[92%] -mt-2 overflow-hidden pb-10"
          style={{ perspective: '1200px' }}
        >
          {/* Top Slot Ambient Shadow Cast Onto Paper */}
          <div
            className="pointer-events-none absolute top-0 inset-x-0 h-8 bg-gradient-to-b from-[#0F172A]/22 via-[#0F172A]/8 to-transparent z-30"
            aria-hidden="true"
          />

          {/* 3D Rolling Thermal Receipt Paper */}
          <motion.div
            key={printCycle}
            initial={{
              y: '-92%',
              rotateX: 18,
              scaleY: 0.96,
              opacity: 0.9,
            }}
            animate={{
              y: '0%',
              rotateX: 0,
              scaleY: 1,
              opacity: 1,
            }}
            transition={{
              duration: 1.6,
              ease: EASE_PAPER_FEED,
            }}
            style={{
              transformOrigin: 'top center',
              transformStyle: 'preserve-3d',
            }}
          >
            <motion.article
              aria-label={`Kartu Misi ${displayParticipant}`}
              style={{
                rotateX: paperTiltX,
                transformOrigin: 'center center',
                transformStyle: 'preserve-3d',
              }}
              className="relative bg-white text-[#111827] shadow-[0_24px_48px_rgba(15,23,42,0.16),0_6px_16px_rgba(15,23,42,0.08)]"
            >
              {/* Dynamic Thermal Paper Specular Sheen Driven by Scroll */}
              <motion.div
                style={{ y: sheenTranslateY }}
                className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-transparent via-sky-100/20 to-transparent z-20"
                aria-hidden="true"
              />

              {/* Subtle Top Paper Feed Crease Gradient */}
              <div
                className="pointer-events-none h-5 bg-gradient-to-b from-[#E2E8F0]/65 to-transparent"
                aria-hidden="true"
              />

              {/* Receipt Content Body */}
              <div className="relative z-10 px-5 sm:px-6 pt-1 pb-5">
                {/* Receipt Header */}
                <div className="flex flex-col items-center text-center pb-3">
                  <GdgBogorLogo className="h-6 w-auto" />
                  <div className="mt-1.5 font-mono text-[10px] font-bold tracking-[0.22em] text-[#64748B] uppercase">
                    KARTU MISI VIBE CODING
                  </div>
                </div>

                <div className="border-t border-b border-dashed border-[#CBD5E1] py-3 space-y-1.5 font-mono text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#64748B]">NO. BILL</span>
                    <span className="font-bold text-[#111827] tabular-nums">
                      #{receiptNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#64748B]">ANTREAN</span>
                    <span className="font-bold text-[#1A73E8] tabular-nums">
                      PESERTA #{participantNumber} / 05
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#64748B]">NAMA</span>
                    <span className="font-bold text-[#111827] text-right truncate max-w-[62%]">
                      {displayParticipant}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#64748B]">PERANGKAT</span>
                    <span className="inline-flex items-center gap-1 font-bold text-[#B45309]">
                      <DeviceIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{deviceMeta.label}</span>
                    </span>
                  </div>
                </div>

                <ReceiptTearDivider />

                {/* ITEM 01: THE PROBLEM */}
                <section className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#FEE2E2] text-[#DC2626] font-mono text-[10px] font-bold uppercase tracking-wider">
                      01 · THE PROBLEM
                    </span>
                    <span className="font-mono text-[10px] text-[#94A3B8]">
                      MASALAH
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#FEE2E2] text-[#EA4335] flex items-center justify-center shrink-0 mt-0.5">
                      <ReelIcon name={problem.icon} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-[#111827] leading-snug">
                        {problem.title}
                      </h2>
                      <p className="mt-1 text-xs sm:text-[13px] text-[#374151] leading-relaxed">
                        {problem.description}
                      </p>
                    </div>
                  </div>
                </section>

                <ReceiptTearDivider />

                {/* ITEM 02: THE USER */}
                <section className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#E8F0FE] text-[#1A73E8] font-mono text-[10px] font-bold uppercase tracking-wider">
                      02 · THE USER
                    </span>
                    <span className="font-mono text-[10px] text-[#94A3B8]">
                      PENGGUNA
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center shrink-0 mt-0.5">
                      <ReelIcon name={targetUser.icon} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-[#111827] leading-snug">
                        {targetUser.title}
                      </h2>
                      <p className="mt-1 text-xs sm:text-[13px] text-[#374151] leading-relaxed">
                        {targetUser.contextualDescription}
                      </p>
                    </div>
                  </div>
                </section>

                <ReceiptTearDivider />

                {/* ITEM 03: THE APP */}
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#E6F4EA] text-[#1E8E3E] font-mono text-[10px] font-bold uppercase tracking-wider">
                      03 · THE APP
                    </span>
                    <span className="font-mono text-[10px] text-[#94A3B8]">
                      SOLUSI AI
                    </span>
                  </div>

                  <div className="rounded-xl bg-[#F8FAFC] p-3.5 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-[#E6F4EA] text-[#1E8E3E] flex items-center justify-center shrink-0 mt-0.5">
                        <ReelIcon name={solution.icon} className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <h1 className="text-base sm:text-lg font-bold text-[#111827] leading-snug">
                          {solution.title}
                        </h1>
                        <p className="mt-1 text-xs sm:text-[13px] text-[#374151] leading-relaxed">
                          {solution.contextualHowToBuild}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-dashed border-[#CBD5E1] pt-2.5 space-y-1.5">
                      <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#1E8E3E]">
                        FITUR UTAMA ({solution.contextualFeatures.length})
                      </div>
                      <ul className="space-y-1.5">
                        {solution.contextualFeatures.map((feat, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-xs text-[#1F2937] leading-snug"
                          >
                            <span className="mt-0.5 w-4 h-4 rounded-md bg-[#E6F4EA] text-[#1E8E3E] inline-flex items-center justify-center shrink-0">
                              <Check className="w-2.5 h-2.5" aria-hidden="true" />
                            </span>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>

                <ReceiptTearDivider />

                {/* Receipt Total + Decorative Thermal Barcode + CTA */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between font-mono text-xs font-bold text-[#111827]">
                    <span>TARGET LAYAR</span>
                    <span className="text-[#B45309]">{device.title}</span>
                  </div>

                  {/* Decorative Thermal Receipt Barcode */}
                  <div className="flex flex-col items-center gap-1.5 pt-1">
                    <div
                      className="h-9 flex items-stretch justify-center gap-[1.5px] opacity-85"
                      aria-hidden="true"
                    >
                      {BARCODE_WEIGHTS.map((w, i) => (
                        <span
                          key={i}
                          style={{ width: `${w}px` }}
                          className={i % 2 === 0 ? 'bg-[#111827]' : 'bg-transparent'}
                        />
                      ))}
                    </div>
                    <span className="font-mono text-[10px] tracking-[0.26em] text-[#64748B]">
                      * {receiptNumber} · GDG BOGOR *
                    </span>
                  </div>

                  <div className="space-y-2 pt-1">
                    <a
                      href="https://ai.studio/build"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full min-h-[46px] px-5 py-2.5 rounded-xl bg-[#1A73E8] hover:bg-[#1557B0] text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors shadow-[0_8px_20px_rgba(26,115,232,0.24)]"
                    >
                      <span>Buka ai.studio/build</span>
                      <ExternalLink className="w-4 h-4" aria-hidden="true" />
                    </a>

                    <button
                      type="button"
                      onClick={handleReplayRoll}
                      className="w-full min-h-[40px] px-4 py-2 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#475569] hover:text-[#111827] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Putar Ulang Efek Kertas</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3D Curled Paper Roll Bottom Effect + Seamless Serrated Tail */}
              <motion.div
                style={{
                  scaleY: bottomCurlScaleY,
                  rotateX: bottomCurlRotateX,
                  transformOrigin: 'top center',
                }}
                aria-hidden="true"
              >
                <div className="relative h-7 bg-gradient-to-b from-[#FFFFFF] via-[#F8FAFC] to-[#E9EEF5] shadow-[inset_0_5px_10px_rgba(255,255,255,0.95),0_12px_22px_rgba(15,23,42,0.14)]">
                  <div className="absolute inset-x-0 bottom-0 h-2.5 bg-gradient-to-b from-transparent to-[#CBD5E1]/45" />
                </div>
                <div className="-mb-3 drop-shadow-[0_6px_8px_rgba(15,23,42,0.1)]">
                  <ReceiptZigZagEdge flip fill="#E9EEF5" />
                </div>
              </motion.div>
            </motion.article>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
