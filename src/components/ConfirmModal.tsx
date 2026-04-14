import { Icon } from './Icon';

interface Props {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel', 
  isDanger = false,
  onConfirm, 
  onCancel 
}: Props) {
  return (
    <div className="modal-overlay" onClick={onCancel} style={{ zIndex: 11000 }}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '12px',
            background: isDanger ? '#fff0f0' : 'var(--accent-dim)',
            color: isDanger ? '#d93025' : 'var(--accent-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon name={isDanger ? 'warning' : 'info'} size={20} />
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {title}
          </div>
        </div>
        
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
          {message}
        </p>
        
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn-white" 
            onClick={onCancel}
            style={{ flex: 1, padding: '0.75rem' }}
          >
            {cancelText}
          </button>
          <button 
            className={isDanger ? "btn-primary" : "btn-primary"} 
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            style={{ 
              flex: 1, padding: '0.75rem',
              ...(isDanger ? { background: '#d93025', color: 'white' } : {})
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
