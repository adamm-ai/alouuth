import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Layout,
  Trophy,
  Settings,
  CheckCircle,
  LogOut,
  ChevronRight,
  Users,
  Menu,
  X,
  Plus,
  Save,
  ArrowLeft,
  Lock,
  FileText,
  Video,
  HelpCircle,
  Trash2,
  MonitorPlay,
  List,
  Download,
  PlayCircle,
  RefreshCw,
  Award,
  Clock,
  UserCheck,
  UserX,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { LiquidBackground } from './components/LiquidBackground';
import { GlassCard, PrimaryButton, SecondaryButton, ProgressBar, Badge, FileDropZone, IconButton } from './components/UIComponents';
import { dataService } from './services/dataService';
import { authAPI, setAuthToken, getAuthToken, PendingUser, adminAPI } from './services/api';
import api from './services/api';
import { MINISTRIES } from './constants';
import { Course, User, UserRole, Lesson, AnalyticData, LearningPath, ContentType } from './types';

// --- Types for Views ---
type View = 'LANDING' | 'AUTH' | 'DASHBOARD' | 'COURSE_PLAYER' | 'ADMIN';
type AdminSection = 'OVERVIEW' | 'USERS' | 'COURSES' | 'ANALYTICS';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('LANDING');
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [adminStats, setAdminStats] = useState<AnalyticData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminSection, setAdminSection] = useState<AdminSection>('OVERVIEW');
  const [userDashboardStats, setUserDashboardStats] = useState<{
    enrolledCourses: number;
    completedCourses: number;
    lessonsCompleted: number;
    averageQuizScore: number;
  } | null>(null);

  // Track if initial data has been loaded
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load initial data once when entering dashboard or admin views
  useEffect(() => {
    const loadData = async () => {
      // Only load if not already loaded and we're in a view that needs data
      if (currentView !== 'DASHBOARD' && currentView !== 'ADMIN') return;
      if (dataLoaded) return; // Skip if already loaded - removed courses.length check to prevent re-trigger

      setIsLoading(true);
      try {
        // Load courses and paths for all users
        const [fetchedCourses, fetchedPaths] = await Promise.all([
          dataService.getCourses(),
          dataService.getPaths(),
        ]);
        setCourses(fetchedCourses);
        setPaths(fetchedPaths);
        setDataLoaded(true);

        // Load user profile if not already loaded
        if (!user) {
          try {
            const fetchedUser = await dataService.getUser();
            setUser(fetchedUser);
          } catch (err) {
            console.error('Failed to load user:', err);
          }
        }
      } catch (error) {
        console.error("Failed to load data", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [currentView, dataLoaded]); // Removed courses.length and user from deps to prevent re-triggers

  // Track if stats have been loaded
  const [adminStatsLoaded, setAdminStatsLoaded] = useState(false);
  const [dashboardStatsLoaded, setDashboardStatsLoaded] = useState(false);

  // Load admin stats separately when admin view is active (only once)
  useEffect(() => {
    if (currentView !== 'ADMIN' || adminStatsLoaded) return;
    const loadAdminStats = async () => {
      try {
        const stats = await dataService.getAdminStats();
        setAdminStats(stats);
        setAdminStatsLoaded(true);
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      }
    };
    loadAdminStats();
  }, [currentView, adminStatsLoaded]);

  // Load dashboard stats when dashboard view is active (only once)
  useEffect(() => {
    if (currentView !== 'DASHBOARD' || dashboardStatsLoaded) return;
    const loadDashboardStats = async () => {
      try {
        const dashboardData = await dataService.getDashboardStats();
        setUserDashboardStats(dashboardData.stats);
        setDashboardStatsLoaded(true);
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      }
    };
    loadDashboardStats();
  }, [currentView, dashboardStatsLoaded]);

  const handleStartCourse = async (course: Course) => {
    // Auto-enroll user in course if not already enrolled
    try {
      await dataService.enrollInCourse(course.id);
    } catch (error) {
      // User might already be enrolled, that's OK
      console.log('Enrollment:', error);
    }

    setActiveCourse(course);
    // Find the first uncompleted lesson, or the first one if all new
    const firstUncompleted = course.lessons.find(l => !l.isCompleted) || course.lessons[0];
    setActiveLesson(firstUncompleted || null);
    setCurrentView('COURSE_PLAYER');
  };

  const handleLessonComplete = async (quizScore?: number) => {
    if (!activeCourse || !activeLesson) return;

    // 1. Call backend API to persist progress
    try {
      const courseProgress = await dataService.completeLesson(activeLesson.id, quizScore);
      console.log('Lesson completed, course progress:', courseProgress);
    } catch (error) {
      console.error('Failed to save progress to backend:', error);
    }

    // 2. Mark current lesson as complete locally
    const updatedLessons = activeCourse.lessons.map(l =>
        l.id === activeLesson.id ? { ...l, isCompleted: true } : l
    );

    // 3. Calculate new progress
    const completedCount = updatedLessons.filter(l => l.isCompleted).length;
    const newProgress = Math.round((completedCount / updatedLessons.length) * 100);

    // 4. Update Course State
    const updatedCourse = { ...activeCourse, lessons: updatedLessons, progress: newProgress };
    setActiveCourse(updatedCourse);

    // 5. Update Global Course List
    setCourses(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));

    // 6. Navigate to next lesson if available
    const currentIndex = updatedLessons.findIndex(l => l.id === activeLesson.id);
    if (currentIndex < updatedLessons.length - 1) {
        setActiveLesson(updatedLessons[currentIndex + 1]);
    }
  };

  // --- Sub-Components ---

  const Sidebar = () => (
    <div className={`fixed inset-y-0 left-0 z-50 w-64 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out`}>
      <div className="h-full glass-panel border-r border-white/10 flex flex-col backdrop-blur-2xl bg-black/80">
        <div className="p-8">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-white tracking-wider cursor-pointer" onClick={() => setCurrentView('LANDING')}>
            AMINI<span className="font-light text-white">ACADEMY</span>
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {/* User Navigation */}
          {user?.role !== UserRole.ADMIN && (
            <>
              <SidebarItem icon={<Layout size={20} />} label="Dashboard" active={currentView === 'DASHBOARD'} onClick={() => setCurrentView('DASHBOARD')} />
              <SidebarItem icon={<BookOpen size={20} />} label="My Learning" active={false} />
              <SidebarItem icon={<Trophy size={20} />} label="Achievements" active={false} />
            </>
          )}

          {/* Admin Navigation */}
          {user?.role === UserRole.ADMIN && (
            <>
              <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold px-4 pt-2 pb-1">Admin Portal</div>

              <SidebarItem
                icon={<Layout size={20} />}
                label="Overview"
                active={currentView === 'ADMIN' && adminSection === 'OVERVIEW'}
                onClick={() => { if (currentView !== 'ADMIN') setCurrentView('ADMIN'); setAdminSection('OVERVIEW'); }}
              />

              <SidebarItem
                icon={<UserCheck size={20} />}
                label="User Approvals"
                active={currentView === 'ADMIN' && adminSection === 'USERS'}
                onClick={() => { if (currentView !== 'ADMIN') setCurrentView('ADMIN'); setAdminSection('USERS'); }}
                badge={<span className="ml-auto px-2 py-0.5 text-[10px] rounded-full bg-red-500/30 text-red-400 font-bold animate-pulse">ACTION</span>}
              />

              <SidebarItem
                icon={<BookOpen size={20} />}
                label="Course Manager"
                active={currentView === 'ADMIN' && adminSection === 'COURSES'}
                onClick={() => { if (currentView !== 'ADMIN') setCurrentView('ADMIN'); setAdminSection('COURSES'); }}
              />

              <SidebarItem
                icon={<Trophy size={20} />}
                label="Analytics"
                active={currentView === 'ADMIN' && adminSection === 'ANALYTICS'}
                onClick={() => { if (currentView !== 'ADMIN') setCurrentView('ADMIN'); setAdminSection('ANALYTICS'); }}
              />

              <div className="h-px bg-white/5 my-4" />

              <SidebarItem
                icon={<Layout size={20} />}
                label="View as User"
                active={currentView === 'DASHBOARD'}
                onClick={() => setCurrentView('DASHBOARD')}
              />
            </>
          )}
        </nav>

        <div className="p-6 border-t border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center font-bold text-black shadow-lg shadow-yellow-400/20">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{user?.name || 'User'}</p>
              <p className="text-xs text-zinc-500 truncate w-32">{user?.ministry || 'Ministry'}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setAuthToken(null); // Clear the JWT token
              setUser(null);
              setCurrentView('LANDING');
            }}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors w-full group"
          >
            <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );

  const SidebarItem = ({ icon, label, active, onClick, badge }: any) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
        active
          ? 'bg-yellow-400 text-black border border-yellow-500 shadow-[0_0_20px_rgba(250,204,21,0.3)]'
          : 'text-zinc-400 hover:bg-white/5 hover:text-white hover:pl-5'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
      {badge}
    </button>
  );

  // --- Views ---

  const LandingView = () => (
    <div className="min-h-screen flex flex-col relative z-10">
      <header className="px-6 py-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="text-2xl font-bold tracking-wider">BAJAN-X<span className="text-yellow-400">UNI</span></div>
        <PrimaryButton onClick={() => setCurrentView('AUTH')}>Log In / Sign Up</PrimaryButton>
      </header>

      <main className="flex-1 flex flex-col justify-center items-center text-center px-4 mt-12 md:mt-0">
        <Badge type="success">Government Initiative</Badge>
        <h1 className="text-5xl md:text-7xl font-bold mt-6 mb-6 leading-tight">
          Master the Tools of <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-white to-zinc-400 animate-pulse">
            Digital Governance
          </span>
        </h1>
        <p className="text-xl text-zinc-400 max-w-2xl mb-10 leading-relaxed">
          The central hub for public servants to learn <span className="text-white font-medium">Bridge</span>, <span className="text-white font-medium">ChatBB</span>, and <span className="text-white font-medium">Bajan-X</span>. 
        </p>
        <div className="flex gap-4">
          <PrimaryButton onClick={() => setCurrentView('AUTH')}>Start Learning Path</PrimaryButton>
          <SecondaryButton>Browse Catalog</SecondaryButton>
        </div>

        {/* Floating cards visual */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full px-4">
           {[
             { title: "Foundations", desc: "Core digital literacy & security", time: "2h" },
             { title: "Bridge Platform", desc: "Connecting gov datasets", time: "4h" },
             { title: "ChatBB Support", desc: "AI customer service tools", time: "1h" },
           ].map((card, idx) => (
             <GlassCard key={idx} className="bg-white/5 backdrop-blur-sm border-white/5">
                <div className="h-10 w-10 rounded-full bg-yellow-400/20 flex items-center justify-center mb-4 text-yellow-400">
                  <BookOpen size={20} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{card.title}</h3>
                <p className="text-zinc-400 text-sm mb-4">{card.desc}</p>
                <div className="text-xs text-zinc-500 font-mono">{card.time} estimate</div>
             </GlassCard>
           ))}
        </div>
      </main>
    </div>
  );

  const AuthView = () => {
    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
    const [formData, setFormData] = useState({
      email: '',
      password: '',
      name: '',
      ministry: MINISTRIES[0],
      role: UserRole.LEARNER
    });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [pendingApproval, setPendingApproval] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsSubmitting(true);

      try {
        if (authMode === 'login') {
          // Login
          const response = await authAPI.login({
            email: formData.email,
            password: formData.password
          });

          if (response.token) {
            setAuthToken(response.token);
            const newUser: User = {
              id: response.user.id,
              name: response.user.name,
              email: response.user.email,
              ministry: response.user.ministry,
              role: response.user.role as UserRole,
              enrolledCourses: [],
              completedPaths: []
            };
            setUser(newUser);
            setCurrentView(response.user.role === 'ADMIN' ? 'ADMIN' : 'DASHBOARD');
          }
        } else {
          // Register
          const response = await authAPI.register({
            email: formData.email,
            password: formData.password,
            name: formData.name,
            ministry: formData.ministry,
            role: formData.role === UserRole.SUPERUSER ? 'SUPERUSER' : 'LEARNER'
          });

          if (response.status === 'PENDING_APPROVAL') {
            setPendingApproval(true);
          }
        }
      } catch (err: any) {
        if (err.message.includes('pending')) {
          setPendingApproval(true);
        } else {
          setError(err.message || 'Authentication failed. Please try again.');
        }
      } finally {
        setIsSubmitting(false);
      }
    };

    // Pending Approval Screen
    if (pendingApproval) {
      return (
        <div className="min-h-screen flex items-center justify-center relative z-10 p-4">
          <GlassCard className="max-w-md w-full p-8 md:p-10 text-center">
            <div className="w-20 h-20 rounded-full bg-yellow-400/20 flex items-center justify-center mx-auto mb-6">
              <Clock size={40} className="text-yellow-400" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Registration Submitted</h2>
            <p className="text-zinc-400 mb-6">
              Your account is pending approval from an administrator.
              You will be able to log in once your account has been approved.
            </p>
            <div className="bg-zinc-900/50 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm text-zinc-500 mb-1">Email</p>
              <p className="text-white">{formData.email}</p>
            </div>
            <SecondaryButton onClick={() => {
              setPendingApproval(false);
              setAuthMode('login');
              setFormData({ ...formData, password: '' });
            }} className="w-full">
              Back to Login
            </SecondaryButton>
          </GlassCard>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center relative z-10 p-4">
        <GlassCard className="max-w-md w-full p-8 md:p-10 relative overflow-hidden transition-all duration-500 border-t border-white/20">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => setCurrentView('LANDING')} className="text-zinc-500 hover:text-white flex items-center gap-2 text-sm transition-colors">
              <ArrowLeft size={16}/> Back
            </button>
          </div>

          {/* Login/Register Tabs */}
          <div className="flex mb-8 bg-zinc-900/50 rounded-xl p-1">
            <button
              onClick={() => { setAuthMode('login'); setError(''); }}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                authMode === 'login'
                  ? 'bg-yellow-400 text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthMode('register'); setError(''); }}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                authMode === 'register'
                  ? 'bg-yellow-400 text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          <h2 className="text-3xl font-bold mb-2 text-center">
            {authMode === 'login' ? 'Welcome Back' : 'Join Amini Academy'}
          </h2>
          <p className="text-zinc-400 text-center mb-8">
            {authMode === 'login' ? 'Sign in to continue your learning' : 'Exclusive for Public Servants'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name - only for register */}
            {authMode === 'register' && (
              <div className="animate-fade-in">
                <label className="block text-sm font-medium text-zinc-400 mb-1">Full Name</label>
                <input
                  required
                  type="text"
                  className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-yellow-400 outline-none transition-all placeholder-zinc-600"
                  placeholder="Jane Doe"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
              <input
                required
                type="email"
                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-yellow-400 outline-none transition-all placeholder-zinc-600"
                placeholder="jane.doe@gov.bb"
                value={formData.email}
                onChange={e => {
                  setFormData({...formData, email: e.target.value});
                  setError('');
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Password</label>
              <div className="relative">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3 pr-12 text-white focus:ring-2 focus:ring-yellow-400 outline-none transition-all placeholder-zinc-600"
                  placeholder={authMode === 'register' ? 'Min 8 chars, uppercase, number' : 'Your password'}
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  minLength={authMode === 'register' ? 8 : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {authMode === 'register' && (
                <p className="text-xs text-zinc-500 mt-1">Must contain uppercase, lowercase, and number</p>
              )}
            </div>

            {/* Ministry & Role - only for register */}
            {authMode === 'register' && (
              <>
                <div className="animate-fade-in">
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Ministry</label>
                  <select
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-yellow-400 outline-none"
                    value={formData.ministry}
                    onChange={e => setFormData({...formData, ministry: e.target.value})}
                  >
                    {MINISTRIES.map(m => <option key={m} value={m} className="bg-zinc-900 text-white">{m}</option>)}
                  </select>
                </div>

                <div className="animate-fade-in">
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Select Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, role: UserRole.LEARNER})}
                      className={`p-3 rounded-xl border text-sm transition-all duration-300 ${formData.role === UserRole.LEARNER ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.2)]' : 'border-white/10 hover:bg-white/5 text-zinc-400'}`}
                    >
                      Learner
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, role: UserRole.SUPERUSER})}
                      className={`p-3 rounded-xl border text-sm transition-all duration-300 ${formData.role === UserRole.SUPERUSER ? 'bg-white/20 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'border-white/10 hover:bg-white/5 text-zinc-400'}`}
                    >
                      Superuser
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-xl">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Submit Button */}
            <PrimaryButton className="w-full mt-4" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  {authMode === 'login' ? 'Signing in...' : 'Registering...'}
                </span>
              ) : (
                authMode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </PrimaryButton>

            {/* Info for register */}
            {authMode === 'register' && (
              <p className="text-xs text-zinc-500 text-center mt-4">
                Your account will require admin approval before you can sign in.
              </p>
            )}
          </form>
        </GlassCard>
      </div>
    );
  };

  const DashboardView = () => {
    // Course-level locking logic
    // Check if all courses of a given level are completed (100% progress)
    const isCourseCompleted = (course: Course) => course.progress === 100;

    const getBeginnerCourses = () => courses.filter(c => c.level === 'Beginner');
    const getIntermediateCourses = () => courses.filter(c => c.level === 'Intermediate');
    const getAdvancedCourses = () => courses.filter(c => c.level === 'Advanced');

    const allBeginnerCompleted = () => {
      const beginnerCourses = getBeginnerCourses();
      return beginnerCourses.length > 0 && beginnerCourses.every(isCourseCompleted);
    };

    const allIntermediateCompleted = () => {
      const intermediateCourses = getIntermediateCourses();
      return intermediateCourses.length > 0 && intermediateCourses.every(isCourseCompleted);
    };

    const isLevelUnlocked = (level: string) => {
      if (level === 'Beginner') return true;
      if (level === 'Intermediate') return allBeginnerCompleted();
      if (level === 'Advanced') return allBeginnerCompleted() && allIntermediateCompleted();
      return true;
    };

    const isCourseUnlocked = (course: Course) => isLevelUnlocked(course.level);

    const getLockedMessage = (level: string) => {
      if (level === 'Intermediate') {
        const remaining = getBeginnerCourses().filter(c => !isCourseCompleted(c)).length;
        return `Complete ${remaining} Beginner course${remaining > 1 ? 's' : ''} to unlock`;
      }
      if (level === 'Advanced') {
        if (!allBeginnerCompleted()) {
          const remaining = getBeginnerCourses().filter(c => !isCourseCompleted(c)).length;
          return `Complete ${remaining} Beginner course${remaining > 1 ? 's' : ''} first`;
        }
        const remaining = getIntermediateCourses().filter(c => !isCourseCompleted(c)).length;
        return `Complete ${remaining} Intermediate course${remaining > 1 ? 's' : ''} to unlock`;
      }
      return '';
    };

    // Calculate total progress (use API stats if available)
    const totalProgress = userDashboardStats
      ? Math.round((userDashboardStats.completedCourses / Math.max(userDashboardStats.enrolledCourses, 1)) * 100)
      : courses.length > 0
        ? Math.round(courses.reduce((sum, c) => sum + (c.progress || 0), 0) / courses.length)
        : 0;

    const completedCourses = userDashboardStats?.completedCourses || courses.filter(isCourseCompleted).length;
    const enrolledCount = userDashboardStats?.enrolledCourses || courses.length;
    const lessonsCompleted = userDashboardStats?.lessonsCompleted || 0;
    const avgQuizScore = userDashboardStats?.averageQuizScore || 0;

    return (
      <div className="md:ml-64 min-h-screen relative z-10 pb-20">
        {/* Mobile Header */}
        <div className="md:hidden p-4 flex justify-between items-center glass-panel sticky top-0 z-40 backdrop-blur-xl">
          <span className="font-bold">Amini Academy</span>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10">
          {/* Header Section - Enhanced Liquid Glass */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 animate-fade-in">
            <div>
              <h2 className="text-4xl font-bold mb-2">Welcome, {user?.name?.split(' ')[0]}</h2>
              <div className="flex gap-2">
                 {user?.role === UserRole.SUPERUSER && <Badge type="warning">Ministry Champion</Badge>}
                 <span className="text-zinc-400">Ready to upskill?</span>
              </div>
            </div>

            {/* Stats Cards - Liquid Glass Design */}
            <div className="flex gap-3">
              {/* Lessons Completed */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400/20 to-yellow-500/10 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-center min-w-[80px]">
                  <div className="text-3xl font-bold text-yellow-400">{lessonsCompleted}</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Lessons</div>
                </div>
              </div>

              <div className="w-px bg-white/10 h-16 hidden md:block self-center"></div>

              {/* Courses Progress */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-white/20 to-white/5 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-center min-w-[80px]">
                  <div className="text-3xl font-bold text-white">{completedCourses}<span className="text-lg text-zinc-500">/{enrolledCount || courses.length}</span></div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Courses</div>
                </div>
              </div>

              <div className="w-px bg-white/10 h-16 hidden md:block self-center"></div>

              {/* Quiz Average */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-400/20 to-green-500/10 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-center min-w-[80px]">
                  <div className="text-3xl font-bold text-green-400">{avgQuizScore}%</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Quiz Avg</div>
                </div>
              </div>

              <div className="w-px bg-white/10 h-16 hidden md:block self-center"></div>

              {/* Overall Progress Circle */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400/20 to-green-400/10 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex items-center justify-center">
                  <div className="relative w-14 h-14">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="3"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="url(#dashboardGradient)"
                        strokeWidth="3"
                        strokeDasharray={`${totalProgress}, 100`}
                        strokeLinecap="round"
                        className="drop-shadow-[0_0_8px_rgba(250,204,21,0.5)] transition-all duration-1000"
                      />
                      <defs>
                        <linearGradient id="dashboardGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#FACC15" />
                          <stop offset="100%" stopColor="#22c55e" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-sm font-bold text-white">{totalProgress}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Banner - Liquid Glass */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500/20 via-yellow-400/10 to-green-500/20 rounded-[24px] blur-lg opacity-60" />
            <div className="relative rounded-3xl overflow-hidden backdrop-blur-2xl bg-gradient-to-r from-white/[0.06] via-white/[0.03] to-white/[0.06] border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Bajan-X Program Overall Progress</h3>
                  <p className="text-sm text-zinc-400">Complete all 8 modules to earn your certification</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-yellow-400">{totalProgress}%</span>
                  <span className="text-zinc-500">complete</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-3 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-400 via-yellow-500 to-green-400 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.5)] transition-all duration-1000"
                  style={{ width: `${totalProgress}%` }}
                />
                {/* Milestone markers */}
                {[25, 50, 75].map(milestone => (
                  <div
                    key={milestone}
                    className={`absolute top-0 bottom-0 w-0.5 ${totalProgress >= milestone ? 'bg-white/40' : 'bg-white/10'}`}
                    style={{ left: `${milestone}%` }}
                  />
                ))}
              </div>

              {/* Module indicators */}
              <div className="flex justify-between mt-3">
                {['BX1', 'BX2', 'BX3', 'BX4', 'BX5', 'BX6', 'BX7', 'BX8'].map((module, idx) => {
                  const moduleProgress = ((idx + 1) / 8) * 100;
                  const isCompleted = totalProgress >= moduleProgress;
                  return (
                    <div key={module} className="flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                        isCompleted
                          ? 'bg-yellow-400 text-black shadow-[0_0_10px_rgba(250,204,21,0.4)]'
                          : 'bg-white/10 text-zinc-500'
                      }`}>
                        {isCompleted ? <CheckCircle size={12}/> : idx + 1}
                      </div>
                      <span className={`text-[10px] mt-1 ${isCompleted ? 'text-yellow-400' : 'text-zinc-600'}`}>{module}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Superuser Exclusive Widget */}
          {user?.role === UserRole.SUPERUSER && (
            <GlassCard className="bg-gradient-to-br from-zinc-800/30 to-black border-yellow-500/30">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2"><Users size={18} className="text-yellow-400"/> Ministry Insights</h3>
                  <p className="text-sm text-zinc-400">Track your team's progress in {user.ministry}</p>
                </div>
                <PrimaryButton className="py-1 px-4 text-xs h-8">Invite Colleagues</PrimaryButton>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                  <div className="text-xs text-zinc-500">Active Learners</div>
                  <div className="text-xl font-bold">24</div>
                </div>
                <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                  <div className="text-xs text-zinc-500">Certified</div>
                  <div className="text-xl font-bold text-yellow-400">8</div>
                </div>
                <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                   <div className="text-xs text-zinc-500">Completion Rate</div>
                   <div className="text-xl font-bold text-white">33%</div>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Learning Paths & Courses */}
          <div className="space-y-12">
            {paths.map((path) => {
               if (path.role === 'SUPERUSER' && user?.role !== UserRole.SUPERUSER) return null;

               const pathCourses = courses.filter(c => path.courseIds.includes(c.id));
               const pathLevel = pathCourses[0]?.level || 'Beginner';
               const isPathUnlocked = isLevelUnlocked(pathLevel);

               return (
                 <div key={path.id} className="animate-fade-in">
                   <div className="flex items-center gap-3 mb-4">
                     <div className={`p-2 rounded-lg ${isPathUnlocked ? 'bg-yellow-400/20 text-yellow-400' : 'bg-zinc-800/50 text-zinc-600'}`}>
                       {isPathUnlocked ? <BookOpen size={20}/> : <Lock size={20}/>}
                     </div>
                     <div className="flex-1">
                       <div className="flex items-center gap-3">
                         <h3 className={`text-2xl font-bold ${!isPathUnlocked && 'text-zinc-600'}`}>{path.title}</h3>
                         {!isPathUnlocked && (
                           <span className="text-xs px-3 py-1 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700">
                             LOCKED
                           </span>
                         )}
                       </div>
                       <p className={`text-sm ${isPathUnlocked ? 'text-zinc-400' : 'text-zinc-600'}`}>
                         {isPathUnlocked ? path.description : getLockedMessage(pathLevel)}
                       </p>
                     </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {pathCourses.map(course => {
                        const courseUnlocked = isCourseUnlocked(course);

                        return (
                          <GlassCard
                            key={course.id}
                            className={`flex flex-col h-full ${courseUnlocked ? 'hover:-translate-y-1 cursor-pointer' : 'opacity-60 cursor-not-allowed'} group`}
                            onClick={() => courseUnlocked && handleStartCourse(course)}
                          >
                            <div className="relative h-48 rounded-2xl overflow-hidden mb-5">
                              <img
                                src={course.thumbnail}
                                alt={course.title}
                                className={`w-full h-full object-cover transition-transform duration-700 ${courseUnlocked ? 'group-hover:scale-110 grayscale group-hover:grayscale-0' : 'grayscale'}`}
                              />
                              <div className={`absolute inset-0 ${courseUnlocked ? 'bg-black/40 group-hover:bg-transparent' : 'bg-black/60'} transition-colors`} />

                              {/* Lock overlay for locked courses */}
                              {!courseUnlocked && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-16 h-16 rounded-full bg-black/80 border border-zinc-700 flex items-center justify-center">
                                    <Lock size={28} className="text-zinc-500" />
                                  </div>
                                </div>
                              )}

                              <div className="absolute top-3 right-3">
                                <Badge type={!courseUnlocked ? 'default' : undefined}>{course.level}</Badge>
                              </div>
                              {course.progress > 0 && courseUnlocked && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
                                  <div className="h-full bg-yellow-400" style={{width: `${course.progress}%`}} />
                                </div>
                              )}
                            </div>
                            <h4 className={`text-xl font-bold mb-2 ${courseUnlocked ? 'group-hover:text-yellow-400' : 'text-zinc-500'} transition-colors`}>{course.title}</h4>
                            <p className={`text-sm mb-4 flex-1 line-clamp-2 ${courseUnlocked ? 'text-zinc-400' : 'text-zinc-600'}`}>{course.description}</p>
                            <div className={`mt-auto pt-4 border-t border-white/5 flex justify-between items-center text-sm ${courseUnlocked ? 'text-zinc-500' : 'text-zinc-700'}`}>
                              <span>{course.totalDuration}</span>
                              {courseUnlocked ? (
                                <span className={`${course.progress > 0 ? 'text-yellow-400' : 'text-white'} group-hover:translate-x-1 transition-transform font-medium flex items-center gap-1`}>
                                  {course.progress > 0 ? 'Continue' : 'Start'} <ChevronRight size={14} />
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-zinc-600">
                                  <Lock size={14} /> Locked
                                </span>
                              )}
                            </div>
                          </GlassCard>
                        );
                      })}
                   </div>
                 </div>
               )
            })}
          </div>
        </div>
      </div>
    );
  };

  const PlayerView = () => {
    // Quiz State
    const [quizState, setQuizState] = useState<'INTRO' | 'QUESTION' | 'RESULT'>('INTRO');
    const [currentQIdx, setCurrentQIdx] = useState(0);
    const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
    const [quizScore, setQuizScore] = useState(0);

    // Download State
    const [isDownloaded, setIsDownloaded] = useState(false);

    // Sidebar collapse state
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Video Progress Tracking State
    const [videoWatchedPercent, setVideoWatchedPercent] = useState(0);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [ytPlayer, setYtPlayer] = useState<any>(null);
    const html5VideoRef = React.useRef<HTMLVideoElement>(null);
    const ytPlayerContainerRef = React.useRef<HTMLDivElement>(null);

    // Helper: Check if URL is YouTube
    const isYouTubeUrl = (url: string) => {
      return url?.includes('youtube.com') || url?.includes('youtu.be');
    };

    // Helper: Extract YouTube video ID
    const getYouTubeVideoId = (url: string) => {
      if (!url) return null;
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
    };

    // Reset local state when active lesson changes
    useEffect(() => {
        setQuizState('INTRO');
        setCurrentQIdx(0);
        setQuizAnswers([]);
        setQuizScore(0);
        setIsDownloaded(false);
        setVideoWatchedPercent(0);
        setIsVideoPlaying(false);
        if (ytPlayer) {
          ytPlayer.destroy();
          setYtPlayer(null);
        }
    }, [activeLesson?.id]);

    // Load YouTube IFrame API
    useEffect(() => {
      if (activeLesson?.type !== 'video' || !activeLesson.videoUrl) return;
      if (!isYouTubeUrl(activeLesson.videoUrl)) return;

      // Load YouTube API script if not already loaded
      if (!(window as any).YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }

      // Initialize player when API is ready
      const initPlayer = () => {
        const videoId = getYouTubeVideoId(activeLesson.videoUrl!);
        if (!videoId || !ytPlayerContainerRef.current) return;

        const player = new (window as any).YT.Player(ytPlayerContainerRef.current, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
            origin: window.location.origin
          },
          events: {
            onReady: (event: any) => {
              console.log('YouTube player ready');
            },
            onStateChange: (event: any) => {
              // YT.PlayerState: PLAYING=1, PAUSED=2, ENDED=0
              setIsVideoPlaying(event.data === 1);
            }
          }
        });
        setYtPlayer(player);
      };

      // Wait for YT API to load
      if ((window as any).YT && (window as any).YT.Player) {
        initPlayer();
      } else {
        (window as any).onYouTubeIframeAPIReady = initPlayer;
      }

      return () => {
        if (ytPlayer) {
          ytPlayer.destroy();
        }
      };
    }, [activeLesson?.id, activeLesson?.videoUrl]);

    // YouTube Progress Tracking
    useEffect(() => {
      if (!ytPlayer || !isVideoPlaying) return;

      const progressInterval = setInterval(() => {
        try {
          const currentTime = ytPlayer.getCurrentTime();
          const duration = ytPlayer.getDuration();
          if (duration > 0) {
            const percent = Math.round((currentTime / duration) * 100);
            setVideoWatchedPercent(prev => Math.max(prev, percent)); // Only increase, never decrease
          }
        } catch (e) {
          // Player might not be ready
        }
      }, 1000);

      return () => clearInterval(progressInterval);
    }, [ytPlayer, isVideoPlaying]);

    // HTML5 Video Progress Tracking
    const handleHTML5VideoTimeUpdate = () => {
      const video = html5VideoRef.current;
      if (video && video.duration > 0) {
        const percent = Math.round((video.currentTime / video.duration) * 100);
        setVideoWatchedPercent(prev => Math.max(prev, percent));
      }
    };

    const handleHTML5VideoPlay = () => setIsVideoPlaying(true);
    const handleHTML5VideoPause = () => setIsVideoPlaying(false);

    // Auto-save video progress to backend every 10 seconds
    useEffect(() => {
      if (activeLesson?.type !== 'video' || videoWatchedPercent === 0) return;

      const saveInterval = setInterval(async () => {
        if (videoWatchedPercent > 0) {
          try {
            await dataService.updateVideoProgress(activeLesson.id, videoWatchedPercent);
            console.log(`Progress saved: ${videoWatchedPercent}%`);
          } catch (error) {
            console.error('Failed to save video progress:', error);
          }
        }
      }, 10000);

      return () => clearInterval(saveInterval);
    }, [activeLesson?.id, activeLesson?.type, videoWatchedPercent]);

    const handleQuizAnswer = (optionIndex: number) => {
        const newAnswers = [...quizAnswers];
        newAnswers[currentQIdx] = optionIndex;
        setQuizAnswers(newAnswers);
    };

    const handleNextQuestion = () => {
        if (!activeLesson?.quiz) return;
        if (currentQIdx < activeLesson.quiz.length - 1) {
            setCurrentQIdx(currentQIdx + 1);
        } else {
            let score = 0;
            activeLesson.quiz.forEach((q, idx) => {
                if (quizAnswers[idx] === q.correctAnswer) score++;
            });
            setQuizScore(score);
            setQuizState('RESULT');
        }
    };

    const downloadResource = () => {
        if (!activeLesson?.fileUrl) {
          console.error('No file URL available for download');
          return;
        }
        const link = document.createElement('a');
        link.href = activeLesson.fileUrl;
        link.download = activeLesson.fileName || 'resource';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsDownloaded(true);
    };

    // Calculate completion stats
    const completedCount = activeCourse?.lessons.filter(l => l.isCompleted).length || 0;
    const totalCount = activeCourse?.lessons.length || 0;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // Hyper Liquid Glass Video Frame Component
    const LiquidVideoFrame = ({ children }: { children: React.ReactNode }) => (
      <div className="relative group">
        {/* Outer glow layers */}
        <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500/20 via-white/10 to-yellow-500/20 rounded-[28px] blur-xl opacity-60 group-hover:opacity-100 transition-all duration-700 animate-pulse" />
        <div className="absolute -inset-0.5 bg-gradient-to-br from-yellow-400/30 via-transparent to-white/20 rounded-[26px] blur-md" />

        {/* Main glass container */}
        <div className="relative rounded-3xl overflow-hidden backdrop-blur-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]">
          {/* Inner highlight */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent pointer-events-none" />

          {/* Animated liquid shine */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1500 ease-in-out" />
          </div>

          {/* Content */}
          <div className="relative">
            {children}
          </div>

          {/* Bottom reflection */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
        </div>

        {/* Floating particles effect */}
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400/40 rounded-full blur-sm animate-float" style={{animationDelay: '0s'}} />
        <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white/30 rounded-full blur-sm animate-float" style={{animationDelay: '1s'}} />
      </div>
    );

    // Hyper Glass Card for curriculum items
    const CurriculumItem = ({ lesson, idx, isActive, isLocked, isCompleted, onClick }: any) => (
      <button
        onClick={onClick}
        disabled={isLocked}
        className={`
          group/item w-full relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-500
          ${isActive
            ? 'bg-gradient-to-r from-yellow-400/20 via-yellow-500/10 to-transparent border border-yellow-400/40 shadow-[0_0_30px_rgba(250,204,21,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]'
            : isLocked
              ? 'bg-white/[0.02] border border-white/5 opacity-50 cursor-not-allowed'
              : 'bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] hover:border-white/20 hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
          }
        `}
      >
        {/* Active indicator glow */}
        {isActive && (
          <>
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/5 to-transparent" />
          </>
        )}

        {/* Lock overlay */}
        {isLocked && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-zinc-800/80 border border-zinc-700 flex items-center justify-center">
                <Lock size={14} className="text-zinc-500" />
              </div>
              <span className="text-[10px] text-zinc-500 font-medium">Complete previous</span>
            </div>
          </div>
        )}

        <div className="flex items-start gap-4 relative z-[1]">
          {/* Status indicator */}
          <div className={`
            relative flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
            ${isCompleted
              ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 shadow-[0_0_20px_rgba(250,204,21,0.4)]'
              : isActive
                ? 'bg-yellow-400/20 border-2 border-yellow-400/50'
                : 'bg-white/5 border border-white/10'
            }
          `}>
            {isCompleted ? (
              <CheckCircle size={18} className="text-black" />
            ) : (
              <span className={`text-sm font-bold ${isActive ? 'text-yellow-400' : 'text-zinc-500'}`}>
                {String(idx + 1).padStart(2, '0')}
              </span>
            )}

            {/* Pulse ring for active */}
            {isActive && !isCompleted && (
              <div className="absolute inset-0 rounded-xl border-2 border-yellow-400/50 animate-ping opacity-30" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {lesson.type === 'video' && <Video size={12} className={isActive ? 'text-yellow-400' : 'text-zinc-500'} />}
              {lesson.type === 'quiz' && <HelpCircle size={12} className={isActive ? 'text-yellow-400' : 'text-zinc-500'} />}
              {(lesson.type === 'pdf' || lesson.type === 'presentation') && <FileText size={12} className={isActive ? 'text-yellow-400' : 'text-zinc-500'} />}
              <span className={`text-[10px] uppercase tracking-wider font-medium ${isActive ? 'text-yellow-400/80' : 'text-zinc-600'}`}>
                {lesson.type}
              </span>
            </div>

            <h4 className={`font-semibold text-sm leading-tight mb-1 transition-colors ${
              isActive ? 'text-white' : isCompleted ? 'text-zinc-300' : 'text-zinc-400'
            } ${!isLocked && 'group-hover/item:text-white'}`}>
              {lesson.title}
            </h4>

            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-zinc-500">{lesson.durationMin} min</span>
              {isCompleted && (
                <span className="text-yellow-400/80 flex items-center gap-1">
                  <CheckCircle size={10} /> Done
                </span>
              )}
            </div>
          </div>

          {/* Arrow indicator */}
          {!isLocked && !isCompleted && (
            <ChevronRight size={16} className={`flex-shrink-0 transition-all duration-300 ${
              isActive ? 'text-yellow-400 translate-x-0 opacity-100' : 'text-zinc-600 -translate-x-2 opacity-0 group-hover/item:translate-x-0 group-hover/item:opacity-100'
            }`} />
          )}
        </div>
      </button>
    );

    return (
      <div className="min-h-screen bg-black flex flex-col relative z-20 overflow-hidden">
        {/* Ambient background effects */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-white/5 rounded-full blur-[100px]" />
        </div>

        {/* Top Nav - Hyper Glass */}
        <div className="relative z-30 sticky top-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-transparent" />
          <div className="relative h-20 flex items-center justify-between px-6 border-b border-white/10 backdrop-blur-2xl bg-black/40">
            <div className="flex items-center gap-5">
              <button
                onClick={() => setCurrentView('DASHBOARD')}
                className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
              >
                <ChevronRight className="rotate-180 text-zinc-400 group-hover:text-white transition-colors" size={18} />
                <span className="text-sm text-zinc-400 group-hover:text-white transition-colors hidden sm:inline">Exit</span>
              </button>

              <div className="hidden md:block">
                <Badge type="success">{activeCourse?.level}</Badge>
              </div>

              <div className="hidden md:block">
                <h1 className="font-bold text-lg text-white truncate max-w-md">{activeCourse?.title}</h1>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Progress indicator */}
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-bold text-white">{completedCount}/{totalCount}</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Lessons</div>
                </div>
                <div className="relative w-14 h-14">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="2"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="url(#progressGradient)"
                      strokeWidth="2.5"
                      strokeDasharray={`${progressPercent}, 100`}
                      strokeLinecap="round"
                      className="drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]"
                    />
                    <defs>
                      <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#FACC15" />
                        <stop offset="100%" stopColor="#FEF08A" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-yellow-400">{progressPercent}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10">
          {/* Sidebar Curriculum - Hyper Liquid Glass */}
          <div className={`
            transition-all duration-500 ease-out hidden md:flex flex-col
            ${sidebarCollapsed ? 'w-20' : 'w-96'}
          `}>
            <div className="h-full relative">
              {/* Glass background */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent backdrop-blur-2xl border-r border-white/10" />

              {/* Content */}
              <div className="relative h-full flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`transition-all duration-300 ${sidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                      <h2 className="text-sm font-bold text-white uppercase tracking-wider">Curriculum</h2>
                      <p className="text-[11px] text-zinc-500 mt-1">{totalCount} lessons • {activeCourse?.totalDuration}</p>
                    </div>
                    <button
                      onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                      className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                    >
                      <List size={16} className="text-zinc-400" />
                    </button>
                  </div>

                  {/* Mini progress */}
                  {!sidebarCollapsed && (
                    <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full shadow-[0_0_10px_rgba(250,204,21,0.5)] transition-all duration-700"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Lessons list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {activeCourse?.lessons.map((lesson, idx) => {
                    const isLocked = idx > 0 && !activeCourse.lessons[idx - 1].isCompleted;
                    const isActive = activeLesson?.id === lesson.id;

                    if (sidebarCollapsed) {
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => !isLocked && setActiveLesson(lesson)}
                          disabled={isLocked}
                          className={`
                            w-12 h-12 rounded-xl flex items-center justify-center mx-auto transition-all
                            ${isActive
                              ? 'bg-yellow-400/20 border border-yellow-400/40 text-yellow-400'
                              : isLocked
                                ? 'bg-white/5 border border-white/5 opacity-40'
                                : lesson.isCompleted
                                  ? 'bg-yellow-400/10 text-yellow-400'
                                  : 'bg-white/5 border border-white/10 text-zinc-500 hover:bg-white/10'
                            }
                          `}
                        >
                          {lesson.isCompleted ? <CheckCircle size={16} /> : isLocked ? <Lock size={14} /> : idx + 1}
                        </button>
                      );
                    }

                    return (
                      <CurriculumItem
                        key={lesson.id}
                        lesson={lesson}
                        idx={idx}
                        isActive={isActive}
                        isLocked={isLocked}
                        isCompleted={lesson.isCompleted}
                        onClick={() => !isLocked && setActiveLesson(lesson)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="min-h-full p-6 md:p-10 flex flex-col items-center">
              {activeLesson ? (
                <div className="max-w-5xl w-full space-y-8 animate-fade-in">

                  {/* Lesson Header */}
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-4">
                      {activeLesson.type === 'video' && <Video size={14} className="text-yellow-400" />}
                      {activeLesson.type === 'quiz' && <HelpCircle size={14} className="text-yellow-400" />}
                      {(activeLesson.type === 'pdf' || activeLesson.type === 'presentation') && <FileText size={14} className="text-yellow-400" />}
                      <span className="text-xs uppercase tracking-wider text-zinc-400">{activeLesson.type} Lesson</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-xs text-zinc-500">{activeLesson.durationMin} min</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">{activeLesson.title}</h2>
                  </div>

                  {/* 1. Video Player - Hyper Liquid Glass with Real Progress Tracking */}
                  {activeLesson.type === 'video' && (
                    <div className="space-y-4">
                      <LiquidVideoFrame>
                        <div className="aspect-video w-full bg-black relative">
                          {/* YouTube Video Player */}
                          {isYouTubeUrl(activeLesson.videoUrl || '') ? (
                            <div
                              ref={ytPlayerContainerRef}
                              className="w-full h-full"
                              key={activeLesson.id} // Force re-render on lesson change
                            />
                          ) : (
                            /* HTML5 Video Player for uploaded videos */
                            <video
                              ref={html5VideoRef}
                              className="w-full h-full"
                              src={activeLesson.videoUrl || activeLesson.fileUrl}
                              controls
                              onTimeUpdate={handleHTML5VideoTimeUpdate}
                              onPlay={handleHTML5VideoPlay}
                              onPause={handleHTML5VideoPause}
                            >
                              Your browser does not support the video tag.
                            </video>
                          )}

                          {/* Video Progress Overlay - Always visible */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pointer-events-none z-10">
                            {/* Progress Bar */}
                            <div className="relative h-2 bg-white/20 rounded-full overflow-hidden mb-3">
                              <div
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full shadow-[0_0_10px_rgba(250,204,21,0.5)] transition-all duration-300"
                                style={{ width: `${videoWatchedPercent}%` }}
                              />
                              {/* 80% marker */}
                              <div className="absolute top-0 bottom-0 w-0.5 bg-green-400/50" style={{ left: '80%' }} />
                              {/* Glowing dot at progress position */}
                              {videoWatchedPercent > 0 && (
                                <div
                                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-yellow-400 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.8)] transition-all duration-300 border-2 border-white"
                                  style={{ left: `calc(${videoWatchedPercent}% - 8px)` }}
                                />
                              )}
                            </div>

                            {/* Progress Stats */}
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-3">
                                <span className={`font-bold text-xl ${videoWatchedPercent >= 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                                  {videoWatchedPercent}%
                                </span>
                                <span className="text-zinc-400">watched</span>
                                {isVideoPlaying && (
                                  <span className="flex items-center gap-1 text-green-400 text-xs animate-pulse">
                                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                    TRACKING
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4">
                                {videoWatchedPercent >= 80 ? (
                                  <span className="text-green-400 text-xs font-medium flex items-center gap-1">
                                    <CheckCircle size={14} /> Ready to complete
                                  </span>
                                ) : (
                                  <span className="text-zinc-500 text-xs">
                                    {80 - videoWatchedPercent}% more to unlock completion
                                  </span>
                                )}
                                <div className="flex items-center gap-2 text-zinc-400">
                                  <Clock size={14} />
                                  <span>{activeLesson.durationMin} min</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </LiquidVideoFrame>

                      {/* Video Status Panel - Liquid Glass */}
                      <div className="relative rounded-2xl overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-white/[0.05] to-white/[0.02] backdrop-blur-xl border border-white/10" />
                        <div className="relative p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {/* Status Indicator */}
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 ${
                              isVideoPlaying
                                ? 'bg-green-500/20 border border-green-500/40 shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                                : videoWatchedPercent > 0
                                  ? 'bg-yellow-400/20 border border-yellow-400/40'
                                  : 'bg-white/5 border border-white/10'
                            }`}>
                              {isVideoPlaying ? (
                                <div className="flex gap-1">
                                  <div className="w-1 h-6 bg-green-400 rounded animate-pulse"></div>
                                  <div className="w-1 h-6 bg-green-400 rounded animate-pulse" style={{animationDelay: '0.2s'}}></div>
                                  <div className="w-1 h-6 bg-green-400 rounded animate-pulse" style={{animationDelay: '0.4s'}}></div>
                                </div>
                              ) : videoWatchedPercent >= 80 ? (
                                <CheckCircle size={28} className="text-green-400" />
                              ) : (
                                <PlayCircle size={28} className={videoWatchedPercent > 0 ? 'text-yellow-400' : 'text-zinc-400'} />
                              )}
                            </div>

                            <div>
                              <p className="text-sm font-medium text-white">
                                {isVideoPlaying
                                  ? 'Tracking your progress...'
                                  : videoWatchedPercent >= 80
                                    ? 'You can complete this lesson!'
                                    : videoWatchedPercent > 0
                                      ? 'Resume watching to continue tracking'
                                      : 'Play the video to start tracking'}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {isYouTubeUrl(activeLesson.videoUrl || '')
                                  ? 'YouTube video - progress tracked automatically'
                                  : 'Uploaded video - progress tracked automatically'}
                              </p>
                            </div>
                          </div>

                          {/* Progress Circle */}
                          <div className="relative w-16 h-16">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth="2"
                              />
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke={videoWatchedPercent >= 80 ? '#22c55e' : '#FACC15'}
                                strokeWidth="2.5"
                                strokeDasharray={`${videoWatchedPercent}, 100`}
                                strokeLinecap="round"
                                className="transition-all duration-300"
                                style={{
                                  filter: `drop-shadow(0 0 6px ${videoWatchedPercent >= 80 ? 'rgba(34,197,94,0.5)' : 'rgba(250,204,21,0.5)'})`
                                }}
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className={`text-sm font-bold ${videoWatchedPercent >= 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                                {videoWatchedPercent}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. Document View - Hyper Liquid Glass */}
                  {(activeLesson.type === 'pdf' || activeLesson.type === 'presentation') && (
                    <LiquidVideoFrame>
                      <div className="aspect-video flex flex-col items-center justify-center text-center p-10 relative">
                        {/* Animated background pattern */}
                        <div className="absolute inset-0 opacity-30">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(250,204,21,0.1),transparent_50%)]" />
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(255,255,255,0.05),transparent_50%)]" />
                        </div>

                        <div className="relative z-10">
                          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-yellow-400/20 to-yellow-500/10 border border-yellow-400/30 flex items-center justify-center mb-8 mx-auto shadow-[0_0_40px_rgba(250,204,21,0.2)]">
                            <FileText size={48} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                          </div>
                          <h3 className="text-2xl font-bold text-white mb-3">{activeLesson.fileName || 'Document'}</h3>
                          <p className="text-zinc-400 mb-8 max-w-md">
                            {activeLesson.type === 'presentation'
                              ? `Review this presentation (${activeLesson.pageCount || 'N/A'} slides) to continue.`
                              : `Read this document (${activeLesson.pageCount || 'N/A'} pages) to continue.`
                            }
                          </p>
                          <PrimaryButton onClick={downloadResource} className="flex items-center gap-2">
                            {isDownloaded ? <CheckCircle size={18}/> : <Download size={18} />}
                            {isDownloaded ? 'Downloaded - Ready to Continue' : 'Download Resource'}
                          </PrimaryButton>
                        </div>
                      </div>
                    </LiquidVideoFrame>
                  )}

                  {/* 3. Quiz Runner - Hyper Liquid Glass */}
                  {activeLesson.type === 'quiz' && activeLesson.quiz && (
                    <LiquidVideoFrame>
                      <div className="min-h-[500px] flex flex-col justify-center p-10">
                        {quizState === 'INTRO' && (
                          <div className="text-center space-y-8">
                            <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-yellow-400/20 to-yellow-500/10 border border-yellow-400/30 mx-auto flex items-center justify-center shadow-[0_0_50px_rgba(250,204,21,0.2)]">
                              <HelpCircle size={56} className="text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
                            </div>
                            <div>
                              <h2 className="text-3xl font-bold text-white mb-3">Knowledge Check</h2>
                              <p className="text-zinc-400 text-lg">Test your understanding with {activeLesson.quiz.length} questions</p>
                            </div>
                            <PrimaryButton onClick={() => setQuizState('QUESTION')} className="px-10 py-4 text-lg">
                              Begin Quiz
                            </PrimaryButton>
                          </div>
                        )}

                        {quizState === 'QUESTION' && (
                          <div className="max-w-2xl mx-auto w-full animate-fade-in">
                            <div className="flex justify-between items-center mb-6">
                              <span className="text-sm text-zinc-400 font-mono">
                                Question {currentQIdx + 1} of {activeLesson.quiz.length}
                              </span>
                              <div className="flex items-center gap-2">
                                {activeLesson.quiz.map((_, i) => (
                                  <div key={i} className={`w-2 h-2 rounded-full transition-all ${
                                    i < currentQIdx ? 'bg-yellow-400'
                                    : i === currentQIdx ? 'bg-yellow-400 w-4'
                                    : 'bg-white/20'
                                  }`} />
                                ))}
                              </div>
                            </div>

                            <h3 className="text-2xl font-bold text-white mb-8 leading-relaxed">
                              {activeLesson.quiz[currentQIdx].question}
                            </h3>

                            <div className="space-y-3 mb-10">
                              {activeLesson.quiz[currentQIdx].options.map((opt, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handleQuizAnswer(idx)}
                                  className={`
                                    w-full p-5 rounded-2xl text-left border transition-all duration-300 group/opt
                                    ${quizAnswers[currentQIdx] === idx
                                      ? 'bg-yellow-400/20 border-yellow-400/50 shadow-[0_0_25px_rgba(250,204,21,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]'
                                      : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20'
                                    }
                                  `}
                                >
                                  <div className="flex items-center gap-4">
                                    <div className={`
                                      w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all
                                      ${quizAnswers[currentQIdx] === idx
                                        ? 'bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.4)]'
                                        : 'bg-white/10 text-zinc-400 group-hover/opt:bg-white/20'
                                      }
                                    `}>
                                      {String.fromCharCode(65 + idx)}
                                    </div>
                                    <span className={`text-lg ${quizAnswers[currentQIdx] === idx ? 'text-white' : 'text-zinc-300'}`}>
                                      {opt}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>

                            <div className="flex justify-end">
                              <PrimaryButton
                                onClick={handleNextQuestion}
                                disabled={quizAnswers[currentQIdx] === undefined}
                                className="px-8"
                              >
                                {currentQIdx === activeLesson.quiz.length - 1 ? 'See Results' : 'Next Question'}
                                <ChevronRight size={18} className="ml-1" />
                              </PrimaryButton>
                            </div>
                          </div>
                        )}

                        {quizState === 'RESULT' && (
                          <div className="text-center space-y-8 animate-fade-in">
                            <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-yellow-400/30 to-yellow-500/10 border border-yellow-400/40 mx-auto flex items-center justify-center shadow-[0_0_60px_rgba(250,204,21,0.3)]">
                              <Trophy size={64} className="text-yellow-400 drop-shadow-[0_0_25px_rgba(250,204,21,0.6)]" />
                            </div>
                            <div>
                              <h2 className="text-3xl font-bold text-white mb-4">Quiz Complete!</h2>
                              <div className="text-7xl font-black bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-yellow-300 to-white mb-3">
                                {Math.round((quizScore / activeLesson.quiz.length) * 100)}%
                              </div>
                              <p className="text-zinc-400 text-lg">
                                You answered <span className="text-yellow-400 font-bold">{quizScore}</span> out of <span className="text-white font-bold">{activeLesson.quiz.length}</span> correctly
                              </p>
                            </div>
                            <div className="flex gap-4 justify-center pt-4">
                              <SecondaryButton
                                onClick={() => { setQuizState('INTRO'); setCurrentQIdx(0); setQuizAnswers([]); }}
                                className="px-8"
                              >
                                <RefreshCw size={16} className="mr-2" /> Retry
                              </SecondaryButton>
                              <PrimaryButton onClick={() => handleLessonComplete(Math.round((quizScore / (activeLesson?.quiz?.length || 1)) * 100))} className="px-8">
                                <Award size={16} className="mr-2" /> Complete & Continue
                              </PrimaryButton>
                            </div>
                          </div>
                        )}
                      </div>
                    </LiquidVideoFrame>
                  )}

                  {/* Lesson Footer Controls - Hyper Glass with Progress Requirements */}
                  {activeLesson.type !== 'quiz' && (
                    <div className="relative rounded-2xl overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-white/[0.05] to-white/[0.02] backdrop-blur-xl border border-white/10" />
                      <div className="relative p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                            activeLesson.isCompleted || (activeLesson.type === 'video' && videoWatchedPercent >= 80)
                              ? 'bg-green-500/20 border border-green-500/30'
                              : 'bg-white/5 border border-white/10'
                          }`}>
                            {activeLesson.isCompleted ? (
                              <CheckCircle size={28} className="text-green-400"/>
                            ) : activeLesson.type === 'video' ? (
                              <div className="relative">
                                <PlayCircle size={28} className={videoWatchedPercent >= 80 ? 'text-green-400' : 'text-yellow-400'}/>
                                {videoWatchedPercent > 0 && videoWatchedPercent < 80 && (
                                  <span className="absolute -top-1 -right-1 text-[10px] bg-yellow-400 text-black px-1 rounded font-bold">{videoWatchedPercent}%</span>
                                )}
                              </div>
                            ) : (
                              <FileText size={28} className="text-yellow-400"/>
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-lg">{activeLesson.title}</h4>
                            <p className="text-sm text-zinc-400">
                              {activeLesson.durationMin} min • {activeLesson.isCompleted ? (
                                <span className="text-green-400 flex items-center gap-1"><CheckCircle size={12}/> Completed</span>
                              ) : activeLesson.type === 'video' ? (
                                <span className={videoWatchedPercent >= 80 ? 'text-green-400' : 'text-yellow-400'}>
                                  {videoWatchedPercent >= 80 ? 'Ready to complete' : `${videoWatchedPercent}% watched (80% required)`}
                                </span>
                              ) : 'In Progress'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {/* Document download requirement */}
                          {(activeLesson.type === 'pdf' || activeLesson.type === 'presentation') && !activeLesson.isCompleted && !isDownloaded && (
                            <div className="text-sm text-yellow-400/80 flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
                              <Download size={14} /> Download required
                            </div>
                          )}

                          {/* Video progress requirement */}
                          {activeLesson.type === 'video' && !activeLesson.isCompleted && videoWatchedPercent < 80 && (
                            <div className="text-sm text-yellow-400/80 flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
                              <PlayCircle size={14} /> Watch 80% to complete
                            </div>
                          )}

                          <PrimaryButton
                            onClick={() => handleLessonComplete()}
                            disabled={
                              activeLesson.isCompleted ||
                              ((activeLesson.type === 'pdf' || activeLesson.type === 'presentation') && !isDownloaded) ||
                              (activeLesson.type === 'video' && videoWatchedPercent < 80)
                            }
                            className={`px-8 ${
                              activeLesson.type === 'video' && videoWatchedPercent >= 80 && !activeLesson.isCompleted
                                ? 'bg-green-500 hover:bg-green-400 border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                                : ''
                            }`}
                          >
                            {activeLesson.isCompleted ? (
                              <><CheckCircle size={18} className="mr-2" /> Completed</>
                            ) : (
                              <><ChevronRight size={18} className="mr-2" /> Complete & Next</>
                            )}
                          </PrimaryButton>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <div className="w-32 h-32 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-8">
                    <BookOpen size={64} className="text-zinc-600"/>
                  </div>
                  <h3 className="text-2xl font-bold text-zinc-300 mb-3">Select a Lesson</h3>
                  <p className="text-zinc-500 max-w-sm">Choose a lesson from the curriculum to begin your learning journey.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile lesson selector */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
          <div className="bg-black/90 backdrop-blur-xl border-t border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-400/20 flex items-center justify-center text-yellow-400 font-bold">
                  {(activeCourse?.lessons.findIndex(l => l.id === activeLesson?.id) || 0) + 1}
                </div>
                <div>
                  <p className="text-sm font-medium text-white truncate max-w-[200px]">{activeLesson?.title}</p>
                  <p className="text-xs text-zinc-500">{completedCount}/{totalCount} completed</p>
                </div>
              </div>
              <button className="p-3 rounded-xl bg-white/5 border border-white/10">
                <Menu size={20} className="text-zinc-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AdminView = () => {
    // Admin State
    const [viewMode, setViewMode] = useState<'DASHBOARD' | 'EDITOR'>('DASHBOARD');
    const [editingCourse, setEditingCourse] = useState<Partial<Course> | null>(null);
    const [editorTab, setEditorTab] = useState<'DETAILS' | 'CURRICULUM'>('DETAILS');
    const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
    const [newLessonType, setNewLessonType] = useState<ContentType>('video');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Pending Users State
    const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [loadingPending, setLoadingPending] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [processingUser, setProcessingUser] = useState<string | null>(null);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [userFilterRole, setUserFilterRole] = useState<string>('ALL');

    // Track if data has been loaded (to prevent re-fetching)
    const [pendingUsersLoaded, setPendingUsersLoaded] = useState(false);
    const [allUsersLoaded, setAllUsersLoaded] = useState(false);

    // Load pending users only once
    useEffect(() => {
      if (pendingUsersLoaded) return;
      const loadPendingUsers = async () => {
        setLoadingPending(true);
        try {
          const response = await authAPI.getPendingUsers();
          setPendingUsers(response.pendingUsers);
          setPendingUsersLoaded(true);
        } catch (err) {
          console.error('Failed to load pending users:', err);
        } finally {
          setLoadingPending(false);
        }
      };
      loadPendingUsers();
    }, [pendingUsersLoaded]);

    // Load all users when USERS section is active (only once)
    useEffect(() => {
      if (adminSection !== 'USERS' || allUsersLoaded) return;
      const loadAllUsers = async () => {
        setLoadingUsers(true);
        try {
          const response = await api.admin.getUsers({ limit: 100 });
          setAllUsers(response.users || []);
          setAllUsersLoaded(true);
        } catch (err) {
          console.error('Failed to load users:', err);
        } finally {
          setLoadingUsers(false);
        }
      };
      loadAllUsers();
    }, [adminSection, allUsersLoaded]);

    const handleApproveUser = async (userId: string) => {
      setProcessingUser(userId);
      try {
        await authAPI.approveUser(userId);
        setPendingUsers(prev => prev.filter(u => u.id !== userId));
      } catch (err) {
        console.error('Failed to approve user:', err);
      } finally {
        setProcessingUser(null);
      }
    };

    const handleRejectUser = async (userId: string) => {
      setProcessingUser(userId);
      try {
        await authAPI.rejectUser(userId);
        setPendingUsers(prev => prev.filter(u => u.id !== userId));
      } catch (err) {
        console.error('Failed to reject user:', err);
      } finally {
        setProcessingUser(null);
      }
    };

    const handleCreateCourse = () => {
      setEditingCourse({
        id: `new-${Date.now()}`, // Temporary ID to identify as new course
        title: '',
        description: '',
        level: 'Beginner',
        lessons: [],
        thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070',
        totalDuration: '60 min',
        progress: 0,
        status: 'NOT_STARTED' as any
      });
      setViewMode('EDITOR');
      setEditorTab('DETAILS');
    };

    const handleEditCourse = (course: Course) => {
      setEditingCourse({...course});
      setViewMode('EDITOR');
      setEditorTab('CURRICULUM');
    };

    const addLesson = () => {
      if (!editingCourse) return;
      const lesson: Lesson = {
        id: `l-${Date.now()}`,
        title: 'New Lesson',
        type: newLessonType,
        durationMin: 10,
        content: '',
        quiz: []
      };
      setEditingCourse({
        ...editingCourse,
        lessons: [...(editingCourse.lessons || []), lesson]
      });
      setActiveLessonId(lesson.id);
    };

    const updateLesson = (id: string, updates: Partial<Lesson>) => {
      if (!editingCourse || !editingCourse.lessons) return;
      const updatedLessons = editingCourse.lessons.map(l => l.id === id ? { ...l, ...updates } : l);
      setEditingCourse({ ...editingCourse, lessons: updatedLessons });
    };

    const deleteLesson = (id: string) => {
      if (!editingCourse || !editingCourse.lessons) return;
      if (!confirm('Are you sure you want to delete this lesson?')) return;
      const updatedLessons = editingCourse.lessons.filter(l => l.id !== id);
      setEditingCourse({ ...editingCourse, lessons: updatedLessons });
      if (activeLessonId === id) {
        setActiveLessonId(updatedLessons[0]?.id || null);
      }
    };

    const deleteCourse = async (courseId: string) => {
      if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) return;
      try {
        await dataService.deleteCourse(courseId);
        const freshCourses = await dataService.getCourses();
        setCourses(freshCourses);
      } catch (error) {
        console.error('Failed to delete course:', error);
        alert('Failed to delete course. Please try again.');
      }
    };

    // Save course to backend with all lessons
    const handleSaveCourse = async () => {
      if (!editingCourse) return;
      setIsSaving(true);
      try {
        let courseId = editingCourse.id;
        const isNewCourse = !courseId || courseId.startsWith('new-');

        // 1. Create or update the course first
        if (isNewCourse) {
          const savedCourse = await dataService.createCourse(editingCourse);
          courseId = savedCourse.id;
        } else {
          await dataService.updateCourse(courseId, editingCourse);
        }

        // 2. Save all lessons
        const lessons = editingCourse.lessons || [];
        for (const lesson of lessons) {
          const isNewLesson = lesson.id.startsWith('l-');

          if (isNewLesson) {
            // Create new lesson
            await dataService.addLesson(courseId, {
              title: lesson.title,
              type: lesson.type,
              durationMin: lesson.durationMin,
              videoUrl: lesson.videoUrl,
              fileUrl: lesson.fileUrl,
              fileName: lesson.fileName,
              pageCount: lesson.pageCount,
              content: lesson.content,
              quiz: lesson.quiz
            });
          } else {
            // Update existing lesson
            await dataService.updateLesson(lesson.id, {
              title: lesson.title,
              type: lesson.type,
              durationMin: lesson.durationMin,
              videoUrl: lesson.videoUrl,
              fileUrl: lesson.fileUrl,
              fileName: lesson.fileName,
              pageCount: lesson.pageCount,
              content: lesson.content
            });
          }
        }

        // 3. Refresh courses list
        const freshCourses = await dataService.getCourses();
        setCourses(freshCourses);
        setViewMode('DASHBOARD');
        setEditingCourse(null);
        setActiveLessonId(null);
      } catch (error) {
        console.error('Failed to save course:', error);
        alert('Failed to save course. Please try again.');
      } finally {
        setIsSaving(false);
      }
    };

    // Calculate analytics for dashboard
    const totalLessons = courses.reduce((acc, c) => acc + c.lessons.length, 0);

    // --- Sub-View: Course Editor (The Hyper Glass Tool) ---
    if (viewMode === 'EDITOR' && editingCourse) {
      const activeLesson = editingCourse.lessons?.find(l => l.id === activeLessonId);

      return (
        <div className="md:ml-64 min-h-screen relative z-10 bg-black">
           {/* Editor Header */}
           <div className="h-16 glass-panel border-b border-white/10 flex items-center justify-between px-6 sticky top-0 z-30 backdrop-blur-xl">
             <div className="flex items-center gap-4">
                <IconButton icon={<ArrowLeft size={20} />} onClick={() => setViewMode('DASHBOARD')} />
                <h2 className="font-bold text-lg text-white">Course Editor</h2>
                <div className="h-4 w-px bg-white/10"></div>
                <span className="text-zinc-400 text-sm">{editingCourse.title}</span>
             </div>
             <div className="flex gap-3">
                <SecondaryButton className="px-4 py-2 text-sm h-9 flex items-center" onClick={() => setViewMode('DASHBOARD')}>Cancel</SecondaryButton>
                <PrimaryButton
                  className="px-4 py-2 text-sm h-9 flex items-center gap-2"
                  onClick={handleSaveCourse}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Saving...</>
                  ) : (
                    <><Save size={16} /> Publish Changes</>
                  )}
                </PrimaryButton>
             </div>
           </div>

           <div className="flex h-[calc(100vh-64px)]">
              {/* Left Sidebar: Structure */}
              <div className="w-80 glass-panel border-r border-white/10 flex flex-col">
                 <div className="flex border-b border-white/5">
                   <button 
                    onClick={() => setEditorTab('DETAILS')}
                    className={`flex-1 py-4 text-sm font-medium transition-colors ${editorTab === 'DETAILS' ? 'text-yellow-400 border-b-2 border-yellow-400 bg-yellow-400/5' : 'text-zinc-400 hover:text-white'}`}
                   >
                     Details
                   </button>
                   <button 
                    onClick={() => setEditorTab('CURRICULUM')}
                    className={`flex-1 py-4 text-sm font-medium transition-colors ${editorTab === 'CURRICULUM' ? 'text-yellow-400 border-b-2 border-yellow-400 bg-yellow-400/5' : 'text-zinc-400 hover:text-white'}`}
                   >
                     Curriculum
                   </button>
                 </div>

                 {editorTab === 'DETAILS' ? (
                   <div className="p-6 space-y-6 overflow-y-auto">
                      <div>
                        <label className="text-xs text-zinc-500 font-bold uppercase mb-2 block">Course Thumbnail</label>
                        <div className="aspect-video rounded-xl bg-zinc-800 overflow-hidden mb-2 relative group border border-white/10">
                          <img src={editingCourse.thumbnail} className="w-full h-full object-cover" />
                        </div>
                        <input
                          value={editingCourse.thumbnail || ''}
                          onChange={e => setEditingCourse({...editingCourse, thumbnail: e.target.value})}
                          placeholder="Enter image URL..."
                          className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-2 text-xs text-white focus:border-yellow-400 outline-none mb-2"
                        />
                        <div className="grid grid-cols-4 gap-1">
                          {[
                            'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=400',
                            'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=400',
                            'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=400',
                            'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=400',
                          ].map((url, idx) => (
                            <button
                              key={idx}
                              onClick={() => setEditingCourse({...editingCourse, thumbnail: url.replace('w=400', 'w=2070')})}
                              className={`aspect-video rounded-lg overflow-hidden border-2 transition-all ${editingCourse.thumbnail?.includes(url.split('?')[0].split('/').pop() || '') ? 'border-yellow-400' : 'border-transparent hover:border-white/30'}`}
                            >
                              <img src={url} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 font-bold uppercase mb-2 block">Title</label>
                        <input 
                          value={editingCourse.title}
                          onChange={e => setEditingCourse({...editingCourse, title: e.target.value})}
                          className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3 text-white focus:border-yellow-400 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 font-bold uppercase mb-2 block">Description</label>
                        <textarea
                          value={editingCourse.description}
                          onChange={e => setEditingCourse({...editingCourse, description: e.target.value})}
                          className="w-full h-32 bg-zinc-900/50 border border-white/10 rounded-xl p-3 text-white focus:border-yellow-400 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 font-bold uppercase mb-2 block">Course Level</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['Beginner', 'Intermediate', 'Advanced'] as const).map(level => (
                            <button
                              key={level}
                              onClick={() => setEditingCourse({...editingCourse, level})}
                              className={`py-3 px-4 rounded-xl text-sm font-medium transition-all border ${
                                editingCourse.level === level
                                  ? 'bg-yellow-400 text-black border-yellow-400 shadow-lg shadow-yellow-400/20'
                                  : 'bg-zinc-900/50 text-zinc-400 border-white/10 hover:border-yellow-400/50'
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-2">
                          {editingCourse.level === 'Beginner' && 'Available to all learners from the start'}
                          {editingCourse.level === 'Intermediate' && 'Unlocked after completing all Beginner courses'}
                          {editingCourse.level === 'Advanced' && 'Unlocked after completing Beginner & Intermediate courses'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 font-bold uppercase mb-2 block">Estimated Duration</label>
                        <input
                          value={editingCourse.totalDuration || ''}
                          onChange={e => setEditingCourse({...editingCourse, totalDuration: e.target.value})}
                          placeholder="e.g., 60 min or 1h 30min"
                          className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3 text-white focus:border-yellow-400 outline-none"
                        />
                      </div>
                   </div>
                 ) : (
                   <div className="flex-1 flex flex-col">
                     <div className="p-4 space-y-2 overflow-y-auto flex-1">
                        {editingCourse.lessons?.map((lesson, idx) => (
                          <div 
                            key={lesson.id}
                            onClick={() => setActiveLessonId(lesson.id)}
                            className={`group p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                              activeLessonId === lesson.id 
                                ? 'bg-yellow-400/10 border-yellow-400/30 shadow-[0_0_15px_rgba(250,204,21,0.1)]' 
                                : 'bg-white/5 border-transparent hover:border-white/10'
                            }`}
                          >
                             <div className="h-6 w-6 rounded flex items-center justify-center bg-zinc-800 text-zinc-400 text-xs font-mono">{idx + 1}</div>
                             <div className="flex-1 min-w-0">
                               <div className="text-sm font-medium truncate text-white">{lesson.title}</div>
                               <div className="text-[10px] text-zinc-500 uppercase flex items-center gap-1">
                                 {lesson.type === 'video' && <Video size={10} />}
                                 {lesson.type === 'quiz' && <HelpCircle size={10} />}
                                 {(lesson.type === 'pdf' || lesson.type === 'presentation') && <FileText size={10} />}
                                 {lesson.type}
                               </div>
                             </div>
                             <button
                              onClick={(e) => { e.stopPropagation(); deleteLesson(lesson.id); }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                            >
                               <Trash2 size={14} />
                             </button>
                          </div>
                        ))}
                     </div>
                     <div className="p-4 border-t border-white/10 bg-zinc-900/50">
                        <div className="flex gap-2 mb-2">
                           {(['video', 'pdf', 'presentation', 'quiz'] as ContentType[]).map(type => (
                             <button 
                                key={type}
                                onClick={() => setNewLessonType(type)}
                                className={`flex-1 py-1 rounded text-[10px] uppercase font-bold transition-all ${newLessonType === type ? 'bg-yellow-400 text-black' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}
                             >
                               {type === 'presentation' ? 'PPT' : type}
                             </button>
                           ))}
                        </div>
                        <PrimaryButton onClick={addLesson} className="w-full py-2 text-sm">Add Lesson</PrimaryButton>
                     </div>
                   </div>
                 )}
              </div>

              {/* Main Editing Area */}
              <div className="flex-1 bg-gradient-to-br from-zinc-950 to-zinc-900 p-8 overflow-y-auto">
                 {editorTab === 'CURRICULUM' && activeLesson ? (
                    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
                       <div className="flex items-center justify-between mb-2">
                         <Badge type="default">{activeLesson.type.toUpperCase()}</Badge>
                         <div className="text-xs text-zinc-500 font-mono">ID: {activeLesson.id}</div>
                       </div>
                       
                       <input 
                         className="text-3xl font-bold bg-transparent border-none outline-none text-white placeholder-zinc-600 w-full"
                         placeholder="Lesson Title"
                         value={activeLesson.title}
                         onChange={(e) => updateLesson(activeLesson.id, { title: e.target.value })}
                       />

                       {/* Content Type Specific Editors */}
                       
                       {/* 1. Video Editor */}
                       {activeLesson.type === 'video' && (
                         <GlassCard className="space-y-6">
                           {/* Video Source Options */}
                           <div className="space-y-4">
                             <label className="block text-sm text-zinc-400 mb-2">Video Source</label>
                             <div className="grid grid-cols-2 gap-4">
                               {/* Option 1: URL */}
                               <div className="space-y-2">
                                 <div className="text-xs text-zinc-500 uppercase font-bold">From URL (YouTube/Vimeo)</div>
                                 <input
                                   className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3 outline-none focus:border-yellow-400 text-sm"
                                   placeholder="https://youtube.com/watch?v=..."
                                   value={activeLesson.videoUrl || ''}
                                   onChange={(e) => updateLesson(activeLesson.id, { videoUrl: e.target.value, fileUrl: undefined })}
                                 />
                               </div>
                               {/* Option 2: Upload */}
                               <div className="space-y-2">
                                 <div className="text-xs text-zinc-500 uppercase font-bold">Upload from Computer</div>
                                 <FileDropZone
                                   label="Upload Video"
                                   accept="video/mp4,video/webm,video/ogg,.mp4,.webm,.ogg"
                                   currentFile={activeLesson.fileName}
                                   isUploading={isUploading}
                                   uploadProgress={uploadProgress}
                                   onFileSelect={async (file) => {
                                     try {
                                       setIsUploading(true);
                                       setUploadProgress(0);
                                       const result = await dataService.uploadFile(file, (progress) => {
                                         setUploadProgress(progress);
                                       });
                                       updateLesson(activeLesson.id, {
                                         fileUrl: result.file.fileUrl,
                                         fileName: result.file.originalName,
                                         videoUrl: undefined
                                       });
                                     } catch (error) {
                                       console.error('Failed to upload video:', error);
                                       alert('Failed to upload video. Please try again.');
                                     } finally {
                                       setIsUploading(false);
                                       setUploadProgress(0);
                                     }
                                   }}
                                 />
                               </div>
                             </div>
                           </div>

                           {/* Duration */}
                           <div className="w-48">
                             <label className="block text-sm text-zinc-400 mb-1">Duration (min)</label>
                             <input
                               type="number"
                               className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3 outline-none focus:border-yellow-400"
                               value={activeLesson.durationMin}
                               onChange={(e) => updateLesson(activeLesson.id, { durationMin: parseInt(e.target.value) })}
                             />
                           </div>

                           {/* Preview */}
                           <div className="aspect-video bg-black rounded-xl border border-white/10 flex items-center justify-center text-zinc-500 overflow-hidden">
                              {activeLesson.videoUrl ? (
                                isYouTubeUrl(activeLesson.videoUrl) ? (
                                  <iframe
                                    src={`https://www.youtube.com/embed/${getYouTubeVideoId(activeLesson.videoUrl)}`}
                                    className="w-full h-full"
                                    allowFullScreen
                                  />
                                ) : (
                                  <iframe src={activeLesson.videoUrl} className="w-full h-full" allowFullScreen />
                                )
                              ) : activeLesson.fileUrl ? (
                                <video
                                  src={activeLesson.fileUrl}
                                  controls
                                  className="w-full h-full"
                                />
                              ) : (
                                <div className="text-center">
                                  <MonitorPlay size={48} className="mx-auto mb-2 opacity-50"/>
                                  <p>Enter a URL or upload a video to preview</p>
                                </div>
                              )}
                           </div>
                         </GlassCard>
                       )}

                       {/* 2. Document (PDF/PPT) Editor */}
                       {(activeLesson.type === 'pdf' || activeLesson.type === 'presentation') && (
                         <GlassCard className="space-y-6">
                            <FileDropZone
                              label={`Upload ${activeLesson.type === 'pdf' ? 'PDF Document' : 'PowerPoint Presentation'}`}
                              accept={activeLesson.type === 'pdf' ? '.pdf,application/pdf' : '.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation'}
                              currentFile={activeLesson.fileName}
                              isUploading={isUploading}
                              uploadProgress={uploadProgress}
                              onFileSelect={async (file) => {
                                try {
                                  setIsUploading(true);
                                  setUploadProgress(0);
                                  const result = await dataService.uploadFile(file, (progress) => {
                                    setUploadProgress(progress);
                                  });
                                  updateLesson(activeLesson.id, {
                                    fileUrl: result.file.fileUrl,
                                    fileName: result.file.originalName
                                  });
                                } catch (error) {
                                  console.error('Failed to upload file:', error);
                                  alert('Failed to upload file. Please try again.');
                                } finally {
                                  setIsUploading(false);
                                  setUploadProgress(0);
                                }
                              }}
                            />
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm text-zinc-400 mb-1">Total {activeLesson.type === 'pdf' ? 'Pages' : 'Slides'}</label>
                                <input 
                                  type="number"
                                  className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3 outline-none focus:border-yellow-400"
                                  value={activeLesson.pageCount || 0}
                                  onChange={(e) => updateLesson(activeLesson.id, { pageCount: parseInt(e.target.value) })}
                                />
                                <p className="text-[10px] text-zinc-500 mt-1">Used to calculate est. reading time</p>
                              </div>
                              <div>
                                <label className="block text-sm text-zinc-400 mb-1">Est. Time (min)</label>
                                <input 
                                  type="number"
                                  className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3 outline-none focus:border-yellow-400"
                                  value={activeLesson.durationMin}
                                  readOnly
                                />
                                <p className="text-[10px] text-yellow-400 mt-1">Auto-calculated: 2 min / page</p>
                              </div>
                            </div>
                         </GlassCard>
                       )}

                       {/* 3. Quiz Editor */}
                       {activeLesson.type === 'quiz' && (
                         <div className="space-y-4">
                            {activeLesson.quiz?.map((q, qIdx) => (
                              <GlassCard key={q.id} className="relative group">
                                <button className="absolute top-4 right-4 text-zinc-500 hover:text-red-400"><X size={16}/></button>
                                <div className="mb-4">
                                  <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Question {qIdx + 1}</label>
                                  <input 
                                    className="w-full bg-zinc-900 border-b border-white/10 p-2 outline-none focus:border-yellow-400"
                                    value={q.question}
                                    placeholder="Enter question..."
                                    onChange={(e) => {
                                      const newQuiz = [...(activeLesson.quiz || [])];
                                      newQuiz[qIdx].question = e.target.value;
                                      updateLesson(activeLesson.id, { quiz: newQuiz });
                                    }}
                                  />
                                </div>
                                <div className="space-y-2">
                                  {q.options.map((opt, oIdx) => (
                                    <div key={oIdx} className="flex items-center gap-3">
                                      <input 
                                        type="radio" 
                                        checked={q.correctAnswer === oIdx}
                                        onChange={() => {
                                          const newQuiz = [...(activeLesson.quiz || [])];
                                          newQuiz[qIdx].correctAnswer = oIdx;
                                          updateLesson(activeLesson.id, { quiz: newQuiz });
                                        }}
                                        className="text-yellow-400 accent-yellow-400"
                                      />
                                      <input 
                                        className="flex-1 bg-transparent border border-white/5 rounded px-2 py-1 text-sm focus:border-white/20 outline-none"
                                        value={opt}
                                        onChange={(e) => {
                                          const newQuiz = [...(activeLesson.quiz || [])];
                                          newQuiz[qIdx].options[oIdx] = e.target.value;
                                          updateLesson(activeLesson.id, { quiz: newQuiz });
                                        }}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </GlassCard>
                            ))}
                            
                            {(activeLesson.quiz?.length || 0) < 5 ? (
                                <button 
                                onClick={() => {
                                    const newQuiz = [...(activeLesson.quiz || []), { id: `q-${Date.now()}`, question: '', options: ['Option A', 'Option B'], correctAnswer: 0 }];
                                    updateLesson(activeLesson.id, { quiz: newQuiz });
                                }}
                                className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl text-zinc-500 hover:text-yellow-400 hover:border-yellow-400/30 hover:bg-yellow-400/5 transition-all flex items-center justify-center gap-2"
                                >
                                <Plus size={20} /> Add Question
                                </button>
                            ) : (
                                <div className="text-center p-4 text-zinc-500 text-sm italic border border-white/5 rounded-xl">
                                    Maximum 5 questions per quiz reached.
                                </div>
                            )}
                         </div>
                       )}

                    </div>
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                       <Layout size={64} className="mb-6 opacity-20" />
                       <h3 className="text-xl font-medium text-zinc-400">Select a lesson to edit content</h3>
                       <p className="max-w-xs text-center mt-2 opacity-60">Choose from the curriculum on the left or create a new lesson.</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      );
    }

    // --- User Management Section (Liquid Glass Design) ---
    const UserManagementSection = () => {
      const filteredUsers = allUsers.filter(u => {
        const matchesSearch = userSearchQuery === '' ||
          u.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
          u.email?.toLowerCase().includes(userSearchQuery.toLowerCase());
        const matchesRole = userFilterRole === 'ALL' || u.role === userFilterRole;
        return matchesSearch && matchesRole;
      });

      return (
        <div className="space-y-8 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h2 className="text-3xl font-bold">User Management</h2>
              <p className="text-zinc-400 mt-1">Approve, manage, and monitor user accounts</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                <Users size={16} className="text-zinc-500" />
                <span className="text-white font-medium">{allUsers.length}</span>
                <span className="text-zinc-500">total users</span>
              </div>
            </div>
          </div>

          {/* Pending Approvals - Liquid Glass Card */}
          {pendingUsers.length > 0 && (
            <div className="relative group">
              {/* Outer glow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500/20 via-yellow-400/10 to-yellow-500/20 rounded-[28px] blur-xl opacity-60 group-hover:opacity-100 transition-all duration-700" />

              <div className="relative rounded-3xl overflow-hidden backdrop-blur-2xl bg-gradient-to-br from-yellow-900/20 via-black/40 to-black/60 border border-yellow-500/30 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] p-8">
                {/* Inner highlight */}
                <div className="absolute inset-0 bg-gradient-to-b from-yellow-400/5 via-transparent to-transparent pointer-events-none" />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400/30 to-yellow-500/10 border border-yellow-400/40 flex items-center justify-center shadow-[0_0_30px_rgba(250,204,21,0.2)]">
                        <Clock size={28} className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">Pending Approvals</h3>
                        <p className="text-sm text-yellow-400/80">{pendingUsers.length} user{pendingUsers.length > 1 ? 's' : ''} awaiting your review</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {pendingUsers.map((pendingUser, idx) => (
                      <div
                        key={pendingUser.id}
                        className="group/card relative overflow-hidden rounded-2xl bg-gradient-to-r from-white/[0.06] to-white/[0.02] border border-white/10 hover:border-yellow-400/30 transition-all duration-500 p-5"
                        style={{ animationDelay: `${idx * 100}ms` }}
                      >
                        {/* Hover glow effect */}
                        <div className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500">
                          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/5 via-transparent to-transparent" />
                        </div>

                        <div className="relative z-10 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 border border-white/10 flex items-center justify-center font-bold text-lg text-white shadow-lg">
                              {pendingUser.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-white text-lg">{pendingUser.name}</div>
                              <div className="text-sm text-zinc-400">{pendingUser.email}</div>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-zinc-500">{pendingUser.ministry}</span>
                                <span className="w-1 h-1 rounded-full bg-zinc-600" />
                                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-zinc-400">{pendingUser.role}</span>
                                <span className="w-1 h-1 rounded-full bg-zinc-600" />
                                <span className="text-xs text-zinc-500">{new Date(pendingUser.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleApproveUser(pendingUser.id)}
                              disabled={processingUser === pendingUser.id}
                              className="group/btn relative px-6 py-3 rounded-xl bg-gradient-to-r from-green-500/20 to-green-600/10 border border-green-500/30 text-green-400 hover:border-green-400/50 hover:shadow-[0_0_20px_rgba(34,197,94,0.2)] transition-all duration-300 flex items-center gap-2 font-medium disabled:opacity-50"
                            >
                              {processingUser === pendingUser.id ? (
                                <Loader2 size={18} className="animate-spin" />
                              ) : (
                                <UserCheck size={18} />
                              )}
                              <span className="hidden sm:inline">Approve</span>
                            </button>

                            <button
                              onClick={() => handleRejectUser(pendingUser.id)}
                              disabled={processingUser === pendingUser.id}
                              className="group/btn relative px-6 py-3 rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/10 border border-red-500/30 text-red-400 hover:border-red-400/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] transition-all duration-300 flex items-center gap-2 font-medium disabled:opacity-50"
                            >
                              <UserX size={18} />
                              <span className="hidden sm:inline">Reject</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No Pending Users - Clean State */}
          {pendingUsers.length === 0 && !loadingPending && (
            <GlassCard className="text-center py-12">
              <div className="w-20 h-20 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={40} className="text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">All Caught Up!</h3>
              <p className="text-zinc-400">No pending user approvals at this time.</p>
            </GlassCard>
          )}

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-4 pl-12 text-white focus:ring-2 focus:ring-yellow-400/50 outline-none transition-all placeholder-zinc-600"
              />
              <Users size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            </div>
            <div className="flex gap-2">
              {['ALL', 'LEARNER', 'SUPERUSER', 'ADMIN'].map(role => (
                <button
                  key={role}
                  onClick={() => setUserFilterRole(role)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    userFilterRole === role
                      ? 'bg-yellow-400 text-black'
                      : 'bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10'
                  }`}
                >
                  {role === 'ALL' ? 'All Users' : role}
                </button>
              ))}
            </div>
          </div>

          {/* All Users List */}
          <GlassCard className="p-0 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <h3 className="text-lg font-bold">All Users ({filteredUsers.length})</h3>
            </div>

            {loadingUsers ? (
              <div className="p-12 text-center">
                <Loader2 size={32} className="animate-spin text-yellow-400 mx-auto" />
                <p className="text-zinc-500 mt-4">Loading users...</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredUsers.map(u => (
                  <div key={u.id} className="p-4 hover:bg-white/[0.02] transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        u.is_approved ? 'bg-yellow-400 text-black' : 'bg-zinc-700 text-zinc-400'
                      }`}>
                        {u.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="font-medium text-white flex items-center gap-2">
                          {u.name}
                          {!u.is_approved && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400">PENDING</span>
                          )}
                          {!u.is_active && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-400/20 text-red-400">INACTIVE</span>
                          )}
                        </div>
                        <div className="text-sm text-zinc-500">{u.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden md:block">
                        <div className="text-sm text-zinc-400">{u.ministry}</div>
                        <div className="text-xs text-zinc-600">{u.role}</div>
                      </div>
                      <Badge type={u.is_approved ? 'success' : 'warning'}>{u.is_approved ? 'Active' : 'Pending'}</Badge>
                    </div>
                  </div>
                ))}

                {filteredUsers.length === 0 && (
                  <div className="p-12 text-center text-zinc-500">
                    No users found matching your criteria.
                  </div>
                )}
              </div>
            )}
          </GlassCard>
        </div>
      );
    };

    // --- Main Admin Dashboard ---
    return (
      <div className="md:ml-64 min-h-screen relative z-10 pb-20">
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">

          {/* Render User Management Section */}
          {adminSection === 'USERS' && <UserManagementSection />}

          {/* Render Overview Section */}
          {adminSection === 'OVERVIEW' && (
            <>
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold">Admin Command Center</h2>
                  <p className="text-zinc-400 mt-1">Overview of academy performance and content</p>
                </div>
                <PrimaryButton onClick={handleCreateCourse} className="text-sm shadow-lg shadow-yellow-400/20">
                  <Plus size={18} /> New Course
                </PrimaryButton>
              </div>

          {/* KPI Cards - Glass Effect */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <GlassCard className="relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Users size={64} /></div>
               <div className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2">Total Learners</div>
               <div className="text-4xl font-bold text-white mb-1">2,405</div>
               <div className="text-yellow-400 text-xs flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div> +128 this week</div>
            </GlassCard>
            <GlassCard className="relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><BookOpen size={64} /></div>
               <div className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2">Content Library</div>
               <div className="text-4xl font-bold text-white mb-1">{totalLessons}</div>
               <div className="text-zinc-400 text-xs">Across {courses.length} courses</div>
            </GlassCard>
            <GlassCard className="relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><MonitorPlay size={64} /></div>
               <div className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2">Study Hours</div>
               <div className="text-4xl font-bold text-white mb-1">12.5k</div>
               <div className="text-white text-xs">Video + Reading + Quizzes</div>
            </GlassCard>
             <GlassCard className="relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><CheckCircle size={64} /></div>
               <div className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2">Completion Rate</div>
               <div className="text-4xl font-bold text-white mb-1">68%</div>
               <div className="text-yellow-400 text-xs">Avg. per enrollment</div>
            </GlassCard>
          </div>

          {/* URGENT: Pending Users Alert - Hyper Visible Liquid Glass */}
          {pendingUsers.length > 0 && (
            <div className="relative group cursor-pointer" onClick={() => setAdminSection('USERS')}>
              {/* Animated outer glow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-red-500/40 via-yellow-500/30 to-red-500/40 rounded-[28px] blur-xl opacity-80 animate-pulse" />
              <div className="absolute -inset-0.5 bg-gradient-to-br from-red-400/20 via-transparent to-yellow-400/20 rounded-[26px] blur-md" />

              <div className="relative rounded-3xl overflow-hidden backdrop-blur-2xl bg-gradient-to-br from-red-900/30 via-black/60 to-yellow-900/20 border-2 border-red-500/50 shadow-[0_8px_32px_rgba(239,68,68,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] p-6 hover:border-yellow-400/60 transition-all duration-500">
                {/* Inner highlight */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-transparent pointer-events-none" />

                {/* Pulsing alert indicator */}
                <div className="absolute top-4 right-4">
                  <span className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                  </span>
                </div>

                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/30 to-yellow-500/20 border border-red-400/50 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                      <UserCheck size={32} className="text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/30 text-red-400 font-bold uppercase tracking-wider animate-pulse">Action Required</span>
                      </div>
                      <h3 className="text-2xl font-bold text-white">{pendingUsers.length} Pending User{pendingUsers.length > 1 ? 's' : ''}</h3>
                      <p className="text-sm text-zinc-400 mt-1">Click here to approve or reject registration requests</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden md:flex flex-col items-end text-right">
                      <span className="text-xs text-zinc-500">Oldest</span>
                      <span className="text-sm text-white font-medium">{pendingUsers.length > 0 ? new Date(pendingUsers[0].created_at).toLocaleDateString('fr-FR') : '-'}</span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-yellow-400/20 border border-yellow-400/30 flex items-center justify-center group-hover:bg-yellow-400/30 transition-all">
                      <ChevronRight size={24} className="text-yellow-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <GlassCard className="lg:col-span-2 p-8">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-bold">Ministry Engagement</h3>
                 <div className="flex gap-2">
                   <button className="px-3 py-1 text-xs rounded-full bg-white/10 text-white">Weekly</button>
                   <button className="px-3 py-1 text-xs rounded-full hover:bg-white/5 text-zinc-400">Monthly</button>
                 </div>
               </div>
               <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={adminStats} barSize={40}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                      <YAxis stroke="#64748b" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{fill: '#ffffff05'}}
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="value" radius={[8, 8, 8, 8]}>
                        {adminStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#FACC15', '#CA8A04', '#FEF08A', '#713F12'][index % 4]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
               </div>
            </GlassCard>
            
            <GlassCard className="p-8">
               <h3 className="text-xl font-bold mb-6">Content Types</h3>
               <div className="h-64 w-full relative">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Video', value: 45, fill: '#FACC15' },
                          { name: 'Reading', value: 30, fill: '#FFFFFF' },
                          { name: 'Quizzes', value: 25, fill: '#A16207' },
                        ]}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                         <Cell fill="#FACC15" />
                         <Cell fill="#FFFFFF" />
                         <Cell fill="#A16207" />
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }} />
                    </PieChart>
                 </ResponsiveContainer>
                 <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                    <span className="text-3xl font-bold text-white">100%</span>
                    <span className="text-xs text-zinc-400">Balanced</span>
                 </div>
               </div>
               <div className="flex justify-center gap-4 text-xs">
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400"></div> Video</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-white"></div> Docs</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-700"></div> Quiz</div>
               </div>
            </GlassCard>
          </div>

          {/* Manage Courses (Enhanced List) */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold">Manage Courses</h3>
            <div className="grid gap-4">
              {courses.map(course => (
                <GlassCard key={course.id} className="group p-0 overflow-hidden flex flex-col md:flex-row items-center hover:border-yellow-400/50 transition-colors">
                  <div className="h-32 w-full md:w-48 bg-cover bg-center grayscale group-hover:grayscale-0 transition-all duration-500" style={{backgroundImage: `url(${course.thumbnail})`}}>
                     <div className="h-full w-full bg-black/40 group-hover:bg-transparent transition-colors"></div>
                  </div>
                  <div className="p-6 flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xl font-bold text-white mb-1">{course.title}</h4>
                        <p className="text-sm text-zinc-400 truncate mb-3">{course.description}</p>
                        <div className="flex gap-3 text-xs">
                          <Badge>{course.level}</Badge>
                          <span className="flex items-center gap-1 text-zinc-400"><List size={14}/> {course.lessons.length} Modules</span>
                          <span className="flex items-center gap-1 text-zinc-400"><Users size={14}/> {course.enrolledCount} Enrolled</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 border-l border-white/5 flex gap-3">
                     <SecondaryButton onClick={() => handleEditCourse(course)} className="h-10 px-4 text-xs flex items-center gap-2">
                       Edit Content
                     </SecondaryButton>
                     <button
                       onClick={() => deleteCourse(course.id)}
                       className="h-10 w-10 flex items-center justify-center rounded-full border border-red-900/30 text-red-400 hover:bg-red-900/20 transition-colors"
                     >
                       <Trash2 size={16} />
                     </button>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
            </>
          )}

          {/* Courses Section */}
          {adminSection === 'COURSES' && (
            <>
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold">Course Manager</h2>
                  <p className="text-zinc-400 mt-1">Create, edit, and manage your course content</p>
                </div>
                <PrimaryButton onClick={handleCreateCourse} className="text-sm shadow-lg shadow-yellow-400/20">
                  <Plus size={18} /> New Course
                </PrimaryButton>
              </div>

              {/* Courses grouped by level */}
              {(['Beginner', 'Intermediate', 'Advanced'] as const).map(level => {
                const levelCourses = courses.filter(c => c.level === level);
                if (levelCourses.length === 0) return null;
                return (
                  <div key={level} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge type={level === 'Beginner' ? 'success' : level === 'Intermediate' ? 'warning' : 'default'}>{level}</Badge>
                      <span className="text-sm text-zinc-500">{levelCourses.length} course{levelCourses.length > 1 ? 's' : ''}</span>
                    </div>
                    <div className="grid gap-4">
                      {levelCourses.map(course => (
                  <GlassCard key={course.id} className="group p-0 overflow-hidden flex flex-col md:flex-row items-center hover:border-yellow-400/50 transition-colors">
                    <div className="h-32 w-full md:w-48 bg-cover bg-center grayscale group-hover:grayscale-0 transition-all duration-500" style={{backgroundImage: `url(${course.thumbnail})`}}>
                       <div className="h-full w-full bg-black/40 group-hover:bg-transparent transition-colors"></div>
                    </div>
                    <div className="p-6 flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xl font-bold text-white mb-1">{course.title}</h4>
                          <p className="text-sm text-zinc-400 truncate mb-3">{course.description}</p>
                          <div className="flex gap-3 text-xs">
                            <Badge>{course.level}</Badge>
                            <span className="flex items-center gap-1 text-zinc-400"><List size={14}/> {course.lessons.length} Modules</span>
                            <span className="flex items-center gap-1 text-zinc-400"><Users size={14}/> {course.enrolledCount || 0} Enrolled</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 border-l border-white/5 flex gap-3">
                       <SecondaryButton onClick={() => handleEditCourse(course)} className="h-10 px-4 text-xs flex items-center gap-2">
                         Edit Content
                       </SecondaryButton>
                       <button className="h-10 w-10 flex items-center justify-center rounded-full border border-red-900/30 text-red-400 hover:bg-red-900/20 transition-colors">
                         <Trash2 size={16} />
                       </button>
                    </div>
                  </GlassCard>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Analytics Section */}
          {adminSection === 'ANALYTICS' && (
            <>
              <div>
                <h2 className="text-3xl font-bold">Analytics Dashboard</h2>
                <p className="text-zinc-400 mt-1">Detailed insights into platform engagement</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <GlassCard className="lg:col-span-2 p-8">
                   <div className="flex justify-between items-center mb-6">
                     <h3 className="text-xl font-bold">Ministry Engagement</h3>
                     <div className="flex gap-2">
                       <button className="px-3 py-1 text-xs rounded-full bg-white/10 text-white">Weekly</button>
                       <button className="px-3 py-1 text-xs rounded-full hover:bg-white/5 text-zinc-400">Monthly</button>
                     </div>
                   </div>
                   <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={adminStats} barSize={40}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis dataKey="name" stroke="#64748b" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                          <YAxis stroke="#64748b" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                          <Tooltip
                            cursor={{fill: '#ffffff05'}}
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                            itemStyle={{ color: '#fff' }}
                          />
                          <Bar dataKey="value" radius={[8, 8, 8, 8]}>
                            {adminStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#FACC15', '#CA8A04', '#FEF08A', '#713F12'][index % 4]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                </GlassCard>

                <GlassCard className="p-8">
                   <h3 className="text-xl font-bold mb-6">Content Types</h3>
                   <div className="h-64 w-full relative">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Video', value: 45, fill: '#FACC15' },
                              { name: 'Reading', value: 30, fill: '#FFFFFF' },
                              { name: 'Quizzes', value: 25, fill: '#A16207' },
                            ]}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                             <Cell fill="#FACC15" />
                             <Cell fill="#FFFFFF" />
                             <Cell fill="#A16207" />
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }} />
                        </PieChart>
                     </ResponsiveContainer>
                     <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                        <span className="text-3xl font-bold text-white">100%</span>
                        <span className="text-xs text-zinc-400">Balanced</span>
                     </div>
                   </div>
                   <div className="flex justify-center gap-4 text-xs">
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400"></div> Video</div>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-white"></div> Docs</div>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-700"></div> Quiz</div>
                   </div>
                </GlassCard>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="font-sans text-slate-50 selection:bg-yellow-400/30">
      <LiquidBackground />
      
      {/* Sidebar for authenticated views except player */}
      {(currentView === 'DASHBOARD' || currentView === 'ADMIN') && <Sidebar />}

      {/* Main Content Router */}
      <main className="transition-all duration-500 ease-in-out">
        {currentView === 'LANDING' && <LandingView />}
        {currentView === 'AUTH' && <AuthView />}
        {currentView === 'DASHBOARD' && <DashboardView />}
        {currentView === 'COURSE_PLAYER' && <PlayerView />}
        {currentView === 'ADMIN' && <AdminView />}
      </main>
    </div>
  );
};

export default App;