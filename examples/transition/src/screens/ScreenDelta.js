import { useState, useCallback } from 'react';
import '../css/ScreenDelta.css';

export function ScreenDelta({ text, onNext, onText, onDetour }) {
  const [ currentText, setText ] = useState(text || '');
  const onChange = useCallback((evt) => {
    const { value } = evt.target;
    setText(value);
    onText?.(value);
  }, [ onText ]);
  const notEmpty = !!currentText.trim();
  return (
    <div className="Screen ScreenDelta">
      <h1 className="title">Delta</h1>
      <textarea value={currentText} onChange={onChange} />
      <div className="control-pane">
        <button onClick={onNext}>Next</button>
      </div>
      {notEmpty && <p>A warning will appear if you use the browser's back and forward buttons</p>}
      {onDetour && <DetourWarning onConfirm={() => onDetour(true)} onCancel={() => onDetour(false)} />}
    </div>
  );
}

function DetourWarning({ onConfirm, onCancel }) {
  return (
    <div className="detour-warning">
      <div className="background" />
      <div className="dialog-box">
        <p>Are you sure you want to abandon changes?</p>
        <div className="buttons">
          <button onClick={onConfirm}>OK</button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
