import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listHackathons } from '../api/hackathons';
import type { Hackathon } from '../types/api';

interface HackathonContextValue {
  hackathons: Hackathon[];
  activeHackathon: Hackathon | null;
  loading: boolean;
  chooseHackathon: (id: string) => void;
}

const HackathonContext = createContext<HackathonContextValue | null>(null);
const ACTIVE_KEY = 'hackbridge.active-hackathon';

export function HackathonProvider({ children }: { children: ReactNode }) {
  const { data = [], isLoading } = useQuery({ queryKey: ['hackathons'], queryFn: listHackathons });
  const [activeId, setActiveId] = useState(() => sessionStorage.getItem(ACTIVE_KEY) ?? '');
  const activeHackathon = data.find(item => item.id === activeId) ?? data[0] ?? null;

  useEffect(() => {
    if (activeHackathon && activeHackathon.id !== activeId) {
      setActiveId(activeHackathon.id);
      sessionStorage.setItem(ACTIVE_KEY, activeHackathon.id);
    }
  }, [activeHackathon, activeId]);

  function chooseHackathon(id: string) {
    setActiveId(id);
    sessionStorage.setItem(ACTIVE_KEY, id);
  }

  return (
    <HackathonContext.Provider value={{ hackathons: data, activeHackathon, loading: isLoading, chooseHackathon }}>
      {children}
    </HackathonContext.Provider>
  );
}

export function useHackathons() {
  const value = useContext(HackathonContext);
  if (!value) throw new Error('useHackathons must be used inside HackathonProvider');
  return value;
}