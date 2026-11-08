export const user = {
  name: 'Vivisha',
  age: '25–34',
  skinGoals: ['Reduce acne', 'Even skin tone', 'Improve hydration'],
  sensitivities: ['Fragrance', 'Sulfates'],
  budget: '₹500–₹2,000',
};

export const latestReport = {
  id: 'scan-001',
  date: '2026-07-30',
  score: 82,
  prevScore: 79,
  skinType: 'Combination',
  skinTypeDesc:
    'Your skin is oily in the T-zone (forehead, nose, chin) and normal-to-dry on the cheeks. This means different zones need slightly different care.',
  metrics: [
    { key: 'hydration', label: 'Hydration', score: 86, status: 'Good', confidence: 'High', desc: 'Visible surface hydration looks healthy overall.' },
    { key: 'texture', label: 'Texture', score: 88, status: 'Good', confidence: 'High', desc: 'Skin surface appears smooth with minimal visible roughness.' },
    { key: 'tone', label: 'Tone Evenness', score: 81, status: 'Fair', confidence: 'High', desc: 'Mostly even with some mild discolouration visible around cheeks.' },
    { key: 'clarity', label: 'Clarity', score: 74, status: 'Fair', confidence: 'Medium', desc: 'A few visible blemishes and minor congestion noted in the T-zone.' },
    { key: 'finelines', label: 'Fine Lines', score: 90, status: 'Good', confidence: 'High', desc: 'Minimal visible fine lines detected for your estimated age range.' },
    { key: 'darkcircles', label: 'Dark Circles', score: 70, status: 'Fair', confidence: 'Medium', desc: 'Mild under-eye discolouration visible. May relate to sleep or genetics.' },
  ],
  concerns: [
    { id: 'acne', label: 'Mild Visible Acne', severity: 'Mild', icon: '●', color: '#E9B44C', observed: 'Small inflammatory spots visible in T-zone area.', meaning: 'May indicate mild sebum imbalance or clogged pores.', nextStep: 'Incorporate a salicylic acid or niacinamide product into your routine.' },
    { id: 'dryness', label: 'Slight Cheek Dryness', severity: 'Mild', icon: '◐', color: '#9EC8E0', observed: 'Slightly flaky texture noted on cheek area.', meaning: 'Cheeks may need extra moisture support, especially in cooler weather.', nextStep: 'Layer a hydrating serum under your moisturizer on dry zones.' },
    { id: 'darkcircles', label: 'Mild Dark Circles', severity: 'Mild', icon: '◎', color: '#A89CC8', observed: 'Under-eye area shows mild pigmentation difference from surrounding skin.', meaning: 'Can be cosmetic or related to genetics, sleep, or dehydration.', nextStep: 'Use a caffeine or vitamin K eye cream. Ensure 7–8 hours sleep.' },
    { id: 'pigmentation', label: 'Uneven Pigmentation', severity: 'Mild', icon: '◈', color: '#D9B85F', observed: 'Some darker spots or uneven patches near cheeks and jawline.', meaning: 'May be post-inflammatory hyperpigmentation or sun exposure.', nextStep: 'Add vitamin C serum in the morning and use SPF daily.' },
  ],
  strengths: [
    { id: 'hydration', label: 'Good Visible Hydration', icon: '💧' },
    { id: 'texture', label: 'Fine Texture', icon: '✨' },
    { id: 'tone', label: 'Mostly Even Tone', icon: '🎨' },
    { id: 'redness', label: 'Low Visible Redness', icon: '🌿' },
  ],
};

export const morningRoutine = [
  { step: 1, type: 'Cleanser', ingredient: 'Gentle foaming cleanser', why: 'Removes overnight oils without stripping your skin barrier.', frequency: 'Every morning', completed: false },
  { step: 2, type: 'Vitamin C Serum', ingredient: 'L-Ascorbic Acid or Ethyl Ascorbic Acid', why: 'Brightens pigmentation and protects against UV-induced damage.', frequency: 'Every morning', completed: false },
  { step: 3, type: 'Moisturizer', ingredient: 'Lightweight, non-comedogenic formula', why: 'Seals in hydration without clogging pores on your T-zone.', frequency: 'Every morning', completed: false },
  { step: 4, type: 'Sunscreen', ingredient: 'SPF 50+ broad spectrum', why: 'Essential daily protection to prevent pigmentation worsening.', frequency: 'Every morning', completed: false },
];

