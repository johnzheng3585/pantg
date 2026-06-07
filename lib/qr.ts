type Matrix = boolean[][];

interface BlockGroup {
  blocks: number;
  dataCodewords: number;
}

interface QrVersionConfig {
  version: number;
  eccCodewords: number;
  groups: BlockGroup[];
}

const VERSION_CONFIGS: QrVersionConfig[] = [
  { version: 1, eccCodewords: 7, groups: [{ blocks: 1, dataCodewords: 19 }] },
  { version: 2, eccCodewords: 10, groups: [{ blocks: 1, dataCodewords: 34 }] },
  { version: 3, eccCodewords: 15, groups: [{ blocks: 1, dataCodewords: 55 }] },
  { version: 4, eccCodewords: 20, groups: [{ blocks: 1, dataCodewords: 80 }] },
  { version: 5, eccCodewords: 26, groups: [{ blocks: 1, dataCodewords: 108 }] },
  { version: 6, eccCodewords: 18, groups: [{ blocks: 2, dataCodewords: 68 }] },
  { version: 7, eccCodewords: 20, groups: [{ blocks: 2, dataCodewords: 78 }] },
  { version: 8, eccCodewords: 24, groups: [{ blocks: 2, dataCodewords: 97 }] },
  { version: 9, eccCodewords: 30, groups: [{ blocks: 2, dataCodewords: 116 }] },
  { version: 10, eccCodewords: 18, groups: [{ blocks: 2, dataCodewords: 68 }, { blocks: 2, dataCodewords: 69 }] }
];

const ALIGNMENT_PATTERN_POSITIONS: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50]
};

const GF_EXP = new Array<number>(512);
const GF_LOG = new Array<number>(256);

let x = 1;
for (let i = 0; i < 255; i += 1) {
  GF_EXP[i] = x;
  GF_LOG[x] = i;
  x <<= 1;
  if (x & 0x100) {
    x ^= 0x11d;
  }
}

for (let i = 255; i < 512; i += 1) {
  GF_EXP[i] = GF_EXP[i - 255];
}

function gfMultiply(a: number, b: number) {
  if (a === 0 || b === 0) {
    return 0;
  }

  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function polyMultiply(left: number[], right: number[]) {
  const result = Array(left.length + right.length - 1).fill(0);
  for (let i = 0; i < left.length; i += 1) {
    for (let j = 0; j < right.length; j += 1) {
      result[i + j] ^= gfMultiply(left[i], right[j]);
    }
  }
  return result;
}

function reedSolomonDivisor(degree: number) {
  let result = [1];
  for (let i = 0; i < degree; i += 1) {
    result = polyMultiply(result, [1, GF_EXP[i]]);
  }
  return result;
}

function reedSolomonRemainder(data: number[], degree: number) {
  const divisor = reedSolomonDivisor(degree);
  const result = Array(degree).fill(0);

  data.forEach((value) => {
    const factor = value ^ result.shift();
    result.push(0);
    for (let i = 0; i < degree; i += 1) {
      result[i] ^= gfMultiply(divisor[i + 1], factor);
    }
  });

  return result;
}

function totalDataCodewords(config: QrVersionConfig) {
  return config.groups.reduce((sum, group) => sum + group.blocks * group.dataCodewords, 0);
}

function chooseVersion(bytes: Uint8Array) {
  return VERSION_CONFIGS.find((config) => {
    const charCountBits = config.version <= 9 ? 8 : 16;
    const neededBits = 4 + charCountBits + bytes.length * 8;
    return neededBits <= totalDataCodewords(config) * 8;
  });
}

function pushBits(bits: number[], value: number, length: number) {
  for (let i = length - 1; i >= 0; i -= 1) {
    bits.push((value >>> i) & 1);
  }
}

function createDataCodewords(bytes: Uint8Array, config: QrVersionConfig) {
  const capacityBits = totalDataCodewords(config) * 8;
  const bits: number[] = [];

  pushBits(bits, 0b0100, 4);
  pushBits(bits, bytes.length, config.version <= 9 ? 8 : 16);
  bytes.forEach((value) => pushBits(bits, value, 8));

  const terminator = Math.min(4, capacityBits - bits.length);
  pushBits(bits, 0, terminator);

  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    codewords.push(Number.parseInt(bits.slice(i, i + 8).join(""), 2));
  }

  const padBytes = [0xec, 0x11];
  let padIndex = 0;
  while (codewords.length < totalDataCodewords(config)) {
    codewords.push(padBytes[padIndex % 2]);
    padIndex += 1;
  }

  return codewords;
}

