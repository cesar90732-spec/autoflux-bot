// src/pages/Conversas.jsx
// Inbox de atendimento: lista de conversas à esquerda, chat da conversa
// selecionada à direita. É aqui que os endpoints de IA da Etapa 4
// (resumo de conversa e sugestão de resposta) ganham interface de
// verdade — até então só existiam na API.
import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Send,
  Paperclip,
  Loader2,
  Sparkles,
  UserCheck,
  Bot,
  RefreshCcw,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ThemeToggle from '../components/ThemeToggle';
import api from '../api/client';
import { uploadMedia } from '../api/uploadMedia';

const POLL_INTERVAL_MS = 8000;

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const MEDIA_ICON = { image: ImageIcon, pdf: FileText, video: Video, audio: Music };

export default function Conversas() {
  const [conversations, setConversations] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [attaching, setAttaching] = useState(false);

  const [summarizing, setSummarizing] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [aiError, setAiError] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const selectedConversation = conversations.find((c) => c.id === selectedId) || null;

  const loadConversations = useCallback(async () => {
    const { data } = await api.get('/conversations');
    setConversations(data.conversations);
  }, []);

  useEffect(() => {
    loadConversations().finally(() => setLoadingList(false));
    const interval = setInterval(loadConversations, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadConversations]);

  const loadMessages = useCallback(async (conversationId) => {
    const { data } = await api.get(`/conversations/${conversationId}/messages`);
    setMessages(data.messages);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoadingMessages(true);
    loadMessages(selectedId).finally(() => setLoadingMessages(false));
    const interval = setInterval(() => loadMessages(selectedId), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [selectedId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredConversations = conversations.filter((c) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return c.contact_name?.toLowerCase().includes(term) || c.phone_number?.includes(term);
  });

  async function handleSelect(conversation) {
    setSelectedId(conversation.id);
    setAiError(null);
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!replyText.trim() || !selectedConversation) return;
    setSending(true);
    try {
      await api.post(`/conversations/${selectedConversation.id}/reply`, {
        text: replyText,
        phoneNumber: selectedConversation.phone_number,
        contentType: 'text',
      });
      setReplyText('');
      await loadMessages(selectedConversation.id);
      await loadConversations();
    } finally {
      setSending(false);
    }
  }

  async function handleAttach(e) {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;
    setAttaching(true);
    try {
      const { url, contentType } = await uploadMedia(file);
      await api.post(`/conversations/${selectedConversation.id}/reply`, {
        text: replyText || null,
        phoneNumber: selectedConversation.phone_number,
        contentType,
        mediaUrl: url,
      });
      setReplyText('');
      await loadMessages(selectedConversation.id);
      await loadConversations();
    } finally {
      setAttaching(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleTransfer() {
    await api.post(`/conversations/${selectedConversation.id}/transfer`);
    await loadConversations();
  }

  async function handleReturnToBot() {
    await api.post(`/conversations/${selectedConversation.id}/return-to-bot`);
    await loadConversations();
  }

  async function handleSummarize() {
    setSummarizing(true);
    setAiError(null);
    try {
      await api.post(`/ai/conversations/${selectedConversation.id}/summary`);
      await loadConversations();
    } catch (err) {
      setAiError(err.response?.data?.error || 'Não foi possível gerar o resumo.');
    } finally {
      setSummarizing(false);
    }
  }

  async function handleSuggestReply() {
    setSuggesting(true);
    setAiError(null);
    try {
      const { data } = await api.post(`/ai/conversations/${selectedConversation.id}/suggest-reply`);
      setReplyText(data.suggestion);
    } catch (err) {
      setAiError(err.response?.data?.error || 'Não foi possível gerar uma sugestão.');
    } finally {
      setSuggesting(false);
    }
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex h-screen flex-1 flex-col bg-slate-50 dark:bg-slate-950">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white py-4 pl-16 pr-4 dark:border-slate-800 dark:bg-slate-900 md:px-6">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Conversas</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Atendimento em tempo real pelo WhatsApp.
            </p>
          </div>
          <ThemeToggle />
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Lista de conversas */}
          <aside className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 p-3 dark:border-slate-800">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome ou telefone..."
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingList ? (
                <div className="flex items-center gap-2 p-4 text-sm text-slate-500 dark:text-slate-400">
                  <Loader2 size={16} className="animate-spin" /> Carregando...
                </div>
              ) : filteredConversations.length === 0 ? (
                <p className="p-4 text-sm text-slate-500 dark:text-slate-400">Nenhuma conversa encontrada.</p>
              ) : (
                filteredConversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelect(c)}
                    className={`flex w-full flex-col gap-1 border-b border-slate-100 p-3 text-left transition dark:border-slate-800 ${
                      selectedId === c.id
                        ? 'bg-brand-50 dark:bg-brand-900/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                        {c.contact_name || c.phone_number}
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">{timeAgo(c.last_message_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                          c.is_bot_active
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                        }`}
                      >
                        {c.is_bot_active ? <Bot size={12} /> : <UserCheck size={12} />}
                        {c.is_bot_active ? 'Bot' : 'Humano'}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          {/* Chat */}
          <section className="flex flex-1 flex-col">
            {!selectedConversation ? (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
                Selecione uma conversa para começar.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      {selectedConversation.contact_name || selectedConversation.phone_number}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{selectedConversation.phone_number}</p>
                  </div>
                  <div className="flex gap-2">
                    {selectedConversation.is_bot_active ? (
                      <button
                        onClick={handleTransfer}
                        className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <UserCheck size={14} /> Assumir conversa
                      </button>
                    ) : (
                      <button
                        onClick={handleReturnToBot}
                        className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Bot size={14} /> Devolver ao bot
                      </button>
                    )}
                  </div>
                </div>

                {/* Resumo por IA */}
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-2 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {selectedConversation.ai_summary || 'Nenhum resumo gerado ainda para esta conversa.'}
                    </p>
                    <button
                      onClick={handleSummarize}
                      disabled={summarizing}
                      className="flex shrink-0 items-center gap-1 text-xs font-medium text-brand-600 hover:underline disabled:opacity-60 dark:text-brand-400"
                    >
                      {summarizing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
                      Resumir
                    </button>
                  </div>
                </div>

                {/* Mensagens */}
                <div className="flex-1 space-y-3 overflow-y-auto p-5">
                  {loadingMessages ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <Loader2 size={16} className="animate-spin" /> Carregando mensagens...
                    </div>
                  ) : (
                    messages.map((m) => <MessageBubble key={m.id} message={m} />)
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {aiError && (
                  <p className="px-5 text-xs text-red-600 dark:text-red-400">{aiError}</p>
                )}

                {/* Composer */}
                <form onSubmit={handleSend} className="border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-2 flex gap-2">
                    <button
                      type="button"
                      onClick={handleSuggestReply}
                      disabled={suggesting}
                      className="flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      {suggesting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      Sugerir resposta com IA
                    </button>
                  </div>
                  <div className="flex items-end gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleAttach}
                      accept="image/*,application/pdf,video/*,audio/*"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={attaching}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                      {attaching ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
                    </button>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend(e);
                        }
                      }}
                      rows={1}
                      placeholder="Digite uma mensagem..."
                      className="flex-1 resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                    <button
                      type="submit"
                      disabled={sending || !replyText.trim()}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60"
                    >
                      {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function MessageBubble({ message }) {
  const isOutbound = message.direction === 'outbound';
  const MediaIcon = MEDIA_ICON[message.content_type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-md rounded-2xl px-4 py-2 text-sm ${
          isOutbound
            ? 'bg-brand-600 text-white'
            : 'bg-white text-slate-800 shadow-sm dark:bg-slate-800 dark:text-slate-200'
        }`}
      >
        {message.content_type !== 'text' && message.media_url && (
          <a
            href={message.media_url}
            target="_blank"
            rel="noreferrer"
            className={`mb-1 flex items-center gap-1 text-xs underline ${isOutbound ? 'text-brand-100' : 'text-brand-600 dark:text-brand-400'}`}
          >
            {MediaIcon && <MediaIcon size={12} />} Ver anexo ({message.content_type})
          </a>
        )}
        {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}
        <div className={`mt-1 flex items-center gap-1 text-[10px] ${isOutbound ? 'text-brand-100' : 'text-slate-400'}`}>
          {message.sender_type === 'bot' && (message.generated_by_ai ? 'IA' : 'Bot')}
          {message.sender_type === 'user' && 'Atendente'}
          <span>· {new Date(message.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </motion.div>
  );
}
