import '../css/Screen.css';
import '../css/ScreenCharlie.css';

export function ScreenCharlie({ onNext }) {
  return (
    <div className="Screen ScreenCharlie">
      <h1 className="title">Charlie</h1>
      <div className="control-pane">
        <button onClick={onNext}>Next</button>
      </div>
      <p>The browser's back and forward buttons don't work on this screen</p>
    </div>
  );
}
