/**
 * Minimal LZO1X-1 compatible compressor and decompressor.
 *
 * NIIMBOT printers that advertise image compression expect the row buffer to be
 * compressed with miniLZO (`lzo1x_1_compress`). The format is the standard LZO1X
 * bitstream, so the implementation below only handles the subset produced by
 * LZO1X-1 and consumed by `lzo1x_decompress_safe`.
 *
 * The code is a clean TypeScript implementation of the LZO1X stream format:
 * literal runs, M2/M3/M4 matches, the short M1 match used after literal runs,
 * and the `11 00 00` end-of-stream marker.
 *
 * @category Helpers
 */

const M1_MAX_OFFSET = 0x0400;
const M2_MAX_OFFSET = 0x0800;
const M3_MAX_OFFSET = 0x4000;
const M4_MAX_OFFSET = 0xbfff;

const M2_MAX_LEN = 8;
const M3_MAX_LEN = 33;
const M4_MAX_LEN = 9;

const M3_MARKER = 32;
const M4_MARKER = 16;

const HASH_BITS = 14;
const HASH_SIZE = 1 << HASH_BITS;
const HASH_MASK = HASH_SIZE - 1;

/** LZO1X-1 does not look at the last 20 bytes, which keeps match lookahead in bounds. */
const TRAILING_LITERAL_GUARD = 20;

const EOS_MARKER = [M4_MARKER | 1, 0, 0] as const;

function hash3(data: Uint8Array, pos: number): number {
  const value = data[pos] | (data[pos + 1] << 8) | (data[pos + 2] << 16);
  return (Math.imul(value, 0x1e35a7bd) >>> (32 - HASH_BITS)) & HASH_MASK;
}

/**
 * Compress a byte array into an LZO1X stream.
 *
 * The result is accepted by the official NIIMBOT SDK / miniLZO decompressor.
 *
 * @category Helpers
 */
export function lzo1xCompress(input: Uint8Array): Uint8Array {
  const inputLength = input.length;

  // Worst-case size for LZO1X-1: input plus one control byte per 255 literals.
  const output = new Uint8Array(inputLength + (inputLength >>> 4) + 67 + 16);
  const hashTable = new Int32Array(HASH_SIZE).fill(-1);

  let ip = 0;
  let literalStart = 0;
  let op = 0;
  let isFirstInstruction = true;

  const emitLiterals = (length: number, first: boolean) => {
    if (length === 0) return;

    if (first && length <= 238) {
      // The first literal run has a dedicated short form.
      output[op++] = 17 + length;
    } else if (length <= 3) {
      // Store the count in the two spare bits of the previous match's low offset byte.
      output[op - 2] = (output[op - 2] | length) & 0xff;
    } else if (length <= 18) {
      output[op++] = length - 3;
    } else {
      output[op++] = 0;

      let remaining = length - 18;

      while (remaining > 255) {
        output[op++] = 0;
        remaining -= 255;
      }

      output[op++] = remaining;
    }

    output.set(input.subarray(literalStart, literalStart + length), op);
    op += length;
  };

  const emitMatch = (matchLength: number, matchOffset: number) => {
    if (matchLength <= M2_MAX_LEN && matchOffset <= M2_MAX_OFFSET) {
      // M2: 3..8 byte match with an 11-bit offset.
      const offset = matchOffset - 1;
      output[op++] = ((matchLength - 1) << 5) | ((offset & 7) << 2);
      output[op++] = (offset >>> 3) & 0xff;
      return;
    }

    if (matchOffset <= M3_MAX_OFFSET) {
      // M3: up to 33 bytes with a 14-bit offset.
      const offset = matchOffset - 1;

      if (matchLength <= M3_MAX_LEN) {
        output[op++] = M3_MARKER | (matchLength - 2);
      } else {
        output[op++] = M3_MARKER;

        let remaining = matchLength - M3_MAX_LEN;

        while (remaining > 255) {
          output[op++] = 0;
          remaining -= 255;
        }

        output[op++] = remaining;
      }

      output[op++] = (offset << 2) & 0xff;
      output[op++] = (offset >>> 6) & 0xff;
      return;
    }

    // M4: up to 9 bytes with a 15-bit offset.
    const offset = matchOffset - 0x4000;

    if (matchLength <= M4_MAX_LEN) {
      output[op++] = M4_MARKER | ((offset >>> 11) & 8) | (matchLength - 2);
    } else {
      output[op++] = M4_MARKER | ((offset >>> 11) & 8);

      let remaining = matchLength - M4_MAX_LEN;

      while (remaining > 255) {
        output[op++] = 0;
        remaining -= 255;
      }

      output[op++] = remaining;
    }

    output[op++] = (offset << 2) & 0xff;
    output[op++] = (offset >>> 6) & 0xff;
  };

  const scanEnd = inputLength - TRAILING_LITERAL_GUARD;

  while (ip < scanEnd) {
    const hash = hash3(input, ip);
    const reference = hashTable[hash];
    hashTable[hash] = ip;

    let matchLength = 0;

    if (
      reference >= 0 &&
      ip - reference <= M4_MAX_OFFSET &&
      input[reference] === input[ip] &&
      input[reference + 1] === input[ip + 1] &&
      input[reference + 2] === input[ip + 2]
    ) {
      const maxLength = scanEnd - ip;
      let length = 3;

      while (length < maxLength && input[reference + length] === input[ip + length]) {
        length++;
      }

      matchLength = length;
    }

    if (matchLength < 3) {
      ip++;
      continue;
    }

    const literalLength = ip - literalStart;
    emitLiterals(literalLength, isFirstInstruction);
    isFirstInstruction = false;

    emitMatch(matchLength, ip - reference);

    ip += matchLength;
    literalStart = ip;
  }

  emitLiterals(inputLength - literalStart, isFirstInstruction);

  output[op++] = EOS_MARKER[0];
  output[op++] = EOS_MARKER[1];
  output[op++] = EOS_MARKER[2];

  return output.slice(0, op);
}

