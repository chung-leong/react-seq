import '../css/Screen.css';
import '../css/ScreenAlfa.css';

export function ScreenAlfa({ onNext }) {
  return (
    <div className="Screen ScreenAlfa">
      <h1 className="title">Alfa</h1>
      <div className="control-pane">
        <button onClick={onNext}>Next</button>
      </div>
    </div>
  );
}
