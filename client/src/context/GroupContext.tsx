import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Group } from '@/types';

interface GroupContextType {
  selectedGroup: Group | null;
  setSelectedGroup: (group: Group | null) => void;
  clearGroup: () => void;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export const GroupProvider = ({ children }: { children: ReactNode }) => {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem('selectedGroup');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    // Save to localStorage whenever it changes
    if (selectedGroup) {
      localStorage.setItem('selectedGroup', JSON.stringify(selectedGroup));
    } else {
      localStorage.removeItem('selectedGroup');
    }
  }, [selectedGroup]);

  const clearGroup = () => {
    setSelectedGroup(null);
  };

  return (
    <GroupContext.Provider value={{ selectedGroup, setSelectedGroup, clearGroup }}>
      {children}
    </GroupContext.Provider>
  );
};

export const useGroupContext = () => {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error('useGroupContext must be used within a GroupProvider');
  }
  return context;
};
