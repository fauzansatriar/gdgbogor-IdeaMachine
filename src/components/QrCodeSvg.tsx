import { useMemo } from 'react';
import { createQrMatrixPath } from '../utils/briefCodec';

interface QrCodeSvgProps {
  url: string;
  label: string;
  className?: string;
}

export function QrCodeSvg({ url, label, className = 'w-48 h-48' }: QrCodeSvgProps) {
  const matrix = useMemo(() => createQrMatrixPath(url), [url]);

  if (!matrix) {
    return (
      <div
        className={`${className} bg-[#F8F9FA] rounded-xl flex items-center justify-center text-xs text-[#5F6368]`}
      >
        Gagal membuat QR
      </div>
    );
  }

  const quietZone = 3;
  const totalSize = matrix.size + quietZone * 2;

  return (
    <svg
      viewBox={`0 0 ${totalSize} ${totalSize}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}
      className={`${className} block select-none`}
    >
      <rect x="0" y="0" width={totalSize} height={totalSize} fill="#FFFFFF" />
      <g transform={`translate(${quietZone}, ${quietZone})`}>
        <path d={matrix.pathData} fill="#000000" />
      </g>
    </svg>
  );
}
