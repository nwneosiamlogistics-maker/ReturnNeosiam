
import React, { useMemo } from 'react';
import { useData } from '../DataContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, Legend, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, Activity, AlertTriangle, 
  Truck, CheckCircle, Clock, FileText, Package, AlertOctagon, DollarSign
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
  const { items, ncrReports } = useData();

  // 1. Operation Pipeline Metrics (5 Steps)
  const pipeline = useMemo(() => {
    return {
      requested: items.filter(i => i.status === 'Requested').length,
      received: items.filter(i => i.status === 'Received').length,
      graded: items.filter(i => i.status === 'Graded').length, // รอเอกสาร
      documented: items.filter(i => i.status === 'Documented').length, // รอจบงาน
      completed: items.filter(i => i.status === 'Completed').length
    };
  }, [items]);

  // 2. Financial Metrics
  const financials = useMemo(() => {
    const totalIntakeValue = items.reduce((acc, i) => acc + (i.priceBill || 0) * i.quantity, 0);
    
    const recoveryValue = items
      .filter(i => i.disposition === 'Restock')
      .reduce((acc, i) => acc + (i.priceSell || 0) * i.quantity, 0);

    const rtvValue = items
      .filter(i => i.disposition === 'RTV')
      .reduce((acc, i) => acc + (i.priceBill || 0) * i.quantity, 0);

    // FIX: Make backward-compatible with old flat data structure
    const ncrCost = ncrReports.reduce((acc, n) => {
        const cost = n.item?.costAmount || (n as any).costAmount || 0;
        return acc + cost;
    }, 0);

    return { totalIntakeValue, recoveryValue, rtvValue, ncrCost };
  }, [items, ncrReports]);

  // 3. Disposition Mix Data
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

  // 4. NCR Source Analysis (Root Cause)
  const ncrSourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    ncrReports.forEach(report => {
      // FIX: Make backward-compatible with old flat data structure
      let source = report.item?.problemSource || (report as any).problemSource || 'ไม่ระบุ';
      if (source.includes('ขนส่ง')) source = 'ขนส่ง (Transport)';
      else if (source.includes('คลัง')) source = 'คลังสินค้า (WH)';
      else if (source.includes('ลูกค้า')) source = 'ลูกค้า (Customer)';
      else if (source.includes('บัญชี')) source = 'บัญชี/Admin';
      
      counts[source] = (counts[source] || 0) + 1;
    });

    return Object.keys(counts)
      .map(key => ({ name: key, value: counts[key] }))
      .sort((a, b) => b.value - a.value);
  }, [ncrReports]);

  return (
    <div className="p-6 space-y-8 animate-fade-in pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">สรุปผลการปฏิบัติงาน (Operation Performance)</h2>
           <p className="text-slate-500 text-sm">ติดตามสถานะงานคงค้าง มูลค่าความเสียหาย และสถิติ NCR</p>
        </div>
        <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-sm font-bold text-blue-700">Realtime Dashboard</span>
        </div>
      </div>

      {/* 1. PIPELINE FLOW (Operations Hub) */}
      <div>
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" /> สถานะงานคงค้าง (Work in Progress Pipeline)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <PipelineCard 
                step="1" title="แจ้งคืน (Request)" count={pipeline.requested} 
                icon={FileText} color="bg-slate-100 text-slate-600" 
                desc="รอรับเข้า" 
            />
            <PipelineCard 
                step="2" title="รับสินค้า (Intake)" count={pipeline.received} 
                icon={Package} color="bg-amber-50 text-amber-600 border-amber-200" 
                desc="รอ QC" isAlert={pipeline.received > 20}
            />
            <PipelineCard 
                step="3" title="ตรวจสอบ (QC)" count={pipeline.graded} 
                icon={Activity} color="bg-blue-50 text-blue-600 border-blue-200" 
                desc="รอออกเอกสาร" 
            />
            <PipelineCard 
                step="4" title="เอกสาร (Docs)" count={pipeline.documented} 
                icon={FileText} color="bg-purple-50 text-purple-600 border-purple-200" 
                desc="รอปิดงาน" 
            />
            <PipelineCard 
                step="5" title="จบงาน (Done)" count={pipeline.completed} 
                icon={CheckCircle} color="bg-green-50 text-green-600 border-green-200" 
                desc="รายการสำเร็จ" 
            />
        </div>
      </div>

      {/* 2. FINANCIAL & NCR OVERVIEW */}
      <div>
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> ประสิทธิภาพทางการเงิน (Financial Impact)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
            title="มูลค่ารับเข้า (Total Intake)" 
            value={`฿${financials.totalIntakeValue.toLocaleString()}`} 
            subText="มูลค่ารวมตามหน้าบิล"
            icon={Package} 
            color="bg-slate-700"
            />
            <StatCard 
            title="มูลค่ากู้คืน (Recovery)" 
            value={`฿${financials.recoveryValue.toLocaleString()}`} 
            subText="จากการนำกลับมาขาย (Restock)"
            icon={TrendingUp} 
            color="bg-green-600"
            />
            <StatCard 
            title="มูลค่าคืนเครดิต (RTV)" 
            value={`฿${financials.rtvValue.toLocaleString()}`} 
            subText="ส่งคืนผู้จำหน่าย/โรงงาน"
            icon={Truck} 
            color="bg-amber-500"
            />
            <StatCard 
            title="ต้นทุนความเสียหาย NCR" 
            value={`฿${financials.ncrCost.toLocaleString()}`} 
            subText={`จาก NCR ${ncrReports.length} รายการ`}
            icon={AlertOctagon} 
            color="bg-red-500"
            isAlert
            />
        </div>
      </div>

      {/* 3. CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Disposition Mix */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
           <div className="mb-4">
             <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
               <CheckCircle className="w-5 h-5 text-blue-600" />
               การตัดสินใจ (Disposition Mix)
             </h3>
             <p className="text-xs text-slate-500">สัดส่วนปลายทางของสินค้าที่ผ่าน QC</p>
           </div>
           
           <div className="flex-1 min-h-[250px] relative">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={dispositionData}
                   innerRadius={60}
                   outerRadius={80}
                   paddingAngle={5}
                   dataKey="value"
                 >
                   {dispositionData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.color} />
                   ))}
                 </Pie>
                 <Tooltip formatter={(value) => `${value} รายการ`} />
                 <Legend verticalAlign="bottom" height={36} />
               </PieChart>
             </ResponsiveContainer>
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                <span className="text-3xl font-bold text-slate-800">
                    {items.filter(i => i.status === 'Completed' || i.status === 'Documented').length}
                </span>
                <span className="text-[10px] text-slate-500 uppercase">Decided</span>
             </div>
           </div>
        </div>

        {/* NCR Root Cause Analysis */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2 flex flex-col">
           <div className="mb-6 flex justify-between items-start">
             <div>
               <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                 <AlertOctagon className="w-5 h-5 text-red-500" />
                 วิเคราะห์สาเหตุปัญหา (NCR Root Cause)
               </h3>
               <p className="text-xs text-slate-500">สถิติจากระบบ NCR เพื่อการป้องกันปัญหาซ้ำ</p>
             </div>
             <div className="text-right">
                <div className="text-2xl font-bold text-slate-700">{ncrReports.length}</div>
                <div className="text-xs text-slate-500">Total NCR Reports</div>
             </div>
           </div>
           
           <div className="flex-1 w-full min-h-[250px]">
            {ncrSourceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ncrSourceData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 12, fill: '#475569' }} />
                    <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24}>
                        {ncrSourceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#64748b'} />
                        ))}
                    </Bar>
                </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-slate-400 italic">
                    ยังไม่มีข้อมูล NCR
                </div>
            )}
           </div>
        </div>
      </div>
    </div>
  );
};

