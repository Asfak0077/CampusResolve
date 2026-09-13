import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '../../store/themeStore'

const ThemeToggle: React.FC = () => {
  const { isDarkMode, toggleTheme } = useThemeStore()

  return (
    <button
      onClick={toggleTheme}
      className="paper-toggle-btn paper-font-type"
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDarkMode ? 'Light mode' : 'Dark mode'}
    >
      <span key={isDarkMode ? 'sun' : 'moon'} className="paper-toggle-icon">
        {isDarkMode ? (
          <Sun className="w-4 h-4" strokeWidth={2.25} />
        ) : (
          <Moon className="w-4 h-4" strokeWidth={2.25} />
        )}
      </span>
    </button>
  )
}

export default ThemeToggle
