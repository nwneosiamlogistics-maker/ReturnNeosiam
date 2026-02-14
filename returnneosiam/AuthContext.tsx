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
    const [user, setUser] = useState<User | null>(() => {
        try {
            const saved = localStorage.getItem('neosiam_user');
            return saved ? JSON.parse(saved) : null;
        } catch { return null; }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(false);

        // Firebase Auth listener
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                const role: UserRole = 'ADMIN';
                const mappedUser: User = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    displayName: firebaseUser.displayName || 'User',
                    role: role,
                    photoURL: firebaseUser.photoURL || undefined
                };
                setUser(mappedUser);
                localStorage.setItem('neosiam_user', JSON.stringify(mappedUser));
            }
        });

        return () => unsubscribe();
    }, []);

    const login = async (userData: User) => {
        setUser(userData);
        localStorage.setItem('neosiam_user', JSON.stringify(userData));
    };

    const logout = async () => {
        await signOut(auth).catch((err) => console.error("Firebase Signout Error", err));
        setUser(null);
        localStorage.removeItem('neosiam_user');
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
