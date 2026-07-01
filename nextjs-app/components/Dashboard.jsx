'use client';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  LogOut, 
  LayoutDashboard, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Briefcase, 
  Truck, 
  Calendar, 
  User, 
  Search, 
  RefreshCw,
  Loader2,
  Shield,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Folder,
  Layers,
  AlertTriangle,
  CheckSquare,
  Package,
  List,
  BarChart2,
  TrendingUp,
  Edit2,
  Plus,
  X,
  Server,
  Menu,
  Eye,
  EyeOff
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const themes = [
  { id: 'theme-sapphire', name: '🌙 Dark Mode', color: '#0A0A0C' },
  { id: 'theme-violet', name: '☀️ Light Mode', color: '#4F46E5' }
];

const themeColors = {
  'theme-sapphire': ['#10B981', '#3B82F6', '#8B5CF6', '#9CA3AF'], // Done = Green, In Progress = Blue, In Review = Purple, To Do = Gray
  'theme-violet': ['#059669', '#2563EB', '#7C3AED', '#6B7280'] // Done = Dark Green, In Progress = Dark Blue, In Review = Purple, To Do = Dark Gray
};

function Dashboard({ user, onLogout, theme, onChangeTheme, isElderMode, onChangeElderMode }) {
  const currentColors = themeColors[theme] || themeColors['theme-sapphire'];

  const roleColors = {
    'Manager': { color: '#A78BFA', bg: 'rgba(139, 92, 246, 0.12)', border: 'rgba(139, 92, 246, 0.3)' },
    'Developer': { color: '#34D399', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' },
    'Sales': { color: '#FBBF24', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' },
    'Deployment': { color: '#60A5FA', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)' },
    'IT_Sub': { color: '#F472B6', bg: 'rgba(217, 70, 239, 0.12)', border: 'rgba(217, 70, 239, 0.3)' },
    'CEO': { color: '#F87171', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)' },
    'Admin': { color: '#FBBF24', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' }
  };
  const renderLegendText = (value, entry) => {
    const { color } = entry;
    return <span style={{ color: color, fontWeight: 600, fontSize: '0.95rem' }}>{value}</span>;
  };
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showMyTasksOnly, setShowMyTasksOnly] = useState(false);
  const [ceoValueMultiplier, setCeoValueMultiplier] = useState(20000);
  const [pmTab, setPmTab] = useState('overview'); // 'overview' | 'tree' | 'workload'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState({}); // { [key]: boolean }
  const [selectedTicketForDetail, setSelectedTicketForDetail] = useState(null);
  const [sortBy, setSortBy] = useState('priority'); // 'priority' | 'date-asc' | 'date-desc'
  const [activityLogs, setActivityLogs] = useState([]);
  const [ticketChangelog, setTicketChangelog] = useState([]);
  const [loadingChangelog, setLoadingChangelog] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [logActionFilter, setLogActionFilter] = useState('all');

  const [healthData, setHealthData] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [newMember, setNewMember] = useState({ nickname: '', jiraDisplayName: '', email: '', webhookUrl: '' });
  const [jiraUserSuggestions, setJiraUserSuggestions] = useState([]);
  const [loadingJiraSuggestions, setLoadingJiraSuggestions] = useState(false);
  const [showJiraSuggestions, setShowJiraSuggestions] = useState(false);

  // Admin panel state
  const [adminUsers, setAdminUsers] = useState([]);
  const [loadingAdminUsers, setLoadingAdminUsers] = useState(false);
  const [adminRoleSelections, setAdminRoleSelections] = useState({}); // { [userId]: selectedRole }
  const [adminActionLoading, setAdminActionLoading] = useState({}); // { [userId]: bool }
  const [adminMessage, setAdminMessage] = useState(null);
  const [adminError, setAdminError] = useState(null);
  
  // Inline editing state
  const [isEditingTicket, setIsEditingTicket] = useState(false);
  const [isSavingTicket, setIsSavingTicket] = useState(false);
  const [editedTicket, setEditedTicket] = useState(null);
  const modalContentRef = useRef(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [availableTransitions, setAvailableTransitions] = useState([]);
  const [loadingTransitions, setLoadingTransitions] = useState(false);

  const [timeFilter, setTimeFilter] = useState('this-week');
  const [hiddenProjects, setHiddenProjects] = useState([]);
  const [showVisibilityManager, setShowVisibilityManager] = useState(false);

  const [previewRole, setPreviewRole] = useState(null);

  const effectiveRole = previewRole || user.role;
  const isReadOnlyRole = !!previewRole || ['Sales', 'Deployment', 'CEO'].includes(effectiveRole);
  const currentRoleStyle = roleColors[effectiveRole] || { color: 'var(--text-primary)', bg: 'var(--surface-hover-bg)', border: 'var(--surface-border)' };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedFilter = localStorage.getItem('timeFilter');
      if (storedFilter && storedFilter !== 'active-recent') {
        setTimeFilter(storedFilter);
      } else {
        setTimeFilter('this-week');
      }
      const stored = localStorage.getItem('hiddenProjects');
      if (stored) {
        try {
          setHiddenProjects(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to load hiddenProjects:', e);
        }
      }
    }
  }, []);

  const toggleHideProject = (projectKey) => {
    const nextHidden = hiddenProjects.includes(projectKey)
      ? hiddenProjects.filter(key => key !== projectKey)
      : [...hiddenProjects, projectKey];
    setHiddenProjects(nextHidden);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hiddenProjects', JSON.stringify(nextHidden));
    }
  };

  const handleChangeTimeFilter = (val) => {
    setTimeFilter(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('timeFilter', val);
    }
  };

  const fetchHealthData = async () => {
    setLoadingHealth(true);
    try {
      const response = await axios.get('/api/health');
      setHealthData(response.data);
    } catch (err) {
      console.error('Failed to fetch health data:', err);
    } finally {
      setLoadingHealth(false);
    }
  };

  const fetchTeamMembers = async () => {
    setLoadingTeam(true);
    try {
      const response = await axios.get('/api/team');
      setTeamMembers(response.data);
    } catch (err) {
      console.error('Failed to fetch team members:', err);
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (isReadOnlyRole) {
      alert('คุณไม่มีสิทธิ์ดำเนินการนี้ (Read-only Role)');
      return;
    }
    if (!newMember.nickname || !newMember.jiraDisplayName) {
      alert('กรุณากรอกชื่อเล่นและชื่อในระบบ Jira');
      return;
    }
    const updatedTeam = [...teamMembers, newMember];
    try {
      await axios.post('/api/team', updatedTeam);
      setTeamMembers(updatedTeam);
      setNewMember({ nickname: '', jiraDisplayName: '', email: '', webhookUrl: '' });
      axios.post('/api/logs', {
        user: user.name,
        role: user.role,
        action: 'update',
        details: `เพิ่มสมาชิกทีมใหม่: "${newMember.nickname}" (${newMember.jiraDisplayName})`
      }).then(() => fetchLogs());
    } catch (err) {
      console.error('Failed to save team member:', err);
      alert('บันทึกข้อมูลล้มเหลว');
    }
  };

  const handleJiraNameChange = async (val) => {
    setNewMember(prev => ({ ...prev, jiraDisplayName: val }));
    if (val.trim().length >= 2) {
      setLoadingJiraSuggestions(true);
      setShowJiraSuggestions(true);
      try {
        const response = await axios.get(`/api/jira/users?query=${encodeURIComponent(val)}`);
        setJiraUserSuggestions(response.data || []);
      } catch (err) {
        console.error('Failed to fetch Jira user suggestions:', err);
      } finally {
        setLoadingJiraSuggestions(false);
      }
    } else {
      setJiraUserSuggestions([]);
      setShowJiraSuggestions(false);
    }
  };

  const handleSelectJiraUser = (u) => {
    setNewMember(prev => ({
      ...prev,
      jiraDisplayName: u.displayName,
      email: u.emailAddress || prev.email
    }));
    setJiraUserSuggestions([]);
    setShowJiraSuggestions(false);
  };

  const handleDeleteMember = async (indexToDelete) => {
    if (isReadOnlyRole) {
      alert('คุณไม่มีสิทธิ์ดำเนินการนี้ (Read-only Role)');
      return;
    }
    if (!window.confirm('คุณต้องการลบรายชื่อสมาชิกนี้ใช่หรือไม่?')) return;
    const deletedUser = teamMembers[indexToDelete];
    const updatedTeam = teamMembers.filter((_, idx) => idx !== indexToDelete);
    try {
      await axios.post('/api/team', updatedTeam);
      setTeamMembers(updatedTeam);
      axios.post('/api/logs', {
        user: user.name,
        role: user.role,
        action: 'update',
        details: `ลบสมาชิกทีม: "${deletedUser.nickname}"`
      }).then(() => fetchLogs());
    } catch (err) {
      console.error('Failed to delete team member:', err);
      alert('ลบข้อมูลล้มเหลว');
    }
  };

  const fetchAvailableTransitions = async (ticketKey) => {
    setLoadingTransitions(true);
    try {
      const response = await axios.get(`/api/tickets/${ticketKey}/transitions`);
      setAvailableTransitions(response.data || []);
    } catch (err) {
      console.error('Failed to fetch transitions:', err);
      setAvailableTransitions([]);
    } finally {
      setLoadingTransitions(false);
    }
  };

  const handleSaveTicketEdits = async () => {
    if (isReadOnlyRole) {
      alert('คุณไม่มีสิทธิ์ในการแก้ไขงาน (Read-only Role)');
      return;
    }
    if (!editedTicket.summary.trim()) {
      alert('หัวข้องานห้ามว่าง');
      return;
    }
    setIsSavingTicket(true);
    try {
      const payload = {
        summary: editedTicket.summary,
        description: editedTicket.description,
        priority: editedTicket.priority,
        dueDate: editedTicket.duedate || null,
        assigneeName: editedTicket.assignee === 'Unassigned' ? '' : editedTicket.assignee,
        actorName: user?.name || user?.username
      };
      
      await axios.put(`/api/tickets/${editedTicket.key}`, payload);

      if (editedTicket.status !== selectedTicketForDetail.status) {
        const transitionMatch = availableTransitions.find(t => t.name.toLowerCase() === editedTicket.status.toLowerCase());
        if (transitionMatch) {
          await axios.post(`/api/tickets/${editedTicket.key}/transition`, {
            transitionId: transitionMatch.id,
            actorName: user?.name || user?.username
          });
        }
      }

      await axios.post('/api/logs', {
        user: user.name,
        role: user.role,
        action: 'update',
        ticketKey: editedTicket.key,
        details: `อัปเดตข้อมูลตั๋วผ่านแดชบอร์ด: "${editedTicket.summary}"`
      });

      setSelectedTicketForDetail(null);
      setIsEditingTicket(false);
      fetchTickets();
      setShowSuccessNotification(true);
    } catch (err) {
      console.error('Failed to update ticket details:', err);
      const errMsg = err.response?.data?.error ? JSON.stringify(err.response.data.error) : err.message;
      alert(`บันทึกข้อมูลล้มเหลว: ${errMsg}`);
    } finally {
      setIsSavingTicket(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await axios.get('/api/logs');
      setActivityLogs(response.data);
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    }
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/tickets');
      setTickets(response.data);
      setLoading(false);
      setError('');
      fetchLogs();
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อกับ Server เพื่อดึงข้อมูลได้');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchTeamMembers();
    fetchHealthData();
  }, []);

  useEffect(() => {
    if (selectedTicketForDetail) {
      // บันทึก Log การเปิดดูรายละเอียดตั๋ว (view only — ไม่ใช่ action)
      axios.post('/api/logs', {
        user: user.name,
        role: user.role,
        action: 'view',
        ticketKey: selectedTicketForDetail.key,
        details: `เปิดดูรายละเอียดงาน: "${selectedTicketForDetail.summary}"`
      })
      .then(() => fetchLogs())
      .catch(err => console.error('Failed to send view log:', err));

      // Load transitions and setup edit state
      // (ไม่บันทึก log "view" เพราะแค่กดดูไม่ใช่ action จริง)
      fetchAvailableTransitions(selectedTicketForDetail.key);
      setIsEditingTicket(false);
      setEditedTicket({ ...selectedTicketForDetail });
    } else {
      setIsEditingTicket(false);
      setEditedTicket(null);
      setAvailableTransitions([]);
    }
  }, [selectedTicketForDetail]);

  useEffect(() => {
    if (selectedTicketForDetail) {
      setLoadingChangelog(true);
      axios.get(`/api/tickets/${selectedTicketForDetail.key}/changelog`)
        .then(res => {
          setTicketChangelog(res.data);
          setLoadingChangelog(false);
        })
        .catch(err => {
          console.error('Failed to fetch ticket changelog:', err);
          setTicketChangelog([]);
          setLoadingChangelog(false);
        });
    } else {
      setTicketChangelog([]);
    }
  }, [selectedTicketForDetail]);

  useEffect(() => {
    if (pmTab === 'team') {
      fetchTeamMembers();
    }
    if (pmTab === 'admin') {
      fetchAdminUsers();
    }
  }, [pmTab]);

  const fetchAdminUsers = async () => {
    setLoadingAdminUsers(true);
    setAdminError(null);
    try {
      const res = await axios.get('/api/admin/users', { withCredentials: true });
      if (Array.isArray(res.data)) {
        setAdminUsers(res.data);
      } else {
        setAdminError('ได้รับข้อมูลผิดปกติจาก server: ' + JSON.stringify(res.data));
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'โหลดข้อมูลผู้ใช้ไม่สำเร็จ';
      setAdminError(msg);
      console.error('Failed to fetch admin users:', err);
    } finally {
      setLoadingAdminUsers(false);
    }
  };

  const handleAdminAction = async (userId, action, role) => {
    setAdminActionLoading(prev => ({ ...prev, [userId]: true }));
    setAdminMessage(null);
    try {
      const res = await axios.post('/api/admin/users', { action, userId, role });
      setAdminMessage({ type: 'success', text: res.data.message });
      fetchAdminUsers();
    } catch (err) {
      const msg = err.response?.data?.error || 'เกิดข้อผิดพลาด';
      setAdminMessage({ type: 'error', text: msg });
    } finally {
      setAdminActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const renderAdminPanel = () => {
    const ROLES = ['Manager', 'Developer', 'Sales', 'Deployment', 'IT_Sub', 'CEO'];
    const pending = adminUsers.filter(u => !u.is_approved);
    const approved = adminUsers.filter(u => u.is_approved);

    const ROLE_STYLE = {
      Manager:    { color: '#A78BFA', bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.3)'  },
      Developer:  { color: '#34D399', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)'  },
      Sales:      { color: '#FBBF24', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)'  },
      Deployment: { color: '#60A5FA', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)'  },
      IT_Sub:     { color: '#F472B6', bg: 'rgba(217,70,239,0.12)',  border: 'rgba(217,70,239,0.3)'  },
      CEO:        { color: '#F87171', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)'   },
      Pending:    { color: '#9CA3AF', bg: 'rgba(156,163,175,0.08)', border: 'rgba(156,163,175,0.2)' },
    };

    const roleCounts = ROLES.reduce((acc, r) => { acc[r] = approved.filter(u => u.role === r).length; return acc; }, {});

    const RoleBadge = ({ role }) => {
      const s = ROLE_STYLE[role] || ROLE_STYLE.Pending;
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', background: s.bg, border: `1px solid ${s.border}`, color: s.color, borderRadius: '999px', padding: '0.22rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
          {role}
        </span>
      );
    };

    const Avatar = ({ name, role }) => {
      const s = ROLE_STYLE[role] || ROLE_STYLE.Pending;
      return (
        <div style={{ width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0, background: s.bg, border: `1.5px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, fontWeight: 800, fontSize: '0.9rem' }}>
          {name ? name.charAt(0).toUpperCase() : '?'}
        </div>
      );
    };

    const thStyle = { padding: '0.85rem 1.1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid var(--surface-border)', background: 'rgba(255,255,255,0.015)' };
    const tdStyle = { padding: '0.95rem 1.1rem', verticalAlign: 'middle', borderBottom: '1px solid rgba(255,255,255,0.03)', color: 'var(--text-primary)' };

    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
        {/* Header Section */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem', width: '100%' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.35rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Shield size={24} style={{ color: '#FBBF24' }} />
              แผงควบคุมผู้ดูแลระบบ (Admin Panel)
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>อนุมัติผู้สมัครสมาชิกใหม่ กำหนดบทบาท และจัดการสิทธิ์เข้าใช้งานระบบ</p>
          </div>
          <button onClick={fetchAdminUsers} disabled={loadingAdminUsers} className="btn"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', fontSize: '0.88rem', flexShrink: 0 }}>
            <RefreshCw size={15} style={{ animation: loadingAdminUsers ? 'spin 1s linear infinite' : 'none' }} />
            รีเฟรชข้อมูล
          </button>
        </div>

        {/* Dashboard Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'ผู้ใช้ในระบบทั้งหมด', value: adminUsers.length, color: '#93C5FD', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', icon: <User size={20} /> },
            { label: 'บัญชีรออนุมัติ',  value: pending.length,    color: '#FBBF24', bg: pending.length > 0 ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.05)', border: pending.length > 0 ? 'rgba(245,158,11,0.4)' : 'rgba(245,158,11,0.15)', icon: <Clock size={20} /> },
            { label: 'บัญชีที่อนุมัติแล้ว',    value: approved.length,   color: '#34D399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', icon: <CheckCircle size={20} /> },
          ].map(card => (
            <div key={card.label} className="glass" style={{ borderRadius: '12px', padding: '1.1rem 1.25rem', border: `1px solid ${card.border}`, background: card.bg, display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ color: card.color, background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: '10px' }}>{card.icon}</div>
              <div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem', fontWeight: 600 }}>{card.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Roles Distribution Bar */}
        <div className="glass" style={{ borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem', border: '1px solid var(--surface-border)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>สัดส่วนบทบาทของสมาชิกในระบบ</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {ROLES.map(r => {
              const count = roleCounts[r] || 0;
              const s = ROLE_STYLE[r];
              return (
                <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', background: count > 0 ? s.bg : 'rgba(255,255,255,0.02)', border: `1px solid ${count > 0 ? s.border : 'var(--surface-border)'}`, borderRadius: '999px', padding: '0.25rem 0.75rem', opacity: count > 0 ? 1 : 0.45, transition: 'all 0.2s' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: count > 0 ? s.color : 'var(--text-secondary)' }}>{r}</span>
                  <span style={{ background: count > 0 ? s.color : 'var(--text-secondary)', color: '#000', borderRadius: '999px', minWidth: '18px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 900, padding: '0.05rem 0.3rem', display: 'inline-block' }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error and Alert Messages */}
        {adminError && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem', color: '#F87171', fontSize: '0.88rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>โหลดข้อมูลไม่สำเร็จ:</strong> {adminError}
              <br /><span style={{ fontSize: '0.78rem', opacity: 0.8 }}>กรุณาลองกดปุ่มรีเฟรชข้อมูลใหม่อีกครั้ง หรือตรวจสอบสิทธิ์บัญชีผู้ใช้ของคุณ</span>
            </div>
          </div>
        )}

        {adminMessage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: adminMessage.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${adminMessage.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '10px', padding: '0.85rem 1.1rem', marginBottom: '1.25rem', color: adminMessage.type === 'success' ? '#34D399' : '#F87171', fontSize: '0.88rem', fontWeight: 600 }}>
            {adminMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {adminMessage.text}
          </div>
        )}

        {loadingAdminUsers ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 1rem' }} />
            <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 500 }}>กำลังโหลดรายชื่อผู้ใช้งานระบบ...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* 1. Pending Approvals Section */}
            <div className="glass" style={{ borderRadius: '12px', border: '1px solid rgba(245,158,11,0.25)', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(245,158,11,0.04)', borderBottom: '1px solid rgba(245,158,11,0.12)' }}>
                <Clock size={18} style={{ color: '#FBBF24' }} />
                <span style={{ fontWeight: 800, color: '#FBBF24', fontSize: '0.98rem' }}>ผู้สมัครใหม่รอการอนุมัติเข้าระบบ</span>
                {pending.length > 0 && (
                  <span style={{ background: '#FBBF24', color: '#000', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 900, padding: '0.1rem 0.55rem' }}>
                    {pending.length} รายการ
                  </span>
                )}
              </div>
              
              {pending.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-secondary)' }}>
                  <CheckCircle size={32} style={{ color: 'var(--success)', opacity: 0.6, display: 'block', margin: '0 auto 0.75rem' }} />
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>ไม่มีบัญชีผู้ใช้ใหม่ที่รอการอนุมัติในขณะนี้</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, width: '45px', textAlign: 'center' }}>ลำดับ</th>
                        <th style={thStyle}>ชื่อ-นามสกุล</th>
                        <th style={thStyle}>ชื่อผู้ใช้ (Username)</th>
                        <th style={thStyle}>วันที่ลงทะเบียน</th>
                        <th style={{ ...thStyle, width: '180px' }}>กำหนดบทบาททำงาน</th>
                        <th style={{ ...thStyle, textAlign: 'center', width: '220px' }}>การดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pending.map((u, idx) => {
                        // Pre-select 'Developer' if no role selection exists yet
                        const selectedRole = adminRoleSelections[u.id] || 'Developer';
                        return (
                          <tr key={u.id}
                            style={{ transition: 'background-color 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,158,11,0.03)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>{idx + 1}</td>
                            <td style={tdStyle}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Avatar name={u.name} role="Pending" />
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</span>
                                  {u.jira_display_name && (
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.1rem' }}>
                                      🔗 Jira: {u.jira_display_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontFamily: 'monospace', fontWeight: 600 }}>@{u.username}</td>
                            <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                              {new Date(u.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} น.
                            </td>
                            <td style={tdStyle}>
                              <select
                                value={selectedRole}
                                onChange={e => setAdminRoleSelections(prev => ({ ...prev, [u.id]: e.target.value }))}
                                style={{ background: 'var(--bg-color)', border: '1px solid var(--surface-border)', borderRadius: '8px', padding: '0.45rem 0.75rem', color: 'var(--text-primary)', fontSize: '0.86rem', cursor: 'pointer', outline: 'none', width: '100%', fontWeight: 600 }}
                              >
                                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                <button onClick={() => handleAdminAction(u.id, 'approve', selectedRole)} disabled={adminActionLoading[u.id]}
                                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#10B981', border: '1px solid #10B981', color: '#ffffff', borderRadius: '8px', padding: '0.45rem 0.9rem', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 700, transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(16,185,129,0.15)' }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#059669'}
                                  onMouseLeave={e => e.currentTarget.style.background = '#10B981'}
                                >
                                  {adminActionLoading[u.id] ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={13} />}
                                  อนุมัติบัญชี
                                </button>
                                <button onClick={() => { if (confirm(`ลบบัญชีผู้สมัคร "${u.name}" หรือไม่?`)) handleAdminAction(u.id, 'reject', null); }} disabled={adminActionLoading[u.id]}
                                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', color: '#EF4444', borderRadius: '8px', padding: '0.45rem 0.9rem', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 700, transition: 'all 0.2s' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                  <X size={13} />
                                  ปฏิเสธ
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 2. Approved Members Section */}
            <div className="glass" style={{ borderRadius: '12px', border: '1px solid rgba(16,185,129,0.25)', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(16,185,129,0.03)', borderBottom: '1px solid rgba(16,185,129,0.1)' }}>
                <CheckCircle size={18} style={{ color: '#34D399' }} />
                <span style={{ fontWeight: 800, color: '#34D399', fontSize: '0.98rem' }}>สมาชิกที่มีสิทธิ์เข้าใช้งานในระบบแล้ว</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', fontWeight: 600 }}>({approved.length} บัญชี)</span>
              </div>
              
              {approved.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-secondary)' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>ยังไม่มีบัญชีผู้ใช้งานที่ได้รับการอนุมัติในระบบ</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, width: '45px', textAlign: 'center' }}>ลำดับ</th>
                        <th style={thStyle}>ชื่อ-นามสกุล</th>
                        <th style={thStyle}>ชื่อผู้ใช้ (Username)</th>
                        <th style={thStyle}>บทบาทปัจจุบัน</th>
                        <th style={thStyle}>วันที่ลงทะเบียน</th>
                        <th style={{ ...thStyle, width: '170px' }}>ปรับเปลี่ยนบทบาท</th>
                        <th style={{ ...thStyle, textAlign: 'center', width: '220px' }}>การดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approved.map((u, idx) => {
                        const currentRole = adminRoleSelections[u.id] || u.role;
                        const rs = ROLE_STYLE[currentRole];
                        const changed = currentRole !== u.role;
                        return (
                          <tr key={u.id}
                            style={{ transition: 'background-color 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.015)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>{idx + 1}</td>
                            <td style={tdStyle}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Avatar name={u.name} role={u.role} />
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</span>
                                  {u.jira_display_name && (
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.1rem' }}>
                                      🔗 Jira: {u.jira_display_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontFamily: 'monospace', fontWeight: 600 }}>@{u.username}</td>
                            <td style={tdStyle}><RoleBadge role={u.role} /></td>
                            <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                              {new Date(u.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} น.
                            </td>
                            <td style={tdStyle}>
                              <select
                                value={currentRole}
                                onChange={e => setAdminRoleSelections(prev => ({ ...prev, [u.id]: e.target.value }))}
                                style={{ background: rs ? rs.bg : 'var(--bg-color)', border: `1px solid ${rs ? rs.border : 'var(--surface-border)'}`, borderRadius: '8px', padding: '0.45rem 0.65rem', color: rs ? rs.color : 'var(--text-primary)', fontSize: '0.86rem', cursor: 'pointer', outline: 'none', fontWeight: 700, width: '100%' }}
                              >
                                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                <button onClick={() => handleAdminAction(u.id, 'update_role', currentRole)} disabled={adminActionLoading[u.id] || !changed}
                                  title={changed ? 'บันทึกบทบาทใหม่' : 'ไม่มีการเปลี่ยนแปลง'}
                                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: changed ? '#3B82F6' : 'rgba(255,255,255,0.03)', border: `1px solid ${changed ? '#3B82F6' : 'var(--surface-border)'}`, color: changed ? '#ffffff' : 'var(--text-secondary)', borderRadius: '8px', padding: '0.45rem 0.9rem', fontSize: '0.82rem', cursor: changed ? 'pointer' : 'not-allowed', fontWeight: 700, transition: 'all 0.2s', boxShadow: changed ? '0 2px 4px rgba(59,130,246,0.15)' : 'none' }}
                                  onMouseEnter={e => { if (changed) e.currentTarget.style.background = '#2563EB'; }}
                                  onMouseLeave={e => { if (changed) e.currentTarget.style.background = '#3B82F6'; }}
                                >
                                  {adminActionLoading[u.id] ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Edit2 size={13} />}
                                  บันทึกใหม่
                                </button>
                                <button onClick={() => { if (confirm(`ถอนสิทธิ์การใช้งานของ "${u.name}" ใช่หรือไม่?`)) handleAdminAction(u.id, 'revoke', null); }} disabled={adminActionLoading[u.id]}
                                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', color: '#EF4444', borderRadius: '8px', padding: '0.45rem 0.9rem', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 700, transition: 'all 0.2s' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                  <X size={13} />
                                  ถอนสิทธิ์
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (selectedTicketForDetail && modalContentRef.current) {
      modalContentRef.current.scrollTop = 0;
    }
  }, [selectedTicketForDetail, isEditingTicket]);

  useEffect(() => {
    if (showSuccessNotification) {
      const timer = setTimeout(() => {
        setShowSuccessNotification(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [showSuccessNotification]);

  useEffect(() => {
    if (effectiveRole === 'CEO') {
      setPmTab('ceo');
    } else if (effectiveRole === 'Admin') {
      setPmTab('admin');
    } else {
      setPmTab('overview');
    }
  }, [effectiveRole]);


  // Calculate Days Left until due date (High-Contrast Monochrome Styled Badges)
  const getDaysLeftElement = (ticket) => {
    if (!ticket) return null;
    const dueDateStr = ticket.duedate;
    const status = ticket.status ? ticket.status.toLowerCase() : '';
    const isDone = status.includes('done');

    if (isDone) {
      if (!dueDateStr) {
        return (
          <span style={{ 
            background: 'var(--days-normal-bg)', 
            color: 'var(--days-normal-color)', 
            border: '1px solid var(--days-normal-border)',
            fontSize: '0.85rem',
            padding: '3px 7px',
            borderRadius: '4px',
            display: 'inline-block'
          }}>
            เสร็จสิ้นแล้ว
          </span>
        );
      }
      
      const due = new Date(dueDateStr);
      due.setHours(0,0,0,0);
      
      const resolvedDate = ticket.resolved ? new Date(ticket.resolved) : new Date();
      resolvedDate.setHours(0,0,0,0);
      
      if (resolvedDate <= due) {
        const diffTime = due.getTime() - resolvedDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        const labelText = diffDays > 0 ? `เสร็จก่อนกำหนด ${diffDays} วัน` : 'เสร็จตรงกำหนด';
        return (
          <span style={{ 
            background: 'var(--days-normal-bg)', 
            color: 'var(--days-normal-color)', 
            border: '1px solid var(--days-normal-border)',
            fontWeight: '600',
            fontSize: '0.85rem',
            padding: '3px 7px',
            borderRadius: '4px',
            display: 'inline-block'
          }}>
            {labelText}
          </span>
        );
      } else {
        const diffTime = resolvedDate.getTime() - due.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        const labelText = diffDays > 0 ? `เสร็จช้ากว่ากำหนด ${diffDays} วัน` : 'เสร็จช้ากว่ากำหนด';
        return (
          <span style={{ 
            background: 'var(--days-overdue-bg)', 
            color: 'var(--days-overdue-color)', 
            border: '1px solid var(--days-overdue-border)',
            fontWeight: '600',
            fontSize: '0.85rem',
            padding: '3px 7px',
            borderRadius: '4px',
            display: 'inline-block'
          }}>
            {labelText}
          </span>
        );
      }
    }

    if (!dueDateStr) {
      return (
        <span style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '0.85rem',
          padding: '2px 6px',
          borderRadius: '4px',
          border: '1px solid var(--surface-border)',
          background: 'var(--surface-hover-bg)'
        }}>
          ไม่ได้ระบุวันส่ง
        </span>
      );
    }
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(dueDateStr);
    due.setHours(0,0,0,0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return (
        <span style={{ 
          background: 'var(--days-overdue-bg)', 
          color: 'var(--days-overdue-color)', 
          border: '1px solid var(--days-overdue-border)',
          fontWeight: 'bold', 
          fontSize: '0.85rem',
          padding: '3px 7px',
          borderRadius: '4px',
          display: 'inline-block'
        }}>
          เกินกำหนด {Math.abs(diffDays)} วัน
        </span>
      );
    } else if (diffDays === 0) {
      return (
        <span style={{ 
          background: 'var(--days-today-bg)', 
          color: 'var(--days-today-color)', 
          border: '1px solid var(--days-today-border)',
          fontWeight: 'bold', 
          fontSize: '0.85rem',
          padding: '3px 7px',
          borderRadius: '4px',
          display: 'inline-block'
        }}>
          ครบกำหนดวันนี้
        </span>
      );
    } else if (diffDays <= 3) {
      return (
        <span style={{ 
          background: 'var(--days-urgent-bg)', 
          color: 'var(--days-urgent-color)', 
          border: '1px solid var(--days-urgent-border)',
          fontWeight: '600', 
          fontSize: '0.85rem',
          padding: '3px 7px',
          borderRadius: '4px',
          display: 'inline-block'
        }}>
          อีก {diffDays} วัน (ด่วน)
        </span>
      );
    } else {
      return (
        <span style={{ 
          background: 'var(--days-normal-bg)', 
          color: 'var(--days-normal-color)', 
          border: '1px solid var(--days-normal-border)',
          fontSize: '0.85rem',
          padding: '3px 7px',
          borderRadius: '4px',
          display: 'inline-block'
        }}>
          อีก {diffDays} วัน
        </span>
      );
    }
  };

  // Render priority as a monochrome high-contrast badge or secondary text
  const getPriorityElement = (priorityName) => {
    if (!priorityName) return null;
    const lower = priorityName.toLowerCase();
    const isHigh = lower === 'high' || lower === 'highest';
    const isLow = lower === 'low' || lower === 'lowest';
    
    if (isHigh) {
      return (
        <span style={{
          fontSize: '0.8rem',
          padding: '2px 6px',
          borderRadius: '4px',
          border: '1px solid var(--text-primary)',
          color: 'var(--text-primary)',
          fontWeight: '700',
          display: 'inline-block'
        }}>
          {priorityName}
        </span>
      );
    } else if (isLow) {
      return (
        <span style={{
          fontSize: '0.9rem',
          color: 'var(--text-secondary)',
          opacity: 0.55
        }}>
          {priorityName}
        </span>
      );
    } else {
      return (
        <span style={{
          fontSize: '0.9rem',
          color: 'var(--text-primary)'
        }}>
          {priorityName}
        </span>
      );
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return null;
    try {
      const date = new Date(isoString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear() + 543; // Buddhist Era
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} เวลา ${hours}:${minutes} น.`;
    } catch (e) {
      return null;
    }
  };

  const formatDateBE = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear() + 543; // Buddhist Era
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateString;
    }
  };


  // ---------------------------------
  // Role-Based Filtering & Layouts
  // ---------------------------------
  let filteredTickets = [...tickets];

  if (effectiveRole === 'Developer' || effectiveRole === 'IT_Sub') {
    // Developers and IT Sub only focus on Tasks/Subtasks/Bugs/Stories (exclude Epic)
    filteredTickets = tickets.filter(t => t.issuetype !== 'Epic');
  } else if (effectiveRole === 'Sales' || effectiveRole === 'Deployment') {
    // Sales and Deployment focus on high-level deliverables & major tasks (Epic and Tasks)
    filteredTickets = tickets.filter(t => t.issuetype === 'Epic' || t.issuetype === 'Task');
  }

  // Apply timeframe/archive filter (Timeframe Scope Filter)
  if (timeFilter === 'today') {
    const isToday = (dateStr) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      const today = new Date();
      return d.getDate() === today.getDate() &&
             d.getMonth() === today.getMonth() &&
             d.getFullYear() === today.getFullYear();
    };
    filteredTickets = filteredTickets.filter(t => {
      return isToday(t.created) || 
             (t.resolved && isToday(t.resolved)) || 
             (t.duedate && isToday(t.duedate));
    });
  } else if (timeFilter === 'this-week') {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0: Sun, 1: Mon, ..., 6: Sat
    const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfThisWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - distanceToMonday);
    startOfThisWeek.setHours(0, 0, 0, 0);
    
    filteredTickets = filteredTickets.filter(t => {
      const createdDate = new Date(t.created);
      const resolvedDate = t.resolved ? new Date(t.resolved) : null;
      const duedateDate = t.duedate ? new Date(t.duedate) : null;
      return createdDate >= startOfThisWeek || 
             (resolvedDate && resolvedDate >= startOfThisWeek) || 
             (duedateDate && duedateDate >= startOfThisWeek);
    });
  } else if (timeFilter === 'this-month') {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    filteredTickets = filteredTickets.filter(t => {
      const createdDate = new Date(t.created);
      const resolvedDate = t.resolved ? new Date(t.resolved) : null;
      return createdDate >= startOfMonth || (resolvedDate && resolvedDate >= startOfMonth);
    });
  } else if (timeFilter === 'this-quarter') {
    const currentQuarterMonth = Math.floor(new Date().getMonth() / 3) * 3;
    const startOfQuarter = new Date(new Date().getFullYear(), currentQuarterMonth, 1);
    filteredTickets = filteredTickets.filter(t => {
      const createdDate = new Date(t.created);
      const resolvedDate = t.resolved ? new Date(t.resolved) : null;
      return createdDate >= startOfQuarter || (resolvedDate && resolvedDate >= startOfQuarter);
    });
  }

  const isAssignedToMe = (ticket) => {
    if (!ticket.assignee) return false;
    const assigneeLower = ticket.assignee.toLowerCase();

    // 0. Prioritize directly linked Jira Display Name from the logged-in user session
    if (user && user.jiraDisplayName) {
      const jiraLower = user.jiraDisplayName.toLowerCase();
      if (assigneeLower === jiraLower || assigneeLower.includes(jiraLower)) return true;
    }

    const cleanUserName = user.name.replace(/\s*\(.*\)/, '').trim();
    const cleanUserLower = cleanUserName.toLowerCase();
    const usernameLower = user.username.toLowerCase();

    // 1. Try matching with Team Members list (by Nickname, Name, or Username)
    const member = teamMembers.find(m => {
      const nick = m.nickname.toLowerCase();
      const jira = m.jiraDisplayName?.toLowerCase() || '';
      return (
        nick === cleanUserLower ||
        cleanUserLower.includes(nick) ||
        nick === usernameLower ||
        jira.includes(cleanUserLower) ||
        cleanUserLower.includes(jira)
      );
    });

    if (member && member.jiraDisplayName) {
      const jiraLower = member.jiraDisplayName.toLowerCase();
      if (assigneeLower === jiraLower || assigneeLower.includes(jiraLower)) return true;
    }

    // 2. Direct string checking
    if (assigneeLower.includes(cleanUserLower)) return true;
    if (assigneeLower.includes(usernameLower)) return true;

    // 3. Fallbacks for test names (like Somchai, Somsak, PM, Dev)
    if (cleanUserLower.includes('สมชาย') || usernameLower.includes('somchai')) {
      return assigneeLower.includes('somchai') || assigneeLower.includes('dev');
    }
    if (cleanUserLower.includes('สมศักดิ์') || usernameLower.includes('somsak')) {
      return assigneeLower.includes('somsak') || assigneeLower.includes('sub');
    }
    if (cleanUserLower.includes('สมหญิง') || usernameLower.includes('somying')) {
      return assigneeLower.includes('somying') || assigneeLower.includes('manager') || assigneeLower.includes('pm');
    }
    if (cleanUserLower.includes('วันดี') || usernameLower.includes('wandee')) {
      return assigneeLower.includes('wandee') || assigneeLower.includes('sales');
    }
    if (cleanUserLower.includes('เก่งกล้า') || usernameLower.includes('kengkla')) {
      return assigneeLower.includes('kengkla') || assigneeLower.includes('deployment');
    }
    if (cleanUserLower.includes('วิชัย') || usernameLower.includes('wichai')) {
      return assigneeLower.includes('wichai') || assigneeLower.includes('ceo');
    }
    
    return false;
  };

  // Apply search query, status, and priority filters
  const displayTickets = filteredTickets.filter(t => {
    const matchesSearch = t.summary.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.assignee.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = false;
    if (filterStatus === 'all') matchesStatus = !t.status.toLowerCase().includes('done');
    else if (filterStatus === 'todo') matchesStatus = (t.status.toLowerCase().includes('to do') || (!t.status.toLowerCase().includes('done') && !t.status.toLowerCase().includes('progress') && !t.status.toLowerCase().includes('review')));
    else if (filterStatus === 'progress') matchesStatus = t.status.toLowerCase().includes('progress');
    else if (filterStatus === 'review') matchesStatus = t.status.toLowerCase().includes('review');
    else if (filterStatus === 'done') matchesStatus = t.status.toLowerCase().includes('done');
    else matchesStatus = true;

    if (!matchesSearch || !matchesStatus) return false;

    if (showMyTasksOnly && !isAssignedToMe(t)) return false;

    if (filterPriority === 'high') {
      return t.priority && (t.priority.toLowerCase() === 'high' || t.priority.toLowerCase() === 'highest');
    }
    if (filterPriority === 'medium') {
      return t.priority && t.priority.toLowerCase() === 'medium';
    }
    if (filterPriority === 'low') {
      return t.priority && (t.priority.toLowerCase() === 'low' || t.priority.toLowerCase() === 'lowest');
    }
    return true;
  });

  // Sort by Priority/Urgency (Highest = 5 to Lowest = 1)
  const priorityWeights = {
    'highest': 5,
    'high': 4,
    'medium': 3,
    'low': 2,
    'lowest': 1
  };

  const getPriorityWeight = (priorityName) => {
    if (!priorityName) return 0;
    return priorityWeights[priorityName.toLowerCase()] || 0;
  };

  displayTickets.sort((a, b) => {
    if (sortBy === 'date-asc') {
      if (!a.duedate && !b.duedate) return getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
      if (!a.duedate) return 1;
      if (!b.duedate) return -1;
      const dateA = new Date(a.duedate).getTime();
      const dateB = new Date(b.duedate).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
    } else if (sortBy === 'date-desc') {
      if (!a.duedate && !b.duedate) return getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
      if (!a.duedate) return 1;
      if (!b.duedate) return -1;
      const dateA = new Date(a.duedate).getTime();
      const dateB = new Date(b.duedate).getTime();
      if (dateA !== dateB) return dateB - dateA;
      return getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
    } else {
      return getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
    }
  });

  // Calculate statistics based on current role's filtered scope
  const done = filteredTickets.filter(t => t.status.toLowerCase().includes('done')).length;
  const inProgress = filteredTickets.filter(t => t.status.toLowerCase().includes('progress')).length;
  const inReview = filteredTickets.filter(t => t.status.toLowerCase().includes('review')).length;
  const todo = filteredTickets.filter(t => t.status.toLowerCase().includes('to do') || (!t.status.toLowerCase().includes('done') && !t.status.toLowerCase().includes('progress') && !t.status.toLowerCase().includes('review'))).length;
  
  const chartData = [
    { name: 'Done', value: done },
    { name: 'In Progress', value: inProgress },
    { name: 'In Review', value: inReview },
    { name: 'To Do', value: todo }
  ];

  // Epic Breakdown
  const epicTickets = filteredTickets.filter(t => t.issuetype === 'Epic');
  const epicDone = epicTickets.filter(t => t.status.toLowerCase().includes('done')).length;
  const epicInProgress = epicTickets.filter(t => t.status.toLowerCase().includes('progress')).length;
  const epicInReview = epicTickets.filter(t => t.status.toLowerCase().includes('review')).length;
  const epicTodo = epicTickets.filter(t => t.status.toLowerCase().includes('to do') || (!t.status.toLowerCase().includes('done') && !t.status.toLowerCase().includes('progress') && !t.status.toLowerCase().includes('review'))).length;

  const epicChartData = [
    { name: 'Done', value: epicDone },
    { name: 'In Progress', value: epicInProgress },
    { name: 'In Review', value: epicInReview },
    { name: 'To Do', value: epicTodo }
  ];

  // Task / Story / Bug Breakdown (non-Epic)
  const taskTickets = filteredTickets.filter(t => t.issuetype !== 'Epic');
  const taskDone = taskTickets.filter(t => t.status.toLowerCase().includes('done')).length;
  const taskInProgress = taskTickets.filter(t => t.status.toLowerCase().includes('progress')).length;
  const taskInReview = taskTickets.filter(t => t.status.toLowerCase().includes('review')).length;
  const taskTodo = taskTickets.filter(t => t.status.toLowerCase().includes('to do') || (!t.status.toLowerCase().includes('done') && !t.status.toLowerCase().includes('progress') && !t.status.toLowerCase().includes('review'))).length;

  const taskChartData = [
    { name: 'Done', value: taskDone },
    { name: 'In Progress', value: taskInProgress },
    { name: 'In Review', value: taskInReview },
    { name: 'To Do', value: taskTodo }
  ];

  const renderSkeleton = () => {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Urgent Alert Skeleton (only if Manager) */}
        {effectiveRole === 'Manager' && (
          <div className="skeleton-box skeleton-shimmer" style={{ height: '180px', padding: '1.75rem' }}>
            <div className="skeleton-pulse" style={{ height: '24px', width: '300px', borderRadius: '6px', marginBottom: '1.25rem' }}></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="skeleton-pulse" style={{ height: '50px', borderRadius: '8px' }}></div>
              <div className="skeleton-pulse" style={{ height: '50px', borderRadius: '8px' }}></div>
            </div>
          </div>
        )}

        {/* Stats Grid Skeleton (4 cards) */}
        <div className="stats-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton-box skeleton-shimmer" style={{ height: '110px', padding: '1.5rem' }}>
              <div className="skeleton-pulse" style={{ height: '20px', width: '100px', borderRadius: '4px', marginBottom: '0.75rem' }}></div>
              <div className="skeleton-pulse" style={{ height: '32px', width: '60px', borderRadius: '6px' }}></div>
            </div>
          ))}
        </div>

        {/* Charts Grid Skeleton (if Manager or CEO - 2 charts) */}
        {(effectiveRole === 'Manager' || effectiveRole === 'CEO') && (
          <div className="charts-grid">
            <div className="skeleton-box skeleton-shimmer" style={{ height: '400px', padding: '1.5rem' }}>
              <div className="skeleton-pulse" style={{ height: '24px', width: '250px', borderRadius: '6px', marginBottom: '1.5rem' }}></div>
              <div className="skeleton-pulse" style={{ height: '250px', borderRadius: '10px' }}></div>
            </div>
            <div className="skeleton-box skeleton-shimmer" style={{ height: '400px', padding: '1.5rem' }}>
              <div className="skeleton-pulse" style={{ height: '24px', width: '250px', borderRadius: '6px', marginBottom: '1.5rem' }}></div>
              <div className="skeleton-pulse" style={{ height: '250px', borderRadius: '10px' }}></div>
            </div>
          </div>
        )}

        {/* Table/List View Skeleton */}
        <div className="skeleton-box skeleton-shimmer" style={{ padding: '1.5rem', minHeight: '350px' }}>
          {/* Mock Search & Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div className="skeleton-pulse" style={{ height: '42px', width: '300px', borderRadius: '999px' }}></div>
            <div className="skeleton-pulse" style={{ height: '42px', width: '200px', borderRadius: '999px' }}></div>
          </div>
          {/* Mock Table Header */}
          <div className="skeleton-pulse" style={{ height: '40px', borderRadius: '8px', marginBottom: '1rem' }}></div>
          {/* Mock Table Rows */}
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="skeleton-pulse" style={{ height: '52px', borderRadius: '8px', marginBottom: '0.75rem', opacity: 1 - i * 0.15 }}></div>
          ))}
        </div>
      </div>
    );
  };

  const getTaskProgress = (task) => {
    return task.status.toLowerCase().includes('done') ? 100 : 0;
  };

  const getEpicProgress = (epic) => {
    if (!epic.childrenTasks || epic.childrenTasks.length === 0) {
      return epic.status.toLowerCase().includes('done') ? 100 : 0;
    }
    const completed = epic.childrenTasks.filter(t => t.status.toLowerCase().includes('done')).length;
    return Math.round((completed / epic.childrenTasks.length) * 100);
  };

  const getProjectProgress = (project) => {
    const allTasks = [];
    project.childrenEpics.forEach(epic => {
      allTasks.push(...epic.childrenTasks);
    });
    allTasks.push(...project.directTasks);

    if (allTasks.length === 0) {
      return project.status.toLowerCase().includes('done') ? 100 : 0;
    }
    const completed = allTasks.filter(t => t.status.toLowerCase().includes('done')).length;
    return Math.round((completed / allTasks.length) * 100);
  };

  const ProgressBar = ({ percent }) => {
    let barColor = currentColors[0];
    if (percent === 0) {
      barColor = 'transparent';
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', width: '140px', flexShrink: 0 }}>
        <div style={{ flex: 1, height: '6px', background: 'var(--surface-border)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${percent}%`, height: '100%', background: barColor, borderRadius: '3px', transition: 'width 0.4s ease' }}></div>
        </div>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', width: '32px', textAlign: 'right' }}>
          {percent}%
        </span>
      </div>
    );
  };

  const buildProjectTree = () => {
    const projects = []; // We treat Epics as Projects
    const tasks = [];

    tickets.forEach(t => {
      const type = t.issuetype ? t.issuetype.toLowerCase() : '';
      if (type === 'epic') {
        projects.push({ ...t, childrenEpics: [], directTasks: [] });
      } else if (type !== 'project') {
        tasks.push(t);
      }
    });

    // Sort projects (Epics) by priority weight descending
    projects.sort((a, b) => getPriorityWeight(b.priority) - getPriorityWeight(a.priority));

    const projectsMap = {};
    projects.forEach(p => {
      projectsMap[p.key] = p;
    });

    const unlinkedEpics = [];
    const unlinkedTasks = [];

    // Link Tasks directly to Projects (Epics)
    tasks.forEach(task => {
      if (task.parent && projectsMap[task.parent]) {
        projectsMap[task.parent].directTasks.push(task);
      } else {
        unlinkedTasks.push(task);
      }
    });

    // Sort direct tasks inside each project by priority weight descending
    projects.forEach(p => {
      p.directTasks.sort((a, b) => getPriorityWeight(b.priority) - getPriorityWeight(a.priority));
    });

    // Sort unlinked epics and tasks by priority weight descending
    unlinkedEpics.sort((a, b) => getPriorityWeight(b.priority) - getPriorityWeight(a.priority));
    unlinkedTasks.sort((a, b) => getPriorityWeight(b.priority) - getPriorityWeight(a.priority));

    return { projects, unlinkedEpics, unlinkedTasks };
  };

  const getOverdueTasks = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return tickets
      .filter(t => {
        if (!t.duedate) return false;
        if (t.status.toLowerCase().includes('done')) return false;
        const due = new Date(t.duedate);
        due.setHours(0,0,0,0);
        return due < today;
      })
      .sort((a, b) => getPriorityWeight(b.priority) - getPriorityWeight(a.priority));
  };

  const getOverdueDays = (dueDateStr) => {
    if (!dueDateStr) return 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(dueDateStr);
    due.setHours(0,0,0,0);
    const diffTime = today.getTime() - due.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDevWorkloads = () => {
    const workloads = {};
    tickets.forEach(t => {
      const dev = t.assignee || 'Unassigned';
      if (!workloads[dev]) {
        workloads[dev] = {
          name: dev,
          todo: 0,
          progress: 0,
          review: 0,
          done: 0,
          tickets: []
        };
      }
      
      if (t.status.toLowerCase().includes('done')) {
        workloads[dev].done += 1;
      } else if (t.status.toLowerCase().includes('progress')) {
        workloads[dev].progress += 1;
      } else if (t.status.toLowerCase().includes('review')) {
        workloads[dev].review += 1;
      } else {
        workloads[dev].todo += 1;
      }
      workloads[dev].tickets.push(t);
    });
    
    // Sort tickets inside each developer workload by priority weight descending
    Object.values(workloads).forEach(w => {
      w.tickets.sort((a, b) => getPriorityWeight(b.priority) - getPriorityWeight(a.priority));
    });

    return Object.values(workloads).sort((a, b) => {
      const activeA = a.todo + a.progress + a.review;
      const activeB = b.todo + b.progress + b.review;
      return activeB - activeA;
    });
  };

  const toggleNode = (key) => {
    setExpandedNodes(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const renderTaskRow = (task, depth = 0) => {
    let statusClass = 'status-todo';
    if (task.status.toLowerCase().includes('progress')) statusClass = 'status-inprogress';
    if (task.status.toLowerCase().includes('review')) statusClass = 'status-inreview';
    if (task.status.toLowerCase().includes('done')) statusClass = 'status-done';

    return (
      <div 
        key={task.id} 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '0.8rem 1.25rem', 
          marginLeft: `${depth * 1.5}rem`,
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          fontSize: '0.95rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0 }}>
          <CheckSquare size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <span 
            onClick={() => setSelectedTicketForDetail(task)}
            style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.9rem', flexShrink: 0, cursor: 'pointer', textDecoration: 'underline' }}
          >
            {task.key}
          </span>
          <span 
            onClick={() => setSelectedTicketForDetail(task)}
            style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }} 
            title={task.summary}
          >
            {task.summary}
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexShrink: 0 }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <User size={14} /> {task.assignee}
          </span>
          {getPriorityElement(task.priority)}
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', minWidth: '90px' }}>
            {task.duedate ? formatDateBE(task.duedate) : 'ไม่มีกำหนดส่ง'}
          </span>
          <span className={`status-badge ${statusClass}`} style={{ minWidth: '95px', textAlign: 'center', display: 'inline-block' }}>
            {task.status}
          </span>
        </div>
      </div>
    );
  };

  const renderEpicRow = (epic, depth = 0) => {
    const isExpanded = !!expandedNodes[epic.key];
    const progress = getEpicProgress(epic);
    let statusClass = 'status-todo';
    if (epic.status.toLowerCase().includes('progress')) statusClass = 'status-inprogress';
    if (epic.status.toLowerCase().includes('review')) statusClass = 'status-inreview';
    if (epic.status.toLowerCase().includes('done')) statusClass = 'status-done';

    return (
      <div key={epic.id} style={{ marginBottom: '0.65rem' }}>
        <div 
          onClick={() => toggleNode(epic.key)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: '0.8rem 1.25rem', 
            marginLeft: `${depth * 1.5}rem`,
            background: 'rgba(16, 185, 129, 0.04)',
            borderLeft: '4px solid var(--epic-color)',
            borderRadius: '8px',
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'background 0.2s'
          }}
          className="tree-row-hover"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: 0 }}>
            {epic.childrenTasks.length > 0 ? (
              isExpanded ? <ChevronDown size={18} style={{ color: 'var(--epic-color)', flexShrink: 0 }} /> : <ChevronRight size={18} style={{ color: 'var(--epic-color)', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 18 }} />
            )}
            <Layers size={16} style={{ color: 'var(--epic-color)', flexShrink: 0 }} />
            <span 
              onClick={(e) => { e.stopPropagation(); setSelectedTicketForDetail(epic); }}
              style={{ color: 'var(--epic-color)', fontWeight: 'bold', fontSize: '0.9rem', flexShrink: 0, cursor: 'pointer', textDecoration: 'underline' }}
            >
              {epic.key}
            </span>
            <span 
              onClick={(e) => { e.stopPropagation(); setSelectedTicketForDetail(epic); }}
              style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }} 
              title={epic.summary}
            >
              {epic.summary}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', flexShrink: 0 }}>
              ({epic.childrenTasks.length} jobs)
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexShrink: 0 }}>
            <ProgressBar percent={progress} />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', minWidth: '110px' }}>
              <User size={14} /> {epic.assignee}
            </span>
            <span className={`status-badge ${statusClass}`} style={{ minWidth: '95px', textAlign: 'center', display: 'inline-block' }}>
              {epic.status}
            </span>
          </div>
        </div>
        
        {isExpanded && epic.childrenTasks.length > 0 && (
          <div style={{ marginTop: '0.35rem', borderLeft: '1px dashed rgba(255,255,255,0.08)', marginLeft: `${depth * 1.5 + 0.6}rem` }}>
            {epic.childrenTasks.map(task => renderTaskRow(task, 0.5))}
          </div>
        )}
      </div>
    );
  };

  const renderProjectRow = (project) => {
    const isExpanded = !!expandedNodes[project.key];
    const progress = getProjectProgress(project);
    let statusClass = 'status-todo';
    if (project.status.toLowerCase().includes('progress')) statusClass = 'status-inprogress';
    if (project.status.toLowerCase().includes('review')) statusClass = 'status-inreview';
    if (project.status.toLowerCase().includes('done')) statusClass = 'status-done';

    return (
      <div key={project.id} className="glass" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
        <div 
          onClick={() => toggleNode(project.key)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none',
            paddingBottom: isExpanded ? '0.9rem' : '0',
            borderBottom: isExpanded ? '1px solid var(--surface-border)' : 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: 0 }}>
            {isExpanded ? <ChevronDown size={22} style={{ color: 'var(--project-color)', flexShrink: 0 }} /> : <ChevronRight size={22} style={{ color: 'var(--project-color)', flexShrink: 0 }} />}
            <Folder size={18} style={{ color: 'var(--project-color)', flexShrink: 0 }} />
            <span 
              onClick={(e) => { e.stopPropagation(); setSelectedTicketForDetail(project); }}
              style={{ color: 'var(--project-color)', fontWeight: 'bold', fontSize: '1rem', flexShrink: 0, cursor: 'pointer', textDecoration: 'underline' }}
            >
              {project.key}
            </span>
            <span 
              onClick={(e) => { e.stopPropagation(); setSelectedTicketForDetail(project); }}
              style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '1.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }} 
              title={project.summary}
            >
              {project.summary}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', flexShrink: 0 }}>
              ({project.childrenEpics.length} epics, {project.directTasks.length} tasks)
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexShrink: 0 }}>
            <ProgressBar percent={progress} />
            <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', minWidth: '110px' }}>
              <User size={14} /> {project.assignee}
            </span>
            <span className={`status-badge ${statusClass}`} style={{ minWidth: '95px', textAlign: 'center', display: 'inline-block' }}>
              {project.status}
            </span>
          </div>
        </div>

        {isExpanded && (
          <div style={{ marginTop: '0.9rem', paddingLeft: '0.6rem' }}>
            {project.childrenEpics.length === 0 && project.directTasks.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontStyle: 'italic', padding: '0.65rem 1.25rem' }}>
                ไม่มีงานย่อยในโครงการนี้
              </p>
            )}
            {project.childrenEpics.map(epic => renderEpicRow(epic, 0.5))}
            {project.directTasks.map(task => renderTaskRow(task, 0.5))}
          </div>
        )}
      </div>
    );
  };

  const renderProjectTree = () => {
    const { projects, unlinkedEpics, unlinkedTasks } = buildProjectTree();
    const anyCollapsed = projects.some(p => !expandedNodes[p.key]);

    const handleExpandAll = () => {
      const newExpanded = {};
      if (anyCollapsed) {
        projects.forEach(p => {
          newExpanded[p.key] = true;
          p.childrenEpics.forEach(e => {
            newExpanded[e.key] = true;
          });
        });
        newExpanded['unlinked-group'] = true;
      }
      setExpandedNodes(newExpanded);
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} className="animate-fade-in">
        <div className="glass" style={{ padding: '1.5rem 1.75rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.4rem' }}>โครงสร้างโครงการและอัตราความสำเร็จ (Project Tree)</h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              มุมมองความสัมพันธ์ระดับ Project ➡️ Epic ➡️ Task พร้อมการประเมินเปอร์เซ็นต์งานที่แล้วเสร็จ
            </p>
          </div>
          <button 
            className="btn" 
            onClick={handleExpandAll}
            style={{ width: 'auto', padding: '0.8rem 1.5rem', fontSize: '0.95rem', margin: 0 }}
          >
            {anyCollapsed ? 'กางออกทั้งหมด' : 'พับเก็บทั้งหมด'}
          </button>
        </div>

        {projects.length === 0 && unlinkedEpics.length === 0 && unlinkedTasks.length === 0 && (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }} className="glass">
            ไม่พบโครงสร้างงานในระบบในขณะนี้
          </p>
        )}

        {projects.map(project => renderProjectRow(project))}

        {(unlinkedEpics.length > 0 || unlinkedTasks.length > 0) && (
          <div className="glass" style={{ padding: '1.25rem 1.5rem', border: '1px dashed rgba(255,255,255,0.15)' }}>
            <div 
              onClick={() => toggleNode('unlinked-group')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', userSelect: 'none', paddingBottom: expandedNodes['unlinked-group'] ? '1rem' : '0' }}
            >
              {expandedNodes['unlinked-group'] ? <ChevronDown size={22} style={{ color: 'var(--text-secondary)' }} /> : <ChevronRight size={22} style={{ color: 'var(--text-secondary)' }} />}
              <AlertCircle size={20} style={{ color: 'var(--warning)' }} />
              <span style={{ fontWeight: 'bold', color: 'var(--warning)', fontSize: '1.1rem' }}>งานที่ไม่ได้ผูกกับโครงการแม่ (Standalone Issues)</span>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                ({unlinkedEpics.length} epics, {unlinkedTasks.length} tasks)
              </span>
            </div>

            {expandedNodes['unlinked-group'] && (
              <div style={{ marginTop: '1rem', paddingLeft: '0.6rem' }}>
                {unlinkedEpics.map(epic => renderEpicRow(epic, 0.5))}
                {unlinkedTasks.map(task => renderTaskRow(task, 0.5))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderDevWorkload = () => {
    const overdueTasks = getOverdueTasks();
    const workloads = getDevWorkloads();

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
        
        {overdueTasks.length > 0 && (
          <div className="glass" style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-hover-bg)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
              <AlertTriangle size={24} style={{ color: 'var(--text-primary)' }} />
              <h3 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                งานเกินกำหนดส่งเร่งด่วน! (แจ้งเตือนงานล่าช้า)
              </h3>
              <span className="badge" style={{ background: 'var(--text-primary)', color: 'var(--bg-color)', fontSize: '0.85rem', padding: '4px 10px' }}>
                {overdueTasks.length} งาน
              </span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
              {overdueTasks.map(task => {
                const daysOverdue = getOverdueDays(task.duedate);
                return (
                  <div 
                    key={task.id} 
                    onClick={() => setSelectedTicketForDetail(task)}
                    className="glass" 
                    style={{ 
                      padding: '1.25rem', 
                      background: 'var(--surface)', 
                      borderLeft: '4px solid var(--text-primary)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '0.65rem',
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>{task.key}</span>
                        <span style={{ fontSize: '0.75rem', background: 'var(--surface-hover-bg)', padding: '3px 8px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                          {task.issuetype}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '0.4rem', lineHeight: '1.4' }}>{task.summary}</h4>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', borderTop: '1px solid var(--surface-border-subtle)', paddingTop: '0.65rem', marginTop: '0.4rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>ผู้รับผิดชอบ: <strong style={{ color: 'var(--text-primary)' }}>{task.assignee}</strong></span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>
                        [เกินกำหนด {daysOverdue} วัน]
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}



        <div>
          <h3 style={{ fontSize: '1.35rem', marginBottom: '1.25rem' }}>สรุปภาระงานและการกระจายตั๋วงานของทีมพัฒนา</h3>
          
          {workloads.length === 0 && (
            <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }} className="glass">
              ไม่มีข้อมูลภาระงานในระบบในขณะนี้
            </p>
          )}
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
            {workloads.map(dev => {
              const activeCount = dev.todo + dev.progress + dev.review;
              const totalCount = dev.todo + dev.progress + dev.review + dev.done;
              const isExpanded = !!expandedNodes[`dev-${dev.name}`];
              
              let loadLabel = 'ภาระงานปกติ';
              let loadBadgeColor = 'var(--surface-hover-bg)';
              let loadTextColor = 'var(--text-secondary)';
              if (activeCount > 5) {
                loadLabel = 'ภาระงานสูง (High Load)';
                loadBadgeColor = 'var(--surface-border-hover)';
                loadTextColor = 'var(--text-primary)';
              } else if (activeCount >= 3) {
                loadLabel = 'ภาระงานปานกลาง';
                loadBadgeColor = 'var(--surface-hover-bg)';
                loadTextColor = 'var(--text-primary)';
              }

              const todoPercent = totalCount > 0 ? (dev.todo / totalCount) * 100 : 0;
              const progressPercent = totalCount > 0 ? (dev.progress / totalCount) * 100 : 0;
              const reviewPercent = totalCount > 0 ? (dev.review / totalCount) * 100 : 0;
              const donePercent = totalCount > 0 ? (dev.done / totalCount) * 100 : 0;

              return (
                <div key={dev.name} className="glass" style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.25rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <User size={20} style={{ color: 'var(--primary)' }} />
                          {dev.name}
                        </h4>
                        <span className="badge" style={{ background: loadBadgeColor, color: loadTextColor, fontSize: '0.8rem', padding: '2px 8px', marginTop: '0.4rem', display: 'inline-block' }}>
                          {loadLabel}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{activeCount}</span>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}> / ทั้งหมด {totalCount} งาน</span>
                      </div>
                    </div>

                    <div style={{ height: '8px', background: 'var(--surface-border)', borderRadius: '4px', overflow: 'hidden', display: 'flex', marginTop: '1.25rem', marginBottom: '0.4rem' }}>
                      <div style={{ width: `${donePercent}%`, background: currentColors[0] }} title={`เสร็จสิ้น: ${dev.done}`}></div>
                      <div style={{ width: `${reviewPercent}%`, background: currentColors[2] }} title={`รอตรวจ: ${dev.review}`}></div>
                      <div style={{ width: `${progressPercent}%`, background: currentColors[1] }} title={`กำลังทำ: ${dev.progress}`}></div>
                      <div style={{ width: `${todoPercent}%`, background: currentColors[3] }} title={`รอทำ: ${dev.todo}`}></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', color: 'var(--text-secondary)', padding: '0 2px' }}>
                      <span>เสร็จสิ้น: {dev.done}</span>
                      <span>รอตรวจ: {dev.review}</span>
                      <span>กำลังทำ: {dev.progress}</span>
                      <span>รอทำ: {dev.todo}</span>
                    </div>
                  </div>

                  <div>
                    <button 
                      className="btn" 
                      onClick={() => toggleNode(`dev-${dev.name}`)}
                      style={{ 
                        width: '100%', 
                        padding: '0.7rem 1rem', 
                        margin: 0, 
                        fontSize: '0.925rem', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        gap: '0.35rem',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}
                    >
                      {isExpanded ? (
                        <>ซ่อนตั๋วงานค้าง <ChevronDown size={16} /></>
                      ) : (
                        <>แสดงตั๋วงานค้าง ({activeCount} งาน) <ChevronRight size={16} /></>
                      )}
                    </button>

                    {isExpanded && activeCount > 0 && (
                      <div style={{ marginTop: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '240px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                        {dev.tickets
                          .filter(t => !t.status.toLowerCase().includes('done'))
                          .map(task => {
                            let statusColor = currentColors[3];
                            if (task.status.toLowerCase().includes('review')) statusColor = currentColors[2];
                            if (task.status.toLowerCase().includes('progress')) statusColor = currentColors[1];
                            if (task.status.toLowerCase().includes('done')) statusColor = currentColors[0];
                            
                            return (
                              <div 
                                key={task.id} 
                                onClick={() => setSelectedTicketForDetail(task)}
                                style={{ 
                                  padding: '0.65rem 0.9rem', 
                                  background: 'var(--action-view-bg)', 
                                  border: '1px solid var(--surface-border)',
                                  borderRadius: '8px', 
                                  borderLeft: `3px solid ${statusColor}`,
                                  fontSize: '0.85rem',
                                  cursor: 'pointer'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                  <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{task.key}</span>
                                  <span style={{ fontSize: '0.75rem', color: statusColor }}>{task.status}</span>
                                </div>
                                <div style={{ fontWeight: '500', color: 'var(--text-primary)', marginBottom: '0.4rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={task.summary}>{task.summary}</div>
                                {task.duedate && (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    📅 กำหนดส่ง: {formatDateBE(task.duedate)}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        }
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    );
  };

  const renderSearchAndFilterBar = () => {
    // Calculate priority counts based on current search & status filters
    const getPriorityCounts = () => {
      let baseTickets = filteredTickets.filter(t => {
        const matchesSearch = t.summary.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              t.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              t.assignee.toLowerCase().includes(searchTerm.toLowerCase());
        
        let matchesStatus = false;
        if (filterStatus === 'all') matchesStatus = !t.status.toLowerCase().includes('done');
        else if (filterStatus === 'todo') matchesStatus = (t.status.toLowerCase().includes('to do') || (!t.status.toLowerCase().includes('done') && !t.status.toLowerCase().includes('progress') && !t.status.toLowerCase().includes('review')));
        else if (filterStatus === 'progress') matchesStatus = t.status.toLowerCase().includes('progress');
        else if (filterStatus === 'review') matchesStatus = t.status.toLowerCase().includes('review');
        else if (filterStatus === 'done') matchesStatus = t.status.toLowerCase().includes('done');
        else matchesStatus = true;

        if (showMyTasksOnly && !isAssignedToMe(t)) return false;

        return matchesSearch && matchesStatus;
      });

      const counts = { all: baseTickets.length, high: 0, medium: 0, low: 0 };
      baseTickets.forEach(t => {
        const p = t.priority ? t.priority.toLowerCase() : '';
        if (p === 'high' || p === 'highest') counts.high++;
        else if (p === 'medium') counts.medium++;
        else if (p === 'low' || p === 'lowest') counts.low++;
      });
      return counts;
    };
    const priorityCounts = getPriorityCounts();

    return (
      <div className="glass" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center', width: '100%' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
            <Search size={24} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="ค้นหา Key, ชื่องาน หรือผู้รับผิดชอบ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '0.9rem 1.5rem 0.9rem 3.2rem', 
                background: 'var(--bg-color)', 
                border: '1px solid var(--surface-border)', 
                borderRadius: '10px', 
                color: 'var(--text-primary)',
                fontSize: '1.08rem'
              }}
            />
          </div>
          
          {/* Sorting Dropdown Selection */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap' }}>เรียงตาม:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '0.9rem 1.5rem',
                background: 'var(--bg-color)',
                border: '1px solid var(--surface-border)',
                borderRadius: '10px',
                color: 'var(--text-primary)',
                fontSize: '1.02rem',
                outline: 'none',
                cursor: 'pointer',
                minWidth: '200px'
              }}
            >
              <option value="priority" style={{ background: 'var(--bg-color)', color: 'var(--text-primary)' }}>ความสำคัญ (Priority)</option>
              <option value="date-asc" style={{ background: 'var(--bg-color)', color: 'var(--text-primary)' }}>เร็วสุด (Due Date ↑)</option>
              <option value="date-desc" style={{ background: 'var(--bg-color)', color: 'var(--text-primary)' }}>ช้าสุด (Due Date ↓)</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button 
              className={`btn ${filterStatus === 'all' ? 'btn-primary' : ''}`} 
              onClick={() => setFilterStatus('all')}
              style={{ width: 'auto', padding: '0.95rem 2rem', fontSize: '1.1rem', margin: 0 }}
            >
              ทั้งหมด
            </button>
            <button 
              className={`btn ${filterStatus === 'todo' ? 'btn-primary' : ''}`} 
              onClick={() => setFilterStatus('todo')}
              style={{ width: 'auto', padding: '0.95rem 2rem', fontSize: '1.1rem', margin: 0 }}
            >
              รอทำ
            </button>
            <button 
              className={`btn ${filterStatus === 'progress' ? 'btn-primary' : ''}`} 
              onClick={() => setFilterStatus('progress')}
              style={{ width: 'auto', padding: '0.95rem 2rem', fontSize: '1.1rem', margin: 0 }}
            >
              กำลังทำ
            </button>
            <button 
              className={`btn ${filterStatus === 'review' ? 'btn-primary' : ''}`} 
              onClick={() => setFilterStatus('review')}
              style={{ width: 'auto', padding: '0.95rem 2rem', fontSize: '1.1rem', margin: 0 }}
            >
              รอตรวจ
            </button>
            <button 
              className={`btn ${filterStatus === 'done' ? 'btn-primary' : ''}`} 
              onClick={() => setFilterStatus('done')}
              style={{ width: 'auto', padding: '0.95rem 2rem', fontSize: '1.1rem', margin: 0 }}
            >
              เสร็จแล้ว
            </button>
            <button 
              className="btn" 
              onClick={fetchTickets}
              style={{ width: 'auto', padding: '0.95rem 1.5rem', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw size={22} />
            </button>
          </div>
        </div>

        {/* Priority Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', borderTop: '1px solid var(--surface-border)', paddingTop: '1.1rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowMyTasksOnly(!showMyTasksOnly)}
            style={{
              padding: '0.45rem 1.1rem',
              borderRadius: '999px',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              border: '1px solid',
              transition: 'all 0.2s ease',
              background: showMyTasksOnly ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255, 255, 255, 0.05)',
              color: showMyTasksOnly ? '#A78BFA' : 'var(--text-secondary)',
              borderColor: showMyTasksOnly ? '#8B5CF6' : 'rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              marginRight: '1rem'
            }}
          >
            <User size={14} />
            เฉพาะงานของฉัน
          </button>
          
          <span style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', fontWeight: '600', marginRight: '0.5rem' }}>ระดับความสำคัญ (Priority):</span>
          
          <button
            onClick={() => setFilterPriority('all')}
            style={{
              padding: '0.45rem 1.1rem',
              borderRadius: '999px',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              border: '1px solid',
              transition: 'all 0.2s ease',
              background: filterPriority === 'all' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              color: filterPriority === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderColor: filterPriority === 'all' ? 'var(--text-primary)' : 'transparent',
            }}
          >
            ทั้งหมด ({priorityCounts.all})
          </button>

          <button
            onClick={() => setFilterPriority('high')}
            style={{
              padding: '0.45rem 1.1rem',
              borderRadius: '999px',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              border: '1px solid',
              transition: 'all 0.2s ease',
              background: filterPriority === 'high' ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.05)',
              color: '#F87171',
              borderColor: filterPriority === 'high' ? '#EF4444' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }}></span>
            สูงมาก / สูง ({priorityCounts.high})
          </button>

          <button
            onClick={() => setFilterPriority('medium')}
            style={{
              padding: '0.45rem 1.1rem',
              borderRadius: '999px',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              border: '1px solid',
              transition: 'all 0.2s ease',
              background: filterPriority === 'medium' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.05)',
              color: '#FBBF24',
              borderColor: filterPriority === 'medium' ? '#F59E0B' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }}></span>
            ปานกลาง ({priorityCounts.medium})
          </button>

          <button
            onClick={() => setFilterPriority('low')}
            style={{
              padding: '0.45rem 1.1rem',
              borderRadius: '999px',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              border: '1px solid',
              transition: 'all 0.2s ease',
              background: filterPriority === 'low' ? 'rgba(59, 130, 246, 0.18)' : 'rgba(59, 130, 246, 0.05)',
              color: '#60A5FA',
              borderColor: filterPriority === 'low' ? '#3B82F6' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#3B82F6' }}></span>
            ต่ำ / ต่ำสุด ({priorityCounts.low})
          </button>
        </div>
      </div>
    );
  };

  const getTop5UrgentTickets = () => {
    const unresolved = tickets.filter(t => !t.status.toLowerCase().includes('done') && t.issuetype !== 'Project');
    
    unresolved.sort((a, b) => {
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const dueA = a.duedate ? new Date(a.duedate) : null;
      if (dueA) dueA.setHours(0,0,0,0);
      const dueB = b.duedate ? new Date(b.duedate) : null;
      if (dueB) dueB.setHours(0,0,0,0);
      
      const hasDueA = dueA !== null;
      const hasDueB = dueB !== null;
      
      // 1. Sort by due date (ascending: past/overdue and closer deadlines first)
      if (hasDueA && hasDueB) {
        const diffA = dueA.getTime() - today.getTime();
        const diffB = dueB.getTime() - today.getTime();
        
        if (diffA !== diffB) {
          return diffA - diffB;
        }
      } else if (hasDueA) {
        return -1; // Has due date is more urgent than no due date
      } else if (hasDueB) {
        return 1;
      }
      
      // 2. Tie-breaker or no due date: Sort by Priority weight (Highest first)
      const weightA = getPriorityWeight(a.priority);
      const weightB = getPriorityWeight(b.priority);
      if (weightA !== weightB) {
        return weightB - weightA;
      }
      
      return 0;
    });
    
    return unresolved.slice(0, 5);
  };

  const renderTop5Urgent = () => {
    const top5 = getTop5UrgentTickets();
    if (top5.length === 0) return null;

    // Helper: get urgency info for a task
    const getUrgencyInfo = (task) => {
      if (!task.duedate) return { level: 'none', label: 'ยังไม่ระบุกำหนด', days: null };
      const today = new Date(); today.setHours(0,0,0,0);
      const due = new Date(task.duedate); due.setHours(0,0,0,0);
      const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff < 0) return { level: 'overdue', label: `เกินกำหนด ${Math.abs(diff)} วันแล้ว!`, days: diff };
      if (diff === 0) return { level: 'today', label: 'ครบกำหนดวันนี้!', days: 0 };
      if (diff <= 3) return { level: 'urgent', label: `อีก ${diff} วัน`, days: diff };
      return { level: 'normal', label: `อีก ${diff} วัน`, days: diff };
    };

    const urgencyStyle = {
      overdue: {
        rowBg: 'rgba(239, 68, 68, 0.06)',
        accentBar: '#EF4444',
        chipBg: '#EF4444',
        chipColor: '#FFFFFF',
        icon: '🔴',
      },
      today: {
        rowBg: 'rgba(249, 115, 22, 0.07)',
        accentBar: '#F97316',
        chipBg: '#F97316',
        chipColor: '#FFFFFF',
        icon: '🟠',
      },
      urgent: {
        rowBg: 'rgba(245, 158, 11, 0.06)',
        accentBar: '#F59E0B',
        chipBg: '#F59E0B',
        chipColor: '#FFFFFF',
        icon: '🟡',
      },
      normal: {
        rowBg: 'transparent',
        accentBar: '#10B981',
        chipBg: 'rgba(16, 185, 129, 0.12)',
        chipColor: '#10B981',
        icon: '🟢',
      },
      none: {
        rowBg: 'transparent',
        accentBar: 'var(--surface-border)',
        chipBg: 'var(--surface-hover-bg)',
        chipColor: 'var(--text-secondary)',
        icon: '⚪',
      },
    };

    return (
      <div style={{
        background: 'var(--surface)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '14px',
        overflow: 'hidden',
        marginBottom: '2rem',
        boxShadow: '0 4px 20px rgba(239, 68, 68, 0.08)',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.1rem 1.5rem',
          borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
          background: 'rgba(239, 68, 68, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div className="warning-beacon-dot"></div>
            <AlertTriangle size={18} style={{ color: '#EF4444' }} />
            <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#EF4444' }}>งานด่วน — ใกล้ถึงกำหนดส่ง</span>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
            Top {top5.length} งานที่ต้องให้ความสำคัญ
          </span>
        </div>

        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '28px 1fr 130px 110px 110px',
          gap: '0.75rem',
          padding: '0.55rem 1.5rem',
          borderBottom: '1px solid var(--surface-border-subtle)',
          background: 'var(--surface-hover-bg)',
        }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>#</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>งาน</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📅 กำหนดส่ง</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>⏱ เวลาที่เหลือ</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>สถานะ</span>
        </div>

        {/* Task rows */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {top5.map((task, idx) => {
            const urgency = getUrgencyInfo(task);
            const st = urgencyStyle[urgency.level];

            let statusClass = 'status-todo';
            if (task.status.toLowerCase().includes('progress')) statusClass = 'status-inprogress';
            if (task.status.toLowerCase().includes('review')) statusClass = 'status-inreview';
            if (task.status.toLowerCase().includes('done')) statusClass = 'status-done';

            return (
              <div
                key={task.id}
                onClick={() => setSelectedTicketForDetail(task)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '28px 1fr 130px 110px 110px',
                  gap: '0.75rem',
                  alignItems: 'center',
                  padding: '0.85rem 1.5rem',
                  borderBottom: '1px solid var(--surface-border-subtle)',
                  cursor: 'pointer',
                  background: st.rowBg,
                  borderLeft: `4px solid ${st.accentBar}`,
                  transition: 'all 0.18s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.05)'}
                onMouseLeave={e => e.currentTarget.style.filter = ''}
              >
                {/* Index */}
                <span style={{
                  fontSize: '0.8rem', fontWeight: '800',
                  color: 'var(--text-secondary)', textAlign: 'center',
                }}>
                  {idx + 1}
                </span>

                {/* Task info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: '700',
                    color: 'var(--primary)', flexShrink: 0,
                  }}>{task.key}</span>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: '600',
                    background: 'var(--surface-hover-bg)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--surface-border)',
                    padding: '1px 6px', borderRadius: '4px', flexShrink: 0,
                  }}>{task.issuetype}</span>
                  <span style={{
                    color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.9rem',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }} title={task.summary}>{task.summary}</span>
                </div>

                {/* Due date — prominent */}
                <div style={{ textAlign: 'center' }}>
                  {task.duedate ? (
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {formatDateBE(task.duedate)}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>—</span>
                  )}
                </div>

                {/* Countdown chip — the STAR of the show */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: '800',
                    background: st.chipBg,
                    color: st.chipColor,
                    letterSpacing: '0.01em',
                    boxShadow: urgency.level === 'overdue' || urgency.level === 'today'
                      ? `0 2px 8px ${st.chipBg}66` : 'none',
                  }}>
                    {st.icon} {urgency.label}
                  </span>
                </div>

                {/* Status */}
                <div style={{ textAlign: 'center' }}>
                  <span className={`status-badge ${statusClass}`}>
                    {task.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };


  const renderMainTable = () => {
    return (
      <div className="glass table-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', padding: '0 0.5rem' }}>
          <h3 style={{ fontSize: '1.3rem' }}>
            {effectiveRole === 'Manager' && 'รายการงานทั้งหมดในระบบ'}
            {effectiveRole === 'Developer' && 'รายการงานพัฒนาในสโคปทีม Dev'}
            {effectiveRole === 'Sales' && 'ตารางจัดส่งมอบฟีเจอร์สำหรับฝ่ายขาย'}
            {effectiveRole === 'Deployment' && 'ตารางติดตั้งนอกสถานที่และประสานงาน'}
            {effectiveRole === 'IT_Sub' && 'งานระบบ IT และโครงสร้างพื้นฐาน'}
          </h3>
          <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
            พบทั้งหมด {displayTickets.length} รายการ
          </span>
        </div>

        <table>
          <thead>
            {effectiveRole === 'Sales' || effectiveRole === 'Deployment' ? (
              <tr>
                <th style={{ width: '10%' }}>Key</th>
                <th style={{ width: '15%' }}>ประเภทงาน</th>
                <th style={{ width: '35%' }}>
                  หัวข้อโครงการ Dev (Summary)
                </th>
                <th style={{ width: '12%' }}>สถานะ</th>
                <th style={{ width: '15%' }}>
                  กำหนดวันเสร็จงาน Dev
                </th>
                <th style={{ width: '13%' }}>วันเวลาคงเหลือ</th>
              </tr>
            ) : (
              <tr>
                <th>Key</th>
                <th>ประเภท</th>
                <th>หัวข้อ (Summary)</th>
                <th>สถานะ</th>
                <th>ผู้รับผิดชอบ</th>
                <th>ความสำคัญ</th>
                <th>กำหนดส่ง</th>
                <th>วันเวลาคงเหลือ</th>
              </tr>
            )}
          </thead>
          <tbody>
            {displayTickets.map(ticket => {
              let statusClass = 'status-todo';
              if (ticket.status.toLowerCase().includes('progress')) statusClass = 'status-inprogress';
              if (ticket.status.toLowerCase().includes('review')) statusClass = 'status-inreview';
              if (ticket.status.toLowerCase().includes('done')) statusClass = 'status-done';

              if (effectiveRole === 'Sales' || effectiveRole === 'Deployment') {
                const keyColor = 'var(--text-primary)';
                return (
                  <tr key={ticket.id}>
                    <td 
                      onClick={() => setSelectedTicketForDetail(ticket)}
                      style={{ color: keyColor, fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {ticket.key}
                    </td>
                    <td>
                      <span style={{ 
                        background: 'var(--surface-hover-bg)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--surface-border)',
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold'
                      }}>
                        {ticket.issuetype}
                      </span>
                    </td>
                    <td 
                      onClick={() => setSelectedTicketForDetail(ticket)}
                      style={{ fontWeight: '500', cursor: 'pointer' }}
                    >
                      {ticket.summary}
                    </td>
                    <td><span className={`status-badge ${statusClass}`}>{ticket.status}</span></td>
                    <td>
                      <span style={{ fontSize: '0.9rem', color: ticket.duedate ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        {ticket.duedate ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Calendar size={14} style={{ color: 'var(--primary)' }} /> {formatDateBE(ticket.duedate)}
                          </span>
                        ) : 'ไม่มีกำหนดส่ง'}
                      </span>
                    </td>
                    <td>{getDaysLeftElement(ticket)}</td>
                  </tr>
                );
              }

              return (
                <tr key={ticket.id}>
                  <td 
                    onClick={() => setSelectedTicketForDetail(ticket)}
                    style={{ color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {ticket.key}
                  </td>
                  <td>
                    <span style={{ 
                      background: 'var(--surface-hover-bg)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--surface-border)',
                      padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem'
                    }}>
                      {ticket.issuetype}
                    </span>
                  </td>
                  <td 
                    onClick={() => setSelectedTicketForDetail(ticket)}
                    style={{ cursor: 'pointer' }}
                  >
                    {ticket.summary}
                  </td>
                  <td><span className={`status-badge ${statusClass}`}>{ticket.status}</span></td>
                  <td>{ticket.assignee}</td>
                  <td>{getPriorityElement(ticket.priority)}</td>
                  <td>{ticket.duedate ? formatDateBE(ticket.duedate) : '-'}</td>
                  <td>{getDaysLeftElement(ticket)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {displayTickets.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '4rem 2rem', 
            background: 'var(--surface-hover-bg)', 
            borderRadius: '12px', 
            border: '1px dashed var(--surface-border)', 
            margin: '2rem 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.25rem',
            animation: 'fadeIn 0.5s ease-out'
          }}>
            <div style={{ 
              fontSize: '3.5rem', 
              animation: 'bounce 2s infinite',
              lineHeight: 1
            }}>
              🎉
            </div>
            <div>
              <h4 style={{ 
                fontSize: '1.45rem', 
                fontWeight: '800', 
                color: 'var(--text-primary)',
                marginBottom: '0.5rem',
                letterSpacing: '-0.02em'
              }}>
                ยินดีด้วย! ไม่มีงานค้างในกลุ่มนี้
              </h4>
              <p style={{ 
                fontSize: '1.05rem', 
                color: 'var(--text-secondary)',
                maxWidth: '450px',
                margin: '0 auto',
                lineHeight: 1.5
              }}>
                ตั๋วงานทั้งหมดในส่วนนี้ได้รับการจัดการและเสร็จสิ้นเรียบร้อยแล้ว ทุกอย่างเป็นไปตามแผนและมีประสิทธิภาพสูงสุด!
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderActivityLogsTab = () => {
    const getPlatformBadge = (role) => {
      if (role === 'Chatbot') {
        return { name: 'Chatbot 🤖', color: '#10B981', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.2)' };
      }
      if (role === 'Jira' || role === 'Jira User') {
        return { name: 'Jira Cloud 🌐', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.2)' };
      }
      return { name: 'เว็บ Dashboard 💻', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.2)' };
    };

    const filteredLogs = activityLogs.filter(log => {
      if (logActionFilter !== 'all' && log.action !== logActionFilter) return false;
      if (logSearch.trim() === '') return true;
      const searchLower = logSearch.toLowerCase();
      return (
        (log.user && log.user.toLowerCase().includes(searchLower)) ||
        (log.role && log.role.toLowerCase().includes(searchLower)) ||
        (log.ticketKey && log.ticketKey.toLowerCase().includes(searchLower)) ||
        (log.details && log.details.toLowerCase().includes(searchLower)) ||
        (log.action && log.action.toLowerCase().includes(searchLower))
      );
    });

    return (
      <div className="glass animate-fade-in" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.65rem', margin: 0 }}>
            <Clock size={22} style={{ color: 'var(--primary)' }} />
            ประวัติกิจกรรมและการเข้าใช้งานของทีม (Recent Team Activities)
          </h3>
          <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            พบทั้งหมด <strong>{filteredLogs.length}</strong> รายการ (จากทั้งหมด {activityLogs.length} รายการ)
          </span>
        </div>

        {/* Filters bar */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '1.5rem', 
          background: 'var(--surface-hover-bg)', 
          border: '1px solid var(--surface-border)', 
          padding: '1rem', 
          borderRadius: '8px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="ค้นหาตามชื่อคน, บทบาท, รหัสตั๋ว หรือรายละเอียด..." 
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 1rem 0.65rem 2.25rem',
                background: 'var(--bg-color)',
                border: '1px solid var(--surface-border)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>กรองประเภทกิจกรรม:</span>
            <select
              value={logActionFilter}
              onChange={(e) => setLogActionFilter(e.target.value)}
              style={{
                padding: '0.65rem 1.25rem',
                background: 'var(--bg-color)',
                border: '1px solid var(--surface-border)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              <option value="all" style={{ background: 'var(--bg-color)', color: 'var(--text-primary)' }}>ทั้งหมด (All)</option>
              <option value="view" style={{ background: 'var(--bg-color)', color: 'var(--text-primary)' }}>VIEW (เข้าชม)</option>
              <option value="transition" style={{ background: 'var(--bg-color)', color: 'var(--text-primary)' }}>TRANSITION (เปลี่ยนสถานะ)</option>
              <option value="create" style={{ background: 'var(--bg-color)', color: 'var(--text-primary)' }}>CREATE (สร้างงาน)</option>
              <option value="update" style={{ background: 'var(--bg-color)', color: 'var(--text-primary)' }}>UPDATE (แก้ไขงาน)</option>
            </select>
          </div>
          <button 
            className="btn btn-secondary" 
            onClick={() => { setLogSearch(''); setLogActionFilter('all'); fetchLogs(); }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, padding: '0.65rem 1.25rem' }}
          >
            <RefreshCw size={14} /> รีเฟรช & ล้างค่า
          </button>
        </div>
        
        {/* Logs list container */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '550px', overflowY: 'auto', paddingRight: '0.25rem' }}>
          {filteredLogs.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              ไม่พบประวัติกิจกรรมตามเงื่อนไขการค้นหา
            </p>
          ) : (
            filteredLogs.map((log, idx) => {
              const timeStr = formatDateTime(log.timestamp) || 'ไม่ระบุเวลา';
              let accentColor = '#9CA3AF';
              let actionIcon = <Clock size={16} />;
              let cardLeftBorder = '4px solid var(--surface-border)';

              const action = log.action ? log.action.toLowerCase() : '';
              if (action === 'view') {
                accentColor = '#3B82F6';
                cardLeftBorder = '4px solid #3B82F6';
                actionIcon = <Search size={16} style={{ color: '#3B82F6' }} />;
              } else if (action === 'create') {
                accentColor = '#10B981';
                cardLeftBorder = '4px solid #10B981';
                actionIcon = <Plus size={16} style={{ color: '#10B981' }} />;
              } else if (action === 'update') {
                accentColor = '#F59E0B';
                cardLeftBorder = '4px solid #F59E0B';
                actionIcon = <Edit2 size={16} style={{ color: '#F59E0B' }} />;
              } else if (action === 'transition') {
                accentColor = '#8B5CF6';
                cardLeftBorder = '4px solid #8B5CF6';
                actionIcon = <TrendingUp size={16} style={{ color: '#8B5CF6' }} />;
              }

              const roleBadge = roleColors[log.role] || { color: 'var(--text-secondary)', bg: 'var(--surface-hover-bg)', border: 'var(--surface-border)' };
              const platform = getPlatformBadge(log.role);

              return (
                <div 
                  key={idx} 
                  className="log-feed-card animate-fade-in"
                  style={{ 
                    display: 'flex', 
                    gap: '1rem',
                    padding: '0.95rem 1.25rem', 
                    background: 'var(--surface)', 
                    border: '1px solid var(--surface-border)', 
                    borderLeft: cardLeftBorder,
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    alignItems: 'flex-start'
                  }}
                >
                  {/* Left Icon Badge */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%', 
                    background: `${accentColor}15`, 
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    {actionIcon}
                  </div>

                  {/* Middle Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Header Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.95rem' }}>
                          {log.user}
                        </span>
                        <span className="role-badge" style={{ 
                          color: roleBadge.color, 
                          background: roleBadge.bg, 
                          border: `1px solid ${roleBadge.border}`,
                          padding: '1px 6px', 
                          borderRadius: '4px', 
                          fontSize: '0.75rem', 
                          fontWeight: '500' 
                        }}>
                          {log.role || 'User'}
                        </span>
                        <span className="platform-badge" style={{ 
                          color: platform.color, 
                          background: platform.bg, 
                          border: `1px solid ${platform.border}`,
                          padding: '1px 6px', 
                          borderRadius: '4px', 
                          fontSize: '0.75rem', 
                          fontWeight: '500' 
                        }}>
                          {platform.name}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} />
                        {timeStr}
                      </span>
                    </div>

                    {/* Details Row with wrapped text & clickable ticket tag */}
                    <div style={{ color: 'var(--text-primary)', lineHeight: '1.45', wordBreak: 'break-word' }}>
                      {log.ticketKey && (
                        <span 
                          onClick={() => {
                            const matchedTicket = tickets.find(t => t.key === log.ticketKey);
                            if (matchedTicket) setSelectedTicketForDetail(matchedTicket);
                          }}
                          style={{ 
                            background: 'var(--surface-hover-bg)', 
                            border: '1px solid var(--surface-border)', 
                            color: 'var(--primary)',
                            padding: '1px 6px', 
                            borderRadius: '4px', 
                            fontSize: '0.8rem', 
                            fontFamily: 'monospace',
                            fontWeight: 'bold',
                            marginRight: '0.5rem',
                            cursor: 'pointer',
                            display: 'inline-block'
                          }}
                          title="คลิกเพื่อดูรายละเอียดงาน"
                        >
                          {log.ticketKey}
                        </span>
                      )}
                      <span>{log.details}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderSystemHealthTab = () => {
    if (loadingHealth) {
      return (
        <div className="glass" style={{ padding: '3rem', textAlign: 'center' }}>
          <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 1rem auto', animation: 'spin 2s linear infinite' }} />
          <p>กำลังตรวจสอบสถานะการเชื่อมต่อระบบ...</p>
        </div>
      );
    }

    if (!healthData) {
      return (
        <div className="glass" style={{ padding: '3rem', textAlign: 'center' }}>
          <AlertTriangle size={32} style={{ color: 'var(--text-primary)', margin: '0 auto 1rem auto' }} />
          <p>ไม่สามารถดึงข้อมูลสถานะระบบได้</p>
          <button className="btn btn-primary" onClick={fetchHealthData} style={{ marginTop: '1rem', width: 'auto' }}>ลองใหม่</button>
        </div>
      );
    }

    return (
      <div className="glass animate-fade-in" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.5rem' }}>
          <Server size={22} style={{ color: 'var(--primary)' }} />
          สถานะความเชื่อมต่อระบบหลังบ้าน (Jira & AI Status)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: '8px', padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>
              📡 Jira Cloud Integration
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.95rem' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>Jira Domain / Host</span>
                <strong style={{ color: 'var(--text-primary)' }}>{healthData.JIRA_DOMAIN || 'Not Configured'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>Project Key</span>
                <strong style={{ color: 'var(--text-primary)' }}>{healthData.JIRA_PROJECT_KEY || 'Not Configured'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>Jira Admin Email</span>
                <strong style={{ color: 'var(--text-primary)' }}>{healthData.JIRA_EMAIL || 'Not Configured'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>API Token Status</span>
                {healthData.HAS_TOKEN ? (
                  <span style={{ color: '#10B981', fontWeight: 'bold' }}>✓ Loaded Successfully ({healthData.TOKEN_LENGTH} chars)</span>
                ) : (
                  <span style={{ color: '#EF4444', fontWeight: 'bold' }}>✗ Missing API Token</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: '8px', padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>
              🧠 AI Brain & Middlewares
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.95rem' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>Active LLM Provider</span>
                <strong style={{ color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                  {healthData.LLM_PROVIDER || 'gemini'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>Express Server API Port</span>
                <strong style={{ color: 'var(--text-primary)' }}>3000 (HTTP OK)</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>Connection State</span>
                <span style={{ color: '#10B981', fontWeight: 'bold' }}>● Connected / Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTeamMembersTab = () => {
    return (
      <div className="glass animate-fade-in" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.5rem' }}>
          <User size={22} style={{ color: 'var(--primary)' }} />
          ระบบจัดการรายชื่อและชื่อเล่นทีม (Team Nicknames & Configurations)
        </h3>

        <form onSubmit={handleAddMember} style={{ 
          background: 'var(--surface)', 
          border: '1px solid var(--surface-border)', 
          padding: '1.5rem', 
          borderRadius: '8px', 
          marginBottom: '2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          alignItems: 'end'
        }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ชื่อเล่น (ใช้ในแชท):</label>
            <input 
              type="text" 
              placeholder="เช่น แป๊ก" 
              value={newMember.nickname}
              onChange={(e) => setNewMember({ ...newMember, nickname: e.target.value })}
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ชื่อจริงใน Jira (Display Name):</label>
            <input 
              type="text" 
              placeholder="ค้นหาชื่อในระบบ Jira..." 
              value={newMember.jiraDisplayName}
              onChange={(e) => handleJiraNameChange(e.target.value)}
              onFocus={() => { if (newMember.jiraDisplayName.trim().length >= 2) setShowJiraSuggestions(true); }}
              onBlur={() => setTimeout(() => setShowJiraSuggestions(false), 250)}
              required
              autoComplete="off"
            />
            {showJiraSuggestions && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'var(--surface)',
                border: '1px solid var(--surface-border)',
                borderRadius: '8px',
                maxHeight: '200px',
                overflowY: 'auto',
                zIndex: 1000,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                marginTop: '4px'
              }}>
                {loadingJiraSuggestions ? (
                  <div style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>กำลังค้นหาใน Jira...</div>
                ) : jiraUserSuggestions.length === 0 ? (
                  <div style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>ไม่พบรายชื่อใน Jira</div>
                ) : (
                  jiraUserSuggestions.map(u => (
                    <div 
                      key={u.accountId} 
                      onClick={() => handleSelectJiraUser(u)}
                      style={{
                        padding: '0.6rem 0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'background 0.2s',
                        borderBottom: '1px solid rgba(255,255,255,0.05)'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover-bg)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {u.avatarUrl && <img src={u.avatarUrl} alt={u.displayName} style={{ width: '22px', height: '22px', borderRadius: '50%' }} />}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{u.displayName}</div>
                        {u.emailAddress && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{u.emailAddress}</div>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>อีเมล Google Workspace:</label>
            <input 
              type="email" 
              placeholder="เช่น user@ku.th" 
              value={newMember.email}
              onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Webhook URL (กรณีส่งแชทส่วนตัว):</label>
            <input 
              type="text" 
              placeholder="https://chat.googleapis.com/..." 
              value={newMember.webhookUrl}
              onChange={(e) => setNewMember({ ...newMember, webhookUrl: e.target.value })}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ margin: 0, padding: '0.65rem 1.5rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
            <Plus size={16} /> เพิ่มสมาชิก
          </button>
        </form>

        {loadingTeam ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto', animation: 'spin 2s linear infinite' }} />
            <p style={{ marginTop: '0.5rem' }}>กำลังดึงข้อมูลรายชื่อทีม...</p>
          </div>
        ) : teamMembers.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', fontStyle: 'italic', border: '1px dashed var(--surface-border)', borderRadius: '8px' }}>
            ยังไม่มีรายชื่อสมาชิกลงทะเบียนไว้
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>ชื่อเล่น (ใช้สั่งงาน)</th>
                  <th style={{ width: '25%' }}>ชื่อในระบบ Jira (Display Name)</th>
                  <th style={{ width: '25%' }}>อีเมล Google Workspace</th>
                  <th style={{ width: '25%' }}>Webhook URL (แชทส่วนตัว)</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member, index) => (
                  <tr key={index}>
                    <td style={{ fontWeight: 'bold' }}>{member.nickname}</td>
                    <td>{member.jiraDisplayName}</td>
                    <td>{member.email || '-'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={member.webhookUrl}>
                      {member.webhookUrl || '-'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        onClick={() => handleDeleteMember(index)}
                        style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
                      >
                        ลบออก
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderCEOView = () => {
    // 1. Calculate General Executive Metrics using timeframe filtered tickets
    const totalTickets = filteredTickets.length;
    const doneTickets = filteredTickets.filter(t => t.status.toLowerCase().includes('done')).length;
    
    // Overall completion rate
    const systemCompletionRate = totalTickets > 0 ? Math.round((doneTickets / totalTickets) * 100) : 0;
    
    // Business Value: Completed tickets * ceoValueMultiplier Baht
    const estimatedValue = doneTickets * ceoValueMultiplier;
    const formattedValue = new Intl.NumberFormat('th-TH', { 
      style: 'currency', 
      currency: 'THB', 
      maximumFractionDigits: 0 
    }).format(estimatedValue);

    // Overdue tickets
    const overdueTasks = getOverdueTasks();
    const criticalOverdueTasks = overdueTasks.filter(t => 
      t.priority.toLowerCase() === 'high' || t.priority.toLowerCase() === 'highest'
    );

    // 2. Projects Health Data
    const { projects } = buildProjectTree();
    
    // Developer workloads
    const workloads = getDevWorkloads();

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} className="animate-fade-in">
        
        {/* CEO Executive Metrics Row */}
        <div className="stats-grid">
          <div className="stat-card glass">
            <span className="stat-title">
              <TrendingUp size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle', color: 'var(--text-primary)' }}/>
              อัตราความสำเร็จรวม (System Success)
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
              <span className="stat-value" style={{ color: 'var(--text-primary)' }}>{systemCompletionRate}%</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ของตั๋วทั้งหมดในระบบ</span>
            </div>
            <div style={{ height: '4px', background: 'var(--surface-border)', borderRadius: '2px', overflow: 'hidden', marginTop: '0.75rem' }}>
              <div style={{ width: `${systemCompletionRate}%`, height: '100%', background: 'var(--text-primary)' }}></div>
            </div>
          </div>

          <div className="stat-card glass">
            <span className="stat-title">
              <CheckCircle size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle', color: 'var(--text-primary)' }}/>
              มูลค่าธุรกิจที่ส่งมอบแล้ว (Business Value)
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
              <span className="stat-value" style={{ color: 'var(--text-primary)' }}>{formattedValue}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                มูลค่าตั๋วเฉลี่ย (฿/งาน):
              </span>
              <input
                type="number"
                value={ceoValueMultiplier}
                onChange={(e) => setCeoValueMultiplier(Math.max(0, parseInt(e.target.value) || 0))}
                style={{
                  width: '90px',
                  background: 'var(--bg-color)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  outline: 'none',
                  textAlign: 'right'
                }}
              />
            </div>
          </div>

          <div className="stat-card glass">
            <span className="stat-title">
              <Folder size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle', color: 'var(--text-primary)' }}/>
              โครงการทั้งหมด (Projects)
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
              <span className="stat-value" style={{ color: 'var(--text-primary)' }}>{projects.length}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>โครงการหลัก</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'block' }}>
              แบ่งเป็น {tickets.filter(t => t.issuetype.toLowerCase() === 'epic').length} Epics และ {tickets.filter(t => t.issuetype.toLowerCase() !== 'project' && t.issuetype.toLowerCase() !== 'epic').length} Tasks
            </span>
          </div>

          <div className="stat-card glass">
            <span className="stat-title">
              <AlertTriangle size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle', color: 'var(--text-primary)' }}/>
              งานที่ล่าช้าเกินกำหนด (Overdue Tasks)
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
              <span className="stat-value" style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{overdueTasks.length}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>งานค้าง</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'block' }}>
              เป็นความเสี่ยงเร่งด่วน {criticalOverdueTasks.length} งาน (ลำดับความสำคัญสูง)
            </span>
          </div>
        </div>

        {/* Projects Health Grid Tracker */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <LayoutDashboard size={20} style={{ color: 'var(--primary)' }} />
              ติดตามสถานะและสุขภาพโครงการ (Project Health Tracker)
            </h3>
            {projects.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {hiddenProjects.length > 0 && (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    ซ่อนอยู่ {hiddenProjects.length} โครงการ
                  </span>
                )}
                <button
                  onClick={() => setShowVisibilityManager(!showVisibilityManager)}
                  style={{
                    background: 'var(--surface-hover-bg)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--surface-border)'; }}
                >
                  {showVisibilityManager ? <Eye size={14} /> : <EyeOff size={14} />}
                  {showVisibilityManager ? 'ปิดตัวจัดการ' : 'เลือกโครงการที่ซ่อน'}
                </button>
                {hiddenProjects.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm('ต้องการแสดงผลโครงการทั้งหมดอีกครั้งใช่หรือไม่?')) {
                        setHiddenProjects([]);
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('hiddenProjects', JSON.stringify([]));
                        }
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    แสดงทั้งหมด
                  </button>
                )}
              </div>
            )}
          </div>

          {showVisibilityManager && projects.length > 0 && (
            <div className="glass" style={{ padding: '1rem', marginBottom: '1.5rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>จัดการรายการซ่อนโครงการ (Epics)</span>
                <button onClick={() => setShowVisibilityManager(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={16} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.75rem' }}>
                {projects.map(p => {
                  const isHidden = hiddenProjects.includes(p.key);
                  return (
                    <div 
                      key={p.key} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '0.5rem 0.75rem', 
                        background: 'var(--surface)', 
                        border: '1px solid var(--surface-border)', 
                        borderRadius: '6px',
                        opacity: isHidden ? 0.6 : 1,
                        transition: 'opacity 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, marginRight: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold' }}>{p.key}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.summary}>
                          {p.summary}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleHideProject(p.key)}
                        style={{
                          background: isHidden ? 'transparent' : 'rgba(16, 185, 129, 0.1)',
                          border: 'none',
                          color: isHidden ? 'var(--text-secondary)' : 'var(--primary)',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '4px',
                          transition: 'all 0.2s'
                        }}
                        title={isHidden ? "แสดงการ์ด" : "ซ่อนการ์ด"}
                      >
                        {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {projects.filter(project => !hiddenProjects.includes(project.key)).length === 0 ? (
            <p style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }} className="glass">
              {projects.length === 0 ? 'ไม่พบข้อมูลโครงการในระบบในขณะนี้' : 'โครงการทั้งหมดถูกซ่อนไว้ในขณะนี้'}
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
              {projects
                .filter(project => !hiddenProjects.includes(project.key))
                .map(project => {
                  const progress = getProjectProgress(project);
                  
                  // Get all descendant tasks to evaluate health
                  const allTasks = [];
                  project.childrenEpics.forEach(epic => allTasks.push(...epic.childrenTasks));
                  allTasks.push(...project.directTasks);
                  
                  const hasOverdue = allTasks.some(t => {
                    if (!t.duedate || t.status.toLowerCase().includes('done')) return false;
                    return new Date(t.duedate) < new Date();
                  });

                  let healthLabel = 'On Track (ปกติ)';
                  let healthColor = 'var(--text-secondary)';
                  let healthBg = 'var(--surface-hover-bg)';
                  let healthBorder = 'var(--surface-border)';
                  
                  if (progress === 100) {
                    healthLabel = 'Completed (เสร็จสิ้น)';
                    healthColor = 'var(--text-primary)';
                    healthBg = 'var(--surface-hover-bg)';
                    healthBorder = 'var(--surface-border)';
                  } else if (hasOverdue) {
                    healthLabel = 'Delayed (ล่าช้า)';
                    healthColor = 'var(--days-overdue-color)';
                    healthBg = 'var(--days-overdue-bg)';
                    healthBorder = 'var(--days-overdue-border)';
                  } else if (progress < 40 && allTasks.length > 0) {
                    healthLabel = 'At Risk (มีความเสี่ยง)';
                    healthColor = 'var(--text-primary)';
                    healthBg = 'transparent';
                    healthBorder = 'var(--text-primary)';
                  }

                  return (
                    <div key={project.id} className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.85rem' }}>{project.key}</span>
                          <h4 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={project.summary}>
                            {project.summary}
                          </h4>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                          <span className="badge" style={{ background: healthBg, color: healthColor, borderColor: healthBorder, fontSize: '0.7rem', padding: '3px 8px', fontWeight: 'bold' }}>
                            {healthLabel}
                          </span>
                          <button 
                            onClick={() => toggleHideProject(project.key)}
                            title="ซ่อนโครงการนี้"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '4px',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#EF4444';
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'var(--text-secondary)';
                              e.currentTarget.style.background = 'none';
                            }}
                          >
                            <EyeOff size={16} />
                          </button>
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          <span>ความคืบหน้า</span>
                          <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{progress}%</span>
                        </div>
                        <div style={{ height: '8px', background: 'var(--surface-border)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${progress}%`, 
                            height: '100%', 
                            background: progress === 100 ? currentColors[0] : 
                                        progress > 0 ? currentColors[1] : 'var(--surface-border-hover)',
                            borderRadius: '4px',
                            transition: 'width 0.5s ease' 
                          }}></div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--surface-border-subtle)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                        <span>ผู้รับผิดชอบ: <strong style={{ color: 'var(--text-primary)' }}>{project.assignee}</strong></span>
                        <span>Epics: {project.childrenEpics.length} | Tasks: {project.directTasks.length + allTasks.length}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Developer Capacity Status & Strategic Overdue list */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
          
          {/* Resource capacity panel */}
          <div className="glass" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={18} style={{ color: 'var(--primary)' }} />
              สถานะอัตรากำลังและภาระงานของทีม (Resource Capacity)
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {workloads.map(dev => {
                const activeCount = dev.todo + dev.progress + dev.review;
                const totalCount = dev.todo + dev.progress + dev.review + dev.done;
                
                let capacityLabel = 'Optimal (ภาระงานเหมาะสม)';
                let capacityColor = 'var(--text-secondary)';
                let capacityBg = 'var(--surface-hover-bg)';
                
                if (activeCount >= 6) {
                  capacityLabel = 'Overloaded (ภาระงานสูง)';
                  capacityColor = 'var(--days-overdue-color)';
                  capacityBg = 'var(--days-overdue-bg)';
                } else if (activeCount <= 2) {
                  capacityLabel = 'Available (ภาระงานน้อย)';
                  capacityColor = 'var(--text-primary)';
                  capacityBg = 'var(--surface-border-subtle)';
                }

                return (
                  <div key={dev.name} style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '0.9rem' }}>{dev.name}</span>
                      <span className="badge" style={{ background: capacityBg, color: capacityColor, border: `1px solid var(--surface-border)`, fontSize: '0.65rem', padding: '1px 6px', fontWeight: 'bold' }}>
                        {capacityLabel}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span>จำนวนงานที่ถืออยู่: <strong>{activeCount} งาน</strong> (ทั้งหมด {totalCount} งาน)</span>
                      <span>เสร็จแล้ว {dev.done} | รอตรวจ {dev.review} | กำลังทำ {dev.progress} | รอทำ {dev.todo}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Critical Overdue alert board */}
          <div className="glass" style={{ padding: '1.5rem', border: overdueTasks.length > 0 ? '2px solid var(--text-primary)' : '1px solid var(--surface-border)' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} style={{ color: 'var(--text-primary)' }} />
              จุดคอขวดที่ต้องเฝ้าระวัง (Strategic Risk Alerts)
            </h3>
            
            {overdueTasks.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem', fontSize: '0.9rem' }}>
                [ไม่มีงานล่าช้าเกินกำหนดส่งในโครงการขณะนี้]
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '320px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {overdueTasks.map(task => {
                  const daysOverdue = getOverdueDays(task.duedate);
                  return (
                    <div 
                      key={task.id} 
                      onClick={() => setSelectedTicketForDetail(task)}
                      style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--surface)', borderLeft: '3px solid var(--text-primary)', padding: '0.6rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      <div style={{ minWidth: 0, paddingRight: '1rem', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
                          <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{task.key}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>({task.issuetype})</span>
                        </div>
                        <div style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={task.summary}>
                          {task.summary}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', marginTop: '0.15rem' }}>
                          ผู้รับผิดชอบ: <strong style={{ color: 'var(--text-primary)' }}>{task.assignee}</strong>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>[เกินกำหนด {daysOverdue} วัน]</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>ส่ง: {formatDateBE(task.duedate)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>
    );
  };

  const renderSidebar = () => {
    if (effectiveRole !== 'Manager' && effectiveRole !== 'Admin') return null;

    const isJiraNormal = healthData && healthData.status === 'ok' && healthData.HAS_TOKEN;
    
    let statusColor = '#EF4444';
    let statusText = 'ผิดปกติ';
    let statusIconColor = '#EF4444';
    
    if (loadingHealth) {
      statusColor = '#F59E0B';
      statusText = 'กำลังตรวจสอบ...';
      statusIconColor = '#F59E0B';
    } else if (healthData) {
      if (isJiraNormal) {
        statusColor = '#10B981';
        statusText = 'ปกติ';
        statusIconColor = '#10B981';
      } else {
        statusColor = '#EF4444';
        statusText = 'เชื่อมต่อล้มเหลว';
        statusIconColor = '#EF4444';
      }
    }

    return (
      <>
        {/* Slide-out Sidebar Panel */}
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: isSidebarCollapsed ? '-320px' : 0,
            height: '100vh',
            width: '320px',
            background: 'var(--surface)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRight: '1px solid var(--surface-border)',
            boxShadow: '4px 0 20px rgba(0, 0, 0, 0.05)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            padding: '1.5rem 0',
            transition: 'left 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Sidebar Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '1px solid var(--surface-border)', padding: '0 1.25rem 1rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <LayoutDashboard size={22} style={{ color: 'var(--primary, #10B981)' }} />
              <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>ระบบจัดการ</span>
            </div>
            <button 
              onClick={() => setIsSidebarCollapsed(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--surface-border)',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface-hover-bg)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
              title="ซ่อนเมนูด้านซ้าย"
            >
              <ChevronLeft size={18} />
            </button>
          </div>

          {/* Navigation Items (Vertical List - Full Width) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
            {[
              { id: 'overview', name: 'ภาพรวมตารางงาน (Overview)', icon: <List size={22} /> },
              { id: 'tree', name: 'โครงสร้างโครงการ (Project Tree)', icon: <Folder size={22} /> },
              { id: 'workload', name: 'ภาระงานของทีม (Workloads)', icon: <BarChart2 size={22} /> },
              { id: 'activity', name: 'ประวัติกิจกรรมทีม (Activity Logs)', icon: <Clock size={22} /> },
              { id: 'team', name: 'จัดการรายชื่อทีม (Team Members)', icon: <User size={22} /> },
              ...(effectiveRole === 'Admin' ? [{ id: 'admin', name: 'อนุมัติผู้ใช้งาน (Admin Panel)', icon: <Shield size={22} style={{ color: '#F59E0B' }} /> }] : [])
            ].map(tab => {
              const isActive = pmTab === tab.id;
              
              const activeBg = 'var(--primary, #10B981)';
              const activeBorderLeft = '5px solid #3B82F6';
              
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setPmTab(tab.id);
                    setIsSidebarOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    padding: '1.1rem 1.75rem',
                    border: 'none',
                    borderLeft: isActive ? activeBorderLeft : '5px solid transparent',
                    background: isActive ? activeBg : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: isActive ? '700' : '600',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '1.05rem',
                    transition: 'all 0.2s ease',
                    width: '100%',
                    boxShadow: isActive ? 'inset 0 0 10px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(16, 185, 129, 0.15)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'var(--surface-hover-bg)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', color: isActive ? '#ffffff' : 'var(--text-secondary)' }}>
                    {tab.icon}
                  </span>
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>

          {/* Sidebar Footer User Info & System Status */}
          <div style={{ borderTop: '1px solid var(--surface-border)', padding: '1.25rem 1.5rem 0 1.5rem', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Compact System Status Box */}
            <div 
              onClick={fetchHealthData}
              title="คลิกเพื่อรีเฟรชสถานะระบบ"
              style={{ 
                padding: '0.75rem 1rem', 
                background: 'var(--bg-color)', 
                borderRadius: '8px', 
                border: '1px solid var(--surface-border)',
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-color)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Server size={15} style={{ color: statusIconColor }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>สถานะระบบ</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <div style={{ 
                    width: '6px', 
                    height: '6px', 
                    borderRadius: '50%', 
                    background: statusColor, 
                    boxShadow: `0 0 6px ${statusColor}`,
                    animation: isJiraNormal && !loadingHealth ? 'pulse-green-dot 2s infinite' : 'none'
                  }}></div>
                  <span style={{ fontSize: '0.75rem', color: statusColor, fontWeight: 'bold' }}>{statusText}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Jira Cloud:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px' }} title={healthData?.JIRA_DOMAIN || ''}>
                    {healthData?.JIRA_DOMAIN || 'Loading...'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>ผู้ช่วย AI:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600', textTransform: 'uppercase' }}>
                    {healthData?.LLM_PROVIDER || 'Loading...'}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ 
                width: '38px', 
                height: '38px', 
                borderRadius: '50%', 
                background: currentRoleStyle.bg, 
                border: `1px solid ${currentRoleStyle.border}`,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: currentRoleStyle.color, 
                fontWeight: 'bold',
                fontSize: '1rem'
              }}>
                {user.name.substring(0, 1)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {previewRole ? `${user.role} (จำลองเป็น ${previewRole})` : user.role}
                </span>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  const showTimeframeSelector = 
    (effectiveRole !== 'Manager' && effectiveRole !== 'Admin') || 
    pmTab === 'overview' || 
    pmTab === 'tree' || 
    pmTab === 'workload';

  const isManager = effectiveRole === 'Manager' || effectiveRole === 'Admin';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-color)', overflowX: 'hidden' }}>
      {isManager && renderSidebar()}
      
      <div 
        style={{
          flex: 1,
          paddingLeft: isManager && !isSidebarCollapsed ? '320px' : '0px',
          transition: 'padding-left 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          width: '100%',
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        <div 
          className="container animate-fade-in" 
          style={{ 
            paddingBottom: '4rem',
            width: '100%',
            maxWidth: '1560px',
            margin: '0 auto'
          }}
        >
        {user.role === 'Admin' && (
          <div className="glass" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.5rem',
            marginBottom: '1.5rem',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '12px',
            gap: '1rem',
            flexWrap: 'wrap',
            marginTop: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Shield size={20} style={{ color: '#F59E0B' }} />
              <div>
                <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'block' }}>
                  ระบบจำลองมุมมองบทบาท (Admin View Simulator)
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  เลือกบทบาทที่ต้องการ เพื่อจำลองการแสดงผลแดชบอร์ดของสิทธิ์นั้น (ทุกบทบาทในโหมดจำลองจะถูกจำกัดให้อ่านข้อมูลได้อย่างเดียวเสมอ)
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>เลือกสิทธิ์ที่จะจำลอง:</span>
              <select
                value={previewRole || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setPreviewRole(val || null);
                  if (val === 'CEO') {
                    setPmTab('ceo');
                  } else if (val === 'Admin') {
                    setPmTab('admin');
                  } else if (val === 'Manager') {
                    setPmTab('overview');
                  }
                }}
                style={{
                  padding: '0.5rem 1.25rem',
                  background: 'var(--bg-color)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  fontWeight: '700',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">สิทธิ์จริงของบัญชี (Admin) (มีสิทธิ์แก้ไข)</option>
                {['Manager', 'Developer', 'Sales', 'Deployment', 'IT_Sub', 'CEO'].map(r => (
                  <option key={r} value={r}>{r} (ดูได้อย่างเดียวในโหมดจำลอง)</option>
                ))}
              </select>
              {previewRole && (
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setPreviewRole(null);
                    setPmTab('admin');
                  }}
                  style={{
                    margin: 0,
                    padding: '0.5rem 1rem',
                    fontSize: '0.85rem',
                    height: 'auto',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#F87171'
                  }}
                >
                  ล้างมุมมองจำลอง
                </button>
              )}
            </div>
          </div>
        )}
        <header className="header glass" style={{ 
          padding: isElderMode ? '1.25rem 2rem' : '0.65rem 1.5rem', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '2rem', 
          gap: isElderMode ? '1rem 2rem' : '0.5rem 1rem', 
          flexWrap: 'wrap' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isElderMode ? '1.25rem' : '0.75rem', flexShrink: 1, minWidth: 0 }}>
            {isSidebarCollapsed && (
              <button 
                onClick={() => setIsSidebarCollapsed(false)}
                style={{
                  background: 'var(--surface)',
                  border: '2px solid var(--primary)',
                  borderRadius: '10px',
                  padding: isElderMode ? '0.65rem 1.25rem' : '0.45rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  color: 'var(--primary)',
                  fontWeight: '800',
                  fontSize: isElderMode ? '1.05rem' : '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  marginRight: '0.5rem',
                  boxShadow: '0 0 12px rgba(59, 130, 246, 0.15)',
                  height: isElderMode ? '45px' : '36px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--primary)';
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.4)';
                  e.currentTarget.style.transform = 'scale(1.03)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--surface)';
                  e.currentTarget.style.color = 'var(--primary)';
                  e.currentTarget.style.boxShadow = '0 0 12px rgba(59, 130, 246, 0.15)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title="คลิกเพื่อแสดงเมนูด้านซ้าย"
              >
                <Menu size={isElderMode ? 20 : 16} style={{ strokeWidth: 2.5 }} />
                <span>เปิดเมนูระบบ</span>
              </button>
            )}
            <img 
              src="/logo.png" 
              alt="Expert Technology Development Logo" 
              style={{ 
                height: isElderMode ? '50px' : '40px', 
                objectFit: 'contain', 
                borderRadius: '8px', 
                border: '1px solid rgba(255, 255, 255, 0.08)',
                flexShrink: 0
              }} 
            />
            <div style={{ borderLeft: '1px solid var(--surface-border)', paddingLeft: isElderMode ? '1.25rem' : '0.75rem', flexShrink: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: isElderMode ? '1.45rem' : '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2, whiteSpace: isElderMode ? 'normal' : 'nowrap' }}>
                Expert Technology Development
                <span className="badge" style={{ 
                  background: currentRoleStyle.bg,
                  color: currentRoleStyle.color,
                  border: `1px solid ${currentRoleStyle.border}`,
                  fontSize: isElderMode ? '0.75rem' : '0.65rem',
                  padding: isElderMode ? '0.25rem 0.65rem' : '0.15rem 0.5rem',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  marginLeft: '0.65rem',
                  display: 'inline-block',
                  verticalAlign: 'middle'
                }}>
                  {previewRole ? `${user.role} (จำลอง: ${previewRole})` : user.role}
                </span>
              </h1>
              <p style={{ fontSize: isElderMode ? '0.85rem' : '0.75rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>ศูนย์รวมความคืบหน้าโครงการสำหรับทุกฝ่าย</p>
            </div>
          </div>
          <div className="user-info" style={{ flexShrink: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: isElderMode ? '1rem' : '0.75rem', minWidth: 0 }}>
            {/* Elder Mode Toggle */}
            <div 
              onClick={() => onChangeElderMode(!isElderMode)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(255, 255, 255, 0.03)',
                border: isElderMode ? '1px solid var(--primary, #3B82F6)' : '1px solid var(--surface-border)',
                padding: isElderMode ? '0.4rem 0.8rem' : '0.3rem 0.6rem',
                borderRadius: '999px',
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'all 0.2s ease',
                marginRight: isElderMode ? '0.5rem' : '0.25rem'
              }}
              title="โหมดตัวอักษรใหญ่สำหรับผู้สูงอายุ"
            >
              <span style={{ fontSize: isElderMode ? '0.75rem' : '0.7rem', color: isElderMode ? 'var(--primary, #3B82F6)' : 'var(--text-secondary)', fontWeight: 600 }}>
                👵 ตัวอักษรใหญ่
              </span>
              <div style={{
                width: '28px',
                height: '16px',
                background: isElderMode ? 'var(--primary, #3B82F6)' : 'rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                position: 'relative',
                transition: 'all 0.2s ease',
                display: 'inline-block',
                verticalAlign: 'middle'
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  background: '#FFFFFF',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '2px',
                  left: isElderMode ? '14px' : '2px',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }} />
              </div>
            </div>

            {/* Theme Selector Widget */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--surface-border)',
              padding: isElderMode ? '0.4rem 0.8rem' : '0.3rem 0.6rem',
              borderRadius: '999px',
              marginRight: isElderMode ? '0.5rem' : '0.25rem'
            }}>
              <span style={{ fontSize: isElderMode ? '0.75rem' : '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>โทนสี:</span>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {themes.map(t => (
                  <button
                    key={t.id}
                    onClick={() => onChangeTheme(t.id)}
                    style={{
                      width: isElderMode ? '16px' : '14px',
                      height: isElderMode ? '16px' : '14px',
                      borderRadius: '50%',
                      backgroundColor: t.color,
                      border: theme === t.id ? '2px solid var(--text-primary)' : '1px solid var(--surface-border)',
                      cursor: 'pointer',
                      padding: 0,
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
            
            <span style={{ fontSize: isElderMode ? '1.1rem' : '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>สวัสดี, <strong>{user.name}</strong></span>
            <button className="btn" style={{ padding: isElderMode ? '0.8rem 1.6rem' : '0.4rem 0.95rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'auto', fontSize: isElderMode ? '1.05rem' : '0.9rem', height: isElderMode ? '45px' : '36px', flexShrink: 0 }} onClick={onLogout}>
              <LogOut size={isElderMode ? 20 : 16} /> ออกจากระบบ
            </button>
          </div>
        </header>

      {error && (
        <div style={{ background: 'var(--danger)', padding: '1rem', borderRadius: '12px', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={fetchTickets} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <RefreshCw size={16} /> ลองใหม่
          </button>
        </div>
      )}

      {/* Role specific description Banner */}
      <div className="glass" style={{ padding: '1.25rem', marginBottom: '2rem', borderLeft: '4px solid var(--primary)' }}>
        {effectiveRole === 'CEO' && (
          <p style={{ color: 'var(--text-primary)' }}>
            💡 <strong>สำหรับผู้บริหารสูงสุด (CEO / Executive):</strong> แสดงความคืบหน้าของโครงการหลักในภาพรวม ดัชนีความเสี่ยง สถานะสุขภาพโครงการ ประเมินมูลค่าทางธุรกิจที่ส่งมอบแล้ว และการกระจายทรัพยากรของทั้งทีมพัฒนา.
          </p>
        )}
        {effectiveRole === 'Manager' && (
          <p style={{ color: 'var(--text-primary)' }}>
            💡 <strong>สำหรับผู้จัดการ (Manager / PM):</strong> แสดงข้อมูลภาพรวมทั้งหมดในโครงการ คอยเฝ้าระวังความสมบูรณ์ของ Epic และคอขวด of Epic และคอขวดของแต่ละตั๋ว.
          </p>
        )}
        {effectiveRole === 'Developer' && (
          <p style={{ color: 'var(--text-primary)' }}>
            💡 <strong>สำหรับทีมผู้พัฒนา (Dev Team):</strong> คัดกรองเอาตั๋วประเภทการทำงานปกติ (Tasks & Subtasks) เพื่อให้ทีมดีเวลลอปเปอร์โฟกัสงานปฏิบัติการรายวันได้อย่างชัดเจน.
          </p>
        )}
        {effectiveRole === 'Sales' && (
          <p style={{ color: 'var(--text-primary)' }}>
            💡 <strong>สำหรับทีมฝ่ายขาย (Sales Team):</strong> แดชบอร์ดนี้สำหรับดูข้อมูลโครงการของฝ่าย Dev เท่านั้น กำหนดส่งในตารางคือวันที่งานฝั่ง Dev ต้องเสร็จสมบูรณ์ เพื่อให้ฝ่ายขายประสานงานจัดหาและกำหนดวันเวลานัดส่งมอบลูกค้าด้วยตนเอง (ไม่ใช่กำหนดวันส่งมอบลูกค้าโดยตรง).
          </p>
        )}
        {effectiveRole === 'Deployment' && (
          <p style={{ color: 'var(--text-primary)' }}>
            💡 <strong>สำหรับฝ่ายเดินทางติดตั้งหน้างาน (Deployment Team):</strong> แดชบอร์ดนี้สำหรับดูข้อมูลโครงการของฝ่าย Dev เท่านั้น กำหนดส่งในตารางคือวันที่งานฝั่ง Dev ต้องเสร็จสมบูรณ์ เพื่อให้ฝ่ายติดตั้งประสานงานจัดหาและกำหนดวันเวลาเดินทางติดตั้งด้วยตนเอง (ไม่ใช่กำหนดวันติดตั้งหน้างานจริง).
          </p>
        )}
        {effectiveRole === 'IT_Sub' && (
          <p style={{ color: 'var(--text-primary)' }}>
            💡 <strong>สำหรับฝ่าย IT Support และ Subcontractor (IT Sub Team):</strong> แสดงเฉพาะรายการงานระบบ IT, เครือข่าย และโครงสร้างพื้นฐาน (Tasks & Subtasks) เพื่อความสะดวกในการติดตามงานบำรุงรักษาและการติดตั้งอุปกรณ์ระบบอย่างรวดเร็ว.
          </p>
        )}
      </div>

      {/* Scope and Timeframe Selector */}
      {showTimeframeSelector && (
        <div className="glass animate-fade-in" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '0.85rem 1.5rem', 
          marginBottom: '2rem', 
          flexWrap: 'wrap', 
          gap: '1rem',
          borderLeft: '4px solid var(--primary)',
          boxShadow: 'var(--card-shadow)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={20} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '1.05rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              ขอบเขตข้อมูล: {
                timeFilter === 'today' ? 'ตั๋วงานประจำวันนี้ (Today)' :
                timeFilter === 'this-week' ? 'ตั๋วงานประจำสัปดาห์นี้ (This Week)' :
                timeFilter === 'this-month' ? 'ตั๋วงานที่สร้างหรือสำเร็จในเดือนนี้' :
                timeFilter === 'this-quarter' ? 'ตั๋วงานที่สร้างหรือสำเร็จในไตรมาสนี้' :
                'ตั๋วงานทั้งหมดตั้งแต่เริ่มโครงการ'
              }
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>ตัวกรองช่วงเวลา:</span>
            <select
              value={timeFilter}
              onChange={(e) => handleChangeTimeFilter(e.target.value)}
              style={{
                padding: '0.55rem 1.25rem',
                background: 'var(--bg-color)',
                border: '1px solid var(--surface-border)',
                borderRadius: '999px',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                fontWeight: '600',
                outline: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
              }}
            >
              <option value="today">งานวันนี้ (Today)</option>
              <option value="this-week">งานประจำสัปดาห์นี้ (This Week)</option>
              <option value="this-month">งานประจำเดือนนี้ (This Month)</option>
              <option value="this-quarter">งานประจำไตรมาสนี้ (This Quarter)</option>
              <option value="all">งานทั้งหมด (All Time)</option>
            </select>
          </div>
        </div>
      )}

      {/* Render selected view */}
      {loading ? (
        renderSkeleton()
      ) : effectiveRole === 'CEO' ? (
        renderCEOView()
      ) : (effectiveRole === 'Manager' || effectiveRole === 'Admin') ? (
        <>
          {pmTab === 'overview' && (
            <>
              {renderTop5Urgent()}

              {/* Stats Grid */}
              <div className="stats-grid">
                <div className="stat-card glass">
                  <span className="stat-title"><CheckCircle size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle', color: 'var(--success)' }}/>งานที่เสร็จแล้ว</span>
                  <span className="stat-value" style={{ color: 'var(--success)' }}>{done}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                    (Epic: {epicDone} | Task: {taskDone})
                  </span>
                </div>
                <div className="stat-card glass">
                  <span className="stat-title"><CheckSquare size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle', color: 'var(--status-inreview-color)' }}/>รอตรวจ</span>
                  <span className="stat-value" style={{ color: 'var(--status-inreview-color)' }}>{inReview}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                    (Epic: {epicInReview} | Task: {taskInReview})
                  </span>
                </div>
                <div className="stat-card glass">
                  <span className="stat-title"><Clock size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle', color: 'var(--primary)' }}/>กำลังทำ</span>
                  <span className="stat-value" style={{ color: 'var(--primary)' }}>{inProgress}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                    (Epic: {epicInProgress} | Task: {taskInProgress})
                  </span>
                </div>
                <div className="stat-card glass">
                  <span className="stat-title"><AlertCircle size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle', color: 'var(--text-secondary)' }}/>รอทำ (Backlog)</span>
                  <span className="stat-value" style={{ color: 'var(--text-secondary)' }}>{todo}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                    (Epic: {epicTodo} | Task: {taskTodo})
                  </span>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="charts-grid">
                {epicTickets.length > 0 && (
                  <div className="chart-card glass" style={{ height: '500px' }}>
                    <h3 style={{ marginBottom: '1.25rem', fontSize: '1.3rem' }}>สัดส่วนสถานะตั๋วระดับ Epic</h3>
                    <ResponsiveContainer width="100%" height="85%">
                      <PieChart>
                        <defs>
                          <linearGradient id="gradient-epic-Done" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={theme === 'theme-violet' ? '#10B981' : '#34D399'} />
                            <stop offset="100%" stopColor={theme === 'theme-violet' ? '#047857' : '#059669'} />
                          </linearGradient>
                          <linearGradient id="gradient-epic-InProgress" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={theme === 'theme-violet' ? '#60A5FA' : '#93C5FD'} />
                            <stop offset="100%" stopColor={theme === 'theme-violet' ? '#1D4ED8' : '#2563EB'} />
                          </linearGradient>
                          <linearGradient id="gradient-epic-InReview" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={theme === 'theme-violet' ? '#C084FC' : '#D8B4FE'} />
                            <stop offset="100%" stopColor={theme === 'theme-violet' ? '#6D28D9' : '#7C3AED'} />
                          </linearGradient>
                          <linearGradient id="gradient-epic-Todo" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={theme === 'theme-violet' ? '#9CA3AF' : '#D1D5DB'} />
                            <stop offset="100%" stopColor={theme === 'theme-violet' ? '#4B5563' : '#6B7280'} />
                          </linearGradient>
                        </defs>
                        <Pie data={epicChartData} innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value">
                          {epicChartData.map((entry, index) => {
                            const gradientIds = ['url(#gradient-epic-Done)', 'url(#gradient-epic-InProgress)', 'url(#gradient-epic-InReview)', 'url(#gradient-epic-Todo)'];
                            return <Cell key={`cell-${index}`} fill={gradientIds[index % gradientIds.length]} />;
                          })}
                        </Pie>
                        <Tooltip contentStyle={{ background: 'var(--bg-color)', border: '1px solid var(--surface-border)', borderRadius: '8px' }} />
                        <Legend formatter={renderLegendText} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="chart-card glass" style={{ height: '500px' }}>
                  <h3 style={{ marginBottom: '1.25rem', fontSize: '1.3rem' }}>สัดส่วนสถานะตั๋วระดับ Task / Story / Bug</h3>
                  <ResponsiveContainer width="100%" height="85%">
                    <PieChart>
                      <defs>
                        <linearGradient id="gradient-task-Done" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={theme === 'theme-violet' ? '#10B981' : '#34D399'} />
                          <stop offset="100%" stopColor={theme === 'theme-violet' ? '#047857' : '#059669'} />
                        </linearGradient>
                        <linearGradient id="gradient-task-InProgress" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={theme === 'theme-violet' ? '#60A5FA' : '#93C5FD'} />
                          <stop offset="100%" stopColor={theme === 'theme-violet' ? '#1D4ED8' : '#2563EB'} />
                        </linearGradient>
                        <linearGradient id="gradient-task-InReview" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={theme === 'theme-violet' ? '#C084FC' : '#D8B4FE'} />
                          <stop offset="100%" stopColor={theme === 'theme-violet' ? '#6D28D9' : '#7C3AED'} />
                        </linearGradient>
                        <linearGradient id="gradient-task-Todo" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={theme === 'theme-violet' ? '#9CA3AF' : '#D1D5DB'} />
                          <stop offset="100%" stopColor={theme === 'theme-violet' ? '#4B5563' : '#6B7280'} />
                        </linearGradient>
                      </defs>
                      <Pie data={taskChartData} innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value">
                        {taskChartData.map((entry, index) => {
                          const gradientIds = ['url(#gradient-task-Done)', 'url(#gradient-task-InProgress)', 'url(#gradient-task-InReview)', 'url(#gradient-task-Todo)'];
                          return <Cell key={`cell-${index}`} fill={gradientIds[index % gradientIds.length]} />;
                        })}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'var(--bg-color)', border: '1px solid var(--surface-border)', borderRadius: '8px' }} />
                      <Legend formatter={renderLegendText} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {renderSearchAndFilterBar()}
              {renderMainTable()}
            </>
          )}

          {pmTab === 'tree' && renderProjectTree()}

          {pmTab === 'workload' && renderDevWorkload()}

          {pmTab === 'activity' && renderActivityLogsTab()}

          {pmTab === 'team' && renderTeamMembersTab()}

          {pmTab === 'admin' && renderAdminPanel()}
        </>
      ) : (
        <>
          {/* Non-Manager Standard View */}
          <div className="stats-grid">
            {(effectiveRole === 'Sales' || effectiveRole === 'Deployment') ? (
              <>
                <div className="stat-card glass">
                  <span className="stat-title"><CheckCircle size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle', color: 'var(--success)' }}/>Epic ที่เสร็จสมบูรณ์</span>
                  <span className="stat-value" style={{ color: 'var(--success)' }}>{epicDone}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                    จากทั้งหมด {epicTickets.length} Epics ในช่วงเวลานี้
                  </span>
                </div>
                <div className="stat-card glass">
                  <span className="stat-title"><Clock size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle', color: 'var(--primary)' }}/>Epic ที่กำลังดำเนินงาน</span>
                  <span className="stat-value" style={{ color: 'var(--primary)' }}>{epicInProgress + epicInReview}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                    (กำลังทำ: {epicInProgress} | รอตรวจ: {epicInReview})
                  </span>
                </div>
                <div className="stat-card glass">
                  <span className="stat-title"><Folder size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle', color: 'var(--text-primary)' }}/>ความคืบหน้าภาพรวม Epics</span>
                  <span className="stat-value" style={{ color: 'var(--text-primary)' }}>
                    {epicTickets.length > 0 ? Math.round((epicDone / epicTickets.length) * 100) : 0}%
                  </span>
                  <div style={{ height: '4px', background: 'var(--surface-border)', borderRadius: '2px', overflow: 'hidden', marginTop: '0.75rem' }}>
                    <div style={{ width: `${epicTickets.length > 0 ? Math.round((epicDone / epicTickets.length) * 100) : 0}%`, height: '100%', background: 'var(--primary)' }}></div>
                  </div>
                </div>
                <div className="stat-card glass">
                  <span className="stat-title"><AlertCircle size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle', color: 'var(--text-secondary)' }}/>งานใหญ่ที่ยังไม่เริ่ม (Backlog)</span>
                  <span className="stat-value" style={{ color: 'var(--text-secondary)' }}>{epicTodo}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                    Epics สถานะ To Do
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="stat-card glass">
                  <span className="stat-title"><CheckCircle size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle', color: 'var(--success)' }}/>งานที่เสร็จแล้ว</span>
                  <span className="stat-value" style={{ color: 'var(--success)' }}>{done}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                    (Epic: {epicDone} | Task: {taskDone})
                  </span>
                </div>
                <div className="stat-card glass">
                  <span className="stat-title"><CheckSquare size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle', color: 'var(--status-inreview-color)' }}/>รอตรวจ</span>
                  <span className="stat-value" style={{ color: 'var(--status-inreview-color)' }}>{inReview}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                    (Epic: {epicInReview} | Task: {taskInReview})
                  </span>
                </div>
                <div className="stat-card glass">
                  <span className="stat-title"><Clock size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle', color: 'var(--primary)' }}/>กำลังทำ</span>
                  <span className="stat-value" style={{ color: 'var(--primary)' }}>{inProgress}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                    (Epic: {epicInProgress} | Task: {taskInProgress})
                  </span>
                </div>
                <div className="stat-card glass">
                  <span className="stat-title"><AlertCircle size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle', color: 'var(--text-secondary)' }}/>รอทำ (Backlog)</span>
                  <span className="stat-value" style={{ color: 'var(--text-secondary)' }}>{todo}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                    (Epic: {epicTodo} | Task: {taskTodo})
                  </span>
                </div>
              </>
            )}
          </div>

          {renderSearchAndFilterBar()}
          {renderMainTable()}
        </>
      )}

      </div> {/* Close container animate-fade-in */}

      {selectedTicketForDetail && (
        <div className="modal-overlay" onClick={() => setSelectedTicketForDetail(null)}>
          <div className="modal-content" ref={modalContentRef} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1280px', width: '95%', background: 'var(--bg-color)', border: '1px solid var(--surface-border)', padding: '2.5rem' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ 
                  background: 'var(--surface-hover-bg)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--surface-border)',
                  padding: '4px 10px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold'
                }}>
                  {selectedTicketForDetail.issuetype}
                </span>
                <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.1rem' }}>
                  {selectedTicketForDetail.key}
                </span>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedTicketForDetail(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-split-body">
              {/* Left Column: Summary & Description */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>หัวข้องาน (Summary)</label>
                  {isEditingTicket ? (
                    <input 
                      type="text" 
                      value={editedTicket.summary}
                      onChange={(e) => setEditedTicket({ ...editedTicket, summary: e.target.value })}
                      style={{ 
                        width: '100%', 
                        padding: '0.6rem 0.8rem', 
                        fontSize: '1.25rem', 
                        fontWeight: 'bold', 
                        background: 'var(--bg-color)', 
                        border: '1px solid var(--surface-border)', 
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                      }}
                    />
                  ) : (
                    <div 
                      onClick={() => !isReadOnlyRole && setIsEditingTicket(true)}
                      className={!isReadOnlyRole ? "hover-edit-field" : ""}
                      style={{ 
                        padding: '0.5rem 0.75rem', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                        marginLeft: '-0.75rem',
                        cursor: !isReadOnlyRole ? 'pointer' : 'default'
                      }}
                      title={!isReadOnlyRole ? "คลิกเพื่อแก้ไข" : undefined}
                    >
                      <h2 style={{ fontSize: '1.45rem', fontWeight: '700', color: 'var(--text-primary)', lineHeight: '1.4', margin: 0 }}>
                        {selectedTicketForDetail.summary}
                      </h2>
                      {!isReadOnlyRole && (
                        <span className="edit-icon" style={{ color: 'var(--text-secondary)' }}>
                          <Edit2 size={16} />
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, margin: 0 }}>
                  <label style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: '600', display: 'block', marginBottom: '0.50rem' }}>รายละเอียด (Description)</label>
                  {isEditingTicket ? (
                    <textarea
                      value={editedTicket.description || ''}
                      onChange={(e) => setEditedTicket({ ...editedTicket, description: e.target.value })}
                      rows={14}
                      style={{ resize: 'vertical', flexGrow: 1, minHeight: '380px' }}
                    />
                  ) : (
                    <div 
                      onClick={() => !isReadOnlyRole && setIsEditingTicket(true)}
                      className={!isReadOnlyRole ? "hover-edit-field" : ""}
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        position: 'relative',
                        cursor: !isReadOnlyRole ? 'pointer' : 'default'
                      }}
                      title={!isReadOnlyRole ? "คลิกเพื่อแก้ไข" : undefined}
                    >
                      <div style={{ 
                        background: 'var(--action-view-bg)', 
                        border: '1px solid var(--surface-border)', 
                        borderRadius: '8px', 
                        padding: '1.25rem', 
                        color: 'var(--text-primary)', 
                        fontSize: '1rem',
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap',
                        minHeight: '380px',
                        maxHeight: '620px',
                        overflowY: 'auto',
                        width: '100%'
                      }}>
                        {selectedTicketForDetail.description || <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>ไม่มีรายละเอียดในงานนี้</span>}
                      </div>
                      {!isReadOnlyRole && (
                        <span className="edit-icon" style={{ position: 'absolute', top: '10px', right: '10px', color: 'var(--text-secondary)', background: 'var(--bg-color)', padding: '4px', borderRadius: '4px', border: '1px solid var(--surface-border)' }}>
                          <Edit2 size={14} />
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Properties & Timeline */}
              <div className="modal-split-right">
                
                {/* Properties Panel */}
                <div 
                  onClick={() => !isReadOnlyRole && !isEditingTicket && setIsEditingTicket(true)}
                  className={(!isReadOnlyRole && !isEditingTicket) ? "hover-edit-field" : ""}
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '1.25rem', 
                    background: 'var(--surface)', 
                    border: '1px solid var(--surface-border)', 
                    borderRadius: '10px', 
                    padding: '1.25rem',
                    fontSize: '0.95rem',
                    cursor: (!isReadOnlyRole && !isEditingTicket) ? 'pointer' : 'default',
                    position: 'relative'
                  }}
                  title={(!isReadOnlyRole && !isEditingTicket) ? "คลิกเพื่อแก้ไข" : undefined}
                >
                  {!isReadOnlyRole && !isEditingTicket && (
                    <span className="edit-icon" style={{ position: 'absolute', top: '10px', right: '10px', color: 'var(--text-secondary)' }}>
                      <Edit2 size={14} />
                    </span>
                  )}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>สถานะ</label>
                    {isEditingTicket ? (
                      <select
                        value={editedTicket.status}
                        onChange={(e) => setEditedTicket({ ...editedTicket, status: e.target.value })}
                      >
                        <option value={selectedTicketForDetail.status}>{selectedTicketForDetail.status}</option>
                        {availableTransitions.map(t => (
                          t.name !== selectedTicketForDetail.status && <option key={t.id} value={t.name}>{t.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`status-badge status-${selectedTicketForDetail.status.toLowerCase().includes('done') ? 'done' : selectedTicketForDetail.status.toLowerCase().includes('progress') ? 'inprogress' : 'todo'}`} style={{ display: 'inline-block', marginTop: '0.25rem' }}>
                        {selectedTicketForDetail.status}
                      </span>
                    )}
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>ผู้รับผิดชอบ</label>
                    {isEditingTicket ? (
                      <select
                        value={editedTicket.assignee}
                        onChange={(e) => setEditedTicket({ ...editedTicket, assignee: e.target.value })}
                        style={{ fontWeight: 'bold' }}
                      >
                        <option value="Unassigned">Unassigned (ยังไม่มอบหมาย)</option>
                        {teamMembers.map((m, idx) => (
                          <option key={idx} value={m.jiraDisplayName}>{m.jiraDisplayName} ({m.nickname})</option>
                        ))}
                        {selectedTicketForDetail.assignee !== 'Unassigned' && !teamMembers.some(m => m.jiraDisplayName === selectedTicketForDetail.assignee) && (
                          <option value={selectedTicketForDetail.assignee}>{selectedTicketForDetail.assignee}</option>
                        )}
                      </select>
                    ) : (
                      <strong style={{ color: 'var(--text-primary)', display: 'block', marginTop: '0.25rem' }}>{selectedTicketForDetail.assignee}</strong>
                    )}
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>ความสำคัญ</label>
                    {isEditingTicket ? (
                      <select
                        value={editedTicket.priority}
                        onChange={(e) => setEditedTicket({ ...editedTicket, priority: e.target.value })}
                      >
                        <option value="Highest">Highest</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                        <option value="Lowest">Lowest</option>
                      </select>
                    ) : (
                      <div style={{ marginTop: '0.25rem' }}>
                        {getPriorityElement(selectedTicketForDetail.priority)}
                      </div>
                    )}
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>กำหนดส่ง</label>
                    {isEditingTicket ? (
                      <input 
                        type="date"
                        value={editedTicket.duedate || ''}
                        onChange={(e) => setEditedTicket({ ...editedTicket, duedate: e.target.value })}
                        style={{ fontWeight: 'bold' }}
                      />
                    ) : (
                      <strong style={{ color: 'var(--text-primary)', display: 'block', marginTop: '0.25rem' }}>{selectedTicketForDetail.duedate ? formatDateBE(selectedTicketForDetail.duedate) : 'ไม่ได้ระบุ'}</strong>
                    )}
                  </div>
                </div>

                {/* Timeline Work Log */}
                <div style={{ 
                  background: 'var(--surface)', 
                  border: '1px solid var(--surface-border)', 
                  borderRadius: '10px', 
                  padding: '1.25rem',
                  fontSize: '0.95rem',
                  maxHeight: '380px',
                  overflowY: 'auto'
                }}>
                  <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={16} style={{ color: 'var(--primary)' }} />
                    บันทึกประวัติการทำงาน (Work Log)
                  </h3>
                  
                  {loadingChangelog ? (
                    <div style={{ color: 'var(--text-secondary)', padding: '0.5rem 0', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <RefreshCw size={14} className="animate-spin" /> กำลังดึงประวัติ...
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingLeft: '0.75rem', borderLeft: '2px solid var(--surface-border)', marginLeft: '0.5rem' }}>
                      
                      {/* 1. Created At Node */}
                      <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '-17px', top: '6px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--text-secondary)' }}></div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem', marginBottom: '0.1rem' }}>เริ่มสร้างงาน (Created)</span>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>{formatDateTime(selectedTicketForDetail.created) || 'ไม่พบข้อมูล'}</strong>
                      </div>
   
                      {/* 2. Transition Changelog Entries */}
                      {ticketChangelog && [...ticketChangelog].reverse().map((change, cIdx) => (
                        <div key={cIdx} style={{ position: 'relative' }}>
                          <div style={{ 
                            position: 'absolute', 
                            left: '-17px', 
                            top: '6px', 
                            width: '10px', 
                            height: '10px', 
                            borderRadius: '50%', 
                            background: 'var(--text-secondary)'
                          }}></div>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem', marginBottom: '0.1rem' }}>
                            เปลี่ยนสถานะเป็น "{change.to}" (ย้ายจาก "{change.from}")
                          </span>
                          <div style={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                            โดย <strong style={{ color: 'var(--text-primary)' }}>{change.author}</strong> เมื่อ {formatDateTime(change.created)}
                          </div>
                        </div>
                      ))}
                      
                      {/* 3. Current Status Node */}
                      <div style={{ position: 'relative' }}>
                        <div style={{ 
                          position: 'absolute', 
                          left: '-17px', 
                          top: '6px', 
                          width: '10px', 
                          height: '10px', 
                          borderRadius: '50%', 
                          background: selectedTicketForDetail.status.toLowerCase().includes('done') ? 'var(--text-primary)' : 
                                      (selectedTicketForDetail.status.toLowerCase().includes('todo') || selectedTicketForDetail.status.toLowerCase().includes('to do') || selectedTicketForDetail.status.toLowerCase().includes('backlog')) ? 'var(--text-secondary)' : 
                                      selectedTicketForDetail.status.toLowerCase().includes('review') ? 'var(--status-inreview-color)' : 'var(--text-primary)', 
                          boxShadow: selectedTicketForDetail.status.toLowerCase().includes('done') ? '0 0 8px var(--text-primary)' : 'none'
                        }}></div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem', marginBottom: '0.1rem' }}>สถานะส่งงาน / เสร็จสิ้น (Submission Status)</span>
                        {selectedTicketForDetail.status.toLowerCase().includes('done') ? (
                          <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: '0.875rem' }}>
                            [ส่งงานเสร็จสิ้น] เมื่อ {formatDateTime(selectedTicketForDetail.resolved) || formatDateTime(selectedTicketForDetail.created)}
                          </strong>
                        ) : (selectedTicketForDetail.status.toLowerCase().includes('todo') || selectedTicketForDetail.status.toLowerCase().includes('to do') || selectedTicketForDetail.status.toLowerCase().includes('backlog')) ? (
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 'bold', display: 'block', fontSize: '0.875rem' }}>
                            [รอทำ] (กำหนดส่ง: {formatDateBE(selectedTicketForDetail.duedate) || 'ไม่ได้ระบุ'})
                          </span>
                        ) : selectedTicketForDetail.status.toLowerCase().includes('review') ? (
                          <span style={{ color: 'var(--status-inreview-color)', fontWeight: 'bold', display: 'block', fontSize: '0.875rem' }}>
                            [รอตรวจ] (กำหนดส่ง: {formatDateBE(selectedTicketForDetail.duedate) || 'ไม่ได้ระบุ'})
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', display: 'block', fontSize: '0.875rem' }}>
                            [กำลังทำ] (กำหนดส่ง: {formatDateBE(selectedTicketForDetail.duedate) || 'ไม่ได้ระบุ'})
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--surface-border)', paddingTop: '1.25rem' }}>
              {isEditingTicket ? (
                <>
                  <button 
                    className="btn" 
                    onClick={() => setIsEditingTicket(false)}
                    disabled={isSavingTicket}
                    style={{ 
                      width: 'auto', 
                      margin: 0, 
                      padding: '0.7rem 1.75rem', 
                      fontSize: '0.95rem', 
                      background: 'rgba(255,255,255,0.05)',
                      opacity: isSavingTicket ? 0.5 : 1,
                      cursor: isSavingTicket ? 'not-allowed' : 'pointer'
                    }}
                  >
                    ยกเลิก
                  </button>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleSaveTicketEdits}
                    disabled={isSavingTicket}
                    style={{ 
                      width: 'auto', 
                      margin: 0, 
                      padding: '0.7rem 1.75rem', 
                      fontSize: '0.95rem',
                      opacity: isSavingTicket ? 0.7 : 1,
                      cursor: isSavingTicket ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {isSavingTicket ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        กำลังบันทึก...
                      </>
                    ) : (
                      'บันทึกการแก้ไข'
                    )}
                  </button>
                </>
              ) : (
                <>
                  {!isReadOnlyRole && (
                    <button 
                      className="btn" 
                      onClick={() => setIsEditingTicket(true)}
                      style={{ width: 'auto', margin: 0, padding: '0.7rem 1.75rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.05)' }}
                    >
                      <Edit2 size={16} /> แก้ไขข้อมูลงาน
                    </button>
                  )}
                  <button 
                    className="btn btn-primary" 
                    onClick={() => setSelectedTicketForDetail(null)}
                    style={{ width: 'auto', margin: 0, padding: '0.7rem 1.75rem', fontSize: '0.95rem' }}
                  >
                    ปิดหน้าต่าง
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {isSavingTicket && (
        <div className="modal-overlay" style={{ zIndex: 2000, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)' }}>
          <div className="modal-content" style={{
            maxWidth: '360px',
            textAlign: 'center',
            padding: '2.5rem 2rem',
            background: 'var(--bg-color)',
            border: '1px solid var(--surface-border)',
            borderRadius: '16px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'var(--surface-hover-bg)',
              border: '2px dashed var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'spin 4s linear infinite',
              position: 'relative'
            }}>
              <span style={{ 
                fontSize: '2.8rem', 
                animation: 'spin 1.2s linear infinite',
                display: 'inline-block'
              }}>🧠</span>
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                กำลังบันทึกลงบน Jira...
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                ผู้ช่วย AI กำลังปั่นข้อมูลบันทึกลงบน Jira Cloud กรุณารอสักครู่
              </p>
            </div>
          </div>
        </div>
      )}

      {showSuccessNotification && (
        <div className="modal-overlay" style={{ zIndex: 2100, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(6px)' }}>
          <div className="modal-content animate-fade-in" style={{
            maxWidth: '340px',
            textAlign: 'center',
            padding: '2.5rem 2rem',
            background: 'var(--bg-color)',
            border: '1px solid var(--surface-border)',
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.25rem'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '2px solid rgb(16, 185, 129)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgb(16, 185, 129)',
              animation: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}>
              <CheckCircle size={32} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                บันทึกสำเร็จ!
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                ข้อมูลของคุณถูกอัปเดตลงบน Jira Cloud เรียบร้อยแล้ว
              </p>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={() => setShowSuccessNotification(false)}
              style={{ width: '100%', margin: 0, padding: '0.65rem 0', fontSize: '0.95rem' }}
            >
              ตกลง
            </button>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}

export default Dashboard;
