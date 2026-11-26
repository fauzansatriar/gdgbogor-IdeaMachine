import { useEffect, useState } from 'react';

export interface ProjectorDisplayMetrics {
  isWideProjector: boolean;
  aspectRatio: number;
}

function measureDisplay(): ProjectorDisplayMetrics {
  if (typeof window === 'undefined') {
    return { isWideProjector: false, aspectRatio: 1.5 };
  }
  const width = window.innerWidth;
  const height = Math.max(1, window.innerHeight);
  const aspectRatio = width / height;
  // Detect wide projector aspect ratios (16:9, 16:10, 21:9) with sufficient viewport size
  const isWideProjector = aspectRatio >= 1.56 && width >= 1180 && height >= 640;
  return { isWideProjector, aspectRatio };
}

export function useProjectorDisplay(): ProjectorDisplayMetrics {
  const [metrics, setMetrics] = useState<ProjectorDisplayMetrics>(() => measureDisplay());

  useEffect(() => {
    setMetrics(measureDisplay());

    const handleResize = () => {
      setMetrics(measureDisplay());
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleResize);
    };
  }, []);

  return metrics;
}
