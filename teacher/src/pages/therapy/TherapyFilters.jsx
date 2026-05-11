import { FileText, Music, Search, Video } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Card from '../../shared/components/Card';

const TherapyFilters = ({ searchQuery, setSearchQuery, filterType, setFilterType }) => {
  const { t } = useTranslation();
  return (
    <Card className="p-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={t('therapy.search', { defaultValue: 'Qidirish...' })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('therapy.all', { defaultValue: 'Barchasi' })}
          </button>
          <button
            onClick={() => setFilterType('music')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterType === 'music' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Music className="w-4 h-4 inline mr-1" />
            {t('therapy.music', { defaultValue: 'Musiqa' })}
          </button>
          <button
            onClick={() => setFilterType('video')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterType === 'video' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Video className="w-4 h-4 inline mr-1" />
            {t('therapy.video', { defaultValue: 'Video' })}
          </button>
          <button
            onClick={() => setFilterType('content')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterType === 'content' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-1" />
            {t('therapy.content', { defaultValue: 'Content' })}
          </button>
        </div>
      </div>
    </Card>
  );
};

export default TherapyFilters;
