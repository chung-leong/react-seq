import '../css/Screen.css';
import '../css/ScreenFoxtrot.css';

export function ScreenFoxtrot({ onNext }) {
  return (
    <div className="Screen ScreenFoxtrot">
      <h1 className="title">Foxtrot</h1>
      <div className="control-pane">
        <button onClick={onNext}>Start Over</button>
      </div>
    </div>
  );
}
