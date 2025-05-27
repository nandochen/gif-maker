const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const GIFEncoder = require('gifencoder');

async function getPngFilesFromDirectory(directoryPath) {
  return new Promise((resolve, reject) => {
    fs.readdir(directoryPath, (err, files) => {
      if (err) return reject(err);
      
      // Filter for PNG files and sort them
      const pngFiles = files.filter(file => {
          const isPng = path.extname(file).toLowerCase() === '.png';
          const isNotHidden = !file.startsWith('._');
          return isPng && isNotHidden;
        })
        .sort() // Simple alphabetical sort - adjust as needed
        .map(file => path.join(directoryPath, file));
      
      resolve(pngFiles);
    });
  });
}

async function createAnimatedGif(pngFiles, outputPath, options = {}) {
  // Default options
  const {
    width = 200,
    height = 200,
    delay = 500, // milliseconds between frames
    repeat = 0, // 0 = loop forever, null = don't loop
    quality = 20, // lower is better quality (1-20)
    transparent = true, // enable transparency
    transparentColor = 0x000000 // color to make transparent (black by default)
  } = options;

  // Create encoder
  const encoder = new GIFEncoder(width, height);
  
  // Pipe the GIF output to a file
  const stream = encoder.createReadStream().pipe(fs.createWriteStream(outputPath));
  
  // Configure the encoder
  encoder.start();
  encoder.setRepeat(repeat);
  encoder.setDelay(delay);
  encoder.setQuality(quality);
  
  // Set transparency if enabled
  if (transparent) {
    encoder.setTransparent(transparentColor);
  }

  // Create a canvas to draw each frame
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d', { alpha: true }); // Enable alpha channel

  // Process each PNG file
  for (const file of pngFiles) {
    try {
      const image = await loadImage(file);
      
      // Clear canvas with transparent background
      ctx.clearRect(0, 0, width, height);
      
      // If you want to fill with a color for debugging transparency:
      // ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'; // semi-transparent red
      // ctx.fillRect(0, 0, width, height);
      
      // Draw the image on canvas (preserving transparency)
      ctx.drawImage(image, 0, 0, width, height);
      
      // Add frame to GIF
      encoder.addFrame(ctx);
    } catch (err) {
      console.error(`Error processing ${file}:`, err);
    }
  }

  // Finalize the GIF
  encoder.finish();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
} 

// Example usage: 
const basePath = './purple/' 
const outputPath = 'purple.gif';
const frameDelay = 76; // milliseconds
const wh = 64;

// Example usage
(async () => {
  // Get all PNG files from directory
  const pngFiles = await getPngFilesFromDirectory(basePath);

  if (pngFiles.length === 0) {
    console.error('No PNG files found in directory');
    return;
  }

  console.log('Found PNG files:', pngFiles); 

  try {
    await createAnimatedGif(
      pngFiles,
      outputPath,
      { 
        width: wh,
        height: wh,
        delay: frameDelay
      }
    );
    console.log('GIF created with sharp successfully!');
  } catch (err) {
    console.error('Error:', err);
  }
})();