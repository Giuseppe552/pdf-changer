// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Term } from "./Term";

afterEach(cleanup);

describe("Term", () => {
  it("renders term and tooltip text", () => {
    render(<Term tip="metadata about the photo">EXIF</Term>);
    expect(screen.getByText("EXIF")).toBeInTheDocument();
    expect(screen.getByText("metadata about the photo")).toBeInTheDocument();
  });

  it("tooltip has role=tooltip", () => {
    render(<Term tip="color profiles">ICC</Term>);
    expect(screen.getByRole("tooltip")).toHaveTextContent("color profiles");
  });

  it("outer span is keyboard accessible", () => {
    render(<Term tip="tip">IPTC</Term>);
    const outer = screen.getByText("IPTC").closest(".term");
    expect(outer).toHaveAttribute("tabindex", "0");
  });

  it("repositions tooltip on hover", () => {
    render(<Term tip="test tip">term</Term>);
    const outer = screen.getByText("term").closest(".term")!;
    const tip = screen.getByRole("tooltip");
    expect(tip.style.left).toBe("");
    fireEvent.mouseEnter(outer);
    expect(tip.style.left).not.toBe("");
  });

  it("multiple terms render independently", () => {
    render(
      <>
        <Term tip="tip a">AAA</Term>
        <Term tip="tip b">BBB</Term>
      </>,
    );
    expect(screen.getByText("AAA")).toBeInTheDocument();
    expect(screen.getByText("BBB")).toBeInTheDocument();
    expect(screen.getByText("tip a")).toBeInTheDocument();
    expect(screen.getByText("tip b")).toBeInTheDocument();
  });
});
