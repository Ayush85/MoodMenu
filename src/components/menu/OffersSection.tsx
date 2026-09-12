import { ArrowRight, CalendarDays, Clock3, Gift, Sparkles, Tag } from "lucide-react";
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
  const isDark = theme.mode === "dark";
  return (
    <section className="mb-6 px-4" aria-labelledby="offers-heading">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2" style={{ color: theme.primary }}><Sparkles className="h-4 w-4" /><span className="text-[10px] font-extrabold uppercase tracking-[0.18em]">For you today</span></div>
          <h2 id="offers-heading" className="mt-1 text-lg font-extrabold" style={{ color: theme.text }}>Offers &amp; specials</h2>
        </div>
        <Tag className="h-5 w-5 opacity-30" style={{ color: theme.text }} />
      </div>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 no-scrollbar">
        {offers.map((offer) => (
          <article key={offer.id} className="relative min-w-[min(86vw,20rem)] snap-start overflow-hidden rounded-2xl border p-4" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#fff", color: theme.text, borderColor: `${theme.primary}35`, boxShadow: isDark ? "none" : "0 5px 18px rgba(15,23,42,0.07)" }}>
            <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: theme.primary }} />
            <div className="relative pl-2">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${theme.primary}18`, color: theme.primary }}><Gift className="h-4 w-4" /></div>
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] opacity-55">{typeLabel(offer.type)}</span>
                </div>
                {offerValueLabel(offer) && <span className="rounded-lg px-2 py-1 text-[11px] font-extrabold" style={{ backgroundColor: theme.primary, color: "#fff" }}>{offerValueLabel(offer)}</span>}
              </div>
              <h3 className="text-[1.05rem] font-extrabold leading-tight">{offer.title}</h3>
              {offer.description && <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed opacity-65">{offer.description}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-3 text-[10px] font-semibold opacity-55" style={{ borderColor: `${theme.text}18` }}>
                {offer.startTime && offer.endTime && <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> {offer.startTime}–{offer.endTime}</span>}
                {offer.daysOfWeek.length > 0 && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Selected days</span>}
                {offer.startTime == null && offer.daysOfWeek.length === 0 && <span>Available while supplies last</span>}
              </div>
              <div className="mt-3 flex items-center justify-end gap-1 text-[10px] font-extrabold" style={{ color: theme.primary }}>Ask our team <ArrowRight className="h-3 w-3" /></div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
