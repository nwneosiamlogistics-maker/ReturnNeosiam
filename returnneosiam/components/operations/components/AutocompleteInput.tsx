import React, { useState, useRef, useEffect } from 'react';

interface AutocompleteProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: string[];
    placeholder?: string;
    required?: boolean;
}

export const AutocompleteInput: React.FC<AutocompleteProps> = ({ label, value, onChange, options, placeholder, required }) => {
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
        <div className="relative" ref={wrapperRef}>
            <label className="block text-sm font-medium text-black mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
            <input
                type="text"
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-black"
                value={value}
                onChange={(e) => { onChange(e.target.value); setIsOpen(true); }}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                required={required}
            />
            {isOpen && filtered.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-96 overflow-y-auto">
                    {filtered.map((opt, i) => (
                        <button
                            key={i}
                            type="button"
                            className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 text-black block border-b border-slate-50 last:border-0"
                            onClick={() => { onChange(opt); setIsOpen(false); }}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
