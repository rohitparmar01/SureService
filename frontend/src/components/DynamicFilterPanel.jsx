import React, { useState } from 'react';
import { ChevronDown, ChevronRight, X, SlidersHorizontal } from 'lucide-react';

/**
 * DYNAMIC FILTER PANEL - WORLD-CLASS UI
 * 
 * Universal filter component that renders ANY filter schema
 * - Checkbox, Radio, Range, Multiselect, Hierarchical
 * - Intelligent collapsing and expansion
 * - Mobile-responsive design
 * - Real-time updates
 */

const DynamicFilterPanel = ({ 
  filterSchema, 
  appliedFilters = {}, 
  onFilterChange,
  onClearAll,
  className = '',
  compact = false 
}) => {
  const [expandedSections, setExpandedSections] = useState({});
  const [expandedHierarchy, setExpandedHierarchy] = useState({});

  if (!filterSchema) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  const { universal = [], specific = [], hierarchy = null } = filterSchema;
  const activeCount = Object.keys(appliedFilters).length;

  const toggleSection = (id) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleHierarchy = (id) => {
    setExpandedHierarchy(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleChange = (filterId, value) => {
    if (onFilterChange) onFilterChange(filterId, value);
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${compact ? 'p-3' : 'p-4'} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={onClearAll}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 transition-colors"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Scrollable Filter Area */}
      <div className="space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto pr-2">
        {/* Universal Filters - Always Visible */}
        {universal.length > 0 && (
          <div className="space-y-3">
            {universal.map(filter => (
              <FilterItem
                key={filter.id}
                filter={filter}
                value={appliedFilters[filter.id]}
                onChange={(val) => handleChange(filter.id, val)}
                expanded={expandedSections[filter.id] !== false}
                onToggle={() => toggleSection(filter.id)}
              />
            ))}
          </div>
        )}

        {/* Category-Specific Filters */}
        {specific.length > 0 && (
          <div className="border-t border-gray-200 pt-4 space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Category Filters</h4>
            {specific.map(filter => (
              <FilterItem
                key={filter.id}
                filter={filter}
                value={appliedFilters[filter.id]}
                onChange={(val) => handleChange(filter.id, val)}
                expanded={expandedSections[filter.id] !== false}
                onToggle={() => toggleSection(filter.id)}
              />
            ))}
          </div>
        )}

        {/* Hierarchical Filters */}
        {hierarchy && hierarchy.categories && hierarchy.categories.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Browse by Category</h4>
            {hierarchy.categories.map(category => (
              <HierarchyNode
                key={category.id}
                node={category}
                level={0}
                expanded={expandedHierarchy[category.id] || category.expanded}
                onToggle={() => toggleHierarchy(category.id)}
                appliedFilters={appliedFilters}
                onFilterChange={handleChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Individual Filter Item
 */
const FilterItem = ({ filter, value, onChange, expanded, onToggle }) => {
  if (!filter) return null;

  const { type, label, icon, badge, options, min, max, step, unit, presets } = filter;

  return (
    <div className="border-b border-gray-100 pb-3 last:border-0">
      {/* Filter Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left mb-2 hover:text-indigo-600 transition-colors group"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-base">{icon}</span>}
          <span className="text-sm font-medium text-gray-800 group-hover:text-indigo-600">
            {label}
          </span>
          {badge && (
            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Filter Content */}
      {expanded && (
        <div className="mt-2 ml-6">
          {type === 'checkbox' && (
            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
              <input
                type="checkbox"
                checked={!!value}
                onChange={(e) => onChange(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 focus:ring-2"
              />
              <span className="text-sm text-gray-700">Enable</span>
            </label>
          )}

          {type === 'radio' && options && (
            <div className="space-y-1.5">
              {options.map(opt => (
                <label 
                  key={opt.value} 
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                >
                  <input
                    type="radio"
                    name={filter.id}
                    value={opt.value}
                    checked={value === opt.value || (opt.default && !value)}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-4 h-4 border-gray-300 text-indigo-600 focus:ring-indigo-500 focus:ring-2"
                  />
                  <span className="text-sm text-gray-700 flex-1">
                    {opt.icon && <span className="mr-1.5">{opt.icon}</span>}
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          )}

          {type === 'multiselect' && options && (
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {options.map(opt => {
                const isChecked = Array.isArray(value) && value.includes(opt.value);
                return (
                  <label 
                    key={opt.value} 
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const newValue = e.target.checked
                          ? [...(value || []), opt.value]
                          : (value || []).filter(v => v !== opt.value);
                        onChange(newValue);
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 focus:ring-2"
                    />
                    <span className="text-sm text-gray-700 flex-1">
                      {opt.icon && <span className="mr-1.5">{opt.icon}</span>}
                      {opt.label}
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          {type === 'range' && (
            <div className="space-y-3">
              {presets && presets.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {presets.map((preset, idx) => {
                    const isActive = value?.min === (preset.min || min) && value?.max === (preset.max || max);
                    return (
                      <button
                        key={idx}
                        onClick={() => onChange({ min: preset.min || min, max: preset.max || max })}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-200 ${
                          isActive
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Min {unit}</label>
                  <input
                    type="number"
                    value={value?.min || min}
                    onChange={(e) => onChange({ min: Number(e.target.value), max: value?.max || max })}
                    min={min}
                    max={max}
                    step={step || 1}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Max {unit}</label>
                  <input
                    type="number"
                    value={value?.max || max}
                    onChange={(e) => onChange({ min: value?.min || min, max: Number(e.target.value) })}
                    min={min}
                    max={max}
                    step={step || 1}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {type === 'select' && options && (
            <select
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            >
              <option value="">Select {label}</option>
              {options.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Hierarchical Category Node
 */
const HierarchyNode = ({ node, level, expanded, onToggle, appliedFilters, onFilterChange }) => {
  if (!node) return null;

  const hasChildren = node.children && node.children.length > 0;
  const indentClass = level > 0 ? 'ml-4 border-l-2 border-gray-200 pl-3' : '';

  return (
    <div className={indentClass}>
      {/* Node Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 text-left py-2 px-2 hover:bg-gray-50 rounded-md transition-colors"
      >
        {hasChildren && (
          expanded 
            ? <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" /> 
            : <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
        )}
        <span className={`${level === 0 ? 'font-semibold text-gray-800' : 'text-sm text-gray-700'}`}>
          {node.label}
        </span>
      </button>

      {/* Child Nodes */}
      {expanded && hasChildren && (
        <div className="mt-2 space-y-2">
          {node.children.map(child => {
            if (child.children) {
              // Nested hierarchy
              return (
                <HierarchyNode
                  key={child.id}
                  node={child}
                  level={level + 1}
                  expanded={false}
                  onToggle={() => {}}
                  appliedFilters={appliedFilters}
                  onFilterChange={onFilterChange}
                />
              );
            } else {
              // Filter item
              return (
                <FilterItem
                  key={child.id}
                  filter={child}
                  value={appliedFilters[child.id]}
                  onChange={(val) => onFilterChange(child.id, val)}
                  expanded={true}
                  onToggle={() => {}}
                />
              );
            }
          })}
        </div>
      )}
    </div>
  );
};

export default DynamicFilterPanel;
