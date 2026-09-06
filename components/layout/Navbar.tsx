'use client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { LogOut, Bell, User, Sun, Moon } from 'lucide-react';
import { logout, getAuth } from '@/lib/auth';
import { useEmergency } from '@/context/EmergencyContext';
import { useTheme } from '@/context/ThemeContext';
import { useState, useEffect } from 'react';
import { getMeApi, updateDutyApi } from '@/lib/api';

export function Navbar() {
  const router = useRouter();
  const { liveCount } = useEmergency();
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [updatingDuty, setUpdatingDuty] = useState(false);

  useEffect(() => { 
    setMounted(true);
    const userAuth = getAuth();
    if (userAuth?.token && (userAuth.role === 'safety_officer' || userAuth.role === 'company_admin')) {
      getMeApi(userAuth.token).then(res => {
        setIsOnDuty(res.data.is_on_duty);
      }).catch(console.error);
    }
  }, []);
  const user = mounted ? getAuth() : null;

  const handleToggleDuty = async () => {
    if (!user?.token) return;
    setUpdatingDuty(true);
    try {
      const newStatus = !isOnDuty;
      await updateDutyApi(newStatus, user.token);
      setIsOnDuty(newStatus);
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingDuty(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header
      className="h-16 flex items-center justify-between px-6 flex-shrink-0"
      style={{
        background: 'var(--sos-bg-surface)',
        borderBottom: '1px solid var(--sos-border)',
        boxShadow: 'var(--sos-shadow)',
      }}
    >
      <div className="flex items-center gap-3">
        <Image
          src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'}
          alt="EchoAlert"
          width={180}
          height={60}
          priority
          style={{ objectFit: 'contain', width: 'auto', height: 'auto', maxHeight: '48px' }}
        />
        <div className="hidden sm:block">
          <div className="text-xs" style={{ color: 'var(--sos-text-muted)' }}>
            {user?.companyName ?? 'Tableau de bord'} &middot; Surveillance industrielle
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {user && (user.role === 'safety_officer' || user.role === 'company_admin') && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg mr-2" style={{ border: '1px solid var(--sos-border)' }}>
            <span className="text-xs font-semibold" style={{ color: isOnDuty ? '#4CAF50' : 'var(--sos-text-secondary)' }}>
              {isOnDuty ? 'En service' : 'Hors service'}
            </span>
            <button 
              onClick={handleToggleDuty} 
              disabled={updatingDuty}
              className="w-10 h-5 rounded-full relative transition-all"
              style={{ background: isOnDuty ? '#4CAF50' : 'var(--sos-border)', opacity: updatingDuty ? 0.5 : 1 }}
            >
              <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm" style={{ left: isOnDuty ? '22px' : '2px' }} />
            </button>
          </div>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-105"
          style={{ background: 'var(--sos-bg-hover)', border: '1px solid var(--sos-border)' }}
          title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
        >
          {theme === 'dark'
            ? <Sun className="w-4 h-4" style={{ color: 'var(--sos-warning)' }} />
            : <Moon className="w-4 h-4" style={{ color: 'var(--sos-text-secondary)' }} />}
        </button>

        {/* Bell */}
        <div className="relative">
          <button
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-105"
            style={{ background: 'var(--sos-bg-hover)', border: '1px solid var(--sos-border)' }}
          >
            <Bell className="w-4 h-4" style={{ color: 'var(--sos-text-muted)' }} />
          </button>
          {liveCount > 0 && (
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white badge-pulse"
              style={{ background: 'var(--sos-accent)', fontSize: '10px', fontWeight: 700 }}
            >
              {liveCount}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6" style={{ background: 'var(--sos-border)' }} />

        {/* User chip */}
        <div
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg"
          style={{ background: 'var(--sos-bg-hover)', border: '1px solid var(--sos-border)' }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: 'var(--sos-accent)' }}
          >
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-semibold" style={{ color: 'var(--sos-text-primary)' }}>
              {user?.name ?? 'Utilisateur'}
            </div>
            <div className="text-xs" style={{ color: 'var(--sos-text-muted)' }}>
              {user?.role ?? 'Admin'}
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
          style={{
            background: 'var(--sos-accent-muted)',
            color: 'var(--sos-accent)',
            border: '1px solid var(--sos-accent-border)',
          }}
        >
          <LogOut className="w-3.5 h-3.5" />
          Déconnexion
        </button>
      </div>
    </header>
  );
}
