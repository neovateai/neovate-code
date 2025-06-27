export async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    const handleData = (chunk: string) => {
      data += chunk;
    };
    const handleEnd = () => {
      removeListeners();
      resolve(data);
    };
    const handleError = (error: Error) => {
      removeListeners();
      reject(error);
    };
    const removeListeners = () => {
      process.stdin.off('data', handleData);
      process.stdin.off('end', handleEnd);
      process.stdin.off('error', handleError);
    };
    process.stdin.on('data', handleData);
    process.stdin.on('end', handleEnd);
    process.stdin.on('error', handleError);
  });
}
