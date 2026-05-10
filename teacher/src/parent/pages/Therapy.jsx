import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../../shared/context/ToastContext';
import { useChild } from '../context/ChildContext';
import api from '../services/api';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTranslation } from 'react-i18next';
import {
  Music,
  Video,
  Lightbulb,
  Play,
  Clock,
  Star,
  Search,
} from 'lucide-react';

const Therapy = () => {
  const { user } = useAuth();
  const { selectedChild } = useChild();
  const { t } = useTranslation();
  const { error: showError } = useToast();
  const [therapies, setTherapies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTherapy, setSelectedTherapy] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    loadTherapies();
  }, [filter]);

  const loadTherapies = async () => {
    try {
      setLoading(true);
      const params = { isActive: true };
      if (filter !== 'all') {
        params.therapyType = filter;
      }
      const response = await api.get('/therapy', { params });
      // Handle different response structures
      const therapiesData = response.data.data?.therapies || response.data.data || response.data.therapies || [];
      setTherapies(Array.isArray(therapiesData) ? therapiesData : []);
    } catch (error) {
      setTherapies([]);
    } finally {
      setLoading(false);
    }
  };

  const startTherapy = async (therapyId) => {
    try {
      const response = await api.post(`/therapy/${therapyId}/start`, {
        childId: selectedChild?.id || null,
      });
      setActiveSession(response.data.data);
      setSelectedTherapy(therapies.find(t => t.id === therapyId));
    } catch (error) {
      showError(error.response?.data?.error || t('therapy.startError', { defaultValue: 'Failed to start therapy' }));
    }
  };

  const endTherapy = async (sessionId) => {
    try {
      await api.put(`/therapy/usage/${sessionId}/end`);
      setActiveSession(null);
      setSelectedTherapy(null);
      loadTherapies();
    } catch (error) { /* swallowed: surface to UI when toast hook is available */ void error; }
  };

  const getTherapyIcon = (type) => {
    switch (type) {
      case 'music':
        return Music;
      case 'video':
        return Video;
      case 'content':
        return Lightbulb;
      default:
        return Play;
    }
  };

  const getTherapyColor = (type) => {
    switch (type) {
      case 'music':
        return 'bg-purple-50 text-purple-600';
      case 'video':
        return 'bg-blue-50 text-blue-600';
      case 'content':
        return 'bg-green-50 text-green-600';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  const filteredTherapies = therapies.filter(therapy => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        therapy.title?.toLowerCase().includes(query) ||
        therapy.description?.toLowerCase().includes(query) ||
        therapy.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t('therapy.title', { defaultValue: 'Foydali' })}
        </h1>
        <p className="text-gray-600">
          {t('therapy.subtitle', { defaultValue: 'Musiqa, video va tavsiya bo\'limi' })}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={t('therapy.search', { defaultValue: 'Qidirish...' })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('therapy.all', { defaultValue: 'Barchasi' })}
          </button>
          <button
            onClick={() => setFilter('music')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'music'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('therapy.music', { defaultValue: 'Musiqa' })}
          </button>
          <button
            onClick={() => setFilter('video')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'video'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('therapy.video', { defaultValue: 'Video' })}
          </button>
          <button
            onClick={() => setFilter('content')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'content'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('therapy.content', { defaultValue: 'Tavsiya' })}
          </button>
        </div>
      </div>

      {/* Active Session */}
      {activeSession && selectedTherapy && (
        <Card className="p-6 bg-gradient-to-r from-primary-500 to-primary-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold mb-1">{selectedTherapy.title}</h3>
              <p className="text-white/80 text-sm">
                {t('therapy.activeSession', { defaultValue: 'Faol sessiya' })}
              </p>
            </div>
            <button
              onClick={() => endTherapy(activeSession.id)}
              className="px-4 py-2 bg-white text-primary-600 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
            >
              {t('therapy.end', { defaultValue: 'Yakunlash' })}
            </button>
          </div>
        </Card>
      )}

      {/* Therapies List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTherapies.map((therapy) => {
          const Icon = getTherapyIcon(therapy.therapyType);
          const colorClass = getTherapyColor(therapy.therapyType);
          return (
            <Card key={therapy.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4 mb-4">
                <div className={`p-3 rounded-xl ${colorClass}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">{therapy.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{therapy.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                {therapy.duration && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{therapy.duration} {t('therapy.min', { defaultValue: 'min' })}</span>
                  </div>
                )}
                {therapy.rating != null && !isNaN(Number(therapy.rating)) && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span>{Number(therapy.rating).toFixed(1)}</span>
                  </div>
                )}
              </div>

              {therapy.tags && therapy.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {therapy.tags.slice(0, 3).map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={() => startTherapy(therapy.id)}
                disabled={!!activeSession}
                className={`w-full py-2 rounded-lg font-semibold transition-colors ${
                  activeSession
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {t('therapy.start', { defaultValue: 'Boshlash' })}
              </button>
            </Card>
          );
        })}
      </div>

      {filteredTherapies.length === 0 && (
        <Card className="p-12 text-center">
          <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('therapy.noTherapies', { defaultValue: 'Terapiyalar topilmadi' })}
          </h3>
          <p className="text-gray-600">
            {t('therapy.noTherapiesDesc', { defaultValue: 'Qidiruv natijalari bo\'sh' })}
          </p>
        </Card>
      )}
    </div>
  );
};

export default Therapy;
