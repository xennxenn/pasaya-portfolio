import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Plus, 
  Trash2, 
  Sliders, 
  Check, 
  Sparkles, 
  Image as ImageIcon,
  ChevronDown,
  Info,
  X,
  Loader2,
  Users
} from 'lucide-react';
import { 
  COLOR_PRESETS, 
  FabricItem, 
  SavedPhotoItem,
  MasterDataConfigs
} from '../types';
import { getMasterData, formatFabricName, formatFabricColor, compressImage } from '../lib/db';
import heic2any from 'heic2any';

interface UploadPageProps {
  onUploadStart: (villageName: string, photos: Omit<SavedPhotoItem, 'id' | 'uploadedAt'>[]) => void;
  activeEmployee: string;
  allPhotos: SavedPhotoItem[];
}

interface TempPhoto {
  id: string;
  url: string; // base64
  fileName: string;
  fabricDetails: FabricItem[];
  curtainTypes: string[];
  curtainStyle: string;
  hashtags: string[];
  presetId: string;
}

export default function UploadPage({ onUploadStart, activeEmployee, allPhotos }: UploadPageProps) {
  // Master config lists
  const [configs, setConfigs] = useState<MasterDataConfigs | null>(null);
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(true);

  // General details
  const [villageName, setVillageName] = useState('');
  const [houseType, setHouseType] = useState('');
  const [developer, setDeveloper] = useState('ยังไม่กำหนด');

  // Project selector mode (existing vs new)
  const [projectMode, setProjectMode] = useState<'existing' | 'new'>('existing');

  // Autocomplete & suggestions for Project/Village names
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const existingVillages = React.useMemo(() => {
    if (!allPhotos) return [];
    const names = allPhotos.map(p => p.villageName?.trim()).filter(Boolean);
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, 'th'));
  }, [allPhotos]);

  const filteredVillages = React.useMemo(() => {
    const query = villageName.trim().toLowerCase();
    if (!query) return existingVillages;
    return existingVillages.filter(name => name.toLowerCase().includes(query));
  }, [villageName, existingVillages]);

  const handleSelectVillage = (name: string) => {
    setVillageName(name);
    setShowSuggestions(false);
    
    // Auto-select developer and house type from previous entries of this village
    const match = allPhotos.find(p => p.villageName?.trim().toLowerCase() === name.trim().toLowerCase());
    if (match) {
      if (match.developer && configs?.developers.includes(match.developer)) {
        setDeveloper(match.developer);
      }
      if (match.houseType && configs?.houseTypes.includes(match.houseType)) {
        setHouseType(match.houseType);
      }
    }
  };

  // Uploaded files
  const [photos, setPhotos] = useState<TempPhoto[]>([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Conversion state indicator for HEIC processing
  const [isConvertingHeic, setIsConvertingHeic] = useState(false);

  // Helper inputs for adding fabrics
  const [newFabricName, setNewFabricName] = useState('');
  const [newFabricColor, setNewFabricColor] = useState('');
  const [showFabricDropdown, setShowFabricDropdown] = useState(false);

  // Shared metadata states for the upload batch (Applying "อัปโหลดพร้อมกันข้อมูลใช้ข้อมูลเดียวกันในการอัปโหลด")
  const [commonCurtainTypes, setCommonCurtainTypes] = useState<string[]>(['ผ้าม่านทึบ']);
  const [commonCurtainStyles, setCommonCurtainStyles] = useState<string[]>([]);
  const [commonHashtags, setCommonHashtags] = useState<string[]>([]);
  const [commonFabricDetails, setCommonFabricDetails] = useState<FabricItem[]>([]);
  const [commonPresetId, setCommonPresetId] = useState('original');

  const selectedPhoto = photos.find(p => p.id === selectedPhotoId) || null;

  // Fabrics filtering for searchable dropdown
  const filteredFabrics = React.useMemo(() => {
    const query = newFabricName.trim().toUpperCase();
    const list = configs?.fabrics || [];
    if (!query) return list;
    return list.filter(f => f.toUpperCase().includes(query));
  }, [newFabricName, configs?.fabrics]);

  const isFreeTextAllowed = React.useMemo(() => {
    return commonCurtainStyles.some(s => s.includes('มู่ลี่') || s.includes('ม่านม้วน'));
  }, [commonCurtainStyles]);

  // Compute developer sorted list (First: ยังไม่กำหนด, Second: บ้านสร้างแทน, Third onwards: sorted A-Z)
  const sortedDevelopers = React.useMemo(() => {
    if (!configs?.developers) return [];
    
    // Filter out standard ones to place them on top
    const cleanList = configs.developers.filter(
      d => d !== 'ยังไม่กำหนด' && d !== 'บ้านสร้างเอง' && d !== 'บ้านสร้างแทน'
    );
    
    // Sort the clean list alphabetically (Thai-aware)
    const sorted = [...cleanList].sort((a, b) => a.localeCompare(b, 'th'));
    
    // Reassemble: 1. ยังไม่กำหนด, 2. บ้านสร้างแทน, 3. sorted list
    return ['ยังไม่กำหนด', 'บ้านสร้างแทน', ...sorted];
  }, [configs?.developers]);

  // Load master data configuration dynamically on start
  useEffect(() => {
    async function loadConfigs() {
      try {
        setIsLoadingConfigs(true);
        const master = await getMasterData();
        
        // Sort lists alphabetically (A-Z) using Thai-aware comparison
        if (master) {
          if (Array.isArray(master.houseTypes)) {
            master.houseTypes = [...master.houseTypes].sort((a, b) => a.localeCompare(b, 'th'));
          }
          if (Array.isArray(master.developers)) {
            master.developers = [...master.developers].sort((a, b) => a.localeCompare(b, 'th'));
          }
          if (Array.isArray(master.curtainStyles)) {
            master.curtainStyles = [...master.curtainStyles].sort((a, b) => a.localeCompare(b, 'th'));
          }
          if (Array.isArray(master.hashtags)) {
            master.hashtags = [...master.hashtags].sort((a, b) => a.localeCompare(b, 'th'));
          }
        }

        setConfigs(master);
        
        // Initial defaults based on dynamic configs
        if (master.houseTypes?.length > 0) setHouseType(master.houseTypes[0]);
        setDeveloper('ยังไม่กำหนด'); // Default to "ยังไม่กำหนด"
        
        if (master.curtainStyles?.length > 0) {
          setCommonCurtainStyles([master.curtainStyles[0]]);
        }
        if (master.hashtags?.length > 1) {
          setCommonHashtags([master.hashtags[0], master.hashtags[1]]);
        } else if (master.hashtags?.length > 0) {
          setCommonHashtags([master.hashtags[0]]);
        }
      } catch (err) {
        console.error('Error loading master data in upload form:', err);
      } finally {
        setIsLoadingConfigs(false);
      }
    }
    loadConfigs();
  }, []);

  // File handling - Parallel Optimization for Chrome Mobile
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const processFiles = async (files: FileList) => {
    const fileListArray = Array.from(files);
    setIsConvertingHeic(true);
    
    // Process files in parallel to prevent UI blocking and drastically reduce load wait on mobile devices
    await Promise.all(fileListArray.map(async (file) => {
      const isHeic = file.name.toLowerCase().endsWith('.heic') || 
                     file.name.toLowerCase().endsWith('.heif') || 
                     file.type === 'image/heic' || 
                     file.type === 'image/heif';

      try {
        let fileToProcess = file;
        if (isHeic) {
          // Convert HEIC blob to JPEG
          const convertedBlob = await heic2any({
            blob: file,
            toType: "image/jpeg",
            quality: 0.8
          });
          const singleBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
          fileToProcess = new File([singleBlob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
            type: "image/jpeg"
          });
        }
        await readAndAddPhoto(fileToProcess);
      } catch (err) {
        console.error("File processing failed for:", file.name, err);
      }
    }));

    setIsConvertingHeic(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const readAndAddPhoto = (file: File): Promise<void> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          // Compress image immediately using our helper (restricts base64 file sizes drastically)
          const rawBase64 = event.target.result as string;
          const compressedBase64 = await compressImage(rawBase64);

          const newPhoto: TempPhoto = {
            id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            url: compressedBase64,
            fileName: file.name,
            fabricDetails: [], // Set on submission
            curtainTypes: [],  // Set on submission
            curtainStyle: '',  // Set on submission
            hashtags: [],      // Set on submission
            presetId: '',      // Set on submission
          };
          setPhotos(prev => {
            const updated = [...prev, newPhoto];
            if (updated.length === 1 || !selectedPhotoId) {
              setSelectedPhotoId(newPhoto.id);
            }
            return updated;
          });
        }
        resolve();
      };
      reader.onerror = () => resolve();
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Fabric details management with auto-formatting applied on insertion!
  const addFabricToPhoto = () => {
    if (!newFabricName.trim() || !newFabricColor.trim()) return;
    
    // Apply exact requirements formatting
    const formattedName = formatFabricName(newFabricName);
    const formattedColor = formatFabricColor(newFabricColor);

    // Enforce dropdown constraint if NOT "มู่ลี่" or "ม่านม้วน"
    const isFreeTextAllowed = commonCurtainStyles.some(s => s.includes('มู่ลี่') || s.includes('ม่านม้วน'));
    const isExistingFabric = configs?.fabrics?.some(f => f.trim().toUpperCase() === formattedName.toUpperCase()) || false;

    if (!isFreeTextAllowed && !isExistingFabric) {
      alert('รูปแบบม่านที่เลือกไม่อนุญาตให้ระบุชื่อผ้าอิสระ กรุณาเลือกชื่อผ้าที่มีอยู่ในระบบ (Dropdown) หรือติดต่อผู้ดูแลเพื่อเพิ่มรายชื่อผ้าใหม่');
      return;
    }

    const newFab: FabricItem = {
      id: `f-${Date.now()}`,
      name: formattedName,
      color: formattedColor
    };

    setCommonFabricDetails(prev => [...prev, newFab]);
    setNewFabricName('');
    setNewFabricColor('');
  };

  const removeFabricFromPhoto = (fabricId: string) => {
    setCommonFabricDetails(prev => prev.filter(f => f.id !== fabricId));
  };

  // Checkboxes
  const toggleCurtainType = (type: string) => {
    setCommonCurtainTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  // Hashtags
  const toggleHashtag = (hashtag: string) => {
    setCommonHashtags(prev => 
      prev.includes(hashtag) ? prev.filter(h => h !== hashtag) : [...prev, hashtag]
    );
  };

  // Toggle multi-select Curtain Styles (Requirement 2: "อัปโหลดรูปสามารถเลือกรูปแบบผ้าม่านได้มากกว่า 1 รายการ")
  const toggleCurtainStyle = (style: string) => {
    setCommonCurtainStyles(prev =>
      prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]
    );
  };

  // Color Preset filter select
  const handlePresetSelect = (presetId: string) => {
    setCommonPresetId(presetId);
  };

  const deletePhotoCard = (photoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotos(prev => {
      const filtered = prev.filter(p => p.id !== photoId);
      if (selectedPhotoId === photoId) {
        setSelectedPhotoId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  // Form Submit Action (Assigns identical shared specs to all files in batch)
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!villageName.trim()) {
      alert('กรุณากรอกชื่อหมู่บ้าน');
      return;
    }
    if (photos.length === 0) {
      alert('กรุณาอัปโหลดรูปภาพอย่างน้อย 1 รูป');
      return;
    }
    if (commonFabricDetails.length === 0) {
      alert('กรุณาระบุชื่อและสีผ้าอย่างน้อย 1 รายการ');
      return;
    }
    if (commonCurtainStyles.length === 0) {
      alert('กรุณาเลือกรูปแบบผ้าม่านอย่างน้อย 1 รายการ');
      return;
    }

    // Join multiple selected styles with a comma (fits DB schema and works natively with filtering via includes)
    const joinedStyle = commonCurtainStyles.join(', ');

    // Transform temporary upload items into proper SavedPhotoItems using the same batch metadata
    const uploadPhotos: Omit<SavedPhotoItem, 'id' | 'uploadedAt'>[] = photos.map(p => ({
      url: p.url,
      fileName: p.fileName,
      fabricDetails: commonFabricDetails.map(fd => ({
        ...fd,
        name: formatFabricName(fd.name),
        color: formatFabricColor(fd.color)
      })),
      curtainTypes: commonCurtainTypes,
      curtainStyle: joinedStyle,
      hashtags: commonHashtags,
      presetId: commonPresetId,
      isLiked: false,
      villageName: villageName.trim(),
      houseType: houseType || configs?.houseTypes[0] || 'บ้านเดี่ยว (Single House)',
      developer: developer || 'ยังไม่กำหนด',
      employee: activeEmployee || 'พนักงานส่งงาน'
    }));

    // Trigger parent callback
    onUploadStart(villageName.trim(), uploadPhotos);

    // Reset inputs
    setVillageName('');
    setPhotos([]);
    setSelectedPhotoId(null);
  };

  if (isLoadingConfigs) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
        <span className="text-sm font-medium text-slate-500 ml-2">กำลังโหลดมาสเตอร์ข้อมูลการอัปโหลด...</span>
      </div>
    );
  }

  return (
    <div id="upload-form-container" className="max-w-5xl mx-auto space-y-6 pb-20">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 flex items-center gap-2">
            <Upload className="text-emerald-500" size={24} />
            อัปโหลดรูปผลงานติดตั้งผ้าม่าน
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            บันทึกรายละเอียดหมู่บ้าน พนักงาน สเปกผ้า และตกแต่งคุมโทนภาพสไตล์พรีเมียมเรียลไทม์ร่วมกัน
          </p>
        </div>
        
        {isConvertingHeic && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200 animate-pulse">
            <Loader2 className="animate-spin" size={14} />
            <span>กำลังแปลงรูปภาพจาก iPhone (HEIC) เป็น JPEG...</span>
          </div>
        )}
      </div>

      <form onSubmit={handleUploadSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Form Panel: Installation Info & Drag-Drop (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* General Information Card */}
          <div className="bg-white/50 backdrop-blur-xl border border-white/40 rounded-[32px] p-6 shadow-xl space-y-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-500 rounded-full" />
              1. ข้อมูลสถานที่และผู้ดูแลติดตั้ง
            </h2>

            {/* Requirement 6: mode selector - Create New / Add to Existing */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">รูปแบบการจัดเก็บโฟลเดอร์</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setProjectMode('existing');
                    setVillageName('');
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer
                    ${projectMode === 'existing'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm ring-2 ring-emerald-500/10'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }
                  `}
                  style={{ minHeight: '38px' }}
                >
                  Add to Existing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProjectMode('new');
                    setVillageName('');
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer
                    ${projectMode === 'new'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm ring-2 ring-emerald-500/10'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }
                  `}
                  style={{ minHeight: '38px' }}
                >
                  Create New
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Village Input with conditional dropdown based on projectMode */}
              <div className="md:col-span-2 relative">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ชื่อโครงการ / หมู่บ้าน / คอนโด * {projectMode === 'new' ? '(พิมพ์ชื่อโครงการใหม่)' : '(ค้นหาโครงการเดิม)'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={villageName}
                    onChange={(e) => {
                      setVillageName(e.target.value);
                      if (projectMode === 'existing') {
                        setShowSuggestions(true);
                      }
                    }}
                    onFocus={() => {
                      if (projectMode === 'existing') {
                        setShowSuggestions(true);
                      }
                    }}
                    placeholder={
                      projectMode === 'new' 
                        ? 'ระบุชื่อโครงการใหม่ที่นี่...' 
                        : 'พิมพ์ค้นหา หรือเลือกจากโครงการที่เคยบันทึกไว้...'
                    }
                    className="w-full px-4 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm transition-all font-bold"
                    style={{ minHeight: '44px' }}
                  />
                  {projectMode === 'existing' && existingVillages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowSuggestions(!showSuggestions)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition-colors p-0.5 cursor-pointer"
                      title="แสดงโครงการที่เคยบันทึกทั้งหมด"
                    >
                      <ChevronDown size={16} className={`transition-transform duration-200 ${showSuggestions ? 'rotate-180 text-emerald-500' : ''}`} />
                    </button>
                  )}
                </div>

                {/* Suggestions Dropdown (Only in Add to Existing Mode) */}
                {projectMode === 'existing' && showSuggestions && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowSuggestions(false)} 
                    />
                    <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-20 max-h-60 overflow-y-auto divide-y divide-slate-100 py-1 select-none animate-in fade-in slide-in-from-top-2 duration-200">
                      {filteredVillages.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-xs font-bold">
                          ไม่พบโครงการที่ใกล้เคียง คุณสามารถเปลี่ยนไปที่โหมด "สร้างโฟลเดอร์โครงการใหม่" ได้
                        </div>
                      ) : (
                        filteredVillages.map((name, idx) => {
                          const match = allPhotos.find(p => p.villageName?.trim().toLowerCase() === name.trim().toLowerCase());
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectVillage(name)}
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer"
                            >
                              <div className="flex flex-col min-w-0 pr-2">
                                <span className="font-bold text-slate-800 truncate">{name}</span>
                                {match && (
                                  <span className="text-[10px] text-slate-400 font-bold truncate mt-0.5">
                                    {match.developer} • {match.houseType}
                                  </span>
                                )}
                              </div>
                              <span className="flex-shrink-0 text-[8px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-extrabold uppercase border border-emerald-100/40">
                                เคยบันทึกแล้ว
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* House Type Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">ประเภทอสังหาริมทรัพย์</label>
                <div className="relative">
                  <select
                    value={houseType}
                    onChange={(e) => setHouseType(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm transition-all appearance-none cursor-pointer"
                    style={{ minHeight: '44px' }}
                  >
                    {configs?.houseTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3.5 top-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Custom Developer Dropdown (First: ยังไม่กำหนด, Second: บ้านสร้างแทน, rest alphabet sorted) */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">ผู้พัฒนาโครงการ (Developer) *</label>
                <div className="relative">
                  <select
                    value={developer}
                    onChange={(e) => setDeveloper(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm transition-all appearance-none cursor-pointer font-bold text-slate-800"
                    style={{ minHeight: '44px' }}
                  >
                    {sortedDevelopers.map((dev) => (
                      <option key={dev} value={dev}>{dev}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3.5 top-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

            </div>
          </div>

          {/* Media uploader Area */}
          <div className="bg-white/50 backdrop-blur-xl border border-white/40 rounded-[32px] p-6 shadow-xl space-y-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-500 rounded-full" />
              2. เลือกรูปภาพผลงานติดตั้ง (รองรับไฟล์รูปภาพทั้งหมด รวมถึง HEIC/HEIF จาก iPhone)
            </h2>

            {/* Drag & Drop Area */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-8 flex flex-col items-center justify-center bg-white/30 hover:bg-emerald-50/10 cursor-pointer transition-all duration-300 group"
              style={{ minHeight: '140px' }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.heic,.heif"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition-all shadow-sm group-hover:scale-110 duration-300">
                <Upload size={24} />
              </div>
              <p className="text-sm font-bold text-slate-800 mt-3.5">ลากไฟล์รูปภาพมาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
              <p className="text-xs text-slate-400 mt-1">รองรับภาพถ่ายทุกชนิด รวมถึง .jpg, .png, .webp และ .heic</p>
            </div>

            {/* Uploaded thumbnail list */}
            {photos.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500">คิวอัปโหลดรูปภาพ ({photos.length} รูป):</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {photos.map((photo) => {
                    const isSelected = selectedPhotoId === photo.id;
                    return (
                      <div
                        key={photo.id}
                        onClick={() => setSelectedPhotoId(photo.id)}
                        className={`group relative rounded-xl aspect-[4/3] overflow-hidden cursor-pointer border-2 transition-all duration-300
                          ${isSelected 
                            ? 'border-emerald-500 ring-4 ring-emerald-500/15 scale-98 shadow-md' 
                            : 'border-slate-200 hover:border-slate-400'
                          }
                        `}
                      >
                        <img
                          src={photo.url}
                          alt="preview"
                          className="w-full h-full object-cover select-none transition-all duration-300"
                          style={{ filter: commonPresetId !== 'original' ? COLOR_PRESETS.find(p => p.id === commonPresetId)?.cssFilter : 'none' }}
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                          <span className="text-[9px] text-white font-medium truncate w-full">{photo.fileName}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => deletePhotoCard(photo.id, e)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white hover:bg-red-500 flex items-center justify-center transition-colors shadow z-10"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Form Panel: Curtain Spec Form (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white/50 backdrop-blur-xl border border-white/40 rounded-[32px] p-6 shadow-xl space-y-5 sticky top-24">
            
            {/* Spec status info header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/50">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Sliders className="text-indigo-500" size={18} />
                3. ตั้งค่าข้อมูลร่วมกัน (ใช้ข้อมูลเดียวกันทั้งชุดอัปโหลด)
              </h2>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200/50 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-emerald-900 leading-relaxed select-none">
              <Info size={14} className="flex-shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <b>ระบบใช้ข้อมูลชุดเดียวกันในการบันทึกทุกรูป</b> สะดวก รวดเร็ว คุมโทนง่าย ไม่ต้องสลับกดทีละรูป
              </div>
            </div>

            {/* Section 4.1 Fabric List (ชื่อและสีของผ้า) */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-slate-700">
                ชื่อและสีผ้า (ชื่อผ้าพิมพ์ใหญ่ภาษาอังกฤษ สีต้องขึ้นต้นพิมพ์ใหญ่ตามเว้นวรรค) *
              </label>
              
              {/* Added fabrics chip container */}
              <div className="flex flex-wrap gap-1.5 min-h-[40px] p-2 rounded-xl bg-slate-50/50 border border-slate-200/50">
                {commonFabricDetails.length === 0 ? (
                  <span className="text-[11px] text-slate-400 m-auto">ยังไม่ได้ระบุชื่อและสีผ้า</span>
                ) : (
                  commonFabricDetails.map((fab) => (
                    <div 
                      key={fab.id} 
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-xs text-indigo-700 font-medium"
                    >
                      <span>{fab.name} ({fab.color})</span>
                      <button 
                        type="button" 
                        onClick={() => removeFabricFromPhoto(fab.id)}
                        className="hover:text-red-500 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Fabric Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อผ้า เช่น SATIN, LINEN"
                    value={newFabricName}
                    onChange={(e) => {
                      setNewFabricName(e.target.value);
                      setShowFabricDropdown(true);
                    }}
                    onFocus={() => setShowFabricDropdown(true)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white/50 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                  />
                  {showFabricDropdown && (
                    <>
                      <div className="fixed inset-0 z-[9998]" onClick={() => setShowFabricDropdown(false)} />
                      <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-[9999] max-h-48 overflow-y-auto divide-y divide-slate-100 py-1 select-none">
                        {filteredFabrics.length === 0 ? (
                          <div className="p-3 text-center text-slate-400 text-[10px] font-bold">
                            ไม่พบชื่อผ้าในระบบ
                            {isFreeTextAllowed ? (
                              <span className="block text-emerald-500 mt-1">สามารถพิมพ์ระบุชื่อผ้าอิสระได้</span>
                            ) : (
                              <span className="block text-amber-500 mt-1">ต้องเลือกจากระบบ (ม่านม้วน/มู่ลี่ เท่านั้นที่พิมพ์เองได้)</span>
                            )}
                          </div>
                        ) : (
                          filteredFabrics.map((fab, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setNewFabricName(fab);
                                setShowFabricDropdown(false);
                              }}
                              className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-[11px] font-bold text-slate-700 cursor-pointer flex items-center justify-between"
                            >
                              <span>{fab}</span>
                              <span className="text-[9px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded font-bold uppercase">MASTER</span>
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="สีผ้า เช่น ครีม, เทาเข้ม"
                    value={newFabricColor}
                    onChange={(e) => setNewFabricColor(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white/50 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                    style={{ minHeight: '38px' }}
                  />
                  <button
                    type="button"
                    onClick={addFabricToPhoto}
                    className="p-2 w-10 h-10 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Helpful Badge constraint indicator */}
              <div className="flex items-center justify-between px-1">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                  isFreeTextAllowed 
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                    : 'bg-slate-50 text-slate-500 border border-slate-100'
                }`}>
                  {isFreeTextAllowed ? '✨ สามารถพิมพ์ชื่อผ้าเองได้อิสระ' : '🔒 ต้องเลือกชื่อผ้าที่มีในระบบ'}
                </span>
                <span className="text-[9px] text-slate-400 font-medium">
                  * มู่ลี่, ม่านม้วน พิมพ์เองได้ ที่เหลือต้องเลือกจาก dropdown
                </span>
              </div>
            </div>

            {/* Section 4.2: Curtain Type Checkbox (ทึบ/โปร่ง) */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">ประเภทผ้าติดตั้ง (เลือกได้ทั้งคู่)</label>
              <div className="flex flex-col sm:flex-row gap-2">
                {['ผ้าม่านทึบ', 'ผ้าม่านโปร่ง'].map((type) => {
                  const isChecked = commonCurtainTypes.includes(type);
                  return (
                    <label 
                      key={type} 
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 cursor-pointer text-xs font-medium transition-all
                        ${isChecked 
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' 
                          : 'bg-white/40 border-slate-200 text-slate-600 hover:border-slate-300'
                        }
                      `}
                      style={{ minHeight: '44px' }}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => toggleCurtainType(type)}
                        className="hidden"
                      />
                      {isChecked && <Check size={14} />}
                      {type}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Requirement 2: Curtain Style (Multi-select รูปแบบผ้าม่าน ได้มากกว่า 1 รายการ) */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                รูปแบบผ้าม่าน * (เลือกได้มากกว่า 1 รายการ)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {configs?.curtainStyles.map((style) => {
                  const isChecked = commonCurtainStyles.includes(style);
                  return (
                    <label 
                      key={style} 
                      className={`flex items-center justify-center gap-2 py-2 px-2.5 rounded-xl border-2 cursor-pointer text-xs font-medium transition-all text-center
                        ${isChecked 
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' 
                          : 'bg-white/40 border-slate-200 text-slate-600 hover:border-slate-300'
                        }
                      `}
                      style={{ minHeight: '40px' }}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => toggleCurtainStyle(style)}
                        className="hidden"
                      />
                      {isChecked && <Check size={14} className="text-indigo-600 flex-shrink-0" />}
                      <span className="truncate">{style}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Section 4.4: Hashtags */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Hashtags คีย์เวิร์ด (เลือกเพื่อแท็กสเปก)</label>
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-2 bg-slate-50/50 border border-slate-200/50 rounded-xl">
                {configs?.hashtags.map((tag) => {
                  const isSelected = commonHashtags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleHashtag(tag)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer
                        ${isSelected 
                          ? 'bg-slate-800 text-white' 
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }
                      `}
                      style={{ minHeight: '28px' }}
                    >
                      #{tag.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 5: Presets for Color Adjustment */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>เลือกสีฟิลเตอร์พรีเมียม</span>
                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                  <Sparkles size={10} className="text-amber-500 animate-spin" /> คุมโทนเหมือนนิตยสาร
                </span>
              </label>
              
              <div className="grid grid-cols-3 gap-2">
                {COLOR_PRESETS.map((preset) => {
                  const isActive = commonPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetSelect(preset.id)}
                      className={`flex flex-col items-center p-1.5 rounded-xl border text-center transition-all cursor-pointer
                        ${isActive 
                          ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/10' 
                          : 'bg-white/50 border-slate-200/60 hover:bg-white hover:border-slate-300'
                        }
                      `}
                    >
                      <div className="w-full aspect-[4/3] rounded-lg bg-slate-100 overflow-hidden relative mb-1">
                        <img
                          src={selectedPhoto?.url || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=150&q=80'}
                          alt={preset.name}
                          className="w-full h-full object-cover select-none"
                          style={{ filter: preset.cssFilter }}
                          referrerPolicy="no-referrer"
                        />
                        {isActive && (
                          <div className="absolute inset-0 bg-indigo-500/10 flex items-center justify-center">
                            <Check size={14} className="text-indigo-600 bg-white rounded-full p-0.5 shadow-md" />
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] font-bold text-slate-700 truncate w-full">{preset.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 6: Upload Button - High touch target */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={photos.length === 0 || !villageName.trim() || commonFabricDetails.length === 0 || commonCurtainStyles.length === 0}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 transition-all duration-300 cursor-pointer
                  ${photos.length === 0 || !villageName.trim() || commonFabricDetails.length === 0 || commonCurtainStyles.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-emerald-500 hover:bg-emerald-600 hover:-translate-y-0.5 text-white'
                  }
                `}
                style={{ minHeight: '48px' }}
              >
                <Upload size={16} />
                กดอัปโหลดรูปภาพทั้งหมด ({photos.length} รูป)
              </button>
              <p className="text-[10px] text-slate-400 text-center mt-2 leading-relaxed">
                * ระบบซิงค์ข้อมูลขึ้นคลาวด์ออนไลน์ร่วมกันเรียลไทม์ทันทีเพื่อให้เพื่อนพนักงานและแอดมินเห็นตรงกันทั้งหมด
              </p>
            </div>

          </div>
        </div>

      </form>
    </div>
  );
}
