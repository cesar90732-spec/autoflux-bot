// src/pages/Catalog.jsx
// Catálogo de produtos: lista os produtos da empresa e permite criar
// novos (com upload de imagem) ou remover existentes.
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Package, Loader2, ImagePlus } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ThemeToggle from '../components/ThemeToggle';
import api from '../api/client';
import { uploadMedia } from '../api/uploadMedia';

function formatPrice(cents) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Catalog() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', price: '', image: null });

  async function loadProducts() {
    setLoading(true);
    try {
      const { data } = await api.get('/products');
      setProducts(data.products);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      let imageUrl = null;
      if (form.image) {
        const uploaded = await uploadMedia(form.image);
        imageUrl = uploaded.url;
      }
      const priceCents = Math.round(parseFloat(form.price.replace(',', '.') || '0') * 100);
      await api.post('/products', {
        name: form.name,
        description: form.description,
        priceCents,
        imageUrl,
      });
      setForm({ name: '', description: '', price: '', image: null });
      setShowForm(false);
      await loadProducts();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    await api.delete(`/products/${id}`);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="min-h-screen flex-1 bg-slate-50 dark:bg-slate-950">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
              Catálogo de produtos
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Produtos que sua empresa pode enviar aos clientes pelo WhatsApp.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              <Plus size={16} /> Novo produto
            </button>
          </div>
        </header>

        <div className="p-6">
          {showForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              onSubmit={handleSubmit}
              className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2"
            >
              <input
                required
                placeholder="Nome do produto"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <input
                required
                placeholder="Preço (ex: 49,90)"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <textarea
                placeholder="Descrição"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                rows={2}
              />
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 hover:border-brand-500 dark:border-slate-700 dark:text-slate-400 sm:col-span-2">
                <ImagePlus size={16} />
                {form.image ? form.image.name : 'Selecionar imagem do produto'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setForm({ ...form, image: e.target.files[0] })}
                />
              </label>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 sm:col-span-2"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Salvar produto
              </button>
            </motion.form>
          )}

          {loading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Carregando...</p>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <Package className="mx-auto mb-2" size={32} />
              Nenhum produto cadastrado ainda.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="h-40 w-full object-cover" />
                  ) : (
                    <div className="flex h-40 w-full items-center justify-center bg-slate-100 dark:bg-slate-800">
                      <Package className="text-slate-400" size={32} />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="mb-1 flex items-start justify-between">
                      <h3 className="font-medium text-slate-900 dark:text-white">{product.name}</h3>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-slate-400 hover:text-red-600"
                        aria-label="Remover produto"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                      {product.description}
                    </p>
                    <p className="font-semibold text-brand-600">{formatPrice(product.price_cents)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
