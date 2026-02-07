import React, { useState } from 'react';
import { RETURN_PROCESS_STEPS } from '../constants';
import { ProcessStep } from '../types';
import { ChevronDown, User, ClipboardList, AlertCircle, ArrowRight } from 'lucide-react';

const ProcessMap: React.FC = () => {
  const [selectedStep, setSelectedStep] = useState<ProcessStep | null>(null);

  const steps = RETURN_PROCESS_STEPS;

  // Helper to render a node
  const renderNode = (step: ProcessStep) => (
    <div 
      onClick={() => setSelectedStep(step)}
      className={`
        relative bg-white border-2 rounded-lg p-4 w-64 cursor-pointer transition-all duration-300 hover:shadow-md
        ${selectedStep?.id === step.id ? 'border-blue-500 shadow-blue-100 ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-300'}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center justify-center w-6 h-6 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
          {step.id}
        </span>
        <User className="w-4 h-4 text-slate-400" />
      </div>
      <h4 className="font-semibold text-slate-800 text-sm">{step.title}</h4>
      <p className="text-xs text-slate-500 mt-1 truncate">{step.role}</p>
    </div>
  );

  return (
    <div className="flex h-full">
      {/* Diagram Area */}
      <div className="flex-1 overflow-auto bg-slate-50 p-8 relative">
        <div className="flex flex-col items-center gap-8 min-w-[800px]">
          
          <h2 className="text-2xl font-bold text-slate-800 mb-4">แผนผังกระบวนการ (Process Flow)</h2>

          {/* Step 1 */}
          {renderNode(steps[0])}
          <ArrowDown />

          {/* Step 2 + Branches */}
          <div className="flex flex-col items-center">
            {renderNode(steps[1])}
            
            {/* Branches for Regions */}
            <div className="relative mt-6 pt-4 border-t-2 border-slate-300 w-[600px] flex justify-between">
              {/* Vertical connection to parent */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-4 w-0.5 bg-slate-300 -mt-4"></div>
              
              {steps[1].branches?.map((branch, idx) => (
                <div key={idx} className="relative flex flex-col items-center">
                   {/* Connection dot */}
                   <div className="absolute -top-[19px] w-2 h-2 bg-slate-400 rounded-full"></div>
                   {/* Vertical line down */}
                   <div className="h-4 w-0.5 bg-slate-300 mb-1"></div>
                   <div className="bg-slate-100 border border-slate-200 px-3 py-1 rounded text-xs font-medium text-slate-600 w-24 text-center">
                     {branch}
                   </div>
                </div>
              ))}
            </div>
          </div>

          <ArrowDown />

          {/* Step 3 */}
          {renderNode(steps[2])}
          <ArrowDown />

          {/* Step 4 */}
          {renderNode(steps[3])}
          <ArrowDown />

          {/* Step 5 */}
          {renderNode(steps[4])}
          <ArrowDown />

          {/* Step 6 + Final Branches */}
          <div className="flex flex-col items-center">
            {renderNode(steps[5])}
            
            {/* Branches for Routes */}
            <div className="flex justify-center gap-8 mt-8">
               {/* Route 3 */}
               <div className="flex flex-col items-center relative">
                 {/* Connecting Lines would ideally be SVG, simplifying with CSS borders for React mockup */}
                 <div className="absolute -top-8 left-1/2 w-0.5 h-8 bg-slate-300 transform -translate-x-[140px] rotate-[-20deg] origin-bottom"></div> 
                 {/* This line visual is approximate for the mockup */}
                 {renderNode(steps[6])}
               </div>

               {/* Sino */}
               <div className="flex flex-col items-center relative">
                 <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-300"></div>
                 {renderNode(steps[7])}
               </div>

               {/* Neo */}
               <div className="flex flex-col items-center relative">
                  <div className="absolute -top-8 right-1/2 w-0.5 h-8 bg-slate-300 transform translate-x-[140px] rotate-[20deg] origin-bottom"></div>
                 {renderNode(steps[8])}
               </div>
            </div>
          </div>

          <div className="h-20"></div> {/* Spacer */}
        </div>
      </div>

      {/* Detail Sidebar (Right) */}
      <div className={`
        fixed inset-y-0 right-0 w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-slate-100
        ${selectedStep ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {selectedStep && (
          <div className="h-full flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-blue-50">
              <div>
                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold mb-2">
                  ขั้นตอนที่ {selectedStep.id}
                </span>
                <h3 className="text-xl font-bold text-slate-900">{selectedStep.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedStep(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <ChevronDown className="w-6 h-6 transform -rotate-90" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-semibold">
                  <ClipboardList className="w-5 h-5 text-blue-500" />
                  รายละเอียดงาน
                </div>
                <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {selectedStep.description}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-semibold">
                  <User className="w-5 h-5 text-purple-500" />
                  ผู้รับผิดชอบ
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                    {selectedStep.role.charAt(0)}
                  </div>
                  <p className="text-slate-700 font-medium">{selectedStep.role}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-semibold">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  หน้าที่หลัก
                </div>
                <ul className="list-disc list-inside text-slate-600 space-y-1 ml-1">
                  {selectedStep.duties.split(' ').map((duty, idx) => (
                    duty.trim() && <li key={idx}>{duty}</li>
                  ))}
                </ul>
              </div>

              {selectedStep.branches && (
                 <div className="mt-4 pt-4 border-t border-slate-100">
                   <h4 className="text-sm font-semibold text-slate-500 mb-3">หน่วยงานย่อย / พื้นที่</h4>
                   <div className="flex flex-wrap gap-2">
                     {selectedStep.branches.map((b, i) => (
                       <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs">
                         {b}
                       </span>
                     ))}
                   </div>
                 </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm">
                อัปเดตสถานะงาน
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ArrowDown = () => (
  <div className="text-slate-300">
    <div className="h-8 w-0.5 bg-slate-300 mx-auto"></div>
    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-slate-300 mx-auto"></div>
  </div>
);

export default ProcessMap;