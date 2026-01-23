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

  quiz?: QuizQuestion[];
  isCompleted?: boolean;

  // Progress tracking
  progressPercent?: number; // 0-100 for video/content progress
  quizScore?: number; // Quiz score percentage
  lastAccessedAt?: string; // ISO timestamp
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