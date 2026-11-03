import { createContext, useContext, useSyncExternalStore, useEffect, type ReactNode } from 'react';
import { schoolRepository } from '../data/repository';
import { KEYS } from '../lib/storage';
export const DataContext=createContext(schoolRepository);
export function DataProvider({children}:{children:ReactNode}) {
  useEffect(()=>{const listener=(e:StorageEvent)=>{if(e.key===KEYS.data)schoolRepository.refresh();};window.addEventListener('storage',listener);return()=>window.removeEventListener('storage',listener);},[]);
  return <DataContext.Provider value={schoolRepository}>{children}</DataContext.Provider>;
}
export const useRepository=()=>useContext(DataContext);
export function useData() {const repo=useRepository();return useSyncExternalStore(repo.subscribe,repo.getSnapshot,repo.getSnapshot);}
