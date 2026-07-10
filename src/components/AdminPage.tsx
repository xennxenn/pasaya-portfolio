import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Plus, 
  Trash2, 
  Save, 
  FileEdit, 
  Sliders, 
  Users, 
  Hash, 
  Home, 
  Building, 
  ChevronRight, 
  X, 
  Check, 
  Info,
  Loader2,
  Image as ImageIcon,
  UserCheck,
  Edit,
  ShieldAlert,
  Upload,
  Heart,
  Tag
} from 'lucide-react';
import { MasterDataConfigs, SavedPhotoItem, EmployeeUser } from '../types';
import { getMasterData, saveMasterData, saveUserLog, deletePhoto, compressImage } from '../lib/db';
import Logo from './Logo';

interface AdminPageProps {
  photos: SavedPhotoItem[];
  onPhotosUpdated: () => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  activeUser: EmployeeUser;
}

export default function AdminPage({ photos, onPhotosUpdated, showToast, activeUser }: AdminPageProps) {
  const [configs, setConfigs] = useState<MasterDataConfigs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'configs' | 'photos' | 'likes_report'>('configs');
  const [activeConfigCategory, setActiveConfigCategory] = useState<keyof MasterDataConfigs>('employees');
  
  // Likes report inner state
  const [likesReportTab, setLikesReportTab] = useState<'by_photo' | 'by_employee'>('by_photo');
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);

  // Inline edit state for string lists (curtainStyles, hashtags, houseTypes, developers)
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  // Structured Form States for Employee accounts
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [empName, setEmpName] = useState('');
  const [empUsername, setEmpUsername] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [empRole, setEmpRole] = useState<'admin' | 'staff' | 'visitor'>('staff');

  // New string item text
  const [newItemText, setNewItemText] = useState('');

  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const [isSavingLogo, setIsSavingLogo] = useState(false);

  // Cloudinary States
  const [clCloudName, setClCloudName] = useState('fyouajy1');
  const [clUploadPreset, setClUploadPreset] = useState('ml_default');
  const [clEnabled, setClEnabled] = useState(true);

  // Sync state when configs load
  useEffect(() => {
    if (configs) {
      setClCloudName(configs.cloudinaryCloudName || 'fyouajy1');
      setClUploadPreset(configs.cloudinaryUploadPreset || 'ml_default');
      setClEnabled(configs.cloudinaryEnabled !== false);
    }
  }, [configs]);

  const handleSaveCloudinary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configs) return;

    const trimmedCloudName = clCloudName.trim();
    const trimmedPreset = clUploadPreset.trim();

    if (clEnabled && (!trimmedCloudName || !trimmedPreset)) {
      showToast('กรุณากรอก Cloud Name และ Upload Preset ให้ครบถ้วนหากเปิดใช้งาน', 'error');
      return;
    }

    const updatedConfigs: MasterDataConfigs = {
      ...configs,
      cloudinaryCloudName: trimmedCloudName,
      cloudinaryUploadPreset: trimmedPreset,
      cloudinaryEnabled: clEnabled
    };

    try {
      await saveMasterData(updatedConfigs);
      setConfigs(updatedConfigs);
      showToast('บันทึกการตั้งค่า Cloudinary สำเร็จเรียบร้อย!', 'success');
      
      await saveUserLog(
        'admin_config_update',
        activeUser.name,
        `อัปเดตการตั้งค่า Cloudinary (สถานะ: ${clEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}, Cloud Name: "${trimmedCloudName}")`
      );
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกการตั้งค่า Cloudinary ได้', 'error');
    }
  };

  // --- Likes Report Calculations ---
  const likedPhotos = React.useMemo(() => {
    return photos.filter(p => p.likedBy && p.likedBy.length > 0);
  }, [photos]);

  const totalLikesCount = React.useMemo(() => {
    return photos.reduce((acc, p) => acc + (p.likedBy?.length || 0), 0);
  }, [photos]);

  // Find most active liker
  const likerStats = React.useMemo(() => {
    const counts: Record<string, number> = {};
    photos.forEach(p => {
      (p.likedBy || []).forEach(userId => {
        counts[userId] = (counts[userId] || 0) + 1;
      });
    });
    
    let topLikerId = '';
    let maxLikes = 0;
    Object.entries(counts).forEach(([userId, count]) => {
      if (count > maxLikes) {
        maxLikes = count;
        topLikerId = userId;
      }
    });

    // Resolve name from configs.employeeAccounts
    const allAccounts = configs?.employeeAccounts || [];
    const matched = allAccounts.find(acc => acc.id === topLikerId || acc.username === topLikerId);
    return {
      name: matched ? matched.name : topLikerId || 'ไม่มีข้อมูล',
      count: maxLikes
    };
  }, [photos, configs]);

  // Find most popular photo
  const mostPopularPhoto = React.useMemo(() => {
    let topPhoto: SavedPhotoItem | null = null;
    let maxLikes = 0;
    photos.forEach(p => {
      const count = p.likedBy?.length || 0;
      if (count > maxLikes) {
        maxLikes = count;
        topPhoto = p;
      }
    });
    return {
      photo: topPhoto,
      count: maxLikes
    };
  }, [photos]);

  const handleLogoUpload = async (file: File) => {
    if (!configs) return;
    setIsSavingLogo(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const rawBase64 = e.target?.result as string;
        if (!rawBase64) {
          showToast('ไม่สามารถอ่านไฟล์ภาพโลโก้ได้', 'error');
          setIsSavingLogo(false);
          return;
        }

        // Compress logo to preserve Firestore space and ensure blazing-fast loading (max 500x500 pixels)
        const compressedBase64 = await compressImage(rawBase64, 500, 500, 0.85);

        const updatedConfigs = {
          ...configs,
          logoUrl: compressedBase64
        };

        await saveMasterData(updatedConfigs);
        setConfigs(updatedConfigs);
        localStorage.setItem('pasaya_app_logo_url', compressedBase64);
        
        showToast('อัปโหลดและเปลี่ยนโลโก้แอปพลิเคชันเรียบร้อยแล้ว!', 'success');

        await saveUserLog(
          'admin_config_update',
          activeUser.name,
          'อัปโหลดโลโก้แอปพลิเคชันกำหนดเองใหม่สำเร็จ'
        );
        setIsSavingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการอัปโหลดโลโก้', 'error');
      setIsSavingLogo(false);
    }
  };

  const handleResetLogo = async () => {
    if (!configs) return;
    if (!window.confirm('คุณต้องการรีเซ็ตโลโก้กลับเป็นของระบบ (PASAYA CURTAIN CENTER) ใช่หรือไม่?')) return;

    setIsSavingLogo(true);
    try {
      const updatedConfigs = {
        ...configs,
        logoUrl: ''
      };

      await saveMasterData(updatedConfigs);
      setConfigs(updatedConfigs);
      localStorage.removeItem('pasaya_app_logo_url');

      showToast('รีเซ็ตโลโก้เป็นแบบเริ่มต้นเรียบร้อยแล้ว', 'success');

      await saveUserLog(
        'admin_config_update',
        activeUser.name,
        'รีเซ็ตโลโก้แอปพลิเคชันกลับเป็นค่าเริ่มต้น'
      );
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถลบโลโก้ได้', 'error');
    } finally {
      setIsSavingLogo(false);
    }
  };

  useEffect(() => {
    async function loadAdminData() {
      try {
        setIsLoading(true);
        const data = await getMasterData();
        setConfigs(data);
      } catch (err) {
        console.error(err);
        showToast('ไม่สามารถโหลดมาสเตอร์ข้อมูลได้', 'error');
      } finally {
        setIsLoading(false);
      }
    }
    loadAdminData();
  }, []);

  // ADD item for standard string arrays
  const handleAddItem = async () => {
    if (!configs) return;
    const isFabric = activeConfigCategory === 'fabrics';
    const trimmed = isFabric ? newItemText.trim().toUpperCase() : newItemText.trim();
    if (!trimmed) {
      showToast('กรุณากรอกข้อความ', 'error');
      return;
    }

    const currentList = configs[activeConfigCategory] as string[] || [];
    if (currentList.includes(trimmed)) {
      showToast('รายการนี้มีอยู่แล้วในระบบ', 'error');
      return;
    }

    let updatedList = [...currentList, trimmed];
    if (isFabric) {
      updatedList = updatedList.sort((a, b) => a.localeCompare(b, 'en'));
    }
    const updatedConfigs = {
      ...configs,
      [activeConfigCategory]: updatedList
    };

    try {
      await saveMasterData(updatedConfigs);
      setConfigs(updatedConfigs);
      setNewItemText('');
      showToast('เพิ่มรายการข้อมูลเรียบร้อยแล้ว', 'success');
      
      // Log Action
      await saveUserLog(
        'admin_config_update',
        activeUser.name,
        `เพิ่มมาสเตอร์ข้อมูลในกลุ่ม ${getCategoryLabel(activeConfigCategory)}: "${trimmed}"`
      );
    } catch (err) {
      showToast('ไม่สามารถบันทึกข้อมูลได้', 'error');
    }
  };

  // EDIT item for standard string arrays
  const handleSaveEditItem = async (indexToEdit: number) => {
    if (!configs) return;
    const isFabric = activeConfigCategory === 'fabrics';
    const trimmed = isFabric ? editingText.trim().toUpperCase() : editingText.trim();
    if (!trimmed) {
      showToast('กรุณากรอกข้อความ', 'error');
      return;
    }

    let currentList = [...(configs[activeConfigCategory] as string[] || [])];
    const oldVal = currentList[indexToEdit];
    currentList[indexToEdit] = trimmed;

    if (isFabric) {
      currentList = currentList.sort((a, b) => a.localeCompare(b, 'en'));
    }

    const updatedConfigs = {
      ...configs,
      [activeConfigCategory]: currentList
    };

    try {
      await saveMasterData(updatedConfigs);
      setConfigs(updatedConfigs);
      setEditingIndex(null);
      setEditingText('');
      showToast('แก้ไขข้อมูลเรียบร้อยแล้ว', 'success');

      // Log Action
      await saveUserLog(
        'admin_config_update',
        activeUser.name,
        `แก้ไขมาสเตอร์ข้อมูลในกลุ่ม ${getCategoryLabel(activeConfigCategory)}: จาก "${oldVal}" เป็น "${trimmed}"`
      );
    } catch (err) {
      showToast('ไม่สามารถอัปเดตข้อมูลได้', 'error');
    }
  };

  // DELETE item for standard string arrays
  const handleDeleteItem = async (itemToDelete: string) => {
    if (!configs) return;
    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะลบรายการ "${itemToDelete}"?`)) return;

    const currentList = configs[activeConfigCategory] as string[] || [];
    const updatedList = currentList.filter(item => item !== itemToDelete);
    
    const updatedConfigs = {
      ...configs,
      [activeConfigCategory]: updatedList
    };

    try {
      await saveMasterData(updatedConfigs);
      setConfigs(updatedConfigs);
      showToast('ลบรายการข้อมูลเรียบร้อยแล้ว', 'success');

      // Log Action
      await saveUserLog(
        'admin_config_update',
        activeUser.name,
        `ลบมาสเตอร์ข้อมูลในกลุ่ม ${getCategoryLabel(activeConfigCategory)}: "${itemToDelete}"`
      );
    } catch (err) {
      showToast('ไม่สามารถลบข้อมูลได้', 'error');
    }
  };

  // --- Employee Accounts Management Logic ---
  const handleSaveEmployeeAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configs) return;

    const nameTrimmed = empName.trim();
    const userTrimmed = empUsername.trim().toLowerCase();
    const passTrimmed = empPassword.trim();

    if (!nameTrimmed || !userTrimmed || !passTrimmed) {
      showToast('กรุณากรอกข้อมูลพนักงานให้ครบถ้วน', 'error');
      return;
    }

    const accounts = [...(configs.employeeAccounts || [])];

    // Check duplicate username (exclude currently editing account)
    const isDuplicateUser = accounts.some(acc => acc.username === userTrimmed && acc.id !== editingEmployeeId);
    if (isDuplicateUser) {
      showToast('ชื่อผู้ใช้ (username) นี้มีอยู่ในระบบแล้ว', 'error');
      return;
    }

    let updatedAccounts: EmployeeUser[] = [];
    let logDetail = '';

    if (editingEmployeeId) {
      // Edit mode
      updatedAccounts = accounts.map(acc => {
        if (acc.id === editingEmployeeId) {
          logDetail = `แก้ไขข้อมูลพนักงาน "${acc.name}" -> ชื่อ: "${nameTrimmed}", Username: "${userTrimmed}", สิทธิ์: "${empRole}"`;
          return {
            ...acc,
            name: nameTrimmed,
            username: userTrimmed,
            password: passTrimmed,
            role: empRole
          };
        }
        return acc;
      });
      showToast('แก้ไขข้อมูลพนักงานเรียบร้อยแล้ว', 'success');
    } else {
      // Create mode
      const newId = `emp-${Date.now()}`;
      const newAcc: EmployeeUser = {
        id: newId,
        name: nameTrimmed,
        username: userTrimmed,
        password: passTrimmed,
        role: empRole
      };
      updatedAccounts = [...accounts, newAcc];
      logDetail = `เพิ่มพนักงานใหม่ "${nameTrimmed}" (Username: "${userTrimmed}", สิทธิ์: "${empRole}")`;
      showToast('เพิ่มพนักงานคนใหม่เข้าสู่ระบบเรียบร้อยแล้ว', 'success');
    }

    // Keep configs.employees aligned with names
    const updatedNames = updatedAccounts.map(acc => acc.name);

    const updatedConfigs: MasterDataConfigs = {
      ...configs,
      employees: updatedNames,
      employeeAccounts: updatedAccounts
    };

    try {
      await saveMasterData(updatedConfigs);
      setConfigs(updatedConfigs);
      
      // Reset form states
      setEditingEmployeeId(null);
      setEmpName('');
      setEmpUsername('');
      setEmpPassword('');
      setEmpRole('staff');

      // Save log
      await saveUserLog('admin_config_update', activeUser.name, logDetail);
    } catch (err) {
      showToast('ไม่สามารถบันทึกข้อมูลพนักงานได้', 'error');
    }
  };

  const handleEditEmployeeClick = (emp: EmployeeUser) => {
    setEditingEmployeeId(emp.id);
    setEmpName(emp.name);
    setEmpUsername(emp.username);
    setEmpPassword(emp.password || '');
    setEmpRole(emp.role);
  };

  const handleDeleteEmployee = async (emp: EmployeeUser) => {
    if (!configs) return;
    if (emp.id === activeUser.id) {
      showToast('คุณไม่สามารถลบบัญชีที่คุณกำลังใช้งานอยู่ได้', 'error');
      return;
    }

    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะลบบัญชีพนักงาน "${emp.name}" ออกจากระบบ?`)) return;

    const accounts = [...(configs.employeeAccounts || [])];
    const updatedAccounts = accounts.filter(acc => acc.id !== emp.id);
    const updatedNames = updatedAccounts.map(acc => acc.name);

    const updatedConfigs: MasterDataConfigs = {
      ...configs,
      employees: updatedNames,
      employeeAccounts: updatedAccounts
    };

    try {
      await saveMasterData(updatedConfigs);
      setConfigs(updatedConfigs);
      showToast('ลบบัญชีพนักงานเรียบร้อยแล้ว', 'success');

      // Reset editing states if deleted item was being edited
      if (editingEmployeeId === emp.id) {
        setEditingEmployeeId(null);
        setEmpName('');
        setEmpUsername('');
        setEmpPassword('');
        setEmpRole('staff');
      }

      await saveUserLog(
        'admin_config_update',
        activeUser.name,
        `ลบบัญชีพนักงาน: "${emp.name}" (Username: "${emp.username}")`
      );
    } catch (err) {
      showToast('ไม่สามารถลบบัญชีพนักงานได้', 'error');
    }
  };

  // --- Photos Management Logic ---
  const handleDeletePhotoWithLog = async (photo: SavedPhotoItem) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะลบรูปภาพโครงการ "${photo.villageName}" (${photo.fileName})?`)) {
      return;
    }

    try {
      await deletePhoto(photo.id);
      onPhotosUpdated();
      showToast('ลบรูปภาพผลงานติดตั้งเรียบร้อยแล้ว', 'success');

      // Log Action
      await saveUserLog(
        'delete',
        activeUser.name,
        `ลบผลงานติดตั้ง โครงการ: "${photo.villageName}" (${photo.fileName})`
      );
    } catch (err) {
      showToast('ไม่สามารถลบผลงานติดตั้งได้', 'error');
    }
  };

  const getCategoryLabel = (cat: keyof MasterDataConfigs) => {
    switch (cat) {
      case 'employees': return 'รายชื่อพนักงาน';
      case 'curtainStyles': return 'รูปแบบทรงผ้าม่าน';
      case 'hashtags': return 'ประเภท Hashtag';
      case 'houseTypes': return 'ประเภทบ้าน';
      case 'developers': return 'ผู้พัฒนา (Developer)';
      case 'fabrics': return 'รายชื่อชื่อผ้า (Fabrics)';
      case 'logoUrl': return 'โลโก้แอปพลิเคชัน';
      case 'cloudinaryEnabled': return 'เชื่อมต่อระบบฝากรูป (Cloudinary)';
      default: return cat;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <span className="text-sm font-medium text-slate-500 ml-2">กำลังโหลดหน้าจัดการระบบ...</span>
      </div>
    );
  }

  return (
    <div id="admin-panel-container" className="max-w-5xl mx-auto space-y-6 pb-20">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 flex items-center gap-2">
          <Settings className="text-indigo-600 animate-spin-slow" size={24} />
          ระบบจัดการสำหรับผู้ใช้และแอดมิน (Admin Control)
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          ปรับแต่งรายชื่อพนักงาน ข้อมูลสเปกผ้าม่าน ข้อมูลตั้งต้น และแก้ไขหรือจัดการคลังรูปภาพผลงานทั้งหมดออนไลน์ร่วมกัน
        </p>
      </div>

      {/* Current Operator Status Bar */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-[24px] p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
            <UserCheck size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black">ผู้ใช้งานปัจจุบัน: {activeUser.name}</h3>
            <p className="text-[11px] text-white/80">
              ประเภทบัญชี: <span className="bg-white/20 px-2 py-0.5 rounded font-bold uppercase text-[10px]">{activeUser.role}</span>
            </p>
          </div>
        </div>
        <div className="text-[11px] text-white/70 bg-black/15 px-4 py-2 rounded-xl border border-white/10">
          * มีสิทธิ์การใช้งานแอดมินสูงสุด สามารถจัดเก็บ แก้ไข ลบ และดูรายงานประวัติพนักงานได้ครบถ้วน
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => {
            setActiveSubTab('configs');
            setEditingIndex(null);
          }}
          className={`px-5 py-3.5 font-bold text-sm border-b-2 transition-all duration-300 flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'configs'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/10'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          style={{ minHeight: '48px' }}
        >
          <Sliders size={16} />
          แก้ไขตัวเลือกตั้งต้น (Master Data)
        </button>
        <button
          onClick={() => setActiveSubTab('photos')}
          className={`px-5 py-3.5 font-bold text-sm border-b-2 transition-all duration-300 flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'photos'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/10'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          style={{ minHeight: '48px' }}
        >
          <ImageIcon size={16} />
          จัดการภาพผลงานทั้งหมด ({photos.length})
        </button>
        <button
          onClick={() => setActiveSubTab('likes_report')}
          className={`px-5 py-3.5 font-bold text-sm border-b-2 transition-all duration-300 flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'likes_report'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/10'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          style={{ minHeight: '48px' }}
        >
          <Heart size={16} className="text-rose-500" />
          รายงานการกดถูกใจผลงาน (Likes Report)
        </button>
      </div>

      {/* Content Area */}
      {activeSubTab === 'configs' && configs && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Categories select (Left 4 cols) */}
          <div className="md:col-span-4 space-y-2">
            <p className="text-xs font-bold text-slate-400 px-1 uppercase tracking-wider">เลือกกลุ่มข้อมูลมาสเตอร์</p>
            <div className="bg-white/50 backdrop-blur-xl border border-white/40 rounded-[24px] p-2.5 shadow-lg space-y-1">
              {([
                { key: 'employees', icon: Users, color: 'text-amber-500' },
                { key: 'curtainStyles', icon: Sliders, color: 'text-indigo-500' },
                { key: 'hashtags', icon: Hash, color: 'text-rose-500' },
                { key: 'houseTypes', icon: Home, color: 'text-emerald-500' },
                { key: 'developers', icon: Building, color: 'text-sky-500' },
                { key: 'fabrics', icon: Tag, color: 'text-violet-500' },
                { key: 'logoUrl', icon: ImageIcon, color: 'text-purple-500' },
                { key: 'cloudinaryEnabled', icon: Upload, color: 'text-sky-500' }
              ] as const).map((item) => {
                const Icon = item.icon;
                const isSelected = activeConfigCategory === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setActiveConfigCategory(item.key);
                      setNewItemText('');
                      setEditingIndex(null);
                      setEditingEmployeeId(null);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                    style={{ minHeight: '44px' }}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={16} className={isSelected ? 'text-white' : item.color} />
                      <span>{getCategoryLabel(item.key)}</span>
                    </div>
                    <ChevronRight size={14} className={isSelected ? 'text-white/80' : 'text-slate-300'} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* List display & add form (Right 8 cols) */}
          <div className="md:col-span-8 space-y-4">
            
            {/* RENDER EMPLOYEE ACCOUNT SPECIFIC VIEW */}
            {activeConfigCategory === 'employees' ? (
              <div className="bg-white/50 backdrop-blur-xl border border-white/40 rounded-[32px] p-6 shadow-xl space-y-6">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/50">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Users className="text-amber-500" size={18} />
                    จัดการบัญชีรายชื่อพนักงาน ({configs.employeeAccounts?.length || 0})
                  </h3>
                  <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2.5 py-1 rounded-full">
                    แอดมิน พนักงาน และผู้เยี่ยมชม
                  </span>
                </div>

                {/* Form to Add / Edit Employee Account */}
                <form onSubmit={handleSaveEmployeeAccount} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-4 shadow-inner">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-3 bg-amber-500 rounded-full" />
                    {editingEmployeeId ? '✏️ แก้ไขข้อมูลพนักงาน' : '➕ เพิ่มพนักงานและผู้ใช้ใหม่'}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Name */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">ชื่อ-นามสกุลพนักงาน *</label>
                      <input
                        type="text"
                        required
                        value={empName}
                        onChange={(e) => setEmpName(e.target.value)}
                        placeholder="เช่น สมชาย มีสุข"
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>

                    {/* Username */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">ชื่อผู้ใช้ (Username) *</label>
                      <input
                        type="text"
                        required
                        value={empUsername}
                        onChange={(e) => setEmpUsername(e.target.value)}
                        placeholder="ภาษาอังกฤษตัวเล็กเท่านั้น เช่น somsak"
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>

                    {/* Password */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">รหัสผ่าน (Password) *</label>
                      <input
                        type="text"
                        required
                        value={empPassword}
                        onChange={(e) => setEmpPassword(e.target.value)}
                        placeholder="รหัสผ่านเข้าใช้งาน เช่น 1234"
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>

                    {/* Role */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">สิทธิ์ / ประเภทการใช้งาน *</label>
                      <select
                        value={empRole}
                        onChange={(e) => setEmpRole(e.target.value as any)}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
                      >
                        <option value="admin">แอดมิน (Admin) - จัดการได้ทุกสิ่ง</option>
                        <option value="staff">พนักงาน (Staff) - อัปโหลดและแก้ไขของตัวเอง</option>
                        <option value="visitor">ผู้เยี่ยมชม (Visitor) - ดูและดาวน์โหลดอย่างเดียว</option>
                      </select>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/50">
                    {editingEmployeeId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEmployeeId(null);
                          setEmpName('');
                          setEmpUsername('');
                          setEmpPassword('');
                          setEmpRole('staff');
                        }}
                        className="h-9 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-all"
                      >
                        ยกเลิก
                      </button>
                    )}
                    <button
                      type="submit"
                      className="h-9 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      <Save size={13} />
                      {editingEmployeeId ? 'อัปเดตข้อมูล' : 'บันทึกพนักงานใหม่'}
                    </button>
                  </div>
                </form>

                {/* Employees Accounts List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400">รายชื่อผู้ใช้ที่ลงทะเบียนแล้วในระบบ:</h4>
                  
                  <div className="border border-slate-150 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white shadow-sm">
                    {configs.employeeAccounts?.map((emp) => {
                      const isCurrentUser = emp.id === activeUser.id;
                      return (
                        <div key={emp.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{emp.name}</span>
                              {isCurrentUser && (
                                <span className="text-[9px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                                  คุณ (You)
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                              <span>Username: <b className="font-semibold text-slate-800">{emp.username}</b></span>
                              <span>•</span>
                              <span>Password: <b className="font-semibold text-slate-800">{emp.password}</b></span>
                              <span>•</span>
                              <span className={`inline-flex items-center font-extrabold rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider
                                ${emp.role === 'admin' ? 'bg-red-50 text-red-600 border border-red-200/50' : ''}
                                ${emp.role === 'staff' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/50' : ''}
                                ${emp.role === 'visitor' ? 'bg-amber-50 text-amber-600 border border-amber-200/50' : ''}
                              `}>
                                {emp.role === 'admin' ? 'แอดมิน (Admin)' : emp.role === 'staff' ? 'พนักงาน (Staff)' : 'ผู้เยี่ยมชม (Visitor)'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleEditEmployeeClick(emp)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold"
                              title="แก้ไขข้อมูลพนักงาน"
                            >
                              <FileEdit size={14} />
                              แก้ไข
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEmployee(emp)}
                              disabled={isCurrentUser}
                              className={`p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold
                                ${isCurrentUser ? 'opacity-30 cursor-not-allowed' : ''}
                              `}
                              title="ลบพนักงาน"
                            >
                              <Trash2 size={14} />
                              ลบออก
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-amber-50/50 border border-amber-200/50 rounded-xl p-3.5 flex gap-2.5 text-[11px] text-amber-800 leading-relaxed">
                  <ShieldAlert size={16} className="text-amber-600 flex-shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <b>สิทธิ์การทำรายการ:</b> แอดมินมีสิทธิ์เพิ่ม ลบ และแก้ไขทุกอย่าง พนักงานสามารถอัปโหลดและลบงานได้เฉพาะของตนเอง ส่วนผู้เยี่ยมชมจะไม่เห็นแท็บอัปโหลด และสามารถดาวน์โหลดดูผลงานได้อย่างเดียว โดยระบบเก็บประวัติการกระทำ (User Log) ของทุกคนตลอด 24 ชม.
                  </div>
                </div>

              </div>
            ) : activeConfigCategory === 'logoUrl' ? (
              /* RENDER APPLICATION LOGO UPLOADER */
              <div className="bg-white/50 backdrop-blur-xl border border-white/40 rounded-[32px] p-6 shadow-xl space-y-6">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/50">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <ImageIcon className="text-purple-500" size={18} />
                    โลโก้แอปพลิเคชัน (Application Logo)
                  </h3>
                  <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200/50 font-bold px-2.5 py-1 rounded-full">
                    กำหนดแบรนด์ของคุณเอง
                  </span>
                </div>

                {/* Info block */}
                <p className="text-xs text-slate-500 leading-relaxed">
                  แอดมินสามารถอัปโหลดไฟล์รูปภาพโลโก้ของร้านหรือบริษัทคุณเอง เพื่อแสดงแทนโลโก้เริ่มต้นของระบบ ระบบจะทำการย่อและบีบอัดภาพให้อัตโนมัติ เพื่อประหยัดพื้นที่จัดเก็บข้อมูลแบบถาวรและเปิดหน้าเว็บได้รวดเร็วขึ้น
                </p>

                {/* Previews and Control Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left: Current Logo Box */}
                  <div className="p-5 bg-slate-50/50 border border-slate-200/60 rounded-2xl flex flex-col items-center justify-center space-y-4">
                    <h4 className="text-xs font-black text-slate-500 tracking-wide uppercase">โลโก้แอปที่ใช้ปัจจุบัน</h4>
                    
                    {/* Visual box showing logo */}
                    <div className="relative w-36 h-36 bg-white rounded-2xl shadow-md border border-slate-200/60 flex items-center justify-center overflow-hidden group">
                      <Logo size={120} bgColor="" className="transition-all duration-300" />
                      
                      {/* Badge in box */}
                      <span className="absolute bottom-2.5 px-2 py-0.5 rounded bg-black/50 text-white font-bold text-[9px] select-none tracking-wider uppercase">
                        {configs.logoUrl ? 'โลโก้กำหนดเอง' : 'โลโก้ระบบ'}
                      </span>
                    </div>

                    {/* Reset Button if Custom */}
                    {configs.logoUrl && (
                      <button
                        type="button"
                        onClick={handleResetLogo}
                        disabled={isSavingLogo}
                        className="px-3.5 py-2 rounded-xl bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors text-xs font-bold cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                        รีเซ็ตกลับเป็นโลโก้เริ่มต้น
                      </button>
                    )}
                  </div>

                  {/* Right: Upload Dropzone */}
                  <div className="flex flex-col justify-between space-y-4">
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={async (e) => {
                        e.preventDefault();
                        if (isSavingLogo) return;
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          const file = e.dataTransfer.files[0];
                          if (file.type.startsWith('image/')) {
                            await handleLogoUpload(file);
                          } else {
                            showToast('กรุณาเลือกไฟล์รูปภาพเท่านั้น', 'error');
                          }
                        }
                      }}
                      onClick={() => !isSavingLogo && logoInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center transition-all duration-300 cursor-pointer group h-full min-h-[140px]
                        ${isSavingLogo 
                          ? 'border-slate-300 bg-slate-50 cursor-not-allowed opacity-60' 
                          : 'border-purple-300 hover:border-purple-500 bg-purple-50/5 hover:bg-purple-50/20'
                        }
                      `}
                    >
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            await handleLogoUpload(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                        disabled={isSavingLogo}
                      />

                      {isSavingLogo ? (
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Loader2 className="animate-spin text-purple-600" size={24} />
                          <p className="text-xs font-bold text-slate-600">กำลังบันทึกและซิงก์โลโก้ใหม่...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="w-10 h-10 rounded-xl bg-purple-100 group-hover:bg-purple-200 flex items-center justify-center text-purple-600 transition-all duration-300 shadow-sm">
                            <Upload size={18} />
                          </div>
                          <p className="text-xs font-bold text-slate-800 mt-3">ลากไฟล์รูปภาพมาวาง หรือคลิกเพื่ออัปโหลด</p>
                          <p className="text-[10px] text-slate-400 mt-1">แนะนำไฟล์สี่เหลี่ยมจัตุรัส .png, .jpg ขนาดไม่เกิน 2MB</p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Storage integrity guide */}
                <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 flex gap-2.5 text-[11px] text-slate-500 leading-relaxed">
                  <Info size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <b>ระบบความมั่นคงแบบไฮบริดคลาวด์:</b> โลโก้ที่ถูกอัปโหลดจะถูกเซฟอย่างปลอดภัยบนระบบฐานข้อมูล Firestore และแคชไว้บนเครื่องผู้ใช้อื่นทุกคนในเครือข่ายเรียลไทม์ทันที ทำให้ไม่จำเป็นต้องรอดาวน์โหลดไฟล์ซ้ำทุกครั้งที่เข้าหน้าเว็บ
                  </div>
                </div>

              </div>
            ) : activeConfigCategory === 'cloudinaryEnabled' ? (
              /* RENDER CLOUDINARY CONFIGURATION PANEL */
              <div className="bg-white/50 backdrop-blur-xl border border-white/40 rounded-[32px] p-6 shadow-xl space-y-6">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/50">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Upload className="text-sky-500" size={18} />
                    เชื่อมต่อระบบฝากรูปผ่าน Cloudinary
                  </h3>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                    clEnabled 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}>
                    {clEnabled ? '● เปิดใช้งานระบบคลาวด์' : '○ บันทึกลงฐานข้อมูลตรง'}
                  </span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  โดยปกติแอปพลิเคชันจะจัดเก็บภาพถ่ายผ้าม่านแบบ Base64 ลงในฐานข้อมูล Firestore โดยตรง ซึ่งจะมีความจำจำกัด (ไม่เกิน 1MB ต่อภาพ) และอาจเกิดปัญหาพื้นที่เต็มได้อย่างรวดเร็ว 
                  คุณสามารถเปิดใช้งาน <b>Cloudinary</b> เพื่ออัปโหลดและเก็บภาพบนคลาวด์ฟรีระดับมืออาชีพ แทนการเก็บข้อมูลบน Firestore โดยตรง
                </p>

                {/* Form */}
                <form onSubmit={handleSaveCloudinary} className="space-y-4">
                  {/* Toggle Enable */}
                  <div className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-200/60 rounded-2xl">
                    <div>
                      <h4 className="text-xs font-black text-slate-800">เปิดใช้งานระบบจัดเก็บคลาวด์ (Cloudinary Hosting)</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">เปิดเพื่ออัปโหลดไฟล์ไปที่บัญชี Cloudinary ของคุณเพื่อความจุไม่จำกัด</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={clEnabled}
                        onChange={(e) => setClEnabled(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                    </label>
                  </div>

                  {clEnabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                      {/* Cloud Name */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">Cloud Name *</label>
                        <input
                          type="text"
                          required={clEnabled}
                          value={clCloudName}
                          onChange={(e) => setClCloudName(e.target.value)}
                          placeholder="เช่น fyouajy1"
                          className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                        />
                        <p className="text-[9px] text-slate-400">ชื่อบัญชี Cloudinary ของคุณ</p>
                      </div>

                      {/* Upload Preset */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">Unsigned Upload Preset *</label>
                        <input
                          type="text"
                          required={clEnabled}
                          value={clUploadPreset}
                          onChange={(e) => setClUploadPreset(e.target.value)}
                          placeholder="เช่น ml_default"
                          className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                        />
                        <p className="text-[9px] text-slate-400">ต้องเป็นแบบ <b>Unsigned</b> สำหรับอัปโหลดตรงจากเบราว์เซอร์</p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="h-10 px-6 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-sky-100 transition-all cursor-pointer hover:scale-101"
                    >
                      <Save size={14} />
                      บันทึกการเชื่อมต่อคลาวด์
                    </button>
                  </div>
                </form>

                {/* Cloudinary Step-by-Step Guide */}
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Info size={14} className="text-sky-500" />
                    วิธีการตั้งค่าเพื่อให้แอปอัปโหลดได้สำเร็จ:
                  </div>
                  <ol className="list-decimal pl-5 space-y-1.5 text-[11px] text-slate-500 leading-relaxed">
                    <li>เข้าสู่ระบบบัญชี <a href="https://cloudinary.com" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline font-bold">Cloudinary</a> ของคุณ</li>
                    <li>ที่หน้า Console คัดลอก <b>Cloud name</b> มาใส่ในช่องด้านบน (ของคุณคือ <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">fyouajy1</code>)</li>
                    <li>ไปที่ <b>Settings (ฟันเฟืองล่างซ้าย)</b> &gt; เลือกแถบ <b>Upload</b></li>
                    <li>เลื่อนลงไปที่หัวข้อ <b>Upload presets</b> และคลิก <b>Add upload preset</b></li>
                    <li>ตั้งชื่อ Preset (หรือใช้ชื่อที่ระบบให้มา เช่น <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">ml_default</code>)</li>
                    <li><b>สำคัญมาก:</b> เปลี่ยนค่า <b>Signing Mode</b> จาก <span className="font-semibold text-amber-600">Signed</span> เป็น <span className="font-semibold text-emerald-600">Unsigned</span></li>
                    <li>กดปุ่ม <b>Save (บันทึก)</b> แถบสีส้มด้านบนขวา แล้วคัดลอกชื่อ Preset มาใส่ที่ช่องด้านบน</li>
                  </ol>
                </div>

              </div>
            ) : (
              /* RENDER OTHER MASTER DATA CONFIGS (WITH INLINE EDITING) */
              <div className="bg-white/50 backdrop-blur-xl border border-white/40 rounded-[32px] p-6 shadow-xl space-y-5">
                
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                    แก้ไข: {getCategoryLabel(activeConfigCategory)}
                  </h3>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
                    จำนวน {configs[activeConfigCategory]?.length || 0} รายการ
                  </span>
                </div>

                {/* Add form */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    placeholder={`กรอกข้อมูลใหม่ เพื่อเพิ่มลงในกลุ่ม ${getCategoryLabel(activeConfigCategory)}`}
                    className="flex-1 h-11 px-4 rounded-xl border border-slate-200 bg-white/50 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-slate-400"
                  />
                  <button
                    onClick={handleAddItem}
                    className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5 transition-all text-xs font-bold shadow-md cursor-pointer hover:scale-101"
                  >
                    <Plus size={16} />
                    <span>เพิ่มรายการ</span>
                  </button>
                </div>

                {/* Master item list */}
                <div className="border border-slate-150 rounded-2xl overflow-hidden bg-white/40 divide-y divide-slate-100/50 max-h-96 overflow-y-auto shadow-inner">
                  {(configs[activeConfigCategory] as string[])?.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 font-medium">ยังไม่มีรายการข้อมูลในกลุ่มนี้</div>
                  ) : (
                    (configs[activeConfigCategory] as string[])?.map((item, index) => {
                      const isEditingThis = editingIndex === index;
                      return (
                        <div 
                          key={`${item}-${index}`} 
                          className="flex items-center justify-between p-3.5 hover:bg-slate-50/50 transition-colors"
                        >
                          {isEditingThis ? (
                            <div className="flex-1 flex gap-2 mr-4">
                              <input
                                type="text"
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="flex-1 h-9 px-3 rounded-lg border border-indigo-300 bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                              <button
                                onClick={() => handleSaveEditItem(index)}
                                className="w-9 h-9 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 flex items-center justify-center cursor-pointer transition-colors"
                                title="บันทึก"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingIndex(null);
                                  setEditingText('');
                                }}
                                className="w-9 h-9 rounded-lg bg-slate-150 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition-colors"
                                title="ยกเลิก"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-slate-700">{item}</span>
                          )}

                          {!isEditingThis && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingIndex(index);
                                  setEditingText(item);
                                }}
                                className="w-8 h-8 rounded-lg text-indigo-500 hover:bg-indigo-50 flex items-center justify-center transition-colors cursor-pointer"
                                title="แก้ไขข้อมูลนี้"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item)}
                                className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                                title="ลบข้อมูล"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 flex gap-2 text-[11px] text-slate-500 leading-relaxed select-none">
                  <Info size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                  <span>การเปลี่ยนแปลงมาสเตอร์ข้อมูลจะมีผลเรียลไทม์กับผู้ใช้งานทุกคนที่กำลังทำรายการอยู่ในระบบ</span>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Showcase Photos Admin area */}
      {activeSubTab === 'photos' && (
        <div className="bg-white/50 backdrop-blur-xl border border-white/40 rounded-[32px] p-6 shadow-xl space-y-4">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-indigo-500 rounded-full" />
              รายการภาพผลงานติดตั้งทั้งหมดในระบบ
            </h2>
            <span className="text-[11px] font-bold text-slate-400">เรียงตามวันที่อัปโหลดล่าสุด</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 font-medium">ไม่พบรายการรูปภาพในระบบ</div>
            ) : (
              photos.map((photo) => (
                <div key={photo.id} className="border border-slate-100 rounded-2xl overflow-hidden bg-white/40 hover:bg-white/70 shadow-sm hover:shadow-md transition-all flex flex-col">
                  {/* Photo Thumbnail */}
                  <div className="relative aspect-[4/3] bg-slate-100">
                    <img 
                      src={photo.url} 
                      alt="installation portfolio" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-black/50 text-white text-[9px] font-bold backdrop-blur-sm">
                      {photo.villageName}
                    </div>
                  </div>

                  {/* Photo Details */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{photo.developer}</span>
                        <span className="text-[9px] text-slate-400 font-medium">
                          {new Date(photo.uploadedAt).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <div className="text-xs font-bold text-slate-800 line-clamp-1">
                        รูปแบบ: {photo.curtainStyle}
                      </div>

                      {/* Fabric names */}
                      <div className="flex flex-wrap gap-1">
                        {photo.fabricDetails.map((fab, i) => (
                          <span key={i} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100/40">
                            {fab.name} / {fab.color}
                          </span>
                        ))}
                      </div>

                      {/* Responsible Employee */}
                      {photo.employee && (
                        <div className="text-[10px] text-slate-400 font-medium">
                          พนักงานผู้รับผิดชอบ: <span className="text-slate-600 font-bold">{photo.employee}</span>
                        </div>
                      )}
                    </div>

                    {/* Delete and Action buttons */}
                    <div className="pt-2 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={() => handleDeletePhotoWithLog(photo)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200/50 hover:bg-red-50 text-red-600 hover:text-red-700 text-xs font-bold transition-all cursor-pointer"
                      >
                        <Trash2 size={13} />
                        ลบภาพผลงาน
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Likes Report Area */}
      {activeSubTab === 'likes_report' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {/* Summary Dashboard cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Liked Photos */}
            <div className="bg-white/50 backdrop-blur-xl border border-white/40 p-5 rounded-[24px] shadow-lg flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
                <Heart size={20} className="fill-rose-500 text-rose-500 animate-pulse" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ผลงานที่ถูกใจ</p>
                <h3 className="text-xl font-extrabold text-slate-950 mt-0.5">{likedPhotos.length} <span className="text-xs font-bold text-slate-400">ภาพ</span></h3>
              </div>
            </div>

            {/* Total Likes */}
            <div className="bg-white/50 backdrop-blur-xl border border-white/40 p-5 rounded-[24px] shadow-lg flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500">
                <Users size={20} className="text-indigo-500" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">จำนวนการกดไลก์รวม</p>
                <h3 className="text-xl font-extrabold text-slate-950 mt-0.5">{totalLikesCount} <span className="text-xs font-bold text-slate-400">ครั้ง</span></h3>
              </div>
            </div>

            {/* Top Liker */}
            <div className="bg-white/50 backdrop-blur-xl border border-white/40 p-5 rounded-[24px] shadow-lg flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
                <UserCheck size={20} className="text-amber-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">พนักงานที่กดไลก์เยอะสุด</p>
                <h3 className="text-xs font-black text-slate-950 truncate mt-0.5" title={likerStats.name}>
                  {likerStats.name.split(' ')[0]}
                </h3>
                <p className="text-[9px] text-slate-400 font-bold leading-none mt-0.5">กดไป {likerStats.count} ครั้ง</p>
              </div>
            </div>

            {/* Most popular photo */}
            <div className="bg-white/50 backdrop-blur-xl border border-white/40 p-5 rounded-[24px] shadow-lg flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500">
                <ImageIcon size={20} className="text-emerald-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ผลงานยอดนิยมสูงสุด</p>
                <h3 className="text-xs font-black text-slate-950 truncate mt-0.5" title={mostPopularPhoto.photo?.villageName || 'ไม่มีข้อมูล'}>
                  {mostPopularPhoto.photo ? mostPopularPhoto.photo.villageName : 'ไม่มีข้อมูล'}
                </h3>
                <p className="text-[9px] text-slate-400 font-bold leading-none mt-0.5">
                  {mostPopularPhoto.photo ? `ได้รับ ${mostPopularPhoto.count} ไกลก์` : 'ไม่มีไลก์'}
                </p>
              </div>
            </div>

          </div>

          {/* Sub Navigation Tabs for Report */}
          <div className="bg-white/50 backdrop-blur-xl border border-white/40 rounded-[32px] p-6 shadow-xl space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                <h2 className="text-xs font-black text-slate-950">
                  สถิติความสนใจรายพนักงานและผลงาน
                </h2>
              </div>
              
              {/* Toggle report mode */}
              <div className="inline-flex p-1 rounded-xl bg-slate-100/80">
                <button
                  type="button"
                  onClick={() => setLikesReportTab('by_photo')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                    likesReportTab === 'by_photo'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  ดูตามรูปผลงาน
                </button>
                <button
                  type="button"
                  onClick={() => setLikesReportTab('by_employee')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                    likesReportTab === 'by_employee'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  ดูตามรายพนักงาน
                </button>
              </div>
            </div>

            {/* Render sub-reports */}
            {likesReportTab === 'by_photo' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {likedPhotos.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-slate-400 text-xs font-bold">
                    ยังไม่มีพนักงานคนใดกดถูกใจผลงานภาพใดๆ ในระบบ
                  </div>
                ) : (
                  likedPhotos.map(photo => {
                    // Resolve employee names
                    const likers = (photo.likedBy || []).map(uid => {
                      const found = (configs?.employeeAccounts || []).find(acc => acc.id === uid || acc.username === uid);
                      return found ? found.name : uid;
                    });

                    return (
                      <div key={photo.id} className="border border-slate-100 rounded-2xl bg-white overflow-hidden flex flex-col shadow-sm">
                        <div className="relative aspect-[4/3] bg-slate-50">
                          <img 
                            src={photo.url} 
                            alt={photo.villageName} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-black/60 text-white text-[9px] font-bold backdrop-blur-sm">
                            {photo.villageName}
                          </div>
                        </div>
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                          <div className="space-y-1">
                            <div className="text-[10px] text-slate-400 font-bold uppercase">{photo.developer}</div>
                            <div className="text-xs font-black text-slate-800">ม่าน: {photo.curtainStyle}</div>
                            <div className="text-[10px] text-slate-500">ผู้ติดตั้ง: {photo.employee}</div>
                          </div>

                          <div className="pt-3 border-t border-slate-100">
                            <span className="text-[9px] font-black text-slate-400 block mb-1.5 uppercase">ผู้ที่กดถูกใจ ({likers.length})</span>
                            <div className="flex flex-wrap gap-1">
                              {likers.map((name, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-bold">
                                  <Heart size={8} className="fill-rose-500 text-rose-500" />
                                  {name.split(' ')[0]}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* By Employee Report with expanded details */
              <div className="space-y-3">
                {(configs?.employeeAccounts || []).map(employee => {
                  const employeeLikes = photos.filter(p => p.likedBy && p.likedBy.includes(employee.id || employee.username));
                  const isExpanded = expandedEmployeeId === employee.id;

                  return (
                    <div key={employee.id} className="border border-slate-150 rounded-2xl bg-white overflow-hidden shadow-sm">
                      <div 
                        onClick={() => setExpandedEmployeeId(isExpanded ? null : employee.id)}
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-indigo-50/10 transition-colors select-none"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-sm font-black uppercase">
                            {employee.name[0]}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900">{employee.name}</h4>
                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Username: {employee.username} | สิทธิ์: {employee.role}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-black">
                            <Heart size={10} className="fill-rose-500 text-rose-500" />
                            {employeeLikes.length} ไกลก์
                          </span>
                          <ChevronRight 
                            size={16} 
                            className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-90 text-indigo-600' : ''}`} 
                          />
                        </div>
                      </div>

                      {/* Expanded employee liked photos */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 bg-slate-50/30 border-t border-slate-100">
                          {employeeLikes.length === 0 ? (
                            <div className="py-6 text-center text-[10px] font-bold text-slate-400">
                              พนักงานคนนี้ยังไม่ได้กดถูกใจผลงานภาพใดๆ ในระบบ
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-3">
                              {employeeLikes.map(photo => (
                                <div key={photo.id} className="bg-white border border-slate-100 rounded-xl overflow-hidden flex flex-col shadow-sm">
                                  <div className="aspect-[4/3] bg-slate-100 relative">
                                    <img 
                                      src={photo.url} 
                                      alt={photo.villageName} 
                                      className="w-full h-full object-cover" 
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                  <div className="p-2 flex-1 flex flex-col justify-between">
                                    <div>
                                      <div className="text-[10px] font-black text-slate-800 truncate leading-tight">{photo.villageName}</div>
                                      <div className="text-[8px] text-slate-400 font-semibold truncate mt-0.5">{photo.curtainStyle}</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
