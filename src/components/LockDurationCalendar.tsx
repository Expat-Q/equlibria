import { useState, useMemo } from 'react';
import { Icon } from './Icon';

interface Props {
  selectedDays: number;
  onSelect: (days: number) => void;
}

export function LockDurationCalendar({ selectedDays, onSelect }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Calculate the date that corresponds to selected days from today
  const selectedDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDays);
    return d;
  }, [selectedDays]);

  const quickOptions = [
    { label: '1 Week', days: 7 },
    { label: '1 Month', days: 30 },
    { label: '3 Months', days: 90 },
    { label: '6 Months', days: 180 },
    { label: '1 Year', days: 365 },
  ];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handleDateClick = (day: number) => {
    const selected = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selected.setHours(0, 0, 0, 0);
    
    const diffTime = selected.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      onSelect(diffDays);
    }
  };

  const handlePrevMonth = () => {
    const prev = new Date(currentDate);
    prev.setMonth(prev.getMonth() - 1);
    setCurrentDate(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + 1);
    setCurrentDate(next);
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days: (number | null)[] = [];
  
  // Fill empty slots before first day
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  
  // Fill days of month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* Quick Options */}
      <div>
        <div className="form-label" style={{ marginBottom: '0.75rem' }}>Quick Select</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem' }}>
          {quickOptions.map(opt => {
            const isSelected = selectedDays === opt.days;
            return (
              <button
                key={opt.days}
                onClick={() => onSelect(opt.days)}
                style={{
                  padding: '0.65rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  background: isSelected ? 'var(--accent-dim)' : 'var(--bg-card)',
                  color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
      }}>
        {/* Month/Year Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
        }}>
          <button
            onClick={handlePrevMonth}
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = 'var(--accent-primary)';
            }}
            onMouseOut={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = 'var(--border-subtle)';
            }}
          >
            <Icon name="chevron_left" size={18} />
          </button>
          
          <h3 style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
          }}>
            {monthYear}
          </h3>
          
          <button
            onClick={handleNextMonth}
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = 'var(--accent-primary)';
            }}
            onMouseOut={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = 'var(--border-subtle)';
            }}
          >
            <Icon name="chevron_right" size={18} />
          </button>
        </div>

        {/* Day Headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '0.5rem',
          marginBottom: '1rem',
        }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
            <div
              key={day}
              style={{
                textAlign: 'center',
                fontWeight: 700,
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                paddingBottom: '0.5rem',
                borderBottomWidth: 1,
                borderBottomStyle: 'solid',
                borderBottomColor: 'var(--border-subtle)',
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '0.5rem',
        }}>
          {days.map((day, idx) => {
            if (!day) {
              return (
                <div key={`empty-${idx}`} style={{
                  aspectRatio: '1',
                  borderRadius: 'var(--radius-md)',
                }} />
              );
            }

            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            date.setHours(0, 0, 0, 0);
            
            const isPast = date.getTime() < today.getTime();
            const isSelected = date.getTime() === selectedDate.getTime();
            const isToday = date.getTime() === today.getTime();

            return (
              <button
                key={day}
                onClick={() => handleDateClick(day)}
                disabled={isPast}
                style={{
                  aspectRatio: '1',
                  borderRadius: 'var(--radius-md)',
                  border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  background: isSelected
                    ? 'var(--accent-dim)'
                    : isToday
                    ? 'var(--bg-input)'
                    : 'var(--bg-surface)',
                  color: isSelected ? 'var(--accent-primary)' : isPast ? 'var(--text-muted)' : 'var(--text-primary)',
                  fontWeight: isSelected ? 700 : 600,
                  fontSize: '0.85rem',
                  cursor: isPast ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                  opacity: isPast ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseOver={(e) => {
                  if (!isPast && !isSelected) {
                    (e.target as HTMLButtonElement).style.borderColor = 'var(--accent-primary)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isPast && !isSelected) {
                    (e.target as HTMLButtonElement).style.borderColor = 'var(--border-subtle)';
                  }
                }}
              >
                {day}
                {isToday && (
                  <div style={{
                    position: 'absolute',
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: 'var(--accent-primary)',
                    bottom: 4,
                  }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Display */}
      <div style={{
        padding: '1rem',
        background: 'var(--accent-dim)',
        border: '1px solid var(--accent-primary)',
        borderRadius: 'var(--radius-md)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
          Locked until
        </div>
        <div style={{
          fontSize: '1rem',
          fontWeight: 700,
          color: 'var(--accent-primary)',
        }}>
          {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          ({selectedDays} days from now)
        </div>
      </div>
    </div>
  );
}
