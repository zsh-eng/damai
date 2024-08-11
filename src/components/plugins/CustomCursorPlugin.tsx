import {
  getElementFromSelection,
  getRangeBoundingClientRect,
} from "@/lib/lexical/utils";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  COMMAND_PRIORITY_NORMAL,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from "lexical";
import { useEffect, useState } from "react";

type Cursor = {
  /**
   * The height of the cursor. Defaults to 1.2 times the height of the line.
   */
  height: number;
  /**
   * The width of the character to the right of the cursor.
   * If the cursor is at the end of the line, this will be 0.
   */
  width: number;
  /**
   * The absolute coordinates of the left of the cursor relative to the viewport.
   */
  left: number;
  /**
   * The absolute coordinates of the top of the cursor relative to the viewport.
   */
  top: number;
};

export type CustomCursorPluginProps = {
  render: (cursor: Cursor) => React.ReactNode;
  /**
   * The relative top position of the cursor to the editor container.
   *
   * Set this prop with the offset of the editor container from the top of the viewport
   * if the editor container has a position of relative or absolute.
   */
  offsetTop?: number;

  /**
   * The relative left position of the cursor to the editor container.
   *
   * Set this prop with the offset of the editor container from the left of the viewport
   * if the editor container has a position of relative or absolute.
   */
  offsetLeft?: number;
};

export default function CustomCursorPlugin({
  render,
  offsetTop,
  offsetLeft,
}: CustomCursorPluginProps) {
  const [cursorPosition, setCursorPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [height, setHeight] = useState(24);
  const [width, setWidth] = useState(3);
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const updateCursorPosition = () => {
      const selection = window.getSelection();
      if (!selection) {
        setCursorPosition(null);
        return false;
      }
      // Test that the cursor is hidden when selecting multiple characters
      if (!selection.isCollapsed) {
        setCursorPosition(null);
        return false;
      }

      const element = getElementFromSelection(selection);
      if (!element) {
        console.error("No element found for the selection");
        return false;
      }

      // Test that this works correctly for different node types
      // Otherwise we might still need the lexical way of determining the end
      // of the line.
      const isEndOfLineSelection =
        element.textContent?.length === selection.anchorOffset;

      if (isEndOfLineSelection) {
        setWidth(3);
      } else {
        const range = selection.getRangeAt(0).cloneRange();
        // Check what happnes when the range is at the end of the line
        range.setEnd(
          range.startContainer,
          Math.min(
            range.startOffset + 1,
            range.startContainer.textContent?.length ?? 0,
          ),
        );

        const rect = getRangeBoundingClientRect(range);
        if (!rect) {
          console.error("Bounding client rect not found");
          return false;
        }

        const newWidth = rect.width;
        setWidth(newWidth);
      }

      const range = selection.getRangeAt(0);
      const rect = getRangeBoundingClientRect(range);
      if (!rect) {
        console.error("updateCursorPosition: Bounding client rect not found");
        return false;
      }

      // The dom rects are drawn relative to the viewport,
      // and we want the cursor to move its new position if the editor container moves.
      // The cursor will automatically move to its new position without any changes
      // to the cursor position state.
      // However, we want all subsequent calculations to be relative to the
      // new position of the editor container.
      const fontSize = window.getComputedStyle(element).fontSize;
      const fontSizeNumber = parseFloat(fontSize);
      const cursorHeight = fontSizeNumber * 1.2;
      // On new lines, the cursor should be offset a little bit more
      // as the height of the element is greater than the cursor height.
      setCursorPosition({
        top: rect.top + (rect.height - cursorHeight) / 2,
        left: rect.left,
      });
      setHeight(cursorHeight);

      return false;
    };

    // It's necessary to update the cursor position everytime the offset changes
    // This is such that we position the cursor correctly when we scroll.
    updateCursorPosition();
    const unregisterCommand = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      updateCursorPosition,
      COMMAND_PRIORITY_NORMAL,
    );

    const unregisterCommand2 = editor.registerCommand(
      UNDO_COMMAND,
      updateCursorPosition,
      COMMAND_PRIORITY_NORMAL,
    );

    const loseFocusListener = () => {
      setCursorPosition(null);
    };

    document.addEventListener("focusout", loseFocusListener);

    return () => {
      unregisterCommand();
      unregisterCommand2();
      document.removeEventListener("blur", loseFocusListener);
    };
  }, [offsetLeft, offsetTop, editor]);
  // should hide the styling when the editor is not in focus
  // or is in read only mode

  // Cursor styling inspired by https://github.com/pacocoursey/writer/blob/main/src/cursor.
  return (
    <>
      {cursorPosition &&
        render({
          height,
          width,
          left: cursorPosition.left - (offsetLeft || 0),
          top: cursorPosition.top - (offsetTop || 0),
        })}
    </>
  );
}
