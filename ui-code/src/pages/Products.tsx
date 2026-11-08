import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import Toast from '../components/Toast';
import { products as mockProducts } from '../data/mock';
import { fetchProducts } from '../api/products';
import { addProductToRoutine } from '../api/routine';

const concerns = ['All', 'acne', 'pigmentation', 'dryness', 'darkcircles'];
const concernLabels: Record<string, string> = { All: 'All', acne: 'Acne', pigmentation: 'Pigmentation', dryness: 'Dryness', darkcircles: 'Dark Circles' };

export default function Products() {
  const [search, setSearch] = useState('');
  const [activeConcern, setActiveConcern] = useState('All');
  const [ffOnly, setFfOnly] = useState(false);
  const [veganOnly, setVeganOnly] = useState(false);
  const [toast, setToast] = useState('');
  const [products, setProducts] = useState(mockProducts);

  useEffect(() => {
    fetchProducts().then(list => { if (list?.length) setProducts(list); }).catch(() => {});
  }, []);

  const filtered = products.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.brand.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeConcern !== 'All' && p.concern !== activeConcern) return false;
    if (ffOnly && !p.fragranceFree) return false;
    if (veganOnly && !p.vegan) return false;
    return true;
  });

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: 'var(--background)' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-20 md:pt-24">
        <div className="mb-8">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--gold)' }}>Curated for You</span>
          <h1 className="font-serif text-3xl font-bold mt-1">Product Recommendations</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--muted-foreground)' }}>Matched to your latest skin report · {products.length} products</p>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
            <input className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-sm outline-none"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFfOnly(v => !v)}
              className="flex items-center gap-1 text-xs px-3 py-2 rounded-full font-medium transition-all"
              style={{ background: ffOnly ? 'var(--gold)' : 'var(--muted)', color: ffOnly ? '#fff' : 'var(--muted-foreground)' }}>
              Fragrance-free {ffOnly && <X size={10} />}
            </button>
            <button onClick={() => setVeganOnly(v => !v)}
              className="flex items-center gap-1 text-xs px-3 py-2 rounded-full font-medium transition-all"
              style={{ background: veganOnly ? 'var(--gold)' : 'var(--muted)', color: veganOnly ? '#fff' : 'var(--muted-foreground)' }}>
              Vegan {veganOnly && <X size={10} />}
            </button>
          </div>
        </div>

        {/* Concern tabs */}
        <div className="flex gap-2 flex-wrap mb-7">
          {concerns.map(c => (
            <button key={c} onClick={() => setActiveConcern(c)}
              className="text-sm px-4 py-2 rounded-full font-medium transition-all"
              style={{ background: activeConcern === c ? 'var(--foreground)' : 'var(--muted)', color: activeConcern === c ? '#fff' : 'var(--muted-foreground)' }}>
              {concernLabels[c]}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(p => <ProductCard key={p.id} product={p} onAdd={async () => {
              try {
                await addProductToRoutine(p.id, 'morning');
                setToast(`${p.name} added to routine!`);
              } catch {
                setToast(`Could not add ${p.name}`);
              }
            }} />)}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="font-serif text-xl mb-2">No products found</p>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Try adjusting your filters</p>
          </div>
        )}
      </div>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
