export function makeChangeEvent(text: string, target: HTMLDivElement | null) {
  const mockEvent = {
    target: {
      value: text,
    },
    currentTarget: {
      value: text,
    },
    type: 'change',
    nativeEvent: {
      target,
      type: 'input',
    },
    preventDefault: () => {},
    stopPropagation: () => {},
  } as React.ChangeEvent<HTMLTextAreaElement>;

  return mockEvent;
}

export function makeSelectEvent(
  start: number,
  end: number,
  value: string,
  target: HTMLDivElement | null,
) {
  const mockEvent = {
    target: {
      value,
      selectionStart: start,
      selectionEnd: end,
    },
    currentTarget: {
      value,
      selectionStart: start,
      selectionEnd: end,
    },
    type: 'select',
    nativeEvent: {
      target,
      type: 'select',
    },
    preventDefault: () => {},
    stopPropagation: () => {},
  } as unknown as React.SyntheticEvent<HTMLTextAreaElement>;

  return mockEvent;
}
