import { Fragment, Children } from 'react';
import { createPortal } from 'react-dom';
import './css/Explosion.css';

export default class Explosion {
  constructor(methods) {
    this.methods = methods;
    this.previous = null;
    this.container = null;
  }

  to = (async function *(element) {
    const { previous } = this;
    this.previous = element;
    if (previous && !isSameType(previous, element)) {
      if (!this.container) {
        this.container = document.createElement('DIV');
        this.container.className = 'Explosion';
        document.body.appendChild(this.container);
      }
      const { manageEvents } = this.methods;
      const [ on, eventual ] = manageEvents();
      // Video clip coutesy of haciyevisax809793
      // https://www.vecteezy.com/members/haciyevisax809793
      //
      // Fire Explosion Transition To The Camera green screen. Realistic fire explosion transition with alpha channel. Stock Videos by Vecteezy
      // https://www.vecteezy.com/video/11168324-fire-explosion-transition-to-the-camera-green-screen-realistic-fire-explosion-transition-with-alpha-channel
      //
      // Converted to webm using ffmpeg
      const video = <video src="/explosion.webm" autoPlay onPlay={on.videoStart} onEnded={on.videoEnd} />;
      const explosion = createPortal(video, this.container);
      yield <Fragment>{previous}{explosion}</Fragment>;
      await eventual.videoStart;
      await eventual.videoMidpoint.for(1.1).seconds;
      yield <Fragment>{element}{explosion}</Fragment>;
      await eventual.videoEnd;
    }
    yield <Fragment>{element}</Fragment>;
  }).bind(this);

  prevent = () => {
    this.previous = null;
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
