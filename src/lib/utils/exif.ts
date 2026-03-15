import { ExifData } from "@/types";

/**
 * Extract EXIF data from an image file
 * Uses browser's built-in capabilities for reading file metadata
 */
export async function extractExifData(file: File): Promise<ExifData> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const result = e.target?.result;
      if (!result || typeof result !== "object") {
        resolve({});
        return;
      }

      const view = new DataView(result as ArrayBuffer);
      const exifData: ExifData = {};

      // Check for JPEG
      if (view.getUint16(0, false) !== 0xffd8) {
        resolve({});
        return;
      }

      const length = view.byteLength;
      let offset = 2;

      while (offset < length) {
        if (view.getUint16(offset, false) === 0xffe1) {
          // Found APP1 marker (EXIF)
          const exifLength = view.getUint16(offset + 2, false);

          // Check for "Exif" string
          if (
            view.getUint32(offset + 4, false) === 0x45786966 &&
            view.getUint16(offset + 8, false) === 0x0000
          ) {
            const tiffOffset = offset + 10;
            const littleEndian = view.getUint16(tiffOffset, false) === 0x4949;

            // Get IFD0 offset
            const ifd0Offset = view.getUint32(tiffOffset + 4, littleEndian);
            const ifd0Start = tiffOffset + ifd0Offset;

            // Read IFD0 entries
            const entryCount = view.getUint16(ifd0Start, littleEndian);

            let fallbackDateTime: Date | undefined;

            for (let i = 0; i < entryCount; i++) {
              const entryOffset = ifd0Start + 2 + i * 12;
              const tag = view.getUint16(entryOffset, littleEndian);

              // DateTime tag (0x0132) - modified time, used as fallback
              if (tag === 0x0132) {
                const valueOffset = view.getUint32(entryOffset + 8, littleEndian);
                const dateStr = readString(view, tiffOffset + valueOffset, 19);
                const parsed = parseExifDateTime(dateStr);
                if (parsed) {
                  fallbackDateTime = parsed;
                }
              }

              // EXIF sub-IFD pointer - contains DateTimeOriginal
              if (tag === 0x8769) {
                const exifIfdOffset = view.getUint32(entryOffset + 8, littleEndian);
                const exifIfdStart = tiffOffset + exifIfdOffset;
                const exifEntryCount = view.getUint16(exifIfdStart, littleEndian);

                for (let j = 0; j < exifEntryCount; j++) {
                  const exifEntryOffset = exifIfdStart + 2 + j * 12;
                  const exifTag = view.getUint16(exifEntryOffset, littleEndian);

                  // DateTimeOriginal (0x9003) - original capture time, not affected by edits
                  if (exifTag === 0x9003) {
                    const valueOffset = view.getUint32(exifEntryOffset + 8, littleEndian);
                    const dateStr = readString(view, tiffOffset + valueOffset, 19);
                    const parsed = parseExifDateTime(dateStr);
                    if (parsed) {
                      exifData.dateTime = parsed;
                    }
                  }
                }
              }
            }

            // Fall back to DateTime (0x0132) if DateTimeOriginal not found
            if (!exifData.dateTime && fallbackDateTime) {
              exifData.dateTime = fallbackDateTime;
            }

            // Find GPS IFD
            for (let i = 0; i < entryCount; i++) {
              const entryOffset = ifd0Start + 2 + i * 12;
              const tag = view.getUint16(entryOffset, littleEndian);

              // GPS IFD pointer
              if (tag === 0x8825) {
                const gpsOffset = view.getUint32(entryOffset + 8, littleEndian);
                const gpsStart = tiffOffset + gpsOffset;
                const gpsEntryCount = view.getUint16(gpsStart, littleEndian);

                let latRef = "N";
                let lonRef = "E";
                let latitude: number[] = [];
                let longitude: number[] = [];

                for (let j = 0; j < gpsEntryCount; j++) {
                  const gpsEntryOffset = gpsStart + 2 + j * 12;
                  const gpsTag = view.getUint16(gpsEntryOffset, littleEndian);

                  switch (gpsTag) {
                    case 0x0001: // GPSLatitudeRef
                      latRef = String.fromCharCode(
                        view.getUint8(gpsEntryOffset + 8)
                      );
                      break;
                    case 0x0002: // GPSLatitude
                      latitude = readRational(
                        view,
                        tiffOffset +
                          view.getUint32(gpsEntryOffset + 8, littleEndian),
                        3,
                        littleEndian
                      );
                      break;
                    case 0x0003: // GPSLongitudeRef
                      lonRef = String.fromCharCode(
                        view.getUint8(gpsEntryOffset + 8)
                      );
                      break;
                    case 0x0004: // GPSLongitude
                      longitude = readRational(
                        view,
                        tiffOffset +
                          view.getUint32(gpsEntryOffset + 8, littleEndian),
                        3,
                        littleEndian
                      );
                      break;
                  }
                }

                if (latitude.length === 3) {
                  exifData.latitude = dmsToDecimal(latitude, latRef);
                }
                if (longitude.length === 3) {
                  exifData.longitude = dmsToDecimal(longitude, lonRef);
                }
              }
            }
          }

          break;
        }

        offset += 2;
        if (offset < length - 2) {
          offset += view.getUint16(offset, false);
        }
      }

      resolve(exifData);
    };

    reader.readAsArrayBuffer(file);
  });
}

function readString(view: DataView, offset: number, length: number): string {
  let str = "";
  for (let i = 0; i < length; i++) {
    str += String.fromCharCode(view.getUint8(offset + i));
  }
  return str;
}

function readRational(
  view: DataView,
  offset: number,
  count: number,
  littleEndian: boolean
): number[] {
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    const num = view.getUint32(offset + i * 8, littleEndian);
    const den = view.getUint32(offset + i * 8 + 4, littleEndian);
    values.push(num / den);
  }
  return values;
}

function dmsToDecimal(dms: number[], ref: string): number {
  const decimal = dms[0] + dms[1] / 60 + dms[2] / 3600;
  return ref === "S" || ref === "W" ? -decimal : decimal;
}

function parseExifDateTime(dateStr: string): Date | undefined {
  // EXIF format: "YYYY:MM:DD HH:MM:SS"
  const match = dateStr.match(
    /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/
  );
  if (match) {
    const [, year, month, day, hour, minute, second] = match;
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );
  }
  return undefined;
}

/**
 * Check if the file is an image that might contain EXIF data
 */
export function isExifSupported(file: File): boolean {
  const supportedTypes = ["image/jpeg", "image/jpg", "image/tiff"];
  return supportedTypes.includes(file.type.toLowerCase());
}
