import { useEffect, useState } from 'react';
import { KEYS, readStorage, writeStorage } from './storage';
import type { Conversation } from '../data/types';
export function loadConversations(){const saved=readStorage<Conversation[]>(KEYS.chats,[]);return Array.isArray(saved)?saved.filter(c=>typeof c.id==='string'&&Array.isArray(c.messages)).slice(0,30):[];}
export function persistConversations(conversations:Conversation[]){writeStorage(KEYS.chats,conversations.slice(0,30));window.dispatchEvent(new Event('campus-chats'));}
export function clearConversations(){try{localStorage.removeItem(KEYS.chats);}catch{/* Storage may be blocked. */}window.dispatchEvent(new Event('campus-chats'));}
export function useConversations(saveHistory:boolean){const [conversations,setConversations]=useState(loadConversations);useEffect(()=>{const refresh=()=>setConversations(loadConversations());window.addEventListener('campus-chats',refresh);window.addEventListener('storage',refresh);return()=>{window.removeEventListener('campus-chats',refresh);window.removeEventListener('storage',refresh);};},[]);const update=(next:Conversation[])=>{setConversations(next.slice(0,30));if(saveHistory){try{persistConversations(next);}catch{clearConversations();throw new Error('storageFull');}}};return {conversations,update};}
