'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Moon, Sun } from 'lucide-react';

export default function HomePage() {
  const [theme, setTheme] = useState('theme-sapphire');
  const [isElderMode, setIsElderMode] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'theme-sapphire';
    setTheme(savedTheme);

    const savedElderMode = localStorage.getItem('elderMode') === 'true';
    setIsElderMode(savedElderMode);

    let classNames = savedTheme;
    if (savedElderMode) classNames += ' elder-mode';
    document.documentElement.className = classNames;

    setCheckingSession(false);
  }, []);

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

  const handleSelectRole = (role, name) => {
    const mockUser = {
      id: 999,
      username: role.toLowerCase(),
      name: name,
      role: role,
      jiraDisplayName: name,
      is_approved: true
    };
    sessionStorage.setItem('user', JSON.stringify(mockUser));
    router.push('/dashboard');
  };

  if (checkingSession) {
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

  const uatRoles = [
    { role: 'Admin', name: 'Admin (ผู้ดูแลระบบ)', desc: 'สิทธิ์สูงสุด จัดการทีม ดูล็อก และการตั้งค่า', color: '#FBBF24', isRead: false },
    { role: 'Manager', name: 'Manager (ผู้จัดการ)', desc: 'ควบคุมงาน จัดการตารางงาน และสถานะงาน', color: '#A78BFA', isRead: false },
    { role: 'Developer', name: 'Developer (นักพัฒนา)', desc: 'ดูงานที่ได้รับมอบหมาย และอัปเดตงานตนเอง', color: '#34D399', isRead: false },
    { role: 'CEO', name: 'CEO (ผู้บริหารสูงสุด)', desc: 'เน้นดูแผนภูมิ บันทึกสถิติ และมูลค่างานรวม', color: '#F87171', isRead: true },
    { role: 'Sales', name: 'Sales (ฝ่ายขาย)', desc: 'ดูรายงานความคืบหน้าเพื่อติดต่อประสานงานลูกค้า', color: '#FBBF24', isRead: true },
    { role: 'Deployment', name: 'Deployment (ฝ่ายติดตั้ง)', desc: 'ติดตามตั๋วงานที่มีการอัปเดต เตรียมอัปโหลดขึ้นเซิร์ฟเวอร์', color: '#60A5FA', isRead: true },
    { role: 'IT_Sub', name: 'IT Sub (ฝ่ายไอทีสนับสนุน)', desc: 'ติดตามรายงานปัญหาและขอสิทธิ์ช่วยเหลือลูกค้า', color: '#F472B6', isRead: true }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-color)',
      padding: '40px 20px',
      fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)'
    }}>
      <style>{`
        .role-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-bottom: 24px;
        }
        @media (min-width: 600px) {
          .role-grid {
            grid-template-columns: 1fr 1fr;
            gap: 14px;
          }
          .admin-card {
            grid-column: span 2;
          }
        }
        .role-btn {
          background: var(--bg-surface) !important;
          border: 1px solid var(--surface-border) !important;
          border-radius: 12px;
          padding: 14px 16px;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .role-btn:hover {
          border-color: var(--primary) !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
          background: rgba(255, 255, 255, 0.02) !important;
        }
        .role-btn:active {
          transform: translateY(0);
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--surface-border)',
        borderRadius: '20px',
        padding: '36px 30px',
        maxWidth: '720px',
        width: '100%',
        boxShadow: '0 20px 45px rgba(0,0,0,0.3)',
        textAlign: 'center'
      }}>
        {/* Title */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '52px',
          height: '52px',
          borderRadius: '14px',
          background: 'rgba(var(--primary-rgb), 0.1)',
          color: 'var(--primary)',
          marginBottom: '16px'
        }}>
          <ShieldCheck size={28} />
        </div>
        
        <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-primary)' }}>
          🔍 UAT Dashboard Testing
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '28px', lineHeight: '1.5' }}>
          เลือกตำแหน่งที่ต้องการทดสอบเพื่อเข้าชมระบบแดชบอร์ด
        </p>

        {/* Role buttons grid */}
        <div className="role-grid">
          {uatRoles.map((item, idx) => (
            <button
              key={item.role}
              onClick={() => handleSelectRole(item.role, item.name.split(' ')[0])}
              className={`role-btn ${item.role === 'Admin' ? 'admin-card' : ''}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: item.color,
                  boxShadow: `0 0 8px ${item.color}`
                }} />
                <strong style={{ color: 'var(--text-primary)', fontSize: '15px' }}>{item.name}</strong>
                {item.isRead && (
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--surface-border)',
                    color: 'var(--text-secondary)',
                    marginLeft: 'auto'
                  }}>Read-Only</span>
                )}
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0, lineHeight: '1.4' }}>
                {item.desc}
              </p>
            </button>
          ))}
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--surface-border)', margin: '24px 0' }} />

        {/* Theme Settings & Elder Mode toggle */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => handleChangeTheme('theme-sapphire')}
              style={{
                background: theme === 'theme-sapphire' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                color: theme === 'theme-sapphire' ? '#fff' : 'var(--text-primary)',
                border: '1px solid var(--surface-border)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Moon size={14} /> ธีมมืด
            </button>
            <button
              onClick={() => handleChangeTheme('theme-violet')}
              style={{
                background: theme === 'theme-violet' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                color: theme === 'theme-violet' ? '#fff' : 'var(--text-primary)',
                border: '1px solid var(--surface-border)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Sun size={14} /> ธีมสว่าง
            </button>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={isElderMode}
              onChange={(e) => handleChangeElderMode(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            โหมดตัวอักษรใหญ่ (Accessibility)
          </label>
        </div>
      </div>
    </div>
  );
}
