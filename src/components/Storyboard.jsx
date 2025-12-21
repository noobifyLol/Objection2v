import React from 'react'

export default function Storyboard({ open, onClose, onStartCase, cases }) {
  if (!open) return null;

  return (
    <div className="tutorial-modal" onClick={onClose}>
      <div className="tutorial-card" onClick={(e) => e.stopPropagation()} style={{maxWidth: '900px'}}>
        <h3>Courtroom Story Mode</h3>
        <p>Pick a case and embark on a courtroom journey: collect exhibits, call witnesses, present evidence, and persuade Judge Gemini.</p>

        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxHeight: '60vh', overflow: 'auto'}}>
          {cases.map((c, idx) => (
            <div key={idx} style={{padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.03)'}}>
              <div style={{display: 'flex', justifyContent:'space-between', alignItems: 'center'}}>
                <div>
                  <strong style={{fontSize: 16}}>{c.title}</strong>
                  <div style={{fontSize: 13, color: 'rgba(255,255,255,0.8)'}}>{c.summary}</div>
                </div>
                <div>
                  <button className="btn btn-primary small" onClick={() => onStartCase(c)}>Start</button>
                </div>
              </div>

              <div style={{marginTop: 8, fontSize: 13}}>
                <div><strong>Witnesses:</strong> {c.witnesses.map(w=>w.name).join(', ')}</div>
                <div style={{marginTop:6}}><strong>Exhibits:</strong> {c.exhibits.map(e=>e.id).join(', ')}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="tutorial-actions">
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
