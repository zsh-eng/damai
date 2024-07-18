import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Toggle } from '@/components/ui/toggle';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import {
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND
} from 'lexical';
import {
  Bold,
  Italic,
  Redo,
  Strikethrough,
  Underline,
  Undo,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const LowPriority = 1;

export default function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      // Update text format
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        (_payload, _newEditor) => {
          $updateToolbar();
          return false;
        },
        LowPriority
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        LowPriority
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        LowPriority
      )
    );
  }, [editor, $updateToolbar]);

  return (
    <div className='flex gap-1 py-2 px-4 fixed left-1/2 -translate-x-1/2 bottom-4 bg-background rounded-xl shadow-xl text-foreground' ref={toolbarRef}>
      <Button
        size='icon'
        variant={'ghost'}
        disabled={!canUndo}
        onClick={() => {
          editor.dispatchCommand(UNDO_COMMAND, undefined);
        }}
        aria-label='Undo'
      >
        <Undo className='h-4 w-4' />
      </Button>
      <Button
        size='icon'
        variant={'ghost'}
        disabled={!canRedo}
        onClick={() => {
          editor.dispatchCommand(REDO_COMMAND, undefined);
        }}
        aria-label='Redo'
      >
        <Redo className='h-4 w-4' />
      </Button>
      <Separator orientation='vertical' />
      <Toggle
        value='bold'
        pressed={isBold}
        onPressedChange={() => {
          setIsBold(!isBold);
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
        }}
        aria-label='Format Bold'
      >
        <Bold className='h-4 w-4' />
      </Toggle>
      <Toggle
        pressed={isItalic}
        onPressedChange={() => {
          setIsItalic(!isItalic);
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
        }}
        aria-label='Format Italics'
      >
        <Italic className='h-4 w-4' />
      </Toggle>
      <Toggle
        pressed={isUnderline}
        onPressedChange={() => {
          setIsUnderline(!isUnderline);
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
        }}
        aria-label='Format Underline'
      >
        <Underline className='h-4 w-4' />
      </Toggle>
      <Toggle
        pressed={isStrikethrough}
        onPressedChange={() => {
          setIsStrikethrough(!isStrikethrough);
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
        }}
        aria-label='Format Strikethrough'
      >
        <Strikethrough className='h-4 w-4' />
      </Toggle>
      <Separator orientation='vertical' />
    </div>
  );
}
