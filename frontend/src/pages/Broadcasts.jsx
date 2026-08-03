// src/pages/Broadcasts.jsx
// Duas funções nesta tela:
//   1. Gerenciar listas de transmissão (criar/excluir)
//   2. Agendar o envio de uma mensagem (texto ou mídia) para um único
//      contato ou para uma lista inteira, em uma data/hora futura
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Megaphone, Loader2, Clock, ImagePlus, X } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ThemeToggle from '../components/ThemeToggle';
import api from '../api/client';
import { uploadMedia } from '../api/uploadMedia';

const STATUS_LABELS = {
  pending: { label: 'Agendada', className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
  sent: { label: 'Enviada', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
  failed: { label: 'Falhou', className: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400' },
  cancelled: { label: 'Cancelada', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

export default function Broadcasts() {
  const [lists, setLists] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const [newListName, setNewListName] = useState('');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    target: 'list', // 'list' ou 'contact'
    listId: '',
    contactId: '',
    text: '',
    media: null,
    scheduledAt: '',
  });

  async function loadAll() {
    const [listsRes, contactsRes, scheduledRes] = await Promise.all([
      api.get('/broadcast-lists'),
      api.get('/contacts'),
      api.get('/scheduled-messages'),
    ]);
    setLists(listsRes.data.lists);
    setContacts(contactsRes.data.contacts);
    setScheduled(scheduledRes.data.messages);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleCreateList(e) {
    e.preventDefault();
    if (!newListName.trim()) return;
    await api.post('/broadcast-lists', { name: newListName });
    setNewListName('');
    await loadAll();
  }

  async function handleDeleteList(id) {
    await api.delete(`/broadcast-lists/${id}`);
    await loadAll();
  }

  async function handleSchedule(e) {
    e.preventDefault();
    setSaving(true);
    try {
      let mediaUrl = null;
      let contentType = 'text';
      if (form.media) {
        const uploaded = await uploadMedia(form.media);
        mediaUrl = uploaded.url;
        contentType = uploaded.contentType;
      }

      await api.post('/scheduled-messages', {
        contactId: form.target === 'contact' ? form.contactId : undefined,
        broadcastListId: form.target === 'list' ? form.listId : undefined,
        contentType,
        content: form.text,
        mediaUrl,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
      });

      setForm({ target: 'list', listId: '', contactId: '', text: '', media: null, scheduledAt: '' });
      setShowScheduleForm(false);
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(id) {
    await api.post(`/scheduled-messages/${id}/cancel`);
    await loadAll();
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="min-h-screen flex-1 bg-slate-50 dark:bg-slate-950">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Transmissões</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Listas de contatos e mensagens agendadas.
            </p>
          </div>
          <ThemeToggle />
        </header>

        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
          {/* Coluna: Listas de transmissão */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-1">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
              Listas de transmissão
            </h2>
            <form onSubmit={handleCreateList} className="mb-4 flex gap-2">
              <input
                placeholder="Nome da lista"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <button className="rounded-lg bg-brand-600 px-3 py-2 text-white hover:bg-brand-700">
                <Plus size={16} />
              </button>
            </form>
            <ul className="space-y-2">
              {lists.map((list) => (
                <li
                  key={list.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800"
                >
                  <span className="text-slate-700 dark:text-slate-300">
                    {list.name}{' '}
                    <span className="text-xs text-slate-400">({list.contact_count} contatos)</span>
                  </span>
                  <button onClick={() => handleDeleteList(list.id)} className="text-slate-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
              {lists.length === 0 && (
                <p className="text-sm text-slate-400">Nenhuma lista criada ainda.</p>
              )}
            </ul>
            <p className="mt-3 text-xs text-slate-400">
              Para adicionar contatos a uma lista, use o painel de Contatos.
            </p>
          </div>

          {/* Coluna: Mensagens agendadas */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Mensagens agendadas
              </h2>
              <button
                onClick={() => setShowScheduleForm((v) => !v)}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
              >
                {showScheduleForm ? <X size={14} /> : <Plus size={14} />}
                {showScheduleForm ? 'Cancelar' : 'Agendar mensagem'}
              </button>
            </div>

            {showScheduleForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                onSubmit={handleSchedule}
                className="mb-5 space-y-3 rounded-xl border border-slate-100 p-4 dark:border-slate-800"
              >
                <div className="flex gap-3 text-sm">
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      checked={form.target === 'list'}
                      onChange={() => setForm({ ...form, target: 'list' })}
                    />
                    Lista de transmissão
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      checked={form.target === 'contact'}
                      onChange={() => setForm({ ...form, target: 'contact' })}
                    />
                    Contato único
                  </label>
                </div>

                {form.target === 'list' ? (
                  <select
                    required
                    value={form.listId}
                    onChange={(e) => setForm({ ...form, listId: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="">Selecione a lista</option>
                    {lists.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    required
                    value={form.contactId}
                    onChange={(e) => setForm({ ...form, contactId: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="">Selecione o contato</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone_number})
                      </option>
                    ))}
                  </select>
                )}

                <textarea
                  required
                  placeholder="Texto da mensagem (ou legenda, se anexar mídia)"
                  value={form.text}
                  onChange={(e) => setForm({ ...form, text: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  rows={2}
                />

                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 hover:border-brand-500 dark:border-slate-700 dark:text-slate-400">
                  <ImagePlus size={16} />
                  {form.media ? form.media.name : 'Anexar imagem, PDF, vídeo ou áudio (opcional)'}
                  <input
                    type="file"
                    accept="image/*,application/pdf,video/*,audio/*"
                    className="hidden"
                    onChange={(e) => setForm({ ...form, media: e.target.files[0] })}
                  />
                </label>

                <input
                  required
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />

                <button
                  type="submit"
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  Confirmar agendamento
                </button>
              </motion.form>
            )}

            <ul className="space-y-2">
              {scheduled.map((msg) => (
                <li
                  key={msg.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800"
                >
                  <div>
                    <p className="text-slate-700 dark:text-slate-300">
                      {msg.contact_name || msg.broadcast_list_name}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock size={12} />
                      {new Date(msg.scheduled_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_LABELS[msg.status].className}`}
                    >
                      {STATUS_LABELS[msg.status].label}
                    </span>
                    {msg.status === 'pending' && (
                      <button onClick={() => handleCancel(msg.id)} className="text-slate-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
              {scheduled.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400 dark:border-slate-700">
                  <Megaphone className="mx-auto mb-2" size={24} />
                  Nenhuma mensagem agendada ainda.
                </div>
              )}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
