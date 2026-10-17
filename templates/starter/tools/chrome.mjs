export const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
export const CHROME_ARGS = [...(process.env.CHROME_EXTRA ? process.env.CHROME_EXTRA.split(' ') : []), '--disable-dev-shm-usage', '--no-sandbox', '--force-color-profile=srgb', '--disable-gpu-vsync', '--enable-features=CanvasOopRasterization', '--ignore-gpu-blocklist'];
