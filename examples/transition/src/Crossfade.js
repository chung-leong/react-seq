import { Fragment, Children } from 'react';
import './css/Crossfade.css';

export class Crossfade {
  constructor(methods) {
    this.methods = methods;
    this.previous = null;
    this.previousKey = 0;
  }

  to = (async function *(element) {
    const { previous, previousKey } = this;
    this.previous = element;
    let currentKey;
    if (!previous || isSameType(previous, element)) {
      currentKey = previousKey;
    } else {
      currentKey = ++this.previousKey;
      const { manageEvents } = this.methods;
      const [ on, eventual ] = manageEvents();
      yield (
        <div className="Crossfade">
          <div key={previousKey} className="out">{previous}</div>
          <div key={currentKey} className="in">{element}</div>
        </div>
      );
      await eventual.transitionReady.for(25).milliseconds;
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
        <div key={currentKey}>{element}</div>
      </div>
    );
  }).bind(this);

  prevent = () => {
    this.previous = null;
    this.previousKey--;
  }
}

function isSameType(el1, el2) {
  if (el1?.type === el2?.type) {
    if (el1?.type === Fragment) {
      const c1 = Children.toArray(el1.props.children);
      const c2 = Children.toArray(el2.props.children);
      if (c1.length !== c2.length) {
        return false;
      }
      for (let i = 0; i < c1.length; i++) {
        if (!isSameType(c1[i], c2[i])) {
          return false;
        }
      }
    }
    return true;
  }
  return false;
}
