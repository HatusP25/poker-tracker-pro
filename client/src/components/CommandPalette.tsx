import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { useGroupContext } from '../context/GroupContext';
import './CommandPalette.css';

const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { selectedGroup } = useGroupContext();

  // Toggle command palette with Cmd/Ctrl + K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="command-palette-overlay" onClick={() => setOpen(false)}>
      <div className="command-palette-container" onClick={(e) => e.stopPropagation()}>
        <Command className="command-palette">
          <Command.Input
            placeholder="Type a command or search..."
            className="command-input"
          />
          <Command.List className="command-list">
            <Command.Empty className="command-empty">No results found.</Command.Empty>

            <Command.Group heading="Navigation" className="command-group">
              <Command.Item
                onSelect={() => handleNavigate('/')}
                className="command-item"
              >
                <span className="command-icon">🏠</span>
                <div className="command-content">
                  <div className="command-title">Dashboard</div>
                  <div className="command-shortcut">G D</div>
                </div>
              </Command.Item>

              <Command.Item
                onSelect={() => handleNavigate('/entry')}
                className="command-item"
              >
                <span className="command-icon">✏️</span>
                <div className="command-content">
                  <div className="command-title">Data Entry</div>
                  <div className="command-shortcut">G E</div>
                </div>
              </Command.Item>

              <Command.Item
                onSelect={() => handleNavigate('/sessions')}
                className="command-item"
              >
                <span className="command-icon">📋</span>
                <div className="command-content">
                  <div className="command-title">Sessions</div>
                  <div className="command-shortcut">G S</div>
                </div>
              </Command.Item>

              <Command.Item
                onSelect={() => handleNavigate('/players')}
                className="command-item"
              >
                <span className="command-icon">👥</span>
                <div className="command-content">
                  <div className="command-title">Players</div>
                  <div className="command-shortcut">G P</div>
                </div>
              </Command.Item>

              <Command.Item
                onSelect={() => handleNavigate('/rankings')}
                className="command-item"
              >
                <span className="command-icon">🏆</span>
                <div className="command-content">
                  <div className="command-title">Rankings</div>
                  <div className="command-shortcut">G R</div>
                </div>
              </Command.Item>

              <Command.Item
                onSelect={() => handleNavigate('/analytics')}
                className="command-item"
              >
                <span className="command-icon">📊</span>
                <div className="command-content">
                  <div className="command-title">Analytics</div>
                  <div className="command-shortcut">G A</div>
                </div>
              </Command.Item>
            </Command.Group>

            {selectedGroup && (
              <Command.Group heading="Actions" className="command-group">
                <Command.Item
                  onSelect={() => handleNavigate('/entry')}
                  className="command-item"
                >
                  <span className="command-icon">➕</span>
                  <div className="command-content">
                    <div className="command-title">New Session</div>
                    <div className="command-shortcut">N S</div>
                  </div>
                </Command.Item>

                <Command.Item
                  onSelect={() => handleNavigate('/players')}
                  className="command-item"
                >
                  <span className="command-icon">👤</span>
                  <div className="command-content">
                    <div className="command-title">New Player</div>
                    <div className="command-shortcut">N P</div>
                  </div>
                </Command.Item>
              </Command.Group>
            )}

            <Command.Group heading="Other" className="command-group">
              <Command.Item
                onSelect={() => handleNavigate('/groups')}
                className="command-item"
              >
                <span className="command-icon">🔄</span>
                <div className="command-content">
                  <div className="command-title">Change Group</div>
                  <div className="command-shortcut">G G</div>
                </div>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
};

export default CommandPalette;
