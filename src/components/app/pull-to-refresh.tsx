"use client";

import { useCallback, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Wrap a page's content to enable pull-to-refresh on mobile.
 * Calls `onRefresh` (should return a Promise) when user pulls down.
 */
export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const THRESHOLD = 80;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only activate if scrolled to top
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling || refreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0) {
        // Apply resistance — diminishing returns past threshold
        setPullDistance(Math.min(delta * 0.5, THRESHOLD * 1.5));
      }
    },
    [pulling, refreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return;
    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPulling(false);
    setPullDistance(0);
  }, [pulling, pullDistance, refreshing, onRefresh]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all"
        style={{ height: pullDistance > 10 ? pullDistance : 0 }}
      >
        <RefreshCw
          className={[
            "h-5 w-5 text-slate-400 transition-transform",
            refreshing ? "animate-spin" : "",
            pullDistance >= THRESHOLD ? "text-slate-700" : "",
          ].join(" ")}
          style={{
            transform: `rotate(${Math.min(pullDistance * 3, 360)}deg)`,
          }}
        />
      </div>
      {children}
    </div>
  );
}
