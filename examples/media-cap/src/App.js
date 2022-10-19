import './css/App.css';
import { useState, useCallback } from 'react';
import VideoDialogBox from './VideoDialogBox.js';
import PhotoDialogBox from './PhotoDialogBox.js';
import AudioDialogBox from './AudioDialogBox.js';

export default function App() {
  const [ selection, setSelection ] = useState(null);
  const onClose = useCallback(() => setSelection(), []);
  const onCapture = useCallback((result) => {
    console.log(result);
    setSelection();
  }, []);
  return (
    <div>
      <div>
        <ul className="list">
          <li><button onClick={() => setSelection('video')}>VideoDialogBox</button></li>
          <li><button onClick={() => setSelection('photo')}>PhotoDialogBox</button></li>
          <li><button onClick={() => setSelection('audio')}>AudioDialogBox</button></li>
        </ul>
      </div>
      {(() => {
        switch(selection) {
          case 'video':
            return <VideoDialogBox onClose={onClose} onCapture={onCapture} />;
          case 'photo':
            return <PhotoDialogBox onClose={onClose} onCapture={onCapture} />;
          case 'audio':
            return <AudioDialogBox onClose={onClose} onCapture={onCapture} />;
          default:
        }
      })()}
    </div>
  );
}
