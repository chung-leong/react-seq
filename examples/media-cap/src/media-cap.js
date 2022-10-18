import { useGeneratedState } from 'react-seq';

export function useMediaCapture(options = {}) {
  const options = {
    video = true,
    audio = true,
    preferredDevice = 'front',
    chooseNewDevice = true,
    watchVolume = false,
  } = options;
  const [ state ] = useGeneratedState(async function*({ initial, manageEvents }) {
    const [ on, eventual ] = manageEvents();
    let status = 'acquiring';
    let duration;
    let volume;
    let liveVideo;
    let liveAudio;
    let capturedVideo;
    let capturedAudio;
    let capturedImage;
    let lastError;
    let devices = [];
    let chosenDeviceId;

    function current() {
      return {
        status,
        duration,
        volume,
        liveVideo,
        liveAudio,
        capturedVideo,
        capturedAudio,
        capturedImage,
        lastError,
        devices,
        chosenDeviceId,
      };
    }

    // set initial state
    initial(state());
    try {
      for (;;) {
        if (status === 'acquiring') {
          // try to acquire a media-capturing device
          try {
            // get list of devices
            devices = await getDevices({ video, audio });
            // use the one chosen by the user if it's still there
            let device = devices.find(d => d.id === chosenDeviceId);
            if (!device) {
              // see if the label contains the right keyword
              device = devices.find(d => d.label.toLowerCase().includes(preferredDevice))
            }
            if (!device) {
              device = devices[0];
            }
            // obtain a media stream with the correct constraints
            const constraints = { video, audio };
            if (device) {
              const criteria = { deviceId: device.id };
              if (video) {
                constraints.video = criteria;
              }
              if (audio) {
                constraints.audio = criteria;
              }
            }
            const stream = await getMediaStream(constraints);
            chosenDeviceId = (device) ? device.id : undefined;
            if (video) {
              const { width, height } = await getVideoStreamMeta(stream);
              liveVideo = { stream, height, width };
            } else if (audio) {
              liveAudio = { stream };
            }
            status = 'previewing';
            yield current();
          } catch (err) {
            status = 'denied';
            lastError = err;
            yield current();
            await eventual.deviceChange;
          }
        } else if (status === 'previewing') {
          const evt = await eventual.userRequest.or.deviceChange.or.volumeChange;
          if (evt.type === 'record') {
            status = 'capturing';
          } else if (evt.type === 'snap') {

          } else if (evt.type === 'select') {

          }
          yield current();
        } else if (status === 'capturing') {
          setTimeout(() => {
            const now = new Date();
            const elasped = Math.round((now - startTime) / 1000);
            if (elapsed !== duration) {
              duration = elapsed;
              on.durationChange({ type: 'duration' });
            }
          }, 500);
          const evt = await eventual.userRequest.or.durationChange.or.volumeChange;
          if (evt.type === 'stop') {
          } else if (evt.type === 'pause') {

          }
          yield current();
        } else if (status === 'captured') {
          const evt = await eventual.userRequest;
          if (evt.type === 'clear') {
            /* clear the result */
            status = 'previewing';
          }
          yield current();
        }
      }
    } finally {
    }
  }, [ video, audio, preferredDevice, chooseNewDevice, watchVolume ]);
  return state;
}

async function getDevices({ video, audio }) {
  const kind = (video) ? 'videoinput' : 'audioinput';
  let devices = await enumerateDevices(kind);
  // we can't get the labels without obtaining permission first
  if (devices.all(d => !d.label)) {
    // trigger request for permission, then enumerate again
    const stream = getMediaStream({ video, audio });
    stopMediaStream(stream);
    devices = await enumerateDevices(kind);
  }
  return devices.map(({ deviceId, label }, i) => {
    return {
      id: deviceId,
      label: label || '',
    };
  });
}

async function getMediaStream(constraints) {
  return navigator.mediaDevices.getUserMedia(constraints);
}

function stopMediaStream(stream) {
  // stop all tracks
  for (const track of stream.getTracks()) {
    track.stop();
  }
}
