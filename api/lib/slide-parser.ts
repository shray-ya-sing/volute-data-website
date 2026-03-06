import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

// Handle default exports
const babelParse = parser.parse || (parser as any).default?.parse || parser;
const babelTraverse = (traverse as any).default || traverse;
import { resolveClassNames } from './tailwind-resolver';
import { calculateLayout, type LayoutNode } from './layout-engine';
import { extractChartData } from './chart-extractor';
import { SlideSchema, ElementDefinition } from './types';

/**
 * Main entry point: Parse TypeScript/React component code to SlideSchema JSON
 */
export function parseComponentToSlideSchema(code: string): SlideSchema {
  // Step 1: Parse code to AST
  const ast = babelParse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });

  // Step 2: Extract component data (useState values, props, etc.)
  const componentData = extractComponentData(ast);

  // Step 3: Find the main JSX return statement
  const jsxElement = findMainJSXElement(ast);

  if (!jsxElement) {
    throw new Error('Could not find JSX return statement in component');
  }

  // Step 4: Build a layout tree from JSX
  const layoutTree = buildLayoutTree(jsxElement, componentData);

  // Step 5: Calculate positions (this converts CSS/Tailwind to absolute EMU positions)
  const positionedTree = calculateLayout(layoutTree);

  // Step 6: Convert to PowerPoint elements
  const elements = convertToElements(positionedTree, componentData);

  // Step 7: Build final SlideSchema
  return {
    slide: {
      width: 12192000, // Widescreen 16:9
      height: 6858000,
      background: extractBackground(layoutTree),
      elements,
    },
  };
}

/**
 * Extract component data (useState values, variables, etc.)
 */
function extractComponentData(ast: t.File): Map<string, any> {
  const data = new Map<string, any>();

  babelTraverse(ast, {
    VariableDeclarator(path) {
      // Extract useState values: const [name] = useState([...])
      if (
        t.isArrayPattern(path.node.id) &&
        path.node.id.elements.length > 0 &&
        t.isIdentifier(path.node.id.elements[0])
      ) {
        const varName = path.node.id.elements[0].name;

        if (
          t.isCallExpression(path.node.init) &&
          t.isIdentifier(path.node.init.callee) &&
          path.node.init.callee.name === 'useState' &&
          path.node.init.arguments.length > 0
        ) {
          const initialValue = path.node.init.arguments[0];
          // Try to evaluate the literal value
          const value = evaluateLiteral(initialValue);
          if (value !== undefined) {
            data.set(varName, value);
          }
        }
      }

      // Extract regular variable declarations: const name = [...]
      if (
        t.isIdentifier(path.node.id) &&
        path.node.init
      ) {
        const varName = path.node.id.name;
        const value = evaluateLiteral(path.node.init);
        if (value !== undefined) {
          data.set(varName, value);
        }
      }
    },
  });

  return data;
}

/**
 * Find the main JSX element returned by the component
 */
function findMainJSXElement(ast: t.File): t.JSXElement | null {
  let mainElement: t.JSXElement | null = null;

  babelTraverse(ast, {
    ReturnStatement(path) {
      if (t.isJSXElement(path.node.argument)) {
        mainElement = path.node.argument;
        path.stop();
      }
      if (t.isJSXFragment(path.node.argument)) {
        // Handle fragments: return <><div>...</div></>
        if (path.node.argument.children.length > 0) {
          const firstChild = path.node.argument.children[0];
          if (t.isJSXElement(firstChild)) {
            mainElement = firstChild;
            path.stop();
          }
        }
      }
    },
  });

  return mainElement;
}

/**
 * Build a layout tree from JSX (with styles, dimensions, children)
 */
