import { Sparkles, Heart, Music, BookOpen, Palette, Users } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface Activity {
  id: string;
  title: string;
  description: string;
  duration: string;
  icon: typeof Sparkles;
  color: string;
  completed?: boolean;
}

const activities: Activity[] = [
  {
    id: '1',
    title: 'Morning Stretches',
    description: 'Gentle physical therapy exercises',
    duration: '15 min',
    icon: Sparkles,
    color: '#DFF4EC',
    completed: true,
  },
  {
    id: '2',
    title: 'Music Therapy',
    description: 'Interactive music and movement',
    duration: '30 min',
    icon: Music,
    color: '#BFD7EA',
  },
  {
    id: '3',
    title: 'Story Time',
    description: 'Reading and comprehension',
    duration: '20 min',
    icon: BookOpen,
    color: '#F8D7C4',
  },
  {
    id: '4',
    title: 'Art Session',
    description: 'Creative expression through art',
    duration: '45 min',
    icon: Palette,
    color: '#E8C27E',
  },
  {
    id: '5',
    title: 'Social Play',
    description: 'Interactive group activities',
    duration: '30 min',
    icon: Users,
    color: '#BFD7EA',
  },
  {
    id: '6',
    title: 'Sensory Activities',
    description: 'Tactile exploration and play',
    duration: '25 min',
    icon: Heart,
    color: '#F8D7C4',
  },
];

export function ActivitiesSection() {
  return (
    <div className="space-y-6">
      {/* Progress Card */}
      <GlassCard className="bg-gradient-to-br from-[#DFF4EC]/40 to-[#BFD7EA]/30">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-[#2E3A59]">Today's Progress</h2>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#DFF4EC]">
            <Sparkles style={{ strokeWidth: 'var(--icon-stroke)' }} size={24} className="text-[#2E3A59]" />
          </div>
        </div>
        <div className="flex items-end gap-4">
          <div>
            <p className="text-3xl font-semibold text-[#2E3A59]">3/6</p>
            <p className="text-sm text-[#5A6B8C]">Activities completed</p>
          </div>
          <div className="flex-1 mb-2">
            <div className="h-3 bg-white/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#DFF4EC] to-[#E8C27E] rounded-full transition-all duration-500"
                style={{ width: '50%' }}
              />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Activities List */}
      <div>
        <h3 className="text-lg font-semibold text-[#2E3A59] mb-4 px-1">Scheduled Activities</h3>
        <div className="space-y-3">
          {activities.map((activity) => {
            const Icon = activity.icon;
            return (
              <button
                key={activity.id}
                className="w-full glass rounded-2xl p-5 flex items-center gap-4 text-left hover:shadow-medium transition-all duration-300 active:scale-[0.98]"
                style={{ minHeight: '90px' }}
              >
                <div
                  className="flex items-center justify-center rounded-xl flex-shrink-0"
                  style={{
                    width: '56px',
                    height: '56px',
                    backgroundColor: `${activity.color}40`,
                  }}
                >
                  <Icon
                    style={{ strokeWidth: 'var(--icon-stroke)' }}
                    size={28}
                    className="text-[#2E3A59]"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-[#2E3A59]">{activity.title}</h3>
                    {activity.completed && (
                      <span className="px-2 py-0.5 rounded-full bg-[#DFF4EC] text-xs font-medium text-[#2E3A59]">
                        ✓ Done
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#5A6B8C] mb-1">{activity.description}</p>
                  <p className="text-xs text-[#8C9BB5]">{activity.duration}</p>
                </div>

                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    activity.completed ? 'bg-[#DFF4EC]' : 'border-2 border-[#BFD7EA]'
                  }`}
                >
                  {activity.completed && (
                    <span className="text-[#2E3A59] font-semibold">✓</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
