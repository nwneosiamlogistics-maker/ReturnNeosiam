
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../DataContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, AreaChart, Area, Line
} from 'recharts';
import {
  Truck, CheckCircle, Clock, FileText, Package, AlertOctagon, DollarSign, Trash2, MapPin, Box,
  TrendingUp, Activity, AlertTriangle, RotateCcw
} from 'lucide-react';

const COLORS = {
  Restock: '#22c55e', // Green
  RTV: '#f59e0b',     // Amber
  Recycle: '#ef4444', // Red
  Claim: '#3b82f6',   // Blue
  InternalUse: '#a855f7', // Purple
  Pending: '#94a3b8'  // Slate
};

const Dashboard: React.FC = () => {

  const { items: allItems, ncrReports: allNcrReports, dataRangeDays, setDataRangeDays } = useData();

  // Client-side date filtering based on dataRangeDays
  const items = useMemo(() => {
    if (dataRangeDays >= 9999) return allItems;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - dataRangeDays);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return allItems.filter(i => i.date >= cutoffStr);
  }, [allItems, dataRangeDays]);

  const ncrReports = useMemo(() => {
    if (dataRangeDays >= 9999) return allNcrReports;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - dataRangeDays);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return allNcrReports.filter(n => n.date >= cutoffStr);
  }, [allNcrReports, dataRangeDays]);

  // 1. Operation Pipeline Metrics (Aligned with New 6-Step Workflow)
  const pipeline = useMemo(() => {
    return {
      requests: items.filter(i => i.status === 'Draft' || i.status === 'Requested').length,      // Step 1: New Requests
      logistics: items.filter(i => i.status === 'InTransitHub').length,                          // Step 2: In Transport
      receiving: items.filter(i => i.status === 'ReceivedAtHub' || i.status === 'Received').length, // Step 3: At Hub
      qc: items.filter(i => i.status === 'QCPassed' || i.status === 'QCFailed' || i.status === 'Graded').length, // Step 4: QC Done
      disposition: items.filter(i => i.status === 'ReturnToSupplier' || i.status === 'Documented').length, // Step 5: Preparing/Docs
      completed: items.filter(i => i.status === 'Completed').length    // Step 6: Closed
    };
  }, [items]);

  // 1.1 Stock Summary (Inventory Snapshot)
  const stockSummary = useMemo(() => {
    // Helper to calc on-hand (In - Out)
    const calcOnHand = (disp: string) => {
      // Logic mirrors Inventory.tsx: IN (Graded) - OUT (Documented/Completed)
      // Note: In Dashboard, we simplify to "Current Status" based.
      // Items that are "QCPassed" or "QCFailed" or "Graded" but NOT yet "ReturnToSupplier" or "Completed" are theoretically "On Hand" at Hub?
      // OR specifically items marked with that disposition that haven't left.

      // Let's use the 'Inventory' logic: 
      // IN = DateGraded exists
      // OUT = DateDocumented or DateCompleted exists
      // OnHand = IN - OUT

      let inCount = 0;
      let outCount = 0;

      items.filter(i => i.disposition === disp).forEach(i => {
        // Fix for Negative Stock:
        // Only count as "In" if dateGraded exists (Standard Flow)
        // Only count as "Out" if dateGraded exists AND (dateDocumented or dateCompleted) exists.
        // This prevents "Direct Returns" (which have no dateGraded) from being counted as "Out" without an "In".
        if (i.dateGraded) {
          inCount++;
          if (i.dateDocumented || i.dateCompleted) outCount++;
        }
      });

      return inCount - outCount;
    };

    return {
      restock: calcOnHand('Restock'),
      rtv: calcOnHand('RTV'),
      claim: calcOnHand('Claim'),
      internal: calcOnHand('InternalUse'),
      scrap: calcOnHand('Recycle'),
      // New Metric: Direct Return (Count of items that bypassed Hub QC and were sent back directly)
      directReturn: items.filter(i => i.disposition === 'RTV' && !i.dateGraded && (i.dateDocumented || i.dateCompleted)).length
    };
  }, [items]);

  // 1.2 Inbound Collection Stats (Synced with COL Report)
  const collectionStats = useMemo(() => {
    // Exact Filter Logic from COLReport.tsx
    const collectionItems = items.filter(item => {
      // Must NOT be NCR (unless LOGISTICS type, but usually COL items are distinct)
      if (item.documentType === 'NCR' || (item.ncrNumber && item.documentType !== 'LOGISTICS')) {
        return false;
      }
      return true;
    });

    return {
      requests: collectionItems.filter(i => i.status === 'Requested').length,
      assigned: collectionItems.filter(i => i.status === 'COL_JobAccepted').length,
      collected: collectionItems.filter(i => i.status === 'COL_BranchReceived').length,
      consolidated: collectionItems.filter(i => i.status === 'COL_Consolidated').length,
      transit: collectionItems.filter(i => i.status === 'COL_InTransit').length,
      // Hub Received + Documented = Step 6 (Pending Closure)
      pendingCompletion: collectionItems.filter(i => i.status === 'COL_HubReceived' || i.status === 'COL_Documented').length,
      completed: collectionItems.filter(i => i.status === 'Completed').length
    };
  }, [items]);

  // 2. Financial Metrics & Cost Analysis
  const financials = useMemo(() => {
    let totalIntakeValue = 0;
    let recoveryValue = 0;
    let rtvValue = 0;
    let ncrCost = 0;

    const costByResponsible: Record<string, number> = {};
    const costBySource: Record<string, number> = {};

    // Calculate from Items (Returns)
    items.forEach(i => {
      const qty = i.quantity || 0;
      const price = i.priceBill || 0;
      totalIntakeValue += price * qty;

      if (i.disposition === 'Restock') recoveryValue += (i.priceSell || 0) * qty;
      if (i.disposition === 'RTV') rtvValue += price * qty;

      if (i.hasCost && i.costAmount) {
        // Track direct costs from items
        const responsible = i.costResponsible || 'Unassigned';
        const source = i.problemSource || 'Other';
        costByResponsible[responsible] = (costByResponsible[responsible] || 0) + i.costAmount;
        costBySource[source] = (costBySource[source] || 0) + i.costAmount;
      }
    });

    // Calculate from NCR Reports
    ncrReports.filter(n => n.status !== 'Canceled').forEach(n => {
      // Use cost from Item if available, else from report root
      const cost = n.item?.costAmount || (n as { costAmount?: number }).costAmount || 0;
      // Only add if not already counted via items to avoid double counting? 
      // For safety in this hybrid system, we'll assume NCR reports might cover things NOT in items list or additional costs.
      // But typically they are linked. Let's just sum NCR specific costs if we consider them "Extra".
      // Simplification: Just sum them for "Cost Impact" visualisation.
      ncrCost += cost;
    });

    // Convert to Chart Data
    const costResponsibleData = Object.entries(costByResponsible)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5

    return { totalIntakeValue, recoveryValue, rtvValue, ncrCost, costResponsibleData };
  }, [items, ncrReports]);

  // 3. Disposition Mix
  const dispositionData = useMemo(() => {
    const counts: Record<string, number> = { Restock: 0, RTV: 0, Recycle: 0, Claim: 0, InternalUse: 0 };
    items.forEach(item => {
      if (item.disposition && item.disposition !== 'Pending' && counts[item.disposition] !== undefined) {
        counts[item.disposition]++;
      }
    });

    return [
      { name: 'ขาย (Restock)', value: counts.Restock, color: COLORS.Restock },
      { name: 'ส่งคืน (RTV)', value: counts.RTV, color: COLORS.RTV },
      { name: 'เคลม (Claim)', value: counts.Claim, color: COLORS.Claim },
      { name: 'ทิ้ง (Scrap)', value: counts.Recycle, color: COLORS.Recycle },
      { name: 'ใช้ภายใน (Internal)', value: counts.InternalUse, color: COLORS.InternalUse },
    ].filter(i => i.value > 0);
  }, [items]);



  // 6. NCR Root Cause & Process Stats
  const ncrStats = useMemo(() => {
    const rootCauses: Record<string, number> = {};
    const causes = { Packaging: 0, Transport: 0, Operation: 0, Environment: 0 };

    ncrReports.filter(n => n.status !== 'Canceled').forEach(report => {
      // Root Cause
      let source = report.item?.problemSource || (report as { problemSource?: string }).problemSource || 'Other';

      // Normalize Source (Merge Other/Others)
      const s = source.trim().toLowerCase();
      if (s === 'other' || s === 'others' || s.startsWith('other') || s.includes('อื่นๆ') || s === '-') source = 'อื่นๆ';
      else if (s === 'customer') source = 'ลูกค้า (Customer)';
      else if (s === 'transport' || s.includes('transport')) source = 'ขนส่ง (Transport)';
      else if (source.startsWith('ระหว่างขนส่ง')) source = 'ขนส่ง (Transport)';

      rootCauses[source] = (rootCauses[source] || 0) + 1;

      // Process Causes
      if (report.causePackaging) causes.Packaging++;
      if (report.causeTransport) causes.Transport++;
      if (report.causeOperation) causes.Operation++;
      if (report.causeEnv) causes.Environment++;
    });

    const rootCauseData = Object.entries(rootCauses)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const causeData = [
      { name: 'Packaging', value: causes.Packaging },
      { name: 'Transport', value: causes.Transport },
      { name: 'Operation', value: causes.Operation },
      { name: 'Environment', value: causes.Environment },
    ].filter(i => i.value > 0);

    return { rootCauseData, causeData };
  }, [ncrReports]);

  return (
    <div className="p-3 md:p-6 space-y-6 md:space-y-8 animate-fade-in pb-20">

      {/* Header - Enhanced with glassmorphism */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-3xl"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-white/50 shadow-xl shadow-indigo-100/50">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-200">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">สรุปผลการปฏิบัติงาน</h2>
            </div>
            <p className="text-slate-500 text-sm pl-14">Operation Performance Dashboard - ติดตาม Pipeline, Inventory และ Analysis</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={dataRangeDays}
              onChange={(e) => setDataRangeDays(Number(e.target.value))}
              className="px-3 py-2 text-sm font-semibold bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none cursor-pointer"
              title="ช่วงข้อมูล"
            >
              <option value={30}>ย้อนหลัง 30 วัน</option>
              <option value={60}>ย้อนหลัง 60 วัน</option>
              <option value={90}>ย้อนหลัง 90 วัน</option>
              <option value={180}>ย้อนหลัง 180 วัน</option>
              <option value={365}>ย้อนหลัง 1 ปี</option>
              <option value={9999}>ทั้งหมด</option>
            </select>
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 rounded-full flex items-center gap-2 shadow-lg shadow-emerald-200">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              <span className="text-sm font-bold text-white">Live Status</span>
            </div>
          </div>
        </div>
      </div>

      {/* 1. INBOUND COLLECTION PIPELINE (New) */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl shadow-md">
            <Truck className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">ระบบงานรับสินค้า</h3>
            <p className="text-xs text-slate-400">Inbound Collection System</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <PipelineCard step="1" title="ใบสั่งงาน (Request)" count={collectionStats.requests} icon={FileText} variant="teal" desc="รอจ่ายงาน" />
          <PipelineCard step="2" title="รับงาน (Job)" count={collectionStats.assigned} icon={MapPin} variant="blue" desc="รถเข้ารับ" />
          <PipelineCard step="3" title="รับของ (Collected)" count={collectionStats.collected} icon={Box} variant="emerald" desc="เข้าสาขา" />
          <PipelineCard step="4" title="จุดพัก (Hub)" count={collectionStats.consolidated} icon={Package} variant="purple" desc="รอขนส่ง" />
          <PipelineCard step="5" title="ขนส่ง (Transit)" count={collectionStats.transit} icon={Truck} variant="indigo" desc="เข้า Ops Hub" />
          <PipelineCard step="6" title="รอปิดงาน (Pending)" count={collectionStats.pendingCompletion} icon={Clock} variant="amber" desc="Direct/Docs" />
          <PipelineCard step="7" title="จบงาน (Completed)" count={collectionStats.completed} icon={CheckCircle} variant="rose" desc="สำเร็จ" />
        </div>
      </div>

      {/* 2. OPERATIONS HUB PIPELINE */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-slate-600 to-slate-800 rounded-xl shadow-md">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">ศูนย์ปฏิบัติการคืนสินค้า</h3>
            <p className="text-xs text-slate-400">Return Operations Hub</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <PipelineCard step="1" title="แจ้งคืน (Request)" count={pipeline.requests} icon={FileText} variant="slate" desc="รออนุมัติ" />
          <PipelineCard step="2" title="ขนส่ง (Logistics)" count={pipeline.logistics} icon={Truck} variant="amber" desc="ระหว่างทาง" />
          <PipelineCard step="3" title="รับเข้า (Receive)" count={pipeline.receiving} icon={Package} variant="blue" desc="ถึง Hub" />
          <PipelineCard step="4" title="ตรวจสอบ (QC)" count={pipeline.qc} icon={Activity} variant="purple" desc="รอคัดแยก" />
          <PipelineCard step="5" title="คลัง/เอกสาร" count={pipeline.disposition} icon={FileText} variant="indigo" desc="รอปิดงาน" />
          <PipelineCard step="6" title="ปิดงาน (Done)" count={pipeline.completed} icon={CheckCircle} variant="emerald" desc="สำเร็จ" />
        </div>
      </div>

      {/* 2. INVENTORY STOCK SUMMARY (New Section) */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md">
            <Package className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">สรุปสต็อกคงคลัง</h3>
            <p className="text-xs text-slate-400">Inventory On-Hand</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <StockCard title="สินค้าขาย (Sellable)" count={stockSummary.restock} variant="green" icon={CheckCircle} subTitle="Fully Recovered" />
          <StockCard title="สินค้าคืน (RTV)" count={stockSummary.rtv} variant="orange" icon={Truck} subTitle="To Vendor" />
          <StockCard title="เคลม (Claim)" count={stockSummary.claim} variant="blue" icon={AlertTriangle} subTitle="Awaiting Claim" />
          <StockCard title="ใช้ภายใน (Internal)" count={stockSummary.internal} variant="purple" icon={Box} subTitle="In-House Use" />
          <StockCard title="ซาก (Scrap)" count={stockSummary.scrap} variant="red" icon={Trash2} subTitle="Scrapped" />
          <StockCard title="ส่งคืนตรง (Direct)" count={stockSummary.directReturn} variant="slate" icon={RotateCcw} subTitle="Bypassed Hub" />
        </div>
      </div>

      {/* 3. FINANCIAL PERFORMANCE */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-md">
            <DollarSign className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">ประสิทธิภาพทางการเงิน</h3>
            <p className="text-xs text-slate-400">Financial Impact Analysis</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          < StatCard title="Total Intake" value={`฿${financials.totalIntakeValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} subText="มูลค่ารับเข้าทั้งระบบ" icon={Package} variant="dark" />
          <StatCard title="Recovery Value" value={`฿${financials.recoveryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} subText="รายได้จากการขายคืน (Restock)" icon={TrendingUp} variant="green" />
          <StatCard title="RTV Credit" value={`฿${financials.rtvValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} subText="เครดิตจากการส่งคืน (RTV)" icon={Truck} variant="orange" />
          <StatCard title="Cost Impact" value={`฿${financials.ncrCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} subText="มูลค่าความเสียหาย (NCR & Costs)" icon={AlertOctagon} variant="red" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 3. TRENDS & ANALYSIS (Main Chart) - Spans 2 Columns */}
        <div className="lg:col-span-2 bg-white p-4 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col">
          <div className="mb-8 flex flex-col justify-between items-start gap-2">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1.5 h-8 bg-indigo-600 rounded-full"></div>
                <h3 className="text-xl font-bold text-slate-800">
                  แนวโน้มการรับคืนและมูลค่า (Return Trends)
                </h3>
              </div>
              <p className="text-sm text-slate-400 pl-4">เปรียบเทียบปริมาณสินค้า (ชิ้น) กับมูลค่าความเสียหาย (บาท)</p>
            </div>
            {/* Custom Legend */}
            <div className="flex items-center gap-6 pl-4 mt-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                <span className="text-xs font-bold text-slate-600">ปริมาณรับเข้า (Qty)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 border-2 border-white ring-1 ring-amber-500"></span>
                <span className="text-xs font-bold text-slate-600">มูลค่าความเสียหาย (Cost)</span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-[350px] w-full">
            {/* Mock Data for Trend - In real app, compute from 'items' dates */}
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { name: 'Mon', qty: 120, cost: 5000 },
                { name: 'Tue', qty: 132, cost: 4500 },
                { name: 'Wed', qty: 101, cost: 8000 },
                { name: 'Thu', qty: 134, cost: 2000 },
                { name: 'Fri', qty: 190, cost: 6000 },
                { name: 'Sat', qty: 230, cost: 9000 },
                { name: 'Sun', qty: 210, cost: 12000 },
              ]}>
                <defs>
                  <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#f59e0b', fontSize: 12 }} unit="฿" />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="qty"
                  stroke="#6366f1"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorQty)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cost"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#f59e0b' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. TOP CRITICAL (Pink Bars) */}
        <div className="bg-white p-4 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1.5 h-8 bg-pink-500 rounded-full"></div>
              <h3 className="text-xl font-bold text-slate-800 leading-tight">
                5 อันดับความเสียหาย<br />(Top Critical Costs)
              </h3>
            </div>
          </div>
          <div className="flex-1 min-h-[300px]">
            {financials.costResponsibleData.length > 0 ? (
              <div className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financials.costResponsibleData} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f8fafc" />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={80}
                      tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: '#fee2e2', opacity: 0.4, radius: 8 }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      formatter={(val: number) => `฿${val.toLocaleString()}`}
                    />
                    <Bar
                      dataKey="value"
                      fill="#ec4899"
                      radius={[0, 10, 10, 0]}
                      barSize={12}
                      background={{ fill: '#fce7f3', radius: [0, 10, 10, 0] }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">ไม่มีข้อมูลค่าใช้จ่าย</div>
            )}
          </div>
        </div>

      </div>

      {/* 5. DISPOSITION MIX (Donut) & NCR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
        {/* Donut Chart */}
        <div className="bg-white p-4 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-800"></span>
            สัดส่วนการจัดการสินค้า (Disposition Mix)
          </h3>
          <div className="h-[350px] md:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dispositionData}
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  cornerRadius={8}
                  cx="50%"
                  cy="40%"
                >
                  {dispositionData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px' }} />
                <Legend verticalAlign="bottom" align="center" layout="horizontal" iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* NCR Area Chart */}
        <div className="bg-white p-4 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-600"></span>
            สาเหตุปัญหา (Problem Sources)
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ncrStats.rootCauseData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f8fafc" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f3e8ff' }} contentStyle={{ borderRadius: '12px' }} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 8, 8, 0]} barSize={20} background={{ fill: '#f3e8ff', radius: [0, 8, 8, 0] }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {/* Password Modal - REMOVED, REPLACED BY SWAL */}

    </div >
  );
};

const CountUpNumber = React.memo(({ end, duration = 1500 }: { end: number, duration?: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);

      // Easing function: easeOutExpo
      const easeOut = (x: number) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x));

      setCount(Math.floor(easeOut(percentage) * end));

      if (progress < duration) {
        requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };
    requestAnimationFrame(animate);
  }, [end, duration]);

  return <>{count.toLocaleString()}</>;
});
CountUpNumber.displayName = 'CountUpNumber';

