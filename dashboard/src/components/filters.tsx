
import ft_styles        from '@/styles/filter.module.css'

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
}

export default function SelectDropdown<T extends string>({
    value,
    setValue,
    options
}: Props<T>) {
    return (
        <div className={ft_styles.selectWrapper}>
            <select
                value={value}
                onChange={(e) => setValue(e.target.value as T)}
                className={ft_styles.select}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>

            <div className={ft_styles.selectArrow}>
                <svg
                    className="h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                    />
                </svg>
            </div>
        </div>
    )
}