// components/recommendation/PhotoGallery.tsx
// Photo gallery with full-screen lightbox, swipe navigation, and pinch-to-zoom
// For use on the Recommendation Detail page
// Created: Feb 1, 2026

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';

// ─── Pinata IPFS gateway ───
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

/**
 * Convert a raw CID or full URL to a displayable image URL.
 * Handles: bare CID, ipfs:// protocol, or already-complete https URL.
 */
export function ipfsToUrl(cidOrUrl: string): string {
  if (!cidOrUrl) return '';
  // Already a full URL
  if (cidOrUrl.startsWith('http://') || cidOrUrl.startsWith('https://')) {
    return cidOrUrl;
  }
  // ipfs:// protocol
  if (cidOrUrl.startsWith('ipfs://')) {
    return `${PINATA_GATEWAY}${cidOrUrl.replace('ipfs://', '')}`;
  }
  // Bare CID (starts with Qm... or bafy...)
  return `${PINATA_GATEWAY}${cidOrUrl}`;
}

// ─── Types ───

interface PhotoGalleryProps {
  /** Array of IPFS CIDs or full URLs */
  photos: string[];
  /** Alt text prefix */
  altPrefix?: string;
}

// ─── Lightbox sub-component ───

interface LightboxProps {
  photos: string[];
  initialIndex: number;
  onClose: () => void;
}

