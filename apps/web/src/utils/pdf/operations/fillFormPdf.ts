import { PDFDocument } from "pdf-lib";

export type FormFieldInfo = {
  name: string;
  type: "text" | "checkbox" | "dropdown" | "radio" | "other";
  currentValue: string;
  options?: string[];
};

export async function analyzeFormPdf(input: {
  inputBytes: Uint8Array;
}): Promise<{ fields: FormFieldInfo[]; pageCount: number }> {
  const doc = await PDFDocument.load(input.inputBytes, { ignoreEncryption: false });
  const form = doc.getForm();
  const rawFields = form.getFields();
  const fields: FormFieldInfo[] = [];

  for (const field of rawFields) {
    const name = field.getName();
    const typeName = field.constructor.name;

    try {
      if (typeName === "PDFTextField") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tf = field as any;
        fields.push({
          name,
          type: "text",
          currentValue: tf.getText?.() ?? "",
        });
      } else if (typeName === "PDFCheckBox") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cb = field as any;
        fields.push({
          name,
          type: "checkbox",
          currentValue: cb.isChecked?.() ? "true" : "false",
        });
      } else if (typeName === "PDFDropdown") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dd = field as any;
        const selected = dd.getSelected?.() ?? [];
        fields.push({
          name,
          type: "dropdown",
          currentValue: selected[0] ?? "",
          options: dd.getOptions?.() ?? [],
        });
      } else if (typeName === "PDFRadioGroup") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rg = field as any;
        fields.push({
          name,
          type: "radio",
          currentValue: rg.getSelected?.() ?? "",
          options: rg.getOptions?.() ?? [],
        });
      } else {
        fields.push({ name, type: "other", currentValue: "" });
      }
    } catch {
      fields.push({ name, type: "other", currentValue: "" });
    }
  }

  return { fields, pageCount: doc.getPageCount() };
}

export async function fillFormPdf(input: {
  inputBytes: Uint8Array;
  values: Record<string, string>;
  flattenAfterFill: boolean;
}): Promise<{ outputBytes: Uint8Array; pageCount: number; filledCount: number }> {
  const doc = await PDFDocument.load(input.inputBytes, { ignoreEncryption: false });
  const form = doc.getForm();
  const rawFields = form.getFields();
  let filledCount = 0;

  for (const field of rawFields) {
    const name = field.getName();
    const value = input.values[name];
    if (value === undefined) continue;

    const typeName = field.constructor.name;
    try {
      if (typeName === "PDFTextField") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (field as any).setText(value);
        filledCount++;
      } else if (typeName === "PDFCheckBox") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cb = field as any;
        if (value === "true") cb.check();
        else cb.uncheck();
        filledCount++;
      } else if (typeName === "PDFDropdown") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (field as any).select(value);
        filledCount++;
      } else if (typeName === "PDFRadioGroup") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (field as any).select(value);
        filledCount++;
      }
    } catch {
      // Skip fields that fail to fill
    }
  }

  if (input.flattenAfterFill) {
    form.flatten();
  }

  const outputBytes = await doc.save({ useObjectStreams: true });
  return { outputBytes, pageCount: doc.getPageCount(), filledCount };
}
