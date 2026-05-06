import User from '../models/User.js';
import Child from '../models/Child.js';
import Group from '../models/Group.js';
import TeacherResponsibility from '../models/TeacherResponsibility.js';
import TeacherTask from '../models/TeacherTask.js';
import TeacherWorkHistory from '../models/TeacherWorkHistory.js';
import SuperAdminMessage from '../models/SuperAdminMessage.js';
import logger from '../utils/logger.js';
import { Op } from 'sequelize';

/**
 * Teacher Controller
 * Handles Teacher-specific operations:
 * - View assigned responsibilities
 * - View tasks performed
 * - View deadlines and work history
 * - View parent accounts (read-only)
 */

/**
 * Get teacher profile with all data
 * GET /api/teacher/profile
 * 
 * Business Logic:
 * - Teacher profile must display:
 *   - Assigned responsibilities
 *   - Tasks performed
 *   - Deadlines and work history
 */
export const getMyProfile = async (req, res) => {
  try {
    const teacher = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
    });

    const [responsibilities, tasks, workHistory] = await Promise.all([
      TeacherResponsibility.findAll({
        where: { teacherId: req.user.id },
        order: [['assignedDate', 'DESC']],
      }),
      TeacherTask.findAll({
        where: { teacherId: req.user.id },
        order: [['taskDate', 'DESC']],
      }),
      TeacherWorkHistory.findAll({
        where: { teacherId: req.user.id },
        order: [['workDate', 'DESC']],
      }),
    ]);

    res.json({
      success: true,
      data: {
        teacher: teacher.toJSON(),
        responsibilities,
        tasks,
        workHistory,
      },
    });
  } catch (error) {
    logger.error('Get teacher profile error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch teacher profile' });
  }
};

/**
 * Get assigned responsibilities
 * GET /api/teacher/responsibilities
 */
export const getMyResponsibilities = async (req, res) => {
  try {
    const { status, priority } = req.query;

    const where = { teacherId: req.user.id };
    
    if (status) {
      where.status = status;
    }
    
    if (priority) {
      where.priority = priority;
    }

    const responsibilities = await TeacherResponsibility.findAll({
      where,
      order: [['assignedDate', 'DESC']],
    });

    res.json({
      success: true,
      data: responsibilities,
    });
  } catch (error) {
    logger.error('Get responsibilities error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch responsibilities' });
  }
};

/**
 * Get a specific responsibility
 * GET /api/teacher/responsibilities/:id
 */
export const getResponsibilityById = async (req, res) => {
  try {
    const { id } = req.params;

    const responsibility = await TeacherResponsibility.findOne({
      where: { id, teacherId: req.user.id },
    });

    if (!responsibility) {
      return res.status(404).json({ error: 'Responsibility not found' });
    }

    res.json({
      success: true,
      data: responsibility,
    });
  } catch (error) {
    logger.error('Get responsibility by id error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch responsibility' });
  }
};

/**
 * Get tasks performed
 * GET /api/teacher/tasks
 */
export const getMyTasks = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;

    const where = { teacherId: req.user.id };
    
    if (status) {
      where.status = status;
    }
    
    if (startDate || endDate) {
      where.taskDate = {};
      if (startDate) where.taskDate[Op.gte] = new Date(startDate);
      if (endDate) where.taskDate[Op.lte] = new Date(endDate);
    }

    const tasks = await TeacherTask.findAll({
      where,
      order: [['taskDate', 'DESC']],
    });

    res.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    logger.error('Get tasks error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

/**
 * Get a specific task
 * GET /api/teacher/tasks/:id
 */
export const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await TeacherTask.findOne({
      where: { id, teacherId: req.user.id },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    logger.error('Get task by id error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch task' });
  }
};

/**
 * Update task status
 * PUT /api/teacher/tasks/:id/status
 */
