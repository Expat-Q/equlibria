import React from 'react';

interface IconProps {
  name: string;
  size?: number | string;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
  type?: 'material' | 'fontawesome'; // Default is fontawesome
}

// Map common icon names to Font Awesome classes
const iconMap: Record<string, string> = {
  // Navigation & UI
  'dashboard': 'fas fa-chart-line',
  'account_balance_wallet': 'fas fa-wallet',
  'monitoring': 'fas fa-chart-mix',
  'people': 'fas fa-users',
  'leaderboard': 'fas fa-trophy',
  'swap_horiz': 'fas fa-arrows-left-right',
  'close': 'fas fa-xmark',
  'chevron_right': 'fas fa-chevron-right',
  'chevron_left': 'fas fa-chevron-left',
  'expand_less': 'fas fa-chevron-up',
  'expand_more': 'fas fa-chevron-down',
  'settings': 'fas fa-cog',
  'send': 'fas fa-paper-plane',
  'arrow_circle_down': 'fas fa-download',
  'receipt_long': 'fas fa-receipt',
  'add_circle': 'fas fa-circle-plus',
  'add': 'fas fa-plus',
  'edit': 'fas fa-pen-to-square',
  'person_add': 'fas fa-user-plus',
  'warning': 'fas fa-triangle-exclamation',
  'account_balance': 'fas fa-building-columns',
  'bolt': 'fas fa-bolt',
  'currency_exchange': 'fas fa-money-bill-transfer',
  'payments': 'fas fa-credit-card',
  'space_dashboard': 'fas fa-table-columns',
  'menu': 'fas fa-ellipsis-vertical',
  'clear_all': 'fas fa-broom',
  'check': 'fas fa-check',
  'check_circle': 'fas fa-circle-check',
  'error': 'fas fa-circle-xmark',
  'info': 'fas fa-circle-info',
  'search': 'fas fa-magnifying-glass',
  'arrow_back': 'fas fa-arrow-left',
  'logout': 'fas fa-sign-out-alt',
  'download': 'fas fa-download',
  'upload': 'fas fa-upload',
  'home': 'fas fa-house',
  'laptop_mac': 'fas fa-laptop',
  'notifications': 'fas fa-bell',
  'notifications_none': 'far fa-bell',
  'bell': 'fas fa-bell',
  'dark_mode': 'fas fa-moon',
  'light_mode': 'fas fa-sun',
  'account_circle': 'fas fa-circle-user',
  'person': 'fas fa-user',
  'person_off': 'fas fa-user-slash',
  'group': 'fas fa-users',
  'group_add': 'fas fa-user-plus',
  'manage_accounts': 'fas fa-user-gear',
  'visibility': 'fas fa-eye',
  'visibility_off': 'fas fa-eye-slash',
  'lock': 'fas fa-lock',
  'security': 'fas fa-shield-halved',
  'shield': 'fas fa-shield-halved',
  'shield-check': 'fas fa-shield-halved',
  'key': 'fas fa-key',
  'save': 'fas fa-floppy-disk',
  'history': 'fas fa-clock-rotate-left',
  'schedule': 'fas fa-clock',
  'timeline': 'fas fa-timeline',
  'hub': 'fas fa-circle-nodes',
  'layers': 'fas fa-layer-group',
  'savings': 'fas fa-piggy-bank',
  'trending_up': 'fas fa-arrow-trend-up',
  'open_in_new': 'fas fa-up-right-from-square',
  'content_copy': 'fas fa-copy',
  'life_ring': 'fas fa-life-ring',
  'qr_code': 'fas fa-qrcode',
  'qrcode': 'fas fa-qrcode',
  'qr_code2': 'fas fa-qr-code',
  'clipboard': 'fas fa-clipboard',
  'comment-dots': 'fas fa-comment-dots',
  'share-nodes': 'fas fa-share-nodes',
  'triangle-exclamation': 'fas fa-triangle-exclamation',
  'dollar-sign': 'fas fa-dollar-sign',
  'ethereum': 'fab fa-ethereum',
  'sun': 'fas fa-sun',
  'coins': 'fas fa-coins',
  'wallet': 'fas fa-wallet',
  'user': 'fas fa-user',
  'paper-plane': 'fas fa-paper-plane',
  'envelope': 'fas fa-envelope',
  'link': 'fas fa-link',
  'stars': 'fas fa-star',
  'swap_vert': 'fas fa-arrows-up-down',
  'bar_chart': 'fas fa-chart-bar',
  'show_chart': 'fas fa-chart-line',
  'list': 'fas fa-list',
  'arrow_forward': 'fas fa-arrow-right',
  'power_settings_new': 'fas fa-power-off',
  'notification_important': 'fas fa-bell',
  'graduation-cap': 'fas fa-graduation-cap',
  'plane-departure': 'fas fa-plane-departure',
  'house': 'fas fa-house',
  'utensils': 'fas fa-utensils',
  'truck-medical': 'fas fa-truck-medical',
  'ring': 'fas fa-ring',
  'laptop': 'fas fa-laptop',
  'chart-line': 'fas fa-chart-line',
  'bullseye': 'fas fa-bullseye',
  'x-twitter': 'fab fa-x-twitter',
};

export function Icon({ name, size = 24, color, style, className = '', type = 'fontawesome' }: IconProps) {
  if (type === 'material') {
    return (
      <span 
        className={`material-symbols-rounded ${className}`} 
        style={{ 
          fontSize: size,
          color: color,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style 
        }}
      >
        {name}
      </span>
    );
  }

  const faClass = iconMap[name] || `fas fa-${name}`;
  const sizeValue = typeof size === 'number' ? `${size}px` : size;

  return (
    <i 
      className={`${faClass} ${className}`} 
      style={{ 
        fontSize: sizeValue,
        color: color,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style 
      }}
      aria-hidden="true"
    />
  );
}
