import { Bell, Menu } from 'lucide-react';

interface HeaderProps {
  title: string;
  onMenuClick?: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 glass px-5 py-4 mb-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onMenuClick}
          className="flex items-center justify-center rounded-xl p-2 hover:bg-[#2E3A59]/5 active:bg-[#2E3A59]/10"
          style={{ minWidth: '48px', minHeight: '48px' }}
          aria-label="Menu"
        >
          <Menu style={{ strokeWidth: 'var(--icon-stroke)' }} size={24} className="text-[#2E3A59]" />
        </button>

        <h1 className="text-xl font-semibold text-[#2E3A59]">{title}</h1>

        <button
          className="flex items-center justify-center rounded-xl p-2 hover:bg-[#2E3A59]/5 active:bg-[#2E3A59]/10 relative"
          style={{ minWidth: '48px', minHeight: '48px' }}
          aria-label="Notifications"
        >
          <Bell style={{ strokeWidth: 'var(--icon-stroke)' }} size={24} className="text-[#2E3A59]" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-[#E8C27E] rounded-full animate-pulse-soft" />
        </button>
      </div>
    </header>
  );
}
