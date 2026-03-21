# MoodMenu — Professional UI/UX Redesign

Transform MoodMenu from a basic MVP into a premium, modern SaaS product with polished UI/UX across all pages.

## Current Issues
- Generic orange/gray color scheme with no depth or personality
- Flat, basic card designs with minimal visual hierarchy
- No animations or micro-interactions
- Auth pages are plain centered forms on gray backgrounds
- Dashboard sidebar is basic dark gray with no polish
- Landing page hero lacks visual impact
- Inconsistent spacing and component patterns across pages

## Design Direction
- **Dark-mode first** dashboard with glassmorphism accents
- **Vibrant gradient palette**: amber-orange → rose-pink → violet
- **Inter font** from Google Fonts for clean modern typography
- **Micro-animations**: hover lifts, fade-ins, smooth transitions
- **Glassmorphism**: frosted cards, translucent sidebar, backdrop blurs
- **Consistent spacing** via a refined component system

---

## Proposed Changes

### Design System & Foundation

#### [MODIFY] [globals.css](file:///d:/development/MoodMenu/src/app/globals.css)
- New CSS custom properties: curated dark/light palette, gradient tokens
- Keyframe animations: `fadeInUp`, `slideIn`, `float`, `shimmer`, `gradient-shift`
- Refined component classes: `.surface-card` with glassmorphism, `.btn-primary` with gradient + glow, `.control-input` with modern focus states
- New utility classes: `.glass`, `.gradient-text`, `.animate-float`

#### [MODIFY] [layout.tsx](file:///d:/development/MoodMenu/src/app/layout.tsx)
- Swap Geist for Inter + Outfit fonts
- Updated metadata with richer descriptions

---

### Landing Page

#### [MODIFY] [page.tsx](file:///d:/development/MoodMenu/src/app/page.tsx)
- **Nav**: Glassmorphic sticky navbar with backdrop blur and brand gradient logo
- **Hero**: Animated gradient background with floating particles, bold typography with gradient text, animated CTA buttons with glow effects
- **Features**: Glassmorphic cards with icon backgrounds, hover lift + shimmer animations
- **How It Works**: Vertical timeline with connected dots and staggered fade-in
- **CTA**: Full-width gradient banner with animated background
- **Footer**: Minimal dark footer with links and branding
- **Stats bar**: Social proof section (restaurants, items served, cities)

---

### Auth Pages

#### [MODIFY] [login/page.tsx](file:///d:/development/MoodMenu/src/app/(auth)/login/page.tsx)
- Dark gradient background with animated mesh
- Centered glassmorphic card with branded header
- Modern input styling with floating labels effect
- Animated submit button with loading spinner
- Smooth error message with slide-in animation

#### [MODIFY] [register/page.tsx](file:///d:/development/MoodMenu/src/app/(auth)/register/page.tsx)
- Matching dark gradient background
- Step-indicator feel with progress dots
- Same modern input and button styling
- Password strength visual indicator bar

---

### Dashboard Shell

#### [MODIFY] [Sidebar.tsx](file:///d:/development/MoodMenu/src/components/dashboard/Sidebar.tsx)
- Dark glassmorphic sidebar with subtle gradient border
- Animated logo with hover glow
- Smooth icon transitions and active-state indicators (left bar accent)
- User avatar section at bottom with name + role
- Animated mobile drawer with backdrop blur

#### [MODIFY] [dashboard/layout.tsx](file:///d:/development/MoodMenu/src/app/dashboard/layout.tsx)
- Subtle dark gradient background instead of flat gray
- Improved main content area with proper max-width

---

### Dashboard Pages

#### [MODIFY] [dashboard/page.tsx](file:///d:/development/MoodMenu/src/app/dashboard/page.tsx)
- Welcome banner with user name and time-based greeting
- Restaurant cards with image placeholder, gradient accent, hover lift and scale
- Empty state with illustrated icon + animated CTA
- Loading skeleton animation instead of spinner

#### [MODIFY] [restaurant/new/page.tsx](file:///d:/development/MoodMenu/src/app/dashboard/restaurant/new/page.tsx)
- Glassmorphic form card
- Step-by-step feel with section headers
- Animated slug preview
- Modern button with gradient

#### [MODIFY] [restaurant/[id]/menu/page.tsx](file:///d:/development/MoodMenu/src/app/dashboard/restaurant/%5Bid%5D/menu/page.tsx)
- Tab navigation bar replacing scattered buttons (Menu, Tables, Staff, Mood, QR, View)
- Category cards with gradient headers
- Menu item cards with image thumbnails, availability toggle switch
- Animated add-item form with slide-down reveal
- Better visual hierarchy with badges for tags

#### [MODIFY] [restaurant/[id]/mood/page.tsx](file:///d:/development/MoodMenu/src/app/dashboard/restaurant/%5Bid%5D/mood/page.tsx)
- Mood rule cards with theme color preview swatch
- Preset cards with hover animation and theme preview
- Better badge styling with glass effect

#### [MODIFY] [restaurant/[id]/qr/page.tsx](file:///d:/development/MoodMenu/src/app/dashboard/restaurant/%5Bid%5D/qr/page.tsx)
- Refined QR display cards with dark background
- Better print layout
- Polished customer flow explainer

#### [MODIFY] [restaurant/[id]/tables/page.tsx](file:///d:/development/MoodMenu/src/app/dashboard/restaurant/%5Bid%5D/tables/page.tsx)
- Visual table grid with number indicators and hover effects
- WiFi config section with modern card design
- Better delete confirmation UX

#### [MODIFY] [restaurant/[id]/staff/page.tsx](file:///d:/development/MoodMenu/src/app/dashboard/restaurant/%5Bid%5D/staff/page.tsx)
- Stat cards with gradient accents
- Call queue with pulse animation for urgent items
- Order board with kanban-style status columns visual
- Modern tab switching with smooth animation

---

### Public-Facing Menu

#### [MODIFY] [MenuClient.tsx](file:///d:/development/MoodMenu/src/components/menu/MenuClient.tsx)
- Improved card layouts with smoother borders and shadows
- Better image handling with rounded corners and aspect ratios
- Refined category navigation with scroll-snap and active indicator
- Smoother modal animations (slide-up with backdrop blur)
- Better WiFi panel design
- Refined footer

---

### Admin Pages

#### [MODIFY] [AdminSidebar.tsx](file:///d:/development/MoodMenu/src/components/admin/AdminSidebar.tsx)
- Match new dashboard sidebar design language
- Red accent for admin branding

#### [MODIFY] [admin/layout.tsx](file:///d:/development/MoodMenu/src/app/admin/layout.tsx)
- Matching dark gradient background

---

## Verification Plan

### Build Verification
```bash
cd d:\development\MoodMenu && npm run build
```
This must complete without TypeScript or build errors.

### Browser Testing
1. **Landing page**: Open `http://localhost:3000` and verify:
   - Animated gradient hero renders
   - Feature cards have glassmorphism and hover effects
   - How-it-works timeline is styled
   - CTA gradient banner renders
   - Mobile responsive layout works correctly

2. **Auth pages**: Navigate to `/login` and `/register`:
   - Dark gradient background renders
   - Form inputs have modern styling
   - Buttons have gradient + hover effects

3. **Dashboard**: Navigate to `/dashboard` after auth:
   - Sidebar has glassmorphic dark design
   - Restaurant cards have hover lift effects
   - Navigation between pages works smoothly

### Manual Verification (User)
- Deploy locally with `npm run dev` and visually check each page
- Verify mobile responsiveness by resizing browser
- Check dark/light mode consistency on public menu
