// 事件工具函数
export const stopPropagation = (e: React.SyntheticEvent) => {
  e.stopPropagation();
};

// 通用的事件处理器对象，用于阻止事件冒泡到父组件
export const modalEventHandlers = {
  onClick: stopPropagation,
  onMouseDown: stopPropagation,
  onFocus: stopPropagation,
};

// 只包含点击和鼠标按下事件的处理器（用于容器元素）
export const containerEventHandlers = {
  onClick: stopPropagation,
  onMouseDown: stopPropagation,
};
