export enum UserRole {
  LEARNER = 'LEARNER',
  SUPERUSER = 'SUPERUSER',
  ADMIN = 'ADMIN'
}

export enum CourseStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export type ContentType = 'video' | 'text' | 'quiz' | 'pdf' | 'presentation';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // Index
  explanation?: string;
}

// Quiz result tracking
export interface QuizResult {
  score: number;
  totalQuestions: number;
  percentage: number;
  passed: boolean;
  passingScore: number;
}

export interface Lesson {
  id: string;
  title: string;
  type: ContentType;
  durationMin: number; // For video: length. For text/pdf: est. reading time
  videoUrl?: string;
  content?: string;

  // Document specific
  fileUrl?: string;
  fileName?: string;
  pageCount?: number; // For PDFs or Slides

  // Ordering
  orderIndex?: number;

  quiz?: QuizQuestion[];
  isCompleted?: boolean;

  // Progress tracking
  progressPercent?: number; // 0-100 for video/content progress
  quizScore?: number; // Quiz score percentage
  lastAccessedAt?: string; // ISO timestamp

  // Quiz pass/fail threshold
  passingScore?: number; // Minimum score to pass (default 70)
  passed?: boolean; // Whether user passed the quiz
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  totalDuration: string;
  lessons: Lesson[];
  progress: number; // 0-100
  status: CourseStatus;

  // Analytics
  enrolledCount?: number;
  avgCompletionTime?: number; // hours
  rating?: number;

  // Deadlines & Mandatory Training
  deadline?: string; // ISO timestamp for course completion deadline
  isMandatory?: boolean; // Whether this course is mandatory training
  isOverdue?: boolean; // Whether user is past deadline
  daysRemaining?: number; // Days until deadline (negative if overdue)

  // Learning Path Prerequisites
  prerequisiteCourseId?: string; // Course that must be completed first
  isLocked?: boolean; // Whether course is locked due to prerequisites
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  courseIds: string[];
  role: 'ALL' | 'SUPERUSER'; // Who allows this path
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  ministry: string;
  enrolledCourses: string[]; // Course IDs
  completedPaths: string[];
}

export interface AnalyticData {
  name: string;
  value: number;
}

// Ministry per-course breakdown
export interface MinistryCourseStat {
  ministry: string;
  courseId: string;
  courseTitle: string;
  enrolledCount: number;
  completedCount: number;
  avgScore: number;
  overdueCount: number;
}

// Enhanced ministry stats with per-course breakdown
export interface MinistryProgressData {
  name: string;
  totalLearners: number;
  activeLearners: number;
  coursesCompleted: number;
  overdueCount: number;
  avgCompletionRate: number;
  courseBreakdown?: MinistryCourseStat[];
}

// Admin dashboard stats
export interface AdminDashboardStats {
  totalLearners: number;
  totalCourses: number;
  totalLessons: number;
  totalEnrollments: number;
  completionRate: number;
  totalStudyHours: number;
  overdueEnrollments: number;
  averageQuizScore: number;
}

// Deadline tracking
export interface DeadlineInfo {
  deadline: string;
  daysRemaining: number;
  isOverdue: boolean;
  urgency: 'none' | 'low' | 'medium' | 'high' | 'overdue';
}