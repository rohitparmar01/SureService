import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * StatsCard Component
 * Professional statistics card with icon, value, label, and trend indicator
 * 
 * @param {string} title - Card title
 * @param {number|string} value - Main value to display
 * @param {ReactNode} icon - Icon component
 * @param {string} trend - Trend direction: 'up', 'down', 'neutral'
 * @param {string} trendValue - Percentage or text for trend
 * @param {string} color - Tailwind color class: 'blue', 'green', 'purple', 'orange', 'red'
 * @param {string} description - Optional description text
 */
const StatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend = 'neutral', 
  trendValue, 
  color = 'blue',
  description,
  onClick
}) => {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      iconBg: 'bg-blue-100',
      border: 'border-blue-200'
    },
    green: {
      bg: 'bg-green-50',
      text: 'text-green-600',
      iconBg: 'bg-green-100',
      border: 'border-green-200'
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      iconBg: 'bg-purple-100',
      border: 'border-purple-200'
    },
    orange: {
      bg: 'bg-orange-50',
      text: 'text-orange-600',
      iconBg: 'bg-orange-100',
      border: 'border-orange-200'
    },
    red: {
      bg: 'bg-red-50',
      text: 'text-red-600',
      iconBg: 'bg-red-100',
      border: 'border-red-200'
    },
    indigo: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-600',
      iconBg: 'bg-indigo-100',
      border: 'border-indigo-200'
    }
  };

  const trendIcons = {
    up: TrendingUp,
    down: TrendingDown,
    neutral: Minus
  };

  const trendColors = {
    up: 'text-green-600 bg-green-50',
    down: 'text-red-600 bg-red-50',
    neutral: 'text-gray-600 bg-gray-50'
  };

  const TrendIcon = trendIcons[trend];
  const colors = colorMap[color];

  return (
    <div 
      className={`
        bg-white rounded-xl shadow-sm border ${colors.border} p-6 
        transition-all duration-300 hover:shadow-lg
        ${onClick ? 'cursor-pointer hover:scale-105' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colors.iconBg}`}>
          {Icon && <Icon className={`w-6 h-6 ${colors.text}`} />}
        </div>
      </div>

      {trendValue && (
        <div className="mt-4 flex items-center">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${trendColors[trend]}`}>
            <TrendIcon className="w-3 h-3 mr-1" />
            {trendValue}
          </span>
          <span className="ml-2 text-xs text-gray-500">vs last period</span>
        </div>
      )}
    </div>
  );
};

export default StatsCard;
