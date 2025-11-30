// src/Editor.js
import React from "react";
import Editor from "@monaco-editor/react";

function CodeEditor({ language, value, onChange }) {
  return (
    <Editor
      height="60vh"
      theme="vs-dark"
      defaultLanguage={language}
      value={value}
      onChange={(code) => onChange(code || "")}
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        suggestOnTriggerCharacters: true,
        quickSuggestions: { other: true, comments: true, strings: true },
        wordBasedSuggestions: true,
        tabCompletion: "on",
        parameterHints: { enabled: true },
        autoClosingBrackets: "always",
        autoClosingQuotes: "always",
        acceptSuggestionOnEnter: "on",
      }}
    />
  );
}

export default CodeEditor;
