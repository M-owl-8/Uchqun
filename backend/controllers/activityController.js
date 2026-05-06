import { Op } from 'sequelize';
import Activity from '../models/Activity.js';
import Child from '../models/Child.js';
import User from '../models/User.js';
import { createNotification } from './notificationController.js';
import { emitToUser } from '../config/socket.js';
import { validateChildAccess } from '../utils/schoolValidation.js';

export const getActivities = async (req, res) => {
  try {
    const { type, limit, offset, date, childId } = req.query;
    const limitNum = limit ? parseInt(limit) : undefined;
    const offsetNum = offset ? parseInt(offset) : 0;

    const where = {};
    
    // If user is teacher, show only activities for children of assigned parents
    if (req.user.role === 'teacher') {
      // Get all parents assigned to this teacher
      const assignedParents = await User.findAll({
        where: { teacherId: req.user.id },
        attributes: ['id'],
      });
      
      if (assignedParents.length === 0) {
        return res.json([]);
      }
      
      const parentIds = assignedParents.map(p => p.id);
      
      // Get all children of assigned parents
      const children = await Child.findAll({
        where: { parentId: { [Op.in]: parentIds } },
        attributes: ['id'],
      });
      
      if (children.length === 0) {
        return res.json([]);
      }
      
      const childIds = children.map(c => c.id);
      
      if (childId) {
        // If childId is specified, verify it belongs to assigned parents
        if (!childIds.includes(childId)) {
          return res.status(403).json({ error: 'Access denied to this child' });
        }
        where.childId = childId;
      } else {
        // Show activities for all assigned children
        where.childId = { [Op.in]: childIds };
      }
    } else if (req.user.role === 'admin' || req.user.role === 'reception') {
      // Admin and reception can see all activities
      if (childId) {
        where.childId = childId;
      }
      // If no childId, show all activities
    } else {
      // For parents, show activities for all their children or filter by childId
      const children = await Child.findAll({
        where: { parentId: req.user.id },
        attributes: ['id'],
      });

      if (children.length === 0) {
        return res.json([]);
      }

      const childIds = children.map(c => c.id);
      
      if (childId) {
        // If childId is specified, verify it belongs to the parent
        if (!childIds.includes(childId)) {
          return res.status(403).json({ error: 'Access denied to this child' });
        }
        where.childId = childId;
      } else {
        // Show activities for all children
        where.childId = { [Op.in]: childIds };
      }
    }
    
    if (type) {
      where.type = type;
    }

    if (date) {
      where.date = date;
    }

    const activities = await Activity.findAll({
      where,
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit: limitNum,
      offset: offsetNum,
      include: [
        {
          model: Child,
          as: 'child',
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
    });

    // Convert to plain objects and handle JSONB fields
    const activitiesJson = activities.map(activity => {
      const activityJson = activity.toJSON ? activity.toJSON() : activity;
      
      // Ensure tasks is always an array
      if (activityJson.tasks && typeof activityJson.tasks === 'string') {
        try {
          activityJson.tasks = JSON.parse(activityJson.tasks);
        } catch {
          activityJson.tasks = [];
        }
      } else if (!activityJson.tasks) {
        activityJson.tasks = [];
      }
      
      // Ensure services is always an array
      if (activityJson.services && typeof activityJson.services === 'string') {
        try {
          activityJson.services = JSON.parse(activityJson.services);
        } catch {
          activityJson.services = [];
        }
      } else if (!activityJson.services) {
        activityJson.services = [];
      }
      
      return activityJson;
    });

    res.json(Array.isArray(activitiesJson) ? activitiesJson : []);
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ error: 'Failed to get activities' });
  }
};

