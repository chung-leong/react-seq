import '../css/ScreenEcho4.css';

export default function ScreenEcho4({ onNext }) {
  return (
    <div className="Screen ScreenEcho4">
      <h1 className="title">Echo #4</h1>
      <div className="control-pane">
        <button onClick={onNext}>Next</button>
      </div>
    </div>
  );
}
