import { describe, it, expect } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { ThemeToolbar } from "../app/components/ThemeToolbar";
import { renderWithProviders } from "./test-utils";

const defaultTheme = {
  headingFont: "Inter",
  bodyFont: "Inter",
  accentColors: ["#0d1b2a", "#1b263b", "#415a77", "#778da9", "#e0e1dd"],
  headingTextColor: "#0a0a0b",
  bodyTextColor: "#1a1a1a",
  headingFontSize: 32,
  bodyFontSize: 16,
  slideBackgroundColor: "#ffffff",
};

describe("ThemeToolbar", () => {
  it("renders heading and body font inputs with initial values", () => {
    renderWithProviders(<ThemeToolbar />);

    // Both heading and body fonts default to "Inter"
    const interInputs = screen.getAllByDisplayValue("Inter");
    expect(interInputs).toHaveLength(2);
  });

  it("renders heading and body labels", () => {
    renderWithProviders(<ThemeToolbar />);
    expect(screen.getByText("Heading")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("renders font size inputs", () => {
    renderWithProviders(<ThemeToolbar />);
    expect(screen.getByDisplayValue("32")).toBeInTheDocument(); // heading font size
    expect(screen.getByDisplayValue("16")).toBeInTheDocument(); // body font size
  });

  it("renders text color section", () => {
    renderWithProviders(<ThemeToolbar />);
    expect(screen.getByText("Text")).toBeInTheDocument();
    expect(screen.getByText("H")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("renders background color input", () => {
    renderWithProviders(<ThemeToolbar />);
    expect(screen.getByTitle("Slide background color")).toBeInTheDocument();
  });

  it("renders accent color inputs", () => {
    renderWithProviders(<ThemeToolbar />);
    expect(screen.getByText("Colors")).toBeInTheDocument();
    // 5 accent color pickers
    const colorInputs = screen.getAllByTitle(/Accent Color/);
    expect(colorInputs).toHaveLength(5);
  });

  it("dispatches setHeadingFont when heading font is changed", () => {
    const { store } = renderWithProviders(<ThemeToolbar />);
    const inputs = screen.getAllByDisplayValue("Inter");
    // First one is heading font
    fireEvent.change(inputs[0], { target: { value: "Roboto" } });
    expect(store.getState().theme.headingFont).toBe("Roboto");
  });

  it("dispatches setBodyFont when body font is changed", () => {
    const { store } = renderWithProviders(<ThemeToolbar />);
    const inputs = screen.getAllByDisplayValue("Inter");
    // Second one is body font
    fireEvent.change(inputs[1], { target: { value: "Lato" } });
    expect(store.getState().theme.bodyFont).toBe("Lato");
  });

  it("cycles heading font up with arrow button", () => {
    const { store } = renderWithProviders(<ThemeToolbar />);
    // "Next font" is the heading up button (first one)
    const nextButtons = screen.getAllByTitle("Next font");
    fireEvent.click(nextButtons[0]);
    // Inter is at index 0, clicking up should go to index 1 = Arial
    expect(store.getState().theme.headingFont).toBe("Arial");
  });

  it("cycles heading font down with arrow button", () => {
    const { store } = renderWithProviders(<ThemeToolbar />);
    const prevButtons = screen.getAllByTitle("Previous font");
    fireEvent.click(prevButtons[0]);
    // Inter is at index 0, clicking down wraps to last = Poppins
    expect(store.getState().theme.headingFont).toBe("Poppins");
  });

  it("dispatches setHeadingFontSize when heading font size is changed", () => {
    const { store } = renderWithProviders(<ThemeToolbar />);
    const sizeInput = screen.getByDisplayValue("32");
    fireEvent.change(sizeInput, { target: { value: "40" } });
    expect(store.getState().theme.headingFontSize).toBe(40);
  });

  it("dispatches setBodyFontSize when body font size is changed", () => {
    const { store } = renderWithProviders(<ThemeToolbar />);
    const sizeInput = screen.getByDisplayValue("16");
    fireEvent.change(sizeInput, { target: { value: "18" } });
    expect(store.getState().theme.bodyFontSize).toBe(18);
  });

  it("dispatches setSlideBackgroundColor when background color changes", () => {
    const { store } = renderWithProviders(<ThemeToolbar />);
    const bgInput = screen.getByTitle("Slide background color");
    fireEvent.change(bgInput, { target: { value: "#000000" } });
    expect(store.getState().theme.slideBackgroundColor).toBe("#000000");
  });
});
