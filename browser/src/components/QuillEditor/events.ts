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

// export function makeKeyboardEvent(
//   key: string,
//   keyCode: number,
//   target: HTMLDivElement | null,
//   options: {
//     ctrlKey?: boolean;
//     shiftKey?: boolean;
//     altKey?: boolean;
//     metaKey?: boolean;
//   } = {},
// ) {
//   const mockEvent = {
//     key,
//     keyCode,
//     charCode: keyCode,
//     which: keyCode,
//     ctrlKey: options.ctrlKey || false,
//     shiftKey: options.shiftKey || false,
//     altKey: options.altKey || false,
//     metaKey: options.metaKey || false,
//     target: {
//       value: target?.textContent || '',
//     },
//     currentTarget: {
//       value: target?.textContent || '',
//     },
//     type: 'keydown',
//     nativeEvent: {
//       target,
//       type: 'keydown',
//       key,
//       keyCode,
//       ctrlKey: options.ctrlKey || false,
//       shiftKey: options.shiftKey || false,
//       altKey: options.altKey || false,
//       metaKey: options.metaKey || false,
//     },
//     preventDefault: () => {},
//     stopPropagation: () => {},
//   } as React.KeyboardEvent<HTMLDivElement>;

//   return mockEvent;
// }
