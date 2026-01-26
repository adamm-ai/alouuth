import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Layout,
  Trophy,
  Settings,
  CheckCircle,
  LogOut,
  ChevronRight,
  ChevronUp,
  ChevronDown,
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
  Loader2,
  XCircle,
  Calendar,
  AlertTriangle,
  Target,
  GripVertical,
  Pencil
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { LiquidBackground } from './components/LiquidBackground';
import { GlassCard, PrimaryButton, SecondaryButton, ProgressBar, Badge, FileDropZone, IconButton, ToastProvider, useToast, LiquidVideoFrame } from './components/UIComponents';
import { AnimatePresence, Reorder, motion, LayoutGroup } from 'framer-motion';
import { PageTransition } from './components/PageTransition';
import { dataService } from './services/dataService';
import { authAPI, setAuthToken, getAuthToken, PendingUser, adminAPI } from './services/api';
import api from './services/api';
import { MINISTRIES } from './constants';
import { Course, User, UserRole, Lesson, AnalyticData, LearningPath, ContentType } from './types';

// --- Types for Views ---
type View = 'LANDING' | 'AUTH' | 'DASHBOARD' | 'COURSE_PLAYER' | 'ADMIN';
type AdminSection = 'OVERVIEW' | 'USERS' | 'COURSES' | 'ANALYTICS';

// VideoFrame moved to components/UIComponents.tsx

// Helper to sort courses by level priority and orderIndex
const LEVEL_PRIORITY: Record<string, number> = { 'Beginner': 0, 'Intermediate': 1, 'Advanced': 2 };
const sortCourses = (coursesToSort: Course[]): Course[] => {
  return [...coursesToSort].sort((a, b) => {
    // First sort by level priority
    const levelDiff = (LEVEL_PRIORITY[a.level] || 0) - (LEVEL_PRIORITY[b.level] || 0);
    if (levelDiff !== 0) return levelDiff;
    // Then sort by orderIndex within the same level
    return (a.orderIndex ?? 999) - (b.orderIndex ?? 999);
  });
};

// Video Helpers
const isYouTubeUrl = (url: string) => {
  return url.includes('youtube.com') || url.includes('youtu.be');
};

