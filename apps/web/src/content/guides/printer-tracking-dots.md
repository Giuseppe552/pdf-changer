# Printer tracking dots: what they are, what they reveal, and what you can do

Most color laser printers add invisible yellow dots to every page they print. The dots encode the printer's serial number and the date and time of printing. They're too small to see without magnification, but they're there — on your tax returns, your medical records, your letters, everything.

This has been happening since the mid-1980s, when Xerox first built the system into its DocuColor line. Canon co-developed the technology around the same time. By 2015, the EFF reported that documents obtained through FOIA requests suggested all major color laser printer manufacturers had entered into an agreement with government agencies to make their output forensically traceable.

The original purpose was counterfeiting deterrence. The dots make it possible to trace a printed page back to a specific printer and a specific date. But the dots don't only appear on counterfeit currency — they appear on everything.

## What the dots look like

Each dot is about 0.1mm in diameter — roughly the width of a human hair. They're spaced about 1mm apart and printed in yellow ink on white paper. Under normal lighting, on a white page, they're essentially invisible. Under blue light or UV, they appear as a regular grid.

The pattern repeats across the entire printed area. It's not hidden in one corner — it tiles the whole page.

## What information is encoded

The best-documented pattern is the Xerox DocuColor format, which the EFF decoded in 2005. It uses a 15×8 grid:

- **Printer serial number** — 4 bytes, enough to uniquely identify the device
- **Print date** — year, month, day, encoded in BCD (binary-coded decimal)
- **Print time** — hour and minute
- **Parity bits** — error detection for each column

The Chaos Computer Club found a larger format (32×16 dots, 64 bytes of data) on some printers, which could encode additional information beyond serial and timestamp.

Other manufacturers (HP, Canon, Ricoh, Konica Minolta) use different grid layouts. Most are undocumented. The TU Dresden research group behind DEDA has partially decoded patterns from a few manufacturers, but coverage is incomplete.

## Which printers have tracking dots

**Color laser printers:** Almost all of them. The EFF's 2015 assessment was that every major manufacturer participates. Xerox, HP, Canon, Ricoh, Samsung, Lexmark, and Konica Minolta have all been identified in various analyses.

**Monochrome laser printers:** No. The dots are yellow. A black-and-white printer can't produce them.

**Inkjet printers:** No evidence that inkjets embed tracking dots. DEDA's documentation explicitly notes that "inkjet prints might not contain tracking dots." The tracking dot system was developed for and deployed on color laser hardware. If you need to print something without tracking dots, an inkjet is the safer choice — though it's not a guarantee, just an absence of evidence.

## The Reality Winner case

In 2017, Reality Winner printed a classified NSA document at work and mailed it to The Intercept. The Intercept published the document with the tracking dots still visible. The dots encoded which printer produced the pages and when. That, combined with access logs, identified Winner as the source. She was arrested and sentenced to five years.

This is the most public example of tracking dots being used for identification. There are likely others that never became public.

## Can you disable tracking dots?

No. There is no printer setting to turn them off. The encoding is built into the printer firmware and is not user-configurable.

The only known circumvention is the DEDA tool from TU Dresden (published 2018, available on GitHub). DEDA doesn't remove the existing dots — it prints additional yellow dots on top to corrupt the pattern. You print a calibration page, scan it, DEDA generates a mask, and you apply the mask to future prints. It's a masking approach, not a removal.

DEDA is a Python command-line tool. It requires scanning a physical test page from your specific printer. It's not simple, and it hasn't been updated to cover all manufacturers.

## How to check if a document has tracking dots

### Physical inspection
Hold the page under blue or UV light. Yellow dots will fluoresce. A 10x loupe helps. Look at the margins and blank areas — that's where the pattern is easiest to spot against white paper.

### Digital analysis
If you have a high-resolution scan (300 DPI minimum, 600+ preferred), software can detect and decode the dots. Existing tools:

| Tool | Runs in browser? | Decodes serial/date? | Manufacturer coverage |
|------|:-:|:-:|---|
| DEDA (TU Dresden) | No (Python) | Yes | 4 patterns |
| EFF decoder | No (Python) | Yes | Xerox DocuColor only |
| PDF Changer | Yes | Yes | Xerox DocuColor (Phase 1) |

PDF Changer's Forensic Analyzer scans PDF pages for tracking dot patterns as part of its privacy analysis. If a Xerox DocuColor pattern is detected, the MIC decoder extracts the serial number, print date, and print time — all in your browser, no upload. The scan never leaves your device.

[Try the Forensic Analyzer →](/tools/analyze)

## What tracking dots don't tell you

The dots identify the printer, not the person. Tracing a page to a person requires additional steps: access logs, purchase records, IP addresses associated with the printer. The dots are one piece of a forensic chain, not the whole thing.

They also don't survive all reproduction methods. Photocopying a page on a monochrome copier strips the yellow channel. Re-scanning and re-printing introduces a new set of dots from the second printer. Faxing loses them entirely (low resolution, monochrome).

## Practical advice

**If you're sharing digital documents:** Don't print and scan them. Share the digital original after scrubbing metadata. Printing and scanning converts hidden metadata into visible image content that's much harder to remove.

**If you must print:** Use an inkjet printer. There's no confirmed evidence that inkjets embed tracking dots. A monochrome laser also works — no yellow ink, no yellow dots.

**If you receive a printed document and want to check it:** Scan at 600+ DPI and run it through PDF Changer's Forensic Analyzer. If tracking dots are present and the pattern is Xerox DocuColor, you'll get the serial number, date, and time.

**If you're a journalist handling leaked documents:** Assume printed pages carry tracking dots. The Intercept learned this the hard way. Strip metadata from digital files. Don't publish scans of printed originals without understanding what's embedded in them.

## Further reading

- [EFF: Printer tracking dots](https://www.eff.org/issues/printers) — the original public documentation (2004)
- [DEDA on GitHub](https://github.com/dfd-tud/deda) — TU Dresden's Python decoder and anonymizer
- [Richter et al., 2018](https://doi.org/10.1145/3206004.3206019) — "Forensic Analysis and Anonymisation of Printed Documents" (IH&MMSec '18)
- [Wikipedia: Machine Identification Code](https://en.wikipedia.org/wiki/Machine_Identification_Code) — overview with manufacturer details
- [PDF Changer MIC decoder research](/research/printer-tracking-decoder) — technical implementation details of our browser-based decoder
