import '../css/ScreenEcho1.css';

export default function ScreenEcho1({ onNext }) {
  return (
    <div className="Screen ScreenEcho1">
      <h1 className="title">Echo #1</h1>
      <div className="control-pane">
        <button onClick={onNext}>Next</button>
      </div>
    </div>
  );
}
