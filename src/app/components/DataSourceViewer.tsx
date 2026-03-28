import { X, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SlideDataPoint } from "../types/slideData";

interface DataSourceViewerProps {
  dataPoint: SlideDataPoint | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DataSourceViewer({ dataPoint, isOpen, onClose }: DataSourceViewerProps) {
  // This component is deprecated - sources are now shown in DataPointSourcesPane
  return null;
}