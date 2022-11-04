import { useRef, useEffect } from 'react';

export default function BlobVideo(props) {
  const { srcObject, ...remaining } = props;
  const node = useRef();
  useEffect(() => {
    const video = node.current;
    video.src = URL.createObjectURL(srcObject);
    return () => {
      URL.revokeObjectURL(video.src);
    };
  }, [ srcObject ]);
  return <video ref={node} {...remaining} />;
}
