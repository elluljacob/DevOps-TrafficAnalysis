'use client'

import React, { useState } from 'react'
import am_styles from '@/styles/admin.module.css'
import cd_styles from '@/styles/common_dashboard.module.css'
import { StreamObject } from '@/types/stream';
import { StreamProvider, useStreams} from '@/components/global/stream_list';
import { StreamForm } from '@/components/admin_page/stream_form';
import { StreamTable } from '@/components/admin_page/stream_table';
import { PasswordModal } from './admin_page/password_popup';

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
    const handlers = useHandlers()

    return (
        <div className={`${am_styles.pageContainer} ${cd_styles.bubble}`}>
            {/* 1. Add the Modal here so it can actually appear */}
            <PasswordModal 
                isOpen={handlers.isModalOpen} 
                onClose={() => handlers.setModalOpen(false)} 
                onConfirm={handlers.confirmSubmit} 
            />

            <StreamForm
                data             ={handlers.formData}
                password         ={handlers.password}
                isEditing        ={handlers.isEditing}
                onChange         ={handlers.handleInputChange}
                onPasswordChange ={handlers.setPassword}
                onSubmit         ={handlers.handleSubmit}
                onCancel         ={handlers.resetForm}
            />
            
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
    const [isModalOpen, setModalOpen]                   = useState(false);
    const [modalAction, setModalAction]                 = useState<'SAVE' | 'DELETE' | null>(null);
    const [pendingDeleteStream, setPendingDeleteStream] = useState<StreamObject | null>(null);

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
    const handleDelete = (stream: StreamObject) => {
        // Instead of window.confirm, we use the SSH Modal
        setPendingDeleteStream(stream);
        setModalAction('DELETE');
        setModalOpen(true);
    };
    /* -------------------------------------------------------------------
     * API: Submission Handler (Add/Update)
     * ------------------------------------------------------------------- */
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Re-adding your validation checks here:
        if (formData.lat < -90 || formData.lat > 90) {
            return alert("Latitude error (-90 to 90)");
        }
        if (formData.long < -180 || formData.long > 180) {
            return alert("Longitude error (-180 to 180)");
        }
        if (!formData.ID || !formData.url) {
            return alert("ID and URL are required");
        }

        // Only if validation passes, we open the modal
        setModalAction('SAVE');
        setModalOpen(true);
    };

    const confirmSubmit = async (enteredPassword: string) => {
        if (!enteredPassword) return alert("Password required.");

        try {
            if (modalAction === 'SAVE') {
                const res = await fetch('/api/admin', {
                    method: isEditing ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...formData, password: enteredPassword })
                });
                if (!res.ok) throw new Error((await res.json()).error || "Save failed");
                
                alert(isEditing ? "Updated successfully!" : "Added successfully!");
            } 
            
            else if (modalAction === 'DELETE' && pendingDeleteStream) {
                const res = await fetch(`/api/admin?id=${pendingDeleteStream.ID}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: enteredPassword })
                });
                if (!res.ok) throw new Error((await res.json()).error || "Delete failed");
                
                alert(`Stream ${pendingDeleteStream.ID} deleted.`);
            }

            // Common Success Logic
            await refresh();
            setModalOpen(false);
            resetForm();
            setPendingDeleteStream(null);
            setModalAction(null);

        } catch (err: any) {
            console.error("Auth Error:", err);
            alert(err.message || "Action failed");
        }
    };


    /* ====================================================================
     * Return
     * ==================================================================== */
    return {
        cameras,            formData,       password,       isEditing,
        handleInputChange,  handleSubmit,   handleEdit,     handleDelete,
        resetForm,          setPassword ,  isModalOpen,     setModalOpen, 
        confirmSubmit
    }
}


