import { cn } from "@/lib/utils";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { createDOMRange, createRectsFromDOMRange } from "@lexical/selection";
import {
  $getSelection,
  $isRangeSelection,
  CommandListener,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import { useEffect, useState } from "react";

type CustomCursorPluginProps = {
  /**
   * The offset of the editor container from the top and left of the viewport.
   *
   * Provide this field if the editor container is positioned `relative`.
   *
   * If the offset provided changes from "undefined" to a value, the cursor
   * will be immedidately updated to the new position.
   * This is useful for when the offset is initially set to `undefined` and
   * is later set to a value.
   */
  offset?: {
    top: number;
    left: number;
  };
};

/**
 * A custom cursor plugin that shows a cursor at the current selection.
 *
 * The cursor is a vertical line that smoothly transitions to the next position.
 * @returns
 */
export default function CustomCursorPlugin({
  offset,
}: CustomCursorPluginProps) {
  const [cursorPosition, setCursorPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [height, setHeight] = useState(24);
  const [editor] = useLexicalComposerContext();
  const [previousOffset, setPreviousOffset] = useState(offset);

  console.log(offset);
  useEffect(() => {
    setPreviousOffset(offset);
  }, [offset]);

  // Force the cursor to update when an offset is provided
  useEffect(() => {
    if (
      previousOffset === undefined &&
      offset !== undefined &&
      cursorPosition
    ) {
      setCursorPosition({
        top: cursorPosition.top - offset.top,
        left: cursorPosition.left - offset.left,
      });
    }
  }, [offset, previousOffset, cursorPosition]);

  useEffect(() => {
    const updateCursorPosition: CommandListener<void> = (_payload, editor) => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        return false;
      }

      const hasMultipleCharacters =
        selection.anchor.offset - selection.focus.offset !== 0;

      if (hasMultipleCharacters) {
        setCursorPosition(null);
        return false;
      }

      const anchorNode = selection.anchor.getNode();
      const focusNode = selection.focus.getNode();

      const domRange = createDOMRange(
        editor,
        anchorNode,
        selection.anchor.offset,
        focusNode,
        selection.focus.offset,
      );
      if (!domRange) {
        return false;
      }

      // const blockRange = createDOMRange(
      //   editor,
      //   anchorNode,
      //   selection.anchor.offset,
      //   focusNode,
      //   selection.focus.offset,
      // );
      // console.log(blockRange);

      const [rect] = createRectsFromDOMRange(editor, domRange);
      // The dom rects are drawn relative to the viewport,
      // and we want the cursor to move it's position if the editor container
      // moves.
      // However, we want all subsequent calculations to be relative to the
      // new position of the editor container.
      setCursorPosition({
        top: rect.top - (offset?.top ?? 0),
        left: rect.right - (offset?.left ?? 0),
      });
      setHeight(rect.height * 1.05);

      return false;
    };

    const unregisterCommand = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      updateCursorPosition,
      1,
    );

    return () => {
      unregisterCommand();
    };
  }, [offset]);
  // should hide the styling when the editor is not in focus
  // or is in read only mode

  // Cursor styling inspired by https://github.com/pacocoursey/writer/blob/main/src/cursor.js
  return (
    // Render the cursor only after the cursor position is set to prevent a flash
    cursorPosition && (
      <div
        style={{
          translate: `${cursorPosition.left}px ${cursorPosition.top}px`,
          height: `${height}px`,
          width: "3px",
        }}
        // `ease-in` looks jittery when the user is typing
        // `ease-out` looks smoother
        className={cn(
          "pointer-events-none absolute left-0 top-0 z-20 rounded-xl bg-primary/70 transition-all ease-out will-change-transform",
          "duration-75",
        )}
      />
    )
  );
}
