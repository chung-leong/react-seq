import { useRef, useEffect } from 'react';

export default function BlobAudio(props) {
  const { srcObject, ...remaining } = props;
  const node = useRef();
  useEffect(() => {
    const audio = node.current;
    audio.src = URL.createObjectURL(srcObject);
    return () => {
      URL.revokeObjectURL(audio.src);
    };
  }, [ srcObject ]);
  return <audio ref={node} {...remaining} />;
}
