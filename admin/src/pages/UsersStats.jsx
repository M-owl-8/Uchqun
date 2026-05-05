import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Users,
  UserCheck,
  Shield,
  UserCircle,
  TrendingUp,
  Calendar,
} from 'lucide-react';

const UsersStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [selectedRole, setSelectedRole] = useState('');

  useEffect(() => {
    loadStats();
  }, [dateRange, selectedRole]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const params = { ...dateRange };
      if (selectedRole) params.role = selectedRole;
      
      const response = await api.get('/business/users', { params });
      setStats(response.data.data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const roleIcons = {
    parent: UserCircle,
    teacher: UserCheck,
    reception: Shield,
    admin: Shield,
  };

  const roleColors = {
    parent: 'bg-blue-50 text-blue-600',
    teacher: 'bg-green-50 text-green-600',
    reception: 'bg-purple-50 text-purple-600',
    admin: 'bg-yellow-50 text-yellow-600',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users Statistics</h1>
          <p className="text-gray-600 mt-1">Track user growth and demographics</p>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All Roles</option>
            <option value="parent">Parents</option>
            <option value="teacher">Teachers</option>
            <option value="reception">Receptions</option>
          </select>
        </div>
      </div>

      <Card className="p-6 bg-gradient-to-br from-blue-400 to-blue-600 text-white">
        <div className="flex items-center justify-between mb-4">
          <Users className="w-8 h-8" />
          <TrendingUp className="w-6 h-6" />
        </div>
        <p className="text-3xl font-bold mb-1">{stats?.total || 0}</p>
        <p className="text-blue-100">Total Users</p>
      </Card>

      {stats?.byRole && Object.keys(stats.byRole).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(stats.byRole).map(([role, count]) => {
            const Icon = roleIcons[role] || UserCircle;
            const colorClass = roleColors[role] || 'bg-gray-50 text-gray-600';
            return (
              <Card key={role} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${colorClass}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{count}</p>
                <p className="text-sm text-gray-600 capitalize">{role}s</p>
              </Card>
            );
          })}
        </div>
      )}

      {stats?.users && stats.users.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Users</h2>
          <div className="space-y-3">
            {stats.users.slice(0, 10).map((user) => (
              <div key={user.id} className="p-4 bg-gray-50 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${roleColors[user.role] || 'bg-gray-100'}`}>
                    {(roleIcons[user.role] || UserCircle)({ className: 'w-5 h-5' })}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 capitalize">{user.role}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {(!stats?.users || stats.users.length === 0) && (
        <Card className="p-12 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No User Data</h3>
          <p className="text-gray-600">No user data available for the selected period.</p>
        </Card>
      )}
    </div>
  );
};

export default UsersStats;
