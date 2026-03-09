import { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import type { Identifier } from "dnd-core";

interface DraggableThumbnailProps {
  id: string;
  index: number;
  slideNumber: number;
  isSelected: boolean;
  onClick: () => void;
  onMove: (fromIndex: number, toIndex: number) => void;
}

interface DragItem {
  type: string;
  id: string;
  index: number;
}

const ITEM_TYPE = "SLIDE_THUMBNAIL";

export function DraggableThumbnail({
  id,
  index,
  slideNumber,
  isSelected,
  onClick,
  onMove,
}: DraggableThumbnailProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop<DragItem, void, { handlerId: Identifier | null }>({
    accept: ITEM_TYPE,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: DragItem, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      // Get pixels to the top
      const hoverClientY = (clientOffset?.y ?? 0) - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Time to actually perform the action
      onMove(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: () => {
      return { id, index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      onClick={onClick}
      data-handler-id={handlerId}
      className={`w-full aspect-video bg-white border-2 rounded shadow-sm mb-2 cursor-grab active:cursor-grabbing transition-all ${
        isSelected ? 'border-blue-500' : 'border-gray-300 hover:border-blue-300'
      } ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      <div className="w-full h-full bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <span className="text-xs text-gray-400">{slideNumber}</span>
      </div>
    </div>
  );
}
