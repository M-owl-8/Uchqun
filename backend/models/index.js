import sequelize from '../config/database.js';
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

// Initialize all models
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
  sequelize,
};

// Define model relationships
// User -> Document (One-to-Many: Reception can have multiple documents)
User.hasMany(Document, { foreignKey: 'userId', as: 'documents' });
Document.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User -> Document (reviewedBy relationship: Admin reviews documents)
User.hasMany(Document, { foreignKey: 'reviewedBy', as: 'reviewedDocuments' });
Document.belongsTo(User, { foreignKey: 'reviewedBy', as: 'reviewer' });

// User -> ParentActivity (One-to-Many: Parent has multiple activities)
User.hasMany(ParentActivity, { foreignKey: 'parentId', as: 'activities' });
ParentActivity.belongsTo(User, { foreignKey: 'parentId', as: 'parent' });

// User -> ParentMeal (One-to-Many: Parent has multiple meals)
User.hasMany(ParentMeal, { foreignKey: 'parentId', as: 'meals' });
ParentMeal.belongsTo(User, { foreignKey: 'parentId', as: 'parent' });

// User -> ParentMedia (One-to-Many: Parent has multiple media files)
User.hasMany(ParentMedia, { foreignKey: 'parentId', as: 'media' });
ParentMedia.belongsTo(User, { foreignKey: 'parentId', as: 'parent' });

// User -> TeacherResponsibility (One-to-Many: Teacher has multiple responsibilities)
User.hasMany(TeacherResponsibility, { foreignKey: 'teacherId', as: 'responsibilities' });
TeacherResponsibility.belongsTo(User, { foreignKey: 'teacherId', as: 'teacher' });

// User -> TeacherTask (One-to-Many: Teacher has multiple tasks)
User.hasMany(TeacherTask, { foreignKey: 'teacherId', as: 'tasks' });
TeacherTask.belongsTo(User, { foreignKey: 'teacherId', as: 'teacher' });

// User -> TeacherWorkHistory (One-to-Many: Teacher has multiple work history records)
User.hasMany(TeacherWorkHistory, { foreignKey: 'teacherId', as: 'workHistory' });
TeacherWorkHistory.belongsTo(User, { foreignKey: 'teacherId', as: 'teacher' });

// User -> User (teacher relationship: Parent belongs to a Teacher)
User.belongsTo(User, { foreignKey: 'teacherId', as: 'assignedTeacher' });
User.hasMany(User, { foreignKey: 'teacherId', as: 'assignedParents' });

// User -> Group (parent belongs to a group)
User.belongsTo(Group, { foreignKey: 'groupId', as: 'group' });
Group.hasMany(User, { foreignKey: 'groupId', as: 'parents' });

// User -> Notification (One-to-Many: User has multiple notifications)
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User -> Child (One-to-Many: Parent has multiple children)
User.hasMany(Child, { foreignKey: 'parentId', as: 'children' });
Child.belongsTo(User, { foreignKey: 'parentId', as: 'parent' });

// Child -> Notification (One-to-Many: Child has multiple notifications)
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

// Child -> School (child belongs to a school)
Child.belongsTo(School, { foreignKey: 'schoolId', as: 'childSchool' });
School.hasMany(Child, { foreignKey: 'schoolId', as: 'schoolChildren' });

// Child -> Group (child belongs to a group)
Child.belongsTo(Group, { foreignKey: 'groupId', as: 'childGroup' });
Group.hasMany(Child, { foreignKey: 'groupId', as: 'groupChildren' });

// Super Admin Messages
User.hasMany(SuperAdminMessage, { foreignKey: 'senderId', as: 'superAdminMessages' });
SuperAdminMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// Admin Registration Requests
User.hasMany(AdminRegistrationRequest, { foreignKey: 'reviewedBy', as: 'reviewedAdminRequests' });
AdminRegistrationRequest.belongsTo(User, { foreignKey: 'reviewedBy', as: 'reviewer' });
User.hasOne(AdminRegistrationRequest, { foreignKey: 'approvedUserId', as: 'adminRegistrationRequest' });
AdminRegistrationRequest.belongsTo(User, { foreignKey: 'approvedUserId', as: 'approvedUser' });

// Emotional Monitoring
Child.hasMany(EmotionalMonitoring, { foreignKey: 'childId', as: 'emotionalMonitoring' });
EmotionalMonitoring.belongsTo(Child, { foreignKey: 'childId', as: 'child' });
User.hasMany(EmotionalMonitoring, { foreignKey: 'teacherId', as: 'emotionalMonitoringRecords' });
EmotionalMonitoring.belongsTo(User, { foreignKey: 'teacherId', as: 'teacher' });

