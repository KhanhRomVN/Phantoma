import React from 'react';
import CodeBlock from '@renderer/components/common/CodeBlock';

const LINE_HEIGHT = 18;
const PADDING = 8;
const MAX_LINES = 10;
const MAX_HEIGHT = MAX_LINES * LINE_HEIGHT + PADDING * 2;

const EDITOR_OPTIONS = {
  readOnly: true,
  domReadOnly: true,
  lineHeight: LINE_HEIGHT,
  padding: { top: PADDING, bottom: PADDING },
  cursorWidth: 0,
  renderLineHighlight: 'none',
  occurrencesHighlight: 'off',
  selectionHighlight: false,
  matchBrackets: 'never',
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  overviewRulerBorder: false,
  scrollbar: { alwaysConsumeMouseWheel: false },
};

interface Props {
  code: string;
  language?: string;
}

export default function ReadOnlyCodeBlock({ code, language }: Props) {
  const [height, setHeight] = React.useState(LINE_HEIGHT + PADDING * 2);

  const handleMounted = React.useCallback((editor: any) => {
    const update = () => setHeight(Math.min(editor.getContentHeight(), MAX_HEIGHT));
    update();
    editor.onDidContentSizeChange(update);
  }, []);

  return (
    <div style={{ height }}>
      <CodeBlock
        code={code}
        language={language}
        className="!min-h-0"
        editorOptions={EDITOR_OPTIONS}
        onEditorMounted={handleMounted}
      />
    </div>
  );
}