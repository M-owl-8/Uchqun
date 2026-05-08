import { useEffect, useState } from 'react';
import {
  Apple,
  CalendarDays,
  CheckCircle2,
  Clock,
  Coffee,
  Edit2,
  Info,
  Moon,
  Plus,
  Save,
  Sun,
  Trash2,
  Utensils,
  X,
  XCircle
} from 'lucide-react';
import Card from '../shared/components/Card';
import LoadingSpinner from '../shared/components/LoadingSpinner';
import { useAuth } from '../shared/context/AuthContext';
import { useToast } from '../shared/context/ToastContext';
import api from '../shared/services/api';
import { useTranslation } from 'react-i18next';
import ConfirmDialog from '../shared/components/ConfirmDialog';

const Meals = () => {
  const { isTeacher } = useAuth();
  const { success, error: showError } = useToast();
  const { t, i18n } = useTranslation();
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showModal, setShowModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [formData, setFormData] = useState({
    childId: '',
    mealName: '',
    description: '',
    mealType: 'Breakfast',
    quantity: 'Full portion',
    specialNotes: '',
    time: '08:30',
    eaten: true,
    date: new Date().toISOString().split('T')[0],
  });
  const [children, setChildren] = useState([]);

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
    for (const loc of localeCandidates) {
      try {
        return new Intl.DateTimeFormat(loc, options).format(date);
      } catch {
        continue;
      }
    }
    return new Intl.DateTimeFormat('en-US', options).format(date);
  };

  useEffect(() => {
    loadMeals();
    if (isTeacher) {
      loadChildren();
    }
  }, [isTeacher]);

  const loadChildren = async () => {
    try {
      const parentsRes = await api.get('/teacher/parents');
      const allChildren = [];
      parentsRes.data.parents.forEach(parent => {
        if (parent.children && Array.isArray(parent.children)) {
          allChildren.push(...parent.children);
        }
      });
      setChildren(allChildren);
      if (allChildren.length > 0 && !formData.childId) {
        setFormData(prev => ({ ...prev, childId: allChildren[0].id }));
      }
    } catch (error) { /* swallowed: surface to UI when toast hook is available */ void error; }
  };

  const loadMeals = async () => {
    try {
      setLoading(true);
      const response = await api.get('/meals');
      setMeals(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      showError(error.response?.data?.error || t('mealsPage.form.toastLoadError'));
      setMeals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingMeal(null);
    setFormData({
      childId: children.length > 0 ? children[0].id : '',
      mealName: '',
      description: '',
      mealType: 'Breakfast',
      quantity: 'Full portion',
      specialNotes: '',
      time: '08:30',
      eaten: true,
      date: selectedDate,
    });
    setShowModal(true);
  };

  const handleEdit = (meal) => {
    setEditingMeal(meal);
    setFormData({
      childId: meal.childId || '',
      mealName: meal.mealName || '',
      description: meal.description || '',
      mealType: meal.mealType || 'Breakfast',
      quantity: meal.quantity || 'Full portion',
      specialNotes: meal.specialNotes || '',
      time: meal.time || '08:30',
      eaten: meal.eaten !== undefined ? meal.eaten : true,
      date: meal.date ? meal.date.split('T')[0] : selectedDate,
    });
    setShowModal(true);
  };

  const handleDelete = (mealId) => {
    setConfirmDialog({
      message: t('mealsPage.form.confirmDelete'),
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/meals/${mealId}`);
          success(t('mealsPage.form.toastDelete'));
          loadMeals();
        } catch (error) {
          showError(error.response?.data?.error || t('mealsPage.form.toastError'));
        }
      },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingMeal) {
        await api.put(`/meals/${editingMeal.id}`, formData);
        success(t('mealsPage.form.toastUpdate'));
      } else {
        if (!formData.childId) {
          showError(t('mealsPage.form.selectChild'));
          return;
        }
        await api.post('/meals', formData);
        success(t('mealsPage.form.toastCreate'));
      }

      setShowModal(false);
      loadMeals();
    } catch (error) {
      showError(error.response?.data?.error || t('mealsPage.form.toastError'));
    }
  };

  const filteredMeals = meals.filter((meal) => meal.date === selectedDate);
  const dates = [...new Set(meals.map((meal) => meal.date))].sort().reverse();

  const mealConfigs = {
    Breakfast: { color: 'text-amber-600', bg: 'bg-amber-50', icon: Coffee, border: 'border-amber-100' },
    Lunch: { color: 'text-blue-600', bg: 'bg-blue-50', icon: Sun, border: 'border-blue-100' },
    Snack: { color: 'text-green-600', bg: 'bg-green-50', icon: Apple, border: 'border-green-100' },
    Dinner: { color: 'text-blue-600', bg: 'bg-blue-50', icon: Moon, border: 'border-blue-100' },
  };

  const mealTypeLabels = {
    Breakfast: t('mealsPage.types.Breakfast'),
    Lunch: t('mealsPage.types.Lunch'),
    Snack: t('mealsPage.types.Snack'),
    Dinner: t('mealsPage.types.Dinner'),
  };

  if (loading) return <div className="flex justify-center items-center h-96"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* --- Header & Date Picker --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-sm">{t('mealsPage.title')}</h1>
          <p className="text-white/90 font-medium mt-1 drop-shadow-sm">{t('mealsPage.subtitle')}</p>
        </div>

        <div className="flex items-end gap-3">
          {isTeacher && (
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">{t('mealsPage.add')}</span>
            </button>
          )}

          <div className="relative">
            <label className="flex items-center gap-2 text-xs font-bold text-white/70 uppercase tracking-widest mb-2 ml-1 drop-shadow-sm">
              <CalendarDays className="w-3.5 h-3.5" /> {t('mealsPage.selectDay')}
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="appearance-none bg-white border border-gray-200 text-gray-900 font-bold rounded-xl px-6 py-3 pr-12 focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
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
        </div>
      </div>

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
                        {t('mealsPage.quantity')}: <span className="text-gray-900">{meal.quantity}</span>
                      </div>
                      <div className={`flex items-center gap-1.5 text-sm font-bold ${meal.eaten ? 'text-green-600' : 'text-red-500'}`}>
                        {meal.eaten ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {meal.eaten ? t('mealsPage.eaten') : t('mealsPage.notEaten')}
                      </div>
                    </div>

                    {meal.specialNotes && (
                      <div className="flex items-start gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-100 mt-4 group-hover:bg-white transition-colors">
                        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-gray-500 leading-relaxed font-medium">
                          <span className="text-gray-900 font-bold">Eslatma:</span> {meal.specialNotes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons (Teachers only) */}
                  {isTeacher && (
                    <div className="flex gap-2 pt-4 md:pt-0 md:flex-col md:justify-start">
                      <button
                        onClick={() => handleEdit(meal)}
                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(meal.id)}
                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-gray-200">
            <Utensils className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-bold text-lg">{t('mealsPage.empty')}</p>
          </div>
        )}
      </div>

      {/* --- Nutrition Summary Card --- */}
      {filteredMeals.length > 0 && (
        <div className="bg-gray-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />

          <div className="relative z-10 space-y-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
              <h3 className="text-xl font-bold">{t('mealsPage.dailySummary')}</h3>
              <span className="text-blue-400 font-black text-sm uppercase tracking-widest">
                {formatDate(selectedDate, { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center md:text-left">
              <SummaryStat label={t('mealsPage.totalMeals')} value={filteredMeals.length} />
              <SummaryStat
                label={t('mealsPage.eaten')}
                value={filteredMeals.filter(m => m.eaten).length}
                color="text-green-400"
              />
              <SummaryStat
                label={t('mealsPage.skipped')}
                value={filteredMeals.filter(m => !m.eaten).length}
                color="text-red-400"
              />
              <div className="space-y-1">
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{t('mealsPage.quality')}</p>
                <div className="flex justify-center md:justify-start gap-1">
                  {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-4 h-1.5 rounded-full bg-blue-500" />)}
                </div>
                <p className="text-xs font-bold text-white mt-2">{t('mealsPage.excellent')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingMeal ? t('mealsPage.form.editTitle') : t('mealsPage.form.addTitle')}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {isTeacher && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('mealsPage.form.child')}
                  </label>
                  <select
                    required
                    value={formData.childId}
                    onChange={(e) => setFormData({ ...formData, childId: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('mealsPage.form.selectChild')}</option>
                    {children.map(child => (
                      <option key={child.id} value={child.id}>
                        {child.firstName} {child.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('mealsPage.form.mealType')}
                  </label>
                  <select
                    value={formData.mealType}
                    onChange={(e) => setFormData({ ...formData, mealType: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Breakfast">{t('mealsPage.types.Breakfast')}</option>
                    <option value="Lunch">{t('mealsPage.types.Lunch')}</option>
                    <option value="Snack">{t('mealsPage.types.Snack')}</option>
                    <option value="Dinner">{t('mealsPage.types.Dinner')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('mealsPage.form.date')}
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('mealsPage.form.mealName')}
                </label>
                <input
                  type="text"
                  required
                  value={formData.mealName}
                  onChange={(e) => setFormData({ ...formData, mealName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('mealsPage.form.description')}
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('mealsPage.form.time')}
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('mealsPage.form.quantity')}
                  </label>
                  <select
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Full portion">Full portion</option>
                    <option value="Half portion">Half portion</option>
                    <option value="Small portion">Small portion</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('mealsPage.form.specialNotes')}
                </label>
                <textarea
                  value={formData.specialNotes}
                  onChange={(e) => setFormData({ ...formData, specialNotes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="eaten"
                  checked={formData.eaten}
                  onChange={(e) => setFormData({ ...formData, eaten: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="eaten" className="text-sm font-medium text-gray-700">
                  {t('mealsPage.form.eatenLabel')}
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  {t('mealsPage.form.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {editingMeal ? t('mealsPage.form.update') : t('mealsPage.form.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmDialog dialog={confirmDialog} onCancel={() => setConfirmDialog(null)} />
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

