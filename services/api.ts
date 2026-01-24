const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Token management
let authToken: string | null = localStorage.getItem('token');

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
};

export const getAuthToken = () => authToken;

// Generic fetch wrapper
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

// ============================================
// AUTH API
// ============================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  ministry: string;
  role?: 'LEARNER' | 'SUPERUSER' | 'ADMIN';
}

export interface AuthResponse {
  message: string;
  status?: 'PENDING_APPROVAL';
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    ministry: string;
    avatarUrl?: string;
    isApproved?: boolean;
  };
  token?: string; // Optional because pending users don't get a token
}

export interface PendingUser {
  id: string;
  email: string;
  name: string;
  role: string;
  ministry: string;
  created_at: string;
}

export const authAPI = {
  login: (data: LoginRequest) =>
    fetchAPI<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  register: (data: RegisterRequest) =>
    fetchAPI<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: () => fetchAPI<{ user: AuthResponse['user'] }>('/auth/me'),

  updateProfile: (data: { name?: string; ministry?: string }) =>
    fetchAPI<{ message: string; user: AuthResponse['user'] }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    fetchAPI<{ message: string }>('/auth/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Admin: User Approval System
  getPendingUsers: () =>
    fetchAPI<{ pendingUsers: PendingUser[]; count: number }>('/auth/pending'),

  approveUser: (userId: string) =>
    fetchAPI<{ message: string; user: any }>(`/auth/approve/${userId}`, {
      method: 'POST',
    }),

  rejectUser: (userId: string, reason?: string) =>
    fetchAPI<{ message: string; userId: string }>(`/auth/reject/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Logout (clear token)
  logout: () => {
    setAuthToken(null);
    return Promise.resolve({ message: 'Logged out successfully' });
  },
};

// ============================================
// COURSES API
// ============================================

export interface Lesson {
  id: string;
  title: string;
  description?: string;
  type: 'video' | 'pdf' | 'presentation' | 'quiz' | 'text';
  durationMin: number;
  videoUrl?: string;
  fileUrl?: string;
  fileName?: string;
  pageCount?: number;
  content?: string;
  quiz?: QuizQuestion[];
  isCompleted?: boolean;
  quizScore?: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  totalDuration: string;
  enrolledCount: number;
  progress: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  lessons: Lesson[];
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  role: 'ALL' | 'SUPERUSER';
  courseIds: string[];
  courses?: Partial<Course>[];
}

// Helper to transform frontend course data to backend format
const transformCourseForBackend = (data: Partial<Course>) => {
  const transformed: Record<string, any> = {};
  if (data.title !== undefined) transformed.title = data.title;
  if (data.description !== undefined) transformed.description = data.description;
  if (data.level !== undefined) transformed.level = data.level;
  if (data.thumbnail !== undefined) transformed.thumbnailUrl = data.thumbnail;
  if (data.totalDuration !== undefined) transformed.totalDuration = data.totalDuration;
  return transformed;
};

export const coursesAPI = {
  getAll: () => fetchAPI<{ courses: Course[] }>('/courses'),

  getById: (id: string) => fetchAPI<{ course: Course }>(`/courses/${id}`),

  create: (data: Partial<Course>) =>
    fetchAPI<{ message: string; course: Course }>('/courses', {
      method: 'POST',
      body: JSON.stringify(transformCourseForBackend(data)),
    }),

  update: (id: string, data: Partial<Course>) =>
    fetchAPI<{ message: string; course: Course }>(`/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(transformCourseForBackend(data)),
    }),

  delete: (id: string) =>
    fetchAPI<{ message: string }>(`/courses/${id}`, { method: 'DELETE' }),

  // Lessons
  addLesson: (courseId: string, data: Partial<Lesson>) =>
    fetchAPI<{ message: string; lesson: Lesson }>(`/courses/${courseId}/lessons`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateLesson: (lessonId: string, data: Partial<Lesson>) =>
    fetchAPI<{ message: string; lesson: Lesson }>(`/courses/lessons/${lessonId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteLesson: (lessonId: string) =>
    fetchAPI<{ message: string }>(`/courses/lessons/${lessonId}`, { method: 'DELETE' }),

  // Quiz
  addQuizQuestion: (lessonId: string, data: Partial<QuizQuestion>) =>
    fetchAPI<{ message: string; question: QuizQuestion }>(`/courses/lessons/${lessonId}/quiz`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateQuizQuestion: (questionId: string, data: Partial<QuizQuestion>) =>
    fetchAPI<{ message: string; question: QuizQuestion }>(`/courses/quiz/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteQuizQuestion: (questionId: string) =>
    fetchAPI<{ message: string }>(`/courses/quiz/${questionId}`, { method: 'DELETE' }),
};

// ============================================
// LEARNING PATHS API
// ============================================

export const pathsAPI = {
  getAll: () => fetchAPI<{ paths: LearningPath[] }>('/paths'),

  getById: (id: string) => fetchAPI<{ path: LearningPath }>(`/paths/${id}`),

  create: (data: Partial<LearningPath>) =>
    fetchAPI<{ message: string; path: LearningPath }>('/paths', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<LearningPath>) =>
    fetchAPI<{ message: string; path: LearningPath }>(`/paths/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchAPI<{ message: string }>(`/paths/${id}`, { method: 'DELETE' }),

  addCourse: (pathId: string, courseId: string, orderIndex?: number) =>
    fetchAPI<{ message: string }>(`/paths/${pathId}/courses`, {
      method: 'POST',
      body: JSON.stringify({ courseId, orderIndex }),
    }),

  removeCourse: (pathId: string, courseId: string) =>
    fetchAPI<{ message: string }>(`/paths/${pathId}/courses/${courseId}`, {
      method: 'DELETE',
    }),
};

// ============================================
// PROGRESS API
// ============================================

export interface DashboardStats {
  stats: {
    enrolledCourses: number;
    completedCourses: number;
    lessonsCompleted: number;
    averageQuizScore: number;
  };
  currentCourses: Array<{
    id: string;
    title: string;
    thumbnail_url: string;
    progress: number;
  }>;
}

export const progressAPI = {
  getDashboard: () => fetchAPI<DashboardStats>('/progress/dashboard'),

  enrollInCourse: (courseId: string) =>
    fetchAPI<{ message: string }>(`/progress/enroll/${courseId}`, { method: 'POST' }),

  getCourseProgress: (courseId: string) =>
    fetchAPI<{ courseProgress: number; lessons: any[] }>(`/progress/course/${courseId}`),

  updateLessonProgress: (lessonId: string, data: { status?: string; progressPercent?: number; quizScore?: number }) =>
    fetchAPI<{ message: string; progress: any; courseProgress: number }>(`/progress/lesson/${lessonId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  completeLesson: (lessonId: string, quizScore?: number) =>
    fetchAPI<{ message: string; courseProgress: number }>(`/progress/lesson/${lessonId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ quizScore }),
    }),
};

// ============================================
// ADMIN API
// ============================================

export interface AdminStats {
  stats: {
    totalLearners: number;
    totalCourses: number;
    totalLessons: number;
    totalEnrollments: number;
    completionRate: number;
    totalStudyHours: number;
  };
}

export interface MinistryStats {
  ministryStats: Array<{
    name: string;
    totalLearners: number;
    activeLearners: number;
    coursesCompleted: number;
    value: number;
  }>;
}

export const adminAPI = {
  getStats: () => fetchAPI<AdminStats>('/admin/stats'),

  getMinistryStats: () => fetchAPI<MinistryStats>('/admin/ministry-stats'),

  getContentStats: () =>
    fetchAPI<{ contentStats: Array<{ name: string; value: number; count: number }> }>('/admin/content-stats'),

  getActivity: (limit = 20) =>
    fetchAPI<{ activity: any[] }>(`/admin/activity?limit=${limit}`),

  getUsers: (params?: { page?: number; limit?: number; search?: string; role?: string; ministry?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchAPI<{ users: any[]; pagination: any }>(`/admin/users?${query}`);
  },

  updateUser: (userId: string, data: { role?: string; isActive?: boolean }) =>
    fetchAPI<{ message: string; user: any }>(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getCoursesWithStats: () =>
    fetchAPI<{ courses: any[] }>('/admin/courses'),
};

// ============================================
// UPLOAD API
// ============================================

export const uploadAPI = {
  uploadFile: async (
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{ message: string; file: { originalName: string; fileName: string; fileUrl: string; mimeType: string; size: number } }> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();

      // Progress tracking
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            reject(new Error(data.error || 'Upload failed'));
          }
        } catch {
          reject(new Error('Invalid server response'));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timed out'));
      });

      xhr.open('POST', `${API_BASE_URL}/upload/single`);
      xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
      xhr.timeout = 600000; // 10 minute timeout for large files
      xhr.send(formData);
    });
  },

  uploadMultiple: async (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    const response = await fetch(`${API_BASE_URL}/upload/multiple`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  },

  deleteFile: (fileName: string, folder: string) =>
    fetchAPI<{ message: string }>('/upload/file', {
      method: 'DELETE',
      body: JSON.stringify({ fileName, folder }),
    }),

  getStats: () => fetchAPI<{ stats: any; total: any }>('/upload/stats'),
};

// Export combined API
export const api = {
  auth: authAPI,
  courses: coursesAPI,
  paths: pathsAPI,
  progress: progressAPI,
  admin: adminAPI,
  upload: uploadAPI,
};

export default api;
