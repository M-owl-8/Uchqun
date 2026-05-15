import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import * as cache from '../../../../shared/utils/cache';

const ChildContext = createContext(null);

export const useChild = () => {
  const context = useContext(ChildContext);
  if (!context) {
    throw new Error('useChild must be used within ChildProvider');
  }
  return context;
};

const CACHE_KEY = 'parent:children';
const CACHE_TTL = 120_000; // 2 minutes — child list changes infrequently

export const ChildProvider = ({ children: childrenProp }) => {
  const [childrenList, setChildrenList] = useState(() => cache.get(CACHE_KEY) || []);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [loading, setLoading] = useState(!cache.get(CACHE_KEY));

  useEffect(() => {
    loadChildren();
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('selectedChildId');
    if (stored && childrenList.length > 0) {
      const childExists = childrenList.find(c => c.id === stored);
      setSelectedChildId(childExists ? stored : childrenList[0].id);
    } else if (childrenList.length > 0) {
      setSelectedChildId(childrenList[0].id);
    }
  }, [childrenList]);

  const loadChildren = async () => {
    const cached = cache.get(CACHE_KEY);
    if (cached) {
      setChildrenList(cached);
      setLoading(false);
      // Silent background refresh
      api.get('/child')
        .then(res => {
          const data = Array.isArray(res.data) ? res.data : [];
          cache.set(CACHE_KEY, data, CACHE_TTL);
          setChildrenList(data);
        })
        .catch(() => {});
      return;
    }
    try {
      setLoading(true);
      const response = await api.get('/child');
      const childrenData = Array.isArray(response.data) ? response.data : [];
      cache.set(CACHE_KEY, childrenData, CACHE_TTL);
      setChildrenList(childrenData);
    } catch {
      setChildrenList([]);
    } finally {
      setLoading(false);
    }
  };

  const selectChild = (childId) => {
    setSelectedChildId(childId);
    localStorage.setItem('selectedChildId', childId);
  };

  const selectedChild = childrenList.find(c => c.id === selectedChildId) || null;

  const value = {
    children: childrenList,
    selectedChild,
    selectedChildId,
    selectChild,
    loadChildren,
    loading,
  };

  return <ChildContext.Provider value={value}>{childrenProp}</ChildContext.Provider>;
};
