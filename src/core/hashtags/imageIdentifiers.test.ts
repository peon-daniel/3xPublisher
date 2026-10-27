import { describe, expect, it } from "vitest";

import { normalizeXmpSubject, readImageIdentifierAnalysis } from "./imageIdentifiers";

describe("image identifier analysis", () => {
  it("normalizes whitespace and leading hashtag marks in XMP subjects", () => {
    expect(normalizeXmpSubject("  #Black and   white  ")).toBe("Black_and_white");
  });

  it("falls back to the documented filename parser when XMP is unavailable", async () => {
    const file = new File(["not an image"], "P123_d3, rodinal.jpg", {
      type: "image/jpeg"
    });

    await expect(readImageIdentifierAnalysis(file)).resolves.toEqual({
      identifiers: ["d3", "rodinal"],
      source: "filename"
    });
  });

  it("uses embedded XMP subjects instead of filename tokens", async () => {
    const file = new File([jpegWithXmpSubjects(["Black and white", "#Rodinal"])], "P1_d3.jpg", {
      type: "image/jpeg"
    });

    await expect(readImageIdentifierAnalysis(file)).resolves.toEqual({
      identifiers: ["Black_and_white", "Rodinal"],
      source: "xmp"
    });
  });
});

function jpegWithXmpSubjects(subjects: string[]): ArrayBuffer {
  const listItems = subjects.map((subject) => `<rdf:li>${subject}</rdf:li>`).join("");
  const xml =
    `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">` +
    `<rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:subject><rdf:Bag>${listItems}</rdf:Bag></dc:subject>` +
    `</rdf:Description></rdf:RDF></x:xmpmeta>`;
  const header = new TextEncoder().encode("http://ns.adobe.com/xap/1.0/\0");
  const xmp = new TextEncoder().encode(xml);
  const segmentLength = header.length + xmp.length + 2;
  const buffer = new ArrayBuffer(2 + 4 + header.length + xmp.length + 2);
  const jpeg = new Uint8Array(buffer);
  jpeg.set([0xff, 0xd8, 0xff, 0xe1, (segmentLength >> 8) & 0xff, segmentLength & 0xff]);
  jpeg.set(header, 6);
  jpeg.set(xmp, 6 + header.length);
  jpeg.set([0xff, 0xd9], jpeg.length - 2);
  return buffer;
}
