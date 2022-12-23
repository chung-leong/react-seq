import '../css/Screen.css';
import '../css/ScreenEcho3.css';

export function ScreenEcho3({ onNext }) {
  return (
    <div className="Screen ScreenEcho3">
      <h1 className="title">Echo #3</h1>
      <div className="control-pane">
        <button onClick={onNext}>Next</button>
      </div>
    </div>
  );
}
