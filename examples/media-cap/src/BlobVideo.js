import { useMemo, useEffect } from 'react';

export default function BlobVideo(props) {
  const { srcObject, ...remaining } = props;
  const url = useMemo(() => URL.createObjectURL(srcObject), [ srcObject ]);
  useEffect(() => {
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [ url ]);
  return <video src={url} {...remaining} />;
}
