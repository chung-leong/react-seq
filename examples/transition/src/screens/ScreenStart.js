import '../css/Screen.css';
import '../css/ScreenStart.css';

export function ScreenStart({ onNext }) {
  return (
    <div className="Screen ScreenStart">
      <h1 className="title">Start</h1>
      <div className="control-pane">
        <button onClick={onNext}>Next</button>
      </div>
    </div>
  );
}
