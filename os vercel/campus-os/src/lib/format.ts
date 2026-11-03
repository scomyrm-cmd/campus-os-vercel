import { useSettings } from '../context/SettingsContext';
import type { Settings } from '../data/settings';
export function formatDate(value: string | Date | undefined, settings: Settings, options?: Intl.DateTimeFormatOptions) {
  if(!value) return '—';
  if(typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !options) {
    const [y,m,d]=value.split('-');
    if(settings.dateFormat==='DD/MM/YYYY') return `${d}/${m}/${y}`;
    if(settings.dateFormat==='MM/DD/YYYY') return `${m}/${d}/${y}`;
    if(settings.dateFormat==='YYYY-MM-DD') return value;
  }
  const date=typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value+'T12:00:00Z') : new Date(value);
  if(Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(settings.region, {timeZone:settings.timeZone,year:'numeric',month:'2-digit',day:'2-digit',...options}).format(date);
}
export function formatTime(value: string | undefined, settings: Settings) {
  if(!value) return '—';
  const [h,m]=value.split(':').map(Number);
  return new Intl.DateTimeFormat(settings.region,{hour:'2-digit',minute:'2-digit',hourCycle:settings.timeFormat==='24'?'h23':'h12'}).format(new Date(2000,0,1,h,m));
}
export const formatNumber=(value:number,settings:Settings)=>new Intl.NumberFormat(settings.region).format(value);
export function useFormat() {
  const {settings}=useSettings();
  return { date:(v:string|Date|undefined,o?:Intl.DateTimeFormatOptions)=>formatDate(v,settings,o), time:(v:string|undefined)=>formatTime(v,settings), number:(v:number)=>formatNumber(v,settings) };
}
