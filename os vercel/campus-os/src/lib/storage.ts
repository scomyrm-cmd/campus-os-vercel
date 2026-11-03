export const KEYS = { data:'campus-os:v1:data', settings:'campus-os:v1:settings', session:'campus-os:v1:session', chats:'campus-os:v1:conversations' };
export function readStorage<T>(key: string, fallback: T): T {
  try { const raw=localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
}
export function writeStorage(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (e) { if (e instanceof DOMException && (e.name==='QuotaExceededError' || e.code===22)) throw new Error('storageFull'); throw new Error('storageUnavailable'); }
}
export async function imageData(file: File, max=800): Promise<string> {
  if (!['image/png','image/jpeg'].includes(file.type)) throw new Error('imageType');
  if (file.size>10*1024*1024) throw new Error('imageSize');
  const url=URL.createObjectURL(file);
  try {
    const img=new Image(); img.src=url; await img.decode();
    const scale=Math.min(1,max/Math.max(img.width,img.height));
    const canvas=document.createElement('canvas'); canvas.width=Math.max(1,Math.round(img.width*scale)); canvas.height=Math.max(1,Math.round(img.height*scale));
    const ctx=canvas.getContext('2d'); if (!ctx) throw new Error('imageInvalid');
    ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(img,0,0,canvas.width,canvas.height);
    let quality=.82; let result=canvas.toDataURL('image/jpeg',quality);
    while(result.length>180000 && quality>.25) { quality-=.1; result=canvas.toDataURL('image/jpeg',quality); }
    if(result.length>240000) throw new Error('imageSize'); return result;
  } catch(e) { if(e instanceof Error && ['imageType','imageSize'].includes(e.message)) throw e; throw new Error('imageInvalid'); }
  finally { URL.revokeObjectURL(url); }
}
