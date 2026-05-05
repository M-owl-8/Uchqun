import sequelize from '../config/database.js';
import logger from '../utils/logger.js';
import User from './User.js';
import Document from './Document.js';
import ParentActivity from './ParentActivity.js';
import ParentMeal from './ParentMeal.js';
import ParentMedia from './ParentMedia.js';
import TeacherResponsibility from './TeacherResponsibility.js';
import TeacherTask from './TeacherTask.js';
import TeacherWorkHistory from './TeacherWorkHistory.js';
import Progress from './Progress.js';
import Group from './Group.js';
import Child from './Child.js';
import Activity from './Activity.js';
import Media from './Media.js';
import Meal from './Meal.js';
import Notification from './Notification.js';
import TeacherRating from './TeacherRating.js';
import ChatMessage from './ChatMessage.js';
import School from './School.js';
import SchoolRating from './SchoolRating.js';
import SuperAdminMessage from './SuperAdminMessage.js';
import AdminRegistrationRequest from './AdminRegistrationRequest.js';
import EmotionalMonitoring from './EmotionalMonitoring.js';
import Therapy from './Therapy.js';
import TherapyUsage from './TherapyUsage.js';
import AIWarning from './AIWarning.js';
import PushNotification from './PushNotification.js';
import Payment from './Payment.js';
import GovernmentStats from './GovernmentStats.js';
import BusinessStats from './BusinessStats.js';
import RefreshToken from './RefreshToken.js';
import ChildAssessment from './ChildAssessment.js';
import ServicePlan from './ServicePlan.js';
import MealPlan from './MealPlan.js';
import TeacherResource from './TeacherResource.js';
import ParentEvaluation from './ParentEvaluation.js';
import News from './News.js';

const models = {
  User,
  Document,
  ParentActivity,
  ParentMeal,
  ParentMedia,
  TeacherResponsibility,
  TeacherTask,
  TeacherWorkHistory,
  Progress,
  Group,
  Child,
  Activity,
  Media,
  Meal,
  Notification,
  TeacherRating,
  ChatMessage,
  School,
  SchoolRating,
  SuperAdminMessage,
  AdminRegistrationRequest,
  EmotionalMonitoring,
  Therapy,
  TherapyUsage,
  AIWarning,
  PushNotification,
  Payment,
  GovernmentStats,
  BusinessStats,
  RefreshToken,
  ChildAssessment,
  ServicePlan,
  MealPlan,
  TeacherResource,
  ParentEvaluation,
  News,
  sequelize,
};

// ─── Associations ─────────────────────────────────────────────────────────────

// ParentEvaluation
User.hasMany(ParentEvaluation, { foreignKey: 'parentId', as: 'parentEvaluations' });
ParentEvaluation.belongsTo(User, { foreignKey: 'parentId', as: 'parent' });
User.hasMany(ParentEvaluation, { foreignKey: 'teacherId', as: 'receivedEvaluations' });
ParentEvaluation.belongsTo(User, { foreignKey: 'teacherId', as: 'teacher' });

// User → Document
User.hasMany(Document, { foreignKey: 'userId', as: 'documents' });
Document.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Document, { foreignKey: 'reviewedBy', as: 'reviewedDocuments' });
Document.belongsTo(User, { foreignKey: 'reviewedBy', as: 'reviewer' });

// User → ParentActivity / ParentMeal / ParentMedia
User.hasMany(ParentActivity, { foreignKey: 'parentId', as: 'activities' });
ParentActivity.belongsTo(User, { foreignKey: 'parentId', as: 'parent' });
User.hasMany(ParentMeal, { foreignKey: 'parentId', as: 'meals' });
ParentMeal.belongsTo(User, { foreignKey: 'parentId', as: 'parent' });
User.hasMany(ParentMedia, { foreignKey: 'parentId', as: 'media' });
ParentMedia.belongsTo(User, { foreignKey: 'parentId', as: 'parent' });

// User → Teacher responsibilities, tasks, work history
User.hasMany(TeacherResponsibility, { foreignKey: 'teacherId', as: 'responsibilities' });
TeacherResponsibility.belongsTo(User, { foreignKey: 'teacherId', as: 'teacher' });
User.hasMany(TeacherTask, { foreignKey: 'teacherId', as: 'tasks' });
TeacherTask.belongsTo(User, { foreignKey: 'teacherId', as: 'teacher' });
User.hasMany(TeacherWorkHistory, { foreignKey: 'teacherId', as: 'workHistory' });
TeacherWorkHistory.belongsTo(User, { foreignKey: 'teacherId', as: 'teacher' });

// User → User (teacher–parent relationship)
User.belongsTo(User, { foreignKey: 'teacherId', as: 'assignedTeacher' });
User.hasMany(User, { foreignKey: 'teacherId', as: 'assignedParents' });

