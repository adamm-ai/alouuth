import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { LiquidBackground } from './components/LiquidBackground';
import { ToastProvider, useToast } from './components/UIComponents';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from './components/PageTransition';
import { dataService } from './services/dataService';
import { authAPI, setAuthToken } from './services/api';
import {
  Sidebar, LandingView, AuthView, DashboardView, PlayerView, AdminView,
  sortCourses
} from './components/PlatformViews';
import { Course, User, UserRole, Lesson, AnalyticData, LearningPath } from './types';

const App: React.FC = () => {
  // --- View State ---
  const [currentView, setCurrentView] = useState<'LANDING' | 'AUTH' | 'DASHBOARD' | 'COURSE_PLAYER' | 'ADMIN'>('LANDING');
  const [adminSection, setAdminSection] = useState<'OVERVIEW' | 'USERS' | 'COURSES' | 'ANALYTICS'>('OVERVIEW');

  // --- Data State ---
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [userDashboardStats, setUserDashboardStats] = useState<any>(null);
  const [draggedCourseId, setDraggedCourseId] = useState<string | null>(null);

  // --- UI State ---
  const [isLoading, setIsLoading] = useState(() => dataService.isAuthenticated());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [playerSidebarCollapsed, setPlayerSidebarCollapsed] = useState(false);

  // --- Auth Restoration ---
  useEffect(() => {
    const restoreSession = async () => {
      if (!dataService.isAuthenticated()) return;
      setIsLoading(true);
      try {
        const fetchedUser = await dataService.getUser();
        setUser(fetchedUser);
        setCurrentView(fetchedUser.role === 'ADMIN' ? 'ADMIN' : 'DASHBOARD');
      } catch (error) {
        console.error('Session restoration failed:', error);
        setAuthToken(null);
        setCurrentView('LANDING');
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  // --- Data Loading ---
  useEffect(() => {
    if (currentView !== 'DASHBOARD' && currentView !== 'ADMIN') return;
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [fetchedCourses, fetchedPaths, dashboardData] = await Promise.all([
          dataService.getCourses(),
          dataService.getPaths(),
          dataService.getDashboardStats()
        ]);
        setCourses(sortCourses(fetchedCourses));
        setPaths(fetchedPaths);
        setUserDashboardStats(dashboardData.stats);
      } catch (error) {
        console.error("Failed to load data", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [currentView]);

  // --- Handlers ---
  const handleStartCourse = async (course: Course) => {
    try {
      await dataService.enrollInCourse(course.id);
      setActiveCourse(course);
      const firstUncompleted = course.lessons.find(l => !l.isCompleted) || course.lessons[0];
      setActiveLesson(firstUncompleted || null);
      setCurrentView('COURSE_PLAYER');
    } catch (error) {
      console.log('Enrollment:', error);
    }
  };

  const handleLessonComplete = async (quizScore?: number, totalQuestions?: number) => {
    if (!activeLesson || !activeCourse) return;
    try {
      await dataService.completeLesson(activeLesson.id, quizScore);
      // Advance to next lesson or back to dashboard
      const currentIndex = activeCourse.lessons.findIndex(l => l.id === activeLesson.id);
      if (currentIndex < activeCourse.lessons.length - 1) {
        setActiveLesson(activeCourse.lessons[currentIndex + 1]);
      } else {
        setCurrentView('DASHBOARD');
      }
    } catch (err) {
      console.error('Failed to complete lesson:', err);
    }
  };

  // --- Main Render ---
  if (isLoading) {
    return (
      <div className="font-helvetica text-slate-50 min-h-screen flex items-center justify-center bg-[#0a0a0b]">
        <Loader2 className="animate-spin text-[#D4AF37]" size={48} />
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="font-helvetica text-slate-50 h-screen overflow-hidden">
        <LiquidBackground />

        {(currentView === 'DASHBOARD' || currentView === 'ADMIN') && (
          <Sidebar
            user={user}
            currentView={currentView}
            setCurrentView={setCurrentView}
            adminSection={adminSection}
            setAdminSection={setAdminSection}
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
            draggedCourseId={draggedCourseId}
            setUser={setUser}
          />
        )}

        <main className="h-screen overflow-hidden relative">
          <AnimatePresence mode="wait">
            {currentView === 'LANDING' && (
              <PageTransition viewKey="landing">
                <LandingView setCurrentView={setCurrentView} />
              </PageTransition>
            )}
            {currentView === 'AUTH' && (
              <PageTransition viewKey="auth">
                <AuthView setUser={setUser} setCurrentView={setCurrentView} />
              </PageTransition>
            )}
            {currentView === 'DASHBOARD' && (
              <PageTransition viewKey="dashboard">
                <DashboardView
                  user={user}
                  courses={courses}
                  userDashboardStats={userDashboardStats}
                  handleStartCourse={handleStartCourse}
                  mobileMenuOpen={mobileMenuOpen}
                  setMobileMenuOpen={setMobileMenuOpen}
                />
              </PageTransition>
            )}
            {currentView === 'COURSE_PLAYER' && (
              <PageTransition viewKey="player">
                <PlayerView
                  user={user}
                  activeCourse={activeCourse}
                  activeLesson={activeLesson}
                  setActiveLesson={setActiveLesson}
                  setCurrentView={setCurrentView}
                  handleLessonComplete={handleLessonComplete}
                  playerSidebarCollapsed={playerSidebarCollapsed}
                  setPlayerSidebarCollapsed={setPlayerSidebarCollapsed}
                />
              </PageTransition>
            )}
            {currentView === 'ADMIN' && (
              <PageTransition viewKey="admin">
                <AdminView
                  user={user}
                  courses={courses}
                  setCourses={setCourses}
                  adminSection={adminSection}
                  setAdminSection={setAdminSection}
                  draggedCourseId={draggedCourseId}
                  setDraggedCourseId={setDraggedCourseId}
                />
              </PageTransition>
            )}
          </AnimatePresence>
        </main>
      </div>
    </ToastProvider>
  );
};

export default App;