// Frontend-only data store using localStorage
// Compatible with existing backend data models

const STORAGE_KEYS = {
  PARENTS: 'uchqun_parents',
  TEACHERS: 'uchqun_teachers',
  ADMINS: 'uchqun_admins',
  CHILDREN: 'uchqun_children',
  GROUPS: 'uchqun_groups',
  SCHEDULES: 'uchqun_schedules',
  MEDIA: 'uchqun_media',
  ACTIVITIES: 'uchqun_activities',
  MEALS: 'uchqun_meals',
  MENUS: 'uchqun_menus',
  NEWS: 'uchqun_news',
  NOTIFICATIONS: 'uchqun_notifications',
  ATTENDANCE: 'uchqun_attendance',
  SYSTEM_SETTINGS: 'uchqun_system_settings',
};

// Initialize store
const initializeStore = () => {
  if (!localStorage.getItem(STORAGE_KEYS.PARENTS)) {
    localStorage.setItem(STORAGE_KEYS.PARENTS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.TEACHERS)) {
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ADMINS)) {
    localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CHILDREN)) {
    localStorage.setItem(STORAGE_KEYS.CHILDREN, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.GROUPS)) {
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SCHEDULES)) {
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.MEDIA)) {
    localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ACTIVITIES)) {
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.MEALS)) {
    localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.MENUS)) {
    localStorage.setItem(STORAGE_KEYS.MENUS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.NEWS)) {
    localStorage.setItem(STORAGE_KEYS.NEWS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ATTENDANCE)) {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SYSTEM_SETTINGS)) {
    localStorage.setItem(STORAGE_KEYS.SYSTEM_SETTINGS, JSON.stringify({
      theme: 'light',
      primaryColor: '#ea580c',
      logo: '',
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false,
      },
      twoFactorAuth: false,
    }));
  }
};

initializeStore();

const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

