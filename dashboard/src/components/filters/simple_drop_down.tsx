
import ft_styles        from '@/styles/filter.module.css'
import { useState, useRef, useEffect } from 'react'

/* ============================================================================
 * SelectDropdown Component
 * ----------------------------------------------------------------------------
 * Generic reusable dropdown with custom arrow
 * ============================================================================
 */

interface SelectOption<T> {
    label: string
    value: T
}
interface Props<T extends string> {
    value: T
    setValue: (val: T) => void
    options: readonly SelectOption<T>[]
    placeholder: string
}

export default function SelectDropdown<T extends string>({
    value,
    setValue,
    options,
    placeholder = "Select..."
}: Props<T>) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Close when clicking outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const currentLabel = options.find(o => o.value === value)?.label || placeholder

    return (
        <div className={ft_styles.dropdownContainer} ref={containerRef}>
            {/* The Trigger: Reusing the same class as the Searchable Select */}
            <button 
                className={ft_styles.dropdownTrigger} 
                onClick={() => setIsOpen(!isOpen)}
                type="button"
            >
                {currentLabel}
                <span className={ft_styles.chevron}>{isOpen ? '▲' : '▼'}</span>
            </button>

            {/* The Menu: Reusing the bubble design classes */}
            {isOpen && (
                <div className={ft_styles.dropdownMenu}>
                    <div className={ft_styles.optionsList}>
                        {options.map((opt) => (
                            <div 
                                key={opt.value}
                                className={`${ft_styles.optionItem} ${opt.value === value ? ft_styles.active : ''}`}
                                onClick={() => {
                                    setValue(opt.value)
                                    setIsOpen(false)
                                }}
                            >
                                {opt.label}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}