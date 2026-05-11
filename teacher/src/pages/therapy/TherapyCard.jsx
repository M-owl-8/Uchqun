import { Clock, Edit2, Play, Star, Trash2, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Card from '../../shared/components/Card';

const TherapyCard = ({ therapy, pendingDeleteId, getTherapyIcon, getTherapyColor, onAssign, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const Icon = getTherapyIcon(therapy.therapyType);
  const colorClass = getTherapyColor(therapy.therapyType);
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
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
        {therapy.usageCount && (
          <div className="flex items-center gap-1">
            <Play className="w-4 h-4" />
            <span>{therapy.usageCount}</span>
          </div>
        )}
      </div>

      {therapy.tags && therapy.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {therapy.tags.slice(0, 3).map((tag, idx) => (
            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => onAssign(therapy)}
          className="flex-1 px-4 py-2 bg-green-50 text-green-600 rounded-lg font-medium hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
        >
          <User className="w-4 h-4" />
          {t('therapy.assign', { defaultValue: 'Tayinlash' })}
        </button>
        <button
          onClick={() => onEdit(therapy)}
          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(therapy.id)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            pendingDeleteId === therapy.id
              ? 'bg-red-600 text-white'
              : 'bg-red-50 text-red-600 hover:bg-red-100'
          }`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </Card>
  );
};

export default TherapyCard;
