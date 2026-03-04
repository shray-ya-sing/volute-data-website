import { useState, useRef, useEffect } from "react";
import { ChevronDown, Type, Palette } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  setHeadingFont,
  setBodyFont,
  setAccentColor,
  setHeadingTextColor,
  setBodyTextColor,
  setHeadingFontSize,
  setBodyFontSize,
} from "../store/themeSlice";

const FONT_OPTIONS = [
  "Inter",
  "Arial",
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
  const [showHeadingFontPicker, setShowHeadingFontPicker] = useState(false);
  const [showBodyFontPicker, setShowBodyFontPicker] = useState(false);
  const headingFontRef = useRef<HTMLDivElement>(null);
  const bodyFontRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headingFontRef.current && !headingFontRef.current.contains(event.target as Node)) {
        setShowHeadingFontPicker(false);
      }
      if (bodyFontRef.current && !bodyFontRef.current.contains(event.target as Node)) {
        setShowBodyFontPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-6 overflow-x-auto relative z-50">
      {/* Heading Font */}
      <div className="flex items-center gap-2 min-w-fit">
        <label className="text-xs text-gray-600 font-medium">Heading</label>
        <div className="relative" ref={headingFontRef}>
          <button
            onClick={() => setShowHeadingFontPicker(!showHeadingFontPicker)}
            className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-sm min-w-[120px]"
          >
            <Type className="w-3.5 h-3.5" />
            <span className="flex-1 text-left truncate">{theme.headingFont}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {showHeadingFontPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-60 overflow-y-auto">
              {FONT_OPTIONS.map((font) => (
                <button
                  key={font}
                  onClick={() => {
                    dispatch(setHeadingFont(font));
                    setShowHeadingFontPicker(false);
                  }}
                  className="block w-full text-left px-3 py-2 hover:bg-blue-50 text-sm whitespace-nowrap"
                  style={{ fontFamily: font }}
                >
                  {font}
                </button>
              ))}
            </div>
          )}
        </div>
        <input
          type="number"
          value={theme.headingFontSize}
          onChange={(e) => dispatch(setHeadingFontSize(Number(e.target.value)))}
          className="w-16 px-2 py-1.5 border border-gray-300 rounded text-sm text-center"
          min="8"
          max="72"
        />
      </div>

      <div className="w-px h-8 bg-gray-300" />

      {/* Body Font */}
      <div className="flex items-center gap-2 min-w-fit">
        <label className="text-xs text-gray-600 font-medium">Body</label>
        <div className="relative" ref={bodyFontRef}>
          <button
            onClick={() => setShowBodyFontPicker(!showBodyFontPicker)}
            className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-sm min-w-[120px]"
          >
            <Type className="w-3.5 h-3.5" />
            <span className="flex-1 text-left truncate">{theme.bodyFont}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {showBodyFontPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-60 overflow-y-auto">
              {FONT_OPTIONS.map((font) => (
                <button
                  key={font}
                  onClick={() => {
                    dispatch(setBodyFont(font));
                    setShowBodyFontPicker(false);
                  }}
                  className="block w-full text-left px-3 py-2 hover:bg-blue-50 text-sm whitespace-nowrap"
                  style={{ fontFamily: font }}
                >
                  {font}
                </button>
              ))}
            </div>
          )}
        </div>
        <input
          type="number"
          value={theme.bodyFontSize}
          onChange={(e) => dispatch(setBodyFontSize(Number(e.target.value)))}
          className="w-16 px-2 py-1.5 border border-gray-300 rounded text-sm text-center"
          min="8"
          max="72"
        />
      </div>

      <div className="w-px h-8 bg-gray-300" />

      {/* Text Colors */}
      <div className="flex items-center gap-3 min-w-fit">
        <label className="text-xs text-gray-600 font-medium">Text</label>
        <div className="flex items-center gap-1">
          <label className="text-xs text-gray-500">H</label>
          <input
            type="color"
            value={theme.headingTextColor}
            onChange={(e) => dispatch(setHeadingTextColor(e.target.value))}
            className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
          />
        </div>
        <div className="flex items-center gap-1">
          <label className="text-xs text-gray-500">B</label>
          <input
            type="color"
            value={theme.bodyTextColor}
            onChange={(e) => dispatch(setBodyTextColor(e.target.value))}
            className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
          />
        </div>
      </div>

      <div className="w-px h-8 bg-gray-300" />

      {/* Accent Colors */}
      <div className="flex items-center gap-2 min-w-fit">
        <label className="text-xs text-gray-600 font-medium flex items-center gap-1">
          <Palette className="w-3.5 h-3.5" />
          Colors
        </label>
        <div className="flex gap-1">
          {theme.accentColors.map((color, index) => (
            <input
              key={index}
              type="color"
              value={color}
              onChange={(e) => dispatch(setAccentColor({ index, color: e.target.value }))}
              className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
              title={`Accent Color ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}