function createBlocks(dataCodewords: number[], config: QrVersionConfig) {
  const blocks: Array<{ data: number[]; ecc: number[] }> = [];
  let offset = 0;

  config.groups.forEach((group) => {
    for (let i = 0; i < group.blocks; i += 1) {
      const data = dataCodewords.slice(offset, offset + group.dataCodewords);
      offset += group.dataCodewords;
      blocks.push({ data, ecc: reedSolomonRemainder(data, config.eccCodewords) });
    }
  });

  return blocks;
}

function interleaveCodewords(blocks: Array<{ data: number[]; ecc: number[] }>) {
  const result: number[] = [];
  const maxDataLength = Math.max(...blocks.map((block) => block.data.length));
  const maxEccLength = Math.max(...blocks.map((block) => block.ecc.length));

  for (let i = 0; i < maxDataLength; i += 1) {
    blocks.forEach((block) => {
      if (i < block.data.length) {
        result.push(block.data[i]);
      }
    });
  }

  for (let i = 0; i < maxEccLength; i += 1) {
    blocks.forEach((block) => {
      result.push(block.ecc[i]);
    });
  }

  return result;
}

function createEmptyMatrix(size: number) {
  return Array.from({ length: size }, () => Array<boolean | null>(size).fill(null));
}

function createReservedMatrix(size: number) {
  return Array.from({ length: size }, () => Array<boolean>(size).fill(false));
}

function setModule(matrix: Array<Array<boolean | null>>, reserved: boolean[][], x: number, y: number, dark: boolean, lock = true) {
  if (x < 0 || y < 0 || y >= matrix.length || x >= matrix.length) {
    return;
  }
  matrix[y][x] = dark;
  if (lock) {
    reserved[y][x] = true;
  }
}

function drawFinder(matrix: Array<Array<boolean | null>>, reserved: boolean[][], x: number, y: number) {
  for (let dy = -1; dy <= 7; dy += 1) {
    for (let dx = -1; dx <= 7; dx += 1) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 0 || yy < 0 || yy >= matrix.length || xx >= matrix.length) {
        continue;
      }

      const separator = dx === -1 || dx === 7 || dy === -1 || dy === 7;
      const dark = !separator && (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));
      setModule(matrix, reserved, xx, yy, dark);
    }
  }
}

function drawAlignment(matrix: Array<Array<boolean | null>>, reserved: boolean[][], cx: number, cy: number) {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      setModule(matrix, reserved, cx + dx, cy + dy, distance === 2 || distance === 0);
    }
  }
}

function drawFunctionPatterns(matrix: Array<Array<boolean | null>>, reserved: boolean[][], version: number) {
  const size = matrix.length;
  drawFinder(matrix, reserved, 0, 0);
  drawFinder(matrix, reserved, size - 7, 0);
  drawFinder(matrix, reserved, 0, size - 7);

  for (let i = 8; i < size - 8; i += 1) {
    const dark = i % 2 === 0;
    setModule(matrix, reserved, i, 6, dark);
    setModule(matrix, reserved, 6, i, dark);
  }

  const positions = ALIGNMENT_PATTERN_POSITIONS[version] ?? [];
  positions.forEach((y) => {
    positions.forEach((x) => {
      if (reserved[y]?.[x]) {
        return;
      }
      drawAlignment(matrix, reserved, x, y);
    });
  });

  setModule(matrix, reserved, 8, 4 * version + 9, true);
  reserveFormatInfo(matrix, reserved);
  if (version >= 7) {
    drawVersionInfo(matrix, reserved, version);
  }
}

function reserveFormatInfo(matrix: Array<Array<boolean | null>>, reserved: boolean[][]) {
  const size = matrix.length;
  for (let i = 0; i <= 8; i += 1) {
    if (i !== 6) {
      setModule(matrix, reserved, 8, i, false);
      setModule(matrix, reserved, i, 8, false);
    }
  }
  for (let i = 0; i < 8; i += 1) {
    setModule(matrix, reserved, size - 1 - i, 8, false);
    setModule(matrix, reserved, 8, size - 1 - i, false);
  }
}

