import React, { useState, useEffect, useRef } from 'react';
import {
    BookOpen, Layout, Trophy, Settings, CheckCircle, LogOut, ChevronRight,
    ChevronUp, ChevronDown, Users, Menu, X, Plus, Save, ArrowLeft, Lock,
    FileText, Video, HelpCircle, Trash2, MonitorPlay, List, Download,
    PlayCircle, RefreshCw, Award, Clock, UserCheck, UserX, Eye, EyeOff,
    AlertCircle, Loader2, XCircle, Calendar, AlertTriangle, Target,
    GripVertical, Pencil, Trophy as TrophyIcon
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { AnimatePresence, Reorder, motion, LayoutGroup } from 'framer-motion';
import { GlassCard, PrimaryButton, SecondaryButton, ProgressBar, Badge, FileDropZone, IconButton, ToastProvider, useToast, LiquidVideoFrame } from './UIComponents';
import { PageTransition } from './PageTransition';
import { dataService } from '../services/dataService';
import { authAPI, setAuthToken, getAuthToken, PendingUser, adminAPI } from '../services/api';
import { MINISTRIES } from '../constants';
import { Course, User, UserRole, Lesson, AnalyticData, LearningPath, ContentType } from '../types';

// --- Types & Constants ---
const LEVEL_PRIORITY: Record<string, number> = { 'Beginner': 0, 'Intermediate': 1, 'Advanced': 2 };
const PASSING_SCORE = 70;

export const sortCourses = (coursesToSort: Course[]): Course[] => {
    return [...coursesToSort].sort((a, b) => {
        const levelDiff = (LEVEL_PRIORITY[a.level] || 0) - (LEVEL_PRIORITY[b.level] || 0);
        if (levelDiff !== 0) return levelDiff;
        return (a.orderIndex ?? 999) - (b.orderIndex ?? 999);
    });
};

export const isYouTubeUrl = (url: string) => url?.includes('youtube.com') || url?.includes('youtu.be');

export const getYouTubeVideoId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

// --- Prop Interfaces ---

export type View = 'LANDING' | 'AUTH' | 'DASHBOARD' | 'COURSE_PLAYER' | 'ADMIN';
export type AdminSection = 'OVERVIEW' | 'USERS' | 'COURSES' | 'ANALYTICS';

export interface SidebarProps {
    user: User | null;
    currentView: View;
    setCurrentView: (view: View) => void;
    adminSection: AdminSection;
    setAdminSection: (section: AdminSection) => void;
    mobileMenuOpen: boolean;
    setMobileMenuOpen: (open: boolean) => void;
    draggedCourseId: string | null;
    setUser: (user: User | null) => void;
}

export interface LandingViewProps {
    setCurrentView: (view: View) => void;
}

export interface AuthViewProps {
    setUser: (user: User | null) => void;
    setCurrentView: (view: View) => void;
}

export interface DashboardViewProps {
    user: User | null;
    courses: Course[];
    userDashboardStats: any;
    handleStartCourse: (course: Course) => void;
    mobileMenuOpen: boolean;
    setMobileMenuOpen: (open: boolean) => void;
}

export interface PlayerViewProps {
    user: User | null;
    activeCourse: Course | null;
    activeLesson: Lesson | null;
    setActiveLesson: (lesson: Lesson | null) => void;
    setCurrentView: (view: View) => void;
    handleLessonComplete: (quizScore?: number, totalQuestions?: number) => void;
    playerSidebarCollapsed: boolean;
    setPlayerSidebarCollapsed: (collapsed: boolean) => void;
}

export interface AdminViewProps {
    user: User | null;
    courses: Course[];
    setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
    adminSection: AdminSection;
    setAdminSection: (section: AdminSection) => void;
    draggedCourseId: string | null;
    setDraggedCourseId: (id: string | null) => void;
}

// --- Sub-Components ---

const SidebarItem = ({ icon, label, active, onClick, badge }: any) => {
    const [isRadiating, setIsRadiating] = useState(false);
    const [clickPos, setClickPos] = useState({ x: 0, y: 0 });

    const handleClick = (e: React.MouseEvent) => {
        if (active) { onClick(); return; }
        const rect = e.currentTarget.getBoundingClientRect();
        setClickPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setIsRadiating(true);
        setTimeout(() => onClick(), 250);
        setTimeout(() => setIsRadiating(false), 600);
    };

    return (
        <button
            onClick={handleClick}
            className={`relative w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300 overflow-hidden ${active ? 'text-[#D4AF37] border border-[#D4AF37]/40 bg-[#D4AF37]/5' : 'text-zinc-500 hover:text-white hover:bg-white/[0.03]'} ${isRadiating ? 'scale-95 brightness-125' : 'scale-100'} active:scale-[0.96]`}
        >
            {isRadiating && <div className="absolute pointer-events-none rounded-full border-2 border-[#D4AF37] animate-radiant z-20" style={{ left: clickPos.x, top: clickPos.y, width: '10px', height: '10px', marginLeft: '-5px', marginTop: '-5px' }} />}
            {isRadiating && <div className="absolute inset-0 bg-[#D4AF37]/20 animate-gold-flood z-0" />}
            <span className="relative z-10 scale-90">{icon}</span>
            <span className={`relative z-10 font-helvetica text-[13px] tracking-wide ${active || isRadiating ? 'font-helvetica-bold' : ''}`}>{label}</span>
            {badge && <span className="relative z-10 ml-auto">{badge}</span>}
        </button>
    );
};

export const Sidebar: React.FC<SidebarProps> = ({ user, currentView, setCurrentView, adminSection, setAdminSection, mobileMenuOpen, setMobileMenuOpen, draggedCourseId, setUser }) => (
    <div className={`fixed inset-y-0 left-0 z-50 w-64 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out ${draggedCourseId ? 'opacity-20 blur-sm pointer-events-none' : 'opacity-100'}`}>
        <div className="h-full flex flex-col bg-[#0a0a0b] border-r border-white/[0.06]">
            <div className="p-8">
                <h1 className="text-2xl font-helvetica-bold tracking-wider cursor-pointer group" onClick={() => setCurrentView('LANDING')}>
                    <span className="text-[#D4AF37]">AMINI</span><span className="font-helvetica-light text-white/70 ml-1">ACADEMY</span>
                </h1>
            </div>
            <nav className="flex-1 px-4 space-y-1.5 py-2">
                {user?.role !== UserRole.ADMIN && (
                    <>
                        <SidebarItem icon={<Layout size={20} />} label="Dashboard" active={currentView === 'DASHBOARD'} onClick={() => setCurrentView('DASHBOARD')} />
                        <SidebarItem icon={<BookOpen size={20} />} label="My Learning" />
                        <SidebarItem icon={<Trophy size={20} />} label="Achievements" />
                    </>
                )}
                {user?.role === UserRole.ADMIN && (
                    <>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-helvetica-bold px-4 pt-4 pb-2">Admin Portal</div>
                        <SidebarItem icon={<Layout size={20} />} label="Overview" active={currentView === 'ADMIN' && adminSection === 'OVERVIEW'} onClick={() => { setCurrentView('ADMIN'); setAdminSection('OVERVIEW'); }} />
                        <SidebarItem icon={<UserCheck size={20} />} label="User Approvals" active={currentView === 'ADMIN' && adminSection === 'USERS'} onClick={() => { setCurrentView('ADMIN'); setAdminSection('USERS'); }} />
                        <SidebarItem icon={<BookOpen size={20} />} label="Course Manager" active={currentView === 'ADMIN' && adminSection === 'COURSES'} onClick={() => { setCurrentView('ADMIN'); setAdminSection('COURSES'); }} />
                        <SidebarItem icon={<Trophy size={20} />} label="Analytics" active={currentView === 'ADMIN' && adminSection === 'ANALYTICS'} onClick={() => { setCurrentView('ADMIN'); setAdminSection('ANALYTICS'); }} />
                        <SidebarItem icon={<Layout size={20} />} label="View as User" active={currentView === 'DASHBOARD'} onClick={() => setCurrentView('DASHBOARD')} />
                    </>
                )}
            </nav>
            <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/5 flex items-center justify-center font-helvetica-bold text-[#D4AF37]">{user?.name?.charAt(0) || 'U'}</div>
                    <div><p className="text-xs font-helvetica-bold text-white">{user?.name}</p><p className="text-[10px] text-zinc-500">{user?.ministry}</p></div>
                </div>
                <button onClick={() => { setAuthToken(null); setUser(null); setCurrentView('LANDING'); }} className="flex items-center gap-2.5 text-sm text-zinc-500 hover:text-red-400 transition-all w-full py-2 px-3 rounded-xl hover:bg-red-500/10">
                    <LogOut size={16} /><span>Sign Out</span>
                </button>
            </div>
        </div>
    </div>
);

// --- MAIN VIEWS ---

export const LandingView: React.FC<LandingViewProps> = ({ setCurrentView }) => (
    <div className="min-h-screen flex flex-col relative z-10">
        <header className="px-6 py-6 flex justify-between items-center max-w-7xl mx-auto w-full">
            <div className="text-2xl font-helvetica-bold tracking-wider">BAJAN-X<span className="text-[#D4AF37]">UNI</span></div>
            <PrimaryButton onClick={() => setCurrentView('AUTH')}>Log In / Sign Up</PrimaryButton>
        </header>
        <main className="flex-1 flex flex-col justify-center items-center text-center px-4">
            <Badge type="success">Government Initiative</Badge>
            <h1 className="text-5xl md:text-7xl font-helvetica-bold mt-6 mb-6 leading-tight">Master the Tools of <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-white to-zinc-400 animate-pulse">Digital Governance</span></h1>
            <p className="text-xl text-zinc-400 max-w-2xl mb-10 leading-relaxed">The central hub for public servants to learn <span className="text-white font-medium">Bridge</span>, <span className="text-white font-medium">ChatBB</span>, and <span className="text-white font-medium">Bajan-X</span>.</p>
            <div className="flex gap-4"><PrimaryButton onClick={() => setCurrentView('AUTH')}>Start Learning Path</PrimaryButton><SecondaryButton>Browse Catalog</SecondaryButton></div>
            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full px-4">
                {[
                    { title: "Foundations", desc: "Core digital literacy & security", time: "2h" },
                    { title: "Bridge Platform", desc: "Connecting gov datasets", time: "4h" },
                    { title: "ChatBB Support", desc: "AI customer service tools", time: "1h" },
                ].map((card, idx) => (
                    <GlassCard key={idx} className="bg-white/5 backdrop-blur-sm border-white/5">
                        <div className="h-10 w-10 rounded-full bg-yellow-400/20 flex items-center justify-center mb-4 text-[#D4AF37]"><BookOpen size={20} /></div>
                        <h3 className="text-lg font-helvetica-bold mb-2">{card.title}</h3>
                        <p className="text-zinc-400 text-sm mb-4">{card.desc}</p>
                        <div className="text-xs text-zinc-500 font-mono">{card.time} estimate</div>
                    </GlassCard>
                ))}
            </div>
        </main>
    </div>
);

export const AuthView: React.FC<AuthViewProps> = ({ setUser, setCurrentView }) => {
    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
    const [formData, setFormData] = useState({ email: '', password: '', name: '', ministry: MINISTRIES[0], role: UserRole.LEARNER });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [pendingApproval, setPendingApproval] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError(''); setIsSubmitting(true);
        try {
            if (authMode === 'login') {
                const response = await authAPI.login({ email: formData.email, password: formData.password });
                if (response.token) {
                    setAuthToken(response.token);
                    setUser({ ...response.user, enrolledCourses: [], completedPaths: [] });
                    setCurrentView(response.user.role === 'ADMIN' ? 'ADMIN' : 'DASHBOARD');
                }
            } else {
                const response = await authAPI.register({ ...formData, role: formData.role === UserRole.SUPERUSER ? 'SUPERUSER' : 'LEARNER' });
                if (response.status === 'PENDING_APPROVAL') setPendingApproval(true);
            }
        } catch (err: any) {
            if (err.message.includes('pending')) setPendingApproval(true);
            else setError(err.message || 'Authentication failed. Please try again.');
        } finally { setIsSubmitting(false); }
    };

    if (pendingApproval) return (
        <div className="min-h-screen flex items-center justify-center p-4"><GlassCard className="max-w-md w-full p-8 text-center"><div className="w-20 h-20 rounded-full bg-yellow-400/20 flex items-center justify-center mx-auto mb-6"><Clock size={40} className="text-[#D4AF37]" /></div><h2 className="text-2xl font-helvetica-bold mb-4">Registration Submitted</h2><p className="text-zinc-400 mb-6">Your account is pending approval from an administrator.</p><SecondaryButton onClick={() => { setPendingApproval(false); setAuthMode('login'); }} className="w-full">Back to Login</SecondaryButton></GlassCard></div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <GlassCard className="max-w-md w-full p-8 relative overflow-hidden transition-all duration-500 border-t border-white/20">
                <button onClick={() => setCurrentView('LANDING')} className="text-zinc-500 hover:text-white flex items-center gap-2 text-sm transition-colors mb-6"><ArrowLeft size={16} /> Back</button>
                <div className="flex mb-8 bg-zinc-900/50 rounded-xl p-1">
                    <button onClick={() => setAuthMode('login')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${authMode === 'login' ? 'bg-yellow-400 text-black' : 'text-zinc-400 hover:text-white'}`}>Sign In</button>
                    <button onClick={() => setAuthMode('register')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${authMode === 'register' ? 'bg-yellow-400 text-black' : 'text-zinc-400 hover:text-white'}`}>Register</button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                    {authMode === 'register' && <input required placeholder="Full Name" className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-yellow-400 outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />}
                    <input required type="email" placeholder="Email" className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-yellow-400 outline-none" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                    <div className="relative">
                        <input required type={showPassword ? 'text' : 'password'} placeholder="Password" className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 pr-12 text-white focus:ring-2 focus:ring-yellow-400 outline-none" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"><Eye size={18} /></button>
                    </div>
                    {error && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-xl flex items-center gap-2"><AlertCircle size={16} />{error}</div>}
                    <PrimaryButton type="submit" className="w-full py-4 text-lg font-helvetica-bold mt-4" disabled={isSubmitting}>{isSubmitting ? 'Authenticating...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}</PrimaryButton>
                </form>
            </GlassCard>
        </div>
    );
};

export const DashboardView: React.FC<DashboardViewProps> = ({ user, courses, userDashboardStats, handleStartCourse, mobileMenuOpen, setMobileMenuOpen }) => {
    const isCourseCompleted = (course: Course) => course.progress === 100;
    const isLevelUnlocked = (level: string) => {
        if (level === 'Beginner') return true;
        const previousLevelCourses = courses.filter(c => level === 'Intermediate' ? c.level === 'Beginner' : c.level === 'Intermediate');
        const enrolledPrevious = previousLevelCourses.filter(c => c.progress > 0);
        return enrolledPrevious.length > 0 && enrolledPrevious.every(isCourseCompleted);
    };

    const totalProgress = userDashboardStats ? Math.round((userDashboardStats.completedCourses / Math.max(userDashboardStats.enrolledCourses, 1)) * 100) : 0;
    const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());

    return (
        <div className="md:ml-64 h-screen overflow-y-auto liquid-scroll">
            <div className="md:hidden p-4 flex justify-between bg-[#0c0c0e] sticky top-0 z-40"><span className="font-helvetica-bold">Amini Academy</span><button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X /> : <Menu />}</button></div>
            <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10">
                <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                    <div><h2 className="text-4xl font-helvetica-bold mb-2">Welcome, {user?.name?.split(' ')[0]}</h2><div className="text-zinc-400">Ready to upskill?</div></div>
                    <div className="flex gap-3">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center min-w-[80px]">
                            <div className="text-3xl font-helvetica-bold text-[#D4AF37]">{userDashboardStats?.lessonsCompleted || 0}</div>
                            <div className="text-[10px] text-zinc-500 uppercase">Lessons</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center min-w-[80px]">
                            <div className="text-3xl font-helvetica-bold text-white">{userDashboardStats?.completedCourses || 0}</div>
                            <div className="text-[10px] text-zinc-500 uppercase">Courses</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center min-w-[80px]">
                            <div className="text-3xl font-helvetica-bold text-green-400">{userDashboardStats?.averageQuizScore || 0}%</div>
                            <div className="text-[10px] text-zinc-500 uppercase">Quiz Avg</div>
                        </div>
                    </div>
                </div>

                <div className="relative rounded-3xl overflow-hidden backdrop-blur-2xl bg-gradient-to-r from-white/[0.06] to-white/[0.02] border border-white/10 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div><h3 className="text-lg font-helvetica-bold">Bajan-X Overall Progress</h3><p className="text-sm text-zinc-400">Complete missions to earn certification</p></div>
                        <div className="text-[#D4AF37] font-helvetica-bold text-2xl">{totalProgress}%</div>
                    </div>
                    <ProgressBar progress={totalProgress} className="h-3" />
                    <div className="flex justify-between mt-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(m => (
                            <div key={m} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-helvetica-bold ${totalProgress >= (m / 8) * 100 ? 'bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' : 'bg-white/5 text-zinc-600'}`}>BX{m}</div>
                        ))}
                    </div>
                </div>

                {(['Beginner', 'Intermediate', 'Advanced'] as const).map(level => {
                    const levelCourses = courses.filter(c => c.level === level);
                    if (levelCourses.length === 0) return null;
                    const isPathUnlocked = isLevelUnlocked(level);

                    return (
                        <div key={level} className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isPathUnlocked ? 'bg-yellow-400/20 text-[#D4AF37]' : 'bg-zinc-800/50 text-zinc-600'}`}>{isPathUnlocked ? <BookOpen size={20} /> : <Lock size={20} />}</div>
                                <h3 className={`text-2xl font-helvetica-bold ${!isPathUnlocked && 'text-zinc-600'}`}>{level} Track</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                                {levelCourses.map(course => {
                                    const unlocked = isPathUnlocked;
                                    return (
                                        <GlassCard key={course.id} className={`group cursor-pointer transition-all duration-500 ${unlocked ? 'hover:-translate-y-2 hover:shadow-2xl hover:border-yellow-400/40' : 'opacity-60 cursor-not-allowed'}`} onClick={() => unlocked && handleStartCourse(course)}>
                                            <div className="relative aspect-video rounded-t-xl overflow-hidden mb-4">
                                                <img src={course.thumbnail} className={`w-full h-full object-cover transition-transform duration-700 ${unlocked ? 'group-hover:scale-110' : 'grayscale'}`} />
                                                {!unlocked && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Lock size={32} className="text-white/50" /></div>}
                                            </div>
                                            <h4 className="text-lg font-helvetica-bold mb-2 group-hover:text-[#D4AF37] transition-colors">{course.title}</h4>
                                            <p className={`text-xs text-zinc-400 mb-4 line-clamp-2`}>{course.description}</p>
                                            <ProgressBar progress={course.progress} />
                                        </GlassCard>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const PlayerView: React.FC<PlayerViewProps> = ({ user, activeCourse, activeLesson, setActiveLesson, setCurrentView, handleLessonComplete, playerSidebarCollapsed, setPlayerSidebarCollapsed }) => {
    if (!activeCourse) return null;
    const completedCount = activeCourse.lessons.filter(l => l.isCompleted).length;
    const totalCount = activeCourse.lessons.length;
    const progressPercent = Math.round((completedCount / totalCount) * 100);

    return (
        <div className="h-screen flex flex-col bg-[#0a0a0b] relative z-20">
            <div className="h-20 border-b border-white/[0.06] flex items-center justify-between px-6 bg-[#0a0a0b]">
                <button onClick={() => setCurrentView('DASHBOARD')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all">
                    <ChevronRight className="rotate-180" size={18} /> Exit
                </button>
                <span className="font-helvetica-bold text-white truncate max-w-md">{activeCourse.title}</span>
                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <div className="text-sm font-helvetica-bold text-white">{completedCount}/{totalCount}</div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Lessons</div>
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#D4AF37]/10 text-[#D4AF37] font-helvetica-bold shadow-[0_0_15px_rgba(212,175,55,0.1)]">{progressPercent}%</div>
                </div>
            </div>
            <div className="flex-1 flex overflow-hidden">
                <div className={`${playerSidebarCollapsed ? 'w-20' : 'w-80'} bg-[#0a0a0b] border-r border-white/[0.05] flex flex-col transition-all duration-300`}>
                    <div className="p-6 border-b border-white/10 flex justify-between items-center">
                        {!playerSidebarCollapsed && <h2 className="text-sm font-helvetica-bold uppercase tracking-widest text-[#D4AF37]">Curriculum</h2>}
                        <button onClick={() => setPlayerSidebarCollapsed(!playerSidebarCollapsed)} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10"><List size={16} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {activeCourse.lessons.map((lesson, idx) => {
                            const isActive = activeLesson?.id === lesson.id;
                            const isLocked = idx > 0 && !activeCourse.lessons[idx - 1].isCompleted;
                            return (
                                <button key={lesson.id} onClick={() => !isLocked && setActiveLesson(lesson)} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${isActive ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' : 'text-zinc-500 hover:bg-white/5 hover:text-white'} ${isLocked ? 'opacity-30 cursor-not-allowed' : ''}`}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-helvetica-bold ${isActive ? 'bg-black/20' : 'bg-white/5'}`}>{lesson.isCompleted ? <CheckCircle size={14} /> : idx + 1}</div>
                                    {!playerSidebarCollapsed && <span className="text-xs font-medium truncate flex-1 text-left">{lesson.title}</span>}
                                    {!playerSidebarCollapsed && isLocked && <Lock size={12} />}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-10 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.03),transparent_50%)]">
                    {activeLesson ? (
                        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                            <div className="text-center space-y-4">
                                <Badge type="success">{activeLesson.type.toUpperCase()}</Badge>
                                <h2 className="text-4xl font-helvetica-bold text-white leading-tight">{activeLesson.title}</h2>
                            </div>
                            <LiquidVideoFrame>
                                <div className="aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl relative">
                                    {activeLesson.type === 'video' ? (
                                        isYouTubeUrl(activeLesson.videoUrl || '') ? (
                                            <iframe src={`https://www.youtube.com/embed/${getYouTubeVideoId(activeLesson.videoUrl || '')}`} className="w-full h-full border-none" allowFullScreen />
                                        ) : (
                                            <video src={activeLesson.videoUrl || activeLesson.fileUrl} controls className="w-full h-full" />
                                        )
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                                            <div className="w-24 h-24 rounded-3xl bg-yellow-400/10 flex items-center justify-center mb-6"><FileText size={48} className="text-[#D4AF37]" /></div>
                                            <h3 className="text-2xl font-helvetica-bold mb-4">{activeLesson.fileName || 'Resource'}</h3>
                                            <PrimaryButton onClick={() => window.open(activeLesson.fileUrl, '_blank')} className="px-8"><Download size={18} className="mr-2" /> Download to Continue</PrimaryButton>
                                        </div>
                                    )}
                                </div>
                            </LiquidVideoFrame>
                            <div className="flex justify-between items-center py-6 border-t border-white/5">
                                <div><h4 className="text-white font-medium">{activeLesson.title}</h4><p className="text-sm text-zinc-500">{activeLesson.durationMin} min duration</p></div>
                                <PrimaryButton onClick={() => handleLessonComplete()} className="px-10 py-4 h-auto text-lg"><CheckCircle size={20} className="mr-2" /> Complete & Next</PrimaryButton>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                            <MonitorPlay size={64} className="mb-6" />
                            <h3 className="text-2xl">Ready to Start?</h3>
                            <p>Select a lesson from the curriculum</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const AdminView: React.FC<AdminViewProps> = ({ user, courses, setCourses, adminSection, setAdminSection, draggedCourseId, setDraggedCourseId }) => {
    const [localCourses, setLocalCourses] = useState<Course[]>(courses);
    const { showToast } = useToast();

    useEffect(() => { if (!draggedCourseId) setLocalCourses([...courses]); }, [courses, draggedCourseId]);

    return (
        <div className="md:ml-64 h-screen overflow-y-auto liquid-scroll">
            <div className="p-10 max-w-7xl mx-auto space-y-10">
                <div className="flex justify-between items-center pb-8 border-b border-white/5">
                    <div><h2 className="text-4xl font-helvetica-bold">Control Portal</h2><p className="text-zinc-500">Manage the digital learning ecosystem</p></div>
                    <PrimaryButton className="px-6 h-12 flex items-center gap-2"><Plus size={20} /> New Campaign</PrimaryButton>
                </div>
                <PageTransition viewKey={adminSection}>
                    {adminSection === 'COURSES' && (
                        <div className="space-y-12">
                            {(['Beginner', 'Intermediate', 'Advanced'] as const).map(level => {
                                const levelCourses = localCourses.filter(c => c.level === level);
                                return (
                                    <div key={level} className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <h3 className="text-xl font-helvetica-bold uppercase tracking-widest text-[#D4AF37]">{level}</h3>
                                            <div className="h-px flex-1 bg-white/10" />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                            {levelCourses.map((course, index) => (
                                                <motion.div
                                                    key={course.id}
                                                    layout
                                                    drag="x"
                                                    dragConstraints={{ left: -10, right: 10 }}
                                                    onDragStart={() => setDraggedCourseId(course.id)}
                                                    onDragEnd={() => { setDraggedCourseId(null); setCourses([...localCourses]); showToast('success', 'Order Saved', 'Course structure updated.'); }}
                                                    onDrag={(_, info) => {
                                                        const { x } = info.offset;
                                                        if (Math.abs(x) > 60) {
                                                            const targetIndex = index + (x > 0 ? 1 : -1);
                                                            if (targetIndex >= 0 && targetIndex < levelCourses.length) {
                                                                const reordered = [...levelCourses];
                                                                const [moved] = reordered.splice(index, 1);
                                                                reordered.splice(targetIndex, 0, moved);
                                                                setLocalCourses(prev => prev.map(c => c.level === level ? reordered.find(rc => rc.id === c.id) || c : c));
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <GlassCard className={`relative group p-4 border border-white/5 hover:border-yellow-400/40 transition-all ${draggedCourseId === course.id ? 'opacity-100 scale-105 z-50 ring-2 ring-yellow-400 border-yellow-400' : ''}`}>
                                                        <div className="absolute top-2 left-2 z-10 p-1.5 bg-black/60 rounded-lg text-white pointer-events-none cursor-grab"><GripVertical size={16} /></div>
                                                        <div className="aspect-video rounded-xl overflow-hidden mb-4 bg-zinc-800">
                                                            <img src={course.thumbnail} className="w-full h-full object-cover" />
                                                        </div>
                                                        <h4 className="font-helvetica-bold text-white truncate text-lg">{course.title}</h4>
                                                        <div className="flex justify-between items-center mt-3 text-xs text-zinc-500">
                                                            <span>{course.lessons.length} Lessons</span>
                                                            <span>{course.level}</span>
                                                        </div>
                                                    </GlassCard>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {adminSection === 'OVERVIEW' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { label: 'Active Learners', val: '1,240', change: '+12%', icon: <Users /> },
                                { label: 'Completion Rate', val: '64%', change: '+5%', icon: <CheckCircle /> },
                                { label: 'Study Hours', val: '8,420', change: '+18%', icon: <Clock /> },
                                { label: 'Certifications', val: '412', change: '+24%', icon: <TrophyIcon /> }
                            ].map((s, i) => (
                                <GlassCard key={i} className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-yellow-400/10 text-[#D4AF37] rounded-xl">{s.icon}</div>
                                        <span className="text-green-400 text-xs font-bold">{s.change}</span>
                                    </div>
                                    <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">{s.label}</div>
                                    <div className="text-3xl font-helvetica-bold text-white">{s.val}</div>
                                </GlassCard>
                            ))}
                        </div>
                    )}
                    {adminSection === 'USERS' && <div className="p-20 text-center text-zinc-600 italic">User Approval module under maintenance...</div>}
                </PageTransition>
            </div>
        </div>
    );
};
