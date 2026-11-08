import { Star, Plus } from 'lucide-react';

interface Product {
  id: string;
  brand: string;
  name: string;
  category: string;
  price: string;
  rating: number;
  image: string;
  tags: string[];
  reason: string;
  fragranceFree: boolean;
  vegan: boolean;
}

interface Props {
  product: Product;
  onAdd?: (id: string) => void;
}

export default function ProductCard({ product, onAdd }: Props) {
  return (
    <div className="card-hover rounded-3xl overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="h-44 overflow-hidden" style={{ background: '#F8F0EB' }}>
        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
      </div>
      <div className="p-4 flex flex-col gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>{product.brand}</p>
          <h3 className="font-serif font-semibold text-sm leading-snug mt-0.5">{product.name}</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{product.category}</p>
        </div>
        <div className="flex items-center gap-1">
          <Star size={12} fill="#D9B85F" color="#D9B85F" />
          <span className="text-xs font-medium">{product.rating}</span>
          <span className="ml-auto font-semibold text-sm">{product.price}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {product.tags.map(t => (
            <span key={t} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--secondary)', color: 'var(--muted-foreground)' }}>{t}</span>
          ))}
          {product.fragranceFree && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--sage)', color: '#2D7A56' }}>Fragrance-free</span>}
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>{product.reason}</p>
        <div className="flex gap-2 mt-1">
          <button className="flex-1 text-xs font-semibold py-2 rounded-full transition-all hover:opacity-80"
            style={{ border: '1.5px solid var(--gold)', color: 'var(--gold)' }}>
            View Details
          </button>
          <button onClick={() => onAdd?.(product.id)}
            className="flex items-center gap-1 text-xs font-semibold px-4 py-2 rounded-full gold-gradient transition-all hover:opacity-90"
            style={{ color: '#fff' }}>
            <Plus size={12} /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
