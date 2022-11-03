# Media Capture Example

In this example, we're going to create a React hook that allows a component to capture image, video, or audio. We'll
utilize the [`useSequentialState`](../../doc/useSequentialState.md) hook to help us manage the different stages of
the capturing process.

## Seeing the code in action

Go to the `examples/media-cap` folder. Run `npm install` then `npm start`. A browser window should automatically
open up.

![screen shot](./img/screenshot-1.jpg)

Click on one of the buttons to open up a dialog box that captures the specific type of media.

## The hook consumer

First, let us take a quick look at the [`VideoDialogBox`](./src/VideoDialogBox.js) component:

```js
export default function VideoDialogBox({ onClose, onCapture }) {
  const {
    status,
    liveVideo,
    capturedVideo,
    devices,
    duration,
    volume,
    selectedDeviceId,
    lastError,

    record,
    pause,
    resume,
    stop,
    clear,
    selectDevice,
  } = useMediaCapture({ watchVolume: true });
```

The first thing it does is call the [`useMediaCapture`](./src/media-cap.js) hook, specifying that it wants the
current volume monitored. From the hook it receives a number of state variables (top half) and also functions to
call (bottom half).

Going [further down](.//src/VideoDialogBox.js#L55), within the return statement we seeing the following IIFE:

```js
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
      return <BlobVideo srcObject={capturedVideo.blob} style={size} controls />;
    default:
  }
})()}
```

This is the main content of the dialog box. At the "acquiring" stage, when the browser is asking the user for
permission to use the camera, we simply show an icon. If the user said no, we put a ban icon over it. At the
"previewing" stage, when we have a live video stream, we render a [`StreamVideo`](./src/StreamVideo.js) component,
which simply returns a `<video>` element and attaches the stream. The live video remains through the "recording" and
"paused" stages. When we've reached the "recorded" stage, we render a [`BlobVideo`](./src/BlobVideo), another
simple component tasked simply with managing the URL to the blob.

## The hook

Let us move on and start examining [the hook itself](./src/media-cap.js):

```js
export function useMediaCapture(options = {}) {
  const {
    video = true,
    audio = true,
    preferredDevice = 'front',
    selectNewDevice = true,
    watchVolume = false,
  } = options;
  return useSequentialState(async function*({ initial, mount, manageEvents }) {
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
    let selectedDeviceId;
```

It starts out by extracting some option variables from the object given. Then it proceeds to immediately call
[`useSequentialState`](../../doc/useSequentialState.md). The async generator function is where most of the action
happens.

We make use of three functions provided by `useSequentialState`: `initial` to set the hook's initial state, `mount`
to run code during the `useEffect` phase of the component lifecycle, and `manageEvents` to manage events with the
help of promises.

The generator function begins by declaring variables that will get send to the hook consumer. [Further down](./src/media-cap.js#L24), we see the functions that the hook consumer can call:

```js
    const [ on, eventual ] = manageEvents({});

    function snap(mimeType, quality) {
      on.userRequest({ type: 'snap', mimeType, quality });
    }

    function record(options, segment = undefined, callback = null) {
      on.userRequest({ type: 'record', options, segment, callback });
    }

    function pause() {
      on.userRequest({ type: 'pause' });
    }

    function stop() {
      on.userRequest({ type: 'stop' });
    }

    function resume() {
      on.userRequest({ type: 'resume' });
    }

    function clear() {
      on.userRequest({ type: 'clear' });
    }

    function selectDevice(deviceId) {
      on.userRequest({ type: 'select', deviceId });
    }
```

As you can see, each of them will fulfill the [`eventual.userRequest`](../../doc/manageEvents.md) promise.

We see next the function that packages our local variables into an object, to be delivered to the hook consumer:

```js
    function currentState() {
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
        selectedDeviceId,

        snap,
        record,
        pause,
        stop,
        resume,
        clear,
        selectDevice,
      };
    }
```

The function is first invoked on [line 83](./src/media-video.js) to set the initial state:

```js
    initial(currentState());
```

What follow are functions that deal with the nitty-gritty of the capturing process. We'll skip over these and head to
[line 288](./src/media-cap.js#L288) where [`mount`](../../doc/mount.md) is called:

```js
    mount(() => {
      // let generator code know that the component has mounted
      on.mount();

      // watch for orientation change
      function onOrientationChange(evt) {
        // wait for resize event to occur
        window.addEventListener('resize', async () => {
          if (liveVideo) {
            const el = await createVideoElement(stream);
            if (el.videoWidth !== liveVideo.width || el.videoHeight !== liveVideo.height) {
              liveVideo = { stream, width: el.videoWidth, height: el.videoHeight };
              on.streamChange({ type: 'streamchange' });
            }
          }
        }, { once: true });
      }
      window.addEventListener('orientationchange', onOrientationChange);
      navigator.mediaDevices.addEventListener('devicechange', on.deviceChange);

      // watch for permission change
      navigator.permissions.query({ name: 'camera' }).then((cameraStatus) => {
        cameraStatus.onchange = on.permissionChange;
      }, () => {});
      navigator.permissions.query({ name: 'microphone' }).then((microphoneStatus) => {
        microphoneStatus.onchange = on.permissionChange;
      }, () => {});
      return () => {
        window.removeEventListener('orientationchange', onOrientationChange);
        navigator.mediaDevices.removeEventListener('devicechange', on.deviceChange);
      };
    });
```
