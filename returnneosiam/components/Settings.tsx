
import React, { useState } from 'react';
import { useData } from '../DataContext';
import { db } from '../firebase';
import { ref, remove, set } from 'firebase/database';
import { Settings as SettingsIcon, Send, CheckCircle2, AlertCircle, Save, Bell, Shield, Info, RotateCcw, Wrench, Trash2, ImageIcon, HardDrive } from 'lucide-react';
import { sendTelegramMessage } from '../utils/telegramService';
import { migrateBase64Images, migrateFirebaseImagesToNAS, fixNasImageExtensions, MigrationProgress } from '../utils/migrateImages';
import Swal from 'sweetalert2';

const Settings: React.FC = () => {
    const { systemConfig, updateSystemConfig, runDataIntegrityCheck, repairMissingReturnRecords } = useData();
    const [isTesting, setIsTesting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [migrationProgress, setMigrationProgress] = useState<MigrationProgress | null>(null);

    const [telegramData, setTelegramData] = useState({
        botToken: systemConfig.telegram?.botToken || '',
        chatId: systemConfig.telegram?.chatId || '',
        enabled: systemConfig.telegram?.enabled || false
    });

    const [nasData, setNasData] = useState({
        apiUrl: systemConfig.nas?.apiUrl || '',
        apiKey: systemConfig.nas?.apiKey || '',
        enabled: systemConfig.nas?.enabled || false
    });

    const [isTestingNas, setIsTestingNas] = useState(false);
    const [nasUnlocked, setNasUnlocked] = useState(false);

    const handleUnlockNAS = async () => {
        const { value: password } = await Swal.fire({
            title: 'ปลดล็อคการตั้งค่า NAS',
            text: 'กรุณากรอกรหัสผ่านเพื่อแก้ไขค่า NAS',
            input: 'password',
            inputPlaceholder: 'Enter password',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ปลดล็อค',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#059669',
        });
        if (password === 'sansan856') {
            setNasUnlocked(true);
            Swal.fire({ icon: 'success', title: 'ปลดล็อคแล้ว', timer: 1500, showConfirmButton: false });
        } else if (password !== undefined) {
            Swal.fire('รหัสผ่านไม่ถูกต้อง', '', 'error');
        }
    };

    const handleTestNAS = async () => {
        if (!nasData.apiUrl || !nasData.apiKey) {
            Swal.fire('กรุณากรอกข้อมูล', 'ใส่ NAS API URL และ API Key ก่อนทดสอบ', 'warning');
            return;
        }
        setIsTestingNas(true);
        try {
            const { testNASConnection } = await import('../utils/nasUpload');
            const result = await testNASConnection(nasData);
            if (result.success) {
                Swal.fire({ icon: 'success', title: 'เชื่อมต่อ NAS สำเร็จ!', text: 'API Key ถูกต้อง — พร้อมอัปโหลดไฟล์', timer: 3000 });
            } else {
                Swal.fire({ icon: 'error', title: 'เชื่อมต่อไม่สำเร็จ', text: result.error || 'Unknown error' });
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'เชื่อมต่อไม่ได้', text: `${(err as Error).message}` });
        } finally {
            setIsTestingNas(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        const success = await updateSystemConfig({
            telegram: telegramData,
            nas: nasData
        });
        setIsSaving(false);

        if (success) {
            Swal.fire({
                icon: 'success',
                title: 'บันทึกการตั้งค่าสำเร็จ',
                text: 'ข้อมูลการตั้งค่าระบบถูกอัปเดตแล้ว',
                timer: 1500,
                showConfirmButton: false,
                background: '#fff',
                customClass: {
                    popup: 'rounded-2xl shadow-xl'
                }
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'บันทึกไม่สำเร็จ',
                text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
            });
        }
    };

    const handleTestNotification = async () => {
        if (!telegramData.botToken || !telegramData.chatId) {
            Swal.fire({
                icon: 'warning',
                title: 'ข้อมูลไม่ครบถ้วน',
                text: 'กรุณากรอก Bot Token และ Chat ID ก่อนทดสอบ'
            });
            return;
        }

        setIsTesting(true);
        const testMessage = `🧪 <b>ทดสอบการเชื่อมต่อ Notification</b>\n----------------------------------\nระบบ Neosiam Return สามารถส่งการแจ้งเตือนได้แล้ว!\n----------------------------------\n📅 ${new Date().toLocaleString('th-TH')}`;

        const success = await sendTelegramMessage(
            telegramData.botToken,
            telegramData.chatId,
            testMessage
        );
        setIsTesting(false);

        if (success) {
            Swal.fire({
                icon: 'success',
                title: 'ทดสอบสำเร็จ!',
                text: 'ข้อความแจ้งเตือนถูกส่งไปยัง Telegram เรียบร้อยแล้ว',
                confirmButtonColor: '#10b981'
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'ทดสอบล้มเหลว',
                text: 'ไม่สามารถส่งข้อความได้ กรุณาตรวจสอบ Bot Token และ Chat ID หรือตรวจสอบว่ามีการเพิ่ม Bot เข้าในกลุ่มแล้ว'
            });
        }
    };

    const handleIntegrityCheck = async () => {
        const { value: password } = await Swal.fire({
            title: 'ยืนยันรหัสผ่าน (Authentication)',
            text: "กรุณากรอกรหัสผ่านเพื่อตรวจสอบและล้างข้อมูลขยะ",
            input: 'password',
            inputPlaceholder: 'Enter password',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3b82f6',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'ยืนยัน (Verify)',
            cancelButtonText: 'ยกเลิก (Cancel)',
            inputAttributes: { autocapitalize: 'off', autocorrect: 'off' }
        });
        if (!password) return;
        if (password !== 'sansan856') {
            await Swal.fire({ title: 'รหัสผ่านไม่ถูกต้อง', text: 'Access Denied', icon: 'error', confirmButtonColor: '#ef4444' });
            return;
        }
        Swal.fire({ title: 'กำลังตรวจสอบระบบ...', text: 'Scanning for orphaned records...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
        try {
            const count = await runDataIntegrityCheck();
            if (count > 0) {
                await Swal.fire('ดำเนินการเสร็จสิ้น', `ลบข้อมูลตกค้าง (Orphaned Records) ไปทั้งสิ้น ${count} รายการ`, 'success');
            } else {
                await Swal.fire('ระบบปกติ', 'ไม่พบข้อมูลตกค้างในระบบ', 'success');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถตรวจสอบระบบได้', 'error');
        }
    };

    const handleRepairRecords = async () => {
        const { value: password } = await Swal.fire({
            title: 'ซ่อมข้อมูล NCR → Operations',
            text: "สแกน NCR ที่ไม่มี ReturnRecord แล้วสร้างใหม่",
            input: 'password',
            inputPlaceholder: 'Enter password',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#8b5cf6',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'ยืนยัน (Repair)',
            cancelButtonText: 'ยกเลิก',
            inputAttributes: { autocapitalize: 'off', autocorrect: 'off' }
        });
        if (!password) return;
        if (password !== 'sansan856') {
            await Swal.fire({ title: 'รหัสผ่านไม่ถูกต้อง', icon: 'error', confirmButtonColor: '#ef4444' });
            return;
        }
        Swal.fire({ title: 'กำลังซ่อมข้อมูล...', text: 'Repairing missing ReturnRecords...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
        try {
            const count = await repairMissingReturnRecords();
            if (count > 0) {
                await Swal.fire('ซ่อมสำเร็จ', `สร้าง ReturnRecord ใหม่ ${count} รายการ`, 'success');
            } else {
                await Swal.fire('ระบบปกติ', 'ไม่พบ NCR ที่ขาด ReturnRecord', 'success');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถซ่อมข้อมูลได้', 'error');
        }
    };

    const handleMigrateImages = async () => {
        const { value: password } = await Swal.fire({
            title: '\u0e22\u0e49\u0e32\u0e22\u0e23\u0e39\u0e1b Base64 \u0e44\u0e1b Firebase Storage',
            html: `<div class="text-left text-sm">
                <p class="mb-2"><b>\u0e2a\u0e34\u0e48\u0e07\u0e17\u0e35\u0e48\u0e08\u0e30\u0e17\u0e33:</b></p>
                <ol class="list-decimal ml-4 space-y-1">
                    <li>\u0e2a\u0e41\u0e01\u0e19\u0e17\u0e38\u0e01 record \u0e17\u0e35\u0e48\u0e21\u0e35\u0e23\u0e39\u0e1b Base64</li>
                    <li>\u0e2d\u0e31\u0e1b\u0e42\u0e2b\u0e25\u0e14\u0e23\u0e39\u0e1b\u0e44\u0e1b Firebase Storage</li>
                    <li>\u0e41\u0e17\u0e19\u0e17\u0e35\u0e48 Base64 \u0e14\u0e49\u0e27\u0e22 URL</li>
                </ol>
                <p class="mt-3 text-amber-600"><b>\u26a0\u0e4f \u0e41\u0e19\u0e30\u0e19\u0e33:</b> Backup \u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e01\u0e48\u0e2d\u0e19\u0e17\u0e35\u0e48 Firebase Console</p>
                <p class="mt-1 text-green-600"><b>\u2705 \u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e44\u0e21\u0e48\u0e2b\u0e32\u0e22:</b> \u0e16\u0e49\u0e32 upload \u0e25\u0e49\u0e21\u0e40\u0e2b\u0e25\u0e27 \u0e08\u0e30\u0e40\u0e01\u0e47\u0e1a Base64 \u0e40\u0e14\u0e34\u0e21\u0e44\u0e27\u0e49</p>
            </div>`,
            input: 'password',
            inputPlaceholder: '\u0e01\u0e23\u0e2d\u0e01\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19',
            showCancelButton: true,
            confirmButtonText: '\u0e40\u0e23\u0e34\u0e48\u0e21 Migration',
            cancelButtonText: '\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01',
            confirmButtonColor: '#8b5cf6',
        });

        if (password !== 'sansan856') {
            if (password !== undefined) Swal.fire('\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e44\u0e21\u0e48\u0e16\u0e39\u0e01\u0e15\u0e49\u0e2d\u0e07', '', 'error');
            return;
        }

        setMigrationProgress({
            totalRecords: 0, processedRecords: 0, totalBase64Found: 0,
            migratedImages: 0, failedImages: 0, skippedRecords: 0,
            currentRecord: '', status: 'running', log: []
        });

        const result = await migrateBase64Images((prog) => {
            setMigrationProgress({ ...prog });
        });
        Swal.fire({
            icon: result.status === 'completed' && result.failedImages === 0 ? 'success' : result.failedImages > 0 ? 'warning' : 'error',
            title: result.status === 'completed' ? 'Migration เสร็จสิ้น!' : 'Migration ผิดพลาด',
            html: `ย้ายสำเร็จ: <b>${result.migratedImages}</b> รูป${result.failedImages > 0 ? `<br>ล้มเหลว: <b>${result.failedImages}</b> รูป` : ''}`,
        });
    };

    const handleMigrateToNAS = async () => {
        const { value: password } = await Swal.fire({
            title: 'ย้ายรูปจาก Firebase → NAS',
            html: `<div class="text-left text-sm">
                <p class="mb-2"><b>สิ่งที่จะทำ:</b></p>
                <ol class="list-decimal ml-4 space-y-1">
                    <li>สแกนทุก record ที่มีรูป Firebase URL</li>
                    <li>ดาวน์โหลดรูปจาก Firebase Storage</li>
                    <li>อัปโหลดไป NAS ผ่าน upload.php</li>
                    <li>อัปเดต URL ใน DB เป็น NAS serve.php URL</li>
                </ol>
                <p class="mt-3 text-green-600"><b>✅ ข้อมูลไม่หาย:</b> ถ้า upload ไป NAS ล้มเหลว จะเก็บ Firebase URL เดิมไว้</p>
            </div>`,
            input: 'password',
            inputPlaceholder: 'กรอกรหัสผ่าน',
            showCancelButton: true,
            confirmButtonText: 'เริ่ม Migration',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#059669',
        });

        if (password !== 'sansan856') {
            if (password !== undefined) Swal.fire('รหัสผ่านไม่ถูกต้อง', '', 'error');
            return;
        }

        setMigrationProgress({
            totalRecords: 0, processedRecords: 0, totalBase64Found: 0,
            migratedImages: 0, failedImages: 0, skippedRecords: 0,
            currentRecord: '', status: 'running', log: []
        });

        const result = await migrateFirebaseImagesToNAS((prog) => {
            setMigrationProgress({ ...prog });
        });
        Swal.fire({
            icon: result.status === 'completed' && result.failedImages === 0 ? 'success' : result.failedImages > 0 ? 'warning' : 'error',
            title: result.status === 'completed' ? 'Firebase → NAS Migration เสร็จ!' : 'Migration ผิดพลาด',
            html: `ย้ายสำเร็จ: <b>${result.migratedImages}</b> รูป${result.failedImages > 0 ? `<br>ล้มเหลว: <b>${result.failedImages}</b> รูป` : ''}`,
        });
    };

    const handleFixNasExtensions = async () => {
        if (!nasData.apiUrl || !nasData.apiKey) {
            Swal.fire('ตั้งค่า NAS ก่อน', 'ใส่ API URL และ API Key ในส่วน NAS ก่อนรัน', 'warning');
            return;
        }
        const { isConfirmed } = await Swal.fire({
            title: 'แก้ไขนามสกุลไฟล์ NAS',
            text: 'จะดาวน์โหลดรูปจาก NAS แล้ว re-upload ด้วยนามสกุล .webp เพื่อให้ Synology Drive preview ได้',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'เริ่มแก้ไข',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#059669',
        });
        if (!isConfirmed) return;

        setMigrationProgress({
            totalRecords: 0, processedRecords: 0, totalBase64Found: 0,
            migratedImages: 0, failedImages: 0, skippedRecords: 0,
            currentRecord: '', status: 'running', log: []
        });

        const result = await fixNasImageExtensions(
            { apiUrl: nasData.apiUrl, apiKey: nasData.apiKey },
            (prog) => { setMigrationProgress({ ...prog }); }
        );
        Swal.fire({
            icon: result.status === 'completed' && result.failedImages === 0 ? 'success' : result.failedImages > 0 ? 'warning' : 'error',
            title: result.status === 'completed' ? 'แก้ไขนามสกุลเสร็จ!' : 'เกิดข้อผิดพลาด',
            html: `แก้ไขสำเร็จ: <b>${result.migratedImages}</b> รูป${result.failedImages > 0 ? `<br>ล้มเหลว: <b>${result.failedImages}</b> รูป` : ''}`,
        });
    };

    const handleFactoryReset = async () => {
        const { value: password } = await Swal.fire({
            title: 'ยืนยันรหัสผ่าน (Authentication)',
            text: "กรุณากรอกรหัสผ่านเพื่อล้างข้อมูลทั้งหมด",
            input: 'password',
            inputPlaceholder: 'Enter password',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'ตรวจสอบ (Verify)',
            cancelButtonText: 'ยกเลิก (Cancel)',
            inputAttributes: { autocapitalize: 'off', autocorrect: 'off' }
        });
        if (!password) return;
        if (password !== 'sansan856') {
            await Swal.fire({ title: 'รหัสผ่านไม่ถูกต้อง', text: 'Access Denied', icon: 'error', confirmButtonColor: '#ef4444' });
            return;
        }
        const result = await Swal.fire({
            title: 'คำเตือน: ลบข้อมูลทั้งหมด?',
            text: "ข้อมูลทั้งหมดจะหายไปถาวร ไม่สามารถกู้คืนได้! ยืนยันที่จะดำเนินการต่อหรือไม่?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'ใช่, ฉันต้องการลบข้อมูลทั้งหมด',
            cancelButtonText: 'ยกเลิก'
        });
        if (result.isConfirmed) {
            try {
                Swal.fire({ title: 'กำลังล้างข้อมูล...', text: 'Please wait while we reset the system', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
                await remove(ref(db, 'return_records'));
                await remove(ref(db, 'ncr_reports'));
                await set(ref(db, 'ncr_counter'), 0);
                await Swal.fire('เสร็จสิ้น!', 'ระบบได้รับการรีเซ็ตเรียบร้อยแล้ว', 'success');
                location.reload();
            } catch (error) {
                console.error(error);
                Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถล้างข้อมูลได้ กรุณาลองใหม่', 'error');
            }
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                    <SettingsIcon className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">การตั้งค่าระบบ (System Settings)</h1>
                    <p className="text-slate-500">จัดการการตั้งค่าและส่วนเสริมของระบบ</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Sidebar Mini Navigation (Optional) */}
                <div className="md:col-span-1 space-y-2">
                    <button className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-xl font-bold shadow-sm ring-1 ring-blue-100">
                        <Bell className="w-5 h-5" />
                        การแจ้งเตือน (Notifications)
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">
                        <Shield className="w-5 h-5" />
                        ความปลอดภัย (Security)
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">
                        <Info className="w-5 h-5" />
                        ข้อมูลระบบ (System Info)
                    </button>
                </div>

                {/* Settings Content */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                                    <Send className="w-4 h-4" />
                                </div>
                                <h2 className="font-bold text-slate-800 text-lg">Telegram Notifications</h2>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={telegramData.enabled}
                                    onChange={(e) => setTelegramData(prev => ({ ...prev, enabled: e.target.checked }))}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                <span className="ml-3 text-sm font-medium text-slate-600">{telegramData.enabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</span>
                            </label>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Bot Token</label>
                                    <input
                                        type="password"
                                        value={telegramData.botToken}
                                        onChange={(e) => setTelegramData(prev => ({ ...prev, botToken: e.target.value }))}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-mono text-xs"
                                        placeholder="8523483845:AAH63m..."
                                    />
                                    <p className="mt-1 text-[10px] text-slate-400 font-medium">* ได้รับจาก @BotFather บน Telegram</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Telegram Chat ID (Group ID)</label>
                                    <input
                                        type="text"
                                        value={telegramData.chatId}
                                        onChange={(e) => setTelegramData(prev => ({ ...prev, chatId: e.target.value }))}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-mono text-xs"
                                        placeholder="-100123456789"
                                    />
                                    <div className="mt-1 flex items-start gap-2 text-[10px] text-slate-500 bg-amber-50 p-2 rounded-lg border border-amber-100">
                                        <AlertCircle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                                        <span>หากต้องการใช้ในกลุ่ม ให้ดึง Bot เข้ากลุ่มก่อน และใช้ ID ที่ขึ้นต้นด้วย - (เช่น -100xxx)</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleTestNotification}
                                    disabled={isTesting || !telegramData.botToken || !telegramData.chatId}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isTesting ? 'กำลังทดสอบ...' : <><CheckCircle2 className="w-5 h-5 text-green-500" /> ทดสอบการแจ้งเตือน</>}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
                                >
                                    {isSaving ? 'กำลังบันทึก...' : <><Save className="w-5 h-5" /> บันทึกการตั้งค่า</>}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                                <Info className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">วิธีการหารหัส Chat ID</h3>
                                <p className="text-sm text-blue-100">ส่งข้อความหา Bot หรือดึง Bot เข้ากลุ่ม แล้วลองพิมพ์ /id หรือใช้ @userinfobot เพื่อหา ID</p>
                            </div>
                        </div>
                        {/* Decoration */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    </div>
                </div>
            </div>

            {/* SYNOLOGY NAS STORAGE */}
            <div className="mt-8 border-t border-slate-200 pt-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 md:p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                                    <HardDrive className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">Synology NAS Storage</h2>
                                    <p className="text-xs text-slate-400">สำรองรูปภาพไปยัง Synology NAS อัตโนมัติ</p>
                                </div>
                                <span className={`ml-auto text-sm font-bold ${nasData.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {nasData.enabled ? '✅ เปิดใช้งาน' : '❌ ปิด'}
                                </span>
                            </div>

                            {!nasUnlocked ? (
                                <div className="text-center py-8">
                                    <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-sm text-slate-500 mb-1">การตั้งค่า NAS ถูกล็อค</p>
                                    <p className="text-xs text-slate-400 mb-4">กรอกรหัสผ่านเพื่อแก้ไข</p>
                                    <button
                                        type="button"
                                        onClick={handleUnlockNAS}
                                        className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all border border-slate-200"
                                    >
                                        🔐 ปลดล็อค
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">NAS API URL</label>
                                            <input
                                                type="text"
                                                value={nasData.apiUrl}
                                                onChange={(e) => setNasData(prev => ({ ...prev, apiUrl: e.target.value }))}
                                                placeholder="https://neosiam.dscloud.biz/api/upload.php"
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 outline-none transition-all text-sm font-mono"
                                            />
                                            <div className="text-[10px] text-slate-400 mt-1">URL ของ upload.php บน NAS เช่น https://neosiam.dscloud.biz/api/upload.php</div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">API Key</label>
                                            <input
                                                type="password"
                                                value={nasData.apiKey}
                                                onChange={(e) => setNasData(prev => ({ ...prev, apiKey: e.target.value }))}
                                                placeholder="YOUR_API_KEY_HERE"
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 outline-none transition-all text-sm font-mono"
                                            />
                                            <div className="text-[10px] text-slate-400 mt-1">API Key ที่ตั้งไว้ใน upload.php ($API_KEY)</div>
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={nasData.enabled}
                                                onChange={(e) => setNasData(prev => ({ ...prev, enabled: e.target.checked }))}
                                                className="w-5 h-5 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                            />
                                            <span className="text-sm font-bold text-slate-600">เปิดใช้งาน NAS Storage</span>
                                        </label>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={handleTestNAS}
                                            disabled={isTestingNas || !nasData.apiUrl || !nasData.apiKey}
                                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isTestingNas ? 'กำลังทดสอบ...' : <><CheckCircle2 className="w-5 h-5 text-emerald-500" /> ทดสอบเชื่อมต่อ NAS</>}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSave}
                                            disabled={isSaving}
                                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all disabled:opacity-50"
                                        >
                                            {isSaving ? 'กำลังบันทึก...' : <><Save className="w-5 h-5" /> บันทึกการตั้งค่า</>}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="bg-emerald-600 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden h-fit">
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                                <Info className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">วิธีตั้งค่า NAS</h3>
                                <p className="text-sm text-emerald-100 mt-1">1. ใส่ API URL ของ upload.php บน NAS</p>
                                <p className="text-sm text-emerald-100">2. ใส่ API Key ที่ตั้งไว้ใน upload.php</p>
                                <p className="text-sm text-emerald-100">3. กดทดสอบเชื่อมต่อ แล้วบันทึก</p>
                                <p className="text-xs text-emerald-200 mt-2">ใช้ PHP API ผ่าน DDNS — ต้องตั้ง Port Forwarding</p>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    </div>
                </div>
            </div>

            {/* MAINTENANCE ZONE */}
            <div className="mt-8 border-t border-slate-200 pt-8">
                <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-slate-500" /> การบำรุงรักษาระบบ (Maintenance)
                </h2>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="border border-blue-200 bg-blue-50 rounded-lg p-6 flex flex-col items-center w-full md:flex-1 hover:shadow-md transition-shadow">
                        <h3 className="text-blue-700 font-bold text-sm mb-2 flex items-center gap-2">
                            <RotateCcw className="w-4 h-4" /> Sync & Cleanup Data
                        </h3>
                        <button onClick={handleIntegrityCheck} aria-label="ตรวจสอบและล้างข้อมูลขยะ" className="text-blue-600 underline text-xs cursor-pointer hover:text-blue-800 font-semibold">
                            ตรวจสอบและล้างข้อมูลขยะ
                        </button>
                        <div className="text-[10px] text-blue-400 mt-1">Remove orphaned NCR records</div>
                    </div>

                    <div className="border border-violet-200 bg-violet-50 rounded-lg p-6 flex flex-col items-center w-full md:flex-1 hover:shadow-md transition-shadow">
                        <h3 className="text-violet-700 font-bold text-sm mb-2 flex items-center gap-2">
                            <Wrench className="w-4 h-4" /> Repair NCR → Ops
                        </h3>
                        <button onClick={handleRepairRecords} aria-label="ซ่อม ReturnRecord ที่หายไป" className="text-violet-600 underline text-xs cursor-pointer hover:text-violet-800 font-semibold">
                            ซ่อม ReturnRecord ที่หายไป
                        </button>
                        <div className="text-[10px] text-violet-400 mt-1">Sync NCR → Operations Hub</div>
                    </div>

                    <div className="border border-amber-200 bg-amber-50 rounded-lg p-6 flex flex-col items-center w-full md:flex-1 hover:shadow-md transition-shadow">
                        <h3 className="text-amber-700 font-bold text-sm mb-2 flex items-center gap-2">
                            <HardDrive className="w-4 h-4" /> Migrate Base64
                        </h3>
                        <button onClick={handleMigrateImages} aria-label="ย้ายรูป Base64 ไป Storage" className="text-amber-600 underline text-xs cursor-pointer hover:text-amber-800 font-semibold" disabled={migrationProgress?.status === 'running'}>
                            {migrationProgress?.status === 'running' ? 'กำลังทำงาน...' : 'Base64 → Firebase'}
                        </button>
                        <div className="text-[10px] text-amber-400 mt-1">ลดขนาด DB</div>
                    </div>

                    <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-6 flex flex-col items-center w-full md:flex-1 hover:shadow-md transition-shadow">
                        <h3 className="text-emerald-700 font-bold text-sm mb-2 flex items-center gap-2">
                            <HardDrive className="w-4 h-4" /> Migrate to NAS
                        </h3>
                        <button onClick={handleMigrateToNAS} aria-label="ย้ายรูป Firebase ไป NAS" className="text-emerald-600 underline text-xs cursor-pointer hover:text-emerald-800 font-semibold" disabled={migrationProgress?.status === 'running'}>
                            {migrationProgress?.status === 'running' ? 'กำลังทำงาน...' : 'Firebase → NAS'}
                        </button>
                        <div className="text-[10px] text-emerald-400 mt-1">ย้ายรูปเก่าไป NAS</div>
                        <button onClick={handleFixNasExtensions} aria-label="แก้ไขนามสกุลไฟล์" className="text-emerald-500 underline text-[10px] cursor-pointer hover:text-emerald-700 mt-2" disabled={migrationProgress?.status === 'running'}>
                            แก้ไขนามสกุล (.webp)
                        </button>
                    </div>

                    <div className="border border-red-200 bg-red-50 rounded-lg p-6 flex flex-col items-center w-full md:flex-1 hover:shadow-md transition-shadow">
                        <h3 className="text-red-700 font-bold text-sm mb-2 flex items-center gap-2">
                            <Trash2 className="w-4 h-4" /> Data Factory Reset
                        </h3>
                        <button onClick={handleFactoryReset} aria-label="ล้างข้อมูลทั้งหมด (Reset All)" className="text-red-600 underline text-xs cursor-pointer hover:text-red-800">
                            ล้างข้อมูลทั้งหมด (Reset All)
                        </button>
                        <div className="text-[10px] text-red-300 mt-1">Delete all 100%</div>
                    </div>
                </div>
            </div>

            {/* Migration Progress Panel */}
            {migrationProgress && (
                <div className="mt-6 border border-slate-200 rounded-xl p-6 bg-white shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" /> Migration Progress
                    </h3>

                    {/* Progress Bar */}
                    {migrationProgress.totalBase64Found > 0 && (
                        <div className="mb-3">
                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                                <span>{migrationProgress.migratedImages} / {migrationProgress.totalBase64Found} รูป</span>
                                <span>{Math.round((migrationProgress.migratedImages / migrationProgress.totalBase64Found) * 100)}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3">
                                <div
                                    className={`h-3 rounded-full transition-all duration-300 ${
                                        migrationProgress.status === 'completed' ? 'bg-green-500' :
                                        migrationProgress.status === 'error' ? 'bg-red-500' : 'bg-violet-500'
                                    }`}
                                    style={{ width: `${Math.round((migrationProgress.migratedImages / migrationProgress.totalBase64Found) * 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <div className="text-center p-2 bg-slate-50 rounded-lg">
                            <div className="text-lg font-black text-violet-600">{migrationProgress.migratedImages}</div>
                            <div className="text-[10px] text-slate-400">ย้ายสำเร็จ</div>
                        </div>
                        <div className="text-center p-2 bg-slate-50 rounded-lg">
                            <div className="text-lg font-black text-amber-600">{migrationProgress.failedImages}</div>
                            <div className="text-[10px] text-slate-400">ล้มเหลว</div>
                        </div>
                        <div className="text-center p-2 bg-slate-50 rounded-lg">
                            <div className="text-lg font-black text-blue-600">{migrationProgress.totalBase64Found}</div>
                            <div className="text-[10px] text-slate-400">พบ Base64</div>
                        </div>
                        <div className="text-center p-2 bg-slate-50 rounded-lg">
                            <div className="text-lg font-black text-slate-600">{migrationProgress.skippedRecords}</div>
                            <div className="text-[10px] text-slate-400">ข้าม (ไม่มี Base64)</div>
                        </div>
                    </div>

                    {/* Log */}
                    <div className="bg-slate-900 text-green-400 rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-xs">
                        {migrationProgress.log.map((line, i) => (
                            <div key={i}>{line}</div>
                        ))}
                        {migrationProgress.status === 'running' && migrationProgress.currentRecord && (
                            <div className="text-yellow-400 animate-pulse">กำลังประมวลผล: {migrationProgress.currentRecord}...</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