export const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const task = await TeacherTask.findOne({
      where: { id, teacherId: req.user.id },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    task.status = status;
    if (notes) task.notes = notes;
    if (status === 'completed') {
      task.completedAt = new Date();
    }
    await task.save();

    logger.info('Task status updated', {
      taskId: task.id,
      teacherId: req.user.id,
      status,
    });

    res.json({
      success: true,
      message: 'Task status updated successfully',
      data: task,
    });
  } catch (error) {
    logger.error('Update task status error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to update task status' });
  }
};

/**
 * Get work history with deadlines
 * GET /api/teacher/work-history
 */
export const getMyWorkHistory = async (req, res) => {
  try {
    const { status, workType, startDate, endDate } = req.query;

    const where = { teacherId: req.user.id };
    
    if (status) {
      where.status = status;
    }
    
    if (workType) {
      where.workType = workType;
    }
    
    if (startDate || endDate) {
      where.workDate = {};
      if (startDate) where.workDate[Op.gte] = new Date(startDate);
      if (endDate) where.workDate[Op.lte] = new Date(endDate);
    }

    const workHistory = await TeacherWorkHistory.findAll({
      where,
      order: [['workDate', 'DESC']],
    });

    // Separate items by deadline status
    const now = new Date();
    const upcoming = workHistory.filter(item => 
      item.deadline && new Date(item.deadline) > now && item.status !== 'completed'
    );
    const overdue = workHistory.filter(item => 
      item.deadline && new Date(item.deadline) < now && item.status !== 'completed'
    );
    const completed = workHistory.filter(item => item.status === 'completed');

    res.json({
      success: true,
      data: workHistory,
      summary: {
        total: workHistory.length,
        upcoming: upcoming.length,
        overdue: overdue.length,
        completed: completed.length,
      },
    });
  } catch (error) {
    logger.error('Get work history error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch work history' });
  }
};

/**
 * Get a specific work history item
 * GET /api/teacher/work-history/:id
 */
export const getWorkHistoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const workHistory = await TeacherWorkHistory.findOne({
      where: { id, teacherId: req.user.id },
    });

    if (!workHistory) {
      return res.status(404).json({ error: 'Work history item not found' });
    }

    res.json({
      success: true,
      data: workHistory,
    });
  } catch (error) {
    logger.error('Get work history by id error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch work history item' });
  }
};

/**
 * Update work history status
 * PUT /api/teacher/work-history/:id/status
 */
export const updateWorkHistoryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['pending', 'in_progress', 'completed', 'overdue', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const workHistory = await TeacherWorkHistory.findOne({
      where: { id, teacherId: req.user.id },
    });

    if (!workHistory) {
      return res.status(404).json({ error: 'Work history item not found' });
    }

    workHistory.status = status;
    if (notes) workHistory.notes = notes;
    if (status === 'completed') {
      workHistory.completedAt = new Date();
    }
    await workHistory.save();

    logger.info('Work history status updated', {
      workHistoryId: workHistory.id,
      teacherId: req.user.id,
      status,
    });

    res.json({
      success: true,
      message: 'Work history status updated successfully',
      data: workHistory,
    });
  } catch (error) {
    logger.error('Update work history status error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to update work history status' });
  }
};

/**
 * Get dashboard summary
 * GET /api/teacher/dashboard
 */
