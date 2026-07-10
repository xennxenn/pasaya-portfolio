import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Download, 
  Heart, 
  Calendar, 
  Home, 
  User, 
  Compass, 
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Share2
} from 'lucide-react';
import { SavedPhotoItem, COLOR_PRESETS } from '../types';

interface ModalProps {
  photo: SavedPhotoItem | null;
  allPhotos: SavedPhotoItem[];
  onClose: () => void;
  onSelectPhoto: (photo: SavedPhotoItem) => void;
  onToggleLike: (id: string) => void;
  triggerImageDownload: (photo: SavedPhotoItem) => void;
  triggerImageShare: (photo: SavedPhotoItem) => void;
}

export default function Modal({
  photo,
  allPhotos,
  onClose,
  onSelectPhoto,
  onToggleLike,
  triggerImageDownload,
  triggerImageShare
}: ModalProps) {
  if (!photo) return null;

  // Zoom feature state
  const [zoomScale, setZoomScale] = useState(1.0);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Swipe gesture detection state using refs for synchronous checks and click prevention
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const hasSwiped = useRef<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = e.targetTouches[0].clientX;
    hasSwiped.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
    if (touchStartX.current !== null) {
      const diffX = Math.abs(touchStartX.current - e.targetTouches[0].clientX);
      if (diffX > 15) {
        hasSwiped.current = true;
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diffX = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 40; // Reduced threshold for standard iPhone swipe responsiveness

    if (diffX > minSwipeDistance) {
      // Swiped Left -> Go Next (right to left movement)
      if (currentIndex < allPhotos.length - 1) {
        onSelectPhoto(allPhotos[currentIndex + 1]);
      }
    } else if (diffX < -minSwipeDistance) {
      // Swiped Right -> Go Prev (left to right movement)
      if (currentIndex > 0) {
        onSelectPhoto(allPhotos[currentIndex - 1]);
      }
    }
    
    // Clear start/end references
    touchStartX.current = null;
    touchEndX.current = null;
    
    // Reset hasSwiped shortly after touchend so standard click events don't get blocked indefinitely
    setTimeout(() => {
      hasSwiped.current = false;
    }, 100);
  };

  // Find index for next/prev transitions
  const currentIndex = allPhotos.findIndex(p => p.id === photo.id);
  const activePreset = COLOR_PRESETS.find(p => p.id === photo.presetId);

  // Reset zoom on photo change or fullscreen mode change
  useEffect(() => {
    setZoomScale(1.0);
  }, [photo.id, isFullScreen]);

  // Handle arrow key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onSelectPhoto(allPhotos[currentIndex - 1]);
      } else if (e.key === 'ArrowRight' && currentIndex < allPhotos.length - 1) {
        onSelectPhoto(allPhotos[currentIndex + 1]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, allPhotos, onSelectPhoto, onClose]);

  const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.25, 3.0));
  const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 0.25, 0.75));
  const handleZoomReset = () => setZoomScale(1.0);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      onSelectPhoto(allPhotos[currentIndex - 1]);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < allPhotos.length - 1) {
      onSelectPhoto(allPhotos[currentIndex + 1]);
    }
  };

  return (
    <div 
      id="lightbox-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-xl animate-fadeIn"
      onClick={() => {
        if (hasSwiped.current) return;
        onClose();
      }}
    >
      <div 
        id="lightbox-modal-content"
        className="relative w-full max-w-6xl max-h-[95vh] bg-white rounded-[24px] sm:rounded-[32px] shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 animate-scaleIn border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-40 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-white/20 shadow-lg cursor-pointer transition-colors"
          title="ปิดหน้าต่าง"
          style={{ minWidth: '40px', minHeight: '40px' }}
        >
          <X size={18} />
        </button>

        {/* LEFT SIDE: Image Viewer with Next/Prev and Zoom (9 columns of 12 for 75% big image focus) */}
        <div 
          className="relative md:col-span-9 bg-slate-950 flex items-center justify-center min-h-[320px] md:min-h-[550px] overflow-hidden select-none group touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          
          {/* Zoomable Image Container */}
          <div className="w-full h-full flex items-center justify-center overflow-auto p-4 custom-scrollbar">
            <img
              src={photo.url}
              alt={photo.villageName}
              className="max-w-full max-h-[50vh] md:max-h-[80vh] object-contain select-none"
              style={{ 
                filter: activePreset?.cssFilter || 'none'
              }}
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Navigation Arrows */}
          {currentIndex > 0 && (
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-slate-900/75 hover:bg-slate-900 text-white border border-white/10 shadow-xl cursor-pointer transition-all hover:scale-105"
              title="ภาพก่อนหน้า"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <ChevronLeft size={20} />
            </button>
          )}

          {currentIndex < allPhotos.length - 1 && (
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-slate-900/75 hover:bg-slate-900 text-white border border-white/10 shadow-xl cursor-pointer transition-all hover:scale-105"
              title="ภาพถัดไป"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <ChevronRight size={20} />
            </button>
          )}

          {/* Interactive Full Screen Toggle Button with Title Badge */}
          <button
            type="button"
            onClick={() => setIsFullScreen(true)}
            className="absolute top-4 left-4 z-40 px-3 py-2 rounded-full bg-slate-900/85 hover:bg-slate-900 text-white border border-white/20 shadow-xl cursor-pointer transition-all flex items-center gap-1.5 active:scale-95 font-bold text-[11px]"
            title="กดดูเต็มจอ (หรือปัดเลื่อนซ้ายขวาด้วยนิ้ว)"
            style={{ minHeight: '36px' }}
          >
            <Maximize2 size={12} className="text-indigo-400" />
            <span>{photo.villageName} (ดูเต็มจอ)</span>
          </button>
        </div>

        {/* RIGHT SIDE: Compact, high-contrast details panel (3 columns of 12 for 25% width) */}
        <div className="md:col-span-3 p-4 sm:p-5 overflow-y-auto max-h-[45vh] md:max-h-[95vh] flex flex-col justify-between bg-slate-50 border-t md:border-t-0 md:border-l border-slate-200">
          <div className="space-y-3.5">
            
            {/* Title & Info */}
            <div className="pb-2.5 border-b border-slate-200">
              <span className="text-[9px] font-extrabold text-indigo-700 uppercase tracking-widest block mb-0.5">
                PASAYA INSTALLATION PORTFOLIO
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-950 leading-tight">
                {photo.villageName}
              </h2>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold mt-1.5">
                <Calendar size={11} className="text-indigo-600 flex-shrink-0" />
                <span>ติดตั้งเมื่อ: {new Date(photo.uploadedAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              </div>
            </div>

            {/* Specifications Fields - Tight & High Contrast */}
            <div className="grid grid-cols-1 gap-2 py-1">
              
              {/* Developer */}
              <div className="flex items-center gap-2 p-1.5 sm:p-2 rounded-xl bg-white border border-slate-200/60 shadow-sm">
                <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center text-sky-700 flex-shrink-0 font-bold">
                  <User size={13} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[8px] font-bold text-slate-400 uppercase block leading-none mb-0.5">ผู้พัฒนา / Developer</span>
                  <p className="text-[11px] font-extrabold text-slate-900 truncate leading-tight">{photo.developer}</p>
                </div>
              </div>

              {/* House Type */}
              <div className="flex items-center gap-2 p-1.5 sm:p-2 rounded-xl bg-white border border-slate-200/60 shadow-sm">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700 flex-shrink-0">
                  <Home size={13} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[8px] font-bold text-slate-400 uppercase block leading-none mb-0.5">ประเภทอสังหาฯ</span>
                  <p className="text-[11px] font-extrabold text-slate-900 truncate leading-tight">{photo.houseType}</p>
                </div>
              </div>

              {/* Curtain Style */}
              <div className="flex items-center gap-2 p-1.5 sm:p-2 rounded-xl bg-white border border-slate-200/60 shadow-sm">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700 flex-shrink-0">
                  <Compass size={13} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[8px] font-bold text-slate-400 uppercase block leading-none mb-0.5">รูปแบบทรงผ้าม่าน</span>
                  <p className="text-[11px] font-extrabold text-slate-900 truncate leading-tight">{photo.curtainStyle}</p>
                </div>
              </div>

              {/* Fabric Type */}
              <div className="flex items-center gap-2 p-1.5 sm:p-2 rounded-xl bg-white border border-slate-200/60 shadow-sm">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 flex-shrink-0">
                  <Layers size={13} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[8px] font-bold text-slate-400 uppercase block leading-none mb-0.5">ประเภทผ้าที่เลือก</span>
                  <p className="text-[11px] font-extrabold text-slate-900 truncate leading-tight">{photo.curtainTypes.join(' & ')}</p>
                </div>
              </div>

            </div>

            {/* Fabric Shades - High Contrast */}
            <div className="space-y-1">
              <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-wider">ดีไซน์ผ้าและสี</h3>
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-1.5">
                {photo.fabricDetails.map((f, i) => (
                  <div key={f.id || i} className="flex items-center gap-1.5 text-[11px] pb-1.5 border-b border-slate-100 last:border-b-0 last:pb-0 font-extrabold text-slate-900">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 flex-shrink-0" />
                    <span className="truncate leading-tight">{f.name} / {f.color}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Filter */}
            {activePreset && activePreset.id !== 'original' && (
              <div className="flex items-center gap-2 p-2 bg-indigo-50 border border-indigo-200/60 rounded-xl">
                <Sparkles size={12} className="text-amber-600 animate-pulse flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h4 className="text-[10px] font-extrabold text-indigo-950 leading-tight">โทนสีภาพ: {activePreset.name}</h4>
                  <p className="text-[8px] text-indigo-800 font-semibold truncate leading-tight">{activePreset.description}</p>
                </div>
              </div>
            )}

            {/* Tags */}
            {photo.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {photo.hashtags.map((tag) => (
                  <span 
                    key={tag} 
                    className="px-1.5 py-0.5 rounded-md bg-slate-800 text-white text-[8px] font-black uppercase tracking-wider"
                  >
                    #{tag.split(' ')[0]}
                  </span>
                ))}
              </div>
            )}

            {/* Employee responsible log log status */}
            <div className="text-[9px] text-slate-500 font-bold bg-indigo-50/40 p-1.5 rounded-lg border border-indigo-100/50">
              ผู้ส่งงาน: <span className="text-slate-800 font-black">{photo.employee || 'ไม่ระบุ'}</span>
            </div>

          </div>

          {/* Action Footer Buttons */}
          <div className="flex gap-1.5 pt-3 mt-3 border-t border-slate-200">
            <button
              onClick={() => triggerImageDownload(photo)}
              className="flex-1 py-2 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] flex items-center justify-center gap-1 shadow-sm shadow-indigo-100 transition-all cursor-pointer"
              style={{ minHeight: '36px' }}
            >
              <Download size={12} />
              <span>ดาวน์โหลดรูป</span>
            </button>

            <button
              onClick={() => triggerImageShare(photo)}
              className="flex-1 py-2 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] flex items-center justify-center gap-1 shadow-sm shadow-indigo-100 transition-all cursor-pointer active:scale-95"
              style={{ minHeight: '36px' }}
              title="แชร์รูปภาพไปยังแอปอื่น"
            >
              <Share2 size={12} />
              <span>แชร์รูปภาพ</span>
            </button>

            <button
              onClick={() => onToggleLike(photo.id)}
              className={`py-2 px-2 rounded-xl border flex items-center justify-center gap-1 text-[10px] font-black transition-all cursor-pointer
                ${photo.isLiked
                  ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }
              `}
              style={{ minHeight: '36px', minWidth: '70px' }}
              title="ถูกใจ"
            >
              <Heart size={12} className={photo.isLiked ? 'fill-rose-600 text-rose-600' : 'text-slate-600'} />
              <span>{photo.isLiked ? 'ถูกใจแล้ว' : 'ถูกใจ'}</span>
            </button>
          </div>

        </div>

      </div>

      {/* IMMERSIVE FULL SCREEN LIGHTBOX MODE OVERLAY */}
      {isFullScreen && (
        <div 
          id="fullscreen-lightbox"
          className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center select-none animate-fadeIn"
          onClick={() => {
            if (hasSwiped.current) return;
            setIsFullScreen(false);
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Full Screen Top Control Bar */}
          <div 
            className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/95 to-transparent p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-50 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <span className="text-[9px] font-extrabold text-indigo-400 uppercase tracking-widest block mb-0.5">PASAYA FULLSCREEN INSTALLATION</span>
              <h3 className="text-sm sm:text-base font-black tracking-wide text-white leading-tight">{photo.villageName}</h3>
              <p className="text-[10px] text-slate-300 font-bold mt-1">
                {photo.fabricDetails.map(f => `${f.name} / ${f.color}`).join(' | ')}
              </p>
            </div>
            
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {/* Toggle Like */}
              <button
                onClick={() => onToggleLike(photo.id)}
                className={`p-2.5 rounded-full border flex items-center justify-center transition-all cursor-pointer text-xs font-bold active:scale-95
                  ${photo.isLiked 
                    ? 'bg-rose-600 border-rose-600 text-white shadow-md' 
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                  }
                `}
                style={{ minWidth: '40px', minHeight: '40px' }}
                title="ถูกใจ"
              >
                <Heart size={16} className={photo.isLiked ? 'fill-white' : ''} />
              </button>

              {/* Download */}
              <button
                onClick={() => triggerImageDownload(photo)}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all cursor-pointer flex items-center justify-center active:scale-95"
                style={{ minWidth: '40px', minHeight: '40px' }}
                title="ดาวน์โหลดรูป"
              >
                <Download size={16} />
              </button>

              {/* Share Image */}
              <button
                onClick={() => triggerImageShare(photo)}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all cursor-pointer flex items-center justify-center active:scale-95"
                style={{ minWidth: '40px', minHeight: '40px' }}
                title="แชร์รูปภาพไปยังแอปอื่น"
              >
                <Share2 size={16} />
              </button>

              {/* Exit Full Screen */}
              <button
                onClick={() => setIsFullScreen(false)}
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all cursor-pointer flex items-center justify-center font-black text-xs gap-1.5 px-4 active:scale-95"
                style={{ minHeight: '40px' }}
              >
                <X size={15} />
                <span>ปิดเต็มจอ</span>
              </button>
            </div>
          </div>

          {/* Big Centered Image */}
          <div 
            className="w-full h-full flex items-center justify-center p-4 overflow-auto custom-scrollbar"
            onClick={(e) => {
              e.stopPropagation();
              if (hasSwiped.current) return;
              if (e.target === e.currentTarget) {
                setIsFullScreen(false);
              }
            }}
          >
            <img
              src={photo.url}
              alt={photo.villageName}
              className="max-w-[95vw] max-h-[80vh] md:max-h-[85vh] object-contain select-none transition-transform duration-200 ease-out"
              style={{ 
                filter: activePreset?.cssFilter || 'none',
                transform: `scale(${zoomScale})`
              }}
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Floating Zoom Controls for Fullscreen */}
          <div 
            className="absolute bottom-6 left-6 z-50 flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-white/10 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleZoomIn}
              className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer flex items-center justify-center"
              title="ซูมเข้า"
              style={{ minWidth: '36px', minHeight: '36px' }}
            >
              <ZoomIn size={16} />
            </button>
            <span className="text-[11px] font-mono font-bold px-1.5 min-w-[36px] text-center text-slate-300">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              onClick={handleZoomOut}
              className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer flex items-center justify-center"
              title="ซูมออก"
              style={{ minWidth: '36px', minHeight: '36px' }}
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={handleZoomReset}
              className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer flex items-center justify-center"
              title="ขนาดจริง / แสดงภาพพอดีหน้า"
              style={{ minWidth: '36px', minHeight: '36px' }}
            >
              <Maximize2 size={16} className="text-indigo-400" />
            </button>
          </div>



          {/* Large Nav Arrows (For desktop) */}
          {currentIndex > 0 && (
            <button
              onClick={handlePrev}
              className="absolute left-6 top-1/2 -translate-y-1/2 z-50 p-4 rounded-full bg-slate-900/80 hover:bg-indigo-600 border border-white/10 text-white shadow-2xl transition-all cursor-pointer active:scale-95 hidden md:block"
              title="ภาพก่อนหน้า"
            >
              <ChevronLeft size={28} />
            </button>
          )}

          {currentIndex < allPhotos.length - 1 && (
            <button
              onClick={handleNext}
              className="absolute right-6 top-1/2 -translate-y-1/2 z-50 p-4 rounded-full bg-slate-900/80 hover:bg-indigo-600 border border-white/10 text-white shadow-2xl transition-all cursor-pointer active:scale-95 hidden md:block"
              title="ภาพถัดไป"
            >
              <ChevronRight size={28} />
            </button>
          )}
        </div>
      )}

    </div>
  );
}
