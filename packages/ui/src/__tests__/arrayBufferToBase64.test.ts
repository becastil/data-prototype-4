import { arrayBufferToBase64 } from "../utils/base64";

describe("arrayBufferToBase64", () => {
  beforeAll(() => {
    if (typeof btoa !== "function") {
      (globalThis as any).btoa = (input: string) =>
        Buffer.from(input, "binary").toString("base64");
    }
  });

  it("converts an ArrayBuffer into the expected base64 string", () => {
    const bytes = new Uint8Array([0x48, 0x49, 0x21]); // "HI!"
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    );

    expect(arrayBufferToBase64(buffer)).toBe("SEkh");
  });
});
