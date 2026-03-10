'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import ft_styles from '@/styles/filter.module.css' // Using your existing styles

interface Option {
    label: string
    value: string
}

export default function SearchableSelect({ 
    options, 
    value, 
    setValue, 
    placeholder = "Select Camera..." 
}: { 
    options: Option[], 
    value: string, 
    setValue: (val: string) => void,
    placeholder?: string
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    // Filter options based on internal search
    const filteredOptions = useMemo(() => {
        return options.filter(opt => 
            opt.label.toLowerCase().includes(search.toLowerCase())
        )
    }, [options, search])

    // Find the current label for the button display
    const currentLabel = options.find(o => o.value === value)?.label || placeholder

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen) inputRef.current?.focus()
    }, [isOpen])

    return (
        <div className={ft_styles.dropdownContainer} onMouseLeave={() => setIsOpen(false)}>
            {/* The Trigger Button */}
            <button 
                className={ft_styles.dropdownTrigger} 
                onClick={() => setIsOpen(!isOpen)}
                type="button"
            >
                {currentLabel}
                <span className={ft_styles.chevron}>{isOpen ? '▲' : '▼'}</span>
            </button>

            {/* The Menu */}
            {isOpen && (
                <div className={ft_styles.dropdownMenu}>
                    {/* 1. The Search Box (First Element) */}
                    <div className={ft_styles.searchWrapper}>
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Search cameras..."
                            className={ft_styles.internalSearch}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()} // Prevent closing
                        />
                    </div>

                    {/* 2. The Options List */}
                    <div className={ft_styles.optionsList}>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(opt => (
                                <div 
                                    key={opt.value}
                                    className={`${ft_styles.optionItem} ${opt.value === value ? ft_styles.active : ''}`}
                                    onClick={() => {
                                        setValue(opt.value)
                                        setIsOpen(false)
                                        setSearch('') // Reset search on select
                                    }}
                                >
                                    {opt.label}
                                </div>
                            ))
                        ) : (
                            <div className={ft_styles.noResults}>No streams found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}