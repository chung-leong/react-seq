import { useCallback, useEffect } from 'react';
import { useMediaCapture } from './media-cap.js';
import { constrainSize } from './utils.js';
import StreamVideo from './StreamVideo.js';
import BlobImage from './BlobImage.js';

export default function PhotoDialogBox({ onClose, onCapture }) {
  const {
    status,
    liveVideo,
    capturedImage,
    devices,
    selectedDeviceId,
    lastError,
    snap,
    clear,
    selectDevice,
  } = useMediaCapture({ watchVolume: false });
  const classNames = [ 'video-viewport', status ];
  const size = constrainSize(liveVideo, { width: 320, height: 240 });

  const onSnap = useCallback(() => snap('image/jpeg', 90), [ snap ]);
  const onRetake = useCallback(() => clear(), [ clear ]);
  const onAccept = useCallback(() => onCapture(capturedImage), [ onCapture, capturedImage ]);

  useEffect(() => {
    if (lastError) {
      console.error(lastError);
    }
  }, [ lastError ])

  return (
    <div className="overlay">
      <div className="dialog-box video">
        <div className="title">
          Image Capture
          <i className="fa fa-window-close" onClick={onClose} />
        </div>
        <div className={classNames.join(' ')} style={size}>
          {(() => {
            switch(status) {
              case 'acquiring':
                return (
                  <span className="fa-stack fa-lg">
                    <i className="fa fa-video fa-stack-1x" />
                  </span>
                );
              case 'denied':
                return (
                  <span className="fa-stack fa-lg">
                    <i className="fa fa-video fa-stack-1x" />
                    <i className="fa fa-ban fa-stack-2x" />
                  </span>
                );
              case 'previewing':
              case 'recording':
              case 'paused':
                return <StreamVideo srcObject={liveVideo.stream} style={size} muted />;
              case 'recorded':
                return <BlobImage srcObject={capturedImage.blob} style={size} controls />;
              default:
            }
          })()}
        </div>
        <div className="controls">
        {(() => {
          if (!devices || devices.length <= 1) {
            return <div className="devices" />;
          } else {
            return (
              <div className="devices">
                <select onChange={evt => selectDevice(evt.target.value)} value={selectedDeviceId}>
                  {
                    devices.map(({ label, id }) => {
                      label = label.replace(/\([0-9a-f]{4}:[0-9a-f]{4}\)/, '');
                      return <option value={id} key={id}>{label}</option>
                    })
                  }
                </select>
              </div>
            );
          }
        })()}
        {(() => {
          switch (status) {
            case 'acquiring':
            case 'denied':
            case 'previewing':
              return (
                <div className="buttons">
                  <button onClick={onClose}>Cancel</button>
                  <button onClick={onSnap} disabled={status !== 'previewing'}>Take</button>
                </div>
              );
            case 'recorded':
              return (
                <div className="buttons">
                  <button onClick={onRetake}>Retake</button>
                  <button onClick={onAccept} disabled={status !== 'recorded'}>Accept</button>
                </div>
              );
            default:
          }
        })()}
        </div>

      </div>
    </div>
  );
}
