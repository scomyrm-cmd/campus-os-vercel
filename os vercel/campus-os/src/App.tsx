import { Component, Suspense, lazy, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import i18n from './i18n';
import { useTranslation } from 'react-i18next';
import { GraduationCap, AlertTriangle } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider, Loading, Button, Card } from './components/ui';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Attendance from './pages/Attendance';
import LostFound from './pages/LostFound';
import ActivityLog from './pages/ActivityLog';
import Settings from './pages/Settings';
const CampusAI=lazy(()=>import('./pages/CampusAI'));
class ErrorBoundary extends Component<{children:ReactNode},{error:boolean}>{state={error:false};static getDerivedStateFromError(){return {error:true};}render(){if(this.state.error)return <div className="flex min-h-dvh items-center justify-center p-6"><Card className="max-w-lg p-8 text-center"><AlertTriangle className="mx-auto mb-4 text-warning" size={32}/><h1 className="text-xl font-semibold">Campus OS</h1><p className="my-4 text-sm leading-7 text-muted">{i18n.t('app.loadError')}</p><Button variant="primary" onClick={()=>location.reload()}>{i18n.t('app.reload')}</Button></Card></div>;return this.props.children;}}
function NotFound(){const {t}=useTranslation();return <div className="py-24 text-center"><GraduationCap size={40} className="mx-auto mb-5 text-primary"/><h1 className="text-3xl font-semibold">404</h1><p className="my-4 text-sm text-muted">{t('app.notFound')}</p><Link to="/"><Button variant="primary">{t('nav.dashboard')}</Button></Link></div>;}
export default function App(){return <ErrorBoundary><DataProvider><SettingsProvider><AuthProvider><ToastProvider><ConfirmProvider><BrowserRouter><Suspense fallback={<Loading/>}><Routes><Route path="/login" element={<Login/>}/><Route element={<Layout/>}><Route index element={<Dashboard/>}/><Route path="students" element={<Students/>}/><Route path="attendance" element={<Attendance/>}/><Route path="lost-found" element={<LostFound/>}/><Route path="activity" element={<ActivityLog/>}/><Route path="settings" element={<Settings/>}/><Route path="campus-ai" element={<CampusAI/>}/><Route path="*" element={<NotFound/>}/></Route><Route path="*" element={<Navigate to="/login" replace/>}/></Routes></Suspense></BrowserRouter></ConfirmProvider></ToastProvider></AuthProvider></SettingsProvider></DataProvider></ErrorBoundary>;}
