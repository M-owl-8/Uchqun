import { Coffee, UtensilsCrossed, Cookie, Droplets } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface Meal {
  id: string;
  title: string;
  time: string;
  items: string[];
  icon: typeof Coffee;
  color: string;
  completed?: boolean;
}

const meals: Meal[] = [
  {
    id: '1',
    title: 'Breakfast',
    time: '8:00 AM',
    items: ['Oatmeal with berries', 'Yogurt', 'Orange juice'],
    icon: Coffee,
    color: '#E8C27E',
    completed: true,
  },
  {
    id: '2',
    title: 'Morning Snack',
    time: '10:30 AM',
    items: ['Apple slices', 'Cheese cubes', 'Water'],
    icon: Cookie,
    color: '#F8D7C4',
    completed: true,
  },
  {
    id: '3',
    title: 'Lunch',
    time: '12:30 PM',
    items: ['Chicken pasta', 'Mixed vegetables', 'Milk'],
    icon: UtensilsCrossed,
    color: '#DFF4EC',
  },
  {
    id: '4',
    title: 'Afternoon Snack',
    time: '3:00 PM',
    items: ['Banana', 'Graham crackers', 'Water'],
    icon: Cookie,
    color: '#BFD7EA',
  },
  {
    id: '5',
    title: 'Dinner',
    time: '6:00 PM',
    items: ['Grilled fish', 'Rice', 'Steamed broccoli', 'Milk'],
    icon: UtensilsCrossed,
    color: '#E8C27E',
  },
];

export function MealsSection() {
  return (
    <div className="space-y-6">
      {/* Nutrition Summary */}
      <GlassCard className="bg-gradient-to-br from-[#E8C27E]/30 to-[#F8D7C4]/30">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[#2E3A59]">Today's Nutrition</h2>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#E8C27E]">
            <UtensilsCrossed style={{ strokeWidth: 'var(--icon-stroke)' }} size={24} className="text-white" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-semibold text-[#2E3A59]">2/5</p>
            <p className="text-xs text-[#5A6B8C] mt-1">Meals</p>
          </div>
          <div className="text-center border-x border-[#BFD7EA]/30">
            <p className="text-2xl font-semibold text-[#2E3A59]">850</p>
            <p className="text-xs text-[#5A6B8C] mt-1">Calories</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-[#2E3A59]">6</p>
            <p className="text-xs text-[#5A6B8C] mt-1">Cups H₂O</p>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden h-32">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1758874961075-f30645db3966?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFsdGh5JTIwY29sb3JmdWwlMjBraWRzJTIwbWVhbCUyMGZvb2R8ZW58MXx8fHwxNzcwMTkxMTQyfDA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Healthy meal"
            className="w-full h-full object-cover"
          />
        </div>
      </GlassCard>

      {/* Hydration Tracker */}
      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#BFD7EA]/40 flex items-center justify-center">
              <Droplets style={{ strokeWidth: 'var(--icon-stroke)' }} size={20} className="text-[#2E3A59]" />
            </div>
            <div>
              <p className="font-semibold text-[#2E3A59]">Hydration</p>
              <p className="text-sm text-[#5A6B8C]">6 of 8 cups</p>
            </div>
          </div>
          <button className="px-4 py-2 rounded-xl bg-[#BFD7EA] hover:bg-[#BFD7EA]/80 text-[#2E3A59] font-medium text-sm transition-all duration-300 active:scale-95">
            + Add
          </button>
        </div>
        <div className="h-2 bg-white/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#BFD7EA] to-[#DFF4EC] rounded-full transition-all duration-500"
            style={{ width: '75%' }}
          />
        </div>
      </GlassCard>

      {/* Meal Schedule */}
      <div>
        <h3 className="text-lg font-semibold text-[#2E3A59] mb-4 px-1">Meal Schedule</h3>
        <div className="space-y-3">
          {meals.map((meal) => {
            const Icon = meal.icon;
            return (
              <GlassCard key={meal.id}>
                <div className="flex items-start gap-4">
                  <div
                    className="flex items-center justify-center rounded-xl flex-shrink-0"
                    style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: `${meal.color}40`,
                    }}
                  >
                    <Icon
                      style={{ strokeWidth: 'var(--icon-stroke)' }}
                      size={24}
                      className="text-[#2E3A59]"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[#2E3A59]">{meal.title}</h3>
                      {meal.completed && (
                        <span className="px-2 py-0.5 rounded-full bg-[#DFF4EC] text-xs font-medium text-[#2E3A59]">
                          ✓ Completed
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#8C9BB5] mb-2">{meal.time}</p>
                    <ul className="space-y-1">
                      {meal.items.map((item, index) => (
                        <li key={index} className="text-sm text-[#5A6B8C] flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-[#BFD7EA]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {!meal.completed && (
                    <button className="px-4 py-2 rounded-xl bg-[#2E3A59] hover:bg-[#2E3A59]/90 text-white text-sm font-medium transition-all duration-300 active:scale-95">
                      Log
                    </button>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}
