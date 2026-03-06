import type { CSSProperties } from './tailwind-resolver';

export interface LayoutNode {
  tagName: string;
  className: string;
  styles: CSSProperties;
  props: Record<string, any>;
  textContent: string;
  children: LayoutNode[];
  position?: {
    x: number; // EMU
    y: number; // EMU
    width: number; // EMU
    height: number; // EMU
  };
}

// Slide dimensions in EMU (widescreen 16:9)
const SLIDE_WIDTH_EMU = 12192000;
const SLIDE_HEIGHT_EMU = 6858000;

// Canvas dimensions in pixels (what the React component uses)
const CANVAS_WIDTH_PX = 960;
const CANVAS_HEIGHT_PX = 540;

// Conversion factor
const PX_TO_EMU = 9525;

/**
 * Calculate layout and positions for all nodes in the tree
 */
export function calculateLayout(root: LayoutNode): LayoutNode {
  // Start with full slide dimensions
  const rootBounds = {
    x: 0,
    y: 0,
    width: SLIDE_WIDTH_EMU,
    height: SLIDE_HEIGHT_EMU,
  };

  calculateNodeLayout(root, rootBounds);

  return root;
}

/**
 * Calculate layout for a single node and its children
 */
function calculateNodeLayout(
  node: LayoutNode,
  parentBounds: { x: number; y: number; width: number; height: number }
): void {
  // Calculate this node's dimensions
  const nodeDimensions = calculateDimensions(node, parentBounds);

  // Calculate this node's position
  const nodePosition = calculatePosition(node, parentBounds, nodeDimensions);

  // Set the calculated position
  node.position = {
    x: nodePosition.x,
    y: nodePosition.y,
    width: nodeDimensions.width,
    height: nodeDimensions.height,
  };

  // Calculate layout for children
  if (node.children.length > 0) {
    const contentBounds = calculateContentBounds(node, node.position);

    if (node.styles.display === 'flex') {
      layoutFlexChildren(node, contentBounds);
    } else if (node.styles.display === 'grid') {
      layoutGridChildren(node, contentBounds);
    } else {
      // Default: stack children vertically
      layoutBlockChildren(node, contentBounds);
    }
  }
}

/**
 * Calculate dimensions for a node
 */
function calculateDimensions(
  node: LayoutNode,
  parentBounds: { x: number; y: number; width: number; height: number }
): { width: number; height: number } {
  let width = parentBounds.width;
  let height = parentBounds.height;

  // Width
  if (node.styles.width !== undefined) {
    if (typeof node.styles.width === 'number') {
      width = pxToEMU(node.styles.width);
    } else if (node.styles.width === '100%') {
      width = parentBounds.width;
    } else if (node.styles.width === 'auto') {
      // Auto width - calculate based on content
      width = calculateAutoWidth(node);
    }
  }

  // Height
  if (node.styles.height !== undefined) {
    if (typeof node.styles.height === 'number') {
      height = pxToEMU(node.styles.height);
    } else if (node.styles.height === '100%') {
      height = parentBounds.height;
    } else if (node.styles.height === 'auto') {
      // Auto height - calculate based on content
      height = calculateAutoHeight(node);
    }
  }

  // Apply min/max constraints
  if (node.styles.minWidth) width = Math.max(width, pxToEMU(node.styles.minWidth));
  if (node.styles.maxWidth) width = Math.min(width, pxToEMU(node.styles.maxWidth));
  if (node.styles.minHeight) height = Math.max(height, pxToEMU(node.styles.minHeight));
  if (node.styles.maxHeight) height = Math.min(height, pxToEMU(node.styles.maxHeight));

  // Handle special props (for charts)
  if (node.props.width && typeof node.props.width === 'number') {
    width = pxToEMU(node.props.width);
  }
  if (node.props.height && typeof node.props.height === 'number') {
    height = pxToEMU(node.props.height);
  }

  return { width, height };
}

/**
 * Calculate position for a node
 */
function calculatePosition(
  node: LayoutNode,
  parentBounds: { x: number; y: number; width: number; height: number },
  dimensions: { width: number; height: number }
): { x: number; y: number } {
  let x = parentBounds.x;
  let y = parentBounds.y;

  // Absolute positioning
  if (node.styles.position === 'absolute') {
    // Start from parent bounds
    x = parentBounds.x;
    y = parentBounds.y;

    // Apply inset values
    if (node.styles.left !== undefined) {
      x = parentBounds.x + pxToEMU(node.styles.left);
    }
    if (node.styles.right !== undefined) {
      x = parentBounds.x + parentBounds.width - pxToEMU(node.styles.right) - dimensions.width;
    }
    if (node.styles.top !== undefined) {
      y = parentBounds.y + pxToEMU(node.styles.top);
    }
    if (node.styles.bottom !== undefined) {
      y = parentBounds.y + parentBounds.height - pxToEMU(node.styles.bottom) - dimensions.height;
    }
  } else {
    // Relative/static positioning (will be handled by parent layout)
    x = parentBounds.x;
    y = parentBounds.y;
  }

  return { x, y };
}

/**
 * Calculate content bounds (area available for children after padding)
 */
