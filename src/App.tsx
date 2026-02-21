/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  School, 
  ClipboardCheck, 
  Package, 
  Settings, 
  Search, 
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  QrCode,
  UserPlus,
  ArrowLeftRight,
  Menu,
  X,
  UserCog,
  ShieldCheck,
  FileUp,
  Printer,
  ScanLine,
  Lock,
  PlayCircle,
  UserCheck,
  UserX,
  Trash2,
  Edit,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeCanvas } from 'qrcode.react';
import * as XLSX from 'xlsx';

// Types
interface User {
  id: number;
  name: string;
  role: 'مدير' | 'عضو كنترول' | 'مراقب';
  username: string;
}
interface Stats {
  totalStudents: number;
  totalRooms: number;
  presentToday: number;
  absentToday: number;
}

interface Room {
  id: number;
  name: string;
  capacity: number;
  location?: string;
}

interface Student {
  id: number;
  name: string;
  academic_id: string;
  grade: string;
}

interface RoomOccupancy extends Room {
  current_occupancy: number;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'error' | 'info';
  timestamp: string;
  isRead: boolean;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roomOccupancy, setRoomOccupancy] = useState<RoomOccupancy[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [selectedRoomForQR, setSelectedRoomForQR] = useState<Room | null>(null);
  const [isScanningEnvelope, setIsScanningEnvelope] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [userFormData, setUserFormData] = useState({ name: '', username: '', password: '', role: 'عضو كنترول' });
  const [roomFormData, setRoomFormData] = useState({ name: '', capacity: 20, location: '' });
  const [studentFormData, setStudentFormData] = useState({ name: '', academic_id: '', grade: '' });
  const [logisticsData, setLogisticsData] = useState([
    { id: 1, room: 'القاعة الكبرى', subject: 'الرياضيات', status: 'تم التسليم', time: '07:45 ص', proctor: 'أ. عبدالله' },
    { id: 2, room: 'مختبر الحاسب', subject: 'الرياضيات', status: 'قيد الانتظار', time: '--:--', proctor: 'أ. ليلى' },
    { id: 3, room: 'القاعة 101', subject: 'الرياضيات', status: 'تم التسليم', time: '07:50 ص', proctor: 'أ. خالد' },
  ]);
  const [isRoomUnlocked, setIsRoomUnlocked] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, roomsRes, studentsRes, usersRes, occupancyRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/rooms'),
        fetch('/api/students'),
        fetch('/api/users'),
        fetch('/api/rooms/occupancy')
      ]);
      
      const statsData = await statsRes.json();
      const roomsData = await roomsRes.json();
      const studentsData = await studentsRes.json();
      const usersData = await usersRes.json();
      const occupancyData = await occupancyRes.json();

      setStats(statsData);
      setRooms(roomsData);
      setStudents(studentsData);
      setUsers(usersData);
      setRoomOccupancy(occupancyData);

      // Generate notifications based on occupancy
      const newNotifications: Notification[] = [];
      occupancyData.forEach((room: RoomOccupancy) => {
        const occupancyRate = (room.current_occupancy / room.capacity) * 100;
        if (occupancyRate >= 90) {
          newNotifications.push({
            id: `room-${room.id}-capacity`,
            title: 'تنبيه سعة القاعة',
            message: `القاعة "${room.name}" اقتربت من سعتها القصوى (${room.current_occupancy}/${room.capacity})`,
            type: occupancyRate >= 100 ? 'error' : 'warning',
            timestamp: new Date().toLocaleTimeString('ar-SA'),
            isRead: false
          });
        }
      });
      setNotifications(newNotifications);
      
      if (usersData.length > 0) {
        // Find the specific main admin if exists, otherwise take the first user
        const mainAdmin = usersData.find((u: User) => u.username === '1027594579');
        const initialUser = mainAdmin || usersData[0];
        
        setCurrentUser(initialUser);
        
        // Set initial tab based on role
        const allowedTabs = navItems.filter(item => item.roles.includes(initialUser.role)).map(item => item.id);
        if (!allowedTabs.includes(activeTab)) {
          setActiveTab(allowedTabs[0]);
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, roles: ['مدير', 'عضو كنترول'] },
    { id: 'rooms', label: 'اللجان والقاعات', icon: School, roles: ['مدير', 'عضو كنترول'] },
    { id: 'students', label: 'الطلاب', icon: Users, roles: ['مدير', 'عضو كنترول'] },
    { id: 'attendance', label: 'التحضير الذكي', icon: ClipboardCheck, roles: ['مدير', 'عضو كنترول', 'مراقب'] },
    { id: 'logistics', label: 'اللوجستيات', icon: Package, roles: ['مدير', 'عضو كنترول'] },
    { id: 'staff', label: 'أعضاء الكنترول', icon: UserCog, roles: ['مدير'] },
    { id: 'settings', label: 'الإعدادات', icon: Settings, roles: ['مدير'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(currentUser?.role || ''));

  const handlePrint = () => {
    window.print();
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls, .csv';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        if (confirm(`تم العثور على ${data.length} سجل. هل تريد استيرادها كطلاب؟ (إلغاء للاستيراد كقاعات)`)) {
          // Import as students
          const students = data.map((item: any) => ({
            name: item['الاسم'] || item['Name'] || item['name'],
            academic_id: String(item['الرقم الأكاديمي'] || item['ID'] || item['id']),
            grade: item['الصف'] || item['Grade'] || item['grade']
          }));
          await fetch('/api/students/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(students)
          });
        } else {
          // Import as rooms
          const rooms = data.map((item: any) => ({
            name: item['اسم القاعة'] || item['Room Name'] || item['name'],
            capacity: Number(item['السعة'] || item['Capacity'] || item['capacity']),
            location: item['الموقع'] || item['Location'] || item['location']
          }));
          await fetch('/api/rooms/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rooms)
          });
        }
        fetchData();
        alert('تم الاستيراد بنجاح');
      };
      reader.readAsBinaryString(file);
    };
    input.click();
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingRoom ? `/api/rooms/${editingRoom.id}` : '/api/rooms';
      const method = editingRoom ? 'PUT' : 'POST';
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomFormData)
      });
      fetchData();
      setIsRoomModalOpen(false);
    } catch (err) {
      alert('خطأ في حفظ القاعة');
    }
  };

  const handleDeleteRoom = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه القاعة؟')) return;
    await fetch(`/api/rooms/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingStudent ? `/api/students/${editingStudent.id}` : '/api/students';
      const method = editingStudent ? 'PUT' : 'POST';
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentFormData)
      });
      fetchData();
      setIsStudentModalOpen(false);
    } catch (err) {
      alert('خطأ في حفظ الطالب');
    }
  };

  const handleDeleteStudent = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطالب؟')) return;
    await fetch(`/api/students/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
        setIsLoggedIn(true);
        // Set initial tab based on role
        const allowedTabs = navItems.filter(item => item.roles.includes(user.role)).map(item => item.id);
        setActiveTab(allowedTabs[0]);
      } else {
        const data = await res.json();
        setLoginError(data.error || 'فشل تسجيل الدخول');
      }
    } catch (err) {
      console.error('Login fetch error:', err);
      setLoginError('خطأ في الاتصال بالخادم. يرجى الانتظار ثوانٍ والمحاولة مرة أخرى.');
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userFormData)
      });
      if (res.ok) {
        fetchData();
        setIsUserModalOpen(false);
        setEditingUser(null);
        setUserFormData({ name: '', username: '', password: '', role: 'عضو كنترول' });
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err) {
      alert('خطأ في حفظ البيانات');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err) {
      alert('خطأ في الحذف');
    }
  };

  const handleEnvelopeScan = () => {
    setIsScanningEnvelope(true);
    // Simulate scan success after 2 seconds
    setTimeout(() => {
      const pendingIndex = logisticsData.findIndex(item => item.status === 'قيد الانتظار');
      if (pendingIndex !== -1) {
        const newData = [...logisticsData];
        newData[pendingIndex] = {
          ...newData[pendingIndex],
          status: 'تم التسليم',
          time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
          proctor: currentUser?.name || 'مراقب'
        };
        setLogisticsData(newData);
        alert(`تم تسليم ظرف ${newData[pendingIndex].room} بنجاح!`);
      }
      setIsScanningEnvelope(false);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">جاري تحميل النظام...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans p-4" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100"
        >
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
              <ShieldCheck size={40} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">تسجيل الدخول للنظام</h1>
            <p className="text-slate-500 mt-2">نظام إدارة الاختبارات اللوجستي</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">اسم المستخدم</label>
              <input 
                type="text"
                required
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="أدخل اسم المستخدم..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">كلمة المرور</label>
              <input 
                type="password"
                required
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="••••••••"
              />
            </div>

            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-lg text-center">
                {loginError}
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              دخول النظام
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-50 text-center">
            <p className="text-xs text-slate-400">المدير العام: 1027594579 | كلمة المرور: admin123</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex font-sans relative overflow-hidden">
      {/* Background Decoration - Luxury Theme */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] bg-indigo-900/20 rounded-full blur-[160px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-slate-900/40 rounded-full blur-[160px]"></div>
        <div className="absolute top-[30%] left-[20%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[140px]"></div>
      </div>

      {/* Sidebar */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } bg-slate-900/80 backdrop-blur-2xl border-l border-slate-800 transition-all duration-500 flex flex-col z-50 relative shadow-[10px_0_30px_-15px_rgba(0,0,0,0.3)]`}
      >
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col"
            >
              <span className="text-xl font-black text-white tracking-tighter">نظام الكنترول</span>
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">ثانوية الفضيلة الأولى</span>
            </motion.div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-all"
          >
            {isSidebarOpen ? <Menu size={20} /> : <Menu size={20} className="rotate-90" />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {filteredNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-300 ${
                activeTab === item.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <item.icon size={20} />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="w-full flex items-center gap-3 p-3 text-slate-400">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
              currentUser?.role === 'مدير' ? 'bg-indigo-600' : 'bg-emerald-600'
            }`}>
              {currentUser?.name[0]}
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col text-right flex-1">
                <span className="text-sm font-semibold text-slate-200">{currentUser?.name}</span>
                <span className="text-xs text-slate-500">{currentUser?.role}</span>
              </div>
            )}
            {isSidebarOpen && (
              <button 
                onClick={() => setIsLoggedIn(false)}
                className="p-1.5 hover:bg-rose-900/30 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                title="تسجيل الخروج"
              >
                <ArrowLeftRight size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Header */}
        <header className="h-20 bg-slate-900/40 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-8">
          <div className="flex items-center gap-6 flex-1">
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-white">ثانوية الفضيلة الأولى بجدة</h1>
              <p className="text-xs text-slate-400">نظام إدارة الاختبارات والكنترول</p>
            </div>
            <div className="relative w-72">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="text" 
                placeholder="بحث..."
                className="w-full pr-10 pl-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-300 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 text-slate-400 hover:bg-slate-800 rounded-xl relative"
              >
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className="absolute top-2 left-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-slate-900"></span>
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute left-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-[60] overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                      <h3 className="font-bold text-white">التنبيهات</h3>
                      <span className="text-xs text-indigo-400 font-medium">{notifications.length} تنبيه جديد</span>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notif) => (
                          <div key={notif.id} className="p-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors flex gap-3">
                            <div className={`mt-1 p-1.5 rounded-full ${
                              notif.type === 'error' ? 'bg-rose-900/30 text-rose-400' : 
                              notif.type === 'warning' ? 'bg-amber-900/30 text-amber-400' : 'bg-indigo-900/30 text-indigo-400'
                            }`}>
                              {notif.type === 'error' ? <XCircle size={14} /> : <Bell size={14} />}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-white">{notif.title}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{notif.message}</p>
                              <p className="text-[10px] text-slate-500 mt-1">{notif.timestamp}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-slate-500">
                          <p className="text-sm">لا توجد تنبيهات جديدة</p>
                        </div>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <button 
                        onClick={() => setNotifications([])}
                        className="w-full py-3 text-xs text-slate-400 hover:bg-slate-800 transition-colors border-t border-slate-800"
                      >
                        مسح الكل
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="h-8 w-px bg-slate-800 mx-2"></div>
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-white">السبت، 21 فبراير</span>
              <span className="text-xs text-slate-500">12:12 مساءً</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8 no-print"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">مرحباً بك، {currentUser?.name}</h1>
                    <p className="text-slate-400 mt-1">نظام الكنترول - ثانوية الفضيلة الأولى بجدة</p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={handleImport}
                      className="flex items-center gap-2 bg-slate-800 text-white px-6 py-3 rounded-2xl hover:bg-slate-700 transition-all border border-slate-700 shadow-xl"
                    >
                      <FileUp size={20} />
                      <span className="font-bold">استيراد البيانات</span>
                    </button>
                    <button className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-900/40">
                      <PlayCircle size={20} />
                      <span className="font-bold">بدء التحضير</span>
                    </button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'إجمالي الطلاب', value: stats?.totalStudents || 0, icon: Users, color: 'bg-indigo-900/30 text-indigo-400' },
                    { label: 'حاضرون الآن', value: stats?.presentToday || 0, icon: UserCheck, color: 'bg-emerald-900/30 text-emerald-400' },
                    { label: 'غائبون', value: stats?.absentToday || 0, icon: UserX, color: 'bg-rose-900/30 text-rose-400' },
                    { label: 'اللجان النشطة', value: stats?.totalRooms || 0, icon: School, color: 'bg-amber-900/30 text-amber-400' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-slate-900/60 backdrop-blur-sm p-6 rounded-3xl border border-slate-800 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-2xl ${stat.color}`}>
                          <stat.icon size={24} />
                        </div>
                        <span className="text-xs font-bold text-slate-500">محدث الآن</span>
                      </div>
                      <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
                      <h3 className="text-3xl font-black text-white mt-1">{stat.value}</h3>
                    </div>
                  ))}
                </div>

                {/* Secondary Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Active Rooms */}
                  <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-sm rounded-3xl border border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                      <h2 className="font-bold text-white">حالة اللجان الحالية</h2>
                      <button className="text-indigo-400 text-sm font-bold hover:underline">عرض الكل</button>
                    </div>
                    <div className="divide-y divide-slate-800">
                      {roomOccupancy.slice(0, 5).map((room) => (
                        <div key={room.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
                              <School size={20} />
                            </div>
                            <div>
                              <p className="font-bold text-white">{room.name}</p>
                              <p className="text-xs text-slate-500">السعة: {room.capacity} طالب</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-left">
                              <p className="text-sm font-bold text-slate-200">{room.current_occupancy} / {room.capacity}</p>
                              <div className="w-24 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    (room.current_occupancy/room.capacity) >= 0.9 ? 'bg-amber-500' : 'bg-indigo-500'
                                  }`} 
                                  style={{ width: `${(room.current_occupancy / room.capacity) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-slate-900/60 backdrop-blur-sm rounded-3xl border border-slate-800 shadow-sm p-6">
                    <h2 className="font-bold text-white mb-6">آخر التنبيهات</h2>
                    <div className="space-y-6">
                      {notifications.length > 0 ? (
                        notifications.slice(0, 4).map((notif) => (
                          <div key={notif.id} className="flex gap-4 p-4 bg-slate-800/30 rounded-2xl border border-slate-800/50">
                            <div className={`p-2 rounded-xl h-fit ${
                              notif.type === 'error' ? 'bg-rose-900/30 text-rose-400' : 'bg-amber-900/30 text-amber-400'
                            }`}>
                              <Bell size={18} />
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm">{notif.title}</p>
                              <p className="text-xs text-slate-400 mt-1">{notif.message}</p>
                              <p className="text-[10px] text-slate-500 mt-2">{notif.timestamp}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                          <Bell size={40} className="opacity-20 mb-4" />
                          <p>لا توجد تنبيهات نشطة</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'rooms' && (
              <motion.div
                key="rooms"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between no-print">
                  <div>
                    <h1 className="text-2xl font-bold text-white">إدارة اللجان والقاعات</h1>
                    <p className="text-slate-400">تعريف القاعات وتوزيع الطلاب آلياً</p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={handlePrint}
                      className="flex items-center gap-2 border border-slate-700 bg-slate-800 text-slate-300 px-4 py-2 rounded-xl hover:bg-slate-700 transition-colors"
                    >
                      <Printer size={18} />
                      <span>طباعة الكشوف</span>
                    </button>
                    <button 
                      onClick={() => {
                        setEditingRoom(null);
                        setRoomFormData({ name: '', capacity: 20, location: '' });
                        setIsRoomModalOpen(true);
                      }}
                      className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-900/40"
                    >
                      <UserPlus size={18} />
                      <span>إضافة قاعة</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {roomOccupancy.map((room) => {
                    const occupancyRate = (room.current_occupancy / room.capacity) * 100;
                    const isNearCapacity = occupancyRate >= 90;
                    
                    return (
                      <div key={room.id} className={`bg-slate-900/60 backdrop-blur-sm p-6 rounded-2xl border ${isNearCapacity ? 'border-amber-500/30 bg-amber-900/10' : 'border-slate-800'} shadow-sm card transition-all hover:shadow-md group`}>
                        <div className="flex justify-between items-start mb-4 no-print">
                          <div className={`p-3 rounded-xl ${isNearCapacity ? 'bg-amber-900/30 text-amber-400' : 'bg-indigo-900/30 text-indigo-400'}`}>
                            <School size={24} />
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex gap-1">
                              <span className={`w-2 h-2 rounded-full ${isNearCapacity ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                {isNearCapacity ? 'سعة حرجة' : 'نشطة'}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  setEditingRoom(room);
                                  setRoomFormData({ name: room.name, capacity: room.capacity, location: room.location || '' });
                                  setIsRoomModalOpen(true);
                                }}
                                className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-500 hover:text-indigo-400"
                              >
                                <Settings size={18} />
                              </button>
                              <button 
                                onClick={() => setSelectedRoomForQR(room)}
                                className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-500 hover:text-indigo-400"
                                title="عرض باركود اللجنة"
                              >
                                <QrCode size={18} />
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-xl font-bold text-white">{room.name}</h3>
                            <p className="text-sm text-slate-500">{room.location || 'لا يوجد موقع محدد'}</p>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">نسبة الإشغال</span>
                              <span className={`font-bold ${isNearCapacity ? 'text-amber-400' : 'text-slate-200'}`}>
                                {room.current_occupancy} / {room.capacity}
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden no-print">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  occupancyRate >= 100 ? 'bg-rose-500' : 
                                  occupancyRate >= 90 ? 'bg-amber-500' : 'bg-indigo-500'
                                }`}
                                style={{ width: `${Math.min(occupancyRate, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {activeTab === 'attendance' && (
              <motion.div
                key="attendance"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                <div className="text-center space-y-2">
                  <h1 className="text-3xl font-black text-white tracking-tight">التحضير الذكي للطلاب</h1>
                  <p className="text-slate-400">
                    {currentUser?.role === 'مراقب' && !isRoomUnlocked
                      ? 'امسح باركود اللجنة أولاً لفتح صلاحية التحضير' 
                      : 'امسح رمز QR الخاص بالطالب لتحضيره فوراً'}
                  </p>
                </div>

                <div className="bg-slate-900/60 backdrop-blur-sm p-8 rounded-[40px] border border-slate-800 shadow-2xl flex flex-col items-center relative overflow-hidden">
                  {currentUser?.role === 'مراقب' && !isRoomUnlocked && (
                    <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-amber-900/30 text-amber-400 rounded-full text-xs font-bold border border-amber-500/20">
                      <Lock size={14} />
                      <span>اللجنة مقفلة</span>
                    </div>
                  )}
                  {currentUser?.role === 'مراقب' && isRoomUnlocked && (
                    <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-emerald-900/30 text-emerald-400 rounded-full text-xs font-bold border border-emerald-500/20">
                      <ShieldCheck size={14} />
                      <span>اللجنة مفتوحة</span>
                    </div>
                  )}

                  <div className="w-64 h-64 bg-slate-950 rounded-3xl relative flex items-center justify-center overflow-hidden mb-8 border border-slate-800 shadow-inner">
                    {/* Simulated Camera View */}
                    <div className="absolute inset-0 opacity-20 bg-gradient-to-t from-indigo-500 to-transparent"></div>
                    {currentUser?.role === 'مراقب' && !isRoomUnlocked ? (
                      <ScanLine size={120} className="text-white opacity-10" />
                    ) : (
                      <QrCode size={120} className="text-white opacity-10" />
                    )}
                    <div className="absolute inset-8 border-2 border-indigo-500/50 rounded-2xl animate-pulse"></div>
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-indigo-400 shadow-[0_0_20px_rgba(129,140,248,1)] animate-scan"></div>
                  </div>

                  <div className="w-full max-w-md space-y-4">
                    {currentUser?.role === 'مراقب' && !isRoomUnlocked ? (
                      <button 
                        onClick={() => {
                          setLoading(true);
                          setTimeout(() => {
                            setIsRoomUnlocked(true);
                            setLoading(false);
                          }, 1500);
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-amber-600 text-white py-4 rounded-2xl font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-900/40"
                      >
                        <ScanLine size={20} />
                        <span>مسح باركود اللجنة (القاعة)</span>
                      </button>
                    ) : (
                      <>
                        <div className="relative">
                          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                          <input 
                            type="text" 
                            placeholder="أدخل الرقم الأكاديمي يدوياً..."
                            className="w-full pr-10 pl-4 py-4 bg-slate-800/50 border border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-center font-bold tracking-widest text-white"
                          />
                        </div>
                        <button className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-900/40">
                          تحضير يدوي
                        </button>
                        {currentUser?.role === 'مراقب' && (
                          <button 
                            onClick={() => setIsRoomUnlocked(false)}
                            className="w-full text-slate-500 text-xs hover:text-slate-300 hover:underline transition-colors"
                          >
                            إغلاق اللجنة والعودة للمسح
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {(currentUser?.role !== 'مراقب' || isRoomUnlocked) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-emerald-900/20 p-6 rounded-3xl border border-emerald-500/20 flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-900/40">
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <p className="text-sm text-emerald-400 font-medium">تم التحضير بنجاح</p>
                        <p className="text-2xl font-black text-white">142 طالب</p>
                      </div>
                    </div>
                    <div className="bg-rose-900/20 p-6 rounded-3xl border border-rose-500/20 flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-rose-600 text-white shadow-lg shadow-rose-900/40">
                        <Clock size={24} />
                      </div>
                      <div>
                        <p className="text-sm text-rose-400 font-medium">بانتظار التحضير</p>
                        <p className="text-2xl font-black text-white">18 طالب</p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'students' && (
              <motion.div
                key="students"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-white">إدارة الطلاب</h1>
                    <p className="text-slate-400">قائمة الطلاب المسجلين في النظام</p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={handleImport}
                      className="flex items-center gap-2 border border-slate-700 bg-slate-800 text-slate-300 px-4 py-2 rounded-xl hover:bg-slate-700 transition-colors"
                    >
                      <FileUp size={18} />
                      <span>استيراد Excel</span>
                    </button>
                    <button 
                      onClick={() => {
                        setEditingStudent(null);
                        setStudentFormData({ name: '', academic_id: '', grade: '' });
                        setIsStudentModalOpen(true);
                      }}
                      className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-900/40"
                    >
                      <UserPlus size={18} />
                      <span>إضافة طالب</span>
                    </button>
                  </div>
                </div>

                <div className="bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
                  <table className="w-full text-right">
                    <thead className="bg-slate-800/50 border-b border-slate-800">
                      <tr>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-400">الاسم</th>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-400">الرقم الأكاديمي</th>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-400">الصف</th>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-400">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {students.map((student) => (
                        <tr key={student.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-900/50 flex items-center justify-center text-indigo-400 font-bold text-xs">
                                {student.name[0]}
                              </div>
                              <span className="font-medium text-slate-200">{student.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-400 font-mono">{student.academic_id}</td>
                          <td className="px-6 py-4 text-slate-400">{student.grade}</td>
                          <td className="px-6 py-4 flex gap-3">
                            <button 
                              onClick={() => {
                                setEditingStudent(student);
                                setStudentFormData({ name: student.name, academic_id: student.academic_id, grade: student.grade });
                                setIsStudentModalOpen(true);
                              }}
                              className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
                            >
                              تعديل
                            </button>
                            <button 
                              onClick={() => handleDeleteStudent(student.id)}
                              className="text-rose-400 hover:text-rose-300 text-sm font-medium"
                            >
                              حذف
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'logistics' && (
              <motion.div
                key="logistics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-white">إدارة اللوجستيات والأظرفة</h1>
                    <p className="text-slate-400">تتبع استلام وتسليم مظاريف الأسئلة</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    {logisticsData.map((item) => (
                      <div key={item.id} className="bg-slate-900/60 backdrop-blur-sm p-6 rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${item.status === 'تم التسليم' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-amber-900/30 text-amber-400'}`}>
                            <Package size={24} />
                          </div>
                          <div>
                            <h3 className="font-bold text-white">{item.room}</h3>
                            <p className="text-xs text-slate-500">المادة: {item.subject} | المستلم: {item.proctor}</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            item.status === 'تم التسليم' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-amber-900/30 text-amber-400'
                          }`}>
                            {item.status}
                          </span>
                          <p className="text-[10px] text-slate-500 mt-1">{item.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-indigo-900/40 backdrop-blur-xl text-white p-8 rounded-3xl shadow-2xl border border-indigo-500/20 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                      <QrCode size={300} className="-translate-x-20 translate-y-20" />
                    </div>
                    <h2 className="text-xl font-bold mb-4 relative z-10">إحصائيات الأظرفة</h2>
                    <div className="space-y-6 relative z-10">
                      <div>
                        <div className="flex justify-between text-sm mb-2 opacity-80">
                          <span>الأظرفة المسلمة</span>
                          <span>{logisticsData.filter(d => d.status === 'تم التسليم').length} / {logisticsData.length}</span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-white rounded-full transition-all duration-500" 
                            style={{ width: `${(logisticsData.filter(d => d.status === 'تم التسليم').length / logisticsData.length) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="pt-6 border-t border-white/10">
                        <p className="text-xs opacity-60 mb-2">آخر حركة</p>
                        <p className="text-sm font-medium">
                          {logisticsData.some(d => d.status === 'تم التسليم') 
                            ? `تم تسليم ظرف ${logisticsData.filter(d => d.status === 'تم التسليم').pop()?.room} بنجاح`
                            : 'لا توجد حركات تسليم بعد'}
                        </p>
                      </div>
                      <button 
                        onClick={handleEnvelopeScan}
                        disabled={isScanningEnvelope}
                        className="w-full bg-white text-indigo-900 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors disabled:opacity-50 shadow-lg"
                      >
                        {isScanningEnvelope ? 'جاري المسح...' : 'مسح باركود الظرف'}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'staff' && (
              <motion.div
                key="staff"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-white">إدارة أعضاء الكنترول</h1>
                    <p className="text-slate-400">إضافة وتعديل صلاحيات مدخلي البيانات</p>
                  </div>
                  <button 
                    onClick={() => {
                      setEditingUser(null);
                      setUserFormData({ name: '', username: '', password: '', role: 'عضو كنترول' });
                      setIsUserModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-900/40"
                  >
                    <UserPlus size={18} />
                    <span>إضافة عضو جديد</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {users.map((user) => (
                    <div key={user.id} className="bg-slate-900/60 backdrop-blur-sm p-6 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                      <div className={`absolute top-0 right-0 w-1.5 h-full ${
                        user.role === 'مدير' ? 'bg-indigo-600' : 'bg-emerald-600'
                      }`}></div>
                      <div className="flex items-center gap-4 mb-6">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-inner ${
                          user.role === 'مدير' ? 'bg-indigo-600' : 'bg-emerald-600'
                        }`}>
                          {user.name[0]}
                        </div>
                        <div>
                          <h3 className="font-bold text-white">{user.name}</h3>
                          <p className="text-xs text-slate-500">@{user.username}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">الدور الوظيفي</span>
                          <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                            user.role === 'مدير' ? 'bg-indigo-900/30 text-indigo-400' : 'bg-emerald-900/30 text-emerald-400'
                          }`}>
                            {user.role}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">صلاحية الإدخال</span>
                          <span className="flex items-center gap-1 text-emerald-400 font-medium">
                            <ShieldCheck size={14} />
                            كاملة
                          </span>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-800 flex gap-2">
                        <button 
                          onClick={() => {
                            setEditingUser(user);
                            setUserFormData({ name: user.name, username: user.username, password: '', role: user.role });
                            setIsUserModalOpen(true);
                          }}
                          className="flex-1 py-2 text-xs font-bold text-slate-300 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
                        >
                          تعديل
                        </button>
                        {user.username !== '1027594579' && (
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="flex-1 py-2 text-xs font-bold text-rose-400 bg-rose-900/30 rounded-lg hover:bg-rose-900/50 transition-colors"
                          >
                            حذف
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Placeholder for other tabs */}
            {!['dashboard', 'rooms', 'attendance', 'students', 'logistics', 'staff'].includes(activeTab) && (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                <div className="p-6 bg-slate-100 rounded-full">
                  <Settings size={48} />
                </div>
                <p className="text-lg font-medium">هذه الصفحة قيد التطوير حالياً</p>
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className="text-indigo-600 font-semibold hover:underline"
                >
                  العودة للوحة التحكم
                </button>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Room QR Modal */}
      <AnimatePresence>
        {selectedRoomForQR && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 no-print"
            onClick={() => setSelectedRoomForQR(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900">باركود اللجنة</h2>
                <button 
                  onClick={() => setSelectedRoomForQR(null)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl flex flex-col items-center justify-center border border-slate-100">
                <QRCodeCanvas 
                  value={JSON.stringify({
                    type: 'room',
                    id: selectedRoomForQR.id,
                    name: selectedRoomForQR.name,
                    capacity: selectedRoomForQR.capacity
                  })}
                  size={200}
                  level="H"
                  includeMargin={true}
                  className="rounded-lg shadow-sm"
                />
                <p className="mt-4 font-bold text-lg text-indigo-600">{selectedRoomForQR.name}</p>
                <p className="text-sm text-slate-500">امسح الباركود لعرض تفاصيل اللجنة</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-right">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[10px] text-slate-400 mb-1">السعة</p>
                  <p className="font-bold text-slate-900">{selectedRoomForQR.capacity} طالب</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[10px] text-slate-400 mb-1">الحالة</p>
                  <p className="font-bold text-emerald-600">نشطة</p>
                </div>
              </div>

              <button 
                onClick={() => window.print()}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
              >
                <Printer size={18} />
                <span>طباعة الباركود</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Management Modal */}
      <AnimatePresence>
        {isUserModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setIsUserModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">
                  {editingUser ? 'تعديل بيانات العضو' : 'إضافة عضو كنترول جديد'}
                </h2>
                <button 
                  onClick={() => setIsUserModalOpen(false)}
                  className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-400 mb-1">الاسم الكامل</label>
                  <input 
                    type="text"
                    required
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({...userFormData, name: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-400 mb-1">اسم المستخدم / رقم الهوية</label>
                  <input 
                    type="text"
                    required
                    value={userFormData.username}
                    onChange={(e) => setUserFormData({...userFormData, username: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-400 mb-1">كلمة المرور</label>
                  <input 
                    type="password"
                    placeholder={editingUser ? 'اتركها فارغة لعدم التغيير' : '••••••••'}
                    required={!editingUser}
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({...userFormData, password: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-400 mb-1">الدور الوظيفي</label>
                  <select 
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({...userFormData, role: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-white"
                  >
                    <option value="مدير">مدير</option>
                    <option value="عضو كنترول">عضو كنترول</option>
                    <option value="مراقب">مراقب</option>
                  </select>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-900/40"
                  >
                    {editingUser ? 'حفظ التعديلات' : 'إضافة العضو'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Room Management Modal */}
      <AnimatePresence>
        {isRoomModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setIsRoomModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">
                  {editingRoom ? 'تعديل بيانات القاعة' : 'إضافة قاعة جديدة'}
                </h2>
                <button 
                  onClick={() => setIsRoomModalOpen(false)}
                  className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveRoom} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-400 mb-1">اسم القاعة</label>
                  <input 
                    type="text"
                    required
                    value={roomFormData.name}
                    onChange={(e) => setRoomFormData({...roomFormData, name: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-400 mb-1">السعة الاستيعابية</label>
                  <input 
                    type="number"
                    required
                    value={roomFormData.capacity}
                    onChange={(e) => setRoomFormData({...roomFormData, capacity: Number(e.target.value)})}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-400 mb-1">الموقع</label>
                  <input 
                    type="text"
                    value={roomFormData.location}
                    onChange={(e) => setRoomFormData({...roomFormData, location: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-white"
                    placeholder="مثال: الدور الأول - الجناح الأيمن"
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-900/40"
                  >
                    {editingRoom ? 'حفظ التعديلات' : 'إضافة القاعة'}
                  </button>
                  {editingRoom && (
                    <button 
                      type="button"
                      onClick={() => handleDeleteRoom(editingRoom.id)}
                      className="w-full mt-2 text-rose-400 py-2 text-sm font-bold hover:underline"
                    >
                      حذف القاعة نهائياً
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Student Management Modal */}
      <AnimatePresence>
        {isStudentModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setIsStudentModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">
                  {editingStudent ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}
                </h2>
                <button 
                  onClick={() => setIsStudentModalOpen(false)}
                  className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveStudent} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-400 mb-1">اسم الطالب</label>
                  <input 
                    type="text"
                    required
                    value={studentFormData.name}
                    onChange={(e) => setStudentFormData({...studentFormData, name: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-400 mb-1">الرقم الأكاديمي</label>
                  <input 
                    type="text"
                    required
                    value={studentFormData.academic_id}
                    onChange={(e) => setStudentFormData({...studentFormData, academic_id: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-400 mb-1">الصف</label>
                  <input 
                    type="text"
                    required
                    value={studentFormData.grade}
                    onChange={(e) => setStudentFormData({...studentFormData, grade: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-white"
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-900/40"
                  >
                    {editingStudent ? 'حفظ التعديلات' : 'إضافة الطالب'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes scan {
          0%, 100% { top: 10%; }
          50% { top: 90%; }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
