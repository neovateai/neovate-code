import Quill, { type Parchment } from 'quill';

const Embed = Quill.import('blots/embed') as typeof Parchment.EmbedBlot;

export interface ContextBlotData {
  /** the text to display */
  text: string;
  /** the value of the blot */
  value: string;
  /** the text when translate blot to prompt, if not provided, use value */
  prompt?: string;
  /**
   * the prefix to display before the text
   *
   * @default '@'
   */
  prefix?: string;
}

class ContextBlot extends Embed {
  static blotName = 'takumi-context';
  static tagName = 'takumi-context';

  static create(data: ContextBlotData) {
    const node = super.create();

    if (node instanceof HTMLElement === false) {
      return node;
    }

    node.innerHTML = `${data.prefix ?? '@'}${data.text}`;
    node.className = 'takumi-context';

    node.setAttribute('contenteditable', 'false');

    node.dataset.value = data.value;
    node.dataset.text = data.text;
    if (data.prefix) {
      node.dataset.prefix = data.prefix;
    }
    if (typeof data.prompt === 'string') {
      node.dataset.prompt = data.prompt;
    }
    return node;
  }

  static value(node: HTMLElement) {
    return node.dataset;
  }
}

export default ContextBlot;