export const dataStore = {
  // ========== PARENTS ==========
  getParents: () => {
    const data = localStorage.getItem(STORAGE_KEYS.PARENTS);
    return data ? JSON.parse(data) : [];
  },
  createParent: (parentData) => {
    const parents = dataStore.getParents();
    const newParent = { ...parentData, id: generateId(), createdAt: new Date().toISOString(), role: 'parent' };
    parents.push(newParent);
    localStorage.setItem(STORAGE_KEYS.PARENTS, JSON.stringify(parents));
    return newParent;
  },
  updateParent: (id, parentData) => {
    const parents = dataStore.getParents();
    const index = parents.findIndex(p => p.id === id);
    if (index !== -1) {
      parents[index] = { ...parents[index], ...parentData, updatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.PARENTS, JSON.stringify(parents));
      return parents[index];
    }
    return null;
  },
  deleteParent: (id) => {
    const parents = dataStore.getParents();
    const filtered = parents.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PARENTS, JSON.stringify(filtered));
    return true;
  },

  // ========== TEACHERS ==========
  getTeachers: () => {
    const data = localStorage.getItem(STORAGE_KEYS.TEACHERS);
    return data ? JSON.parse(data) : [];
  },
  createTeacher: (teacherData) => {
    const teachers = dataStore.getTeachers();
    const newTeacher = { ...teacherData, id: generateId(), createdAt: new Date().toISOString(), role: 'teacher' };
    teachers.push(newTeacher);
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
    return newTeacher;
  },
  updateTeacher: (id, teacherData) => {
    const teachers = dataStore.getTeachers();
    const index = teachers.findIndex(t => t.id === id);
    if (index !== -1) {
      teachers[index] = { ...teachers[index], ...teacherData, updatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
      return teachers[index];
    }
    return null;
  },
  deleteTeacher: (id) => {
    const teachers = dataStore.getTeachers();
    const filtered = teachers.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(filtered));
    return true;
  },

  // ========== ADMINS ==========
  getAdmins: () => {
    const data = localStorage.getItem(STORAGE_KEYS.ADMINS);
    return data ? JSON.parse(data) : [];
  },
  createAdmin: (adminData) => {
    const admins = dataStore.getAdmins();
    const newAdmin = { ...adminData, id: generateId(), createdAt: new Date().toISOString(), role: 'admin' };
    admins.push(newAdmin);
    localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(admins));
    return newAdmin;
  },
  updateAdmin: (id, adminData) => {
    const admins = dataStore.getAdmins();
    const index = admins.findIndex(a => a.id === id);
    if (index !== -1) {
      admins[index] = { ...admins[index], ...adminData, updatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(admins));
      return admins[index];
    }
    return null;
  },
  deleteAdmin: (id) => {
    const admins = dataStore.getAdmins();
    const filtered = admins.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(filtered));
    return true;
  },

  // ========== CHILDREN ==========
  getChildren: () => {
    const data = localStorage.getItem(STORAGE_KEYS.CHILDREN);
    return data ? JSON.parse(data) : [];
  },
  createChild: (childData) => {
    const children = dataStore.getChildren();
    const newChild = { ...childData, id: generateId(), createdAt: new Date().toISOString() };
    children.push(newChild);
    localStorage.setItem(STORAGE_KEYS.CHILDREN, JSON.stringify(children));
    return newChild;
  },
  updateChild: (id, childData) => {
    const children = dataStore.getChildren();
    const index = children.findIndex(c => c.id === id);
    if (index !== -1) {
      children[index] = { ...children[index], ...childData, updatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.CHILDREN, JSON.stringify(children));
      return children[index];
    }
    return null;
  },
  deleteChild: (id) => {
    const children = dataStore.getChildren();
    const filtered = children.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CHILDREN, JSON.stringify(filtered));
    return true;
  },

  // ========== GROUPS ==========
  getGroups: () => {
    const data = localStorage.getItem(STORAGE_KEYS.GROUPS);
    return data ? JSON.parse(data) : [];
  },
  createGroup: (groupData) => {
    const groups = dataStore.getGroups();
    const newGroup = { ...groupData, id: generateId(), createdAt: new Date().toISOString() };
    groups.push(newGroup);
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
    return newGroup;
  },
  updateGroup: (id, groupData) => {
    const groups = dataStore.getGroups();
    const index = groups.findIndex(g => g.id === id);
    if (index !== -1) {
      groups[index] = { ...groups[index], ...groupData, updatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
      return groups[index];
    }
    return null;
  },
  deleteGroup: (id) => {
    const groups = dataStore.getGroups();
    const filtered = groups.filter(g => g.id !== id);
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(filtered));
    return true;
  },

  // ========== SCHEDULES ==========
  getSchedules: () => {
    const data = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
    return data ? JSON.parse(data) : [];
  },
  createSchedule: (scheduleData) => {
    const schedules = dataStore.getSchedules();
    const newSchedule = { ...scheduleData, id: generateId(), createdAt: new Date().toISOString() };
    schedules.push(newSchedule);
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
    return newSchedule;
  },
  updateSchedule: (id, scheduleData) => {
    const schedules = dataStore.getSchedules();
    const index = schedules.findIndex(s => s.id === id);
    if (index !== -1) {
      schedules[index] = { ...schedules[index], ...scheduleData, updatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
      return schedules[index];
    }
    return null;
  },
  deleteSchedule: (id) => {
    const schedules = dataStore.getSchedules();
    const filtered = schedules.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(filtered));
    return true;
  },

  // ========== MEDIA ==========
  getMedia: () => {
    const data = localStorage.getItem(STORAGE_KEYS.MEDIA);
    return data ? JSON.parse(data) : [];
  },
  createMedia: (mediaData) => {
    const media = dataStore.getMedia();
    const newMedia = { ...mediaData, id: generateId(), thumbnail: mediaData.thumbnail || mediaData.url, date: mediaData.date || new Date().toISOString(), createdAt: new Date().toISOString() };
    media.push(newMedia);
    localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(media));
    return newMedia;
  },
  updateMedia: (id, mediaData) => {
    const media = dataStore.getMedia();
    const index = media.findIndex(m => m.id === id);
    if (index !== -1) {
      media[index] = { ...media[index], ...mediaData, updatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(media));
      return media[index];
    }
    return null;
  },
  deleteMedia: (id) => {
    const media = dataStore.getMedia();
    const filtered = media.filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(filtered));
    return true;
  },

  // ========== ACTIVITIES ==========
  getActivities: () => {
    const data = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
    return data ? JSON.parse(data) : [];
  },
  createActivity: (activityData) => {
    const activities = dataStore.getActivities();
    const newActivity = { ...activityData, id: generateId(), date: activityData.date || new Date().toISOString(), createdAt: new Date().toISOString() };
    activities.push(newActivity);
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
    return newActivity;
  },
  updateActivity: (id, activityData) => {
    const activities = dataStore.getActivities();
    const index = activities.findIndex(a => a.id === id);
    if (index !== -1) {
      activities[index] = { ...activities[index], ...activityData, updatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
      return activities[index];
    }
    return null;
  },
  deleteActivity: (id) => {
    const activities = dataStore.getActivities();
    const filtered = activities.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(filtered));
    return true;
  },

  // ========== MEALS ==========
  getMeals: () => {
    const data = localStorage.getItem(STORAGE_KEYS.MEALS);
    return data ? JSON.parse(data) : [];
  },
  createMeal: (mealData) => {
    const meals = dataStore.getMeals();
    const newMeal = { ...mealData, id: generateId(), date: mealData.date || new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() };
    meals.push(newMeal);
    localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(meals));
    return newMeal;
  },
  updateMeal: (id, mealData) => {
    const meals = dataStore.getMeals();
    const index = meals.findIndex(m => m.id === id);
    if (index !== -1) {
      meals[index] = { ...meals[index], ...mealData, updatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(meals));
      return meals[index];
    }
    return null;
  },
  deleteMeal: (id) => {
    const meals = dataStore.getMeals();
    const filtered = meals.filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(filtered));
    return true;
  },

  // ========== MENUS ==========
  getMenus: () => {
    const data = localStorage.getItem(STORAGE_KEYS.MENUS);
    return data ? JSON.parse(data) : [];
  },
  createMenu: (menuData) => {
    const menus = dataStore.getMenus();
    const newMenu = { ...menuData, id: generateId(), createdAt: new Date().toISOString() };
    menus.push(newMenu);
    localStorage.setItem(STORAGE_KEYS.MENUS, JSON.stringify(menus));
    return newMenu;
  },
  updateMenu: (id, menuData) => {
    const menus = dataStore.getMenus();
    const index = menus.findIndex(m => m.id === id);
    if (index !== -1) {
      menus[index] = { ...menus[index], ...menuData, updatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.MENUS, JSON.stringify(menus));
      return menus[index];
    }
    return null;
  },
  deleteMenu: (id) => {
    const menus = dataStore.getMenus();
    const filtered = menus.filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MENUS, JSON.stringify(filtered));
    return true;
  },

  // ========== NEWS ==========
  getNews: () => {
    const data = localStorage.getItem(STORAGE_KEYS.NEWS);
    return data ? JSON.parse(data) : [];
  },
  createNews: (newsData) => {
    const news = dataStore.getNews();
    const newNews = { ...newsData, id: generateId(), createdAt: new Date().toISOString(), publishedAt: newsData.published ? new Date().toISOString() : null };
    news.push(newNews);
    localStorage.setItem(STORAGE_KEYS.NEWS, JSON.stringify(news));
    return newNews;
  },
  updateNews: (id, newsData) => {
    const news = dataStore.getNews();
    const index = news.findIndex(n => n.id === id);
    if (index !== -1) {
      const existing = news[index];
      news[index] = { ...existing, ...newsData, updatedAt: new Date().toISOString(), publishedAt: newsData.published && !existing.publishedAt ? new Date().toISOString() : existing.publishedAt };
      localStorage.setItem(STORAGE_KEYS.NEWS, JSON.stringify(news));
      return news[index];
    }
    return null;
  },
  deleteNews: (id) => {
    const news = dataStore.getNews();
    const filtered = news.filter(n => n.id !== id);
    localStorage.setItem(STORAGE_KEYS.NEWS, JSON.stringify(filtered));
    return true;
  },

  // ========== NOTIFICATIONS ==========
  getNotifications: () => {
    const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    return data ? JSON.parse(data) : [];
  },
  createNotification: (notificationData) => {
    const notifications = dataStore.getNotifications();
    const newNotification = { ...notificationData, id: generateId(), createdAt: new Date().toISOString(), sent: false };
    notifications.push(newNotification);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    return newNotification;
  },
  updateNotification: (id, notificationData) => {
    const notifications = dataStore.getNotifications();
    const index = notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      notifications[index] = { ...notifications[index], ...notificationData, updatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
      return notifications[index];
    }
    return null;
  },
  deleteNotification: (id) => {
    const notifications = dataStore.getNotifications();
    const filtered = notifications.filter(n => n.id !== id);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(filtered));
    return true;
  },

  // ========== ATTENDANCE ==========
  getAttendance: () => {
    const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    return data ? JSON.parse(data) : [];
  },
  createAttendance: (attendanceData) => {
    const attendance = dataStore.getAttendance();
    const newAttendance = { ...attendanceData, id: generateId(), createdAt: new Date().toISOString() };
    attendance.push(newAttendance);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
    return newAttendance;
  },
  updateAttendance: (id, attendanceData) => {
    const attendance = dataStore.getAttendance();
    const index = attendance.findIndex(a => a.id === id);
    if (index !== -1) {
      attendance[index] = { ...attendance[index], ...attendanceData, updatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
      return attendance[index];
    }
    return null;
  },
  deleteAttendance: (id) => {
    const attendance = dataStore.getAttendance();
    const filtered = attendance.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(filtered));
    return true;
  },

  // ========== SYSTEM SETTINGS ==========
  getSettings: () => {
    const data = localStorage.getItem(STORAGE_KEYS.SYSTEM_SETTINGS);
    return data ? JSON.parse(data) : {};
  },
  updateSettings: (settingsData) => {
    const current = dataStore.getSettings();
    const updated = { ...current, ...settingsData, updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEYS.SYSTEM_SETTINGS, JSON.stringify(updated));
    return updated;
  },
};
