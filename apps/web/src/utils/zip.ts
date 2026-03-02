export type ZipEntry = {
  name: string;
  bytes: Uint8Array;
  modifiedAt?: Date;
};

const CRC32_TABLE = buildCrc32Table();

function buildCrc32Table(): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let value = i;
    for (let j = 0; j < 8; j++) {
      value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[i] = value >>> 0;
  }
  return table;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    const index = (crc ^ bytes[i]) & 0xff;
    crc = (crc >>> 8) ^ CRC32_TABLE[index];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function clampDate(date: Date): Date {
  const year = date.getFullYear();
  if (year < 1980) return new Date(Date.UTC(1980, 0, 1, 0, 0, 0));
  if (year > 2107) return new Date(Date.UTC(2107, 11, 31, 23, 59, 58));
  return date;
}

function dosDateTime(date: Date): { date: number; time: number } {
  const d = clampDate(date);
  const year = d.getFullYear() - 1980;
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = d.getHours();
  const minute = d.getMinutes();
  const second = Math.floor(d.getSeconds() / 2);
  return {
    date: (year << 9) | (month << 5) | day,
    time: (hour << 11) | (minute << 5) | second,
  };
}

function sanitizeEntryName(name: string, fallback: string): string {
  const cleaned = name
    .replaceAll("\\", "/")
    .replace(/^\.+/g, "")
    .replace(/\.\./g, "")
    .replace(/^\/+/g, "")
    .trim();
  if (!cleaned) return fallback;
  return cleaned;
}

function writeUint16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value & 0xffff, true);
}

function writeUint32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value >>> 0, true);
}

export function createZip(entries: ZipEntry[]): Uint8Array {
  if (!entries.length) {
    throw new Error("At least one file is required for ZIP export.");
  }

  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  entries.forEach((entry, index) => {
    const safeName = sanitizeEntryName(entry.name, `file-${index + 1}`);
    const nameBytes = encoder.encode(safeName);
    const dataBytes = entry.bytes;
    const crc = crc32(dataBytes);
    const { date, time } = dosDateTime(entry.modifiedAt ?? new Date());

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0);
    writeUint16(localView, 8, 0);
    writeUint16(localView, 10, time);
    writeUint16(localView, 12, date);
    writeUint32(localView, 14, crc);
    writeUint32(localView, 18, dataBytes.length);
    writeUint32(localView, 22, dataBytes.length);
    writeUint16(localView, 26, nameBytes.length);
    writeUint16(localView, 28, 0);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, dataBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0);
    writeUint16(centralView, 10, 0);
    writeUint16(centralView, 12, time);
    writeUint16(centralView, 14, date);
    writeUint32(centralView, 16, crc);
    writeUint32(centralView, 20, dataBytes.length);
    writeUint32(centralView, 24, dataBytes.length);
    writeUint16(centralView, 28, nameBytes.length);
    writeUint16(centralView, 30, 0);
    writeUint16(centralView, 32, 0);
    writeUint16(centralView, 34, 0);
    writeUint16(centralView, 36, 0);
    writeUint32(centralView, 38, 0);
    writeUint32(centralView, 42, offset);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);

    offset += localHeader.length + dataBytes.length;
  });

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 4, 0);
  writeUint16(endView, 6, 0);
  writeUint16(endView, 8, entries.length);
  writeUint16(endView, 10, entries.length);
  writeUint32(endView, 12, centralSize);
  writeUint32(endView, 16, offset);
  writeUint16(endView, 20, 0);

  const totalSize =
    offset + centralSize + endRecord.length;
  const zipBytes = new Uint8Array(totalSize);
  let cursor = 0;

  for (const part of localParts) {
    zipBytes.set(part, cursor);
    cursor += part.length;
  }
  for (const part of centralParts) {
    zipBytes.set(part, cursor);
    cursor += part.length;
  }
  zipBytes.set(endRecord, cursor);

  return zipBytes;
}
