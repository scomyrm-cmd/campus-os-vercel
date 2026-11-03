import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { defaultSettings, type Settings } from '../data/settings';
import { KEYS, readStorage, writeStorage } from '../lib/storage';
import { useRepository } from './DataContext';
import i18n from '../i18n';
interface SettingsValue { settings:Settings; resolvedTheme:'light'|'dark'; saveSettings:(patch:Partial<Settings>,section?:string)=>void; }
const SettingsContext=createContext<SettingsValue>(null!);
function loadSettings():Settings {
  const defaults=defaultSettings(); const saved=readStorage<Partial<Settings>>(KEYS.settings,{});
  return {...defaults,...saved,username:'admin',notifications:{...defaults.notifications,...saved.notifications},ai:{...defaults.ai,...saved.ai}};
}
export function SettingsProvider({children}:{children:ReactNode}) {
  const [settings,setSettings]=useState(loadSettings);const [systemDark,setSystemDark]=useState(()=>matchMedia('(prefers-color-scheme: dark)').matches);const repo=useRepository();
  useEffect(()=>{const mq=matchMedia('(prefers-color-scheme: dark)');const fn=()=>setSystemDark(mq.matches);mq.addEventListener('change',fn);return()=>mq.removeEventListener('change',fn);},[]);
  const resolvedTheme=settings.theme==='system'?(systemDark?'dark':'light'):settings.theme;
  useEffect(()=>{document.documentElement.classList.toggle('dark',resolvedTheme==='dark');document.documentElement.style.colorScheme=resolvedTheme;},[resolvedTheme]);
  useEffect(()=>{void i18n.changeLanguage(settings.language);document.documentElement.lang=settings.language;document.documentElement.dir=settings.language==='ar'?'rtl':'ltr';document.title=`${settings.schoolName || 'Campus OS'} · Campus OS`;repo.configure(settings.displayName,settings.notifications);},[settings,repo]);
  const saveSettings=(patch:Partial<Settings>,section?:string)=>{const next={...settings,...patch,username:'admin'};writeStorage(KEYS.settings,next);repo.configure(next.displayName,next.notifications);setSettings(next);if(section)repo.logSettings(section);};
  return <SettingsContext.Provider value={{settings,resolvedTheme,saveSettings}}>{children}</SettingsContext.Provider>;
}
export const useSettings=()=>useContext(SettingsContext);
