import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'VIEWER' | 'EDITOR';

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  canEdit: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRoleState] = useState<UserRole>(() => {
    // Load from localStorage or default to EDITOR
    const saved = localStorage.getItem('userRole');
    return (saved as UserRole) || 'EDITOR';
  });

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem('userRole', newRole);
  };

  const canEdit = role === 'EDITOR';

  return (
    <RoleContext.Provider value={{ role, setRole, canEdit }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
