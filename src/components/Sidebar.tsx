import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Upload, 
  Image as ImageIcon, 
  Heart, 
  Sparkles, 
  Loader2, 
  ClipboardList,
  Settings,
  UserCheck
} from 'lucide-react';
import { UploadProgress, EmployeeUser } from '../types';
import Logo from './Logo';

interface SidebarProps {
  activeTab: 'showcase' | 'upload' | 'favorites' | 'admin' | 'logs';
  setActiveTab: (tab: 'showcase' | 'upload' | 'favorites' | 'admin' | 'logs') => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  activeUploads: UploadProgress[];
  activeUser: EmployeeUser | null;
  onSwitchAccountClick: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  activeUploads,
  activeUser,
  onSwitchAccountClick
}: SidebarProps) {

  const menuItems = [
    {
      id: 'showcase' as const,
      label: 'ดูผลงานติดตั้ง',
      sublabel: 'View Portfolio',
      icon: ImageIcon,
      color: 'text-blue-500'
    },
    {
      id: 'upload' as const,
      label: 'อัปโหลดรูปใหม่',
      sublabel: 'Upload Design',
      icon: Upload,
      color: 'text-emerald-500'
    },
    {
      id: 'favorites' as const,
      label: 'ผลงานที่ถูกใจ',
      sublabel: 'Favorites',
      icon: Heart,
      color: 'text-rose-500'
    },
    {
      id: 'logs' as const,
      label: 'ประวัติการทำงาน',
      sublabel: 'Activity Logs',
      icon: ClipboardList,
      color: 'text-amber-500'
    },
    {
      id: 'admin' as const,
      label: 'ระบบจัดการแอดมิน',
      sublabel: 'Admin Panel',
      icon: Settings,
      color: 'text-indigo-500'
    },
  ];

  // Filter tabs dynamically based on user role
  const filteredMenuItems = menuItems.filter(item => {
    if (item.id === 'admin' || item.id === 'logs') {
      return activeUser.role === 'admin';
    }
    if (item.id === 'upload') {
      return activeUser.role !== 'visitor';
    }
    return true;
  });

  const totalUploading = activeUploads.filter(u => u.status === 'uploading').length;

  return (
    <>
      {/* Mobile Header - Sticky, stays at top, matches the layout padding update */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 z-30 flex items-center justify-between px-5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Logo size={34} bgColor="" className="rounded-lg shadow-sm border border-slate-200/60" />
          <div className="flex flex-col select-none">
            <span className="text-sm font-black tracking-tight text-slate-950">PASAYA Portfolio</span>
            <span className="text-[9px] text-indigo-700 font-extrabold tracking-wider uppercase">Installation logs</span>
          </div>
        </div>
        
        {/* Mobile user status indicator badge */}
        <button 
          onClick={onSwitchAccountClick}
          className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase transition-colors
            ${activeUser.role === 'admin' ? 'bg-red-50 border-red-200 text-red-600' : ''}
            ${activeUser.role === 'staff' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : ''}
            ${activeUser.role === 'visitor' ? 'bg-amber-50 border-amber-200 text-amber-600' : ''}
          `}
        >
          {activeUser.name.split(' ')[0]} ({activeUser.role})
        </button>
      </div>

      {/* Mobile Navigation Bottom Tab Bar (iPhone TabBar style) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur border-t border-slate-200 z-40 flex justify-around items-center px-2 pb-safe shadow-lg">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1.5 relative select-none cursor-pointer transition-all duration-300
                ${isActive ? 'text-indigo-600 scale-102 font-black' : 'text-slate-500 hover:text-slate-800'}
              `}
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              {isActive && (
                <div className="absolute top-0 w-8 h-1 bg-indigo-600 rounded-full" />
              )}
              <Icon size={20} className={isActive ? 'text-indigo-600' : 'text-slate-500'} />
              <span className="text-[9px] font-bold mt-1 truncate max-w-[70px]">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Desktop Sidebar Container */}
      <aside
        id="main-sidebar"
        className={`hidden md:flex fixed md:sticky top-0 left-0 h-screen z-40 transition-all duration-500 ease-out flex-col
          bg-white border-r border-slate-200 shadow-sm
          ${isCollapsed ? 'w-20' : 'w-72'} 
        `}
      >
        {/* Brand/Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100">
          <div className="flex items-center gap-3 overflow-hidden">
            <Logo size={36} bgColor="" className="rounded-lg shadow-sm border border-slate-200/60 flex-shrink-0" />
            {!isCollapsed && (
              <div className="flex flex-col select-none transition-opacity duration-300">
                <span className="text-sm font-black tracking-tight text-slate-950">
                  PASAYA Portfolio
                </span>
                <span className="text-[10px] text-indigo-700 font-extrabold uppercase tracking-wider">
                  Curtain Showcase
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Button */}
          <button
            id="desktop-collapse-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Dynamic Installer Profile Session Switcher */}
        {!isCollapsed && (
          <div className="mx-4 mt-4 p-3 bg-gradient-to-br from-indigo-50/70 to-slate-50/50 border border-slate-200/60 rounded-2xl space-y-2.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-[10px] text-indigo-800 font-black uppercase tracking-wider">
              <UserCheck size={12} className="text-indigo-600 animate-pulse" />
              <span>พนักงานลงชื่อปัจจุบัน</span>
            </div>
            
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs border flex-shrink-0 shadow-sm
                ${activeUser.role === 'admin' ? 'bg-red-50 text-red-600 border-red-200' : ''}
                ${activeUser.role === 'staff' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : ''}
                ${activeUser.role === 'visitor' ? 'bg-amber-50 text-amber-600 border-amber-200' : ''}
              `}>
                {activeUser.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-extrabold text-slate-800 truncate leading-tight">{activeUser.name}</h4>
                <span className={`inline-block text-[8px] font-black uppercase tracking-wider mt-0.5 rounded px-1
                  ${activeUser.role === 'admin' ? 'bg-red-100 text-red-700' : ''}
                  ${activeUser.role === 'staff' ? 'bg-emerald-100 text-emerald-700' : ''}
                  ${activeUser.role === 'visitor' ? 'bg-amber-100 text-amber-700' : ''}
                `}>
                  {activeUser.role === 'admin' ? 'แอดมิน' : activeUser.role === 'staff' ? 'พนักงาน' : 'ผู้เยี่ยมชม'}
                </span>
              </div>
            </div>

            <button
              onClick={onSwitchAccountClick}
              className="w-full py-1 bg-white hover:bg-indigo-50 border border-indigo-150 rounded-lg text-[10px] font-bold text-indigo-700 transition-all cursor-pointer shadow-sm"
            >
              สลับบัญชีพนักงาน
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-item-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id);
                }}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 relative group
                  ${isActive 
                    ? 'bg-indigo-50/50 text-indigo-600 font-black' 
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                  }
                `}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <div className="absolute left-1.5 top-3.5 bottom-3.5 w-1 rounded-full bg-indigo-600" />
                )}

                <div className={`p-1 rounded-lg ${isActive ? 'bg-indigo-100/50' : 'group-hover:scale-110 transition-transform duration-300'}`}>
                  <Icon size={20} className={isActive ? 'text-indigo-600' : item.color} />
                </div>

                {!isCollapsed && (
                  <div className="flex flex-col items-start text-left">
                    <span className="text-xs font-bold tracking-tight">
                      {item.label}
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium">
                      {item.sublabel}
                    </span>
                  </div>
                )}

                {/* Badge for uploading */}
                {item.id === 'showcase' && totalUploading > 0 && !isCollapsed && (
                  <span className="ml-auto bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-bounce">
                    {totalUploading}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Background Upload Status panel */}
        {activeUploads.length > 0 && !isCollapsed && (
          <div className="p-4 mx-3 mb-4 rounded-2xl bg-white border border-slate-200 shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="animate-spin text-amber-500" size={14} />
              <span className="text-[11px] font-bold text-slate-700">สถานะการส่งข้อมูล ({activeUploads.length})</span>
            </div>
            
            <div className="max-h-24 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {activeUploads.map((up) => (
                <div key={up.id} className="text-[10px]">
                  <div className="flex justify-between text-slate-500 mb-0.5 font-bold">
                    <span className="truncate max-w-[120px]">{up.villageName}</span>
                    <span>{Math.round(up.progress)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 rounded-full ${
                        up.status === 'completed' 
                          ? 'bg-emerald-500' 
                          : up.status === 'failed' 
                          ? 'bg-red-500' 
                          : 'bg-indigo-500'
                      }`}
                      style={{ width: `${up.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User Info / Status (Minimal) */}
        <div className={`p-4 border-t border-slate-100 flex flex-col gap-2`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 font-extrabold text-indigo-600 text-xs uppercase">
              {activeUser ? activeUser.name[0] : 'PS'}
            </div>
            {!isCollapsed && activeUser && (
              <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                <span className="text-xs font-black text-slate-900 truncate leading-tight" title={activeUser.name}>{activeUser.name}</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  {activeUser.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : activeUser.role === 'staff' ? 'พนักงาน (Staff)' : 'ผู้เยี่ยมชม (Visitor)'}
                </span>
              </div>
            )}
          </div>
          
          {/* Sign Out / Switch Account */}
          {!isCollapsed && (
            <button
              onClick={onSwitchAccountClick}
              className="w-full mt-1.5 py-1.5 rounded-xl border border-slate-200/60 hover:bg-slate-50 text-[10px] font-bold text-slate-500 hover:text-slate-800 transition-all cursor-pointer flex items-center justify-center gap-1"
            >
              <UserCheck size={12} className="text-indigo-500" />
              สลับผู้ใช้งาน / ออกจากระบบ
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
