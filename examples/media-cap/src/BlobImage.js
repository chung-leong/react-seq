import { useRef, useEffect } from 'react';

export default function BlobImage(props) {
  const { srcObject, ...remaining } = props;
  const node = useRef();
  useEffect(() => {
    const image = node.current;
    image.src = URL.createObjectURL(srcObject);
    return () => {
      URL.revokeObjectURL(image.src);
    };
  }, [ srcObject ]);
  // eslint-disable-next-line
  return <img ref={node} {...remaining} />;
}
