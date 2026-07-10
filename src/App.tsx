import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Loader2, 
  Heart, 
  FolderHeart, 
  CheckCircle2, 
  X,
  Plus,
  AlertCircle
} from 'lucide-react';
import { initDB, getAllPhotos, savePhoto, toggleLikePhoto, deletePhoto, saveUserLog, getMasterData } from './lib/db';
import { uploadToCloudinary } from './lib/cloudinary';
import { UploadProgress, COLOR_PRESETS, SavedPhotoItem, EmployeeUser } from './types';
import Sidebar from './components/Sidebar';
import PortfolioPage from './components/PortfolioPage';
import UploadPage from './components/UploadPage';
import AdminPage from './components/AdminPage';
import LogsPage from './components/LogsPage';
import Modal from './components/Modal';
import LoginModal from './components/LoginModal';
import Logo from './components/Logo';

interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

const DEFAULT_ADMIN_USER: EmployeeUser = {
  id: 'T58121',
  name: 'ผู้ดูแลระบบ',
  username: 'T58121',
  password: 'Admin',
  role: 'admin'
};

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [photos, setPhotos] = useState<SavedPhotoItem[]>([]);
  const [activeTab, setActiveTab] = useState<'showcase' | 'upload' | 'favorites' | 'admin' | 'logs'>(() => {
    const savedTab = localStorage.getItem('pasaya_active_tab');
    return (savedTab as any) || 'showcase';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Background upload tracking
  const [activeUploads, setActiveUploads] = useState<UploadProgress[]>([]);
  
  // Lightbox Modal state
  const [selectedPhoto, setSelectedPhoto] = useState<SavedPhotoItem | null>(null);

  // Floating notifications (Toasts)
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Authenticated Employee Session
  const [activeUser, setActiveUser] = useState<EmployeeUser | null>(() => {
    const saved = localStorage.getItem('pasaya_active_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.name === 'สมศักดิ์ รักดี (Somsak)' || parsed.id === 'T58121' || parsed.username === 'T58121')) {
          parsed.name = 'ผู้ดูแลระบบ';
          localStorage.setItem('pasaya_active_user', JSON.stringify(parsed));
        }
        return parsed;
      } catch (err) {
        return null;
      }
    }
    return null;
  });

  // Persist activeTab on change
  useEffect(() => {
    localStorage.setItem('pasaya_active_tab', activeTab);
  }, [activeTab]);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Initialize DB and fetch photos
  useEffect(() => {
    async function setupAndFetch() {
      try {
        await initDB();
        const allPhotos = await getAllPhotos();
        setPhotos(allPhotos);

        // Fetch master config to get/sync any custom uploaded logo
        try {
          const masterData = await getMasterData();
          if (masterData && masterData.logoUrl) {
            localStorage.setItem('pasaya_app_logo_url', masterData.logoUrl);
          } else {
            localStorage.removeItem('pasaya_app_logo_url');
          }
        } catch (err) {
          console.warn('Failed to load app logo config:', err);
        }

        setDbReady(true);
      } catch (err) {
        console.error('Failed to initialize database:', err);
        showToast('ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณารีเฟรชหน้าจอ', 'error');
      }
    }
    setupAndFetch();
  }, []);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const newToast: ToastNotification = {
      id: `toast-${Date.now()}-${Math.random()}`,
      message,
      type
    };
    setToasts(prev => [...prev, newToast]);
    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== newToast.id));
    }, 4000);
  };

  const handleLoginSuccess = (user: EmployeeUser) => {
    setActiveUser(user);
    localStorage.setItem('pasaya_active_user', JSON.stringify(user));
    
    // Auto redirect if current tab is restricted
    if (user.role === 'visitor' && (activeTab === 'upload' || activeTab === 'admin' || activeTab === 'logs')) {
      setActiveTab('showcase');
    } else if (user.role === 'staff' && (activeTab === 'admin' || activeTab === 'logs')) {
      setActiveTab('showcase');
    }
  };

  // Toggle Like Photo
  const handleToggleLike = async (id: string) => {
    if (!activeUser) {
      showToast('กรุณาเข้าสู่ระบบก่อนกดถูกใจผลงาน', 'error');
      return;
    }
    const userId = activeUser.id || activeUser.username;
    try {
      const isLiked = await toggleLikePhoto(id, userId);
      
      // Update local state instantly
      setPhotos(prev => prev.map(p => {
        if (p.id === id) {
          let likedBy = p.likedBy || [];
          if (likedBy.includes(userId)) {
            likedBy = likedBy.filter(uid => uid !== userId);
          } else {
            likedBy = [...likedBy, userId];
          }
          return { ...p, likedBy, isLiked: likedBy.length > 0 };
        }
        return p;
      }));
      
      // If modal lightbox is open on this photo, update its state too
      if (selectedPhoto && selectedPhoto.id === id) {
        setSelectedPhoto(prev => {
          if (!prev) return null;
          let likedBy = prev.likedBy || [];
          if (likedBy.includes(userId)) {
            likedBy = likedBy.filter(uid => uid !== userId);
          } else {
            likedBy = [...likedBy, userId];
          }
          return { ...prev, likedBy, isLiked: likedBy.length > 0 };
        });
      }

      showToast(isLiked ? 'เพิ่มผลงานนี้ไปยังรายการถูกใจแล้ว' : 'นำผลงานนี้ออกจากรายการถูกใจแล้ว', 'success');

      // Log action to Firestore
      const targetPhoto = photos.find(p => p.id === id);
      if (targetPhoto) {
        await saveUserLog(
          isLiked ? 'like' : 'unlike',
          activeUser.name,
          `${isLiked ? 'กดถูกใจ' : 'ยกเลิกถูกใจ'}ภาพผลงาน โครงการ: "${targetPhoto.villageName}"`
        );
      }
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถอัปเดตสถานะถูกใจได้', 'error');
    }
  };

  // Delete Photo with proper ownership role check
  const handleDeletePhoto = async (id: string) => {
    const targetPhoto = photos.find(p => p.id === id);
    if (!targetPhoto) return;

    if (!activeUser) {
      showToast('กรุณาเข้าสู่ระบบเพื่อดำเนินการลบภาพ', 'error');
      return;
    }

    // RBAC Permissions Enforcement
    if (activeUser.role === 'visitor') {
      showToast('ผู้เยี่ยมชม (Visitor) ไม่มีสิทธิ์ในการลบรูปภาพ', 'error');
      return;
    }

    if (activeUser.role === 'staff') {
      const isOwner = targetPhoto.employeeId === activeUser.id || targetPhoto.employee === activeUser.name;
      if (!isOwner) {
        showToast('คุณสามารถลบได้เฉพาะรูปภาพโครงการที่คุณเป็นผู้อัปโหลดเท่านั้น', 'error');
        return;
      }
    }

    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะลบรูปภาพโครงการ "${targetPhoto.villageName}" (${targetPhoto.fileName})?`)) {
      return;
    }

    try {
      await deletePhoto(id);
      setPhotos(prev => prev.filter(p => p.id !== id));
      
      // Close lightbox if open on this photo
      if (selectedPhoto && selectedPhoto.id === id) {
        setSelectedPhoto(null);
      }

      showToast('ลบรูปภาพผลงานติดตั้งเรียบร้อยแล้ว', 'success');

      // Log action to Firestore
      await saveUserLog(
        'delete',
        activeUser.name,
        `ลบรูปภาพผลงานติดตั้ง โครงการ: "${targetPhoto.villageName}" (${targetPhoto.fileName})`
      );
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถลบรูปภาพได้', 'error');
    }
  };

  // Background multi-photo upload engine with Cloudinary integration and Base64 fallback
  const handleUploadStart = (villageName: string, newPhotos: Omit<SavedPhotoItem, 'id' | 'uploadedAt'>[]) => {
    if (!activeUser) {
      showToast('กรุณาเข้าสู่ระบบก่อนอัปโหลดรูปภาพ', 'error');
      return;
    }
    // Extra security check for Visitors
    if (activeUser.role === 'visitor') {
      showToast('ผู้เยี่ยมชมไม่มีสิทธิ์อัปโหลดรูปภาพ', 'error');
      return;
    }

    const jobId = `job-${Date.now()}`;
    const newJob: UploadProgress = {
      id: jobId,
      villageName,
      progress: 0,
      status: 'uploading',
      totalPhotos: newPhotos.length
    };

    setActiveUploads(prev => [...prev, newJob]);
    showToast(`เริ่มอัปโหลดรูปภาพโครงการ "${villageName}" จำนวน ${newPhotos.length} รูปในเบื้องหลังแล้ว`, 'info');

    // Automatically navigate to Showcase page so they can browse while upload completes
    setActiveTab('showcase');

    // Asynchronously execute uploads in background
    (async () => {
      try {
        const total = newPhotos.length;

        for (let i = 0; i < total; i++) {
          const p = newPhotos[i];
          
          // Update progress status at start of each photo upload
          const progressStart = Math.floor((i / total) * 100);
          setActiveUploads(prev => prev.map(u => u.id === jobId ? { ...u, progress: Math.min(progressStart + 10, 95) } : u));

          let finalUrl = p.url;
          let isCloudinary = false;

          // Attempt Cloudinary upload (returns URL if successful, null if disabled, or throws error if failed)
          const clUrl = await uploadToCloudinary(p.url);
          if (clUrl) {
            finalUrl = clUrl;
            isCloudinary = true;
          }

          // Build saved photo item
          const item: SavedPhotoItem = {
            ...p,
            url: finalUrl,
            id: `p-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
            uploadedAt: new Date().toISOString(),
            employeeId: activeUser.id,
            employee: activeUser.name
          };

          // Save item to Firestore
          await savePhoto(item);

          // Save log
          await saveUserLog(
            'upload',
            activeUser.name,
            `อัปโหลดภาพผลงานโครงการ "${villageName}" (${p.fileName}) รูปแบบ: ${p.curtainStyle} [จัดเก็บ: ${isCloudinary ? 'Cloudinary คลาวด์' : 'Base64 ฐานข้อมูล'}]`
          );

          // Update progress status at completion of each photo upload
          const progressEnd = Math.floor(((i + 1) / total) * 100);
          setActiveUploads(prev => prev.map(u => u.id === jobId ? { ...u, progress: progressEnd } : u));
        }

        // Fetch fresh list of photos
        const updatedPhotos = await getAllPhotos();
        setPhotos(updatedPhotos);

        // Mark background job as complete
        setActiveUploads(prev => prev.map(u => u.id === jobId ? { ...u, progress: 100, status: 'completed' } : u));
        showToast(`อัปโหลดรูปภาพโครงการ "${villageName}" ทั้งหมดสำเร็จเรียบร้อย!`, 'success');

        // Clear indicator after 3 seconds
        setTimeout(() => {
          setActiveUploads(prev => prev.filter(u => u.id !== jobId));
        }, 3000);

      } catch (err: any) {
        console.error('Failed to complete background photo uploads:', err);
        setActiveUploads(prev => prev.map(u => u.id === jobId ? { ...u, status: 'failed' } : u));
        const errMsg = err?.message || 'ข้อผิดพลาดระบบการส่งข้อมูล';
        showToast(`การอัปโหลดโครงการ "${villageName}" ล้มเหลว: ${errMsg}`, 'error');
      }
    })();
  };

  // Image downloader with preset filter baking (called from Lightbox or Showcase)
  const triggerImageDownload = async (photo: SavedPhotoItem) => {
    try {
      const preset = COLOR_PRESETS.find(p => p.id === photo.presetId);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = photo.url;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        // Apply filters on context
        if (preset && preset.id !== 'original') {
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

        const link = document.createElement('a');
        link.download = `curtain_${photo.villageName.replace(/\s+/g, '_')}_${photo.id}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        link.click();
        showToast('เซฟรูปภาพพร้อมฟิลเตอร์สไตล์ผ้าม่านเรียบร้อย', 'success');
      };

      img.onerror = () => {
        const link = document.createElement('a');
        link.download = `curtain_${photo.villageName.replace(/\s+/g, '_')}_${photo.id}.jpg`;
        link.href = photo.url;
        link.click();
        showToast('ดาวน์โหลดรูปภาพต้นฉบับสำเร็จ', 'success');
      };
    } catch (err) {
      console.error(err);
      showToast('ล้มเหลวในการส่งออกไฟล์ภาพดาวน์โหลด', 'error');
    }
  };

  return (
    <div 
      id="app-root-container" 
      className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-rose-50 flex font-sans text-slate-800 antialiased overflow-x-hidden selection:bg-indigo-500/25 relative"
    >
      
      {/* GLOWING AMBIENT BACKGROUND LIGHTS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-sky-300/15 via-indigo-300/10 to-transparent blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-bl from-rose-300/10 via-purple-300/10 to-transparent blur-[120px]" />
        <div className="absolute top-[40%] left-[30%] w-[30vw] h-[30vw] rounded-full bg-indigo-300/5 blur-[80px]" />
      </div>

      {/* Main Spinner Loader until database seeds */}
      {!dbReady ? (
        <div className="flex-1 h-screen flex flex-col items-center justify-center gap-4 z-10 select-none">
          <div className="relative flex items-center justify-center">
            <Loader2 className="animate-spin text-indigo-600" size={54} />
            <Logo size={38} bgColor="#ffffff" className="absolute rounded-lg border border-slate-200/50 shadow-sm" />
          </div>
          <div className="text-center">
            <h2 className="text-sm font-extrabold text-slate-800 tracking-tight">PASAYA Portfolio</h2>
            <p className="text-[11px] text-slate-400 font-semibold mt-1">กำลังเตรียมข้อมูลคลังภาพม่านติดตั้ง...</p>
          </div>
        </div>
      ) : !activeUser ? (
        <div className="flex-1 min-h-screen flex flex-col items-center justify-center p-4 z-10 relative select-none animate-in fade-in duration-300">
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="pt-8 pb-1 flex justify-center">
              <Logo size={42} bgColor="#4f46e5" />
            </div>
            <LoginModal
              isOpen={true}
              onClose={() => {}}
              onLoginSuccess={handleLoginSuccess}
              showToast={showToast}
              isFullScreen={true}
            />
          </div>
        </div>
      ) : (
        <>
          {/* Sidebar */}
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
            activeUploads={activeUploads}
            activeUser={activeUser}
            onSwitchAccountClick={() => setIsLoginModalOpen(true)}
          />

          {/* Spacer to push content when sidebar is fixed */}
          <div className={`hidden md:block flex-shrink-0 transition-all duration-500 ease-out ${isSidebarCollapsed ? 'w-20' : 'w-72'}`} />

          {/* Main App Stage with padding-top and padding-bottom clearance on mobile */}
          <main className="flex-1 min-w-0 px-4 pt-20 pb-20 md:py-8 md:px-8 lg:px-10 z-10">
            <AnimatePresence mode="wait">
              {activeTab === 'showcase' && (
                <motion.div
                  key="showcase"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                  <PortfolioPage
                    photos={photos}
                    onToggleLike={handleToggleLike}
                    onDeletePhoto={handleDeletePhoto}
                    onOpenLightbox={setSelectedPhoto}
                    activeUser={activeUser}
                  />
                </motion.div>
              )}

              {activeTab === 'upload' && activeUser && activeUser.role !== 'visitor' && (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                  <UploadPage 
                    onUploadStart={handleUploadStart} 
                    activeEmployee={activeUser.name} 
                    allPhotos={photos}
                  />
                </motion.div>
              )}

              {activeTab === 'favorites' && (
                <motion.div
                  key="favorites"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                  <PortfolioPage
                    photos={photos}
                    onToggleLike={handleToggleLike}
                    onDeletePhoto={handleDeletePhoto}
                    onOpenLightbox={setSelectedPhoto}
                    activeUser={activeUser}
                    title="ผลงานติดตั้งผ้าม่านที่คุณถูกใจ"
                    isFavoriteOnly={true}
                  />
                </motion.div>
              )}

              {activeTab === 'admin' && activeUser && activeUser.role === 'admin' && (
                <motion.div
                  key="admin"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                  <AdminPage
                    photos={photos}
                    onPhotosUpdated={async () => {
                      const updatedPhotos = await getAllPhotos();
                      setPhotos(updatedPhotos);
                    }}
                    showToast={showToast}
                    activeUser={activeUser}
                  />
                </motion.div>
              )}

              {activeTab === 'logs' && activeUser && activeUser.role === 'admin' && (
                <motion.div
                  key="logs"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                  <LogsPage showToast={showToast} />
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          {/* Lightbox Specification Modal View */}
          <Modal
            photo={selectedPhoto}
            allPhotos={photos}
            onClose={() => setSelectedPhoto(null)}
            onSelectPhoto={setSelectedPhoto}
            onToggleLike={handleToggleLike}
            triggerImageDownload={triggerImageDownload}
          />

          {/* User Account Switch Login Dialog Overlay */}
          <LoginModal
            isOpen={isLoginModalOpen}
            onClose={() => setIsLoginModalOpen(false)}
            onLoginSuccess={handleLoginSuccess}
            showToast={showToast}
          />

          {/* Global Floating Glass Toast Notifications Stack */}
          <div id="toast-notifications-portal" className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
            <AnimatePresence>
              {toasts.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
                  className="pointer-events-auto p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/50 shadow-xl flex items-start gap-3 shadow-slate-100/40 select-none"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {t.type === 'error' ? (
                      <AlertCircle className="text-red-500" size={16} />
                    ) : t.type === 'info' ? (
                      <Sparkles className="text-amber-500 animate-spin" size={16} />
                    ) : (
                      <CheckCircle2 className="text-emerald-500 animate-bounce" size={16} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 leading-normal">{t.message}</p>
                  </div>
                  <button 
                    onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}
                    className="text-slate-400 hover:text-slate-700 hover:scale-105 transition-all flex-shrink-0 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

    </div>
  );
}
