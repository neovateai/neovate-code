import Quill, { Parchment } from 'quill';

const Embed = Quill.import('blots/embed') as typeof Parchment.EmbedBlot;

export interface ContextBlotData {
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
    node.className = 'takumi-context';

    node.setAttribute('contenteditable', 'false');

    node.dataset.value = data.value;
    node.dataset.text = data.text;

    return node;
  }

  static value(node: HTMLElement) {
    return node.dataset;
  }
}

export default ContextBlot;
