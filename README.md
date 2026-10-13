# Chemgenius

Build a next-generation, ultra-beautiful, animated chemistry AI platform called "SmartChemVision - The Ultimate Chemistry Universe". This is not just a compound list, it's a full chemistry operating system.



**DESIGN SYSTEM - VERY IMPORTANT:**

- Theme: Dark premium glassmorphism + neon gradients (deep blue #0a0e1f background, cyan #00f5ff and violet #8b5cf6 accents)

- Animations: Framer Motion everywhere, smooth page transitions, 3D tilt on cards, floating molecules in hero section

- UI: Fully responsive, modern, clean, like Apple + SpaceX. Use Tailwind CSS, Shadcn UI.

- Make it look SMART, not like a school project.



**CORE DATABASE & DATA SOURCE:**

1. Integrate PubChem API (PUG-REST) to fetch ALL compounds - not just 6. Search should work for 100M+ compounds.

2. Use Supabase for caching and user history.

3. For Elements, use full periodic table dataset with: atomic number, molar mass, molecular mass, discovery year, discovered by, uses, occurrence, metal/non-metal/metalloid, acid/base behavior, electronegativity, electron config, isotopes.

4. For every compound store: IUPAC Name, Common Names, SMILES, InChI, Formula, Molar Mass, 2D/3D Structure, Hybridization, Bond angles, Safety (GHS), Uses, Limitations, Applications in Medicine/Industry.



**PAGES & FEATURES TO BUILD - NOTHING SHOULD BE MISSED:**



**1. HERO DASHBOARD:**

- Animated periodic table (interactive, hover shows full element popup with molar mass, who discovered, uses, found in, metal/non-metal/acid-base separation with color codes: Blue=Metal, Green=Non-metal, Yellow=Metalloid, Red=Acidic oxide, etc.)

- Popular compounds carousel, AI search bar (search by name, formula, SMILES, IUPAC)



**2. COMPOUND PROFILE PAGE (When clicking any compound):**

- Left: Interactive 2D Structure (using SmilesDrawer.js) and 3D Structure (using 3Dmol.js or Molstar) rotatable, zoomable.

- Right: All info cards: IUPAC Name, General Names, Molecular Mass, Molar Mass, Hybridization (sp, sp2, sp3 with diagram), Polarity, Solubility, Density, Melting/Boiling Point.

- Tabs: Uses, Medical Uses (which medicine contains it, what disease it treats, mechanism), Industrial Applications, Limitations / Side Effects / Toxicity, Natural Sources.



**3. SMART REACTION LAB (Main USP Feature):**

- Input: Select 2 or MULTIPLE compounds (up to 4).

- AI Reaction Predictor: Predict the product, balanced chemical equation, reaction type (substitution, addition, acid-base).

- Output: What is formed? Show product's 2D/3D structure immediately.

- Show: Reaction mechanism animation, energy change, is it exothermic/endothermic?

- Use real chemistry logic via PubChem and RDKit.js (via WASM).



**4. COMPARISON LAB:**

- Select any 2 or 3 compounds -> Side-by-side comparison table: Structure (2D/3D), Hybridization, Molar Mass, Reactivity, Uses in medicine, Acid/Base nature, Cost, Safety. Graphical comparison.



**5. AI CHEMISTRY ASSISTANT (Chatbot):**

- Floating AI button: "Ask Chem AI anything - e.g., Why Aspirin works? What happens if I mix X + Y?"

- Use LLM to explain concepts simply.



**6. EXTRA SMART FEATURES (Add these yourself to make it outstanding):**

- Reaction Balancer Tool

- Molar Mass Calculator

- Safety & GHS Hazard Symbols

- Solubility Predictor

- Spectroscopy Viewer (IR/NMR predicted)

- Save Favorites & Reaction History



**TECH STACK:**

- React + Vite + TypeScript + Tailwind + Framer Motion

- Supabase for DB

- RDKit.js WASM for chemistry logic, SmilesDrawer, 3Dmol.js

- PubChem API



Build all pages fully functional with mock + real API data. No placeholder "coming soon". Everything must work. Deploy ready.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/49a0e7d3-59b9-40ad-9d1a-28d6b955c44f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
