import {
  DAMAI_COMMANDS,
  dispatchDamaiCommand,
  registerDamaiCommandListener,
} from "@/commands/index.ts";
import VimCursorPlugin from "@/components/plugins/VimCursorPlugin.tsx";
import VimPlugin from "@/components/plugins/VimPlugin.tsx";
import useDamaiCommandShortcut from "@/components/use-shortcut.tsx";
import { type File } from "@/hooks/use-file.ts";
import { CodeNode } from "@lexical/code";
import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
} from "@lexical/markdown";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ElementRef, useCallback, useEffect, useRef, useState } from "react";

const placeholder = "Start typing...";

const editorConfig = {
  namespace: "Main Editor",
  nodes: [HeadingNode, QuoteNode, CodeNode, ListItemNode, ListNode, LinkNode],
  // Handling of errors during update
  onError(error: Error) {
    throw error;
  },
  // The editor theme
  theme: {
    code: "font-mono",
    heading: {
      h1: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl mt-6 text-primary",
      h2: "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight mt-6 text-primary",
      h3: "scroll-m-20 text-2xl font-semibold tracking-tight mt-6 text-primary",
      h4: "scroll-m-20 text-xl font-semibold tracking-tight mt-6 text-primary",
      h5: "scroll-m-20 text-lg font-semibold tracking-tight mt-6 text-primary",
    },
    image: "editor-image",
    link: "editor-link",
    list: {
      listitem: "editor-listitem",
      nested: {
        listitem: "editor-nested-listitem",
      },
      ol: "my-6 ml-6 list-disc [&>li]:mt-2",
      ul: "my-6 ml-6 list-disc [&>li]:mt-2",
    },
    ltr: "ltr",
    paragraph: "leading-7 [&:not(:first-child)]:mt-2",
    // placeholder: 'text-muted',
    quote: "mt-6 border-l-2 pl-6 italic",
    rtl: "rtl",
    text: {
      bold: "font-bold",
      code: "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
      hashtag: "editor-text-hashtag",
      italic: "italic",
      overflowed: "editor-text-overflowed",
      strikethrough: "line-through",
      underline: "underline",
      underlineStrikethrough: "underline line-through",
    },
  },
};

type EditorProps = {
  markdown?: string;
  currentFile: File | null;
  /**
   * The scroll position of the editor container.
   */
  scrollPosition?: {
    top: number;
    left: number;
  };
};

function UpdateMarkdownPlugin({ markdown = "" }: { markdown?: string }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.update(() => {
      $convertFromMarkdownString(markdown, TRANSFORMERS, undefined, true);
    });
  }, [markdown, editor]);

  return null;
}

function FocusPlugin() {
  const [editor] = useLexicalComposerContext();

  useDamaiCommandShortcut(DAMAI_COMMANDS.VIEW_FOCUS_EDITOR_COMMAND);

  useEffect(() => {
    return registerDamaiCommandListener(
      DAMAI_COMMANDS.VIEW_FOCUS_EDITOR_COMMAND,
      () => {
        editor.focus();
      },
    );
  }, [editor]);
  return null;
}

export default function Editor({
  markdown: initialMarkdown = "",
  currentFile,
  scrollPosition,
}: EditorProps) {
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const containerRef = useRef<ElementRef<"div">>(null);
  const [offset, setOffset] = useState<
    | {
        top: number;
        left: number;
      }
    | undefined
  >();

  const combinedOffset = offset
    ? {
        top: offset.top - (scrollPosition?.top || 0),
        left: offset.left - (scrollPosition?.left || 0),
      }
    : undefined;

  const updateOffset = useCallback(() => {
    if (!containerRef.current) return;
    const rec = containerRef.current.getBoundingClientRect();
    setOffset({
      top: rec.top,
      left: rec.left,
    });
  }, []);

  useEffect(() => {
    updateOffset();
  }, [updateOffset]);

  useEffect(() => {
    // We have to wait until the animation completes before we get the updated
    // client bounding rect of the container
    const ANIMATION_DELAY = 100;
    const primaryListener = registerDamaiCommandListener(
      DAMAI_COMMANDS.VIEW_TOGGLE_PRIMARY_SIDEBAR_COMMAND,
      async () => {
        await new Promise((resolve) => setTimeout(resolve, ANIMATION_DELAY));
        updateOffset();
      },
    );
    const secondaryListener = registerDamaiCommandListener(
      DAMAI_COMMANDS.VIEW_TOGGLE_SECONDARY_SIDEBAR_COMMAND,
      async () => {
        await new Promise((resolve) => setTimeout(resolve, ANIMATION_DELAY));
        updateOffset();
      },
    );

    return () => {
      primaryListener();
      secondaryListener();
    };
  }, [updateOffset]);

  return (
    <LexicalComposer
      initialConfig={{
        ...editorConfig,
        editorState: () =>
          $convertFromMarkdownString(markdown, TRANSFORMERS, undefined, true),
      }}
    >
      <div className="relative h-full w-full max-w-2xl" ref={containerRef}>
        {/* <ToolbarPlugin /> */}
        <UpdateMarkdownPlugin markdown={markdown} />
        <FocusPlugin />
        <div className="h-full">
          <RichTextPlugin
            placeholder={<div className="pl-4 text-muted">{placeholder}</div>}
            contentEditable={
              <ContentEditable
                className="z-10 h-full p-4 text-foreground caret-transparent focus:outline-none"
                aria-placeholder={placeholder}
                placeholder={placeholder}
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <AutoFocusPlugin />
          <VimPlugin />
          <VimCursorPlugin
            offsetTop={combinedOffset?.top}
            offsetLeft={combinedOffset?.left}
          />
          {/* <TreeViewPlugin /> */}
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          <OnChangePlugin
            ignoreSelectionChange={true}
            onChange={(editorState) => {
              editorState.read(() => {
                const markdown = $convertToMarkdownString(
                  TRANSFORMERS,
                  undefined,
                  true,
                );
                currentFile &&
                  dispatchDamaiCommand(DAMAI_COMMANDS.FILE_SAVE_COMMAND, {
                    id: currentFile.id,
                    content: markdown,
                  });
              });
            }}
          />
        </div>
      </div>
    </LexicalComposer>
  );
}
