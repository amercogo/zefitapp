# ZeFit Admin Panel

Admin web aplikacija za upravljanje ZeFit teretanom.  
Služi osoblju teretane za:

- pregled statistika (dolazci, uplate, aktivni paketi…)
- pretragu članova i pregled profila
- upravljanje paketima i članarinama
- objave / novosti za ZeFit

> Frontend: **Next.js + TypeScript + Tailwind**  
> Backend / baza: **Supabase** (Auth, Database, Storage, RLS)

---

## ✨ Features

### 🔐 Auth & korisnici

- Prijava admin korisnika preko **Supabase Auth**
- Zaštićene rute (`/dashboard`, `/pretraga`, `/objave` itd.)
- Admin profil sa:
  - imenom i prezimenom
  - brojem telefona
  - avatarom (upload u Supabase Storage)

---

### 📊 Dashboard (Pregled)

Stranica `/dashboard` prikazuje ključne KPI-eve za odabrani period:

- **Filtriranje po periodu**  
  - datum `od` / `do` (date picker)
  - quick filteri: posljednjih 7 / 30 / 90 dana, 1 godina
- **Prosječna cijena paketa**
- **Najprodavaniji paket**
- **Broj novih klijenata u periodu**
- **Ukupne uplate** u KM

Grafovi:

- **Grafik dolazaka** (Recharts line chart)
- **Grafik uplata** (lista po danima / iznosima)

Dodatne sekcije:

- **Najaktivniji klijenti** (top 5 po dolascima)
- **Članarine koje ističu u narednih 7 dana**
- **Trenutno u teretani** (broj članova u zadnjih 90 min bez vremena izlaska)

---

### 🧍‍♂️ Pretraga klijenata

Stranica `/pretraga` služi za brzo pronalaženje klijenata.

Filteri:

- ime
- prezime
- broj telefona
- status (aktivni / neaktivni)
- barkod / broj kartice (npr. skener na recepciji)

UI:

- lijevo: **filteri + lista rezultata**
- desno: **mini profil** odabranog klijenta:
  - inicijal u krugu
  - ime i prezime
  - član kod (npr. `ZE-123456`)
  - telefon
  - datum članstva
  - aktivan paket (ako postoji)
  - badge ako članarina ističe uskoro ili je istekla
  - dugme **“Otvori profil”**

#### 🧾 Full profil modal

Klik na *“Otvori profil”* otvara modal sa tabovima:

1. **Lične informacije**
   - ime i prezime
   - email
   - telefon
   - broj kartice
   - napomena
   - opcija *“Obriši klijenta”* (brisanje iz `clanovi` + povezanih podataka)

2. **Paketi i finansije**
   - ukupno uplaćeno u zadnjih 12 mjeseci
   - tabela **paketa** klijenta (iz `clanarine_clanova` + `tipovi_clanarina`)
   - tabela **uplata** (iz `placanja`)
   - dugme **“Dodaj paket”**:
     - izbor tipa članarine
     - period (od / do)
     - cijena (može override default cijene)
     - automatsko povezivanje uplate sa paketom

---

### 📰 Objave (Posts)

Stranica `/objave` omogućava upravljanje objavama za ZeFit:

- lista objava (naslov, datum, preview teksta, slika)
- **Dodaj objavu**:
  - naslov
  - sadržaj
  - opcionalna slika (upload u Supabase Storage, spremanje `image_url`)
- **Uredi objavu**:
  - uređivanje postojećih podataka
- **Brisanje objave**

UI je rađen u ZeFit stilu:

- tamna tema
- žuta kao primarna boja (`--color-yellow`)
- smooth animacije (Framer Motion)

---

## 🧱 Tehnologije

- **Next.js (App Router)**
- **TypeScript**
- **Tailwind CSS**
- **Supabase**
  - Auth
  - Database
  - Storage
  - Row Level Security (RLS)
- **Recharts** – grafik dolazaka
- **Framer Motion** – animacije modala i interakcija

---

## 🗄️ Baza podataka (Supabase schema)

Glavne tabele:

- `clanovi`
  - `id` (uuid, PK)
  - `clan_kod` (text, unique, npr. `ZE-123456`)
  - `ime_prezime`
  - `telefon`
  - `email`
  - `napravljeno`
  - `status` (`aktivni` / `neaktivni`)
  - `role` (`clan`, kasnije trener itd.)

- `tipovi_clanarina`
  - `id`
  - `naziv` (Mjesečna, Studentska, Godišnja…)
  - `trajanje_dana`
  - `cijena_default`

- `clanarine_clanova`
  - `id`
  - `clan_id` → `clanovi.id`
  - `tip_clanarine_id` → `tipovi_clanarina.id`
  - `cijena`
  - `pocetak`
  - `zavrsetak`
  - `status` (`pending`, `active`, `expired`)

- `placanja`
  - `id`
  - `clan_id` → `clanovi.id`
  - `clanarina_clan_id` → `clanarine_clanova.id`
  - `iznos`
  - `datum_uplate`

- `dolasci`
  - `id`
  - `clan_id` → `clanovi.id`
  - `stigao_u_gym`
  - `izasao_iz_gyma` (može biti null → još u teretani)

- `treneri`, `treninzi`, `clanovi_treninga`
  - pripremljeno za grupne treninge i rad sa trenerima

- `posts`
  - objave / novosti (naslov, sadržaj, slika, datumi)

---

## ⚙️ Pokretanje projekta

### 1. Prerekviziti

- Node.js (>= 18)
- npm / pnpm / yarn
- Supabase projekat (self-hosted ili cloud)

### 2. Kloniraj repo

```bash
git clone https://github.com/<tvoj-username>/<tvoj-repo>.git
cd <tvoj-repo>
```

### 3. Instaliraj zavisnosti

- npm install
# ili
- pnpm install

### 4. Environment varijable
```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```
### 5. Pokreni dev server

- npm run dev
# ili
- pnpm dev
