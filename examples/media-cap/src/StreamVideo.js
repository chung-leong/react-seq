import { useRef, useEffect } from 'react';

export default function StreamVideo(props) {
  const { srcObject, ...remaining } = props;
  const node = useRef();
  useEffect(() => {
    const video = node.current;
    if (video.srcObject !== srcObject) {
      video.srcObject = srcObject;
      video.play();
    }
  }, [ srcObject ]);
  return <video ref={node} {...remaining} />;
}
