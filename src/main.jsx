import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { BookOpen, Check, DollarSign, Library, Plus, Search, ShoppingCart, Trash2, X } from 'lucide-react';
import './styles.css';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const statuses = {
  owned: { label: 'Tenho', icon: Library },
  read: { label: 'Já li', icon: Check },
  wishlist: { label: 'Quero comprar', icon: ShoppingCart },
  selling: { label: 'Quero vender', icon: DollarSign },
};

function App() {
  const [books, setBooks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadBooks() {
    setLoading(true); setError('');
    if (!supabase) { setLoading(false); setError('Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no ambiente.'); return; }
    const { data, error } = await supabase.from('books').select('*').order('created_at', { ascending: false });
    if (error) setError(error.message); else setBooks(data ?? []);
    setLoading(false);
  }
  useEffect(() => { loadBooks(); }, []);

  async function saveBook(form) {
    setError('');
    const payload = { title: form.title.trim(), author: form.author.trim() || null, status: form.status, genre: form.genre.trim() || null, notes: form.notes.trim() || null, price: form.price ? Number(form.price) : null, cover_url: form.cover_url.trim() || null };
    if (!payload.title) return setError('Informe o título do livro.');
    const result = editing
      ? await supabase.from('books').update(payload).eq('id', editing.id).select().single()
      : await supabase.from('books').insert(payload).select().single();
    if (result.error) return setError(result.error.message);
    setModal(false); setEditing(null); await loadBooks();
  }
  async function removeBook(id) {
    if (!confirm('Excluir este livro?')) return;
    const { error } = await supabase.from('books').delete().eq('id', id);
    if (error) setError(error.message); else setBooks(prev => prev.filter(b => b.id !== id));
  }

  const filtered = useMemo(() => books.filter(b => (filter === 'all' || b.status === filter) && `${b.title} ${b.author ?? ''} ${b.genre ?? ''}`.toLowerCase().includes(query.toLowerCase())), [books, filter, query]);
  const count = s => books.filter(b => b.status === s).length;

  return <div className="app">
    <header><div className="brand"><div className="logo"><BookOpen size={22}/></div><div><h1>Minha Biblioteca</h1><span>Seu acervo, do seu jeito.</span></div></div><button className="primary" onClick={() => { setEditing(null); setModal(true); }}><Plus size={18}/> Adicionar livro</button></header>
    <main>
      <section className="hero"><div><p className="eyebrow">ORGANIZAÇÃO PESSOAL</p><h2>Seus livros em um só lugar.</h2><p>Cadastre sua coleção e acompanhe o que você já leu, quer comprar ou pretende vender.</p></div><div className="stats"><div><b>{books.length}</b><span>Total</span></div><div><b>{count('read')}</b><span>Já li</span></div><div><b>{count('wishlist')}</b><span>Comprar</span></div></div></section>
      <div className="toolbar"><div className="tabs">{[['all','Todos'], ...Object.entries(statuses).map(([k,v]) => [k,v.label])].map(([k,l]) => <button key={k} className={filter===k?'active':''} onClick={()=>setFilter(k)}>{l}<small>{k==='all'?books.length:count(k)}</small></button>)}</div><label className="search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar livros..."/></label></div>
      {error && <div className="error">{error}</div>}
      {loading ? <div className="empty">Carregando sua biblioteca...</div> : filtered.length === 0 ? <div className="empty"><BookOpen size={38}/><h3>Nenhum livro encontrado</h3><p>Adicione seu primeiro livro ou altere os filtros.</p><button className="primary" onClick={()=>setModal(true)}><Plus size={18}/> Adicionar livro</button></div> : <div className="grid">{filtered.map(book => <article className="card" key={book.id} onClick={()=>{setEditing(book);setModal(true)}}><div className="cover">{book.cover_url ? <img src={book.cover_url} alt=""/> : <BookOpen size={38}/>}</div><div className="cardbody"><span className={`badge ${book.status}`}>{statuses[book.status]?.label ?? book.status}</span><h3>{book.title}</h3><p>{book.author || 'Autor não informado'}</p>{book.genre && <span className="genre">{book.genre}</span>}{book.price && <strong>R$ {Number(book.price).toFixed(2).replace('.', ',')}</strong>}<button className="delete" title="Excluir" onClick={e=>{e.stopPropagation();removeBook(book.id)}}><Trash2 size={16}/></button></div></article>)}</div>}
    </main>
    {modal && <BookModal book={editing} onClose={()=>{setModal(false);setEditing(null);setError('')}} onSave={saveBook} />}
  </div>
}

function BookModal({ book, onClose, onSave }) {
  const [form,setForm]=useState({ title:book?.title??'', author:book?.author??'', status:book?.status??'owned', genre:book?.genre??'', price:book?.price??'', cover_url:book?.cover_url??'', notes:book?.notes??'' });
  const change=e=>setForm({...form,[e.target.name]:e.target.value});
  return <div className="overlay"><div className="modal"><div className="modalhead"><div><p className="eyebrow">{book?'EDITAR LIVRO':'NOVO LIVRO'}</p><h2>{book?'Editar livro':'Adicionar livro'}</h2></div><button className="iconbtn" onClick={onClose}><X/></button></div><form onSubmit={e=>{e.preventDefault();onSave(form)}}><label>Título *<input name="title" value={form.title} onChange={change} required autoFocus/></label><label>Autor<input name="author" value={form.author} onChange={change}/></label><div className="twocol"><label>Status<select name="status" value={form.status} onChange={change}>{Object.entries(statuses).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></label><label>Gênero<input name="genre" value={form.genre} onChange={change}/></label></div><div className="twocol"><label>Preço (R$)<input type="number" step="0.01" min="0" name="price" value={form.price} onChange={change}/></label><label>Capa (URL)<input name="cover_url" value={form.cover_url} onChange={change}/></label></div><label>Observações<textarea name="notes" value={form.notes} onChange={change} rows="3"/></label><div className="actions"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary" type="submit">{book?'Salvar alterações':'Adicionar livro'}</button></div></form></div></div>
}

createRoot(document.getElementById('root')).render(<App/>);
