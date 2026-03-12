
import am_styles from '@/styles/admin.module.css'
import { StreamObject } from '@/types/stream';
import cd_styles        from '@/styles/common_dashboard.module.css'


/* ============================================================================
 * InputField Component
 * ----------------------------------------------------------------------------
 * Reusable input wrapper used for all text/number/password inputs in the form.
 * ============================================================================
 */
interface InputOptions {
    label        : string;          name         : string;
    value        : string | number; // This allows the "" trick
    type        ?: string;          min         ?: number;
    max         ?: number;          step        ?: string;
    placeholder ?: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

function InputField(options: InputOptions) {
    return (
        <div className={am_styles.inputGroup}>
            <label className={cd_styles.thirdHeaderFormat}>{options.label}</label>
            <input
                id          ={options.name}     name        ={options.name}
                type        ={options.type}     value       ={options.value}
                min         ={options.min}      max         ={options.max}
                step        ={options.step}     placeholder ={options.placeholder}
                onChange    ={options.onChange} className   ={am_styles.inputField}
                // Optional: select text on click so user can overwrite 0 easily
                onFocus     ={(e) => e.target.select()} 
            />
        </div>
    )
}


/* ============================================================================
 * CoordInput Component
 * ----------------------------------------------------------------------------
 * Specialized input group for handling latitude and longitude values.
 * ============================================================================
 */
interface CoordOptions {
    latitude: number
    longitude: number
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}
function CoordInput(options: CoordOptions) {
    return (
        <div className={am_styles.coordRow}>
            <InputField
                label   ="Latitude"     name        ="lat"
                type    ="number"       
                // If value is 0, send empty string to let placeholder show
                value   ={options.latitude === 0 ? "" : options.latitude} 
                min     ={-90}          max         ={90}
                step    ="any"          onChange    ={options.onChange}
                placeholder="0" // This acts as the "hidden suggestion"
            />

            <InputField
                label   ="Longitude"    name        ="long"
                type    ="number"       
                value   ={options.longitude === 0 ? "" : options.longitude} 
                min     ={-180}         max         ={180}
                step    ="any"          onChange    ={options.onChange}
                placeholder="0"
            />
        </div>
    )
}
/* ============================================================================
 * CameraForm Component
 * ----------------------------------------------------------------------------
 * Handles all camera creation and editing functionality.
 * Uses reusable input components for cleaner UI code.
 * ============================================================================
 */
interface FormOptions {
    data                : StreamObject
    password            : string
    isEditing           : boolean
    onChange            : (e: React.ChangeEvent<HTMLInputElement>) => void
    onPasswordChange    : (value: string) => void
    onSubmit            : (e: React.SubmitEvent<HTMLFormElement>) => void
    onCancel            : () => void
}

export function StreamForm(options: FormOptions) {

    return (

        <section className={`${cd_styles.indentedBubble} ${am_styles.formBox}`}>

            <h2 className={cd_styles.secondHeaderFormatSmall}>
                {options.isEditing ? "Update Camera" : "Add Camera"}
            </h2>
            
            <div className={cd_styles.sectionSeparator}></div>

            <form onSubmit={options.onSubmit} className={am_styles.adminForm}>

                <InputField
                    label="Stream ID"               name="ID"
                    value={options.data.ID}         onChange={options.onChange}
                />

                <InputField
                    label="Location"                name="loc"
                    value={options.data.loc}        onChange={options.onChange}
                />

                <InputField
                    label="Stream URL"              name="url"
                    value={options.data.url}        onChange={options.onChange}
                />

                <CoordInput
                    latitude ={options.data.lat}
                    longitude={options.data.long}
                    onChange ={options.onChange}
                />

                <div className={am_styles.buttons}>

                    <button 
                        type="submit" 
                        className={am_styles.saveBtn}
                        /* Remove onClick={options.onSubmit} from here! 
                        The form's onSubmit handles it. */
                    >
                        <svg className={am_styles.svgIcon}>
                            <use href="/save.svg#icon" />
                        </svg>
                    </button>

                    {options.isEditing &&
                        <button
                            type="button"
                            className={am_styles.cancelBtn}
                            onClick={options.onCancel}
                        >
                            <svg>
                                <use href="/cancel.svg#icon" />
                            </svg>
                        </button>
                    }

                </div>

            </form>

        </section>
    )
}
