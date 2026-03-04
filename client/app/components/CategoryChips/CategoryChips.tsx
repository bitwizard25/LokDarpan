
interface CategoryChipsProps {
    categories: string[];
    activeCategory?: string;
}

export function CategoryChips({ categories, activeCategory = "All" }: CategoryChipsProps) {
    return (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide py-2">
            {categories.map((cat) => (
                <button
                    key={cat}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border ${cat === activeCategory
                        ? "bg-white/10 text-white border-white/20 shadow-glow-sm"
                        : "bg-white/5 text-dark-200 border-white/5 hover:text-white hover:bg-white/10 hover:border-primary-500/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                        }`}
                >
                    {cat}
                </button>
            ))}
        </div>
    );
}
