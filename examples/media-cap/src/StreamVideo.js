import { useRef, useEffect } from 'react';

export default function StreamVideo(props) {
  const { srcObject, ...remaining } = props;
  const node = useRef();
  useEffect(() => {
    const video = node.current;
    video.srcObject = srcObject;
    video.play();
    return () => {
      video.pause();
      video.srcObject = null;
    };
  }, [ srcObject ]);
  return <video ref={node} {...remaining} />;
}