function buildLayoutTree(
  jsxElement: t.JSXElement,
  componentData: Map<string, any>
): LayoutNode {
  const tagName = t.isJSXIdentifier(jsxElement.openingElement.name)
    ? jsxElement.openingElement.name.name
    : 'Unknown';

  // Extract className attribute
  const classNameAttr = jsxElement.openingElement.attributes.find(
    (attr) =>
      t.isJSXAttribute(attr) &&
      t.isJSXIdentifier(attr.name) &&
      attr.name.name === 'className'
  ) as t.JSXAttribute | undefined;

  let className = '';
  if (classNameAttr && t.isStringLiteral(classNameAttr.value)) {
    className = classNameAttr.value.value;
  }

  // Extract other props (data, width, height, etc.)
  const props: Record<string, any> = {};
  jsxElement.openingElement.attributes.forEach((attr) => {
    if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
      const propName = attr.name.name;
      if (attr.value) {
        if (t.isStringLiteral(attr.value)) {
          props[propName] = attr.value.value;
        } else if (t.isJSXExpressionContainer(attr.value)) {
          const value = evaluateLiteral(attr.value.expression);
          props[propName] = value;
        }
      } else {
        // Boolean prop: <Component enabled />
        props[propName] = true;
      }
    }
  });

  // Resolve data prop references (e.g., data={acyData})
  if (props.data && typeof props.data === 'string' && componentData.has(props.data)) {
    props.data = componentData.get(props.data);
  }

  // Resolve Tailwind classes to CSS properties
  const styles = resolveClassNames(className);

  // Extract text content from children
  let textContent = '';
  const childNodes: LayoutNode[] = [];

  jsxElement.children.forEach((child) => {
    if (t.isJSXText(child)) {
      textContent += child.value.trim();
    } else if (t.isJSXExpressionContainer(child)) {
      if (t.isStringLiteral(child.expression)) {
        textContent += child.expression.value;
      } else if (t.isNumericLiteral(child.expression)) {
        textContent += child.expression.value.toString();
      }
    } else if (t.isJSXElement(child)) {
      childNodes.push(buildLayoutTree(child, componentData));
    }
  });

  return {
    tagName,
    className,
    styles,
    props,
    textContent,
    children: childNodes,
    // Position will be calculated by layout engine
    position: undefined,
  };
}

/**
 * Convert positioned layout tree to PowerPoint elements
 */
function convertToElements(
  node: LayoutNode,
  componentData: Map<string, any>,
  elements: ElementDefinition[] = [],
  idCounter = { value: 2 }
): ElementDefinition[] {
  // Handle different element types
  if (isChartComponent(node.tagName)) {
    // Chart elements (LineChart, BarChart)
    const chartElement = extractChartData(node, idCounter.value++, componentData);
    if (chartElement) {
      elements.push(chartElement);
    }
  } else if (node.tagName === 'table') {
    // Table elements
    const tableElement = convertTableElement(node, idCounter.value++);
    if (tableElement) {
      elements.push(tableElement);
    }
  } else if (node.tagName === 'img') {
    // Image elements
    const imgElement = convertImageElement(node, idCounter.value++);
    if (imgElement) {
      elements.push(imgElement);
    }
  } else if (node.tagName === 'hr' || (node.tagName === 'div' && isDivider(node))) {
    // Horizontal rule / divider line
    const lineElement = convertLineElement(node, idCounter.value++);
    if (lineElement) {
      elements.push(lineElement);
    }
  } else if (hasVisualOutput(node)) {
    // Shape / text box
    const shapeElement = convertShapeElement(node, idCounter.value++);
    if (shapeElement) {
      elements.push(shapeElement);
    }
  }

  // Recursively process children
  node.children.forEach((child) => {
    convertToElements(child, componentData, elements, idCounter);
  });

  return elements;
}

/**
 * Convert a layout node to a shape element (sp)
 */
function convertShapeElement(node: LayoutNode, id: number): ElementDefinition | null {
  if (!node.position) return null;

  const element: ElementDefinition = {
    type: 'sp',
    id,
    name: `shape-${id}`,
    position: {
      x: node.position.x,
      y: node.position.y,
      cx: node.position.width,
      cy: node.position.height,
    },
  };

  // Fill
  if (node.styles.backgroundColor) {
    element.fill = {
      type: 'solid',
      color: normalizeColor(node.styles.backgroundColor),
    };
  } else {
    element.fill = { type: 'none' };
  }

  // Border
  if (node.styles.borderColor && node.styles.borderWidth) {
    element.border = {
      type: 'solid',
      color: normalizeColor(node.styles.borderColor),
      width: pxToEMU(node.styles.borderWidth),
    };
  } else {
    element.border = { type: 'none' };
  }

  // Text
  if (node.textContent || hasTextChildren(node)) {
    element.text = {
      body: {
        anchor: node.styles.verticalAlign || 't',
        autofit: false,
        paragraphs: buildParagraphs(node),
      },
    };
  }

  return element;
}

/**
 * Build paragraph definitions from a node and its text children
 */
