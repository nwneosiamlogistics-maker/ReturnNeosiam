import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from './types';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (user: User) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // ไม่เก็บ session ใน localStorage
        // เมื่อ refresh หน้า user จะเป็น null และต้อง login ใหม่
        setLoading(false);

        // Firebase Auth listener (for future Firebase integration)
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                // If Firebase user exists, map to ADMIN
                const role: UserRole = 'ADMIN';
                const mappedUser: User = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    displayName: firebaseUser.displayName || 'User',
                    role: role,
                    photoURL: firebaseUser.photoURL || undefined
                };
                setUser(mappedUser);
            }
        });

        return () => unsubscribe();
    }, []);

    const login = async (userData: User) => {
        // Save user to state only (NOT in localStorage)
        // เมื่อ refresh user จะหายไป
        setUser(userData);
    };

    const logout = async () => {
        await signOut(auth).catch((err) => console.error("Firebase Signout Error", err));
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
