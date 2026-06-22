# FactPulse — Food Safety Rumor Checker

**FactPulse** is an AI-powered web application that verifies food safety rumors by cross-referencing claims against 8 global food safety databases. It provides clear, sourced answers with evidence strength and source breakdown.

---

## 🚀 Live Demo

[https://factpulse.vercel.app](https://factpulse.vercel.app)

---

## 📋 Features

- **🔍 8 Data Sources** — FDA, USDA FSIS, UK FSA, CFIA, WHO, Open Food Facts, EU RASFF, CDC
- **🧠 AI-Powered Analysis** — Uses Groq (Mixtral) to analyze source data
- **📊 Evidence Breakdown** — Shows % Agrees, Disagrees, Inconclusive per query
- **🎨 Modern UI** — Dark mode compatible, glassmorphism design
- **⚡ Real-time** — Parallel queries to all 8 sources for fast results

---

## 🛠️ Tech Stack

| Category | Technology |
| :--- | :--- |
| **Framework** | Next.js 14 (App Router) |
| **Frontend** | React, Tailwind CSS |
| **Backend** | Next.js API Routes |
| **AI** | Groq (Mixtral / Llama) |
| **Deployment** | Vercel |
| **Language** | JavaScript (ES6) |

---

## 📦 Setup

### 1. Clone the Repository

```bash
git clone https://github.com/adityabasu08/factpulse.git
cd factpulse
```

2. Install Dependencies

```bash
npm install
```

3. Environment Variables

Create a `.env.local` file in the root:

```env
GROQ_API_KEY=your_groq_api_key
OPENFDA_API_KEY=your_openfda_api_key
```

4. Run the Development Server

```bash
npm run dev
```

Open http://localhost:3000 to view the app.

5. Build for Production

```bash
npm run build
npm start
```

---

## 🔧 Deployment to Vercel

- Push your code to GitHub
- Go to Vercel and import the repository
- Add environment variables:
  - `GROQ_API_KEY`
  - `OPENFDA_API_KEY`
- Click Deploy

---

## 🧠 How It Works

1. **User submits a claim** — e.g., "Is Jif peanut butter safe?"
2. **AI extracts** — Brand, Product Type, and Concern (if any)
3. **8 sources queried** — In parallel (FDA, USDA, UK FSA, CFIA, WHO, Open Food Facts, RASFF, CDC)
4. **AI analyzes each source** — Determines if it Agrees, Disagrees, or is Inconclusive
5. **Results aggregated** — Evidence Strength = sources with data / total sources × 100
6. **Response displayed** — Clean UI with Agrees/Disagrees/Inconclusive breakdown

---

## 📊 Data Sources

| Source | Coverage |
| :--- | :--- |
| 🇺🇸 FDA | US food (non-meat) recalls |
| 🇺🇸 USDA FSIS | US meat, poultry, egg recalls |
| 🇬🇧 UK FSA | UK food alerts, allergens |
| 🇨🇦 CFIA | Canadian food recalls |
| 🌍 WHO | Health risk classifications |
| 🌐 Open Food Facts | Global product data |
| 🇪🇺 EU RASFF | EU food safety alerts |
| 🇺🇸 CDC | US foodborne outbreaks |

---

## 🗂️ Project Structure

```
factpulse/
├── app/
│   ├── api/
│   │   └── check-rumor/
│   │       └── route.js      # Backend API logic
│   ├── globals.css           # Global styles
│   ├── layout.js             # Root layout
│   └── page.js               # Frontend UI
├── public/                   # Static assets
├── .env.local                # Environment variables (not in git)
├── next.config.mjs           # Next.js config
├── package.json              # Dependencies
├── postcss.config.mjs        # PostCSS config
├── tailwind.config.js        # Tailwind CSS config
├── PITCH.md                  # Problem statement slide
└── README.md                 # Project documentation
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 🙏 Acknowledgements

- **Groq** — AI inference
- **FDA** — Food recall data
- **USDA** — Meat/poultry recall data
- **UK FSA** — UK food alerts
- **CFIA** — Canadian food recalls
- **Open Food Facts** — Global product data
- **EU RASFF** — EU food safety alerts
- **CDC** — Foodborne outbreak data

---

## 🏆 Hackathon Project

Built for [USAII HACKATHON] — [2026]

**Team:**
- Aditya Basu
- Mohar Mishra
- Mohammad Mohaimin Uddin Naib