export const getDashboard = async (req, res) => {
  try {
    const [responsibilitiesCount, tasksCount, workHistoryCount] = await Promise.all([
      TeacherResponsibility.count({
        where: { teacherId: req.user.id, status: 'active' },
      }),
      TeacherTask.count({
        where: { teacherId: req.user.id, status: { [Op.in]: ['pending', 'in_progress'] } },
      }),
      TeacherWorkHistory.count({
        where: { 
          teacherId: req.user.id, 
          status: { [Op.in]: ['pending', 'in_progress'] },
          deadline: { [Op.lte]: new Date() },
        },
      }),
    ]);

    const upcomingDeadlines = await TeacherWorkHistory.findAll({
      where: {
        teacherId: req.user.id,
        status: { [Op.in]: ['pending', 'in_progress'] },
        deadline: { [Op.gte]: new Date() },
      },
      order: [['deadline', 'ASC']],
      limit: 5,
    });

    res.json({
      success: true,
      data: {
        summary: {
          activeResponsibilities: responsibilitiesCount,
          pendingTasks: tasksCount,
          overdueWork: workHistoryCount,
        },
        upcomingDeadlines,
      },
    });
  } catch (error) {
    logger.error('Get dashboard error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

/**
 * Get all Parents
 * GET /api/teacher/parents
 *
 * Business Logic:
 * - Teachers see parents from ALL their groups combined
 * - Admin can see all parents
 */
export const getParents = async (req, res) => {
  try {
    const { search, limit = 100, offset = 0 } = req.query;

    const where = { role: 'parent' };

    // Admin / Reception scoped to their own school
    if (req.user.role === 'admin' || req.user.role === 'reception') {
      if (req.user.schoolId) where.schoolId = req.user.schoolId;
    }

    // If user is a teacher, show parents from all their groups
    if (req.user.role === 'teacher') {
      // Get all groups assigned to this teacher
      const teacherGroups = await Group.findAll({
        where: { teacherId: req.user.id },
        attributes: ['id'],
      });
      const groupIds = teacherGroups.map(g => g.id);

      if (groupIds.length > 0) {
        // Filter by groupId (parents assigned to teacher's groups)
        // OR by direct teacherId assignment (legacy support)
        where[Op.or] = [
          { groupId: { [Op.in]: groupIds } },
          { teacherId: req.user.id },
        ];
      } else {
        // Fallback to direct teacherId if no groups
        where.teacherId = req.user.id;
      }
    }
    // Admin and Reception can see all parents (no filter needed)

    if (search) {
      const searchCondition = {
        [Op.or]: [
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { phone: { [Op.iLike]: `%${search}%` } },
        ],
      };

      // Combine role/group filter with search
      if (where[Op.or]) {
        where[Op.and] = [{ [Op.or]: where[Op.or] }, searchCondition];
        delete where[Op.or];
      } else {
        Object.assign(where, searchCondition);
      }
    }

    const { count, rows: parents } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Child,
          as: 'children',
          attributes: ['id', 'firstName', 'lastName', 'dateOfBirth', 'gender', 'disabilityType', 'school', 'class', 'teacher'],
          required: false,
        },
        {
          model: Group,
          as: 'group',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      parents: parents.map(p => p.toJSON()),
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    logger.error('Get parents error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch parents' });
  }
};

/**
 * Get a single parent by ID
 * GET /api/teacher/parents/:id
 */
export const getParentById = async (req, res) => {
  try {
    const { id } = req.params;

    // School-scoped: teacher can only see parents from same school
    const where = { id, role: 'parent' };
    if (req.user.schoolId) {
      where.schoolId = req.user.schoolId;
    }

    const parent = await User.findOne({
      where,
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Child,
          as: 'children',
          attributes: ['id', 'firstName', 'lastName', 'dateOfBirth', 'gender', 'disabilityType', 'school', 'class', 'teacher'],
          required: false,
        },
      ],
    });

    if (!parent) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    res.json({
      success: true,
      data: parent.toJSON(),
    });
  } catch (error) {
    logger.error('Get parent by id error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch parent' });
  }
};

/**
 * Get teacher's messages to super-admin
 * GET /api/teacher/messages
 *
 * Business Logic:
 * - Teacher can view their own messages sent to super-admin
 * - Includes replies from super-admin
 */
