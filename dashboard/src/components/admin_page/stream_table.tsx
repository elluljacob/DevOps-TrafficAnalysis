import { useStreams } from "@/components/global/stream_list"
import am_styles from '@/styles/admin.module.css'
import cd_styles        from '@/styles/common_dashboard.module.css'


/* ============================================================================
 * StreamTable Component
 * ----------------------------------------------------------------------------
 * Displays the list of streams and provides edit/delete actions.
 * ============================================================================
 */
export function StreamTable({ onEdit, onDelete }: { onEdit: any, onDelete: any }) {

    const { streams, toggleStream } = useStreams()  // Now safe, inside provider

    return (
        <section className={`${cd_styles.indentedBubble} ${am_styles.tableBox}`}>
            <h2 className={cd_styles.secondHeaderFormatSmall}>
                Stream Directory</h2>

            <div className={cd_styles.sectionSeparator}></div>

            <div className={am_styles.tableScroll}>
                <table className={am_styles.cameraTable}>
                    <thead>
                        <tr>
                            <th>Stream ID</th>
                            <th>Location</th>
                            <th>Selected</th>
                            <th></th>
                        </tr>
                    </thead>

                    <tbody>
                        {Object.values(streams).map(stream => (
                            <tr key={stream.ID}>
                                <td>{stream.ID}</td>
                                <td>{stream.loc}</td>
                                <td>
                                    <input
                                        type="checkbox"
                                        checked={stream.selected}
                                        onChange={() => toggleStream(stream.ID)}
                                    />
                                </td>
                                <td className={am_styles.actions}>
                                    <button 
                                        className={am_styles.editLink} 
                                        onClick={() => onEdit(stream)}
                                    >
                                        Edit
                                    </button>
                                    <button 
                                        className={am_styles.deleteLink} 
                                        onClick={() => onDelete(stream)}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    )
}