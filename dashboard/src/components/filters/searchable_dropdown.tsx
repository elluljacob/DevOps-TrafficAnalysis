'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import ft_styles from '@/styles/filter.module.css'

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
    const containerRef = useRef<HTMLDivElement>(null) // Ref for the whole component
    const inputRef = useRef<HTMLInputElement>(null)

    // Handle clicking outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const filteredOptions = useMemo(() => {
        return options.filter(opt => 
            opt.label.toLowerCase().includes(search.toLowerCase())
        )
    }, [options, search])

    const currentLabel = options.find(o => o.value === value)?.label || placeholder

    useEffect(() => {
        if (isOpen) inputRef.current?.focus()
    }, [isOpen])

    return (
        /* Removed onMouseLeave, added containerRef */
        <div className={ft_styles.dropdownContainer} ref={containerRef}>
            <button 
                className={ft_styles.dropdownTrigger} 
                onClick={() => setIsOpen(!isOpen)}
                type="button"
            >
                {currentLabel}
                <span className={ft_styles.chevron}>{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
                <div className={ft_styles.dropdownMenu}>
                    <div className={ft_styles.searchWrapper}>
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Search cameras..."
                            className={ft_styles.internalSearch}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className={ft_styles.optionsList}>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(opt => (
                                <div 
                                    key={opt.value}
                                    className={`${ft_styles.optionItem} ${opt.value === value ? ft_styles.active : ''}`}
                                    onClick={() => {
                                        setValue(opt.value)
                                        setIsOpen(false)
                                        setSearch('')
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