import { useState } from 'react'
import { useStreams } from "@/components/global/stream_list"
import am_styles from '@/styles/admin.module.css'
import cd_styles from '@/styles/common_dashboard.module.css'

export function StreamTable({ onEdit, onDelete }: { onEdit: any, onDelete: any }) {
    const { streams, toggleStream } = useStreams()
    const [searchQuery, setSearchQuery] = useState('')

    // Dynamic Filter: Matches ID or Location (case-insensitive)
    const filteredStreams = Object.values(streams).filter(stream => 
        stream.ID.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stream.loc.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <section className={`${cd_styles.indentedBubble} ${am_styles.tableBox}`}>
            <div className={am_styles.tableHeaderArea}>
                <h2 className={cd_styles.secondHeaderFormatSmall}>Stream Directory</h2>
                
                {/* Search Bar */}
                <input 
                    type="text"
                    placeholder="Search by ID or Location..."
                    className={am_styles.tableSearch}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className={cd_styles.sectionSeparator}></div>

            <div className={am_styles.tableScroll}>
                <table className={am_styles.cameraTable}>
                    <thead>
                        <tr>
                            <th className={`${cd_styles.thirdHeaderFormatSmall}`}>Stream ID</th>
                            <th className={`${cd_styles.thirdHeaderFormatSmall}`}>Location</th>
                            <th className={`${am_styles.centeredCol} ${cd_styles.thirdHeaderFormatSmall}`}>Active</th>
                            <th className={`${am_styles.centeredCol} ${cd_styles.thirdHeaderFormatSmall}`}>Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filteredStreams.map(stream => (
                            <tr key={stream.ID}>
                                <td>{stream.ID}</td>
                                <td>{stream.loc}</td>
                                <td className={am_styles.centeredCol}>
                                    <input
                                        type="checkbox"
                                        checked={stream.selected}
                                        onChange={() => toggleStream(stream.ID)}
                                        className={am_styles.checkbox}
                                    />
                                </td>
                                <td className={`${am_styles.actions} ${am_styles.centeredCol}`}>
                                    <button className={am_styles.editLink} onClick={() => onEdit(stream)}>Edit</button>
                                    <button className={am_styles.deleteLink} onClick={() => onDelete(stream)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    )
}