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
  Eye,
  Calendar
} from 'lucide-react';
import { UserLog } from '../types';
import { getUserLogs, deleteUserLog, deleteUserLogs, deleteUserLogsByDate } from '../lib/db';

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

  // New States for deleting and selection
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const [targetClearDate, setTargetClearDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Toggle individual log selection
  const handleToggleSelectLog = (id: string) => {
    setSelectedLogIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Select all or deselect all
  const handleSelectAllFiltered = () => {
    const filteredIds = filteredLogs.map(log => log.id);
    const allSelected = filteredIds.every(id => selectedLogIds.includes(id));
    if (allSelected) {
      setSelectedLogIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedLogIds(prev => {
        const union = new Set([...prev, ...filteredIds]);
        return Array.from(union);
      });
    }
  };

  // Single log delete
  const handleDeleteSingleLog = async (id: string, details: string) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะลบรายการประวัตินี้?\n"${details}"`)) {
      return;
    }
    try {
      setIsDeleting(true);
      await deleteUserLog(id);
      showToast('ลบรายการประวัติสำเร็จ', 'success');
      // Refresh list
      fetchLogs();
      setSelectedLogIds(prev => prev.filter(item => item !== id));
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถลบประวัติได้', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Selected logs delete (Batch delete)
  const handleDeleteSelectedLogs = async () => {
    if (selectedLogIds.length === 0) return;
    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะลบประวัติกิจกรรมที่เลือกทั้งหมดจำนวน ${selectedLogIds.length} รายการ?`)) {
      return;
    }
    try {
      setIsDeleting(true);
      await deleteUserLogs(selectedLogIds);
      showToast(`ลบรายการประวัติทั้งหมด ${selectedLogIds.length} รายการเรียบร้อย`, 'success');
      setSelectedLogIds([]);
      fetchLogs();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถลบกลุ่มประวัติที่เลือกได้', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Clear logs by date
  const handleClearLogsByDate = async () => {
    if (!targetClearDate) return;
    const formattedDateForConfirm = new Date(targetClearDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะลบประวัติกิจกรรมทั้งหมดของวันที่ ${formattedDateForConfirm}?`)) {
      return;
    }
    try {
      setIsDeleting(true);
      const deletedCount = await deleteUserLogsByDate(targetClearDate);
      if (deletedCount > 0) {
        showToast(`ล้างข้อมูลประวัติกิจกรรมวันที่ ${formattedDateForConfirm} สำเร็จ (ลบทั้งหมด ${deletedCount} รายการ)`, 'success');
        // Clear any selected ids that might have been deleted
        setSelectedLogIds([]);
        fetchLogs();
      } else {
        showToast(`ไม่พบประวัติกิจกรรมใดๆ ในวันที่ ${formattedDateForConfirm}`, 'info');
      }
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการล้างข้อมูลประวัติกิจกรรมตามวัน', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

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

      {/* Admin Log Controls Tools Card */}
      <div className="bg-white/50 backdrop-blur-xl border border-white/40 rounded-[28px] p-5 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Tool 1: Clear Logs by Date */}
        <div className="space-y-3 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-6">
          <div className="flex items-center gap-2 text-slate-800">
            <Calendar className="text-amber-500 animate-bounce" size={18} />
            <h2 className="text-sm font-bold">ล้างประวัติกิจกรรมตามระบุวัน (Clear Logs by Day)</h2>
          </div>
          <p className="text-xs text-slate-500">
            เลือกล้างประวัติกิจกรรมทั้งหมดในระบบแบบรายวันเพื่อความเป็นส่วนตัวหรือเคลียร์พื้นที่
          </p>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={targetClearDate}
              onChange={(e) => setTargetClearDate(e.target.value)}
              className="flex-1 h-10 px-3 rounded-xl border border-slate-200 bg-white/80 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            />
            <button
              onClick={handleClearLogsByDate}
              disabled={isDeleting || !targetClearDate}
              className="h-10 px-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
              style={{ minHeight: '40px' }}
            >
              <Trash2 size={13} />
              <span>ล้างวันคู่เลือก</span>
            </button>
          </div>
        </div>

        {/* Tool 2: Batch Selection and Actions */}
        <div className="space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-800">
              <Sliders className="text-amber-500" size={18} />
              <h2 className="text-sm font-bold">จัดการลบหลายรายการพร้อมกัน (Batch Delete)</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              คลิกกล่องติ๊กถูกหน้าแต่ละแถวประวัติ จากนั้นกดลบกลุ่มที่เลือกพร้อมกันทั้งหมด
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={handleSelectAllFiltered}
              className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 bg-white/60 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              style={{ minHeight: '38px' }}
            >
              {filteredLogs.length > 0 && filteredLogs.every(log => selectedLogIds.includes(log.id)) 
                ? 'ยกเลิกการเลือกทั้งหมด' 
                : 'เลือกทั้งหมดที่กรองพบ'}
            </button>
            
            {selectedLogIds.length > 0 && (
              <button
                onClick={handleDeleteSelectedLogs}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-slate-200 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer animate-pulse active:scale-95 flex items-center gap-1.5"
                style={{ minHeight: '38px' }}
              >
                <Trash2 size={13} />
                <span>ลบรายการที่เลือก ({selectedLogIds.length} รายการ)</span>
              </button>
            )}
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
                const isSelected = selectedLogIds.includes(log.id);
                
                return (
                  <div key={log.id} className="relative group select-none">
                    
                    {/* Timeline dot circle */}
                    <div className="absolute -left-[23px] sm:-left-[31px] top-4 w-4 h-4 rounded-full bg-white border-2 border-slate-200 group-hover:border-amber-400 flex items-center justify-center transition-all">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-amber-400 transition-colors" />
                    </div>

                    {/* Timeline Log Card */}
                    <div className={`border p-4 rounded-2xl shadow-sm transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3
                      ${isSelected 
                        ? 'bg-amber-50/70 border-amber-200' 
                        : 'bg-white/40 group-hover:bg-white/75 border-slate-200/40'
                      }
                    `}>
                      
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Checkbox */}
                        <div className="flex items-center justify-center flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectLog(log.id)}
                            className="h-4.5 w-4.5 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                          />
                        </div>

                        {/* Log description */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          
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
                          <p className="text-xs font-semibold text-slate-600 leading-relaxed break-words">
                            {log.details}
                          </p>
                        </div>
                      </div>

                      {/* Time indicators & Delete Action */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start w-full sm:w-auto border-t sm:border-t-0 border-slate-100/60 pt-2 sm:pt-0 gap-2 sm:gap-1.5 text-right flex-shrink-0">
                        <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0.5 text-[10px] text-slate-400 font-bold select-none">
                          <div className="flex items-center gap-1 text-slate-500">
                            <Clock size={11} />
                            <span>{formattedTime}</span>
                          </div>
                          <div className="bg-slate-100 px-2 py-0.5 rounded-lg sm:bg-transparent sm:px-0 sm:py-0">
                            {formattedDate}
                          </div>
                        </div>

                        {/* Single Row Quick Delete Button */}
                        <button
                          onClick={() => handleDeleteSingleLog(log.id, log.details)}
                          disabled={isDeleting}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50/80 active:scale-90 transition-all cursor-pointer"
                          title="ลบรายการประวัตินี้"
                          style={{ minHeight: '36px', minWidth: '36px' }}
                        >
                          <Trash2 size={13} />
                        </button>
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