// User → Group
User.belongsTo(Group, { foreignKey: 'groupId', as: 'group' });
Group.hasMany(User, { foreignKey: 'groupId', as: 'parents' });

// User → Notification
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User → Child
User.hasMany(Child, { foreignKey: 'parentId', as: 'children' });
Child.belongsTo(User, { foreignKey: 'parentId', as: 'parent' });

// Child → Notification
Child.hasMany(Notification, { foreignKey: 'childId', as: 'notifications' });
Notification.belongsTo(Child, { foreignKey: 'childId', as: 'child' });

// Teacher ratings
User.hasMany(TeacherRating, { foreignKey: 'teacherId', as: 'receivedRatings' });
User.hasMany(TeacherRating, { foreignKey: 'parentId', as: 'givenRatings' });
TeacherRating.belongsTo(User, { foreignKey: 'teacherId', as: 'ratedTeacher' });
TeacherRating.belongsTo(User, { foreignKey: 'parentId', as: 'ratingParent' });

// Chat messages
User.hasMany(ChatMessage, { foreignKey: 'senderId', as: 'sentMessages' });
ChatMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// School ratings
School.hasMany(SchoolRating, { foreignKey: 'schoolId', as: 'ratings' });
SchoolRating.belongsTo(School, { foreignKey: 'schoolId', as: 'school' });
User.hasMany(SchoolRating, { foreignKey: 'parentId', as: 'schoolRatings' });
SchoolRating.belongsTo(User, { foreignKey: 'parentId', as: 'ratingParent' });

// Child → School / Group
Child.belongsTo(School, { foreignKey: 'schoolId', as: 'childSchool' });
School.hasMany(Child, { foreignKey: 'schoolId', as: 'schoolChildren' });
Child.belongsTo(Group, { foreignKey: 'groupId', as: 'childGroup' });
Group.hasMany(Child, { foreignKey: 'groupId', as: 'groupChildren' });

// SuperAdminMessage
User.hasMany(SuperAdminMessage, { foreignKey: 'senderId', as: 'superAdminMessages' });
SuperAdminMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// AdminRegistrationRequest
User.hasMany(AdminRegistrationRequest, { foreignKey: 'reviewedBy', as: 'reviewedAdminRequests' });
AdminRegistrationRequest.belongsTo(User, { foreignKey: 'reviewedBy', as: 'reviewer' });
User.hasOne(AdminRegistrationRequest, { foreignKey: 'approvedUserId', as: 'adminRegistrationRequest' });
AdminRegistrationRequest.belongsTo(User, { foreignKey: 'approvedUserId', as: 'approvedUser' });

// EmotionalMonitoring
Child.hasMany(EmotionalMonitoring, { foreignKey: 'childId', as: 'emotionalMonitoring' });
EmotionalMonitoring.belongsTo(Child, { foreignKey: 'childId', as: 'child' });
User.hasMany(EmotionalMonitoring, { foreignKey: 'teacherId', as: 'emotionalMonitoringRecords' });
EmotionalMonitoring.belongsTo(User, { foreignKey: 'teacherId', as: 'teacher' });

// Therapy
User.hasMany(Therapy, { foreignKey: 'createdBy', as: 'createdTherapies' });
Therapy.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Therapy.hasMany(TherapyUsage, { foreignKey: 'therapyId', as: 'usages' });
TherapyUsage.belongsTo(Therapy, { foreignKey: 'therapyId', as: 'therapy' });
User.hasMany(TherapyUsage, { foreignKey: 'parentId', as: 'therapyUsages' });
TherapyUsage.belongsTo(User, { foreignKey: 'parentId', as: 'parent' });
User.hasMany(TherapyUsage, { foreignKey: 'teacherId', as: 'assignedTherapyUsages' });
TherapyUsage.belongsTo(User, { foreignKey: 'teacherId', as: 'teacher' });
Child.hasMany(TherapyUsage, { foreignKey: 'childId', as: 'therapyUsages' });
TherapyUsage.belongsTo(Child, { foreignKey: 'childId', as: 'child' });

// AIWarning
School.hasMany(AIWarning, { foreignKey: 'schoolId', as: 'warnings' });
AIWarning.belongsTo(School, { foreignKey: 'schoolId', as: 'school' });
User.hasMany(AIWarning, { foreignKey: 'parentId', as: 'parentWarnings' });
AIWarning.belongsTo(User, { foreignKey: 'parentId', as: 'parent' });
User.hasMany(AIWarning, { foreignKey: 'resolvedBy', as: 'resolvedWarnings' });
AIWarning.belongsTo(User, { foreignKey: 'resolvedBy', as: 'resolver' });

