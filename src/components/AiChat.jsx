import { useState, useRef, useEffect } from 'react';
import { useCourses } from '../contexts/CourseContext';
import { sendChatMessage, SUGGESTED_PROMPTS } from '../utils/aiChat';
import { MessageCircle, X, Send, Loader2, Sparkles, Bot } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AiChat() {
  const { courses } = useCourses();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'model', text: 'Hey! I\'m your SemesterSync AI assistant. Ask me anything about your schedule!' },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text = input) => {
    if (!text.trim() || sending) return;
    const userMsg = { role: 'user', text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const history = messages.filter((m) => m.role !== 'model' || messages.indexOf(m) !== 0);
      const reply = await sendChatMessage(text.trim(), courses, history);
      setMessages((prev) => [...prev, { role: 'model', text: reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'model', text: `Sorry, I hit an error: ${err.message}` }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-50 group hover:scale-105 transition-transform"
          id="chat-trigger"
          title="Ask AI"
        >
          <MessageCircle size={24} className="group-hover:hidden" />
          <Sparkles size={24} className="hidden group-hover:block animate-pulse" />
        </Button>
      )}

      {/* Chat panel */}
      {open && (
        <Card className="fixed bottom-6 right-6 w-full max-w-[350px] h-[500px] flex flex-col shadow-2xl z-50 border-primary/20 bg-background/95 backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-300" id="ai-chat">
          <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-border/50 bg-muted/30 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bot size={18} />
              </div>
              <CardTitle className="text-base font-semibold">SemesterSync AI</CardTitle>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2" onClick={() => setOpen(false)}>
              <X size={18} className="text-muted-foreground" />
            </Button>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-br-sm' 
                    : 'bg-muted border border-border/50 rounded-bl-sm text-foreground'
                }`}>
                  <p className="leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-muted border border-border/50 rounded-bl-sm flex items-center gap-2 text-muted-foreground">
                  <Loader2 size={14} className="animate-spin text-primary" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </CardContent>

          {/* Suggestions */}
          {messages.length <= 2 && (
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.slice(0, 2).map((prompt, i) => (
                <button 
                  key={i} 
                  className="text-[10px] sm:text-xs text-left bg-muted hover:bg-muted/80 text-muted-foreground border border-border/50 px-3 py-1.5 rounded-full transition-colors truncate max-w-full"
                  onClick={() => handleSend(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <CardFooter className="p-3 pt-2 border-t border-border/50 bg-background/50">
            <form 
              className="flex w-full items-center gap-2 relative" 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            >
              <Input
                className="pr-10 rounded-full bg-muted/50 border-border focus-visible:ring-primary/30 text-sm h-10"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your schedule..."
                disabled={sending}
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={!input.trim() || sending}
                className="absolute right-1 h-8 w-8 rounded-full"
              >
                <Send size={14} className="ml-0.5" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
    </>
  );
}