// Component: Pipeline Card (Fresh Professional Design) - Memoized
const PipelineCard = React.memo(({ step, title, count, icon: Icon, variant = 'blue', desc }: { step: string, title: string, count: number, icon: React.ElementType, variant?: string, desc: string }) => {
  // Color Themes (Pastel & Clean)
  const themes = {
    teal: { border: 'border-teal-200', bg: 'bg-teal-50', iconColor: 'text-teal-600', blob: 'bg-teal-100', hoverBorder: 'group-hover:border-teal-400' },
    blue: { border: 'border-blue-200', bg: 'bg-blue-50', iconColor: 'text-blue-600', blob: 'bg-blue-100', hoverBorder: 'group-hover:border-blue-400' },
    indigo: { border: 'border-indigo-200', bg: 'bg-indigo-50', iconColor: 'text-indigo-600', blob: 'bg-indigo-100', hoverBorder: 'group-hover:border-indigo-400' },
    purple: { border: 'border-purple-200', bg: 'bg-purple-50', iconColor: 'text-purple-600', blob: 'bg-purple-100', hoverBorder: 'group-hover:border-purple-400' },
    amber: { border: 'border-amber-200', bg: 'bg-amber-50', iconColor: 'text-amber-600', blob: 'bg-amber-100', hoverBorder: 'group-hover:border-amber-400' },
    emerald: { border: 'border-emerald-200', bg: 'bg-emerald-50', iconColor: 'text-emerald-600', blob: 'bg-emerald-100', hoverBorder: 'group-hover:border-emerald-400' },
    rose: { border: 'border-rose-200', bg: 'bg-rose-50', iconColor: 'text-rose-600', blob: 'bg-rose-100', hoverBorder: 'group-hover:border-rose-400' },
    slate: { border: 'border-slate-200', bg: 'bg-slate-50', iconColor: 'text-slate-600', blob: 'bg-slate-200', hoverBorder: 'group-hover:border-slate-400' },
  };

  const theme = themes[variant] || themes.blue;

  return (
    <div className={`relative p-3 md:p-5 rounded-[2rem] border ${theme.border} ${theme.bg} flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:ring-2 hover:ring-offset-2 hover:ring-transparent ${theme.hoverBorder} cursor-pointer overflow-hidden group h-full min-h-[160px] md:min-h-[220px]`}>
      {/* Decorative Blob */}
      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full ${theme.blob} opacity-60 blur-2xl transition-transform duration-500 group-hover:scale-150`}></div>

      {/* Step Label */}
      <div className="relative z-10 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 transition-colors group-hover:text-slate-600">
        Step {step}
      </div>

      {/* Icon Circle */}
      <div className={`relative z-10 mb-4 p-4 rounded-full shadow-sm bg-white ring-4 ring-white/50 ${theme.iconColor} transition-transform duration-300 group-hover:scale-110 group-hover:shadow-md`}>
        <Icon className="w-6 h-6" strokeWidth={1.5} />
      </div>

      {/* Count */}
      <div className="relative z-10 text-3xl md:text-4xl font-black text-slate-800 mb-2 transition-all group-hover:scale-105">
        <CountUpNumber end={count} />
      </div>

      {/* Title */}
      <div className="relative z-10 text-xs font-bold text-slate-600 truncate w-full mb-1 px-2">
        {title}
      </div>

      {/* Desc */}
      <div className="relative z-10 text-[10px] text-slate-400 font-medium">
        {desc}
      </div>
    </div>
  );
});
PipelineCard.displayName = 'PipelineCard';

// Component: Stat Card (Financials - Premium Design) - Memoized
const StatCard = React.memo(({ title, value, subText, icon: Icon, variant = 'default' }: { title: string, value: string, subText: string, icon: React.ElementType, variant: string }) => {
  // Define styles for different variants
  const styles = {
    dark: "bg-slate-900 text-white border-none shadow-xl shadow-slate-200 hover:shadow-slate-400/50",
    green: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-none shadow-xl shadow-emerald-200 hover:shadow-emerald-400/50",
    orange: "bg-gradient-to-br from-amber-400 to-orange-600 text-white border-none shadow-xl shadow-orange-200 hover:shadow-orange-400/50",
    red: "bg-gradient-to-br from-red-500 to-rose-600 text-white border-none shadow-xl shadow-red-200 hover:shadow-red-400/50",
    default: "bg-white text-slate-800 border-slate-100 shadow-sm hover:border-blue-300"
  };

  const currentStyle = styles[variant] || styles.default;
  const isDark = variant !== 'default';

  return (
    <div className={`relative overflow-hidden rounded-[2rem] p-4 md:p-6 flex flex-col justify-between h-36 md:h-40 transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl cursor-pointer group ${currentStyle}`}>
      {/* Abstract Background Shapes */}
      {isDark && (
        <>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-2xl transition-transform group-hover:scale-125 duration-700"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-black opacity-10 rounded-full -ml-8 -mb-8 blur-xl transition-transform group-hover:scale-150 duration-700"></div>
        </>
      )}

      <div className="relative z-10 flex justify-between items-start">
        <div>
          <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-white/70' : 'text-slate-500'}`}>{title}</p>
          <div className={`p-2 rounded-lg inline-flex ${isDark ? 'bg-white/20 backdrop-blur-sm text-white' : 'bg-slate-100 text-slate-600'}`}>
            <span className="text-[10px] font-medium">{subText}</span>
          </div>
        </div>
        <div className={`p-3 rounded-2xl ${isDark ? 'bg-white/20 backdrop-blur-md text-white' : 'bg-slate-100 text-slate-600'} transition-transform group-hover:rotate-12`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      <div className="relative z-10 mt-auto">
        <h3 className="text-2xl md:text-3xl font-black tracking-tight group-hover:scale-105 transition-transform origin-left">{value}</h3>
      </div>
    </div>
  );
});
StatCard.displayName = 'StatCard';