function buildParagraphs(node: LayoutNode): any[] {
  const paragraphs: any[] = [];

  if (node.textContent) {
    paragraphs.push({
      alignment: node.styles.textAlign || 'left',
      lineSpacing: 0,
      runs: [
        {
          text: node.textContent,
          bold: node.styles.fontWeight === 'bold' || node.styles.fontWeight >= 600,
          italic: node.styles.fontStyle === 'italic',
          fontSize: pxToHalfPoints(node.styles.fontSize || 16),
          color: normalizeColor(node.styles.color || '#000000'),
        },
      ],
    });
  }

  // Handle text children recursively
  node.children.forEach((child) => {
    if (child.textContent) {
      paragraphs.push({
        alignment: child.styles.textAlign || 'left',
        lineSpacing: 0,
        runs: [
          {
            text: child.textContent,
            bold: child.styles.fontWeight === 'bold' || child.styles.fontWeight >= 600,
            italic: child.styles.fontStyle === 'italic',
            fontSize: pxToHalfPoints(child.styles.fontSize || 16),
            color: normalizeColor(child.styles.color || '#000000'),
          },
        ],
      });
    }
  });

  return paragraphs;
}

/**
 * Convert table element
 */
function convertTableElement(node: LayoutNode, id: number): ElementDefinition | null {
  // TODO: Implement table conversion
  return null;
}

/**
 * Convert image element
 */
function convertImageElement(node: LayoutNode, id: number): ElementDefinition | null {
  // TODO: Implement image conversion
  return null;
}

/**
 * Convert line/divider element
 */
function convertLineElement(node: LayoutNode, id: number): ElementDefinition | null {
  if (!node.position) return null;

  return {
    type: 'cxnSp',
    id,
    name: `divider-${id}`,
    position: {
      x: node.position.x,
      y: node.position.y,
      cx: node.position.width,
      cy: 0,
    },
    line: {
      color: normalizeColor(node.styles.borderColor || '#374151'),
      width: pxToEMU(node.styles.borderWidth || 1),
    },
    headEnd: { type: 'none' },
    tailEnd: { type: 'none' },
  };
}

/**
 * Extract background from root node
 */
function extractBackground(node: LayoutNode): any {
  if (node.styles.backgroundColor) {
    return {
      fill: {
        type: 'solid',
        color: normalizeColor(node.styles.backgroundColor),
      },
    };
  }
  return undefined;
}

// ============================================================================
// Helper Functions
// ============================================================================

function isChartComponent(tagName: string): boolean {
  return ['LineChart', 'BarChart', 'PieChart'].includes(tagName);
}

function isDivider(node: LayoutNode): boolean {
  // A div is a divider if it has a very small height and a background/border
  return (
    node.styles.height !== undefined &&
    node.styles.height <= 4 &&
    (node.styles.backgroundColor || node.styles.borderTop)
  );
}

function hasVisualOutput(node: LayoutNode): boolean {
  return (
    !!node.textContent ||
    !!node.styles.backgroundColor ||
    !!node.styles.borderColor ||
    hasTextChildren(node)
  );
}

function hasTextChildren(node: LayoutNode): boolean {
  return node.children.some((child) => !!child.textContent || hasTextChildren(child));
}

/**
 * Evaluate a literal AST node to a JavaScript value
 */
function evaluateLiteral(node: any): any {
  if (t.isStringLiteral(node)) return node.value;
  if (t.isNumericLiteral(node)) return node.value;
  if (t.isBooleanLiteral(node)) return node.value;
  if (t.isNullLiteral(node)) return null;
  if (t.isArrayExpression(node)) {
    return node.elements.map((el) => evaluateLiteral(el));
  }
  if (t.isObjectExpression(node)) {
    const obj: Record<string, any> = {};
    node.properties.forEach((prop: any) => {
      if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
        obj[prop.key.name] = evaluateLiteral(prop.value);
      }
    });
    return obj;
  }
  if (t.isIdentifier(node)) {
    // Return identifier name as string reference
    return node.name;
  }
  return undefined;
}

/**
 * Normalize color to 6-char uppercase hex without #
 */
function normalizeColor(color: string): string {
  if (!color) return '000000';

  // Remove # if present
  color = color.replace('#', '');

  // If it's already 6 chars, uppercase and return
  if (color.length === 6) {
    return color.toUpperCase();
  }

  // If it's 3 chars, expand (e.g., 'abc' -> 'aabbcc')
  if (color.length === 3) {
    return color
      .split('')
      .map((c) => c + c)
      .join('')
      .toUpperCase();
  }

  // Default to black
  return '000000';
}

/**
 * Convert pixels to EMU (English Metric Units)
 * 1 px @ 96 DPI = 9525 EMU
 */
function pxToEMU(px: number): number {
  return Math.round(px * 9525);
}

/**
 * Convert pixels to half-points for font size
 * Formula: (px / 0.75) * 100
 * Examples: 12px -> 1600, 14px -> 1867, 18px -> 2400, 24px -> 3200
 */
function pxToHalfPoints(px: number): number {
  return Math.round((px / 0.75) * 100);
}
