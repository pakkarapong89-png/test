'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Dashboard from '@/components/Dashboard';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('theme-sapphire');
  const [isElderMode, setIsElderMode] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      await Promise.resolve();
      const savedTheme = localStorage.getItem('theme') || 'theme-sapphire';
      setTheme(savedTheme);

      const savedElderMode = localStorage.getItem('elderMode') === 'true';
      setIsElderMode(savedElderMode);

      let classNames = savedTheme;
      if (savedElderMode) classNames += ' elder-mode';
      document.documentElement.className = classNames;

      // Read user from UAT role selection
      const savedUser = sessionStorage.getItem('user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      } else {
        router.push('/');
      }
    };
    init();
  }, [router]);

  const handleChangeTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    let classNames = newTheme;
    if (isElderMode) classNames += ' elder-mode';
    document.documentElement.className = classNames;
  };

  const handleChangeElderMode = (enabled) => {
    setIsElderMode(enabled);
    localStorage.setItem('elderMode', enabled ? 'true' : 'false');
    if (enabled) {
      document.documentElement.classList.add('elder-mode');
    } else {
      document.documentElement.classList.remove('elder-mode');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (_) {}
    sessionStorage.removeItem('user');
    router.push('/');
  };

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-color)'
      }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--surface-border)',
            borderTop: '3px solid var(--primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p>กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <Dashboard
      user={user}
      onLogout={handleLogout}
      theme={theme}
      onChangeTheme={handleChangeTheme}
      isElderMode={isElderMode}
      onChangeElderMode={handleChangeElderMode}
    />
  );
}
