import '../css/ScreenBravo.css';

export default function ScreenBravo({ onNext, onSkip }) {
  return (
    <div className="Screen ScreenBravo">
      <h1 className="title">Bravo</h1>
      <div className="control-pane">
        <button onClick={onNext}>Next</button>
        <button onClick={onSkip}>Skip</button>
      </div>
    </div>
  );
}
