// refs #04-002 #08-001 — sidebar polled N chat APIs every 5 seconds; should call dedicated endpoint
import { describe, it, expect } from 'vitest';

// Verify the teacher Sidebar no longer imports getUnreadTotalForPrefix from chatStore
describe('#04-002 #08-001 teacher Sidebar uses unread-count endpoint', () => {
  it('Sidebar.jsx does not import getUnreadTotalForPrefix from chatStore', async () => {
    // Read the source and verify the problematic import is gone
    const src = await import('../../components/Sidebar?raw');
    expect(src.default).not.toContain('getUnreadTotalForPrefix');
    expect(src.default).not.toContain('chatStore');
  });

  it('Sidebar.jsx polls /chat/unread-count endpoint', async () => {
    const src = await import('../../components/Sidebar?raw');
    expect(src.default).toContain('/chat/unread-count');
  });

  // PP-IA-REDESIGN: parent Sidebar removed (legacy nav). Mobile uses MobileTabBar,
  // desktop uses DesktopTopNav. The 2 parent-Sidebar checks below are intentionally
  // dropped — the file no longer exists.
});
