import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { analyzeFormPdf, fillFormPdf } from "./fillFormPdf";

async function makeFormDoc() {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  const form = doc.getForm();
  const textField = form.createTextField("name");
  textField.setText("initial");
  textField.addToPage(doc.getPages()[0], { x: 50, y: 700, width: 200, height: 20 });

  const checkbox = form.createCheckBox("agree");
  checkbox.addToPage(doc.getPages()[0], { x: 50, y: 660, width: 15, height: 15 });

  const dropdown = form.createDropdown("color");
  dropdown.addOptions(["red", "green", "blue"]);
  dropdown.select("red");
  dropdown.addToPage(doc.getPages()[0], { x: 50, y: 620, width: 200, height: 20 });

  return new Uint8Array(await doc.save());
}

describe("fillFormPdf", () => {
  it("analyzes fields correctly", async () => {
    const input = await makeFormDoc();
    const result = await analyzeFormPdf({ inputBytes: input });
    expect(result.fields.length).toBe(3);
    expect(result.fields.map((f) => f.type).sort()).toEqual(["checkbox", "dropdown", "text"]);

    const dropdown = result.fields.find((f) => f.type === "dropdown");
    expect(dropdown?.options).toEqual(["red", "green", "blue"]);
  });

  it("fills text and checkbox fields", async () => {
    const input = await makeFormDoc();
    const result = await fillFormPdf({
      inputBytes: input,
      values: { name: "John Doe", agree: "true" },
      flattenAfterFill: false,
    });
    expect(result.filledCount).toBe(2);

    const doc = await PDFDocument.load(result.outputBytes);
    const form = doc.getForm();
    const tf = form.getTextField("name");
    expect(tf.getText()).toBe("John Doe");
    const cb = form.getCheckBox("agree");
    expect(cb.isChecked()).toBe(true);
  });

  it("flattens form after fill", async () => {
    const input = await makeFormDoc();
    const result = await fillFormPdf({
      inputBytes: input,
      values: { name: "Jane" },
      flattenAfterFill: true,
    });
    expect(result.filledCount).toBe(1);

    const doc = await PDFDocument.load(result.outputBytes);
    const form = doc.getForm();
    expect(form.getFields().length).toBe(0);
  });

  it("returns filledCount 0 for non-matching field names", async () => {
    const input = await makeFormDoc();
    const result = await fillFormPdf({
      inputBytes: input,
      values: { nonExistent: "value" },
      flattenAfterFill: false,
    });
    expect(result.filledCount).toBe(0);
  });
});
