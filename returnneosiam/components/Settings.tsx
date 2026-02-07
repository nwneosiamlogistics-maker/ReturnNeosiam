
import React, { useState } from 'react';
import { useData } from '../DataContext';
import { Settings as SettingsIcon, Send, CheckCircle2, AlertCircle, Save, Bell, Shield, Info } from 'lucide-react';
import { sendTelegramMessage } from '../utils/telegramService';
import Swal from 'sweetalert2';

const Settings: React.FC = () => {
    const { systemConfig, updateSystemConfig } = useData();
    const [isTesting, setIsTesting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [telegramData, setTelegramData] = useState({
        botToken: systemConfig.telegram?.botToken || '',
        chatId: systemConfig.telegram?.chatId || '',
        enabled: systemConfig.telegram?.enabled || false
    });

    const handleSave = async () => {
        setIsSaving(true);
        const success = await updateSystemConfig({
            telegram: telegramData
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
        </div>
    );
};

export default Settings;
