# Media Capture Example

In this example, we're going to create a React hook that allows a component to capture image, video, or audio. We'll
utilize the [`useSequentialState`](../../doc/useSequentialState.md) hook to help us manage the different stages of
the capturing process.

## Seeing the example in action

Go to the folder `examples/media-cap`. Run `npm install` then `npm start`. A browser window should automatically
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

Going further down, within the return statement we seeing the following IIFE:

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
