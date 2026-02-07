import { UserRole, AppView } from '../types';

/**
 * Permission Helper Functions
 * ตรวจสอบสิทธิ์การเข้าถึงตาม UserRole
 */

// ==================== STEP PERMISSIONS ====================

/**
 * ตรวจสอบว่า User สามารถแก้ไข/บันทึกข้อมูลใน Step นั้นได้หรือไม่
 * @param userRole - Role ของ User
 * @param step - หมายเลข Step (1-7, 12-14)
 * @param isNCR - เป็น NCR Request หรือ COL Request
 * @returns true = แก้ไขได้, false = ดูอย่างเดียว
 */
export const canEditStep = (
    userRole: UserRole | undefined,
    step: number,
    isNCR: boolean = true
): boolean => {
    if (!userRole) return false;

    switch (userRole) {
        case 'ADMIN':
            return true; // Admin ทำได้ทุกอย่าง

        case 'NCR_OPERATOR':
            // NCR Step 1 (Return Request for NCR) และ Step 2 (NCR Logistics)
            return isNCR && [1, 2].includes(step);

        case 'COL_OPERATOR':
            // COL Step 1 (Return Request for COL), Step 2 (NCR Logistics ร่วม), COL Steps 2,3,4
            return (!isNCR && step === 1) || [2, 12, 13, 14].includes(step);

        case 'REQUEST_ENTRY':
            // เฉพาะ COL Step 1 (สร้าง Return Request สำหรับ COL)
            return !isNCR && step === 1;

        case 'QC_OPERATOR':
            // Step 3 (Hub Receive), Step 4 (QC), Step 5 (Docs)
            return [3, 4, 5].includes(step);

        case 'CLOSURE_OPERATOR':
            // Step 6 (Closure) เท่านั้น
            return step === 6;

        case 'VIEWER':
            return false; // ดูอย่างเดียว ไม่สามารถแก้ไข

        default:
            return false;
    }
};

/**
 * ตรวจสอบว่า User สามารถดู Step นั้นได้หรือไม่
 * @param userRole - Role ของ User
 * @param step - หมายเลข Step
 * @returns true = ดูได้, false = ไม่สามารถดู
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const canViewStep = (userRole: UserRole | undefined, _step: number): boolean => {
    if (!userRole) return false;

    // ทุก Role สามารถดูทุก Step ได้ (แต่อาจแก้ไขไม่ได้)
    return true;
};

// ==================== MODULE PERMISSIONS ====================

export type ModuleAccessLevel = 'FULL' | 'READ' | 'NONE';

/**
 * ตรวจสอบสิทธิ์การเข้าถึง Module/View ต่างๆ
 * @param userRole - Role ของ User
 * @param module - ชื่อ Module
 * @returns 'FULL' = เข้าถึงเต็มรูปแบบ, 'READ' = ดูอย่างเดียว, 'NONE' = ไม่สามารถเข้าถึง
 */
export const getModuleAccess = (
    userRole: UserRole | undefined,
    module: 'DASHBOARD' | 'OPERATIONS' | 'NCR_SYSTEM' | 'NCR_REPORT' | 'COL_SYSTEM' | 'COL_REPORT' | 'INVENTORY' | 'SETTINGS'
): ModuleAccessLevel => {
    if (!userRole) return 'NONE';

    switch (userRole) {
        case 'ADMIN':
            return 'FULL'; // Admin เข้าถึงทุกอย่างเต็มรูปแบบ

        case 'NCR_OPERATOR':
            if (module === 'NCR_SYSTEM' || module === 'NCR_REPORT') return 'FULL';
            if (module === 'OPERATIONS') return 'FULL'; // สำหรับ NCR Steps
            if (module === 'DASHBOARD' || module === 'COL_REPORT' || module === 'INVENTORY') return 'READ';
            if (module === 'COL_SYSTEM' || module === 'SETTINGS') return 'NONE';
            return 'READ';

        case 'COL_OPERATOR':
            if (module === 'COL_SYSTEM' || module === 'COL_REPORT') return 'FULL';
            if (module === 'OPERATIONS') return 'FULL'; // สำหรับ COL Steps
            if (module === 'DASHBOARD' || module === 'NCR_REPORT' || module === 'INVENTORY') return 'READ';
            if (module === 'NCR_SYSTEM' || module === 'SETTINGS') return 'NONE';
            return 'READ';

        case 'REQUEST_ENTRY':
            if (module === 'COL_SYSTEM') return 'FULL'; // สร้าง COL Request ได้
            if (module === 'OPERATIONS') return 'READ'; // ดู Operations ได้
            if (module === 'DASHBOARD' || module === 'NCR_REPORT' || module === 'COL_REPORT' || module === 'INVENTORY') return 'READ';
            if (module === 'NCR_SYSTEM' || module === 'SETTINGS') return 'NONE';
            return 'READ';

        case 'QC_OPERATOR':
            if (module === 'OPERATIONS') return 'FULL'; // สำหรับ QC Steps เท่านั้น
            if (module === 'DASHBOARD' || module === 'NCR_REPORT' || module === 'COL_REPORT' || module === 'INVENTORY') return 'READ';
            if (module === 'NCR_SYSTEM' || module === 'COL_SYSTEM' || module === 'SETTINGS') return 'NONE';
            return 'READ';

        case 'CLOSURE_OPERATOR':
            if (module === 'OPERATIONS') return 'FULL'; // สำหรับ Closure Step เท่านั้น
            if (module === 'DASHBOARD' || module === 'NCR_REPORT' || module === 'COL_REPORT' || module === 'INVENTORY') return 'READ';
            if (module === 'NCR_SYSTEM' || module === 'COL_SYSTEM' || module === 'SETTINGS') return 'NONE';
            return 'READ';

        case 'VIEWER':
            if (module === 'SETTINGS') return 'NONE';
            return 'READ'; // ดูได้ทุกอย่างยกเว้น Settings

        default:
            return 'NONE';
    }
};

