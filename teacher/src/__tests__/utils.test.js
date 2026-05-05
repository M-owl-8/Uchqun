import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Utility logic extracted from the teacher app's service and UI patterns.
// ---------------------------------------------------------------------------

/**
 * getUnreadCount logic from teacher/src/shared/services/chatStore.js
 * Counts messages in a conversation that are unread for the given role.
 */
function getUnreadCount(messages, role = 'parent') {
  return messages.filter((m) => {
    if (role === 'parent') return m.senderRole !== 'parent' && !m.readByParent;
    return m.senderRole !== 'teacher' && !m.readByTeacher;
  }).length;
}

/**
 * Formats a display name from first/last name fields (used across profile pages).
 */
function formatDisplayName(firstName, lastName) {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.join(' ') || 'Unknown';
}

/**
 * Checks whether a media item is a video based on its MIME type or URL extension.
 */
function isVideoMedia(item) {
  if (item.type?.startsWith('video/')) return true;
  if (item.url?.match(/\.(mp4|mov|avi|mkv|webm)(\?|$)/i)) return true;
  return false;
}

/**
 * Truncates a message to a max character count, appending ellipsis if needed.
 */
function truncate(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
}

/**
 * Converts a date to a "time ago" label for the chat/activity feeds.
 * Returns one of: 'just now', 'N minutes ago', 'N hours ago', 'N days ago'.
 */
function timeAgo(date) {
  const now = Date.now();
  const ms = now - new Date(date).getTime();
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getUnreadCount', () => {
  const messages = [
    { id: 1, senderRole: 'teacher', readByParent: false, readByTeacher: true },
    { id: 2, senderRole: 'parent',  readByParent: true,  readByTeacher: false },
    { id: 3, senderRole: 'teacher', readByParent: true,  readByTeacher: true },
    { id: 4, senderRole: 'parent',  readByParent: false, readByTeacher: false },
  ];

  it('counts messages not sent by parent and unread by parent', () => {
    // Message 1 qualifies (teacher-sent, not readByParent)
    expect(getUnreadCount(messages, 'parent')).toBe(1);
  });

  it('counts messages not sent by teacher and unread by teacher', () => {
    // Messages 2 & 4 are from parent; message 2 has readByTeacher=false, message 4 has readByTeacher=false
    expect(getUnreadCount(messages, 'teacher')).toBe(2);
  });

  it('returns 0 when all messages are already read', () => {
    const allRead = [
      { senderRole: 'teacher', readByParent: true },
      { senderRole: 'parent',  readByTeacher: true },
    ];
    expect(getUnreadCount(allRead, 'parent')).toBe(0);
    expect(getUnreadCount(allRead, 'teacher')).toBe(0);
  });
});

describe('formatDisplayName', () => {
  it('joins first and last name with a space', () => {
    expect(formatDisplayName('Ali', 'Valiyev')).toBe('Ali Valiyev');
  });

  it('returns just the first name when last name is absent', () => {
    expect(formatDisplayName('Ali', '')).toBe('Ali');
  });

  it('returns "Unknown" when both parts are absent', () => {
    expect(formatDisplayName('', '')).toBe('Unknown');
    expect(formatDisplayName(null, undefined)).toBe('Unknown');
  });
});

describe('isVideoMedia', () => {
  it('detects video by MIME type', () => {
    expect(isVideoMedia({ type: 'video/mp4', url: '' })).toBe(true);
  });

  it('detects video by URL extension', () => {
    expect(isVideoMedia({ url: 'https://cdn.example.com/clip.mp4' })).toBe(true);
    expect(isVideoMedia({ url: 'https://cdn.example.com/clip.MOV' })).toBe(true);
  });

  it('returns false for image media', () => {
    expect(isVideoMedia({ type: 'image/jpeg', url: 'photo.jpg' })).toBe(false);
  });
});

describe('truncate', () => {
  it('returns the original string when within the limit', () => {
    expect(truncate('Hello', 10)).toBe('Hello');
  });

  it('truncates and appends ellipsis when over the limit', () => {
    const result = truncate('Hello, World!', 5);
    expect(result).toBe('Hello…');
    expect(result.length).toBe(6); // 5 chars + ellipsis char
  });

  it('returns an empty string for falsy input', () => {
    expect(truncate(null, 10)).toBe('');
    expect(truncate('', 10)).toBe('');
  });
});

describe('timeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for very recent events', () => {
    expect(timeAgo(new Date('2025-06-01T11:59:55Z'))).toBe('just now');
  });

  it('returns minutes ago', () => {
    expect(timeAgo(new Date('2025-06-01T11:55:00Z'))).toBe('5 minutes ago');
  });

  it('returns hours ago', () => {
    expect(timeAgo(new Date('2025-06-01T10:00:00Z'))).toBe('2 hours ago');
  });

  it('returns days ago', () => {
    expect(timeAgo(new Date('2025-05-29T12:00:00Z'))).toBe('3 days ago');
  });

  it('uses singular form for exactly 1 unit', () => {
    expect(timeAgo(new Date('2025-06-01T11:59:00Z'))).toBe('1 minute ago');
  });
});
