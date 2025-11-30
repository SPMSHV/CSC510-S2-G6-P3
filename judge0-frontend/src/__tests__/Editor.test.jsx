import { render, screen, fireEvent } from '@testing-library/react';
import CodeEditor from '../Editor';

// Inline mock guarantees the testid exists
jest.mock('@monaco-editor/react', () => (props) => (
  <textarea
    data-testid="monaco-editor"
    value={props.value || ''}
    onChange={(e) => props.onChange && props.onChange(e.target.value)}
  />
));

test('Editor renders and calls onChange', () => {
  const handleChange = jest.fn();
  render(<CodeEditor language="javascript" value="// code" onChange={handleChange} />);
  const area = screen.getByTestId('monaco-editor');
  expect(area).toBeInTheDocument();
  fireEvent.change(area, { target: { value: 'print(42)' } });
  expect(handleChange).toHaveBeenCalledWith('print(42)');
});