function getBchCode(value: number, poly: number, shift: number) {
  let data = value << shift;
  for (let i = Math.floor(Math.log2(data)); i >= shift; i -= 1) {
    if (((data >>> i) & 1) !== 0) {
      data ^= poly << (i - shift);
    }
  }
  return (value << shift) | data;
}

function getFormatBits(mask: number) {
  const errorCorrectionLevelL = 1;
  return getBchCode((errorCorrectionLevelL << 3) | mask, 0x537, 10) ^ 0x5412;
}

function drawFormatInfo(matrix: Array<Array<boolean | null>>, reserved: boolean[][], mask: number) {
  const size = matrix.length;
  const bits = getFormatBits(mask);

  for (let i = 0; i <= 5; i += 1) {
    setModule(matrix, reserved, 8, i, ((bits >>> i) & 1) !== 0);
  }
  setModule(matrix, reserved, 8, 7, ((bits >>> 6) & 1) !== 0);
  setModule(matrix, reserved, 8, 8, ((bits >>> 7) & 1) !== 0);
  setModule(matrix, reserved, 7, 8, ((bits >>> 8) & 1) !== 0);
  for (let i = 9; i < 15; i += 1) {
    setModule(matrix, reserved, 14 - i, 8, ((bits >>> i) & 1) !== 0);
  }

  for (let i = 0; i < 8; i += 1) {
    setModule(matrix, reserved, size - 1 - i, 8, ((bits >>> i) & 1) !== 0);
  }
  for (let i = 8; i < 15; i += 1) {
    setModule(matrix, reserved, 8, size - 15 + i, ((bits >>> i) & 1) !== 0);
  }
}

function drawVersionInfo(matrix: Array<Array<boolean | null>>, reserved: boolean[][], version: number) {
  const size = matrix.length;
  const bits = getBchCode(version, 0x1f25, 12);
  for (let i = 0; i < 18; i += 1) {
    const dark = ((bits >>> i) & 1) !== 0;
    const a = size - 11 + (i % 3);
    const b = Math.floor(i / 3);
    setModule(matrix, reserved, a, b, dark);
    setModule(matrix, reserved, b, a, dark);
  }
}

function maskBit(mask: number, x: number, y: number) {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    default:
      return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
  }
}

function drawCodewords(matrix: Array<Array<boolean | null>>, reserved: boolean[][], codewords: number[], mask: number) {
  const size = matrix.length;
  const bits: number[] = [];
  codewords.forEach((codeword) => pushBits(bits, codeword, 8));

  let bitIndex = 0;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) {
      right = 5;
    }

    for (let vertical = 0; vertical < size; vertical += 1) {
      const y = upward ? size - 1 - vertical : vertical;
      for (let dx = 0; dx < 2; dx += 1) {
        const x = right - dx;
        if (reserved[y][x]) {
          continue;
        }
        const bit = bitIndex < bits.length ? bits[bitIndex] === 1 : false;
        bitIndex += 1;
        matrix[y][x] = bit !== maskBit(mask, x, y);
      }
    }
    upward = !upward;
  }
}

function createMatrix(value: string): Matrix {
  const bytes = new TextEncoder().encode(value);
  const config = chooseVersion(bytes);
  if (!config) {
    throw new Error("二维码内容过长。");
  }

  const size = 21 + 4 * (config.version - 1);
  const matrix = createEmptyMatrix(size);
  const reserved = createReservedMatrix(size);
  const mask = 0;
  const dataCodewords = createDataCodewords(bytes, config);
  const codewords = interleaveCodewords(createBlocks(dataCodewords, config));

  drawFunctionPatterns(matrix, reserved, config.version);
  drawCodewords(matrix, reserved, codewords, mask);
  drawFormatInfo(matrix, reserved, mask);

  return matrix.map((row) => row.map(Boolean));
}

export function createQrSvg(value: string, scale = 6) {
  const matrix = createMatrix(value);
  const quietZone = 4;
  const size = matrix.length + quietZone * 2;
  const rects: string[] = [];

  matrix.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) {
        rects.push(`M${x + quietZone},${y + quietZone}h1v1h-1z`);
      }
    });
  });

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size * scale}" height="${size * scale}" shape-rendering="crispEdges">`,
    `<rect width="100%" height="100%" fill="#fff"/>`,
    `<path fill="#000" d="${rects.join("")}"/>`,
    `</svg>`
  ].join("");
}

export function createQrDataUri(value: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(createQrSvg(value))}`;
}
