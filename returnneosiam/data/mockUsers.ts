import { User, UserRole } from '../types';

/**
 * Mock Users สำหรับการทดสอบระบบ
 * Password: Admin=888, Others=1234 (สำหรับ development เท่านั้น)
 */

export const MOCK_USERS: User[] = [
    // 1. ADMIN
    {
        uid: 'admin-001',
        email: 'admin@neosiam.com',
        displayName: 'System Admin',
        role: 'ADMIN',
        photoURL: 'https://ui-avatars.com/api/?name=Admin&background=ef4444&color=fff',
    },

    // 2. NCR Operator
    {
        uid: 'ncr-op-001',
        email: 'ncr@neosiam.com',
        displayName: 'NCR Staff Operators',
        role: 'NCR_OPERATOR',
        photoURL: 'https://ui-avatars.com/api/?name=NCR&background=6366f1&color=fff',
    },

    // 3. COL Operator
    {
        uid: 'col-op-001',
        email: 'col@neosiam.com',
        displayName: 'COL Staff',
        role: 'COL_OPERATOR',
        photoURL: 'https://ui-avatars.com/api/?name=COL&background=f97316&color=fff',
    },

    // 4. REQUEST_ENTRY
    {
        uid: 'req-entry-001',
        email: 'request@neosiam.com',
        displayName: 'COL Staff REQUEST Operators',
        role: 'REQUEST_ENTRY',
        photoURL: 'https://ui-avatars.com/api/?name=REQUEST&background=eab308&color=fff',
    },

    // 5. QC Operator
    {
        uid: 'qc-op-001',
        email: 'qc@neosiam.com',
        displayName: 'QC Inspector',
        role: 'QC_OPERATOR',
        photoURL: 'https://ui-avatars.com/api/?name=QC&background=22c55e&color=fff',
    },

    // 6. CLOSURE Operator
    {
        uid: 'closure-op-001',
        email: 'closure@neosiam.com',
        displayName: 'Closure Staff',
        role: 'CLOSURE_OPERATOR',
        photoURL: 'https://ui-avatars.com/api/?name=Closure&background=a855f7&color=fff',
    },

    // 7. VIEWER
    {
        uid: 'viewer-001',
        email: 'viewer@neosiam.com',
        displayName: 'Ops Manager',
        role: 'VIEWER',
        photoURL: 'https://ui-avatars.com/api/?name=Manager&background=64748b&color=fff',
    },
];

/**
 * Mock Login Function
 * @param email - Email address
 * @param password - Password (Admin: 888, Others: 1234)
 * @returns User object หรือ null ถ้า login ไม่สำเร็จ
 */
export const mockLogin = (email: string, password: string): User | null => {
    const user = MOCK_USERS.find(u => u.email === email);
    if (!user) return null;

    // Admin ใช้ 888, user อื่นๆ ใช้ 1234
    const validPassword = user.role === 'ADMIN' ? '888' : '1234';

    if (password !== validPassword) {
        return null;
    }

    return user;
};

/**
 * Get User by UID
 * @param uid - User ID
 * @returns User object หรือ undefined
 */
export const getUserById = (uid: string): User | undefined => {
    return MOCK_USERS.find(u => u.uid === uid);
};

/**
 * Get Users by Role
 * @param role - UserRole
 * @returns Array of Users
 */
export const getUsersByRole = (role: UserRole): User[] => {
    return MOCK_USERS.filter(u => u.role === role);
};

/**
 * รายการ Email สำหรับการทดสอบ
 */
export const MOCK_USER_EMAILS = MOCK_USERS.map(u => u.email);
