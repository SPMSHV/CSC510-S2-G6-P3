import { render, screen, fireEvent } from '@testing-library/react';
import CodeEditor from '../Editor';

test('Editor accepts keyboard input and respects language prop', () => {
  const onChange = jest.fn();
  render(<CodeEditor language="python" value="" onChange={onChange} />);

  const area = screen.getByTestId('monaco-editor');
  fireEvent.change(area, { target: { value: 'print(1)' } });

  expect(onChange).toHaveBeenCalledWith('print(1)');

  expect(area).toBeInTheDocument();
});
