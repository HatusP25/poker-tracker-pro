import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const useKeyboardShortcuts = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let lastKey: string | null = null;
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const currentTime = Date.now();
      const key = e.key.toLowerCase();

      // Reset sequence if more than 1 second has passed
      if (currentTime - lastKeyTime > 1000) {
        lastKey = null;
      }

      // Navigation shortcuts (G + letter)
      if (lastKey === 'g') {
        e.preventDefault();
        switch (key) {
          case 'd':
            navigate('/');
            break;
          case 'e':
            navigate('/entry');
            break;
          case 's':
            navigate('/sessions');
            break;
          case 'p':
            navigate('/players');
            break;
          case 'r':
            navigate('/rankings');
            break;
          case 'a':
            navigate('/analytics');
            break;
          case 'g':
            navigate('/groups');
            break;
        }
        lastKey = null;
        return;
      }

      // Action shortcuts (N + letter)
      if (lastKey === 'n') {
        e.preventDefault();
        switch (key) {
          case 's':
            navigate('/entry');
            break;
          case 'p':
            navigate('/players');
            break;
        }
        lastKey = null;
        return;
      }

      // Track first key of sequence
      if (key === 'g' || key === 'n') {
        lastKey = key;
        lastKeyTime = currentTime;
      } else {
        lastKey = null;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);
};
