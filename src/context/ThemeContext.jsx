import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    try {
      const stored = localStorage.getItem('tripnest_theme');
      return stored ? stored === 'dark' : false;
    } catch {
      return false;
    }
  });

  const setTheme = useCallback((themeOrIsDark) => {
    const nextDark = typeof themeOrIsDark === 'boolean' ? themeOrIsDark : themeOrIsDark === 'dark';
    setIsDark(nextDark);
    try {
      localStorage.setItem('tripnest_theme', nextDark ? 'dark' : 'light');
    } catch {}
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('tripnest_theme', next ? 'dark' : 'light');
      } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, setTheme, toggleTheme }}>
      <div className={`w-full h-full ${isDark ? 'dark' : 'light'}`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export default ThemeContext;
