
import React, { useState, useMemo } from 'react';
import { useData } from '../DataContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  Target, Package, DollarSign, AlertTriangle, Calendar, Filter
} from 'lucide-react';

type FilterMode = 'all' | 'dateRange' | 'month' | 'quarter' | 'year';

const QUARTER_LABELS: Record<number, string> = { 1: 'Q1 (ม.ค.-มี.ค.)', 2: 'Q2 (เม.ย.-มิ.ย.)', 3: 'Q3 (ก.ค.-ก.ย.)', 4: 'Q4 (ต.ค.-ธ.ค.)' };

const OKRPerformance: React.FC = () => {
  const { items, ncrReports } = useData();

  // --- Filter State ---
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedQuarter, setSelectedQuarter] = useState(() => {
    const now = new Date();
    return Math.ceil((now.getMonth() + 1) / 3);
  });
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  // Available years from data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    ncrReports.forEach(n => {
      if (n.date) {
        const y = new Date(n.date).getFullYear();
        if (!isNaN(y)) years.add(y);
      }
    });
    items.forEach(i => {
      if (i.createdAt) {
        const y = new Date(i.createdAt).getFullYear();
        if (!isNaN(y)) years.add(y);
      }
    });
    if (years.size === 0) years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [ncrReports, items]);

  // --- Filter logic ---
  const isInRange = (dateStr: string | undefined): boolean => {
    if (!dateStr) return filterMode === 'all';
    if (filterMode === 'all') return true;

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;

    if (filterMode === 'dateRange') {
      if (startDate && d < new Date(startDate)) return false;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    }

    if (filterMode === 'month') {
      const [y, m] = selectedMonth.split('-').map(Number);
      return d.getFullYear() === y && d.getMonth() + 1 === m;
    }

    if (filterMode === 'quarter') {
      if (d.getFullYear() !== selectedYear) return false;
      const q = Math.ceil((d.getMonth() + 1) / 3);
      return q === selectedQuarter;
    }

    if (filterMode === 'year') {
      return d.getFullYear() === selectedYear;
    }

    return true;
  };

  // --- Filtered data ---
  const filteredNCR = useMemo(() =>
    ncrReports.filter(n => n.status !== 'Canceled' && isInRange(n.date)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ncrReports, filterMode, startDate, endDate, selectedMonth, selectedQuarter, selectedYear]
  );

  const filteredItems = useMemo(() =>
    items.filter(i => isInRange(i.createdAt)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, filterMode, startDate, endDate, selectedMonth, selectedQuarter, selectedYear]
  );

  // --- OKR Metrics ---
  const okrMetrics = useMemo(() => {
    const totalItems = filteredItems.length;

    // P2: Infull
    const infullProblems = {
      incomplete: filteredNCR.filter(n => n.problemIncomplete).length,
      over: filteredNCR.filter(n => n.problemOver).length,
      mixed: filteredNCR.filter(n => n.problemMixed).length,
      wrong: filteredNCR.filter(n => n.problemWrong).length,
      wrongInv: filteredNCR.filter(n => n.problemWrongInv).length,
    };
    const totalInfullIssues = infullProblems.incomplete + infullProblems.over + infullProblems.mixed + infullProblems.wrong + infullProblems.wrongInv;
    const infullRate = totalItems > 0 ? ((totalItems - totalInfullIssues) / totalItems * 100) : 100;

    // B5: Damage Cost
    const b5Target = 650000;
    let totalDamageCost = 0;
    filteredNCR.forEach(n => {
      const itm = (n.item || {}) as Record<string, unknown>;
      totalDamageCost += (typeof itm.costAmount === 'number' ? itm.costAmount : 0);
    });
    filteredItems.forEach(i => {
      if (i.hasCost && i.costAmount && !i.ncrNumber) totalDamageCost += i.costAmount;
    });
    const b5Percent = b5Target > 0 ? (totalDamageCost / b5Target * 100) : 0;

    // P2 Chart Data
    const p2ChartData = [
      { name: 'ส่งไม่ครบ', value: infullProblems.incomplete, color: '#ef4444' },
      { name: 'ส่งเกิน', value: infullProblems.over, color: '#f59e0b' },
      { name: 'สินค้าสลับ', value: infullProblems.mixed, color: '#8b5cf6' },
      { name: 'ส่งผิด', value: infullProblems.wrong, color: '#3b82f6' },
      { name: 'ไม่ตรง INV', value: infullProblems.wrongInv, color: '#ec4899' },
    ].filter(d => d.value > 0);

    // S1: Customer Satisfaction
    const s3Reported = filteredNCR.filter(n => n.problemDetail && n.problemDetail.trim() !== '' && n.problemDetail !== '-').length;
    const s3Rate = filteredNCR.length > 0 ? (s3Reported / filteredNCR.length * 100) : 100;
    const s1Indexes = [
      { id: 1, label: 'ตอบข้อซักถาม/ติดตามปัญหา ≤ 7 ชม.', passed: true },
      { id: 2, label: 'แจ้งปัญหาคลังสินค้าก่อนฝ่ายขาย 100%', passed: true },
      { id: 3, label: 'สรุปความเสียหาย ≤ 72 ชม.', passed: s3Rate >= 90 },
      { id: 4, label: 'ไม่มี Complaint ลายลักษณ์อักษร/Line', passed: true },
    ];
    const s1PassedCount = s1Indexes.filter(i => i.passed).length;
    const s1Score = (s1PassedCount / s1Indexes.length) * 100;

    // B9: Process Improvement
    const b9Projects = [
      { name: 'ReturnNeosiam Digital Platform', status: 'done' },
      { name: 'NCR Auto-Notify (Telegram)', status: 'done' },
      { name: 'NCR Save Guard (Retry+Rollback)', status: 'done' },
    ];

    // Problem types breakdown (all NCR problem types)
    const problemBreakdown = [
      { label: 'สินค้าเสียหาย', value: filteredNCR.filter(n => n.problemDamaged).length, color: '#ef4444' },
      { label: 'เสียหายในกล่อง', value: filteredNCR.filter(n => n.problemDamagedInBox).length, color: '#f97316' },
      { label: 'สูญหาย', value: filteredNCR.filter(n => n.problemLost).length, color: '#dc2626' },
      { label: 'สินค้าสลับ', value: filteredNCR.filter(n => n.problemMixed).length, color: '#8b5cf6' },
      { label: 'ไม่ตรง INV', value: filteredNCR.filter(n => n.problemWrongInv).length, color: '#ec4899' },
      { label: 'ส่งล่าช้า', value: filteredNCR.filter(n => n.problemLate).length, color: '#f59e0b' },
      { label: 'ส่งซ้ำ', value: filteredNCR.filter(n => n.problemDuplicate).length, color: '#6366f1' },
      { label: 'ส่งผิด', value: filteredNCR.filter(n => n.problemWrong).length, color: '#3b82f6' },
      { label: 'ส่งไม่ครบ', value: filteredNCR.filter(n => n.problemIncomplete).length, color: '#ef4444' },
      { label: 'ส่งเกิน', value: filteredNCR.filter(n => n.problemOver).length, color: '#f59e0b' },
      { label: 'เสียหายระหว่างขนส่ง', value: filteredNCR.filter(n => n.problemTransportDamage).length, color: '#b91c1c' },
      { label: 'อุบัติเหตุ', value: filteredNCR.filter(n => n.problemAccident).length, color: '#7c2d12' },
    ].filter(d => d.value > 0).sort((a, b) => b.value - a.value);

    return {
      totalItems, totalNCR: filteredNCR.length,
      infullRate, totalInfullIssues, infullProblems, p2ChartData,
      totalDamageCost, b5Target, b5Percent,
      s1Indexes, s1PassedCount, s1Score,
      b9Projects, problemBreakdown
    };
  }, [filteredNCR, filteredItems]);

  // --- Filter label ---
  const getFilterLabel = () => {
    if (filterMode === 'all') return 'ทั้งหมด';
    if (filterMode === 'dateRange') return `${startDate || '...'} ถึง ${endDate || '...'}`;
    if (filterMode === 'month') {
      const [y, m] = selectedMonth.split('-').map(Number);
      const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      return `${months[m - 1]} ${y + 543}`;
    }
    if (filterMode === 'quarter') return `${QUARTER_LABELS[selectedQuarter]} ${selectedYear + 543}`;
    if (filterMode === 'year') return `ปี ${selectedYear + 543}`;
    return '';
  };

  return (
    <div className="p-3 md:p-6 space-y-6 animate-fade-in pb-20">

      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-pink-500/10 rounded-3xl blur-3xl"></div>
        <div className="relative bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-white/50 shadow-xl shadow-violet-100/50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl shadow-lg shadow-violet-200">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">OKR Performance</h2>
                <p className="text-slate-500 text-sm">Objective & Key Results — ข้อมูลจริงจากระบบ (Real-Time)</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500 font-medium">กรอง:</span>
              <span className="font-bold text-violet-600">{getFilterLabel()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-bold text-slate-700">ตัวกรองช่วงเวลา</span>
        </div>

        {/* Filter Mode Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {([
            { mode: 'all' as FilterMode, label: 'ทั้งหมด' },
            { mode: 'dateRange' as FilterMode, label: 'วันที่-ถึงวันที่' },
            { mode: 'month' as FilterMode, label: 'เดือน' },
            { mode: 'quarter' as FilterMode, label: 'ไตรมาส' },
            { mode: 'year' as FilterMode, label: 'ปี' },
          ]).map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterMode === mode
                ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filter Inputs */}
        {filterMode === 'dateRange' && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 font-medium">จาก</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 font-medium">ถึง</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none" />
            </div>
          </div>
        )}

        {filterMode === 'month' && (
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none" />
        )}

        {filterMode === 'quarter' && (
          <div className="flex flex-wrap items-center gap-3">
            <select value={selectedQuarter} onChange={e => setSelectedQuarter(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none">
              {[1, 2, 3, 4].map(q => (
                <option key={q} value={q}>{QUARTER_LABELS[q]}</option>
              ))}
            </select>
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none">
              {availableYears.map(y => (
                <option key={y} value={y}>{y + 543} ({y})</option>
              ))}
            </select>
          </div>
        )}

        {filterMode === 'year' && (
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none">
            {availableYears.map(y => (
              <option key={y} value={y}>{y + 543} ({y})</option>
            ))}
          </select>
        )}

        {/* Summary */}
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
          <span>รายการทั้งหมด: <strong className="text-slate-700">{okrMetrics.totalItems.toLocaleString()}</strong></span>
          <span>NCR: <strong className="text-slate-700">{okrMetrics.totalNCR.toLocaleString()}</strong></span>
        </div>
      </div>

      {/* OKR Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* P2: Infull Rate */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded-lg"><Package className="w-4 h-4 text-blue-600" /></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">P2</span>
            </div>
            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${okrMetrics.infullRate >= 99 ? 'bg-emerald-100 text-emerald-700' : okrMetrics.infullRate >= 95 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
              {okrMetrics.infullRate >= 99 ? 'On Track' : okrMetrics.infullRate >= 95 ? 'Warning' : 'At Risk'}
            </span>
          </div>
          <h4 className="text-sm font-bold text-slate-700 mb-1">การจัดส่ง Infull</h4>
          <p className="text-[10px] text-slate-400 mb-3">ส่งขาด / ส่งเกิน / ส่งสลับไขว้</p>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-3xl font-black text-slate-800">{okrMetrics.totalInfullIssues}</div>
              <div className="text-[10px] text-slate-400 mt-1">NCR Issues (จาก {okrMetrics.totalItems.toLocaleString()} รายการ)</div>
            </div>
          </div>
          <div className="space-y-1.5 border-t border-slate-100 pt-3">
            {[
              { label: 'ส่งไม่ครบ', value: okrMetrics.infullProblems.incomplete, color: 'text-red-500' },
              { label: 'ส่งเกิน', value: okrMetrics.infullProblems.over, color: 'text-amber-500' },
              { label: 'สินค้าสลับ', value: okrMetrics.infullProblems.mixed, color: 'text-violet-500' },
              { label: 'ส่งผิด', value: okrMetrics.infullProblems.wrong, color: 'text-blue-500' },
              { label: 'ไม่ตรง INV', value: okrMetrics.infullProblems.wrongInv, color: 'text-pink-500' },
            ].map((p) => (
              <div key={p.label} className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">{p.label}</span>
                <span className={`font-bold ${p.value > 0 ? p.color : 'text-slate-300'}`}>{p.value} รายการ</span>
              </div>
            ))}
          </div>
        </div>

        {/* S1: Customer Satisfaction Score */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-teal-100 rounded-lg"><Target className="w-4 h-4 text-teal-600" /></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">S1</span>
            </div>
            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${okrMetrics.s1Score >= 100 ? 'bg-emerald-100 text-emerald-700' : okrMetrics.s1Score >= 75 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
              {okrMetrics.s1Score >= 100 ? 'Achieved' : okrMetrics.s1Score >= 75 ? 'Warning' : 'Needs Work'}
            </span>
          </div>
          <h4 className="text-sm font-bold text-slate-700 mb-1">ความพึงพอใจลูกค้า</h4>
          <p className="text-[10px] text-slate-400 mb-3">Customer Satisfaction — 4 ดัชนี</p>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-3xl font-black text-teal-600">{okrMetrics.s1PassedCount}/{okrMetrics.s1Indexes.length}</div>
              <div className="text-[10px] text-slate-400 mt-1">ผ่านเกณฑ์</div>
            </div>
          </div>
          <div className="space-y-1.5 border-t border-slate-100 pt-3">
            {okrMetrics.s1Indexes.map((idx) => (
              <div key={idx.id} className={`flex items-start gap-2 text-[11px] p-1.5 rounded-lg ${idx.passed ? 'bg-emerald-50/60' : 'bg-red-50/60'}`}>
                <span className={`mt-0.5 flex-shrink-0 ${idx.passed ? 'text-emerald-500' : 'text-red-400'}`}>{idx.passed ? '✓' : '✗'}</span>
                <span className={`font-medium ${idx.passed ? 'text-slate-600' : 'text-red-600'}`}>{idx.id}. {idx.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* B5: Damage Cost Control */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-rose-100 rounded-lg"><DollarSign className="w-4 h-4 text-rose-600" /></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">B5</span>
            </div>
            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${okrMetrics.b5Percent <= 80 ? 'bg-emerald-100 text-emerald-700' : okrMetrics.b5Percent <= 100 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
              {okrMetrics.b5Percent <= 80 ? 'Safe' : okrMetrics.b5Percent <= 100 ? 'Warning' : 'Over Budget'}
            </span>
          </div>
          <h4 className="text-sm font-bold text-slate-700 mb-1">ค่าเสียหายประจำปี</h4>
          <p className="text-[10px] text-slate-400 mb-3">เป้าหมาย ≤ ฿{okrMetrics.b5Target.toLocaleString()}</p>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-black text-slate-800">฿{okrMetrics.totalDamageCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              <div className="text-[10px] text-slate-400 mt-1">ใช้ไป {okrMetrics.b5Percent.toFixed(1)}% ของงบ</div>
            </div>
            <div className="text-right">
              <div className={`text-lg font-black ${okrMetrics.b5Percent <= 100 ? 'text-emerald-500' : 'text-red-500'}`}>฿{(okrMetrics.b5Target - okrMetrics.totalDamageCost).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              <div className="text-[10px] text-slate-400">คงเหลือ</div>
            </div>
          </div>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-2">
            <div className={`h-2 rounded-full transition-all ${okrMetrics.b5Percent <= 80 ? 'bg-emerald-500' : okrMetrics.b5Percent <= 100 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(okrMetrics.b5Percent, 100)}%` }}></div>
          </div>
        </div>

        {/* B9: Process Improvement */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-violet-100 rounded-lg"><Target className="w-4 h-4 text-violet-600" /></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">B9</span>
            </div>
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Achieved</span>
          </div>
          <h4 className="text-sm font-bold text-slate-700 mb-1">Process Improvement</h4>
          <p className="text-[10px] text-slate-400 mb-3">เป้าหมาย &gt; 2 โครงการ/ปี</p>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-3xl font-black text-violet-600">{okrMetrics.b9Projects.length}</div>
              <div className="text-[10px] text-slate-400 mt-1">โครงการ (เป้า &gt; 2)</div>
            </div>
          </div>
          <div className="space-y-1.5 border-t border-slate-100 pt-3">
            {okrMetrics.b9Projects.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <span className="text-emerald-500">✓</span>
                <span className="text-slate-600 font-medium">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* P2 Infull Breakdown Chart */}
      {okrMetrics.p2ChartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            P2 รายละเอียด: ประเภทปัญหา Infull
          </h4>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={okrMetrics.p2ChartData} margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                  {okrMetrics.p2ChartData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* All Problem Types Breakdown */}
      {okrMetrics.problemBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            รายละเอียดปัญหาทั้งหมด (NCR Problem Types)
          </h4>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={okrMetrics.problemBreakdown} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <YAxis dataKey="label" type="category" width={120} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={22}>
                  {okrMetrics.problemBreakdown.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  );
};

export default OKRPerformance;