export const nightRoutine = [
  { step: 1, type: 'Oil Cleanser', ingredient: 'Micellar or oil-based cleanser', why: 'First cleanse to remove sunscreen and sebum.', frequency: 'Every evening', completed: false },
  { step: 2, type: 'Water Cleanser', ingredient: 'Gentle gel cleanser', why: 'Second cleanse for a thorough clean without over-stripping.', frequency: 'Every evening', completed: false },
  { step: 3, type: 'Niacinamide Serum', ingredient: 'Niacinamide 5–10%', why: 'Regulates sebum, reduces the appearance of pores, and brightens skin.', frequency: 'Every evening', completed: false },
  { step: 4, type: 'Moisturizer', ingredient: 'Barrier-repairing formula', why: 'Night is when skin repairs — a richer formula helps the process.', frequency: 'Every evening', completed: false },
  { step: 5, type: 'Eye Cream (Optional)', ingredient: 'Caffeine + peptide blend', why: 'Addresses mild dark circles with consistent use over weeks.', frequency: '3–4 nights/week', completed: false },
];

export const products = [
  { id: 'p1', brand: 'Minimalist', name: 'Niacinamide 10% + Zinc 1%', category: 'Serum', price: '₹599', rating: 4.6, image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&h=300&fit=crop&auto=format', tags: ['Acne-prone', 'Oily T-zone'], reason: 'Targets visible acne and regulates sebum in your T-zone.', ingredients: ['Niacinamide 10%', 'Zinc PCA'], fragranceFree: true, vegan: true, concern: 'acne' },
  { id: 'p2', brand: 'Dot & Key', name: 'Vitamin C + E Face Serum', category: 'Serum', price: '₹795', rating: 4.4, image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&h=300&fit=crop&auto=format', tags: ['Brightening', 'Pigmentation'], reason: 'Brightens uneven skin tone detected in your scan.', ingredients: ['Vitamin C', 'Vitamin E', 'Hyaluronic Acid'], fragranceFree: false, vegan: true, concern: 'pigmentation' },
  { id: 'p3', brand: 'Neutrogena', name: 'Hydro Boost Water Gel', category: 'Moisturizer', price: '₹875', rating: 4.7, image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=300&h=300&fit=crop&auto=format', tags: ['Dry zones', 'Combination skin'], reason: 'Lightweight gel hydrates cheek dry zones without adding oil.', ingredients: ['Hyaluronic Acid', 'Glycerin'], fragranceFree: true, vegan: false, concern: 'dryness' },
  { id: 'p4', brand: 'Re\'equil', name: 'Ultra Matte Dry Touch Sunscreen SPF 50', category: 'Sunscreen', price: '₹525', rating: 4.5, image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=300&h=300&fit=crop&auto=format', tags: ['SPF 50', 'Matte finish'], reason: 'Daily UV protection to prevent worsening of pigmentation.', ingredients: ['Octinoxate', 'Avobenzone', 'Niacinamide'], fragranceFree: true, vegan: true, concern: 'pigmentation' },
  { id: 'p5', brand: 'Plum', name: 'E-Luminence Eye Serum', category: 'Eye Cream', price: '₹675', rating: 4.3, image: 'https://images.unsplash.com/photo-1607006483224-dfc695a14fcc?w=300&h=300&fit=crop&auto=format', tags: ['Dark circles', 'Puffiness'], reason: 'Addresses visible dark circles detected under-eye.', ingredients: ['Caffeine', 'Niacinamide', 'Peptides'], fragranceFree: true, vegan: true, concern: 'darkcircles' },
  { id: 'p6', brand: 'Simple', name: 'Kind to Skin Moisturizing Facial Wash', category: 'Cleanser', price: '₹349', rating: 4.5, image: 'https://images.unsplash.com/photo-1556228841-a3c527ebefe5?w=300&h=300&fit=crop&auto=format', tags: ['Sensitive', 'Fragrance-free'], reason: 'Gentle daily cleanser that respects your skin barrier.', ingredients: ['Glycerin', 'Panthenol', 'Allantoin'], fragranceFree: true, vegan: true, concern: 'dryness' },
];

export const scanHistory = [
  { id: 'scan-001', date: '2026-07-30', score: 82, skinType: 'Combination', concerns: ['Mild Acne', 'Dark Circles', 'Pigmentation'], improvement: '+3 from last scan', image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=200&fit=crop&auto=format' },
  { id: 'scan-002', date: '2026-06-28', score: 79, skinType: 'Combination', concerns: ['Acne', 'Dryness', 'Pigmentation'], improvement: '+2 from last scan', image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=200&fit=crop&auto=format' },
  { id: 'scan-003', date: '2026-05-30', score: 77, skinType: 'Combination', concerns: ['Moderate Acne', 'Dryness'], improvement: 'Baseline scan', image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=200&fit=crop&auto=format' },
];

export const trendData = [
  { month: 'May', score: 77, hydration: 80, acne: 62, pigmentation: 72, texture: 83, darkcircles: 65 },
  { month: 'Jun', score: 79, hydration: 83, acne: 68, pigmentation: 76, texture: 85, darkcircles: 67 },
  { month: 'Jul', score: 82, hydration: 86, acne: 74, pigmentation: 81, texture: 88, darkcircles: 70 },
];

export const chatMessages = [
  {
    id: 1,
    role: 'ai' as const,
    text: "Hi Vivisha! 👋 I've reviewed your latest skin report. I noticed mild acne and slightly dry areas on your cheeks. I can explain your results, help you build a routine, compare ingredients, or suggest suitable product categories. What would you like to explore?",
    time: '09:41 AM',
  },
];

export const suggestedPrompts = [
  'Why is my score 82?',
  'Create my morning routine',
  'Recommend products under ₹2,000',
  'How can I reduce acne?',
  'Can I use retinol with niacinamide?',
  'Compare my latest scan',
  'Explain my dark circles',
  'Make my routine simpler',
];

export const aiResponses: Record<string, string> = {
  default: "That's a great question! Based on your skin report, I can see your skin is combination type with mild acne and some dryness. Your overall score of 82 reflects a healthy skin profile with a few areas to improve. Would you like me to focus on any specific concern?",
  acne: "For your mild visible acne, I'd recommend incorporating niacinamide (5–10%) into your evening routine. It regulates sebum and reduces the appearance of pores without harshness. Avoid heavy oils and look for 'non-comedogenic' on moisturizer labels. Consistency over 4–6 weeks is key — results won't be instant. If you develop painful, cystic, or spreading acne, please consult a dermatologist.",
  routine: "Here's a simple morning routine tailored to your combination skin:\n\n1. **Gentle cleanser** — removes overnight oil\n2. **Vitamin C serum** — brightens your mild pigmentation\n3. **Lightweight gel moisturizer** — hydrates without clogging\n4. **SPF 50+** — non-negotiable to prevent more pigmentation\n\nThat's just 4 steps and under 5 minutes. Want me to suggest specific products?",
  score: "Your score of 82 is calculated across 6 skin categories: Hydration (86), Texture (88), Tone Evenness (81), Clarity (74), Fine Lines (90), and Dark Circles (70). Your strongest areas are fine lines and texture. Your clarity score (74) brings it down slightly due to visible acne in the T-zone. The good news: clarity and dark circles are highly improvable with the right routine.",
  darkcircles: "Your dark circles score is 70 — mild but noticeable under-eye discolouration. This can be cosmetic (genetics, thin skin), lifestyle-related (sleep, hydration), or a combination. For visible improvement: look for caffeine (depuffs), vitamin K, or peptide-based eye creams. Results typically take 4–8 weeks of daily use. Please note this is cosmetic guidance — if circles are sudden, severe, or accompanied by other symptoms, see a doctor.",
  products: "For under ₹2,000, here are my top picks based on your report:\n\n1. **Minimalist Niacinamide 10%** — ₹599 (acne + pores)\n2. **Plum E-Luminence Eye Serum** — ₹675 (dark circles)\n3. **Re'equil SPF 50 Sunscreen** — ₹525 (pigmentation prevention)\n\nTotal: ₹1,799. This covers your three main concerns without overlap. Want me to add a moisturizer within budget?",
};
