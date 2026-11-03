import type { CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { discountPercent, products, type Product } from "../data/catalog";
import ProductCard from "./ProductCard";

const rows: { title: string; to: string; pick: (p: Product) => boolean }[] = [
  { title: "Новинки", to: "/catalog/new", pick: (p) => !!p.isNew },
  { title: "Акции", to: "/catalog/promo", pick: (p) => !!discountPercent(p) },
  { title: "WH Collection", to: "/catalog/collection", pick: (p) => !!p.collection },
  { title: "Хиты", to: "/catalog", pick: (p) => p.label === "ХИТ" },
];

export default function HomeRows({
  favorites,
  onFavorite,
  onOpen,
}: {
  favorites: string[];
  onFavorite: (id: string) => void;
  onOpen: (product: Product) => void;
}) {
  const shown = new Set<string>();
  const listed = products
    .filter((p) => !p.hidden)
    .sort(
      (a, b) =>
        Number(a.availability === "out-of-stock") - Number(b.availability === "out-of-stock"),
    );
  return (
    <div className="home-rows">
      {rows.map((row) => {
        // A model appears once on the page, so a small catalog does not look repetitive.
        const items = listed.filter((p) => row.pick(p) && !shown.has(p.id)).slice(0, 4);
        items.forEach((p) => shown.add(p.id));
        if (!items.length) return null;
        return (
          <section
            className="home-row"
            key={row.title}
            aria-label={row.title}
            style={{ "--items": items.length } as CSSProperties}
          >
            <div className="home-row-heading">
              <h2>{row.title}</h2>
              <Link className="text-link" to={row.to}>
                Больше
                <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="home-row-items">
              {items.map((p, i) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  index={i}
                  saved={favorites.includes(p.id)}
                  onFavorite={onFavorite}
                  onOpen={onOpen}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
