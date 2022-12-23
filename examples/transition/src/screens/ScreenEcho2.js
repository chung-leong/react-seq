import '../css/ScreenEcho2.css';

export function ScreenEcho2({ onNext }) {
  return (
    <div className="Screen ScreenEcho2">
      <h1 className="title">Echo #2</h1>
      <div className="control-pane">
        <button onClick={onNext}>Next</button>
      </div>
    </div>
  );
}
