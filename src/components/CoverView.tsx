import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { GdgBogorLogo } from './BrandMark';

interface CoverViewProps {
  onStartMachine: () => void;
  isWideProjector?: boolean;
}

const PILLARS = [
  {
    step: '01',
    title: 'Masalah Nyata',
    detail: 'Kesulitan sehari-hari di sekitar kita',
    color: '#4285F4',
  },
  {
    step: '02',
    title: 'Siapa Penggunanya',
    detail: 'Orang yang langsung terbantu',
    color: '#EA4335',
  },
  {
    step: '03',
    title: 'Ide Aplikasinya',
    detail: 'Aplikasi AI apa yang mau dibuat',
    color: '#34A853',
  },
  {
    step: '04',
    title: 'Dipakai di Mana',
    detail: 'Tampilan HP, Laptop, atau Tablet',
    color: '#FBBC04',
  },
];

export function CoverView({ onStartMachine, isWideProjector = false }: CoverViewProps) {
  return (
    <div className="flex-1 min-h-0 flex items-center justify-center px-4 sm:px-8 py-6 bg-white">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className={`w-full flex flex-col items-center text-center ${
          isWideProjector ? 'max-w-5xl' : 'max-w-4xl'
        }`}
      >
        {/* Prominent Brand Mark */}
        <div className={isWideProjector ? 'mb-7' : 'mb-6'}>
          <GdgBogorLogo
            className={`${isWideProjector ? 'h-12 sm:h-14' : 'h-10 sm:h-12'} w-auto mx-auto`}
          />
        </div>

        {/* Display Headline */}
        <h1
          className={`font-bold tracking-tight text-[#111827] leading-[1.06] text-balance ${
            isWideProjector
              ? 'text-[clamp(3.25rem,6.5vw,5.25rem)]'
              : 'text-[clamp(2.75rem,6vw,4.5rem)]'
          }`}
        >
          Idea Machine
        </h1>

        {/* Concise Single-Line Description */}
        <p
          className={`mt-4 text-[#4B5563] leading-relaxed md:whitespace-nowrap ${
            isWideProjector ? 'text-lg sm:text-xl' : 'text-base sm:text-lg'
          }`}
        >
          Putar mesin untuk dapat ide aplikasi dan buat bareng AI tanpa perlu coding.
        </p>

        {/* 4-Step Flow Strip */}
        <div
          className={`w-full grid grid-cols-2 lg:grid-cols-4 text-left ${
            isWideProjector ? 'mt-9 gap-4' : 'mt-8 gap-3'
          }`}
        >
          {PILLARS.map((item) => (
            <div
              key={item.step}
              className={`rounded-2xl bg-[#F8FAFC] shadow-[0_4px_16px_rgba(15,23,42,0.04)] flex flex-col gap-1 ${
                isWideProjector ? 'p-5' : 'p-4'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`${isWideProjector ? 'text-sm' : 'text-xs'} font-bold tabular-nums`}
                  style={{ color: item.color === '#FBBC04' ? '#B45309' : item.color }}
                >
                  {item.step}
                </span>
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                  aria-hidden="true"
                />
              </div>
              <div
                className={`font-bold text-[#111827] mt-1 ${
                  isWideProjector ? 'text-base' : 'text-sm'
                }`}
              >
                {item.title}
              </div>
              <div
                className={`text-[#4B5563] leading-snug ${
                  isWideProjector ? 'text-sm' : 'text-xs'
                }`}
              >
                {item.detail}
              </div>
            </div>
          ))}
        </div>

        {/* Single Primary Entry Action */}
        <div className="mt-8 flex items-center justify-center">
          <button
            type="button"
            onClick={onStartMachine}
            className={`rounded-2xl bg-[#1A73E8] hover:bg-[#1557B0] text-white font-bold inline-flex items-center gap-2.5 transition-colors whitespace-nowrap cursor-pointer shadow-[0_6px_20px_rgba(26,115,232,0.22)] ${
              isWideProjector
                ? 'min-h-[58px] px-10 py-4 text-lg'
                : 'min-h-[52px] px-9 py-3.5 text-base'
            }`}
          >
            <span>Mulai Idea Machine</span>
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
