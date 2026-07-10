import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Search, 
  Clock, 
  Filter, 
  Loader2, 
  Sparkles, 
  User, 
  Layers, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Trash2, 
  Sliders, 
  RefreshCw,
  Eye
} from 'lucide-react';
import { UserLog } from '../types';
import { getUserLogs } from '../lib/db';

interface LogsPageProps {
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export default function LogsPage({ showToast }: LogsPageProps) {
  const [logs, setLogs] = useState<UserLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<UserLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('all');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('all');

  // Load logs
  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const data = await getUserLogs();
      setLogs(data);
      setFilteredLogs(data);
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถโหลดประวัติการทำงานได้', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filter logs on search/change
  useEffect(() => {
    let result = [...logs];

    if (searchTerm.trim() !== '') {
      const lower = searchTerm.toLowerCase();
      result = result.filter(log => 
        log.details.toLowerCase().includes(lower) || 
        log.employeeName.toLowerCase().includes(lower)
      );
    }

    if (selectedActionFilter !== 'all') {
      result = result.filter(log => log.action === selectedActionFilter);
    }

    if (selectedEmployeeFilter !== 'all') {
      result = result.filter(log => log.employeeName === selectedEmployeeFilter);
    }

    setFilteredLogs(result);
  }, [searchTerm, selectedActionFilter, selectedEmployeeFilter, logs]);

  // Extract unique employees for filter select
  const uniqueEmployees = Array.from(new Set(logs.map(log => log.employeeName))).filter(Boolean);

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'upload': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'delete': return 'bg-red-50 text-red-700 border-red-100';
      case 'like': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'unlike': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'admin_config_update': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'upload': return 'อัปโหลดภาพ';
      case 'delete': return 'ลบภาพ';
      case 'like': return 'กดถูกใจ';
      case 'unlike': return 'เลิกถูกใจ';
      case 'admin_config_update': return 'แก้ไขมาสเตอร์';
      default: return action;
    }
  };

  return (
    <div id="logs-panel-container" className="max-w-5xl mx-auto space-y-6 pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 flex items-center gap-2">
            <ClipboardList className="text-amber-500 animate-pulse" size={24} />
            ประวัติประมวลผลและอัปโหลดรูปภาพ (Activity Logs)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            เก็บบันทึกประวัติและรายละเอียดการกระทำต่างๆ ของพนักงานในระบบแบบออนไลน์เรียลไทม์
          </p>
        </div>
        
        {/* Refresh button with large mobile touch size */}
        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 text-slate-700 text-xs font-bold transition-all shadow-sm cursor-pointer hover:bg-slate-50 active:scale-95"
          style={{ minHeight: '44px' }}
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>ดึงข้อมูลล่าสุด</span>
        </button>
      </div>

      {/* Filters Card */}
      <div className="bg-white/50 backdrop-blur-xl border border-white/40 rounded-[28px] p-5 shadow-xl space-y-4">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          
          {/* Search box */}
          <div className="md:col-span-5 relative">
            <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหาตามชื่อพนักงาน หรือรายละเอียดประวัติ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white/80 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent placeholder-slate-400"
            />
          </div>

          {/* Action Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedActionFilter}
              onChange={(e) => setSelectedActionFilter(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white/80 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="all">กรองทั้งหมดทุกการกระทำ</option>
              <option value="upload">อัปโหลดภาพ (Upload)</option>
              <option value="delete">ลบภาพ (Delete)</option>
              <option value="like">ถูกใจ (Like)</option>
              <option value="unlike">เลิกถูกใจ (Unlike)</option>
              <option value="admin_config_update">แก้ไขมาสเตอร์ (Admin)</option>
            </select>
          </div>

          {/* Employee Filter */}
          <div className="md:col-span-4">
            <select
              value={selectedEmployeeFilter}
              onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white/80 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="all">กรองทั้งหมดทุกพนักงาน</option>
              {uniqueEmployees.map(emp => (
                <option key={emp} value={emp}>{emp}</option>
              ))}
            </select>
          </div>

        </div>

      </div>

      {/* Logs timeline list container */}
      <div className="bg-white/50 backdrop-blur-xl border border-white/40 rounded-[32px] p-6 shadow-xl space-y-4">
        
        {isLoading ? (
          <div className="flex flex-col justify-center items-center py-20 gap-3">
            <Loader2 className="animate-spin text-amber-500" size={32} />
            <p className="text-xs text-slate-400 font-semibold">กำลังดึงข้อมูลประวัติกิจกรรมจากคลาวด์...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-medium text-xs">
            ไม่พบข้อมูลประวัติกิจกรรมที่ตรงตามเงื่อนไข
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Header info */}
            <div className="flex justify-between items-center text-xs text-slate-400 font-semibold px-2 border-b border-slate-100 pb-2">
              <span>ประวัติกิจกรรม ({filteredLogs.length} รายการ)</span>
              <span>เรียงลำดับจากล่าสุด</span>
            </div>

            {/* Timeline element */}
            <div className="relative pl-4 sm:pl-6 border-l border-slate-100 space-y-6 py-2">
              {filteredLogs.map((log) => {
                const date = new Date(log.timestamp);
                const formattedTime = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const formattedDate = date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
                
                return (
                  <div key={log.id} className="relative group select-none">
                    
                    {/* Timeline dot circle */}
                    <div className="absolute -left-[23px] sm:-left-[31px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-slate-200 group-hover:border-amber-400 flex items-center justify-center transition-all">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-amber-400 transition-colors" />
                    </div>

                    {/* Timeline Log Card */}
                    <div className="bg-white/40 group-hover:bg-white/75 border border-slate-200/40 p-4 rounded-2xl shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      
                      {/* Log description */}
                      <div className="space-y-1.5 flex-1">
                        
                        {/* Action Badge & Name */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${getActionBadgeColor(log.action)}`}>
                            {getActionLabel(log.action)}
                          </span>
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <User size={12} className="text-slate-400" />
                            {log.employeeName}
                          </span>
                        </div>

                        {/* Detail text */}
                        <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                          {log.details}
                        </p>
                      </div>

                      {/* Time indicators */}
                      <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0.5 text-right flex-shrink-0 text-[10px] text-slate-400 font-bold select-none">
                        <div className="flex items-center gap-1 text-slate-500">
                          <Clock size={11} />
                          <span>{formattedTime}</span>
                        </div>
                        <div className="bg-slate-100 px-2 py-0.5 rounded-lg sm:bg-transparent sm:px-0 sm:py-0">
                          {formattedDate}
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
