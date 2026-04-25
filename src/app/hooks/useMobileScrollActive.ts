import { useEffect, useRef, useState } from 'react';

const MOBILE_COARSE_QUERY = '(hover: none) and (pointer: coarse)';

export function useMobileScrollActive(itemIds: string[]) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(itemIds[0] ?? null);

  useEffect(() => {
    if (itemIds.length === 0) {
      setActiveId(null);
      return;
    }

    setActiveId((prev) => (prev && itemIds.includes(prev) ? prev : itemIds[0]));
  }, [itemIds]);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_COARSE_QUERY);
    if (!media.matches) return;

    const updateActive = () => {
      const container = containerRef.current;
      if (!container) return;

      const nodes = Array.from(
        container.querySelectorAll<HTMLElement>('[data-mobile-card-id]')
      );
      if (!nodes.length) return;

      const viewportCenter = window.innerHeight / 2;
      let closest: HTMLElement | null = null;
      let minDistance = Number.POSITIVE_INFINITY;

      for (const node of nodes) {
        const rect = node.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const distance = Math.abs(center - viewportCenter);
        if (distance < minDistance) {
          minDistance = distance;
          closest = node;
        }
      }

      const nextId = closest?.dataset.mobileCardId || null;
      if (nextId) setActiveId(nextId);
    };

    let raf = 0;
    const scheduleUpdate = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateActive);
    };

    scheduleUpdate();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [itemIds]);

  return { containerRef, activeId };
}
