import React, { useState, useEffect } from 'react';
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
  Maximize2
} from 'lucide-react';
import { SavedPhotoItem, COLOR_PRESETS } from '../types';

interface ModalProps {
  photo: SavedPhotoItem | null;
  allPhotos: SavedPhotoItem[];
  onClose: () => void;
  onSelectPhoto: (photo: SavedPhotoItem) => void;
  onToggleLike: (id: string) => void;
  triggerImageDownload: (photo: SavedPhotoItem) => void;
}

export default function Modal({
  photo,
  allPhotos,
  onClose,
  onSelectPhoto,
  onToggleLike,
  triggerImageDownload
}: ModalProps) {
  if (!photo) return null;

  // Zoom feature state
  const [zoomScale, setZoomScale] = useState(1.0);

  // Find index for next/prev transitions
  const currentIndex = allPhotos.findIndex(p => p.id === photo.id);
  const activePreset = COLOR_PRESETS.find(p => p.id === photo.presetId);

  // Reset zoom on photo change
  useEffect(() => {
    setZoomScale(1.0);
  }, [photo.id]);

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
      onClick={onClose}
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

        {/* LEFT SIDE: Image Viewer with Next/Prev and Zoom (8 columns for big image focus) */}
        <div className="relative md:col-span-8 bg-slate-950 flex items-center justify-center min-h-[320px] md:min-h-[550px] overflow-hidden select-none group">
          
          {/* Zoomable Image Container */}
          <div className="w-full h-full flex items-center justify-center overflow-auto p-4 custom-scrollbar">
            <img
              src={photo.url}
              alt={photo.villageName}
              className="max-w-full max-h-[50vh] md:max-h-[80vh] object-contain select-none transition-transform duration-200 ease-out"
              style={{ 
                filter: activePreset?.cssFilter || 'none',
                transform: `scale(${zoomScale})`
              }}
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Floating Zoom Controls */}
          <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-900/85 backdrop-blur border border-white/10 text-white shadow-lg">
            <button
              onClick={handleZoomIn}
              className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer"
              title="ซูมเข้า"
            >
              <ZoomIn size={16} />
            </button>
            <span className="text-[11px] font-mono font-bold px-1 min-w-[36px] text-center text-slate-300">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              onClick={handleZoomOut}
              className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer"
              title="ซูมออก"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={handleZoomReset}
              className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer"
              title="ขนาดจริง"
            >
              <Maximize2 size={16} />
            </button>
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

          {/* Condensed Quick Overlay */}
          <div className="absolute top-4 left-4 p-2.5 rounded-xl bg-slate-900/75 backdrop-blur-md border border-white/10 text-white max-sm:hidden">
            <h4 className="text-xs font-bold leading-none">{photo.villageName}</h4>
          </div>
        </div>

        {/* RIGHT SIDE: Compact, high-contrast details panel (4 columns) */}
        <div className="md:col-span-4 p-5 sm:p-6 overflow-y-auto max-h-[45vh] md:max-h-[95vh] flex flex-col justify-between bg-slate-50 border-t md:border-t-0 md:border-l border-slate-200">
          <div className="space-y-4">
            
            {/* Title & Info */}
            <div className="pb-3 border-b border-slate-200">
              <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-widest block mb-1">
                PASAYA INSTALLATION PORTFOLIO
              </span>
              <h2 className="text-lg font-black text-slate-950 leading-tight">
                {photo.villageName}
              </h2>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-bold mt-2">
                <Calendar size={12} className="text-indigo-600" />
                <span>ติดตั้งเมื่อ: {new Date(photo.uploadedAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              </div>
            </div>

            {/* Specifications Fields - Tight & High Contrast */}
            <div className="grid grid-cols-1 gap-2.5 py-1">
              
              {/* Developer */}
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/60 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-700 flex-shrink-0 font-bold">
                  <User size={14} />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block leading-none mb-0.5">ผู้พัฒนา / Developer</span>
                  <p className="text-xs font-extrabold text-slate-900 truncate">{photo.developer}</p>
                </div>
              </div>

              {/* House Type */}
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/60 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700 flex-shrink-0">
                  <Home size={14} />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block leading-none mb-0.5">ประเภทอสังหาฯ</span>
                  <p className="text-xs font-extrabold text-slate-900 truncate">{photo.houseType}</p>
                </div>
              </div>

              {/* Curtain Style */}
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/60 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700 flex-shrink-0">
                  <Compass size={14} />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block leading-none mb-0.5">รูปแบบทรงผ้าม่าน</span>
                  <p className="text-xs font-extrabold text-slate-900 truncate">{photo.curtainStyle}</p>
                </div>
              </div>

              {/* Fabric Type */}
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/60 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 flex-shrink-0">
                  <Layers size={14} />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block leading-none mb-0.5">ประเภทผ้าที่เลือก</span>
                  <p className="text-xs font-extrabold text-slate-900 truncate">{photo.curtainTypes.join(' & ')}</p>
                </div>
              </div>

            </div>

            {/* Fabric Shades - High Contrast */}
            <div className="space-y-1.5">
              <h3 className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider">ดีไซน์ผ้าและสี</h3>
              <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm space-y-2">
                {photo.fabricDetails.map((f, i) => (
                  <div key={f.id || i} className="flex items-center gap-1.5 text-xs pb-1.5 border-b border-slate-100 last:border-b-0 last:pb-0 font-extrabold text-slate-950">
                    <div className="w-2 h-2 rounded-full bg-indigo-600 flex-shrink-0" />
                    <span>{f.name} / {f.color}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Filter */}
            {activePreset && activePreset.id !== 'original' && (
              <div className="flex items-center gap-2.5 p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl">
                <Sparkles size={14} className="text-amber-600 animate-pulse flex-shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-[11px] font-extrabold text-indigo-950">โทนสีภาพ: {activePreset.name}</h4>
                  <p className="text-[9px] text-indigo-800 font-semibold truncate">{activePreset.description}</p>
                </div>
              </div>
            )}

            {/* Tags */}
            {photo.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {photo.hashtags.map((tag) => (
                  <span 
                    key={tag} 
                    className="px-2 py-0.5 rounded-md bg-slate-800 text-white text-[9px] font-black uppercase tracking-wider"
                  >
                    #{tag.split(' ')[0]}
                  </span>
                ))}
              </div>
            )}

            {/* Employee responsible log log status */}
            <div className="text-[10px] text-slate-600 font-bold bg-indigo-50/40 p-2 rounded-lg border border-indigo-100/50">
              ผู้ส่งงาน: <span className="text-slate-900 font-black">{photo.employee || 'ไม่ระบุ'}</span>
            </div>

          </div>

          {/* Action Footer Buttons */}
          <div className="flex gap-2 pt-4 mt-4 border-t border-slate-200">
            <button
              onClick={() => triggerImageDownload(photo)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-100 transition-all cursor-pointer"
              style={{ minHeight: '40px' }}
            >
              <Download size={13} />
              ดาวน์โหลดรูป
            </button>

            <button
              onClick={() => onToggleLike(photo.id)}
              className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-1 text-xs font-black transition-all cursor-pointer
                ${photo.isLiked
                  ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }
              `}
              style={{ minHeight: '40px' }}
              title="ถูกใจ"
            >
              <Heart size={14} className={photo.isLiked ? 'fill-rose-600 text-rose-600' : 'text-slate-600'} />
              <span>{photo.isLiked ? 'ถูกใจแล้ว' : 'ถูกใจ'}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
