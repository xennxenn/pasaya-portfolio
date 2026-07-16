import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Loader2, 
  Save, 
  Edit3, 
  Layers, 
  Sparkles, 
  Check, 
  Info 
} from 'lucide-react';
import { 
  SavedPhotoItem, 
  COLOR_PRESETS, 
  MasterDataConfigs, 
  FabricItem 
} from '../types';
import { 
  getMasterData, 
  updatePhoto, 
  updateBatchPhotos, 
  saveUserLog 
} from '../lib/db';

interface EditPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  photo: SavedPhotoItem | null;
  allPhotos: SavedPhotoItem[];
  activeUser: any;
  onSaveSuccess: () => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export default function EditPhotoModal({
  isOpen,
  onClose,
  photo,
  allPhotos,
  activeUser,
  onSaveSuccess,
  showToast
}: EditPhotoModalProps) {
  const [configs, setConfigs] = useState<MasterDataConfigs | null>(null);
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [editMode, setEditMode] = useState<'single' | 'batch'>('single');
  const [villageName, setVillageName] = useState('');
  const [developer, setDeveloper] = useState('');
  const [customDeveloper, setCustomDeveloper] = useState('');
  const [houseType, setHouseType] = useState('');
  const [customHouseType, setCustomHouseType] = useState('');
  const [curtainStyles, setCurtainStyles] = useState<string[]>([]);
  const [customStyleValues, setCustomStyleValues] = useState<{ [style: string]: string }>({});
  const [curtainTypes, setCurtainTypes] = useState<string[]>([]);
  const [fabrics, setFabrics] = useState<FabricItem[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [presetId, setPresetId] = useState('original');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Find all photos uploaded in the same batch
  const siblingPhotos = React.useMemo(() => {
    if (!photo) return [];
    if (photo.batchId) {
      return allPhotos.filter(p => p.batchId === photo.batchId);
    }
    // Fallback older photos: same villageName, same employee, same timestamp block (within 5 minutes)
    const targetTime = new Date(photo.uploadedAt).getTime();
    return allPhotos.filter(p => {
      if (p.villageName !== photo.villageName) return false;
      if (p.employee !== photo.employee) return false;
      const diff = Math.abs(new Date(p.uploadedAt).getTime() - targetTime);
      return diff < 300000; // 5 mins
    });
  }, [photo, allPhotos]);

  // Compute developer sorted list (First: ยังไม่กำหนด, Second: บ้านสร้างเอง, Third onwards: sorted A-Z)
  const sortedDevelopers = React.useMemo(() => {
    if (!configs?.developers) return [];
    const cleanList = configs.developers.filter(
      d => d !== 'ยังไม่กำหนด' && d !== 'บ้านสร้างเอง'
    );
    const sorted = [...cleanList].sort((a, b) => a.localeCompare(b, 'th'));
    return ['ยังไม่กำหนด', 'บ้านสร้างเอง', ...sorted];
  }, [configs?.developers]);

  // Load configuration configs
  useEffect(() => {
    if (!isOpen) return;

    async function loadConfigs() {
      try {
        setIsLoadingConfigs(true);
        const data = await getMasterData();
        setConfigs(data);
      } catch (err) {
        console.error('Failed to load configs inside EditPhotoModal:', err);
        showToast('ไม่สามารถโหลดข้อมูลมาสเตอร์ได้', 'error');
      } finally {
        setIsLoadingConfigs(false);
      }
    }
    loadConfigs();
  }, [isOpen]);

  // Initialize form with selected photo values
  useEffect(() => {
    if (!photo || !isOpen) return;

    setVillageName(photo.villageName);
    setPresetId(photo.presetId || 'original');
    setCurtainTypes(photo.curtainTypes || []);
    setFabrics(photo.fabricDetails || []);
    setHashtags(photo.hashtags || []);

    // Split curtainStyle string by comma
    const styles = photo.curtainStyle 
      ? photo.curtainStyle.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const initialCustomValues: { [style: string]: string } = {};
    const selectedStyleFlags: string[] = [];

    if (configs?.curtainStyles) {
      configs.curtainStyles.forEach(style => {
        const isCustom = configs.curtainStyleConfigs?.[style] === 'custom';
        if (isCustom) {
          // Find any value in styles that matches style or starts with similar word
          const customVal = styles.find(s => s === style || (!configs.curtainStyles.includes(s) && s.toLowerCase().includes(style.split(' ')[0].toLowerCase())));
          if (customVal) {
            initialCustomValues[style] = customVal;
            selectedStyleFlags.push(style);
          } else {
            if (styles.includes(style)) {
              initialCustomValues[style] = style;
              selectedStyleFlags.push(style);
            }
          }
        } else {
          if (styles.includes(style)) {
            selectedStyleFlags.push(style);
          }
        }
      });
      
      // Add any leftover styles that are not in configs.curtainStyles
      styles.forEach(s => {
        if (!configs.curtainStyles.includes(s) && !selectedStyleFlags.some(flag => initialCustomValues[flag] === s)) {
          const firstCustomStyle = configs.curtainStyles.find(cs => configs.curtainStyleConfigs?.[cs] === 'custom' && !initialCustomValues[cs]);
          if (firstCustomStyle) {
            initialCustomValues[firstCustomStyle] = s;
            if (!selectedStyleFlags.includes(firstCustomStyle)) {
              selectedStyleFlags.push(firstCustomStyle);
            }
          } else {
            selectedStyleFlags.push(s);
          }
        }
      });
    } else {
      selectedStyleFlags.push(...styles);
    }

    setCustomStyleValues(initialCustomValues);
    setCurtainStyles(selectedStyleFlags);

    // Setup developer
    setDeveloper(photo.developer || 'ยังไม่กำหนด');
    setCustomDeveloper('');

    // Setup house type
    setHouseType(photo.houseType || 'บ้านเดี่ยว (Single House)');
    setCustomHouseType('');

    // Default edit mode
    setEditMode('single');
  }, [photo, isOpen, configs]);

  if (!isOpen || !photo) return null;

  const handleToggleHashtag = (tag: string) => {
    setHashtags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleToggleStyle = (style: string) => {
    setCurtainStyles(prev => 
      prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]
    );
  };

  const handleToggleCurtainType = (type: string) => {
    setCurtainTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleAddFabric = () => {
    setFabrics(prev => [...prev, { 
      id: `fab-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, 
      name: '', 
      color: '' 
    }]);
  };

  const handleRemoveFabric = (id: string) => {
    setFabrics(prev => prev.filter(f => f.id !== id));
  };

  const handleFabricChange = (id: string, field: 'name' | 'color', value: string) => {
    setFabrics(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const getFilteredFabrics = (val: string) => {
    const query = val.trim().toUpperCase();
    const list = configs?.fabrics || [];
    if (!query) return list;
    return list.filter(f => f.toUpperCase().includes(query));
  };

  // Submit form
  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!villageName.trim()) {
      showToast('กรุณากรอกชื่อหมู่บ้าน/โครงการ', 'error');
      return;
    }
    if (fabrics.length === 0) {
      showToast('กรุณาระบุข้อมูลผ้าอย่างน้อย 1 รายการ', 'error');
      return;
    }
    if (fabrics.some(f => !f.name.trim() || !f.color.trim())) {
      showToast('กรุณากรอกชื่อและสีผ้าให้ครบถ้วนทุกช่อง', 'error');
      return;
    }

    // Validate each fabric based on selected styles
    const isFreeTextAllowed = curtainStyles.some(s => {
      if (s.includes('มู่ลี่') || s.includes('ม่านม้วน') || s.includes('ม่านปรับแสง')) return true;
      const isCustomMode = configs?.curtainStyleConfigs?.[s] === 'custom';
      return isCustomMode;
    });
    const masterFabricsUpper = (configs?.fabrics || []).map(f => f.trim().toUpperCase());

    if (!isFreeTextAllowed) {
      const invalidFabric = fabrics.find(f => {
        const nameUpper = f.name.trim().toUpperCase();
        return !masterFabricsUpper.includes(nameUpper);
      });
      if (invalidFabric) {
        showToast(`ชื่อผ้า "${invalidFabric.name}" ไม่อนุญาตให้พิมพ์เองสำหรับรูปแบบม่านชุดนี้ กรุณาเลือกชื่อผ้าที่มีอยู่ในระบบ`, 'error');
        return;
      }
    }

    if (curtainStyles.length === 0) {
      showToast('กรุณาเลือกรูปแบบผ้าม่านอย่างน้อย 1 รายการ', 'error');
      return;
    }
    if (curtainTypes.length === 0) {
      showToast('กรุณาเลือกประเภทผ้าม่านอย่างน้อย 1 รายการ', 'error');
      return;
    }

    try {
      setIsSaving(true);

      const finalDeveloper = developer === 'other' ? customDeveloper.trim() : developer;
      const finalHouseType = houseType === 'other' ? customHouseType.trim() : houseType;

      if (developer === 'other' && !customDeveloper.trim()) {
        showToast('กรุณากรอกชื่อดีเวลลอปเปอร์เพิ่มเติม', 'error');
        setIsSaving(false);
        return;
      }
      if (houseType === 'other' && !customHouseType.trim()) {
        showToast('กรุณากรอกประเภทบ้านเพิ่มเติม', 'error');
        setIsSaving(false);
        return;
      }

      const finalStyles = curtainStyles.map(style => {
        const isCustomMode = configs?.curtainStyleConfigs?.[style] === 'custom';
        if (isCustomMode && customStyleValues[style]?.trim()) {
          return customStyleValues[style].trim();
        }
        return style;
      });

      const updatedData: Partial<SavedPhotoItem> = {
        villageName: villageName.trim(),
        developer: finalDeveloper || 'ยังไม่กำหนด',
        houseType: finalHouseType || 'บ้านเดี่ยว (Single House)',
        curtainStyle: finalStyles.join(', '),
        curtainTypes,
        fabricDetails: fabrics,
        hashtags,
        presetId
      };

      if (editMode === 'batch') {
        const batchIds = siblingPhotos.map(p => p.id);
        await updateBatchPhotos(batchIds, updatedData);
        showToast(`แก้ไขข้อมูลผลงานติดตั้งทั้งหมดในชุดเดียวกันจำนวน ${batchIds.length} รูปสำเร็จเรียบร้อย`, 'success');
        
        // Save Log
        await saveUserLog(
          'admin_config_update',
          activeUser?.name || 'พนักงาน',
          `แก้ไขข้อมูลแบบกลุ่ม (${batchIds.length} รูป) โครงการ: "${villageName}" รูปแบบม่าน: ${curtainStyles.join(', ')}`
        );
      } else {
        await updatePhoto(photo.id, updatedData);
        showToast('แก้ไขข้อมูลรูปภาพผลงานติดตั้งสำเร็จเรียบร้อย', 'success');
        
        // Save Log
        await saveUserLog(
          'admin_config_update',
          activeUser?.name || 'พนักงาน',
          `แก้ไขข้อมูลรูปภาพเดี่ยว (${photo.fileName}) โครงการ: "${villageName}"`
        );
      }

      onSaveSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving photo edit:', err);
      showToast('ไม่สามารถบันทึกการแก้ไขข้อมูลได้', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div 
        id="edit-photo-modal-card"
        className="bg-white/95 backdrop-blur-md rounded-[32px] border border-slate-200/80 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col my-8 select-none"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
              <Edit3 size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-950">แก้ไขข้อมูลผลงานติดตั้งผ้าม่าน</h2>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">แก้ไขรายละเอียดสเปก รูปแบบม่าน และข้อมูลผ้า</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer active:scale-90"
            style={{ minHeight: '36px', minWidth: '36px' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSaveSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[70vh] custom-scrollbar">
          
          {/* Requirement Mode Selector: Single vs Batch */}
          {siblingPhotos.length > 1 && (
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center gap-2 text-amber-800">
                <Info size={16} className="text-amber-600 flex-shrink-0 animate-bounce" />
                <span className="text-xs font-black">ตรวจพบรูปภาพชุดเดียวกัน ({siblingPhotos.length} รูป)</span>
              </div>
              <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
                รูปภาพนี้ถูกอัปโหลดขึ้นคลาวด์พร้อมกันเป็นชุด (โครงการ: {photo.villageName}) คุณต้องการแก้ไขข้อมูลอย่างไร?
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* Single Option */}
                <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none
                  ${editMode === 'single' 
                    ? 'bg-white border-amber-500 shadow-md ring-2 ring-amber-500/10' 
                    : 'bg-white/40 border-slate-200 hover:bg-white/80'
                  }
                `}>
                  <input
                    type="radio"
                    name="editMode"
                    value="single"
                    checked={editMode === 'single'}
                    onChange={() => setEditMode('single')}
                    className="h-4 w-4 text-amber-500 focus:ring-amber-500 border-slate-300 cursor-pointer"
                  />
                  <div className="text-left">
                    <p className="text-xs font-extrabold text-slate-800">แก้ไขเฉพาะรูปนี้รายการเดียว</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">แก้ไขรายละเอียดเฉพาะไฟล์ {photo.fileName}</p>
                  </div>
                </label>

                {/* Batch Option */}
                <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none
                  ${editMode === 'batch' 
                    ? 'bg-white border-amber-500 shadow-md ring-2 ring-amber-500/10' 
                    : 'bg-white/40 border-slate-200 hover:bg-white/80'
                  }
                `}>
                  <input
                    type="radio"
                    name="editMode"
                    value="batch"
                    checked={editMode === 'batch'}
                    onChange={() => setEditMode('batch')}
                    className="h-4 w-4 text-amber-500 focus:ring-amber-500 border-slate-300 cursor-pointer"
                  />
                  <div className="text-left">
                    <p className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <span>แก้ไขรูปทั้งหมดในชุดนี้</span>
                      <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded-full font-black">{siblingPhotos.length} รูป</span>
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">สเปกและรายละเอียดทั้งหมดจะอัปเดตตรงกันทุกใบ</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {isLoadingConfigs ? (
            <div className="flex flex-col justify-center items-center py-16 gap-2">
              <Loader2 className="animate-spin text-indigo-600" size={28} />
              <p className="text-xs text-slate-400 font-bold">กำลังโหลดมาสเตอร์ตัวเลือกข้อมูลผ้าม่าน...</p>
            </div>
          ) : (
            <div className="space-y-5">
              
              {/* Photo Preview Mini Row */}
              <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 p-3 rounded-2xl select-none">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0 border border-slate-200 shadow-sm">
                  <img 
                    src={photo.url} 
                    alt="Preview" 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                    style={{ filter: COLOR_PRESETS.find(p => p.id === presetId)?.cssFilter }}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-800 truncate">{photo.fileName}</p>
                  <p className="text-[10px] text-slate-400 font-extrabold mt-0.5">
                    ผู้ส่งงาน: {photo.employee} • {new Date(photo.uploadedAt).toLocaleDateString('th-TH')}
                  </p>
                </div>
              </div>

              {/* Village & Developer & House Type row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Village Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 block">ชื่อหมู่บ้าน/โครงการ <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={villageName}
                    onChange={(e) => setVillageName(e.target.value)}
                    placeholder="กรอกชื่อหมู่บ้าน/โครงการติดตั้ง..."
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Developer Select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 block">ดีเวลลอปเปอร์ผู้สร้างโครงการ</label>
                  <select
                    value={developer}
                    onChange={(e) => setDeveloper(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {sortedDevelopers.map(dev => (
                      <option key={dev} value={dev}>{dev}</option>
                    ))}
                    <option value="other">+ เพิ่มดีเวลลอปเปอร์ใหม่...</option>
                  </select>
                  {developer === 'other' && (
                    <input
                      type="text"
                      value={customDeveloper}
                      onChange={(e) => setCustomDeveloper(e.target.value)}
                      placeholder="ระบุดีเวลลอปเปอร์เพิ่มเติม..."
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 mt-1.5 animate-in slide-in-from-top-1"
                    />
                  )}
                </div>

                {/* House Type Select */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-black text-slate-700 block">ประเภทบ้าน/ที่อยู่อาศัย</label>
                  <select
                    value={houseType}
                    onChange={(e) => setHouseType(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {configs?.houseTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                    <option value="other">+ เพิ่มประเภทที่อยู่อาศัยใหม่...</option>
                  </select>
                  {houseType === 'other' && (
                    <input
                      type="text"
                      value={customHouseType}
                      onChange={(e) => setCustomHouseType(e.target.value)}
                      placeholder="ระบุประเภทที่อยู่อาศัยเพิ่มเติม..."
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 mt-1.5 animate-in slide-in-from-top-1"
                    />
                  )}
                </div>

              </div>

              {/* Curtain Styles */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700 block">รูปแบบผ้าม่านที่เลือกใช้ (เลือกได้มากกว่า 1) <span className="text-red-500">*</span></label>
                <div className="flex flex-wrap gap-1.5 p-3 border border-slate-100 rounded-2xl bg-slate-50/50">
                  {configs?.curtainStyles.map(style => {
                    const isSelected = curtainStyles.includes(style);
                    return (
                      <button
                        type="button"
                        key={style}
                        onClick={() => handleToggleStyle(style)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer border
                          ${isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }
                        `}
                      >
                        {style}
                      </button>
                    );
                  })}
                </div>

                {/* Custom text inputs for edit modal */}
                {configs?.curtainStyles.map((style) => {
                  const isChecked = curtainStyles.includes(style);
                  const isCustomMode = configs?.curtainStyleConfigs?.[style] === 'custom';
                  if (isChecked && isCustomMode) {
                    return (
                      <div key={`custom-edit-input-${style}`} className="p-3 bg-indigo-50/40 border border-indigo-150 rounded-xl space-y-1 mt-1.5 animate-in slide-in-from-top-1">
                        <label className="block text-[10px] font-black text-indigo-700 uppercase tracking-wider">
                          ระบุรายละเอียดสำหรับ "{style}" * (พิมพ์เองได้)
                        </label>
                        <input
                          type="text"
                          required
                          value={customStyleValues[style] || ''}
                          onChange={(e) => {
                            setCustomStyleValues(prev => ({
                              ...prev,
                              [style]: e.target.value
                            }));
                          }}
                          placeholder="ระบุสเปก, ทรง หรือรายละเอียดพิเศษ..."
                          className="w-full h-9 px-3 rounded-xl border border-indigo-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs font-bold text-slate-800"
                        />
                      </div>
                    );
                  }
                  return null;
                })}
              </div>

              {/* Curtain Types & Color Filter Preset */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Curtain Types (ทึบ/โปร่ง) */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 block">ประเภทผ้าติดตั้ง <span className="text-red-500">*</span></label>
                  <div className="flex gap-2.5">
                    {['ผ้าม่านทึบ', 'ผ้าม่านโปร่ง'].map(type => {
                      const isSelected = curtainTypes.includes(type);
                      return (
                        <button
                          type="button"
                          key={type}
                          onClick={() => handleToggleCurtainType(type)}
                          className={`flex-1 h-11 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5
                            ${isSelected
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }
                          `}
                        >
                          {isSelected && <Check size={14} />}
                          <span>{type}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color Preset Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 block">สไตล์สีรูปภาพ (Color Preset)</label>
                  <select
                    value={presetId}
                    onChange={(e) => setPresetId(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {COLOR_PRESETS.map(preset => (
                      <option key={preset.id} value={preset.id}>{preset.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fabric details manager (Dynamic list) */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-slate-700">ข้อมูลผ้าผืนติดตั้ง (ผ้าที่ใช้จริง) <span className="text-red-500">*</span></label>
                  <button
                    type="button"
                    onClick={handleAddFabric}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-extrabold rounded-xl transition-all cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>เพิ่มข้อมูลผ้า</span>
                  </button>
                </div>

                 <div className="space-y-2">
                  {fabrics.map((fabric, index) => (
                    <div 
                      key={fabric.id} 
                      className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-2.5 rounded-2xl animate-in slide-in-from-left-2 duration-150"
                    >
                      <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-500 text-[10px] font-black flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </span>
                      
                      {/* Fabric name */}
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={fabric.name}
                          onChange={(e) => {
                            handleFabricChange(fabric.id, 'name', e.target.value);
                            setOpenDropdownId(fabric.id);
                          }}
                          onFocus={() => setOpenDropdownId(fabric.id)}
                          placeholder="รหัส/ชื่อผ้า (เช่น VC-882)..."
                          className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        {openDropdownId === fabric.id && (
                          <>
                            <div className="fixed inset-0 z-[9998]" onClick={() => setOpenDropdownId(null)} />
                            <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-[9999] max-h-40 overflow-y-auto divide-y divide-slate-100 py-1 select-none">
                              {(() => {
                                const filtered = getFilteredFabrics(fabric.name);
                                const isFreeAllowed = curtainStyles.some(s => {
                                  if (s.includes('มู่ลี่') || s.includes('ม่านม้วน') || s.includes('ม่านปรับแสง')) return true;
                                  const isCustomMode = configs?.curtainStyleConfigs?.[s] === 'custom';
                                  return isCustomMode;
                                });
                                if (filtered.length === 0) {
                                  return (
                                    <div className="p-2 text-center text-slate-400 text-[10px] font-bold">
                                      ไม่พบชื่อผ้าในระบบ
                                      {isFreeAllowed ? (
                                        <span className="block text-emerald-500 mt-0.5">พิมพ์ระบุอิสระได้</span>
                                      ) : (
                                        <span className="block text-amber-500 mt-0.5">ต้องเลือกจากระบบเท่านั้น</span>
                                      )}
                                    </div>
                                  );
                                }
                                return filtered.map((fab, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                      handleFabricChange(fabric.id, 'name', fab);
                                      setOpenDropdownId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-[10px] font-extrabold text-slate-700 cursor-pointer flex items-center justify-between"
                                  >
                                    <span>{fab}</span>
                                    <span className="text-[8px] bg-indigo-50 text-indigo-500 px-1 py-0.5 rounded font-black uppercase">MASTER</span>
                                  </button>
                                ));
                              })()}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Fabric color */}
                      <input
                        type="text"
                        value={fabric.color}
                        onChange={(e) => handleFabricChange(fabric.id, 'color', e.target.value)}
                        placeholder="สีผ้า (เช่น เทาเข้ม/ครีม)..."
                        className="flex-1 h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />

                      {/* Delete button */}
                      {fabrics.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFabric(fabric.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Helpful Badge constraint indicator */}
                <div className="flex items-center justify-between px-1">
                  {(() => {
                    const isFreeAllowed = curtainStyles.some(s => {
                      if (s.includes('มู่ลี่') || s.includes('ม่านม้วน') || s.includes('ม่านปรับแสง')) return true;
                      const isCustomMode = configs?.curtainStyleConfigs?.[s] === 'custom';
                      return isCustomMode;
                    });
                    return (
                      <>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                          isFreeAllowed 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                            : 'bg-slate-50 text-slate-500 border border-slate-100'
                        }`}>
                          {isFreeAllowed ? '✨ สามารถพิมพ์ชื่อผ้าเองได้อิสระ' : '🔒 ต้องเลือกชื่อผ้าที่มีในระบบ'}
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium">
                          * มู่ลี่, ม่านม้วน, ม่านปรับแสง และรูปแบบที่พิมพ์เองได้ ระบุชื่อผ้าได้อิสระ
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Brand Hashtags list */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700 block">แฮชแท็กแบรนด์ (Hashtags)</label>
                <div className="flex flex-wrap gap-1.5 p-3 border border-slate-100 rounded-2xl bg-slate-50/50">
                  {configs?.hashtags.map(tag => {
                    const isSelected = hashtags.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => handleToggleHashtag(tag)}
                        className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all cursor-pointer border
                          ${isSelected
                            ? 'bg-amber-500 border-amber-500 text-white shadow'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                          }
                        `}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </form>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 select-none">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer disabled:bg-slate-100"
            style={{ minHeight: '44px' }}
          >
            ยกเลิก
          </button>
          
          <button
            onClick={handleSaveSubmit}
            disabled={isSaving || isLoadingConfigs}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:bg-slate-300 flex items-center justify-center gap-2 cursor-pointer"
            style={{ minHeight: '44px' }}
          >
            {isSaving ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>กำลังบันทึกข้อมูล...</span>
              </>
            ) : (
              <>
                <Save size={15} />
                <span>{editMode === 'batch' ? 'บันทึกแก้ไขทั้งหมด' : 'บันทึกการแก้ไข'}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
