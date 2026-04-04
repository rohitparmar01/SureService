import React from 'react';
import { MapPin, ShieldCheck, TrendingUp, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { formatCurrency } from '../utils/format';

const budgetFitStyles = {
  'in-range': {
    label: 'In Budget',
    className: 'bg-green-50 text-green-700 border-green-200'
  },
  'slightly-above': {
    label: 'Slightly Above',
    className: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  'value': {
    label: 'Value Option',
    className: 'bg-blue-50 text-blue-700 border-blue-200'
  }
};

const SolutionCard = ({
  solution,
  onViewDetails,
  onCompare,
  showDistance = true,
  compact = false
}) => {
  const budgetFit = budgetFitStyles[solution?.budgetFit] || budgetFitStyles['in-range'];
  const totalCostLabel = solution?.totalCost ? formatCurrency(solution.totalCost) : 'Price on request';
  const services = solution?.services || [];
  const tags = solution?.tags || [];
  const matchScore = solution?.matchScore || 0;
  const vendorCount = solution?.vendorCount || 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all p-4 flex flex-col gap-3">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-bold text-gray-900 truncate">{solution?.title || 'Service Solution'}</h3>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded border flex-shrink-0 ${budgetFit.className}`}>
              {budgetFit.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-600" />
              {matchScore}% match
            </span>
            {vendorCount > 0 && (
              <span>{vendorCount} vendors</span>
            )}
          </div>
        </div>
      </div>

      {/* Cost & Distance Row */}
      <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
        <div>
          <div className="text-xs text-gray-600">Total Cost</div>
          <div className="text-lg font-bold text-gray-900">{totalCostLabel}</div>
        </div>
        {showDistance && solution?.distanceKm !== undefined && (
          <div className="text-right">
            <div className="text-xs text-gray-600">Distance</div>
            <div className="text-sm font-semibold text-gray-900 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {solution.distanceKm.toFixed(1)} km
            </div>
          </div>
        )}
      </div>

      {solution?.radiusOk === false && (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
          <ShieldCheck className="w-3 h-3" />
          <span>Outside preferred radius</span>
        </div>
      )}

      {/* Services Breakdown */}
      <div className="space-y-1.5">
        <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Included Services</div>
        {services.length > 0 ? (
          <div className="space-y-1">
            {services.slice(0, 3).map((service, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
                <span className="text-gray-700">{service.serviceType || service.label}</span>
                <span className="font-semibold text-gray-900">
                  {service.cost ? formatCurrency(service.cost) : '—'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-xs text-gray-500">Details available on inquiry</span>
        )}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <button
          onClick={() => onViewDetails?.(solution)}
          className="flex-1 px-3 py-2 bg-indigo-600 text-white text-sm font-semibold rounded hover:bg-indigo-700 transition-colors"
        >
          View Details
        </button>
        <button
          onClick={() => onCompare?.(solution)}
          className="px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:border-gray-400 hover:bg-gray-50 transition-colors"
        >
          Compare
        </button>
      </div>
    </div>
  );
};

export default SolutionCard;
