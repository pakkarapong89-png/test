'use client';
import React, { useState } from 'react';
import { User, Lock, UserPlus, LogIn, Eye, EyeOff, ShieldCheck, Clock, AlertCircle, CheckCircle, Mail } from 'lucide-react';

const themes = [
  { id: 'theme-sapphire', name: 'Dark Mode', color: '#000000' },
  { id: 'theme-violet', name: 'Light Mode', color: '#FFFFFF' }
];

function Login({ onLogin, theme, onChangeTheme, isElderMode, onChangeElderMode }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'error'|'success'|'pending', text: string }

  // Sign In state
  const [signInForm, setSignInForm] = useState({ username: '', password: '' });

  // Sign Up state
  const [signUpForm, setSignUpForm] = useState({ username: '', name: '', email: '', password: '', confirmPassword: '' });

  const clearMessage = () => setMessage(null);

  const handleSignIn = async (e) => {
    e.preventDefault();
    clearMessage();
    if (!signInForm.username || !signInForm.password) {
      setMessage({ type: 'error', text: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: signInForm.username.trim(), password: signInForm.password })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        onLogin(data.user);
      } else if (data.error === 'pending') {
        setMessage({ type: 'pending', text: data.message });
      } else {
        setMessage({ type: 'error', text: data.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่' });
      }
    } catch {
      setMessage({ type: 'error', text: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    clearMessage();
    if (!signUpForm.username || !signUpForm.name || !signUpForm.email || !signUpForm.password || !signUpForm.confirmPassword) {
      setMessage({ type: 'error', text: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
      return;
    }
    if (signUpForm.password !== signUpForm.confirmPassword) {
      setMessage({ type: 'error', text: 'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน' });
      return;
    }
    if (signUpForm.password.length < 6) {
      setMessage({ type: 'error', text: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: signUpForm.username,
          name: signUpForm.name,
          email: signUpForm.email,
          password: signUpForm.password
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: data.message });
        setSignUpForm({ username: '', name: '', email: '', password: '', confirmPassword: '' });
        // Switch to sign-in after 2 seconds
        setTimeout(() => setMode('signin'), 2500);
      } else {
        setMessage({ type: 'error', text: data.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่' });
      }
    } catch {
      setMessage({ type: 'error', text: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้' });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--surface-border)',
    borderRadius: '10px',
    padding: '0.75rem 1rem 0.75rem 2.75rem',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box'
  };

  const labelStyle = {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    fontWeight: 600,
    display: 'block',
    marginBottom: '0.4rem',
    letterSpacing: '0.03em'
  };

  const MessageBanner = ({ msg }) => {
    if (!msg) return null;
    const config = {
      error: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', color: '#F87171', icon: <AlertCircle size={16} /> },
      success: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', color: '#34D399', icon: <CheckCircle size={16} /> },
      pending: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', color: '#FBBF24', icon: <Clock size={16} /> }
    };
    const c = config[msg.type] || config.error;
    return (
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.6rem',
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: '10px',
        padding: '0.75rem 1rem',
        marginBottom: '1.25rem',
        color: c.color,
        fontSize: '0.88rem',
        lineHeight: 1.5
      }}>
        <span style={{ flexShrink: 0, marginTop: '1px' }}>{c.icon}</span>
        <span>{msg.text}</span>
      </div>
    );
  };

  return (
    <div className="login-container">
      {/* Floating Header Controls */}
      <div style={{
        position: 'absolute',
        top: '1.5rem',
        right: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.8rem',
        zIndex: 10
      }}>
        {/* Elder Mode Toggle */}
        <div
          onClick={() => onChangeElderMode(!isElderMode)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(15, 15, 18, 0.65)',
            border: isElderMode ? '1px solid var(--primary)' : '1px solid var(--surface-border)',
            padding: '0.4rem 0.8rem',
            borderRadius: '999px',
            boxShadow: 'var(--card-shadow)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'all 0.2s ease'
          }}
          title="โหมดตัวอักษรใหญ่สำหรับผู้สูงอายุ"
        >
          <span style={{ fontSize: '0.75rem', color: isElderMode ? 'var(--primary-hover)' : 'var(--text-secondary)', fontWeight: 600 }}>
            👵 ตัวอักษรใหญ่
          </span>
          <div style={{
            width: '28px', height: '16px',
            background: isElderMode ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
            borderRadius: '10px', position: 'relative', transition: 'all 0.2s ease',
            display: 'inline-block', verticalAlign: 'middle'
          }}>
            <div style={{
              width: '12px', height: '12px', background: '#FFFFFF', borderRadius: '50%',
              position: 'absolute', top: '2px',
              left: isElderMode ? '14px' : '2px',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }} />
          </div>
        </div>

        {/* Theme Switcher */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          background: 'rgba(15, 15, 18, 0.65)',
          border: '1px solid var(--surface-border)',
          padding: '0.4rem 0.8rem', borderRadius: '999px',
          boxShadow: 'var(--card-shadow)', backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)', transition: 'all 0.3s ease'
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>โทนสี:</span>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {themes.map(t => (
              <button
                key={t.id}
                onClick={() => onChangeTheme(t.id)}
                style={{
                  width: '14px', height: '14px', borderRadius: '50%',
                  backgroundColor: t.color,
                  border: theme === t.id ? '2px solid var(--text-primary)' : '1px solid var(--surface-border)',
                  cursor: 'pointer', padding: 0,
                  boxShadow: theme === t.id ? '0 0 6px var(--text-primary)' : 'none',
                  transition: 'all 0.2s ease',
                  transform: theme === t.id ? 'scale(1.15)' : 'scale(1)',
                  outline: 'none'
                }}
                title={t.name}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '10%', left: '50%',
        transform: 'translateX(-50%)',
        width: '500px', height: '350px',
        background: 'var(--glow-1)', borderRadius: '50%',
        filter: 'blur(120px)', pointerEvents: 'none',
        zIndex: 0, transition: 'background 0.5s ease'
      }} />

      <div className="login-card glass animate-fade-in" style={{ position: 'relative', zIndex: 1, padding: '2.5rem 2.25rem', maxWidth: '420px', width: '100%' }}>
        {/* Logo & Title */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.75rem', gap: '0.85rem' }}>
          <img src="/logo.png" alt="Expert Technology Development Logo" style={{ height: '55px', maxWidth: '100%', objectFit: 'contain' }} />
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, textAlign: 'center', color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            Expert Technology Development
          </h2>
        </div>

        {/* Tab switcher: Sign In / Sign Up */}
        <div style={{
          display: 'flex', borderRadius: '10px', overflow: 'hidden',
          border: '1px solid var(--surface-border)',
          marginBottom: '1.75rem', background: 'rgba(255,255,255,0.02)'
        }}>
          {[
            { id: 'signin', label: 'เข้าสู่ระบบ', icon: <LogIn size={15} /> },
            { id: 'signup', label: 'สมัครสมาชิก', icon: <UserPlus size={15} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setMode(tab.id); clearMessage(); }}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '0.45rem', padding: '0.7rem',
                border: 'none', cursor: 'pointer',
                background: mode === tab.id ? 'var(--primary)' : 'transparent',
                color: mode === tab.id ? '#fff' : 'var(--text-secondary)',
                fontWeight: mode === tab.id ? 700 : 500,
                fontSize: '0.9rem', transition: 'all 0.2s ease'
              }}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Message Banner */}
        <MessageBanner msg={message} />

        {/* SIGN IN FORM */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>ชื่อผู้ใช้ (Username)</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                <input
                  id="signin-username"
                  type="text"
                  value={signInForm.username}
                  onChange={e => setSignInForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="กรอกชื่อผู้ใช้"
                  style={inputStyle}
                  autoComplete="username"
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--surface-border)'; e.target.style.boxShadow = 'none'; }}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>รหัสผ่าน (Password)</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                <input
                  id="signin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={signInForm.password}
                  onChange={e => setSignInForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="กรอกรหัสผ่าน"
                  style={{ ...inputStyle, paddingRight: '2.75rem' }}
                  autoComplete="current-password"
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--surface-border)'; e.target.style.boxShadow = 'none'; }}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)} style={{
                  position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-secondary)', padding: 0, display: 'flex'
                }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              id="signin-submit"
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', margin: 0, padding: '0.8rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              {loading ? (
                <><div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />กำลังเข้าสู่ระบบ...</>
              ) : (
                <><LogIn size={17} />เข้าสู่ระบบ</>
              )}
            </button>
          </form>
        )}

        {/* SIGN UP FORM */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>ชื่อ-นามสกุล (Full Name)</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                <input
                  id="signup-name"
                  type="text"
                  value={signUpForm.name}
                  onChange={e => setSignUpForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="เช่น สมชาย ใจดี (ระบุแผนกได้)"
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--surface-border)'; e.target.style.boxShadow = 'none'; }}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>อีเมล (Email)</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                <input
                  id="signup-email"
                  type="email"
                  value={signUpForm.email}
                  onChange={e => setSignUpForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="เช่น user@company.com"
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--surface-border)'; e.target.style.boxShadow = 'none'; }}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>ชื่อผู้ใช้ (Username)</label>
              <div style={{ position: 'relative' }}>
                <ShieldCheck size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                <input
                  id="signup-username"
                  type="text"
                  value={signUpForm.username}
                  onChange={e => setSignUpForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="อย่างน้อย 3 ตัวอักษร"
                  style={inputStyle}
                  autoComplete="username"
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--surface-border)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>รหัสผ่าน (Password)</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  value={signUpForm.password}
                  onChange={e => setSignUpForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  style={{ ...inputStyle, paddingRight: '2.75rem' }}
                  autoComplete="new-password"
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--surface-border)'; e.target.style.boxShadow = 'none'; }}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)} style={{
                  position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-secondary)', padding: 0, display: 'flex'
                }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>ยืนยันรหัสผ่าน</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                <input
                  id="signup-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={signUpForm.confirmPassword}
                  onChange={e => setSignUpForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  placeholder="กรอกรหัสผ่านอีกครั้ง"
                  style={inputStyle}
                  autoComplete="new-password"
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--surface-border)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            {/* Info box */}
            <div style={{
              display: 'flex', gap: '0.6rem',
              background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: '10px', padding: '0.75rem 1rem',
              marginBottom: '1.25rem', color: '#93C5FD', fontSize: '0.82rem', lineHeight: 1.5
            }}>
              <Clock size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>หลังจากสมัครสมาชิก บัญชีของคุณจะอยู่ในสถานะ <strong>รอการอนุมัติ</strong> จากผู้ดูแลระบบก่อนเข้าใช้งานได้</span>
            </div>

            <button
              id="signup-submit"
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', margin: 0, padding: '0.8rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              {loading ? (
                <><div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />กำลังส่งคำขอ...</>
              ) : (
                <><UserPlus size={17} />สมัครสมาชิก</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Login;