const getYouTubeVideoId = (url: string) => {
  if (url.includes('youtu.be')) {
    return url.split('/').pop();
  }
  const urlParams = new URLSearchParams(new URL(url).search);
  return urlParams.get('v');
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('LANDING');
  const [user, setUser] = useState<User | null>(null);
  const [quizPassed, setQuizPassed] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [adminStats, setAdminStats] = useState<AnalyticData[]>([]);
  const [isLoading, setIsLoading] = useState(() => dataService.isAuthenticated());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [adminSection, setAdminSection] = useState<AdminSection>('OVERVIEW');
  const [draggedCourseId, setDraggedCourseId] = useState<string | null>(null);
  const [playerSidebarCollapsed, setPlayerSidebarCollapsed] = useState(false); // Persists across lesson navigation
  const [userDashboardStats, setUserDashboardStats] = useState<{
    enrolledCourses: number;
    completedCourses: number;
    lessonsCompleted: number;
    averageQuizScore: number;
  } | null>(null);

  // Restore session on page load/refresh
  useEffect(() => {
    const restoreSession = async () => {
      // Check if user is already authenticated (token in localStorage)
      if (!dataService.isAuthenticated()) {
        return; // No token, stay on landing
      }

      setIsLoading(true);
      try {
        // Validate token by fetching user data
        const fetchedUser = await dataService.getUser();
        setUser(fetchedUser);

        // --- NEW: Persistent View State Restore ---
        const savedView = localStorage.getItem('amini_active_view') as View | null;
        const savedCourseId = localStorage.getItem('amini_active_course_id');
        const savedLessonId = localStorage.getItem('amini_active_lesson_id');

        if (savedView) {
          if (savedView === 'COURSE_PLAYER' && savedCourseId) {
            // If they were in the player, we need to load courses first to find the active course
            const fetchedCourses = await dataService.getCourses();
            setCourses(sortCourses(fetchedCourses));
            setDataLoaded(true); // Mark as loaded so loadData doesn't run again

            const targetCourse = fetchedCourses.find(c => c.id === savedCourseId);
            if (targetCourse) {
              setActiveCourse(targetCourse);
              const targetLesson = targetCourse.lessons.find(l => l.id === savedLessonId);
              setActiveLesson(targetLesson || targetCourse.lessons[0]);
              setCurrentView('COURSE_PLAYER');
            } else {
              setCurrentView('DASHBOARD');
            }
          } else if (savedView === 'ADMIN' && (fetchedUser.role === 'ADMIN' || fetchedUser.role === 'SUPERUSER')) {
            setCurrentView('ADMIN');
          } else if (savedView === 'DASHBOARD') {
            setCurrentView('DASHBOARD');
          } else {
            // Default based on role
            setCurrentView(fetchedUser.role === 'ADMIN' || fetchedUser.role === 'SUPERUSER' ? 'ADMIN' : 'DASHBOARD');
          }
        } else {
          // No saved view, default based on role
          setCurrentView(fetchedUser.role === 'ADMIN' || fetchedUser.role === 'SUPERUSER' ? 'ADMIN' : 'DASHBOARD');
        }
      } catch (error) {
        // Token is invalid or expired, clear it
        console.error('Session restoration failed:', error);
        setAuthToken(null);
        setCurrentView('LANDING');
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []); // Run once on mount

  // --- NEW: Persistent View State Persistence ---
  useEffect(() => {
    if (user && currentView !== 'LANDING' && currentView !== 'AUTH') {
      localStorage.setItem('amini_active_view', currentView);
      if (activeCourse) {
        localStorage.setItem('amini_active_course_id', activeCourse.id);
      }
      if (activeLesson) {
        localStorage.setItem('amini_active_lesson_id', activeLesson.id);
      }
    }
  }, [currentView, activeCourse, activeLesson, user]);

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
        // Sort courses by level and orderIndex to ensure consistent display
        setCourses(sortCourses(fetchedCourses));
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
        // Small delay to ensure view state has propagated before revealing
        setTimeout(() => setIsLoading(false), 50);
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

  // Learning Path Enforcement: Check if user can access a course based on level
  // Updated logic: User must complete ALL ENROLLED courses in previous level to unlock next level
  const canAccessCourse = (course: Course): { allowed: boolean; reason?: string; progressInfo?: string } => {
    const levelOrder = ['Beginner', 'Intermediate', 'Advanced'];
    const courseLevel = levelOrder.indexOf(course.level);

    // Beginner courses are always accessible
    if (courseLevel === 0) return { allowed: true };

    // For higher levels, check if ALL ENROLLED previous level courses are completed
    const previousLevel = levelOrder[courseLevel - 1];
    const previousLevelCourses = courses.filter(c => c.level === previousLevel);

    // Enrolled courses = those with progress > 0 (user has started them)
    const enrolledPreviousCourses = previousLevelCourses.filter(c => c.progress > 0);

    // If user hasn't enrolled in any previous level courses, they need to complete at least one
    if (enrolledPreviousCourses.length === 0) {
      return {
        allowed: false,
        reason: `Enroll in and complete at least one ${previousLevel} course first to unlock ${course.level} courses.`,
        progressInfo: `0 ${previousLevel} courses enrolled`
      };
    }

    // Count completed enrolled courses (100% progress)
    const completedEnrolledCourses = enrolledPreviousCourses.filter(c => c.progress >= 100);

    // All enrolled courses must be completed to unlock next level
    if (completedEnrolledCourses.length < enrolledPreviousCourses.length) {
      return {
        allowed: false,
        reason: `Complete all enrolled ${previousLevel} courses to unlock ${course.level} courses.`,
        progressInfo: `${completedEnrolledCourses.length}/${enrolledPreviousCourses.length} ${previousLevel} courses completed`
      };
    }

    return { allowed: true };
  };

  const handleStartCourse = async (course: Course) => {
    // Check level enforcement
    const accessCheck = canAccessCourse(course);
    if (!accessCheck.allowed) {
      alert(accessCheck.reason);
      return;
    }

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

  // Handle course reorder via drag-and-drop (Admin only)
  const handleCourseDrop = async (level: 'Beginner' | 'Intermediate' | 'Advanced', fromIndex: number, toIndex: number): Promise<boolean> => {
    if (fromIndex === toIndex) return true;

    // Get courses for this level and reorder locally
    const levelCourses = courses.filter(c => c.level === level);
    const otherCourses = courses.filter(c => c.level !== level);
    const reordered = [...levelCourses];
    const [movedCourse] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, movedCourse);

    // Update orderIndex values to match new positions
    const reorderedWithIndex = reordered.map((course, idx) => ({
      ...course,
      orderIndex: idx
    }));

    // Update state immediately for smooth UX - maintain sorted order
    setCourses(sortCourses([...otherCourses, ...reorderedWithIndex]));

    // Sync with backend
    try {
      const orderedIds = reorderedWithIndex.map(c => c.id);
      await dataService.reorderCourses(level, orderedIds);
      return true; // Success
    } catch (err) {
      console.error('Failed to reorder courses:', err);
      return false; // Failure
    }
  };

  const handleLessonComplete = async (quizScore?: number, totalQuestions?: number) => {
    if (!activeCourse || !activeLesson) return;

    // 1. Call backend API to persist progress
    try {
      const result = await dataService.completeLesson(activeLesson.id, quizScore, totalQuestions);
      console.log('Lesson completed, course progress:', result.courseProgress, 'passed:', result.passed);

      // For quiz lessons, check if passed
      if (activeLesson.type === 'quiz' && !result.passed) {
        // Quiz not passed - show failure message but don't mark as complete
        setQuizPassed(false);
        return; // Don't proceed with completion
      }

      setQuizPassed(true);
    } catch (error) {
      console.error('Failed to save progress to backend:', error);
    }

    // 2. Mark current lesson as complete locally
    const updatedLessons = activeCourse.lessons.map(l =>
      l.id === activeLesson.id ? { ...l, isCompleted: true, passed: true } : l
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
    <div className={`fixed inset-y-0 left-0 z-50 w-64 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out ${draggedCourseId ? 'opacity-20 blur-sm pointer-events-none' : 'opacity-100'} transition-opacity`}>
      {/* Subtle glow accent on edge */}
      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-yellow-400/10 to-transparent" />

      <div className="h-full flex flex-col bg-[#0a0a0b] border-r border-white/[0.06]">
        {/* Logo section with premium treatment */}
        <div className="p-8 relative">

          <h1
            className="text-2xl font-helvetica-bold tracking-wider cursor-pointer group"
            onClick={() => setCurrentView('LANDING')}
          >
            <span className="text-[#D4AF37] group-hover:brightness-110 transition-all">AMINI</span>
            <span className="font-helvetica-light text-white/70 group-hover:text-white transition-colors ml-1">ACADEMY</span>
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 py-2">
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
              <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-helvetica-bold px-4 pt-4 pb-2">Admin Portal</div>

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



              <SidebarItem
                icon={<Layout size={20} />}
                label="View as User"
                active={currentView === 'DASHBOARD'}
                onClick={() => setCurrentView('DASHBOARD')}
              />
            </>
          )}
        </nav>

        {/* User profile section */}
        <div className="p-6 relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/5 flex items-center justify-center font-helvetica-bold text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.1)]">
                {user?.name?.charAt(0) || 'U'}
              </div>
            </div>
            <div>
              <p className="text-xs font-helvetica-bold text-white">{user?.name || 'User'}</p>
              <p className="text-[10px] text-zinc-500 truncate w-32">{user?.ministry || 'Ministry'}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setAuthToken(null); // Clear the JWT token
              setUser(null);
              setCurrentView('LANDING');
            }}
            className="flex items-center gap-2.5 text-sm text-zinc-500 hover:text-red-400 transition-all w-full group py-2 px-3 rounded-xl hover:bg-red-500/10"
          >
            <LogOut size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );

  const SidebarItem = ({ icon, label, active, onClick, badge }: any) => {
    const [isRadiating, setIsRadiating] = useState(false);
    const [clickPos, setClickPos] = useState({ x: 0, y: 0 });

    const handleClick = (e: React.MouseEvent) => {
      if (active) {
        onClick();
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      setClickPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });

      setIsRadiating(true);

      // Snappy mechanical feedback then navigation
      setTimeout(() => {
        onClick();
      }, 250); // Navigate at peak power

      setTimeout(() => {
        setIsRadiating(false);
      }, 600); // UI cleanup
    };

    return (
      <button
        onClick={handleClick}
        className={`
        relative w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300 overflow-hidden
        ${active
            ? 'text-[#D4AF37] border border-[#D4AF37]/40 bg-[#D4AF37]/5'
            : 'text-zinc-500 hover:text-white hover:bg-white/[0.03]'
          }
        ${isRadiating ? 'scale-95 brightness-125' : 'scale-100'}
        active:scale-[0.96] active:duration-75
      `}
      >
        {/* Radiant Pulse Ring */}
        {isRadiating && (
          <div
            className="absolute pointer-events-none rounded-full border-2 border-[#D4AF37] animate-radiant z-20"
            style={{
              left: clickPos.x,
              top: clickPos.y,
              width: '10px',
              height: '10px',
              marginLeft: '-5px',
              marginTop: '-5px'
            }}
          />
        )}

        {/* Internal Background Flood */}
        {isRadiating && (
          <div className="absolute inset-0 bg-[#D4AF37]/20 animate-gold-flood z-0" />
        )}

        <span className="relative z-10 scale-90">{icon}</span>
        <span className={`relative z-10 font-helvetica text-[13px] tracking-wide ${active || isRadiating ? 'font-helvetica-bold' : ''}`}>{label}</span>
        {badge && <span className="relative z-10 ml-auto">{badge}</span>}
      </button>
    );
  };

  // --- Views ---

  const LandingView = () => (
    <div className="min-h-screen flex flex-col relative z-10">
      <header className="px-6 py-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="text-2xl font-helvetica-bold tracking-wider">BAJAN-X<span className="text-[#D4AF37]">UNI</span></div>
        <PrimaryButton onClick={() => setCurrentView('AUTH')}>Log In / Sign Up</PrimaryButton>
      </header>

      <main className="flex-1 flex flex-col justify-center items-center text-center px-4 mt-12 md:mt-0">
        <Badge type="success">Government Initiative</Badge>
        <h1 className="text-5xl md:text-7xl font-helvetica-bold mt-6 mb-6 leading-tight">
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
              <div className="h-10 w-10 rounded-full bg-yellow-400/20 flex items-center justify-center mb-4 text-[#D4AF37]">
                <BookOpen size={20} />
              </div>
              <h3 className="text-lg font-helvetica-bold mb-2">{card.title}</h3>
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
              <Clock size={40} className="text-[#D4AF37]" />
            </div>
            <h2 className="text-2xl font-helvetica-bold mb-4">Registration Submitted</h2>
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
              <ArrowLeft size={16} /> Back
            </button>
          </div>

          {/* Login/Register Tabs */}
          <div className="flex mb-8 bg-zinc-900/50 rounded-xl p-1">
            <button
              onClick={() => { setAuthMode('login'); setError(''); }}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${authMode === 'login'
                ? 'bg-yellow-400 text-black'
                : 'text-zinc-400 hover:text-white'
                }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthMode('register'); setError(''); }}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${authMode === 'register'
                ? 'bg-yellow-400 text-black'
                : 'text-zinc-400 hover:text-white'
                }`}
            >
              Register
            </button>
          </div>

          <h2 className="text-3xl font-helvetica-bold mb-2 text-center">
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
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
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
                  setFormData({ ...formData, email: e.target.value });
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
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
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
                    onChange={e => setFormData({ ...formData, ministry: e.target.value })}
                  >
                    {MINISTRIES.map(m => <option key={m} value={m} className="bg-zinc-900 text-white">{m}</option>)}
                  </select>
                </div>

                <div className="animate-fade-in">
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Select Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: UserRole.LEARNER })}
                      className={`p-3 rounded-xl border text-sm transition-all duration-300 ${formData.role === UserRole.LEARNER ? 'bg-yellow-400/20 border-yellow-400 text-[#D4AF37] shadow-[0_0_15px_rgba(250,204,21,0.2)]' : 'border-white/10 hover:bg-white/5 text-zinc-400'}`}
                    >
                      Learner
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: UserRole.SUPERUSER })}
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
    // Updated: User must complete ALL ENROLLED courses (progress > 0) in previous level
    const isCourseCompleted = (course: Course) => course.progress === 100;
    const isCourseEnrolled = (course: Course) => course.progress > 0;

    const getBeginnerCourses = () => courses.filter(c => c.level === 'Beginner');
    const getIntermediateCourses = () => courses.filter(c => c.level === 'Intermediate');
    const getAdvancedCourses = () => courses.filter(c => c.level === 'Advanced');

    // Get enrolled courses for each level
    const getEnrolledBeginnerCourses = () => getBeginnerCourses().filter(isCourseEnrolled);
    const getEnrolledIntermediateCourses = () => getIntermediateCourses().filter(isCourseEnrolled);

    // All ENROLLED courses must be completed to unlock next level
    const allEnrolledBeginnerCompleted = () => {
      const enrolledBeginner = getEnrolledBeginnerCourses();
      // Must have at least one enrolled course and all enrolled must be completed
      return enrolledBeginner.length > 0 && enrolledBeginner.every(isCourseCompleted);
    };

    const allEnrolledIntermediateCompleted = () => {
      const enrolledIntermediate = getEnrolledIntermediateCourses();
      return enrolledIntermediate.length > 0 && enrolledIntermediate.every(isCourseCompleted);
    };

    const isLevelUnlocked = (level: string) => {
      if (level === 'Beginner') return true;
      if (level === 'Intermediate') return allEnrolledBeginnerCompleted();
      if (level === 'Advanced') return allEnrolledBeginnerCompleted() && allEnrolledIntermediateCompleted();
      return true;
    };

    const isCourseUnlocked = (course: Course) => isLevelUnlocked(course.level);

    const getLockedMessage = (level: string) => {
      if (level === 'Intermediate') {
        const enrolledBeginner = getEnrolledBeginnerCourses();
        if (enrolledBeginner.length === 0) {
          return `Enroll in and complete at least one Beginner course to unlock`;
        }
        const completedCount = enrolledBeginner.filter(isCourseCompleted).length;
        return `Complete all enrolled Beginner courses (${completedCount}/${enrolledBeginner.length} completed)`;
      }
      if (level === 'Advanced') {
        if (!allEnrolledBeginnerCompleted()) {
          const enrolledBeginner = getEnrolledBeginnerCourses();
          if (enrolledBeginner.length === 0) {
            return `Enroll in and complete Beginner courses first`;
          }
          const completedCount = enrolledBeginner.filter(isCourseCompleted).length;
          return `Complete all enrolled Beginner courses (${completedCount}/${enrolledBeginner.length} completed)`;
        }
        const enrolledIntermediate = getEnrolledIntermediateCourses();
        if (enrolledIntermediate.length === 0) {
          return `Enroll in and complete at least one Intermediate course to unlock`;
        }
        const completedCount = enrolledIntermediate.filter(isCourseCompleted).length;
        return `Complete all enrolled Intermediate courses (${completedCount}/${enrolledIntermediate.length} completed)`;
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
      <div className="md:ml-64 h-screen overflow-y-auto relative z-10 liquid-scroll">
        {/* Mobile Header */}
        <div className="md:hidden p-4 flex justify-between items-center bg-[#0c0c0e] border-b border-white/[0.04] sticky top-0 z-40">
          <span className="font-helvetica-bold">Amini Academy</span>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10">
          {/* Header Section - Enhanced Liquid Glass */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 animate-fade-in">
            <div>
              <h2 className="text-4xl font-helvetica-bold mb-2">Welcome, {user?.name?.split(' ')[0]}</h2>
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
                  <div className="text-3xl font-helvetica-bold text-[#D4AF37]">{lessonsCompleted}</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Lessons</div>
                </div>
              </div>

              <div className="w-px bg-white/10 h-16 hidden md:block self-center"></div>

              {/* Courses Progress */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-white/20 to-white/5 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-center min-w-[80px]">
                  <div className="text-3xl font-helvetica-bold text-white">{completedCourses}<span className="text-lg text-zinc-500">/{enrolledCount || courses.length}</span></div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Courses</div>
                </div>
              </div>

              <div className="w-px bg-white/10 h-16 hidden md:block self-center"></div>

              {/* Quiz Average */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-400/20 to-green-500/10 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-center min-w-[80px]">
                  <div className="text-3xl font-helvetica-bold text-green-400">{avgQuizScore}%</div>
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
                      <span className="text-sm font-helvetica-bold text-white">{totalProgress}%</span>
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
                  <h3 className="text-lg font-helvetica-bold text-white">Bajan-X Program Overall Progress</h3>
                  <p className="text-sm text-zinc-400">Complete all 8 modules to earn your certification</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-helvetica-bold text-[#D4AF37]">{totalProgress}%</span>
                  <span className="text-zinc-500">complete</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-3 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-[#D4AF37] rounded-full shadow-[0_0_15px_rgba(250,204,21,0.5)] transition-all duration-1000"
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
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-helvetica-bold transition-all duration-300 ${isCompleted
                        ? 'bg-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                        : 'bg-white/10 text-zinc-500'
                        }`}>
                        {isCompleted ? <CheckCircle size={12} /> : idx + 1}
                      </div>
                      <span className={`text-[10px] mt-1 ${isCompleted ? 'text-[#D4AF37]' : 'text-zinc-600'}`}>{module}</span>
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
                  <h3 className="text-lg font-helvetica-bold text-white flex items-center gap-2"><Users size={18} className="text-[#D4AF37]" /> Ministry Insights</h3>
                  <p className="text-sm text-zinc-400">Track your team's progress in {user.ministry}</p>
                </div>
                <PrimaryButton className="py-1 px-4 text-xs h-8">Invite Colleagues</PrimaryButton>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                  <div className="text-xs text-zinc-500">Active Learners</div>
                  <div className="text-xl font-helvetica-bold">24</div>
                </div>
                <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                  <div className="text-xs text-zinc-500">Certified</div>
                  <div className="text-xl font-helvetica-bold text-[#D4AF37]">8</div>
                </div>
                <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                  <div className="text-xs text-zinc-500">Completion Rate</div>
                  <div className="text-xl font-helvetica-bold text-white">33%</div>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Learning Paths & Courses - Grouped by Level */}
          <div className="space-y-12">
            {(['Beginner', 'Intermediate', 'Advanced'] as const).map((level) => {
              const levelCourses = courses.filter(c => c.level === level);
              if (levelCourses.length === 0) return null;

              const isPathUnlocked = isLevelUnlocked(level);
              const levelTitle = level === 'Beginner' ? 'Beginner Track (Week 1-2)'
                : level === 'Intermediate' ? 'Intermediate Track (Week 3)'
                  : 'Advanced Track (Week 4)';
              const levelDescription = level === 'Beginner' ? 'Foundation modules for all learners.'
                : level === 'Intermediate' ? 'Security and platform integration.'
                  : 'Data workflows and certification.';

              return (
                <div key={level} className="animate-fade-in">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${isPathUnlocked ? 'bg-yellow-400/20 text-[#D4AF37]' : 'bg-zinc-800/50 text-zinc-600'}`}>
                      {isPathUnlocked ? <BookOpen size={20} /> : <Lock size={20} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className={`text-2xl font-helvetica-bold ${!isPathUnlocked && 'text-zinc-600'}`}>{levelTitle}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${level === 'Beginner' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                          level === 'Intermediate' ? 'bg-yellow-500/20 text-[#D4AF37] border border-yellow-500/30' :
                            'bg-purple-500/20 border-purple-400/30 text-purple-400'
                          }`}>{levelCourses.length} course{levelCourses.length !== 1 ? 's' : ''}</span>
                        {!isPathUnlocked && (
                          <span className="text-xs px-3 py-1 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700">
                            LOCKED
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${isPathUnlocked ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        {isPathUnlocked ? levelDescription : getLockedMessage(level)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {levelCourses.map((course, courseIndex) => {
                      const courseUnlocked = isCourseUnlocked(course);
                      const lessonCount = course.lessons?.length || 0;
                      const completedLessons = course.lessons?.filter(l => l.isCompleted).length || 0;

                      return (
                        <div
                          key={course.id}
                          className={`group relative rounded-3xl overflow-hidden transition-all duration-500 ${courseUnlocked
                            ? 'cursor-pointer hover:-translate-y-2 hover:shadow-[0_20px_60px_-15px_rgba(250,204,21,0.3)]'
                            : 'opacity-60 cursor-not-allowed'
                            }`}
                          onClick={() => courseUnlocked && handleStartCourse(course)}
                        >
                          {/* Card Background with Glassmorphism */}
                          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/90 via-zinc-900/80 to-black/90 backdrop-blur-xl border border-white/10 rounded-3xl group-hover:border-[#D4AF37]/50 transition-colors duration-500" />

                          {/* Ambient Glow Effect */}
                          <div className="absolute -inset-px bg-gradient-to-br from-yellow-400/0 via-transparent to-yellow-400/0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl" />

                          <div className="relative">
                            {/* Image Container with Aspect Ratio */}
                            <div className="relative aspect-[16/10] overflow-hidden">
                              {/* Background Image */}
                              <img
                                src={course.thumbnail}
                                alt={course.title}
                                className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${courseUnlocked
                                  ? 'group-hover:scale-110 saturate-75 group-hover:saturate-100'
                                  : 'grayscale saturate-0'
                                  }`}
                              />

                              {/* Gradient Overlays */}
                              <div className={`absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/50 to-transparent transition-opacity duration-500 ${courseUnlocked ? 'opacity-80 group-hover:opacity-60' : 'opacity-90'
                                }`} />
                              <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-yellow-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                              {/* Course Order Badge */}
                              {courseUnlocked && (
                                <div className="absolute top-3 left-3">
                                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-sm font-helvetica-bold">
                                    {courseIndex + 1}
                                  </div>
                                </div>
                              )}

                              {/* Level Badge */}
                              <div className="absolute top-3 right-3">
                                <div className={`px-3 py-1.5 rounded-full text-xs font-helvetica-bold backdrop-blur-md border ${course.level === 'Beginner'
                                  ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-400'
                                  : course.level === 'Intermediate'
                                    ? 'bg-yellow-500/20 border-[#D4AF37]/50 text-[#D4AF37]'
                                    : 'bg-purple-500/20 border-purple-400/30 text-purple-400'
                                  }`}>
                                  {course.level}
                                </div>
                              </div>

                              {/* Lock Overlay */}
                              {!courseUnlocked && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                                  <div className="w-16 h-16 rounded-full bg-zinc-900/90 border-2 border-zinc-700 flex items-center justify-center shadow-2xl">
                                    <Lock size={24} className="text-zinc-500" />
                                  </div>
                                </div>
                              )}

                              {/* Progress Ring - Bottom Right */}
                              {course.progress > 0 && courseUnlocked && (
                                <div className="absolute bottom-3 right-3">
                                  <div className="relative w-12 h-12">
                                    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                                      <circle
                                        cx="18" cy="18" r="15.5"
                                        fill="none"
                                        stroke="rgba(255,255,255,0.1)"
                                        strokeWidth="3"
                                      />
                                      <circle
                                        cx="18" cy="18" r="15.5"
                                        fill="none"
                                        stroke="url(#progressGradient)"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeDasharray={`${course.progress * 0.97} 100`}
                                      />
                                      <defs>
                                        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                          <stop offset="0%" stopColor="#facc15" />
                                          <stop offset="100%" stopColor="#fef08a" />
                                        </linearGradient>
                                      </defs>
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className="text-xs font-helvetica-bold text-white">{Math.round(course.progress)}%</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Content Section */}
                            <div className="relative p-5">
                              {/* Title */}
                              <h4 className={`text-lg font-helvetica-bold mb-2 leading-tight transition-colors duration-300 ${courseUnlocked
                                ? 'text-white group-hover:text-[#D4AF37]'
                                : 'text-zinc-500'
                                }`}>
                                {course.title}
                              </h4>

                              {/* Description */}
                              <p className={`text-sm leading-relaxed mb-4 ${courseUnlocked ? 'text-zinc-400' : 'text-zinc-600'
                                } ${expandedDescriptions.has(course.id) ? '' : 'line-clamp-2'}`}>
                                {course.description}
                              </p>
                              {course.description && course.description.length > 80 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedDescriptions(prev => {
                                      const newSet = new Set(prev);
                                      if (newSet.has(course.id)) {
                                        newSet.delete(course.id);
                                      } else {
                                        newSet.add(course.id);
                                      }
                                      return newSet;
                                    });
                                  }}
                                  className={`text-xs font-medium mb-3 ${courseUnlocked
                                    ? 'text-[#D4AF37]/80 hover:text-[#D4AF37]'
                                    : 'text-zinc-600'
                                    } transition-colors`}
                                >
                                  {expandedDescriptions.has(course.id) ? '← Show less' : 'Read more →'}
                                </button>
                              )}

                              {/* Stats Row */}
                              <div className={`flex items-center gap-4 text-xs ${courseUnlocked ? 'text-zinc-500' : 'text-zinc-700'
                                }`}>
                                <span className="flex items-center gap-1.5">
                                  <Clock size={14} className={courseUnlocked ? 'text-zinc-400' : ''} />
                                  {course.totalDuration}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <BookOpen size={14} className={courseUnlocked ? 'text-zinc-400' : ''} />
                                  {lessonCount} lessons
                                </span>
                                {course.progress > 0 && courseUnlocked && (
                                  <span className="flex items-center gap-1.5 text-[#D4AF37]">
                                    <CheckCircle size={14} />
                                    {completedLessons}/{lessonCount}
                                  </span>
                                )}
                              </div>

                              {/* Action Footer */}
                              <div className={`mt-4 pt-4 border-t border-white/5 flex justify-between items-center`}>
                                {courseUnlocked ? (
                                  <>
                                    <div className="flex items-center gap-2">
                                      {course.progress > 0 ? (
                                        <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-full transition-all duration-500"
                                            style={{ width: `${course.progress}%` }}
                                          />
                                        </div>
                                      ) : (
                                        <span className="text-xs text-zinc-500">Ready to start</span>
                                      )}
                                    </div>
                                    <span className={`flex items-center gap-1 text-sm font-helvetica-bold transition-all duration-300 ${course.progress > 0
                                      ? 'text-[#D4AF37] group-hover:text-yellow-300'
                                      : 'text-white group-hover:text-[#D4AF37]'
                                      } group-hover:translate-x-1`}>
                                      {course.progress > 0 ? 'Continue' : 'Start Course'}
                                      <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                                    </span>
                                  </>
                                ) : (
                                  <span className="flex items-center gap-2 text-sm text-zinc-600">
                                    <Lock size={14} />
                                    Complete previous level to unlock
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
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
    const [quizPassed, setQuizPassed] = useState<boolean | null>(null);
    const PASSING_SCORE = activeLesson?.passingScore || 70;

    // Download State
    const [isDownloaded, setIsDownloaded] = useState(false);

    // Sidebar collapse state
    // Sidebar collapse state moved to App level (playerSidebarCollapsed) for persistence

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
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#D4AF37] shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
            <div className="absolute inset-0 bg-[#D4AF37]/5" />
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
              ? 'bg-[#D4AF37] shadow-[0_0_20px_rgba(250,204,21,0.4)]'
              : isActive
                ? 'bg-yellow-400/20 border-2 border-yellow-400/50'
                : 'bg-white/5 border border-white/10'
            }
          `}>
            {isCompleted ? (
              <CheckCircle size={18} className="text-black" />
            ) : (
              <span className={`text-sm font-helvetica-bold ${isActive ? 'text-[#D4AF37]' : 'text-zinc-500'}`}>
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
              {lesson.type === 'video' && <Video size={12} className={isActive ? 'text-[#D4AF37]' : 'text-zinc-500'} />}
              {lesson.type === 'quiz' && <HelpCircle size={12} className={isActive ? 'text-[#D4AF37]' : 'text-zinc-500'} />}
              {(lesson.type === 'pdf' || lesson.type === 'presentation') && <FileText size={12} className={isActive ? 'text-[#D4AF37]' : 'text-zinc-500'} />}
              <span className={`text-[10px] uppercase tracking-wider font-medium ${isActive ? 'text-[#D4AF37]/80' : 'text-zinc-600'}`}>
                {lesson.type}
              </span>
            </div>

            <h4 className={`font-helvetica-bold text-sm leading-tight mb-1 transition-colors ${isActive ? 'text-white' : isCompleted ? 'text-zinc-300' : 'text-zinc-400'
              } ${!isLocked && 'group-hover/item:text-white'}`}>
              {lesson.title}
            </h4>

            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-zinc-500">{lesson.durationMin} min</span>
              {isCompleted && (
                <span className="text-[#D4AF37]/80 flex items-center gap-1">
                  <CheckCircle size={10} /> Done
                </span>
              )}
            </div>
          </div>

          {/* Arrow indicator */}
          {!isLocked && !isCompleted && (
            <ChevronRight size={16} className={`flex-shrink-0 transition-all duration-300 ${isActive ? 'text-[#D4AF37] translate-x-0 opacity-100' : 'text-zinc-600 -translate-x-2 opacity-0 group-hover/item:translate-x-0 group-hover/item:opacity-100'
              }`} />
          )}
        </div>
      </button>
    );

    return (
      <div className="h-screen flex flex-col relative z-20 overflow-hidden">
        {/* Clean background - no ambient effects */}

        {/* Top Nav - Hyper Glass */}
        <div className="relative z-30 sticky top-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-transparent" />
          <div className="relative h-20 flex items-center justify-between px-6 border-b border-white/[0.06] bg-[#0a0a0b]">
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
                <h1 className="font-helvetica-bold text-lg text-white truncate max-w-md">{activeCourse?.title}</h1>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Progress indicator */}
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-helvetica-bold text-white">{completedCount}/{totalCount}</div>
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
                    <span className="text-xs font-helvetica-bold text-[#D4AF37]">{progressPercent}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10">
          {/* Sidebar Curriculum - Hyper Liquid Glass */}
          <div className={`
            transition-[width,transform] duration-200 hidden md:flex flex-col
            ${playerSidebarCollapsed ? 'w-20' : 'w-96'}
          `} style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div className="h-full relative">
              {/* Solid background - no gradient */}
              <div className="absolute inset-0 bg-[#0a0a0b] border-r border-white/[0.05]" />

              {/* Content */}
              <div className="relative h-full flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`transition-all duration-200 ${playerSidebarCollapsed ? 'opacity-0 -translate-x-10 scale-90' : 'opacity-100 translate-x-0 scale-100'} overflow-hidden`} style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>
                      <h2 className="text-sm font-helvetica-bold text-white uppercase tracking-wider">Curriculum</h2>
                      <p className="text-[11px] text-zinc-500 mt-1">{totalCount} lessons • {activeCourse?.totalDuration}</p>
                    </div>
                    <button
                      onClick={() => setPlayerSidebarCollapsed(!playerSidebarCollapsed)}
                      className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                    >
                      <List size={16} className="text-zinc-400" />
                    </button>
                  </div>

                  {/* Mini progress */}
                  {!playerSidebarCollapsed && (
                    <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-[#D4AF37] rounded-full shadow-[0_0_10px_rgba(250,204,21,0.5)] transition-all duration-700"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Lessons list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent liquid-scroll">
                  {activeCourse?.lessons.map((lesson, idx) => {
                    const isLocked = idx > 0 && !activeCourse.lessons[idx - 1].isCompleted;
                    const isActive = activeLesson?.id === lesson.id;

                    if (playerSidebarCollapsed) {
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => !isLocked && setActiveLesson(lesson)}
                          disabled={isLocked}
                          className={`
                            w-12 h-12 rounded-xl flex items-center justify-center mx-auto transition-all
                            ${isActive
                              ? 'bg-yellow-400/20 border border-yellow-400/40 text-[#D4AF37]'
                              : isLocked
                                ? 'bg-white/5 border border-white/5 opacity-40'
                                : lesson.isCompleted
                                  ? 'bg-yellow-400/10 text-[#D4AF37]'
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
          <div className="flex-1 overflow-y-auto liquid-scroll">
            <div className="min-h-full p-6 md:p-10 flex flex-col items-center">
              {activeLesson ? (
                <div className={`
                    ${playerSidebarCollapsed ? 'max-w-screen-xl lg:px-12' : 'max-w-5xl'}
                    w-full space-y-10 transition-all duration-200
                  `} style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>

                  {/* Lesson Header */}
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-4">
                      {activeLesson.type === 'video' && <Video size={14} className="text-[#D4AF37]" />}
                      {activeLesson.type === 'quiz' && <HelpCircle size={14} className="text-[#D4AF37]" />}
                      {(activeLesson.type === 'pdf' || activeLesson.type === 'presentation') && <FileText size={14} className="text-[#D4AF37]" />}
                      <span className="text-xs uppercase tracking-wider text-zinc-400">{activeLesson.type} Lesson</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-xs text-zinc-500">{activeLesson.durationMin} min</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-helvetica-bold text-white mb-2">{activeLesson.title}</h2>
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
                        </div>
                      </LiquidVideoFrame>
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
                          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-yellow-400/20 to-yellow-500/10 border border-[#D4AF37]/50 flex items-center justify-center mb-8 mx-auto shadow-[0_0_40px_rgba(250,204,21,0.2)]">
                            <FileText size={48} className="text-[#D4AF37] drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                          </div>
                          <h3 className="text-2xl font-helvetica-bold text-white mb-3">{activeLesson.fileName || 'Document'}</h3>
                          <p className="text-zinc-400 mb-8 max-w-md">
                            {activeLesson.type === 'presentation'
                              ? `Review this presentation (${activeLesson.pageCount || 'N/A'} slides) to continue.`
                              : `Read this document (${activeLesson.pageCount || 'N/A'} pages) to continue.`
                            }
                          </p>
                          <PrimaryButton onClick={downloadResource} className="flex items-center gap-2">
                            {isDownloaded ? <CheckCircle size={18} /> : <Download size={18} />}
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
                            <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-yellow-400/20 to-yellow-500/10 border border-[#D4AF37]/50 mx-auto flex items-center justify-center shadow-[0_0_50px_rgba(250,204,21,0.2)]">
                              <HelpCircle size={56} className="text-[#D4AF37] drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
                            </div>
                            <div>
                              <h2 className="text-3xl font-helvetica-bold text-white mb-3">Knowledge Check</h2>
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
                                  <div key={i} className={`w-2 h-2 rounded-full transition-all ${i < currentQIdx ? 'bg-yellow-400'
                                    : i === currentQIdx ? 'bg-yellow-400 w-4'
                                      : 'bg-white/20'
                                    }`} />
                                ))}
                              </div>
                            </div>

                            <h3 className="text-2xl font-helvetica-bold text-white mb-8 leading-relaxed">
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
                                      w-10 h-10 rounded-xl flex items-center justify-center text-sm font-helvetica-bold transition-all
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

                        {quizState === 'RESULT' && (() => {
                          const scorePercent = Math.round((quizScore / activeLesson.quiz.length) * 100);
                          const passed = scorePercent >= PASSING_SCORE;
                          return (
                            <div className="text-center space-y-8 animate-fade-in">
                              <div className={`w-32 h-32 rounded-3xl mx-auto flex items-center justify-center shadow-[0_0_60px_${passed ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}] ${passed
                                ? 'bg-gradient-to-br from-green-400/30 to-green-500/10 border border-green-400/40'
                                : 'bg-gradient-to-br from-red-400/30 to-red-500/10 border border-red-400/40'
                                }`}>
                                {passed ? (
                                  <Trophy size={64} className="text-green-400 drop-shadow-[0_0_25px_rgba(34,197,94,0.6)]" />
                                ) : (
                                  <XCircle size={64} className="text-red-400 drop-shadow-[0_0_25px_rgba(239,68,68,0.6)]" />
                                )}
                              </div>
                              <div>
                                <h2 className={`text-3xl font-helvetica-bold mb-4 ${passed ? 'text-green-400' : 'text-red-400'}`}>
                                  {passed ? 'Quiz Passed!' : 'Quiz Not Passed'}
                                </h2>
                                <div className={`text-7xl font-black bg-clip-text text-transparent bg-gradient-to-r mb-3 ${passed
                                  ? 'from-green-400 via-green-300 to-white'
                                  : 'from-red-400 via-red-300 to-white'
                                  }`}>
                                  {scorePercent}%
                                </div>
                                <p className="text-zinc-400 text-lg">
                                  You answered <span className={passed ? 'text-green-400' : 'text-red-400'} style={{ fontWeight: 'bold' }}>{quizScore}</span> out of <span className="text-white font-helvetica-bold">{activeLesson.quiz.length}</span> correctly
                                </p>
                                <p className="text-zinc-500 text-sm mt-2">
                                  Passing score: {PASSING_SCORE}%
                                </p>
                                {!passed && (
                                  <p className="text-[#D4AF37]/80 text-sm mt-4 px-4 py-2 rounded-lg bg-yellow-400/10 border border-yellow-400/20 inline-block">
                                    You need to score at least {PASSING_SCORE}% to complete this lesson
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-4 justify-center pt-4">
                                <SecondaryButton
                                  onClick={() => { setQuizState('INTRO'); setCurrentQIdx(0); setQuizAnswers([]); setQuizPassed(null); }}
                                  className="px-8"
                                >
                                  <RefreshCw size={16} className="mr-2" /> {passed ? 'Retry' : 'Try Again'}
                                </SecondaryButton>
                                {passed && (
                                  <PrimaryButton onClick={() => handleLessonComplete(quizScore, activeLesson?.quiz?.length)} className="px-8">
                                    <Award size={16} className="mr-2" /> Complete & Continue
                                  </PrimaryButton>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </LiquidVideoFrame>
                  )}

                  {/* Lesson Footer Controls - Hyper Glass with Progress Requirements */}
                  {activeLesson.type !== 'quiz' && (
                    <div className="relative rounded-2xl overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-white/[0.05] to-white/[0.02] backdrop-blur-xl border border-white/10" />
                      <div className="relative p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${activeLesson.isCompleted || (activeLesson.type === 'video' && videoWatchedPercent >= 80)
                            ? 'bg-green-500/20 border border-green-500/30'
                            : 'bg-white/5 border border-white/10'
                            }`}>
                            {activeLesson.isCompleted ? (
                              <CheckCircle size={28} className="text-green-400" />
                            ) : activeLesson.type === 'video' ? (
                              <div className="relative">
                                <PlayCircle size={28} className={videoWatchedPercent >= 80 ? 'text-green-400' : 'text-[#D4AF37]'} />
                                {videoWatchedPercent > 0 && videoWatchedPercent < 80 && (
                                  <span className="absolute -top-1 -right-1 text-[10px] bg-yellow-400 text-black px-1 rounded font-helvetica-bold">{videoWatchedPercent}%</span>
                                )}
                              </div>
                            ) : (
                              <FileText size={28} className="text-[#D4AF37]" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-helvetica-bold text-white text-lg">{activeLesson.title}</h4>
                            <p className="text-sm text-zinc-400">
                              {activeLesson.durationMin} min • {activeLesson.isCompleted ? (
                                <span className="text-green-400 flex items-center gap-1"><CheckCircle size={12} /> Completed</span>
                              ) : activeLesson.type === 'video' ? (
                                <span className={videoWatchedPercent >= 80 ? 'text-green-400' : 'text-[#D4AF37]'}>
                                  {videoWatchedPercent >= 80 ? 'Ready to complete' : `${videoWatchedPercent}% watched (80% required)`}
                                </span>
                              ) : 'In Progress'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {/* Document download requirement */}
                          {(activeLesson.type === 'pdf' || activeLesson.type === 'presentation') && !activeLesson.isCompleted && !isDownloaded && (
                            <div className="text-sm text-[#D4AF37]/80 flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
                              <Download size={14} /> Download required
                            </div>
                          )}

                          {/* Video progress requirement */}
                          {activeLesson.type === 'video' && !activeLesson.isCompleted && videoWatchedPercent < 80 && (
                            <div className="text-sm text-[#D4AF37]/80 flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
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
                            className={`px-8 ${activeLesson.type === 'video' && videoWatchedPercent >= 80 && !activeLesson.isCompleted
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
                    <BookOpen size={64} className="text-zinc-600" />
                  </div>
                  <h3 className="text-2xl font-helvetica-bold text-zinc-300 mb-3">Select a Lesson</h3>
                  <p className="text-zinc-500 max-w-sm">Choose a lesson from the curriculum to begin your learning journey.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile lesson selector */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
          <div className="bg-[#0a0a0b] border-t border-white/[0.05] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-400/20 flex items-center justify-center text-[#D4AF37] font-helvetica-bold">
                  {(activeCourse?.lessons.findIndex(l => l.id === activeLesson?.id) || 0) + 1}
                </div>
                <div>
                  <p className="text-sm font-medium text-white truncate max-w-[300px]" title={activeLesson?.title}>{activeLesson?.title}</p>
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
    // Toast notifications
    const { showToast } = useToast();

    // Admin State
    const [viewMode, setViewMode] = useState<'DASHBOARD' | 'EDITOR'>('DASHBOARD');
    const [editingCourse, setEditingCourse] = useState<Partial<Course> | null>(null);
    const [editorTab, setEditorTab] = useState<'DETAILS' | 'CURRICULUM'>('DETAILS');
    const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
    const [newLessonType, setNewLessonType] = useState<ContentType>('video');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Inline Editing State for Course Manager
    const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
    const [editingCourseTitle, setEditingCourseTitle] = useState<string>('');

    // Pending Users State
    const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [loadingPending, setLoadingPending] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [processingUser, setProcessingUser] = useState<string | null>(null);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [userFilterRole, setUserFilterRole] = useState<string>('ALL');

    // Track deleted lessons for backend sync
    const [deletedLessonIds, setDeletedLessonIds] = useState<string[]>([]);

    // Real Analytics State
    const [fullStats, setFullStats] = useState<{
      totalLearners: number;
      totalCourses: number;
      totalLessons: number;
      totalEnrollments: number;
      completionRate: number;
      totalStudyHours: number;
      overdueEnrollments?: number;
      averageQuizScore?: number;
      quizPassRate?: number;
    } | null>(null);
    const [ministryStats, setMinistryStats] = useState<any[]>([]);
    const [contentStats, setContentStats] = useState<any[]>([]);
    const [overdueLearners, setOverdueLearners] = useState<any[]>([]);
    const [selectedMinistry, setSelectedMinistry] = useState<string | null>(null);
    const [ministryCourseStats, setMinistryCourseStats] = useState<any[]>([]);

    // Local courses state for drag reordering
    const [localCourses, setLocalCourses] = useState<Course[]>(courses);
    const dragState = React.useRef<{
      dragging: boolean;
      courseId: string | null;
      startIndex: number;
      currentIndex: number;
      level: string;
    }>({ dragging: false, courseId: null, startIndex: -1, currentIndex: -1, level: '' });

    // Sync local courses with global courses
    useEffect(() => {
      if (!dragState.current.dragging) {
        setLocalCourses([...courses]);
      }
    }, [courses]);


    // Track if data has been loaded (to prevent re-fetching)
    const [pendingUsersLoaded, setPendingUsersLoaded] = useState(false);
    const [allUsersLoaded, setAllUsersLoaded] = useState(false);
    const [statsLoaded, setStatsLoaded] = useState(false);

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

    // Load real analytics data
    useEffect(() => {
      if (statsLoaded) return;
      const loadStats = async () => {
        try {
          const [statsRes, ministryRes, contentRes, overdueRes] = await Promise.all([
            dataService.getFullAdminStats(),
            dataService.getMinistryStats(),
            dataService.getContentStats(),
            dataService.getOverdueLearners()
          ]);
          setFullStats(statsRes.stats);
          setMinistryStats(ministryRes.ministryStats || []);
          setContentStats(contentRes.contentStats || []);
          setOverdueLearners(overdueRes.overdueLearners || []);
          setStatsLoaded(true);
        } catch (err) {
          console.error('Failed to load admin stats:', err);
        }
      };
      loadStats();
    }, [statsLoaded]);

    // Load ministry course breakdown when a ministry is selected
    useEffect(() => {
      if (!selectedMinistry) {
        setMinistryCourseStats([]);
        return;
      }
      const loadMinistryCourseStats = async () => {
        try {
          const res = await dataService.getMinistryCourseStats(selectedMinistry);
          setMinistryCourseStats(res.ministryCourseStats || []);
        } catch (err) {
          console.error('Failed to load ministry course stats:', err);
        }
      };
      loadMinistryCourseStats();
    }, [selectedMinistry]);

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

    // Inline editing handlers for Course Manager
    const startEditingCourseTitle = (course: Course) => {
      setEditingCourseId(course.id);
      setEditingCourseTitle(course.title);
    };

    const saveEditingCourseTitle = async () => {
      if (!editingCourseId || !editingCourseTitle.trim()) {
        cancelEditingCourseTitle();
        return;
      }
      try {
        const updatedCourse = await dataService.updateCourse(editingCourseId, { title: editingCourseTitle.trim() });
        setCourses(prev => prev.map(c => c.id === editingCourseId ? { ...c, title: editingCourseTitle.trim() } : c));
        showToast('success', 'Title Updated', 'Course title has been updated successfully.');
      } catch (err) {
        console.error('Failed to update course title:', err);
        showToast('error', 'Update Failed', 'Failed to update course title. Please try again.');
      }
      cancelEditingCourseTitle();
    };

    const cancelEditingCourseTitle = () => {
      setEditingCourseId(null);
      setEditingCourseTitle('');
    };

    const handleQuickUpdateCourse = async (courseId: string, updates: { title?: string; level?: 'Beginner' | 'Intermediate' | 'Advanced' }) => {
      try {
        await dataService.updateCourse(courseId, updates);
        setCourses(prev => prev.map(c => c.id === courseId ? { ...c, ...updates } : c));
        showToast('success', 'Course Updated', 'Course has been updated successfully.');
      } catch (err) {
        console.error('Failed to update course:', err);
        showToast('error', 'Update Failed', 'Failed to update course. Please try again.');
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
      setEditingCourse({ ...course });
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
      // Track deletion for backend sync (only if it's an existing lesson, not a new one)
      if (!id.startsWith('l-')) {
        setDeletedLessonIds(prev => [...prev, id]);
      }
      if (activeLessonId === id) {
        setActiveLessonId(updatedLessons[0]?.id || null);
      }
    };

    // Move lesson up in order
    const moveLessonUp = (index: number) => {
      if (!editingCourse || !editingCourse.lessons || index === 0) return;
      const lessons = [...editingCourse.lessons];
      [lessons[index - 1], lessons[index]] = [lessons[index], lessons[index - 1]];
      setEditingCourse({ ...editingCourse, lessons });
    };

    // Move lesson down in order
    const moveLessonDown = (index: number) => {
      if (!editingCourse || !editingCourse.lessons || index === editingCourse.lessons.length - 1) return;
      const lessons = [...editingCourse.lessons];
      [lessons[index], lessons[index + 1]] = [lessons[index + 1], lessons[index]];
      setEditingCourse({ ...editingCourse, lessons });
    };

    const deleteCourse = async (courseId: string) => {
      if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) return;
      try {
        await dataService.deleteCourse(courseId);
        const freshCourses = await dataService.getCourses();
        setCourses(sortCourses(freshCourses));
        showToast('success', 'Course Deleted', 'The course has been successfully removed.');
      } catch (error) {
        console.error('Failed to delete course:', error);
        showToast('error', 'Delete Failed', 'Failed to delete course. Please try again.');
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

        // 2. Delete removed lessons from backend
        let deletionWarning = false;
        for (const deletedId of deletedLessonIds) {
          try {
            await dataService.deleteLesson(deletedId);
          } catch (err) {
            console.error(`Failed to delete lesson ${deletedId}:`, err);
            deletionWarning = true;
          }
        }
        setDeletedLessonIds([]); // Clear after sync

        // 3. Save all lessons with order
        const lessons = editingCourse.lessons || [];
        for (let i = 0; i < lessons.length; i++) {
          const lesson = lessons[i];
          const isNewLesson = lesson.id.startsWith('l-');

          if (isNewLesson) {
            // Create new lesson with order
            await dataService.addLesson(courseId, {
              title: lesson.title,
              type: lesson.type,
              durationMin: lesson.durationMin,
              videoUrl: lesson.videoUrl,
              fileUrl: lesson.fileUrl,
              fileName: lesson.fileName,
              pageCount: lesson.pageCount,
              content: lesson.content,
              quiz: lesson.quiz,
              orderIndex: i
            });
          } else {
            // Update existing lesson with order
            await dataService.updateLesson(lesson.id, {
              title: lesson.title,
              type: lesson.type,
              durationMin: lesson.durationMin,
              videoUrl: lesson.videoUrl,
              fileUrl: lesson.fileUrl,
              fileName: lesson.fileName,
              pageCount: lesson.pageCount,
              content: lesson.content,
              orderIndex: i
            });
          }
        }

        // 4. Refresh courses list (sorted by level and order)
        const freshCourses = await dataService.getCourses();
        setCourses(sortCourses(freshCourses));
        setViewMode('DASHBOARD');
        setEditingCourse(null);
        setActiveLessonId(null);

        // Show success toast
        if (deletionWarning) {
          showToast('warning', 'Partial Save', 'Course saved but some lessons could not be deleted. Please review and retry.');
        } else {
          showToast('success', isNewCourse ? 'Course Created' : 'Course Updated', 'Your changes have been saved and published successfully.');
        }
      } catch (error) {
        console.error('Failed to save course:', error);
        showToast('error', 'Update Failed', 'Something went wrong. Please try again or contact support.');
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
        <div className="md:ml-64 h-screen overflow-hidden relative z-10 flex flex-col">
          {/* Editor Header */}
          <div className="h-16 flex-shrink-0 bg-[linear-gradient(180deg,#121214_0%,#0a0a0b_100%)] border-b border-white/[0.05] flex items-center justify-between px-6 z-30">
            <div className="flex items-center gap-4">
              <IconButton icon={<ArrowLeft size={20} />} onClick={() => setViewMode('DASHBOARD')} />
              <h2 className="font-helvetica-bold text-lg text-white">Course Editor</h2>
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

          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar: Structure */}
            <div className="w-80 bg-[linear-gradient(180deg,#131315_0%,#0a0a0b_100%)] border-r border-white/[0.05] flex flex-col">
              <div className="flex border-b border-white/5">
                <button
                  onClick={() => setEditorTab('DETAILS')}
                  className={`flex-1 py-4 text-sm font-medium transition-colors ${editorTab === 'DETAILS' ? 'text-[#D4AF37] border-b-2 border-yellow-400 bg-yellow-400/5' : 'text-zinc-400 hover:text-white'}`}
                >
                  Details
                </button>
                <button
                  onClick={() => setEditorTab('CURRICULUM')}
                  className={`flex-1 py-4 text-sm font-medium transition-colors ${editorTab === 'CURRICULUM' ? 'text-[#D4AF37] border-b-2 border-yellow-400 bg-yellow-400/5' : 'text-zinc-400 hover:text-white'}`}
                >
                  Curriculum
                </button>
              </div>

              {editorTab === 'DETAILS' ? (
                <div className="p-6 space-y-6 overflow-y-auto">
                  <div>
                    <label className="text-xs text-zinc-500 font-helvetica-bold uppercase mb-2 block">Course Thumbnail</label>
                    {/* Current thumbnail preview */}
                    {editingCourse.thumbnail && (
                      <div className="aspect-video rounded-xl bg-zinc-800 overflow-hidden mb-3 relative group border border-white/10">
                        <img src={editingCourse.thumbnail} className="w-full h-full object-cover" />
                        <button
                          onClick={() => setEditingCourse({ ...editingCourse, thumbnail: '' })}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                    {/* Upload option */}
                    <div className="mb-3">
                      <FileDropZone
                        label="Upload Thumbnail Image"
                        accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                        currentFile={undefined}
                        isUploading={isUploading}
                        uploadProgress={uploadProgress}
                        onFileSelect={async (file) => {
                          try {
                            setIsUploading(true);
                            setUploadProgress(0);
                            const result = await dataService.uploadFile(file, (progress) => {
                              setUploadProgress(progress);
                            });
                            setEditingCourse({ ...editingCourse, thumbnail: result.file.fileUrl });
                            showToast('success', 'Thumbnail Uploaded', 'Image uploaded successfully.');
                          } catch (error) {
                            console.error('Failed to upload thumbnail:', error);
                            showToast('error', 'Upload Failed', 'Failed to upload thumbnail. Please try again.');
                          } finally {
                            setIsUploading(false);
                            setUploadProgress(0);
                          }
                        }}
                      />
                    </div>
                    {/* OR use URL */}
                    <div className="relative mb-3">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                      <div className="relative flex justify-center"><span className="px-2 bg-zinc-900 text-xs text-zinc-500">OR use URL</span></div>
                    </div>
                    <input
                      value={editingCourse.thumbnail || ''}
                      onChange={e => setEditingCourse({ ...editingCourse, thumbnail: e.target.value })}
                      placeholder="Enter image URL..."
                      className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-2 text-xs text-white focus:border-yellow-400 outline-none mb-3"
                    />
                    {/* Quick select presets */}
                    <div className="text-xs text-zinc-500 mb-2">Quick select:</div>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=400',
                        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=400',
                        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=400',
                        'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=400',
                      ].map((url, idx) => (
                        <button
                          key={idx}
                          onClick={() => setEditingCourse({ ...editingCourse, thumbnail: url.replace('w=400', 'w=2070') })}
                          className={`aspect-video rounded-lg overflow-hidden border-2 transition-all ${editingCourse.thumbnail?.includes(url.split('?')[0].split('/').pop() || '') ? 'border-yellow-400' : 'border-transparent hover:border-white/30'}`}
                        >
                          <img src={url} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 font-helvetica-bold uppercase mb-2 block">Title</label>
                    <input
                      value={editingCourse.title}
                      onChange={e => setEditingCourse({ ...editingCourse, title: e.target.value })}
                      className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3 text-white focus:border-yellow-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 font-helvetica-bold uppercase mb-2 block">Description</label>
                    <textarea
                      value={editingCourse.description}
                      onChange={e => setEditingCourse({ ...editingCourse, description: e.target.value })}
                      className="w-full h-32 bg-zinc-900/50 border border-white/10 rounded-xl p-3 text-white focus:border-yellow-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 font-helvetica-bold uppercase mb-2 block">Course Level</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Beginner', 'Intermediate', 'Advanced'] as const).map(level => (
                        <button
                          key={level}
                          onClick={() => setEditingCourse({ ...editingCourse, level })}
                          className={`py-3 px-2 rounded-xl text-sm font-medium transition-all border flex items-center justify-center text-center whitespace-nowrap min-h-[48px] ${editingCourse.level === level
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
                    <label className="text-xs text-zinc-500 font-helvetica-bold uppercase mb-2 block">Estimated Duration</label>
                    <input
                      value={editingCourse.totalDuration || ''}
                      onChange={e => setEditingCourse({ ...editingCourse, totalDuration: e.target.value })}
                      placeholder="e.g., 60 min or 1h 30min"
                      className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3 text-white focus:border-yellow-400 outline-none"
                    />
                  </div>

                  {/* Deadline and Mandatory Settings */}
                  <div className="pt-4 border-t border-white/10">
                    <h4 className="text-sm font-helvetica-bold text-white mb-3 flex items-center gap-2">
                      <Calendar size={16} className="text-[#D4AF37]" />
                      Deadline & Requirements
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-zinc-500 font-helvetica-bold uppercase mb-2 block">Completion Deadline</label>
                        <input
                          type="datetime-local"
                          value={editingCourse.deadline ? new Date(editingCourse.deadline).toISOString().slice(0, 16) : ''}
                          onChange={e => setEditingCourse({ ...editingCourse, deadline: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                          className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3 text-white focus:border-yellow-400 outline-none"
                        />
                        <p className="text-[10px] text-zinc-500 mt-1">Leave empty for no deadline</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setEditingCourse({ ...editingCourse, isMandatory: !editingCourse.isMandatory })}
                          className={`w-12 h-6 rounded-full transition-colors relative ${editingCourse.isMandatory ? 'bg-yellow-400' : 'bg-zinc-700'
                            }`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${editingCourse.isMandatory ? 'translate-x-6' : 'translate-x-0.5'
                            }`} />
                        </button>
                        <div>
                          <span className="text-sm text-white">Mandatory Training</span>
                          <p className="text-[10px] text-zinc-500">Mark as required for all learners</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  <div className="p-4 space-y-2 overflow-y-auto flex-1">
                    {editingCourse.lessons?.map((lesson, idx) => (
                      <div
                        key={lesson.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', idx.toString());
                          e.dataTransfer.effectAllowed = 'move';
                          (e.target as HTMLElement).classList.add('dragging');
                        }}
                        onDragEnd={(e) => {
                          (e.target as HTMLElement).classList.remove('dragging');
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          (e.currentTarget as HTMLElement).classList.add('drag-over');
                        }}
                        onDragLeave={(e) => {
                          (e.currentTarget as HTMLElement).classList.remove('drag-over');
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          (e.currentTarget as HTMLElement).classList.remove('drag-over');
                          const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                          const toIndex = idx;
                          if (fromIndex !== toIndex && editingCourse?.lessons) {
                            const lessons = [...editingCourse.lessons];
                            const [movedLesson] = lessons.splice(fromIndex, 1);
                            lessons.splice(toIndex, 0, movedLesson);
                            setEditingCourse({ ...editingCourse, lessons });
                          }
                        }}
                        onClick={() => setActiveLessonId(lesson.id)}
                        className={`group p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-2 ${activeLessonId === lesson.id
                          ? 'bg-yellow-400/10 border-[#D4AF37]/50 shadow-[0_0_15px_rgba(250,204,21,0.1)]'
                          : 'bg-white/5 border-transparent hover:border-white/10'
                          }`}
                      >
                        {/* Drag Handle */}
                        <div
                          className="drag-handle p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <GripVertical size={14} />
                        </div>
                        {/* Reorder buttons (kept as alternative) */}
                        <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); moveLessonUp(idx); }}
                            disabled={idx === 0}
                            className={`p-0.5 rounded hover:bg-white/10 ${idx === 0 ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-400 hover:text-white'}`}
                          >
                            <ChevronUp size={12} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); moveLessonDown(idx); }}
                            disabled={idx === (editingCourse.lessons?.length || 0) - 1}
                            className={`p-0.5 rounded hover:bg-white/10 ${idx === (editingCourse.lessons?.length || 0) - 1 ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-400 hover:text-white'}`}
                          >
                            <ChevronDown size={12} />
                          </button>
                        </div>
                        <div className="h-6 w-6 rounded flex items-center justify-center bg-zinc-800 text-zinc-400 text-xs font-mono">{idx + 1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate text-white" title={lesson.title}>{lesson.title}</div>
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
                          className={`flex-1 py-1 rounded text-[10px] uppercase font-helvetica-bold transition-all ${newLessonType === type ? 'bg-yellow-400 text-black' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}
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
                    className="text-3xl font-helvetica-bold bg-transparent border-none outline-none text-white placeholder-zinc-600 w-full"
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
                            <div className="text-xs text-zinc-500 uppercase font-helvetica-bold">From URL (YouTube/Vimeo)</div>
                            <input
                              className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3 outline-none focus:border-yellow-400 text-sm"
                              placeholder="https://youtube.com/watch?v=..."
                              value={activeLesson.videoUrl || ''}
                              onChange={(e) => updateLesson(activeLesson.id, { videoUrl: e.target.value, fileUrl: undefined })}
                            />
                          </div>
                          {/* Option 2: Upload */}
                          <div className="space-y-2">
                            <div className="text-xs text-zinc-500 uppercase font-helvetica-bold">Upload from Computer</div>
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
                                  showToast('success', 'Video Uploaded', 'Your video has been uploaded successfully.');
                                } catch (error) {
                                  console.error('Failed to upload video:', error);
                                  showToast('error', 'Upload Failed', 'Failed to upload video. Please try again.');
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
                            <MonitorPlay size={48} className="mx-auto mb-2 opacity-50" />
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
                            showToast('success', 'File Uploaded', `${activeLesson.type === 'pdf' ? 'PDF document' : 'Presentation'} uploaded successfully.`);
                          } catch (error) {
                            console.error('Failed to upload file:', error);
                            showToast('error', 'Upload Failed', 'Failed to upload file. Please try again.');
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
                          <p className="text-[10px] text-[#D4AF37] mt-1">Auto-calculated: 2 min / page</p>
                        </div>
                      </div>
                    </GlassCard>
                  )}

                  {/* 3. Quiz Editor */}
                  {activeLesson.type === 'quiz' && (
                    <div className="space-y-4">
                      {/* Passing Score Setting */}
                      <GlassCard className="!bg-yellow-400/5 !border-yellow-400/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Target size={20} className="text-[#D4AF37]" />
                            <div>
                              <label className="text-sm font-helvetica-bold text-white block">Passing Score</label>
                              <p className="text-xs text-zinc-500">Minimum % required to complete this quiz</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={activeLesson.passingScore || 70}
                              onChange={(e) => updateLesson(activeLesson.id, { passingScore: parseInt(e.target.value) || 70 })}
                              className="w-20 bg-zinc-900 border border-white/20 rounded-lg px-3 py-2 text-white text-center focus:border-yellow-400 outline-none"
                            />
                            <span className="text-zinc-400">%</span>
                          </div>
                        </div>
                      </GlassCard>

                      {activeLesson.quiz?.map((q, qIdx) => (
                        <GlassCard key={q.id} className="relative group">
                          <button
                            onClick={() => {
                              if (!confirm('Delete this question?')) return;
                              const newQuiz = activeLesson.quiz?.filter((_, idx) => idx !== qIdx) || [];
                              updateLesson(activeLesson.id, { quiz: newQuiz });
                            }}
                            className="absolute top-4 right-4 text-zinc-500 hover:text-red-400 transition-colors"
                          >
                            <X size={16} />
                          </button>
                          <div className="mb-4">
                            <label className="text-xs font-helvetica-bold text-zinc-500 uppercase mb-1 block">Question {qIdx + 1}</label>
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
                                  className="text-[#D4AF37] accent-yellow-400"
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
                          className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl text-zinc-500 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 hover:bg-yellow-400/5 transition-all flex items-center justify-center gap-2"
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
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h2 className="text-3xl font-helvetica-bold">User Management</h2>
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
                        <Clock size={28} className="text-[#D4AF37] drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-helvetica-bold text-white">Pending Approvals</h3>
                        <p className="text-sm text-[#D4AF37]/80">{pendingUsers.length} user{pendingUsers.length > 1 ? 's' : ''} awaiting your review</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {pendingUsers.map((pendingUser, idx) => (
                      <div
                        key={pendingUser.id}
                        className="group/card relative overflow-hidden rounded-2xl bg-gradient-to-r from-white/[0.06] to-white/[0.02] border border-white/10 hover:border-[#D4AF37]/50 transition-all duration-500 p-5"
                        style={{ animationDelay: `${idx * 100}ms` }}
                      >
                        {/* Hover glow effect */}
                        <div className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500">
                          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/5 via-transparent to-transparent" />
                        </div>

                        <div className="relative z-10 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 border border-white/10 flex items-center justify-center font-helvetica-bold text-lg text-white shadow-lg">
                              {pendingUser.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-helvetica-bold text-white text-lg">{pendingUser.name}</div>
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
              <h3 className="text-xl font-helvetica-bold text-white mb-2">All Caught Up!</h3>
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
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${userFilterRole === role
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
              <h3 className="text-lg font-helvetica-bold">All Users ({filteredUsers.length})</h3>
            </div>

            {loadingUsers ? (
              <div className="p-12 text-center">
                <Loader2 size={32} className="animate-spin text-[#D4AF37] mx-auto" />
                <p className="text-zinc-500 mt-4">Loading users...</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredUsers.map(u => (
                  <div key={u.id} className="p-4 hover:bg-white/[0.02] transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-helvetica-bold ${u.is_approved ? 'bg-yellow-400 text-black' : 'bg-zinc-700 text-zinc-400'
                        }`}>
                        {u.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="font-medium text-white flex items-center gap-2">
                          {u.name}
                          {!u.is_approved && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-400/20 text-[#D4AF37]">PENDING</span>
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
      <div className={`md:ml-64 h-screen overflow-y-auto relative z-10 liquid-scroll transition-colors duration-700 bg-transparent`}>
        <div className={`p-6 md:p-10 max-w-7xl mx-auto space-y-8 pb-20 relative z-[60]`}>

          <PageTransition viewKey={adminSection}>
            {adminSection === 'USERS' && <UserManagementSection />}

            {adminSection === 'OVERVIEW' && (
              <div className="space-y-8">
                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-3xl font-helvetica-bold">Admin Command Center</h2>
                    <p className="text-zinc-400 mt-1">Overview of academy performance and content</p>
                  </div>
                  <PrimaryButton onClick={handleCreateCourse} className="text-sm shadow-lg shadow-yellow-400/20">
                    <Plus size={18} /> New Course
                  </PrimaryButton>
                </div>

                {/* KPI Cards - Glass Effect - Real Data */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <GlassCard className="relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Users size={64} /></div>
                    <div className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2">Total Learners</div>
                    <div className="text-4xl font-helvetica-bold text-white mb-1">{fullStats?.totalLearners?.toLocaleString() || '—'}</div>
                    <div className="text-[#D4AF37] text-xs flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div> {fullStats?.totalEnrollments || 0} enrollments</div>
                  </GlassCard>
                  <GlassCard className="relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><BookOpen size={64} /></div>
                    <div className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2">Content Library</div>
                    <div className="text-4xl font-helvetica-bold text-white mb-1">{fullStats?.totalLessons || totalLessons}</div>
                    <div className="text-zinc-400 text-xs">Across {fullStats?.totalCourses || courses.length} courses</div>
                  </GlassCard>
                  <GlassCard className="relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><CheckCircle size={64} /></div>
                    <div className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2">Completion Rate</div>
                    <div className="text-4xl font-helvetica-bold text-white mb-1">{fullStats?.completionRate ?? '—'}%</div>
                    <div className="text-[#D4AF37] text-xs">Avg. per enrollment</div>
                  </GlassCard>
                  <GlassCard className="relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Target size={64} /></div>
                    <div className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2">Quiz Pass Rate</div>
                    <div className="text-4xl font-helvetica-bold text-white mb-1">{fullStats?.quizPassRate ?? '—'}%</div>
                    <div className="text-zinc-400 text-xs">Avg score: {fullStats?.averageQuizScore ?? '—'}%</div>
                  </GlassCard>
                </div>

                {/* Second Row KPIs - Study Hours & Overdue */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GlassCard className="relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><MonitorPlay size={64} /></div>
                    <div className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2">Total Study Hours</div>
                    <div className="text-4xl font-helvetica-bold text-white mb-1">{fullStats?.totalStudyHours ? (fullStats.totalStudyHours >= 1000 ? `${(fullStats.totalStudyHours / 1000).toFixed(1)}k` : fullStats.totalStudyHours) : '—'}</div>
                    <div className="text-white text-xs">Total learning time logged</div>
                  </GlassCard>
                  <GlassCard className={`relative overflow-hidden group ${(fullStats?.overdueEnrollments || 0) > 0 ? 'border-red-500/30' : ''}`}>
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><AlertTriangle size={64} /></div>
                    <div className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2">Overdue Enrollments</div>
                    <div className={`text-4xl font-helvetica-bold mb-1 ${(fullStats?.overdueEnrollments || 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {fullStats?.overdueEnrollments ?? 0}
                    </div>
                    <div className={`text-xs ${(fullStats?.overdueEnrollments || 0) > 0 ? 'text-red-400/80' : 'text-green-400/80'}`}>
                      {(fullStats?.overdueEnrollments || 0) > 0 ? 'Learners past deadline' : 'All on track'}
                    </div>
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
                              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/30 text-red-400 font-helvetica-bold uppercase tracking-wider animate-pulse">Action Required</span>
                            </div>
                            <h3 className="text-2xl font-helvetica-bold text-white">{pendingUsers.length} Pending User{pendingUsers.length > 1 ? 's' : ''}</h3>
                            <p className="text-sm text-zinc-400 mt-1">Click here to approve or reject registration requests</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="hidden md:flex flex-col items-end text-right">
                            <span className="text-xs text-zinc-500">Oldest</span>
                            <span className="text-sm text-white font-medium">{pendingUsers.length > 0 ? new Date(pendingUsers[0].created_at).toLocaleDateString('fr-FR') : '-'}</span>
                          </div>
                          <div className="w-12 h-12 rounded-xl bg-yellow-400/20 border border-[#D4AF37]/50 flex items-center justify-center group-hover:bg-yellow-400/30 transition-all">
                            <ChevronRight size={24} className="text-[#D4AF37] group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Overdue Learners Alert */}
                {overdueLearners.length > 0 && (
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500/20 via-red-500/20 to-orange-500/20 rounded-[26px] blur-md opacity-60" />
                    <div className="relative rounded-2xl overflow-hidden backdrop-blur-xl bg-gradient-to-br from-orange-900/20 via-black/40 to-red-900/10 border border-orange-500/30 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/30 to-orange-500/20 border border-red-400/40 flex items-center justify-center">
                            <AlertTriangle size={24} className="text-red-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-helvetica-bold text-white">{overdueLearners.length} Overdue Enrollment{overdueLearners.length > 1 ? 's' : ''}</h3>
                            <p className="text-sm text-zinc-400">Learners past their training deadline</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 text-xs rounded-full bg-red-500/20 text-red-400 font-medium border border-red-500/30">
                          Requires Attention
                        </span>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {overdueLearners.slice(0, 5).map((learner, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/10 flex items-center justify-center text-xs font-helvetica-bold text-red-400">
                                {learner.daysOverdue}d
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">{learner.name}</p>
                                <p className="text-xs text-zinc-500">{learner.courseTitle}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-zinc-400">{learner.ministry}</p>
                              {learner.isMandatory && (
                                <span className="text-xs text-red-400">Mandatory</span>
                              )}
                            </div>
                          </div>
                        ))}
                        {overdueLearners.length > 5 && (
                          <p className="text-center text-sm text-zinc-500 pt-2">
                            + {overdueLearners.length - 5} more overdue
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Analytics Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <GlassCard className="lg:col-span-2 p-8">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-helvetica-bold">Ministry Engagement</h3>
                      <div className="flex gap-2">
                        <button className="px-3 py-1 text-xs rounded-full bg-white/10 text-white">Weekly</button>
                        <button className="px-3 py-1 text-xs rounded-full hover:bg-white/5 text-zinc-400">Monthly</button>
                      </div>
                    </div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={adminStats} barSize={40}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis stroke="#64748b" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip
                            cursor={{ fill: '#ffffff05' }}
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
                    <h3 className="text-xl font-helvetica-bold mb-6">Content Types</h3>
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
                        <span className="text-3xl font-helvetica-bold text-white">100%</span>
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
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-helvetica-bold">Manage Courses</h3>
                    <span className="text-sm text-zinc-400">
                      {courses.length} course{courses.length !== 1 ? 's' : ''} total
                    </span>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {courses.map(course => {
                      const levelColor = course.level === 'Beginner' ? 'green' : course.level === 'Intermediate' ? 'yellow' : 'purple';
                      return (
                        <div key={course.id} className="group relative rounded-2xl transition-all duration-500 hover:scale-[1.01] hover:-translate-y-1">
                          {/* Ambient Glow */}
                          <div className={`absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl ${course.level === 'Beginner' ? 'bg-green-500/20' :
                            course.level === 'Intermediate' ? 'bg-yellow-500/20' :
                              'bg-purple-500/20'
                            }`}></div>

                          <div className="relative glass-panel rounded-2xl border border-white/10 group-hover:border-white/20 overflow-hidden backdrop-blur-xl bg-zinc-900/80 flex flex-col sm:flex-row h-full">
                            {/* Thumbnail */}
                            <div className="w-full sm:w-48 h-32 sm:h-auto relative overflow-hidden shrink-0">
                              <img
                                src={course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800'}
                                alt={course.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 via-transparent to-transparent"></div>
                              <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-helvetica-bold backdrop-blur-md ${course.level === 'Beginner' ? 'bg-green-500/30 text-green-300 border border-green-500/50' :
                                course.level === 'Intermediate' ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50' :
                                  'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                                }`}>{course.level}</div>
                            </div>

                            {/* Content */}
                            <div className="p-4 flex-1 flex flex-col justify-between min-w-0">
                              <div>
                                <h4 className="text-base font-helvetica-bold text-white mb-1 group-hover:text-[#D4AF37] transition-colors line-clamp-1">{course.title}</h4>
                                <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed mb-3">{course.description || 'No description provided for this module.'}</p>
                                <div className="flex gap-3 text-[10px]">
                                  <span className="flex items-center gap-1.5 text-zinc-400"><List size={12} className="text-zinc-600" /> {course.lessons.length} Modules</span>
                                  <span className="flex items-center gap-1.5 text-zinc-400"><Users size={12} className="text-zinc-600" /> {course.enrolledCount} Enrolled</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                                <PrimaryButton
                                  onClick={() => handleEditCourse(course)}
                                  className="flex-1 h-8 !py-0 !px-3 !text-[11px] !rounded-xl shadow-lg shadow-yellow-400/10"
                                >
                                  <Pencil size={12} /> Edit Module
                                </PrimaryButton>
                                <button
                                  onClick={() => deleteCourse(course.id)}
                                  className="h-8 w-8 flex items-center justify-center rounded-xl border border-red-500/20 text-red-500/60 hover:bg-red-500 hover:text-white hover:border-red-500 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all shrink-0"
                                  title="Delete Course"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {adminSection === 'COURSES' && (
              <div className="space-y-8">
                <div className={`flex justify-between items-end mb-8 transition-all duration-700 ${draggedCourseId ? 'opacity-20 blur-sm pointer-events-none' : 'opacity-100'}`}>
                  <div>
                    <h2 className="text-3xl font-helvetica-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">Course Manager</h2>
                    <p className="text-zinc-400 mt-2 flex items-center gap-4">
                      <span>{courses.length} course{courses.length !== 1 ? 's' : ''}</span>
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400"></span><span className="text-green-400">{courses.filter(c => c.level === 'Beginner').length}</span> Beginner</span>
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400"></span><span className="text-[#D4AF37]">{courses.filter(c => c.level === 'Intermediate').length}</span> Intermediate</span>
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-400"></span><span className="text-purple-400">{courses.filter(c => c.level === 'Advanced').length}</span> Advanced</span>
                    </p>
                  </div>
                  <PrimaryButton onClick={handleCreateCourse} className="text-sm shadow-lg shadow-yellow-400/20">
                    <Plus size={18} /> New Course
                  </PrimaryButton>
                </div>

                <div className="space-y-12">
                  {(['Beginner', 'Intermediate', 'Advanced'] as const).map(level => {
                    const currentCourses = (localCourses && localCourses.length > 0) ? localCourses : courses;
                    const levelCourses = currentCourses.filter(c => c.level === level).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
                    if (levelCourses.length === 0) return null;

                    return (
                      <div key={level} className="space-y-6">
                        <div className={`flex items-center gap-4 transition-all duration-300 ${draggedCourseId ? 'opacity-50' : 'opacity-100'}`}>
                          <div className={`px-4 py-1.5 rounded-full text-sm font-helvetica-bold ${level === 'Beginner' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            level === 'Intermediate' ? 'bg-yellow-500/20 text-[#D4AF37] border border-yellow-500/30' :
                              'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            }`}>{level}</div>
                          <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                          <span className="text-sm text-zinc-500 font-medium">{levelCourses.length} course{levelCourses.length > 1 ? 's' : ''}</span>
                        </div>

                        <LayoutGroup>
                          <motion.div
                            layout
                            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 relative"
                          >
                            {levelCourses.map((course, index) => (
                              <motion.div
                                key={course.id}
                                layout
                                layoutId={course.id}
                                initial={false}
                                animate={{
                                  scale: draggedCourseId === course.id ? 1.05 : 1,
                                  zIndex: draggedCourseId === course.id ? 50 : 1,
                                  boxShadow: draggedCourseId === course.id
                                    ? "0 25px 50px rgba(0,0,0,0.4), 0 0 30px rgba(212, 175, 55, 0.3)"
                                    : "0 0 0 rgba(0,0,0,0)"
                                }}
                                transition={{
                                  layout: { type: "spring", stiffness: 350, damping: 30 },
                                  scale: { type: "spring", stiffness: 400, damping: 25 }
                                }}
                                drag
                                dragSnapToOrigin
                                dragElastic={0.2}
                                dragTransition={{ bounceStiffness: 300, bounceDamping: 20 }}
                                onDragStart={() => {
                                  dragState.current = {
                                    dragging: true,
                                    courseId: course.id,
                                    startIndex: index,
                                    currentIndex: index,
                                    level
                                  };
                                  setDraggedCourseId(course.id);
                                }}
                                onDrag={(_, info) => {
                                  if (!dragState.current.dragging) return;

                                  const cols = window.innerWidth >= 1280 ? 3 : window.innerWidth >= 768 ? 2 : 1;
                                  const cardWidth = 380;
                                  const cardHeight = 340;
                                  const gap = 24;

                                  // Calculate movement in grid units
                                  const deltaCol = Math.round(info.offset.x / (cardWidth + gap));
                                  const deltaRow = Math.round(info.offset.y / (cardHeight + gap));

                                  const startRow = Math.floor(dragState.current.startIndex / cols);
                                  const startCol = dragState.current.startIndex % cols;

                                  let newCol = startCol + deltaCol;
                                  let newRow = startRow + deltaRow;

                                  // Clamp to valid range
                                  newCol = Math.max(0, Math.min(cols - 1, newCol));
                                  newRow = Math.max(0, newRow);

                                  const newIndex = Math.min(levelCourses.length - 1, Math.max(0, newRow * cols + newCol));

                                  if (newIndex !== dragState.current.currentIndex) {
                                    dragState.current.currentIndex = newIndex;

                                    // Reorder the array
                                    const reordered = [...levelCourses];
                                    const [moved] = reordered.splice(
                                      reordered.findIndex(c => c.id === course.id),
                                      1
                                    );
                                    reordered.splice(newIndex, 0, moved);

                                    // Update with new orderIndex
                                    const updated = reordered.map((c, i) => ({ ...c, orderIndex: i }));
                                    const otherCourses = localCourses.filter(c => c.level !== level);
                                    setLocalCourses(sortCourses([...otherCourses, ...updated]));
                                  }
                                }}
                                onDragEnd={async () => {
                                  const finalLevel = dragState.current.level;
                                  dragState.current = { dragging: false, courseId: null, startIndex: -1, currentIndex: -1, level: '' };
                                  setDraggedCourseId(null);

                                  // Persist to backend and global state
                                  const finalLevelCourses = localCourses.filter(c => c.level === finalLevel);
                                  setCourses([...localCourses]);

                                  try {
                                    await dataService.reorderCourses(finalLevel, finalLevelCourses.map(c => c.id));
                                  } catch (err) {
                                    console.error('Reorder sync failed:', err);
                                  }
                                }}
                                className={`group relative rounded-2xl cursor-grab active:cursor-grabbing select-none ${
                                  draggedCourseId && draggedCourseId !== course.id ? 'pointer-events-none' : ''
                                }`}
                                style={{ touchAction: 'none' }}
                              >
                                {/* Card Body */}
                                <div className={`relative rounded-2xl border overflow-hidden backdrop-blur-xl bg-zinc-900/90 transition-all duration-200 ${
                                  draggedCourseId === course.id
                                    ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/30'
                                    : 'border-white/10 hover:border-white/25'
                                }`}>
                                  <div className="relative aspect-video overflow-hidden">
                                    <img
                                      src={course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800'}
                                      alt={course.title}
                                      className="w-full h-full object-cover pointer-events-none"
                                      draggable={false}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent pointer-events-none" />

                                    {/* Order Badge */}
                                    <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/70 backdrop-blur-sm border border-white/20 flex items-center justify-center text-sm font-helvetica-bold text-white">
                                      {index + 1}
                                    </div>

                                    {/* Level Badge */}
                                    <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-helvetica-bold backdrop-blur-sm ${
                                      level === 'Beginner' ? 'bg-green-500/30 text-green-300 border border-green-500/50' :
                                      level === 'Intermediate' ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50' :
                                      'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                                    }`}>{level}</div>

                                    {/* Drag Handle Overlay */}
                                    <motion.div
                                      className="absolute inset-0 flex items-center justify-center bg-black/60"
                                      initial={{ opacity: 0 }}
                                      whileHover={{ opacity: 1 }}
                                      transition={{ duration: 0.15 }}
                                    >
                                      <motion.div
                                        className="p-4 rounded-full bg-[#D4AF37] text-black shadow-xl"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                      >
                                        <GripVertical size={28} />
                                      </motion.div>
                                    </motion.div>
                                  </div>

                                  <div className="p-5">
                                    <h4 className="text-lg font-helvetica-bold text-white mb-2 line-clamp-1">{course.title}</h4>
                                    <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{course.description || 'No description'}</p>
                                    <div className="flex gap-2">
                                      <button
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => { e.stopPropagation(); handleEditCourse(course); }}
                                        className="flex-1 py-2.5 px-4 rounded-xl bg-[#D4AF37] text-black text-sm font-helvetica-bold hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2"
                                      >
                                        <Pencil size={14} /> Edit
                                      </button>
                                      <button
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => { e.stopPropagation(); deleteCourse(course.id); }}
                                        className="p-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </motion.div>
                        </LayoutGroup>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}


            {adminSection === 'ANALYTICS' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-helvetica-bold">Analytics Dashboard</h2>
                  <p className="text-zinc-400 mt-1">Detailed insights into platform engagement</p>
                </div>

                {/* Ministry Progress Tracking - Enhanced with per-course breakdown */}
                <GlassCard className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-helvetica-bold">Ministry Training Progress</h3>
                    {selectedMinistry && (
                      <button
                        onClick={() => setSelectedMinistry(null)}
                        className="text-sm text-[#D4AF37] hover:text-yellow-300 flex items-center gap-1"
                      >
                        <ArrowLeft size={14} /> Back to all ministries
                      </button>
                    )}
                  </div>

                  {!selectedMinistry ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {ministryStats.length > 0 ? ministryStats.map((ministry, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedMinistry(ministry.name)}
                          className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-[#D4AF37]/50 hover:bg-white/10 transition-all text-left group"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="text-sm font-medium text-white truncate group-hover:text-[#D4AF37] transition-colors">{ministry.name}</div>
                            <div className="flex gap-2">
                              {ministry.overdueCount > 0 && (
                                <Badge type="default" className="!bg-red-500/20 !text-red-400 !border-red-500/30">
                                  {ministry.overdueCount} overdue
                                </Badge>
                              )}
                              <Badge type={ministry.activeLearners > 0 ? 'success' : 'default'}>
                                {ministry.activeLearners} active
                              </Badge>
                            </div>
                          </div>
                          <div className="text-2xl font-helvetica-bold text-[#D4AF37] mb-1">{ministry.totalLearners}</div>
                          <div className="text-xs text-zinc-500 mb-3">learners enrolled</div>
                          <div className="flex justify-between text-xs text-zinc-400 mb-1">
                            <span>Courses Completed</span>
                            <span className="text-white">{ministry.coursesCompleted}</span>
                          </div>
                          <div className="flex justify-between text-xs text-zinc-400 mb-1">
                            <span>Avg Quiz Score</span>
                            <span className="text-white">{ministry.avgQuizScore || 0}%</span>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#D4AF37] rounded-full"
                              style={{ width: `${ministry.totalLearners > 0 ? Math.min(100, (ministry.coursesCompleted / ministry.totalLearners) * 100) : 0}%` }}
                            />
                          </div>
                          <div className="text-xs text-zinc-500 mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            Click to view course breakdown <ChevronRight size={12} />
                          </div>
                        </button>
                      )) : (
                        <div className="col-span-3 text-center text-zinc-500 py-8">No ministry data available yet</div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-lg font-medium text-white mb-4">
                        {selectedMinistry} - Per-Course Breakdown
                      </div>
                      {ministryCourseStats.length > 0 ? (
                        <div className="space-y-3">
                          {ministryCourseStats.map((stat, idx) => (
                            <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <div className="font-medium text-white">{stat.courseTitle}</div>
                                  <div className="text-xs text-zinc-500">{stat.enrolledCount} enrolled</div>
                                </div>
                                <div className="flex gap-2">
                                  {stat.overdueCount > 0 && (
                                    <Badge type="default" className="!bg-red-500/20 !text-red-400 !border-red-500/30">
                                      {stat.overdueCount} overdue
                                    </Badge>
                                  )}
                                  <Badge type="success">{stat.completionRate}% complete</Badge>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                  <div className="text-lg font-helvetica-bold text-green-400">{stat.completedCount}</div>
                                  <div className="text-xs text-zinc-500">Completed</div>
                                </div>
                                <div>
                                  <div className="text-lg font-helvetica-bold text-[#D4AF37]">{stat.enrolledCount - stat.completedCount}</div>
                                  <div className="text-xs text-zinc-500">In Progress</div>
                                </div>
                                <div>
                                  <div className="text-lg font-helvetica-bold text-white">{stat.avgScore}%</div>
                                  <div className="text-xs text-zinc-500">Avg Score</div>
                                </div>
                              </div>
                              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-3">
                                <div
                                  className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full"
                                  style={{ width: `${stat.completionRate}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-zinc-500 py-8">No course data available for this ministry</div>
                      )}
                    </div>
                  )}
                </GlassCard>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <GlassCard className="lg:col-span-2 p-8">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-helvetica-bold">Ministry Engagement</h3>
                    </div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ministryStats.length > 0 ? ministryStats.map(m => ({ name: m.name?.split(' ').pop() || m.name, value: m.totalLearners })) : adminStats} barSize={40}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis stroke="#64748b" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip
                            cursor={{ fill: '#ffffff05' }}
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                            itemStyle={{ color: '#fff' }}
                          />
                          <Bar dataKey="value" radius={[8, 8, 8, 8]}>
                            {(ministryStats.length > 0 ? ministryStats : adminStats).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#FACC15', '#CA8A04', '#FEF08A', '#713F12'][index % 4]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-8">
                    <h3 className="text-xl font-helvetica-bold mb-6">Content Types</h3>
                    <div className="h-64 w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={contentStats.length > 0 ? contentStats : [
                              { name: 'Video', value: 45 },
                              { name: 'Pdf', value: 30 },
                              { name: 'Quiz', value: 25 },
                            ]}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {(contentStats.length > 0 ? contentStats : [1, 2, 3]).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={['#FACC15', '#FFFFFF', '#A16207', '#FEF08A'][index % 4]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                        <span className="text-3xl font-helvetica-bold text-white">{fullStats?.totalLessons || '—'}</span>
                        <span className="text-xs text-zinc-400">Total Lessons</span>
                      </div>
                    </div>
                    <div className="flex justify-center gap-4 text-xs flex-wrap">
                      {contentStats.length > 0 ? contentStats.map((c, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#FACC15', '#FFFFFF', '#A16207', '#FEF08A'][idx % 4] }}></div>
                          {c.name} ({c.count || c.value})
                        </div>
                      )) : (
                        <>
                          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400"></div> Video</div>
                          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-white"></div> Docs</div>
                          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-700"></div> Quiz</div>
                        </>
                      )}
                    </div>
                  </GlassCard>
                </div>
              </div>
            )}
          </PageTransition>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="font-helvetica text-slate-50 min-h-screen flex items-center justify-center bg-[#0a0a0b]">
        <Loader2 className="animate-spin text-[#D4AF37]" size={48} />
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="font-helvetica text-slate-50 selection:bg-yellow-400/30 h-screen overflow-hidden animate-page-entrance">
        <LiquidBackground />

        {/* Sidebar for authenticated views except player */}
        {(currentView === 'DASHBOARD' || currentView === 'ADMIN') && <Sidebar />}

        {/* Main Content Router */}
        <main className="h-screen overflow-hidden relative">
          <AnimatePresence mode="wait">
            {currentView === 'LANDING' && (
              <PageTransition key="landing">
                <LandingView />
              </PageTransition>
            )}
            {currentView === 'AUTH' && (
              <PageTransition key="auth">
                <AuthView />
              </PageTransition>
            )}
            {currentView === 'DASHBOARD' && (
              <PageTransition key="dashboard">
                <DashboardView />
              </PageTransition>
            )}
            {currentView === 'COURSE_PLAYER' && (
              <PageTransition key="player">
                <PlayerView />
              </PageTransition>
            )}
            {currentView === 'ADMIN' && (
              <PageTransition key="admin">
                <AdminView />
              </PageTransition>
            )}
          </AnimatePresence>
        </main>
      </div>
    </ToastProvider>
  );
};

export default App;