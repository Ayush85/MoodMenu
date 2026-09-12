import { Clock3, Gift, Sparkles, Tag } from "lucide-react";
import { ActiveOffer, offerValueLabel } from "@/lib/offers";
import { MoodTheme } from "@/types";

interface Props { offers: ActiveOffer[]; theme: MoodTheme; }

function typeLabel(type: string) {
  if (type === "HAPPY_HOUR") return "Happy hour";
  if (type === "BUY_ONE_GET_ONE") return "Special offer";
  return "Limited-time offer";
}

export default function OffersSection({ offers, theme }: Props) {
  if (offers.length === 0) return null;
  return (
    <section className="mb-6 px-4" aria-labelledby="offers-heading">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2" style={{ color: theme.primary }}><Sparkles className="h-4 w-4" /><span className="text-[10px] font-extrabold uppercase tracking-[0.18em]">For you today</span></div>
          <h2 id="offers-heading" className="mt-1 text-lg font-extrabold" style={{ color: theme.text }}>Offers &amp; specials</h2>
        </div>
        <Tag className="h-5 w-5 opacity-30" style={{ color: theme.text }} />
      </div>
      <div className="space-y-3">
        {offers.map((offer) => (
          <article key={offer.id} className="relative overflow-hidden rounded-2xl p-4" style={{ background: `linear-gradient(120deg, ${theme.primary}, ${theme.primary}c7)`, color: "#fff", boxShadow: `0 8px 24px ${theme.primary}30` }}>
            <div className="absolute -right-5 -top-8 h-28 w-28 rounded-full border-[14px] border-white/10" />
            <div className="relative flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20"><Gift className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/75"><span>{typeLabel(offer.type)}</span>{offer.startTime && offer.endTime && <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> {offer.startTime}–{offer.endTime}</span>}</div>
                <h3 className="text-base font-extrabold leading-tight">{offer.title}</h3>
                {offer.description && <p className="mt-1 text-xs leading-relaxed text-white/80">{offer.description}</p>}
                {offerValueLabel(offer) && <p className="mt-2 text-sm font-extrabold">{offerValueLabel(offer)}</p>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