export const getActivity = async (req, res) => {
  try {
    const { id } = req.params;

    const where = { id };
    
    // If user is teacher, only show activities for children of assigned parents
    if (req.user.role === 'teacher') {
      // Get all parents assigned to this teacher
      const assignedParents = await User.findAll({
        where: { teacherId: req.user.id },
        attributes: ['id'],
      });
      
      if (assignedParents.length === 0) {
        return res.status(404).json({ error: 'Activity not found' });
      }
      
      const parentIds = assignedParents.map(p => p.id);
      
      // Get all children of assigned parents
      const children = await Child.findAll({
        where: { parentId: { [Op.in]: parentIds } },
        attributes: ['id'],
      });
      
      if (children.length === 0) {
        return res.status(404).json({ error: 'Activity not found' });
      }
      
      const childIds = children.map(c => c.id);
      where.childId = { [Op.in]: childIds };
    } else if (req.user.role === 'admin' || req.user.role === 'reception') {
      // Admin and reception can see all activities - no filter needed
    } else {
      const child = await Child.findOne({
        where: { parentId: req.user.id },
      });

      if (!child) {
        return res.status(404).json({ error: 'Child not found' });
      }
      where.childId = child.id;
    }

    const activity = await Activity.findOne({
      where,
      include: [
        {
          model: Child,
          as: 'child',
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
    });

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json(activity);
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: 'Failed to get activity' });
  }
};