// PushNotification
User.hasMany(PushNotification, { foreignKey: 'userId', as: 'pushNotifications' });
PushNotification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Payment
User.hasMany(Payment, { foreignKey: 'parentId', as: 'payments' });
Payment.belongsTo(User, { foreignKey: 'parentId', as: 'parent' });
Child.hasMany(Payment, { foreignKey: 'childId', as: 'payments' });
Payment.belongsTo(Child, { foreignKey: 'childId', as: 'child' });
School.hasMany(Payment, { foreignKey: 'schoolId', as: 'payments' });
Payment.belongsTo(School, { foreignKey: 'schoolId', as: 'school' });

// GovernmentStats
School.hasMany(GovernmentStats, { foreignKey: 'schoolId', as: 'governmentStats' });
GovernmentStats.belongsTo(School, { foreignKey: 'schoolId', as: 'school' });
User.hasMany(GovernmentStats, { foreignKey: 'generatedBy', as: 'generatedStats' });
GovernmentStats.belongsTo(User, { foreignKey: 'generatedBy', as: 'generator' });

// BusinessStats
User.hasMany(BusinessStats, { foreignKey: 'businessId', as: 'businessStats' });
BusinessStats.belongsTo(User, { foreignKey: 'businessId', as: 'business' });

// RefreshToken
User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ChildAssessment
Child.hasMany(ChildAssessment, { foreignKey: 'childId', as: 'assessments' });
ChildAssessment.belongsTo(Child, { foreignKey: 'childId', as: 'child' });
User.hasMany(ChildAssessment, { foreignKey: 'teacherId', as: 'teacherAssessments' });
ChildAssessment.belongsTo(User, { foreignKey: 'teacherId', as: 'teacher' });

// ServicePlan
Child.hasMany(ServicePlan, { foreignKey: 'childId', as: 'servicePlans' });
ServicePlan.belongsTo(Child, { foreignKey: 'childId', as: 'child' });
User.hasMany(ServicePlan, { foreignKey: 'createdBy', as: 'createdServicePlans' });
ServicePlan.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// MealPlan
Child.hasMany(MealPlan, { foreignKey: 'childId', as: 'mealPlans' });
MealPlan.belongsTo(Child, { foreignKey: 'childId', as: 'child' });
User.hasMany(MealPlan, { foreignKey: 'createdBy', as: 'createdMealPlans' });
MealPlan.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// TeacherResource
User.hasMany(TeacherResource, { foreignKey: 'teacherId', as: 'teacherResources' });
TeacherResource.belongsTo(User, { foreignKey: 'teacherId', as: 'teacher' });
School.hasMany(TeacherResource, { foreignKey: 'schoolId', as: 'teacherResources' });
TeacherResource.belongsTo(School, { foreignKey: 'schoolId', as: 'school' });

// News
User.hasMany(News, { foreignKey: 'createdById', as: 'newsCreated' });
News.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });

// ─── School-scoped named scopes ───────────────────────────────────────────────
Child.addScope('bySchool', (schoolId) => ({ where: { schoolId } }));
Activity.addScope('byChild', (childId) => ({ where: { childId } }));
Activity.addScope('bySchool', (schoolId) => ({
  include: [{ model: Child, as: 'child', where: { schoolId }, required: true, attributes: [] }],
}));
Meal.addScope('byChild', (childId) => ({ where: { childId } }));
Meal.addScope('bySchool', (schoolId) => ({
  include: [{ model: Child, as: 'child', where: { schoolId }, required: true, attributes: [] }],
}));
Media.addScope('byChild', (childId) => ({ where: { childId } }));
Media.addScope('bySchool', (schoolId) => ({
  include: [{ model: Child, as: 'child', where: { schoolId }, required: true, attributes: [] }],
}));

// ─── Database sync ─────────────────────────────────────────────────────────────
export const syncDatabase = async (force = false) => {
  try {
    let retries = 3;
    while (retries > 0) {
      try {
        await sequelize.authenticate();
        logger.info('Database connection established');
        break;
      } catch (authError) {
        retries--;
        if (retries === 0) throw authError;
        logger.warn(`Database connection failed, retrying... (${3 - retries}/3)`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
    await sequelize.sync({ force });
    logger.info('Database synchronized');
  } catch (error) {
    logger.error('Database sync failed', { error: error.message });
    throw error;
  }
};

export default models;

export {
  User,
  Document,
  ParentActivity,
  ParentMeal,
  ParentMedia,
  TeacherResponsibility,
  TeacherTask,
  TeacherWorkHistory,
  Progress,
  Group,
  Child,
  Activity,
  Media,
  Meal,
  Notification,
  TeacherRating,
  ChatMessage,
  School,
  SchoolRating,
  SuperAdminMessage,
  AdminRegistrationRequest,
  EmotionalMonitoring,
  Therapy,
  TherapyUsage,
  AIWarning,
  PushNotification,
  Payment,
  GovernmentStats,
  BusinessStats,
  RefreshToken,
  ChildAssessment,
  ServicePlan,
  MealPlan,
  TeacherResource,
  ParentEvaluation,
  News,
  sequelize,
};
