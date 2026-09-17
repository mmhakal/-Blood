import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create minimal valid PNG files
function createPng(width, height, r, g, b, a = 255) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image data with scanline filters (0 = None)
  const rowLength = width * 4 + 1;
  const rawData = Buffer.alloc(height * rowLength);

  for (let y = 0; y < height; y++) {
    const rowStart = y * rowLength;
    rawData[rowStart] = 0; // Filter: none
    for (let x = 0; x < width; x++) {
      const pixelStart = rowStart + 1 + x * 4;
      // Draw a subtle border or medical pulse
      const isBorder = x === 0 || x === width - 1 || y === 0 || y === height - 1;
      const isPulse = (y >= Math.floor(height * 0.4) && y <= Math.floor(height * 0.6));
      
      rawData[pixelStart] = isBorder ? Math.min(255, r + 40) : r;
      rawData[pixelStart + 1] = isBorder ? Math.min(255, g + 40) : (isPulse ? 255 : g);
      rawData[pixelStart + 2] = isBorder ? Math.min(255, b + 40) : b;
      rawData[pixelStart + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(12 + length);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crcData = Buffer.alloc(4 + length);
  crcData.write(type, 0, 4, 'ascii');
  data.copy(crcData, 4);

  const crc = crc32(crcData);
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

// Standard CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

const iconsDir = path.resolve(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// MediFlow Cyan / Primary Blue: rgb(14, 165, 233)
[16, 32, 48, 128].forEach(size => {
  const png = createPng(size, size, 14, 165, 233, 255);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), png);
  console.log(`Generated icon${size}.png (${size}x${size})`);
});
