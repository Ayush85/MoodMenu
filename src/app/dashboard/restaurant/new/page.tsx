"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";

// Mirrors the onboarding checklist on the dashboard empty state.
const STEPS = ["Create restaurant", "Add menu", "Tables & WiFi", "QR codes"];

const CITY_SUGGESTIONS = [
  "Kathmandu", "Lalitpur", "Bhaktapur", "Pokhara", "Biratnagar", "Birgunj",
  "Butwal", "Dharan", "Bharatpur", "Janakpur", "Hetauda", "Nepalgunj",
  "Itahari", "Dhangadhi", "Manthali",
];

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function sanitizeSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-{2,}/g, "-");
}

type FieldErrors = Partial<Record<"name" | "city" | "slug", string>>;
type SlugStatus = "idle" | "checking" | "available" | "taken";

export default function NewRestaurantPage() {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  // Result of the last availability lookup, tagged with the slug it was for so
  // a stale answer is never shown against a newer value.
  const [slugCheck, setSlugCheck] = useState<{ slug: string; status: "available" | "taken" | "unknown" }>({
    slug: "",
    status: "unknown",
  });
  const slugStatus: SlugStatus = !SLUG_PATTERN.test(slug)
    ? "idle"
    : slugCheck.slug !== slug
      ? "checking"
      : slugCheck.status === "unknown"
        ? "idle"
        : slugCheck.status;
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Focus the first field on desktop only — on phones it would pop the
  // keyboard and push the page heading out of view.
  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) nameRef.current?.focus();
  }, []);

  // Debounced availability check so a taken address is flagged while typing.
  // Failures are silent: the server still rejects duplicates on submit.
  useEffect(() => {
    if (!SLUG_PATTERN.test(slug)) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/restaurants/slug-check?slug=${encodeURIComponent(slug)}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error("check failed"))))
        .then((data: { available: boolean }) =>
          setSlugCheck({ slug, status: data.available ? "available" : "taken" })
        )
        .catch(() => {
          if (!controller.signal.aborted) setSlugCheck({ slug, status: "unknown" });
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [slug]);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = "Enter your restaurant's name.";
    if (!city.trim()) errors.city = "Enter the city your restaurant is in.";
    if (!slug) errors.slug = "Choose a web address for your menu.";
    else if (!SLUG_PATTERN.test(slug))
      errors.slug = "Use lowercase letters, numbers and single hyphens only.";
    else if (slugStatus === "taken") errors.slug = "That web address is already taken. Try another.";
    return errors;
  }

  function focusField(field: "name" | "city" | "slug") {
    document.getElementById(`restaurant-${field}`)?.focus();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setError("");

    const errors = validate();
    setFieldErrors(errors);
    const first = (["name", "city", "slug"] as const).find((k) => errors[k]);
    if (first) {
      focusField(first);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), city: city.trim(), slug }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 409) {
          // Taken between the live check and submit — show it on the field.
          setSlugCheck({ slug, status: "taken" });
          setFieldErrors({ slug: "That web address is already taken. Try another." });
          focusField("slug");
        } else {
          setError(body.error || "Failed to create restaurant");
        }
        setLoading(false);
        return;
      }

      const restaurant = await res.json();
      router.push(`/dashboard/restaurant/${restaurant.id}/menu`);
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
      setLoading(false);
    }
  }

  const inputClass = (field: keyof FieldErrors) =>
    `control-input py-3! ${fieldErrors[field] ? "border-red-600!" : ""}`;

  return (
    <div className="page-shell max-w-2xl animate-fade-in-up">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-gray-600 transition hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All restaurants
      </Link>

      <div className="mb-6">
        <h1 className="page-title">Create Restaurant</h1>
        <p className="page-subtitle mt-1">Set up your restaurant to build a smart digital menu</p>
      </div>

      {/* Setup progress */}
      <ol className="mb-6 grid grid-cols-4 gap-2 text-xs sm:gap-3" aria-label="Setup progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex min-w-0 flex-col gap-1.5" aria-current={i === 0 ? "step" : undefined}>
            <span className={`h-1 rounded-full ${i === 0 ? "bg-orange-700" : "bg-gray-200"}`} />
            <span className={`truncate font-semibold ${i === 0 ? "text-gray-900" : "text-gray-500"}`}>
              {i + 1}. {label}
            </span>
          </li>
        ))}
      </ol>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm animate-fade-in">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate aria-busy={loading} className="surface-card p-6 sm:p-8 space-y-6">
        <div>
          <label htmlFor="restaurant-name" className="block text-sm font-semibold text-gray-700 mb-1.5">
            Restaurant name
          </label>
          <input
            ref={nameRef}
            type="text"
            id="restaurant-name"
            name="name"
            value={name}
            autoComplete="off"
            maxLength={80}
            aria-invalid={!!fieldErrors.name}
            aria-describedby={fieldErrors.name ? "restaurant-name-error" : undefined}
            className={inputClass("name")}
            placeholder="e.g. Momo House Manthali"
            onChange={(e) => {
              setName(e.target.value);
              if (!slugEdited) setSlug(generateSlug(e.target.value));
              if (fieldErrors.name || (!slugEdited && fieldErrors.slug))
                setFieldErrors((prev) => ({ ...prev, name: undefined, slug: slugEdited ? prev.slug : undefined }));
            }}
          />
          {fieldErrors.name && (
            <p id="restaurant-name-error" className="text-xs text-red-700 mt-1.5">{fieldErrors.name}</p>
          )}
        </div>

        <div>
          <label htmlFor="restaurant-city" className="block text-sm font-semibold text-gray-700 mb-1.5">
            City
          </label>
          <input
            type="text"
            id="restaurant-city"
            name="city"
            value={city}
            list="restaurant-city-suggestions"
            autoComplete="off"
            maxLength={80}
            aria-invalid={!!fieldErrors.city}
            aria-describedby={fieldErrors.city ? "restaurant-city-error" : "restaurant-city-hint"}
            className={inputClass("city")}
            placeholder="e.g. Kathmandu"
            onChange={(e) => {
              setCity(e.target.value);
              if (fieldErrors.city) setFieldErrors((prev) => ({ ...prev, city: undefined }));
            }}
          />
          <datalist id="restaurant-city-suggestions">
            {CITY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
          </datalist>
          {fieldErrors.city ? (
            <p id="restaurant-city-error" className="text-xs text-red-700 mt-1.5">{fieldErrors.city}</p>
          ) : (
            <p id="restaurant-city-hint" className="text-xs text-gray-600 mt-1.5">
              Used to automatically resolve the restaurant location for weather-based menu adaptation
            </p>
          )}
        </div>

        <div>
          <label htmlFor="restaurant-slug" className="block text-sm font-semibold text-gray-700 mb-1.5">
            Menu web address
          </label>
          <div className="flex items-stretch gap-2">
            <span aria-hidden="true" className="flex items-center rounded-lg border border-gray-100 bg-gray-50 px-3 font-mono text-sm text-gray-600">
              /menu/
            </span>
            <input
              type="text"
              id="restaurant-slug"
              name="slug"
              value={slug}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={60}
              aria-invalid={!!fieldErrors.slug || slugStatus === "taken"}
              aria-describedby={fieldErrors.slug ? "restaurant-slug-error" : "restaurant-slug-hint"}
              className={`${inputClass("slug")} flex-1 font-mono ${slugStatus === "taken" ? "border-red-600!" : ""}`}
              placeholder="momo-house-manthali"
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(sanitizeSlug(e.target.value));
                if (fieldErrors.slug) setFieldErrors((prev) => ({ ...prev, slug: undefined }));
              }}
              onBlur={() => setSlug((value) => value.replace(/^-+|-+$/g, ""))}
            />
          </div>
          {fieldErrors.slug ? (
            <p id="restaurant-slug-error" role="alert" className="text-xs text-red-700 mt-1.5">{fieldErrors.slug}</p>
          ) : (
            <div id="restaurant-slug-hint" className="mt-1.5 space-y-1 text-xs text-gray-600">
              <p>
                Guests will open your menu at <span className="font-mono text-gray-800">/menu/{slug || "your-restaurant"}</span>.
                Lowercase letters, numbers, and hyphens only.
              </p>
              <p aria-live="polite" className={slugStatus === "taken" ? "font-semibold text-red-700" : slugStatus === "available" ? "font-semibold text-emerald-700" : ""}>
                {slugStatus === "checking" && "Checking availability…"}
                {slugStatus === "available" && "✓ This address is available."}
                {slugStatus === "taken" && "That web address is already taken. Try another."}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
          <Link href="/dashboard" className="btn-soft justify-center">
            Cancel
          </Link>
          <button type="submit" disabled={loading} className="btn-primary justify-center py-3! sm:min-w-52">
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4" aria-hidden="true" />
                Create Restaurant
              </span>
            )}
          </button>
        </div>
      </form>

      <p className="mt-4 text-center text-xs text-gray-600">
        Next you&apos;ll add your menu, then set up tables and print QR codes.
      </p>
    </div>
  );
}
