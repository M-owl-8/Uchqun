/**
 * Core domain types for the Uchqun mobile app.
 * New code should import from here for type safety.
 */

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'reception' | 'teacher' | 'parent' | 'government' | 'business';
  phone?: string;
  avatar?: string;
  isActive: boolean;
  documentsApproved?: boolean;
  schoolId?: string;
  groupId?: string;
  teacherId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Child {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  parentId: string;
  schoolId?: string;
  groupId?: string;
  teacherId?: string;
  disabilityType?: string;
  photo?: string;
  emergencyContact?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  childId: string;
  title: string;
  description?: string;
  activityType: string;
  date: string;
  duration?: number;
  teacher?: string;
  tasks?: Record<string, unknown>[];
  services?: Record<string, unknown>[];
  createdAt: string;
  updatedAt: string;
}

export interface Meal {
  id: string;
  childId: string;
  mealType: string;
  description?: string;
  date: string;
  time?: string;
  portions?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Media {
  id: string;
  childId: string;
  activityId?: string;
  type: 'photo' | 'video';
  url: string;
  thumbnail?: string;
  title?: string;
  description?: string;
  caption?: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  parentId: string;
  childId?: string;
  schoolId?: string;
  amount: string;
  currency: string;
  paymentType: 'tuition' | 'therapy' | 'meal' | 'activity' | 'other';
  paymentMethod: 'card' | 'bank_transfer' | 'cash' | 'mobile_payment' | 'online' | 'other';
  paymentProvider?: string;
  transactionId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  description?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type?: string;
  isRead: boolean;
  childId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Therapy {
  id: string;
  name: string;
  description?: string;
  therapyType: string;
  ageGroup?: string;
  difficultyLevel?: string;
  duration?: number;
  instructions?: string;
  tags?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface LoginResponse extends AuthTokens {
  success: boolean;
  user: User;
}
