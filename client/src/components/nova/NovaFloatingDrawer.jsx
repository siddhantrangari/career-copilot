import React, { useState, useEffect, useRef } from 'react';
import { NovaActionCard } from './NovaActionCard';
import { api } from '../../services/api';
import { 
  Sparkles, X, Send, Bot, User, RefreshCw, Maximize2, Minimize2, 
  Zap, Award, FileText, Users, DollarSign 
} from 'lucide-react';
import confetti from 'canvas-confetti';

const DRAWER_PROMPT_CHIPS = [
  { label: "🎯 Tailor Master Resume", prompt: "Please tailor my master resume for a Senior / Staff Tech Lead role at Stripe." },
  { label: "🏆 30-60-90 WIN Deck", prompt: "Generate a 30-60-90 Day WIN Document for Razorpay Director of Engineering." },
  { label: "🤝 3-Level LinkedIn Note", prompt: "Write a 3-level LinkedIn networking sequence for Google VP of Engineering." },
  { label: "💰 Salary Negotiation", prompt: "HR says their budget is capped at ₹80L. Help me counter-offer for ₹95L + signing bonus." }
];

export function NovaFloatingDrawer({ isOpen, onClose, onNavigate, activePage, initialPrompt = null }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `👋 **Nova Copilot Active** (${activePage ? `on ${activePage}` : 'Ready'})\n\nI can tailor your resume to any JD, build an executive 30-60-90 Day WIN Deck, or write a 3-level networking sequence right here.`,
      action_type: null,
      action_data: null
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      if (initialPrompt) {
        handleSendMessage(initialPrompt);
      }
    }
  }, [isOpen, initialPrompt]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || loading) return;

    const newMessages = [...messages, { role: 'user', content: text.trim() }];
    setMessages(newMessages);
    setInputMessage('');
    setLoading(true);

    try {
      const response = await api.chatWithNova({
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        activePage: activePage || 'Global Drawer'
      });

      if (response) {
        setMessages([...newMessages, {
          role: 'assistant',
          content: response.reply || 'Task executed.',
          action_type: response.action_type || null,
          action_data: response.action_data || null
        }]);

        if (response.action_type) {
          confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
        }
      }
    } catch (e) {
      setMessages([...newMessages, {
        role: 'assistant',
        content: `⚠️ Error: ${e.message}`,
        action_type: null,
        action_data: null
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 1000,
      width: isExpanded ? '640px' : '440px',
      maxWidth: 'calc(100vw - 48px)',
      height: isExpanded ? '80vh' : '560px',
      background: 'rgba(12, 14, 22, 0.95)',
      backdropFilter: 'blur(30px) saturate(180%)',
      WebkitBackdropFilter: 'blur(30px) saturate(180%)',
      border: '1px solid rgba(10, 132, 255, 0.35)',
      borderRadius: 24,
      boxShadow: '0 24px 60px rgba(0,0,0,0.8), 0 0 30px rgba(10,132,255,0.25)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1), height 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 10,
            background: 'linear-gradient(135deg, #0a84ff 0%, #bf5af2 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(10,132,255,0.4)',
          }}>
            <Sparkles size={15} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13.5, color: '#f5f5f7', lineHeight: 1.2 }}>
              Nova AI Copilot
            </div>
            <div style={{ fontSize: 10, color: '#8e8e93', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#32d74b' }} />
              58 NxtJob Stories Injected
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            id="nova-expand-btn"
            className="apple-btn apple-btn-secondary"
            style={{ padding: '4px 8px', borderRadius: 8 }}
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          <button
            id="nova-close-btn"
            className="apple-btn apple-btn-secondary"
            style={{ padding: '4px 8px', borderRadius: 8 }}
            onClick={onClose}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            {msg.role === 'assistant' && (
              <div style={{
                width: 26, height: 26, borderRadius: 8,
                background: 'linear-gradient(135deg, #0a84ff 0%, #bf5af2 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Bot size={13} color="#fff" />
              </div>
            )}

            <div style={{
              maxWidth: msg.role === 'user' ? '82%' : '90%',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #0a84ff 0%, #0071e3 100%)'
                : 'rgba(255,255,255,0.04)',
              border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              padding: '10px 14px',
              color: '#f5f5f7',
              fontSize: 12.5,
              lineHeight: 1.55,
            }}>
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {msg.content}
              </div>

              {/* Render Action Card if present */}
              {msg.action_type && msg.action_data && (
                <NovaActionCard
                  actionType={msg.action_type}
                  actionData={msg.action_data}
                  onNavigate={(page) => {
                    onClose();
                    onNavigate(page);
                  }}
                />
              )}
            </div>

            {msg.role === 'user' && (
              <div style={{
                width: 26, height: 26, borderRadius: 8,
                background: 'rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <User size={13} color="#8e8e93" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{
              width: 26, height: 26, borderRadius: 8,
              background: 'linear-gradient(135deg, #0a84ff 0%, #bf5af2 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <RefreshCw size={13} color="#fff" className="spin-animation" />
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              padding: '8px 12px',
              fontSize: 12,
              color: '#8e8e93',
            }}>
              Nova is formulating strategic artifacts...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Chips */}
      <div style={{
        padding: '6px 14px',
        display: 'flex',
        gap: 6,
        overflowX: 'auto',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(0,0,0,0.2)',
      }}>
        {DRAWER_PROMPT_CHIPS.map((chip, idx) => (
          <button
            key={idx}
            id={`drawer-chip-${idx}`}
            className="apple-btn apple-btn-secondary"
            style={{
              padding: '4px 10px',
              borderRadius: 16,
              fontSize: 10.5,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
            onClick={() => handleSendMessage(chip.prompt)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 14px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.5)',
      }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          style={{ display: 'flex', gap: 8, alignItems: 'center' }}
        >
          <input
            id="drawer-input-field"
            className="apple-input"
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 12,
              padding: '10px 14px',
              fontSize: 13,
            }}
            placeholder="Ask Nova or tell it what to generate..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={loading}
          />
          <button
            id="drawer-send-btn"
            className="apple-btn apple-btn-primary"
            style={{ borderRadius: 12, padding: '10px 16px', height: 40 }}
            type="submit"
            disabled={loading || !inputMessage.trim()}
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
