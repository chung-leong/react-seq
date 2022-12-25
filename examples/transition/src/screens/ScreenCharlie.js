import '../css/ScreenCharlie.css';

export function ScreenCharlie({ count, onNext }) {
  if (count % 3 === 0) {
    throw new ThirdTimeNotTheCharm(`Thou shalst not count to ${count}`);
  }
  return (
    <div className="Screen ScreenCharlie">
      <h1 className="title">Charlie</h1>
      <h2>Count = {count}</h2>
      <div className="control-pane">
        <button onClick={onNext}>Next</button>
      </div>
    </div>
  );
}

export class ThirdTimeNotTheCharm extends Error {}
