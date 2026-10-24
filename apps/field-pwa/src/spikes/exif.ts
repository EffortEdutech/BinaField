// Minimal JPEG EXIF check: is there an Exif APP1 segment, and does IFD0 point at a GPS IFD (tag 0x8825)?
export function exifInfo(buf: ArrayBuffer): { jpeg: boolean; exif: boolean; gpsTag: boolean } {
  const v = new DataView(buf);
  if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return { jpeg: false, exif: false, gpsTag: false };
  let o = 2;
  while (o + 4 < v.byteLength) {
    if (v.getUint8(o) !== 0xff) break;
    const marker = v.getUint8(o + 1); const len = v.getUint16(o + 2);
    if (marker === 0xe1 && v.getUint32(o + 4) === 0x45786966) { // "Exif"
      const t = o + 10; const little = v.getUint16(t) === 0x4949;
      const ifd = t + v.getUint32(t + 4, little); const n = v.getUint16(ifd, little);
      for (let i = 0; i < n; i++) if (v.getUint16(ifd + 2 + i * 12, little) === 0x8825) return { jpeg: true, exif: true, gpsTag: true };
      return { jpeg: true, exif: true, gpsTag: false };
    }
    if (marker === 0xda) break;
    o += 2 + len;
  }
  return { jpeg: true, exif: false, gpsTag: false };
}
