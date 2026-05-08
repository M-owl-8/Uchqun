import User from '../models/User.js';

// Returns the groupId for a parent, or null if they are on the legacy path.
// All three parent data controllers (activity, meal, media) use the same
// branching logic: if groupId is set, query the modern Activity/Meal/Media
// models; otherwise fall back to the legacy ParentActivity/ParentMeal/ParentMedia.
export async function getParentGroupId(userId) {
  const parent = await User.findByPk(userId, { attributes: ['groupId'] });
  return parent?.groupId ?? null;
}
