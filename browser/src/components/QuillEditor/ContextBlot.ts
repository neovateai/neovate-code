import Quill, { Parchment } from 'quill';

const Embed = Quill.import('blots/embed') as typeof Parchment.EmbedBlot;

interface ContextBlotData {
  /** the text to display */
  text: string;
  /** the value of the blot */
  value: string;
}

class ContextBlot extends Embed {
  static blotName = 'takumi-context';
  static tagName = 'takumi-context';

  static create(data: ContextBlotData) {
    const node = super.create();

    if (node instanceof HTMLElement === false) {
      return node;
    }

    node.innerHTML = `@${data.text}`;
    node.style.userSelect = 'none';
    // node.style.margin = '2px';
    node.style.padding = '0 2px';
    node.style.backgroundColor = '#44ee44';
    node.style.color = '#204820';

    node.setAttribute('contenteditable', 'false');

    node.dataset.value = data.value;
    node.dataset.text = data.text;

    return node;
  }

  static value(node: HTMLElement) {
    return node.dataset.value;
  }
}

export default ContextBlot;
