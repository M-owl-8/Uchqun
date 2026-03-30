/**
 * Navigation type definitions for React Navigation 7.x
 */

export type ParentTabParamList = {
  Dashboard: undefined;
  Activities: undefined;
  Media: undefined;
  Profile: undefined;
  More: undefined;
};

export type ParentStackParamList = {
  ParentTabs: undefined;
  ChildProfile: { childId: string };
  ActivityDetail: { activityId: string };
  MealDetail: { mealId: string };
  MediaViewer: { mediaId: string };
  Chat: undefined;
  Notifications: undefined;
  Therapy: undefined;
  TherapyDetail: { therapyId: string };
  Payments: undefined;
  Settings: undefined;
  Help: undefined;
  AIWarnings: undefined;
  Diagnostics: undefined;
};

export type TeacherTabParamList = {
  Dashboard: undefined;
  Children: undefined;
  Activities: undefined;
  Media: undefined;
  Profile: undefined;
};

export type TeacherStackParamList = {
  TeacherTabs: undefined;
  ChildDetail: { childId: string };
  AddActivity: { childId?: string };
  AddMeal: { childId?: string };
  AddMedia: { childId?: string };
  Notifications: undefined;
  Settings: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Parent: undefined;
  Teacher: undefined;
  RoleSelection: undefined;
};
