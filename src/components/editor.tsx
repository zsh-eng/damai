import { CodeNode } from '@lexical/code';
import { LinkNode } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import { $convertFromMarkdownString, TRANSFORMERS } from '@lexical/markdown';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { useEffect } from 'react';
import ToolbarPlugin from './plugins/ToolbarPlugin.tsx';
import TreeViewPlugin from './plugins/TreeViewPlugin.tsx';

const placeholder = 'Start typing...';

const editorConfig = {
  namespace: 'Main Editor',
  nodes: [HeadingNode, QuoteNode, CodeNode, ListItemNode, ListNode, LinkNode],
  // Handling of errors during update
  onError(error: Error) {
    throw error;
  },
  // The editor theme
  theme: {
    code: 'font-mono',
    heading: {
      h1: 'scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl mt-6',
      h2: 'scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight mt-6',
      h3: 'scroll-m-20 text-2xl font-semibold tracking-tight mt-6',
      h4: 'scroll-m-20 text-xl font-semibold tracking-tight mt-6',
      h5: 'scroll-m-20 text-lg font-semibold tracking-tight mt-6',
    },
    image: 'editor-image',
    link: 'editor-link',
    list: {
      listitem: 'editor-listitem',
      nested: {
        listitem: 'editor-nested-listitem',
      },
      ol: 'my-6 ml-6 list-disc [&>li]:mt-2',
      ul: 'my-6 ml-6 list-disc [&>li]:mt-2',
    },
    ltr: 'ltr',
    paragraph: 'leading-7 [&:not(:first-child)]:mt-2',
    // placeholder: 'text-muted',
    quote: 'mt-6 border-l-2 pl-6 italic',
    rtl: 'rtl',
    text: {
      bold: 'font-bold',
      code: 'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold',
      hashtag: 'editor-text-hashtag',
      italic: 'italic',
      overflowed: 'editor-text-overflowed',
      strikethrough: 'line-through',
      underline: 'underline',
      underlineStrikethrough: 'underline line-through',
    },
  },
};

type EditorProps = {
  markdown?: string;
};

function UpdateMarkdownPlugin({ markdown = '' }: { markdown?: string }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.update(() => {
      $convertFromMarkdownString(markdown, TRANSFORMERS);
    });
  }, [markdown, editor]);

  return null;
}

export default function Editor({ markdown = '' }: EditorProps) {
  return (
    <LexicalComposer
      initialConfig={{
        ...editorConfig,
        editorState: () => $convertFromMarkdownString(markdown, TRANSFORMERS),
      }}
    >
      <div className='max-w-2xl w-full'>
        <ToolbarPlugin />
        <UpdateMarkdownPlugin markdown={markdown} />
        <div className=''>
          <RichTextPlugin
            placeholder={<div className='text-muted pl-4'>{placeholder}</div>}
            contentEditable={
              <ContentEditable
                className='h-full text-foreground p-4 focus:outline-none z-10'
                aria-placeholder={placeholder}
                placeholder={placeholder}
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <AutoFocusPlugin />
          <TreeViewPlugin />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        </div>
      </div>
    </LexicalComposer>
  );
}