/**
 * ตรวจสอบว่า User สามารถเข้าถึง Sidebar Menu Item ได้หรือไม่
 * @param userRole - Role ของ User
 * @param view - AppView
 * @returns true = แสดงได้, false = ซ่อน
 */
export const canAccessView = (userRole: UserRole | undefined, view: AppView): boolean => {
    if (!userRole) return false;

    switch (view) {
        case AppView.DASHBOARD:
            return true; // ทุกคนเข้าถึง Dashboard ได้

        case AppView.OPERATIONS:
            return true; // ทุกคนเข้าถึง Operations ได้ (แต่อาจแก้ไขไม่ได้)

        case AppView.NCR:
            return getModuleAccess(userRole, 'NCR_SYSTEM') !== 'NONE';

        case AppView.NCR_REPORT:
            return getModuleAccess(userRole, 'NCR_REPORT') !== 'NONE';

        case AppView.COLLECTION:
            return getModuleAccess(userRole, 'COL_SYSTEM') !== 'NONE';

        case AppView.COL_REPORT:
            return getModuleAccess(userRole, 'COL_REPORT') !== 'NONE';

        case AppView.INVENTORY:
            return getModuleAccess(userRole, 'INVENTORY') !== 'NONE';

        case AppView.SETTINGS:
            return canAccessSettings(userRole);

        default:
            return false;
    }
};

// ==================== ACTION PERMISSIONS ====================

/**
 * ตรวจสอบว่า User สามารถ Export รายงานได้หรือไม่
 * @param userRole - Role ของ User
 * @returns true = Export ได้, false = ไม่สามารถ Export
 */
export const canExportReport = (userRole: UserRole | undefined): boolean => {
    if (!userRole) return false;
    return ['ADMIN', 'NCR_OPERATOR', 'COL_OPERATOR', 'VIEWER'].includes(userRole);
};

/**
 * ตรวจสอบว่า User สามารถลบข้อมูลได้หรือไม่
 * @param userRole - Role ของ User
 * @returns true = ลบได้, false = ลบไม่ได้
 */
export const canDeleteRecord = (userRole: UserRole | undefined): boolean => {
    if (!userRole) return false;
    return userRole === 'ADMIN'; // เฉพาะ Admin เท่านั้น
};

/**
 * ตรวจสอบว่า User สามารถเข้าถึง Settings ได้หรือไม่
 * @param userRole - Role ของ User
 * @returns true = เข้าถึงได้, false = ไม่สามารถเข้าถึง
 */
export const canAccessSettings = (userRole: UserRole | undefined): boolean => {
    if (!userRole) return false;
    return userRole === 'ADMIN';
};

/**
 * ตรวจสอบว่า User สามารถจัดการผู้ใช้งานได้หรือไม่
 * @param userRole - Role ของ User
 * @returns true = จัดการได้, false = ไม่สามารถจัดการ
 */
export const canManageUsers = (userRole: UserRole | undefined): boolean => {
    if (!userRole) return false;
    return userRole === 'ADMIN';
};

// ==================== UI HELPER FUNCTIONS ====================

/**
 * รับชื่อ Role เป็นภาษาไทย
 * @param userRole - Role ของ User
 * @returns ชื่อ Role ภาษาไทย
 */
export const getRoleDisplayName = (userRole: UserRole): string => {
    const roleNames: Record<UserRole, string> = {
        ADMIN: 'ผู้ดูแลระบบ',
        NCR_OPERATOR: 'พนักงาน NCR',
        COL_OPERATOR: 'พนักงาน Collection',
        REQUEST_ENTRY: 'พนักงานคีย์ใบสั่งงาน',
        QC_OPERATOR: 'พนักงาน QC',
        CLOSURE_OPERATOR: 'พนักงานปิดงาน',
        VIEWER: 'ผู้ดูข้อมูล',
    };
    return roleNames[userRole] || 'ไม่ระบุ';
};

/**
 * รับสีประจำ Role (สำหรับ UI)
 * @param userRole - Role ของ User
 * @returns Tailwind CSS color class
 */
export const getRoleColor = (userRole: UserRole): string => {
    const roleColors: Record<UserRole, string> = {
        ADMIN: 'text-red-600 bg-red-50',
        NCR_OPERATOR: 'text-indigo-600 bg-indigo-50',
        COL_OPERATOR: 'text-orange-600 bg-orange-50',
        REQUEST_ENTRY: 'text-yellow-600 bg-yellow-50',
        QC_OPERATOR: 'text-green-600 bg-green-50',
        CLOSURE_OPERATOR: 'text-purple-600 bg-purple-50',
        VIEWER: 'text-slate-600 bg-slate-50',
    };
    return roleColors[userRole] || 'text-gray-600 bg-gray-50';
};
