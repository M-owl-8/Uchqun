import { LucideIcon } from 'lucide-react';

export interface NavItem {
  id: string;
  icon: LucideIcon;
  label: string;
}

interface BottomNavProps {
  items: NavItem[];
  activeItem: string;
  onItemClick: (id: string) => void;
}

export function BottomNav({ items, activeItem, onItemClick }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="glass border-t border-[#BFD7EA]/20 px-2 py-2">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onItemClick(item.id)}
                className="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-300 group"
                style={{
                  minWidth: '56px',
                  minHeight: '56px',
                  backgroundColor: isActive ? 'rgba(46, 58, 89, 0.05)' : 'transparent',
                }}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <div
                  className="relative flex items-center justify-center transition-all duration-300"
                  style={{
                    width: '28px',
                    height: '28px',
                  }}
                >
                  <Icon
                    style={{ strokeWidth: 'var(--icon-stroke)' }}
                    size={28}
                    className={`transition-all duration-300 ${
                      isActive
                        ? 'text-[#2E3A59] scale-110'
                        : 'text-[#8C9BB5] group-hover:text-[#2E3A59]'
                    }`}
                  />
                  {isActive && (
                    <div
                      className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#E8C27E] animate-pulse-soft"
                    />
                  )}
                </div>

                <span
                  className={`text-xs font-medium transition-all duration-300 ${
                    isActive
                      ? 'text-[#2E3A59] font-semibold'
                      : 'text-[#8C9BB5] group-hover:text-[#2E3A59]'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