// Component: Stock Card (Vibrant Pill Design) - Memoized
const StockCard = React.memo(({ title, count, variant, icon: Icon, subTitle }: { title: string, count: number, variant: string, icon?: React.ElementType, subTitle: string }) => {
  const styles = {
    blue: "bg-gradient-to-br from-[#4f46e5] to-[#3b82f6] shadow-indigo-300", // Indigo - Blue
    orange: "bg-gradient-to-br from-[#f97316] to-[#ef4444] shadow-orange-300", // Orange - Red
    green: "bg-gradient-to-br from-[#10b981] to-[#059669] shadow-emerald-300", // Emerald
    purple: "bg-gradient-to-br from-[#a855f7] to-[#d946ef] shadow-purple-300", // Purple - Fuchsia
    red: "bg-gradient-to-br from-[#ef4444] to-[#be123c] shadow-rose-300",     // Red
    amber: "bg-gradient-to-br from-[#f59e0b] to-[#d97706] shadow-amber-300",   // Amber
    slate: "bg-gradient-to-br from-[#64748b] to-[#475569] shadow-slate-300",   // Slate
  };

  const style = styles[variant] || styles.slate;

  return (
    <div className={`relative overflow-hidden rounded-[2rem] p-6 h-44 flex flex-col justify-between shadow-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl cursor-pointer group ${style}`}>

      {/* Background Icon Watermark */}
      {Icon && (
        <div className="absolute -bottom-6 -right-6 opacity-20 transform rotate-[-10deg] group-hover:scale-110 group-hover:rotate-0 transition-all duration-500 ease-out">
          <Icon className="w-36 h-36 text-white" strokeWidth={1} />
        </div>
      )}

      {/* Top Label */}
      <div className="relative z-10">
        <div className="text-white/90 text-sm font-bold tracking-wide mb-1 drop-shadow-sm flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-white rounded-full inline-block"></span>
          {title}
        </div>
      </div>

      {/* Main Number */}
      <div className="relative z-10 text-white font-black text-4xl md:text-6xl leading-none tracking-tight drop-shadow-md flex items-baseline gap-2 my-2">
        <CountUpNumber end={count} />
        <span className="text-xl font-bold opacity-70 tracking-normal">ชิ้น</span>
      </div>

      {/* Bottom Badge */}
      <div className="relative z-10 self-start mt-auto">
        <div className="bg-white/20 backdrop-blur-md rounded-full px-4 py-1.5 border border-white/10 text-[10px] font-bold text-white tracking-widest uppercase shadow-sm">
          {subTitle || 'STATUS'}
        </div>
      </div>

    </div>
  );
});
StockCard.displayName = 'StockCard';

export default Dashboard;
