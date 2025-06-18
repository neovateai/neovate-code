import { useChat } from '@ai-sdk/react';
import { createFileRoute } from '@tanstack/react-router';
import { useUnmount } from 'ahooks';

const Demo = () => {
  const {
    input,
    setInput,
    status,
    handleSubmit,
    messages,
    stop,
    data,
    setData,
  } = useChat({
    api: '/api/chat/completions',
    body: {
      model: 'takumi',
      plan: true,
    },
    onFinish(messages) {
      console.log('Response data:', messages);
    },
    onError(error) {
      console.error('Error:', error);
    },
    onResponse(res) {
      console.log('Response:', res);
    },
    onToolCall({ toolCall }) {
      console.log('Tool call:', toolCall);
    },
  });

  useUnmount(() => {
    stop();
  });

  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {data && (
        <div>
          <pre className="p-4 text-sm bg-gray-100">
            {JSON.stringify(data, null, 2)}
          </pre>
          <button
            onClick={() => setData(undefined)}
            className="px-4 py-2 mt-2 text-white bg-blue-500 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            Clear Data
          </button>
        </div>
      )}

      {messages.map((m) => (
        <div key={m.id} className="whitespace-pre-wrap">
          <strong>{m.role === 'user' ? 'User: ' : 'AI: '}</strong>
          {m.parts.map((p) => (
            <div>
              <pre>
                思考
                {p.type === 'reasoning' && p.reasoning}
              </pre>
              {p.type === 'text' && p.text}
            </div>
          ))}
          <br />
          <br />
        </div>
      ))}

      {(status === 'submitted' || status === 'streaming') && (
        <div className="mt-4 text-gray-500">
          {status === 'submitted' && <div>Loading...</div>}
          <button
            type="button"
            className="px-4 py-2 mt-4 text-blue-500 border border-blue-500 rounded-md"
            onClick={stop}
          >
            Stop
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <input
          className="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-gray-300 rounded shadow-xl"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </form>
    </div>
  );
};

export const Route = createFileRoute('/demo')({
  component: Demo,
});