// Component: Pipeline Card
const PipelineCard = ({ step, title, count, icon: Icon, color, desc, isAlert }: any) => (
    <div className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all ${color} ${isAlert ? 'ring-2 ring-red-400 bg-red-50' : ''}`}>
        <div className="text-[10px] font-bold opacity-60 uppercase mb-1">Step {step}</div>
        <div className="mb-2 p-2 bg-white bg-opacity-50 rounded-full">
            <Icon className="w-5 h-5" />
        </div>
        <div className={`text-2xl font-bold mb-1 ${isAlert ? 'text-red-600' : ''}`}>{count}</div>
        <div className="text-xs font-bold truncate w-full">{title}</div>
        <div className="text-[10px] opacity-70 mt-1">{desc}</div>
    </div>
);

// Component: Stat Card
const StatCard = ({ title, value, subText, icon: Icon, color, isAlert }: any) => (
  <div className={`bg-white rounded-xl shadow-sm border p-5 flex items-start justify-between transition-transform hover:-translate-y-1 duration-200 ${isAlert ? 'border-red-200 bg-red-50/10' : 'border-slate-100'}`}>
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{title}</p>
      <h3 className={`text-2xl font-bold mb-1 ${isAlert ? 'text-red-600' : 'text-slate-800'}`}>{value}</h3>
      <p className="text-xs text-slate-400">{subText}</p>
    </div>
    <div className={`p-3 rounded-lg shadow-sm ${color} text-white`}>
      <Icon className="w-5 h-5" />
    </div>
  </div>
);

export default Dashboard;
