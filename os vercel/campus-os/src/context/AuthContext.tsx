import { createContext, useContext, useState, type ReactNode } from 'react';
import { KEYS, readStorage, writeStorage } from '../lib/storage';
export interface DemoSession { username:string; createdAt:string; expiresAt:string; mode:'demo' }
export interface AuthProviderAdapter { getSession():DemoSession|null; signIn(identity:string,password:string,remember:boolean):Promise<DemoSession>; signOut():void; }
export const demoAuth:AuthProviderAdapter={
  getSession(){const s=readStorage<DemoSession|null>(KEYS.session,null);if(!s || s.mode!=='demo' || s.username!=='admin' || new Date(s.expiresAt).getTime()<=Date.now()){localStorage.removeItem(KEYS.session);return null;}return s;},
  async signIn(identity,password,remember){await new Promise(r=>setTimeout(r,550));if(identity.trim()!=='admin'||password!=='admin')throw new Error('invalid');const now=new Date();const session:DemoSession={username:'admin',createdAt:now.toISOString(),expiresAt:new Date(now.getTime()+(remember?30*24:12)*3600000).toISOString(),mode:'demo'};writeStorage(KEYS.session,session);return session;},
  signOut(){localStorage.removeItem(KEYS.session);}
};
const AuthContext=createContext<{session:DemoSession|null;auth:AuthProviderAdapter;login:typeof demoAuth.signIn;logout:()=>void}>(null!);
export function AuthProvider({children,auth=demoAuth}:{children:ReactNode;auth?:AuthProviderAdapter}) {
 const [session,setSession]=useState(()=>auth.getSession());
 const login=async(identity:string,password:string,remember:boolean)=>{const s=await auth.signIn(identity,password,remember);setSession(s);return s;};
 const logout=()=>{auth.signOut();setSession(null);};
 return <AuthContext.Provider value={{session,auth,login,logout}}>{children}</AuthContext.Provider>;
}
export const useAuth=()=>useContext(AuthContext);
