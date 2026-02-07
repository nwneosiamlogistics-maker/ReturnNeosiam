import React, { useState, useRef, useEffect } from 'react';

interface LineAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    options: string[];
    placeholder?: string;
    className?: string; // To allow passing the specific line style
    disabled?: boolean;
}

export const LineAutocomplete: React.FC<LineAutocompleteProps> = ({ value, onChange, options, placeholder, className, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filtered = options.filter(opt => opt.toLowerCase().includes((value || '').toLowerCase()));

    return (
        <div className="relative flex-1" ref={wrapperRef}>
            <input
                type="text"
                className={className}
                value={value}
                onChange={(e) => { onChange(e.target.value); if (!disabled) setIsOpen(true); }}
                onFocus={() => { if (!disabled) setIsOpen(true); }}
                placeholder={placeholder}
                disabled={disabled}
                title={placeholder || "Search or select option"}
            />
            {isOpen && filtered.length > 0 && (
                <div className="absolute z-10 w-full left-0 mt-1 bg-white border border-slate-300 shadow-lg max-h-60 overflow-auto rounded-sm print:hidden">
                    {filtered.map((opt, i) => (
                        <button
                            key={i}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 text-slate-700 block border-b border-slate-100 last:border-0"
                            onClick={() => { onChange(opt); setIsOpen(false); }}
                            title={opt}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
