import '../css/ScreenAlfa.css';

export default function ScreenAlfa({ onNext }) {
  return (
    <div className="Screen ScreenAlfa">
      <h1 className="title">Alfa</h1>
      <div className="control-pane">
        <button onClick={onNext}>Next</button>
      </div>
    </div>
  );
}
