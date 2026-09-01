import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { BookOpen, Check, DollarSign, Library, Pencil, Plus, Search, ShoppingCart, Trash2, X } from 'lucide-react';
import './styles.css';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
);

const STATUS = {
  owned: { label: 'Tenho', icon: Library },
  read: { label: 'Já li', icon: Check },
  wishlist: { label: 'Quero comprar', icon: ShoppingCart },
  selling: { label: 'Quero vender', icon: DollarSign },
};

const EMPTY_FORM = { title: '', author: '', status: 'owned', genre: '', price: '', cover_url: '', notes: '' };

function App() {
  const [books, setBooks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadBooks = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('books').select('*').order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setBooks(data || []);
    setLoading(false);
  };

  useEffect(() => { loadBooks(); }, []);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (book) => { setEditing(book); setModalOpen(true); };
  const closeModal = () => { setEditing(null); setModalOpen(false); };

  const saveBook = async (form) => {
    setError('');
    const payload = {
      title: form.title.trim(),
      author: form.author.trim() || null,
      status: form.status,
      genre: form.genre.trim() || null,
      price: form.price === '' ? null : Number(form.price),
      cover_url: form.cover_url.trim() || null,
      notes: form.notes.trim() || null,
    };
    if (!payload.title) throw new Error('O título é obrigatório.');

    const response = editing
      ? await supabase.from('books').update(payload).eq('id', editing.id).select().single()
      : await supabase.from('books').insert(payload).select().single();

    if (response.error) throw new Error(response.error.message);
    closeModal();
    await loadBooks();
  };

  const deleteBook = async (id) => {
    if (!window.confirm('Deseja realmente excluir este livro?')) return;
    const { error } = await supabase.from('books').delete().eq('id', id);
    if (error) setError(error.message);
    else setBooks((current) => current.filter((book) => book.id !== id));
  };

  const filteredBooks = useMemo(() => books.filter((book) => {
    const matchesStatus = filter === 'all' || book.status === filter;
    const text = `${book.title} ${book.author || ''} ${book.genre || ''}`.toLowerCase();
    return matchesStatus && text.includes(search.toLowerCase());
  }), [books, filter, search]);

  const total = books.length;
  const read = books.filter((book) => book.status === 'read').length;
  const owned = books.filter((book) => book.status === 'owned').length;

  return (
    <div className="app">
      <header className="header">
        <div className="brand"><div className="logo"><BookOpen size={21} /></div><div><h1>Minha Biblioteca</h1><span>Seu acervo, do seu jeito.</span></div></div>
        <button className="primary" onClick={openCreate}><Plus size={18} /> Adicionar livro</button>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy"><span className="eyebrow">ORGANIZAÇÃO PESSOAL</span><h2>Seus livros em um só lugar.</h2><p>Controle sua coleção, acompanhe suas leituras e organize os livros que quer comprar ou vender.</p></div>
          <div className="stats"><div><strong>{total}</strong><span>Total</span></div><div><strong>{owned}</strong><span>Tenho</span></div><div><strong>{read}</strong><span>Já li</span></div></div>
        </section>

        <section className="toolbar">
          <div className="tabs">
            {[['all', 'Todos'], ...Object.entries(STATUS).map(([key, value]) => [key, value.label])].map(([key, label]) => (
              <button key={key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{label}<small>{key === 'all' ? total : books.filter((book) => book.status === key).length}</small></button>
            ))}
          </div>
          <label className="search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar livros..." /></label>
        </section>

        {error && <div className="error"><span>{error}</span><button onClick={() => setError('')}><X size={16} /></button></div>}

        {loading ? <div className="empty"><p>Carregando sua biblioteca...</p></div> : filteredBooks.length === 0 ? (
          <div className="empty"><BookOpen size={40} /><h3>{books.length ? 'Nenhum livro encontrado' : 'Sua biblioteca está vazia'}</h3><p>{books.length ? 'Tente outro filtro ou termo de busca.' : 'Cadastre seu primeiro livro para começar.'}</p><button className="primary" onClick={openCreate}><Plus size={18} /> Adicionar livro</button></div>
        ) : (
          <section className="grid">{filteredBooks.map((book) => {
            const Icon = STATUS[book.status]?.icon || BookOpen;
            return <article className="card" key={book.id}>
              <div className="cover">{book.cover_url ? <img src={book.cover_url} alt={`Capa de ${book.title}`} onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <Icon size={42} strokeWidth={1.4} />}</div>
              <div className="card-body"><span className={`badge ${book.status}`}><Icon size={12} /> {STATUS[book.status]?.label}</span><h3>{book.title}</h3><p>{book.author || 'Autor não informado'}</p>{book.genre && <span className="genre">{book.genre}</span>}{book.price != null && <strong className="price">R$ {Number(book.price).toFixed(2).replace('.', ',')}</strong>}<div className="card-actions"><button onClick={() => openEdit(book)}><Pencil size={15} /> Editar</button><button className="danger" onClick={() => deleteBook(book.id)}><Trash2 size={15} /></button></div></div>
            </article>;
          })}</section>
        )}
      </main>

      {modalOpen && <BookModal book={editing} onClose={closeModal} onSave={saveBook} />}
    </div>
  );
}

function BookModal({ book, onClose, onSave }) {
  const [form, setForm] = useState(book ? { ...EMPTY_FORM, ...book, price: book.price ?? '' } : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try { await onSave(form); } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  return <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal">
    <div className="modal-head"><div><span className="eyebrow">{book ? 'EDITAR LIVRO' : 'NOVO LIVRO'}</span><h2>{book ? 'Editar livro' : 'Adicionar livro'}</h2></div><button className="close" onClick={onClose}><X /></button></div>
    {error && <div className="error modal-error"><span>{error}</span></div>}
    <form onSubmit={submit}>
      <label>Título *<input name="title" value={form.title} onChange={update} required autoFocus /></label>
      <label>Autor<input name="author" value={form.author} onChange={update} /></label>
      <div className="two"><label>Status<select name="status" value={form.status} onChange={update}>{Object.entries(STATUS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label><label>Gênero<input name="genre" value={form.genre} onChange={update} placeholder="Ex.: Romance" /></label></div>
      <div className="two"><label>Preço (R$)<input type="number" min="0" step="0.01" name="price" value={form.price} onChange={update} /></label><label>URL da capa<input type="url" name="cover_url" value={form.cover_url} onChange={update} /></label></div>
      <label>Observações<textarea name="notes" value={form.notes} onChange={update} rows="3" /></label>
      <div className="actions"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary" disabled={saving}>{saving ? 'Salvando...' : book ? 'Salvar alterações' : 'Adicionar livro'}</button></div>
    </form>
  </div></div>;
}

createRoot(document.getElementById('root')).render(<App />);