// Therapy relationships
User.hasMany(Therapy, { foreignKey: 'createdBy', as: 'createdTherapies' });
Therapy.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// Therapy Usage relationships
Therapy.hasMany(TherapyUsage, { foreignKey: 'therapyId', as: 'usages' });
TherapyUsage.belongsTo(Therapy, { foreignKey: 'therapyId', as: 'therapy' });
User.hasMany(TherapyUsage, { foreignKey: 'parentId', as: 'therapyUsages' });
TherapyUsage.belongsTo(User, { foreignKey: 'parentId', as: 'parent' });
User.hasMany(TherapyUsage, { foreignKey: 'teacherId', as: 'assignedTherapyUsages' });
TherapyUsage.belongsTo(User, { foreignKey: 'teacherId', as: 'teacher' });
Child.hasMany(TherapyUsage, { foreignKey: 'childId', as: 'therapyUsages' });
TherapyUsage.belongsTo(Child, { foreignKey: 'childId', as: 'child' });

// AI Warning relationships
School.hasMany(AIWarning, { foreignKey: 'schoolId', as: 'warnings' });
AIWarning.belongsTo(School, { foreignKey: 'schoolId', as: 'school' });
User.hasMany(AIWarning, { foreignKey: 'parentId', as: 'parentWarnings' });
AIWarning.belongsTo(User, { foreignKey: 'parentId', as: 'parent' });
User.hasMany(AIWarning, { foreignKey: 'resolvedBy', as: 'resolvedWarnings' });
AIWarning.belongsTo(User, { foreignKey: 'resolvedBy', as: 'resolver' });

// Push Notification relationships
User.hasMany(PushNotification, { foreignKey: 'userId', as: 'pushNotifications' });
PushNotification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Payment relationships
User.hasMany(Payment, { foreignKey: 'parentId', as: 'payments' });
Payment.belongsTo(User, { foreignKey: 'parentId', as: 'parent' });
Child.hasMany(Payment, { foreignKey: 'childId', as: 'payments' });
Payment.belongsTo(Child, { foreignKey: 'childId', as: 'child' });
School.hasMany(Payment, { foreignKey: 'schoolId', as: 'payments' });
Payment.belongsTo(School, { foreignKey: 'schoolId', as: 'school' });

// Government Stats relationships
School.hasMany(GovernmentStats, { foreignKey: 'schoolId', as: 'governmentStats' });
GovernmentStats.belongsTo(School, { foreignKey: 'schoolId', as: 'school' });
User.hasMany(GovernmentStats, { foreignKey: 'generatedBy', as: 'generatedStats' });
GovernmentStats.belongsTo(User, { foreignKey: 'generatedBy', as: 'generator' });

// Business Stats relationships
User.hasMany(BusinessStats, { foreignKey: 'businessId', as: 'businessStats' });
BusinessStats.belongsTo(User, { foreignKey: 'businessId', as: 'business' });

// Refresh Token relationships
User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Child Assessment relationships
Child.hasMany(ChildAssessment, { foreignKey: 'childId', as: 'assessments' });
ChildAssessment.belongsTo(Child, { foreignKey: 'childId', as: 'child' });
User.hasMany(ChildAssessment, { as: 'teacherAssessments', foreignKey: 'teacherId' });
ChildAssessment.belongsTo(User, { as: 'teacher', foreignKey: 'teacherId' });

// Service Plan relationships
Child.hasMany(ServicePlan, { foreignKey: 'childId', as: 'servicePlans' });
ServicePlan.belongsTo(Child, { foreignKey: 'childId', as: 'child' });
User.hasMany(ServicePlan, { foreignKey: 'createdBy', as: 'createdServicePlans' });
ServicePlan.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// Sync database (use with caution in production)
export const syncDatabase = async (force = false) => {
  try {
    // Test connection with retry logic
    let retries = 3;
    let connected = false;
    
    while (retries > 0 && !connected) {
      try {
        await sequelize.authenticate();
        console.log('Database connection established successfully.');
        connected = true;
      } catch (authError) {
        retries--;
        if (retries > 0) {
          console.log(`⚠ Database connection failed, retrying... (${3 - retries}/3)`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        } else {
          throw authError;
        }
      }
    }
    
    if (!connected) {
      throw new Error('Failed to connect to database after 3 retries');
    }
    
    await sequelize.sync({ force });
    console.log('Database synchronized successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error.message || error);
    
    // Provide helpful error messages
    if (error.message && error.message.includes('Connection terminated')) {
      console.error('\n💡 Tip: Make sure PostgreSQL server is running');
      console.error('   On Windows: Check if PostgreSQL service is running in Services');
      console.error('   Or try: net start postgresql-x64-XX (replace XX with version)');
    } else if (error.message && error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Tip: PostgreSQL server is not accepting connections');
      console.error('   Check if PostgreSQL is running on the correct host and port');
    } else if (error.message && error.message.includes('password authentication failed')) {
      console.error('\n💡 Tip: Database password is incorrect');
      console.error('   Check your .env file DB_PASSWORD setting');
    } else if (error.message && error.message.includes('database') && error.message.includes('does not exist')) {
      console.error('\n💡 Tip: Database does not exist');
      console.error('   Run: npm run create:db to create the database');
    }
    
    throw error;
  }
};

export default models;

// Named exports for convenience
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
  sequelize,
};
