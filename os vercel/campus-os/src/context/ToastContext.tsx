import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { uid } from '../lib/utils';
type Toast={id:string;message:string;type:'success'|'error'|'info'};
const ToastContext=createContext<{notify:(message:string,type?:Toast['type'])=>void}>({notify:()=>{}});
export function ToastProvider({children}:{children:ReactNode}) {
  const [toasts,setToasts]=useState<Toast[]>([]);const {t}=useTranslation();
  const dismiss=useCallback((id:string)=>setToasts(p=>p.filter(x=>x.id!==id)),[]);
  const notify=useCallback((message:string,type:Toast['type']='success')=>{const id=uid();setToasts(p=>[...p.slice(-3),{id,message,type}]);setTimeout(()=>dismiss(id),5000);},[dismiss]);
  return <ToastContext.Provider value={{notify}}>{children}<div className="fixed bottom-5 end-5 z-[100] flex w-[min(390px,calc(100vw-40px))] flex-col gap-2" aria-live="polite">{toasts.map(toast=><div key={toast.id} className="toast-in flex items-center gap-3 rounded-xl border border-line bg-surface p-4 shadow-pop"><span className={toast.type==='error'?'text-danger':toast.type==='success'?'text-success':'text-primary'}>{toast.type==='error'?<AlertCircle size={20}/>:toast.type==='success'?<CheckCircle2 size={20}/>:<Info size={20}/>}</span><p className="flex-1 text-sm text-ink">{toast.message}</p><button className="icon-button !h-7 !w-7" onClick={()=>dismiss(toast.id)} aria-label={t('common.close')}><X size={15}/></button></div>)}</div></ToastContext.Provider>;
}
export const useToast=()=>useContext(ToastContext);
