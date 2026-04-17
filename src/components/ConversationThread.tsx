interface Message {
  role: 'assistant' | 'user'
  content: string
  timestamp?: string
}

interface ConversationThreadProps {
  messages: Message[]
}

export default function ConversationThread({ messages }: ConversationThreadProps) {
  if (!messages || messages.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
        No messages in this conversation yet.
      </div>
    )
  }

  return (
    <div className="space-y-3 py-4">
      {messages.map((message, index) => {
        const isAssistant = message.role === 'assistant'
        return (
          <div
            key={index}
            className={`flex ${isAssistant ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[75%] ${isAssistant ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              <div
                className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isAssistant
                    ? 'bg-blue-500 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}
              >
                {message.content}
              </div>
              {message.timestamp && (
                <span className="text-xs text-gray-400 px-1">
                  {new Date(message.timestamp).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </span>
              )}
              <span className="text-xs text-gray-400 px-1">
                {isAssistant ? 'AI Assistant' : 'Customer'}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
