import Progress from '../models/Progress.js';
import Child from '../models/Child.js';
import logger from '../utils/logger.js';

const ALLOWED_FIELDS = ['academic', 'social', 'behavioral', 'overallScore', 'notes'];

const pickAllowed = (body) => {
  const out = {};
  for (const k of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, k)) out[k] = body[k];
  }
  return out;
};

const resolveChild = async (req, res) => {
  const childId = req.query.childId || req.body.childId;
  if (childId) {
    const child = await Child.findOne({ where: { id: childId, parentId: req.user.id } });
    if (!child) {
      res.status(404).json({ error: 'Child not found' });
      return null;
    }
    return child;
  }
  const children = await Child.findAll({ where: { parentId: req.user.id }, order: [['createdAt', 'ASC']] });
  if (children.length === 0) {
    res.status(404).json({ error: 'Child not found' });
    return null;
  }
  if (children.length > 1) {
    res.status(400).json({ error: 'childId query parameter is required when the parent has multiple children' });
    return null;
  }
  return children[0];
};

export const getProgress = async (req, res) => {
  try {
    const child = await resolveChild(req, res);
    if (!child) return;

    let progress = await Progress.findOne({
      where: { childId: child.id },
      include: [{ model: Child, as: 'child', attributes: ['id', 'firstName', 'lastName'] }],
    });

    if (!progress) {
      progress = await Progress.create({
        childId: child.id,
        academic: {},
        social: {},
        behavioral: {},
      });
    }

    res.json(progress);
  } catch (error) {
    logger.error('Get progress error', { error: error.message });
    res.status(500).json({ error: 'Failed to get progress' });
  }
};

export const updateProgress = async (req, res) => {
  try {
    const child = await resolveChild(req, res);
    if (!child) return;

    const fields = pickAllowed(req.body);
    let progress = await Progress.findOne({ where: { childId: child.id } });
    if (!progress) {
      progress = await Progress.create({ childId: child.id, ...fields });
    } else {
      await progress.update(fields);
    }

    const updated = await Progress.findByPk(progress.id, {
      include: [{ model: Child, as: 'child', attributes: ['id', 'firstName', 'lastName'] }],
    });
    res.json(updated);
  } catch (error) {
    logger.error('Update progress error', { error: error.message });
    res.status(500).json({ error: 'Failed to update progress' });
  }
};



