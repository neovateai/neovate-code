import Quill, { Parchment } from 'quill';

const BlockEmbed = Quill.import(
  'blots/block/embed',
) as typeof Parchment.EmbedBlot;

export interface CommandBlotData {
  text: string;

  value: string;
}

class CommandBlot extends BlockEmbed {
  static blotName = 'takumi-command';
  static tagName = 'div';

  static create(value: CommandBlotData) {
    const node = super.create();

    if (node instanceof HTMLElement === false) {
      return node;
    }

    node.innerHTML = `/${value.text}`;
    node.style.userSelect = 'none';
    // node.style.margin = '2px';
    node.style.padding = '0 2px';
    node.style.fontStyle = 'italic';
    node.style.backgroundColor = '#dddddd';
    node.style.color = '#444444';

    node.setAttribute('contenteditable', 'false');

    node.dataset.value = value.value;
    node.dataset.text = value.text;

    return node;
  }

  static value(node: HTMLElement) {
    return node.dataset;
  }
}

export default CommandBlot;
