import { useState, useEffect } from "react";
import { ChevronUp, ChevronDown, Type } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  setHeadingFont,
  setBodyFont,
  setAccentColor,
  setHeadingTextColor,
  setBodyTextColor,
  setHeadingFontSize,
  setBodyFontSize,
  setSlideBackgroundColor,
} from "../store/themeSlice";

const FONT_OPTIONS = [
  "Arial",
  "Inter",
  "Helvetica",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Verdana",
  "Trebuchet MS",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
];

export function ThemeToolbar() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.theme);
  const [headingFontInput, setHeadingFontInput] = useState(theme.headingFont);
  const [bodyFontInput, setBodyFontInput] = useState(theme.bodyFont);
  const [headingFontIndex, setHeadingFontIndex] = useState(() =>
    FONT_OPTIONS.indexOf(theme.headingFont) >= 0 ? FONT_OPTIONS.indexOf(theme.headingFont) : 0
  );
  const [bodyFontIndex, setBodyFontIndex] = useState(() =>
    FONT_OPTIONS.indexOf(theme.bodyFont) >= 0 ? FONT_OPTIONS.indexOf(theme.bodyFont) : 0
  );

  // Update inputs when theme changes
  useEffect(() => {
    setHeadingFontInput(theme.headingFont);
    const hIndex = FONT_OPTIONS.indexOf(theme.headingFont);
    if (hIndex >= 0) setHeadingFontIndex(hIndex);
  }, [theme.headingFont]);

  useEffect(() => {
    setBodyFontInput(theme.bodyFont);
    const bIndex = FONT_OPTIONS.indexOf(theme.bodyFont);
    if (bIndex >= 0) setBodyFontIndex(bIndex);
  }, [theme.bodyFont]);

  const handleHeadingFontChange = (value: string) => {
    setHeadingFontInput(value);
    dispatch(setHeadingFont(value));
  };

  const handleBodyFontChange = (value: string) => {
    setBodyFontInput(value);
    dispatch(setBodyFont(value));
  };

  const handleHeadingArrowUp = () => {
    const newIndex = (headingFontIndex + 1) % FONT_OPTIONS.length;
    setHeadingFontIndex(newIndex);
    const font = FONT_OPTIONS[newIndex];
    setHeadingFontInput(font);
    dispatch(setHeadingFont(font));
  };

  const handleHeadingArrowDown = () => {
    const newIndex = (headingFontIndex - 1 + FONT_OPTIONS.length) % FONT_OPTIONS.length;
    setHeadingFontIndex(newIndex);
    const font = FONT_OPTIONS[newIndex];
    setHeadingFontInput(font);
    dispatch(setHeadingFont(font));
  };

  const handleBodyArrowUp = () => {
    const newIndex = (bodyFontIndex + 1) % FONT_OPTIONS.length;
    setBodyFontIndex(newIndex);
    const font = FONT_OPTIONS[newIndex];
    setBodyFontInput(font);
    dispatch(setBodyFont(font));
  };

  const handleBodyArrowDown = () => {
    const newIndex = (bodyFontIndex - 1 + FONT_OPTIONS.length) % FONT_OPTIONS.length;
    setBodyFontIndex(newIndex);
    const font = FONT_OPTIONS[newIndex];
    setBodyFontInput(font);
    dispatch(setBodyFont(font));
  };

  return (
    <div className="h-12 bg-[var(--volute-bg)] border-b border-gray-200 flex items-center px-4 gap-4 overflow-x-auto relative z-10">
      {/* Heading Font */}
      <div className="flex items-center gap-1.5 min-w-fit">
        <label className="text-[10px] text-gray-600 font-medium">Heading</label>
        <div className="flex items-center border border-gray-300 rounded overflow-hidden">
          <Type className="w-3 h-3 ml-1.5 text-gray-400" />
          <input
            type="text"
            value={headingFontInput}
            onChange={(e) => handleHeadingFontChange(e.target.value)}
            className="px-1.5 py-1 text-xs min-w-[100px] outline-none"
            placeholder="Font name"
          />
          <div className="flex flex-col border-l border-gray-300">
            <button
              onClick={handleHeadingArrowUp}
              className="px-0.5 py-0.5 hover:bg-gray-100 text-gray-600"
              title="Next font"
            >
              <ChevronUp className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={handleHeadingArrowDown}
              className="px-0.5 py-0.5 hover:bg-gray-100 text-gray-600 border-t border-gray-300"
              title="Previous font"
            >
              <ChevronDown className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
        <input
          type="number"
          value={theme.headingFontSize}
          onChange={(e) => dispatch(setHeadingFontSize(Number(e.target.value)))}
          className="w-12 px-1.5 py-1 border border-gray-300 rounded text-xs text-center"
          min="8"
          max="72"
        />
      </div>

      <div className="w-px h-6 bg-gray-300" />

      {/* Body Font */}
      <div className="flex items-center gap-1.5 min-w-fit">
        <label className="text-[10px] text-gray-600 font-medium">Body</label>
        <div className="flex items-center border border-gray-300 rounded overflow-hidden">
          <Type className="w-3 h-3 ml-1.5 text-gray-400" />
          <input
            type="text"
            value={bodyFontInput}
            onChange={(e) => handleBodyFontChange(e.target.value)}
            className="px-1.5 py-1 text-xs min-w-[100px] outline-none"
            placeholder="Font name"
          />
          <div className="flex flex-col border-l border-gray-300">
            <button
              onClick={handleBodyArrowUp}
              className="px-0.5 py-0.5 hover:bg-gray-100 text-gray-600"
              title="Next font"
            >
              <ChevronUp className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={handleBodyArrowDown}
              className="px-0.5 py-0.5 hover:bg-gray-100 text-gray-600 border-t border-gray-300"
              title="Previous font"
            >
              <ChevronDown className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
        <input
          type="number"
          value={theme.bodyFontSize}
          onChange={(e) => dispatch(setBodyFontSize(Number(e.target.value)))}
          className="w-12 px-1.5 py-1 border border-gray-300 rounded text-xs text-center"
          min="8"
          max="72"
        />
      </div>

      <div className="w-px h-6 bg-gray-300" />

      {/* Text Colors */}
      <div className="flex items-center gap-2 min-w-fit">
        <label className="text-[10px] text-gray-600 font-medium">Text</label>
        <div className="flex items-center gap-1">
          <label className="text-[10px] text-gray-500">H</label>
          <input
            type="color"
            value={theme.headingTextColor}
            onChange={(e) => dispatch(setHeadingTextColor(e.target.value))}
            className="w-6 h-6 border border-gray-300 rounded cursor-pointer"
          />
        </div>
        <div className="flex items-center gap-1">
          <label className="text-[10px] text-gray-500">B</label>
          <input
            type="color"
            value={theme.bodyTextColor}
            onChange={(e) => dispatch(setBodyTextColor(e.target.value))}
            className="w-6 h-6 border border-gray-300 rounded cursor-pointer"
          />
        </div>
      </div>

      <div className="w-px h-6 bg-gray-300" />

      {/* Slide Background Color */}
      <div className="flex items-center gap-1.5 min-w-fit">
        <label className="text-[10px] text-gray-600 font-medium">Background</label>
        <input
          type="color"
          value={theme.slideBackgroundColor}
          onChange={(e) => dispatch(setSlideBackgroundColor(e.target.value))}
          className="w-6 h-6 border border-gray-300 rounded cursor-pointer"
          title="Slide background color"
        />
      </div>

      <div className="w-px h-6 bg-gray-300" />

      {/* Accent Colors */}
      <div className="flex items-center gap-1.5 min-w-fit">
        <label className="text-[10px] text-gray-600 font-medium flex items-center gap-1">
          Colors
        </label>
        <div className="flex gap-1">
          {theme.accentColors.map((color, index) => (
            <input
              key={index}
              type="color"
              value={color}
              onChange={(e) => dispatch(setAccentColor({ index, color: e.target.value }))}
              className="w-6 h-6 border border-gray-300 rounded cursor-pointer"
              title={`Accent Color ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}