export const getMyMessages = async (req, res) => {
  try {
    const messages = await SuperAdminMessage.findAll({
      where: { senderId: req.user.id },
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: messages.map(m => m.toJSON()),
    });
  } catch (error) {
    logger.error('Get my messages error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

/**
 * Get teacher's groups
 * GET /api/teacher/groups
 *
 * Business Logic:
 * - Teacher can view all groups they are responsible for
 * - Includes group details and parent count
 */
export const getMyGroups = async (req, res) => {
  try {
    const groups = await Group.findAll({
      where: { teacherId: req.user.id },
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
      order: [['name', 'ASC']],
    });

    // Get parent count for each group
    const groupsWithCounts = await Promise.all(
      groups.map(async (group) => {
        const parentCount = await User.count({
          where: {
            role: 'parent',
            groupId: group.id,
          },
        });
        return {
          ...group.toJSON(),
          parentCount,
        };
      })
    );

    res.json({
      success: true,
      data: groupsWithCounts,
    });
  } catch (error) {
    logger.error('Get my groups error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
};

/**
 * Get teacher ratings (global leaderboard)
 * GET /api/teacher/ratings
 *
 * Business Logic:
 * - Shows all teachers with their ratings
 * - Sorted by rating descending
 * - Current teacher's position is highlighted in frontend
 */
export const getTeacherRatings = async (req, res) => {
  try {
    // School-scoped: only show teachers from same school
    const where = { role: 'teacher' };
    if (req.user.schoolId) {
      where.schoolId = req.user.schoolId;
    }

    const teachers = await User.findAll({
      where,
      attributes: ['id', 'firstName', 'lastName', 'email', 'avatar', 'rating', 'totalRatings'],
      order: [
        ['rating', 'DESC'],
        ['totalRatings', 'DESC'],
        ['firstName', 'ASC'],
      ],
    });

    // Add rank to each teacher
    const teachersWithRank = teachers.map((teacher, index) => ({
      ...teacher.toJSON(),
      rank: index + 1,
    }));

    res.json({
      success: true,
      data: teachersWithRank,
    });
  } catch (error) {
    logger.error('Get teacher ratings error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch teacher ratings' });
  }
};

/**
 * AI Chat for teachers
 * POST /api/teacher/ai/chat
 *
 * Business Logic:
 * - Provides AI assistance for teachers
 * - Uses OpenAI/OpenRouter API
 */
export const getAIAdvice = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Determine language
    const requestedLang = (req.body?.lang || '').toLowerCase();
    const acceptLanguage = req.headers['accept-language'] || '';
    const langCode = (requestedLang || acceptLanguage.split(',')[0]?.split('-')[0] || 'en').toLowerCase();
    const languageName = {
      uz: 'Uzbek',
      ru: 'Russian',
      en: 'English',
    }[langCode] || 'English';

    // System prompt for teachers
    const systemPrompt = `You are a helpful AI assistant specialized in supporting teachers who work with children with special needs and disabilities.
You provide practical, empathetic, and evidence-based advice about:
- Teaching strategies for children with special needs
- Classroom management techniques
- Individual education plans (IEPs)
- Communication with parents
- Activity planning and adaptation
- Behavioral support strategies
- Progress tracking and assessment
- Self-care and teacher wellbeing

Always respond in a warm, supportive, and professional manner.
Keep responses concise (2-4 sentences) in ${languageName}. If ${languageName} is Russian, respond in Cyrillic Russian. If ${languageName} is Uzbek, respond in Uzbek. Never answer in English unless ${languageName} is English.`;

    const userPrompt = `Teacher: ${req.user.firstName} ${req.user.lastName}

Question: ${message.trim()}

Please provide helpful, practical advice.`;

    // Build chat history
    const incomingMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const sanitizedHistory = incomingMessages
      .filter(m => m && m.role && m.content)
      .slice(-8)
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content).slice(0, 4000),
      }));

    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...(sanitizedHistory.length ? sanitizedHistory : [{ role: 'user', content: userPrompt }]),
    ];

    // Use OpenAI/OpenRouter API
    const hasOpenAIKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0;

    if (!hasOpenAIKey) {
      return res.status(503).json({ error: 'AI service is not configured' });
    }

    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    });

    const chatCompletion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: openaiMessages,
      max_tokens: 300,
      temperature: 0.7,
    });

    const aiMessage = chatCompletion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    res.json({
      success: true,
      response: aiMessage,
      usage: chatCompletion.usage,
    });

  } catch (error) {
    logger.error('Teacher AI chat error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to get AI response' });
  }
};

