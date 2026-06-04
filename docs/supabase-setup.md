# Einfache Einrichtung mit Supabase

Dieser Weg ist für **Nicht-Techniker** gedacht: kein Terminal, kein Programmieren,
kein eigenes Hosting. Du rufst nur die fertige JF-Coach-Adresse auf und verbindest
sie einmalig mit einem kostenlosen Datenspeicher.

> **Profi-Alternative:** Wer lieber selbst baut und hostet, kann weiterhin den
> [Firebase-Weg](../FIREBASE_SETUP.md) per `.env` nutzen. Beide Wege funktionieren
> parallel.

---

## Was du brauchst

- Die JF-Coach-Webadresse (vom Betreiber bereitgestellt, z. B. `https://open-jf-coach.netlify.app/`)
- Ein kostenloses [Supabase](https://supabase.com)-Konto

Das war's. Die Einrichtung machst du **einmal pro Jugendfeuerwehr**.

---

## 1. Supabase-Projekt anlegen

1. Auf [supabase.com](https://supabase.com) ein kostenloses Konto erstellen.
2. **"New project"** klicken.
3. Projektname vergeben (z. B. `jf-coach`), ein Datenbank-Passwort setzen (gut aufbewahren).
4. Als **Region** möglichst **"Central EU (Frankfurt)"** wählen — wichtig für die DSGVO.
5. **"Create new project"** klicken und kurz warten, bis das Projekt bereit ist.

---

## 2. Zugangsdaten kopieren

Am einfachsten über den **Connect**-Button **oben im Dashboard** — dort stehen URL
und Key direkt beieinander. Alternativ links über **Settings → API Keys**.

Du brauchst genau zwei Werte:

- **Project URL** — sieht aus wie `https://xxxxx.supabase.co`
- **Publishable Key** — beginnt mit `sb_publishable_…`
  (Findest du im Bereich **API Keys**. Falls noch keiner existiert: **„Create new API Keys"** klicken.)

> Der Publishable Key ist dafür gedacht, öffentlich in der App zu stehen — das ist
> kein Geheimnis. Den **Secret Key** (`sb_secret_…`) brauchst du **nicht** und darfst
> ihn niemals in die App eintragen.
>
> **Älteres Projekt?** Ältere Supabase-Projekte zeigen statt des Publishable Keys
> noch den **anon public**-Key (beginnt mit `eyJ…`) unter „Legacy API Keys". Der
> funktioniert ebenfalls und kann genauso eingetragen werden.

---

## 3. Datenbank vorbereiten (ein Klick)

1. Im Projekt links auf **SQL Editor** → **"New query"**.
2. Den folgenden Block komplett hineinkopieren und **"Run"** klicken
   (denselben Block zeigt dir auch der Einrichtungs-Assistent zum Kopieren an):

```sql
create table if not exists public.team_state (
  team_id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.team_state enable row level security;

drop policy if exists "team_state_anon_rw" on public.team_state;
create policy "team_state_anon_rw" on public.team_state
  for all to anon using (true) with check (true);

do $$ begin
  alter publication supabase_realtime add table public.team_state;
exception when others then null; end $$;
```

Damit werden die Tabelle, die Zugriffsregel und die Echtzeit-Synchronisation
eingerichtet. Das SQL kannst du bei Bedarf gefahrlos erneut ausführen.

---

## 4. In JF-Coach verbinden

1. Die JF-Coach-Adresse im Browser öffnen — der **Einrichtungs-Assistent** erscheint automatisch.
2. Eintragen:
   - **Team-Name** — eindeutig für deine Wehr, z. B. `jf-musterstadt`
   - **Supabase Project URL** (aus Schritt 2)
   - **Supabase Publishable Key** (aus Schritt 2)
3. Auf **"Verbinden & loslegen"** klicken. Die App testet die Verbindung und startet.

Fertig! Alle Geräte, die dieselbe Adresse mit demselben Team-Namen verwenden,
sind ab jetzt live synchron.

---

## Tipps

- **Kameraden einladen (ohne Setup):** Tippe in der App oben rechts auf das
  **Zahnrad** → **„Kameraden einladen"**. Du erhältst einen **Beitritts-Link und
  QR-Code**. Wer ihn öffnet bzw. scannt, ist sofort verbunden — die anderen müssen
  das Supabase-Setup **nicht** selbst durchlaufen.
  > ⚠️ Jeder mit diesem Link kann die Team-Daten sehen und bearbeiten. Teile ihn nur
  > mit Personen, die Zugriff haben sollen.
- **Einstellungen ändern:** Tippe in der App oben rechts auf das **Zahnrad** →
  **„Verbindung ändern"**, um Werte zu korrigieren oder das Team zu wechseln.
  (Alternativ `?setup` an die Adresse anhängen.)
- **Als App installieren:** JF-Coach zeigt unterstützenden Browsern automatisch
  einen **„Installieren"-Hinweis**. Alternativ über das Zahnrad-Menü oder
  „Zum Startbildschirm hinzufügen". Installiert läuft die App wie eine echte
  App – auch offline.

---

## Sicherheit & Datenschutz

- Die Daten liegen in **deinem eigenen** Supabase-Projekt — du bist Eigentümer:in.
- Die obige Zugriffsregel erlaubt jedem mit Project-URL **und** Publishable Key Lese-
  und Schreibzugriff auf die Teamdaten dieses Projekts. Für eine einzelne Wehr mit
  eigenem Projekt ist das in Ordnung. Wer mehrere Wehren in **einem** Projekt trennen
  möchte, sollte die Regel um eine zusätzliche Prüfung erweitern.
- Wähle die Region **Frankfurt/EU**, damit die personenbezogenen Daten in der EU bleiben.

---

## Fehlerbehebung

| Problem | Lösung |
|---|---|
| „Tabelle team_state nicht gefunden" | Das SQL aus Schritt 3 wurde noch nicht (vollständig) ausgeführt. |
| „Verbindung fehlgeschlagen" | Project-URL oder Publishable Key falsch kopiert. Beide über **Connect** bzw. **Settings → API Keys** erneut übernehmen. |
| Sync funktioniert nicht zwischen Geräten | Gleiche Adresse und exakt gleicher Team-Name auf allen Geräten? Im SQL-Schritt wurde die Realtime-Zeile ausgeführt? |
