import Quill from 'quill';

const Embed = Quill.import('blots/embed') as any;

interface ContextBlotValue {
  /** the text to display */
  text: string;
  /** the value of the blot */
  value: string;
}

class ContextBlot extends Embed {
  static create(val: ContextBlotValue) {
    const node = super.create();
    node.innerHTML = `@${val.text}`;
    node.style.userSelect = 'none';
    // node.style.margin = '2px';
    node.style.padding = '0 2px';
    node.style.backgroundColor = '#44ee44';
    node.style.color = '#204820';

    node.setAttribute('contenteditable', false);

    node.dataset.value = val.value;
    node.dataset.text = val.text;

    return node;
  }

  length() {
    return 1;
  }

  static value(node: any) {
    return {
      text: node.dataset.text,
      value: node.dataset.value,
    };
  }
}

ContextBlot.blotName = 'context';
ContextBlot.tagName = 'span';

export default ContextBlot;