// Create activity (teachers only)
export const createActivity = async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin' && req.user.role !== 'reception') {
      return res.status(403).json({ error: 'Only teachers, admins, and reception can create activities' });
    }

    const {
      childId, teacher,
      skill, goal, startDate, endDate, tasks, methods, progress, observation, services
    } = req.body;

    if (!childId || !skill || !goal || !startDate || !endDate) {
      return res.status(400).json({ error: 'childId, skill, goal, startDate, and endDate are required' });
    }

    // Verify child exists and belongs to same school
    const child = await validateChildAccess(childId, req);
    if (!child) {
      return res.status(404).json({ error: 'Child not found or access denied' });
    }

    // Ensure tasks is an array
    const tasksArray = Array.isArray(tasks) ? tasks : (tasks ? [tasks] : []);
    
    // Ensure services is an array
    const servicesArray = Array.isArray(services) ? services : (services ? [services] : []);

    // Prepare activity data with all fields
    const activityData = {
      childId,
      // Use skill as title for backward compatibility
      title: skill || 'Individual Plan',
      description: goal || '',
      type: 'Learning',
      duration: 30,
      date: startDate || new Date().toISOString().split('T')[0],
      teacher: teacher || `${req.user.firstName} ${req.user.lastName}`,
      studentEngagement: 'Medium',
      notes: '',
      // Individual Plan fields
      skill: skill || null,
      goal: goal || null,
      startDate: startDate || null,
      endDate: endDate || null,
      tasks: tasksArray,
      methods: methods || null,
      progress: progress || null,
      observation: observation || null,
      services: servicesArray,
    };

    const activity = await Activity.create(activityData);

    // Convert to plain object, handling JSONB fields
    const activityJson = activity.toJSON ? activity.toJSON() : activity;
    
    // Ensure tasks is always an array
    if (activityJson.tasks && typeof activityJson.tasks === 'string') {
      try {
        activityJson.tasks = JSON.parse(activityJson.tasks);
      } catch {
        activityJson.tasks = [];
      }
    } else if (!activityJson.tasks) {
      activityJson.tasks = [];
    }
    
    // Ensure services is always an array
    if (activityJson.services && typeof activityJson.services === 'string') {
      try {
        activityJson.services = JSON.parse(activityJson.services);
      } catch {
        activityJson.services = [];
      }
    } else if (!activityJson.services) {
      activityJson.services = [];
    }
    
    // Add child info manually to avoid include issues
    activityJson.child = {
      id: child.id,
      firstName: child.firstName,
      lastName: child.lastName,
    };

    // Create notification for parent (async, don't wait)
    if (child.parentId) {
      createNotification(
        child.parentId,
        childId,
        'activity',
        'Yangi individual reja qo\'shildi',
        `${child.firstName} uchun "${skill || 'Individual reja'}" qo'shildi`,
        activity.id,
        'activity'
      ).catch(err => console.error('Error creating notification:', err));

      // Emit real-time update to parent
      emitToUser(child.parentId, 'activity:created', {
        activity: activityJson,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(201).json(activityJson);
  } catch (error) {
    console.error('Create activity error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.original?.code,
      constraint: error.original?.constraint,
    });
    
    // Check if it's a database column error
    if (error.message && (
      error.message.includes('column') || 
      error.message.includes('does not exist') ||
      error.original?.code === '42703' // PostgreSQL undefined column error
    )) {
      return res.status(500).json({ 
        error: 'Database migration required. Please ensure migrations have run successfully.',
        hint: 'The Individual Plan fields may not exist in the database. Check migration logs.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to create activity',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const ALLOWED_ACTIVITY_FIELDS = [
  'type', 'description', 'date', 'duration', 'tasks', 'services', 'notes', 'mood', 'image',
];

// Update activity (teacher / admin / reception of the same school)
export const updateActivity = async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin' && req.user.role !== 'reception') {
      return res.status(403).json({ error: 'Only teachers, admins, and reception can update activities' });
    }

    const { id } = req.params;
    const activity = await Activity.findByPk(id);

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    // Get child for ownership check + parent notification
    const child = await Child.findByPk(activity.childId);
    if (!child) {
      return res.status(404).json({ error: 'Activity child not found' });
    }
    if (req.user.schoolId && child.schoolId && child.schoolId !== req.user.schoolId) {
      return res.status(403).json({ error: 'Forbidden: cross-school update' });
    }

    const updateData = {};
    for (const k of ALLOWED_ACTIVITY_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(req.body, k)) updateData[k] = req.body[k];
    }
    if (updateData.services !== undefined) {
      updateData.services = Array.isArray(updateData.services)
        ? updateData.services
        : (updateData.services ? [updateData.services] : []);
    }

    await activity.update(updateData);

    const updatedActivity = await Activity.findByPk(id);

    // Convert to plain object, handling JSONB fields
    const activityJson = updatedActivity.toJSON ? updatedActivity.toJSON() : updatedActivity;
    
    // Ensure tasks is always an array
    if (activityJson.tasks && typeof activityJson.tasks === 'string') {
      try {
        activityJson.tasks = JSON.parse(activityJson.tasks);
      } catch {
        activityJson.tasks = [];
      }
    } else if (!activityJson.tasks) {
      activityJson.tasks = [];
    }
    
    // Ensure services is always an array
    if (activityJson.services && typeof activityJson.services === 'string') {
      try {
        activityJson.services = JSON.parse(activityJson.services);
      } catch {
        activityJson.services = [];
      }
    } else if (!activityJson.services) {
      activityJson.services = [];
    }

    // Emit real-time update to parent
    if (child && child.parentId) {
      emitToUser(child.parentId, 'activity:updated', {
        activity: activityJson,
        timestamp: new Date().toISOString(),
      });
    }

    res.json(activityJson);
  } catch (error) {
    console.error('Update activity error:', error);
    res.status(500).json({ error: 'Failed to update activity' });
  }
};

// Delete activity (teachers only)
export const deleteActivity = async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin' && req.user.role !== 'reception') {
      return res.status(403).json({ error: 'Only teachers, admins, and reception can delete activities' });
    }

    const { id } = req.params;
    const activity = await Activity.findByPk(id);

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    // Get child for parent notification before destroying
    const child = await Child.findByPk(activity.childId);
    const activityId = activity.id;

    await activity.destroy();

    // Emit real-time update to parent
    if (child && child.parentId) {
      emitToUser(child.parentId, 'activity:deleted', {
        activityId,
        childId: child.id,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true, message: 'Activity deleted successfully' });
  } catch (error) {
    console.error('Delete activity error:', error);
    res.status(500).json({ error: 'Failed to delete activity' });
  }
};

