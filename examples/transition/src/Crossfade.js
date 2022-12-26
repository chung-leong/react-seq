import { delay } from './react-seq/index.js';
import './css/Crossfade.css';

export class Crossfade {
  constructor(methods) {
    this.methods = methods;
    this.previous = null;
    this.key = 0;
  }

  async *run(element) {
    const { previous } = this;
    const previousKey = this.key++;
    const currentKey = this.key;
    this.previous = element;
    if (previous) {
      const { manageEvents } = this.methods;
      const [ on, eventual ] = manageEvents();
      yield (
        <div className="Crossfade">
          <div key={previousKey} className="out">{previous}</div>
          <div key={currentKey} className="in">{element}</div>
        </div>
      );
      await delay(25);
      yield (
        <div className="Crossfade">
          <div key={previousKey} className="out end" onTransitionEnd={on.transitionOut}>{previous}</div>
          <div key={currentKey} className="in end" onTransitionEnd={on.transitionIn}>{element}</div>
        </div>
      );
      await eventual.transitionIn.and.transitionOut;
    }
    yield (
      <div className="Crossfade">
        <div key={currentKey}>
          {element}
        </div>
      </div>
    );
  }

  to = element => this.run(element)
}