function calculateContentBounds(
  node: LayoutNode,
  position: { x: number; y: number; width: number; height: number }
): { x: number; y: number; width: number; height: number } {
  const padding = {
    top: pxToEMU(node.styles.paddingTop || node.styles.padding || 0),
    right: pxToEMU(node.styles.paddingRight || node.styles.padding || 0),
    bottom: pxToEMU(node.styles.paddingBottom || node.styles.padding || 0),
    left: pxToEMU(node.styles.paddingLeft || node.styles.padding || 0),
  };

  return {
    x: position.x + padding.left,
    y: position.y + padding.top,
    width: position.width - padding.left - padding.right,
    height: position.height - padding.top - padding.bottom,
  };
}

/**
 * Layout children using flexbox
 */
function layoutFlexChildren(
  node: LayoutNode,
  contentBounds: { x: number; y: number; width: number; height: number }
): void {
  const isColumn = node.styles.flexDirection === 'column';
  const gap = pxToEMU(node.styles.gap || 0);

  let currentX = contentBounds.x;
  let currentY = contentBounds.y;

  node.children.forEach((child, index) => {
    const childDimensions = calculateDimensions(child, contentBounds);

    // Position child
    child.position = {
      x: currentX,
      y: currentY,
      width: childDimensions.width,
      height: childDimensions.height,
    };

    // Recursively layout child's children
    const childContentBounds = calculateContentBounds(child, child.position);
    if (child.children.length > 0) {
      if (child.styles.display === 'flex') {
        layoutFlexChildren(child, childContentBounds);
      } else if (child.styles.display === 'grid') {
        layoutGridChildren(child, childContentBounds);
      } else {
        layoutBlockChildren(child, childContentBounds);
      }
    }

    // Move cursor for next child
    if (isColumn) {
      currentY += childDimensions.height + (index < node.children.length - 1 ? gap : 0);
    } else {
      currentX += childDimensions.width + (index < node.children.length - 1 ? gap : 0);
    }
  });

  // Apply justify-content and align-items
  applyFlexAlignment(node, contentBounds);
}

/**
 * Layout children using CSS grid
 */
function layoutGridChildren(
  node: LayoutNode,
  contentBounds: { x: number; y: number; width: number; height: number }
): void {
  const gridTemplateColumns = node.styles.gridTemplateColumns || 'repeat(1, 1fr)';
  const gap = pxToEMU(node.styles.gap || 0);

  // Parse grid-template-columns: "repeat(4, 1fr)"
  const colsMatch = gridTemplateColumns.match(/repeat\((\d+),\s*1fr\)/);
  const numColumns = colsMatch ? parseInt(colsMatch[1]) : 1;

  // Calculate column width
  const totalGapWidth = gap * (numColumns - 1);
  const columnWidth = (contentBounds.width - totalGapWidth) / numColumns;

  let row = 0;
  let col = 0;

  node.children.forEach((child) => {
    const x = contentBounds.x + col * (columnWidth + gap);
    const y = contentBounds.y + row * (columnWidth + gap); // Assume square for now

    const childDimensions = calculateDimensions(child, {
      ...contentBounds,
      width: columnWidth,
    });

    child.position = {
      x,
      y,
      width: childDimensions.width,
      height: childDimensions.height,
    };

    // Recursively layout child's children
    const childContentBounds = calculateContentBounds(child, child.position);
    if (child.children.length > 0) {
      if (child.styles.display === 'flex') {
        layoutFlexChildren(child, childContentBounds);
      } else if (child.styles.display === 'grid') {
        layoutGridChildren(child, childContentBounds);
      } else {
        layoutBlockChildren(child, childContentBounds);
      }
    }

    // Move to next column/row
    col++;
    if (col >= numColumns) {
      col = 0;
      row++;
    }
  });
}

/**
 * Layout children in block mode (stack vertically)
 */
function layoutBlockChildren(
  node: LayoutNode,
  contentBounds: { x: number; y: number; width: number; height: number }
): void {
  let currentY = contentBounds.y;

  node.children.forEach((child) => {
    const childDimensions = calculateDimensions(child, contentBounds);

    child.position = {
      x: contentBounds.x,
      y: currentY,
      width: childDimensions.width,
      height: childDimensions.height,
    };

    // Recursively layout child's children
    const childContentBounds = calculateContentBounds(child, child.position);
    if (child.children.length > 0) {
      if (child.styles.display === 'flex') {
        layoutFlexChildren(child, childContentBounds);
      } else if (child.styles.display === 'grid') {
        layoutGridChildren(child, childContentBounds);
      } else {
        layoutBlockChildren(child, childContentBounds);
      }
    }

    currentY += childDimensions.height + pxToEMU(child.styles.marginBottom || 0);
  });
}

/**
 * Apply flexbox alignment (justify-content, align-items)
 */
function applyFlexAlignment(
  node: LayoutNode,
  contentBounds: { x: number; y: number; width: number; height: number }
): void {
  // TODO: Implement justify-content and align-items adjustments
  // For now, children are positioned at start
}

/**
 * Calculate auto width based on content
 */
function calculateAutoWidth(node: LayoutNode): number {
  // For now, use a default or estimate based on text content
  if (node.textContent) {
    // Rough estimate: 8px per character
    return pxToEMU(node.textContent.length * 8);
  }
  return pxToEMU(100); // Default
}

/**
 * Calculate auto height based on content
 */
function calculateAutoHeight(node: LayoutNode): number {
  // For now, use a default or estimate
  if (node.textContent) {
    const fontSize = node.styles.fontSize || 16;
    return pxToEMU(fontSize * 1.5); // Line height
  }
  return pxToEMU(50); // Default
}

/**
 * Convert pixels to EMU
 */
function pxToEMU(px: number): number {
  return Math.round(px * PX_TO_EMU);
}
