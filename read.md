# Next.js Integration Kit & Step-by-Step Guide

This guide is designed to help you integrate your completed frontend design (**Epicurean AI**) into the main **Next.js** framework that your teammate Aditya is building. 

We have prepared all the files you need inside the `nextjs-integration-kit/` directory:
- [page.tsx](file:///c:/Users/afifa/Desktop/test%20run/nextjs-integration-kit/page.tsx): Fully functional React component containing all layouts (landing, scanning, results), dynamic transitions, and state logic.
- [globals.css](file:///c:/Users/afifa/Desktop/test%20run/nextjs-integration-kit/globals.css): Custom Tailwind classes (glass-card, hero-mesh, etc.).
- [tailwind.config.js](file:///c:/Users/afifa/Desktop/test%20run/nextjs-integration-kit/tailwind.config.js): Custom colors, border radius, margins, spacing, and typography configs.
- [layout.tsx](file:///c:/Users/afifa/Desktop/test%20run/nextjs-integration-kit/layout.tsx): Root layout with optimized Google Fonts (`Inter`, `Quicksand`) and Material Icon styles.

---

## 🚀 Step-by-Step Integration Guide (For Aditya & Team)

Provide Aditya with the files in this folder and the following 5 steps to plug your design into the main Next.js repository.

### Step 1: Install Tailwind Plugins
Your design uses Tailwind Forms and Container Queries. Aditya needs to install them in the Next.js project root:
```bash
npm install @tailwindcss/forms @tailwindcss/container-queries
```

### Step 2: Merge the Tailwind Configuration
Aditya needs to configure the Tailwind compiler to recognize your custom spacing, sizes, fonts, and colors.
- Copy the content of [tailwind.config.js](file:///c:/Users/afifa/Desktop/test%20run/nextjs-integration-kit/tailwind.config.js) and replace (or merge with) the root `tailwind.config.js` or `tailwind.config.ts` of the Next.js application.

### Step 3: Add Global Styles
Your visual design uses glassmorphism, shadows, gradients, and custom layouts.
- Open [globals.css](file:///c:/Users/afifa/Desktop/test%20run/nextjs-integration-kit/globals.css).
- Copy all custom CSS rules (everything below `@tailwind utilities;`) and paste them at the bottom of the Next.js global CSS file (usually located at `src/app/globals.css`).

### Step 4: Configure Fonts and Icons in Root Layout
Your page uses the fonts `Inter`, `Quicksand`, and `Material Symbols Outlined` icons. Next.js handles Google Fonts natively for speed and optimization.
- Open [layout.tsx](file:///c:/Users/afifa/Desktop/test%20run/nextjs-integration-kit/layout.tsx).
- Note how `Inter` and `Quicksand` are imported from `next/font/google` and configured as Tailwind CSS variables (`--font-inter` and `--font-quicksand`).
- Aditya should update their root layout file (usually `src/app/layout.tsx`) to match this font setup and include the stylesheet link for `Material Symbols Outlined` in the `<head>` of the page.

### Step 5: Place the Page Component
Your page handles the UI routing states (Landing screen, Scanning screen, Results screen) using standard React state hooks.
- Open [page.tsx](file:///c:/Users/afifa/Desktop/test%20run/nextjs-integration-kit/page.tsx).
- Aditya can drop this file directly into the App Router routing structure (e.g., as `src/app/page.tsx` for the home page, or as `src/app/rumors/page.tsx` if it's placed in a sub-route).

---

## 🛠️ Connecting Your Frontend to Mohar's LLM/Database Backend

Once Aditya has the page rendering, you can replace the **mock animations** with **live API data** from Mohar. Here is where the changes will happen inside [page.tsx](file:///c:/Users/afifa/Desktop/test%20run/nextjs-integration-kit/page.tsx):

1. **Triggering the Backend Call**:
   In [page.tsx](file:///c:/Users/afifa/Desktop/test%20run/nextjs-integration-kit/page.tsx), search for the `handleVerify` function. Currently, it just opens the scanning overlay:
   ```typescript
   const handleVerify = (query: string) => {
     if (!query.trim()) return;
     setScreen('scanning'); // Starts scanning animation
   };
   ```
   Aditya should modify this to call a Next.js API route or server action (e.g. `/api/verify?query=...`) that talks to Mohar's LLM database.

2. **Storing the Results**:
   Create a state variable in [page.tsx](file:///c:/Users/afifa/Desktop/test%20run/nextjs-integration-kit/page.tsx) to hold the real response:
   ```typescript
   const [verdictData, setVerdictData] = useState<any>(null);
   ```

3. **Replacing Mock Text in the Results Screen**:
   Replace the hardcoded text in the **Results Section** (like the `Verdict: False` badge, `92%` confidence score, summary paragraph, and sources grid) with dynamic values from `verdictData` (e.g., `{verdictData.confidence}%` and `{verdictData.summary}`).
