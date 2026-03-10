import { useState, useEffect } from "react";
import { createPortal } from 'react-dom';
import cd_styles from '@/styles/common_dashboard.module.css';
import am_styles from '@/styles/admin.module.css';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (password: string) => void;
}

export function PasswordModal({ isOpen, onClose, onConfirm }: ModalProps) {
    const [pwd, setPwd] = useState('');

    // Handle ESC key to close
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleAction = () => {
        onConfirm(pwd);
        setPwd('');
    };

    return createPortal(
        <div className={am_styles.modalOverlay} onClick={onClose}>
            {/* stopPropagation prevents clicking the box from closing the modal */}
            <div className={am_styles.modalContent} onClick={(e) => e.stopPropagation()}>
                
                {/* Minimalist Terminal Header */}
                <div className={am_styles.terminalHeader}>
                    <span className={am_styles.terminalTitle}>Auth</span>
                    <button className={am_styles.closeX} onClick={onClose} title="Close (Esc)">
                        &times;
                    </button>
                </div>
                
                <div className={am_styles.terminalBody}>
                    <p className={am_styles.modalSubtext}>Authentication required</p>
                    
                    <div className={am_styles.sshInputLine}>
                        <input 
                            type="password"
                            autoFocus
                            value={pwd}
                            onChange={(e) => setPwd(e.target.value)}
                            className={am_styles.inputField}
                            onKeyDown={(e) => e.key === 'Enter' && handleAction()}
                        />
                    </div>
                    <p className={am_styles.modalHint}>Press [Enter] to execute or [Esc] to abort</p>
                </div>
            </div>
        </div>,
        document.body
    );
}