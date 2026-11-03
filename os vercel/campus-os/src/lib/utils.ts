import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export const uid = () => crypto.randomUUID();
export function dateKey(date = new Date(), timeZone = 'Africa/Casablanca'): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(date);
  const get = (t: string) => p.find(x => x.type === t)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export const shiftDate = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate()+days); return d.toISOString().slice(0,10);
};
export const rangeDates = (start: string, end: string, cap = 366) => {
  const dates: string[] = []; if (!start || !end || start > end) return dates;
  for (let d=start; d<=end && dates.length<cap; d=shiftDate(d,1)) dates.push(d);
  return dates;
};
export const fullName = (s: {firstName:string;lastName:string}) => `${s.firstName} ${s.lastName}`;
export const initials = (name: string) => name.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase() || 'A';
export const percent = (part: number, total: number) => total ? Math.round(part/total*1000)/10 : 0;
export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export function csvCell(value: unknown) {
  let s = String(value ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g,'""')}"`;
}
export function downloadCSV(name: string, rows: unknown[][]) {
  const csv = '\uFEFF' + rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
  downloadBlob(new Blob([csv], {type:'text/csv;charset=utf-8'}), name);
}
export function downloadBlob(blob: Blob, name: string) {
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
  const area=document.createElement('textarea'); area.value=text; area.style.position='fixed'; area.style.opacity='0';
  document.body.appendChild(area); area.select(); const ok=document.execCommand('copy'); area.remove();
  if (!ok) throw new Error('clipboard');
}
