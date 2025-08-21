import Quill from 'quill';

// import type Clipboard from 'quill/modules/clipboard';

const ClipboardClass = Quill.import('modules/clipboard') as any;

class TakumiQuillClipboard extends ClipboardClass {
  onCapturePaste(e: ClipboardEvent) {}
}

export default TakumiQuillClipboard;