/**
 * Decompress an LZO1X stream.
 *
 * @param input Compressed data.
 * @param expectedLength When provided, the decompressed size must match exactly.
 * @category Helpers
 */
export function lzo1xDecompress(input: Uint8Array, expectedLength?: number): Uint8Array {
  const inputLength = input.length;

  if (inputLength < 3) {
    throw new RangeError("LZO1X: input is too short");
  }

  let output =
    expectedLength !== undefined ? new Uint8Array(expectedLength) : new Uint8Array(Math.max(64, inputLength * 3));

  let ip = 0;
  let op = 0;
  let state = 0;

  const ensureOutput = (count: number) => {
    if (op + count <= output.length) return;

    if (expectedLength !== undefined) {
      throw new RangeError("LZO1X: decompressed data exceeds the expected length");
    }

    let capacity = output.length;

    while (capacity < op + count) {
      capacity *= 2;
    }

    const grown = new Uint8Array(capacity);
    grown.set(output.subarray(0, op));
    output = grown;
  };

  const copyLiterals = (count: number) => {
    if (ip + count > inputLength) {
      throw new RangeError("LZO1X: unexpected end of input");
    }

    ensureOutput(count);
    output.set(input.subarray(ip, ip + count), op);
    ip += count;
    op += count;
  };

  const readExtendedLength = (): number => {
    let value = 0;

    while (ip < inputLength && input[ip] === 0) {
      value += 255;
      ip++;

      if (value > 0x3ffff) {
        throw new RangeError("LZO1X: invalid match length");
      }
    }

    if (ip >= inputLength) {
      throw new RangeError("LZO1X: unexpected end of input");
    }

    return value + input[ip++];
  };

  // The stream may begin with a literal run encoded in its short form.
  if (input[0] > 17) {
    const length = input[0] - 17;
    ip = 1;
    copyLiterals(length);
    state = length < 4 ? length : 4;
  }

  let foundEnd = false;

  while (!foundEnd) {
    if (ip >= inputLength) {
      throw new RangeError("LZO1X: missing end-of-stream marker");
    }

    const instruction = input[ip++];

    if (instruction >= 64) {
      // M2 match: 3..8 bytes, 11-bit offset.
      if (ip >= inputLength) {
        throw new RangeError("LZO1X: unexpected end of input");
      }

      const lowOffset = input[ip++];
      const matchOffset = 1 + ((instruction >> 2) & 7) + (lowOffset << 3);
      const matchLength = (instruction >> 5) + 1;

      copyMatch(matchOffset, matchLength);
      state = instruction & 3;
    } else if (instruction >= 32) {
      // M3 match: up to 33 bytes, 14-bit offset.
      let matchLength = (instruction & 31) + 2;

      if (matchLength === 2) {
        matchLength += readExtendedLength() + 31;
      }

      if (ip + 2 > inputLength) {
        throw new RangeError("LZO1X: unexpected end of input");
      }

      const offsetLow = input[ip++];
      const offsetHigh = input[ip++];
      const matchOffset = ((offsetLow | (offsetHigh << 8)) >>> 2) + 1;

      copyMatch(matchOffset, matchLength);
      state = offsetLow & 3;
    } else if (instruction >= 16) {
      // M4 match: up to 9 bytes, 15-bit offset. A zero offset is the end marker.
      let matchLength = (instruction & 7) + 2;

      if (matchLength === 2) {
        matchLength += readExtendedLength() + 7;
      }

      if (ip + 2 > inputLength) {
        throw new RangeError("LZO1X: unexpected end of input");
      }

      const offsetLow = input[ip++];
      const offsetHigh = input[ip++];
      const offsetWord = offsetLow | (offsetHigh << 8);
      const offsetBase = ((instruction & 8) << 11) + (offsetWord >>> 2);

      if (offsetBase === 0) {
        if (matchLength !== 3) {
          throw new RangeError("LZO1X: invalid end-of-stream marker");
        }

        foundEnd = true;
        break;
      }

      copyMatch(offsetBase + 0x4000, matchLength);
      state = offsetLow & 3;
    } else if (state === 0) {
      // Literal run: 4..238 bytes (or longer with the zero extension ladder).
      let length = instruction + 3;

      if (length === 3) {
        length += readExtendedLength() + 15;
      }

      copyLiterals(length);
      state = 4;
      continue;
    } else if (state !== 4) {
      // M1 match after a match: 2 bytes, offset up to 1024.
      if (ip >= inputLength) {
        throw new RangeError("LZO1X: unexpected end of input");
      }

      const lowOffset = input[ip++];
      const matchOffset = ((instruction >> 2) + (lowOffset << 2)) + 1;

      copyMatch(matchOffset, 2);
      state = instruction & 3;
    } else {
      // M1 match directly after a literal run: 3 bytes, offset base 2048.
      if (ip >= inputLength) {
        throw new RangeError("LZO1X: unexpected end of input");
      }

      const lowOffset = input[ip++];
      const matchOffset = ((instruction >> 2) + (lowOffset << 2)) + 1 + M2_MAX_OFFSET;

      copyMatch(matchOffset, 3);
      state = instruction & 3;
    }

    if (state > 0) {
      copyLiterals(state);
    }
  }

  if (ip !== inputLength) {
    throw new RangeError("LZO1X: trailing bytes after end-of-stream marker");
  }

  if (expectedLength !== undefined) {
    if (op !== expectedLength) {
      throw new RangeError(`LZO1X: decompressed length ${op} does not match expected ${expectedLength}`);
    }

    return output;
  }

  return output.slice(0, op);

  function copyMatch(matchOffset: number, matchLength: number): void {
    const matchStart = op - matchOffset;

    if (matchStart < 0) {
      throw new RangeError("LZO1X: invalid lookbehind reference");
    }

    ensureOutput(matchLength);

    // Byte-by-byte copy is required because LZO matches may overlap.
    for (let i = 0; i < matchLength; i++) {
      output[op++] = output[matchStart + i];
    }
  }
}
