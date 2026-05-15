import { useEffect, useState } from 'react';
import { useChild } from '../context/ChildContext';
import api from '../services/api';
import * as cache from '../../../../shared/utils/cache';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Utensils,
  Clock,
  CheckCircle2,
  XCircle,
  Info,
  CalendarDays,
  Coffee,
  Sun,
  Apple,
  Moon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Meals = () => {
  const { selectedChildId } = useChild();
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { t, i18n } = useTranslation();

  const uzWeekdaysShort = ['Yak', 'Du', 'Se', 'Chor', 'Pay', 'Ju', 'Sha'];
  const uzMonthsLong = [
    'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
    'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
  ];

  const localeCandidates = [
    i18n.language === 'uz' ? 'uz-Latn-UZ' : i18n.language,
    `${i18n.language}-UZ`,
    'uz-Latn-UZ',
    'uz-UZ',
    'ru-RU',
    'en-US',
  ].filter(Boolean);

  const formatDate = (dateStr, options) => {
    const date = new Date(dateStr);

    if (i18n.language === 'uz') {
      const day = date.getDate();
      const weekday = options.weekday ? uzWeekdaysShort[date.getDay()] : null;
      const month = options.month === 'long' ? uzMonthsLong[date.getMonth()] : date.getMonth() + 1;
      const year = options.year ? date.getFullYear() : null;

      // Dropdown style: day-month, weekday
      if (options.weekday && !options.year) {
        return `${day}-${month}, ${weekday}`;
      }
      // Summary style: day-month-year
      if (options.year) {
        return `${day}-${month} ${year}`;
      }
      return `${day}-${month}`;
    }

    for (const loc of localeCandidates) {
      try {
        return new Intl.DateTimeFormat(loc, options).format(date);
      } catch (e) {
        continue;
      }
    }
    return new Intl.DateTimeFormat('en-US', options).format(date);
  };

  useEffect(() => {
    if (!selectedChildId) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const loadMeals = async () => {
      const key = `parent:meals:${selectedChildId}`;
      const cached = cache.get(key);
      if (cached) { setMeals(cached); setLoading(false); return; }
      try {
        const response = await api.get(`/meals?childId=${selectedChildId}`, { signal: controller.signal });
        const mealsData = response.data?.meals || response.data || [];
        const data = Array.isArray(mealsData) ? mealsData : [];
        cache.set(key, data);
        setMeals(data);
      } catch (error) {
        if (error.code === 'ERR_CANCELED') return;
        setMeals([]);
      } finally {
        setLoading(false);
      }
    };
    loadMeals();
    return () => controller.abort();
  }, [selectedChildId]);

  const filteredMeals = meals.filter((meal) => meal.date === selectedDate);
  const dates = [...new Set(meals.map((meal) => meal.date))].sort().reverse();

  const mealConfigs = {
    Breakfast: { color: 'text-amber-600', bg: 'bg-amber-50', icon: Coffee, border: 'border-amber-100' },
    Lunch: { color: 'text-blue-600', bg: 'bg-blue-50', icon: Sun, border: 'border-blue-100' },
    Snack: { color: 'text-green-600', bg: 'bg-green-50', icon: Apple, border: 'border-green-100' },
    Dinner: { color: 'text-blue-600', bg: 'bg-blue-50', icon: Moon, border: 'border-blue-100' },
  };

  const mealTypeLabels = {
    Breakfast: t('meals.breakfast'),
    Lunch: t('meals.lunch'),
    Snack: t('meals.snack'),
    Dinner: t('meals.dinner'),
  };

  if (loading) return <div className="flex justify-center items-center h-96"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* --- Header & Date Picker --- */}
      <Card className="flex flex-col md:flex-row md:items-end justify-between gap-6 p-6 md:p-8 bg-gradient-to-r from-blue-500 to-blue-400 rounded-2xl shadow-xl border-0">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{t('meals.title')}</h1>
          <p className="text-white/90 text-sm md:text-base">{t('meals.subtitle')}</p>
        </div>
        
        <div className="relative">
          <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
            <CalendarDays className="w-3.5 h-3.5" /> {t('meals.selectDay')}
          </label>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="appearance-none bg-gray-50 border-none text-gray-900 font-bold rounded-2xl px-6 py-3 pr-12 focus:ring-2 focus:ring-blue-500 shadow-inner cursor-pointer"
          >
            {dates.map((date) => (
              <option key={date} value={date}>
                {formatDate(date, { weekday: 'short', day: 'numeric', month: 'long' })}
              </option>
            ))}
          </select>
          <div className="absolute bottom-3.5 right-4 pointer-events-none text-gray-400">
            <Utensils className="w-4 h-4" />
          </div>
        </div>
      </Card>

      {/* --- Meals List --- */}
      <div className="grid grid-cols-1 gap-6">
        {filteredMeals.length > 0 ? (
          filteredMeals.map((meal) => {
            const config = mealConfigs[meal.mealType] || mealConfigs.Lunch;
            return (
              <Card key={meal.id} className={`group hover:shadow-xl transition-all duration-300 border-2 ${meal.eaten ? 'border-transparent' : 'border-dashed border-gray-200'}`}>
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Left Side: Icon & Status */}
                  <div className={`flex items-center justify-center w-20 h-20 rounded-3xl ${config.bg} ${config.color} shrink-0 shadow-sm`}>
                    <config.icon className="w-10 h-10" />
                  </div>

                  {/* Middle: Content */}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-black text-gray-900">{meal.mealName}</h3>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${config.bg} ${config.color} ${config.border}`}>
                        {mealTypeLabels[meal.mealType] || meal.mealType}
                      </span>
                      <div className="flex items-center gap-1.5 text-gray-400 font-bold text-xs ml-auto">
                      <Clock className="w-3.5 h-3.5" /> {meal.time}
                      </div>
                    </div>

                    <p className="text-gray-600 leading-relaxed font-medium">
                      {meal.description}
                    </p>

                    <div className="flex items-center gap-6 pt-2">
                       <div className="text-xs font-bold text-gray-400 uppercase tracking-tighter flex items-center gap-1.5">
                         {t('meals.quantity')}: <span className="text-gray-900">{meal.quantity}</span>
                       </div>
                       <div className={`flex items-center gap-1.5 text-sm font-bold ${meal.eaten ? 'text-green-600' : 'text-red-500'}`}>
                         {meal.eaten ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                         {meal.eaten ? t('meals.eaten') : t('meals.notEaten')}
                       </div>
                    </div>

                    {meal.specialNotes && (
                      <div className="flex items-start gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-100 mt-4 group-hover:bg-white transition-colors">
                        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-gray-500 leading-relaxed font-medium">
                          <span className="text-gray-900 font-bold">{t('meals.note')}:</span> {meal.specialNotes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <Card className="text-center py-24 bg-white/95 backdrop-blur-sm">
            <Utensils className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-bold text-lg">{t('meals.empty')}</p>
          </Card>
        )}
      </div>

      {/* --- Nutrition Summary Card --- */}
      {filteredMeals.length > 0 && (
        <div className="bg-gray-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          
          <div className="relative z-10 space-y-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
              <h3 className="text-xl font-bold">{t('meals.dailySummary')}</h3>
              <span className="text-blue-400 font-black text-sm uppercase tracking-widest">
                {formatDate(selectedDate, { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center md:text-left">
              <SummaryStat label={t('meals.totalMeals')} value={filteredMeals.length} />
              <SummaryStat 
                label={t('meals.eaten')} 
                value={filteredMeals.filter(m => m.eaten).length} 
                color="text-green-400" 
              />
              <SummaryStat 
                label={t('meals.skipped')} 
                value={filteredMeals.filter(m => !m.eaten).length} 
                color="text-red-400" 
              />
              <div className="space-y-1">
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{t('meals.quality')}</p>
                <div className="flex justify-center md:justify-start gap-1">
                  {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-4 h-1.5 rounded-full bg-blue-500" />)}
                </div>
                <p className="text-xs font-bold text-white mt-2">{t('meals.excellent')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Component for Summary
const SummaryStat = ({ label, value, color = "text-white" }) => (
  <div className="space-y-1">
    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{label}</p>
    <p className={`text-4xl font-black ${color}`}>{value}</p>
  </div>
);

export default Meals;