function Lightbox({ photos, initialIndex, onClose }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isZoomed, setIsZoomed] = useState(false);

  // Touch tracking refs
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef<number>(0);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const photoUrl = ipfsToUrl(photos[currentIndex]);
  const hasMultiple = photos.length > 1;

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goTo(-1);
      if (e.key === 'ArrowRight') goTo(1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentIndex, photos.length]);

  const goTo = useCallback(
    (direction: -1 | 1) => {
      // Reset zoom when navigating
      setScale(1);
      setTranslate({ x: 0, y: 0 });
      setIsZoomed(false);

      setCurrentIndex((prev) => {
        const next = prev + direction;
        if (next < 0) return photos.length - 1;
        if (next >= photos.length) return 0;
        return next;
      });
    },
    [photos.length]
  );

  const resetZoom = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setIsZoomed(false);
  };

  const toggleZoom = (clientX?: number, clientY?: number) => {
    if (isZoomed) {
      resetZoom();
    } else {
      // Zoom into the tapped point
      const newScale = 2.5;
      let offsetX = 0;
      let offsetY = 0;

      if (clientX !== undefined && clientY !== undefined && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        // Offset so the tapped point stays roughly in place
        offsetX = (centerX - clientX + rect.left) * (newScale - 1) / newScale;
        offsetY = (centerY - clientY + rect.top) * (newScale - 1) / newScale;
      }

      setScale(newScale);
      setTranslate({ x: offsetX, y: offsetY });
      setIsZoomed(true);
    }
  };

  // ─── Touch handlers ───

  const getDistance = (t1: React.Touch, t2: React.Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      pinchStartDistRef.current = getDistance(e.touches[0], e.touches[1]);
      pinchStartScaleRef.current = scale;
    } else if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      // Pinch zoom
      const currentDist = getDistance(e.touches[0], e.touches[1]);
      const ratio = currentDist / pinchStartDistRef.current;
      const newScale = Math.min(Math.max(pinchStartScaleRef.current * ratio, 1), 5);
      setScale(newScale);
      setIsZoomed(newScale > 1.1);

      if (newScale <= 1.05) {
        setTranslate({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && isZoomed && touchStartRef.current) {
      // Pan while zoomed
      const dx = e.touches[0].clientX - touchStartRef.current.x;
      const dy = e.touches[0].clientY - touchStartRef.current.y;
      setTranslate((prev) => ({
        x: prev.x + dx * 0.5,
        y: prev.y + dy * 0.5,
      }));
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: touchStartRef.current.time,
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Reset pinch tracking
    if (e.touches.length < 2) {
      pinchStartDistRef.current = null;
    }

    // Snap back if scale is near 1
    if (scale <= 1.05) {
      resetZoom();
    }

    if (!touchStartRef.current || e.touches.length > 0) return;

    const dx = (e.changedTouches[0]?.clientX || 0) - touchStartRef.current.x;
    const dy = (e.changedTouches[0]?.clientY || 0) - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Double-tap to zoom
    const now = Date.now();
    if (now - lastTapRef.current < 300 && absDx < 20 && absDy < 20) {
      toggleZoom(e.changedTouches[0]?.clientX, e.changedTouches[0]?.clientY);
      lastTapRef.current = 0;
      touchStartRef.current = null;
      return;
    }
    lastTapRef.current = now;

    // Swipe detection (only if not zoomed)
    if (!isZoomed && dt < 400 && absDx > 60 && absDx > absDy * 1.5) {
      if (dx < 0 && hasMultiple) goTo(1);   // swipe left → next
      if (dx > 0 && hasMultiple) goTo(-1);   // swipe right → prev
    }

    // Swipe down to close (only if not zoomed)
    if (!isZoomed && dt < 400 && dy > 80 && absDy > absDx * 1.5) {
      onClose();
    }

    touchStartRef.current = null;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* ── Top bar ── */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
        <button
          onClick={onClose}
          className="p-3 text-white hover:text-white active:text-[#FF644A] transition-colors rounded-full bg-black/50 backdrop-blur-sm min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Close"
        >
          <X className="h-6 w-6" strokeWidth={2.5} />
        </button>

        {hasMultiple && (
          <span className="text-white/80 text-sm font-medium bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full">
            {currentIndex + 1} / {photos.length}
          </span>
        )}

        <button
          onClick={() => toggleZoom()}
          className={`p-2 rounded-full backdrop-blur-sm transition-colors ${
            isZoomed
              ? 'text-[#FF644A] bg-[#FF644A]/20'
              : 'text-white/80 hover:text-white bg-black/30'
          }`}
          aria-label={isZoomed ? 'Reset zoom' : 'Zoom in'}
        >
          <ZoomIn className="h-5 w-5" />
        </button>
      </div>

      {/* ── Image area ── */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'none' }}
      >
        <img
          src={photoUrl}
          alt={`Photo ${currentIndex + 1} of ${photos.length}`}
          className="max-w-full max-h-full object-contain select-none"
          style={{
            transform: `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`,
            transition: pinchStartDistRef.current !== null ? 'none' : 'transform 0.2s ease-out',
            willChange: 'transform',
          }}
          draggable={false}
          onDoubleClick={(e) => toggleZoom(e.clientX, e.clientY)}
        />
      </div>

      {/* ── Bottom nav arrows (desktop / larger screens) ── */}
      {hasMultiple && (
        <>
          <button
            onClick={() => goTo(-1)}
            className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-sm transition-colors"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={() => goTo(1)}
            className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-sm transition-colors"
            aria-label="Next photo"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* ── Bottom hint ── */}
      <div className="relative z-10 pb-6 pt-2 bg-gradient-to-t from-black/60 to-transparent">
        <p className="text-white/50 text-xs text-center">
          {isZoomed
            ? 'Double-tap or pinch to reset'
            : hasMultiple
              ? 'Swipe to navigate · Double-tap to zoom'
              : 'Double-tap or pinch to zoom'}
        </p>

        {/* Dot indicators */}
        {hasMultiple && (
          <div className="flex items-center justify-center gap-1.5 mt-2">
            {photos.map((_, idx) => (
              <div
                key={idx}
                className={`rounded-full transition-all duration-200 ${
                  idx === currentIndex
                    ? 'w-2 h-2 bg-white'
                    : 'w-1.5 h-1.5 bg-white/40'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main PhotoGallery component ───

export default function PhotoGallery({ photos, altPrefix = 'Photo' }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!photos || photos.length === 0) return null;

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  // ── Layout strategy ──
  // 1 photo  → full width, taller
  // 2 photos → side by side
  // 3 photos → 1 large + 2 small
  // 4+       → 2×2 grid, last cell shows "+N" overflow

  const maxVisible = 4;
  const visiblePhotos = photos.slice(0, maxVisible);
  const overflowCount = photos.length - maxVisible;

  return (
    <>
      <div className="space-y-1">
        {/* Single photo */}
        {photos.length === 1 && (
          <button
            onClick={() => openLightbox(0)}
            className="relative w-full group overflow-hidden rounded-xl"
          >
            <img
              src={ipfsToUrl(photos[0])}
              alt={`${altPrefix} 1`}
              className="w-full h-64 sm:h-72 object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            <div className="absolute bottom-2 right-2 p-1.5 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
              <ZoomIn className="h-4 w-4 text-white" />
            </div>
          </button>
        )}

        {/* Two photos */}
        {photos.length === 2 && (
          <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden">
            {photos.map((photo, idx) => (
              <button
                key={idx}
                onClick={() => openLightbox(idx)}
                className="relative group overflow-hidden"
              >
                <img
                  src={ipfsToUrl(photo)}
                  alt={`${altPrefix} ${idx + 1}`}
                  className="w-full h-52 object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </button>
            ))}
          </div>
        )}

        {/* Three photos: 1 large left + 2 stacked right */}
        {photos.length === 3 && (
          <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden">
            <button
              onClick={() => openLightbox(0)}
              className="relative group overflow-hidden row-span-2"
            >
              <img
                src={ipfsToUrl(photos[0])}
                alt={`${altPrefix} 1`}
                className="w-full h-full min-h-[220px] object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </button>
            {photos.slice(1).map((photo, idx) => (
              <button
                key={idx + 1}
                onClick={() => openLightbox(idx + 1)}
                className="relative group overflow-hidden"
              >
                <img
                  src={ipfsToUrl(photo)}
                  alt={`${altPrefix} ${idx + 2}`}
                  className="w-full h-[109px] object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </button>
            ))}
          </div>
        )}

        {/* Four or more: 2×2 grid with overflow indicator */}
        {photos.length >= 4 && (
          <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden">
            {visiblePhotos.map((photo, idx) => {
              const isLastCell = idx === maxVisible - 1 && overflowCount > 0;

              return (
                <button
                  key={idx}
                  onClick={() => openLightbox(idx)}
                  className="relative group overflow-hidden"
                >
                  <img
                    src={ipfsToUrl(photo)}
                    alt={`${altPrefix} ${idx + 1}`}
                    className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />

                  {/* "+N more" overlay on last cell */}
                  {isLastCell && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">
                        +{overflowCount}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={closeLightbox}
        />
      )}
    </>
  );
}