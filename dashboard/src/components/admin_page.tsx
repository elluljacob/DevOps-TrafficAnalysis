'use client'

import React, { useState } from 'react'
import am_styles from '@/styles/admin.module.css'
import cd_styles from '@/styles/common_dashboard.module.css'
import { StreamObject } from '@/types/stream';
import { StreamProvider, useStreams} from '@/components/global/stream_list';
import { StreamForm } from '@/components/admin_page/stream_form';
import { StreamTable } from '@/components/admin_page/stream_table';

/* ============================================================================
 * AdminPage Component
 * ----------------------------------------------------------------------------
 * Root admin dashboard page combining camera table and form editor.
 * ============================================================================
 */
/* ============================================================================
 * AdminPage Component
 * ----------------------------------------------------------------------------
 * Wrapped in StreamProvider so useHandlers can access the refresh logic.
 * ============================================================================
 */
export default function AdminPage() {
    return (
        <StreamProvider>
            <AdminContent />
        </StreamProvider>
    )
}

function AdminContent() {
    const handlers = useHandlers()

    return (
        <div className={`${am_styles.pageContainer} ${cd_styles.bubble}`}>
            <StreamForm
                data             ={handlers.formData}
                password         ={handlers.password}
                isEditing        ={handlers.isEditing}
                onChange         ={handlers.handleInputChange}
                onPasswordChange ={handlers.setPassword}
                onSubmit         ={handlers.handleSubmit}
                onCancel         ={handlers.resetForm}
            />
            {/* StreamTable now correctly sits inside the Provider via AdminPage */}
            <StreamTable
                onEdit      ={handlers.handleEdit}
                onDelete    ={handlers.handleDelete}
            />
        </div>
    )
}





/* ============================================================================
 * Empty Camera Template
 * ----------------------------------------------------------------------------
 * Default state used when creating a new camera or resetting the form.
 * ============================================================================
 */
const emptyCamera: StreamObject = {
    ID: '',
    loc: '',
    url: '',
    lat: 0,
    long: 0
}


/* ============================================================================
 * handlers Hook
 * ----------------------------------------------------------------------------
 * Manages camera form state, editing mode, and validation logic.
 * ============================================================================
 */
function useHandlers() {
    const { refresh                 } = useStreams(); // <- get refresh from context
    const [cameras  , setCameras    ] = useState<StreamObject[]>([])
    const [formData , setFormData   ] = useState<StreamObject>(emptyCamera)
    const [password , setPassword   ] = useState('')
    const [isEditing, setIsEditing  ] = useState(false)

    /* -------------------------------------------------------------------
     * Input change Handler
     * ------------------------------------------------------------------- */
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target
        const parsed = type === "number" ? Number(value) : value

        setFormData({ ...formData, [name]: parsed })
    }
    
    /* -------------------------------------------------------------------
     * Reset Handler
     * ------------------------------------------------------------------- */
    const resetForm = () => {
        setFormData(emptyCamera);   setPassword('');   setIsEditing(false)
    }
    
    /* -------------------------------------------------------------------
     * Editing State Handler
     * ------------------------------------------------------------------- */
    const handleEdit = (stream: StreamObject) => {
        setFormData(stream); setIsEditing(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    

    /* ====================================================================
     * API Handlers
     * ==================================================================== */


    /* -------------------------------------------------------------------
     * API: Delete Handler
     * ------------------------------------------------------------------- */
    const handleDelete = async (stream: StreamObject) => {
        if (!password) return alert("Enter admin password in the form first to delete")
        if (!confirm(`Are you sure you want to delete ${stream.ID}?`)) return

        try {
            const res = await fetch(`/api/admin?id=${stream.ID}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || "Delete failed")
            }

            await refresh() // <- force global list update
        } catch (err: any) {
            console.error("Delete error:", err)
            alert(err.message || "Network error")
        }
    }
    /* -------------------------------------------------------------------
     * API: Submission Handler (Add/Update)
     * ------------------------------------------------------------------- */
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        if (!password) return alert("Password required")
        if (formData.lat < -90 || formData.lat > 90) return alert("Latitude error (-90 to 90)")
        if (formData.long < -180 || formData.long > 180) return alert("Longitude error (-180 to 180)")

        try {
            const res = await fetch('/api/admin', {
                method: isEditing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Ensure password is included in the body
                body: JSON.stringify({ ...formData, password }) 
            })

            const result = await res.json()

            if (!res.ok) {
                throw new Error(result.error || "Action failed")
            }

            // ONLY reset if the server confirmed success
            await refresh() 
            resetForm()
            alert(isEditing ? "Updated successfully!" : "Added successfully!")
            
        } catch (err: any) {
            console.error("Submit error:", err)
            // Form stays filled so user can fix the error (e.g., wrong password)
            alert(err.message || "Network error")
        }
    }




    /* ====================================================================
     * Return
     * ==================================================================== */
    return {
        cameras,            formData,       password,       isEditing,
        handleInputChange,  handleSubmit,   handleEdit,     handleDelete,
        resetForm,          setPassword
    }
}


