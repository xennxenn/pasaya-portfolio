import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Grid3X3, 
  Grid2X2, 
  Grid, 
  Folder, 
  Download, 
  Heart, 
  Eye, 
  Trash2,
  SlidersHorizontal,
  ChevronRight,
  ArrowLeft,
  Calendar,
  Layers,
  Sparkles,
  ChevronDown,
  Image as ImageIcon,
  Pencil,
  Share2
} from 'lucide-react';
import { SavedPhotoItem, COLOR_PRESETS, CURTAIN_STYLES, HASHTAG_PRESETS, HOUSE_TYPES, EmployeeUser, MasterDataConfigs } from '../types';

interface PortfolioPageProps {
  photos: SavedPhotoItem[];
  configs?: MasterDataConfigs | null;
  onToggleLike: (id: string) => void;
  onDeletePhoto: (id: string) => void;
  onOpenLightbox: (photo: SavedPhotoItem) => void;
  title?: string;
  isFavoriteOnly?: boolean;
  activeUser?: EmployeeUser;
  onEditPhoto?: (photo: SavedPhotoItem) => void;
  onSharePhoto?: (photo: SavedPhotoItem) => void;
}

export default function PortfolioPage({
  photos,
  configs,
  onToggleLike,
  onDeletePhoto,
  onOpenLightbox,
  title = 'ผลงานติดตั้งผ้าม่านทั้งหมด',
  isFavoriteOnly = false,
  activeUser,
  onEditPhoto,
  onSharePhoto
}: PortfolioPageProps) {
  // Navigation & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Debounce search query update to eliminate typing lag
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [searchInput]);
  const [selectedHouseType, setSelectedHouseType] = useState<string>('all');
  const [selectedStyle, setSelectedStyle] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedHashtag, setSelectedHashtag] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date-desc');
  const [showFilters, setShowFilters] = useState(false);

  // View settings
  const [viewMode, setViewMode] = useState<'grid' | 'folder'>('grid'); // 'grid' (all) or 'folder' (grouped by fabric name+color)
  const [gridSize, setGridSize] = useState<'S' | 'M' | 'L'>('M'); // Small, Medium, Large
  const [openFolderKey, setOpenFolderKey] = useState<string | null>(null); // Id of the active opened folder

  // Derive unique employees lists dynamically from photos
  const employees = useMemo(() => {
    const list = photos.map(p => p.employee || '').filter(Boolean);
    return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b, 'th'));
  }, [photos]);

  // Filter items based on active states
  const filteredPhotos = useMemo(() => {
    let result = photos;

    // Filter by favorites if on Favorites view
    if (isFavoriteOnly) {
      result = result.filter(p => p.isLiked);
    }

    // Filter by house type category
    if (selectedHouseType !== 'all') {
      result = result.filter(p => p.houseType === selectedHouseType);
    }

    // Filter by curtain style
    if (selectedStyle !== 'all') {
      result = result.filter(p => p.curtainStyle === selectedStyle);
    }

    // Filter by curtain type (Block-out vs Sheer)
    if (selectedType !== 'all') {
      result = result.filter(p => p.curtainTypes.includes(selectedType));
    }

    // Filter by hashtags
    if (selectedHashtag !== 'all') {
      result = result.filter(p => p.hashtags.includes(selectedHashtag));
    }

    // Filter by employee
    if (selectedEmployee !== 'all') {
      result = result.filter(p => p.employee === selectedEmployee);
    }

    // Filter by global search query (village, fabric name, color, style, tags)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => {
        const villageMatch = p.villageName.toLowerCase().includes(q);
        const devMatch = p.developer.toLowerCase().includes(q);
        const styleMatch = p.curtainStyle.toLowerCase().includes(q);
        const typeMatch = p.curtainTypes.some(t => t.toLowerCase().includes(q));
        const tagsMatch = p.hashtags.some(t => t.toLowerCase().includes(q));
        const fabricMatch = p.fabricDetails.some(f => {
          const nameLower = f.name.toLowerCase();
          const colorLower = f.color.toLowerCase();
          const combined = `${nameLower}/${colorLower}`;
          const combinedNoSpaces = combined.replace(/\s+/g, '');
          const qNoSpaces = q.replace(/\s+/g, '');
          return nameLower.includes(q) || colorLower.includes(q) || combined.includes(q) || combinedNoSpaces.includes(qNoSpaces);
        });
        return villageMatch || devMatch || styleMatch || typeMatch || tagsMatch || fabricMatch;
      });
    }

    return result;
  }, [photos, isFavoriteOnly, searchQuery, selectedHouseType, selectedStyle, selectedType, selectedHashtag, selectedEmployee]);

  // Sort items based on selected sort options
  const sortedPhotos = useMemo(() => {
    const result = [...filteredPhotos];
    if (sortBy === 'date-desc') {
      result.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    } else if (sortBy === 'date-asc') {
      result.sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());
    } else if (sortBy === 'employee') {
      result.sort((a, b) => (a.employee || '').localeCompare(b.employee || '', 'th'));
    } else if (sortBy === 'curtain-type') {
      result.sort((a, b) => (a.curtainTypes[0] || '').localeCompare(b.curtainTypes[0] || '', 'th'));
    } else if (sortBy === 'fabric-name') {
      result.sort((a, b) => (a.fabricDetails[0]?.name || '').localeCompare(b.fabricDetails[0]?.name || '', 'en'));
    }
    return result;
  }, [filteredPhotos, sortBy]);

  // Persistent state for custom folder covers (Requirement 3: "เลือกรูปมาแสดงหน้าปกโฟลเดอร์ด้วย (กำหนดเองได้)")
  const [folderCovers, setFolderCovers] = useState<{ [village: string]: string }>(() => {
    try {
      const saved = localStorage.getItem('village_folder_covers');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleSetFolderCover = (village: string, photoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = { ...folderCovers, [village]: photoId };
    setFolderCovers(updated);
    try {
      localStorage.setItem('village_folder_covers', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  // Group photos into folders (Requirement 3: "โครงการหมู่บ้านให้ไปแสดงที่จัดโฟลเดอร์ผ้าแทน")
  const folders = useMemo(() => {
    const grouped: { [key: string]: { key: string; name: string; items: SavedPhotoItem[] } } = {};

    sortedPhotos.forEach(p => {
      const key = p.villageName?.trim() || 'โครงการไม่ระบุชื่อ';

      if (!grouped[key]) {
        grouped[key] = {
          key,
          name: key,
          items: []
        };
      }
      grouped[key].items.push(p);
    });

    return Object.values(grouped);
  }, [sortedPhotos]);

  // Export Canvas Image with color filter baked-in!
  const triggerImageDownload = async (photo: SavedPhotoItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    try {
      const preset = COLOR_PRESETS.find(p => p.id === photo.presetId);
      
      // If it's original (no filter) or not loaded from browser, we can try to save directly
      // Create an image element to load and draw on canvas
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Enable CORS download
      img.src = photo.url;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        // Apply filters to canvas context
        if (preset && preset.id !== 'original') {
          // Approximate CSS filters on 2D canvas context!
          if (preset.id === 'warm-sunset') {
            ctx.filter = 'sepia(0.25) saturate(1.25) hue-rotate(-8deg) brightness(1.03)';
          } else if (preset.id === 'nordic-cool') {
            ctx.filter = 'saturate(0.8) contrast(1.05) brightness(1.02) hue-rotate(5deg)';
          } else if (preset.id === 'cinematic') {
            ctx.filter = 'contrast(1.15) saturate(0.9) brightness(0.95) sepia(0.08)';
          } else if (preset.id === 'creamy-dream') {
            ctx.filter = 'sepia(0.12) contrast(0.92) brightness(1.08) saturate(1.1)';
          } else if (preset.id === 'vibrant-luxury') {
            ctx.filter = 'saturate(1.35) contrast(1.1) brightness(1.04)';
          } else if (preset.id === 'vintage-soft') {
            ctx.filter = 'sepia(0.35) contrast(0.88) brightness(1.04) saturate(0.85)';
          } else if (preset.id === 'modern-slate') {
            ctx.filter = 'contrast(1.25) saturate(0.75) brightness(0.94)';
          } else if (preset.id === 'bright-minimal') {
            ctx.filter = 'brightness(1.12) contrast(0.95) saturate(0.92)';
          }
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Download via browser trigger
        const link = document.createElement('a');
        link.download = `curtain_${photo.villageName.replace(/\s+/g, '_')}_${photo.id}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        link.click();
      };

      img.onerror = () => {
        // Fallback: direct anchor download (works for Base64 blobs)
        const link = document.createElement('a');
        link.download = `curtain_${photo.villageName.replace(/\s+/g, '_')}_${photo.id}.jpg`;
        link.href = photo.url;
        link.click();
      };

    } catch (err) {
      console.error('Failed to export canvas image', err);
      // Last-resort fallback
      const link = document.createElement('a');
      link.download = `curtain_design.jpg`;
      link.href = photo.url;
      link.click();
    }
  };

  // Download entire folder sequentially
  const downloadFolder = async (folderItems: SavedPhotoItem[], folderName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    alert(`เริ่มดาวน์โหลดรูปภาพในโฟลเดอร์ "${folderName}" ทั้งหมด ${folderItems.length} รูป`);
    
    // Download sequential delay to prevent popup blocks
    for (let i = 0; i < folderItems.length; i++) {
      triggerImageDownload(folderItems[i]);
      await new Promise(resolve => setTimeout(resolve, 550));
    }
  };

  // Grid styling size configuration
  const gridClass = useMemo(() => {
    switch (gridSize) {
      case 'S':
        return 'grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3';
      case 'L':
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6';
      case 'M':
      default:
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4';
    }
  }, [gridSize]);

  // Folder view grid layout size configuration
  const folderGridClass = useMemo(() => {
    switch (gridSize) {
      case 'S':
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3';
      case 'L':
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6';
      case 'M':
      default:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5';
    }
  }, [gridSize]);

  // Clean filters
  const resetFilters = () => {
    setSelectedHouseType('all');
    setSelectedStyle('all');
    setSelectedType('all');
    setSelectedHashtag('all');
    setSearchInput('');
    setSearchQuery('');
  };

  // Active folder object if opened
  const activeFolder = useMemo(() => {
    if (!openFolderKey) return null;
    return folders.find(f => f.key === openFolderKey) || null;
  }, [folders, openFolderKey]);

  return (
    <div id="portfolio-container" className="space-y-6">
      
      {/* Dynamic Header & Toolbars */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 flex items-center gap-2">
            {isFavoriteOnly ? <Heart className="text-rose-500 fill-rose-500" size={24} /> : <Layers className="text-indigo-600" size={24} />}
            {openFolderKey && activeFolder ? (
              <span className="flex items-center gap-1.5 text-slate-800">
                <button onClick={() => setOpenFolderKey(null)} className="hover:text-indigo-600 transition-colors">จัดโฟลเดอร์โครงการ</button>
                <ChevronRight size={16} className="text-slate-400" />
                <span className="text-indigo-600 font-extrabold">{activeFolder.name}</span>
              </span>
            ) : (
              title
            )}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {openFolderKey && activeFolder 
              ? `พบคอลเลกชันติดผ้าม่านในโครงการหมู่บ้านต่างๆ ทั้งหมด ${activeFolder.items.length} รูป` 
              : `คลังภาพตัวอย่างติดตั้งผ้าม่านพรีเมียม ทั้งหมด ${sortedPhotos.length} รูป`
            }
          </p>
        </div>

        {/* View Mode & Grid Sizing segment bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Flat Grid vs Folder toggle (Hide when viewing inside a folder) */}
          {!openFolderKey && (
            <div className="flex bg-slate-200/50 p-1 rounded-xl border border-slate-200/20 shadow-inner select-none">
              <button
                id="view-mode-grid"
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer
                  ${viewMode === 'grid' 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-950'
                  }
                `}
              >
                <Grid3X3 size={14} />
                ดูเรียงรูป
              </button>
              <button
                id="view-mode-folder"
                onClick={() => setViewMode('folder')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer
                  ${viewMode === 'folder' 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-950'
                  }
                `}
              >
                <Folder size={14} />
                จัดโฟลเดอร์ผ้า
              </button>
            </div>
          )}

          {/* Grid Sizing selector [S, M, L] */}
          <div className="flex bg-slate-200/50 p-1 rounded-xl border border-slate-200/20 shadow-inner select-none">
            {(['S', 'M', 'L'] as const).map((size) => (
              <button
                key={size}
                id={`grid-size-btn-${size}`}
                onClick={() => setGridSize(size)}
                className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer
                  ${gridSize === size 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-900'
                  }
                `}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Global Search & Advanced Filters */}
      {!openFolderKey && (
        <div className="bg-white/50 backdrop-blur-xl border border-white/40 rounded-[32px] p-5 shadow-xl space-y-4">
          <div className="flex gap-2 items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="ค้นหาหมู่บ้าน, แบรนด์ผ้า, สีผ้า, รูปแบบม่าน, แฮชแท็ก..."
                className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
              />
              {searchInput && (
                <button 
                  onClick={() => {
                    setSearchInput('');
                    setSearchQuery('');
                  }}
                  className="absolute right-3.5 top-2.5 text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-full text-slate-500 font-bold"
                >
                  ล้างคำค้น
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative min-w-[130px]">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full pl-3 pr-8 py-2.5 rounded-2xl border border-slate-200 bg-white/50 text-xs font-bold focus:outline-none cursor-pointer appearance-none text-slate-700"
              >
                <option value="date-desc">ล่าสุด (Latest)</option>
                <option value="date-asc">เก่าสุด (Oldest)</option>
                <option value="employee">ตามพนักงาน</option>
                <option value="curtain-type">ประเภทผ้าม่าน</option>
                <option value="fabric-name">ชื่อผ้าม่าน</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-3.5 text-slate-500 pointer-events-none" />
            </div>

            {/* Toggle Filters Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2.5 rounded-2xl border flex items-center gap-2 text-xs font-semibold shadow-sm transition-all cursor-pointer
                ${showFilters 
                  ? 'bg-indigo-500 border-indigo-500 text-white shadow-indigo-100 shadow-md' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }
              `}
            >
              <Filter size={16} />
              <span className="max-sm:hidden">ตัวกรองละเอียด</span>
              {(selectedHouseType !== 'all' || selectedStyle !== 'all' || selectedType !== 'all' || selectedHashtag !== 'all' || selectedEmployee !== 'all') && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          </div>

          {/* Expanded Filter Panel */}
          {showFilters && (
            <div className="pt-3 border-t border-slate-200/50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 select-none animate-fadeIn">
              {/* Category 1: House Type */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">ประเภทอสังหาฯ</label>
                <div className="relative">
                  <select
                    value={selectedHouseType}
                    onChange={(e) => setSelectedHouseType(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-200 bg-white/50 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="all">ทั้งหมด (All Types)</option>
                    {[...HOUSE_TYPES].sort((a, b) => a.localeCompare(b, 'th')).map(type => (
                      <option key={type} value={type}>{type.split(' ')[0]}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Category 2: Curtain Style */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">รูปแบบผ้าม่าน (Style)</label>
                <div className="relative">
                  <select
                    value={selectedStyle}
                    onChange={(e) => setSelectedStyle(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-200 bg-white/50 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="all">ทั้งหมด (All Styles)</option>
                    {[...CURTAIN_STYLES].sort((a, b) => a.localeCompare(b, 'th')).map(style => (
                      <option key={style} value={style}>{style.split(' ')[0]}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Category 3: Curtain Type */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">ประเภทผ้าม่าน</label>
                <div className="relative">
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-200 bg-white/50 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="all">ทั้งหมด (ทึบ/โปร่ง)</option>
                    <option value="ผ้าม่านทึบ">ผ้าม่านทึบ (Block-out)</option>
                    <option value="ผ้าม่านโปร่ง">ผ้าม่านโปร่ง (Sheer)</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Category 4: Hashtags */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hashtag</label>
                <div className="relative">
                  <select
                    value={selectedHashtag}
                    onChange={(e) => setSelectedHashtag(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-200 bg-white/50 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="all">ทั้งหมด (All Tags)</option>
                    {[...(configs?.hashtags || HASHTAG_PRESETS)].sort((a, b) => a.localeCompare(b, 'th')).map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Category 5: Employees */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">พนักงานผู้รับผิดชอบ</label>
                <div className="relative">
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-200 bg-white/50 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="all">ทั้งหมด (All Staff)</option>
                    {employees.map(emp => (
                      <option key={emp} value={emp}>{emp}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Reset Controls */}
              <div className="sm:col-span-2 md:col-span-5 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW PANEL 1: INSIDE AN OPENED FOLDER */}
      {openFolderKey && activeFolder && (
        <div className="space-y-6">
          {/* Folder Context Header Bar */}
          <div className="bg-white/50 backdrop-blur-xl border border-white/40 p-5 rounded-[32px] shadow-xl flex flex-col md:flex-row gap-3 md:items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setOpenFolderKey(null)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer flex items-center justify-center"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">คอลเลกชันโครงการหมู่บ้าน</span>
                <h3 className="text-base font-bold text-slate-900">{activeFolder.name}</h3>
              </div>
            </div>
            
            <button
              onClick={(e) => downloadFolder(activeFolder.items, activeFolder.name, e)}
              className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-500/10 cursor-pointer transition-colors"
            >
              <Download size={14} />
              ดาวน์โหลดโฟลเดอร์นี้ ({activeFolder.items.length} ไฟล์)
            </button>
          </div>

          {/* Folder Items Grid */}
          <div className={`grid ${gridClass}`}>
            {activeFolder.items.map((photo, index) => {
              const customCoverId = folderCovers[activeFolder.name];
              const isCover = customCoverId === photo.id || (!customCoverId && index === 0);
              
              return (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  gridSize={gridSize}
                  onToggleLike={onToggleLike}
                  onDeletePhoto={onDeletePhoto}
                  onOpenLightbox={onOpenLightbox}
                  triggerImageDownload={triggerImageDownload}
                  activeUser={activeUser}
                  isInsideFolder={true}
                  onSetAsCover={(e) => handleSetFolderCover(activeFolder.name, photo.id, e)}
                  isFolderCover={isCover}
                  onEditPhoto={onEditPhoto}
                  onSharePhoto={onSharePhoto}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW PANEL 2: FOLDER VIEW (GROUPED BY VILLAGES) */}
      {!openFolderKey && viewMode === 'folder' && (
        <>
          {folders.length === 0 ? (
            <div className="text-center py-20 bg-white/40 border border-slate-200/40 rounded-3xl">
              <Folder className="mx-auto text-slate-300 mb-3" size={48} />
              <p className="text-sm font-semibold text-slate-800">ไม่พบโครงการตามคำค้นหา</p>
              <p className="text-xs text-slate-400 mt-1">กรุณาลองเปลี่ยนข้อมูลค้นหาใหม่</p>
            </div>
          ) : (
            <div className={`grid ${folderGridClass} select-none`}>
              {folders.map((folder) => {
                // Determine cover photo (Requirement 3: "เลือกรูปมาแสดงหน้าปกโฟลเดอร์ด้วย (กำหนดเองได้)")
                const customCoverId = folderCovers[folder.key];
                const samplePhoto = folder.items.find(p => p.id === customCoverId) || folder.items[0];
                const activePreset = samplePhoto ? COLOR_PRESETS.find(p => p.id === samplePhoto.presetId) : null;
                const isS = gridSize === 'S';
                const isL = gridSize === 'L';
                
                return (
                  <div
                    key={folder.key}
                    onClick={() => setOpenFolderKey(folder.key)}
                    className={`group bg-white border border-slate-100/80 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col relative
                      ${isS ? 'p-3 rounded-2xl shadow-md' : isL ? 'p-6 rounded-[36px]' : 'p-4.5 rounded-[32px]'}
                    `}
                  >
                    {/* Apple Style Folder Stack Overlay */}
                    <div className={`relative aspect-[4/3] ${isS ? 'mb-2.5' : 'mb-4'}`}>
                      {/* Sub card 1 (Bottom stacked back) */}
                      <div className="absolute inset-x-2 -bottom-2 h-full bg-slate-300/40 rounded-2xl border border-slate-400/10 scale-95 origin-bottom translate-y-[-4px] shadow" />
                      {/* Sub card 2 (Middle stacked back) */}
                      <div className="absolute inset-x-1 -bottom-1 h-full bg-slate-200/70 rounded-2xl border border-slate-300/20 scale-98 origin-bottom translate-y-[-2px] shadow-sm" />
                      
                      {/* Main Thumb Photo (Front) in its own z-10 overflow-hidden box */}
                      <div className="absolute inset-0 rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center shadow-md border border-slate-200/20 z-10">
                        {samplePhoto ? (
                          <img
                            src={samplePhoto.url}
                            alt={folder.name}
                            className="w-full h-full object-cover rounded-2xl transition-transform duration-500 group-hover:scale-105"
                            style={{ filter: activePreset?.cssFilter || 'none' }}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                        ) : (
                          <Folder size={isS ? 24 : 36} className="text-slate-300" />
                        )}

                        {/* Floating Badge photo count */}
                        <div className={`absolute bg-black/60 text-white font-bold rounded-full backdrop-blur z-20 ${isS ? 'top-2 right-2 px-1.5 py-0.5 text-[9px]' : 'top-3 right-3 px-2.5 py-1 text-[10px]'}`}>
                          {folder.items.length} รูปภาพ
                        </div>
                      </div>
                    </div>

                    {/* Folder details label */}
                    <div className="flex-1 min-w-0">
                      {!isS && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                          <Folder size={10} className="text-slate-400" />
                          <span>โฟลเดอร์โครงการหมู่บ้าน</span>
                        </div>
                      )}
                      <h4 className={`font-extrabold text-slate-900 truncate group-hover:text-indigo-600 transition-colors ${isS ? 'text-xs' : 'text-sm'}`}>
                        {folder.name}
                      </h4>
                      <p className={`text-slate-500 font-medium truncate mt-0.5 ${isS ? 'text-[10px]' : 'text-xs'}`}>
                        รูปแบบบ้าน: <span className="text-slate-800 font-semibold">{samplePhoto?.houseType || 'ยังไม่กำหนด'}</span>
                      </p>
                    </div>

                    {/* Quick actions for folder */}
                    <div className={`mt-3 border-t border-slate-200/50 flex justify-between items-center text-slate-500 font-semibold ${isS ? 'pt-2.5 text-[10px]' : 'pt-3.5 text-xs'}`}>
                      <span className={`bg-slate-100 text-slate-500 rounded-lg truncate ${isS ? 'text-[9px] px-1.5 py-0.5 max-w-[80px]' : 'text-[10px] px-2 py-0.5 max-w-[120px]'}`}>
                        {samplePhoto?.curtainStyle.split(', ')[0] || 'ผ้าม่าน'}
                      </span>
                      <button
                        onClick={(e) => downloadFolder(folder.items, folder.name, e)}
                        className={`rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center gap-1 ${isS ? 'p-1 text-[9px]' : 'p-1.5 text-[10px]'}`}
                        title="ดาวน์โหลดทั้งโฟลเดอร์"
                      >
                        <Download size={isS ? 11 : 13} />
                        {!isS && "ดาวน์โหลด"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* VIEW PANEL 3: FLAT GRID VIEW (SHOW ALL AS INDIVIDUAL SHOWN CARDS) */}
      {!openFolderKey && viewMode === 'grid' && (
        <>
          {sortedPhotos.length === 0 ? (
            <div className="text-center py-20 bg-white/40 border border-slate-200/40 rounded-3xl">
              <ImageIcon className="mx-auto text-slate-300 mb-3" size={48} />
              <p className="text-sm font-semibold text-slate-800">ไม่พบรูปผลงานติดตั้งตามที่ระบุ</p>
              <p className="text-xs text-slate-400 mt-1">กรุณาลองเปลี่ยนหรือเคลียร์คำตัวกรอง</p>
            </div>
          ) : (
            <div className={`grid ${gridClass}`}>
              {sortedPhotos.map((photo) => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  gridSize={gridSize}
                  onToggleLike={onToggleLike}
                  onDeletePhoto={onDeletePhoto}
                  onOpenLightbox={onOpenLightbox}
                  triggerImageDownload={triggerImageDownload}
                  activeUser={activeUser}
                  onEditPhoto={onEditPhoto}
                  onSharePhoto={onSharePhoto}
                />
              ))}
            </div>
          )}
        </>
      )}

    </div>
  );
}

// Inner Component: Photo Card with high-quality liquid glass attributes
interface PhotoCardProps {
  key?: any;
  photo: SavedPhotoItem;
  gridSize: 'S' | 'M' | 'L';
  onToggleLike: (id: string) => void;
  onDeletePhoto: (id: string) => void;
  onOpenLightbox: (photo: SavedPhotoItem) => void;
  triggerImageDownload: (photo: SavedPhotoItem, e?: React.MouseEvent) => any;
  activeUser?: EmployeeUser;
  isInsideFolder?: boolean;
  onSetAsCover?: (e: React.MouseEvent) => void;
  isFolderCover?: boolean;
  onEditPhoto?: (photo: SavedPhotoItem) => void;
  onSharePhoto?: (photo: SavedPhotoItem) => void;
}

function PhotoCard({
  photo,
  gridSize,
  onToggleLike,
  onDeletePhoto,
  onOpenLightbox,
  triggerImageDownload,
  activeUser,
  isInsideFolder = false,
  onSetAsCover,
  isFolderCover = false,
  onEditPhoto,
  onSharePhoto
}: PhotoCardProps) {
  const activePreset = COLOR_PRESETS.find(p => p.id === photo.presetId);

  // Layout-specific sizes
  const isSmall = gridSize === 'S';
  const isLarge = gridSize === 'L';

  return (
    <div
      onClick={() => onOpenLightbox(photo)}
      className="group bg-white/50 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col relative select-none cursor-pointer"
    >
      {/* Photo Stage */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 flex-shrink-0">
        <img
          src={photo.url}
          alt={photo.fileName}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          style={{ filter: activePreset?.cssFilter || 'none' }}
          referrerPolicy="no-referrer"
          loading="lazy"
        />

        {/* Requirement 3: Set/Show Folder Cover */}
        {isInsideFolder && (
          <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
            {isFolderCover ? (
              <div className="px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-[9px] font-extrabold shadow-md flex items-center gap-1 select-none">
                ★ หน้าปกโครงการ
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSetAsCover) onSetAsCover(e);
                }}
                className="px-2.5 py-1 rounded-lg bg-black/60 hover:bg-emerald-600 hover:scale-105 text-white text-[9px] font-extrabold shadow transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
              >
                ตั้งเป็นหน้าปก
              </button>
            )}
          </div>
        )}

        {/* Hover overlay gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Top-row action bubbles */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
          {/* Preset Active Indicator badge (Sparkle) */}
          {activePreset && activePreset.id !== 'original' && !isSmall && (
            <div className="w-7 h-7 rounded-full bg-black/60 text-amber-400 flex items-center justify-center backdrop-blur shadow" title={`Preset: ${activePreset.name}`}>
              <Sparkles size={11} className="animate-pulse" />
            </div>
          )}

          {/* Single-Click Download Button */}
          <button
            onClick={(e) => triggerImageDownload(photo, e)}
            className="w-7 h-7 rounded-full bg-black/60 text-white hover:bg-indigo-600 flex items-center justify-center backdrop-blur shadow transition-all cursor-pointer"
            title="ดาวน์โหลดรูปภาพนี้"
          >
            <Download size={11} />
          </button>

          {/* Share Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onSharePhoto) onSharePhoto(photo);
            }}
            className="w-7 h-7 rounded-full bg-black/60 text-white hover:bg-emerald-600 flex items-center justify-center backdrop-blur shadow transition-all cursor-pointer active:scale-95"
            title="แชร์รูปภาพนี้ไปยังแอปอื่น"
          >
            <Share2 size={11} />
          </button>

          {/* Like Heart Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleLike(photo.id);
            }}
            className={`w-7 h-7 rounded-full bg-black/60 flex items-center justify-center backdrop-blur shadow transition-all cursor-pointer
              ${photo.isLiked ? 'text-rose-500 bg-white/90 scale-105' : 'text-white hover:text-rose-400'}
            `}
          >
            <Heart size={11} className={photo.isLiked ? 'fill-rose-500' : ''} />
          </button>
        </div>

        {/* Delete & Edit floating button group */}
        {(activeUser?.role === 'admin' || 
          (activeUser?.role === 'staff' && (photo.employeeId === activeUser.id || photo.employee === activeUser.name))) && (
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 select-none">
            {/* Edit Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onEditPhoto) onEditPhoto(photo);
              }}
              className="w-7 h-7 rounded-full bg-black/60 text-white hover:bg-emerald-600 hover:scale-105 flex items-center justify-center backdrop-blur shadow transition-all cursor-pointer"
              title="แก้ไขข้อมูลผลงานติดตั้งนี้"
            >
              <Pencil size={10} />
            </button>
            
            {/* Delete Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeletePhoto(photo.id);
              }}
              className="w-7 h-7 rounded-full bg-black/60 text-white hover:bg-red-600 hover:scale-105 flex items-center justify-center backdrop-blur shadow transition-all cursor-pointer"
              title="ลบรูปภาพนี้"
            >
              <Trash2 size={10} />
            </button>
          </div>
        )}

        {/* Bottom Details (Only on hover, or if large layout) */}
        {!isSmall && (
          <div className="absolute bottom-2.5 left-2.5 right-11 text-white font-medium drop-shadow opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <span className="text-xs font-bold truncate block">{photo.villageName}</span>
          </div>
        )}
      </div>

      {/* Attributes Metadata (Below Photo - dynamic sizing based on grid selections) */}
      {!isSmall ? (
        <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1.5">
          <div>
            <div className="flex justify-between items-start mb-0.5 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
              <span>{photo.houseType.split(' ')[0]}</span>
              <span className="text-slate-500 font-mono flex items-center gap-0.5"><Calendar size={9} /> {new Date(photo.uploadedAt).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}</span>
            </div>
            
            <h4 className="text-xs font-extrabold text-slate-900 truncate" title={photo.villageName}>
              {photo.villageName}
            </h4>
            
            {/* Fabric lists */}
            <div className="mt-1 space-y-0.5">
              {photo.fabricDetails.slice(0, 2).map((f, i) => (
                <div key={f.id || i} className="text-[10px] text-slate-600 truncate font-semibold">
                  <span className="text-slate-800">{f.name} / {f.color}</span>
                </div>
              ))}
              {photo.fabricDetails.length > 2 && (
                <div className="text-[9px] text-slate-400 font-bold">+{photo.fabricDetails.length - 2} รายการผ้า</div>
              )}
            </div>
          </div>

          {/* Curtain style and Tags footer */}
          <div className="pt-1.5 border-t border-slate-200/50 flex flex-col gap-1 text-[9px] text-slate-500">
            <div className="flex justify-between items-center w-full">
              <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md text-[9px]">
                {photo.curtainStyle.split(' ')[0]}
              </span>
            </div>
            {photo.hashtags && photo.hashtags.length > 0 ? (
              <div className="flex flex-wrap gap-0.5 mt-0.5">
                {photo.hashtags.map((tag, idx) => (
                  <span key={idx} className="font-bold text-indigo-600 bg-indigo-50/70 px-1 py-0.5 rounded text-[9px]">
                    #{tag}
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-0.5 mt-0.5">
                <span className="font-bold text-indigo-600 bg-indigo-50/70 px-1 py-0.5 rounded text-[9px]">
                  #ม่าน
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* S Grid Mini footer label */
        <div className="p-2 flex-1 flex flex-col justify-between text-left">
          <h4 className="text-[10px] font-bold text-slate-900 truncate" title={photo.villageName}>
            {photo.villageName}
          </h4>
          <span className="text-[9px] text-slate-400 font-medium truncate">
            {photo.fabricDetails[0]?.name || 'ผ้าไม่ระบุ'}
          </span>
        </div>
      )}

    </div>
  );
}
