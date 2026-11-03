import { ArrowDown, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { assetUrl } from "../lib/assetUrl";
import { defaultContent, type BannerKey, type StoreContent } from "../../shared/catalog";
export default function CollectionBanner({
  section,
  content,
}: {
  section: BannerKey;
  content: StoreContent;
}) {
  const banner = content.banners?.[section] ?? defaultContent.banners![section];
  return (
    <section
      className={"collection-banner campaign-banner banner-" + section}
      aria-label="Коллекция White House"
    >
      <img
        className="campaign-image"
        src={assetUrl(banner.image)}
        alt=""
        fetchPriority="high"
        width="1500"
        height="600"
      />
      <div className="banner-copy">
        <span className="eyebrow">WHITE HOUSE · КАСПИЙСК</span>
        <h1>{banner.title}</h1>
        <p className="banner-caption">{banner.caption}</p>
        {section === "home" ? (
          <Link className="dark-button" to="/catalog">
            Открыть каталог
            <ArrowUpRight size={18} />
          </Link>
        ) : (
          <a className="dark-button" href="#catalog">
            {section === "promo" ? "Посмотреть предложения" : "Смотреть модели"}
            <ArrowDown size={18} />
          </a>
        )}
      </div>
    </section>
  );
}
