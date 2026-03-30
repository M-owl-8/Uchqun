import { Menu, Bell, Heart, Users, Utensils, Image, CheckCircle, List, User, Home as HomeIcon, Calendar } from 'lucide-react';

export function Home() {
  const stats = [
    { 
      icon: Users, 
      count: 2,
      label: 'Parents',
      color: 'var(--color-primary)',
      bgColor: 'var(--color-primary-light)',
      emoji: '👨‍👩‍👧'
    },
    { 
      icon: CheckCircle, 
      count: 5,
      label: 'Activities',
      color: 'var(--color-secondary)',
      bgColor: 'var(--color-secondary-light)',
      emoji: '🎯'
    },
    { 
      icon: Utensils, 
      count: 3,
      label: 'Meals',
      color: 'var(--color-coral)',
      bgColor: 'var(--color-coral-light)',
      emoji: '🍎'
    },
    { 
      icon: Image, 
      count: 12,
      label: 'Media',
      color: 'var(--color-mint)',
      bgColor: 'var(--color-mint-light)',
      emoji: '📸'
    },
  ];

  const quickActions = [
    { 
      icon: User, 
      label: 'Profile',
      color: 'var(--color-primary)',
      bgColor: 'var(--color-primary-light)'
    },
    { 
      icon: List, 
      label: 'Tasks',
      color: 'var(--color-secondary)',
      bgColor: 'var(--color-secondary-light)'
    },
    { 
      icon: CheckCircle, 
      label: 'Progress',
      color: 'var(--color-sunny)',
      bgColor: 'var(--color-sunny-light)'
    },
  ];

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Header */}
      <header className="px-5 pt-12 pb-6" style={{ 
        background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
      }}>
        <div className="flex items-center justify-between mb-6">
          <button 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
          >
            <Menu className="w-5 h-5 text-white" />
          </button>
          <button 
            className="w-10 h-10 rounded-xl flex items-center justify-center relative"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
          >
            <Bell className="w-5 h-5 text-white" />
            <span 
              className="absolute top-1 right-1 w-2 h-2 rounded-full"
              style={{ backgroundColor: 'var(--color-coral)' }}
            ></span>
          </button>
        </div>

        {/* Welcome Card */}
        <div className="rounded-3xl p-6" style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          boxShadow: 'var(--shadow-medium)'
        }}>
          <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            Welcome back
          </p>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Akbarjon Ilhamov
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-2xl">👋</span>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Let's have a great day together!
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-5 -mt-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="rounded-2xl p-5 relative overflow-hidden"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  boxShadow: 'var(--shadow-soft)',
                }}
              >
                {/* Background decoration */}
                <div 
                  className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-20"
                  style={{ backgroundColor: stat.color }}
                ></div>
                
                <div className="relative">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                    style={{ backgroundColor: stat.bgColor }}
                  >
                    <span className="text-2xl">{stat.emoji}</span>
                  </div>
                  <p className="text-3xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                    {stat.count}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {stat.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div 
          className="rounded-3xl p-6 mb-6"
          style={{
            backgroundColor: 'var(--color-surface)',
            boxShadow: 'var(--shadow-medium)',
          }}
        >
          <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            Quick Actions
          </h2>
          <div className="flex gap-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  className="flex-1 rounded-2xl p-4 flex flex-col items-center gap-2"
                  style={{ backgroundColor: action.bgColor }}
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'white' }}
                  >
                    <Icon className="w-6 h-6" style={{ color: action.color }} />
                  </div>
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Daily Tip */}
        <div 
          className="rounded-2xl p-5 flex items-start gap-4"
          style={{
            background: 'linear-gradient(135deg, var(--color-sunny-light) 0%, var(--color-coral-light) 100%)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <span className="text-3xl">💡</span>
          <div className="flex-1">
            <h3 className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
              Daily Tip
            </h3>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Remember to take breaks between activities for better focus!
            </p>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav 
        className="fixed bottom-0 left-0 right-0 px-6 py-4"
        style={{
          backgroundColor: 'var(--color-surface)',
          boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.08)',
        }}
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          <button className="flex flex-col items-center gap-1.5 min-w-[60px]">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <HomeIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
              Dashboard
            </span>
          </button>
          <button className="flex flex-col items-center gap-1.5 min-w-[60px]">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'transparent' }}
            >
              <Users className="w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
            </div>
            <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              Parents
            </span>
          </button>
          <button className="flex flex-col items-center gap-1.5 min-w-[60px]">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'transparent' }}
            >
              <CheckCircle className="w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
            </div>
            <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              Activities
            </span>
          </button>
          <button className="flex flex-col items-center gap-1.5 min-w-[60px]">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'transparent' }}
            >
              <Utensils className="w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
            </div>
            <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              Meals
            </span>
          </button>
          <button className="flex flex-col items-center gap-1.5 min-w-[60px]">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'transparent' }}
            >
              <Image className="w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
            </div>
            <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              Media
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}
