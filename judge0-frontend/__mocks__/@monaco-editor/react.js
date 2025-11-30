import React from 'react';

export default function MonacoMock(props) {
  return (
    <textarea
      data-testid="monaco-editor"
      value={props.value || ''}
      onChange={(e) => props.onChange && props.onChange(e.target.value)}
    />
  );
}
