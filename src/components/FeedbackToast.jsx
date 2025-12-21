import React, { useEffect } from 'react'

export default function FeedbackToast({ open, onClose, content }) {
  // content = { type: 'info'|'success'|'error', title, message }
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => onClose?.(), 5000);
      return () => clearTimeout(t);
    }
  }, [open, onClose]);

  if (!open || !content) return null;

  return (
    <div className={`feedback-toast ${content.type || 'info'}`} role="status" aria-live="polite">
      <div className="toast-header">
        <strong>{content.title}</strong>
        <button className="toast-close" onClick={() => onClose?.()}>✕</button>
      </div>
      <div className="toast-body">{content.message}</div>
    </div>
  )
}
