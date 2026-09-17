import React from 'react';

export function SegmentedControl({ options = [], activeValue, onChange }) {
  return (
    <div className="apple-segmented-control">
      {options.map((opt) => {
        const val = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        const isActive = activeValue === val;

        return (
          <button
            key={val}
            type="button"
            className={`apple-segment-item ${isActive ? 'active' : ''}`}
            onClick={() => onChange(val)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
