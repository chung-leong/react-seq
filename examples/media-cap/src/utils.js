export function constrainSize(liveVideo, { width, height }) {
  if (liveVideo) {
    width = liveVideo.width;
    height = liveVideo.height;
  }
  const html = document.body.parentNode;
  const availableWidth = html.clientWidth - 50;
  const availableHeight = html.clientHeight - 100;
  if (width > availableWidth) {
    height = Math.round(height * availableWidth / width);
    width = availableWidth;
  }
  if (height > availableHeight) {
    width = Math.round(width * availableHeight / height);
    height = availableHeight;
  }
  return { width, height };
}
