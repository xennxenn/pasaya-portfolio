import React, { useState, useEffect } from 'react';
import { X, Lock, User, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { EmployeeUser } from '../types';
import { getMasterData } from '../lib/db';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: EmployeeUser) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  isFullScreen?: boolean;
}

const DEFAULT_EMPLOYEES: EmployeeUser[] = [
  { id: 'emp-1', name: 'สมศักดิ์ รักดี (Somsak)', username: 'T58121', password: 'Admin', role: 'admin' },
  { id: 'emp-2', name: 'สมชาย มีสุข (Somchai)', username: 'somchai', password: '123', role: 'staff' },
  { id: 'emp-3', name: 'วิภา ศรีงาม (Wipa)', username: 'wipa', password: '123', role: 'visitor' },
  { id: 'emp-4', name: 'มานะ ชูใจ (Mana)', username: 'mana', password: '123', role: 'staff' },
];

export default function LoginModal({ isOpen, onClose, onLoginSuccess, showToast, isFullScreen = false }: LoginModalProps) {
  const [accounts, setAccounts] = useState<EmployeeUser[]>(DEFAULT_EMPLOYEES);
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      async function loadAccounts() {
        try {
          const master = await getMasterData();
          if (master.employeeAccounts && master.employeeAccounts.length > 0) {
            setAccounts(master.employeeAccounts);
          } else {
            setAccounts(DEFAULT_EMPLOYEES);
          }
        } catch (err) {
          console.error(err);
          setAccounts(DEFAULT_EMPLOYEES);
        }
      }
      loadAccounts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      const uTrim = username.trim();
      
      // Case-insensitive username match
      const matched = accounts.find(acc => acc.username.toLowerCase() === uTrim.toLowerCase());

      if (!matched) {
        showToast('ไม่พบบัญชีผู้ใช้งานนี้ในระบบ', 'error');
        setIsLoading(false);
        return;
      }

      // Exact password match
      if (matched.password !== password) {
        showToast('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง', 'error');
        setIsLoading(false);
        return;
      }

      // Login success
      onLoginSuccess(matched);
      showToast(`เข้าสู่ระบบสำเร็จ ยินดีต้อนรับคุณ ${matched.name}`, 'success');
      setIsLoading(false);
      onClose();
      // Reset form fields
      setUsername('');
      setPassword('');
    }, 600);
  };

  const loginCard = (
    <div className="w-full overflow-hidden flex flex-col relative select-none">
      {/* Close Button - Only show if not full-screen */}
      {!isFullScreen && (
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer z-10"
        >
          <X size={15} />
        </button>
      )}

      {/* Header decoration */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 px-6 pt-8 pb-6 text-white text-center">
        <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-3 shadow-md">
          <ShieldCheck size={24} className="text-white" />
        </div>
        <h3 className="text-lg font-black tracking-tight">ลงชื่อเข้าใช้งานก่อนเข้างาน</h3>
        <p className="text-xs text-white/85 mt-1">ยืนยันสิทธิ์เพื่อลงทะเบียนบันทึกและจัดการผ้าม่าน</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        
        {/* Username */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Username (ชื่อผู้ใช้)</label>
          <div className="relative">
            <User size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ระบุชื่อผู้ใช้ (Username)"
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Password (รหัสผ่าน)</label>
          <div className="relative">
            <Lock size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="ระบุรหัสผ่าน (Password)"
              className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-200 bg-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>กำลังเข้าสู่ระบบ...</span>
            </>
          ) : (
            <span>เข้าสู่ระบบ (Login)</span>
          )}
        </button>

      </form>
    </div>
  );

  // If full-screen view (e.g. at entry), we don't render backdrops, only the login card itself
  if (isFullScreen) {
    return loginCard;
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
      {/* Modal Card wrapper */}
      <div className="bg-white/90 border border-slate-200/80 rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-250">
        {loginCard}
      </div>
    </div>
  );
}
