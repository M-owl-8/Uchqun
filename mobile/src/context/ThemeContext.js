import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

const THEME_KEY = '@uchqun_theme_mode';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light'); // Default to light mode
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_KEY);
      if (savedTheme) {
        setTheme(savedTheme);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading theme:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      await AsyncStorage.setItem(THEME_KEY, newTheme);
    } catch (error) {
      if (__DEV__) {
        console.error('Error saving theme:', error);
      }
    }
  };

  const setLightTheme = async () => {
    try {
      setTheme('light');
      await AsyncStorage.setItem(THEME_KEY, 'light');
    } catch (error) {
      if (__DEV__) {
        console.error('Error saving theme:', error);
      }
    }
  };

  const setDarkTheme = async () => {
    try {
      setTheme('dark');
      await AsyncStorage.setItem(THEME_KEY, 'dark');
    } catch (error) {
      if (__DEV__) {
        console.error('Error saving theme:', error);
      }
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === 'dark',
        isLight: theme === 'light',
        toggleTheme,
        setLightTheme,
        setDarkTheme,
        loading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
