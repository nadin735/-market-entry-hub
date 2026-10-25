import React, { useState, useEffect, useRef } from "react";
import * as backend from "../../backend.js";
import { readTheme, writeTheme } from "../../theme.js";
const RANGE = { de: "bis", en: "to", ar: "إلى" };
import ThemeToggle from "../../ThemeToggle.jsx";
import { COIN } from "../../hubAssets.js";
import { EUROPE_I18N, localizeIntel } from "../../dataI18n.js";
import { KpiStrip, WhyPanel, ScoringSuite, ScenarioCompare, MemoDoc, CompetitorBlock, IntelPrint, SourceLine, SourcesJump, SourceNote, StatusLegend, analyze } from "../../intel.jsx";
import { LegalPage, LegalNotice, ConsentBox, DataCenter, downloadJSON, legalPack } from "../../legal.jsx";
import { LogOut, ChevronLeft, ChevronDown, ChevronUp } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart, Line, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ScatterChart, Scatter, ZAxis, ReferenceLine } from "recharts";

/* ============================================================================
 * BACKEND-TAUSCHPUNKT — HIER ERSETZEN, SOBALD EIN ECHTES BACKEND BEREIT IST
 * ============================================================================
 * Aktuell (Demo-Modus): Diese Datei speichert Accounts/Analysen im
 * Browser-localStorage. Das funktioniert für Tests, aber Accounts sind nur
 * auf dem jeweiligen Gerät/Browser sichtbar, nicht geräteübergreifend.
 *
 * Sobald ein echtes Backend existiert (z. B. Supabase oder Firebase):
 * Ersetze NUR den Block zwischen den Linien unten durch echte API-Aufrufe.
 * Der Rest der Datei (Login, Registrierung, Speichern von Analysen) ruft
 * ausschließlich window.storage.get/set/delete/list auf und muss NICHT
 * angefasst werden — Kopieren, Datei austauschen, fertig.
 *
 * Die Ersatz-Implementierung muss folgende vier Funktionen mit exakt diesen
 * Signaturen und Rückgabewerten bereitstellen:
 *
 *   get(key, shared)
 *     -> muss { key, value, shared } zurückgeben, wenn vorhanden
 *     -> muss einen Error werfen (throw), wenn der Key nicht existiert
 *
 *   set(key, value, shared)
 *     -> speichert value (ein String, meist JSON.stringify(...)) unter key
 *     -> muss { key, value, shared } zurückgeben
 *
 *   delete(key, shared)
 *     -> löscht den Eintrag, gibt { key, deleted: true, shared } zurück
 *
 *   list(prefix, shared)
 *     -> gibt { keys: [...], shared } zurück (alle Keys mit diesem Präfix)
 *
 * shared=true bedeutet: für alle Nutzer sichtbar (z. B. der "accounts"-Key).
 * shared=false bedeutet: nur für den aktuellen Nutzer/Browser (z. B. "session").
 * Bei einem echten Backend mit Supabase z. B.: shared=true -> eigene Tabelle
 * ohne User-Filter, shared=false -> Tabelle gefiltert nach eingeloggtem User.
 * ============================================================================
 */
if (typeof window !== "undefined") {
  const LS_PREFIX = "app_storage_";
  // In-memory fallback used ONLY if localStorage itself throws (e.g. blocked
  // in a sandboxed preview iframe, strict private-browsing mode, or a
  // third-party-storage-partitioned embed). This keeps registration/login
  // working for the current page session even when persistent storage is
  // unavailable, instead of every account save failing outright.
  const memoryStore = {};
  function lsGet(key) {
    try { return localStorage.getItem(key); }
    catch (e) { return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null; }
  }
  function lsSet(key, value) {
    try { localStorage.setItem(key, value); }
    catch (e) { memoryStore[key] = value; }
  }
  function lsRemove(key) {
    try { localStorage.removeItem(key); }
    catch (e) { delete memoryStore[key]; }
  }
  function lsKeys() {
    try { return Object.keys(localStorage); }
    catch (e) { return Object.keys(memoryStore); }
  }
  const localFallback = {
    async get(key) {
      const raw = lsGet(LS_PREFIX + key);
      if (raw === null || raw === undefined) throw new Error("not found");
      return { key, value: raw, shared: false };
    },
    async set(key, value) {
      lsSet(LS_PREFIX + key, value);
      return { key, value, shared: false };
    },
    async delete(key) {
      lsRemove(LS_PREFIX + key);
      return { key, deleted: true, shared: false };
    },
    async list(prefix) {
      const keys = lsKeys()
        .filter(k => k.startsWith(LS_PREFIX + (prefix || "")))
        .map(k => k.slice(LS_PREFIX.length));
      return { keys, shared: false };
    }
  };
  // If the host environment (e.g. a Claude artifact runtime) already
  // provides window.storage, we still don't fully trust it — a network
  // hiccup or a temporarily unreachable backend would otherwise take down
  // registration/login entirely. So EVERY call tries the host's storage
  // first (to get real persistence when it's actually available), and
  // transparently falls back to the local implementation the moment the
  // host call throws for any reason, rather than surfacing an error to the
  // person filling in the form.
  const hostStorage = (window.storage && typeof window.storage.get === "function") ? window.storage : null;
  // A host storage that never answers (slow/blocked backend) must not freeze
  // the app on the loading screen: give each call 2.5 s, then use local storage.
  let hostDead = false;
  const withTimeout = p => Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => { hostDead = true; rej(new Error("host storage timeout")); }, 2500))
  ]);
  window.storage = {
    async get(key, shared) {
      if (hostStorage) {
        if (!hostDead) try { return await withTimeout(hostStorage.get(key, shared)); }
        catch (e) { /* fall through to local */ }
      }
      return localFallback.get(key, shared);
    },
    async set(key, value, shared) {
      if (hostStorage) {
        if (!hostDead) try { return await withTimeout(hostStorage.set(key, value, shared)); }
        catch (e) { /* fall through to local */ }
      }
      return localFallback.set(key, value, shared);
    },
    async delete(key, shared) {
      if (hostStorage) {
        if (!hostDead) try { return await withTimeout(hostStorage.delete(key, shared)); }
        catch (e) { /* fall through to local */ }
      }
      return localFallback.delete(key, shared);
    },
    async list(prefix, shared) {
      if (hostStorage) {
        if (!hostDead) try { return await withTimeout(hostStorage.list(prefix, shared)); }
        catch (e) { /* fall through to local */ }
      }
      return localFallback.list(prefix, shared);
    }
  };
}
/* ============================================================================
 * ENDE BACKEND-TAUSCHPUNKT
 * ============================================================================
 */


/**
 * GCC Market Entry Tool — Core Analytical Engine
 * -----------------------------------------------
 * Pure, framework-free business logic: scoring, recommendations,
 * entry-plan sequencing, detailed step roadmap, and the financial model.
 * No React, no DOM — fully unit-testable in isolation, which is the point.
 *
 * IMPORTANT (read this before presenting the tool):
 * The country/sector scores in BASE and SECTOR_FIT are an illustrative
 * MVP rubric, not live market data. They are structured so that swapping
 * in a real data feed (GTAI sector reports, World Bank indicators, a
 * paid market-intelligence API) only requires replacing these two
 * constants — every downstream function (recommendation, entry plan,
 * financial model) is agnostic to where the scores came from.
 */

/* ---------------------------------------------------------
   REFERENCE DATA
--------------------------------------------------------- */

const BASE = {
  Germany: {
    market: 88,
    competition: 65,
    regulatory: 72,
    partner: 85,
    investment: 76,
    overall: 0
  },
  France: {
    market: 82,
    competition: 68,
    regulatory: 68,
    partner: 74,
    investment: 75,
    overall: 0
  },
  UK: {
    market: 85,
    competition: 70,
    regulatory: 75,
    partner: 80,
    investment: 82,
    overall: 0
  },
  Italy: {
    market: 75,
    competition: 72,
    regulatory: 60,
    partner: 68,
    investment: 65,
    overall: 0
  },
  Spain: {
    market: 76,
    competition: 70,
    regulatory: 70,
    partner: 72,
    investment: 80,
    overall: 0
  },
  Netherlands: {
    market: 70,
    competition: 66,
    regulatory: 80,
    partner: 78,
    investment: 76,
    overall: 0
  }
};
const SECTOR_FIT = {
  realEstate: {
    Germany: { market: 5 },
    France: { market: 4 },
    UK: { market: 7, competition: -2 },
    Italy: { market: 3 },
    Spain: { market: 6 },
    Netherlands: { market: 3 }
  },
  sovereignInvestment: {
    Germany: { investment: 3 },
    France: { investment: 2 },
    UK: { investment: 6, regulatory: 2 },
    Italy: { investment: 1 },
    Spain: { investment: 2 },
    Netherlands: { investment: 4 }
  },
  halalFood: {
    Germany: { market: 5, partner: 3 },
    France: { market: 6, partner: 2 },
    UK: { market: 5, partner: 3 },
    Italy: { market: 2 },
    Spain: { market: 2 },
    Netherlands: { market: 3 }
  },
  islamicFinance: {
    Germany: { regulatory: 5, partner: 4, market: 3 },
    France: { market: 1 },
    UK: { regulatory: 6, partner: 5, market: 4 },
    Italy: { market: 1 },
    Spain: { market: 1 },
    Netherlands: { market: 1 }
  },
  logistics: {
    Germany: { partner: 4, market: 4 },
    France: { market: 2 },
    UK: { market: 3, partner: 2 },
    Italy: { market: 2 },
    Spain: { market: 2 },
    Netherlands: { partner: 6, market: 5 }
  },
  renewableEnergy: {
    Germany: { investment: 4, market: 4 },
    France: { investment: 2 },
    UK: { investment: 3 },
    Italy: { investment: 1 },
    Spain: { investment: 4, market: 3 },
    Netherlands: { investment: 2 }
  },
  luxuryRetail: {
    Germany: { market: 3 },
    France: { market: 8, competition: -3 },
    UK: { market: 5 },
    Italy: { market: 7, competition: -2 },
    Spain: { market: 3 },
    Netherlands: { market: 2 }
  }
};

/** World Bank (current US$, 2024). Population derived from GDP ÷ GDP-per-capita where a direct WB total wasn't quoted. Growth figures: World Bank / national statistics offices, 2024. Germany's 2024 GDP growth was genuinely negative (-0.5%, Destatis) — shown as-is, not smoothed over. Verified Aug 2026. */
const COUNTRY_FUNDAMENTALS = {
  Germany: {
    populationMillions: 83.5,
    gdpPerCapitaUsd: 56104,
    gdpGrowthPct: -0.5,
    source: "World Bank / Destatis, 2024",
    growthHistory: [{ year: 2019, pct: 1.0 }, { year: 2020, pct: -4.1 }, { year: 2024, pct: -0.5 }, { year: 2025, pct: 0.2, forecast: true }]
  },
  France: {
    populationMillions: 68.4,
    gdpPerCapitaUsd: 46210,
    gdpGrowthPct: 1.1,
    source: "World Bank / INSEE, 2024",
    growthHistory: [{ year: 2019, pct: 2.1 }, { year: 2020, pct: -7.6 }, { year: 2024, pct: 1.1 }, { year: 2025, pct: 0.7, forecast: true }]
  },
  UK: {
    populationMillions: 68.4,
    gdpPerCapitaUsd: 53246,
    gdpGrowthPct: 1.1,
    source: "World Bank, 2024",
    growthHistory: [{ year: 2019, pct: 1.6 }, { year: 2020, pct: -10.3 }, { year: 2024, pct: 1.1 }, { year: 2025, pct: 1.3, forecast: true }]
  },
  Italy: {
    populationMillions: 58.9,
    gdpPerCapitaUsd: 40430,
    gdpGrowthPct: 0.7,
    source: "World Bank / ISTAT, 2024",
    growthHistory: [{ year: 2019, pct: 0.4 }, { year: 2020, pct: -8.9 }, { year: 2024, pct: 0.7 }, { year: 2025, pct: 0.6, forecast: true }]
  },
  Spain: {
    populationMillions: 48.6,
    gdpPerCapitaUsd: 35510,
    gdpGrowthPct: 3.2,
    source: "World Bank / INE, 2024",
    growthHistory: [{ year: 2019, pct: 2.1 }, { year: 2020, pct: -10.9 }, { year: 2024, pct: 3.2 }, { year: 2025, pct: 2.8 }, { year: 2026, pct: 2.2, forecast: true }, { year: 2027, pct: 1.9, forecast: true }]
  },
  Netherlands: {
    populationMillions: 18.0,
    gdpPerCapitaUsd: 67520,
    gdpGrowthPct: 1.0,
    source: "World Bank / CBS, 2024",
    growthHistory: [{ year: 2019, pct: 1.7 }, { year: 2020, pct: -3.9 }, { year: 2024, pct: 1.0 }, { year: 2025, pct: 1.9 }, { year: 2026, pct: 1.2, forecast: true }, { year: 2027, pct: 1.6, forecast: true }]
  }
};
/** Historical (2019/2020 COVID contraction) source: Eurostat / national statistics offices (Destatis, INSEE, ONS, ISTAT, INE, CBS), compiled via Statista G7 series and Trading Economics national data. Forecast (2025–2027) sources: Trading Economics econometric models and national government/central-bank projections, as reported through early 2026. Verified Aug 2026. */
const GROWTH_HISTORY_SOURCE = "Eurostat / national statistics offices (hist.) · Trading Economics + national forecasts through early 2026 (forecast)";
const clamp = n => Math.max(0, Math.min(100, Math.round(n)));

/** Regulatory Check — corporate tax, VAT and licensing per country. Real, sourced (Trading Economics, HMRC, national tax authorities). Verified Aug 2026. */
const REGULATORY_CHECK = {
  Germany: {
    corporateTax: "30% (Körperschaft + Gewerbesteuer kombiniert)",
    vat: "19%",
    licensing: "GmbH Gründung + Handelsregistereintragung; Gewerbeanmeldung je nach Tätigkeit.",
    source: "Trading Economics / Bundeszentralamt für Steuern, 2026"
  },
  France: {
    corporateTax: "25%",
    vat: "20%",
    licensing: "Unternehmensregistrierung über das Guichet Unique, Rechtsformwahl (u. a. SAS, SARL).",
    source: "Trading Economics / Direction Générale des Finances Publiques, 2026"
  },
  UK: {
    corporateTax: "19\u201325% (gestaffelt: 19% bis £50.000 Gewinn, 25% ab £250.000)",
    vat: "20%",
    licensing: "Registrierung bei Companies House; VAT Pflicht ab £90.000 Jahresumsatz (Nicht UK Unternehmen: unabhängig vom Umsatz).",
    source: "HMRC / Trading Economics, 2026"
  },
  Italy: {
    corporateTax: "24%",
    vat: "22%",
    licensing: "Handelsregistereintragung (Registro delle Imprese), Partita IVA (Steuernummer) erforderlich.",
    source: "Trading Economics / Stripe Tax, 2026"
  },
  Spain: {
    corporateTax: "25%",
    vat: "21%",
    licensing: "Eintragung ins Handelsregister (Registro Mercantil), NIE/CIF Steuernummer erforderlich.",
    source: "Trading Economics / Agencia Tributaria, 2026"
  },
  Netherlands: {
    corporateTax: "25,8%",
    vat: "21%",
    licensing: "Eintragung bei der Kamer van Koophandel (Handelskammer), BV Gründung üblichste Rechtsform.",
    source: "Trading Economics / Belastingdienst, 2026"
  }
};

/** Competitor Analysis — real, named market leaders per country (verified via search, not invented), plus a qualitative market-structure/gap note. Aug 2026. */
const COMPETITOR_ANALYSIS = {
  Germany: {
    players: ["Volkswagen (Automobil, größter Konzern Europas nach Umsatz)", "Allianz (Versicherung/Finanzdienstleistungen)", "SAP (Software, größter Softwarekonzern Europas)"],
    gap: "Große Konzerne dominieren Industrie/Finanzen; der Mittelstand modernisiert aktuell aktiv Richtung KI/Digitalisierung, Einstiegspunkt für spezialisierte B2B Lösungen."
  },
  France: {
    players: ["TotalEnergies (Energie)", "BNP Paribas (Banking)", "AXA (Versicherung)"],
    gap: "Stark konsolidierter Finanz und Energiesektor; Expansion in neue Geografien/Sprachen ist laut Branchenumfragen eine der größten eigenen Herausforderungen französischer B2B Marketer, Chance für internationale Partner mit lokaler Expertise."
  },
  UK: {
    players: ["Shell (Energie, nach Umsatz Platz 2 in Europa)", "HSBC (Banking)"],
    gap: "Höchste Investitionsbereitschaft unter den großen EU Volkswirtschaften (82% planen Budget Erhöhung >10%), stark technologiegetrieben, offen für neue Tech und Digital Anbieter."
  },
  Italy: {
    players: ["UniCredit / Intesa Sanpaolo (die zwei dominanten Bankengruppen)", "Eni (Energie)", "Generali (Versicherung, Marktführer)"],
    gap: "Fortschrittliche Industriecluster, aber laut UK DBT Einschätzung (2026) noch wachsende digitale Ökosysteme, Raum für Cybersecurity, Automatisierung und Smart City Anbieter."
  },
  Spain: {
    players: ["Banco Santander (Banking)", "Inditex (Retail/Mode, u. a. Zara)"],
    gap: "Sehr diversifizierte, schnell wachsende Wirtschaft; eine der größten EU Förderquoten treibt erneuerbare Energien & digitale Infrastruktur, Sektoren mit noch nicht abschließend besetzter Konkurrenzlandschaft."
  },
  Netherlands: {
    players: ["ASML (Halbleiter, wertvollstes Unternehmen der Niederlande)", "ING Group (Banking)", "Heineken (Konsumgüter)"],
    gap: "Offene, wettbewerbsfähige Wirtschaft mit starkem Servicesektor; wachsende Nachfrage nach Nachhaltigkeits und Healthtech Lösungen noch nicht von etablierten Playern vollständig besetzt."
  }
};

/** Market Opportunity — target audience, demand drivers, current trend per country. Real, sourced (see each entry), not modeled. Verified Aug 2026. */
const MARKET_OPPORTUNITY = {
  Germany: {
    audience: "Mittelstand auf der Suche nach KI und Digitalisierungslösungen",
    drivers: ["Industrieller Kern modernisiert sich für KI & Quanten Anwendungen", "Internationale E Commerce Plattformen expandieren aktiv nach Deutschland"],
    trend: "Globale E Commerce Anbieter nutzen Deutschland verstärkt als Einstiegspunkt in den EU Markt.",
    source: "business.gov.uk / ResearchAndMarkets, 2022"
  },
  France: {
    audience: "B2B Entscheider mit wachsendem Tech Investitionsfokus",
    drivers: ["Technologie ist 2024 branchenübergreifend Top Investitionsfokus", "Expansion in neue Geografien/Sprachen als erklärte Priorität"],
    trend: "Marketing und Tech Budgets wachsen 2024 branchenweit, mit Fokus auf internationale Expansion.",
    source: "Forrester Marketing Survey, 2024"
  },
  UK: {
    audience: "B2B Marketer mit höchster Investitionsbereitschaft in Europa",
    drivers: ["82% planen Marketing Budget Erhöhung über 10%", "Technologie als klarer Top Investitionsfokus"],
    trend: "Größte Investitionsbereitschaft unter den fünf großen EU Volkswirtschaften im Marketing und Tech Bereich.",
    source: "Forrester Marketing Survey, 2024"
  },
  Italy: {
    audience: "Tech Sektor mit Fokus Cybersecurity, Automatisierung, Smart Cities",
    drivers: ["Fortschrittliche Industriecluster", "Wachsende digitale Ökosysteme"],
    trend: "Aktive internationale Kooperationsformate (2026) zeigen wachsendes Investoreninteresse.",
    source: "UK Department for Business & Trade, März 2026"
  },
  Spain: {
    audience: "Tourismus, Gesundheit, Tech und Sicherheitssektor",
    drivers: ["Eine der größten EU Förderquoten für Regenerierung (erneuerbare Energien, digitale Infrastruktur)", "2023 zweitmeist besuchtes Land der Welt"],
    trend: "Breite Chancen über Einzelhandel, Gesundheit, Tech, Bildung und Sicherheit hinweg.",
    source: "UK DBT Experts Q&A, 2026"
  },
  Netherlands: {
    audience: "Nachhaltigkeitsorientierte Konsumenten & digitale Nachfrage",
    drivers: ["Starke Nachfrage nach nachhaltigen Produkten", "Wachsendes E Commerce und Healthtech Segment"],
    trend: "Gesundheitstechnologie und digitale Dienstleistungen als aufstrebende Wachstumsfelder.",
    source: "Marktanalyse Niederlande, versch. Branchenquellen 2025/26"
  }
};

/** Market data excerpts in the active language (German source data with EN/AR wording laid over it). */
const _INTEL_CACHE = {};
function intelFor(lang) {
  return _INTEL_CACHE[lang] || (_INTEL_CACHE[lang] = localizeIntel({ REGULATORY_CHECK, COMPETITOR_ANALYSIS, MARKET_OPPORTUNITY }, EUROPE_I18N, lang));
}

/* ---------------------------------------------------------
   SCORING
--------------------------------------------------------- */

/**
 * Splits a comma-separated string (as typed into a manual form field) into a
 * clean trimmed array, mirroring the shape the PDF scanner already produces
 * via parseListField/parseProductBlocks. This is the single conversion point
 * that keeps manual entry and PDF scan on the same data shape everywhere
 * downstream (scoring, storage, CSV export).
 */
const SAMPLE_PROFILE = {
  "companyName": "Najm Wealth AI LLC",
  "industry": "islamicFinance",
  "product": "AI powered Sharia compliant robo advisory app, investment screening engine and zakat calculation API",
  "revenue": 12.4,
  "budget": 1.5,
  "employees": 94,
  "certifications": [
    "Sharia Board certification",
    "ISO 27001",
    "SOC 2 Type II",
    "ADGM FSRA licence"
  ],
  "customerSegments": [
    "Retail Investors",
    "Banks and Asset Managers",
    "Corporate Treasuries",
    "Wealth Advisors"
  ],
  "salesChannels": [
    "Mobile App Stores",
    "Direct Sales",
    "Banking Partners",
    "White label Licensing"
  ],
  "products": [
    {
      "name": "Najm Invest App",
      "category": "Robo Advisory Mobile App",
      "price": 0.6,
      "priceRaw": "0.60% of assets under management per year",
      "usp": "AI portfolio builder, automatic Sharia screening, no interest bearing instruments, Arabic and English",
      "targetCustomer": "Retail Investors",
      "performance": "Best seller, 58% YoY growth, 52% of total revenue"
    },
    {
      "name": "Najm Screen Engine",
      "category": "Compliance Software (B2B)",
      "price": 4000,
      "priceRaw": "EUR 4,000 per month per institution",
      "usp": "Screens 25,000 securities daily, explainable AI results, audit trail for Sharia boards",
      "targetCustomer": "Banks and Asset Managers",
      "performance": "Fastest growing product, 73% YoY growth, 31% of total revenue"
    },
    {
      "name": "Najm Zakat API",
      "category": "Financial API",
      "price": 0.02,
      "priceRaw": "EUR 0.02 per calculation",
      "usp": "Automated zakat and purification calculation, embeddable in any banking app",
      "targetCustomer": "Banks and Asset Managers, Wealth Advisors",
      "performance": "Recurring usage revenue, 34% YoY growth, 17% of total revenue"
    }
  ]
};

function splitList(text) {
  return String(text || "").split(",").map(s => s.trim()).filter(Boolean);
}

/**
 * Builds the canonical products array from the editable comma-separated
 * "productsText" field. Where a typed name matches a product the PDF scanner
 * already found (case-insensitive), the richer scanned object (category,
 * price, USP, target customer) is kept; names with no scan match become
 * simple stubs with the other fields left empty rather than invented.
 */
function buildProductsFromText(text, scannedProducts) {
  const names = splitList(text);
  return names.map(name => {
    const match = (scannedProducts || []).find(p => p.name && p.name.toLowerCase() === name.toLowerCase());
    return match || {
      name,
      category: "",
      price: null,
      priceRaw: "",
      usp: "",
      targetCustomer: "",
      performance: ""
    };
  });
}

function computeScores(input) {
  return computeScoresFull(input).result;
}
function computeScoresFull(input) {
  const rev = Number(input.revenue) || 0;
  const bud = Number(input.budget) || 0;
  const emp = Number(input.employees) || 0;
  const certifications = input.certifications || [];
  const customerSegments = input.customerSegments || [];
  const salesChannels = input.salesChannels || [];
  const products = input.products || [];
  const commitmentBoost = bud >= 2 ? 3 : bud >= 0.5 ? 1 : 0;
  // Scale is no longer judged by revenue alone: a company with a sizeable
  // team can execute an expansion even before revenue reflects it.
  const scaleBoost = Math.min(3, (rev >= 20 ? 2 : rev >= 5 ? 1 : 0) + (emp >= 200 ? 2 : emp >= 50 ? 1 : 0));
  // Existing certifications (ISO, CE, halal, etc.) reduce regulatory friction
  // in a new market, so they lift the regulatory dimension a little.
  const certBoost = certifications.length >= 3 ? 2 : certifications.length >= 1 ? 1 : 0;
  // A broader set of named customer segments signals a wider addressable
  // market for the target country, so it lifts market attractiveness.
  const segmentBoost = customerSegments.length >= 3 ? 2 : customerSegments.length >= 1 ? 1 : 0;
  // Already-established sales channels are a proxy for partner readiness.
  const channelBoost = salesChannels.length >= 2 ? 2 : salesChannels.length >= 1 ? 1 : 0;
  // A deeper product portfolio gives more angles to win against local
  // competition, so it lifts the competition dimension.
  const productBoost = products.length >= 3 ? 2 : products.length >= 1 ? 1 : 0;
  const result = {};
  const partsAll = {};
  Object.keys(BASE).forEach(country => {
    const base = BASE[country];
    const fit = SECTOR_FIT[input.industry]?.[country] ?? {};
    const market = clamp(base.market + (fit.market ?? 0) + segmentBoost);
    const competition = clamp(base.competition + (fit.competition ?? 0) + scaleBoost + productBoost);
    const regulatory = clamp(base.regulatory + (fit.regulatory ?? 0) + certBoost);
    const partner = clamp(base.partner + (fit.partner ?? 0) + channelBoost);
    const investment = clamp(base.investment + (fit.investment ?? 0) + commitmentBoost);
    const overall = clamp((market + competition + regulatory + partner + investment) / 5);
    const sf = k => Math.round(fit[k] ?? 0);
    const parts = {};
    [["market", market, segmentBoost], ["competition", competition, scaleBoost + productBoost], ["regulatory", regulatory, certBoost], ["partner", partner, channelBoost], ["investment", investment, commitmentBoost]].forEach(([k, v]) => {
      parts[k] = { base: base[k], sector: sf(k), company: Math.round(v - base[k] - sf(k)) };
    });
    partsAll[country] = parts;
    result[country] = {
      market,
      competition,
      regulatory,
      partner,
      investment,
      overall
    };
  });
  return { result, parts: partsAll };
}

/* ---------------------------------------------------------
   RECOMMENDATION
--------------------------------------------------------- */

function buildRecommendation(scores, industry) {
  const countries = Object.keys(scores);
  const target = countries.reduce((a, b) => scores[b].overall > scores[a].overall ? b : a);
  const s = scores[target];
  const entryStrategy = s.partner >= 80 ? "distributorPartner" : s.regulatory >= 75 ? "freeZoneDirect" : "jointVenture";
  const timelineMonths = s.regulatory >= 75 ? 9 : s.regulatory >= 50 ? 14 : 18;
  const risks = Object.entries({
    market: s.market,
    competition: s.competition,
    regulatory: s.regulatory,
    partner: s.partner,
    investment: s.investment
  }).sort((a, b) => a[1] - b[1]).slice(0, 2).map(([key]) => key);
  const steps = ["nextValidatePilot", "nextLegalReview", "nextPartnerShortlist", "nextMarketEntry"];
  return {
    targetMarket: target,
    entryStrategy,
    prioritySector: industry,
    timelineMonths,
    risks,
    steps
  };
}

/* ---------------------------------------------------------
   ENTRY PLAN (4 macro phases)
--------------------------------------------------------- */

function buildEntryPlan(rec) {
  const total = rec.timelineMonths;
  return ENTRY_PLAN_PHASE_PCTS.map(seg => ({
    key: seg.key,
    startMonth: Math.round(seg.startPct / 100 * total),
    endMonth: Math.round(seg.endPct / 100 * total)
  }));
}

/** Exported so the UI can render percentage-width phase bars without duplicating this table. */
const ENTRY_PLAN_PHASE_PCTS = [{
  key: "phaseValidation",
  startPct: 0,
  endPct: 18
}, {
  key: "phaseLegal",
  startPct: 18,
  endPct: 52
}, {
  key: "phasePartner",
  startPct: 52,
  endPct: 78
}, {
  key: "phaseLaunch",
  startPct: 78,
  endPct: 100
}];

/* ---------------------------------------------------------
   DETAILED STEP ROADMAP (13 micro steps, first to last)
--------------------------------------------------------- */

const STEP_TEMPLATE = [{
  key: "stepDeskResearch",
  phase: "phaseValidation",
  category: "catStrategy",
  costPct: 0.02,
  weekPct: 0.06
}, {
  key: "stepPilotCustomer",
  phase: "phaseValidation",
  category: "catStrategy",
  costPct: 0.03,
  weekPct: 0.10
}, {
  key: "stepJurisdiction",
  phase: "phaseLegal",
  category: "catLegal",
  costPct: 0.04,
  weekPct: 0.08
}, {
  key: "stepCompanyReg",
  phase: "phaseLegal",
  category: "catLegal",
  costPct: 0.14,
  weekPct: 0.16
}, {
  key: "stepBankAccount",
  phase: "phaseLegal",
  category: "catFinance",
  costPct: 0.02,
  weekPct: 0.08
}, {
  key: "stepRegulatoryApproval",
  phase: "phaseLegal",
  category: "catRegulatory",
  costPct: 0.15,
  weekPct: 0.14
}, {
  key: "stepInvestorVisa",
  phase: "phasePartner",
  category: "catPersonnel",
  costPct: 0.06,
  weekPct: 0.08
}, {
  key: "stepKeyHires",
  phase: "phasePartner",
  category: "catPersonnel",
  costPct: 0.14,
  weekPct: 0.10
}, {
  key: "stepPartnerShortlist",
  phase: "phasePartner",
  category: "catCommercial",
  costPct: 0.05,
  weekPct: 0.08
}, {
  key: "stepDistributionAgreement",
  phase: "phasePartner",
  category: "catCommercial",
  costPct: 0.03,
  weekPct: 0.06
}, {
  key: "stepSoftLaunch",
  phase: "phaseLaunch",
  category: "catCommercial",
  costPct: 0.10,
  weekPct: 0.08
}, {
  key: "stepMarketingLaunch",
  phase: "phaseLaunch",
  category: "catCommercial",
  costPct: 0.18,
  weekPct: 0.06
}, {
  key: "stepFirstSalesReview",
  phase: "phaseLaunch",
  category: "catStrategy",
  costPct: 0.04,
  weekPct: 0.06
}];
function buildDetailedSteps(rec, budget) {
  const totalWeeks = rec.timelineMonths * 4.33;
  let cumWeek = 0;
  return STEP_TEMPLATE.map(s => {
    const durationWeeks = Math.max(1, Math.round(s.weekPct * totalWeeks));
    const startWeek = Math.round(cumWeek);
    cumWeek += durationWeeks;
    return {
      key: s.key,
      phase: s.phase,
      category: s.category,
      costEurM: Math.round(s.costPct * budget * 100) / 100,
      startWeek,
      durationWeeks
    };
  });
}

/* ---------------------------------------------------------
   FINANCIAL MODEL
   Explicitly a simplified, illustrative model (documented as such
   in the UI). Revenue ramp = fraction of home-market revenue scaled
   by the match score; cost = setup budget in Y1, tapering opex after.
--------------------------------------------------------- */

function buildFinancialModel(input, targetOverallScore) {
  const budget = Number(input.budget) || 1;
  const revenue = Number(input.revenue) || 1;
  const fitMultiplier = Math.max(0.4, targetOverallScore / 100);
  const costBreakdown = [{
    category: "catLegal",
    amount: round2((0.04 + 0.14) * budget)
  }, {
    category: "catFinance",
    amount: round2(0.02 * budget)
  }, {
    category: "catRegulatory",
    amount: round2(0.15 * budget)
  }, {
    category: "catPersonnel",
    amount: round2((0.06 + 0.14) * budget)
  }, {
    category: "catCommercial",
    amount: round2((0.05 + 0.03 + 0.10 + 0.18) * budget)
  }, {
    category: "catStrategy",
    amount: round2((0.02 + 0.03 + 0.04) * budget)
  }];
  const y1 = {
    year: "Year 1",
    cost: round2(budget),
    revenue: round2(revenue * 0.03 * fitMultiplier),
    cumCost: 0,
    cumRevenue: 0
  };
  const y2 = {
    year: "Year 2",
    cost: round2(budget * 0.4),
    revenue: round2(revenue * 0.08 * fitMultiplier),
    cumCost: 0,
    cumRevenue: 0
  };
  const y3 = {
    year: "Year 3",
    cost: round2(budget * 0.4),
    revenue: round2(revenue * 0.15 * fitMultiplier),
    cumCost: 0,
    cumRevenue: 0
  };
  y1.cumCost = y1.cost;
  y1.cumRevenue = y1.revenue;
  y2.cumCost = y1.cumCost + y2.cost;
  y2.cumRevenue = y1.cumRevenue + y2.revenue;
  y3.cumCost = y2.cumCost + y3.cost;
  y3.cumRevenue = y2.cumRevenue + y3.revenue;
  const projection = [y1, y2, y3];
  const breakEvenYear = projection.find(p => p.cumRevenue >= p.cumCost)?.year ?? null;
  return {
    costBreakdown,
    projection,
    breakEvenYear
  };
}
function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Three-month post-entry review: compares actual performance against a
 * linear quarter-of-Year-1 slice of the original forecast (a documented
 * approximation — the tool never modeled a separate quarterly forecast, so
 * this is honest about being a quarter of the annual number, not a distinct
 * prediction). Produces a small set of rule-based observations purely from
 * the deviation pattern in the numbers the user just entered; no external
 * "industry benchmark" figures are used since none are sourced in this tool.
 */
function computeThreeMonthReview(finModel, input) {
  const year1 = finModel.projection[0];
  const expectedRevenue = round2(year1.revenue * 0.25);
  const expectedCosts = round2(year1.cost * 0.25);
  const revenueActual = Number(input.revenueActual) || 0;
  const costsActual = Number(input.costsActual) || 0;
  const revenueDeviationPct = expectedRevenue > 0 ? Math.round((revenueActual - expectedRevenue) / expectedRevenue * 100) : 0;
  const costsDeviationPct = expectedCosts > 0 ? Math.round((costsActual - expectedCosts) / expectedCosts * 100) : 0;
  const statusOf = pct => pct >= 15 ? "aboveExpectation" : pct <= -15 ? "belowExpectation" : "inLine";
  const revenueStatus = statusOf(revenueDeviationPct);
  const costsStatus = statusOf(costsDeviationPct);

  const leads = Number(input.leads) || 0;
  const newCustomers = Number(input.newCustomers) || 0;
  const observations = [];
  if (revenueStatus === "belowExpectation" && leads === 0) {
    observations.push("obsNoLeads");
  } else if (revenueStatus === "belowExpectation" && leads > 0 && newCustomers / leads < 0.1) {
    observations.push("obsLowConversion");
  }
  if (costsStatus === "aboveExpectation" && revenueStatus !== "aboveExpectation") {
    observations.push("obsCostOverrun");
  }
  if (revenueStatus === "aboveExpectation" && costsStatus !== "aboveExpectation") {
    observations.push("obsAheadOfPlan");
  }
  if (revenueStatus === "inLine" && costsStatus === "inLine") {
    observations.push("obsOnTrack");
  }
  if (observations.length === 0) observations.push("obsMixed");

  // Recalibrated forecast: scale the remaining projection years by the
  // actual-vs-expected revenue ratio observed in this first quarter. This is
  // a transparent rescaling of the existing model, not a new prediction.
  const ratio = expectedRevenue > 0 ? revenueActual / expectedRevenue : 1;
  const recalibratedProjection = finModel.projection.map((row, i) => i === 0 ? row : {
    ...row,
    revenue: round2(row.revenue * ratio)
  });

  return {
    expectedRevenue,
    expectedCosts,
    revenueActual,
    costsActual,
    newCustomers,
    leads,
    conversionActual: Number(input.conversionActual) || 0,
    notes: input.notes || "",
    revenueDeviationPct,
    costsDeviationPct,
    revenueStatus,
    costsStatus,
    observations,
    recalibrationRatio: Math.round(ratio * 100) / 100,
    recalibratedProjection,
    reviewedAt: new Date().toISOString()
  };
}

/* ---------------------------------------------------------
   BUDGET SENSITIVITY ANALYSIS
   Answers "how would the target market's score change if the
   expansion budget were higher or lower?" — recomputes computeScores
   at each multiplier of the current budget, holding industry and
   revenue fixed. Pure and testable: no UI, no randomness.
--------------------------------------------------------- */

const SENSITIVITY_MULTIPLIERS = [0.25, 0.5, 1, 1.5, 2, 3];
function computeBudgetSensitivity(input, targetMarket) {
  const baseBudget = Number(input.budget) || 1;
  return SENSITIVITY_MULTIPLIERS.map(m => {
    const budget = round2(baseBudget * m);
    const s = computeScores({
      industry: input.industry,
      revenue: input.revenue,
      employees: input.employees,
      certifications: input.certifications,
      customerSegments: input.customerSegments,
      salesChannels: input.salesChannels,
      products: input.products,
      budget
    })[targetMarket];
    // The public ScoreBoard rounds `overall` to an integer for display consistency elsewhere in
    // the app; that rounding can hide real (if small) budget effects across nearby multipliers.
    // For a sensitivity *trend* line specifically, one decimal of precision on the same five
    // already-rounded factor scores is the honest choice — it's the same data, just not
    // re-rounded away, not a different or inflated calculation.
    if (!s) return { budgetMultiplier: m, budget, overallScore: 0 };
    const preciseOverall = Math.round((s.market + s.competition + s.regulatory + s.partner + s.investment) / 5 * 10) / 10;
    return {
      budgetMultiplier: m,
      budget,
      overallScore: preciseOverall
    };
  });
}

/* ---------------------------------------------------------
   CSV IMPORT
--------------------------------------------------------- */

/**
 * Robust-enough CSV parsing for a single-row template: auto-detects
 * comma vs. semicolon as the delimiter (German-locale Excel exports
 * CSV with semicolons by default — the most common real-world cause
 * of "import doesn't work"), strips a UTF-8 BOM if present, and
 * tolerates \r\n line endings.
 */
function parseCSVInput(text) {
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.trim().split(/\r\n|\r|\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row.");
  const commaCount = (lines[0].match(/,/g) || []).length;
  const semiCount = (lines[0].match(/;/g) || []).length;
  const delimiter = semiCount > commaCount ? ";" : ",";
  const headers = lines[0].split(delimiter).map(h => h.trim());
  const values = lines[1].split(delimiter).map(v => v.trim());
  const row = {};
  headers.forEach((h, i) => {
    row[h] = values[i] ?? "";
  });
  const validIndustries = Object.keys(SECTOR_FIT);
  const industry = validIndustries.includes(row.industry) ? row.industry : "realEstate";
  if (!row.companyName) throw new Error("CSV row is missing a companyName value.");
  return {
    companyName: row.companyName,
    industry,
    product: row.product ?? "",
    revenue: Number(row.revenue) || 0,
    budget: Number(row.budget) || 0
  };
}

/**
 * Design tokens shared across the app. Kept separate from App.tsx so the
 * brand palette and font-loading logic aren't buried inside component code.
 */
const palette = {
  navyDeep: "#050608",
  navyMid: "#0B0E13",
  navyLine: "rgba(243,241,236,0.09)",
  gold: "#5F8BC3",
  goldSoft: "#8FB0DD",
  parchment: "#F4F1EA",
  parchmentCard: "#FFFFFF",
  ink: "#12131A",
  teal: "#C8A96B",
  coral: "#D56F55",
  slate: "#8892A0"
};
const CRYSTAL_STAR_TEAL = "data:image/png;base64,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ZxLl3gWd3HHBB2REGqMnPaId8Vz2K0VM7LbUkgZB0RI1qkS+SNRWwk6byrz99uXuvWT45fNOulK3KCj7t5Qo93Zie5ZTCQQVg4ZF0jBAEMIohChCAjOgKqAYkaxWvAuQQNAwJDWGtL+fsCTM/fK7Vh8LLhvqRfzA2TqjpcTkcsjYYithOSQKHKED1JBKSLUY0N/TR62nTjo1pO+UY2TRhrre827W8QufZnyPYxMvyJSpLP7C2+SpfEjduDnqZ1ppV0pbtuNOfs/GW9syJyfnv5d7VFvvvYpW20fbin58aQqdJx/43z1efe983aQvpq3SQmPP3emcPXPki9mcnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJx1IfktyNkQLFPdfyLcJiLVoR77pOpmXYsZs8c0eajZ16WqHStrbDKuIvNG43vf362vqzYYF3nqUQmTxgRq0QhcUfFhSs+sLZknIj3NaO+hqk7csgXXKtK1rs8++qxOfnQ+O797X7l6mPeu7Z4XOFASpB6TmgLaAFMIUDG4oIVYG/g0RuuK328L5ociTw+1nauW6Bs2KxP2VpFYiAKhUAR6a2igqAuRqEzDxxgboAG0T41YOGui3LGh+31VdfKt89mnUKdMmXrdIUYwxqJaInGKxYFPcbWE8mHb81AYyjPD7cvAGBF5brDH9KuOeWYlE181Tp4canuPqk5evIA92ouYJEFMgSD0mEjxvkBq+1AxpLFiNcAHiqaW0qaTeXJW69DbA3iiX9+UJLRVlXrkMFUhCixeLWpBA0dtl4k8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";
const MARK_IMG = "data:image/png;base64,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";

const CULTURAL_INTEL = {
  de: {
    Germany: ["Meetings beginnen pünktlich auf die Minute; schon wenige Minuten Verspätung gelten als unprofessionell.", "Entscheidungen entstehen oft nach ausführlicher interner Prüfung, langsameres Anfangstempo als am Golf, dafür verbindliche Umsetzung nach Zusage."],
    France: ["Geschäftsessen, besonders das Mittagessen, sind ein wichtiger, unhektischer Teil des Beziehungsaufbaus.", "Anfängliche Kommunikation ist oft formeller (Titel, Höflichkeitsform), bis Vertrauen aufgebaut ist."],
    UK: ["Kommunikation ist oft indirekt, höfliche Zurückhaltung kann auf Ablehnung hindeuten, genaues Zuhören lohnt sich.", "Schriftliche Vereinbarungen und präzise Vertragssprache werden sehr ernst genommen."],
    Italy: ["Persönliche Beziehungen und Treffen vor Ort werden gegenüber reiner Fernkommunikation stark bevorzugt.", "Geschäftskultur und Tempo unterscheiden sich merklich zwischen Norditalien (schneller, konzernartiger) und dem Süden."],
    Spain: ["Geschäftszeiten verschieben sich durch das traditionelle Tagesmodell später in den Nachmittag/Abend als in Deutschland.", "Persönlicher Vertrauensaufbau vor festen Zusagen wird geschätzt."],
    Netherlands: ["Ungewöhnlich direkte Kommunikation, selbst für nordeuropäische Verhältnisse, nicht als Unhöflichkeit gemeint.", "Entscheidungen entstehen oft im Konsens mehrerer Stakeholder statt top down, dauert länger, hält dafür verlässlicher."]
  },
  en: {
    Germany: ["Meetings start precisely on time; even a few minutes late can be read as unprofessional.", "Decisions often follow extensive internal review, a slower initial pace than in the Gulf, but firm follow through once agreed."],
    France: ["Business meals, especially lunch, are an important, unhurried part of relationship building.", "Initial communication tends to be more formal (titles, formal address) until rapport is established."],
    UK: ["Communication is often indirect, polite understatement can signal disagreement, so it pays to read between the lines.", "Written agreements and precise contractual language are taken very seriously."],
    Italy: ["Personal relationships and in person meetings are strongly preferred over remote only communication.", "Business culture and pace differ noticeably between northern Italy (faster, more corporate) and the south."],
    Spain: ["The traditional daily schedule shifts business hours later into the afternoon/evening than in Germany.", "Personal trust building before firm commitments is valued."],
    Netherlands: ["Communication is unusually direct, even by northern European standards, not meant as rudeness.", "Decisions are often made by consensus among stakeholders rather than top down, which takes longer but yields firmer buy in."]
  },
  ar: {
    Germany: ["تبدأ الاجتماعات في موعدها بدقة، وحتى التأخر لبضع دقائق قد يُعتبر غير مهني.", "غالباً ما تأتي القرارات بعد مراجعة داخلية مطولة، وتيرة أبطأ في البداية مقارنة بالخليج، لكن تنفيذاً ملتزماً بعد الاتفاق."],
    France: ["وجبات العمل، خصوصاً الغداء، جزء مهم وغير متعجل من بناء العلاقة.", "التواصل الأولي غالباً أكثر رسمية (الألقاب، صيغة المخاطبة الرسمية) حتى تُبنى الثقة."],
    UK: ["التواصل غالباً غير مباشر، والتحفظ المهذب قد يشير إلى عدم موافقة، لذا يستحق الأمر قراءة ما بين السطور.", "تُؤخذ الاتفاقيات المكتوبة ولغة العقود الدقيقة على محمل الجد الشديد."],
    Italy: ["تُفضَّل العلاقات الشخصية واللقاءات الحضورية بشدة على التواصل عن بُعد فقط.", "تختلف ثقافة الأعمال ووتيرتها ملحوظاً بين شمال إيطاليا الأسرع والأقرب للطابع المؤسسي، والجنوب."],
    Spain: ["يحوّل الجدول اليومي التقليدي ساعات العمل إلى وقت لاحق من بعد الظهر والمساء مقارنة بألمانيا.", "يُقدَّر بناء الثقة الشخصية قبل الالتزامات الثابتة."],
    Netherlands: ["التواصل مباشر بشكل غير معتاد حتى بمقاييس شمال أوروبا، ولا يُقصد به قلة الأدب.", "غالباً ما تُتخذ القرارات بتوافق بين أصحاب المصلحة بدلاً من التوجيه من الأعلى، ما يستغرق وقتاً أطول لكنه يمنح التزاماً أوثق."]
  }
};
const fontImport = `@keyframes opalPulse { 0%, 100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.35); } }
@keyframes crystalShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
@keyframes crystalSpin { from { transform: rotateY(0deg) rotateX(-14deg); } to { transform: rotateY(360deg) rotateX(-14deg); } }
@keyframes crystalGlow { 0%, 100% { filter: brightness(1) drop-shadow(0 0 18px rgba(82,127,184,0.35)); } 50% { filter: brightness(1.08) drop-shadow(0 0 32px rgba(82,127,184,0.6)); } }
@keyframes archOrbit { 0% { transform: perspective(900px) rotateY(-8deg) rotateX(2deg) translateY(0px); } 50% { transform: perspective(900px) rotateY(8deg) rotateX(-2deg) translateY(-4px); } 100% { transform: perspective(900px) rotateY(-8deg) rotateX(2deg) translateY(0px); } }
@keyframes crystalDrift { from { transform: translateX(-15%); } to { transform: translateX(-55%); } }
@keyframes crystalDriftRev { from { transform: translateX(-55%); } to { transform: translateX(-15%); } }
@keyframes crystalWobble3D { 0% { transform: rotateY(-16deg) rotateX(5deg); } 50% { transform: rotateY(16deg) rotateX(-5deg); } 100% { transform: rotateY(-16deg) rotateX(5deg); } }
.opal-live-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #527FB8; box-shadow: 0 0 6px 1px rgba(82,127,184,0.9); animation: opalPulse 1.8s ease-in-out infinite; }
.facet-card { clip-path: polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 22px 100%, 0 calc(100% - 22px)); }
.facet-card-sm { clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px)); }

/* ---- Design layer: calm, matte, precise ---- */
:root { --accent: #5F8BC3; --accent-soft: #8FB0DD; --hair: #242832; }
html { scroll-behavior: smooth; }
body { font-feature-settings: "kern", "liga"; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
.facet-card, .facet-card-sm { clip-path: none !important; border-radius: 10px !important; box-shadow: none !important; }
.rounded-md { border-radius: 4px !important; }
.hover\:scale-105:hover, .hover\:scale-\[1\.01\]:hover { transform: none !important; filter: brightness(1.07); }
button { transition: filter .18s ease, border-color .18s ease, background-color .18s ease, opacity .18s ease; }
button:not(:disabled):hover { filter: brightness(1.08); }
input:not([type=checkbox]):not([type=file]):not([type=radio]), select { min-height: 44px; border-radius: 4px !important; transition: border-color .18s ease, box-shadow .18s ease; }
input:not([type=checkbox]):not([type=file]):focus, select:focus, textarea:focus { border-color: var(--accent) !important; box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent) !important; outline: none !important; }
button:focus-visible, a:focus-visible, label:focus-within, summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
button:not(.sb-btn):not(.sb-link) { min-height: 44px; }
body:not(.printing-report) h1, body:not(.printing-report) h2, body:not(.printing-report) h3 { font-weight: 500 !important; letter-spacing: -0.005em; }
body:not(.printing-report) .hero-title { font-size: clamp(30px, 4.4vw, 50px) !important; line-height: 1.12 !important; max-width: 760px !important; margin-bottom: 18px !important; }
.land-card { transition: border-color .2s ease, transform .2s ease; }
.land-card:hover { border-color: color-mix(in srgb, var(--accent) 55%, transparent) !important; }
.app-header { padding-top: 14px !important; padding-bottom: 14px !important; }
::selection { background: color-mix(in srgb, var(--accent) 35%, transparent); }
body, #root { background: transparent !important; }
body:not(.printing-report) #root > div { background: transparent !important; }
body, button, input, select, textarea { font-family: 'Inter','Noto Sans Arabic',system-ui,sans-serif; font-variant-numeric: tabular-nums; }
.hero-title { letter-spacing: -0.02em; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; } }
`;

/**
 * A genuinely 3D rotating faceted gem — real CSS 3D (perspective +
 * preserve-3d + translateZ per facet), not a flat shape with a drop
 * shadow. Reused both full-size in the intro and mini-size in the
 * header, so the "3D crystal" feeling stays present throughout the
 * app, not just once at launch.
 */
function Crystal3D({ size = 120, color = "#527FB8", colorLight = "#FFFFFF", spinDuration = 7 }) {
  const facets = 8;
  const radius = size * 0.42;
  const faceWidth = size * 0.44;
  const faceHeight = size * 0.66;
  return <div style={{
    width: size,
    height: size,
    perspective: size * 6
  }}>
      <div style={{
      width: "100%",
      height: "100%",
      position: "relative",
      transformStyle: "preserve-3d",
      animation: `crystalSpin ${spinDuration}s linear infinite`
    }}>
        {Array.from({ length: facets }).map((_, i) => {
        const angle = 360 / facets * i;
        return <div key={i} style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: faceWidth,
          height: faceHeight,
          marginLeft: -faceWidth / 2,
          marginTop: -faceHeight / 2,
          background: i % 2 === 0 ? `linear-gradient(180deg, ${colorLight}, ${color})` : `linear-gradient(180deg, ${color}, ${colorLight})`,
          clipPath: "polygon(50% 0%, 100% 42%, 50% 100%, 0% 42%)",
          transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
          backfaceVisibility: "hidden",
          opacity: 0.95,
          border: "1px solid rgba(255,255,255,0.4)"
        }} />;
      })}
      </div>
    </div>;
}

/**
 * A large, centered, radially-symmetric crystal "flower" — real 3D
 * (perspective + preserve-3d + translateZ per petal), used as the
 * signature intro/login visual. Petals are arranged with in-plane
 * rotate() around a shared center (the flower silhouette) while the
 * whole flower also spins on Y via the shared crystalSpin keyframe,
 * so it genuinely tilts in 3D rather than just rotating flat.
 */
function CrystalFlower({ size = 260, color = "#527FB8", colorLight = "#FFFFFF", petalCount = 8, spinDuration = 16 }) {
  const petalLen = size * 0.42;
  const petalWidth = size * 0.15;
  return (
    <div style={{ width: size, height: size, perspective: size * 4.5 }}>
      <div style={{
        width: "100%",
        height: "100%",
        position: "relative",
        transformStyle: "preserve-3d",
        animation: `crystalSpin ${spinDuration}s linear infinite`
      }}>
        {Array.from({ length: petalCount }).map((_, i) => {
          const angle = 360 / petalCount * i;
          const depth = i % 2 === 0 ? 22 : -22;
          return <div key={i} style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: petalWidth,
            height: petalLen,
            marginLeft: -petalWidth / 2,
            marginTop: -petalLen,
            transformOrigin: "50% 100%",
            background: i % 2 === 0 ? `linear-gradient(180deg, ${colorLight}, ${color})` : `linear-gradient(180deg, ${color}, ${colorLight})`,
            clipPath: "polygon(50% 0%, 100% 55%, 65% 100%, 35% 100%, 0% 55%)",
            transform: `rotate(${angle}deg) translateZ(${depth}px)`,
            border: "1px solid rgba(255,255,255,0.35)",
            opacity: 0.94
          }} />;
        })}
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: size * 0.22,
          height: size * 0.22,
          marginLeft: -size * 0.11,
          marginTop: -size * 0.11,
          background: `radial-gradient(circle, ${colorLight}, ${color})`,
          clipPath: "polygon(50% 0%, 100% 38%, 50% 100%, 0% 38%)",
          transform: "translateZ(24px)",
          boxShadow: `0 0 34px ${color}`
        }} />
      </div>
    </div>
  );
}

/**
 * Ambient background — small faceted crystals drifting sideways in a
 * few staggered rows, purely decorative and behind all content.
 */
function AmbientCrystalRows() {
  const rows = [{ top: "12%", count: 7, dur: 38, size: 16, dir: 1 }, { top: "34%", count: 5, dur: 52, size: 22, dir: -1 }, { top: "62%", count: 6, dur: 44, size: 14, dir: 1 }, { top: "84%", count: 4, dur: 60, size: 20, dir: -1 }];
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0, opacity: 0.35 }}>
      {rows.map((row, ri) => <div key={ri} style={{
      position: "absolute",
      top: row.top,
      left: 0,
      width: "160%",
      display: "flex",
      gap: 60,
      animation: `crystalDrift${row.dir > 0 ? "" : "Rev"} ${row.dur}s linear infinite`
    }}>
          {Array.from({ length: row.count }).map((_, i) => <div key={i} style={{
        width: row.size,
        height: row.size * 1.3,
        background: i % 2 === 0 ? "linear-gradient(135deg, #527FB8, transparent)" : "linear-gradient(135deg, #C8A96B, transparent)",
        clipPath: "polygon(50% 0%, 100% 38%, 50% 100%, 0% 38%)",
        opacity: 0.5
      }} />)}
        </div>)}
    </div>;
}


/**
 * Real photographic crystal (cropped from Nadin's own AI-generated
 * reference art, feathered to a transparent edge), not a CSS shape.
 * Replaces the earlier hand-drawn CrystalFlower/CrystalStar for the
 * hero visual — genuine faceted-gem detail instead of flat polygons.
 */
function CrystalPhoto({ size = 300 }) {
  const small = size <= 100;
  return <div style={{ width: small ? size : Math.round(size * 1.45), maxWidth: "100%", margin: "0 auto" }}>
      <img src={small ? MARK_IMG : CRYSTAL_STAR_TEAL} alt="Gulf States and Europe, Market Entry" style={{ width: "100%", height: "auto", display: "block", objectFit: "contain" }} />
    </div>;
}

function CrystalMini({ size = 30, color = "#527FB8" }) {
  return <div style={{
    width: size,
    height: size,
    perspective: size * 8
  }}>
      <div style={{
      width: "100%",
      height: "100%",
      position: "relative",
      transformStyle: "preserve-3d",
      animation: "crystalSpin 4.5s linear infinite"
    }}>
        {[0, 90, 180, 270].map((angle, i) => <div key={i} style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: size * 0.7,
        height: size * 0.95,
        marginLeft: -size * 0.35,
        marginTop: -size * 0.475,
        background: i % 2 === 0 ? `linear-gradient(180deg, #FFFFFF, ${color})` : color,
        clipPath: "polygon(50% 0%, 100% 42%, 50% 100%, 0% 42%)",
        transform: `rotateY(${angle}deg) translateZ(${size * 0.32}px)`,
        backfaceVisibility: "hidden",
        border: "1px solid rgba(255,255,255,0.45)"
      }} />)}
      </div>
    </div>;
}

/**
 * Crystalline circular "Executive Score" ring — a premium alternative to a
 * plain progress bar. Renders a gold/teal gradient arc proportional to
 * `score` (0-100) around a large centered number, with a faceted glow.
 * Pure presentational component; no external deps beyond inline SVG.
 */
function ExecutiveScoreRing({
  score = 0,
  label = "",
  sublabel = "",
  size = 168,
  gold = "#C8A96B",
  teal = "#527FB8"
}) {
  const clamped = Math.max(0, Math.min(100, Number(score) || 0));
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - clamped / 100);
  const gradId = "execScoreGrad";
  const tone = clamped >= 75 ? gold : clamped >= 50 ? teal : "#C97B5C";
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", filter: `drop-shadow(0 0 10px ${tone}55)` }}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={teal} />
            <stop offset="100%" stopColor={gold} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center", padding: 8
      }}>
        <span style={{
          fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif", fontWeight: 700, fontSize: size * 0.28,
          lineHeight: 1, color: "#FFFFFF"
        }}>{Math.round(clamped)}</span>
        <span style={{ fontSize: 11, letterSpacing: "0.06em", color: tone, marginTop: 4, textTransform: "uppercase" }}>{label}</span>
        {sublabel ? <span style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>{sublabel}</span> : null}
      </div>
    </div>
  );
}

/**
 * Compact breakdown of the five scoring dimensions (market, competition,
 * regulatory, partner, investment) as slim gradient bars beneath the score
 * ring. Gives the "expand each dimension" behaviour from the score model
 * without needing a separate modal/route.
 */
function ScoreBreakdownBars({ scores, labels, gold = "#C8A96B", teal = "#527FB8" }) {
  if (!scores) return null;
  const dims = [
    { key: "market", fallback: "Market" },
    { key: "competition", fallback: "Competition" },
    { key: "regulatory", fallback: "Regulatory" },
    { key: "partner", fallback: "Partners" },
    { key: "investment", fallback: "Investment" }
  ];
  return (
    <div style={{ width: "100%", marginTop: 18, display: "flex", flexDirection: "column", gap: 8 }}>
      {dims.map(d => {
        const v = Math.max(0, Math.min(100, Number(scores[d.key]) || 0));
        const tone = v >= 75 ? gold : v >= 50 ? teal : "#C97B5C";
        return (
          <div key={d.key}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "rgba(255,255,255,0.65)", marginBottom: 3 }}>
              <span>{(labels && labels[d.key]) || d.fallback}</span>
              <span style={{ color: tone, fontWeight: 600 }}>{Math.round(v)}</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <div style={{
                width: `${v}%`, height: "100%", borderRadius: 3,
                background: `linear-gradient(90deg, ${teal}, ${gold})`,
                transition: "width 700ms cubic-bezier(.2,.8,.2,1)"
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * All UI copy for DE / EN / AR, kept as one object so every language has a
 * matching, checkable shape (TypeScript will flag a missing key in any
 * language if the object literal shapes ever diverge).
 */

const T = {
  de: {
    appName: "Europe Market Entry",
    corridorLabel: "Golf nach Europa",
    tagline: "Vom Unternehmensprofil zum Europäischen Markteintrittsplan",
    heroSubtext: "Regelbasierte Marktanalyse, strategische Planung und nachvollziehbare Empfehlungen für Ihren Markteintritt.",
    rememberMe: "Angemeldet bleiben",
    forgotPassword: "Passwort vergessen?",
    forgotPasswordNote: "In dieser Demo Version ohne echtes Backend nicht funktional.",
    demoNotice: "Demo Build. Konten sind nur für diese Sitzung gespeichert (kein echtes Backend). Produktivversion nutzt Supabase Auth mit echter Nutzertrennung.",
    login: "Anmelden",
    register: "Konto erstellen",
    loginHint: "Mit Namen und Passwort anmelden.",
    registerHint: "Nur Name und Passwort, keine Mail nötig.",
    logout: "Abmelden",
    email: "E-Mail",
    password: "Passwort",
    name: "Name",
    noAccount: "Noch kein Konto?",
    haveAccount: "Bereits ein Konto?",
    switchToRegister: "Jetzt registrieren",
    switchToLogin: "Jetzt anmelden",
    dashboard: "Dashboard",
    newAnalysis: "Neue Analyse",
    noAnalyses: "Noch keine Analysen. Starte deine erste Markteintrittsbewertung.",
    yourAnalyses: "Deine Analysen",
    companyName: "Unternehmensname",
    industry: "Branche",
    product: "Produkt / Leistung",
    revenue: "Jahresumsatz (Mio. €)",
    budget: "Expansionsbudget (Mio. €)",
    employees: "Mitarbeiterzahl",
    certifications: "Zertifizierungen (kommagetrennt)",
    customerSegments: "Kundensegmente (kommagetrennt)",
    salesChannels: "Vertriebskanäle (kommagetrennt)",
    productsText: "Weitere Produkte (kommagetrennt)",
    analyze: "Score berechnen",
    back: "Zurück",
    resultTitle: "Market Entry Score",
    comparisonTitle: "Ländervergleich",
    marketAttractiveness: "Marktattraktivität",
    competition: "Wettbewerb",
    regulatoryComplexity: "Regulatorik",
    partnerAvailability: "Partnerverfügbarkeit",
    investmentPotential: "Investitionspotenzial",
    overall: "Gesamt",
    recommendation: "Empfehlung",
    executiveScoreTitle: "Markteintritts-Score",
    executiveScoreLabel: "Gesamtbewertung",
    scoreDims: {
      market: "Marktattraktivität",
      competition: "Wettbewerb",
      regulatory: "Regulatorik",
      partner: "Partner",
      investment: "Investitionsklima"
    },
    targetMarket: "Zielmarkt",
    entryStrategy: "Entry Strategy",
    prioritySector: "Prioritätsbranche",
    timeline: "Geschätzter Zeitrahmen",
    timelineShort: "6 bis 9 Monate",
    timelineMedium: "9 bis 14 Monate",
    timelineLong: "14+ Monate",
    mainRisks: "Hauptrisiken",
    potentialPartners: "Potenzielle Partner",
    nextSteps: "Nächste Schritte",
    exportCsv: "Als CSV exportieren",
    exportPdf: "Als PDF exportieren",
    exportPdfAnalysis: "PDF: Markt & Unternehmensanalyse",
    exportPdfStrategy: "PDF: Markteintrittsstrategie",
    exportPdfSummary: "Kompletter Eintrittsplan als PDF", reportSummaryTitle: "Plan-Kurzfassung", sumScore: "Gesamtscore", sumBudget: "Budget", sumPeriod: "Zeitraum", sumBreakEven: "Break-even", sumPhase: "Phase", infoRank: "Rang", infoStrongest: "Stärkster Faktor", infoWeakest: "Schwächster Faktor", infoTrigger: "Auslöser", infoAvg: "Ø aller Märkte", infoVsTarget: "zum Zielmarkt", infoClick: "Anklicken für Details", chartHint: "Tipp: Auf Punkte, Segmente und Balken tippen für Details.", chShare: "Anteil am Budget", chSteps: "Schritte in dieser Kategorie", chNet: "Netto (kumuliert)", chCost: "Kosten kumuliert", chRev: "Umsatz kumuliert", chBE: "Gewinnschwelle erreicht", chNoBE: "Gewinnschwelle noch nicht erreicht", chScoreAt: "Score bei diesem Budget", chVsNow: "gegenüber aktuellem Budget", chClose: "Schließen", infoTotal: "von",
    exportPdfPlan: "PDF: Optimaler Eintrittsplan", reportPlanTitle: "Optimaler Eintrittsplan", planSectionTarget: "Zielmarkt und Einstieg", planSectionPhases: "Phasen und Meilensteine", planSectionGantt: "Zeitplan nach Wochen", planSectionBudget: "Budget nach Kategorie", planSectionBreakEven: "Break-even", planMilestone: "Meilenstein", planTotal: "Gesamt", planAllPhases: "Alle Phasen", planClickHint: "Phase anklicken, um die Schritte zu filtern", planStepHint: "Schritt anklicken für Details", planDuration: "Dauer", planWeeks: "Wochen", planShare: "Anteil am Budget", planSteps: "Schritte", planBudgetLabel: "Budget (€M)", planNoBreakEven: "Keine Gewinnschwelle innerhalb von 3 Jahren",
    reportAnalysisTitle: "Markt & Unternehmensanalyse",
    reportStrategyTitle: "Markteintrittsstrategie",
    reportGeneratedOn: "Erstellt am",
    reportFor: "Erstellt für",
    reportSectionMarketOverview: "Marktübersicht",
    reportSectionGrowthForecast: "Wachstum: Historie & Prognose",
    reportSectionCompetitors: "Wettbewerbslandschaft",
    reportSectionOpportunity: "Marktchance",
    reportSectionRegulatory: "Regulatorischer Rahmen",
    reportSectionCompanyProfile: "Unternehmensprofil",
    reportSectionScoreSummary: "Score-Zusammenfassung",
    reportSectionSources: "Quellen",
    reportSectionGoals: "Ziele & Priorität",
    reportSectionEntryStrategy: "Empfohlene Eintrittsstrategie",
    reportSectionTargetAudience: "Zielgruppe",
    reportSectionRisks: "Risiken",
    reportSectionNextSteps: "Nächste Schritte",
    reportSectionRoadmap: "Roadmap",
    reportSectionFinancials: "Finanzprognose",
    reportForecastLabel: "Prognose",
    reportHistoricalLabel: "Historisch",
    reportNoData: "Keine Angabe",
    reportPopulationLabel: "Bevölkerung",
    reportDisclaimer: "Diese Analyse basiert auf den im Tool hinterlegten, quellenbelegten Marktdaten sowie den vom Nutzer eingegebenen Unternehmensangaben. Sie ersetzt keine individuelle rechtliche, steuerliche oder betriebswirtschaftliche Beratung.",
    culturalIntelTitle: "Geschäftskultur & Verhandlungsstil",
    culturalIntelNote: "Allgemeine Orientierung, kein Ersatz für lokale Beratung im Einzelfall.",
    saveNotice: "Analyse gespeichert im Dashboard.",
    industries: {
      realEstate: "Immobilien",
      sovereignInvestment: "Staatsfonds-Investitionen",
      halalFood: "Halal-Lebensmittel",
      islamicFinance: "Islamic Finance",
      logistics: "Logistik",
      renewableEnergy: "Erneuerbare Energien",
      luxuryRetail: "Luxus-Einzelhandel"
    },
    strategy: {
      distributorPartner: "Lokaler Vertriebspartner + strategische Allianz",
      freeZoneDirect: "Direkter Markteintritt via eigene Tochtergesellschaft im Zielland",
      jointVenture: "Joint Venture mit lokalem Partnerunternehmen"
    },
    riskText: {
      market: "Marktnachfrage ist noch nicht validiert, Pilotprojekt empfohlen.",
      competition: "Hohe Wettbewerbsdichte etablierter lokaler Anbieter in diesem Segment.",
      regulatory: "EU und nationale Regulatorik (z. B. Finanzaufsicht, CE Kennzeichnung) kann den Zeitplan verzögern.",
      partner: "Geeignete lokale Partner sind begrenzt verfügbar.",
      investment: "Kapitalbedarf für nachhaltige Marktdurchdringung ist hoch."
    },
    nextStepText: {
      nextValidatePilot: "Marktvalidierung via Pilotkunde",
      nextLegalReview: "Rechtsform, & Compliance Prüfung",
      nextPartnerShortlist: "Partnerauswahl (2 bis 3 Kandidaten)",
      nextMarketEntry: "Markteintritt im Zielquartal"
    },
    partnersText: {
      realEstate: "Europäische Immobilienfonds, Projektentwickler, nationale Handelskammern.",
      sovereignInvestment: "Europäische Banken, Private Equity Häuser, nationale Förderbanken.",
      halalFood: "Halal zertifizierte Einzelhändler, muslimische Communitys, Lebensmittelverbände.",
      islamicFinance: "Sharia konforme Finanzinstitute und Aufsichtsberater im Zielland (z. B. KT Bank AG in Frankfurt).",
      logistics: "Große Flug und Seehäfen, Logistikzentren, Speditionen, Zollagenturen.",
      renewableEnergy: "Stadtwerke, Energieversorger, Forschungsinstitute.",
      luxuryRetail: "Premium Einkaufsstraßen der europäischen Metropolen, Luxus Handelsverbände."
    },
    reqField: "Pflichtfeld",
    invalidLogin: "Name oder Passwort falsch.",
    emailInUse: "Diese Mail ist bereits registriert.",
    nameInUse: "Dieser Name ist bereits registriert.",
    saveFailed: "Konto konnte nicht gespeichert werden (Verbindungsproblem). Bitte erneut versuchen.",
    authUnexpectedError: "Anmeldung in dieser Vorschau nicht möglich (fehlender sicherer Browser Kontext, z. B. in einer eingebetteten Vorschau). Bitte auf der echten Live Seite testen.",
    entryPlanTitle: "Planüberblick zum Markteintritt",
    sourcesTitle: "Datenquellen",
    phaseValidation: "Marktvalidierung",
    phaseLegal: "Rechtsform & Regulatorik",
    phasePartner: "Partnerauswahl",
    phaseLaunch: "Markteintritt",
    month: "Monat",
    months: "Monate",
    inputMethodLabel: "Eingabemethode",
    manualTab: "Manuelle Eingabe",
    pdfTab: "PDF-Scan",
    tryTest: "Mit Testdaten ausprobieren",
    tryTestHint: "Fiktives Beispielunternehmen, füllt alle Felder automatisch",
    csvTab: "CSV-Import",
    pdfUploadCta: "PDF hochladen",
    pdfUploadHint: "Firmenprofil, Pitch Deck oder Datenblatt als PDF. Felder werden automatisch befüllt.",
    scanningText: "Dokument wird gescannt …",
    extractedBadge: "Automatisch erkannt, bitte prüfen",
    csvImportLabel: "CSV Datei einfügen oder hochladen",
    csvPlaceholder: "companyName,industry,product,revenue,budget\nAl Waha Investment Holding (fiktiv),realEstate,Wohnimmobilienportfolio (fiktiv),25,2",
    csvParseBtn: "CSV übernehmen",
    csvFileLbl: "CSV-Datei",
    csvParseError: "CSV konnte nicht gelesen werden. Bitte Format prüfen.",
    csvTemplateHint: "Erste Zeile: Spaltennamen. Zweite Zeile: deine Werte.",
    overviewTitle: "Übersicht",
    overviewBtn: "Übersicht",
    exportAllBtn: "Alle als CSV exportieren",
    totalAnalysesLabel: "Analysen gesamt",
    avgScoreLabel: "Ø Score (Zielmarkt)",
    topMarketLabel: "Häufigster Zielmarkt",
    colCompany: "Unternehmen",
    colIndustry: "Branche",
    colMarket: "Zielmarkt",
    colScore: "Score",
    colDate: "Datum",
    demoSimNotice: "Text wurde lokal im Browser aus dem PDF gelesen (echte Extraktion, keine Simulation). Bitte Felder vor dem Speichern prüfen.",
    extractNoFields: "Es konnten keine Felder erkannt werden. Bitte Angaben unten manuell eintragen.",
    extractPartial: "Nicht alle Felder konnten erkannt werden. Bitte unten ergänzen.",
    extractFailed: "PDF konnte nicht gelesen werden (evtl. gescanntes Bild ohne Textebene). Bitte Angaben manuell eintragen.",
    detailedRoadmapTitle: "Detaillierter Schritt für Schritt Plan",
    financialModelTitle: "Finanzmodell",
    costBreakdownTitle: "Kostenverteilung nach Kategorie",
    projectionTitle: "Prognose über 3 Jahre: Kosten vs. Umsatz",
    breakEvenLabel: "Break-even",
    breakEvenNote: "Geschätzter Gewinnschwelle",
    noBreakEven: "Keine Gewinnschwelle innerhalb von 3 Jahren",
    countryFundamentalsTitle: "Standortkennzahlen (echte Daten)",
    growthTrendTitle: "BIP Wachstum im Zeitverlauf",
    marketOpportunityTitle: "Markt-Chance",
    marketOpportunitySubtitle: "Zielgruppe, Nachfragetreiber und aktueller Trend je Land",
    targetAudienceLabel: "Zielgruppe",
    demandDriversLabel: "Nachfragetreiber",
    trendLabel: "Trend",
    competitorAnalysisTitle: "Wettbewerber-Analyse",
    competitorAnalysisSubtitle: "Reale Marktführer je Land und wo sich Lücken für neue Anbieter zeigen",
    keyPlayersLabel: "Wichtigste Marktteilnehmer",
    marketGapLabel: "Market Gap",
    regulatoryCheckTitle: "Regulatorik-Check",
    regulatoryCheckSubtitle: "Körperschaftsteuer, Umsatzsteuer und Lizenzpflicht je Land",
    corporateTaxLabel: "Körperschaftsteuer",
    vatLabel: "Umsatzsteuer",
    licensingLabel: "Lizenzpflicht",
    growthTrendSubtitle: "Historisch (2019, 2020,Einbruch), aktuell (2024) und Prognose",
    historicalLabel: "Historisch",
    forecastLabel: "Prognose",
    germanyFocusTitle: "Deutschland & DACH",
    dachSubtitle: "Hinweise für Unternehmen aus Deutschland, Österreich und der Schweiz",
    dachBody: "Für DACH Unternehmen: Deutschland ist mit rund 84 Mio. Einwohnern der größte Binnenmarkt der EU und der natürliche Heimatmarkt für Gründung, Zulassung und Kapitalaufnahme. Österreich und die Schweiz ergänzen ihn mit hoher Kaufkraft und kurzen Wegen. Kapital aus der Golfregion nach Prinzipien der Scharia (kein Riba, keine unzulässigen Branchen) findet in Frankfurt Partner wie die KT Bank AG sowie BaFin regulierte Anlageprodukte (z. B. Murabaha Strukturen).",
    germanyFocusWinner: "Deutschland ist für dieses Profil auch der empfohlene Zielmarkt.",
    germanyFocusNotWinner: "Empfohlener Zielmarkt für dieses Profil: {country}. Zum Vergleich: Deutschland.",
    germanyFocusRank: "Rang {rank} von {total} im aktuellen Vergleich",
    giiTitle: "GII, Islamic Finance Bereitschaft",
    giiSubtitle: "Sharia konforme Finanzierungsoptionen für den europäischen Markt",
    giiBody: "Kapital aus der Golfregion, das nach Prinzipien der Scharia verwaltet wird (kein Riba/Zins, kein Investment in unzulässige Branchen), findet in Deutschland einen etablierten Partner: die KT Bank AG in Frankfurt, Deutschlands erste vollständig Sharia konforme Bank, 2015 als Tochter der Kuveyt Türk / Kuwait Finance House Gruppe gegründet. Für Finanzierungen ohne Zinsstruktur (z. B. Murabaha) und BaFin regulierte Anlageprodukte ist Frankfurt als Standort besonders geeignet.",
    weekLabel: "Woche",
    weeksLabel: "Wochen",
    yearLabel: "Jahr",
    costLabel: "Kosten",
    revenueLabel: "Umsatz",
    gdpLabel: "BIP (Mrd. USD)",
    populationLabel: "Bevölkerung (Mio.)",
    gdpPerCapitaLabel: "BIP pro Kopf (USD)",
    gdpGrowthLabel: "BIP-Wachstum",
    financialDisclaimer: "Vereinfachtes, illustratives Modell auf Basis von Umsatz, Budget und Match Score, kein Ersatz für einen vollständigen Businessplan.",
    radarTitle: "Faktor Vergleich, alle Länder",
    radarSubtitle: "Alle fünf Bewertungsfaktoren auf einen Blick",
    positioningTitle: "Strategische Positionierung",
    positioningSubtitle: "Marktattraktivität vs. Wettbewerb, Blasengröße = Investitionspotenzial",
    positioningXLabel: "Wettbewerb",
    positioningYLabel: "Marktattraktivität",
    sensitivityTitle: "Budget-Sensitivität",
    sensitivitySubtitle: "Wie verändert sich der Score im Zielmarkt bei anderem Budget?",
    sensitivityXLabel: "Budget (Mio. €)",
    sensitivityYLabel: "Score",
    currentBudgetLabel: "Aktuelles Budget",
    costEurLabel: "€M",
    collapseSteps: "Einklappen",
    expandSteps: "Alle Schritte anzeigen",
    steps_: {
      stepDeskResearch: "Desk Research & Markt Scoring",
      stepPilotCustomer: "Pilotkunde / Absichtserklärung (LOI)",
      stepJurisdiction: "Rechtsformwahl: GmbH vs. Zweigniederlassung",
      stepCompanyReg: "Gesellschaftsgründung & Handelsregistereintragung im Zielland",
      stepBankAccount: "Eröffnung Geschäftskonto",
      stepRegulatoryApproval: "Regulatorische Zulassung (z. B. Finanzaufsicht, CE Kennzeichnung)",
      stepInvestorVisa: "Aufenthaltstitel / Blaue Karte EU",
      stepKeyHires: "Schlüsselpositionen besetzen",
      stepPartnerShortlist: "Partner Shortlist erstellen",
      stepDistributionAgreement: "Vertriebsvertrag unterzeichnen",
      stepSoftLaunch: "Soft Launch",
      stepMarketingLaunch: "Marketing-Launch",
      stepFirstSalesReview: "Review erster Verkäufe"
    },
    catStrategy: "Strategie",
    catLegal: "Recht",
    catFinance: "Finanzen",
    catRegulatory: "Regulatorik",
    catPersonnel: "Personal",
    catCommercial: "Vertrieb & Marketing"
  },
  en: {
    appName: "Europe Market Entry",
    corridorLabel: "Gulf to Europe",
    tagline: "From company profile to European market entry plan",
    heroSubtext: "Rule based market analysis, strategic planning and traceable recommendations for your market entry.",
    rememberMe: "Stay signed in",
    forgotPassword: "Forgot password?",
    forgotPasswordNote: "Not functional in this demo build (no real backend).",
    demoNotice: "Demo build. Accounts are stored for this session only (no real backend). The production version uses Supabase auth with real per user data separation.",
    login: "Log in",
    register: "Create account",
    loginHint: "Sign in with your name and password.",
    registerHint: "Just a name and password, no email needed.",
    logout: "Log out",
    email: "Email",
    password: "Password",
    name: "Name",
    noAccount: "No account yet?",
    haveAccount: "Already have an account?",
    switchToRegister: "Register now",
    switchToLogin: "Log in now",
    dashboard: "Dashboard",
    newAnalysis: "New Analysis",
    noAnalyses: "No analyses yet. Start your first market entry assessment.",
    yourAnalyses: "Your Analyses",
    companyName: "Company Name",
    industry: "Industry",
    product: "Product / Service",
    revenue: "Annual Revenue (€M)",
    budget: "Expansion Budget (€M)",
    employees: "Number of Employees",
    certifications: "Certifications (comma separated)",
    customerSegments: "Customer Segments (comma separated)",
    salesChannels: "Sales Channels (comma separated)",
    productsText: "Additional Products (comma separated)",
    analyze: "Calculate Score",
    back: "Back",
    resultTitle: "Market Entry Score",
    comparisonTitle: "Country Comparison",
    marketAttractiveness: "Market Attractiveness",
    competition: "Competition",
    regulatoryComplexity: "Regulatory Ease",
    partnerAvailability: "Partner Availability",
    investmentPotential: "Investment Potential",
    overall: "Overall",
    recommendation: "Recommendation",
    executiveScoreTitle: "Market Entry Score",
    executiveScoreLabel: "Overall Rating",
    scoreDims: {
      market: "Market Attractiveness",
      competition: "Competition",
      regulatory: "Regulatory",
      partner: "Partners",
      investment: "Investment Climate"
    },
    targetMarket: "Target Market",
    entryStrategy: "Entry Strategy",
    prioritySector: "Priority Sector",
    timeline: "Estimated Timeline",
    timelineShort: "6 to 9 months",
    timelineMedium: "9 to 14 months",
    timelineLong: "14+ months",
    mainRisks: "Main Risks",
    potentialPartners: "Potential Partners",
    nextSteps: "Next Steps",
    exportCsv: "Export as CSV",
    exportPdf: "Export as PDF",
    exportPdfAnalysis: "PDF: Market & Company Analysis",
    exportPdfStrategy: "PDF: Market Entry Strategy",
    exportPdfSummary: "Complete entry plan as PDF", reportSummaryTitle: "Plan Summary", sumScore: "Overall score", sumBudget: "Budget", sumPeriod: "Timeframe", sumBreakEven: "Break-even", sumPhase: "Phase", infoRank: "Rank", infoStrongest: "Strongest factor", infoWeakest: "Weakest factor", infoTrigger: "Trigger", infoAvg: "Avg. of all markets", infoVsTarget: "vs. target market", infoClick: "Click for details", chartHint: "Tip: tap points, segments and bars for details.", chShare: "Share of budget", chSteps: "Steps in this category", chNet: "Net (cumulative)", chCost: "Cumulative cost", chRev: "Cumulative revenue", chBE: "Break even reached", chNoBE: "Break even not yet reached", chScoreAt: "Score at this budget", chVsNow: "vs. current budget", chClose: "Close", infoTotal: "of",
    exportPdfPlan: "PDF: Optimal Entry Plan", reportPlanTitle: "Optimal Entry Plan", planSectionTarget: "Target market and entry", planSectionPhases: "Phases and milestones", planSectionGantt: "Timeline by week", planSectionBudget: "Budget by category", planSectionBreakEven: "Break-even", planMilestone: "Milestone", planTotal: "Total", planAllPhases: "All phases", planClickHint: "Click a phase to filter its steps", planStepHint: "Click a step for details", planDuration: "Duration", planWeeks: "weeks", planShare: "Share of budget", planSteps: "steps", planBudgetLabel: "Budget (€M)", planNoBreakEven: "No break even within 3 years",
    reportAnalysisTitle: "Market & Company Analysis",
    reportStrategyTitle: "Market Entry Strategy",
    reportGeneratedOn: "Generated on",
    reportFor: "Prepared for",
    reportSectionMarketOverview: "Market Overview",
    reportSectionGrowthForecast: "Growth: History & Forecast",
    reportSectionCompetitors: "Competitive Landscape",
    reportSectionOpportunity: "Market Opportunity",
    reportSectionRegulatory: "Regulatory Framework",
    reportSectionCompanyProfile: "Company Profile",
    reportSectionScoreSummary: "Score Summary",
    reportSectionSources: "Sources",
    reportSectionGoals: "Goals & Priority",
    reportSectionEntryStrategy: "Recommended Entry Strategy",
    reportSectionTargetAudience: "Target Audience",
    reportSectionRisks: "Risks",
    reportSectionNextSteps: "Next Steps",
    reportSectionRoadmap: "Roadmap",
    reportSectionFinancials: "Financial Forecast",
    reportForecastLabel: "Forecast",
    reportHistoricalLabel: "Historical",
    reportNoData: "Not provided",
    reportPopulationLabel: "Population",
    reportDisclaimer: "This analysis is based on the sourced market data stored in the tool and the company details entered by the user. It does not replace individual legal, tax, or business advice.",
    culturalIntelTitle: "Business Culture & Negotiation Style",
    culturalIntelNote: "General orientation, not a substitute for local advice in individual cases.",
    saveNotice: "Analysis saved to dashboard.",
    industries: {
      realEstate: "Real Estate",
      sovereignInvestment: "Sovereign Wealth Investment",
      halalFood: "Halal Food",
      islamicFinance: "Islamic Finance",
      logistics: "Logistics",
      renewableEnergy: "Renewable Energy",
      luxuryRetail: "Luxury Retail"
    },
    strategy: {
      distributorPartner: "Local distribution partner + strategic alliance",
      freeZoneDirect: "Direct market entry via own subsidiary in the target country",
      jointVenture: "Joint venture with a local partner company"
    },
    riskText: {
      market: "Market demand is not yet validated, a pilot project is recommended.",
      competition: "High competitive density from established local providers in this segment.",
      regulatory: "EU and national regulatory requirements (e.g. financial supervision, CE marking) may delay the timeline.",
      partner: "Suitable local partners are in limited supply.",
      investment: "Capital requirement for sustained market penetration is high."
    },
    nextStepText: {
      nextValidatePilot: "Market validation via pilot customer",
      nextLegalReview: "Legal structure & compliance review",
      nextPartnerShortlist: "Partner shortlisting (2 to 3 candidates)",
      nextMarketEntry: "Market entry in target quarter"
    },
    partnersText: {
      realEstate: "European real estate funds, project developers, national chambers of commerce.",
      sovereignInvestment: "European banks, private equity firms, national development banks.",
      halalFood: "Halal certified retailers, Muslim community networks, food associations.",
      islamicFinance: "Sharia compliant financial institutions and supervisory advisors in the target country (e.g. KT Bank AG in Frankfurt).",
      logistics: "Frankfurt Airport logistics centers, freight forwarders, customs agencies.",
      renewableEnergy: "Municipal utilities (Stadtwerke), energy providers, Fraunhofer institutes.",
      luxuryRetail: "Premium shopping districts (Maximilianstraße, Kurfürstendamm), luxury retail associations."
    },
    reqField: "Required",
    invalidLogin: "Incorrect name or password.",
    emailInUse: "This email is already registered.",
    nameInUse: "This name is already registered.",
    saveFailed: "Could not save account (connection issue). Please try again.",
    authUnexpectedError: "Login is not possible in this preview (missing secure browser context, e.g. inside an embedded preview). Please test on the real live site.",
    entryPlanTitle: "Market Entry Plan Overview",
    sourcesTitle: "Data Sources",
    phaseValidation: "Market Validation",
    phaseLegal: "Legal & Regulatory Setup",
    phasePartner: "Partner Selection",
    phaseLaunch: "Market Launch",
    month: "month",
    months: "months",
    inputMethodLabel: "Input Method",
    manualTab: "Manual Entry",
    pdfTab: "PDF Scan",
    tryTest: "Try with test data",
    tryTestHint: "Fictional sample company, fills every field automatically",
    csvTab: "CSV Import",
    pdfUploadCta: "Upload PDF",
    pdfUploadHint: "Company profile, pitch deck, or data sheet as PDF. Fields are filled in automatically.",
    scanningText: "Scanning document …",
    extractedBadge: "Auto detected, please review",
    csvImportLabel: "Paste or upload CSV file",
    csvPlaceholder: "companyName,industry,product,revenue,budget\nAl Waha Investment Holding (fictional),realEstate,Residential property portfolio (fictional),25,2",
    csvParseBtn: "Import CSV",
    csvFileLbl: "CSV file",
    csvParseError: "Could not read CSV. Please check the format.",
    csvTemplateHint: "First row: column names. Second row: your values.",
    overviewTitle: "Overview",
    overviewBtn: "Overview",
    exportAllBtn: "Export all as CSV",
    totalAnalysesLabel: "Total analyses",
    avgScoreLabel: "Avg. score (target market)",
    topMarketLabel: "Most frequent target market",
    colCompany: "Company",
    colIndustry: "Industry",
    colMarket: "Target Market",
    colScore: "Score",
    colDate: "Date",
    demoSimNotice: "Text was read locally in your browser from the PDF (real extraction, not a simulation). Please review the fields before saving.",
    extractNoFields: "No fields could be recognized. Please fill in the details below manually.",
    extractPartial: "Not all fields could be recognized. Please complete the rest below.",
    extractFailed: "The PDF could not be read (it may be a scanned image without a text layer). Please fill in the details manually.",
    detailedRoadmapTitle: "Detailed Step by Step Plan",
    financialModelTitle: "Financial Model",
    costBreakdownTitle: "Cost Breakdown by Category",
    projectionTitle: "Three Year Projection: Cost vs. Revenue",
    breakEvenLabel: "Break-even",
    breakEvenNote: "Estimated break even",
    noBreakEven: "No break even within 3 years",
    countryFundamentalsTitle: "Hub Fundamentals (Real Data)",
    growthTrendTitle: "GDP Growth Over Time",
    marketOpportunityTitle: "Market Opportunity",
    marketOpportunitySubtitle: "Target audience, demand drivers and current trend per country",
    targetAudienceLabel: "Target Audience",
    demandDriversLabel: "Demand Drivers",
    trendLabel: "Trend",
    competitorAnalysisTitle: "Competitor Analysis",
    competitorAnalysisSubtitle: "Real market leaders per country and where gaps exist for new entrants",
    keyPlayersLabel: "Key Players",
    marketGapLabel: "Market Gap",
    regulatoryCheckTitle: "Regulatory Check",
    regulatoryCheckSubtitle: "Corporate tax, VAT and licensing requirements per country",
    corporateTaxLabel: "Corporate Tax",
    vatLabel: "VAT",
    licensingLabel: "Licensing",
    growthTrendSubtitle: "Historical (2019, 2020 COVID shock), current (2024), and forecast",
    historicalLabel: "Historical",
    forecastLabel: "Forecast",
    germanyFocusTitle: "Germany & DACH",
    dachSubtitle: "Notes for companies from Germany, Austria and Switzerland",
    dachBody: "For DACH companies: with roughly 84 million people Germany is the EU's largest single market and the natural home base for incorporation, licensing and raising capital. Austria and Switzerland add high purchasing power and short distances. Gulf capital managed under Sharia principles (no riba, no prohibited sectors) finds partners in Frankfurt such as KT Bank AG as well as BaFin regulated investment products (e.g. Murabaha structures).",
    germanyFocusWinner: "Germany is also the recommended target market for this profile.",
    germanyFocusNotWinner: "Recommended target market for this profile: {country}. For comparison: Germany.",
    germanyFocusRank: "Rank {rank} of {total} in the current comparison",
    giiTitle: "GII, Islamic Finance Readiness",
    giiSubtitle: "Sharia compliant financing options for the European market",
    giiBody: "Gulf capital managed under Sharia principles (no riba/interest, no investment in prohibited sectors) has an established partner in Germany: KT Bank AG in Frankfurt, Germany's first fully Sharia compliant bank, founded 2015 as a subsidiary of the Kuveyt Türk / Kuwait Finance House group. For interest free financing structures (e.g. Murabaha) and BaFin regulated investment products, Frankfurt is a particularly well suited location.",
    weekLabel: "week",
    weeksLabel: "weeks",
    yearLabel: "Year",
    costLabel: "Cost",
    revenueLabel: "Revenue",
    gdpLabel: "GDP ($B)",
    populationLabel: "Population (M)",
    gdpPerCapitaLabel: "GDP per Capita ($)",
    gdpGrowthLabel: "GDP Growth",
    financialDisclaimer: "Simplified, illustrative model based on revenue, budget, and match score, not a substitute for a full business plan.",
    radarTitle: "Factor Comparison, All Countries",
    radarSubtitle: "All five scoring factors at a glance",
    positioningTitle: "Strategic Positioning",
    positioningSubtitle: "Market attractiveness vs. competition, bubble size = investment potential",
    positioningXLabel: "Competition",
    positioningYLabel: "Market Attractiveness",
    sensitivityTitle: "Budget Sensitivity",
    sensitivitySubtitle: "How does the target market's score change with a different budget?",
    sensitivityXLabel: "Budget (€M)",
    sensitivityYLabel: "Score",
    currentBudgetLabel: "Current budget",
    costEurLabel: "€M",
    collapseSteps: "Collapse",
    expandSteps: "Show all steps",
    steps_: {
      stepDeskResearch: "Desk research & market scoring",
      stepPilotCustomer: "Pilot customer / letter of intent (LOI)",
      stepJurisdiction: "Legal form decision: GmbH vs. branch office",
      stepCompanyReg: "Company formation & commercial register entry in the target country",
      stepBankAccount: "Corporate bank account opening",
      stepRegulatoryApproval: "Regulatory approval (e.g. financial supervision, CE marking)",
      stepInvestorVisa: "Residence permit / EU Blue Card",
      stepKeyHires: "Key hire recruitment",
      stepPartnerShortlist: "Partner shortlisting",
      stepDistributionAgreement: "Distribution agreement signing",
      stepSoftLaunch: "Soft launch",
      stepMarketingLaunch: "Marketing launch",
      stepFirstSalesReview: "First sales review"
    },
    catStrategy: "Strategy",
    catLegal: "Legal",
    catFinance: "Finance",
    catRegulatory: "Regulatory",
    catPersonnel: "Personnel",
    catCommercial: "Commercial"
  },
  ar: {
    appName: "دخول السوق الأوروبي",
    corridorLabel: "الخليج إلى أوروبا",
    tagline: "من ملف الشركة إلى خطة دخول السوق الأوروبي",
    heroSubtext: "تحليل سوق قائم على قواعد واضحة، تخطيط استراتيجي وتوصيات قابلة للتتبع لدخولك السوقك.",
    rememberMe: "تذكرني",
    forgotPassword: "نسيت كلمة المرور؟",
    forgotPasswordNote: "غير مفعّل في هذه النسخة التجريبية (بدون خادم حقيقي).",
    demoNotice: "نسخة تجريبية. الحسابات محفوظة لهذه الجلسة فقط (بدون خادم حقيقي). النسخة الفعلية تستخدم Supabase مع فصل حقيقي لبيانات كل مستخدم.",
    login: "تسجيل الدخول",
    register: "إنشاء حساب",
    loginHint: "سجّل الدخول بالاسم وكلمة المرور.",
    registerHint: "فقط اسم وكلمة مرور، لا حاجة للبريد الإلكتروني.",
    logout: "تسجيل الخروج",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    name: "الاسم",
    noAccount: "ليس لديك حساب؟",
    haveAccount: "لديك حساب بالفعل؟",
    switchToRegister: "سجّل الآن",
    switchToLogin: "سجّل الدخول الآن",
    dashboard: "لوحة التحكم",
    newAnalysis: "تحليل جديد",
    noAnalyses: "لا توجد تحليلات بعد. ابدأ أول تقييم لدخول السوق.",
    yourAnalyses: "تحليلاتك",
    companyName: "اسم الشركة",
    industry: "القطاع",
    product: "المنتج / الخدمة",
    revenue: "الإيرادات السنوية (مليون يورو)",
    budget: "ميزانية التوسع (مليون يورو)",
    employees: "عدد الموظفين",
    certifications: "الشهادات (مفصولة بفواصل)",
    customerSegments: "شرائح العملاء (مفصولة بفواصل)",
    salesChannels: "قنوات البيع (مفصولة بفواصل)",
    productsText: "منتجات إضافية (مفصولة بفواصل)",
    analyze: "احسب النتيجة",
    back: "رجوع",
    resultTitle: "نتيجة دخول السوق",
    comparisonTitle: "مقارنة الدول",
    marketAttractiveness: "جاذبية السوق",
    competition: "المنافسة",
    regulatoryComplexity: "سهولة التنظيم",
    partnerAvailability: "توفر الشركاء",
    investmentPotential: "إمكانات الاستثمار",
    overall: "الإجمالي",
    recommendation: "التوصية",
    executiveScoreTitle: "درجة دخول السوق",
    executiveScoreLabel: "التقييم الإجمالي",
    scoreDims: {
      market: "جاذبية السوق",
      competition: "المنافسة",
      regulatory: "التنظيم",
      partner: "الشركاء",
      investment: "مناخ الاستثمار"
    },
    targetMarket: "السوق المستهدف",
    entryStrategy: "استراتيجية الدخول",
    prioritySector: "القطاع ذو الأولوية",
    timeline: "الإطار الزمني المقدر",
    timelineShort: "٦-٩ أشهر",
    timelineMedium: "٩-١٤ شهرًا",
    timelineLong: "أكثر من ١٤ شهرًا",
    mainRisks: "المخاطر الرئيسية",
    potentialPartners: "شركاء محتملون",
    nextSteps: "الخطوات التالية",
    exportCsv: "تصدير CSV",
    exportPdf: "تصدير PDF",
    exportPdfAnalysis: "PDF: تحليل السوق والشركة",
    exportPdfStrategy: "PDF: استراتيجية دخول السوق",
    exportPdfSummary: "خطة الدخول الكاملة بصيغة PDF", reportSummaryTitle: "ملخص الخطة", sumScore: "التقييم الإجمالي", sumBudget: "الميزانية", sumPeriod: "الإطار الزمني", sumBreakEven: "نقطة التعادل", sumPhase: "المرحلة", infoRank: "الترتيب", infoStrongest: "أقوى عامل", infoWeakest: "أضعف عامل", infoTrigger: "السبب", infoAvg: "متوسط كل الأسواق", infoVsTarget: "مقارنة بالسوق المستهدف", infoClick: "انقر للتفاصيل", chartHint: "تلميح: اضغط على النقاط والقطاعات والأعمدة لعرض التفاصيل.", chShare: "الحصة من الميزانية", chSteps: "الخطوات في هذه الفئة", chNet: "الصافي (تراكمي)", chCost: "التكلفة التراكمية", chRev: "الإيرادات التراكمية", chBE: "تم بلوغ نقطة التعادل", chNoBE: "لم تُبلغ نقطة التعادل بعد", chScoreAt: "التقييم عند هذه الميزانية", chVsNow: "مقارنة بالميزانية الحالية", chClose: "إغلاق", infoTotal: "من",
    exportPdfPlan: "PDF: خطة الدخول المثلى", reportPlanTitle: "خطة الدخول المثلى", planSectionTarget: "السوق المستهدف والدخول", planSectionPhases: "المراحل والمعالم", planSectionGantt: "الجدول الزمني بالأسابيع", planSectionBudget: "الميزانية حسب الفئة", planSectionBreakEven: "نقطة التعادل", planMilestone: "معلم", planTotal: "الإجمالي", planAllPhases: "كل المراحل", planClickHint: "انقر على مرحلة لتصفية خطواتها", planStepHint: "انقر على خطوة للتفاصيل", planDuration: "المدة", planWeeks: "أسابيع", planShare: "حصة الميزانية", planSteps: "خطوات", planBudgetLabel: "الميزانية (مليون يورو)", planNoBreakEven: "لا تعادل خلال 3 سنوات",
    reportAnalysisTitle: "تحليل السوق والشركة",
    reportStrategyTitle: "استراتيجية دخول السوق",
    reportGeneratedOn: "تاريخ الإنشاء",
    reportFor: "أُعد لصالح",
    reportSectionMarketOverview: "نظرة عامة على السوق",
    reportSectionGrowthForecast: "النمو: التاريخ والتوقعات",
    reportSectionCompetitors: "المشهد التنافسي",
    reportSectionOpportunity: "فرصة السوق",
    reportSectionRegulatory: "الإطار التنظيمي",
    reportSectionCompanyProfile: "ملف الشركة",
    reportSectionScoreSummary: "ملخص النتيجة",
    reportSectionSources: "المصادر",
    reportSectionGoals: "الأهداف والأولوية",
    reportSectionEntryStrategy: "استراتيجية الدخول الموصى بها",
    reportSectionTargetAudience: "الجمهور المستهدف",
    reportSectionRisks: "المخاطر",
    reportSectionNextSteps: "الخطوات التالية",
    reportSectionRoadmap: "خارطة الطريق",
    reportSectionFinancials: "التوقعات المالية",
    reportForecastLabel: "توقع",
    reportHistoricalLabel: "تاريخي",
    reportNoData: "غير متوفر",
    reportPopulationLabel: "عدد السكان",
    reportDisclaimer: "يستند هذا التحليل إلى بيانات السوق الموثقة المخزنة في الأداة وبيانات الشركة التي أدخلها المستخدم. لا يغني عن الاستشارة القانونية أو الضريبية أو التجارية الفردية.",
    culturalIntelTitle: "ثقافة الأعمال وأسلوب التفاوض",
    culturalIntelNote: "توجيه عام، وليس بديلاً عن استشارة محلية لكل حالة على حدة.",
    saveNotice: "تم حفظ التحليل في لوحة التحكم.",
    industries: {
      realEstate: "العقارات",
      sovereignInvestment: "استثمارات الصناديق السيادية",
      halalFood: "الأغذية الحلال",
      islamicFinance: "التمويل الإسلامي",
      logistics: "الخدمات اللوجستية",
      renewableEnergy: "الطاقة المتجددة",
      luxuryRetail: "تجارة التجزئة الفاخرة"
    },
    strategy: {
      distributorPartner: "شريك توزيع محلي + تحالف استراتيجي",
      freeZoneDirect: "دخول مباشر عبر شركة تابعة في الدولة المستهدفة",
      jointVenture: "مشروع مشترك مع شركة شريكة محلية"
    },
    riskText: {
      market: "لم يتم التحقق من طلب السوق بعد، يُنصح بمشروع تجريبي.",
      competition: "كثافة تنافسية عالية من مزودين ألمان راسخين في هذا القطاع.",
      regulatory: "قد تؤخر المتطلبات التنظيمية الأوروبية والوطنية (مثل الرقابة المالية، علامة CE) الجدول الزمني.",
      partner: "توفر شركاء ألمان مناسبين محدود.",
      investment: "متطلبات رأس المال لاختراق السوق المستدام مرتفعة."
    },
    nextStepText: {
      nextValidatePilot: "التحقق من السوق عبر عميل تجريبي",
      nextLegalReview: "مراجعة الهيكل القانوني والامتثال",
      nextPartnerShortlist: "اختيار شركاء (٢ إلى ٣ مرشحين)",
      nextMarketEntry: "دخول السوق في الربع المستهدف"
    },
    partnersText: {
      realEstate: "صناديق العقارات الأوروبية، مطورو المشاريع، الغرف التجارية الوطنية.",
      sovereignInvestment: "البنوك الأوروبية، شركات الأسهم الخاصة، بنوك التنمية الوطنية.",
      halalFood: "تجار التجزئة المعتمدون حلال، الجاليات المسلمة، جمعيات الأغذية.",
      islamicFinance: "مؤسسات مالية متوافقة مع الشريعة ومستشارون رقابيون في الدولة المستهدفة (مثل بنك KT في فرانكفورت).",
      logistics: "مراكز الخدمات اللوجستية بمطار فرانكفورت، شركات الشحن، وكالات الجمارك.",
      renewableEnergy: "شركات المرافق البلدية (Stadtwerke)، مزودو الطاقة، معاهد فراونهوفر.",
      luxuryRetail: "شوارع التسوق الفاخرة (ماكسيميليان شتراسه، كورفورستندام)، جمعيات التجزئة الفاخرة."
    },
    reqField: "حقل مطلوب",
    invalidLogin: "الاسم أو كلمة المرور غير صحيحة.",
    emailInUse: "هذا البريد الإلكتروني مسجل بالفعل.",
    nameInUse: "هذا الاسم مسجل بالفعل.",
    saveFailed: "تعذر حفظ الحساب (مشكلة في الاتصال). يرجى المحاولة مرة أخرى.",
    authUnexpectedError: "تسجيل الدخول غير ممكن في هذه المعاينة (سياق متصفح آمن مفقود، مثلاً داخل معاينة مضمّنة). يرجى الاختبار على الموقع المباشر الفعلي.",
    entryPlanTitle: "خطة دخول السوق",
    sourcesTitle: "مصادر البيانات",
    phaseValidation: "التحقق من السوق",
    phaseLegal: "الهيكل القانوني والتنظيمي",
    phasePartner: "اختيار الشركاء",
    phaseLaunch: "دخول السوق",
    month: "شهر",
    months: "أشهر",
    inputMethodLabel: "طريقة الإدخال",
    manualTab: "إدخال يدوي",
    pdfTab: "مسح PDF",
    tryTest: "جرّب ببيانات تجريبية",
    tryTestHint: "شركة وهمية للتجربة، تملأ كل الحقول تلقائيًا",
    csvTab: "استيراد CSV",
    pdfUploadCta: "رفع PDF",
    pdfUploadHint: "ملف تعريفي، عرض تقديمي، أو ورقة بيانات كملف PDF. سيتم تعبئة الحقول تلقائيًا.",
    scanningText: "جارٍ مسح المستند …",
    extractedBadge: "تم الاكتشاف تلقائيًا، يرجى المراجعة",
    csvImportLabel: "الصق أو ارفع ملف CSV",
    csvPlaceholder: "companyName,industry,product,revenue,budget\nAl Waha Investment Holding (fictional),realEstate,محفظة عقارات سكنية (وهمية),25,2",
    csvParseBtn: "استيراد CSV",
    csvFileLbl: "ملف CSV",
    csvParseError: "تعذّرت قراءة CSV. يرجى التحقق من التنسيق.",
    csvTemplateHint: "السطر الأول: أسماء الأعمدة. السطر الثاني: قيمك.",
    overviewTitle: "نظرة عامة",
    overviewBtn: "نظرة عامة",
    exportAllBtn: "تصدير الكل كـ CSV",
    totalAnalysesLabel: "إجمالي التحليلات",
    avgScoreLabel: "متوسط النتيجة (السوق المستهدف)",
    topMarketLabel: "السوق المستهدف الأكثر تكرارًا",
    colCompany: "الشركة",
    colIndustry: "القطاع",
    colMarket: "السوق المستهدف",
    colScore: "النتيجة",
    colDate: "التاريخ",
    demoSimNotice: "تمت قراءة النص محليًا داخل المتصفح من ملف PDF (استخراج حقيقي وليس محاكاة). يرجى مراجعة الحقول قبل الحفظ.",
    extractNoFields: "تعذر التعرف على أي حقول. يرجى تعبئة البيانات أدناه يدويًا.",
    extractPartial: "تعذر التعرف على جميع الحقول. يرجى إكمال الباقي أدناه.",
    extractFailed: "تعذرت قراءة ملف PDF (قد يكون صورة ممسوحة ضوئيًا بدون طبقة نصية). يرجى تعبئة البيانات يدويًا.",
    detailedRoadmapTitle: "خطة تفصيلية خطوة بخطوة",
    financialModelTitle: "النموذج المالي",
    costBreakdownTitle: "توزيع التكاليف حسب الفئة",
    projectionTitle: "توقعات 3 سنوات: التكلفة مقابل الإيرادات",
    breakEvenLabel: "نقطة التعادل",
    breakEvenNote: "نقطة التعادل المقدرة",
    noBreakEven: "لا توجد نقطة تعادل خلال 3 سنوات",
    countryFundamentalsTitle: "مؤشرات المدن (بيانات حقيقية)",
    growthTrendTitle: "نمو الناتج المحلي عبر الزمن",
    marketOpportunityTitle: "فرصة السوق",
    marketOpportunitySubtitle: "الفئة المستهدفة ومحركات الطلب والاتجاه الحالي لكل دولة",
    targetAudienceLabel: "الفئة المستهدفة",
    demandDriversLabel: "محركات الطلب",
    trendLabel: "الاتجاه",
    competitorAnalysisTitle: "تحليل المنافسين",
    competitorAnalysisSubtitle: "قادة السوق الحقيقيون لكل دولة وأين تظهر الفجوات للداخلين الجدد",
    keyPlayersLabel: "أهم اللاعبين",
    marketGapLabel: "فجوة السوق",
    regulatoryCheckTitle: "الفحص التنظيمي",
    regulatoryCheckSubtitle: "ضريبة الشركات وضريبة القيمة المضافة ومتطلبات الترخيص لكل دولة",
    corporateTaxLabel: "ضريبة الشركات",
    vatLabel: "ضريبة القيمة المضافة",
    licensingLabel: "الترخيص",
    growthTrendSubtitle: "تاريخي (٢٠١٩، صدمة كوفيد ٢٠٢٠)، حالي (٢٠٢٤)، وتوقعات",
    historicalLabel: "تاريخي",
    forecastLabel: "توقعات",
    germanyFocusTitle: "ألمانيا ودول DACH",
    dachSubtitle: "ملاحظات للشركات من ألمانيا والنمسا وسويسرا",
    dachBody: "للشركات في منطقة DACH: ألمانيا بنحو ٨٤ مليون نسمة هي أكبر سوق موحّد في الاتحاد الأوروبي والقاعدة الطبيعية للتأسيس والترخيص وجمع رأس المال، وتكمّلها النمسا وسويسرا بقوة شرائية عالية ومسافات قصيرة. أما رأس المال الخليجي المدار وفق مبادئ الشريعة (بدون ربا ودون قطاعات محظورة) فيجد في فرانكفورت شركاء مثل بنك KT ومنتجات استثمارية خاضعة لرقابة BaFin (مثل هياكل المرابحة).",
    germanyFocusWinner: "ألمانيا هي أيضًا السوق المستهدف الموصى به لهذا الملف.",
    germanyFocusNotWinner: "السوق المستهدف الموصى به لهذا الملف: {country}. للمقارنة: ألمانيا.",
    germanyFocusRank: "المرتبة {rank} من {total} في المقارنة الحالية",
    giiTitle: "GII, جاهزية التمويل الإسلامي",
    giiSubtitle: "خيارات تمويل متوافقة مع الشريعة للسوق الأوروبي",
    giiBody: "رأس المال الخليجي المدار وفق مبادئ الشريعة (بدون ربا، وبدون استثمار في قطاعات محظورة) يجد شريكًا راسخًا في ألمانيا: بنك KT في فرانكفورت، أول بنك ألماني متوافق بالكامل مع الشريعة، تأسس عام ٢٠١٥ كشركة تابعة لمجموعة كويت تورك / بيت التمويل الكويتي. بالنسبة للتمويل الخالي من الفائدة (مثل المرابحة) والمنتجات الاستثمارية الخاضعة لرقابة BaFin، تُعد فرانكفورت موقعًا مناسبًا بشكل خاص.",
    weekLabel: "أسبوع",
    weeksLabel: "أسابيع",
    yearLabel: "سنة",
    costLabel: "التكلفة",
    revenueLabel: "الإيرادات",
    gdpLabel: "الناتج المحلي (مليار دولار)",
    populationLabel: "عدد السكان (مليون)",
    gdpPerCapitaLabel: "نصيب الفرد من الناتج المحلي (دولار)",
    gdpGrowthLabel: "نمو الناتج المحلي",
    financialDisclaimer: "نموذج مبسّط وتوضيحي يعتمد على الإيرادات والميزانية ودرجة التوافق، وليس بديلاً عن خطة عمل كاملة.",
    radarTitle: "مقارنة العوامل، جميع الدول",
    radarSubtitle: "جميع عوامل التقييم الخمسة في لمحة واحدة",
    positioningTitle: "الموقع الاستراتيجي",
    positioningSubtitle: "جاذبية السوق مقابل المنافسة، حجم الفقاعة = إمكانات الاستثمار",
    positioningXLabel: "المنافسة",
    positioningYLabel: "جاذبية السوق",
    sensitivityTitle: "حساسية الميزانية",
    sensitivitySubtitle: "كيف تتغير نتيجة السوق المستهدف مع ميزانية مختلفة؟",
    sensitivityXLabel: "الميزانية (مليون يورو)",
    sensitivityYLabel: "النتيجة",
    currentBudgetLabel: "الميزانية الحالية",
    costEurLabel: "مليون يورو",
    collapseSteps: "طي",
    expandSteps: "عرض كل الخطوات",
    steps_: {
      stepDeskResearch: "بحث مكتبي وتقييم السوق",
      stepPilotCustomer: "عميل تجريبي / خطاب نوايا",
      stepJurisdiction: "قرار الشكل القانوني: GmbH أم فرع تابع",
      stepCompanyReg: "التأسيس والتسجيل في السجل التجاري في الدولة المستهدفة",
      stepBankAccount: "فتح حساب مصرفي تجاري",
      stepRegulatoryApproval: "الموافقة التنظيمية (مثل الرقابة المالية، علامة CE)",
      stepInvestorVisa: "تصريح الإقامة / البطاقة الزرقاء الأوروبية",
      stepKeyHires: "توظيف المناصب الرئيسية",
      stepPartnerShortlist: "إعداد قائمة مختصرة بالشركاء",
      stepDistributionAgreement: "توقيع اتفاقية التوزيع",
      stepSoftLaunch: "إطلاق تجريبي",
      stepMarketingLaunch: "إطلاق تسويقي",
      stepFirstSalesReview: "مراجعة أولى للمبيعات"
    },
    catStrategy: "الاستراتيجية",
    catLegal: "القانون",
    catFinance: "المالية",
    catRegulatory: "التنظيم",
    catPersonnel: "الموظفون",
    catCommercial: "المبيعات والتسويق"
  }
};
/** Illustrative source references shown per target market in the result view. */
const SOURCES = {
  Germany: [{
    name: "GTAI, Germany Trade & Invest",
    url: "gtai.de"
  }, {
    name: "Destatis, Statistisches Bundesamt",
    url: "destatis.de"
  }, {
    name: "BaFin, Bundesanstalt für Finanzdienstleistungsaufsicht",
    url: "bafin.de"
  }],
  France: [{
    name: "Business France",
    url: "businessfrance.fr"
  }, {
    name: "INSEE, Institut national de la statistique",
    url: "insee.fr"
  }, {
    name: "Banque de France",
    url: "banque-france.fr"
  }],
  UK: [{
    name: "Department for Business and Trade (UK)",
    url: "gov.uk"
  }, {
    name: "Office for National Statistics",
    url: "ons.gov.uk"
  }, {
    name: "Financial Conduct Authority",
    url: "fca.org.uk"
  }],
  Italy: [{
    name: "ITA, Italian Trade Agency",
    url: "ice.it"
  }, {
    name: "ISTAT, Istituto Nazionale di Statistica",
    url: "istat.it"
  }, {
    name: "Banca d'Italia",
    url: "bancaditalia.it"
  }],
  Spain: [{
    name: "ICEX, Spain Trade and Investment",
    url: "icex.es"
  }, {
    name: "INE, Instituto Nacional de Estadística",
    url: "ine.es"
  }, {
    name: "Banco de España",
    url: "bde.es"
  }],
  Netherlands: [{
    name: "Netherlands Foreign Investment Agency (NFIA)",
    url: "investinholland.com"
  }, {
    name: "CBS, Centraal Bureau voor de Statistiek",
    url: "cbs.nl"
  }, {
    name: "De Nederlandsche Bank",
    url: "dnb.nl"
  }]
};

/**
 * Demo-only PDF extraction simulation. No real OCR/LLM document parsing
 * happens here — the uploaded filename is hashed to pick one of these
 * fictional company profiles, purely so the "PDF Scan" input method has
 * something to demonstrate. Every entry is explicitly labeled fictional;
 * see README for the production-version plan (real document analysis via AI).
 */
/**
 * Real, client-side PDF text extraction via pdf.js (Mozilla's PDF renderer,
 * runs entirely in the browser, no server call). Reads the actual text layer
 * of the uploaded PDF and looks for the labeled fields used by this tool's
 * company-profile format. This only works on PDFs that have a real text layer
 * (i.e. not a photographed/scanned image without OCR, and not a PDF whose
 * Arabic glyphs were embedded without a proper Unicode mapping) — for
 * anything else it returns as much as it could find and leaves the rest for
 * manual entry, rather than inventing data.
 */
async function extractTextFromPdf(file) {
  // Zero-dependency PDF text extraction (no CDN, no worker, no package).
  // Supports: Flate streams, object streams (compressed object tables),
  // literal AND hex strings, ToUnicode CMaps (what Word, Chrome/Skia, macOS,
  // iOS and LibreOffice use for embedded fonts), per-page font resources and
  // line breaks from text-positioning operators. It cannot read scanned
  // images (no text layer) or password-protected PDFs and says so clearly.
  const bytes = new Uint8Array(await file.arrayBuffer());
  const latin = b => {
    let s = "";
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return s;
  };
  // Pure-JS inflate (RFC1951/1950) used when DecompressionStream is missing
  // or rejects the data (older Safari/Firefox, some embedded/webview browsers).
  function pureInflate(src) {
    let p = 0;
    if (src.length > 2 && (src[0] & 0x0f) === 8 && ((src[0] << 8) | src[1]) % 31 === 0) p = 2;
    let bitBuf = 0, bitCnt = 0;
    const out = [];
    const bits = n => {
      while (bitCnt < n) {
        if (p >= src.length) throw new Error("inflate: unexpected end");
        bitBuf |= src[p++] << bitCnt; bitCnt += 8;
      }
      const v = bitBuf & ((1 << n) - 1); bitBuf >>>= n; bitCnt -= n; return v;
    };
    const build = lengths => {
      const count = new Array(16).fill(0), offs = new Array(16).fill(0), symbols = [];
      for (const l of lengths) count[l]++;
      count[0] = 0;
      for (let i = 1; i < 16; i++) offs[i] = offs[i - 1] + count[i - 1];
      lengths.forEach((l, s) => { if (l) symbols[offs[l]++] = s; });
      return { count, symbols };
    };
    const decode = h => {
      let code = 0, first = 0, index = 0;
      for (let len = 1; len < 16; len++) {
        code |= bits(1);
        const c = h.count[len];
        if (code - c < first) return h.symbols[index + (code - first)];
        index += c; first += c; first <<= 1; code <<= 1;
      }
      throw new Error("inflate: bad code");
    };
    const LB = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
    const LE = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
    const DB = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
    const DE = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
    let fixedL = null, fixedD = null;
    let last = 0;
    while (!last) {
      last = bits(1);
      const type = bits(2);
      if (type === 0) {
        bitBuf = 0; bitCnt = 0;
        const len = src[p] | (src[p + 1] << 8); p += 4;
        for (let i = 0; i < len; i++) out.push(src[p++]);
        continue;
      }
      let hl, hd;
      if (type === 1) {
        if (!fixedL) {
          const l = new Array(288).fill(8); for (let i = 144; i < 256; i++) l[i] = 9; for (let i = 256; i < 280; i++) l[i] = 7;
          fixedL = build(l); fixedD = build(new Array(30).fill(5));
        }
        hl = fixedL; hd = fixedD;
      } else if (type === 2) {
        const nlen = bits(5) + 257, ndist = bits(5) + 1, ncode = bits(4) + 4;
        const ord = [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];
        const cl = new Array(19).fill(0);
        for (let i = 0; i < ncode; i++) cl[ord[i]] = bits(3);
        const hc = build(cl);
        const lens = [];
        while (lens.length < nlen + ndist) {
          const sym = decode(hc);
          if (sym < 16) lens.push(sym);
          else if (sym === 16) { const prev = lens[lens.length - 1]; for (let r = 3 + bits(2); r > 0; r--) lens.push(prev); }
          else if (sym === 17) { for (let r = 3 + bits(3); r > 0; r--) lens.push(0); }
          else { for (let r = 11 + bits(7); r > 0; r--) lens.push(0); }
        }
        hl = build(lens.slice(0, nlen)); hd = build(lens.slice(nlen));
      } else throw new Error("inflate: bad block");
      for (;;) {
        const sym = decode(hl);
        if (sym < 256) out.push(sym);
        else if (sym === 256) break;
        else {
          const s = sym - 257;
          const len = LB[s] + bits(LE[s]);
          const d = decode(hd);
          const dist = DB[d] + bits(DE[d]);
          for (let i = 0; i < len; i++) out.push(out[out.length - dist]);
        }
      }
    }
    return new Uint8Array(out);
  }
  async function inflate(b) {
    if (typeof DecompressionStream !== "undefined") {
      try {
        const ds = new DecompressionStream("deflate");
        return new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(ds)).arrayBuffer());
      } catch (e) { /* fall through to the pure-JS decoder */ }
    }
    return pureInflate(b);
  }
  function a85(b) {
    let s = latin(b).replace(/\s+/g, "");
    if (s.startsWith("<~")) s = s.slice(2);
    const e = s.indexOf("~>"); if (e !== -1) s = s.slice(0, e);
    const out = []; let grp = [];
    for (const ch of s) {
      if (ch === "z" && grp.length === 0) { out.push(0, 0, 0, 0); continue; }
      grp.push(ch.charCodeAt(0) - 33);
      if (grp.length === 5) {
        let v = 0; for (const d of grp) v = v * 85 + d;
        out.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255); grp = [];
      }
    }
    if (grp.length > 1) {
      const n = grp.length; while (grp.length < 5) grp.push(84);
      let v = 0; for (const d of grp) v = v * 85 + d;
      const f = [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
      out.push(...f.slice(0, n - 1));
    }
    return new Uint8Array(out);
  }
  function ahex(b) {
    let h = latin(b).replace(/[^0-9A-Fa-f>]/g, ""); const e = h.indexOf(">"); if (e !== -1) h = h.slice(0, e);
    if (h.length % 2) h += "0";
    const out = new Uint8Array(h.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16);
    return out;
  }
  async function decodeStream(dict, data) {
    const fm = /\/Filter\s*(\[[^\]]*\]|\/[A-Za-z0-9]+)/.exec(dict);
    if (!fm) return data;
    const names = fm[1].match(/\/[A-Za-z0-9]+/g) || [];
    let cur = data;
    try {
      for (const nm of names) {
        if (nm === "/FlateDecode" || nm === "/Fl") cur = await inflate(cur);
        else if (nm === "/ASCII85Decode" || nm === "/A85") cur = a85(cur);
        else if (nm === "/ASCIIHexDecode" || nm === "/AHx") cur = ahex(cur);
        else return null;
      }
    } catch (e) { return null; }
    return cur;
  }
  const raw = latin(bytes);
  if (/\/Encrypt\b/.test(raw.slice(Math.max(0, raw.length - 4000)))) {
    throw new Error("PDF is password protected / encrypted");
  }
  const objs = new Map();
  const objRe = /(\d+)\s+(\d+)\s+obj\b/g;
  let m;
  while ((m = objRe.exec(raw)) !== null) {
    const num = parseInt(m[1], 10);
    const start = objRe.lastIndex;
    const si = raw.indexOf("stream", start);
    const eo = raw.indexOf("endobj", start);
    if (si !== -1 && (eo === -1 || si < eo)) {
      const dict = raw.slice(start, si);
      let ds = si + 6;
      if (raw[ds] === "\r") ds++;
      if (raw[ds] === "\n") ds++;
      let de = raw.indexOf("endstream", ds);
      if (de === -1) de = eo === -1 ? raw.length : eo;
      let end = de;
      while (end > ds && (raw[end - 1] === "\n" || raw[end - 1] === "\r")) end--;
      objs.set(num, { dict, data: bytes.subarray(ds, end) });
      objRe.lastIndex = de;
    } else {
      objs.set(num, { dict: raw.slice(start, eo === -1 ? raw.length : eo), data: null });
    }
  }
  // Compressed object streams: pull the inner objects out as plain dictionaries.
  for (const [, o] of Array.from(objs)) {
    if (o.data && /\/Type\s*\/ObjStm/.test(o.dict)) {
      const dec = await decodeStream(o.dict, o.data);
      if (!dec) continue;
      const txt = latin(dec);
      const n = parseInt((o.dict.match(/\/N\s+(\d+)/) || [])[1], 10);
      const first = parseInt((o.dict.match(/\/First\s+(\d+)/) || [])[1], 10);
      if (!n || isNaN(first)) continue;
      const nums = txt.slice(0, first).trim().split(/\s+/).map(Number);
      for (let i = 0; i < n; i++) {
        const id = nums[i * 2], off = nums[i * 2 + 1];
        const nextOff = i + 1 < n ? nums[(i + 1) * 2 + 1] : txt.length - first;
        if (!objs.has(id)) objs.set(id, { dict: txt.slice(first + off, first + nextOff), data: null });
      }
    }
  }
  const refOf = s => { const r = /(\d+)\s+\d+\s+R\b/.exec(s || ""); return r ? parseInt(r[1], 10) : null; };
  function balanced(str, idx) {
    const s = str.indexOf("<<", idx);
    if (s === -1) return "";
    let depth = 0;
    for (let i = s; i < str.length - 1; i++) {
      if (str[i] === "<" && str[i + 1] === "<") { depth++; i++; }
      else if (str[i] === ">" && str[i + 1] === ">") { depth--; i++; if (depth === 0) return str.slice(s, i + 1); }
    }
    return str.slice(s);
  }
  // ---- fonts / ToUnicode ----
  const fontCache = new Map();
  async function loadFont(num) {
    if (fontCache.has(num)) return fontCache.get(num);
    const info = { cmap: null, codeLen: 1, type0: false };
    fontCache.set(num, info);
    const fo = objs.get(num);
    if (!fo) return info;
    info.type0 = /\/Subtype\s*\/Type0/.test(fo.dict);
    if (info.type0) info.codeLen = 2;
    const tu = (/\/ToUnicode\s*(\d+)\s+\d+\s+R/.exec(fo.dict) || [])[1];
    const co = tu ? objs.get(parseInt(tu, 10)) : null;
    if (co && co.data) {
      const dec = await decodeStream(co.dict, co.data);
      if (dec) {
        const t = latin(dec);
        const cmap = new Map();
        const cs = /begincodespacerange\s*<([0-9A-Fa-f]+)>/.exec(t);
        if (cs) info.codeLen = Math.max(1, Math.round(cs[1].length / 2));
        const u16 = h => {
          let o = "";
          for (let i = 0; i + 3 < h.length + 1; i += 4) o += String.fromCharCode(parseInt(h.substr(i, 4).padEnd(4, "0"), 16));
          return o;
        };
        let bm;
        const chRe = /beginbfchar([\s\S]*?)endbfchar/g;
        while ((bm = chRe.exec(t)) !== null) {
          const pr = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]*)>/g; let p;
          while ((p = pr.exec(bm[1])) !== null) cmap.set(parseInt(p[1], 16), u16(p[2]));
        }
        const rgRe = /beginbfrange([\s\S]*?)endbfrange/g;
        while ((bm = rgRe.exec(t)) !== null) {
          const pr = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(\[[^\]]*\]|<[0-9A-Fa-f]*>)/g; let p;
          while ((p = pr.exec(bm[1])) !== null) {
            const lo = parseInt(p[1], 16), hi = parseInt(p[2], 16);
            if (p[3][0] === "[") {
              const items = p[3].match(/<([0-9A-Fa-f]*)>/g) || [];
              items.forEach((it, i) => cmap.set(lo + i, u16(it.slice(1, -1))));
            } else {
              const base = u16(p[3].slice(1, -1));
              for (let c = lo; c <= hi && c - lo < 70000; c++) {
                cmap.set(c, base.slice(0, -1) + String.fromCharCode(base.charCodeAt(base.length - 1) + (c - lo)));
              }
            }
          }
        }
        if (cmap.size) info.cmap = cmap;
      }
    }
    return info;
  }
  function fontNamesFromResources(resText) {
    const map = {};
    const fi = resText.indexOf("/Font");
    if (fi === -1) return map;
    let fontDict = "";
    const after = resText.slice(fi + 5).trimStart();
    if (after.startsWith("<<")) fontDict = balanced(resText, fi);
    else { const rn = refOf(after); const ro = rn && objs.get(rn); fontDict = ro ? ro.dict : ""; }
    const re = /\/([^\s\/<>\[\]()]+)\s+(\d+)\s+\d+\s+R/g; let r;
    while ((r = re.exec(fontDict)) !== null) map[r[1]] = parseInt(r[2], 10);
    return map;
  }
  function resourcesOf(pageDict) {
    let d = pageDict, guard = 0;
    while (d && guard++ < 6) {
      const ri = d.indexOf("/Resources");
      if (ri !== -1) {
        const after = d.slice(ri + 10).trimStart();
        if (after.startsWith("<<")) return balanced(d, ri);
        const rn = refOf(after);
        const ro = rn && objs.get(rn);
        if (ro) return ro.dict;
      }
      const pn = (/\/Parent\s*(\d+)\s+\d+\s+R/.exec(d) || [])[1];
      d = pn && objs.get(parseInt(pn, 10)) ? objs.get(parseInt(pn, 10)).dict : null;
    }
    return "";
  }
  // ---- content stream interpreter ----
  const tokRe = /\/[^\s\/<>\[\]()]*|\((?:[^()\\]|\\[\s\S]|\((?:[^()\\]|\\[\s\S])*\))*\)|<<|>>|<[0-9A-Fa-f\s]*>|\[|\]|[-+]?\d*\.?\d+|[A-Za-z'"*]+/g;
  function litBytes(s) {
    const inner = s.slice(1, -1);
    const out = [];
    for (let i = 0; i < inner.length; i++) {
      const c = inner[i];
      if (c === "\\") {
        const n = inner[++i];
        if (n === "n") out.push(10); else if (n === "r") out.push(13); else if (n === "t") out.push(9);
        else if (n === "b" || n === "f") { /* ignore */ }
        else if (n >= "0" && n <= "7") {
          let o = n;
          while (o.length < 3 && inner[i + 1] >= "0" && inner[i + 1] <= "7") o += inner[++i];
          out.push(parseInt(o, 8) & 255);
        } else if (n === "\n") { /* line continuation */ }
        else if (n === "\r") { if (inner[i + 1] === "\n") i++; }
        else out.push(n.charCodeAt(0) & 255);
      } else out.push(c.charCodeAt(0) & 255);
    }
    return out;
  }
  function hexBytes(s) {
    let h = s.slice(1, -1).replace(/\s+/g, "");
    if (h.length % 2) h += "0";
    const out = [];
    for (let i = 0; i < h.length; i += 2) out.push(parseInt(h.substr(i, 2), 16));
    return out;
  }
  async function interpret(content, fontByName) {
    let out = "", font = null, ops = [], arr = null, lastY = null, fs = 10, posMark = 0;
    const nl = () => { if (out && !out.endsWith("\n")) out += "\n"; };
    const sp = () => { if (out && !/[\s]$/.test(out)) out += " "; };
    const decode = tok => {
      const b = tok[0] === "(" ? litBytes(tok) : hexBytes(tok);
      let s = "";
      if (font && font.cmap) {
        const L = font.codeLen || 1;
        for (let i = 0; i + L <= b.length; i += L) {
          let code = 0;
          for (let k = 0; k < L; k++) code = code * 256 + b[i + k];
          const u = font.cmap.get(code);
          if (u !== undefined) s += u; else if (L === 1) s += String.fromCharCode(code);
        }
      } else if (font && font.type0) {
        // Type0 font without a ToUnicode map: nothing reliable to decode.
      } else {
        for (const c of b) s += String.fromCharCode(c);
      }
      return s;
    };
    tokRe.lastIndex = 0;
    let t;
    while ((t = tokRe.exec(content)) !== null) {
      const tk = t[0];
      if (tk === "[") { arr = []; continue; }
      if (tk === "]") { ops.push(arr || []); arr = null; continue; }
      const c = tk[0];
      const isOperand = c === "/" || c === "(" || c === "<" || /[-+.\d]/.test(c);
      if (isOperand) {
        if (tk === "<<" || tk === ">>") continue;
        (arr || ops).push(c === "/" ? tk : (c === "(" || c === "<") ? tk : parseFloat(tk));
        continue;
      }
      // operator
      switch (tk) {
        case "Tf": {
          fs = Math.abs(Number(ops[ops.length - 1])) || 10;
          const nm = String(ops[ops.length - 2] || "").slice(1);
          font = fontByName && fontByName[nm] ? await loadFont(fontByName[nm]) : null;
          break;
        }
        case "Tj": out += decode(String(ops[ops.length - 1] || "()")); break;
        case "'": case "\"": nl(); out += decode(String(ops[ops.length - 1] || "()")); break;
        case "TJ": {
          const a = ops[ops.length - 1] || [];
          for (const el of a) {
            if (typeof el === "number") { if (el < -500) sp(); }
            else if (typeof el === "string" && (el[0] === "(" || el[0] === "<")) out += decode(el);
          }
          break;
        }
        case "Td": case "TD": {
          const tx = ops[ops.length - 2], ty = ops[ops.length - 1];
          const runChars = out.length - posMark;
          if (Math.abs(ty) > 0.5) nl(); else if (tx > Math.max(1.5 * fs, runChars * fs * 0.62 * 1.35)) sp();
          posMark = out.length;
          break;
        }
        case "T*": nl(); break;
        case "Tm": {
          const y = ops[ops.length - 1];
          if (lastY !== null && Math.abs(y - lastY) > 0.5) nl();
          lastY = y; posMark = out.length;
          break;
        }
        case "ET": nl(); lastY = null; break;
        default: break;
      }
      ops = [];
    }
    return out;
  }
  // ---- walk pages ----
  const pageTexts = [];
  const usedContents = new Set();
  const nums = Array.from(objs.keys()).sort((a, b) => a - b);
  for (const n of nums) {
    const o = objs.get(n);
    if (!/\/Type\s*\/Page\b(?!s)/.test(o.dict)) continue;
    const ci = o.dict.indexOf("/Contents");
    if (ci === -1) continue;
    const afterC = o.dict.slice(ci + 9).trimStart();
    let refs = [];
    if (afterC.startsWith("[")) {
      const arrTxt = afterC.slice(0, afterC.indexOf("]") + 1);
      const re = /(\d+)\s+\d+\s+R/g; let r;
      while ((r = re.exec(arrTxt)) !== null) refs.push(parseInt(r[1], 10));
    } else {
      const r1 = refOf(afterC); if (r1) refs.push(r1);
    }
    let content = "";
    for (const r of refs) {
      const co = objs.get(r);
      if (!co || !co.data) continue;
      usedContents.add(r);
      const dec = await decodeStream(co.dict, co.data);
      if (dec) content += latin(dec) + "\n";
    }
    if (!content) continue;
    const fonts = fontNamesFromResources(resourcesOf(o.dict));
    const txt = await interpret(content, fonts);
    if (txt.trim()) pageTexts.push(txt);
  }
  let fullText = pageTexts.join("\n");
  if (!fullText.trim()) {
    // Fallback for odd structures: any stream that looks like page content.
    for (const n of nums) {
      const o = objs.get(n);
      if (!o.data || usedContents.has(n)) continue;
      const dec = await decodeStream(o.dict, o.data);
      if (!dec) continue;
      const c = latin(dec);
      if (/\bBT\b/.test(c) && /\b(Tj|TJ)\b/.test(c)) {
        const globalFonts = {};
        objs.forEach((fo, fn) => { if (/\/Type\s*\/Font\b/.test(fo.dict)) globalFonts["F" + fn] = fn; });
        fullText += (await interpret(c, fontByNameFallback())) + "\n";
      }
    }
  }
  function fontByNameFallback() { return {}; }
  if (!fullText.trim()) {
    throw new Error("No extractable text layer found (likely a scanned image PDF)");
  }
  return fullText.normalize("NFKC");
}

/** Re-joins field labels that PDF generators split into separately positioned pieces (e.g. "COMP ANY NAME"). */
function healLabels(text) {
  const labels = ["PRODUCT / SERVICE", "COMPANY NAME", "EXPANSION OBJECTIVE", "EXPANSION BUDGET", "ANNUAL REVENUE", "HEADQUARTERS", "CURRENT MARKETS", "CERTIFICATIONS", "CUSTOMER SEGMENTS", "SALES CHANNELS", "TARGET CUSTOMER", "PERFORMANCE", "CATEGORY", "EMPLOYEES", "INDUSTRY"];
  let out = text;
  for (const l of labels) {
    const re = new RegExp(l.split("").map(c => c === " " ? "\\s+" : c.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&")).join("\\s?"), "g");
    out = out.replace(re, l);
  }
  return out;
}

/** Pure-JS SHA-256 fallback for contexts without Web Crypto (e.g. plain http:// on a LAN address or some embedded previews). */
function sha256Fallback(bytes) {
  const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const l = bytes.length, bitLen = l * 8;
  const padded = new Uint8Array(((l + 9 + 63) >> 6) << 6);
  padded.set(bytes); padded[l] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 8, Math.floor(bitLen / 4294967296)); dv.setUint32(padded.length - 4, bitLen >>> 0);
  const w = new Uint32Array(64);
  const rr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < padded.length; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rr(w[i-15], 7) ^ rr(w[i-15], 18) ^ (w[i-15] >>> 3);
      const s1 = rr(w[i-2], 17) ^ rr(w[i-2], 19) ^ (w[i-2] >>> 10);
      w[i] = (w[i-16] + s0 + w[i-7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rr(e, 6) ^ rr(e, 11) ^ rr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rr(a, 2) ^ rr(a, 13) ^ rr(a, 22);
      const mj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + mj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  return H.map(x => x.toString(16).padStart(8, "0")).join("");
}

const INDUSTRY_KEYWORDS = {
  realEstate: ["real estate", "عقار", "immobil"],
  sovereignInvestment: ["sovereign", "private equity", "استثمار", "صندوق"],
  halalFood: ["halal", "food", "حلال", "غذائ"],
  islamicFinance: ["islamic finance", "sharia", "شريعة", "تمويل إسلامي"],
  logistics: ["logistics", "freight", "شحن", "لوجست"],
  renewableEnergy: ["renewable", "solar", "energy", "طاقة"],
  luxuryRetail: ["luxury", "retail", "فاخر", "تجزئة"]
};

const BRAND_LOGO_IMG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnUAAAHNCAYAAAB4ho3RAAEAAElEQVR42uz9ebxlaVXfj7/XevY+59y5qqubhqaZpJmUGRU0jphoNFFE0RhNYjRBBc1PglETUKNG+alBoqLikGicUEQBRdSIGlQCIioz9DzPU413OGc/z1rfP57n3FuNXd01AXXrrrev7bl1u+pUsc6+e3/2Gj4LgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiD4OOH29ksiCkEQnO9ohCAIgvOeQ9ctRRCCIAhRFwRBsNsZbBJBCIIgRF0QBMFuZ322HEEIgiBEXRAEwW5HLERdEAQh6oIgCHY90xw9dUEQhKgLgiDYzbg/f5mUFiMSQRCEqAuCINjNbOxPGFF+DYIgRF0QBMGu5uhWR/YQdUEQhKgLgiDY1Wz2HSILEYggCELUBUEQ7GbSpMOipy4IghB1QRAEu5sjQ4dLTL8GQRCiLgiCYFczWEJiUCIIghB1QRAEu5u8TyHFmrAgCELUBUEQ7GpSSRC7X4MgCFEXBEGwuzHpcI/p1yAIQtQFQRDsarquR2QcgQiCIERdEATBbsZGPaQ+AhEEQYi6IAiCXX2VW1BcuwhEEAQh6oIgCHb1VU4T4iHqgiAIURcEQbCrsaHDGUUggiAIURcEQbCrr3Jdh4SoC4IgRF0QBMHuJqcRENOvQRCEqAuCINjVdGUCxPRrEAQh6oIgCHY1M51gUX4NgiBEXRAEwe7GWUDo3G9ajWAEQRCiLgiCYNfSraDaw03RVxcEQYi6IAiCXYt1S4gmNu6K/a9BEISoC4Ig2L1XubRAUuHueyYRjCAIQtQFQRDsVlJSUieoxLBEEAQh6oIgCHYv1iMCSaKnLgiCEHVBEAS7liJLIMJ6jp66IAhC1AVBEOxaRqM1VKAMixGMIAhC1AVBEOxWUr9KMcH7GJQIgiBEXRAEwa7FZRkzKNPoqQuCIERdEATBrkXSGHfHLaZfgyAIURcEQbB7r3JphGumhKVJEAQh6oIgCHYxMgacrg9RFwRBiLogCIJdLOpG4KBd9NQFQRCiLgiCYNdiMsYB85h+DYIgRF0QBMFuxP1/raLSgzukKL8GQRCiLgiCYHcyGoP3bfo1yq9BEISoC4Ig2JX4whjXDjeHEqIuCIIQdUEQBLuSTRuRkuKAW/TUBUEQoi4IgmBXMksTVAQRhxB1QRCEqAuCINidHM3LOIJQyPTuf7QcQQmCIERdEATBbsNZRAB3QzXBoeirC4IgRF0QBMHuE3U6wRHcHaNn40gfQQmCIERdEATBrhN1toAgAAiJQ+vRVxcEQYi6IAiC3SfqWAQVEBBN5BIGxEEQhKgLgiDYfaQlVEG1AIkSWyWCIAhRFwRBsPsoeYKotF/1TGOrRBAEIeqCIAh2I4tAquVXSQwleuqCIAhRFwRBsOswFut1zhLuHSUMiIMgCFEXBEGwC0WdLYK0QQkSMw1RFwRBiLogCIJdyAgBBMdJjProqQuCIERdEATBrkN0DCq4GIjiuhBBCYIgRF0QBMHuo1qYiDi4UIhMXRAEIeqCIAh2HSI9giFuuO+IvCAIghB1QRAEu0nU+QhwzKH+v9j9GgRBiLogCIJdh7OAmeMOJUPxyNQFQXDe0kUIgiD4uGstf/saB694GHfcfREiF7JZLiLJQ5i5kDAkZciAH2HQe8jcwz4Osbp2jzz8xdef/F9kY8zq10LB7KQzdd/4dr/w1htYk032W+bA8gIXLnVMlpdYEKHXRG9b2GRMZuBORhwaChvLqxzsl7j9yZ/C0a9ako34tIMgCFEXBMF5IN7+7hIOX/U47jn2VGZ2GYMfgHIhf//3i8AiMroL7e5k8DsxvRcvN1E2b6LbvJnLJvfI8ncfOsN/wAjcUBxzQ/WkRd0vfZbcDdx9f//tGW/3xUfewKWLR3js0gIXS+HifoFnoFx8dJMLktG94zrs217rRyY9h0fK7d2Im0aJa5Yv4cYnP407/7HI0ThDgiA4m0iEIAiCMxdv6ytc9cYns3Hk0xjr0yA9ipk/GtERo35G1jtI3a0Mw6345g2MZn/DEy+7XOSL7/6Y/rsu/413wOQp+HAXR26/Bve/luf8x+/9WP6d/+smX73lr9k/g8ffe5Sn03EpwoUZHuWwPykdhYPjCTdh3IZx62TgI2mFy3k+N71CIrsXBEGIuiAIPi4Czvdxw+88lek9zwF5PKafwiCPYdItsrk5Jdst9P0HKHY5Y/1rnvSQ94h8+b2fkH/r5a/9O+gfC/keDt96Jch75NkvfdknKnbP+xF/8vICz9SOh00mPKJkLht1XDpyOu05VBK398ptatywsI/rVlZ532d+Njd+Vgi9IAhC1AVBcMbC6PY/eAK33PgZLKVPY+AZ0D+VC5aUzo27j2yQpx+mlD+nW/oreeoL/+859W+//LXvhe6RUO7lyK0fwdOH5Nkv+c/n0r/xZf/bH3PsTh6xPuYpeYlP7joe23dclDo0OUeAu2eZW0rh1n6L6y/ZxxXf8zXynjgzgyAIURcEwQMLoYNvfirX3fRp9Po0GD0LSZ/KviVn2Mrce+Qukn2IYfY2hq2/ks982bvO6f8tV7zuQ5g8FPwQh2/+IJKulme/5DvO5X/zc3/Rl7iTT3roBTxzccwzRhMeQ+ai1LGiA0WVu3XMFSlxjTjXPfRhXHvZ07n+S5fkcJy9QRCiLgiCvSzi1n/j8dxw1+PYSp+JLnweo9GzWLsgoe4cuucYG8fez3j0u+xbeZtc+i8/sGv+d/mNK1z513+PyQVghzh88wdAbpbnvPTbdtPn88r3++qxG3nE+lE+9cgxnplGPK5f5ACJpWEDo+eYGXepccXCAn97YMSHvvqfcd1lUbINghB1QRCc5yLO37bK+/7+6ZA+lzT5R/TjZ7G4ssJokjhyeMrm5pUs9n/I0vgvediz/l7ksrt35//OP3ooVx17N8UWEDvM4Zs+gHCXfPp3vXA3f35f9dP+5MVlnpqUZ4xGXIbyyNmMMYaNEluLI4YR3Jw6/lacv544V33PV8rtceYHQYi6IAjOByG3/upHcU3+PGz8XFL/qfSLj2b/vkWGYkyPHmZr6++Q7q1c+PC3ykP+8XnRr+XHfvtx3J7ewVAE9SMcuvH9iB3m0/7Ri0Q+67zIYj37N/0hnzTw7HHhM/oFnpASF/UwshmiHaNRxzBKHLKBazrjnatj/uq7v1yui5+IIAhRFwTBbhI117z22Qwbn0WXPocZT6EbX8rKiuAmHD12GJd3wOgNPOEhfynyOdecd//7D77hqRzUv2AYDJEjHL7p/dhsk09/yLeJfMPd59v/3m99rV+ytcmnrS3x2SSe7Im12RaGQD8iLY2hV46ZccOC8q7HHOCvv+bZ8v74SQmCEHVBEJyLQua6X3gaU/3n+OS5IE+h75YZjZRcEiVvMsvvI5Xf47InvlG6Z19zXsfi0B9+GgfLnzIMBhzm6M0foGzM+JTV75ClU9hKsUsF3rjnC6YDz6XjsaqkVBARZNSxuNDTJ+FYnnF5Et7+kMTbvuXL5Mr4CQqCEHVBEHwixcsNf/AEjhz6EhJfjuiTGXdLaBI6lJwh2w106bdZvPS35SGf+d49E5c7/vDz2ZI3MxsK+BGO3vJ+hqPw6NXvkotf9KG9EocX/oJ/gXZ80dIKn6IdFychMbBuRknKSkos4hwumQ/3zp989gX86Rd+odwVP1lBEKIuCIKPh2Dxqy/kqr/8Uqb919CNn8OoV8gKCF56PB+jyNtx+XWe+Mw/EXniwT0Xo5v/4Hn4+LeYzgaEIxy96f3MjiYu7r9HHvWSd++1eLz6vX7h+97Dc/uOL1oc8aTRiMVc2MwZcmGxUyaThCe4vcBfuvLmH3mBvDt+2oIgRF0QBGddyPki1/zqP+VY/momk89iYXGFrUEoGcaj+rO8uXEDZfgdRhf9qjzpy67d0/G67g3/mtHaL7I5HVCOcuTm9zIcGrHAD8qTv+sv93JsvvHH/alLB/jqxSU+R3su3JqyNWQGK6BKP+pYGI/Y8MwHh463fO7zecuXiazHT2EQhKgLguBMxMldv/Es7rUvB30+XXoMYsKRjQFTZ2myAGwy3Xon5P8tT/2m10XEWtyuff23MDnwk2xuzcCOcvTm9zIcHtPPfkSe/r1vjQjBv/8d379/g68aLfL8QXnk1pTZLDMdHE/CuDNWF5eZeeGWvMWfLS3y+le8QK6JyAXBuUkXIQiCc1CQ+Fv3c90dX0Lpvo7D6TOY6ITpNHP02BaiynhhQpKDbB75TYbDvyCf+t2xNuofPrMuodoeXB1EHDGh2CRiU/mfL5CDwC8Av/CS1/qXaOLr15Z54tQYNgc2t6ZsTteZ9B0PX+j4hpx5wXf8ln+gDLz+J/61/GFEMAhC1AVBcCIxd/VvPAvjX3Hlvf+cfuExTLSwvjVj0zZImhhPlvB8Azr7TR5+4Fdl6WuvjaidgOIrIAIO7oA5jiAyjuD8Q37ia+UPgT/8T7/lnzsZ8a9GizxjNqbb2sI9M92CZM6kVz5zcYFPe/nv+AuHKb938aW8+Ts+V+6JCAZBiLogCAC/6Xe+mCkvZtx/DokltgZjNmwyaKabJDpdwfJV+NYv8vgnvlbkOXdG1B40qku1wcQF3DB3XJzMQsTmxLzya+QvgL94xe/5px0a+Pep43O8Q4sxRcgFSgZN8MSFRZ5071382+99vf+fR67yuhd+kcRDRhCEqAuCPSo7bvmdF7CpL8X6p7M4dgYbyHYQVyd1EyTvw6dXkuRneeynvlbksWE1cdLYYn0xwByk4BiJUcTmwXnZ8+TdwLtf9Ev+Bann28YTnoGyKTB1sGIM0wEXuFCFf3vjOl/28t/1//PIxK98c2ytCIIQdUGwZ8TcTb/x1Wzot7PFp9J5YWtzYJhltC+YdvRpP9gdTKc/xuMu+nmRLwwxd8qazpeOK71WYSc4xaP8egq85hvlz179dn/nlZfzzydrvLAf81h3jrkzw5EyUAwGySx2wr+4yfjC//I6/5Nl4Vdf/tWRuQuCEHVBcL6KuRt/+xvZmL2QrfRkOk1sbQ4kHbACpiMmtgzlCFN7NQ/f91Oy9HVXR9ROF2ll1tZPhzngaOojNqfGf/gs2QB++6/X/S2/92aex4Rv6TouGQr3WsKl0LtRCqyLsTBKvGDW809e+lr/P9fdxS+98dvl5ohiEISoC4LdL+R8fZGr3vhvsPJCZltPRM3ZnBZSGkgK5omFpVW8rHPk4C9zgbxSHvHCD0fkzhRdxA3cFPdahnUHj/Lr6fKcJVkHXvudr/W3HZ7yjQsrfE03Ig2ZQ+4gioqQN42pbDFZ7viapzyCL3rE6/wNd4z4xdc9X45EFIPgY/goGyEIgo+hoLv217+FIi/C7LF4gdmQESmIONrDeGEZd2Nr/Q9Z6X5UHvWvw8H/bMX+6t/5c5b2fTZHjwyU4S42bv9byvoyOf+VfOb3/VBE6Mz5ll/2Jy2MePF4zD82mObMMSCpIuZInjLqE93iCloyhw5u8Duv+VfyPyJyQRCiLgh2j6C45bX/nnX5FkQeD8WYDgPJDXCyC/14TEoLbB3+v6xtfb888tv/OqJ2lj+Da97wNyyuPIOjxwZsdicbt7+b2bFVsHfLc773eyJCZ48X/5b/kw6+tU98sjiHZoVBEyqOWqbTjjRKpAmMs3HtsQ1+9if/rfx+RC4IQtQFwbkrJO74va/l2OxbyPZ0lETOW0ie4QKzQXAZkVill/ezMvpBefjXvSmi9rESdW/6EAtLj2N9PWPT29m47W8Z1tfA3i+f/r3fGRE6u7zsel8+9Fd83fKEr5XEvqGwPgykLtGNEuqZ1AmkRD8akR3etTXwM6/4Sgnj7CA4S0RPXRCcDQFx2x98CVvTl7JRnoMmwT1jZYukBe+dIoV+vB8tR0gbP8Jlz3qNyDOORuQ+ps+si9XJpJrV4QDiSBfTrx8DXvFoOQb8/P/v9f6Xo4FvXUx87ixRDKYCnSSSK7gyy4WuVz5v3xLPfuVb/fceucarv/rT5Y6IYhCc4VUvQhAEZyDm7njTkzm09QOMui/Euw5nhpjVYUszcs5AR9dNwN7E4x76vSKfGzYPH+vPxX2Z6/7gKvr+AqYzo2zewsadf0deXyXJ9fLM735RROljyw+/yb9iK/MtWXiMCketoKok7SA5khKSEt04MSqFu46s80s/9FXycxG5IDh9NEIQBKcjGv78Av/Ar/0ox2ZvYzT+MgZXYIqmAp2DOiU52h9g3B1lefRCefy/+LoQdB8vNhYQmVSPunaZEwHEIaZfPx68/MvlDRvwos11/jgJS5MxY01kAaRrez6cPMtMS+GS1WV+4Id/39/80p/zz4roBcHpEZm6IDhVQXfV7/47JuPvQLvHsblVwAekM1SsWqJZRqUnsYZt/h6PXvxukX9+RUTu4ym6r3wEN1z9YcRHZDGGo7ewceffM2wsM9K75Bnf+fURpY8f3/0b/i/Hi3xLN+YRYhw1Q0XoEkACMiOBvu9ZVOfY0Q1e976H8oo3fpYcjugFwckTmbogOFmhcOMbn+3XvuGvWFn+GWT0aGY2RUczdOykpDiKmTBKF9JLoQz/iUc/82tD0H1CPq0xSRQRR4RqISN1o4RL9BJ/nPnRr5PfvPdOvvXIYf4MWO4TPY6nROqE1PWYdgzuHAMWDqzxws8+xu9/26/7P43oBUGIuiA4e/Jg/W2rfsXrf5J+8oeMJ89hOiuYzej7GZLAXRkGx0rPpFsjb/4lk9E/k0/6ih8XuWwjIvgJYOPoGFEBvJVdwV3q2jDr3K9ejCB9fPnpb5YPfuRqXnrobn48CZvLCyyKYTiignaCKJCEzSGz0Sc+5ZMv4Ve+93f8p/hR3xcRDIIQdUFwZoLuqt/4Ru5ZfxdLa9/KzJbJtgldhqTk3EMRILO0tEDvyrE7/v885mlfIRd9YfjOfUJF3bFFBMUREMERFBB1kia4PVaFfQJ4y/fK0R//t/KzH7qe/3JwnWtXV1kY9+QCqCJdh2sPXUcW4Vgy5NH7+YYfewJ/9sKf9a+MCAZBiLogOHUxd91bnuaXv+GtLF34M+joMZSyhTAFBTPFs1IAvNDZGuuH30Ov/1ye+A0vE3ncPRHBTzDrRxdqdg4HAXHHkJqtkw5unUSQPnH86ovlj8uYf3dwkzclYWnsqDuDgFtp5jMgxdmaZjZWl3ji05/Ia175Fn/Nd/6aXxoRDIIQdUFwcoLug6//ISbyVpZGz2VrJuTpgBWjuFCKQhGGoWAu2LCCbfwclz3qy+SSL/vTiN65giyjCrX86oha/bY4yIhbDoeo+wTzii+W6172RfLtt9/L/0CYjRKTksnmiBUwMFfwjsGEo2KMVpf4+sdewh/91O/510YEgyBEXRCcWMxd+5bn+E2//w4uXPkutob9zKYzJGesCF4UyyA4gxVUxixSWB29RB7zL14k8qm3RwTPIUzXkPl0f3UfprXYoZrYnIaoO0f44a+W/3HLXfzn6cCdo44L1Nly8FLQ4riDi5I1seHOMe155MJ+fvpn/tx/4lXX+3JEMAhC1AXBfQXdB974/Syl3yd1n8HmloPNqkWJCG5Se+eKMkwL47TK8vhWDiz9S7noS14d0TsXyWtIUqQDUZAkqNYDenwIUXcO8cp/LW+8/l5efGjKu0c9F3bKYF6HKNxxExylSGKKcATBFkb8u4Xref23/7I/LSIYBCHqggD/wG883i//nT/hoqX/wla5gOkwRTUjyragE8AcYMbywhpjfQcXPep5MvncP4wInqtXtjRBU+2nQwQRcBRUMOlRCQPic4yf/lfyN++/ihfdfZjfTSMumIzBIaOIG+LWfgwdxNkshc3VBf7Rs57Ir//A66McGwQh6oK9Leg+8htfz4G1P2H/6j9hc6oIM1JfkNSEAJASuGb6xcxkeR+z2S9z8RO/XOQJH4gIntMsIU3MiVTbGXNFULTr8BT7X89Bfvulcv0f3cR/vvp2fn6WWekSS2Zk1Sro2hZfDHBhNh1YH4245CmP5ZU//Vb/0YhgEKIuCPaamPP3rPi1v/dT7H/oT2LpUUxnM/rxDO0N7RxSdczSHrIX+n6Bydjo7CXy6Od/o8hj74oonuOYraAC6t466wT3hLvinpgOCxGkc5N3vkQOvupr5OW338b3a2G63LMkxhRIVpB5ti4p5o5vbrF5bMroYQf45t94l7/pxa/zJ0YUgxB1QbAXBN2h130619/4B4y7FzM9ukweNtHRgKg3PzNlvpwye2HtokVGkxtY0xfIxV/8kxHBXYLYGqkD0WZpW31tQQWRjqmtRpDObX7k38hP/92VfNc96xwZ91yAsYWgUj9Vb1K9mKMGw1amTDq+8B9/Er/5qj/xr4gIBiHqguB8FnS3vuVFbK6+jq77LDID2m/RjQuo057+aUsHwDL7V5fJh/+Ciy/4Mpl83p9FBHfVpW2ZbiSQBDpBOqkbJlQR7dAUU5O7gP/5rfJbV9/Cfzw6cP3KIhdMElsp4Um3xV3qBe2FlBzzwlbX8fjHP5SfetN7/GURwSBEXRCcb2LOL9/v177+NxFeySxfitkWUPAEc9cLl7ptAHcKmX0rK+T11/NQ+XqRp38korjLEBlXQTdvqqOKOm1lWE0rEaTdwS+8UN78/67hP91ymA+MOi6aJLIq3gn9SNBRQkaC9Ir0HebGTIz9SyNe9pb3+6/9wLt8f0QxCFEXBOeDoLv8tz6Nmy//Y8bjr2Fr2oNNAceL4kWwQbGsWE6UQVEvXLC4wmz6y1z0zBeJfPFNEcXd+MHbCBFHxZGWh20rYOsAhYalyS7it79J/uzvr+flNx/lHZ1yYCzQJ7zv6PqEjsfQd0hK6HiEp8S0GCyO+RfPWeX1r/wT/5SIYhCiLgh28339A7/5dexb+220+3SGsklKUxAwazXWIpgpFCXn2lS/OFkhz36CA1/wbSIPjXVfuxXRcdseMT8bdrJ1iGAeom6X8foXyV/+0Xv5wcvv5q+ScOE41UbJviP1dW+s9B2SOjQlUurI5kwXR3zusx7Db/zMn/oXRRSDEHVBsBsF3Qd/64fZf+BnmNojmeVN6BxPAgJJ6uoop1bmhuwsdLAwWcSm3ycH/vF/FJGNiOKuZlxNo32+77XNSqigCUgh6nYhb/tu+X9/+n5+8Jpj/J+uY208antila7TWmAXR5MgSUkqeC5sjUd8yjMu42d++W3+ryKKQYi6INgtYs7XV/3KN/wG+/Z/J2VYpuRZm5WrVhYqID1o73RjI0tmYRn6hQnKS+XCL/xvEcXz4USwRUpp2bl5a53K9rmgEj51u5S3v0ze9YZ38iMfuJ2/NOMCESgGpdC5tWVwrehuQgIkz9gadTzySY/ix3/1L/ylEcUgRF0QnOv38fW/fCy3vf0NTMZfS94oMGzWrIzOb+qOpYSJ4iSyw9JCoh8vMB6/RC74/P8RUTxPEBlve9S1pRKogtYTAQnz4d3M33yv/PVb/45XXHcvf9ULK51SzHF3JDtqXj/9BKiiJGQ6Y5YSBz7lk/iBN/6tx8NbEKIuCM5ZQXfD730ex+x3wb6AsrVJoWCigIH7/FaPOwjKYDAaKwtLCyyuvFRWnx0edOfVCSEjss3dzKqg17YHVhM4SxGk3c3bvkf+4rVv4wfeext/o8IFKZGLI8j2OIxKLcO6CoqigzPTxPKjLuE7f/9d/lMRxSBEXRCca/fv6//8G1hc+2Xy9MnMZusgpS1uBy9gBu6OWc3cDNlYXigsryww6V8qS0+LDN35hmiPOVibfbV2uZMeJIFI9NSdB/zND8n//b/v5wdvPMi7FiesTHpmveB9B121mkarlbjM3QqHzJYa/SMv5cX/9wr/pYhiEKIuCM4VQXfrn303C/YqZhuPIG9tgDkughe2O2s0GZIM7Y3ihcXFGQsrS/TyXTJ+Zgi68/LKpgn36jvoXjN18yydIJifVvn11eu+GME9t/g/r+Kv/vg9vOqmQ3xodYHVccfQV4NiSVqL7iqQwBN4J1hxNt3J+5f4hrdd4b/13B/2yNwGIeqC4BMq6K5+0/ch5fuYbS4zm25gJpgrzC1LTPB24IIVmIxnrOxbI/X/VRae9d8jiufrySE9VmB7VQiQEoDUTqvTy9Tddhcawu4c43bZeP1rees7PsjPHtzi+qVFVpKQk9Z2Sq+Pd5i3gQqDwWBzYLoxY3My5iv/8/P5X895nYchdRCiLgg+Iffsa970Y4zH/4Wt9TGzYQtXxaWezyI1G4MIboqXRBkSIgMXXbifMvyULD39ByOK5/MJwhj3nbVvKl73vqq00vzEff2Uxdnhnm6I6+a5xzvl4Ovewe//yXv5pUObHFxeZLEUMiAObuDF8cHxacG3prA1IBuZ6caUzX7EV3z3E/nlz3+1r0UwgxB1QfDxvF9f/qafoBu9hDxLoJtor6i2Vd/zrVAKCGjnaGd0400uuWQfxX5O1p797RHF8xyhw/wffhcVXKS2WW07E580m9fRrZ/Gnws+9tz9C3L7z72J3/6zD/DLW4X1lSW6Yszc8ZxhlvHZgM8GbJaxoWBDRtZnDMc22Foa8WXf/Bx+8XE/Gxm7IERdEHx8BN2Nb34Nk9G31gkIpmgnzVTWkc5JE0PH9bUb168Zb/HIy/Zh/a8yfsZ3RRTP83PE19dQ7bbNpavIr4JORHAElx6u6075gtmhfjCum+cqR39Lrnr17/Lrb34fbzq0jqYRsjXUUalcZ6ZsKHix+utcoBR0yAzTGZsry/zzH/40fuEZkbELQtQFwcf4Zn3DH/wv0G9E8xQtm3Rq1a3E2807tRm3UTMYHoGngUsfvR8f/TbjT36piByNSJ7v3LSMpJ55M932ujARiidKUZweZqcu6qbolkSm7lzm0K/L+//nH/Ar77uZP5WBPikUw8wgFwRrn9/80lHvhDJkZtMtppMRz/v2Z/Hz/+a/RcYu2H10EYLgnBdzx75uH3e+4OcRvhyfTTEykhRxQcRg7k3VVkKJgCah5MzDHr+G+Z+THvmdIhK7XPcEs0VSSojajuJH6vnSeufFerijP9V3TvfSzzYYIsbnNre8Rv7vrz/K9y8usu/JB3j6+gxzR9wQpJoUQ+u6VEwdiqLFGIohiz1f+VnPxn4VvjaiGewmIlMXnNuCbv1fLnHn838R1a/Ahk1KyRRLlKxkAyvt0uxg8z2fKEMxLn70Imrvp197iYjcGNHcK+QJOhIQr3oOgDoZLSg4qCi33rFwqu+8OdCzGdfN3cC73sWf/fGV/NrVd3EzMFbFtF4hHMfFQX1npRhez4whM5TC+soqz//5v/BfiEgGIeqC4Gxx51f9HNo/D8/rWMlVtJkjZtWkoJkKg+NWNwaYFy7+pJ40vou08h9E9n8gArmH2MirdF3bHtIGZiTN87ltHFZGbA2nLOpmhV6O0EeQdwFvlMNv/TB/9I4bed1dx7gdSCilFeXdvGXqfPux0LEq78zZdFhfm/DVr/kr/7EIZhCiLgjOEL/qN38a868mTzfJuVAstR46r63P5lhzoMpZEHGGwdl3sdAlIdlLRC78y4jkXhN15QAp1UzdvP1tvgXWPAEgjPD+lEWdZsY5kyLIu4NDr5Ab/urveMN7rudPDm9xUJzOCjkXvDhWCp4LXjJuBTfbtj+RwdjKxmxtzL/58bf490c0gxB1QXC6gu4jv/QjiH49ZTrFhoybIG07wLZThYObUIq2Tiln9aLCytoCOny3yKN/KyK5F0+esoaqbE+/Mp+AbcKuDk50zMopb5UYJUalhKjbTbz/R+W9f/YRfvPvb+Qdx2ZsApqNXBwf6vSrW83QFaOKOwRz0Flhaobs38eLv+91/j0RzSBEXRCc6j35fb/wX0iLL8aKoUxBBNXte3KzqZi3OguSHBT6pcKFFy+ztfGTki57VURyj5KH5Vpu1XpeqDpJARU0tclHSeTZqa8KS/RbR6P8utt49/fJn7/rcl5/1R28Z2ZkVcgZM6tlWGtedmJYUmz7aiOkWWFKobv0YfyH//Ir/q0RzSBEXRCcrKC7+pdezPK+l9bWZZ9B19Y6seM5NreocBE0QT+CtDjw8Mes4uXXWXjiyyKSexjRCSL3vbbNzx1v5dekoKcuzramjD2FqNuNfOha/vztV/AH197N1cXoRPCkmGhbOqLzZTT1UKkCTwQpxkaXGD3iEfynF/2if11EMwhRFwQPJuiu/d9fi668DBt61NcR9ba31XHmc2qtlVlAtHbADG489FGrDP4O5NEvF5GNiOZePpF8jGDtF3NVV4+dSUclp1MWZ2WgL0NYQe1Gbvt5uefdV/Anf389f3pwnVs7ocfrIrku4c3jRNopY+2x0VVAEz7MWO+UfY9/FN/9LT/tnxsRDULUBcGJ7sNX/uyXweSHGaZruG1ipLrOqRkNSNvI7bZjYVKKghQufMyEIjfSL/3HsC4JcF3c3gNcb9Kyk4NRqUYWInh3yuVXcXqVyNTtWmH3s3L5X13BH7/jJt5+dOBoP0LdKXMp164sGNBKsl6Mkh3PkAfn8GTEJZdewg983k/4YyOiQYi6IPjoe/CHXvP56PKPUfIB3I5VO1DTKuCaXcn82DYfMMGLsf/hUIqh9lKRi/4mohkgLOJu25PSgiPqSHK0q08IgiI+OQ1RN5Iwbd/VzB7Fe95+OX/497fwdxuFLVEkZzwbXhzPhVJKnYwtRsmFko2cCzYrDJtbHJ1MeMrnP4YfjGgGIeqC4HhBd8V/fwrdwqvI/nBKPrK9gMnNt33oqtGAIaWVYEstkIyWYWFxH8l/UCaPe2NEM6jnDkvb3oV1JhpQbwMTTkpWByb6UxZ15nQ+xPTrbub2/yAbt97C//ubj/CWD97B1dNM8gLFKCVjhSrkBqMMhk0HfMhYLpSS8cGYFuPg0pjP/uE3+8sjokGIuiAA3F+6Rln7cZzHUmaHMINSBBscL4ZlpwyOZcfa9u3cNjRJZ1x86T7K1mtl39N+JKIZbCO6XLN0x38PQKWaESfwJEh3yj51bnTMovy62zn2S3L3NXfyZ393DW+95h7unBb6WaHMCmU64NOCTwdsltvR/tssY4Nhg7O5ucXUjK//9tf6CyKiQYi6IPjQk34I6T+VMhyuO1wdsExVdzVDx/GmA+6kBJ7gokuXSd0HWf7k741ABvdVXqzUHJ3XfcDVm65tlUhsm1WonFKm7jmv85WUSN5Fpu584I6fkuuvuY23vPcm3nrnBncBDM5scPKQsaHUww2zguEUq/trvNR6wSaCXLSPb/vsH/VnRESDEHXB3r3vfvjV30nqX0CZHWte7oCV2gtFwT3jzWwYrzpvfsquHhjRTwpaXi6ydG1EM7jvyWVLdWVc+7XUdcB0fe2pS31BE0g6JVG3fDe9CKKy/c7BLueqV8j73nclb37/Tbxr0zmmis1m5HnptfXVmdfHSkQxpI3hCOrK5qjjYZ/1WF7OV/v+iGgQoi7Ye/fcK171JaSlb6ZsOe65+ri7t1ewUrMs7nUMzVtmRTplvKIcOLBMnr1S+qf9fkQz+AckGc9nXncOAel2snXaOSqnVH59mJLSQOo9rpvnE9ce42/e/UH+7IM3cZU5ooqZYd62SyPV9kSrlJckdYY6JcSNbjZg+xb41G/9Un4gohmEqAv2lqC77b8/Ht/3cnxQ1I7UwQevO1xFaom1Wk44IoWkdXJRe5BeuOjh+zm29X9YfdJPRDSDEzCuUk4FUrUzcRWkA1J1JkMd70an8qZDT0+POlF+Pa/4BTl2w3W88/3X8M67jnJr36MqDEnJnZLnzwStG3P7rOoUTwrF8NmM4WFrfOnX/by/NAIahKgL9g6HV19BmV1KzpuoGpoKIoZiiNcJRaEKOxFQNVIC7RMXP2qRwk3sW3u5yNI9EczgfjEWqj+dKnjb+NQ0nqZafk1dQdMp+dR1HZ0mxD1E3fnG9Pfkmutu5R1/fzMfOLrF1rhHXSkGOvevFoGkeBN2tWFTKSiWlakL+ZEH+PfP+yH/0ohoEKIuOO/xK37mxzD5VMpsAyMxeFf383QF7RxvGTqoL9KBKGjfsXTBCE0T3P6ryJP+LqIZPMBVbaH1Yu70vok4jED7nWEbOTVLk6NGj9B5+NSdn8LuAO+79hbefd29XONC6hVXwUTxlCjShJyDt9Js7fwt1XtpKGyNEpNHPpr/9Ozv80dHRIMQdcH5K+iufPW3wPj52LCFd6AqSKrZuLnbvzQvsZq9c8QN6RRGiYsuXmZj83/L6rN+OaIZPCCiK22w5jhRp0Y/KUhq1VMF5FR96pIJmjSum+cjB18hR6b38O4rr+c9tx3lDoNJNorVGgJmeCl4Lng2LBd8MNzrQEW1OjGOrSzyiGc+iu+PiAYh6oLzU9B94Ec/m2H0ImYzwzFEBNK8qLH921qZY/5qIE7OHRc8ZIHN9au5+NJXRDSDBzzX3BfRbgythD+fnkZqgk3HRhob2hfk1Mqvkyl9crroqTt/ufrn5CM33sxfX3ET7zk6ZQtIg5PnYm7WBF1xSi51oKI4VgwvGcyxPLC5sMRzX/zr0V8XhKgLzreb7N98ycX40veQh2XM806WhGY1IY6otdVNczuTOjDhIiyvdSgTpus/JPLoqyKiwYPQAwlXqzY5Tc8JkMZOGhnd2NDeSP0pibq0wKSDVHKYD5/PjBPvufIm3nX9nVxuIDglN486p/rWecHN6q/L/IolrTQrDCpsTcZ8w5e+xj8nIhqEqAvOHybPfRmqlyG2CW1ttshxd9v5Mte2er26xpZqZaJj9l24n0NHf10e8gW/EsEMToIOF73PzmCROkHdLxq6YDCCNDFkfEqWJmXK2AT1Epm685nLf1ruPXyUv73mLt551zq3Ar0Z2ZxSqqOmFac4dYGhCFmgiJPdKQhZhaNqjC5Z4aX7X+mrEdUgRF2w6/H3v+Lf0q9+EZRNpDOSFARD3MCt7XSte149z9eB1RVh0imrF6ywMb2ORz36+yOawcmxMa7XNbP6rGBAARenWzT6xUJaKHQLGdVTGnhIPSMBleipO++5+TVy9R138bfX3sMHjmWmKZFQiiTqA6mjIi1rV4cmSnPazAbZnJk7B5cmPO7LLuJFEdEgRF2wuwXdB172FEYXfQNDLpgUXKvvXBV0TlNzYKV2pbTLY8mGo3TjBWS0iA0/IPLEayKiwclx44RUNd3OKdY20HULhfHywGR1xmhpRjc6pc0QXWaCo12KjRJ74uZ4Fx+5+Vb+9rYjXOetymDWxJtjZjjSzjTDi2O51GNW8OzkMmNz3yL/7Kk/58+OiAYh6oLdi130nyn5AOJboDU7Z63EKhhCu+Myz9pVoScd0E3Yf+AAZfg9edgXRtk1OAWGRUS0biVpKwHcHe3LxhYj+qXCaC0zWhnoF8Tdl07hajlCwS3Kr3uBy39F7r3tIH93/UH+9p51DmcnDQNW2nBErntgrRhmYN6EXslYgTwYNjOOSaH/5J5v51+ewrkWBCHqgnMF//sfewn90lOwvIVQENod1h3zQmnFCtpABPOSrBraJVYOLEM6zMWTH45oBqfEui4hIojX8qsXoEAalYObTI5sMd4qSRnvn9IvKZz80IN3jFyQAt3r3Rcj2Oc/t71arrj9Xt514z18eOpsoJRs5FyvYDlbWykGpT22GrUs6+6YQBlmbFyYeMKXfzbfFBENQtQFu0vQXfGKZ7Ow/ysptoGnAWsTrVCoDU62XYI1nw9GAOpoSujCAqPF/eT8kzL+vHdHRINTw5YQhFIEL7X0agYmHBsYH27CbmNKT7csnKQ9yTe+2de8MBKvgxJ33RTZur3C6OG89+Z7eOcdR7hFFPdCNiM3K5OaqSs1Uzc/5lso3FFRCsb6JWv8sy/47/5pEdEgRF2wOwTdjf9xhWH12yl5hOQBim3fVd2dYoa7sK3k2rZ1SXW3a+oSK8sHmE3fy8Me8T8josEpM5uuICLNfNihnYLa+/oWk2Mz+qMzRoe2GDHZVzjJTF0vdAl6EcQULTEssWf4wDfLoYOHePfNd/GBYwOHpbZslqE0QVfLsF7a2JfX7cKGVJsTAxmUKYXRw/bxLRHRIERdsDu46xHfDPpYLG/WPrlqTLLdsC5Sb7LV1qRqOlWrwk46dLRCLomJ/jeRJ90aAQ1OGdElEEHF588MYKCdbw6Mp5l+a0Z/bEZ/dMoCJ7nyqzvCeKT0SfDkIer2Gle+Uq64627+9tZjXDeD4o5bNR92r9e54oI1MWcuGKWWYw3cFCvO5tICj33ez/o3R0SDEHXBOY2/9789h/Hil1CGTdxqAcKtFlzn+1xBcC1N0VX/MABJAqp0k4eRZ6+Th37JGyKiwWlhLNeNJSJ1cTDgJpAYCv1Q6GaObhl6dMoycFIGxF7oLdGjIAU9dHtcO/caufDe2+/lIwe3uKsf4SmRRcjeShIOpdQZfp+LPfO6QswKDFCKM92/xBd/zk/4EyOiQYi64NwUdP6yRVh7MT70dShiW8LtvEqylklRmC8Ec8FVQZRucgHGHVy4+OMR0eC0EVlARKueEzBrwk7EIbmjxdHB0M3CBFg5mbddh5E7HaAm6LGtuHbuNT783+WOu+/ig3cc5brsbHaKeTUenpdgt3vqzLEyn4il9d4VmA0MqbB40Yh/HxENQtQF5ybv2ff1pPRJSJkiKogKSUE6JyWvS9Sp5VcRQ7SAt0ydOFhC0kXY9FWy/5+9LwIanH46JY9Rqdc2R6jPEIImgK4YyYxUHJkVxodnnJTbv28xwei8oA6J5Qj1XuTgUT5y10GuvucYd4iCOmYFx3AvVCVn26vE6gqxerWrwxRCyQPDgvK0L/lJf15ENAhRF5xT+F983ZMZT56HlwHvqgudKBQUFfD7+LS2PrvWX+c4ZeZM1vYz2F/z+GfGcERwZlgeI9QssLjU0quBdlbq9U4dFAFzxseGk8vULfQs9B19l9AedN8spl/3Ine8Ru66Z50P3XKEG9cLMyB59anz4lDa0IR57aubZ+pcMZRiQFEGEmV1ga948i/6QyKqQYi64Nxh7ZO/icIiYBQE1Ofj/MynD6FtkKBe9tyMUoxSMi5KLhMW+DGRJ9wbAQ3OUNUtbw9Wc9xGiZTMHLVqYZJwUnH6TTu5TF1KTEiMBTqB5NMQdXv2DDvKFbcf4+q717nbElIUL1KXHc5X5bjjVqdfTZQibWhMqthzFzZVeeglG3xtRDQIURecE/j7/ttXMV59Cu5TXI3UPOgEQ6S0LYmGez3aDmyKG54NbGC8vMZ044/lMf/ijRHR4IwRVrDSNpZgqNQ8Sm0BSAjqQnJQg35rYN/JvO00s4AzwukFul5jVdhe5cafkUN3HeZDtx7h+vXCDCGJ4fM2TgQXae6cbfWwSPMCKNtXxOKFjbUFPvsJ/82fHFENQtQFn1hBt/4TD6FbfQHFhrrey+edJGBmlNofvL0V0du2RDMHq4YAKmMSM/ann4qIBmfnxByWtxe/ihk2OJbdaUawjkotvyYRdCisnczbdsIiygjo3Rj5ENfOPf3ssI+rj25x9T3r3AkkBVehCFXQtbIEOFKc7eKF0x5twb0wqDG5bI2viYgGIeqCTyzXlX9L4QKKDZjbcUbDBW8iz60ec9GHtF2vOEjBugPY1lvkEV//jgjoHtVgZ3vdlg+Tne6mAjmDZfPaFDB3rhOR6pIozv6TedveWBRhJE4vykj7KL/uZe58uaxvrfPhu49x3XphS5UEGIp723Dt3i54jmar4q40l6fsiCl4ZuOCVS578g/650RUgxB1wSfmRnzlf30aMvocStkCfLu8Oj90Z5N6NSGWZkLsjovhZFLXIRxixX4lIrqXeduK+20XnEWV2M9HEOu5Z0YevC6Y2E6XiHsVdh0n11NXOpaSMkLoEfreTs60ODh/WX4YVx3b4tp717nDUxvCOc60zqugq+dPaXt1aGbF1frETRnKDD7pQr48IhqEqAs+MWyufj1mgkgGCvOVETLPws27093aFokq5qRtj1A1dDSmy2+Wh3/zeyKge5h7jy7BHWcvW2c2Om5FWL3FlsHqsmHE57k6R0xwd5ZO5m1FWJTCSKAzo5/m+147/+Qqf0J8mHuL9/wH2RgSV9yzwa3rU9ZdEXNMFBNpE7C12prFMYWiRsEp85OzALOBsi9x6Wf8sL8gohqEqAs+rvgVP/JP0dETsLIFLrg4gtUFOW1LxHzOq91akfmpppCk0HUdyB3sG/1uRHSPc+ToChs3r529N7Qx21PX7niBMpQEw3Zf0/ycNCgnuVFClQWEzh1RQRcm9x2U2Bi4MD7MvcfyE7lqc+CGe49wT3EMoZiTC2SFjFMwCpBNKAbN1Y7i3jqQlVwKs0su4J/w+rPcjhCEqAuCEwo6//YlZv3XwGxKok67Ytt6rYm42oou8+WuH3WauTjeFVTeJg//pjAa3uuUYR+bed9ZFHVLeG5PE0a1z9n0pAzU0ld1vHaEmk05qTKqCAsiqAqKoP5RmbpBuehv3cOSeI/xt8+XI9PM5Xevc8fmjA2tU66DF7JRDzeKt3VibeNOmT8Ga90ja1NjGHUsPfc6viqiGoSoCz4+fPBhX4+k/XgpmCdcBFVHOkeS1bNJ5KNSHPMBCa8TskDJt3Hh/rdGQAMG1jBfPWvvZyxvNzLNL3FlANuU479rrUGgNbg/uKhzJhTUBTFIH11+nW7x0HdewyQ+0D3IJVx+2Lj+jg3uLlA8kV0YsjMgDAUyRqaQKRSB4tJKs/WKaKaYbTE9sMjnfu5P+qUR1CBEXfAxxe/5yceQlr+APFTD4BPZdImDY6jWHjqnejPVKf8Cvo7a38hDvjJ66QIQX2LKWRF17lcvommCu28bECcVugSW68Rr3SRBm0oEe3Ah9vqrfdGcsYFaqSf+7KN2vw5TLrC7QtTtRa78JrnHpnzk4Dq3bxY2BMCZSc3OZYSBlqkzyO4Ura8mUg+oZdsuoWsQ68OCEHXBx5g77F9RZlpLWi0bZy35UeYtv2WeA9lZcT23N4ECtoXmW1jr/l8ENGiibpWSV87Omy2MQBbwuaJT0AT9AihJBMxQM9Rb+lhg9GDvesMGnQh9e2QRgJLv+1SjwtpIT64/Lzj/mHRcub7FrXcf5V6pF8IiUvvqVGvZVbR+7YmMkJOQRchAtkIpHSUPTMc9T/28H4/BmyBEXfAxwu941ZNxeRYlzxApiBjby8DMaV6a2x7q5t6uazQTWIdsFDuGzz7II7/gQxHVoD4QyBpwlsqvwwT3RcwUR2tRS5Q0SZQ80ZpBqed0M97B6R/sXbtNkip9qvlpR2D00X9K2Le5xUJ8oHuT93+/3FW2uPbIBndsZqaqYJnSHmtNWlbOax9d7bfzdlgdoHChzDpmptjyAl8SUQ1C1AUfG+5O/4JSrG4uTPM9roZSqlWJ11KrquHuqLTfq1YdmcSATczuZLl/t8hlGxHUoComWUO6syTq1ieI9PWyJoomEIUuJbyMkiACqtTOz1Yme1BRd+dHWOyFPrXFsTgwfNSFVNgncnL2KMH5ydbAVetb3HFwnYOecG+CzXdEXHHIpT72GlAUijpFtH5PFEPZGguP/9Kf8U+OqAYh6oKzin/4Zc9A9UkMeYZR5wZdq8mwWR2CUDeSV4MIbRtfXQripWYxPGN+FB+u4LHP+XBENdg5wXQN789ShmtBQRIgqICj4G0jp9X1YNQ1YaptPluYvP5Btlp0i4yT0kmHpXZ+zz7q9yRlbbwUmbq9zK3/Q27yGXccPMq9s0JGcRLZBHPBvTaluLTdsOJ4EVwUU6kCDyhWsFTwkfCPI6pBiLrgLN90155PGaoXXZoLNnaWGdLsNQu1x642Ks3XgkESR2QLy3exKu8Rec56BDXYRrr9uJylXrR7FKzePu9zDpvQNkjITrZOFeiE8fKD9NXloywAXRJEBU/pH+b3usTq2CNTt9exGTdtZY5ubHI09dSyRluOKK1lpQ3okLW9UneflLo128SwGWyZctlzf80/KaIahKgLzo6e+/APPQMZP5YyzEC8OvXbvF9OcBNKlnoWudTtEdt369qknpIBG3RyLY//px+JqAb3vQLJAVTPUobrCHjr4zRrX9v873Go1VjVlrJTHGFy4EEMiFVYTEqXQJNyvAHjNn3HmsFKfKB7m6V93KDO3Yc3OZQNyKCGF8etLU30gpe6PNGlNqfsXDfnIq9jcHAO808iqkGIuuDsUFaez5AFE9s+UwzuK96agKMJO03NzB8FEqVkih1kefQhkaceiaAG931ySBfQydlx0c+z6iLng2PZ663Ua5ZZmlficadsSziPsQeZWh2xKEovqZoPm6Ef1VJH17PkHbENYI/znu+Tw9OeG6dwbH3KJkqat6RkrxdKEXx+yTQ97tWR5oNYfzQK04nyuCe8yh8dkQ1C1AVndq+98ZVPwnkCxcFVIdXMm6rXBvTOEHVS583pobo9GLDt5yqO+TE838RjF6+IqAb3OcfclxBdo3B2NjHMZh3uig9WLcFKtRi2WvByx3xnqTptIWy3tfXAwxLDwJK1bF5xkjt6/KDEH7kvj0aMu1GUXwNImWu8cHBji3VLqHs956obVJ0yu8/PgbSZnbKzPdsymFFSob94xOdHVIMQdcGZcVie13IZUn30j89xNIcvmLu41l+U4/68iINP8XyIBb1c5IV3RlCDf3D9ERbxcnYyXP2CogpWDG8rIyzvHPWWaU3guRtuRhoepKdOOhY7Ic1XhIkix6vArQ0WRiM68Si/BvDhH5A7zLhlNnBkNrBldXzM2qCESV2WaAWMDCUDubUlA7kg2VCDlGeUfT1PeMxP+EMiskGIuuD0MijX/u/H4Po0POd5L9JO83m7JEHtU0pYfRY1R2l2J+2wsgF2G/vHkaUL7oc7Rogvot6fnfcbOkDwUvvprNQ7Zkt7tMycm7etErVLVCcPIupSx0SUTgRNzSUlLeyUcg8fYjn1pNSxPz7TAGC0xHWaOLy+xboI7kLGKO2JOFeZVzN3olhdulOzeXOyI6bkzhktd3xORDUIURecHvfc82WAULyWVeebI0QctE610lyXrIDPd7ti21sk1GdQDjPK18ol33ZtBDX4h1yzgssEP0uibmNztG0cUQaw0qxfcTxZ23VSi7Lg5pg7KsMDr/dKHRO8bqHAEQE/vvwqd7MwUqRPrMVnGgC88yVyjSfunsHRbAw4LolMXQdmpZkRm+ysChOtzQOq971Dz2aUi52nrX6Hx0NDEKIuODXcf+EAvTwdmCJSPelEDdfWN0e7HTaxN18cATXv4dShCvMZlg+y3F8ZUQ3uX4Tdsx+nxx58VdfJIeOWi7PtfJzP5yN8PhjREnaYQTFDS//Af78qYxFcpZZtMSx1O5m63hl1AiOJQYlgBxu4vhQ2NjIz19Zb12xNpJ1HFLxUC3crhs1XE5vjAoYj2SirwtKlF/PpEdUgRF1warz3ri9EZIRba/Ewq8+V84yHG67Vsy6ZkdrX3kquSQ3VgpV1bHobjxpfF0EN7pdD6/vAlZIn7r998Rm/37HNA3iurejSbE1qtUtQr2KuLbSrkxNQBCn+oKJuNL9QimLaUWRhp1AmI5YUPCUWf989hiUCAC5e5trkrG9sMTVH3NDiO93J+XgB2F6L41KqoHNpfXf1VB0eNuKZEdUgRF1wismO7jOw2RZWCm5lR6zJvI/XEK9JD/Eq5tzrZglJpa4LkyleDtPL1SL/4XAENbhfvFtEAPGODT3zCdit2Rrmep/5wm37HS3mtVHdvWXc2r20kwfpqUv0orW5vUuYKnnU7Yg6dVZxZASrts44PtgA4I3fKvdOJtwqykYuZINkBbE2wwOtp64+ZJjM7duVQjWSMhWyCyUXZouw7/E/7E+JyAYh6oKTu8e++/ufB7qCl1nz96qrvkTaXKsXVGs9y4qTm2vEdkEhGaiRbQORe3nE4jUR1eDEJ5wsg4IgHBvOQulSJ2ia7x6uuyNo52bq81AwlCzShB2YZbR7MPPhRK+yfZabgnX9TvnVNjhgVdStbNwatibBDgtrXNmPmE1nTE1Butbp2cqr7QHDDEotxlLcKfPGliS1D29W14fNLhhHCTYIURecLKOVz8XKDDpHtWbdSF576+YrwgwwQ8Tr9KsaKlbFnteyVynHGMltcuA7YkAiODHFV+p5lWBWzjxTJ/2YJr7aSEPLhwikvuQdnzpTwaR13Fl5YFHnzkQcSa2p1AQ7fvlrLuxv2wJWNrYeeOgi2Fu8+evlanWODIUNE2YGxZTiSvGaOS6umJRqlV3atgmM4oZ5IbtRKGQXttY6Hva4H/eHR2SDEHXBAydNrnzlZ4LuaxaYO1hpvyrgLhw/c49SsyHzCpdBmQ6UYZNxH710wYOcdGUf4LgrabR65m9oC3WTibBzACSQzo8vfbXylzl4fhAh5jBCa6nMDTHHNoadnxJJrBRDcBYXhii/BvclT7lRIU9nbInUoYj5/0k14DFJ9UCrxYkrxZxsqWbximODU8TQfc7TI6pBiLrggdnIzyUPpXYbNTslK3WZkpfqtESZC7iaD5G5eZ1AMUEwfLZOL/dy2b6rIqjBA2uwsg9xARmxWc7criHnxbkKa691Tau64EIxpBjmzYzHqL1LWR5Y1InRW/UMqxdNv++8blJW2kzGwiIh6oL7MhOuMmFryGzJ3FXHcRMcx8l1aEIET7XHzuY9d+W4LRQZmDl5UXncQ1/tMWkdhKgLTpCJuPWXHovroymzWd0OcdxuV5VafhVxRK2NbPlx+1+r1YniuGeETUZys8g33BGRDR4Q6ZaRpMACg1xw5u/HqC0BO+5op6i7zM2H5z1Mg1WbxWH6wKLOoGsWd0iq2ZX79NTBajbEYTxZCFEX3Jd3fpfcUAYOojCrAxO44qUdonXiNbfRtHzcIEUbS9vZGQt5BAv7DvOEiGwQoi64f+46+nmYVfPgpFadzc1BC67WzIWtpSnq06VgtSuJ5qYkhg1buB3jIonSa/DgFFuhOJBGdN2+M386kW5btnlzgvDmSlecYnh2fFZgGKAUfMgwKw+8+1XmV8lSW0qzwfHlV4OVXJsWRhtTFuKDDT6aYcodPqB5YBBBSmnWJYYVxWgZOpf6dTuvnDp1vd334vXXZf+IJ0dUgxB1wT+8D/qvXUDKn4KVKaS5zYOhqeAYYnXfkku1NpnvzyylWWSaNV+wjPsmlHu5cOnGiGzwoFh6OF3vjEZjVB925lczlyrbsuOlbtckO6UAYqVANjwXGArkXH9tme4BRZ0gWvvv8GrDfZ/ya9cxaZmVJF0MSgT38/ySuSHXi6tY3sm+zZ8KXDBSK8kC3jLC7nipYs48VcHnyrCoPPQ5PxsDE0GIuuCjueK6J1PKBGSGSEHbYeLVm87rRgmh4J5xrd51jiFecC10msEGsm+xkG4SedFdEdjggR8mfJHUPYyuEzrtcTsLK7amdZTBSxV25LpVQoojsr00LFstc9l80tBJD6g9BXXqTRarZbBF3ym/JmHspf46WViaBP+QR17ILcVYF0VJDKpgrVdOvHrUIXUqm2pvYghF2yGl9t+5bz+2JNZ5YkQ2CFEXfNQjpDyTYkP18mq7W4tVByWlrgmbb5ZIqSCe60FBtPrYOYUiM5JtsjwJG5PgJK8+MsE9Y2ZnZf9rLqO6ws5qS4DRGutwVKzs9Ct5dnxwvG0qfkBRJ05nQKnDEskdyceVX1PHJDe7RhP2xQcbfDRvfKkc29riFkt0pQ7oZK8DE7m06VZvq8JoPnVSvRQLUDxVX8UCWAIzMsplEdkgRF1wXLbkxy6G7uFYmdX9rtRhCNG6AqxuxqybI0RLLb2aI1JInkmSSWTcSivfHuXSi2+IyAYngeA2wizX8qiehf2vuri9BEzmC8HE695i9dKaBUrdDGvNEwz3B+6pc0hUHzpFUHN0lneunWIsltz+RkLUBfdPX/jg3EoHpaAUVYqmlo1zighFBNNaaq1mxGBZ8CJYcYoVcGHWJ1b+0a/5J0VkgxB1QeXD02eSPeGlkOa9dFJF3Hx8cO5/bgYu1sRfW2jj1ZI4SSZJYTK6WeRfH4vABidBB75Uc2YmlHzm5sMqC3VKu0mx2p/UzIjFrPYn1aPUmVgzMDmxqHvZui+aoMWo7iggBoxG8wcjX8ZZym2yVgoXxEcb3B/veYV8RApHUkLIZHVKp5SOKu7m5dfaM8B8+Ta1YoJT6t4ec3z+PZnyuIhsEKIuqAz6FNyaSUkrMJmx3ekB1EwHIFgty0q9wGzPw4pTqKvELuqvjqAGJ8eH9lFsieKZnBXnwrNwOZvg2va9NvNhh1rB2nE3aUXZbenn5cTDDQfvpSu2M0jhiqQO11H985dvsNolJl4nwt0kRF1wYtY3uE0S4zL3qnN81l6PP4pVAYdWMZcc1/kNe8f/fZoLl0ZUgxB1AV5e+wiKPKyaDR+3KWJukCRScw9JDW8mw8c5m6Dm80FZrDhJjnHRZTH1GpwcG3ddhKQxzSKY1K+6/9G+M3pP0UlVbgokcBVcBHPFi5jX3J2Aq2LeGgsonLD0O6zXHrr5r7PVP5M26vfuPcKSwKj52JkqK/HhBidiNuNaEXpSPX927OjABTl+X899lvcc9+skeFJQpeiMlct+yR8bkQ1C1O11PnzD0xETijt63GkwNxs2aEn/5k1XZHvThBep4s+lFp1Qerld5IsPRWCDk2Jr2E/fp+1VXiklOHBmxr0ik9o2oHOR54jUVXaibrXnzUWYZ5/nZdgTll9ti9Qc74oZ7kbx2tjuANMtFhA6ILthxVlx9+X4gIP7Y2mBawaY9YmRt5rIPzyPdwRfyTur7VrNhLkDIwYMsN9iYCIIURfY9FO2S6/mVaTNX5l77hchm2yXWk2c4rL9Z7y5RqgIliJLF5w8WffRJWreTECkg/UzW32kOq5WOwWkSbjaY+eQvJTqupibgbBZbTgYuM+24/uweQ/qtXs0F8gqZDPyutW8iQ0sJ0Hnc+MCS7fywL53wd7lXS+XOzcPc3efWKKAtIYWqT4Dpla/51LL+anmmr3tiEW85p7bYwkJhm7GwyKyQYi6PYzbmy6pPUyeEanZtnl/HOLbwi5JIVXvy+3hiflUIeJInSoEnfGQcfTTBacg6krLZmndxqrScejwmXm8mY/wtt3Vfd5v7nWHsZhVO2IrVvVcdkoxipcTi7qtQ6gZ5jDgDOKUbJQ096kbWBGhzxnKgDksXLcRoi44MYeOcdV4Qt93daOEVA/E6lVXH5tN2tCEtq9dMO3qZCyO51yzzBRKt8XSJW/0R0RkgxB1e5X3fuipoOBet0a4GiLN2tLrCjCdT78azLdmWsv+m3vNX+BoUjTdKRd+S2TqglN4spgtVws5q96HiLKVVs/sTUtXz+km37wtd5U6yFMgl2o+bEP1rLPiZCsP8I4JbbtTsjch6EberDPgrA8cMKPzunu94Cwdvie2SgQnJo24Eif3YyYGRbrmkp3qMV8LJjWZbGLtqHPi7l73xVrthraRYIv3ENYmQYi6PYvwOIrMMDVcCyKGYqhWSxOOE3g06xJXIzVfc8EoVKGnSeg1snTBKYq6YbGun8uOFQNTctl3Ru+ZLVXZtj1HWLdLFAelWF0YVkpdFea54INhOZ/YfLhMEReKQS6CFasNCXet1+xeLlxYDC1QSsbzwNq9d8b+1+DEfOD75LrZlEN9z37zlnE7bgaN4yZg51uMYef3pHlZVluPnTHsn3FxRDYIUbcX76X+pgvouotQZkiqWyQ6DBfbztLNy7Ak3xZ5dSCiedlpqaOwTfStTULUBad4Iso+RBxtDxQiHfQPO/3z2pdQ15qaKwUpRinNvMQca26L9b+6WTUftmrmesLr4NYmaTAYCm65LiArhtm0CkF3LjYnedvfacJyTizGBxw8ELPMzaqsqTKWmnGrFu9Nu6Xt8xqheZkU6oq6AlizOgFww5anrF78a35RRDYIUbfX+MhHnsisdBRKLamKU9pSJVqiX8R2MnTtdkhrFxcpuFEb0hWSbfDwlZsisMEpYfawlhmmvqaE9Wfg8XZLh1k39xrGtU5xe+sRVUp2KDXz4W1Owtwp5ie+Di5Qbblb5qRmRsqO2USXWLPSHn3AFSb7FqP8GjwwW5mrmdGNhGVmVaB5y9ApVcB5G5CYn39ynI8dpQq70n6vFvqHH+WREdkgRN3ey5A8HjzvDEY0DzptJVdp3xM3ZN5fN/9vXr3ptn+fjBC7TeRrDkVgg1O89FyKiSOq0AmaOjrdf/rvd+MI1Q4EJNVLm6jvGEHgVmhTQa2xgJa98xOXX9NydWREqn8PgCRsmmv5VRKrTi2JCdApneYovwYPzEUP53p31jWxj3plNVM8C14SNrcLrX7vO4JOWr2kfNRdXIRhycKIOAhRt7f0nP/pCrN8CclnqFInWo83FD5OtOHVzbxa8M9/Xc8YlVoUEFmk45qIbHBq56Evov0BXBySIgmMBOUM/N0uGCGaEOpUdtJc7UyaqGsmEN78vqofCeC424nNh5mS2iYKaw3qJXUUq2v1cFhp68jE6xL2tDGwFJ9y8EC8/qvlDnPu7nsuyELKRvba9zlfnFdFXBN089Ir7VUUFyhidY+swdBl9kdkgxB1e4kPvOPxuC0wm4EVwV13zoD7s8E8zoRYte17BUyhyARPHZQQdcGp0oGsoFJQrfu8HAU5g/Jr7gCpXXNebYJdagu6FbA2wy1ti7FjltoeWDlxpq5TxB33euOsTzm1lJsBBJZK2RaMLgKDsxofcfBgTDPXqrKkHWNkp0euXXmrcGvDEKK4aZ12lUSR+ZqxVHfEakdRY/TJv+VRgg1RF+wZtrYe32atWlZufhbM/elc6tdN41nbAdvGJ+rXqQ1N+Cr4jEd2t0Zgg1O+7nhZqtOpSL2hZWXIjzr9tzzUV43lBW9tc2JW7YbNTao5cDFsPiSRM3jdFHHijRKKuNRy2Py1A8/O9Fvf6fsQFqxtRTZvc7cDB+IjDh6MQbg8dWg/YsUcTy2LrKWKOIDSeufYKb3avAzbTIkNgwHQQl6+h0sisiHqgj2A+9sXmSw8HJUZIk4nTvJMomyXYZPk7d2vSQ10vpSwTcDWd8KtI6V99NwhSy85GNENThEBn9TFW1kohWo9Mj396b2Noz0F2ZFtxx1iZeZYruu9LBcsO2ZGKYViw4kzdaMRFAdP2PwxKDvuU2aL97Js3kRd9b1zg1ISF8ZHHDwYT/piruk6NiRxYHDEuuY/1wYgrGXr5kMUGNbKrkZ9vN4Wd+6ICXk84+ER2RB1wV7ArjhA9kWKZUycweuR2wSsSG4D9AWXXDdGtCEJpQ5KzPvpzEekbhHNV0Rgg9NQYGPMx1ibJ6154IKKu5/uqjBP1OpoBi9VvnmhznaXXKoVSZlbExe8HZbLiUXdVq7l11JnwL00B8e7Rmz6BiuzGQvm5Pl0rBWsDKzFZxw8GD91mdytxt0CDxEjuWG0Hjqpe7e3DYaFumlinqXT1L6e99k5TiKTWXvGqz0eKkLUBec9tx1+DDqqH3mSgnTViEHmpsLzbJzUbRHuVdDN14Kp1e/Vs2YZXBnlD0dgg1Pn2otw76o9Dm0/q4PnCfzl6fajdQiOl1zFos8d6QruVdRlvNTs3E4Jthn1PODz0PbuY5CCoPiTns50NGGlOKPi5NbFh9eb7kp8xsHJUAo39z1rqWexZPLOrDbuVchlg2LStkkoxdo2CWnCrp3LzAp0mU6Fh0ZkQ9QF5zv3bD4KtwFJhqqjGH1XSFrq/tZ5xqSVWVXrbSpJJqVShaCUmr1La2g6wqV+XQQ2OGUO3nRp7RpyqyYjAGKILLCxcXrDEhvTcZVfTcxRMm4FyHjJ5ju5u1L3THgGy7nmoH9/3e93YtVqpk7a443gpE7wX7pMNiawnAudGcVpZdrqNrEcH3JwUjdg57oEo0nPKlZFnQvZj5t8bevBbN5X52BmO55120eBoWOmUx4SkQ1RF5z3yIXknHd65Jr1qlFN+OcbIkqpreOlOO6F7NVz31NGUoaxoP0qIvfK0svvjLgGp4wNqwgCUupDhBpoIcmIe4bT6wmark9qfsPyTnHVMljGrFjdJuHzudjWdFBVoJPu4v5LsLqFmqHmiAHFdn7fzFk1q5Yn1oxTvBaUl909tkoED8riEjf0CVtoK8O8J7tg0pGr6wCO4F0rudZsdPs+c4eptnUiQRJy37EvIhuiLjiP8Xte9WjydIJ4qVOvrUgELbnR9rxW5y3/B8f8zwiG+giXRSCmXoPTFHV5goqBlWpiXWq3Gtox2zy9HZauE6zlMMTnq8JK7bGz0mxHarmqGp94mwlyM9LRE4g60+NsuHXbtbHOgmdWrP10YNWcuEARWNzgxH16QTBn+TJuwjiWOi7MoJ4pUiepHaWoYdr86zguK7edxZMdQ2IAOrJnlh7/mx4T2CHqgvOW27ceDUm2t0fs3LLmp4Fve5Sr1H2vx1ueeNsoYWLksozSQb4lAhucFjNbaXKqiTn3akVCoqTTuxkZ47ZQad5TV7PNpdTCVJuxte0qadNntVM0cccJbE2OtyWerxPbMfhZNUOt1GxKqV51RZXxoRB1wUnwE58qtye4Q5X9o56JWc3UKRil9tC5YC7Nl27ec9e2Ssz7QaVl8MzqmrH+ILEHNkRdcN6yufVQbHDMpLptZanlV6pfnbqj6ohYXa0EmNTm8brAhu3DbQ1zoxuujsAGp8UwLINXK506i1pL/eCYnt6KrSH37aGl5jSs7ZFQz9QGA/e6dan21NWya71JCjKa3b+o04QjrRnBKe5IsfoEJMJycaTZpFCc4kYuRn84PuXgJPHMrZ2w1icWkVp2tToJW+b9c1J3wlpX19GZgXUJc63GQEVxUhV5vVL25/BKDFEXnL+k/sI65OA1x6Dqx2U4dl7nWTppAg+vs4E6H6CQMSntB7Y4sHRtBDY4LcpsBUoVcza0YpM5xRT89FZsiXStraAgktF2gKNSs3PSepKkzbLWV3dH+mN093uBbBYmzdTHDWy+TQJhpcwNjOeCEQYrjG+44/7fLwg+mhncprA4TuyXoWbpZN43p628qu0hROqOWFN8mD+UNC+7Qj3E8VRiAjtEXXB+PgX6j1xA9gVy2yTBccMR8146d4dcM3J5qLct5t9vq8EojrMAvh/xgzz0stsjusFpMeSlKuhyLcFiGW+bICxPTus9p0OHatk5b7G6rbVJspqpM2jfZVukZYBpuv9y6YxqfueGFwOrtdsMkJTFYpRilJzxkiFnyjAwts0ovwYneY3uuLYT8uISa7lg3lM8bT/quHW1W1Slir37HPMdsW36tRTIYFszlp77+x47iEPUBecdV20+AuaeYOKI7ZRbt5/t3HH1OgU7H4woOxk9TSCdk1jAWQPuFfniYxHc4PTuYrbS+t9qD5wPjuQBL0avp2cH0qXUhn+OG/KRZkai3qW2n5U60ADbWTo3R2YnEHV5C88Fy9YMkoWiuYq6TljOc0NjwbxurBhc6Acnpl+Dk+KCfVzXwfqk56LRuJoQF6/ZOLF2aBVwqZ53nmhNm7azUqw9vJCrv10/DJGtC1EXnH8c3XgoGGiyOnGoXltuvYAYRWy7xCqpHq6OaS29JkrNfBQQXUJkgWKRpQtOH7O1nbbvUmdSsQxmFDm9G5EPI0QUSSAjkB6kA+kdUU/HTQm1nZk7/XegkxNk1nxEKXXvyuCQzckzmPFNvkxiwYxtD7zBW/nV0aPHzo6o++tb/ZPihDm/GV3I7Uk5PElc2MHYp61n0+67XaI4PpTmV9eeiESq6LOP8rCTGd1wKKxNQtQF5x99t78+vLXLQyeFrpWpkhe6lsGrOQvbznD0UkjUy4o0ASi6gqvS5ZsjsMFpI7JGad0/UM+vLI6LITo+PVFnY0AQrRlmSZDUEQFE+gQiqNAc8pq4m+c3hhOsChtPajpbnOxUB0fLTB86YSLK2GAoVCdHq7tfczFkY/PsiLq7YX+cMOc3r/k8OULhYNezNh6xbMO2uVQdVis7R6J6Ipq3bF3L0ongluqfU0eko4xmce6EqAvOPwZZIMkM9yroSpvhq43pbafrXMz5jrizj/aq68C7/QgbJL0yArs3cP+7S9x9/9l7P19CdA1pwwZzB646CWuInd6AwXx6VaVe1lITdlJl3LaOU+67E6xmNyTbCcyHa546l2qQkkWZlcTsggmLDiODWc4Mpe2TzXW3LF4Yn414HTzMfnePMtp5Ti7crcLKZMRqNgoFrO113T4zjztDU4L5urDjByqkq5m6pJRuSvTU7UFiQuu8viH/yAV8cLbIZs4oOxptfuOb25Zoy5gYul2lKiYkrTYoKo7Tk+QCXO/lgvE1Ed09wh03r3HhkTFw8Oy84W0jRPbhXqrMmk9Wex0ezZundyNyS7VTrr5pfV71Ku7avZG5p1fLbGg1+HF3xPX+H3AHw0fOgIAYgwuz2ZStcceSOWOc7IJLoUgilVL7n8qIhbMRrTJw4Or7uuUF52d25Y4u0U3G7C+Ka4KSq+G1SLUroUBJIG17hFTbHkyxZIgLtceuw3oF0zhv9ui5FJy3XJUvxD3heWd7xPzVZCcL5+KgoBiqVq1NaJmT7ddFRPaR9B4u+fRYD7ZnUgibB5jmtbP3hgdHqKzUFeQCIrZT+reBYqeXlRLvcCmoVL87pw5J2NxnuD3n+LbpMG361c2Qyei+Cbw5i2OyGbPkzKQeuZ8x27/GBOgESmtst1InZPNgMDvG6lkRdYWLbnAmcSKe5z9mA7chpMUJFw7rJDUkCSKOSkG1oEj9Xjsvqsg7rudOBJM2IWswSKF77rUxARuiLjh/cB7OYEDXJlvrfQ0xnw//bVucuDuefH6HrNm7Jvwcw/plPC3jfrfIZ21EcPcI6/ZQ1oeHnr03nC7iPgFmrRuoeSLidf+wrHn5xUed+pVMOoQ24S1WD6y9t6nW6VTq3jDP1VOuNhoI5vkEFiRLFBGGIswMhlLIx4TZuGPRIRUnWx31sGxYttbcUFg+G9FKhYceuzEmac93rHArmdR3XDwe0bVuUEUQFcSluocCuLUHkLmHHdsd067z4QmhWEL1atYiuiHqgvOFjWF/FWallVitiTatwq7e9OqrU/vqShNx5Tifujo+u4p2PYV7IrB76W5jF7I1fcjZe8PNBXDFLSMtp1AfQKoJsapy1/qply7de8DqJG0xvNRzGS2ghZZNG2o2zc2wkmsPXDak5PvP1JWeIkK2GVYyVupgxDAZMXJHrGBt50o1KK4bbRn87NhJpMJFs1mIuvOdXrkRYzpSLvSeUS7tMXxubSJ4oWXooJoRtGEJcVwTJrTJWMFmVs/rfjNEXYi64PzB0xKjrk236tyUtd2soXaR1ztie9kZlphn6rR5ffVpmS4leu6OwO6R08evXsSGhzIrl561N50dXKluceS6dEvqvjoBVAuCYnbqWS6RDndDrO59NTOklLYHNidlyAXLBcsZG4bqP1eM7AUv5f5FHRtgBW/7N80dHyt5MTF2Q23HvtusWpoY4Hl25uXX16/7ojsHip+d/rzg3GXpWdzhmUOdcmBxxGLOlLbzRLztPpn30AFIh7sgpRnWFeqraRV/GCKKzzbPTsY4CFEXfMJvyL+/BGXEzEs1G6b2yiUymNNh9XvzJbBe1zbJcb+ui2kMLwK6hhmo3RbR3StsdLheiHVnL1OXfRXDoAy4W91cabWvzopRSmLmp5Op62r+Amvzp1XYYYZlGynZCyXnJuwMmxUsO6UUPKWdG+ZHizqvGThr/Xio4X3HuFSbbi+teOx1WwWloMXPPEPS3UsH7GOIhvfznZ/5DDkkwh29srZvzEoeyKll6VQwkzbhWk2urXgzJG6vsJPFK4YVrYbYZTPOnRB1wfnB+nsfQik94nU7pVJwzZg7o5TryvNibea1ll5riZbjVi21rqOU0G4FozDyWyO4e4VZR9cdIPX7ztpbHrP94IbP29rMtg8zR0Tw7tTLjSpahWFbh+65rWO1gpKTkM2wYthQ8GHAB8NLqftcu/7+33aR+q8Tx6nNeAKgXSu/HicF5657UtsZzjhDcuhqFjSxUjRcCvYExh2aGC+OWBmGuipMpP5wqFbzHzE8HbcmrFPmm4h3nE8UbR52uWycHWudIERd8Inmdr8QVJpwK1XEUb/OVs2ESXWxuWv9b6Jt+lUNE8e0Gp2QepBV8AGdHY7g7hWO9iAXkOTsTdD5dKU+NORaWPLi2+dmHc820FMXdW4dVgzy3B6llmFrjq1uO24DDeZY9urn1fa5ejmBT93RhBaD4kgxxJr1iSZGuZC2WwLnpbFqkYI5S396hv5yo8yyO6vDJn2ci+c/yblbBEYTlrMyc6UAWeuWiCrsutoGIFqzeKXexWsWT3eyzQUwwQaLTF2IuuD8IJcFctHaLM5xHbaAKZTjP3pv5Vjf6RCal2d9GEiMkbQCvslSH6Juz1A6tFvDzqKoK7O1OoEt1gZ3yrYAwwsi4ONT//vEFfeMUyhmGIXSDI3NtvvevFpum8v2Q47hmJxA1LFBUtmeNiQpaI86LVMnO714MjeLNUxhfPf6Cd7zZBM3zgRnIY3ixrw3LtkcRPCFnuXZgPdSt5ggVdhpVw+RuiZMwDhulVg5XiDSsstG//kf9BiW2ENEWv+8vUL0Y0aaKWW+3Pz42wVoa7ud33ZMFIqjWm951ascRAquiySdIHoXFz8qPOr2jqhLiK4gbJ61t9yyfbRUVk3MtRyXmyGSMXqO5VO/LplqLbeW2hPq4tBGG0RKzjg0Qdc2vppWH1er1sX3+3emKuCkPfqICzIxVJWRgaiBS3s63tmYbAjj4QwfmjN0C8rI+9gMsEe4RwUbjVjqE+ZWhZsJLoohtZ7S9S3PXfBkSGl38vkVPmfotA5WqCJyR5RgQ9QF58Enq0sMc9NhcUBqUoR6a1K8DcM3y0pAk2GurTuo3pIMkG4B7ca4HRF5wcEI7l5h0tGtL5F89ay9ZfE1oI4YIDsrwkQK5oKYkU4jwyUu9TbopfqjFEeZy7GSFfO6mqy0M5vtjWGGeb7/a6HN6MQRKaiCy4DSkdyZuJPcmT81GY5QG9mzw5gzzNSJMh6PSTKKCcY9Qc+9Aj4esZjYFmWF+tzgIvXp3GqmTrqav3XN1bsub1/6QRQv1TjI3WJ6ei8R5dfzlU2fUKibKL1Nv+Lelp3btnCbr44mtwzHdimsetUphnYTUieoHovA7iWWDUmJTpP7q8+OV5qU1Toq6jI/+ZhPrdasXWE2nHq50QZBS8aLIVZqv57bvNTr1TXFmLvu7zzKuApu5f5LnNMpyUC9SU9V6HsQZVTN6epohpdaxs1WRZ0Ves7wp2Urs5ASnUpkWvYCJXOnwNALy9qT2vlJ3yZgt/0VhzrZaqV+XZpPgUu11Zm/0rZOyOE4f0LUBefBFaKMkLzTZlGoBsRWqjtq+4GnFHCrYq82mdejAEm8PScuIiTcpxHYvUROaBqDCrddf8Y3BndfJHsdlBD15pVo27a94hlxI/npZRbM52vt2toxbwbbyWrGuWY7RDEVHNlpLB9OIJyKo15QF8Sbo/+4rm4aezMztoJnsKFgpVCKM7jRn3F+zVh1oXci07InWOAgxmzcs7g4YWSGdaP7t9rpjlsRVryKPByX2gu9PTjRd5Qux5q5EHXBrsb9rfuRmeJaqig7fluEz0urdRCikwLq5GKYtClZa1slxNBkUMYgQvGtiO5eou9wGYP03LZ0NpqtBXwRZyAX6uxpLvXJopS638Ecun2nftKLgLa1YNoy0TuHaJ3nxnG1OhcOdbjBHeEE5Vc11AxKE4SmeFLEnVEpmDll1nzvciFnw0phao4c2TjD66uwIqBbU/bFuXj+s3/EkSQMfWJlrExmguXjy6rHHaJ4r9WOZ1Q7ord961QwbROyxfCwNQlRF+x2Nq5aJKmgGEmriEtASpA6r0Jt+5stU9fKsXNr8nT82ZHGVQbmEHV7idndK6CLuI4YX3g2DIgF8QluM4SM53yc+XABKYgUOI0cl9C1DZgAjjSB57V/T7vthWQ1YzdfhG5gdSzofvvfRlWJWnLcqmN/MehE6IqQrVCyY0OmDE7JTrHCzB0Oygm2VJz8xXnVHC0DF8XJeP6z/BQ2u448UhYXF1mYVpv45Ia41nNJ+torV5p9SddB0epfp9XXwMTqr6Vl8IYSvfMh6oLdzaGjI8ykZunMSfP9ruZo22teFws6pbAt/AB6c7RUh383Q7OTujHV0fxIBHcPcbhcQN93mHdsjS88K6LOywhj1oRcFXPmO1+jGZXTEEOSas5NHE1O0vqgknSn1CvbzebMBV6bv+VEom6qbQRD6iSiFFyndNKR3BisUMwpuZZdrThlMGYG7kfOzF9OF1gqBfLAxe903xcn5PnNaINZMrxTFicdi7O6c0XQnYeDwXa+Ls0+XlLL0qWdQ/uaqVPBdIj7fIi6YHdjaZGiO9m37Z2vcx+6drM73rsOb9877m5HAROBbgIiCEcjuHuIGRcx6sF9xGRyNkSdYj7fctJEXKkDEuJ12ZZ7ATv1qVGzfrugWhfJAglkZ5LbvU4HGWCONKMfN3Dk/q+FQzVcsbZqpaCUVJvY1Y1szmD11YZMyRl3ZygFFjjDspewmuu044FbbooJ2POd//RUOZISZdQzXlxgUqwZCiv3eeTw+T5YIFMtTOS4NXeieG7/TRS3FPf5vUSkZc9H1tcX0QJFoHOnIG3yFcxle69rzYg42SB1tM2W7cbogNYlYprG1d2rrEdw9xDDdD8Ly+DWk0b7z8KJWXNlhbY5ooBLwUtdsIUWlEK2U89wJekwcSS1EmyiOsy5ICI0+5LSpljr80q9R/ZKPtFdr1NMYFBFrFRr4zJDZYw4DMUYVKAYCaGoIqWWwnzj2JkJMXfWSkHLjP2jHAbEe4GRUsYdabFnPBsoKhQvWBuEQADp2mowrTfw0oTdXNBh9bX1ixYpZ2atE+wuQsGfj6RuVPvi+p0pVsR39rtSb3q4gzrpuJ/543/8CyCqCH2952r01O0lRFbqaWI92p2FTN3tHXhCpY7vzM/J5nFSF3a5oXY6Ga6EiCMKqiCJbTvWOjrRWhDqmjCXubCsZsHN1e4fUIY6K16MIq2Hbmp07khxiktdP1ackuvGWS9QcoZj65yRv58mVocZqsLiZglRtydwrFO6hcSCdFindb+rKK4dVubDD20qVkZ4d9wEhdt9+zgl4QLpueseBtYh6oJdSykJxSil2pj48UMQrfyq1r5f2LYxmffaFffaf4dVQ1hJOE7ZHsQK9oaoW8YcnMRodBbKf7MOKx2OVQudJrcEq7uIMYQB11PKLLi/cRURrb50Uvvq5pOvru1r3LxlPJqQc+pOZDdMTzDUUBQTI1ObFQrCUBytO5rIpVBM6m5O2n7Z7PhQYMaZZepUWbaCW2FBotl9T9BLzQpPRowVsmgddtD68ODavOvE8ZLwuWlVKu38/aizRAyng42414eoC3azqLME0rJy6rVtSZqLP5CaCXGiiT6rB16HJLQYyR3PTicOoog4nZYI7l7KGqTVunmrJDydBUuTe/eDjMAL7lI95LzuXxVqUVS04J7c33YKWa5DI6CJOnPMDKy9rxREDW2mrHVcyLxm37z9bi92/9fCWcFxskvdmOyK2xgV0ONWjll7DNreJetGmU5ZOZNombMyZEygz7PwGtsbz1GYKtp3jNdnlGZEVcpQJ1rngo4MXW4a7vieuvt57M5AfyhKsCHqgl18ZaA6Fo3mdiZzcadsmzlYoTYdzQ/3nQXn81XQUkgJVBKShK4PUbe3TqQlcjOrpjtzA1zb3AfeAXW/g6RqDFztR3xb5KkK3HUq5cZ2S7OCWbMyaVtRzA2zIoVS6raHYo4ZmGv9um2CuN9M3UJXvelE2sL0AmVKXwy1XMuupWz73WEGpdl4D1unv7P1bW/z1WIsGEzF0ckortV76fotwji3K3FR3HrM+nreSrMzmQ9JuCBDNQnaVnE+Q7wg81676bE4f0LUBbuXmSUwmNl9b1RpLuDmmRjbydK5HDcZ23rvXJyhEzzVm6ZHpm6v4O4ruC1hlinm5OHMM0XHDi3jXkv5iDLf6pCaWbDPS6ambBw8+b/Pu76dz6WKuWLbhg919ZjpvOTqtbfO515e4CYUSfcv6iwj5sd53CmehM4crWnB+jhU1WKbpPW2KsxOP7t2+5R9DhM3sibYGKKnbk/ckKu5NZpqEm6Q+fbi+jqvrs7Nh3utGyV6rU9L2ybEzc5EUr2yd9PI1O0Vok/jfGSwVA0cmrGwIfTWdr2qgNbpV5w6UFFqBs9ESE5bsq7U1ZbV7sGhNbgHe4LbOoov4aVgBTo9c1f62bBQ81jQJq9rlq5amTSDETcMZctPfgL24FCvYy4ZyYZRM394W4FeS6ze9mK2OXCfj2g0I5X7vRYWQ0uBlDBxPGdcBVFHSy3NemsINHOMgkg1AsrJT9+nbn1ghQldMWbmTEax6mlPUB2GkTbYSqobJeT47ByKd5lt9yll56FD+1qaFa09d5qrGfHkDI2wg130YBAhOA+xrCi2vctVj18Tlv0+GyTqzbDdaH3Hp25eptV2C1SBSNTtIaYjpOynWKZq+cUzf8vZcsucVcFFy9TJto8i7XxV1sspiMhxqp6KrY/OvQ5dmDvU2VRr47XS1oN5M2sl4S6UYvcv6iy1G+pAXY7ueMloNa2jWP1b6vCF1cqrQcGYyRk8NGdlsYBmZygZ3xLW4pzcAzdkRUQRkY/KrOWdYz4kMT/uYzg8z0AnvLcdIThM416/V4hM3fnIqGvlp84o8zk9IGkzFXYoIiB1iCLVlARJqtGlN/+6kp2EIeqICDOL82XPMOspZQU1QySRWHT3fSJy6LTfcmtYay5aNSsnUrWRCW0Cu8oty8rW+smLOiFVuSbzKdpaaJX5Homq41oe0I+XlU3kZT+Bl1efm6/dcXkOl20ZaibNnLg+PmU3RIVizpDL6Wfq3BlTkNI8/cy4NM7JPXBD7pAEIoJSmwmk05aVq9k5J0M/fygBbICub89E7OwpJtVHGnc8aq8h6oLdTM5UIaY10yYipESzOKkGxKll5eY/7Unue0tJgKvXmzpG6kBS9PXsGY4mhEmzjxOMEfy/NeD0RV2ZraI+1GydzBXSfLeDgwkidWRB5RQHJVygeGsdcESM0u5lmsyqvCttylZoylLq8omiJ9goYRnpBRNHrdobmysyn3ql9uRZE5dmghfDPDGYn/71tRuztGn0XnfJMhzmIXFOnv+oIknq87ccNxQhqWbg5k8JkmofHUBO9ZkctnvqyC1Lp942UgQh6oLdTBt0UKnbJHze6u0CyWkLlXCg+P30Wuh8NL6WbEWtXmq6EHV7ho0F0DXMjCQgeczGxpl51eW8gGvGpaAiuNm2PMLqSq/alSb4KTxAiNUUdFJDSvWps3lKGgHxobrsV2+6tl9lnn+TOhF7v6JumpGRtKnD1pNXtWjdruwZUhWLDHW61qWVYsmnf32dzbjAOzqzunpsllmIc3IPYPSpGlJ5LpS25quWVeW+4ixnkHHNTwPk9pNUfyR2dsLufDfYEw8GEYLz8VNtTv2lsOPar46m6syVrWbpCmybtM4PTdWjLnkzKC5zHzHBbDGCe67L+bO1+L1fwMoqeagG1C4jDq4fOLP3zItIySS3trAr480lDgrWbEiKCHYqWWHTNtPjLZfmNSsnNWOnUn3q5i7b1qx7quGJt43I91uhGt33UUmoOy/ErRqouNQBiVzXjplZtTnB7pMHP2UKXFgKnVfLlWyw8kfusf/1PCclUqd4SmQpZBVMC1ZKneCWGS6zlrVTvBtqZka8ZvG2e+qalx15J2sXhKgLdiuFOvWqrfyqfXXWz7bjS5ePtzNph7YJWdfmxK9OZwX3giggsWrm3BZ0K3Dl2bnxz1gGn2A513KpdxQ/w/2vMsE9t1KrtQVbzU+uvZZiiBmnMjk6kOrCrrmJdpNgNt8pS/X4acY9O0mRakfS+uzuV4BZaq6P1bzYNdUdK21QwnP9l5sJ5gUzJ8+NiL0gP+ynt56pDCxng1wo7gxmrN69HrYm5zudokla6bWvmyTEqj1Jdrz0WOl3NkwUr+V/aSvqOF7YafW40x6LyO6hcyhCcB5STYfbDU5qiTWJQyfbgxHzG1/66HvZ/OffpA7LFwPPqAqiqxHcc5kPLsDhlbPyVutHl0kJhpLbztQxrme4/zVNsGKtz7P2uM3HFua9bu51MMPk5K9Nma5NaJdtyTZfpkSBWlt1aU0IBqhv99VR6u+6/0EJbT51DrT9m24kaU0N7hSRNvJR36quZnGwgrJxms9lPQvmuBmWjaLO2tGrogR7vpOaqHOn0M5mGeOSaznVSzUZzl3bLAHbzlTzPhpp7TWa8CT4DNCFyNbtFSJTd16mbKzgyXYybubbvXN9Mx8eqdPPrUza73Orr6o7u2BzMdwzKQma4qZyLrPxkWXuvunsWF/Mpguog8gAMuAkzM9Q1PuoPmy06VRza4bBmZpfHhDJuLeJnpMVdTk1U5HSZgYzSax66tcyrM5Lr81iuwmy6sJYhxvuNwu2VRBrK5G3X0FLaX0NbZds21JR5iKsCNkU7r7n9K6x2Rjn+l6WC3kw9s/OcFXYy9yjfeJcvyErnQNm5GFW++byrD6QjAwfOT5K+Fiw0XyIQlvptWWUAbT11M23UqQowYaoC3YxQq4irvaF1z2vVo8q+mpPnalUt637pj12HhsT9F4QHagtTnFTOJeZTRdY39h3Vt6rzFbBacLIgA660/783X0R8772zQHSjK3V6quXuq9VvCCST/EfK0j7s/P3AEO1Dk1oGxM6LlNHe7Uq1k5YfvVS++jE6w3T6rCEiODSNJ47xesQhrmQcYoZBYOt0zR9zcak1EnbXOpwx+KM07dIAbj9/8XP77nMr637miqjloHLjGBefhXFtwyfZmyasWK17JrAtG4yMTV8fuSED0O7yQs2lCjBhqgLdvHNfTMjx68IyztCrhzfN9fWg207W87vdiaQYKbCkI0hF+oUYdwUzmU2NkZsbpydEvnABc3fLbe9CYrNzqBfb0OxMqatXa1dZ+2o3zOKG4WCneINSES2M3yuVqdg1bbn/lyqkqxl5ObSUhXdfHjCTiDqxqn2M6lScFzbzdG9ibj5vuTSdpMZBaUoDAYcOXp619gCk+zkAkMxskGfN89s1dPBTaIn9hxm8/2sOLXsXpwpszp8U1IdVxNvvXKGF8GOP3KzlR9ym4LN1faEDCXhXEaOCIeoC3Yrk/F9e+XsONuSBKSOmrlTJ3U7t5FS7vsqImCG5xmWwXPcFM5pUSeLTMsFZ+W9rBxAZUCrSMFM0DMSBQrWY9S1Y3VbavV6mws8oaBuqBckn7yAyYO2Xrzar3d8Oq6mKuqqCmm7X2uvGt6c5tr37vdauJHwAWywqgUHxXPNvhlWd7S44yQKrQRbDHNlMMe6jdO7xs4KE5RBlcGMLEqyfGaDEqMpy6+KCdpzljywbDCyQsmZzX6hWe7YTplVxvXogT7DKO1kkec2Jgzt9xqelupPwuoSsQ4oRF2wez9VLdWkoeUktBksbE+65nrLS630ldSh96b46k3QpfbWCRkvx9okYYi6c5mRj9F0dgYlSlmtyt6dqmug2BlkAQ8n3Ltq54sjUhCt5VK8IFJQqtE14picvKibt8zNs2a4I2bbZsSOoU3QSfs7hOxCsWZJYifIDUq3vTBvbhPh/x97fx5nWXbVd6LftfY+594bEZlZWaUaJKFSSUhCEiAEyMzGmMZMxgbs9oQnPHRju5v2e9jPY792u23z/Prznvm0ee0BGrttt0eMMbItG4QFAoFGEBqQhKSSalKNOWcM956z91rvj7VvRGSpKjMis4RTledXOro3I+Kee+8+5+z9O2v4/SAEWcybkIq2iJ1QRaiqVHcKBnbu+NG1v/pmP12N3isjEaUb1Ek+3lijxELZuHyDKdwJnzlIZcuNzgyzyuWO8AWK+xKspIjGrbea8KXjuiZ2TZdu7TQBMAJk2GNKv06kbsJnL9Is7so0xWMlGiOSHxTLViK9uq9XB0HutEXwWh2eukHdacIPt/nZf3rfNMA3KVZsofn0je7GfWcLr6exCKnR8vdYuQHCqAlUwQutWC/05HStqtUU4NrZeBxJEyz6BaHlVQ/YHir7dXWuBzIQ3uKDza81lO2e6VO3CJ0oboqvjfbkwB3ZvX0DXzdLQBWjWsWtHp/UXTzLbcWYm0djrhtjNfqxckNRtg628u5E6m7aaVs4RSKbUfZW7NBBlZAvKY2odW3T+cG/TZCn61jsW4gVpDj+FpGdaYRvDUySJs9Lqm5DW+TDLkwtbMYlNU9Xk6etfpGiVYto3b4sRAqiV8sudXTMTnFpOcma3KwovoU9F8bvH+4xP0FiwCzSmm4D1W8gUrSX8ApuIyZds/Kq+x6tKqE9Yo1caXeMVKNI7MODwIXf69qHzMFdwz91nYKV9htFmqPEs+y5dlQv1CLU1IFVRtH9sjypjokhkoP2esE8IWMXnhZn7fhz7Grkthn0NVHUqaMxtsrXG4qUd8LJYXfSurtZ4YW7JJGGQr1c2B6BIVG1RvRFfe2QAowgCcsVHUOrTshQClfKaBdauG7CLbP8T0PwPIQNhf2whR04SqzTUz3hGtHXeKSu647aSrYfsgkC6HWnKSQtkHJqGuCbdVXIJ5F023NwAnV4PYH7EPVtPoCvsKFzf/g6Sf0qI+qUWvHqQIiFCBWnhiKbr8WCAT06+ehUIhFqLZtr61q92ITapRb1Cu2vcLNt1Xc1ImLPKPkwVrx4+4xQ6UK2e30tKZHabSZ8bgoWTrRuwOx6bpxXnDYnVwvvlwqjOXUoN9a9Op9xsteJ1N2smGdelDN4Zbm9x+XuZNxOMQY5s9p60YnnaqRPi7vm0Kdbi1QBWJlSr7cSpkjd8xELBsYUNUXVDASyxV2bqFLcic4oadZgHs0UGmuqysHdnmC4XaQWA+3YrqenAb5JUdNJnOcgkrrdgS+grFqZ9oh6oZDgl7aAS8ff59mupUkrSEG8Yt7cSsSay4RQhYi81aOTj1pTeMc2I6+QkBOQaFkwceKd1pE6zNsdrbd2oGfZdVJMoIqHol4X9XnBBiVSuibhZIuEuGM1yCm8YvHr6FjtWFQwMQaHIUX9VMk3Hqm7bTYymy6Um/Re3LnLBR+N3fOXuNApUh3vZs/g3pqjYnR9/z2Wg9XcakTtklLdyDZnmEZ3InUTPquPahpRjKJ+xaEWUxIRiasS1UvrOjs9NG2kddxiHb0bL+Ne6NIc6V8yDfBNCk2ncH8OGiU84ywwH6ICrQkD48oTT17v/rvmnlra/q3tNyLJJuFgt3YyScfIItTaagba+eru7amE/6tbpbVSrOvnot/VIAhaKc9cUyehYWcGlkK5v2IgEgbr5riCa5A68+hEpHXXStk5fg2bC5vu2FijmcOdlI0qHTd0bHvlZKpTpO5mhfS8wMGHyqUzSy6dmJFFo16zJjw1sjYUpM94i3PHxZUbsXuGVd2YOl9vqWVgGoLnIXpWrBp5o7lDrFahxrVq13dxD/V9O0hT7f97nRKrxkqFMlyk2IqcwHUidTftrT5baJ4/BztKuHUYA0YkfbwO4IkLl68z/e452g4oEamTRujWriYeynHWYhZSj0HqmknSvpSJ0QSTw7grmihcpNm9rqNqErUJClWeJf1aIrVqFcbaMTpUFWx9hYSQSZA/i55zkxo6YhLvcewb5y6FVpkbpVaqOaUaxUduu5GjmjKncmU+XSg36704L8Cx1cCFsxfYyRpNDmWMmHM1fDk0nbohtOvW21gi7dpmfNemaecrZG+YSN1E6iZ8duPOkwOdlUj81HX0Q6+4YUvPJuKgflBTZ4Z6gp1trO7SZUfzvdMA37SrwhZJZ+4/cmMp2HKhB+/xOkYCyAruI5AY03Xu+9IM8doaIqx5vrYbCm83EzX03jCnHIPUmWWqBzFUb521RDo2YSS1QkuXepA7IdKj64ibgHz8GWy0tMbfW476udrii6bBBr3t0zUInR8UsloFz+X4pM5h051iylA8av5KxczYfKP7dadge+EENqVfb9rFuOMF1fEBzu1dYDihSJ/CFqxrba+5a52v6zbYDmSO7RO6hIthEsZ5dB0sZKqpm0jdhM9qiPyFc61WSUjStOhKULVExUsN4nZ4DbqCzLVC8GpYUoZLO6hdQLOD3DWN8M164HWOpszucGML97A7w0m4r0AtVA5bi4HMro9U+Gq236izH6VbP3cLH1ipOCU8Jfzo9lrSlEYcR6LbNUSI10LEEanTZ1raGimrjlx4lvlQ1qIrtSn8E+lXmuqjSYvWtaaLIb6NuVFtefz0a1HmZpRaGFWwWiilMo6V2WOPXr8kiQqbySZJk5sR73nMb3fnzlrw1ZJz46r1rI6NvI3QpwPy1s5LK4aNY/xeDJO1G8u4Xw3LyqeauonUTfjsh3UHpuhr54hEM0PK8TM/tB0sKYcezckqSNmjlguQHdG7/QaiBRM+M3D/xCZJ5iTNnF/ekEgtl5cnGuEZG/dyrMnuul3fsT+3M49Uq0Q8C13bdoVbpUjrhK0GtRyL1IHud3gjHj2D7k+f6FQ/fcLz1jBbDX2MZ2lqKITBioev5vqPWjfGPlnUdEi/TqLDtnD8RgmvLCrUYpRqVASrxlidfnv3+q3C+sRMxqmm7mbEox/jxW7cbkZdDpz1bWSffY/B7cZnkCbJFc312dfx2mM+m0jdrYSpUeJ5S+pWBdcZQsU09Ok0OaJCMqFUyK1rotC8YfeXoEb2EhiCF6OUc7g5o92Dv+k0MIlZ3lRYdkiaoaKkEzcWqTu/cxu+aRQpiGaqG2IFLDFep1bdsJyDGbIWHTb2myXUW4SNJqPjRj5G+nVZFKtGTc0twkOM2MXCMCkidtLswZrnRAjNSfhbuKHzZ7nJ9US1TDJgrNhMiX+sU6/sd76aR1Wf1xZ7LOX4JGy0sIpyodSKiiIIo1dmZ5+8/po4FTbFp/TrzYgz29zXbzIvlbI78MRsA20+r1bDf9hXUYm6X0OTE1ISlhUdR/Y7fSRi6swU9yWydQ+raYRvHUyRuucrutzuzszRtiVztETJbVLHqmGhs7W/rb044z4PUgV1w/bOUVZO1hM8eunl0wDfbLjUI7JA6bDuxiKpZXUCs7UICNEr6kFjcro+rbSxLBppE8QEtTivtDXpVLOmwlVQH0GOHqmzMe5OxIxqfqB3544UA/N5d2VdkYC4HOp4FXj8E898k1sNt4qNgvniUOFC0wwLGZVIya7TsSa4ClWuw1GiGtmd4lBMQgPPhOLQl3J9pOyvvddPJNgow0TqbkYM8DJROnfKzsCT3e3kVY8dtvzqiUysZLzroaSwBKtCXdfQXXHJ0ZwlXjjJD0+kbsLzAL4iSUutWhSM4yFlytr/1Vr34SEP2PW2dpxwDO2U1epxyu5IFmW3vnYa35sMtpzhtsDp2L1B03avW4iP4ftrNcyGPPow7TojRV5mGKFFZ9biWc2vdd8HVgquFfcRO8bUJCqIGOKFJEEMk7aonTQdPMwEJ5obZD35uSAeZCxduPDp9WY2ItXwoRG7Wqg14oy4h8Bw9ZbF9YNonUtYi9VjRur+0n/0LXekGoMZVRJuUKgUMXpbXV9N3O3n6brEjInU3ZwLsfBiUdJQ2Xv4Cc7obXR7I3VoJE4SLhkvOUheiShe/Hz9WGPz1G42OlgtKO/9Grk4jfBE6iZ8tqOrSwBm2SKnKgIJUiL+vd542r9TK6tLkZJFHclKt3qUcViSslP986cBvslw8cIc8U3Ee2y8Ma26UVukzoL4ezWsjpGklOuryRrGOVZ9v65OxdFGvFSMJBVoj+mYEgyq4YiihpihjLgfkkwRr3WtSnegfLIObTTdOpXu0wnYMi4FZ72IGq5Aam611qJ07ogJsp5RLTpizZXj1Aayvc28CupKFahYXI0OtVbS5e3rI2X5JH1y5mospovlJsSM+zThZeTCk+c5e+IEneRG5AwfG5G7YooHGCFrq7/rYU3oJHrKJedJzmQidROeJ5NE2aMOrZO1RURigQprMH/a1lyQaE2yuDt9an18KTHsPUUZLgKCpCn9erNhb2cDlw2qKynd2MJdywKRinsJXTkq1VZYHSnl+gr1x7JAUqtza53WfoV9XWuUsBH3ciCregQI2l5vuJQWQ6stres4lkKxzq0JBHv0SOAWsiQV9NwzyY8s2wLpVM/UOjYlvEhGCzWidhbMy5u+nIkEJa7HTL8+dYHNWhFv1mVjiSxaMUpx0ri8vkYHnTMDepUpUnczIideaVBH41MXnmTnZNzyuLYonDarr2K4LONnxfCu/awYzg6UESsjVlp0b2n7nW8TJlI34bMad5/cRbpKPrROuTmr1lWYgSRRZwfRDbtGsrAPr6OEL+wi0e1dwO18dCr6pFV305F43UJ0EwVqvW5S5/62DaTbBBmbxuHap3WAMpCuk9SJ9KFTp4aIoWrN4yEebZ2KxUgUGI4haVJ1n3rR2llpenXRhGGkA+mRuBSiQWJNyNyR8iydpQYmHeZCqTPM9CDKt260aH+HhQ9a+wh4leORun5gUww1p1gQQ0NxV4YapmPXlX61XTZU6F2mSN3Nhh9/v3++d7zUKmU58vCyMizmLeLWaupc4zarrzh9kyvp4vfrCHKdYWq4ZpwBvCJdmkjdROomPD+w8dA2apWVCfXQdZ3EQ3ShWYWvy76LOKXV1rWg3X6sRLOi4y7D8CQ2OrW+0Hd+biJ2NxPqbIGQKVXIixuQrbjcI+lUROm8IuJRU8eI15F6naTOybg031cMmvgwzcFEpEKL4rmXY9XUFUsHEibi+9OaNLmUJgTsdmA4weFHR6homn96qnQ+hyqYFiw7dW8VVal65XfzNaMTw0UjNVsFMz/eHCvOJo5SqLVQPbTGzIziDna9kiQz5ir0Gbami+XmwlOf4gvmc06aU7dXPGAZGZuwsNeDdKq0ejptYsJi+F4jd/tNET0wNLKX8NUkZzKRugnPD4j80DbJKtmEpAcNEmumVlVCx65p2VG5olHiig3wbNjeI9hgeD3Jo4+/ahrlmwiWF9Sq1KqQbqD71WZoPtmIXJAwUqH6iOvyWF2pVxAfSy3ZeSjlL4ZIifSrR5QuHCY8nLuOQxgPxdXUo2YPAw1V4NSF7Ii1dKsrXhXzJiLsjugzRerm7Ae7u4QvTmIpHb7O9l2SRXkaWQTcjxepW2Y2TJB9ezKlmsZtVzHM6vVF2mbKpiqdyETqbrr7MeU1qSdboTx1jgcWp4O454qsiZ1rbPQHBK4kXGfY0qmlx0bDi2Blhkmrv9Pboyx0wkTqJjwfMIxLqrbevjWhkys7YL1YE2KIjcL+87UbxVgsTJbGT1DGQnKh1i+aBvgmQvENSk0Mg1CH09e/o70OZwNjhbmBj5FMtBG3ERv9+u4yPCqD3KOE29aew81BVa1F7SxkTkoR9yN38aZ9nTuVK2NjZq16jnU3dxC7Q9E1D19Yr88QqdMadXhWsLGj7rW7Imn+saxtxiJW6OZ4kf1YuOsx59gM8xJk0KpjVuL9qjNWx+Q6u4+HyoYoPTqRupsNXc/nAqwKl584zwP5JLNxjJRrbptrCP6MxM/XLhLDQETm7KD7dR2lY4TZqYnUTaRuwvMHi9ku1YLUFdhfatSvJHLJD7TpDrtLrH+vWhlKRoaHGYc9NBvo66YBvokw704hEnIhY70BKzdPJI0kTtjTBw0SKeG74Lj/+PH9Xw0l+7CfZhVp1MoOadW17ljHItL2a0erH8ut+zXZsxFKJ7Wzfx1JW3fCOu6Cu2CDfvp8uCp4La2mrjLmGRVtTRbrftpW0IAGAaREXZ0IXo+vU7eIIr6oL3SloiAStmNery/9KsqGQzZh4+/s+Inpgrl5kOZ8nhllOfCpXzvHUxtKX1IUP6yjdLkiXRfRu64Ru/Xre6A/nGRtz3ULm+RMJlI34fmE02yHPkmrl1u17ta1g0ROV/EUKVc+T4uMLp/E65OtuP2+aYBvIpR8ChFHfETrDXQ4VsVNqb5sUbqod/M6gg/BhpbHL9Z3ElVjX8qISImtiQ6vGya8EbxSgIeO5nhTyM3jVbDa5Hqbq8S6YWI4IHOurUuVg/o3F5zy6fOhdLhAdY9tW6imh6J8jrnup2DDH7bdLlFxrcebY03JRIduMYNSoxawEg4T6PU1SuSRhUDnI1uLx6YO2JsFv3C/39d1vMiMcTnwifOPsZ3n4SahEinVcRn1mcUOul7X2nSthO6gcK4PXbu+hyFPTRITqZvw/MI93Wq/Lm4mLZ26FhteN0ZIRPFya6BI+4kjP7Q8GZKVvHMJr58K0Yb6UvdfvXsa5JsEo9+BUzF3ar3+mrpKouIwDJiFzAhuiNXoN6Bjd/v4KTwnhU0YhugBgRNf6+FZ+L6W5rCKwXi0+ck9t9JxaWROomfV5VAN4H5kQyW05nSdQm2/nMszp1/F8N7wxRzb6Jv3qzRC2NKvLZrmou3n8Wlc9ZikzulCKRl8nU5zRA2vThnsOhslhAWCOmxKP5G6mwWfeJA3dDO2gLI78Mm9C9hiQant9iSNWFo3RrQ6OloTBcCY8VmrKJXcdBQzXh1FJyeJidRNeH5BHrvAsCxUEwohVZIOpV3Dy9VRml2YRcQkpShct1bAvk7N1mFk2LsfqyNW7uSJD7xyGuT/8nD30yyXd2A+YNUp44b7j5y8vp2NGS8FYwVeQjNOKlZH3AbM4Myl49d1WdHoIcWinm6/KSLOOfGKWDRN1GKkWuHc0ZolpAkLi8tBxK7RKjuUkk14aiQOjU2JBohGzD5tPswai6olShqxaoys21/XtXnrryi4J4wKCtWVelxJEyqd11CHHCtmtaV4DTOnmF4fqXPjJEYSY9N2r98/dsJzfC9mvC4LqYyszl/m4/1JumXBVLDUUdNmbNWpRVszhMbVNFpIl6xdJzTjA7AaoplitMnzdSJ1E55fnE5+aBtWIyJKanV1hwPyrq05wg7ZgrUGiqRO1iCBCSObszkXsE/gdWQ+z1wqXzGN8s2AD56A8TZSXZFlQDjBue07rmtXF86eQKWQWKJagthRMRsxGyN96vk4u3R/42YIBFtFWperEhpya3eJapHg9BqROx8Nv5yO+AZp/8QW1xbyimidAqqQ2mSnhzb2NepCnvsZ6t/2emxvQa2CrU5S9ypuGjV0687XRu5EcnhvWD6Q/D52pA66elDn5yW6c9UFcxjN6P/kz/qxCbsNnKyFZMZGWk2Ruptmjt7iC4vQjZULD57loY176JdQq2JVsaSY9dQ0j+fZqWk80KPTjfbYonXzjHclIs79afamEZ5I3YTnG2Z1BzfHag03ibZ5CaKWPBI7bSUM8QSgmLMsgK4XLmOcz8nDJxiX24iC+5dMA/ycRds2rv/VT82QusBtRFghac55br+uXV3yrXB1kLgF0BxEzm2EukKoFMvH2+mDubmsRum31+ZD3KJ1dYjuV21erYpRxdnTI0a51kSuyaD4+t9NJdgsGr7Dc4K1UuN6Izpj3Z+hpm4xoDML0dfFbvTvqiHusa0bLpSmntLswzS15oZ0TJ06pcei85U14Yy0cI0SO3qT49fVaWJRohG41zn5es+0v/bQ1GTxXKJXXuuG7RUe+/CHeWy2oNsdsSIRrSuCScW1OUVIjtsdqfhQ8dU2VxTV2S4yb+LDv/RtcnYa4YnUTXi+YbGxA4QGndeDLfW+3+maNJ6v/+31QKNuHc0r5ozS43tP4uXJsI/S17nvTBIJN0zo3noH9p/uuO4djKXH6HFZUn2ksqD215d+HewkSQfEanNoMJIWYIXIgFdnlo9JKoaM19a4EOE0XJwsQeR07SZhdsgBAij5iAOY9nd9BUNyQSKxmgxRhaRrBvj0fSD6bJpyA2iOtJfMm6KetJijEvV1a1eJVlMXWeAggF//CT9yjeOqojVhXqhriebGOt2NMo7Mts8cn9QVZ17jiHYzu75mC4BPPjRF+Z4r/Og7/A0y40XmlO0Vn3zkES7OTx0i3MOVhK1f/6yPWjptVmDrHKvUKJ4YAE5M9XQTqZvw/MRtw0VydXK2feKWsh0QPG1yJ+3flo00a8SvRfFcHR+cmhWxy6zGTzAOFU/38qF//IppkG8QZ5/c4szjp6779V2XMTrM9hBWqArk66ubGusi6igprdbSm5dBwWulKOz4MRf2s/NGnCIC514jUtdSrrXJmFRxwjA1kpeXhiOmX01DfsUO+UYY+y4TJazxhGj58EO2XhACKy1L+2nvpz1mRpWE14RpaS0fh2ZPVaKL3Ig21RLVgQWqVXQ8x5GFlB3UIhFstVLcqFah1qiW9EK/eur4dXVlj42xUIaR2bmnrt8q7MkzTJG65wjnLvLVKdGVynD2Mh/aKtiabXcF8fWmB8/HHB2v++dnxtOsRfTCs8XpYbefUq8TqZvw/MSdt+1gWqGDrM5cQ2A4m8emTgZy+30GqPHzQvyMpnRZB2E2Kux+GHzAdEHtvm4a5Bu9CpcLLu9ev2Dwzs4casbqCmfAa4J8felcGxataSEiZupOqgZNQy65MB4zWnOOPhojqOR1B+xaArhF7RAjSdiYa+vSnh3RVSLq5w55yLYIIC1BqlFe4PuBvSB24ohIRNtcEfdnTkvONkJSYrPDOQFIxAD3H4MkxjM9VGsX1FX3to82z37fv/NTBLEsDlYzbpmKYia4O6VAGvvritSdqpXBnSyJ64ri/iX3jTs6Tv6I+8npor1x9Kf4cg/5mssPPMZHbv9CFiPQ1/0rUK1D18SOHjpFRsNnbVMN94jZoZq6rIjOJtHhidRNeF5C5Pu3yWVFKbrf7RosjgOROnWoYSFOq68rJmBCMYk/66DXyqgLZOeD+HCBOoz0m181jfINouzN2LXrlyEp2/Ow4bJVsG8FyrEjde4f32AsW7iGl5xZ0B6I6Jl5VHppPR6pkFluRloj1Q3zEB/21NKvYs3aoTa309gGPYYlmVdUKkmjLs/VcK24RBVcDY+yRurie0hQV4Lg+fIZVBtnA8oAZQyDPC7D0/1cP03yWLBWB4cKspgdbZ59+AG6UqIHvYzRf15GvNSI2lmlIMheOV5N3P/+V/xur5yoxnKs6O4et13Pabb3MMkvsfXEE/TTRftczM28plTG1Yqn3vVhPq5bbJSCWSNwpogVxBOyvo0aWip2zJFqhYO0a1GsDNFgYV/GzjTCE6mb8HzFibyNqBzUzO03Q8SiWUp73h5rUaoJkiSmCFGk/T6f6JntfArGR8kiiH6x7/zEvdMg3wCWZUa6/pQYg23iJngZwCu4oH4dtU9vn+NsYl72BXylBkXZpy9V0HK8QvtRO6rHjYOqIXLQ9Yrbvn6dh4sCaLhO9Ef8CqpERE5t3wSMtf+rR5dtar/hkKQJkXp1QQzUyqdHwGwIcjYjNOvaIqrSqv8EkkhE/dZGFTXCghKXGqno0dKvK+iDazbrMQ/BPYfqNbpfx4qwdzxSt7yT28bKfKzsWcXG8fqaaMY9ur5j05bX32gxIfCT9/trdc7nGAw7I/c//D7OnLiNvO5q7YG+jy0fSsX2V6HTo+HMoDr1I/fJ9jTKE6mb8HzFrGxHavVQXZ03qZLDQsMcapwAWK1JX4varYpiJcNqxWr716jVkNkL+OTqi6dBvpFIXU0sV9dP6lbjSaQayh4iA+JGvZ5u2tJhbOIlulGbJvA6jhf1au6IHy9SV/Y6Mgd1nNRW/2bWWgwM19YwIZUk4Txx9JCHoljU0Inv19K5GeZCCUsGOaQpd1BQd/DfOHx6BGqPqE0fG6FrFWVJBE2KSnObddDqsfASb4dZROqGp444z26QNFLBJila0cUwFUYRCsaYHNeNY3bUdmwMI7kYy9EZDa4rKnwyoQk2b988tvXZhKfhwUf4CkJzcPnUDu9jFmlUSfis4pJbrLmRPGk/u+KyX7WtPQfIjtrkJDGRugnPc7z47ktxxXfQtZvszJWademwZl37RVpLnaybKdrjrE+wfD+dbuN1QZ598zTINwCrPcj1F6CvhpN4qfg4InUEDKvXQepWM8gz3CpWGi0Rx2pEwKzZyu+Nx4sCFutjf34QJROPztFOHFWn01azl0CTxczkeuRZbG3cJRiSQrxEWzRQxElQ1x2rLeXqFhE0McQLCXvm+VASPush9bjtIZJIBuqKiASx05DwDnoISSCJxuMdtx9tnrVCdkeFcNxFcc9NQ0+pQK0JG48paGzzkDMpxp4Zq2W9vkjdpYeY98LJS5+YxItv+D4u85tWFa/O8LHHef8r30DvXQgMW09NEqLXUvEkQfj2O2FX4DvIDOgT0hdkNot6OxXS+LKpSWIidROe1xD5K+exVY2S8KfdxJX2f+sU7NhIXLImaSIHHbMpG8NQGecz7NyvUffOhqBs+ZpplG/kKtzIlHQDpK5sYbVQqQgD2MhYriMa0ytqmSwjQvNjjZAXtVl6iRfcjhep2yl9WHc1nnjY9WF0wWRf7y2IWFOTG/XojRLWJIRpaV43a120rdMWJ5xmP23mc0eqI6V8Olla9i1a0uGrirMd0TdxVApKxLuTaNBHJ9o93FGvQfhWq6PNs2VJVyU+o/mV6Vec6jB6xWU8XvqzzpgXgzKyrJXlUDj5rx/1YzfmbG/Tm3JS++uXRJkAD7hvaeYLa2EYRh79yXfx0f4u5oMwpkUIC4+GD4aXeavlPHyVzsJBwgvCCpiBF8R3oqFiPM3uNMoTqZvwfEdOe4xDTMZPn5KTRPNEl6MrFlrXa4vgrfXqZhi9VmyzY773BL78GMkLxsv8w//oN06DfJ0Ya4/obe5vO7asifvHN6hlM+zjDSqtOcCOH6k7f27RyrNbWrRGLCt5E+rQaGw4ZqE+Th9CwOvaPI8+UfHoHzUXqq2FgyO65uLsrPTI09haVnj9SCOHsiZ6NNm3Z7nxAanP5P6wXh5X0GeqznGBJIbSyB2KupNdURXEo8ovFPcEWdWjjdfgzBxUQj7ZLVwlrLYiQTNKhVqOGalbJRa1ImOhlMJola2zw/H15vqOlOHkcm+K1N0I/uN/4kty5iUqlIsDv3LpZzi3tYjUv20ja925tebc0BMidW0bCCInmwdkTzLepeiMvf91cmka5YnUTXi+Y1EvRSRuhKXJgcBwdeiCvKkbOYO6kdzQtQvFGP9GnRxO6Vhn7F54L3UcUUtY/oZpkK8Ts14R3YCt64iAfHJGlY0gczhuFfcBs5lv/79vO9auahdEcGzCpdUKpErRESHkcM1r2DMcB9IfInThkbD+t0IreIvWAAP2OctRI3Xr+rzaGiNaxE/E93/fYcURXwsDP9PXf4b06wYg5Wn1TIJaI2/7qdzD2nfRQKEYYoWU6hFJmJEZI0pHBa+41bjaxjDFMBU82/FIdd8xM8GrMZizLMZsdzx+B+vpjtTDqZLYmC7a68cA35Qy89xR7j/LuzZeQy+5+cEc3EOwtvvqmj6dZDwtQo9u/4/W9007SLdAZrNJdHgidRNuDbzs3otkcySFRElt0ZGa5ECHLgml/W7ZFt198eG2tJgbnY0svEfP/zI2XkB8JM++fhrk68Rqb4EzZ3d5/OvRn1qALZBSoDpiFasFascnzx5PT+zi3lY4MFghi6N5DHmRseA2oDJSreBm7m88enp3b5WhNB251k0r63SsK6lxHinRkGMesagj0w6RlvyUK/OqEi4WapCuIGVh5kVTsmsE7elSJU/HsuKXlohDJ4oI0TULJG10Vdf7j9nVEUTtaKQuZ7rWcLH/n0QiGZTqUKXizvHSn0WYm+AFRhNWJHS1c10p1JwSp2a7U6TuRjC/ja9HMCtc/M/v4gOnX8+Jy6uQyvGEJEO7ggxrQtfq6YYBljuN+DVCJ5tB9tZET++eUq8TqZtwS0Dkz5yFFCpHJVYQKIeaIThwlRibhl3hgOitmyUwZ8SoG5mtM58k1Y+BLUFf6w/8i6kL9vouwxma5uyW40tFmPeIzTBbgRtjNbwMlCGzysdLsS1Xs6hDoyKU/fq2lApJRnQYwcaoeds7+tyRXRGJijbBsAhyxY0C8ajuVBVUHYpQUDii+HBqBFHQ/eeIRNxMomavom5XNkoE7zsQIh6fIU2qYxSsZ8FywWWOi6DeRIu1jUJklw/Su05ru1BI+YiNEtFFa7SyQ3d8HRMVw5JQVKnlmJG6sbCIYCbFjdGc7vwTx0+/lsvM1DnR5amm7nrxd97hXzjreZVUyt6KX/v4m3nqnhPMsqO5Q5OQXKM2rtODSN3Tb3C0e1q0bhaSOx/9HKbU60TqJtwysOUOFSWto28SzhFrKZN9TeJmEXZ46SiH5U1GKFlRRry8F8FJsuBi+ZZpkK8DrjOQGRvl+FIRTo/Q4zXkarWVT5sLZTheRKXmOSLRg1ml1aYpSCpB7LqCUkKQ+OLR03dVJWzALDKfnVqbfYxMDWuw9Tlq6wieUPyoNXVKkzHe39yCcrkn1IX2ZbQRsfWWNe5vkiLKp0fUciN0nWKbJ6hacGlcrlmLIS0KaC1CV1vabO1pMe4dLVKnKfwkJDgineBJcQnRFkcaycvHlBQxFl7BCtWNEafbG4+vi6hCp8qmpkmn7npRL/CbNbPVZeyJi7yfO2BzQe40RImyIjqSsqPZI3rsinRNo26tU2eKjB0+dviqNUsMGT/3xXJ5GuWJ1E24VXDH6izDSsNVohG7saVWnaiZi3hDuEuM1nTFxpAzOVyt4cXYOD1Dl2+n7G3jdSTJN02DfD0zvc3Aey49efy01rA7w7Wj+tBEfCu1DGBQ5XgLt9cekRpCwcVClw6wKtQmdyNSGVHOrI4R6UkgUklaMAkTpDC9Mmrr87QasSorwliEWoRyVPIiGVdFVBkto56CbnlCiJ8nRFOzBRPC7DXieBHa82css6M/iY0aSeONGSYjniqa9GD2FG/7rDgjiOK1tto4g1SPNs+6k9cyK75Ou1qLb7YaOxHcy/Hq4QZjUS0S9LRIXR2OXxeXlE6MRZJJp+66F9w5v6UWrAzsfvBT/NLLv4iNKpit0E4RWwWJs5Z+PXygV7vIOgW7WoGNiI2IdvgMqCcOV9lNmEjdhOc95KX/4FE6K3QZUmfMuwPx4awe9u160P16eJOVXJF0KVVY9QsWZz6JL+9HreD19f7hv/v500gfE+M4w8qCS3vz63jtAi8KdRUyJLVAHRCU+YnjLdxmM0RqdJ/SPBNaOIoKxYXS6uH08jGIRQpPhKBpIb2iauQUUr26dn8w9oWDAcpwtPnJvUNMMcsgaT9Cl1URTSRVFE1NMBjac4m6OCL0Ziqf7vww04jUzefUkwss34l5QvyQkPE6Yrf24FCFpHgSPCv2TBHAZw6otStMwQytNKnnRvRMME+Y+/FI3WjMioR1R4FaC9mNreOeajbQ4cyG1ZR+vR7881/2z8s9X2nOsFv42Ds/yP133sV8BHIKwaCsTThI4/nBPXSzDCuhT+cF6VNYiJnGpgsmF4kJE6m79aJCvhuJouqMY5A3r87Q6unWmnRuTjnUfZi7SL0WE0oJvbsLXebJj8By+93U0cBnXPbfOQ3ysdGhmpl3x7f2WjY7MPMl+Ar1FcIKx0jz4y2+njpMS6RJPbxe1+0Ea9qhBlaVs93xuidVg9ClMKgLF4nQ8I1onTd9Om8C2O5Hv1uxjFjEzsJbogM6jA4nU8kYqkJSSH2IA+8Tu9TIXJJPnw93Rnw2p5QV9XSmpCcj+uZ2UENXBREjaaRLEcFTjiaHZnp25Jq6WhErBzOzh/adjwMMBW3Ru/wtHz+6Y8hozC1EaSiVWgtqO8cndVlRM7rlHrPpkj0+ts/wrbnnlFXGxy/wnvMPs9v19OsMSK4HxC6t0LRCq6HJ0S4hsz4Ehj01QldCeLhvRO+Xvk3OTqM8YSJ1txrmy4uslrrf8breYhmMTUyQRuhKkthofwv7xXfFHHnhgrT8OZQz5LRivvWd7j5JHhwHkjKiid2941uFjbMNwLFScK+YFlSG5lB6ZFLn/o5NKD2JkSSRHg1XhkZ1WnZy3WWaxqMTRkHJGvt0qWSpoXlXWwWcehMIjv27+n5H7DU/98+eBO8QSeA9SgfSIZpxzUheV4pqCo2UtRSJts5VFUGSIqKfXis2nqBeMmpaUr7/a2RXt3BxVBRE0UQUtCcFlVbN502KRHFLeE1Hm2erkUnhIatxBYok0tptVwhfCRuZLT989GhZMea1ghleC9Z6kI9NzMxJq5HZanUDPsW3MErH7zBjEGfv1x7l3ffcx6IjorJmkXZdFWSoyJCQEWhy37IsyLLG1rXI3Dpe64ocqkqdMJG6CbcU7ixnSaMxtjq5dep1nXY9LGGSml9n8nhcCxJjTjanr5WtrY7hoYdZLj+I+UDyV/HJf/aV00AflUz9yxOkltDDjh8BWdUtqhVUR2qzxnIv1DrSHbP2qYpQsTDOSgVSc39Qp+aofQu3B6Eujl4sL0lZi8O5OJ7CckzX3sNYo0pB7ERkzSCPEP+IiFwhw5rIkXFJCAnzTJVEJWlLv64f2zuuaavKM3SVLu+knocx39WsWM5GitVaxyytexaNqkAUNEfkTwXJjsw4YmOB03kNJ9s6oh6LfVpr37mFdIoU+u6Ro6Vgv/gH/ZQZndeg/YPhpcKqHN//dVgxGyvd7nLSqTsuPvQJf1nqeN1YGYfCQ7/8MT54z4vYWAo1p1ZHWRpha402rlFX5y0qBzCjNbwOYCWEiruEnJ+zM43yhInU3YpBoZf8y0ukfg+Zyz6RG7uDoN06AJDcyNWZ1Uo2p+siarcmdpGGhRVK3U749jvIOLiya98xjfSRL8EZ1btmdH/8CIj5CcTHZnIV5gMiFSnO7t4xSOL2ujInomgisS9r4hqC4VSWa7eG4RiRuqqMJvulZQr7wsBJnQSkBCaCZAk5EhFqPQIp3c2RdBVBNfppXVKz78qoaoiPROpVw5NVcTQrKuGXGRE8+/To1wd/u+yc/mLG+akgdXfcERG6FoFE2zsjaJM40U7IKkHOgGzLo0XVpKPfJ5oasimt4wPxaPJwwZLSdYujkbq7ehbVyMUpFi6+VpyauuNH2/YKmwUYZKqpOy7e/jF+Szdno8vUC5d5++5H2Z6dJInhUnnWUoNOkXGtsdgfEDrNYV83I5wnzuxO9XQTAlNr+q2IF+o5ztgLqe4H07MKXWeMVcgpqp6A/TQs1cmpNVCsyV8VxsE5fccm48V344snsJShfJO7nxKRi9NgXwtjj1uKyNhw/EYJ8UxixSiG1ErKIKrhQZCPsfhejuoyq3W/ScI0at8MQ61SkyHVcbUr6i2vhWKZTh0zabEmgQw2C5oiRLerIXgNwlTpML02qfNVR5WEEyQwayvH8xRCIO6kkDxJGuRLBU053lmV/V4Ql2eeD9/7NbL73nVgdAOVvSCDHnp3iDa5uuYkUStCT5YRc31m/btn5OdC3ymdGyNKUsNIZD/kdOGGiZGW548WhZU9NkehFw2LMS1U6RgoLP7Wjm9936YcmQzs7HFyFr3W07pxTOzCd24YVYSddz/Om/s3sLFSqiV8TFyhLLCWyRHD6aKbmgwsYYzbFSSD7OG+QLpMOfP7ZSJ1E6ZI3S2LF9czlFUIvI4q+yKvY2334G2GkUMLt6QDnbpl06rLyZlJZbitIz1xhrJ6b0R07F4+8A+/fRroI6DqLKZsc8bxWGkt951NbIx+UjwiaIY03cEK4zEidTlEertcyCk06tQdTU18OBVEKj2FYnZkYeCYZjqQkOsVkyCxRaEqpWbMEtIial2OCreUBZlde37aI0X1mTprhibKvrtEVMyxdpqVVlfXEtWi3v4N64jeVTGsIsqXEqLrxgwhNbKY1eiSomJIS/VKHo5GghQ6VZIKqZmdZYEkofIXUsoJc9DlEQWIFzPmVdAqDOKUIpSxMpTK4vLDx4u4ubFZCqUW+v/Pw35yuniPhh99l79mtuA3lcqwO/CBH/95PnL7KTZXA7VYkDftMe0xSe35DCszTJqbhFpE63pgbvhsaMekIHIPkzbdhInU3coQ+Qe7VN+Ncm87cB16+hSfW+0ctFq7VWjW5eqUdb62EPtIC3YvvAUrYSUl+vumkT4CVt5Hl6Y5y3rMSN17M0PJaB2otQkG0+wN6kgdjxFRyUG61rVvkQS0qPVzR6WQvCBa6LVwHIvJKh21JKonikda1D1Fe0GN566JnBOeFEkJV8XkCNGojaBq6xCHa6vJ0xAwdtknn9J+IxIydd06Uhe0T45C6mpG3FqaVJHkaFISwaS7BJ0ISYXOWwpYjmh4ViudRHo4iZE8Uq7q0ZoSfcjxrUTnR6yXVPoCjJVxNGwsuBnFoDt34XikzoyN4uysBhZPfPj43bO3Kh5+lO+ZzViosHrgKX5qPuC5IimuWF9vRYPElYIlxTQqTmsSTGorKngaeuDJzamebsJE6iZ87qnzVJSu4woNOrFIw+3/W+WKztiY3gWSICbUooyDU+YL5hc+gO99FNUR4cv9oX/25dNAXwMXzm5Qxh7RgeTHNFnf7aHMsDoG4RoMcLIS5dZjcn/bEaN/2xmTFJ2oBHUwiWZRSdGlmrViWlH1iLQd9S7CM9YiYe4Jp0NQxtJTc4tL1BlVetx63DrEMrq6NulY7ir4QY3e+jGey9MlhdeETpWEkpKimiLSlo5A6m53UgpnhdQluqz0CXLzZsmi9O70KJ0LvQgz7GheqcnpDLJY1P3lJpasqfm/RNWhqSByRAHgzTm9C17Dz6Np1VBdmA3Lo3fA/uH/3e82Z8OFy2bMz59nitQdAZ90v7u/g99rwrY7T7zj1/iFL3g9J1wpsoHrDMsdNffUNGLdgtItKGXEqlNrH5sqlsYge1JxVtAvkH6T8uRXyETqJkyk7paP1r3gBx7GctTQjRxo0I3AOMa/ReVKbToVuiRUUTprmSwNE/ZRO9KlwnDpZ8lmYJtsL3/vNNLXwFi3cO8pQ4HjykysekQyKiuSVETHKJ9WQ2QJ1eF9R4z+bSfcE1YkKsGIBJ9781Ddb3IIF4iVHL2zVjxEPdSFJEJCWw9pQmvGLaOWoXYYPeYdpfSUI0qyOFBtX3WlGaeGJ4OvvWZxNxKt4UDCFgyHJIbiJDtCSjPNSUnIOOoVRUmNKKasdBJkL2slZ6WTRBY5WqTOUgyyO0oONUnV5iSRKG7RrKIFYXn0jloTpAjFYpRqjcdu3D66iHHJbBh0tbJToN8bODFdvNfGz/w037q1yd0VxnPbvOeXf5kn5qeYV8EYIGlccWXEck/dW1LV8G5GTRrt8Gr4WPEh48MuLhnXOdYVZOuuqUFiwkTqJqwxsx20v/IcEDuoldobDtVNdTB4YmUJMWGVUtO3T5glKKAnTtDtvg0fHwcfIX+Hn/nRl04DfbXV0jbJnsAGap27/+Cpo7/4bE/1hDCiGOKVpEYSI+uAJgE7Iqm71OGWQIROpFEfAY8E4GEKYS5HamJYo+aEtyjduBYDtox5R60deIdLh3mHWka9Q6TD5Qiko9V96lqtdz8XeyXrs5AfISRMkkQ7ibaqOwUS9dokJxdmKJ1ConXRipBFUIWUnW4d287rVKwfMc1pLWLYQw4vjHUbiWBRTycJIwGro5E6z/S1kqiY1yC81ahWmNnesZwpNoG+whIjux9fEuVWxEX4Qzi166n3P8nPvOBOero4vj3QNeHgWTsSsxloF2nWGQfPtcOTYmmBjRaRujHjP/8t8vg0yhMmUjch8JLhTPi62pUadR3R5drlNfEQ6iGyN3jClsqqKLVE8TsFVv2CcXiK5eV3gBRqvZczl//raaCvRurqnFoFbEWSnt3+6FITJWWsCMVCeFjS2pEBGEvYh3VHrKubdyiZUiMq656ojQVYC4GZSAgEJziyn+kbN4P+KHhKQRhdg4x6As37m9B05lKK5/XaZGiwdXdEKwlYd9ceMmetLlTEjCxr94dwlUjqB04TcgTyNVuRFXqUlDOaFEnxWlUinSugnUazg0LycjQC1oWhGa1+TrXuy5vgYCmBtkhj2TpiR60xc0fdcJPWFxxeIV09ht2YZDZNyLUyjIVcdyZSdy388E/6l843+eqhMOwMPPiWX+Td976GrdVA6QF6sFaX6Sk06joNP1cbkdUMVqtnvI0xZuCL4xS2TphI3YTnPeSuH3qcoTq9hv5c19a0fSHiRvbWy0dqP0/SLMRUqE37vriwGoWZbmLnfhrqBfAVY/rD7n56Gu1nvQK76NZkpPqcT106eq3S9sUZZjAWo7almuRYcmqpiCp1+2gL9/nLc7xkEpFyLaYRkfOmG9dFV6qjeFV0OGKkbk8RSVHeL+G5sNaUky5FUwQZkYTmIHRB8jokH+E9xmby1bprkzaVONWIxUmkeUPgNRH1b0kkmhFEyO7RZcoRSN2Jjl6jlk66qMlLa607FRJOTkbWdb0eJNUj6tSF4t7+xKzBPA8aPQoihoijmaPt04y5OVKa6VtTHfTqdJ6Pke5PzE1Rh712FPvp4r3G5el878YJunnP6sHHecunHuayZ3oxfNWcIryEOmRdotXRvSVqGg4S+8SO2NptkPgGYh26+cop9TphInUTno6N4SKWE5lK5AWcPPN9twlXB3VS9f1oXXUhZ5rGPpSyXkEqw3wDvfQR6uVfwlmCvpIP/LNvngb62VZdzySpKLu4C65H74DdHTrMheQVdce97qdLNY1U4HI92uK7WzqqHMwHemhqqM2ZwcZmiAWRcj8KhiCC0VkbETpc4rvWqONLIlHP5/Ho3jpix2u/hyTZJ3SIxP5hv27Pm+V5JSUaCUshYyIpqvxUyA69H4HU5ZGchJyis1WTtiifNLLV9ieCZA1p5XxEsV4xkjatuzUBayljWXvMVlBNYbx2pEipMfOQa6l4aOs1R988Vo5+rhXmEg69g0UKdyJ1V8G/+rC/vNvit5Y9thUu/twH+E/3fQknTbHc/F1zI3TeZL/LQNKRlEZSp0g2NFd0HcFbR/HyHmoFeedXyJPTSE+YSN2EK/EFd59pi+Ohc2HtMK3OIjVi1x38LPXNdD0cwkPWtACDUwche089+9OIL3E3htUfmgb6WbBkgVvBbIgo2TGswgZdrJnhfpOAKkFmJIyxxtXRFt9lmoW+va+t4KJ71Ik+0XWNXW/R7CD5iHPHXjRCSAqhYVfFPGrsSNKcH1qEam3Y1baj0MadIe0TuuQacQ6JCKPqWqYkbMAyKUlsqmRVctL2HDJXISo/uBN+xlrI6aDdQxE0K1kUJZM0hbCxhuTxumbvSMdAmrNFOuh6DRcJmlByQqRr3rVH1KkrzswNsbUzaPRHQ3TYHlnSZDTm7rgJgwlV9fjesbcSHrqfb+sXnEyJ1ZkLvPvt7+WTt5/mhKyiDck1PGC0kGQk9ZWc50jq0EJoFZZG8NJAKgPJlmjnaBlJ0jFMozxhInUTnmEh+f5z+Lik0DTrCDswMaFP0Q3bAajT9zXM1t1QN5IbqUYUL2zMHVsV/NQWPPEeGN9F0m1y+jJ/4J+9fhrtp0VR/L0nqLIJeQBbRSrVjh492fMFY1FsXfdWw6rdXfCh4KOylKOROlt2YIS1uAjuFW82YcUize6eWDWtubEckRB4h2tmtIx4JrtgrfZNXMjeauwitrZfv6catXvXQp+D0KkL1RVfR+tcEFNawR2gjcylJvCbJWrpsnqkS+1ZUpp/9G2+cYnm55pI7hHtS0pK1vYVTRJBGkGzhDSJZkSPGNXqBMmhEChdQrOTs5JSk1cWUC8kAWU8YverMbMWnXNwgapOQXA7hqOQODOUilMExlQnq7Cr3m9lfq9VlgjDex/kjffdR7+YU7vWJKFC1p5cY0tVIkrniuToY09rH9gykrKjOpKKkDST9aWT4PCEidRNeDbcvnmBVUpQQ65EmpzJclTqqKFLN0JZRUPEft4VSNlIc6PvKn1X6bxQiHq81WM/jQ8D2Tc5s/s900A/HR/boNMZyoqU9ui6EU9HL0CvZSOIkEeXKhJuDeYKohRNDOPRSKJJh4rjyZs5azhKJCpqIGO8h4hQPFGOSggud60SKDxZq2eoKYinZ+p+jR24KyJB0hwNH9hrsQ0VXBTzjMqBb6wnpUpGSI0dBglTsgqdhB5cp0LnjeCJP3P06R98jey+aiO6ENuiHJrFLYqZNMhce/OEkkiohtacZjnaWEnzohVHLSRWEq0Jg4jOdVrJGVJ/xJq6WphZRQQcxyWS4ebgPhyd1O0WZtXxYlScWpz5X5pcJZ4R/983+jdsnuT1q4F69jIf/bE38567X87WzhiS7RH6bNNnQXQVBRS1kLWQLKNLR/dKkD1PRKx3K7xgywns/d8oT00jPWEidROeeTH53L/9AOwdyJkcljVhzeFSiBKLCkWjG7a6POPNvg0VPblg96FfweoncNlG02/1cz/6mmm0D49T6TESKS1JDJAKujp6rVIdZofInAYpShGhMiC5MA5HS5NZymgPZG+WYyE8TCONhlJQChm1RKrZfefawsa1y8DanzVSoxCUyJPtE0gRi+5dpZm3Qj3C596cRTIUFUQSpIxovKdLOFW4JLCUQ4okC1EH16RHUhJU/erSI79LZBcgK3Ut+IIgyUPzLixtww2iReykCy28pMpR5V9yI8tJHLVo3tBk0bFL1Nxlr/TVj5b+rJWZgLfWpuLSxIcjldod/VRjZka1SilGHZ3ME5MH7DPOpx1/uk/Uec/w4cd54zgy6BytEo4RYlc6Q4yACTICg6KrvYgK54LYCrVV1NX1wMLRfovdaZQnTKRuwtXRy2VWkiMiZ0IZWnzBInpnlqhoPBe9wgv28IYKbs6YM6d8h7T8GZSBLp3mwUv/zTTQh+Cao26tFlwrZkYZj7TQur9jE5g1v1Nt3mBRryae9qNdrkdbuItE0wUm++4PeEtdimCeUO1I1uFk3Dt497UX9eVepnpImdAiiinKxMLtNDUpln1HCNtv/eySXTuENCaEiLW5J/AEtUM8ox4ET0VJKjlFo0RO5JTIqkjW5tlKpGCvOe4Va00WpGhqkMT+o+YWbcsSnrCJ/a7ba5MBRyWTie7cnJUsiUx02Ko09wuJasEjkX+tRLhTo/vVDQMqhpUjRhC/8Uf8pBnzWnHXfaln/dTlKQX7dPzTn/IvWpzg68TYceOBN/0yb/miL2dzXDFK3F74SGgOMraAXUt+eA0y1/f755qsmypsFelXc9Rew4VppCdMpG7C1fGFpx9jlEOTfHOTqC7k1gSRgbLHQfq1yZkc3qpFZ2xfjP62LfLZtyKrB1H2cH6vP/ZPXjkNdsOqdlQ6XCuVUDSr6YiRuss95nPMwrEBmuO7JUprFBgkUY5Y0F7KLMQu0H2tOyF0CH1tWuWhHyfWU8nw2BF05MZoKKitOULXOnLrKKAcEg9eW3y13oZ6BC5Uxky1RKkZJ4MFkRNy9Il6jhYDckp0SejW5C5F1C5LxDSzH4F8NbsuFW+OsxqesRI0OOEk0divGcmU5HK0Y+BCbrp0HUF9QxMPkteIMhokhzw6/be4XzNSWp3sjmO4gaNUjOpg4+qIpCyidJ0L5gUpBqXQX3iUxXQRX4nHL/FHNhak2Yzy8Hl++tFHubw4RZ+cOkuHfF4NH8cDMueCqKMuSC3kVMhekcNbcjSdZPWB18pE6iZMpG7CNaIE8v3n0NWSoWYyrd/OD8gajbB1saZFVO7wDkywdRSvvWanm7PzyDarS79ISku6dJpH96baujV2bI5o19wghOqOyIb7PziCrt/jMwbbiNQl0SAgreZNZa0nKFQ/GqmrGmSyW0frmkCwiiA14zUIEymDdLjP2T1zhH2n9pnadGONsIlE4jKq07T5zEYCc12edpT4Vq2ZlGLTlJH2XHJGcod08W/oZomu6+i6RNdnct+Tk5I1onZZjpCO7DpQbTV5rT5PowYhq9DlMNLrNJH7TCfQZ7+2dMjf2vGtFF6xOWl4ybqQm3+EtsdOCSuynOn14WuPkAnZI91nCiYe/ceaqHrESB09c1W6JmkiCpaVPJtNsiaH8TO/6nd3p/h9Vlla5eybPsRPfuHns9iT1qna6ug6IFeu9MBr98k6omsS16ozde1A4Yrs9VODxISJ1E04Kl5+4lFEdL+ct9rBtJ9ziA/7RhMkbkLE5dCkVFoeoQ4SzRJu6O0LypmfRsbHELlA1t/tO//o86bBBla7W+CZul/DZlTZYHe4tq/m7sUO6GOpbleyi8c2RpODiuOS3H/62vtLLZVb0CBtpoglqinFlOpdmBV51KkhHeeP4FYxW4TTQ/gteBP5gJQqJAkyl8EJTX1LUR+43/RwzRks7MQkZTR3pK4Lb4Y+k7oUUbvc4d7PMt2sI3c5tj6T+hy6c6pkP0pKc4ykcSNznQaZyxJNGF2X6ZPQJ2UmwqzL9KLMf9j9qg0wZ97fav00RJE1Uq9hYabgGSXtv1dOzuy27auTuj/5434SJ3vISFdPVJxofpGjkzpbMq+Jbm225oqpknb3jqFzdwvgw5/gD568jdtFGB46w8++95d55M676LRgdOEekWuQs/GA4yEpauzE8Hqo3m5N5NZRupyp7/s98qlppCdMpG7C0aJ1d/7Ap9ChhAjt2EhckyqhbamGpMlalBjCgUKz0Umlk9riCobYiOUMn3oM33sbWVZ0ehsfG/7ANNpA8RMRAauOjYp7RZlx9ty1O2CXNWMWMiRBgpzcatVSrpAdkRpNBBeuuni7f3wD8zluHV5b+jJnXHq81abBDEsdaCalSGCeTtcmXYMeImcuaJMc8RrPo3FC0RT0RVTRrHiT2L3mSSsRnUO7/U1yfAdPHZpzq0RLs0zOQtcnUp9IazKnQt+ib7O/cQ3yNQzRYNF8K9ZbSor2KergOm2ET+kcehfmn9y9OgF7+HE6EbqmmycpqlY7TeRWs6cJOkp0xCLk3d2rj8+ukBGSSytmjOS6mbVEux2xgzaxMGE2Ag6pOlKN+cym9OsaO4/7Hbrgex12cM7//Ef4t695A4tieKdNbFgPCF0jc6YHrTxe26MYnjTq6zqgM9QVLbdxaRrpCROpm3A8nPbHqVUxqQeRH3FSDiKXs8Xz5hPba8UbiUtuqFRMKlZjq7sj3ak5yzP/CS+PUewi1X6vn/nRl97yYz2sTjCOiTpYkLPq+KikfO2I0aDhxiBSETVGj8YDbXZhWSuWanQon7/G4r2bqXUTo8foqZ4Rn2O1i7o6MngXdWrSRcxHM0s72vwR9mDgEhp60uwq3FJsrd6uesIlt37ShB1B4Fgs4/ThhkmPaAcyw1MXhE/DoVXR3O/T0aRKykrKQs4pNOxSItk1iNJsEW4MEula1SBY4mE51qlHOrfp1aWckCSkBVd2PH4aR+9RhZlYkM1Wm5dSRBBFKzlFXDLRPGYXylVJdZqhjUa7hOyzI80gPh77HzxCXR6FLXH6WtAms4JDsmESIF7j37yL7+5PcO9QKI+e421veR8P3nWKkyMwjPS1kGohm5OkhIS7OilVJK3r5pYt7QoH2icjiGIpUxYv4cw00hMmUjfheNG6z/3HD2ClIkn2U6yUmF2yOmMJDbqUjU2pqNSI3LnhObZZX5n1lV4rvRfyRo889CmGc28FW5HlDj76+OQyMZYFiuO1YhWSFbw6NR3Hk7MganSpYupN/KLgOVxIRQSu1VH7qx3JZggJ8TnqXahj1YyXjHvU0Ynkg67SmljtXXv+6HsarfA1wyM3OzJHmytDWIOpNHswMomE1COQOs2odkB8viCF6YrNJTfnB+2jM3XtKqHrLSWkE/y+a5Cv+UlcU0TArHlYOKiBVicTZI+192tSyE7m7NW/xn1d1MnlRE5dpF9z3q+vUxey5hAjViFnIZ+4RlL99lNhhSZATngSPLecsSo1CfnCEZpDUmGrQmeCu6IWtmWaJleJOI0f9xfsLPi/l8pecbbf9lF+/KteywlfISzpJFwjcjW0FJIN6Hpb18+J4TmichGpSxTtqSlRJOGp59JbvkJ2ptGeMJG6CcfHFk8ySKYQPq/VQuGqDHJFEd1YgujNssWGkZtf7AjkmTPPhuXC7OQmy0f/E6k8DHaBRf+7/ZEfvrWjdSaJWiueKp4rxkCWSr187bRYXx3xSrHSonXx6Gq41v3L2zxxTfX/c2GRVU1xTxTvWFnGyKEtZwpk3FrzhK7dKq+dfqVEBVcYdUWq2Cwkdt0TJgnzBCkhKZE03gsyVq89Dsthtk/koIkNr9tnRXFVKsoYJE6ITtUUHq2pKS9K2DUgpzauTupODOFAIRGhSxads8kiBhbequHPSlIkA8no9i5cPaoml+nVmaswS9CnHHVzSZhJaOpldTorJI8O2O5aFfN35dDfkxahi1LG+JxSQwhm7wikToyT5mQMMSeJR2RSZaqpA/jnH+S/PXk7L3YYnjjHz7zjPXzi1GlOFWtmfQNqjlprgjg0rl4MN4k0rAlmUBWqRqdxsUxNTn3qbiax4QkTqZtwndG61/+T+5lh1NrcJVIQu2sic4XbBMCeCjYa42LO7MIT+OW3oD7S5zt5fOfW1q0TEoJFU4M7bkZNYPNrp1/nG5H8k87IOfoSc4oNhYziljGZc+Yai693HcgcPFKfqWndSUoosp8aFW21byKkrAxb154/hqxUS1QRioSCiCSNVHGL3NFJawmQqDDShDYX1WszjoTVHuhAQsokOi9yEx9WBC3h9ZpaDV122a9NCxcH4ttdMyqj9KLMUutSbU4Sad3kkCC1ujrpUquzE+Z3veDq5Ok8bKiwhTBXZaYwk/XziM4lWvSvS2gvpGt1v/gQfb+dQgpP2ZQFbfFLEsy2jyAgnBInspHFgsy1KGsynyJ1HzzjL7UNvg8YpXLmlz/BP/uSz2drNeC1hiNE7UlSSZrRte8rRIOEBvGz1oBTVbAqmEWRQykFW57k8ke+RbanlWnCROomXD9uH5+A2u8LEGf2AyjrQF1E5Fo61i0idK4OBbIdpG47wIfK4vRJdO8taH2YWvbo5t/l7/+bX3ArDq/7h26jlk0QoTSxXxGhoqzk2nVOqxKkRVwYLYFmzMMizEuieo95R9Ke5eWrF7Tv7nW4zSOU1tpTJYehlIuEJ6wInoLYVVVcEmXv2qRr71Imqe/PNJoEyY5BkDmV9bcP0WOPCjdTwfQIpE61Se4oomEJ5k3mFVespqbOzFoIeJ0uddYiy6R1FOt916ip88pGynS5i+7ZrifnSLOmLFFPl5WsMBdljtCbsHn+kat31u6tOIEwT4leE7OcWOTETEMiRdVD0Li9j3RCf8fZqxPF4XK4ZUiMTApuF8Suy5CNWdm7+j7+zDv9tAgn67pwf10R6aSjSLU83/H29/KnFqe4ozh7j5/nTR/7FA/mU2zuLLFCq40bIyonFjZt6whdjX9bMdxnjClTraOmTM1OXQjWzSnv+6PywLQgTZhI3YQbCyK97P+4n+qFYTdF+tUOonVeows2V4fD28op46Fg3RiErpgw7sF2WnD5zGWG829D3RA9xXDi+27NEf7QFi5bEW3zxODRMJCqMi6v3f26u9ejdFQN0d3qXUSsSo9YBuvJmqHMSenqpG6Yta5REcxy+LKaNiHi6F4VVXIGl4SSkZRY7l47PbrRtVmmOayKaZTvRxAo0rtE2heJ1Kl7JknCV9dWqutS3ZdKcZVINK5LBqzV8s0rYzhA4ES3bUSasleyO9mNTCXvPXX19OswsJGFfpZJ8548T/R9Is8SXZ/oe6XXSJkuqCxwFjgbu9tXT4HLKiJyKYXgcJfos9AlyEnQlEjJ6NTICZIYs93V1efvPULvjogkZpH9f3fJyWIsZg9enWw++ElO1MRmi86JO6I1CGI1tv7JI37qVp0j//37/fPzFn9iuWS4vOTJn/plfuLuF3Dq3B61Oq5LTGtsJpiVeO6ZmgRTqDWuuGoWhC47NSmWhrjtmX3OpEs3YSJ1E54r9PIEutUW1hY0yerRQNG2rC3l15C7iOzVoqwsxeYJSwkKpK3TXHzy5/HhIZAVafbt/rb/7dtvvcG9NAspDsDHjJSEoVgVSs3X1Jar0lNSh1hCpUNbw4Bbwugw6ajSY9qzt3d1UiddFwk51Yj4aaZqwqWLaB1KbU0ISMa7jMicnSP4yp6fz5AuRxRQGnlMGaFDvEOkQ7QjdTk6V7UHesx7xvHaaWjf6pEcJQIqYWvmJkgNMWZNIEmskpPTJafDmInTK/QqjTz1dFnpX7jHFSb1D7hv/bT7iR993F8AMBPuyMpGn5nNErO50s1TkLuNTD9X+l6Yd8KsV2ZJ6ZIyu2vkqtHXbmQjKXMVuk7IndDNOnTR4X2GWUa7ROrCKowq6OPnrz5/r861SsYmFIPTe2XmRm+GWqXfqVeP1G1X5sVYuIEbKoaahVbduKJ/9wduXauwBz/Fnz95mpNjZfng47z5Y7/GY7lnPlZKSlTtMO2iqlXjlss8UxSqzxgtU82jZk4MryM2Vrwadch4v0H5xe+QR6eFaMJE6iY8N9G6N/zQx9C6pIoyk1gOvIZe3TrlmmjyJhbNEft9FI3YSVH6oqhFxM/qnMXeHrtP/FQkKFhg/ud959/fcUsN7u5iA2QLJJNnidxF16dLYhhP8+j7rz4evrkAZqh3qPRBksi4bFJsE+gQn+HlFHv19quT96yU0oE1r1Ujqqe84E3dOHr4BO0jnuQ+p5Nrk7rbFtuUEmlibfZjbgol5FfUAA+HCSwekxg2KKtybe/XxekzlNEiiVUr1IqNhhWnDo5KQUsZRxhHVApiFanWlBfDP0MgfDW/9zVXLqL3iWx/g8jl33WPnAG4cBa6FDVzfUJmGWnSKKk1NGgWcqfkpMyS089mdPfcd3UT9uxoFqTrKH2P9QnvEtLNICuGU12iJWQs9Bm2vuhFV6+Hu3uDbmtOniWSCr3m5nmbyVbppXIq7XDVm4fbdzkxc+baXicazSUyosmZv2h2a6Zgf/hn/Gs37+J37+2xurTD/e/8FX7ii1/N5mAMKUcErhYsOdWd6juUbo8xbVNtoNqKSqLkJTWNWBpDRGps294ltD896dJNOD7yNAQTrr7gzy+Ryr2ULKRICeD5QHR4bKeRFUV6QRqZ6zqJipGVYk2ANmuI7HYveAGXzryT+T1fSpp/HZtbb+ADH/2dwA/dMuN6+VJhbzfhdZfsl1FxujTiGOIrXtSdv+rrtx+5SKmJ3FcoS8RH2BBISxIj2g+kDcOKcnLj6ovDY7mnOzHHSyJRQ54GRXMHOZPzgppP0eVNUMMsIcsVJ/TazTNn/G7ybItaHekc1UySniJBDs1BXbDiINGfWlKHywa5bLm/625YOH5/hsuKJ2HZO+fPKC96lfGQvxqdnaTz1vmLkyp4lBmi856hbiy68fKL7uzSPJFKdHGqGZ0JaoJ4gY05+rZH/De99sU8fjkMcP2hXdKsB87Tf9mdnP2/foEXjonOnU2MsRakSXzUlMgrw4jaNa8h+KNkbOcJXgw88mnc3H1DRHbv2mBDTiHqjOYUr5gb0vfUbNS6QIsibpFcHo1L//Txqwul7PwK52f3sifKojpLc6omMIsOWk0MT+1y8Wr72HuS8zmzs8p0q8qya07FAhvzjr03vOLqr3++oir/zR2nmJ07w1OPPsK/YMXjJ+5lq8vUMYSGMMHUICk+gvYGavhewjtQNZy7wRQbYp+2dzkCLbf38KbvlKnjdcLxgzHTEEy4Fvzj/8Nr2BszyQtdcbwzGMCbukKfHKnCsj0OZ5XdMRTB5kXZnSszUVZkxhFOnZpxYTiH3flK7vmiv0rVV7N3+RN86Rd+o8jX3PTpBnffhF2FCwmeSDAk2O7C8muVWQ2ZYczgib3tnuodXSvcl5yYnRx5fPvLWW5/PVZ3yN0lOjWKOuYdsjJm/QfYeMGjyDhnWPZUCQGNbgZ0mUsXPp/V7peg/Sq6RkXCUIEFXgV0QFJHLZmue4zZifupVGzVdOdKQpMhc7DyUobhNYjavuiCi4MkxDRInlYUAa94Ba+G6BP0i8ep44JVUTIZpNmWpRLGRuPdyHgHlio5BNKAnupCamn7sDgDaR2xVRQpHX2/zYk7niAlZ1lC7kQUXCOamDec1XAX48W7QtKl8/CZjcZWpAedASWz+erdh4bFnKB91BppZYsuCgeYZ8rJOY9JYmUek2MBsQoCaSOx+9g2d57f4R53LAnmQYHNoe5VvBg2jtHyMlQEQ1aOntrgk7MFZ6wgClJryKgUQU8olx+5wOfsjrw0CaPAgIfzAxFQLMuRUsHGSrURL3Bxc84HTm/xpIykThnSjKGHkZ6SO7Y/+SCvfPQSXzs6yYw9NJx7idTrZspcmCfevHmCB2aOzRTLii2EsZtTbcH4kU/w+U9c5Et3QmdtpZnqlVFhY2OTh18w52c2T/PoiRnD+CTLO17G6g0vYbxv8/nbrfn2h/wrzo78590l/vCj/Lu/9D/yF1/xX5GGTXxV8bFQ58CwgcklXDeoq0LdGXAfELkdd0e3Zvj2CmEHuAvYgYWj813Sb/gdXPzxN0wdrxMmUjfh6MRkA3YTfLiDixnf7djTjksXekrJDEXYvaxIFXZXr2TcOYFYIVlEk6gwolBDqcs9UcloH/VWqh0pK+SwnEo5I33CRVFPsADLlcX8NzOWl2LjCfLw/8P5WeYbyt5edHPmpEhN4V45RrH9OIZPqGuI4XrKGEoSJacOlwUiHZ6be6a2nj3RkIEiPrNpArroHiV6IgFMBKej1g41BXfMokNTUpAiaYX9YVGVUEkgGZW1N2pCVSilayK7gpmAGpoct028LlCpSLbQvPWoB7MhgznSjXjpsDHjQqQpk6FZQQT32vrpJIyk0Ni/hIuDZqPWGEfRcJsyF7CEmMeYJSNJwaigTVrFFSTaCpxQXovpwrEK4kKtCpZx7+KjW6iTOK3ZVDz07GQIm/Ic6m0Crb6uqcPF/zCPJKhqfHZcomez66N/ov3OW4MuEgzFbIUwQqdozlFbl4XUAVnQJOQE3T1lVzZktFDvq0HUHMGtMScRfN8hwsGjMQBzFAMX0t7IuByoQizMFmIyVMMrYK2rsYx4cRgqOoDgdNWRWtuRC0M3ccElYbVQaqFkoTZTtchVexQpWBQ5mBu1GhRDzEgCBQsa7oqpY02wtixHZjsreoGSoBKcWtxQD50+F2clypA8HCc0oksmHUN1ZG9gc6+SykhRoTpQ21mBUqRyWWBHoWQokhjVKFWoCCOGGRR3Ks5Ix4hjOa4+y0JVKC5UgZITNQulONZlRndGjGoweqKYY1IwyRQzapcpKBWjakfplMqM2iWqGMUSZczx++RYdbxzfAWwbFG3JW49rhVLp7B6Bj9xmjpf4Du7cFvF2ISvvoflm9/Mict38T+fuJPvPnuBTzx1jp9//HF+aetUSLNXgGh2KAVqrZQERbsYCyzSrkS8OzQDxqgCpYAZMs8Md76QC694GZdP3Ib15/HRqCdnjNWxfouytUm9A+pjwCtEdqcVbcJE6m6IEP3oBjys0IWEwu5eYudcQl6o7O3ofuH2ak+RTUF6Zb6njJoYS6I283EjtrF01BqWSdJrKPl7RnKKDkc6kAWUniodXkODrEoGehBByaQuY5yE1JPoQv9dmr6YZtyV5JHCWsujapeRpOSQ2EJz1HXlkFIK4Vmbhc8ohlilsq6NEmqNldytdUyKgkRUxVJCRNrPtNXhC6igkuk7Y7ln7O4ImOJlwP1iW/bS/kK/rusSD2JTCZ38kNzQ9j2jq5Gk4XcqGtEfYulWvfJsX/9cXKhE5Accb/xKsfbdPCJT7fd6qAxV1BEEbdpweJArbzK3kmgLLs3XNIq4grQUhDFS2g41OBPiGsfX44+tNusvoY0L0ceZSkSn3OLLSHwWUVAJZ4mgKUFRXLwt/fFV3eLvcXAXVIyKkKkhBYKFQLAS1KW9vhY9YG+Vli523NuPhbAvU41jnQSRTFLC/ktpaVZvtCo+U3wQGisUhPiukiut/yHG7dBY52x4JyRPaPbwhUiNzGWP766KJti6d/dc3VrE3QjmjlmI6Hpp5E0EE2FUjVHyGnFLUXBDqqPFyGMlN5JFdXyMq8KrB6GrBlbw0WE0pBhiUARKXZMzxyTiit74ulLptB3htV8r1jonwcwxq0h1xBzcMFeKG241UspOCLyIxxVZC+LgSaiSAA9ZE3GSJFRiNqAJELmvSxxTGM8NoTFuFapbHBGjiS03Lu9gKWK3Kg4qWDsjkCDNuj6aIiFfk0BSE8wRDv62XbFoXJ3mIX7j1TEkxoA4U6s7lSCrxT0IMHE1m0DFqRa3aJWIrLpbnPXSzipvUdpmhmia429zwmr8rdYKo9OrkPpMZ5WXSiIDY8osKMxyYtTDK6pEyWaNK8jcMY8Ys7tTVeN7afu7dgMhhKBQcRhVGJQgsRjmUVdZcapofHcBk7ixEIlbaFOhijIijOqhEOlKMViJMroxYjBThm7GACxVKFJjEhShapDlUkdKFkqeszJl6JQiTkkZm2XKfJMiM8atDcptUBzszrjGSkwQMVHIRDwnUnd9kadf7WCZ4GKGU4ptd+ztZVhlxhripHvSgSekZGpO1KHDSqLWFGKw0lG8wyRjoRpPTgmzDrdM8YxYIpGiI9CCgNWaUQ2z8ogeRam0ExZLXpvqvShuIa4K0VFo1qEWUSwRbRNvPIolzHNEniyH7bMHSTISSRRzDZmJtRq/rNc9QV1jYaWxmtoIlgjR8KhY0lh0g9fhGiZK4qBueLtAvYkalDFUxdxi6rYq+2Qopm6LxbV5uYs4JEOTRWpMYj9JjGEYKGWPaquoyyMiP+tlC6nQ3gtqLMPtMaazIEPevASifm+9tEVUicZDdB3P8DXRimW9urfP3uInFmuXtxiNWZC9eKNYg1TasW1GUy4ZmiG9k5qcrbd7cENSiHdUVZKE7ynSxJ3b8uS1jdU6ViQVIZbxYhFHcQn5UpoQMMSxw2Vf0kOCN8UzXRPYIHK4Uz2YaZDL9fkWpCvOLWn+CO0cog1yGyPBGxVpZMzWS3j7STC3OAaZOAdFIlon3pb11qnalOJif0FxnCYHjECCpMZajkRUiC+spC5IYteCsF0fv9IUjbYh/hFpWO5tb9dY3aGt7vNK9kNktf2y1FZcZyHaYx4rl69fW6FY/P1YCfbTXleD1FHbz6ydSY2AeLuVEHGkESJPSpUWIXX2zzyzOEtLcaxGWwgS0a0qQaiQg6MTcWFrll6Oy/rrRtOF4iGEm+LWJ04MP3QFxPVh44CWGjWDQDXHXBrhiT0ZjolgteIe5NVaNNIkPqBgsD4rJGK1+1S9ZbqlncXabl+skci4fQSnggexi/EJNwb3+Ns4e3z/pAxyau3KSHFbkgRqJacm+50ihh5nm6FNmTGu4qZrWMMRJRenS4rXFZcsjBTns56TKTHrEtZm1ShfaDdztTlwWDs27azH4+yW9c3lmsy6ti8bsW6T6IwtKMVrfD9vs6yyf3slGr3fIuHVIu17ODXGB2EsNchuESqGqGG5ixrOJFSv7Saj6eeJR1RY4pQfijNYbcTZsaRUjehplfh8BcFaVeyyFEYVqo/xmpIppXX4qkdjiCq1JqrGTZYplBrfu7TPaSoR3fRKrYnRhaqVqoVaLKRhvFBHxZJQa9cixRWjo7CL+QnKOFDzJnVnpA4Vn29R7v7NjLdB/d7nEel8XkfqWu1TggcjgsNee1y1VWBQbFR0XfA96n5qCBVKURiEISldEXZmQr+2Rgq2wlAExvbv/WEV+uzQSyNRwth+30FzgwzslYOfrwV+rzRlcMY9ocvOOELn0ZzQrV+XfX/fmUh0dOlQ16Bq/D3xMccSlTyL7KHwX9pnq9JE5YTSR5qTtat0bvPI0ByKSihdjU1YOPbZHrv43f4YtfEsGRbZye375bGVhAPdLLoWMdt/r64lvroNgxRL4v7Sa8+gJTZeOf7M4/jlUdgXvh8FehjXfztA17WlesOuXNYPo3dYPe19JNKYiMBM4tzqYSxK1x/6284Z1+8zRGB1//WjMLTUr2SH3YMh39DKmNuxbD8cIY7VMs7H3ZToRFhscHAcD6HUdl4cOqfG/fbkdrzXrylxDhQJQQ1qRGFzvvK8zKPvf5ZOjTE77LXzgTg/6dq5UMMtYv+87w5+VkzB4tqYzaAOuv9ZSg2duaRxvuW14HW7lqpmasnMOo34U2lyLHRIznFc5kF6yzKzuA3mr0ofvcBphdpFitBcY1GoFv2yWanumDbztjH6adfBK7MxztJhRVqbkdUIINexBjlSxVDq2OKdNchddTB1vIB3JVK1qXkz1CGoPYA63vUR6arR7+Gl4F6wqtSuY9wbg2dqwmd+oKuXcrstqIhmZFWRutq/bXAKdJtYKSClvWcb2lrD0ixOxXi+LFBXQdnHgueOmsJ0rQ6O9wlLi3j/5PgIzDI2jpAyljwihcuClhHJXSOyGdOCdh2MIWspiw5nhH5OdXDNjdA6rl0jcgNYj6/Wl+IAtoWzOrg6r8DQvlt3MEazAUrkUUQFcUXHPVIt8e8qyHxEqqJ0UPcQOqggqzG+T1/opNINqzjbyLAxw2cJHzLeGda1prKhHR+ZYSnja/2XWtp+CzLW6MqOczz2Z4J0M6zPmFik1VcezhPLpvLYdVCjflO0xGdXQTqABQyrKPQowLrJzdtxqkskpfhsXdcu8fU6sd53Qeqhz2Xt71PGyxi3fik/TddxjKKMjTnFHF+fAynj1uG7OwfHpB/aMWzHp3ZxjLPjstGO+QqkHf9qeF3isoV1e7h0mJ7C2INUqWWB94bnO7HxMp43sdHxwfF0GvscsN++OfnnTpgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECf/lIb/eb+j+Cy+G7sWw9QKq38vu3p2obJA9gUKthTrusrFxBl88yXDhHMO5s9z2ikdFXnl2OmQTjn/O+Ythdw6McHlH5J7pPJowYcKECROpu65F9cI73kDnX0R/+kuo/AbGy69kHG+DBKWuEBkARegw60kKuQcFiq3Ii4dQ+zjl0ofZ2/0QJ+RDbLzwQyJfcHE6hBOegcS9muEDv53C61C9l2HvBZjN0FzR2SUkP4wOH2Z5+d2c3n6fyDd9Yhq1CRM+667zU8BXEivFtkFR8PbrZCAK5dA6p0/b5Gnb/q7Xf78CVoW5CC84kfiYiPzcNPITbklS5/6f7+LR5bey+eJvZH7bb2TG57B3Adh8J2n8BMtLDyP9r3Hi9Keg28OKoNZRxh7qBkM9he2+lNS/mtq/nlReyeIkjAOsxo8ybL+PcvmdzNP72Z3P2Vh0nHz9W0VkisLcqpP8hY98Gf3mH2bvyd8FqznzzQ/R95/AV2exWmA2QxYvZCivYYPPY+iA7p0sL7wTF0XLxzn1RT8iItvTaE6YcNOTutuAryuFb9hd8u2549KyQhKSgyZBHbbMWYiykoogqAbz00MUTkUQd0QUzBF3ZlnJSdkbK7vVuMPh/7x9Q/7INPITbmbk5/xCK2/+XM7mb+f8Hd/A3d23kLag8E52L/4Tyrm3kYdfktmXPXGsfT75b15H2XoNe7uvZ37im9g6+cVwz6vYe/R3sbv7GIvTW6x2HmR86x8EJlJ3y03uO6c4f/8fQe0vI6WS9Uc5ufWvRV73M8/y9y9l+eHfRHfXtzLI7+G2u74c5vDkx94GH/lRYCJ1Eybc7BEJkQvAv3X39wzCpgrfPYysHDwJ/axnSPCWfsY7izPTjj0M14wrmBmoYi2itx+xK5AYWXSJ23C+dD7jy0ZjPLtkmEZ9wi20sH7wlD/xtj/tl973VreH3P0J9/Jrb/VLv/gn/OEff8lz9j7nf/zz/ZGf+p/8/Ls/5OUB98sfqV4fcb/4wff4w//y86cjcaudd//hbj/3/r/v/oB7/dib3T/yG471+uV7fodf/tW3e3nC/bF3/2v3//iCaVQnTPhsmwf8vgcf9wcfPufnPv64P/DJp/zCE5f9kzvuv+VG9/vEZf/h3dH9U7v+v00jPeFmx3MSqfMH3vQbefzSf8di63dy4uWZ4czD8MQPkc/9Izn5dQ8/p3dnp7/zV4Ff9Yff9GZGvhftvpN+o2MchNmJbjqktxgeP/0/84IT/y27y3/Bxuf9cRHZOdb5NH/Dv3F//4Nc3v4JVF8G98ymQZ0w4bMONScezImv9MQqJ/qcyAq339B6I/KAu/+Zc5f4wsUGJ6ZhnnCzQ2+Y0D345j/F1p3/kHvu+T2cuj2zff+78Ev/vcxe99clPbeE7oqL7SXf+nbuPP3HseXfR7Mw63v2nsrTIb2F7s4/9m//PLff+Qe4dPHn2fi8P3FcQncwcb/ul9DV/wq1wAtOTSM7YcJnHUZxBlGk6/CUUCBnqDe81ohcuu0kPzATNqdhnnCz47pJkLtvce4X/jKVP8vJk5lSYPfCWzl5538n8pJf/fX48CKv2AX+b37hV14KvIFTJ3Q6pLcIoXvwp97A4uT3sHtpxqmt/0lEbqgTWrZe+7f9/Hs+Dy6/EPjQNMITJnx2TQldZhQliUcjhCgpH3Sy3mj04x3VuW8a5gk3O66LBLn7SR7/+f+VxF+gpzLuwfblt3Ly877714vQXYFTd/11xp0Ps/myF0+H9Fa5HdH/gZOb97B97u2kV73vOdnnbad+GnxnGtwJEz7rkAREBUQggbQu1+dE4UFEHjyR+T+mYZ5w0y+N10HoNnjqF/8anX4Pu8vLbM1PsLz0Pm5/yR8T2Xzgv8SXEHnRL/ne2/8pZTWFx2+FW/LHf+U1zIYvw8qCWffTInL+udnzK37qelO4EyZMuAnmBo0iik4wd+S51Oya5LImPC9JHY///F8kyfewu7PDyZNCloeY2X8v8rL7/4t+k/lX/Af42GI6pLfCzL39W9GtOygFUn3oOZy0J0I3YcJnKVTx6pCE6gAWs8U0MhMmUvdsa+njb/mjqHwvu7tOlwe6fJK98v+SO772bf+lv4iInJkO5y2Cvv9ChuUWnYLO96YBmTBhAgAVJOici0yEbsIteHNzZEK3894vwuT/yTCcwOtFTm7dweW9H+f2r/zH0zBO+PWduO1zqJZJCVLqpwGZMGGCgbpSUUwUE8F8itRNmEjdMxA69y22d7+f1N3HWC6xMd9iHC5yIv9dEdmdhnHCry9kQamOJ9hbvnoajwkTJk7nAE71iNTZ+nEamgm3Eo6Wfn30F/8kvX4ty+UK8crWydvY3f1HsvnVPzsN4Wc33HdOwMUs8qLznzUfOsmAu7K3Gtkdfrv7Q39P5N5HPmNjdPHHvo6zjyzl5X/6Hb8+x+TH7oHbFyK/+ZO/fufBe1/MJ996Oy978n74G3ymb9b87I/dx+2vm4u88iOfue/0d06I/KnLx3/dk/fAk/dCOhlT5Ogw34G7HxLZfHSaNW5OUidOrZWKUHGqJupE6j7b1iO/CzgFbBKdyxXYA3ZEZLr2ngtS5/Xn7uWJ+ocpskWpF+nygt3lihO3/5vPzpPmk5/L7mO/iR15IdTE7vlKyh0pF8yFy8stMh/lFa//VyL3Xr6+93jX3Zy7/NvYLvfRm1BWlb5TVjZDu8vMFx/ljq994zMtnO6/+p2cv/gFJJ2z2rvEcmdGztAlpYyJUfeY51+Su77hJ5+TAdn9hXu5mH+HP/TvX03Sc6j3aDK6ReHyxQWbW4m6rCDKWCWyGWGaCJ3gtUOTk8RJXUX0EmW34/wT/04+74+86TNyEOt4hpQTq91t5osv5NzD/xXwjz5jJ80Tu7+D/MJv9qfe9C7ooA5CHT0qd1QQcaoLZQB3ZdZVZukyQxlADdWMcQJMESuYJsQVRSAppSQMp++M2cZlzu6+hCce/CDw54513u2889Xc/+Dr5XW/+18c+zuee/w7uP0L/gSPXv44+c0zf/RNlSQVc6OKQTFwZxidmpSZjvRyjpUbqkKpc0RPk33ASghLJGunS1GqG0khdUbfjwz6Yj7+/l8E/srB5//Ib+DSQ3+IeQIru+TOWK4qkLm83GCWCikJLhnNGaxDslKHHu0E0YQmIc+c2eZFzpzr/aH/6+/KvX/gXUcaP/vFL+eh8/81j7/nN1N0gSTwfsTLBq4wf+S877z7PzOTn+GJB8/wohc+IvJVT03LyM2BCtWcAphAqU4ZngPx4SMQkQ3gK4CXAx2wWyEBijNLwgr4qIj83A28x2uBNwB3AzvElbV2v3m/iLzlGV5zN/D1BV6GoQYrA2bKqhbUEo6QMDqU2ViZ1YGNWc9qlngA+BXgfhF56jM4dncAX7SErx4GXn1p5MXi3OnOSUCyMohwsRpPXN71jy3mfCQJHwY+JCKPX+d7vgD4YuA1RLZytz2KGRsoWSHVGN9s0HdBMHeAjwEfbeNy9gjv9a3AFwHZg2+JgdsYY64Js0pWxRCqgWTfrweV9vdZ4pyetff9gRuL1D24830sNl5BWQ1gwtaJDUp5J7P7PvDZeenfd4F+fIKd819MGb6b2+7a4tIObG3BhQu7uPwEG1vvuF5CByDyZU/4zi89yc7FrwX5g7z4hXDpEmyfeRubJ/8jnVx+9kjI7Y/C3uezXP4+tk6+jOIwy7A1hyeefD/diX/Ind1zd8ey8VseQD/wMc489h3cfvJLWBVQgcUMzj72ThZbD2CeUYVOHXPDcIQQDHDtEUnkbkaXF1S9lzvvfRmfevQC8JkhdYyPkGaVVYUuL1mOf879I28TefVnpgNb5vczv/0+un6PsvNxrCpSoMtRvaMCnRi1y0heMi5vZ698FVsnelKCSxcuk9K76OfbjLsJkQIuiIKXREIQFEgk/3IWmy/nzLn3Hvtzbo/fxeaJP+kP/K2flfu+73gT3q5scPr2L6Dz8/R5m7HO2/eDWkE6p1QHNXJeMu59DkW+i62TMfWcO/cEi62fgdUdISpRBcdxcZIL4hUfE+Jzqn8xeTbjqYf+6pXn4uwcF/sd9pZ/grvuOMXOALdtwOOPP8w8v5M6LqhegxwqIAmqoJ4RF7ImOsnkfJKkr+cFL4b3vOcnrj3xPnySM7/2Z3n4/Pew6C/g/l6cdzDvHibN9hg5hcmdKF/J9sXv4szOnyVtPc67PvT3gb8x0amb5IYdatuKO5VK5deB1InIrrsvlwN37iz5Ywj3FWdPMwut/OptJ/jBBDcqh3LJYNxZ8s0n5nz9sgDOT8073gIsn+U1A3B2NL58WPKnzaieSCvhsU75OzlzUSGj5KGyORROiPOSYeQVLrx6XPGYJN4+uL+pF/mR55jMvRz45gJfu1zywgoDwuMufEiFqsqCymaGF1jlXuC3bC34pr0RhsInVfjVYv7vk/BvroN07gIXgZetBv6YOXMRahLeN8I7S0VmCSrkUthU4YQId5rxqr7nrrHylMPPu/tPAv/yGsL3jzl89XLgjy167l4Z1JEdMf5zVbaT0SVh9EpBGd1wV4o7qKJuJDHmg3PvrOM34vwCcP2kzv2f3MNji68n9TPKahtHmCVIs58W2frkZ+OF39j1fwD+g5976ydZ1r9J5UkuXj4J/H157W/7fzwn77P5pW8E3uiferO5zL5LLu3+HC//8LeL/OWdq3++F74TeKef+fc/z+Xy7xh8xbDbMZRt8vk/Li/8tnc/x+OxA/wL95038cBb3w95Cy+OivKKb/tWka1zx7pYz/3kq3jg7A+TFp9BeRD9IOK7CDN293Y4eeK1PPLoX3H3P/kZkSVJs7vY2/k/eeHGnxP55gtHGof7f+zHuLD9zUhO5PzP5XO+43uO9LrxF1/Fxz/2Ayz6J4817mff+HKG+m2cvu02Hrj9u4G/eTyeLBd54OF/KF/w7X/0aJPyzmk+9MZ3Uef3UIeB2eLvy4u/+a8c6bXv/BvfSF78Vfmq73vblefiy+4H/oJ/8F/tMt/8i5zf2ebkoqPW75eXfsffO9Z4fOLf/gF6/9vocO3u6POf+AE8/346+3vc9ZofEPmcB5/lL/+2+9tewRPlu+i2/hyz+W+YqNTNw+nEMDRSrw5VlZJ/HUhdm0d/EfjF8+f9MZ/xt2XkUwqzU1v8L1nkx56D/T8C/HN3f/PuyEdxLmz0/LH282d7zXngp4CfurzyV3rhi92xJPzK5kz++lUI1727hd+P8KdK5betdvnW3epfslD+x+dCE9Td/4jDN+7s0s/n/MrWnB8UkV+4ShT0VYPzFZf2+CpVvjwpr+ozL7u8x9fl/3975x2nV1Xn//f3nHufMi2TSggJREIvggIKiKCCFCsK1hV1sbDquuq6uu7qqqvu2tuiP8sKLGJBcFVwAUVUQLAgKkIoIUAgBdLLZGaecs85398f904SMMnMM/M8mYDn/XrNizDzPLece8rnfO+3JLxIVf9LRH7aQlsOA7cAt7igs5qO00XI0oTvl0Q+s5PrPhh4aWp5I/DS4YyXJpZTVPVDInL3Ds71J+BPLqjbVON9COtLlrurZd62s2e33Sla9T0SOGzU1XGnf12SvAjYhyzzBJ9HGg4MO0xy6xNiGuiacgdDw5ZU+oEMmy5q+zm6q7eI9ykh/Gk0Qfcopj/7LhqNQWzSjVKl4ZQ9j7mvc5NS9wAhLCWVEqKGoAa6W644ItNOu5dScj69M5sde24zD7kWcQ+jziIYhuvrMfYcHv7ZJ1S1p+3n89kq5s38L5HjNo5x0uom7XJgU5K0TPfUsbdfevy97DnlU1SqLdZNnvYsCE9heEDo7z9DB6/pb+nrs/a8j0P3//TYv3B/D2kVxCbYkoFKOuZ7fPr7r8Wkl6tq33Y/MLV3OT6rkGgXGsqUelvOISv7nvktBjfcwOx9d9ofdOn/fgKx59Lb9bcy59R37kTQFePkhPtk9ukfYcP9/0g5jbWmd6cNu8WTO0UggiusdLvUp25KP3cpKEJJwSXC4jaLx7UhsJqEJa2IAmN4xFgShLKOInRFZGl3Kh/vqfC2AHdmGSvqTc4baPDZCYq5A4PqN5uBVwlc3dstZ6VWProjQTciwETktrKRr07pktf2lHl7mvLVRoN7NeC855ThOl9pZPoP49sJsE5Bg1IGekdpl7tF5D+AV9c8vxUBMbxsc52vq+p+O21/YTUQvNLloTLauXZggbvICvcWr4/HKepKU45GtY8Qmqj3lJOU4cbDdJkHnhCzwPBACQnNIkgqw/v2TwBGBD8MBNfaF1dUAIcGC2owIjCvw7VtwxAhOEKW4WoKj4xvlzvnedeTJos6dZUiM5YyvOkaksQhztCsQ7O+Ds/f8+CV/0/1+gPaesL9+i+V0nELW7J+ZjWHOo96qA+19Nyk/8wbZPaZPxj7ZDk4jZp/Hon1eJ9RTp7M4kde1Nrm4/DfixxydwtKN6BZBo2AOvCN1oTXkWddJCID2x+Xw4J6AEvIDPXN40sqPm/uJfTsWNPp2sufQWXmuxkYvlCqT/tuS89ov9d+nSS5S/W6WJpwN7HUeUXIfZG0EFbe7eKUJgKC0rQp3hgCbSpT9qglxdIQw0Ar37GKF3LHmZD7+41l6brSWi4UQYYa3OcC53jVc8Yp6I5XzwUBKBleIiKXjFPUXlux8pbeLv69UuYuYFWtSanu+OhQUz/R8gEDJiigWKA0xmv4TdXyz40mD24eZpMqJzSVD47SLxyCM2bLRmM8a2sNw82M8obV7HgH+9m98PapqAaCa4JmlKzByl2QPDHKpdhQR2jkvojGkZbab6of2mSwBry0uKt3GSF4NIAxihh2wa6zjohHJOST455+nANvLXs9+2cdvdK9pn2R1CwE7YIMsqbQyFah9hyWbrpA1/zk7MJ03wYRefLq1ieL4FDxeNf5p7b+V0eTNE/NAy6CB9tPpfuZLT6zFn1Iy/m9ZU7RoJRSae18O4m2NnhG1manEMa2CP0FXc/9GX0LfrPjTV3ybmxaY+99vjg+sX/MhXBsTH69mxjqjGwVUAIqOimRr00xqBWCtZ0RlCI0VElbmo6g4TV3xlcz9vy0/WU53xgeVKWMsmYg4293aGHfsaA7QpWLxHJjIvLadrjIiMh3qilvqKbcJWCajtWZ4x2bNuvHWxacbJHe0sL5b6yWuViVKQ3HukaTU1T17B1ugfNIMy/gxYyvX4rIkIhcP1qAyI4fbn2P44G5eNckOI9qPolLY5HIQSueENNAMqUJkuG8EtRjkvaLOi8BB0irVsB9MhQHqmyZnFQ62yAmI3gIGYWlxE9g0HU0JYYkz3gQ0/gApGuRpERCAyEQzBK8PZyB+gUsu+rzOvSrYyenc6UB7yGEjKTD1oLN7tlkGdTqd5FWUgKetHyM/unKfTt30hkQjCHzgUAgaPvuUVNX9PiQe0c1zDj74GaRg7cbVKRD9+1D0nUC61eshQPuG9/x976nVZ/TSOemhJIlJEIwoMbijeDLuzqlSUYAnAEviqcDlkLnqBvZYXDE9odUQEXIgMxKa23SXeL7PWXSpqMWHIfA6H5d2wi6J9Uzvi/Cd0XkX9srbuWeUsJru6rcAfRlnqVqeEetMfZXsVq0DePIaVi2/CIEHgK0kdFdczx7J6LaqeJdwIcObzZ2PFkauzf4KuobhJChzjA8DGly9xNmGqiUPaJu68P0nWhhR/CQSIuDu8uBZBhxoA5VD5s72x6JeEQlF4+i7ObZ2GXWGddimh8mSYawaZVEG9hg8boWSTbQ1Nfx8Prv6OLLP6orrnnKLr04m3gwCokn2I6dRrMbD8JxAoON/0el/CWq3SW8aSKlfbHZC+j07KGaL1zBt2/DUa66fNNsA2ICuPZvZpbd/1T6pydUqw/HBOpPCIyAWou3hmACI7uMcbusqOq00Xyl/nIvR7CCQ/K48Y7MoUpTIGvJUmdQGbEUWVpyBeoq8UsDwwg2KL2tiLqG43tpykIR+XBH1gCR1ZWUv+su8wCB3syzMWvyLlU9cWwNQ2400XH5X95dSvgjQskHas6xv6rus/1ugVdFAVdYkDtmoNlxh1fTh88s3nnUuzxPWdbAJEueOPOAg6AOLQaehPb7rJngc3c6afUheow28DiUZu6Tt6mzIiuooipsmQ+R3f0Jyj4v+Dq9yb9g0rWomY4KpBaMCSAPYdNuQvkDbGp8T+/7yQd1zS92jeVOJN//qUDWQVW3cvWJaGMKB535afY84AaGB9aQWFDtoqd6XOdusGbAjKQtzF2G27dqKT6AakA1YMtZ+68/m4MvGXzSS+QJIepGOo+YPMdXketr3Dv1pudVwPEtS64iQMOC64Sos4amtChArMGFkFfZMNpymyw3nnWS+51Z8sTAowu6hn7QGg6y8P7OTrWypJrykcTQ9IFawzDVe96oqlNG7TR5XsOmL/IbtnjeNdawKOQZPGte6AVmbV87ohrA+eLd26SIOnQG3ie5JSuvwII1Q8zoGXjCTAP5kAto3tKYDqy9xijOgzWh5ckhaCCoz9+FqocNnRV1Xg3eGUKwubjDPB4eo0x/zkV0yzswpT8C/Qg9GKskaQoyTFJZTLkyjSz7EGs2fUfvvuyTuqHTljthq29iB6n740jMHXmqnrnLKJkrMa4KWQ3NjtF7v3N8Z05cE8QW94lgkvZNUtYEnA+IyUAcNmm/qDOuQlY32PKT9M5LjuUJhKqepqpT23zMWap6ZpHQdnfEky9UjpBbySRfqEvF9XeN8T67VXVqpvqiTTVeB6wYx9D3BDyGrBOiLgSa2qpVKa+F64ISQmjtmkRkEEMdk69CYQyCRFXnm4T3Joavichdnd9DyzVJyo8QZjSarNzU4HTg+WNoFydC0xhq5Hn9WqKUshbFGyGTPIK2ZwedUwpTiYbQWYPJjp33XdgDoyDB56/iguKDo+ayJ8zsV1JFfdHUHdIvASUE8mCMcVjOTPBoUDwhz6vZQWyQQsxJYVm0j5dHKdOec7W6P9zFw6vfQ5AzcDoT8YPYpEYIKcJGKqU1BDOFZngvDw88X5de8VnZ+8UXdea5F/6PeUSeqGpXu1/z6dDVx7F88zymTPlMMbFt1jVXX8ng8CuRZBDvZ0Pl+cCv23+D3Sa3hajJX2C0cQAZ8fmWSzMwYKT9c443QwwNG6xJsX3vA858Aoi52eRWkU1AW0vaichqVV0AnK2qHxeRO3ez288jCgMZBqcwZJXy+kHesn5IX7GpRrJmowoW4z0YiwbAewQwjty+/cgm0gB9qeFIsdSBtS1LOsWLkBU+bJ2Ys32rljojeZUCEbTVrbqqdm0eBIEMoWlg1GS/w44PJ3ngyrd2VQfoKXNBM3CSb9Bbz6DhOU1VrxglMMOpkhHwQKPVc6ZCZiTfUJj8lfh2n0tK0efCFttRxwwmO/Op60U0gLq8egCaO0NbzxOF4CQXXJr7j2VZ+9Wzam6pC9p6u0kI+dQjYcsr4l0jkfInzrB9PD1OSY56UPY+4210p+8h0ZsRLN5NIzibz60uRd0QaXonSTqdevZ5feCHX9ahnx7Q/otBEJFcG4t0ZGe2fvMJpLpJpp38ky2/m9H1J7y7FQkpIdRROUHvuXBq+1t7miBGt/QVaaOos6UMJCNohuByi12b2XP2HQTXZGCgQan6Yr3zso88zgXd8cC3PJwDXDpKlvvxCrvPAlXgx6p6+m5qrfOBorhdvqnao9Zgr3qDmc2MGZmj33v6Go5e5+kJnh7n6NNAnzr6CUxPDL2qBB+ok9cdbW3kF5Ut6NDrV2MI2uJ8kuQXpgawrc9EUzXPrUZiWQcsGqUv7psoZ4jlBmCXpT8TkTtKhp8aSwqsbmQcChw6ytcycvHdpEU/RYCsQS95yFgisBHYYbUnC5paQtH+HVtbd2ypE80K1yrNRY8o1mStBVLv5rghgwZBbS7s0g5Ev6Kal1lqucMUdVYL5a/ouIZjy5eLYqTwkxo0j8fHKjNP/l/VoetZfsPryPxLMHIA3pVQtxnxSqACYQOBdThezYrBQ/XBH35S5r/kmrYKYxkxeNJ2Uad6yWwWDR5N/+zrHn3WZy3TB6+8kqzxVKysRvUAkp4X0fbauBVFjEeCYoySJu2L6DI08RoQyZ2X07Ttok76n3azPnT1XZSSo6gNrqU6/d/0nh8aDjzgfJFDVz2OxFw38NrM897UMt/CR0VkYQdP+cGg/EDhm6r6EeDb7agy0JZnavOar+LxRZ3Nlf29fMTuJLntDtq0Z2Ods7zjLeMQZaK51cZrGHcynlFNktLifOJyETEyD7V6VQc5pctAVQ2/HE3U1ZucDUytwPWtp0qaGNWEnww1OcUYrApl8nq8t+xklnaALzzeXatjb2CQfRCaFkhT7hGRHSWbtsYU+RM7sB6MzVKnYQA1ihpLEEUAVSEbfOJkUXclAxhUBdXOFJTJilroLXaYYtwqISjBK94r9HY6UEJQVXQkUGK1PF4frUj3Opn3vM/xpAWvxZivAQ8hVAmhjG9m4BKCWoJfjE33Ysh/Re+9/O/aqem2jF1r2//clrpnUzZl9njW9//ib/tMvQErKzCJYlPBTjmp/S1cB0LI3QrEE2xo66DREAiSH1+Szrh8TO37MuU0I0ktjWwZpd73s/jur+q6nz6rXTkOOyzoDlf4osv4pFVmu8Afge932BpypxE+4jI21zP+TeFzqnrC7jDkTZGaQkwuqoKAGcfiKSKDU6tycbfh++zA8X1na6pXlLxAe0eiHEdeGbc0tQes5tt1UaWlNXxgmJOC0g0Md5f51mhWYDEc1QwMQ3uraYwFa/m9FRZbwfpAswmjRi+bPHfceKyq+wXDAYklmISN5dwyucPTSF5JOxQRCpMRKMEGjPXYJH8JHAANJTbXqzxhcLkPWQgG9ULoQGUr9R6XBbLMtfzd4PMCJkrIN4CbOyuycldOj4yE4m963At4kUOWyD7P+yCzp76NxF6GyDqM7SUECHWH0SpZfS2lZD2Z/Lsu+v6b2/n0c2uTtj89TN08g55pt4l0b8e/5YR7EL0R0SkIG3F6jN59RZsX3upIIE/hXhDaeH8mYMRjJQM8pbQjeZ2k74TvotmXKVdSxBtc837oOZkVmy5n0WX/qY2fHac61L279WlV3UNVX9dwfEeVVwdlpYOaKj8Wkds7eN6+wjJ4mzX8LsC6RpMTHHy1ofo+VZ03me0SimjXwvrithq1xkeli/8FWk60L/k1hKJ6QEceRav3lZgR315EWrAfquqBznGSKmUSLqmIXD3K54/JPHuLYRXjCTKZ+KZjyMAikyeBbjQD+6rqDqu+GIO3lqzoM63yVGAvIwiWPwCjJdxXI3jT4VRhyU4k76bcf9TkwyV/fdjD5oFJKYujG3/4dIZ5EsNpH5Vyis0GqNU91kJqPbYEvqLUBy0hSyFUkNom9p11k8gpO+hcPk8lpBacgpoOlAnD4bynbJrjGrwjnc2I77ilLq8m4QjiQTw8ozb2wf/I/tDYLDJ/5W4p7rpPuBW4VZf98HSCeSMNc3SeEFrrWNtDyBqkrKTJu/Xe762UA15x5QTFvBZWz9BuQafrvvUc1oUFzJh70Y4mNl11+c/Z3DiLgEH9HNLyGcBN7buKmo7sOgAPvo0LmGrh8REKf1I39m8+PJX1v54m08++f0z9Yu7p/6IPXG1JzRvQRjdZeJBKuUy9fi6LV7+Q8IMf6sPXXCZzzrhlNxBzs4CDFf6umXEChlojsBCLKeW5x+ar6nnbbNi1mONHNhWm+JHHbOxlB/9OyJMtVqT4m1ckCIkmlI2yPgQGmo6+RHlT03K0ql4I3CIia3d584APSmaUIBZn7MSSvIrIeNJ3aVK80tNOJZkdj391QJC8ooTkgVs9IjI4Sn+bsmmYf1NhriZ8Z2aVz41qRYRDjNAlls3kATu7nK4uFg0P8xygbGAKO4hI3XLJW4WWtjAWD6llnG0M/cby+56UC0Z51awi+GLr21KqnaLW674iMqY5aCfRr42HsdVGkX9KgQYi08nYd1JmtK7ZQzQGAmXmkPmXUNfDCImjiaMmYJzAcBnvDK55G0m4GZPdBtmOrZHOC17BUlgGOiDqStbRdC4XyC1u+EQUFZ+njDAepnQ4pUkAsQ7BY0wTft0FbBi90z0yjUf++AGm9HwB2C1F3ZZGnfeSn6gO/YZHfvlWMs6iGaag2RBICbRJuVQhc/+oQzfeK90n3jP+iTdoYfGEgLajNM4W1jVPwOuQyFF/2OFnpid/ZHN2N9bsT6BJVnu23vW1J8kh57Upz+SQR0MD0QwjWeH/1h5cQ1BsHuCCoUF1jJNfD3d+/00ktbXA/WPuE/s+77163w9XI+Zc0jCXkG0k8XeD9OLta1m17gy97dtXcMgBl0npmNsmSdAdpHBOvcGzMTRVuUnzpDmpGGyWUbYpB7kmR1sDQRExWwSappagiohss3Ll9h5V3ZJ4R4ukuVujxxS8YtXlC5GCYKmrYb0RVhhBmp6NDu4vBfZyhn+28EtVvXicomjcvcZCg4ALkBU54joSqDCqfALnA8FYPB14zSa0bu1xeQ6LzAohBGQMgu6I4WHODcLe1S4+3Z3IV8e4hOzpFZPAIDApSb0rhiXDhgGUeYyek0+lxWoSqnokynsIHCGWG7pS/msMgksNeBWa3hNIx/b6XFV7gbOALnbiGzg2UVdJbyeY9aifRfCN3HKjYEoLVG+dJnL0Li2PUxRUX5jf6KJv8NB9XyAzz8WwBoPk5jY/C+EWenveLnPPuGP0p1/yYDwqiqjHhvaLOuc9QT2+1UVveOv0qyO7iGkdbmUT8rx92oRQYvED/6QPXLGO4A1Kknd9L2jDYFXJnMENdXPntYdSrR7Gnr3/xuMAke5NwMd1zbV34t0/oswhZMO5sAubsPZgVqx7ATB+UWdwoD5P7NS+ABxd+fUDWVU7ga5pO7UkSvKS+/Shy68nhKdikkcQM59kzxcBX2zPlXR7xDfxNFGTYYJr3xNKQJwhBIMEQ8bpuvBHR9JTCjScYpIE7/LS5F4UV0/xzYSFl09HslOw8qaW+8R+L/mMLvvRbxgObwCOw4a9CDqI0QeRtJtm41zuvPN5etuFP+Cwfb4jycn37eJuu0rgpmqZTTWYGzLKeFL1eGtJVLHq2WQSEqe5VQCbe8fafOuqI/Jiy8SyNekORaLekcg4KRy6VSAYQUKKGUlLboXMOzJyT2RNEiohUNHAA8BSgT/QeiqQic9eI75RAYfig05KRRyvhswqTfIUGW1/BVtYILXF73hCXukigFHVw8lLFJW31QIe5jQcR2aemZUuVnbBW1pJX+OFXs3FSwaTUnsXYH1qqGVb720UwycaRrHUFYmM5wAnZoGXhECvKfONXrhQRJaOcZvvRRjCUgrwIlU9jkA3DjBIocbsthb1ZpMDVTi4nPKZFmbPHUxy8191oy7+wX2InY1Yn+d1lGE8C/DJVGDSah6KHLhcV1x1KU09lbScEpzDJl1kzpFWfyBzn3vH2I6U5S8UjPGoBFwHLHVkAcRhXIvHLjYQIwGwugvGhxFPEIcaj6SBalJBembiGqCSYJJc1Pk03yxKA2ySYJJViO0D87gqtyQzT71Sh65by0r9NCKzIAwjmuC1gXKC6vLLROYuHdfBVT0afF6lI2uf4NnkT0dDN3Nm/nB03ZVexyb/GlKbr+M+PEuXXXCRzHtDGxKId3mMaaDO4YPD075ghiTJ12jFkGmFUmk63YkiakiNwSYBTRVxQuZBsQiWxAols4psfL6xMu/Mm4Gb9aGLX8wQr0LtYSTMwGd1ymYJ0EMzvJWFS0/RB37wEdn3pdftujlPNgDXqOpNVXh+ZjjKKXuqgaKWZyrCmtSwMM1TK+SRw7LFeqTbLLLbWiaCPGp925KkMo/yEcQU6aWL/1dgryzlwABdKEkilI1hQwI3isjlkzegUSN5eJ8IamVyRB3gEJqiZNBRv7qxDynBe0uWOWxiMQ3Pa3ygKYHUJCRBqW5uMNd7ppcM0ysJ/2ETGU+OuVSgIZNbYtKJkG0TJCOjWFa95hY9s42I25s8vVwfMBXYK1MODo6ecsoVGH4uIve2JPYh856QCBICszNPP3mdYh3xcjS5dWrEbm680hRhdYtb4p0t8o3bCaWn58NZAsgGhCexcXAuLbze6AxZQE0NQoUQhpHQA2YlXdWxN7QrHmpQzf13XAfq9GkewUqrgrG7mIr91n1zxzIkb91MYIwD6zEyJHNf/JaxW5B+9F50Q5nHGdJ9yq91/c2fYWDzv+OyLoIOYnWYoPux6cG5wPhEXQge7z3Wau6j2I6u9ItpLLzv6SSl30j3KaM7IU+fcg8b1t+Kl1Nwfh2qhzLUczLwwzZ1F4/gUHW00ynceSF4ITiLpJZS5X9kznMuHdMlbbju5axZOyERLfu87grgCl36/bMZbr4Yw1MIYQ4wQFJaAmZPNg1foPdf8R5Z8OLLdu2GVjYDl6rqwhRe4ODwoKQoXXhqmM7kqHvMlHYycGiahz6rgT8Y+NEuft36l5QgcSApKuTZhJmEUofeo2K2BJy1naKig7Y8I4E3xU7twgAALsBJREFUufW2Xkn4KZah4jhlwA5mnEVgloMlg8Kpqvq7naTo2JG1VICGelIMkxVBbgpRJBia7DzzxEiN3sCjU72M+KB68tfIi1Lh51KShycg9usIBmVVYvhQasfmd6qqzwWmt3bzO7zd2q9QvxaXJQSnhFBDtIuBtU9hsjGhkVe7CILRkHuRhGFKduy+S4kNYF0RINChig1FZKDXFo89lIt72dYttls6PBvlO3hVh/OiumbOmL+7x4JLkRds5HGITHvGDynZn4FW0JBCaKChn3Xr9x73QS0O0YB3gdAmI9bDK54Dugcz+y8cmwB49ir6qj+ApsOaDKNdGPv09lzMEKB5uh1pfzAIIViCk9w3Uce+Weg/+Sr272lLBQ3Z++zvy0GvPoeurs+j8gCS9JPYmSQyQJIMUqt/Wh/+xamT0mdFForIJxK4XIT1eEoK84H9Oyzo5gBPt1BVWJMIl1qRz0+6oAPBYQVMHhyEaIfzge1k8Q4hjxzqZOF2bf3R4QkErzRE5Bci8jsRuUVEfiUi18+s8pmSZWNQuuqeJ22scc54Vjun1Hxenm3GZMn7LBQZSQPryP37dtaOTsM2Fc/z8bVMRBaLyO0i8tuinR6eUL/QonxcvqL3tfDdXwO/b4ulTvY/91pd9O3bUXMiPtViZz5Elh2nuvq7IrMmL0mn875IkJzmEYYB1HmyWgsrqM0TK2/ZURnt0PDTR3eZsTCQe8JIyCemoJ3fdSp5jdngPeo8/G7MZVNEDl/K45mu6hXUGich2UyCW0swZazOGvfxAnkE50i6yXbQNMeS2AWsvu9JuvR7e7JxzRSag2CNkqlnSleT1GbU0kD31ED/tEE2D0zB+02IlAje4fwx+qfP7itPeXebMr1Lfp/tdJ8RLzBSodJlZIM69n4oQ4XibN/lzD/zAh36+c9ZvfnvaTReAGYPxK/GJiXWrfmi6vLTReY+NEni7keqeicpr6xnPBs4Bbi1g6c8CThQ4E8GfjBGf6Jdgc0Te+avjo0pQvx2vahTMXgxtH+jM3KCgIQWB5wVMitkXvHVEkOq2v3Y4C0ReSgL+rX1Q7xHPWu0zAmqeoKI3NTCvJcFJfP5Ne4P/GYyZnMMRpQGwlIR2Vnwng+KlyI6tZNiXxIaOIKxNGmhzmzxnMb8ZjQZQw+6HDGHEVwJH+pY3YjYQ9h02wHA5Ik6xaM4Qgh47zF4NNRJXAtlXVxeqS8AorJlGmgnNWfyhW8c5dXyV95aZBfyefBER1eIorP53HrJvk+cknCj3Xr/CTfqgz9aiHOnok4QG1AtTcSmASgSQjvK/OmqCw5lfeNY0m5Pg7excahKVi6TZRavDaDBsBlGxBOsEgaVoeEKJq0R7DLw80ntZsTMoTLnNOArE7uibvIyYSFgrCcL7eubFod3vmg7hylNfv/oPvlB4J/0wctuJUvfi5GZZH41QQ5k8a1/A/znpF1b/orso6q6XOG5qvq0saY/aNHUcyBwCHCNEbl0dxvCFFsLaybVn0vF4hMI1nQm+hUF02Iy+wBNDA1rMV5pJGb70fipkR/VMn3yUMbxzQYDNcPrVfXOsVYNKVnW1UCspaFw0CQ9g6pRrMD6LjNqsJsPeVSw0NnADmeUprV5hDkd9DkcVdTJQef8UO/69gtQfQ4m1HCujkn2YM3G5wK/mjzLSqVBvdGE4DHaQDOP+iY9fuxe0jWrqAnb1LZtf1EXUYMLgs9aFEhTQIJSmOiwBDrtoiDBIaEJwRHEjZTC+KvB1+8h6LPQkBCCIJXx3781HiMeNXkwzkRZ614MSUJX3ytY8MzVuI1VkoMaYOvFZLRt+gbD1rJADe7/9rFo9eMYsfgQ8Ppc1csvFnnZ8EQ7d+5LFxQj7esrmjokOAKe4C3Z0G7TRWT+yy/Vldc8zID7KoQebPkRxD5XVb8mIusm9dpELlLVlcB+qrpQRNoduLQA+L6I/Hk3HL0K+MTiNa+UnW/77SRcRyBIQihSxrTdUCB2xCLRkqhzomSqpGJ2HtRUSfhsCOxd8/TXMmZWhdcA549RUDxUSpCg1AIcoKr7iMiutmL3GaU3KbEMuHeUThM0oJiOW3R9ABccYpMt/nodYWwHntn/38AKXFbFZQHf3ERWP1k3XH3k5I3hZkbwTUSbaMgILsM3HM362BfQqvEY9Xk+OBUy34EpQIQQlMZw687bGnLBqaq5tlvd2UAJ531uoJdA0Cb0T+aOd9dj7ApE6gSfoNoksWvGfywpvDQKa+tEVomhj82m6U+mp/cmmfP8W0XmLpX0sEUiyYMislJEVovIehHZUPysK363SkQ2yn6v+QmueS2B2QRXR/Rg7uWMNvRtw0iOM6dtnBRNIJDlqSmkgXFud+omMvuMG+lPP4MguCGPc3syfMteu8W1iVxDnmQ66cCxr95NBR2AashnSkIR0dhi/rG2zSK5sCPkkrITsjLfrLW20GdaFK0cTRCKyFBXiS8leb7D4c0ZJ6rq8WM81cLEMGQ8NadMAybD/34WULWWP48W6CHgMW3NnL7j/pmXj2tNe3VK1MnM5/+WSvWywjesgm8OEPx0Vm14+aQN4cwqqhmqDsjQkKeQaMV3rWQcIk0kKMEX47Hdwy9LCJmSms2t9gGCekLIxV2WyS7odrmIzFOXuhYCbp4YSKmBhibWJJSS9UztH7/zt4qiornL9AQFz8q+Z5Iksyn1/XLcx5iW/hRlmEqlgjEVmu60CS8see5CQ8Aivn2TlHoPhSuAaBNn3W7XVWa9+EJC9hAhA3UVBgdm7DbXJrJURAb+ugYvHoMLeWoKX4i6kX/v0uY3BlHFGLOlKkdbCR5rdu78v/3vBdSHXNmNoQ/dVk74uQT6mg7dVON1Oyu3tc337k0sy8RQ8o5aA56tqv278gHUPPtJicFSHmAw6mxDyFPh0Fn/Swm5e7VsTRc5iaIOQBac9V+kpV9gpYoxiuojKKfp+l+8eFKGcFU80ES9R4qcYFJEwY5ZGGoDdBgNmkc2h/a/33S2B2MdPaXVrXcDAuo1tyaqbz3YokUSAppXuMn9+bp2K0udLrnsNP3Tl07p4B67AlmGahmT3EPX4RMLJtiSpT+dWDtuyp6B6hrZ8/Srxn2MmXsuQsKtYPoIvo76o/S+y48e/0WttqgmECwaEoy0b0M0pSvDaJaXJpQM53dP386S+T1Chngl8UJkMgmSp6/IVHKLVDCjW6U6QCN4lDxwI6XNPjOq2uUDlbTFVEtmZPEw6Fg9x6tl+UrVsiIoqVP2aAZePZbvpXCjEfAZm0RZADx9VzW+qh4kcJCF20TkN2PqNxYV0zGr6tZnYB6V9HvyRR0A+8z5PLbyZ5LSFJSMEIZYueZtuuG6XW9iTRPFFIXudaRgeouW9nTWIMasx4QMvOCac9p+nbX6vkhaY8qMFq0+G0JusVBfvIbtqHNlIT80T5ZbeKRMbgLJ7fRWV0aqL1Z9pDOlNcTtiXpDcClGbxWZOf4QdjEWVQMqqE9UdVyTu6796DycP4Jq1/UTMx88YwW93deBL2NNHWv78MkEBLIIBAtq85S0oY0WCQ1bSuQpoeObmXFfplmFiKDBYyt/bZax3e5paMitcwpeQ15/lV3/+nWzUYZFSUMgof1pPfa0uVC8vSXFO1LXN7QWDdhV5YLUIgSyWo0Tipxpo/HzUspyk5A6zyaFs8di5WsTJ2ugu2r5v1Y0UKetZyMHt1uTze4eok66T76P+dM/DeYhhJk0h4dxjWksf+Qd6n+69y4dOllWWJQKo6Yh5HN/K68p912L2AdxXnHB02wcpnrD9PbNMtfOxDWfQgiLpfuMFsvmzPUE7/JXsLi8eHqHLRZZZoo0HMUieseudzPeGTOq95KaJzN8+9yOHL9emw+mQmIfZu7UGyd0LK8pInnJF8HCQ+N7Pbmh7wQqZWX6jO9N+P6m6U2EsASDhZriasepDnWPc7diC2EH6oXQxsTYWc2gKluKIGh7Uw3p4DXtyeWWb7pSglvFlKPvJzK5hC2F0lUMofj/XbohEJENFh5SqBTepu3OG3hQktCgKJnZgqgbydknLd7P77pK3GChp+lo1Jq8RlX3GeU7mxP4cVLCOE8tC/QDHXfVUtV9602eq5afisjYc1UWMfwdFnW5T53gQ4cNNC1PxNL9gj8wpfJpkFXYdC5ZYwPOHcXtD35Qh74zb5eNnjTJxZx3QlApyqUJjWBa6LCDVCt/RoNF3TA+7Muy9c9u2zUuWf5kpHwkVb45jslhCDF5VKNoBmTQHzo8IyWMlGcSLJR2L1HXNXMtIetlyYpXtX3EPfSDF+OzBZikC5H/k/Kpv53gEC6hWIwxJMZuyW/fKkN6IpoukWln3D3hx1t63kKsuR60m+AG8Y0DWHTpON0nVlqCs3k+viC4NvrU0bCEkBBcAmqQNvuTPrDivPaMFzcLKzMQ93uRnvVEJlfTGaTINxYm07SbGv4AlH3AOzhCVdtmKBjIeIEtc6uItORTFwJ2REa0uoiUEi4whhXWktSa9NUyzh3D+nV1Ce4QYUYtY2Pdc6KqvrLDTf9mNTzcZVpab4V8d9ppnzoNSkBxRrZYkXcPUQcgc195E936YSRZhqR7QdiAJiexaOATuv6SXZSbxpi8wl/hD6dBIAhl19qD6ecWVFaBDXgnDDXOaNslrq2dA3alHPT674xv0cgLMEPw+X1OrNOpXj9P9Y/TdzLyS6i3SLD5q7WlCbsV+zQRvwzkFbr2hye29dCucTpeDsRlt7OgfPHEu6caDLbwYLFgWxZ1+tDXjsHJgfT1X9O2++zrvgrvG4gZwgRLSE8e7w4g30yhqJF8E9Culaue5FG1Kh2JSk/KXXrL14+Y+DTtj8C7MuVwDZHJRqxBtnFTUduh6FdV3UtVn7XDoZ9ys1XWGfDOMwU4s03nPTI4Dq8KLddkTfIawR5wJrTWJiIy0NfFV22eUHnIK4er6t+M9j0LF1USHlGlv+ZYV/Ocpaov7ZAZ7A0NZUY14bMtphaSbUx0HX39agWPkBWirmMGmnHvrmXfc39Lf+PdGHMHaXk21qzHlI9laf1LuvSbJ++CMSxIEvIksQhBwFgh7WvNvNx9ykIq6TUkdjo0B8jcUXr/pW+bcCe7+6K/o1R9PlN63zf+XkAgMU2Map7rbIJRlIuWv57h2ys7ueoyIaRISJBgCQ9Ud695u+GwqYfgWTPwEd04EUf/be561fffSSangx2kp/oZSV458ZJHGgwiAt7kvnWzW392A/oCyiWYv+DnbWvC6XPvAe4iLU0l6AaCPUKXXvrc1g9UyctNEwQt/tu2oW0MxgSsCRhRrJmQFVBVe1SHerZe+pQKvTP+dkLHXP7d52PkVEzzWhYcdhORSRd1SZJv9VXzxVktQgeiTxXOYidlnkRkebnEj1GmB89wzXGqqh4+4dnP885KmStbLCQ/stD7oj5zZsZROUFEbu3t4gpr6fGezY0mz1PVU0b5zkOp4WvVMkNpid7Ms7mW8UpVfb2qTmmjoDs3g6eWhU+LyP0tP06Lmjx3X2cNvCb3VndtsAqqareqTm2rqAOQeW+6iyPSt2L0MpJygjVDmNJ8BvQLuvh/3qF61+yONVBmA6pJ7vqZBpLUIWUlK7feWAsW/A9W78Wm0yEbpunO0od+MO6oXl1+xasxvR+ip/eLst/Lfzr+J2fKqNdimrLw2+5xH8rf8gzSrgOk+/UrdvKhEhIEDYbgymxqVHarWVv2G8Z4CG4IKxVW1z+rD/73hCyruvbqV7E5ezPB1yjbf5L5r7yhPRdbAiMZVnyeKmfYtDZor51DWj6e3unXiTx9Q/va8PDVVLuvwdGL6jD4PurmZa0fqQZBPMZkGPFkvn2L59SpYI3DSJM08aRJOqHjLb3271n/yz22/sIPUUlepUsuf9v4JtQ/TqdW+xjOr2JB8z0ixw4RmWxMcJQFSFKQ3J+tE9GnZzVqPBMYbZ64opTy5xDodU2kAW9S1f3Hec4up/pRo9SqVj413msPmpcwC+O0EVmRS7rL/F6g3HDUm/AKVT1qFGF3W1n471QZSqDqlaF64HnAW1X1gAk+i5le9d8CHJvCp0Vk0fiOkzusd7h/JoW1Liv898oTPN6LgH3bLuryh/aqdXLIOR9gavLPVCp3Y816hBJ1/pXbb/6W3nHBuTp01fy2N9Hm4f3RrIfgBaELMSWs9JENTm39Ho5czl6zPkxS3kRa6iJoD0P1f9V7L36X6s/2GXvnuHm+PnDZfzLsPk/KV2S/l31s/B126Vw0zMANOXxd8EM9PPTgM8Z3rLvnsGrde7GyeZRu1wsu799GLGuGprLbEQyJduGzFG/7qPd+Ru++6MOqP923NevcLw/Rxd/+dwaHPopzg/SaN8l+r2jLazRVnYaGKeCbGFNHNG05cfSKoTMx6SxC85dtb8I51d+hfiVJ0ocJQ/jG0XrfJWe3dpDZPn9dH+qY4DGufbW8Ng32ku+c66hkqBl3VLred8VZNDYdJdNfsHUH32w2qdc3YCvv0qWXvL2VYBHVm+ezZOHFwHT2nHqmdL8zBkjsHvQgTDXgRbHW4JK8qPxhbRrTU1T15YNN3ppWWS4im0YRM4MWzk8THhShK3j2aQTeoarPVdWeFs57WAM+pjA3TfjABG6hHHLhkvkJVLlIDBdUS6xKEirNJmkj8EZVPXKUtri5bPhiWuJhY+kLGbVmxtFN5Z9U9VWqOrvFZ9GvqqcH+JSBYEXeLCIPjlPQVX2egqbZzDcBnaJMQDDUEqF3R4JsjPd/tipHi8gfdqge22IBmPPy64DrdNFFr4FwBk3ZG+yBBP0MDyy/R+/4ys/psb9i76mLMMesE5k/2NqN3DqbTSsXMFx7CnX/DIZrTyFIDxjFqsPVFOMcUuod1/V3P+v3OvSj83jYfYyG7oNrlmnyD/z5oRfqPRf+H/3V37HHgvvAZHBwUWZlUwIPz+ChZQuQ+gk8sPR01EyhKm+XeWddNoGH1sWdl5wL2VQ0Ww82RSkzkJ2rd37Jccj+C6FvGGZnMFLsvEdgeMswguEyw+t7WLvmyTzwh9dBchTN+gU7POfG64/nkaXz0QZgUkKo4LueAfxut5q6S90P0BjeTFqdh0/6CcGi1Tdy98qX6sILbkL9rfSaP7LP0cvhiOGRUkmq2gcL+7nvzqdSGziFlfefRlruxQ5fzf5d/y72Ze0rZbPsimeR1Q/FBId3EJjP6jsPY4y1knXJpSeQub/HynrW3Lm8/Rui6hBqNmLD/ji3GutmMezepEu/dqfsfd7YAjIGlh0COgvj1xCo0vQLVO+bIbLf2glf3+rVx1A2SmhYnEvxepreecFiDnnqLWCbeS7KiofebV6XTAG6AQSGUzbeOouN608kuH/F+M8/6viNZoUQSlgdRqof4O7vnqJ3fuViDpn7O3jOBpHu4cdYTWeyujGTDetOZ/Hil5E1DdPLz5WpZy8isrvwNK/MFmFAoawBG4S0bjjZq041+Ty2AagBdSBjq8/diB+eLQwdKbkgLANTs4z5g45nZhmHiVDPYOXYjAWyXFU/ZBPeUq9zRMMxK5Q4z5Y4TlV/Rx7BuuGx5dxUdSawfxOePljjxLTEHWki/ziB9aS/UWM+KeINSmCKqs4RkZZTNonISlW9JChvDhldDU9vqPIWVb1ERG7ayff+rKr/mVhetdlxTBAaNOnzwstNwtNV9TfA73YkzopXjTOAp3o4WmC6gW+LyHUTaJe9Gw32VpDMo2qYraoLxvEKd7Tz9OHY3+YFI30IdGE5XVWHgLvZWuJxxIa6vbeNFpgKPKvheH052bGluGOOgbrwqycR9DScHo3YvQnMIGQewoMk5l4wS0iTpaR2OZXqWvaeNYgrweo1VTTro+mn0qjNJmvOJcj+lMoHE+x8TKlKQo3gB3FsoLuymKS6EGvuYmbvnyQ9YcJRgnrfd9+Jcy+g1pyGkRl434u4ARK7BNXNYGoIJYyZgrXz8MkUKtX1DG/+HodVPy3yis3jPvfQ9Qfw8NrX0Nh0HmrXUjKCD4bMVdBQRh2IrMbIEN40MN7lVg2jOCcICT6kIFMITKNSmoWkNZKKww1+SQ5700cf3eGu2Z8H1h+EL52HGz4A0YwgHnXd4Adp+C9w0B6/lu6X7hYLmKpOE5H1uvbHxzPUeCa17Eicn4EJexFMP1m9TAjrSMIjOFmHMcPgFVuajjIb0Wl4HaKc3sjUKRfLnmf+tn3X9sN5LN70FEJyHoZDQTahIjQb/ZjwJ3q7LmbenNtETnpgO/fVjV4xhUX1E3DD76Bij8S5e8kGPyFPfsf32th+3Sz58Zn45vtobqygpkbmKoSsh8QswuiX2HfuHdL9ont3eI/LGk9j2L6NbGg+yCDOVXChQn/Xzyib/2bewfeJHNmyuFN3zZNYtPYkEvM6fNZNknoyn9JsdhO8oeQfQOwaPI5AnZJ1BANGU7xYRMp4UkKYiep+TOuehqQbGVz5Wjns77dMgvrAFR+gMbw35bAU7d4LGTyN9YPTKWWL8cntiFmHz9ZjrWW4KVTtoSj7YcrdVMKFctB5n44aavdAVecDT6t7zg6eqghNDxYlMYJRwaZ5WnUJQlPzGqhNBK+KtzZPTJMfDOMDViEJnopXKg76fEYlTahrwoAVqFS5vFvky61cp1M9vdbgJGuZmWVUS5aKGIYwbPSeDaWUBg7vhaneM9N7ppqERd0p3xKRO8fZNr3ATAd/M1TjOBUGg6CpUq5WuD6BK0XkgXEe+6iG5+XBM009plwlsfkr6T8Um9fNIjK0I+ujwilNZQ+UKcEx1UJVYcCkLEuERwSGCuFdAXo8zPGBGVZYa4WrROSGCfabqcCrNzd5blAaBCgnlCopvwF+NB6/xR2cZy5wWuZ5kfNkasgyhy2nSGJpSGBNUxhMleaIX5/JddmI350ESFXpyzL2bjr2KpXwlYRvisg3dqmo23JT4ZK5LBvcn+H0QDJ5KsEfhMp0kAredeGDzQOubYaalKAVUkmwiZDaQGKbqBmmka3HmEVUe+6hUV+LyCPM3ucumXr8nR257rVX7M3GTSfiwmE4vzeeeajpx1JFBKw46mEdleRuJP05B77wxyLdgxM6Z+OPx7Bmxck0ZBqlsJaGlDDegAZKI0reQBYq5Jn5AjbzuKBgPFmWF1bX4q09EjDO0/QW4ypkm66Uw99zx9YOt3IGw3edwco1c0lLg7hmivNVsqYnEcE3PE0tY2Qjh+/5TZEXbtotJ/YVVz4FzQ7F+Rk0shnAVLJsLs70Y3wZH+qY9GFKyZ9J7e0sWPAnkaNXtndxeXA2a/90HBtqczCakVhPEMF4j7Ee57vImmV0eCkH9t4gcs76R4v5W45g1eJDGKzNo97MEK3R3zWVmktAfyFPfvPNbbnO+u3PYfWKQ5BanUY9wbkEEcFYQUIPtXoFaS7noDk/k+TMJY+ZoHpYfeXz2bhxPqY8jHMGmyaQaJFRqIdGs0m//aXs+bLftTj5zWTzjSezaqAHcU0kTUgtgCdJMxCPG+yi1ighmsfypRaCCKjBeTCquNRBQ7DJMF7rpI2UBeHqx7b3o8694buHs1KPxOgRhGQWvj4T30xRTQnJKqxbgg7dIke+63+jjNqtBN0c4DSgCjSLXxu2qSKR5VGwGUA9wxiLhvxDgiI2T/QhHrBFuneb5kmLLfgmaJInNE6A7gykC34x/td9eozCnAzmuYwZzYxZHiqJxYSMTd1drMwMi7vhtyKyfILt8zTgSUC5nt9P3j4eSS0JsB5YJCJ3TUAYHQv0FpakvkKMrATuHq3uavH89gNmAntmnlmiTM083daSaEZGmU0aWCkJ95XzKhEPtKHfzAeOHukrWX7tkubXXirE5O0ics8Ez7MH8MyifWqFJW4kqmykj5azQJKBpEXFieI6tgTlBrA+v7464EMezHyLiCyZFFH3l5aoz05HD+ljTeijVJpOlk1HpYqGElkAaToajSaZGSZtbsa69djaIFPCBpn99rWTNoH4a+Zx79o+Ul+hVB1i3oLVIkfH3FSRSCQSibRHqHcVwkpEZENskUgkEolEIpFIJBKJRCKRSCQSiUQikUgkEolEIpFIJBKJRCKRSCQSiUQikUgkEolEIpFIJBKJRCKRSCQSiUQikUgkEolEIpFIJBKJRCKRSCQSiUQikUgkEolEIpFIJBKJRCKRSCQSiUQikUgkEolEIpFIJBKJRCKRSCQSiUQikUgkEolEIpFIJBKJRCKRSCQSiUQikUgkEolEIpFIJBKJRCKRSCQSiUQikUgkEolEIpFIJBKJRCKRSCQSiUQikUgkEolEIpFIJBKJRCKRSCQSiUQikUgkEolEIpFIJBKJRCKRSCQSiUQikUgkEolEIpFIJBKJRCKRSCQSiUQikUgkEolEIpFIJBKJRCKRSCQSiUQikUgkEolEIpFIJBKJRCKRSCTy14HEJohMFqo6G5guIneO8/sHAQ0RWdKBazsEyERkcQeOvQB4CtAA/Dbj0AMBcMCDIvJAm843DZgqIveP8fNzgDkicus4z/cU4ODiPmzxo8W9jfz44ncN4FcisrnFc8wDjgaaQLk4Vnmb4yrQVVxDGGljEbl0N+n7zwTmFdenI7/ezn+luKdrRWR4nOd6MrBURDa2OLbWisjaFs81BTgR6Cuum236eFY8C1v8Nyv+XgbuE5Hbx3l/TwemAzUgLX6S4pwG2AwsFpEHJ/jMDgMGRGRpi997PvBbEVkXZ/1Ip0liE0Qmkdej7kOqesi4hJnqTxC5EviHDlzbfwY4XFWf3eokPgb+GcJLwFwN9Gyz6I38dAFTVHUz8FkRuXaC53sr8EzgtDEsQE8D/TbIB4BbW38kugdwEQGLsAzRFAgoFsGAgDoF41CTQBjEmMXFwtsK+wLPKxbtaiEM+oCSokcJco0qVREU8HgtYWVIVa9rVah0iG8BKwk8giEtJFwhfjUXpSJNgpYxrAL5NTA8jufRB/yg+HlvC6L+G8CFxU8rzAZOBfYqRFtX8ZMozBdlEOGObURfVjzD64Hbx3F/hwKfBx4EVgL9xZ9KQKXoG73AbFW9AXiXiAyOT9XxMkRfChzewvW9BM0+L6Y0P073kUjkCY2qvlE1DKjq9eP47tc055MduK6T6k5vLo7/Nx04/kWq+tExfO7NGvwaVX3rBM/3AVW9bgyfO1ZV71bVN0zgXPNU9SZVfc0k9al9VHXJ46DvP6SqR+6C8/Sp6nVFX37jGL8zU1V/qaqva/O1XKyqH2/zMY9S1e+p6n6jfG6WBr1Ug/vDBM7VX7Tl+WP8/N7q/GpVPSnO9pFdhYlNEJlE+kGu9LCvqr69hcn11AxOQvkzMKCqPe28qADvL1u+AfwL8FpV3afN9+3G8iER+Tpi3g28Q1WPn8D5ki0v9Hbcps/C6zeBT4jIBRNrPhJg2iT1qW7Q8uNhSwOFha6zlIA1wM0KH1fV543xezXyV+PtEl9dwExyq1k78eQWuWmjjKXVCG9A7O2q+r3xnKh4ff3PqL5qLOPRwxex5nIRuSFO9ZEo6iJ/DaTAJgtvAvevxauUsfClFM5HuAYojft1yvYXn2PVMxu4D/gf0IPIX122W9SFMS4k30T9vcCrJ3A+y078Z1X1FDzfxMpnReTiiTYhj/aX2tUMgjR2+56v4scq7idIA5gDvEPgGyHwqTFsUmSbZ9kWCn/ArJ3H3KbH7bR/b3MNQ8B/gx6qqvuO8z7+gMgn8rlhp/PIuTaEA0TkbXGaj0RRF/lrYRCYLyI/heR7Cp8bzerWUH13yPvtxcBQB67ptdZyE/BnEVkJchtwZputgSOBAmNcSez9QPeERJ1sf9FT1dMIfBfLx0Xka226N53EPhW0lbadRFU3VmHfBix54Mu/GBOGgPdP4nrT7jUnQUiKexwLq0HWAkdO4Jz/DSxU1a/tYEwdSvD/gTFnxSk+EkVd5K+JDGiq6hQReafgDgSev7MvlOAtBj5SWOeSdgoIVZ2G8iTgKhEZKH59foC9gePbeN9jttRtYzGpTcRQsr2xrqovxnM5hveLyFfaeG9ucoWdNh8Hfb/Brsk+IKjKVtFjng8cO4qfpnZQbvr239+WKOGxDiZXbCjHd0KRTcD7IDxNVY97zJjqw/NljP2siNwTp/hIFHWRvyYsBL9V4CTnBeXDRQTl9kTXt1F+A/xoG1HYzldYf49wN3DjNhP4dQbuRzl5Mha2IhJxL2AiC0SJPDp02+OeGeA7WN4nIl9v83N1QH2S+pTTNvqCdU5qCbuojSwiOtLnisjftym8TVXP2PG41KQDorNJ+1/LB/II57FmcjhYguubaES5iNwL5hOgX3rMn/4Vy6CIfCZO75HJIKY0iUwmAUxtmwXnp6p6r8I7yYMUthUhRzvH8UnCGdtY0RqPFSsT5GnAN7aTM+1CL/xrkd7kl20SdWO1hZyHUhUj/zWB82WFsBtpy38APm/gYhH5f+1/pjhgvqoeDMwoFnN5jEgIQG28ucl2vlOV+m7f8zV4xDxLVSFP72G3aRcp+nYKrBtrfsFRnr/fRpD8qnh1+EFVXS4id/ylqOvIht8VfaGt8ri41lEtw6o6R+HdYpIr2nTuq0BeqKrfEJE3qurrcNlrJS3NiVN7JIq6v2KKyDC2l1xUVbtEZHjkM9vZPesEkpJ2wUMG6qnIQRsm4dbtdq7/9QF/h6peKiJ/3ub3FyUJX3jMKw1HngOrHc/gn4B72cZKt80i+DNV/y4wpwDtEHWBPBJwe9fRVwjVw1E+gHclbPKmid0c4kUHATQL/xPQ4w3yj8ArVPV1bQiOeKxgBcJpYI4DrRStmFt+QsgDP61NgKXA2W3XdLvOV20CUsQMQ/hbMGcCFUIog1Zyq5oKYofx2VRsulBV/05E1k+oBzxG9IjIfxXJdD+iqq8vXiluHZcBi+mIpa4Tr8bLFNGvqtq/bZJlVe0mz113HIH3iOEuEfmPtjxCkUFV/RiEb6rquQTeTpK+nUjkr0nUqQ714q7diw3DZUrlKg2tIiHF+wrOV1GtoKELlQpIFypVfEixmqCS4m2KkGCtQawFEoLkGcQFA2pALCIWlZTgS6hLELUoCUpSTFggFlQEUSEgW/SSzXOkErSIqhKBIFumR8LWKVK2WUdUCnd0I1gRxBhUc+dgM/I3yc8jAFYQEVZcDSC6/KqtU/DIZx6+Bl1+NTx8NaBS/E23eJKoqC67upi0VUGKVTNv7fy+NP+bBlAVVBSjypIrwKaepLuka294r8w46bu7emkD0hHhWkyUG1T1/ACfVtXXiMjqZtAPB1ht4NvbEUd22+9PgBOAb+948TTfDvAaVT1KRP4wwXMNgv5DYcmailLRQNLMMFmTKWLoJXBvUuJibPKtCS7oIAwKUlXVT6EcY+BEEVlZCMiPqOo1IrK6jULdg/mWiHx5svZJj4O5txfMKzphqdxOW2zXh1NE3qwafg7yQeDdj36G0gl/P0f7ferqqM4C+Xzw+mGFbg3qvOKCYpxjnjXUCfxZEr4sIt9s6wQmco+qfpLgL8TYL4vI/+4WhoI1v70XkWmg9VykqxBQRMGYrb3BbFnERtY32bK2hKDFq/tQLCkjibFD8bt8HRLRLdsGKf4VBIwoYhQtjr2lRxXrFyhIXgFGJUDIg6xEPMjWjcjIcTVscw0jax0BEY/gi+8H0FBElyuYfD20mh87BDAoQRQjxRsTCaiGrf0zBEgcqEezANaRmAy8R8lwmcdoE/VNjNQxUkepYaUGtkGiTTJtoqFBqbtJqZyRTGvCXutbrZzzeLHUJWxoVPGlEnWTMpwZxAvBKQ3vMDRJLTjJG9nKME4TGpIiqUVDisXiMEWGeoNRASOoCAYhYBDJ/4bkv0cNJhT/NuSdVRRsQCXvNkHzzxsBL7kgM+SHyaPVCmGlucgTUwyKUAwSzX83EtcmtuhEolvyprPlWAZji18IW4WjyUWmmGIUaHGtRVChyjaTtSiinqB5xxwZjPlnBTFbxZ6qbPm+aEBRjM0Q8WSZob/77knaVKQ8JnJNRD4ZVN8MnKCqP0H9eWDP2U4lACV/rTihBUhV3wssB362k8n726r+bWBOBSYq6npBfiwi56pqtxgZ2uZanuYyzk9KfEtEzm9TO282cBRQQ3hRHtULIvJRVT8bzP+Rv3pul1BvAqsnaT17nPgJa7NY0DrNKNHI8npCuFpV37JNsMxIROnj4fmk5BuSi0W4AuhHWG+FLMnfcHwAeCOGc0VkWYfu6WaMXQh8abfpXlOm/YDBbC7qIajBGsWGEUEFRkaElmwRXSNrSlAQVaxunWVN0Hx1CYysMqCSr4+SGwsC+VoXvGDMVsOEsUUoi8m/Z0Qf1RVEFB/YKtb0sVuQ4u8jf7DFf03+XyMelYCasKUay0ivt5Ivzk3AaMi/o9ucIAFTXJdqIWYlXyutBLwBawIuFK/5Q5lgA5qlYMpoqOKlSUnquGaDjDplWyMLdYxvUGrWCaZB2JAxN6vTeuWc3V/UiXRvADYQiWwVY7KdP7w3BP42wJcSYz8nItftYIH4C1E4Dp7n8UdZ7L6qarZMDLmyThVNJPfTOiQEhlT1EhFZPkFr1rpCWA09RjzeoqpfB95SlLRqh9ieTl5G6RUjgm6bJvwQcIGqfktE2lIFIoA3kxes0Im0GZ3q+rviNbHu7Dwisix3PfCfLfzrfgxUkQ4kRla1SNstgKawsKwSke2tLeeT19h9B/BPHWrjhgY2i9l93JmkdMD74vLy10n0qYtM9som2xV1Iv+rqqdKXhv1f3YijsxERF1REmvYYt8FLAMqIBlbzKSo5K8CBoDEGD4HPAf4ZhvufUcL7QWqenyALzCGeq1joATc/peCLo+GVNX34t3Fqvr+dvgbmfx5VCZR1JV2+56voRsxu6LyRWCU5NNFgNLBwD+r6h3AyqIerW3zcO9MAIbuKAtjnn5EVb/hAxeo6gsL0dr+iSz3P0yJRKKoi/yVU/g+bHdCPm8MC1ZLOar+8gj+pRh7kYhcPkYReA1wzARFXYnRrTQfM1n9KlX9lIi8d0ItrDhkx3nuRGSRqr4DsotUdYmIfGdCZ9sawTlZ2N2+1+e+SnYXtofZ+eXIF1T1WPKo838DNwBJe4W5bBHd7T1qftxsJ/f2e1X9Msr5QCdE3Ugeyd0/lU7kCU/MUxeZ1KWtmAgnJVpRVV+JsTVa85H7JDC1hRqaOxp3ySiL7BLSygdBT91JPrGxtrKHUBrlfL+D9D2ofmiCdWZHRGt/nNd2tpkIugvH2JislyLyypCnoPk4JMMdECmhA89mpNxaNsq9fQ0N/6eqP+rkU41TeiSKushfMyNWnfEucLUJ9WPV1wA/FpEHxrxC5pUslgKHTHChTcdwru+DXAX6gQm2czMPphn1fFch8inQr6nq7HGeywKbgIWTN6fp7h/9aswQu8Bpmq0+hjLGD/8LcDDoc4CVbR/taLvXnIDq2Cq0GHM+MFtV39iBeawZRV1kdyC+fo1MJnbb6X6cC1Yf43jVp6rvCJCZ8eWd+ybwBVVdKCI/Gcf3S4yxbq2IvF81XKUafixiXjjOdkox1o7xfBeoahX0BlV9gYgsbvFcGfh54L+j6h4C6QUzlC94aoo0BCN+lCML/JWSF0lvBynqp+z+XT9UCPpzVbcCTAOkDuqL9oHc+pTk7ck84JxxBs2MWIVljM//3jxQRy4CZrf1lsV3gXS1uSEVETfGe1ukqp9D/deLsfvbNoo6T3sToUci47YYRCKTQpEYNN02WWiL3+8DekTk4XF8dwGwaTtpUsb6/TnAQGG5G89161hzFqnqXsDc/BXpuK51CjBFRJa28J0jgIdFZM04zvc08nq5vhDuKVujFEMhVEYsGw5Ympddalu/eoqI/Gk37/sHAXO2IwxGcrlt+2/zmETcrZ7rMGDZYxIMj/adQ4FHJpwj8dHH3B9oishDbW7LWa3kWVTVo4HVrYyHdl9DJBKJRCKRSCQSiUQikUgkEolEIpFIJBKJRCKRSCQSiUQikUgkEolEIpFIJBIZhf8PQLWBMqiMt48AAAAASUVORK5CYII=";
const TOOL_LOGO_IMG = "data:image/png;base64,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ZxLl3gWd3HHBB2REGqMnPaId8Vz2K0VM7LbUkgZB0RI1qkS+SNRWwk6byrz99uXuvWT45fNOulK3KCj7t5Qo93Zie5ZTCQQVg4ZF0jBAEMIohChCAjOgKqAYkaxWvAuQQNAwJDWGtL+fsCTM/fK7Vh8LLhvqRfzA2TqjpcTkcsjYYithOSQKHKED1JBKSLUY0N/TR62nTjo1pO+UY2TRhrre827W8QufZnyPYxMvyJSpLP7C2+SpfEjduDnqZ1ppV0pbtuNOfs/GW9syJyfnv5d7VFvvvYpW20fbin58aQqdJx/43z1efe983aQvpq3SQmPP3emcPXPki9mcnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJx1IfktyNkQLFPdfyLcJiLVoR77pOpmXYsZs8c0eajZ16WqHStrbDKuIvNG43vf362vqzYYF3nqUQmTxgRq0QhcUfFhSs+sLZknIj3NaO+hqk7csgXXKtK1rs8++qxOfnQ+O797X7l6mPeu7Z4XOFASpB6TmgLaAFMIUDG4oIVYG/g0RuuK328L5ociTw+1nauW6Bs2KxP2VpFYiAKhUAR6a2igqAuRqEzDxxgboAG0T41YOGui3LGh+31VdfKt89mnUKdMmXrdIUYwxqJaInGKxYFPcbWE8mHb81AYyjPD7cvAGBF5brDH9KuOeWYlE181Tp4canuPqk5evIA92ouYJEFMgSD0mEjxvkBq+1AxpLFiNcAHiqaW0qaTeXJW69DbA3iiX9+UJLRVlXrkMFUhCixeLWpBA0dtl4k8XqnI0pE8t0eW6+47TpS7hnrc35/Qvd62jdyej/g565MwvwU565uzr9GpBcslC3r4NXDiUI9//jl+ZS3jlqq+dbLIsmZe2x3zObFc4suP9+jh23bIn5t57j8+pIc9+ySnq2dezdPfUqQCYCAoBQQ+peQdrU91Uf7zPXr5W17DNysi/cNt77rluunjj/GdnkncD3xrbZ+96QXd5r7H+eP4ifwBGJZh95dHOaDSwgX9KzjbCpMDg3eCEcA4JHGgKd4rgVdarqxzE/D9obazcD7vYgxtzoGHlmKI76lTSANe42M6bcDSIMIL+HqMqqW0ssI/gA1u2P3yBk6Z0MK7xHO/rdGwKa1G0NADgsYOCQVNE8Q7Js0p831gWIbd3E4O1phvL+vRD03qkL8P5pg/3MHR7WXepqqfGIpBCPDA40wL6rwnbaPDORLppxRm3oOi94xt1OlcWaVTI1qN0EjrtARKx/NL+S0wZMPuxiX6uvmLuLTkuao7JSoE4AbaE6HgPS0Gxt5VpXj1PL1yQcTnP7zl0BeSAM8s5NM3LNT5b5oupw32mAvm6Aes5RRgm3zUz8kNu5z/aHaZRPLkMpZMm8oJc1fopdtNkDmDPfaKp/TjiWUbZ3mmFbTJ3rpxtyxg955+kD4OUNVbpYmG44QOWujlkTfsyKdF1uxBuPpq3T4Yx68eXcjOwCHDbW/LCaS1FyANKK7VUKrq9Afn8rtJm/DAW7eTrw23vVJKEHgeOmx3OWk0+8+H95RPrfa+Pao3Ftr5677byPc31r4/fjyuFa7dcSqnbDFpZF6kdbGyThKBq/Vw7nOJHj6jIPeu65hxHdRLhmEZP0dvJ/cC7/3n3y+o6qaPPsupYyfwyOGvlXOb9f2mlgk7+3lsr7l8TA5Zs4f7qed1t65+zhgXcjnwpuG0FUzmtGoXf7qvS+fsOk6uWuc4da/uJgW+2VbhgHzEz1nfmPwW5KxvlhYIa5bqI09yTVed01V1/GCOu2eFzhhT4GCb8nDR0NnC2g2WoXLLQj4RhWjnUo4IhJnP9HFgM8+f9BBGZt3hD299qzw2roVju7pov3uZfn647VVAHcQ2oLGmz1RVJz/+NBePG8OTb91O/mck3681JA03YHhHOYIxY7EbdedvYMsFzOYTSUZ9cC/SHsfcsqyL2xfM5yRVnbmuYyKDmgBPExdN4yEVjw9b8c38fq6BEU/AwWvvczOnyj2v3ZqjooSnb1+qXx9OWwdtKvMX9/HpzmV8Z12fXaw6pqfB+X0pP3ndjHUb0zk5uWGX82/PvDuxrYbK1U/w6bKi9z3zr6v81RF388PlS7hFPJe3lLE02YgoCW+2/Tx+9Gy5tFxm/srl7NHM8xcEU08JgWBdn91jB3l8BVza18euw21vEvgCWGdXP0mrasech/lNy3h69p4pR4/4/hVpON9cL+pQiBP02ZUUNua+3xHQ19/Aku0ajiq1HqTkKdx9O8dXInoeXcIp6zomCBBRTDPfraX90LCEtVpzd4hUCP0g5zAR6eoZywWSsM9w2/vY3jJn/nL+etXjutYQjZtu4rthC31H7ipfzEf7nNywy/mvYPIYknpM4ZMHYec9xVc14is3PaE7r+2Yezv1/SZg0jtey3mTSnSmjqI20avw6GI91seUx2/C5QD1bq7us7xqfqxvaJrh2IJqiK4Y5HvnHc+u7AdV3XSYTYr3hD751wlVVSs3P8zP2sZS3GdTaYpnsg7GBxswIStArNvIw0tCsAExNNd7tTraOkirnvKnP0bHrlvIJxLLjncu0P+31g5jKQBRtYlzg4KGQiESoqY+7iI4gVsGsVACmDGOxXFCdYHqnsNt80Oz+UZPNxOvWKDHru7vNzysR4zdlAMXtjbX25+Tkxt2ORs17RYbBPQvXcSko94kN+L4RxJyuqq2rumYQsxnXcCFIrJSHeXUEdWb6FVIUw5Nlft26JCbAPbbUS7paOGp7mXs36w2vOJESBikQdpaxqviYNjbdgpg66+c+FS15Y65/Kx9IpP3ni77Nuv7JQ2s+A23FVoIqRej0feEjQiHDYU6rAfPZgNiT/LU8ixJp+Y53tU55uHFesQajSVDFIZECc0zwlTRqIArl5u7/WwtipBMHqSR3A4qYNqgd7htikhvUOFE388XFmVZxy8yd65uKRHf6U35wGe2ls58pM/JDbuc/xre9S6pERKXSgMDcsJx7QG7Xv3E6gON73xaf9tZY/5m07kUoCFEVpBmGXZLq7qvC5gybhKXvfz3lQqXeHj1C6p7NWWCc3iXwspBvncF2DYqkYrI8uHOQ0aIbIMxLzPqKnMe4RwtMP4LX2iuV8GXMGHQXK/MkNoHr9GG2woeDGEI4tbPuFtziCmQjJ1IDDB7htw9ro3v9TX45LxYVxtmYITQgCk2cdG0yWS8D0gxzTXsNMR5j5s+SI/d4ufZWQIYK/LYSNo9Yie5e2kvlzz8RObdX8Xdz/PLzpS/vmeHdSdX5OTkhl3OfxzW4RtR5t3ZbZZ0dfZxpoR8fq7VLV/+ucvv0t2tcIAPOWczkcVkrg5vLWbZIAf0dbGyysescveOHXLNy38/a5z8ve7pf34hb2xGO4GQ+gRd3rXu6777Bd0jtbw9HJ8Zs8Oa2CFIUkL0pbizRxbx9fZxHDJnHt+78pdSa+YzDTwpStupl+ir71upr7qvqq+6t6q73bdCZ9/+jL5prtPXPRzr7BWx7qWq45o+mBlsuJGPaAp9DcPES+axw6Oqmz+c6jb3VHWHWxfrq+dWdfv5qlsv7tctHujS7QabVLQmogKK4Aov82htO1V+j+GBF+bz1eWqU//5mNgSeZC4iYZdBYiC5m89F0Jc4PA8tW5j3nbqVkuW8bmlVX7SjLY/uAffSmuET67QowAuu0k/M24Kk47YST6dj+45G3wBmd+CnA2B82ix9pKBc9CO8qNrn9HDH3uMD8xRPXO2ZEZH2wTOjT2/f9OWL+lwlQ2uqqhpwsLk4W59XU8/Uydvyjmr+/vkCVzZ3c1hC1V3nC7yyEjaam+h2lOnsGQJm6vqihqUe8G1g7aAn1ejdfFKxqUxByxYzv/EnksOmyiXDbe9zhpRsYApFbOtp/sX6ll1YdclMd/dYwd+c9lTevChM+WephnrDdQU2WSv7fjyyuVsYh0lp5RDCMSCfZq+JEb6SthtZvJd4OKmdirBjX7k2ggXEX0YymxeEj79zBO0uJhxBkpiKXR3EYuSYnFhwNh7+/k58KNhv2MO6jHhSvvKhcTeW8iJ187Xax96km8Dr0iasUrotPlxkt5Dmjb3nMUQZyLa7414lao+SLbQS4GgBuXna5h6QltvNwf+YynHhhX+esQ2zdGmFJHeb96uJxeWctbF9+j4lgl8Yp8Z7J2P7Dn/VYbdI1XtWNjLpMhS1JhyohQ1pWih6KEcJpQUChJRlJRSYCiooeA9JfUU8BQRQhMQiiEQJRAwajAogRFEPUYNEgBGEacYBfGK4BFV0JcNWmJQFFHlX0QohJd9djXmg/EIBoSXPuN99v81G2F01TrSZ79UVRSD04G/ieC9f1mwjQIm++fL2hcRRAD1SBCgmv3ZkP1eVDEi2ecVEEGN4DGo96AeNYJzHqeCi0HrNUoFT/GdszmtKM2b3IfgscPKK+/6ol4+ObHAFUse417gz1c+pCeklpZJEznv5Z9LLdbSHK2TpJ9jC4a7Nw/k5tX9fWZFfnv/C/reJUt4MzAiw27xCtKGY6vIc8pVD7M0LFLCUkodUT2mHJbYMjIsr9a5sz/g5ON2GZyo7JpoaUEKJWoiVO56Ts8IW3jTLuPlVbdXddrzj3NksZ0vMwKdvH+1JCirY9EhO8nhr/BSqbaIvOQdnFPVjglNqqzxT4aMerNxb8UGgpDyxKtfwylbNllc+1/GKIcqhFb/dQTrL/PeYsyNf3tcv37wtvKipI612bvZ9GejGN/kHaKGJW6kjI+rfPWqfsL2EglKlKSY1NOaKlNCWNQe8nfxnLTPNnJtM9s/eS/5x6X36AXTN+MMrXBERUZXl3AwnHeV7jOmgy9N6KCv5pBAs/lQQZwj9AreAQEOAW8RY/CZPjaKoNlUks0jov8yLyoDYtqr/i1B9v9VEXnpeAEw5sU5UFYtuszAO+pBxCOazd0y8D+ce2leMKCataUKKopDcB68ZlfiZdWZPQQBHg8y8J1e/B3gQAPFe1DV7DjxqIYvngvJ/utMSKoG7xzeKNYIqQppw2LFEasnFUgoEAdFGupJjZAWDIkp0CDEBuOI+yHZtIXkNdA3nCpLG71hd9UttHf3sUkUUixlgqklqxRCIUJpcUq5YAglIhKhKI5CFGEEQgMRQqQQmQCRTM1eghAVRcWT5cKtMrYGOl0w0ClUGXjKmXE1YNCp8FKHfMmaQxRkVYdc3dJVQQyv+Lv6gRfhn/9mAK8v2W2rVsOadSJVj/rMElR1Ax1bsnNINhFkL5C8bMIyIKuMvpcMu1Vmkqz6fip4BY/LApgVfBCR1h3U+ym3FmmshL4N4rEDev9pI/C4nWXu5Y/p3ydWOPyz5+kt0yfykc5ufvDqsa+MifExTgOkb4TbRQ+u1O1tlRmbjeOMtX0ujnmwmrLfs6oXbTGCwTuoUPbLuWf6JE7fbea/qvrfsFA/W13J226dy9fOOkaWjPQelyFxCSYscLyJuGnqON4BsFdFFl2zUN/bv4IL71qqJ+4+uTmCvvWEyKT0r8a78YonPbvSfKOOVe/Zxq1ih6sTlVvp2wJGfZBXg1eBWvqvBtVhk2X5BffpaS0hZ133nD683wz5/YszsMMXmijHUgODIxTfXE9gkhKp5anxPXx0j9fL0wtU2zYTeXE8u+JRPaUS8ra9ZsnnR+selwtcM38pJ7x3p+YajcMe0+ZTnjmN/jil2womUBQHKqj3qDDgTBCcF1CHqEEDGTDYsklFvBK83KnAwGdX/T2bfTKDLDAo8uKc9NK0aDLDbtUv1Wen8S+bz/TlY7jJ/uhfmq9RDybAkxls6i14waKomuyaRbI5XfyAYaqvXNyZAcPPv2yuV0UQQm+zf68yCHXVwtCDz+5ZZpIKDofzHqtKkngsSuqUVJXEC7H3JFFILQ2oqyVueJL+lHhMkbjnzXjWwzu/3g27zx4oC4GFuZM0ByAFseG/Th6HbC+fumG+/vLQ/bm5W7n99dty/r9MWIpLPepHmFnY18kxhRJbPLmc4+5YoB8qhbSgiDhCbwjEUwwK2BXdtFthpxeWsS9w0XDb6+0hCCB+zVZ0r+7vb5ou37nmaX3VIXvwubNgxNUbWsAXItq94Y657Ry528vqxb5lujx6zRL9ZNdKzn7K6z9mmpF7bQsB2A0oUGwGVvUbc78vhRBnk1Yw2m0pqFNkTTugR+8ql13xhO6oDU6qqj5YEXlUBKOGJG6uzp54RxinzfXYJXWcTWns/jqWAbzcqAN4zfb8/KHH2WZet35k1hg5bzTucaGMjfs2nlj1H39MrgOuy2eY/27y5ImcDYL3FCpm9RmUpQLXBAYjIT9cnfs6CbEiuOIIJvF75um4iuF1xFy9fBGXdvVxxaIqv1nR4JfLG5zXWePcHs93Cobvt47lg1HI1f2dI8siDSFKhfLa3rvQcF5/wp5zuvSdTfCUFPv6adTqXHlM60tG3YvG3Sbyj5py5uNz+fVF/TpmxM80ItKgudVAhrRY8Kjoxh1lJyGhBITV9TD2pg7xHnVrkQM5aBs5PfHMvWEe/wdQKNJnQlSb6PtsAcQg0nyNQ/GGgDUYoZuIrJixGWfNX8hxC6q67aiMY1n7LfmInrMxkSdP5GwQVAgKuvoBee+pctHzqldPFVm52gmrhpcydiTemf4CH9AaK3afxbd330rmr+vzv7tHf1iGb8xZqAfOni5XDqfNqIQ2LOGytbx3b9pC5lyzSH/fvYzPPFrVOTtUhr/1+0IngfeYSjmTu1gdh28nl1y7UKeFy7gBhl/lAsBYfLQBBYqdAyMbt8dOFBOVSSrrwbNpHV4E29aydiPtoO3kmCuf1CsuuFuPX7KSvk0nkUgTDc8aGK+Ib/J3thGknmBtC6VZFXno7/P0nKcX80tofnKDaeCc29gDAHL+28g9djkbzMHS2r5mT8KajDqAVLAuwI7EY2fg8NaJ/LUSrtuoA3jfbnJzIeJR182wBX3TAhK2YCatY4J7yzT5kS/yWGcP3xrJDU5KmFgodOvay2ztP12+t7zKPVc/q38b0RONcMEGHFG8xwQbcCt4UM9ECVsDWtfHotoFaGCwlUFsq65I+Fp7kd1LFd79fA/LaOJ9rII4Qa1v/rPRbEN7refddhv+tLDK3Ls69VvNbr9hCKLoX+NKc3Jywy7nvw5RfGvL8ARLkwSjAwk0wzn+T/fpFxVqu00cWizK4pX8ZUkfuz7QPbySRF6IwwL1wUyatYgfvrCSbW7p1I+P5D7HjnKSZpUH1kbblvxfZzeb3LRYLxhuWz1VnFdWbqg+ZVNEihu3xy4KkDhl+QhEp4fynjCgY7fOe3LMDnJHb5W/i2e3MWMY203zjJXOGiZJ8UhzPVv1epYEwDoqT2wpUp25M99c+AKvueaZ4ZcTW+1360JF119QfE7OYMi3YnM2CKWI9mSYVQL6U1zBMaGboRd8P+9unVlp5yNhma+IyIKhHPuxN8rlF92j7+vp4mjgjqG2XbO0FQyDEp19zzR56KIH9fsrFnPy41V9dNuK3DLU9pYsJkxS2qJBLN8OrcjzFz+txy56nquvX6A/e/Nm8uGhtrc8xU+tsM+VD+mdEiJJgm/ERG4gK1uK1BKPy3QHMKWQ5MhdeL8MCE+PlGpKR8nTujH3+8V96NRWPvyXB3S/xNLjHJFLKaaWyAE+JDWCTzxJ3GD82FZe2OO1fGLbUJ4ealvd/YwtlGkbbMjC0XvJhRc/pG/CsWM6jHdrTbxQw8SO9lZtbvylEwpOGTuYhdLeIk98Y47+eucCP1DVN4tIUwxXU0QkoJSP6DkbleMkvwU5G4LbVaftJbJouMffaHWLfUN5dqjH3aPa2muZ8qZInhxOu+c/pTMMtBw9U+YO9dgfV3VySyfjjtts8Mf+7Xndat8pVCsyPPmTixbpZrM3pWfaIHXjvn+rbl8us8PHdpU/DLWt61TbFtzF/h0hNoS4tQVXCPCRwRnFVcZgU6DWT7iiRtTSQrzfFnJbs/rUhQ/rTtvtyMqdR9CvRpvrn9FJ/d3sVVDCQpE0dJk2pbGoacUGoI2UqO6Qrh5KbePpedss5gxHA6uq2nbtCtoOnSjPD/aYn6qO6b6fsSfvOvR3a21cvFw3PXgC/ZUm6xf+9Rnd8u1byjOD/fzv7tfdj96Zx0Wkt1nX8PNHdecP7SAP5KN6Tk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTs564P8D7O3S3x6JoTAAAAAASUVORK5CYII=";

function guessIndustryKey(text) {
  const lower = text.toLowerCase();
  for (const [key, words] of Object.entries(INDUSTRY_KEYWORDS)) {
    if (words.some(w => lower.includes(w.toLowerCase()))) return key;
  }
  return null;
}

function extractLabeledField(text, label, stopLabels) {
  // Values in these company-profile documents always sit on a single line
  // ("LABEL: value"), so capturing to end-of-line is simpler and far more
  // robust than looking ahead to the next known label — that approach
  // breaks as soon as a free-text narrative section (e.g. a market
  // performance paragraph) sits between two labeled fields, or when a
  // field's own value happens to contain another label's literal text.
  // stopLabels is kept for call-site compatibility but no longer used.
  const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escape(label) + "\\s*[:\\-]?\\s*(.+)", "i");
  const m = text.match(re);
  return m ? m[1].trim() : "";
}

/**
 * Splits a comma/semicolon-separated labeled field into a clean array.
 * Returns [] rather than [""] when the field is absent or empty.
 */
function parseListField(rawText, label, stopLabels) {
  const raw = extractLabeledField(rawText, label);
  if (!raw) return [];
  return raw.split(/[,;]/).map(s => s.trim()).filter(Boolean);
}

/**
 * Splits the raw PDF text into one block per "PRODUCT N" section and parses
 * NAME / CATEGORY / PRICE / USP / TARGET CUSTOMER / PERFORMANCE out of each.
 * English labels only for now — most GCC-origin company profiles prepared
 * for international/European buyers are already written in English;
 * Arabic product-field labels can be added the same way as the bilingual
 * company-level fields above if real documents need it.
 */
function parseProductBlocks(rawText) {
  const blockRe = /PRODUCT\s+\d+\s*[\s\S]*?(?=PRODUCT\s+\d+|$)/gi;
  const blocks = rawText.match(blockRe) || [];
  const priceFrom = str => {
    if (!str) return null;
    const m = String(str).replace(/[.,](?=\d{3})/g, "").match(/(\d+([.,]\d+)?)/);
    return m ? parseFloat(m[1].replace(",", ".")) : null;
  };
  return blocks.map(block => {
    const name = extractLabeledField(block, "NAME");
    const category = extractLabeledField(block, "CATEGORY");
    const priceRaw = extractLabeledField(block, "PRICE");
    const usp = extractLabeledField(block, "USP");
    const targetCustomer = extractLabeledField(block, "TARGET CUSTOMER");
    const performance = extractLabeledField(block, "PERFORMANCE");
    return {
      name: name || "",
      category: category || "",
      price: priceFrom(priceRaw),
      priceRaw: priceRaw || "",
      usp: usp || "",
      targetCustomer: targetCustomer || "",
      performance: performance || ""
    };
  }).filter(p => p.name);
}

/**
 * Confidence classification for every field this scanner can populate.
 * VERIFIED / ESTIMATED / INFERRED / MISSING — never present an inference as
 * a verified fact.
 */
function classifyFieldConfidence({ companyName, industryRaw, industry, revenueRaw, revenue, budgetRaw, budget, employeesRaw, products, certifications, customerSegments, salesChannels }) {
  return {
    companyName: companyName ? "VERIFIED" : "MISSING",
    industry: industryRaw ? "VERIFIED" : industry ? "INFERRED" : "MISSING",
    revenue: revenue === null ? "MISSING" : revenueRaw && /^[\d.,\s€$]+$/.test(revenueRaw) ? "VERIFIED" : "ESTIMATED",
    budget: budget === null ? "MISSING" : budgetRaw && /^[\d.,\s€$]+$/.test(budgetRaw) ? "VERIFIED" : "ESTIMATED",
    employees: employeesRaw ? "VERIFIED" : "MISSING",
    products: products.length ? "VERIFIED" : "MISSING",
    certifications: certifications.length ? "VERIFIED" : "MISSING",
    customerSegments: customerSegments.length ? "VERIFIED" : "MISSING",
    salesChannels: salesChannels.length ? "VERIFIED" : "MISSING"
  };
}

/** Field labels as they appear in this tool's expected company-profile PDFs (Arabic + English fallback, since real-world uploads may mix both). Parses what it can and reports exactly which fields it found. */
function parseCompanyProfileText(rawTextIn) {
  const rawText = healLabels(rawTextIn);
  const labelSets = {
    companyName: ["اسم الشركة", "COMPANY NAME"],
    industry: ["القطاع", "INDUSTRY"],
    product: ["المنتج / الخدمة", "PRODUCT / SERVICE"],
    headquarters: ["المقر الرئيسي", "HEADQUARTERS"],
    revenue: ["الإيرادات السنوية", "ANNUAL REVENUE"],
    budget: ["ميزانية التوسع", "EXPANSION BUDGET"],
    objective: ["هدف التوسع", "EXPANSION OBJECTIVE"],
    employees: ["عدد الموظفين", "EMPLOYEES"],
    currentMarkets: ["الأسواق الحالية", "CURRENT MARKETS"],
    certifications: ["الشهادات", "CERTIFICATIONS"],
    customerSegments: ["شرائح العملاء", "CUSTOMER SEGMENTS"],
    salesChannels: ["قنوات البيع", "SALES CHANNELS"]
  };
  const allLabels = Object.values(labelSets).flat();

  const findAny = (key) => {
    for (const label of labelSets[key]) {
      const val = extractLabeledField(rawText, label, allLabels.filter(l => l !== label));
      if (val) return val;
    }
    return "";
  };
  const findAnyList = (key) => {
    const raw = findAny(key);
    if (!raw) return [];
    return raw.split(/[,;،]/).map(s => s.trim()).filter(Boolean);
  };

  const companyName = findAny("companyName");
  const industryRaw = findAny("industry");
  const product = findAny("product");
  const revenueRaw = findAny("revenue");
  const budgetRaw = findAny("budget");
  const employeesRaw = findAny("employees");
  const currentMarkets = findAnyList("currentMarkets");
  const certifications = findAnyList("certifications");
  const customerSegments = findAnyList("customerSegments");
  const salesChannels = findAnyList("salesChannels");
  const products = parseProductBlocks(rawText);

  const numFrom = str => {
    const m = String(str).replace(/[.,](?=\d{3})/g, "").match(/(\d+([.,]\d+)?)/);
    return m ? parseFloat(m[1].replace(",", ".")) : null;
  };

  const industry = guessIndustryKey(industryRaw) || guessIndustryKey(rawText);
  // The form fields are in million EUR. Documents usually state full amounts
  // ("EUR 24,500,000"), so large plain numbers are converted; "24.5 million" stays.
  const moneyM = str => {
    const n = numFrom(str);
    if (n === null) return null;
    if (/million|mio|mn|مليون|\bm\b/i.test(String(str))) return n;
    return n >= 10000 ? Math.round(n / 1e4) / 100 : n;
  };
  const revenue = moneyM(revenueRaw);
  const budget = moneyM(budgetRaw);
  const employees = numFrom(employeesRaw);

  const fieldsFound = {
    companyName: Boolean(companyName),
    industry: Boolean(industry),
    product: Boolean(product),
    revenue: revenue !== null,
    budget: budget !== null,
    employees: employees !== null,
    products: products.length > 0,
    certifications: certifications.length > 0,
    customerSegments: customerSegments.length > 0,
    salesChannels: salesChannels.length > 0
  };

  const confidence = classifyFieldConfidence({
    companyName, industryRaw, industry, revenueRaw, revenue, budgetRaw, budget,
    employeesRaw, products, certifications, customerSegments, salesChannels
  });

  return {
    data: {
      companyName: companyName || "",
      industry: industry || "realEstate",
      product: product || "",
      revenue: revenue !== null ? revenue : "",
      budget: budget !== null ? budget : "",
      employees: employees !== null ? employees : "",
      currentMarkets,
      certifications,
      customerSegments,
      salesChannels,
      products
    },
    fieldsFound,
    confidence
  };
}
/** Hoisted to module scope for the same reason as Header — see Header.tsx. */
/**
 * Small print-only building blocks shared by both report documents below.
 * Kept deliberately plain (serif headings, simple borders, no dark theme,
 * no glassmorphism) because these are meant to look like a professional
 * consulting document once "printed" to PDF, not like the app UI.
 */
function ReportSection({ title, children }) {
  return <section style={{ marginTop: 22, breakInside: "avoid" }}>
    <h3 style={{ fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif", fontSize: 15, fontWeight: 700, borderBottom: "1.5px solid #111", paddingBottom: 4, marginBottom: 10 }}>{title}</h3>
    {children}
  </section>;
}
function ReportCover({ kindLabel, companyName, targetLabel, dateLabel, forLabel, generatedLabel }) {
  return <div style={{ minHeight: "70vh", display: "flex", flexDirection: "column", justifyContent: "center", breakAfter: "page" }}>
    <div style={{ background: "#050608", padding: "18px 0", marginBottom: 36, textAlign: "center", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}><img src={TOOL_LOGO_IMG} alt="" style={{ height: 110, width: "auto", display: "inline-block" }} /></div>
    <p style={{ fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif", fontSize: 12, color: "#555" }}>{kindLabel}</p>
    <h1 style={{ fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif", fontSize: 34, fontWeight: 700, marginTop: 10, marginBottom: 26 }}>{companyName}</h1>
    <p style={{ fontSize: 13, color: "#333", marginBottom: 4 }}>{targetLabel}</p>
    <p style={{ fontSize: 11, color: "#777", marginTop: 30 }}>{forLabel}: {companyName}</p>
    <p style={{ fontSize: 11, color: "#777" }}>{generatedLabel}: {dateLabel}</p>
  </div>;
}
function ReportSources({ sources, t }) {
  const unique = [...new Set(sources.filter(Boolean))];
  return <ReportSection title={t.reportSectionSources}>
    <ul style={{ fontSize: 10.5, color: "#444", paddingInlineStart: 18, lineHeight: 1.7 }}>
      {unique.map((s, i) => <li key={i}>{s}</li>)}
    </ul>
  </ReportSection>;
}

const PL = {
  de: {
    kind: "Kompletter Eintrittsplan", cover: "Umsetzungsplan für den Markteintritt", exec: "Zusammenfassung", why: "Warum dieser Markt?", ranking: "Vergleich aller Märkte", factor: "Faktor", overall: "Gesamt",
    whyText: "{c} erzielt mit {s}/100 den höchsten Gesamtscore aller geprüften Märkte. Stärkste Faktoren: {a} ({av}) und {b} ({bv}); schwächster Faktor: {w} ({wv}).", strat: "Eintrittsstrategie & Partner", market: "Marktprofil",
    pop: "Einwohner (Mio.)", gdpc: "BIP pro Kopf (USD)", growth: "BIP-Wachstum", gdp: "BIP (Mrd. USD)", audience: "Zielgruppe", drivers: "Wachstumstreiber", trend: "Trend", players: "Wichtige Wettbewerber", gap: "Marktlücke", tax: "Körperschaftsteuer", vat: "Umsatzsteuer", lic: "Genehmigungen / Gründung", culture: "Geschäftskultur",
    timeline: "Zeitplan & Entscheidungspunkte", gantt: "Wochenplan (Gantt)", steps: "Detailplan: alle Schritte", step: "Schritt", phase: "Phase", cat: "Kategorie", weeks: "Wochen", cost: "Kosten", first90: "Die ersten 90 Tage", first90Intro: "Diese Schritte starten innerhalb der ersten 13 Wochen und müssen zuerst beauftragt werden:", budget: "Budget & Finanzplan", year: "Jahr", c: "Kosten kum.", r: "Umsatz kum.", n: "Netto", risks: "Risiken & Gegenmaßnahmen", next: "Nächste Schritte (sofort)", gate: "Go/No-Go", assumptions: "Annahmen: vereinfachtes, illustratives Modell, Umsatz = Anteil des Heimatumsatzes, skaliert mit dem Marktscore; Kosten = Setup Budget im ersten Jahr, danach reduzierte Betriebskosten.", sources: "Quellen", of: "von", wk: "Woche", page: "Seite",
    gates: ["Pilotkunde bestätigt Nachfrage, Zielmarkt und Budget freigegeben", "Rechtsform gegründet, Konto eröffnet, Genehmigungen beantragt/erteilt", "Partner unter Vertrag, Kernteam besetzt, Preise & Vertragsrahmen stehen", "Soft Launch ausgewertet, erste Umsätze, Skalierungsentscheidung"],
    mit: { market: "Pilotprojekt mit 1 bis 2 Kunden vor Vollinvestition; Nachfrage KPIs (Angebote, Pilotumsatz) definieren.", competition: "Klare Nischenpositionierung; Differenzierung über Spezialisierung statt Preis.", regulatory: "Frühzeitig Rechts und Steuerberater vor Ort einbinden; Genehmigungen parallel zum Setup beantragen.", partner: "2 bis 3 Partnerkandidaten parallel prüfen; Exklusivität erst nach Pilotphase vergeben.", investment: "Budget in Tranchen freigeben, gekoppelt an die Go/No Go Punkte der Phasen." }, mitL: "Gegenmaßnahme",
    notice: "Hinweis: Dieser Plan ist eine regelbasierte Entscheidungsgrundlage und ersetzt keine individuelle Rechtsberatung, Steuerberatung oder Unternehmensberatung."
  },
  en: {
    kind: "Complete Entry Plan", cover: "Market entry execution plan", exec: "Executive summary", why: "Why this market?", ranking: "Comparison of all markets", factor: "Factor", overall: "Overall",
    whyText: "{c} scores {s}/100, the highest overall score of all markets reviewed. Strongest factors: {a} ({av}) and {b} ({bv}); weakest factor: {w} ({wv}).", strat: "Entry strategy & partners", market: "Market profile",
    pop: "Population (m)", gdpc: "GDP per capita (USD)", growth: "GDP growth", gdp: "GDP (bn USD)", audience: "Target audience", drivers: "Growth drivers", trend: "Trend", players: "Key competitors", gap: "Market gap", tax: "Corporate tax", vat: "VAT", lic: "Licensing / incorporation", culture: "Business culture",
    timeline: "Timeline & decision gates", gantt: "Week plan (Gantt)", steps: "Detailed plan: all steps", step: "Step", phase: "Phase", cat: "Category", weeks: "Weeks", cost: "Cost", first90: "The first 90 days", first90Intro: "These steps start within the first 13 weeks and have to be commissioned first:", budget: "Budget & financial plan", year: "Year", c: "Cum. cost", r: "Cum. revenue", n: "Net", risks: "Risks & mitigation", next: "Next steps (immediately)", gate: "Go/No-Go", assumptions: "Assumptions: simplified, illustrative model, revenue = share of home revenue scaled by the market score; cost = set up budget in year one, reduced operating cost afterwards.", sources: "Sources", of: "of", wk: "Week", page: "Page",
    gates: ["Pilot customer confirms demand, target market and budget approved", "Entity formed, bank account open, permits applied for/granted", "Partner contracted, core team in place, pricing and contract framework set", "Soft launch reviewed, first revenue, scale up decision"],
    mit: { market: "Run a pilot with 1 to 2 customers before full investment; define demand KPIs (offers, pilot revenue).", competition: "Position clearly in a niche; differentiate by specialisation, not price.", regulatory: "Involve local legal and tax advisers early; apply for permits in parallel with set up.", partner: "Evaluate 2 to 3 partner candidates in parallel; grant exclusivity only after the pilot.", investment: "Release the budget in tranches tied to the phase go/no go gates." }, mitL: "Mitigation",
    notice: "Note: this plan is a rule based basis for decisions and does not replace individual legal, tax or business advice."
  },
  ar: {
    kind: "خطة الدخول الكاملة", cover: "خطة تنفيذ دخول السوق", exec: "ملخص تنفيذي", why: "لماذا هذا السوق؟", ranking: "مقارنة جميع الأسواق", factor: "العامل", overall: "الإجمالي",
    whyText: "حقق {c} {s}/100، وهي أعلى نتيجة إجمالية بين الأسواق التي تمت مراجعتها. أقوى العوامل: {a} ({av}) و{b} ({bv})؛ وأضعف عامل: {w} ({wv}).", strat: "استراتيجية الدخول والشركاء", market: "نبذة عن السوق",
    pop: "السكان (مليون)", gdpc: "الناتج للفرد (دولار)", growth: "نمو الناتج", gdp: "الناتج المحلي (مليار دولار)", audience: "الجمهور المستهدف", drivers: "محركات النمو", trend: "الاتجاه", players: "أبرز المنافسين", gap: "فجوة السوق", tax: "ضريبة الشركات", vat: "ضريبة القيمة المضافة", lic: "التراخيص / التأسيس", culture: "ثقافة الأعمال",
    timeline: "الجدول الزمني ونقاط القرار", gantt: "الخطة الأسبوعية", steps: "الخطة التفصيلية: كل الخطوات", step: "الخطوة", phase: "المرحلة", cat: "الفئة", weeks: "الأسابيع", cost: "التكلفة", first90: "أول ٩٠ يومًا", first90Intro: "تبدأ هذه الخطوات خلال أول ١٣ أسبوعًا ويجب إطلاقها أولًا:", budget: "الميزانية والخطة المالية", year: "السنة", c: "التكلفة التراكمية", r: "الإيرادات التراكمية", n: "الصافي", risks: "المخاطر وإجراءات المعالجة", next: "الخطوات التالية (فورًا)", gate: "قرار المتابعة", assumptions: "الافتراضات: نموذج مبسّط توضيحي، الإيرادات = نسبة من إيرادات السوق الأم مضروبة في تقييم السوق؛ التكلفة = ميزانية التأسيس في السنة الأولى ثم تكاليف تشغيل أقل.", sources: "المصادر", of: "من", wk: "أسبوع", page: "صفحة",
    gates: ["عميل تجريبي يؤكد الطلب واعتماد السوق والميزانية", "تأسيس الكيان وفتح الحساب وتقديم/منح التراخيص", "التعاقد مع الشريك واكتمال الفريق الأساسي وتحديد الأسعار والإطار التعاقدي", "تقييم الإطلاق التجريبي وأولى الإيرادات وقرار التوسع"],
    mit: { market: "تنفيذ مشروع تجريبي مع عميل أو اثنين قبل الاستثمار الكامل وتحديد مؤشرات الطلب.", competition: "التموضع الواضح في نيش محدد والتميّز بالتخصص لا بالسعر.", regulatory: "إشراك مستشارين قانونيين وضريبيين محليين مبكرًا وتقديم التراخيص بالتوازي مع التأسيس.", partner: "تقييم ٢ إلى ٣ شركاء محتملين بالتوازي ومنح الحصرية بعد المرحلة التجريبية فقط.", investment: "صرف الميزانية على دفعات مرتبطة بنقاط القرار في كل مرحلة." }, mitL: "المعالجة",
    notice: "ملاحظة: هذه الخطة أساس قرار قائم على قواعد ولا تغني عن الاستشارة القانونية أو الضريبية أو التجارية."
  }
};

/**
 * Complete entry plan (multi-page PDF) for the best-ranked market: summary, reasoning, market profile,
 * timeline with decision gates, Gantt, all detailed steps, first 90 days, budget & financials,
 * risks with mitigation, next steps and sources. Built only from the data the result screen uses.
 */
function PlanReportDoc({ rec, t, lang, entryPlanDisplay, detailedSteps, finModel, factorKeys }) {
  const { REGULATORY_CHECK, COMPETITOR_ANALYSIS, MARKET_OPPORTUNITY } = intelFor(lang);
  const intelData = { COUNTRY_FUNDAMENTALS, REGULATORY_CHECK, COMPETITOR_ANALYSIS, MARKET_OPPORTUNITY };
  const intelA = analyze(rec, t, lang, intelData, factorKeys.map(f => f[1]));
  const intelParts = rec.parts || {};
  const L = PL[lang] || PL.en;
  const target = rec.rec.targetMarket;
  const sc = rec.scores[target];
  const dateLabel = new Date().toLocaleDateString(lang);
  const font = "'Inter','Noto Sans Arabic',system-ui,sans-serif";
  const exact = { WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" };
  const phaseColors = ["#2A9D8F", "#B8923F", "#C8553D", "#5B6B7F"];
  const fund = COUNTRY_FUNDAMENTALS[target] || {};
  const opp = MARKET_OPPORTUNITY[target] || {};
  const comp = COMPETITOR_ANALYSIS[target] || {};
  const reg = REGULATORY_CHECK[target] || {};
  const culture = (CULTURAL_INTEL[lang] && CULTURAL_INTEL[lang][target]) || (CULTURAL_INTEL.en && CULTURAL_INTEL.en[target]) || [];
  const total = finModel.costBreakdown.reduce((a, c) => a + c.amount, 0) || 1;
  const totalWeeks = detailedSteps.reduce((m, s) => Math.max(m, s.startWeek + s.durationWeeks), 1);
  const ranked = Object.entries(rec.scores).sort((a, b) => b[1].overall - a[1].overall);
  const fv = k => Math.round(sc[k]);
  const dims = factorKeys.map(([k, label]) => [k, label, sc[k]]).sort((a, b) => b[2] - a[2]);
  const phaseIdx = key => entryPlanDisplay.findIndex(p => p.key === key);
  const th = { textAlign: "start", padding: "4px 6px", borderBottom: "1.5px solid #111", fontSize: 9.5 };
  const td = { padding: "4px 6px", borderBottom: "1px solid #e3e3e3", verticalAlign: "top", fontSize: 10 };
  const box = { flex: 1, border: "1px solid #ddd", borderRadius: 4, padding: "6px 10px" };
  const H = ({ children }) => <h3 style={{ fontSize: 14.5, fontWeight: 700, borderBottom: "1.5px solid #111", paddingBottom: 4, margin: "0 0 10px" }}>{children}</h3>;
  const Sec = ({ title, children, newPage }) => <section style={{ marginTop: newPage ? 0 : 20, breakBefore: newPage ? "page" : "auto" }}><H>{title}</H>{children}</section>;
  const kv = (k, v) => v ? <p style={{ margin: "0 0 5px" }}><strong>{k}:</strong> {v}</p> : null;
  const first90 = detailedSteps.filter(s => s.startWeek < 13);
  const whyText = L.whyText.replace("{c}", target).replace("{s}", sc.overall).replace("{a}", dims[0][1]).replace("{av}", Math.round(dims[0][2])).replace("{b}", dims[1][1]).replace("{bv}", Math.round(dims[1][2])).replace("{w}", dims[dims.length - 1][1]).replace("{wv}", Math.round(dims[dims.length - 1][2]));
  return <div className="print-doc" style={{ display: "none" }} data-print-mode="summary">
    <div style={{ fontFamily: font, color: "#111", maxWidth: 720, margin: "0 auto", padding: "8mm 6mm", fontSize: 10.5, lineHeight: 1.5 }}>
      {/* COVER */}
      <div style={{ minHeight: "240mm", display: "flex", flexDirection: "column", justifyContent: "center", breakAfter: "page" }}>
        <div style={{ background: "#050608", padding: "18px 0", marginBottom: 36, textAlign: "center", ...exact }}><img src={TOOL_LOGO_IMG} alt="" style={{ height: 110, width: "auto", display: "inline-block" }} /></div>
        <p style={{ fontSize: 12, color: "#555", margin: 0 }}>{L.kind}</p>
        <h1 style={{ fontSize: 34, fontWeight: 700, margin: "10px 0 8px" }}>{rec.input.companyName}</h1>
        <p style={{ fontSize: 16, color: "#222", margin: "0 0 4px" }}>{L.cover}: <strong>{target}</strong></p>
        <p style={{ fontSize: 12, color: "#555", margin: 0 }}>{t.industries[rec.input.industry]} · {sc.overall}/100 · {getTimelineLabel(rec.rec.timelineMonths, t)} · {rec.input.budget} {t.costEurLabel}</p>
        <p style={{ fontSize: 11, color: "#777", marginTop: 40 }}>{dateLabel}</p>
      </div>
      {/* 1 EXEC */}
      <Sec title={`1. ${L.exec}`}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={box}><div style={{ color: "#777", fontSize: 9 }}>{t.sumScore}</div><div style={{ fontSize: 18, fontWeight: 700 }}>{sc.overall}/100</div></div>
          <div style={box}><div style={{ color: "#777", fontSize: 9 }}>{t.sumBudget}</div><div style={{ fontSize: 18, fontWeight: 700 }}>{rec.input.budget} {t.costEurLabel}</div></div>
          <div style={box}><div style={{ color: "#777", fontSize: 9 }}>{t.sumPeriod}</div><div style={{ fontSize: 14, fontWeight: 700 }}>{getTimelineLabel(rec.rec.timelineMonths, t)}</div></div>
          <div style={box}><div style={{ color: "#777", fontSize: 9 }}>{t.sumBreakEven}</div><div style={{ fontSize: 14, fontWeight: 700 }}>{finModel.breakEvenYear || t.planNoBreakEven}</div></div>
        </div>
        <p style={{ margin: "0 0 6px" }}>{whyText}</p>
        <p style={{ margin: "0 0 6px" }}>{intelA.robustText}</p>
        {kv(t.reportSectionEntryStrategy, t.strategy[rec.rec.entryStrategy])}
        {kv(t.prioritySector, t.industries[rec.rec.prioritySector])}
      </Sec>
      {/* 2 WHY */}
      <Sec title={`2. ${L.why}`}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
          <thead><tr><th style={th}>{L.ranking}</th>{factorKeys.map(([k, label]) => <th key={k} style={th}>{label}</th>)}<th style={th}>{L.overall}</th></tr></thead>
          <tbody>{ranked.map(([c, s], i) => <tr key={c} style={{ background: c === target ? "#f4ecd8" : "transparent", breakInside: "avoid", ...exact }}>
            <td style={{ ...td, fontWeight: c === target ? 700 : 400 }}>{i + 1}. {c}{c === target ? "" : ""}</td>
            {factorKeys.map(([k]) => <td key={k} style={td}>{Math.round(s[k])}</td>)}
            <td style={{ ...td, fontWeight: 700 }}>{s.overall}</td></tr>)}</tbody>
        </table>
      </Sec>
      {/* 3 MARKET */}
      <Sec title={`3. ${L.market}: ${target}`}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          {fund.gdpBillionUsd !== undefined && <div style={box}><div style={{ color: "#777", fontSize: 9 }}>{L.gdp}</div><div style={{ fontWeight: 700 }}>{fund.gdpBillionUsd}</div></div>}
          {fund.populationMillions !== undefined && <div style={box}><div style={{ color: "#777", fontSize: 9 }}>{L.pop}</div><div style={{ fontWeight: 700 }}>{fund.populationMillions}</div></div>}
          {fund.gdpPerCapitaUsd !== undefined && <div style={box}><div style={{ color: "#777", fontSize: 9 }}>{L.gdpc}</div><div style={{ fontWeight: 700 }}>{Number(fund.gdpPerCapitaUsd).toLocaleString("en-US")}</div></div>}
          {fund.gdpGrowthPct !== undefined && <div style={box}><div style={{ color: "#777", fontSize: 9 }}>{L.growth}</div><div style={{ fontWeight: 700 }}>{fund.gdpGrowthPct}%</div></div>}
        </div>
        {kv(L.audience, opp.audience)}
        {opp.drivers && kv(L.drivers, opp.drivers.join("; "))}
        {kv(L.trend, opp.trend)}
        {comp.players && kv(L.players, comp.players.join("; "))}
        {kv(L.gap, comp.gap)}
        {kv(L.tax, reg.corporateTax)}
        {kv(L.vat, reg.vat)}
        {kv(L.lic, reg.licensing)}
        {culture.length > 0 && <div><p style={{ margin: "0 0 3px" }}><strong>{L.culture}:</strong></p><ul style={{ margin: 0, paddingInlineStart: 16, listStyle: "disc" }}>{culture.map((c, i) => <li key={i}>{c}</li>)}</ul></div>}
        <p style={{ fontSize: 8.5, color: "#777", marginTop: 6 }}>{[fund.source, opp.source, reg.source].filter(Boolean).join(" · ")}</p>
      </Sec>
      {/* 4 STRATEGY */}
      <Sec title={`4. ${L.strat}`}>
        {kv(t.reportSectionEntryStrategy, t.strategy[rec.rec.entryStrategy])}
        {t.partnersText && kv(t.potentialPartners, t.partnersText[rec.rec.prioritySector])}
      </Sec>
      {/* 5 TIMELINE */}
      <Sec title={`5. ${L.timeline}`} newPage>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
          <thead><tr><th style={th}>{L.phase}</th><th style={th}>{t.month}</th><th style={th}>{L.gate}</th></tr></thead>
          <tbody>{entryPlanDisplay.map((p, i) => <tr key={i} style={{ breakInside: "avoid" }}>
            <td style={{ ...td, fontWeight: 700 }}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: phaseColors[i % 4], marginInlineEnd: 6, ...exact }} />{p.label}</td>
            <td style={{ ...td, whiteSpace: "nowrap" }}>{p.startMonth} {RANGE[lang]} {p.endMonth}</td>
            <td style={td}>{L.gates[i % 4]}</td></tr>)}</tbody>
        </table>
        <p style={{ fontWeight: 700, margin: "0 0 6px" }}>{L.gantt}</p>
        <div dir="ltr" style={{ border: "1px solid #ddd", padding: "6px 8px" }}>
          {detailedSteps.map((s, i) => <div key={s.key} style={{ display: "flex", alignItems: "center", fontSize: 8.5, height: 16, breakInside: "avoid" }}>
            <div style={{ width: "34%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingInlineEnd: 6 }}>{i + 1}. {t.steps_[s.key]}</div>
            <div style={{ position: "relative", flex: 1, height: 9, background: "#f2f2f2", ...exact }}>
              <div style={{ position: "absolute", left: `${s.startWeek / totalWeeks * 100}%`, width: `${Math.max(1.5, s.durationWeeks / totalWeeks * 100)}%`, top: 0, bottom: 0, background: phaseColors[Math.max(0, phaseIdx(s.phase)) % 4], ...exact }} />
            </div>
          </div>)}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#777", marginTop: 3, paddingInlineStart: "34%" }}><span>{L.wk} 0</span><span>{L.wk} {Math.round(totalWeeks / 2)}</span><span>{L.wk} {totalWeeks}</span></div>
        </div>
      </Sec>
      {/* 6 STEPS */}
      <Sec title={`6. ${L.steps}`} newPage>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>#</th><th style={th}>{L.step}</th><th style={th}>{L.phase}</th><th style={th}>{L.cat}</th><th style={th}>{L.weeks}</th><th style={th}>{L.cost} ({t.costEurLabel})</th></tr></thead>
          <tbody>{detailedSteps.map((s, i) => <tr key={s.key} style={{ breakInside: "avoid" }}>
            <td style={td}>{i + 1}</td><td style={{ ...td, fontWeight: 600 }}>{t.steps_[s.key]}</td><td style={td}>{t[s.phase]}</td><td style={td}>{t[s.category]}</td>
            <td style={{ ...td, whiteSpace: "nowrap" }}>{s.startWeek + 1} {RANGE[lang]} {s.startWeek + s.durationWeeks}</td><td style={td}>{s.costEurM}</td></tr>)}</tbody>
        </table>
      </Sec>
      {/* 7 FIRST 90 */}
      <Sec title={`7. ${L.first90}`}>
        <p style={{ margin: "0 0 6px" }}>{L.first90Intro}</p>
        <ol style={{ margin: 0, paddingInlineStart: 18, listStyle: "decimal" }}>{first90.map(s => <li key={s.key} style={{ marginBottom: 2 }}><strong>{t.steps_[s.key]}</strong> – {L.wk} {s.startWeek + 1} {RANGE[lang]} {s.startWeek + s.durationWeeks} · {s.costEurM} {t.costEurLabel}</li>)}</ol>
      </Sec>
      {/* 8 BUDGET */}
      <Sec title={`8. ${L.budget}`} newPage>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
          <thead><tr><th style={th}>{L.cat}</th><th style={th}>{t.costEurLabel}</th><th style={th}>{t.chShare || "%"}</th></tr></thead>
          <tbody>{finModel.costBreakdown.map(c => <tr key={c.category} style={{ breakInside: "avoid" }}><td style={td}>{t[c.category]}</td><td style={td}>{c.amount}</td><td style={td}>{Math.round(c.amount / total * 100)}%</td></tr>)}
            <tr><td style={{ ...td, fontWeight: 700 }}>{t.planTotal}</td><td style={{ ...td, fontWeight: 700 }}>{Math.round(total * 100) / 100}</td><td style={td}>100%</td></tr></tbody>
        </table>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 6 }}>
          <thead><tr><th style={th}>{L.year}</th><th style={th}>{L.c} ({t.costEurLabel})</th><th style={th}>{L.r} ({t.costEurLabel})</th><th style={th}>{L.n}</th></tr></thead>
          <tbody>{finModel.projection.map(y => { const n = Math.round((y.cumRevenue - y.cumCost) * 100) / 100; return <tr key={y.year} style={{ breakInside: "avoid" }}><td style={td}>{y.year}</td><td style={td}>{Math.round(y.cumCost * 100) / 100}</td><td style={td}>{Math.round(y.cumRevenue * 100) / 100}</td><td style={{ ...td, color: n >= 0 ? "#1b7f5a" : "#b23a2a", fontWeight: 700 }}>{n >= 0 ? "+" : ""}{n}</td></tr>; })}</tbody>
        </table>
        <p style={{ margin: "6px 0" }}><strong>{t.breakEvenNote}:</strong> {finModel.breakEvenYear || t.planNoBreakEven}</p>
        <p style={{ fontSize: 9, color: "#666", margin: 0 }}>{L.assumptions}</p>
      </Sec>
      {/* 9 RISKS */}
      <Sec title={`9. ${L.risks}`}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>{rec.rec.risks.map((k, i) => <tr key={i} style={{ breakInside: "avoid" }}><td style={{ ...td, width: "45%" }}><strong>{t.scoreDims ? t.scoreDims[k] : k}:</strong> {t.riskText[k]}</td><td style={td}><strong>{L.mitL}:</strong> {L.mit[k]}</td></tr>)}</tbody>
        </table>
      </Sec>
      {/* 10 NEXT */}
      <Sec title={`10. ${L.next}`}>
        <ol style={{ margin: 0, paddingInlineStart: 18, listStyle: "decimal" }}>{rec.rec.steps.map((k, i) => <li key={i} style={{ marginBottom: 2 }}>{t.nextStepText[k]}</li>)}</ol>
      </Sec>
      <IntelPrint A={intelA} rec={rec} lang={lang} factorLabels={factorKeys.map(f => f[1])} data={intelData} parts={intelParts} t={t} />
      <Sec title={`11. ${L.sources}`}>
        <ul style={{ margin: 0, paddingInlineStart: 16, listStyle: "disc", fontSize: 9.5, color: "#444" }}>
          {[...new Set([fund.source, opp.source, reg.source, ...(SOURCES[target] || []).map(s => `${s.name} (${s.url})`)].filter(Boolean))].map((s, i) => <li key={i}>{s}</li>)}
        </ul>
        <p style={{ fontSize: 8.5, color: "#999", marginTop: 10, fontStyle: "italic" }}>{L.notice} {t.reportDisclaimer}</p>
      </Sec>
    </div>
  </div>;
}

const SB_TEXT = {
  de: { unconfirmed: "Mail noch nicht bestätigt. Bitte den Link in der Mail öffnen.", network: "Keine Verbindung. Bitte Netz prüfen.", loginHint: "Anmeldung mit Ihrem Google Konto.", regHint: "Konto mit Mail und Passwort erstellen.", email: "E-Mail", name: "Name", pw: "Passwort", pwHint: "Mindestens 10 Zeichen.", confirmSent: "Fast geschafft: Wir haben dir eine Bestätigungs Mail geschickt. Bitte bestätige sie und melde dich dann an.", invalid: "Mail oder Passwort stimmt nicht.", rate: "Zu viele Versuche. Bitte warte einen Moment.", locked: "Zu viele Fehlversuche. Bitte warte eine Minute.", weak: "Bitte ein Passwort mit mindestens 10 Zeichen verwenden.", generic: "Das hat nicht geklappt. Bitte versuche es erneut.", forgot: "Passwort vergessen?", forgotTitle: "Passwort zurücksetzen", forgotSend: "Link senden", forgotSent: "Wenn ein Konto zu dieser Mail existiert, ist ein Link unterwegs.", back: "Zurück zur Anmeldung", newPw: "Neues Passwort", savePw: "Passwort speichern", pwSaved: "Passwort geändert.", or: "oder", cont: "Weiter mit", account: "Konto", del: "Konto löschen", delSure: "Wirklich alle Daten löschen? Zum Bestätigen erneut klicken.", deleted: "Dein Konto und alle Daten wurden gelöscht.", consent: "Mit der Registrierung stimmst du der", privacy: "Datenschutzerklärung", and: "und den", terms: "AGB", agree: "zu." },
  en: { unconfirmed: "Email not confirmed yet. Please open the link in the email.", network: "No connection. Please check your network.", loginHint: "Sign in with your Google account.", regHint: "Create an account with email and password.", email: "Email", name: "Name", pw: "Password", pwHint: "At least 10 characters.", confirmSent: "Almost done: we sent you a confirmation email. Please confirm it, then sign in.", invalid: "Email or password is incorrect.", rate: "Too many attempts. Please wait a moment.", locked: "Too many failed attempts. Please wait a minute.", weak: "Please use a password with at least 10 characters.", generic: "That did not work. Please try again.", forgot: "Forgot password?", forgotTitle: "Reset password", forgotSend: "Send link", forgotSent: "If an account exists for this email, a link is on its way.", back: "Back to sign in", newPw: "New password", savePw: "Save password", pwSaved: "Password changed.", or: "or", cont: "Continue with", account: "Account", del: "Delete account", delSure: "Delete all data for good? Click again to confirm.", deleted: "Your account and all data were deleted.", consent: "By registering you agree to the", privacy: "Privacy Policy", and: "and the", terms: "Terms", agree: "." },
  ar: { unconfirmed: "لم يتم تأكيد البريد بعد. افتح الرابط في الرسالة.", network: "لا يوجد اتصال. تحقق من الشبكة.", loginHint: "سجّل الدخول عبر حساب Google.", regHint: "أنشئ حسابًا بالبريد الإلكتروني وكلمة المرور.", email: "البريد الإلكتروني", name: "الاسم", pw: "كلمة المرور", pwHint: "10 أحرف على الأقل.", confirmSent: "اقتربت من الإنهاء: أرسلنا لك رسالة تأكيد. يرجى تأكيدها ثم تسجيل الدخول.", invalid: "البريد الإلكتروني أو كلمة المرور غير صحيحة.", rate: "محاولات كثيرة. يرجى الانتظار قليلًا.", locked: "محاولات فاشلة كثيرة. يرجى الانتظار دقيقة.", weak: "يرجى استخدام كلمة مرور من 10 أحرف على الأقل.", generic: "لم تنجح العملية. يرجى المحاولة مرة أخرى.", forgot: "نسيت كلمة المرور؟", forgotTitle: "إعادة تعيين كلمة المرور", forgotSend: "إرسال الرابط", forgotSent: "إذا كان هناك حساب لهذا البريد، فالرابط في الطريق.", back: "العودة إلى تسجيل الدخول", newPw: "كلمة مرور جديدة", savePw: "حفظ كلمة المرور", pwSaved: "تم تغيير كلمة المرور.", or: "أو", cont: "المتابعة عبر", account: "الحساب", del: "حذف الحساب", delSure: "هل تريد حذف كل البيانات نهائيًا؟ انقر مرة أخرى للتأكيد.", deleted: "تم حذف حسابك وكل بياناتك.", consent: "بالتسجيل فإنك توافق على", privacy: "سياسة الخصوصية", and: "و", terms: "الشروط", agree: "." }
};
const AUTH_TEXT = {
  de: { hint: "Falls das dein Konto ist, melde dich an. Mit gleichem Passwort wirst du automatisch angemeldet.", reset: "Gespeicherte Konten auf diesem Gerät zurücksetzen", resetSure: "Wirklich alle Konten auf diesem Gerät löschen? Zum Bestätigen erneut klicken.", resetDone: "Alle Konten auf diesem Gerät wurden gelöscht. Du kannst neu starten." },
  en: { hint: "If this is your account, sign in instead. With the same password you are signed in automatically.", reset: "Reset saved accounts on this device", resetSure: "Delete all accounts on this device? Click again to confirm.", resetDone: "All accounts on this device were deleted. You can start fresh." },
  ar: { hint: "إذا كان هذا حسابك فسجّل الدخول. بنفس كلمة المرور يتم تسجيل دخولك تلقائيًا.", reset: "إعادة ضبط الحسابات المحفوظة على هذا الجهاز", resetSure: "هل تريد حذف كل الحسابات على هذا الجهاز؟ انقر مرة أخرى للتأكيد.", resetDone: "تم حذف كل الحسابات على هذا الجهاز. يمكنك البدء من جديد." }
};
const LAND_TEXT = {
  de: {
    featTitle: "Plattformfunktionen",
    feats: [
      ["Marktscoring", "Fünf Bewertungsfaktoren pro Land: Attraktivität, Wettbewerb, Regulatorik, Partner und Investitionsklima."],
      ["Unternehmensprofil", "Kennzahlen, Zertifizierungen, Kundensegmente und Vertriebskanäle werden strukturiert erfasst."],
      ["PDF und CSV Import", "Unternehmensdaten aus Dokumenten oder Tabellen übernehmen, statt alles neu einzutippen."],
      ["Empfehlung mit Begründung", "Zielmarkt, Einstiegsstrategie, Risiken und potenzielle Partner nachvollziehbar hergeleitet."],
      ["Roadmap und Gewinnschwelle", "Schritt für Schritt Plan, Jahresprognose und Budgetsensitivität."],
      ["Kompletter Eintrittsplan als PDF", "Mehrseitiger Umsetzungsplan für den bestplatzierten Markt: Begründung, Marktprofil, Zeitplan, alle Schritte, Budget, Risiken und Quellen."]
    ],
    flowTitle: "Ablauf der Analyse",
    flow: ["Profil erfassen", "Score berechnen", "Märkte vergleichen", "Empfehlung prüfen", "Report exportieren"],
    reportTitle: "Was ein Report enthält",
    report: ["Ländervergleich mit Gesamtscore", "Faktor Vergleich aller Länder", "Strategische Positionierung", "Empfehlung mit Zeitrahmen", "Risiken und nächste Schritte", "Planüberblick zum Markteintritt"],
    trustTitle: "Methodik und Datenschutz",
    trust: [
      ["Methodik", "Der Score gewichtet fünf Faktoren je Zielmarkt. Die Herleitung ist im Ergebnis einsehbar."],
      ["Datengrundlage", "Ihre eigenen Unternehmensangaben und hinterlegte Länderkennzahlen wie Bevölkerung und BIP."],
      ["Datenschutz", (backend.enabled ? "Konten und Analysen liegen in einer geschützten Datenbank. Jede Person sieht nur ihre eigenen Daten. Details in der Datenschutzerklärung." : "Demo Version: Konten und Analysen bleiben in Ihrem Browser. Kein Server, kein MailVersand.")]
    ],
    footer: "Konzept, Datenmodell und Design von Nadin Okil · Demo mit fiktiven Testdaten"
  },
  en: {
    featTitle: "Platform features",
    feats: [
      ["Market scoring", "Five scoring factors per country: attractiveness, competition, regulation, partners and investment climate."],
      ["Company profile", "Key figures, certifications, customer segments and sales channels captured in a structured way."],
      ["PDF and CSV import", "Take company data from documents or spreadsheets instead of retyping it."],
      ["Reasoned recommendation", "Target market, entry strategy, risks and potential partners, traceably derived."],
      ["Roadmap and break even", "Step by step plan, annual forecast and budget sensitivity."],
      ["Complete entry plan as PDF", "Multi page execution plan for the best ranked market: rationale, market profile, timeline, all steps, budget, risks and sources."]
    ],
    flowTitle: "How the analysis works",
    flow: ["Capture profile", "Calculate score", "Compare markets", "Review recommendation", "Export report"],
    reportTitle: "What a report contains",
    report: ["Country comparison with total score", "Factor comparison across countries", "Strategic positioning", "Recommendation with timeframe", "Risks and next steps", "Market entry plan overview"],
    trustTitle: "Methodology and privacy",
    trust: [
      ["Methodology", "The score weighs five factors per target market. The derivation is visible in the result."],
      ["Data basis", "Your own company inputs and stored country indicators such as population and GDP."],
      ["Privacy", (backend.enabled ? "Accounts and analyses are stored in a protected database. Each person sees only their own data. See the Privacy Policy for details." : "Demo version: accounts and analyses stay in your browser. No server, no email sending.")]
    ],
    footer: "Concept, data model and design by Nadin Okil · Demo with fictional test data"
  },
  ar: {
    featTitle: "ميزات المنصة",
    feats: [
      ["تقييم الأسواق", "خمسة عوامل تقييم لكل دولة: الجاذبية والمنافسة والتنظيم والشركاء ومناخ الاستثمار."],
      ["ملف الشركة", "تسجيل منظم للمؤشرات والشهادات وشرائح العملاء وقنوات البيع."],
      ["استيراد PDF وCSV", "استخدام بيانات الشركة من المستندات أو الجداول بدل إعادة كتابتها."],
      ["توصية مع التعليل", "السوق المستهدف واستراتيجية الدخول والمخاطر والشركاء المحتملون بشكل قابل للتتبع."],
      ["خارطة الطريق ونقطة التعادل", "خطة خطوة بخطوة وتوقعات سنوية وحساسية الميزانية."],
      ["خطة الدخول الكاملة بصيغة PDF", "خطة تنفيذ متعددة الصفحات للسوق الأعلى تقييمًا: المبررات، نبذة عن السوق، الجدول الزمني، كل الخطوات، الميزانية، المخاطر والمصادر."]
    ],
    flowTitle: "مراحل التحليل",
    flow: ["إدخال الملف", "حساب التقييم", "مقارنة الأسواق", "مراجعة التوصية", "تصدير التقرير"],
    reportTitle: "محتوى التقرير",
    report: ["مقارنة الدول مع التقييم الإجمالي", "مقارنة العوامل بين الدول", "الموقع الاستراتيجي", "التوصية مع الإطار الزمني", "المخاطر والخطوات التالية", "نظرة عامة على خطة دخول السوق"],
    trustTitle: "المنهجية والخصوصية",
    trust: [
      ["المنهجية", "يزن التقييم خمسة عوامل لكل سوق مستهدف، ويمكن الاطلاع على آلية الاستنتاج في النتيجة."],
      ["مصدر البيانات", "بيانات شركتك ومؤشرات الدول المخزنة مثل عدد السكان والناتج المحلي."],
      ["الخصوصية", (backend.enabled ? "تُحفظ الحسابات والتحليلات في قاعدة بيانات محمية. يرى كل شخص بياناته فقط. التفاصيل في سياسة الخصوصية." : "نسخة تجريبية: تبقى الحسابات والتحليلات في متصفحك. لا خادم ولا إرسال بريد.")]
    ],
    footer: "فكرة ونموذج بيانات وتصميم نادين أوكيل · نسخة تجريبية ببيانات اختبار وهمية"
  }
};
function LandingSections({ lang, isRTL, ink, subtleInk, lineColor, cardBg, fontDisplay, fontBody, accent, onLegal }) {
  const L = LAND_TEXT[lang] || LAND_TEXT.en;
  const wrap = { maxWidth: 1000, margin: "0 auto", padding: "64px 24px 0" };
  const h2 = { fontFamily: fontDisplay, color: ink, fontSize: 28, fontWeight: 500, margin: "0 0 28px", letterSpacing: 0 };
  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 };
  const card = { border: `1px solid ${lineColor}`, background: cardBg, padding: 22, borderRadius: 6 };
  return <div dir={isRTL ? "rtl" : "ltr"} style={{ fontFamily: fontBody, textAlign: isRTL ? "right" : "left" }}>
      <section style={wrap}>
        <h2 style={h2}>{L.featTitle}</h2>
        <div style={grid}>
          {L.feats.map(([h, p], i) => <div key={i} className="land-card" style={card}>
              <div style={{ width: 24, height: 1, background: accent, marginBottom: 14 }} />
              <h3 style={{ color: ink, fontSize: 15, fontWeight: 600, margin: "0 0 8px" }}>{h}</h3>
              <p style={{ color: subtleInk, fontSize: 13.5, lineHeight: 1.65, margin: 0 }}>{p}</p>
            </div>)}
        </div>
      </section>
      <section style={wrap}>
        <h2 style={h2}>{L.flowTitle}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
          {L.flow.map((s, i) => <div key={i} style={{ borderTop: `1px solid ${accent}`, paddingTop: 14 }}>
              <div style={{ color: accent, fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif", fontSize: 12, marginBottom: 8 }}>{String(i + 1).padStart(2, "0")}</div>
              <div style={{ color: ink, fontSize: 14.5 }}>{s}</div>
            </div>)}
        </div>
      </section>
      <section style={wrap}>
        <h2 style={h2}>{L.reportTitle}</h2>
        <div style={grid}>
          {L.report.map((s, i) => <div key={i} className="land-card" style={{ ...card, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: accent, flexShrink: 0 }} />
              <span style={{ color: ink, fontSize: 14 }}>{s}</span>
            </div>)}
        </div>
      </section>
      <section style={wrap}>
        <h2 style={h2}>{L.trustTitle}</h2>
        <div style={grid}>
          {L.trust.map(([h, p], i) => <div key={i} className="land-card" style={card}>
              <h3 style={{ color: accent, fontSize: 14, fontWeight: 600, margin: "0 0 10px" }}>{h}</h3>
              <p style={{ color: subtleInk, fontSize: 13.5, lineHeight: 1.65, margin: 0 }}>{p}</p>
            </div>)}
        </div>
      </section>
      <footer style={{ maxWidth: 1000, margin: "72px auto 0", padding: "24px 24px 40px", borderTop: `1px solid ${lineColor}`, color: subtleInk, fontSize: 12.5, textAlign: "center" }}>
        {L.footer}
        <div style={{ marginTop: 8 }}>
          {[["impressum", isRTL ? "بيانات الناشر" : lang === "en" ? "Imprint" : "Impressum"], ["datenschutz", isRTL ? "الخصوصية" : lang === "en" ? "Privacy" : "Datenschutz"]].map(([id, label]) => <button type="button" key={id} onClick={() => onLegal(id)} style={{ display: "inline-flex", alignItems: "center", minHeight: 44, margin: "0 10px", color: subtleInk, textDecoration: "underline", textUnderlineOffset: 3 }}>{label}</button>)}
        </div>
        <div style={{ marginTop: 12 }}>
          <LegalNotice lang={lang} th={{ ink, subtleInk, lineColor, cardBg, accent: accent, fontBody, fontDisplay, isRTL }} onMore={() => onLegal("impressum")} />
        </div>
      </footer>
    </div>;
}

function Field({
  label,
  children,
  subtleInk,
  fontBody
}) {
  return <label className="block mb-4">
      <span className="block mb-1.5 text-sm" style={{
      color: subtleInk,
      fontFamily: fontBody
    }}>{label}</span>
      {children}
    </label>;
}

/**
 * Hoisted to module scope on purpose: defining components inside another
 * component's render body gives them a new identity on every render, which
 * makes React unmount+remount their DOM subtree (losing input focus/value)
 * on every keystroke of unrelated state elsewhere in the parent. Keeping
 * this here, with explicit props, is the fix — see README for the bug this
 * caused when Header briefly lived inside the main App component.
 */

function Header({
  onHub,
  session,
  lang,
  setLang,
  dark,
  setDark,
  onLogoClick,
  onLogout,
  t,
  ink,
  subtleInk,
  lineColor,
  fontDisplay,
  isRTL
}) {
  useEffect(() => {
    try {
      let link = document.querySelector("link[rel='icon']");
      if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
      link.href = MARK_IMG;
    } catch (e) {}
  }, []);
  return <div className="flex items-center justify-between px-6 py-4 app-header" style={{
    borderBottom: `1px solid ${lineColor}`
  }}>
      <div className="flex items-center gap-3 cursor-pointer" onClick={onLogoClick}>
        <img src={COIN} alt="" style={{ height: 32, width: 32, borderRadius: "50%" }} />
        <span style={{
        fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif",
        color: ink,
        fontWeight: 600,
        fontSize: 21
      }}>{t.appName}</span>
      </div>
      <div className="flex items-center gap-3">
        {onHub && <button type="button" onClick={onHub} data-testid="back-to-hub" className="px-3 py-1 text-xs font-medium rounded-md" style={{
        border: `1px solid ${lineColor}`,
        color: subtleInk,
        fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif"
      }}>{lang === "ar" ? "كل الأدوات" : lang === "en" ? "All tools" : "Alle Tools"}</button>}
        <ThemeToggle dark={dark} lang={lang} onToggle={() => setDark(!dark)} color={subtleInk} border={lineColor} />
        <div className="flex rounded-md overflow-hidden" style={{
        border: `1px solid ${lineColor}`
      }}>
          {["de", "en", "ar"].map(l => <button key={l} onClick={() => setLang(l)} className="px-3 py-1 text-xs font-medium" style={{
          background: lang === l ? palette.gold : "transparent",
          color: lang === l ? palette.navyDeep : subtleInk,
          fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif"
        }}>
              {l.toUpperCase()}
            </button>)}
        </div>
        {session && <button onClick={onLogout} className="p-2 rounded-md" style={{
        border: `1px solid ${lineColor}`
      }} title={t.logout}>
            <LogOut size={16} color={ink} />
          </button>}
      </div>
    </div>;
}

/** Decorates the engine's language-agnostic entry-plan phases with translated labels + render percentages. */
function getEntryPlanDisplay(rec, lang) {
  const t = T[lang];
  const phases = buildEntryPlan(rec);
  return phases.map((phase, i) => ({
    ...phase,
    label: t[phase.key],
    startPct: ENTRY_PLAN_PHASE_PCTS[i].startPct,
    endPct: ENTRY_PLAN_PHASE_PCTS[i].endPct
  }));
}

/** Translates the engine's numeric timelineMonths into the right display bucket for the current language. */
function getTimelineLabel(timelineMonths, t) {
  if (timelineMonths <= 9) return t.timelineShort;
  if (timelineMonths <= 14) return t.timelineMedium;
  return t.timelineLong;
}

/* ---------------------------------------------------------
   CRYSTAL INTRO — plays once per load. Shards fly in from the
   edges, converge into a faceted crystal, then reveal the logo
   letter. A short generated chime (Web Audio API, no audio file)
   plays alongside — wrapped in try/catch since some browsers
   block audio before any user gesture.
--------------------------------------------------------- */
function CrystalIntro({ onDone, appName, isRTL }) {
  const [phase, setPhase] = useState("assembling");
  const [showBrand, setShowBrand] = useState(true);
  useEffect(() => {
    const tBrand = setTimeout(() => setShowBrand(false), 900);
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const now = ctx.currentTime;
      const freqs = [659.25, 830.61, 987.77, 1318.5];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = f;
        const t0 = now + i * 0.14;
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.14, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.1);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 1.2);
      });
    } catch (e) {
      /* autoplay blocked or unsupported — silent, animation still plays */
    }
    const t1 = setTimeout(() => setPhase("formed"), 1300);
    const t2 = setTimeout(() => setPhase("fading"), 2300);
    const t3 = setTimeout(() => onDone(), 2750);
    return () => {
      clearTimeout(tBrand);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const shardCount = 10;
  const shards = Array.from({ length: shardCount });

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      background: "#050608",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      opacity: phase === "fading" ? 0 : 1,
      transition: "opacity 0.45s ease"
    }}>
      <div style={{
        position: "absolute",
        inset: 0,
        zIndex: 2,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#050608",
        opacity: showBrand ? 1 : 0,
        pointerEvents: "none",
        transition: "opacity 0.55s ease"
      }}>
        <img src={BRAND_LOGO_IMG} alt="" style={{
          width: 300, maxWidth: "78vw",
          height: "auto",
          objectFit: "contain"
        }} />
        {/* Rendered as real text (not baked into the image) so it is never
            cropped, is crisp at any resolution, and can be localized. */}
        {isRTL && <p style={{
          marginTop: 14,
          fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif",
          color: palette.gold,
          fontSize: 15,
          letterSpacing: 3,
          textTransform: "uppercase",
          textAlign: "center"
        }}>{appName}</p>}
      </div>
      <div style={{ position: "relative", width: 340, height: 340, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {shards.map((_, i) => {
          const angle = (i / shardCount) * 360;
          const dist = phase === "assembling" ? 300 : 0;
          return (
            <div key={i} style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 22,
              height: 38,
              background: "linear-gradient(135deg, #FFFFFF, #527FB8)",
              clipPath: "polygon(50% 0%, 100% 35%, 82% 100%, 18% 100%, 0% 35%)",
              transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${dist}px)`,
              transition: "transform 1.15s cubic-bezier(.16,1,.3,1), opacity 0.4s ease",
              opacity: phase === "assembling" ? 0.92 : 0,
              boxShadow: "none"
            }} />
          );
        })}
        <div style={{
          position: "absolute",
          opacity: phase === "assembling" ? 0 : 1,
          transform: phase === "assembling" ? "scale(0.3)" : "scale(1)",
          transition: "all 0.8s cubic-bezier(.16,1,.3,1)"
        }}>
          <img src={TOOL_LOGO_IMG} alt="" style={{
          width: 300, maxWidth: "78vw",
          height: "auto",
          objectFit: "contain"
        }} />
        </div>
      </div>
      {isRTL && phase !== "assembling" && (
        <p style={{
          position: "absolute",
          bottom: "16%",
          color: palette.gold,
          fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif",
          fontSize: 26,
          letterSpacing: 0.5,
          opacity: phase === "fading" ? 0 : 1,
          transition: "opacity 0.4s ease"
        }}>{appName}</p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   MAIN APP
--------------------------------------------------------- */
const HeroObject = React.lazy(() => import("../../HeroObject.jsx"));
const SOCIAL_ICONS = {
  google: <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.1 5.5c4.3-4 6.8-9.8 6.8-16.9z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 010-9.4l-7.9-6.1a24 24 0 000 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.4-4.6 2.3-8.8 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>,
  apple: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.4 12.6c0-2.4 2-3.5 2.1-3.6-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9s-1.9-.9-3.200-.8c-1.600 0-3.100 1-4 2.400-1.700 3-.4 7.300 1.200 9.700.8 1.200 1.800 2.500 3 2.400 1.200 0 1.700-.8 3.100-.8s1.900.8 3.200.7c1.300 0 2.200-1.200 3-2.400.9-1.300 1.300-2.700 1.300-2.800 0 0-2.500-1-2.500-3.800zM14 5.400c.7-.8 1.100-1.900 1-3-.9 0-2.100.6-2.800 1.400-.6.700-1.100 1.800-1 2.900 1.100.1 2.100-.5 2.800-1.300z"/></svg>,
  github: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5a12 12 0 00-3.800 23.400c.6.1.8-.3.8-.6v-2c-3.300.7-4-1.600-4-1.600-.6-1.400-1.400-1.800-1.400-1.800-1-.7.1-.7.1-.7 1.200.1 1.800 1.200 1.800 1.200 1 1.800 2.800 1.300 3.500 1 .1-.8.4-1.300.7-1.600-2.700-.3-5.500-1.300-5.500-5.900 0-1.300.5-2.400 1.200-3.200-.1-.3-.5-1.500.1-3.200 0 0 1-.3 3.300 1.200a11.500 11.500 0 016 0c2.300-1.500 3.300-1.200 3.300-1.200.7 1.700.2 2.900.1 3.200.8.800 1.200 1.900 1.200 3.200 0 4.600-2.800 5.600-5.500 5.900.4.400.8 1.100.8 2.200v3.300c0 .3.2.7.8.6A12 12 0 0012 .5z"/></svg>
};
function GCCMarketEntryApp({ onHub, skipIntro }) {
  const [showIntro, setShowIntro] = useState(!skipIntro);
  const [lang, setLang] = useState(() => {
    try { const v = window.localStorage.getItem("ui_lang"); if (v === "de" || v === "en" || v === "ar") return v; } catch (e) { /* storage blocked */ }
    const nav = ((typeof navigator !== "undefined" && navigator.language) || "de").slice(0, 2).toLowerCase();
    return nav === "ar" ? "ar" : nav === "en" ? "en" : "de";
  });
  useEffect(() => { try { window.localStorage.setItem("ui_lang", lang); } catch (e) { /* ignore */ } }, [lang]);
  const { REGULATORY_CHECK, COMPETITOR_ANALYSIS, MARKET_OPPORTUNITY } = intelFor(lang);
  const [dark, setDark] = useState(readTheme);
  useEffect(() => { writeTheme(dark); }, [dark]);
  /** Real, persisted multi-user accounts via the artifact storage API — survives reloads and works across visitors of this tool link. Accounts are stored under a shared key so anyone who registers can log back in from any session; each account only needs a name + password. This is still a demo-grade auth (no hashing, no real backend server) — good enough for a working multi-user prototype, not for handling sensitive real passwords. */
  const [db, setDb] = useState({});
  const [dbLoaded, setDbLoaded] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const [lastStorageErrorDetail, setLastStorageErrorDetail] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [resetArmed, setResetArmed] = useState(false);
  const [session, setSession] = useState(null); // name-key of logged in user
  const [view, setView] = useState("landing");
  const [authForm, setAuthForm] = useState({ password: "", name: "", email: "" });
  const [authMode, setAuthMode] = useState(""); // "" | "forgot" | "recovery"
  const [sbUser, setSbUser] = useState(null);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [consent, setConsent] = useState(false); // required "privacy policy read" checkbox at registration
  const [consentErr, setConsentErr] = useState("");
  const [legalAnchor, setLegalAnchor] = useState("");
  const [dcNotice, setDcNotice] = useState("");
  const legalFromRef = useRef("landing");
  function openLegal(anchor) {
    if (view !== "legal") legalFromRef.current = view;
    setLegalAnchor(anchor || "");
    setView("legal");
    try { window.history.replaceState(null, "", `#europe/rechtliches${anchor ? "-" + anchor : ""}`); } catch (e) { /* sandboxed preview */ }
  }
  function closeLegal() {
    try { window.history.replaceState(null, "", window.location.pathname + window.location.search + "#europe"); } catch (e) { /* sandboxed preview */ }
    const from = legalFromRef.current;
    setView(session ? "dashboard" : from === "register" || from === "login" ? from : "landing");
  }
  useEffect(() => {
    const apply = () => {
      const m = /^#europe\/rechtliches(?:-([a-z]+))?$/.exec(window.location.hash || "");
      if (m) { setLegalAnchor(m[1] || ""); setView("legal"); }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);
  const recoveryRef = useRef(false);
  const authRef = useRef(null);
  authRef.current = authForm;
  /** Reads the real field values from the DOM at submit time. Password managers and some tablet browsers (iPad Safari autofill) fill inputs without firing React change events, which would otherwise submit empty values. */
  function syncAuthDom(form) {
    const base = { ...authForm };
    if (form && form.elements) {
      const g = n => { const el = form.elements.namedItem(n); return el && typeof el.value === "string" ? el.value : undefined; };
      const nm = g("username") !== undefined ? g("username") : g("name");
      if (nm !== undefined) base.name = nm;
      if (g("email") !== undefined) base.email = g("email");
      if (g("password") !== undefined) base.password = g("password");
    }
    authRef.current = base;
  }
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [form, setForm] = useState({
    companyName: "",
    industry: "realEstate",
    product: "",
    revenue: "",
    budget: "",
    employees: "",
    certifications: "",
    customerSegments: "",
    salesChannels: "",
    productsText: "",
    scannedProducts: [] // full rich product objects from a PDF scan, kept alongside productsText so scanned detail (price/USP/target customer) survives even though the visible field is a simple comma list
  });
  const [activeResult, setActiveResult] = useState(null);
  const [printMode, setPrintMode] = useState(null); // null | "summary" — selects which of the two dedicated print documents is shown to the browser's print dialog
  const [reviewForm, setReviewForm] = useState({
    revenueActual: "",
    costsActual: "",
    newCustomers: "",
    leads: "",
    conversionActual: "",
    notes: ""
  });
  const [inputMethod, setInputMethod] = useState("manual");
  const [csvText, setCsvText] = useState("");
  const [csvError, setCsvError] = useState("");
  const [pdfFileName, setPdfFileName] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [openCountry, setOpenCountry] = useState(null); // expanded country row in the comparison
  const [openRisk, setOpenRisk] = useState(null);
  const [openNext, setOpenNext] = useState(null);
  const [selPhase, setSelPhase] = useState(null); // clicked plan phase (filters the step list)
  const [chartSel, setChartSel] = useState(null); // clicked chart element
  const [openStep, setOpenStep] = useState(null); // expanded step row
  const t = T[lang];
  const isRTL = lang === "ar";
  const bg = dark ? palette.navyDeep : palette.parchment;
  const cardBg = dark ? palette.navyMid : palette.parchmentCard;
  const ink = dark ? "#F3F1EC" : palette.ink;
  const subtleInk = dark ? "#A5A8B2" : palette.slate;
  const lineColor = dark ? palette.navyLine : "#E4DFD1";
  const fontBody = "'Inter','Noto Sans Arabic',system-ui,sans-serif";
  const fontDisplay = "'Inter','Noto Sans Arabic',system-ui,sans-serif";

  /** Load the shared accounts database and this browser's remembered session once on mount. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let accounts = {};
      try {
        const res = await backend.accountsGet();
        if (res && res.value) accounts = JSON.parse(res.value);
      } catch (e) {
        /* key doesn't exist yet on first-ever run, or storage unavailable — start with an empty account list */
      }
      if (cancelled) return;
      if (!backend.enabled) setDb(accounts);
      let restored = false;
      try {
        const sessionRes = await window.storage.get("session", false);
        const savedKey = sessionRes && sessionRes.value;
        if (!backend.enabled && savedKey && accounts[savedKey]) {
          setSession(savedKey);
          setView("dashboard");
          restored = true;
        }
      } catch (e) {
        /* no remembered session on this device — normal for a first visit */
      }
      if (!restored && backend.IS_DEMO && !cancelled) {
        // Demo build: no login needed, open the tool directly with a local demo account.
        try {
          const r = await backend.demoEnsure("Demo", "demo-visitor");
          const fresh = await backend.accountsGet();
          if (r && r.ok && fresh && fresh.value && !cancelled) { setDb(JSON.parse(fresh.value)); setSession("demo"); setView("dashboard"); }
        } catch (e) { /* fall back to the normal landing page */ }
      }
      setDbLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Opens the browser's native print dialog once React has actually rendered
   * the chosen report's DOM (a raw window.print() called in the same tick as
   * setPrintMode would still see the old DOM). The dialog itself lets the
   * person "Save as PDF" — this is a real, working export, not a simulation,
   * just without an extra PDF-generation library. printMode resets once the
   * dialog closes (afterprint fires whether the person printed or cancelled).
   */
  useEffect(() => {
    if (!printMode) return;
    document.body.classList.add("printing-report");
    const t = setTimeout(() => window.print(), 60);
    const reset = () => {
      setPrintMode(null);
      document.body.classList.remove("printing-report");
    };
    window.addEventListener("afterprint", reset);
    return () => {
      clearTimeout(t);
      document.body.classList.remove("printing-report");
      window.removeEventListener("afterprint", reset);
    };
  }, [printMode]);

  /** Persists the full accounts object back to shared storage; called after register and after any analysis save so data survives reloads. Returns true/false so callers (e.g. registration) can tell whether the write actually succeeded instead of assuming it did. */
  async function persistAccounts(nextDb) {
    if (backend.enabled) {
      try {
        const uid = Object.keys(nextDb)[0];
        if (uid) await backend.saveAnalyses(uid, nextDb[uid].analyses);
        setStorageWarning(false);
        return true;
      } catch (e) {
        setStorageWarning(true);
        return false;
      }
    }
    try {
      await backend.accountsSet(JSON.stringify(nextDb));
      setStorageWarning(false);
      setLastStorageErrorDetail("");
      return true;
    } catch (e) {
      setStorageWarning(true);
      setLastStorageErrorDetail(`${(e && e.name) || "Error"}: ${(e && e.message) || String(e)}`);
      return false;
    }
  }
  /** Hashes a password with SHA-256 via the browser's built-in Web Crypto API before it is ever stored or compared, so plaintext passwords never touch storage. Still demo-grade (no salt, no server-side auth) but meaningfully better than storing raw text. */
  async function hashPassword(plain) {
    // Some embedded preview contexts (e.g. a non-top-level iframe without a
    // secure origin) do not expose the Web Crypto API at all. Failing loudly
    // here, instead of letting `crypto.subtle` be undefined and throw deep
    // inside a promise chain, is what lets handleLogin/handleRegister show a
    // real message instead of the button silently doing nothing.
    const bytes = typeof TextEncoder !== "undefined" ? new TextEncoder().encode(plain) : Uint8Array.from(unescape(encodeURIComponent(plain)), c => c.charCodeAt(0));
    if (!(window.crypto && window.crypto.subtle)) {
      return sha256Fallback(bytes);
    }
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
  }
  /** Name already exists: same password -> just sign in; otherwise explain and offer a way forward. */
  async function finishExistingName(key, source) {
    try {
      const rec = source[key];
      const entered = await hashPassword(authRef.current.password);
      const stored = rec && (rec.passwordHash || rec.password);
      if (stored && stored === entered) {
        setDb(source);
        setSession(key);
        if (rememberMe) window.storage.set("session", key, false).catch(() => {});
        setAuthForm({ password: "", name: "" });
        setView("dashboard");
        return;
      }
    } catch (err) { /* fall through to the message */ }
    setAuthError(`${t.nameInUse} ${AUTH_TEXT[lang].hint}`);
  }
  async function resetLocalAccounts() {
    if (!resetArmed) { setResetArmed(true); setAuthNotice(""); return; }
    try { await backend.accountsSet("{}"); } catch (err) { /* ignore */ }
    try { await window.storage.delete("session", false); } catch (err) { /* ignore */ }
    setDb({});
    setSession(null);
    setAuthError("");
    setResetArmed(false);
    setAuthNotice(AUTH_TEXT[lang].resetDone);
  }
  /* Form submit that also works inside sandboxed previews (e.g. the chat preview), where browsers block native form submission and never fire "submit". Clicks on submit buttons and Enter in text fields are routed to a synthetic submit event that React handles. */
  useEffect(() => {
    const fire = form => {
      if (!form) return;
      if (form.checkValidity && !form.checkValidity()) { if (form.reportValidity) form.reportValidity(); return; }
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    };
    const onClick = e => {
      const b = e.target && e.target.closest ? e.target.closest("button, input[type=submit]") : null;
      if (b && b.form && b.type === "submit" && !b.disabled) { e.preventDefault(); fire(b.form); }
    };
    const onKey = e => {
      if (e.key !== "Enter" || e.defaultPrevented || e.isComposing) return;
      const el = e.target;
      if (!el || el.tagName !== "INPUT" || !el.form) return;
      if (["checkbox", "radio", "file", "button", "submit", "reset"].indexOf((el.type || "").toLowerCase()) >= 0) return;
      e.preventDefault(); fire(el.form);
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("click", onClick, true); document.removeEventListener("keydown", onKey, true); };
  }, []);
  useEffect(() => {
    document.documentElement.style.background = bg;
    const old = document.getElementById("ambient"); if (old) old.remove();
  }, [dark, bg]);
  /* ---- Supabase auth (active only when VITE_SUPABASE_* is set) ---- */
  const SBT = SB_TEXT[lang];
  function sbMsg(c) {
    return c === "locked" ? SBT.locked : c === "unconfirmed" ? SBT.unconfirmed : c === "network" ? SBT.network : c === "rate" ? SBT.rate : c === "weak" ? SBT.weak : c === "invalid" ? SBT.invalid : SBT.generic;
  }
  useEffect(() => {
    if (!backend.enabled) return;
    let off = false;
    const hydrate = async user => {
      try {
        const analyses = await backend.loadAnalyses(user.id);
        if (off) return;
        setDb({ [user.id]: { name: (user.user_metadata && user.user_metadata.name) || user.email, analyses } });
        setSbUser(user);
        setSession(user.id);
        if (!recoveryRef.current) setView(v => (["landing", "login", "register"].includes(v) ? "dashboard" : v));
      } catch (e) {
        setAuthError(SB_TEXT.de.generic && SB_TEXT[lang].generic);
      }
    };
    backend.getUser().then(u => { if (u && !off) hydrate(u); });
    const unsub = backend.onAuth((ev, u) => {
      if (ev === "PASSWORD_RECOVERY") {
        recoveryRef.current = true;
        setAuthMode("recovery");
        setView("login");
        if (u) hydrate(u);
      } else if (ev === "SIGNED_IN" && u) {
        hydrate(u);
      } else if (ev === "SIGNED_OUT") {
        setSession(null); setSbUser(null); setDb({});
      }
    });
    return () => { off = true; unsub(); };
  }, []);
  useEffect(() => {
    if (!backend.enabled || !session) return;
    return backend.startIdleTimer(() => handleLogout());
  }, [session]);
  async function sbRun(fn) {
    if (authSubmitting) return;
    setAuthError(""); setAuthNotice("");
    setAuthSubmitting(true);
    try { await fn(); } catch (e) { setAuthError(SBT.generic); } finally { setAuthSubmitting(false); }
  }
  const sbRegister = () => sbRun(async () => {
    if (!consent) { setConsentErr(legalPack(lang).consent.error); return; }
    const email = authRef.current.email.trim(), name = authRef.current.name.trim();
    if (!email || !name) { setAuthError(t.reqField); return; }
    if (authRef.current.password.length < 10) { setAuthError(SBT.weak); return; }
    const r = await backend.signUp({ email, password: authRef.current.password, name });
    if (r.ok) { setAuthNotice(SBT.confirmSent); setAuthForm({ password: "", name: "", email: "" }); setView("login"); }
    else setAuthError(sbMsg(r.code));
  });
  const sbLogin = () => sbRun(async () => {
    const email = authRef.current.email.trim();
    if (!email || !authRef.current.password) { setAuthError(t.reqField); return; }
    const r = await backend.signIn({ email, password: authRef.current.password });
    if (r.ok) setAuthForm({ password: "", name: "", email: "" });
    else setAuthError(sbMsg(r.code));
  });
  const sbForgot = () => sbRun(async () => {
    if (!authRef.current.email.trim()) { setAuthError(t.reqField); return; }
    await backend.resetPassword(authRef.current.email.trim());
    setAuthNotice(SBT.forgotSent); setAuthMode("");
  });
  const sbRecover = () => sbRun(async () => {
    if (authRef.current.password.length < 10) { setAuthError(SBT.weak); return; }
    const r = await backend.updatePassword(authRef.current.password);
    if (r.ok) { recoveryRef.current = false; setAuthMode(""); setAuthForm({ password: "", name: "", email: "" }); setAuthNotice(SBT.pwSaved); setView("dashboard"); }
    else setAuthError(sbMsg(r.code));
  });
  async function sbSocial(p) {
    setAuthError("");
    if (!consent) { setConsentErr(legalPack(lang).consent.error); return; }
    const r = await backend.signInOAuth(p);
    if (!r.ok) setAuthError(SBT.generic);
  }
  function exportMyData() {
    const acct = backend.enabled && sbUser ? { email: sbUser.email } : { name: session };
    downloadJSON(`${t.appName.replace(/\s+/g, "-")}-data-export-${new Date().toISOString().slice(0, 10)}.json`, {
      format: "market-entry-export/1",
      exportedAt: new Date().toISOString(),
      legalBasis: "Art. 15, 20 GDPR",
      account: acct,
      analyses: userAnalyses
    });
    setDcNotice(legalPack(lang).dc.exported);
  }
  async function localDeleteAccount() {
    if (!deleteArmed) { setDeleteArmed(true); return; }
    const next = { ...db };
    delete next[session];
    setDb(next);
    await persistAccounts(next);
    window.storage.delete("session", false).catch(() => {});
    setSession(null);
    setDeleteArmed(false);
    setDcNotice("");
    setView("landing");
  }
  async function sbDelete() {
    if (!deleteArmed) { setDeleteArmed(true); return; }
    const r = await backend.deleteAccount();
    setDeleteArmed(false);
    if (r.ok) { setSession(null); setSbUser(null); setDb({}); setView("landing"); setAuthNotice(SBT.deleted); }
    else setAuthError(SBT.generic);
  }
  async function handleRegister(e) {
    e.preventDefault();
    if (backend.enabled) return sbRegister();
    if (authSubmitting) return; // guard against double-submit (double-click, slow network + repeated Enter)
    setAuthError("");
    if (!consent) { setConsentErr(legalPack(lang).consent.error); return; }
    const key = authRef.current.name.trim().toLowerCase();
    if (!key || !authRef.current.password) {
      setAuthError(t.reqField);
      return;
    }
    if (db[key]) {
      setAuthSubmitting(true);
      try { await finishExistingName(key, db); } finally { setAuthSubmitting(false); }
      return;
    }
    setAuthSubmitting(true);
    try {
      const passwordHash = await hashPassword(authRef.current.password);
      // Re-fetch the latest accounts right before writing, rather than trusting
      // the possibly-stale `db` already in React state. This closes most of the
      // window where two near-simultaneous registrations would otherwise each
      // build their own nextDb from an outdated snapshot and the second write
      // would silently wipe out the first person's brand-new account.
      let latestDb = db;
      try {
        const res = await backend.accountsGet();
        if (res && res.value) latestDb = JSON.parse(res.value);
      } catch (e) {
        /* no accounts saved yet, or storage temporarily unreachable — fall back to local state */
      }
      if (latestDb[key]) {
        await finishExistingName(key, latestDb);
        return;
      }
      const nextDb = {
        ...latestDb,
        [key]: {
          passwordHash,
          name: authRef.current.name,
          analyses: []
        }
      };
      const saved = await persistAccounts(nextDb);
      if (!saved) {
        // Do NOT log the person in or advance to the dashboard: if this write
        // failed, the account does not actually exist anywhere yet, and
        // proceeding would show a false "you're in" state that breaks on the
        // very next login attempt or page reload.
        setAuthError(t.saveFailed);
        return;
      }
      setDb(nextDb);
      setSession(key);
      if (rememberMe) {
        window.storage.set("session", key, false).catch(() => {});
      }
      setAuthForm({
        password: "",
        name: ""
      });
      setView("dashboard");
    } catch (err) {
      // Catches anything not already handled above (e.g. hashPassword's
      // "crypto-unavailable" error, or a malformed accounts record) so the
      // button always ends in a visible state instead of appearing to do
      // nothing.
      console.error("Registration failed:", err);
      setAuthError(t.authUnexpectedError);
    } finally {
      setAuthSubmitting(false);
    }
  }
  async function handleLogin(e) {
    e.preventDefault();
    if (backend.enabled) return sbLogin();
    if (authSubmitting) return; // guard against double-submit
    setAuthError("");
    setAuthSubmitting(true);
    try {
      const key = authRef.current.name.trim().toLowerCase();
      if (backend.IS_DEMO && key && authRef.current.password) await backend.demoEnsure(authRef.current.name, authRef.current.password);
      // Read accounts fresh from storage rather than trusting the `db` state,
      // which is only populated once the initial load effect finishes. Without
      // this, logging in immediately after the page loads (before that load
      // completes) would wrongly report "invalid login" for a real account.
      let latestDb = db;
      try {
        const res = await backend.accountsGet();
        if (res && res.value) latestDb = JSON.parse(res.value);
      } catch (e) {
        /* no accounts saved yet, or storage temporarily unreachable — fall back to local state */
      }
      const record = latestDb[key];
      const enteredHash = authRef.current.password ? await hashPassword(authRef.current.password) : "";
      const storedHash = record ? (record.passwordHash || record.password) : null;
      if (!record || storedHash !== enteredHash) {
        setAuthError(t.invalidLogin);
        return;
      }
      if (latestDb !== db) setDb(latestDb);
      setSession(key);
      if (rememberMe) {
        window.storage.set("session", key, false).catch(() => {});
      }
      setAuthForm({
        password: "",
        name: ""
      });
      setView("dashboard");
    } catch (err) {
      console.error("Login failed:", err);
      setAuthError(t.authUnexpectedError);
    } finally {
      setAuthSubmitting(false);
    }
  }
  function handleLogout() {
    if (backend.enabled) { backend.signOut(); setSbUser(null); setDb({}); }
    setSession(null);
    window.storage.delete("session", false).catch(() => {});
    setView("landing");
    if (onHub) onHub(backend.enabled ? "login" : undefined);
  }
  function handleAnalyze(e) {
    e.preventDefault();
    const certifications = splitList(form.certifications);
    const customerSegments = splitList(form.customerSegments);
    const salesChannels = splitList(form.salesChannels);
    const products = buildProductsFromText(form.productsText, form.scannedProducts);
    const full = computeScoresFull({
      industry: form.industry,
      revenue: Number(form.revenue),
      budget: Number(form.budget),
      employees: Number(form.employees),
      certifications,
      customerSegments,
      salesChannels,
      products
    });
    const scores = full.result;
    const rec = buildRecommendation(scores, form.industry);
    const record = {
      id: Date.now(),
      parts: full.parts,
      input: {
        ...form,
        employees: Number(form.employees) || 0,
        certifications,
        customerSegments,
        salesChannels,
        products
      },
      scores,
      rec,
      createdAt: new Date().toLocaleDateString(lang)
    };
    setDb(prev => {
      const userRec = prev[session];
      const next = {
        ...prev,
        [session]: {
          ...userRec,
          analyses: [record, ...userRec.analyses]
        }
      };
      persistAccounts(next);
      return next;
    });
    setActiveResult(record);
    setView("result");
  }
  function openThreeMonthReview(rec) {
    setActiveResult(rec);
    setReviewForm(rec.threeMonthReview ? {
      revenueActual: String(rec.threeMonthReview.revenueActual),
      costsActual: String(rec.threeMonthReview.costsActual),
      newCustomers: String(rec.threeMonthReview.newCustomers),
      leads: String(rec.threeMonthReview.leads),
      conversionActual: String(rec.threeMonthReview.conversionActual),
      notes: rec.threeMonthReview.notes || ""
    } : {
      revenueActual: "",
      costsActual: "",
      newCustomers: "",
      leads: "",
      conversionActual: "",
      notes: ""
    });
    setView("threeMonthReview");
  }
  function handleSubmitReview(e) {
    e.preventDefault();
    const rec = activeResult;
    const targetOverall = rec.scores[rec.rec.targetMarket].overall;
    const finModel = buildFinancialModel({
      ...rec.input,
      revenue: Number(rec.input.revenue),
      budget: Number(rec.input.budget)
    }, targetOverall);
    const review = computeThreeMonthReview(finModel, reviewForm);
    const updatedRecord = {
      ...rec,
      threeMonthReview: review
    };
    setDb(prev => {
      const userRec = prev[session];
      const next = {
        ...prev,
        [session]: {
          ...userRec,
          analyses: userRec.analyses.map(a => a.id === rec.id ? updatedRecord : a)
        }
      };
      persistAccounts(next);
      return next;
    });
    setActiveResult(updatedRecord);
  }
  function exportCSV(record) {
    const rows = [["Country", "Market", "Competition", "Regulatory", "Partner", "Investment", "Overall"], ...Object.entries(record.scores).map(([c, s]) => [c, s.market, s.competition, s.regulatory, s.partner, s.investment, s.overall]), [], ["Target Market", record.rec.targetMarket], ["Entry Strategy", t.strategy[record.rec.entryStrategy]], ["Priority Sector", t.industries[record.rec.prioritySector]], ["Timeline", getTimelineLabel(record.rec.timelineMonths, t)], ["Risks", record.rec.risks.map(k => t.riskText[k]).join(" | ")], ["Potential Partners", t.partnersText[record.rec.prioritySector] || ""], ["Next Steps", record.rec.steps.map(k => t.nextStepText[k]).join(" | ")]];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${record.input.companyName || "analysis"}-europe-market-entry.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function toFormState(input) {
    return {
      companyName: input.companyName,
      industry: input.industry,
      product: input.product,
      revenue: String(input.revenue),
      budget: String(input.budget),
      employees: input.employees !== "" && input.employees != null ? String(input.employees) : "",
      certifications: (input.certifications || []).join(", "),
      customerSegments: (input.customerSegments || []).join(", "),
      salesChannels: (input.salesChannels || []).join(", "),
      productsText: (input.products || []).map(p => p.name).join(", "),
      scannedProducts: input.products || []
    };
  }
  async function handlePdfUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setPdfFileName(file.name);
    setExtracting(true);
    setExtracted(false);
    setExtractError("");
    try {
      const rawText = await extractTextFromPdf(file);
      const { data, fieldsFound } = parseCompanyProfileText(rawText);
      const foundCount = Object.values(fieldsFound).filter(Boolean).length;
      if (foundCount === 0) {
        setExtractError(t.extractNoFields);
        setExtracting(false);
        return;
      }
      setForm(toFormState(data));
      setExtracting(false);
      setExtracted(true);
      if (foundCount < Object.keys(fieldsFound).length) {
        setExtractError(t.extractPartial);
      }
    } catch (err) {
      // Log the real error so a genuine bug (e.g. a pdf.js version
      // mismatch) is visible in the console instead of being masked by
      // the generic "maybe a scanned image" message shown to the user.
      console.error("PDF extraction failed:", err);
      setExtracting(false);
      setExtractError(`${t.extractFailed} [${(err && err.name) || "Error"}: ${(err && err.message) || String(err)}]`);
    }
  }
  function handleCsvImport() {
    setCsvError("");
    try {
      const data = parseCSVInput(csvText);
      setForm(toFormState(data));
      setExtracted(true);
    } catch (err) {
      setCsvError(t.csvParseError);
    }
  }
  function handleCsvFileUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCsvText(String(ev.target?.result || ""));
    reader.readAsText(file);
  }
  function exportAllCSV() {
    const rows = [["Company", "Industry", "Target Market", "Overall Score", "Timeline", "Date"]];
    userAnalyses.forEach(rec => {
      rows.push([rec.input.companyName, t.industries[rec.input.industry], rec.rec.targetMarket, rec.scores[rec.rec.targetMarket].overall, getTimelineLabel(rec.rec.timelineMonths, t), rec.createdAt]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "europe-market-entry-all-analyses.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  // drop damaged/old records so one bad entry can never crash the dashboard or result view
  const userAnalyses = (session && db[session] && Array.isArray(db[session].analyses) ? db[session].analyses : []).filter(r => r && r.input && r.rec && r.scores && r.scores[r.rec.targetMarket]);
  function fillTestData() {
    setForm(toFormState(SAMPLE_PROFILE));
    setInputMethod("manual");
    setCsvError("");
    setExtractError("");
    setExtracted(false);
  }
  function openNewAnalysis() {
    setForm({
      companyName: "",
      industry: "realEstate",
      product: "",
      revenue: "",
      budget: "",
      employees: "",
      certifications: "",
      customerSegments: "",
      salesChannels: "",
      productsText: "",
      scannedProducts: []
    });
    setInputMethod("manual");
    setCsvText("");
    setCsvError("");
    setPdfFileName("");
    setExtracting(false);
    setExtracted(false);
    setView("newAnalysis");
  }

  // Login lives only on the start page: without a valid account session the tool hands over to the hub.
  useEffect(() => {
    if (!backend.enabled || !onHub) return;
    let off = false;
    const id = setTimeout(() => { backend.getUser().then(u => { if (!u && !off) onHub("login"); }).catch(() => {}); }, 400);
    return () => { off = true; clearTimeout(id); };
  }, []);

  // Start option chosen in the hub ("Mit Demodaten testen" / "Eigene Daten hochladen"): consumed once after sign in.
  useEffect(() => {
    if (!session || view !== "dashboard") return;
    let s = "";
    try { s = window.localStorage.getItem("me_start") || ""; window.localStorage.removeItem("me_start"); } catch (e) { /* ignore */ }
    if (s === "testdata" || s === "upload") { openNewAnalysis(); if (s === "testdata") fillTestData(); else setInputMethod("pdf"); }
  }, [session, view]);

  /* ---------------- shared UI bits ---------------- */
  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: `1px solid ${lineColor}`,
    background: dark ? "#07090D" : "#FFFFFF",
    color: ink,
    fontFamily: fontBody,
    fontSize: 14,
    outline: "none"
  };

  /* ---------------- INTRO ---------------- */
  if (showIntro) {
    return <CrystalIntro appName={t.appName} isRTL={isRTL} onDone={() => setShowIntro(false)} />;
  }

  if (!dbLoaded) {
    return <div style={{
      minHeight: "100vh",
      background: bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
        <style>{fontImport}</style>
        <CrystalPhoto size={90} />
      </div>;
  }

  /* ---------------- LANDING ---------------- */
  if (view === "legal") {
    const legalTh = { ink, subtleInk, lineColor, cardBg, accent: palette.gold, fontBody, fontDisplay, isRTL };
    return <div dir={isRTL ? "rtl" : "ltr"} style={{ minHeight: "100vh", background: bg, fontFamily: fontBody }}>
        <style>{fontImport}</style>
        <Header onHub={onHub} session={session} lang={lang} setLang={setLang} dark={dark} setDark={setDark} onLogoClick={() => setView(session ? "dashboard" : "landing")} onLogout={handleLogout} t={t} ink={ink} subtleInk={subtleInk} lineColor={lineColor} fontDisplay={fontDisplay} isRTL={isRTL} />
        <LegalPage hashPrefix="europe/" lang={lang} appName={t.appName} th={legalTh} anchor={legalAnchor} onBack={closeLegal} />
      </div>;
  }

  if (view === "landing") {
    return <div dir={isRTL ? "rtl" : "ltr"} style={{
      minHeight: "100vh",
      background: bg,
      fontFamily: fontBody
    }}>
        <style>{fontImport}</style>
        <Header onHub={onHub} session={session} lang={lang} setLang={setLang} dark={dark} setDark={setDark} onLogoClick={() => setView(session ? "dashboard" : "landing")} onLogout={handleLogout} t={t} ink={ink} subtleInk={subtleInk} lineColor={lineColor} fontDisplay={fontDisplay} isRTL={isRTL} />
        <div className="flex flex-col items-center justify-center text-center px-6" style={{
        minHeight: "82vh",
        position: "relative",
        overflow: "hidden",
        background: dark ? "radial-gradient(circle at 50% 0%, rgba(82,127,184,0.06), transparent 60%)" : "radial-gradient(circle at 50% 0%, rgba(82,127,184,0.10), transparent 55%)"
      }}>
          <div style={{ position: "relative", zIndex: 1 }}>
            <React.Suspense fallback={<CrystalPhoto size={220} />}><HeroObject><CrystalPhoto size={220} /></HeroObject></React.Suspense>
          </div>
          {isRTL && <p style={{
          position: "relative",
          zIndex: 1,
          fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif",
          color: palette.gold,
          fontSize: isRTL ? 30 : 44,
          marginTop: -4,
          marginBottom: 4
        }}>{t.appName}</p>}
          <div style={{
          width: 90,
          height: 1,
          background: palette.gold,
          opacity: 0.5,
          marginBottom: 22,
          position: "relative",
          zIndex: 1
        }} />
          <h1 className="hero-title" style={{
          position: "relative",
          zIndex: 1,
          fontFamily: fontDisplay,
          color: ink,
          fontSize: 30,
          fontWeight: 600,
          maxWidth: 620,
          margin: "0 0 12px",
          lineHeight: 1.25,
          letterSpacing: -0.3
        }}>{t.tagline}</h1>
          <p style={{
          position: "relative",
          zIndex: 1,
          color: subtleInk,
          fontSize: 14.5,
          maxWidth: 480,
          lineHeight: 1.6,
          marginBottom: 30
        }}>{t.heroSubtext}</p>
          <div className="flex gap-3 mt-2" style={{ position: "relative", zIndex: 1 }}>
            <button onClick={() => setView("register")} className="px-9 py-3 rounded-md font-medium transition-transform hover:scale-105" style={{
            background: palette.gold,
            color: palette.navyDeep,
            fontFamily: fontBody,
            boxShadow: "none"
          }}>{t.register}</button>
            <button onClick={() => setView("login")} className="px-9 py-3 rounded-md font-medium transition-transform hover:scale-105" style={{
            border: `1px solid ${palette.gold}`,
            color: ink,
            fontFamily: fontBody,
            background: dark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.6)"
          }}>{t.login}</button>
          </div>
        </div>
        <LandingSections lang={lang} isRTL={isRTL} ink={ink} subtleInk={subtleInk} lineColor={lineColor} cardBg={cardBg} fontDisplay={fontDisplay} fontBody={fontBody} accent={palette.gold} onLegal={openLegal} />
      </div>;
  }

  /* ---------------- LOGIN / REGISTER (same two fields: name + password) ---------------- */
  if (view === "login" || view === "register") {
    const isLogin = view === "login";
    return <div dir={isRTL ? "rtl" : "ltr"} style={{
      minHeight: "100vh",
      background: bg,
      fontFamily: fontBody
    }}>
        <style>{fontImport}</style>
        <Header onHub={onHub} session={session} lang={lang} setLang={setLang} dark={dark} setDark={setDark} onLogoClick={() => setView(session ? "dashboard" : "landing")} onLogout={handleLogout} t={t} ink={ink} subtleInk={subtleInk} lineColor={lineColor} fontDisplay={fontDisplay} isRTL={isRTL} />
        <div className="grid md:grid-cols-2" style={{ minHeight: "88vh" }}>
          {/* left: hero panel */}
          <div className="flex flex-col items-center justify-center text-center px-6 py-16" style={{
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#000000",
          borderInlineEnd: `1px solid ${lineColor}`
        }}>
            <div style={{ position: "relative", zIndex: 1, width: 300, maxWidth: "80%" }}>
              <img src={CRYSTAL_STAR_TEAL} alt="" style={{
              position: "relative",
              width: "100%",
              height: "auto",
              display: "block",
              objectFit: "contain"
            }} />
            </div>
            {isRTL && <p style={{
            position: "relative",
            zIndex: 1,
            fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif",
            color: palette.gold,
            fontSize: 24,
            marginTop: -2
          }}>{t.appName}</p>}
            <div style={{
            width: 70,
            height: 1,
            background: palette.gold,
            opacity: 0.5,
            margin: "12px 0 16px",
            position: "relative",
            zIndex: 1
          }} />
            <p style={{
            position: "relative",
            zIndex: 1,
            color: "#A5A8B2",
            fontSize: 13.5,
            maxWidth: 340,
            lineHeight: 1.6
          }}>{t.heroSubtext}</p>
          </div>

          {/* right: login form panel */}
          <div role="main" className="flex items-center justify-center px-6 py-16">
            <div className="w-full max-w-sm p-8 facet-card" style={{
          background: cardBg,
          border: `1px solid ${lineColor}`,
          boxShadow: dark ? '0 20px 45px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,242,208,0.08), 0 0 40px -18px rgba(124,92,252,0.35)' : '0 12px 30px rgba(10,17,40,0.07)'
        }}>
            <h1 style={{
            fontFamily: fontDisplay,
            color: ink,
            fontSize: 24,
            fontWeight: 600,
            marginBottom: 6
          }}>
              {backend.enabled || isLogin ? t.login : t.register}
            </h1>
            <p style={{ color: subtleInk, fontSize: 12, marginBottom: 20 }}>{backend.enabled ? SBT.loginHint : (isLogin ? t.loginHint : t.registerHint)}</p>
            {backend.enabled ? <div>
                <style>{`.sb-btn{min-height:44px;display:flex;align-items:center;justify-content:center;gap:10px;width:100%;border-radius:6px;font-size:14px;cursor:pointer}.sb-btn:focus-visible,.sb-link:focus-visible,.sb-in:focus-visible{outline:2px solid #fff;outline-offset:2px;box-shadow:0 0 0 4px var(--accent,#C8A96B)}.sb-link{min-height:44px;display:inline-flex;align-items:center;text-decoration:underline;text-underline-offset:3px;cursor:pointer}`}</style>
                <ConsentBox lang={lang} th={{ ink, subtleInk, lineColor, cardBg, accent: palette.gold, fontBody, fontDisplay, isRTL }} checked={consent} onChange={v => { setConsent(v); if (v) setConsentErr(""); }} onOpenLegal={() => openLegal("datenschutz")} error={consentErr} />
                {authError && <p role="alert" className="text-xs mb-3" style={{ color: palette.coral, lineHeight: 1.6 }}>{authError}</p>}
                {authNotice && <p role="status" className="text-xs mb-3" style={{ color: palette.gold, lineHeight: 1.6 }}>{authNotice}</p>}
                <button type="button" data-testid="tool-google" className="sb-btn font-medium" onClick={() => sbSocial("google")} style={{ background: palette.gold, color: "#0B0D12", fontFamily: fontBody, marginTop: 12 }}>{SOCIAL_ICONS.google}<span>{SBT.cont} Google</span></button>
              </div> : <form onSubmit={e => { syncAuthDom(e.currentTarget); (isLogin ? handleLogin : handleRegister)(e); }}>
              <Field label={t.name} subtleInk={subtleInk} fontBody={fontBody}>
                  <div className="relative">
                    
                    <input style={{
                  ...inputStyle,
                  paddingLeft: isRTL ? 12 : 34,
                  paddingRight: isRTL ? 34 : 12
                }} name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} value={authForm.name} onChange={e => setAuthForm({
                  ...authForm,
                  name: e.target.value
                })} />
                  </div>
                </Field>
              <Field label={t.password} subtleInk={subtleInk} fontBody={fontBody}>
                <div className="relative">
                  
                  <input type="password" style={{
                  ...inputStyle,
                  paddingLeft: isRTL ? 12 : 34,
                  paddingRight: isRTL ? 34 : 12
                }} name="password" autoComplete={isLogin ? "current-password" : "new-password"} value={authForm.password} onChange={e => setAuthForm({
                  ...authForm,
                  password: e.target.value
                })} />
                </div>
              </Field>
              <div className="flex items-center justify-between mb-4" style={{ marginTop: -4 }}>
                <label className="flex items-center gap-2" style={{ cursor: "pointer" }}>
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ accentColor: palette.gold, width: 14, height: 14 }} />
                  <span style={{ color: subtleInk, fontSize: 12 }}>{t.rememberMe}</span>
                </label>
                {isLogin && <span style={{ color: subtleInk, fontSize: 12, opacity: 0.6, textDecoration: "underline", cursor: "default" }} title={t.forgotPasswordNote}>{t.forgotPassword}</span>}
              </div>
              {authError && <p className="text-xs mb-3" style={{ color: palette.coral, lineHeight: 1.6 }}>{authError}</p>}
              {authNotice && <p className="text-xs mb-3" style={{ color: palette.gold, lineHeight: 1.6 }}>{authNotice}</p>}
              {lastStorageErrorDetail && <p className="text-xs mb-3" style={{
              color: palette.coral,
              opacity: 0.7,
              fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif",
              fontSize: 10
            }}>{lastStorageErrorDetail}</p>}
              {!isLogin && <ConsentBox lang={lang} th={{ ink, subtleInk, lineColor, cardBg, accent: palette.gold, fontBody, fontDisplay, isRTL }} checked={consent} onChange={v => { setConsent(v); if (v) setConsentErr(""); }} onOpenLegal={() => openLegal("datenschutz")} error={consentErr} />}
                <button type="submit" disabled={authSubmitting} className="w-full py-2.5 rounded-md font-medium mt-2" style={{
              background: palette.gold,
              color: palette.navyDeep,
              fontFamily: fontBody,
              opacity: authSubmitting ? 0.6 : 1,
              cursor: authSubmitting ? "wait" : "pointer"
            }}>
                {authSubmitting ? "..." : (isLogin ? t.login : t.register)}
              </button>
            </form>}
            <p className="text-center text-xs mt-5" style={{
            color: subtleInk
          }}>
              {isLogin ? t.noAccount : t.haveAccount}{" "}
              <button onClick={() => {
              setAuthError("");
              setView(isLogin ? "register" : "login");
            }} style={{
              color: palette.gold,
              fontWeight: 600
            }}>
                {isLogin ? t.switchToRegister : t.switchToLogin}
              </button>
            </p>
            {!backend.enabled && <p className="text-center mt-4">
              <button type="button" onClick={resetLocalAccounts} style={{ color: resetArmed ? palette.coral : subtleInk, fontSize: 11, opacity: resetArmed ? 1 : 0.7, textDecoration: "underline", textUnderlineOffset: 3 }}>{resetArmed ? AUTH_TEXT[lang].resetSure : AUTH_TEXT[lang].reset}</button>
            </p>}
            </div>
          </div>
        </div>
      </div>;
  }

  /* ---------------- DASHBOARD ---------------- */
  if (view === "dashboard") {
    return <div dir={isRTL ? "rtl" : "ltr"} style={{
      minHeight: "100vh",
      background: bg,
      fontFamily: fontBody
    }}>
        <style>{fontImport}</style>
        <Header onHub={onHub} session={session} lang={lang} setLang={setLang} dark={dark} setDark={setDark} onLogoClick={() => setView(session ? "dashboard" : "landing")} onLogout={handleLogout} t={t} ink={ink} subtleInk={subtleInk} lineColor={lineColor} fontDisplay={fontDisplay} isRTL={isRTL} />
        <div role="main" className="max-w-3xl mx-auto px-6 py-10">
          {backend.enabled && sbUser && <><style>{`.sb-link{min-height:44px;display:inline-flex;align-items:center;text-decoration:underline;text-underline-offset:3px;cursor:pointer}.sb-link:focus-visible{outline:2px solid #fff;outline-offset:2px;box-shadow:0 0 0 4px var(--accent,#C8A96B)}`}</style><div className="flex items-center justify-end gap-4 mb-4 flex-wrap" style={{ fontSize: 13, color: subtleInk }}>
            <span>{SBT.account}: {sbUser.email}</span>

          </div></>}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
            <h1 style={{
            fontFamily: fontDisplay,
            color: ink,
            fontSize: 26,
            fontWeight: 600
          }}>{t.yourAnalyses}</h1>
            <div className="flex items-center gap-2">
              {userAnalyses.length > 0 && <>
                  <button onClick={() => setView("overview")} className="flex items-center gap-2 px-4 py-2.5 rounded-md font-medium text-sm" style={{
                border: `1px solid ${lineColor}`,
                color: ink
              }}>
                    {t.overviewBtn}
                  </button>
                  <button onClick={exportAllCSV} className="flex items-center gap-2 px-4 py-2.5 rounded-md font-medium text-sm" style={{
                border: `1px solid ${lineColor}`,
                color: ink
              }}>
                    {t.exportAllBtn}
                  </button>
                </>}
              <button onClick={openNewAnalysis} className="flex items-center gap-2 px-5 py-2.5 rounded-md font-medium" style={{
              background: palette.gold,
              color: palette.navyDeep,
              boxShadow: '0 8px 22px rgba(34,242,208,0.45)'
            }}>
                {t.newAnalysis}
              </button>
            </div>
          </div>
          {userAnalyses.length === 0 ? <div className="text-center py-20 facet-card" style={{
          border: `1px dashed ${lineColor}`
        }}>
              <p style={{
            color: subtleInk
          }}>{t.noAnalyses}</p>
            </div> : <div className="grid gap-3">
              {userAnalyses.map(rec => <div key={rec.id} role="button" tabIndex={0} onClick={() => {
            setActiveResult(rec);
            setView("result");
          }} onKeyDown={e => {
            if (e.key === "Enter") {
              setActiveResult(rec);
              setView("result");
            }
          }} className="flex items-center justify-between p-5 facet-card-sm text-left transition-transform hover:scale-[1.01] cursor-pointer" style={{
            background: cardBg,
            border: `1px solid ${lineColor}`,
            boxShadow: dark ? '0 20px 45px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,242,208,0.08), 0 0 40px -18px rgba(124,92,252,0.35)' : '0 12px 30px rgba(10,17,40,0.07)'
          }}>
                  <div>
                    <p style={{
                color: ink,
                fontWeight: 600,
                fontFamily: fontDisplay
              }}>{rec.input.companyName || "n/a"}</p>
                    <p style={{
                color: subtleInk,
                fontSize: 12
              }}>{t.industries[rec.input.industry]} · {rec.createdAt}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={e => {
                e.stopPropagation();
                openThreeMonthReview(rec);
              }} className="px-3 py-1.5 rounded-md text-xs font-medium" style={{
                border: `1px solid ${lineColor}`,
                color: subtleInk
              }}>
                      {rec.threeMonthReview ? t.threeMonthReviewDoneBtn : t.threeMonthReviewBtn}
                    </button>
                    <span style={{
                fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif",
                color: palette.gold,
                fontWeight: 600
              }}>
                      {rec.rec.targetMarket} · {rec.scores[rec.rec.targetMarket].overall}
                    </span>
                  </div>
                </div>)}
            </div>}
          <DataCenter lang={lang} th={{ ink, subtleInk, lineColor, cardBg, accent: palette.gold, fontBody, fontDisplay, isRTL }} demo={!backend.enabled} armed={deleteArmed} notice={dcNotice} onExport={exportMyData} onDelete={backend.enabled ? sbDelete : localDeleteAccount} onLegal={() => openLegal("")} />
        </div>
      </div>;
  }

  /* ---------------- NEW ANALYSIS ---------------- */
  if (view === "newAnalysis") {
    return <div dir={isRTL ? "rtl" : "ltr"} style={{
      minHeight: "100vh",
      background: bg,
      fontFamily: fontBody
    }}>
        <style>{fontImport}</style>
        <Header onHub={onHub} session={session} lang={lang} setLang={setLang} dark={dark} setDark={setDark} onLogoClick={() => setView(session ? "dashboard" : "landing")} onLogout={handleLogout} t={t} ink={ink} subtleInk={subtleInk} lineColor={lineColor} fontDisplay={fontDisplay} isRTL={isRTL} />
        <div role="main" className="max-w-lg mx-auto px-6 py-10">
          <button onClick={() => setView("dashboard")} className="flex items-center gap-1 text-sm mb-6" style={{
          color: subtleInk
        }}>
            <ChevronLeft size={14} style={{
            transform: isRTL ? "scaleX(-1)" : "none"
          }} /> {t.back}
          </button>
          <h1 style={{
          fontFamily: fontDisplay,
          color: ink,
          fontSize: 24,
          fontWeight: 600,
          marginBottom: 18
        }}>{t.newAnalysis}</h1>

          <button type="button" data-testid="try-testdata" onClick={fillTestData} className="flex items-center gap-2 w-full px-4 py-3 mb-4 rounded-md text-sm font-semibold" style={{
          background: "transparent",
          color: palette.gold,
          border: `1px solid ${palette.gold}`,
          textAlign: isRTL ? "right" : "left"
        }}>
            
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span>{t.tryTest}</span>
              <span style={{ fontSize: 11, fontWeight: 400, color: subtleInk }}>{t.tryTestHint}</span>
            </span>
          </button>

          {/* input method tabs */}
          <div className="flex gap-2 mb-5">
            {[["manual", t.manualTab], ["pdf", t.pdfTab], ["csv", t.csvTab]].map(([key, label]) => <button key={key} onClick={() => {
            setInputMethod(key);
            setExtracted(false);
          }} className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium" style={{
            background: inputMethod === key ? palette.gold : "transparent",
            color: inputMethod === key ? palette.navyDeep : subtleInk,
            border: `1px solid ${inputMethod === key ? palette.gold : lineColor}`
          }}>
                {label}
              </button>)}
          </div>

          {inputMethod === "pdf" && <div className="p-6 facet-card mb-5" style={{
          background: cardBg,
          border: `1px dashed ${lineColor}`
        }}>
              <label className="flex flex-col items-center justify-center gap-2 py-8 cursor-pointer">
                
                <span style={{
              color: ink,
              fontWeight: 600,
              fontSize: 13
            }}>{t.pdfUploadCta}</span>
                <span style={{
              color: subtleInk,
              fontSize: 11,
              textAlign: "center",
              maxWidth: 280
            }}>{t.pdfUploadHint}</span>
                <input type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} />
              </label>
              {extracting && <p className="text-center text-xs mt-2" style={{
            color: palette.gold
          }}>{t.scanningText} ({pdfFileName})</p>}
              {extracted && !extracting && <p className="flex items-center justify-center gap-1.5 text-xs mt-2" style={{
            color: palette.teal
          }}>
                  {t.extractedBadge}
                </p>}
              {extractError && !extracting && <p className="flex items-center justify-center gap-1.5 text-xs mt-2" style={{
            color: "#E0A458"
          }}>
                  {extractError}
                </p>}
              {!extractError && <p className="text-center text-[10px] mt-3" style={{
            color: subtleInk
          }}>{t.demoSimNotice}</p>}
            </div>}

          {inputMethod === "csv" && <div className="p-6 facet-card mb-5" style={{
          background: cardBg,
          border: `1px solid ${lineColor}`
        }}>
              <Field label={t.csvImportLabel} subtleInk={subtleInk} fontBody={fontBody}>
                <textarea rows={3} dir="ltr" style={{
              ...inputStyle,
              fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif",
              fontSize: 11.5,
              textAlign: "left"
            }} placeholder={t.csvPlaceholder} value={csvText} onChange={e => setCsvText(e.target.value)} />
              </Field>
              <div className="flex items-center gap-2 mb-2">
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs cursor-pointer" style={{
              border: `1px solid ${lineColor}`,
              color: subtleInk
            }}>
                  {t.csvFileLbl}
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvFileUpload} />
                </label>
                <button type="button" onClick={handleCsvImport} className="px-4 py-1.5 rounded-md text-xs font-medium" style={{
              background: palette.gold,
              color: palette.navyDeep
            }}>{t.csvParseBtn}</button>
              </div>
              <p className="text-[10px]" style={{
            color: subtleInk
          }}>{t.csvTemplateHint}</p>
              {csvError && <p className="text-xs mt-2" style={{
            color: palette.coral
          }}>{csvError}</p>}
              {extracted && !csvError && <p className="flex items-center gap-1.5 text-xs mt-2" style={{
            color: palette.teal
          }}>
                  {t.extractedBadge}
                </p>}
            </div>}

          <form onSubmit={handleAnalyze} className="p-7 facet-card" style={{
          background: cardBg,
          border: `1px solid ${lineColor}`,
          boxShadow: dark ? '0 20px 45px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,242,208,0.08), 0 0 40px -18px rgba(124,92,252,0.35)' : '0 12px 30px rgba(10,17,40,0.07)'
        }}>
            <Field label={t.companyName} subtleInk={subtleInk} fontBody={fontBody}>
              <input required style={inputStyle} value={form.companyName} onChange={e => setForm({
              ...form,
              companyName: e.target.value
            })} />
            </Field>
            <Field label={t.industry} subtleInk={subtleInk} fontBody={fontBody}>
              <select style={inputStyle} value={form.industry} onChange={e => setForm({
              ...form,
              industry: e.target.value
            })}>
                {Object.entries(t.industries).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label={t.product} subtleInk={subtleInk} fontBody={fontBody}>
              <input style={inputStyle} value={form.product} onChange={e => setForm({
              ...form,
              product: e.target.value
            })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t.revenue} subtleInk={subtleInk} fontBody={fontBody}>
                <input required type="number" step="0.1" style={inputStyle} value={form.revenue} onChange={e => setForm({
                ...form,
                revenue: e.target.value
              })} />
              </Field>
              <Field label={t.budget} subtleInk={subtleInk} fontBody={fontBody}>
                <input required type="number" step="0.1" style={inputStyle} value={form.budget} onChange={e => setForm({
                ...form,
                budget: e.target.value
              })} />
              </Field>
            </div>
            <Field label={t.employees} subtleInk={subtleInk} fontBody={fontBody}>
              <input type="number" step="1" min="0" style={inputStyle} value={form.employees} onChange={e => setForm({
              ...form,
              employees: e.target.value
            })} />
            </Field>
            <Field label={t.certifications} subtleInk={subtleInk} fontBody={fontBody}>
              <input style={inputStyle} value={form.certifications} onChange={e => setForm({
              ...form,
              certifications: e.target.value
            })} />
            </Field>
            <Field label={t.customerSegments} subtleInk={subtleInk} fontBody={fontBody}>
              <input style={inputStyle} value={form.customerSegments} onChange={e => setForm({
              ...form,
              customerSegments: e.target.value
            })} />
            </Field>
            <Field label={t.salesChannels} subtleInk={subtleInk} fontBody={fontBody}>
              <input style={inputStyle} value={form.salesChannels} onChange={e => setForm({
              ...form,
              salesChannels: e.target.value
            })} />
            </Field>
            <Field label={t.productsText} subtleInk={subtleInk} fontBody={fontBody}>
              <input style={inputStyle} value={form.productsText} onChange={e => setForm({
              ...form,
              productsText: e.target.value
            })} />
            </Field>
            <button type="submit" className="w-full py-2.5 rounded-md font-medium mt-3" style={{
            background: palette.gold,
            color: palette.navyDeep,
            boxShadow: '0 8px 22px rgba(34,242,208,0.45)'
          }}>
              {t.analyze}
            </button>
          </form>
        </div>
      </div>;
  }

  /* ---------------- RESULT ---------------- */
  if (view === "result" && activeResult) {
    const rec = activeResult;
    const factorKeys = [["market", t.marketAttractiveness], ["competition", t.competition], ["regulatory", t.regulatoryComplexity], ["partner", t.partnerAvailability], ["investment", t.investmentPotential]];
    const targetOverall = rec.scores[rec.rec.targetMarket].overall;
    const intelTh = { cardBg, lineColor, ink, subtleInk, accent: palette.gold, pos: palette.teal, neg: palette.coral, fontDisplay, dark };
    const intelData = { COUNTRY_FUNDAMENTALS, REGULATORY_CHECK, COMPETITOR_ANALYSIS, MARKET_OPPORTUNITY };
    const intelLabels = factorKeys.map(f => f[1]);
    const intelParts = rec.parts || {};
    const intelA = analyze(rec, t, lang, intelData, intelLabels);
    const intelSim = budget => {
      const sc = computeScores({ industry: rec.input.industry, revenue: rec.input.revenue, employees: rec.input.employees, certifications: rec.input.certifications, customerSegments: rec.input.customerSegments, salesChannels: rec.input.salesChannels, products: rec.input.products, budget });
      const r2 = buildRecommendation(sc, rec.input.industry);
      let be = null; try { be = buildFinancialModel({ ...rec.input, revenue: Number(rec.input.revenue), budget }, sc[r2.targetMarket].overall).breakEvenYear; } catch (e) { /* model unavailable */ }
      return { target: r2.targetMarket, overall: sc[r2.targetMarket].overall, breakEven: be, timeline: r2.timelineMonths, strategy: r2.entryStrategy };
    };
    const intelBE = (() => { try { return buildFinancialModel({ ...rec.input, revenue: Number(rec.input.revenue), budget: Number(rec.input.budget) }, targetOverall).breakEvenYear || t.planNoBreakEven; } catch (e) { return "n/a"; } })();
    const detailedSteps = buildDetailedSteps(rec.rec, Number(rec.input.budget));
    const finModel = buildFinancialModel({
      ...rec.input,
      revenue: Number(rec.input.revenue),
      budget: Number(rec.input.budget)
    }, targetOverall);
    const entryPlanDisplay = getEntryPlanDisplay(rec.rec, lang);
    const stepsIndexed = detailedSteps.map((step, idx) => ({ step, idx }));
    const phaseSteps = selPhase ? stepsIndexed.filter(x => x.step.phase === selPhase) : stepsIndexed;
    const visibleSteps = selPhase || showAllSteps ? phaseSteps : phaseSteps.slice(0, 5);
const renderCountryDetail = (country, s) => {
                  const dims = factorKeys.map(([k, label]) => [k, label, s[k]]);
                  const sorted = [...dims].sort((a, b) => b[2] - a[2]);
                  const all = Object.values(rec.scores);
                  const rank = all.filter(x => x.overall > s.overall).length + 1;
                  const tgt = rec.scores[rec.rec.targetMarket];
                  return <div className="mt-3 p-3 rounded-md" style={{ border: `1px solid ${lineColor}`, background: dark ? "#1A140D" : palette.parchment }}>
                    <p style={{ color: ink, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{t.infoRank} {rank} {t.infoTotal} {all.length} · {t.infoStrongest}: {sorted[0][1]} ({sorted[0][2]}) · {t.infoWeakest}: {sorted[sorted.length - 1][1]} ({sorted[sorted.length - 1][2]})</p>
                    {dims.map(([k, label, v]) => <div key={k} className="flex items-center gap-3" style={{ marginBottom: 5 }}>
                      <span style={{ color: subtleInk, fontSize: 11.5, flex: "0 0 38%" }}>{label}</span>
                      <div style={{ flex: 1, height: 5, borderRadius: 3, background: lineColor }}><div style={{ width: `${v}%`, height: "100%", borderRadius: 3, background: country === rec.rec.targetMarket ? palette.gold : palette.teal }} /></div>
                      <span style={{ color: ink, fontSize: 11.5, width: 28, textAlign: "end" }}>{Math.round(v)}</span>
                      {country !== rec.rec.targetMarket && <span style={{ color: v - tgt[k] >= 0 ? palette.teal : palette.coral, fontSize: 10.5, width: 34, textAlign: "end" }} dir="ltr">{v - tgt[k] >= 0 ? "+" : ""}{Math.round(v - tgt[k])}</span>}
                    </div>)}
                    {country !== rec.rec.targetMarket && <p style={{ color: subtleInk, fontSize: 10.5, marginTop: 4 }}>± {t.infoVsTarget} ({rec.rec.targetMarket})</p>}
                  </div>;
};
    const toggleSel = (kind, id) => setChartSel(v => v && v.kind === kind && v.id === id ? null : { kind, id });
    const pickCountry = d => { const c = d && [d.country, d.payload && d.payload.country, d.name, d.value, d.dataKey].find(x => x && rec.scores[x]); if (c) toggleSel("country", c); };
    const chartBox = { background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", border: `1px solid ${lineColor}` };
    const hintLine = <p style={{ color: subtleInk, fontSize: 10.5, marginTop: 6 }}>{t.chartHint}</p>;
    const countryPanel = chartSel && chartSel.kind === "country" && rec.scores[chartSel.id] ? <div data-testid="chart-detail" style={{ marginTop: 8 }}>
      <div className="flex items-center justify-between"><p style={{ color: palette.gold, fontWeight: 700, fontSize: 13 }}>{chartSel.id} · {rec.scores[chartSel.id].overall}/100</p><button type="button" onClick={() => setChartSel(null)} style={{ color: subtleInk, fontSize: 11 }}>{t.chClose}</button></div>
      {renderCountryDetail(chartSel.id, rec.scores[chartSel.id])}
    </div> : null;
    const catPanel = chartSel && chartSel.kind === "cat" ? (() => {
      const cb = finModel.costBreakdown.find(c => c.category === chartSel.id); if (!cb) return null;
      const tot = finModel.costBreakdown.reduce((x, c) => x + c.amount, 0) || 1;
      const sts = detailedSteps.filter(x => x.category === chartSel.id);
      return <div data-testid="chart-detail" className="p-3 rounded-md" style={{ ...chartBox, marginTop: 8 }}>
        <div className="flex items-center justify-between"><p style={{ color: palette.gold, fontWeight: 700, fontSize: 13 }}>{t[chartSel.id]} · {cb.amount} {t.costEurLabel}</p><button type="button" onClick={() => setChartSel(null)} style={{ color: subtleInk, fontSize: 11 }}>{t.chClose}</button></div>
        <p style={{ color: subtleInk, fontSize: 11.5, margin: "4px 0 8px" }}>{t.chShare}: {Math.round(cb.amount / tot * 100)}%</p>
        <p style={{ color: ink, fontSize: 11.5, fontWeight: 600, marginBottom: 4 }}>{t.chSteps}</p>
        {sts.map(x => <div key={x.key} className="flex items-center justify-between" style={{ fontSize: 11.5, padding: "3px 0", borderTop: `1px solid ${lineColor}` }}><span style={{ color: ink }}>{t.steps_[x.key]}</span><span style={{ color: subtleInk }}>{t.weekLabel} {x.startWeek + 1} {RANGE[lang]} {x.startWeek + x.durationWeeks} · {x.costEurM} {t.costEurLabel}</span></div>)}
      </div>;
    })() : null;
    const yearPanel = chartSel && chartSel.kind === "year" ? (() => {
      const y = finModel.projection.find(p => p.year === chartSel.id); if (!y) return null;
      const net = Math.round((y.cumRevenue - y.cumCost) * 100) / 100;
      return <div data-testid="chart-detail" className="p-3 rounded-md" style={{ ...chartBox, marginTop: 8 }}>
        <div className="flex items-center justify-between"><p style={{ color: palette.gold, fontWeight: 700, fontSize: 13 }}>{y.year}</p><button type="button" onClick={() => setChartSel(null)} style={{ color: subtleInk, fontSize: 11 }}>{t.chClose}</button></div>
        <p style={{ color: ink, fontSize: 11.5, marginTop: 4 }}>{t.chCost}: {Math.round(y.cumCost * 100) / 100} {t.costEurLabel} · {t.chRev}: {Math.round(y.cumRevenue * 100) / 100} {t.costEurLabel}</p>
        <p style={{ color: net >= 0 ? palette.teal : palette.coral, fontSize: 11.5, fontWeight: 600 }}>{t.chNet}: {net >= 0 ? "+" : ""}{net} {t.costEurLabel} · {net >= 0 ? t.chBE : t.chNoBE}</p>
      </div>;
    })() : null;
    const sensData = computeBudgetSensitivity({ ...rec.input, revenue: Number(rec.input.revenue), budget: Number(rec.input.budget) }, rec.rec.targetMarket);
    const sensPanel = chartSel && chartSel.kind === "sens" ? (() => {
      const row = sensData.find(r => String(r.budget) === String(chartSel.id)); if (!row) return null;
      const cur = sensData.find(r => Number(r.budget) === Number(rec.input.budget));
      const d = cur ? Math.round((row.overallScore - cur.overallScore) * 10) / 10 : null;
      return <div data-testid="chart-detail" className="p-3 rounded-md" style={{ ...chartBox, marginTop: 8 }}>
        <div className="flex items-center justify-between"><p style={{ color: palette.gold, fontWeight: 700, fontSize: 13 }}>{row.budget} {t.costEurLabel}: {row.overallScore}/100</p><button type="button" onClick={() => setChartSel(null)} style={{ color: subtleInk, fontSize: 11 }}>{t.chClose}</button></div>
        <p style={{ color: subtleInk, fontSize: 11.5, marginTop: 4 }}>{t.chScoreAt}: {row.overallScore}{d !== null && <> · <span dir="ltr" style={{ color: d >= 0 ? palette.teal : palette.coral }}>{d >= 0 ? "+" : ""}{d}</span> {t.chVsNow}</>}</p>
      </div>;
    })() : null;
    const chartTick = {
      fill: subtleInk,
      fontSize: 10,
      fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif"
    };
    const catColors = {
      catStrategy: palette.slate,
      catLegal: palette.teal,
      catFinance: palette.gold,
      catRegulatory: palette.coral,
      catPersonnel: "#7C9CBF",
      catCommercial: palette.goldSoft
    };
    return <div dir={isRTL ? "rtl" : "ltr"} style={{
      minHeight: "100vh",
      background: bg,
      fontFamily: fontBody
    }}>
        <style>{fontImport}</style>
        <style>{`
          @media print {
            .no-print { display: none !important; }
            html, body, #root, #root > div { background: #fff !important; min-height: 0 !important; }
            body.printing-report #root > div { color: #111 !important; }
            .print-area { color: #111 !important; background: #fff !important; }
            body.printing-report .print-area { display: none !important; }
            .print-doc { display: none !important; }
            body.printing-report .print-doc[data-print-mode="${printMode}"] { display: block !important; }
          }
        `}</style>
        <MemoDoc A={intelA} rec={rec} lang={lang} factorLabels={intelLabels} data={intelData} t={t} breakEven={intelBE} timeline={getTimelineLabel(rec.rec.timelineMonths, t)} company={rec.input.companyName} dateLabel={new Date().toLocaleDateString(lang)} font="'Inter','Noto Sans Arabic',system-ui,sans-serif" />
        <PlanReportDoc rec={rec} t={t} lang={lang} entryPlanDisplay={entryPlanDisplay} detailedSteps={detailedSteps} finModel={finModel} factorKeys={factorKeys} />
        <div className="no-print">
          <Header onHub={onHub} session={session} lang={lang} setLang={setLang} dark={dark} setDark={setDark} onLogoClick={() => setView(session ? "dashboard" : "landing")} onLogout={handleLogout} t={t} ink={ink} subtleInk={subtleInk} lineColor={lineColor} fontDisplay={fontDisplay} isRTL={isRTL} />
        </div>
        <div role="main" className="max-w-3xl mx-auto px-6 py-10 print-area">
          <button onClick={() => setView("dashboard")} className="flex items-center gap-1 text-sm mb-6 no-print" style={{
          color: subtleInk
        }}>
            <ChevronLeft size={14} style={{
            transform: isRTL ? "scaleX(-1)" : "none"
          }} /> {t.dashboard}
          </button>

          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <h1 style={{
            fontFamily: fontDisplay,
            color: ink,
            fontSize: 26,
            fontWeight: 600
          }}>{rec.input.companyName}</h1>
            <div className="flex items-center gap-2 no-print"> 
              <button onClick={() => setPrintMode("summary")} className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium" style={{
              border: `1px solid ${palette.gold}`,
              background: palette.gold,
              color: "#14100A"
            }}>
                {t.exportPdfSummary}
              </button>
              <button onClick={() => setPrintMode("memo")} data-testid="memo-btn" className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium" style={{ border: `1px solid ${palette.gold}`, color: palette.gold }}>
                {intelA.L.memoBtn}
              </button>
            </div>
          </div>
          <p className="no-print" style={{ color: subtleInk, fontSize: 12, margin: "0 0 6px" }}>{lang === "ar" ? "يفتح الزر نافذة الطباعة في المتصفح، اختر هناك «حفظ كملف PDF»." : lang === "en" ? "The buttons open your browser\u2019s print dialog: choose \u201cSave as PDF\u201d there." : "Die Knöpfe öffnen den Druckdialog des Browsers: dort „Als PDF speichern“ wählen."}</p>
          <p style={{
          color: subtleInk,
          marginBottom: 28
        }}>{t.industries[rec.input.industry]} · {t.resultTitle}</p>


          <KpiStrip A={intelA} rec={rec} th={intelTh} lang={lang} t={t} getTimelineLabel={getTimelineLabel} breakEven={intelBE} />
          <SourcesJump lang={lang} th={intelTh} />
          <WhyPanel A={intelA} th={intelTh} lang={lang} />
          <div className="mb-4"><StatusLegend lang={lang} th={intelTh} /></div>
          {/* comparison */}
          <div className="p-6 facet-card mb-8" style={{
          background: cardBg,
          border: `1px solid ${lineColor}`,
          boxShadow: dark ? '0 20px 45px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,242,208,0.08), 0 0 40px -18px rgba(124,92,252,0.35)' : '0 12px 30px rgba(10,17,40,0.07)'
        }}>
            <h3 style={{
            fontFamily: fontDisplay,
            color: ink,
            fontSize: 17,
            fontWeight: 600,
            marginBottom: 18
          }}>{t.comparisonTitle}</h3>
          <SourceNote kind="score" lang={lang} th={intelTh} />
            {Object.entries(rec.scores).map(([country, s]) => <div key={country} className="mb-5">
                <button type="button" aria-expanded={openCountry === country} onClick={() => setOpenCountry(v => v === country ? null : country)} className="flex items-center justify-between mb-1.5 w-full text-start" style={{ cursor: "pointer" }}>
                  <span style={{
                color: ink,
                fontWeight: country === rec.rec.targetMarket ? 700 : 500,
                fontFamily: fontBody
              }}>
                    {country} {country === rec.rec.targetMarket && <span style={{
                  color: palette.gold
                }}>■</span>}
                  </span>
                  <span style={{
                fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif",
                color: palette.gold,
                fontSize: 13
              }}>{s.overall}/100 {openCountry === country ? <ChevronUp size={13} style={{ verticalAlign: "-2px" }} /> : <ChevronDown size={13} style={{ verticalAlign: "-2px" }} />}</span>
                </button>
                <div style={{
              height: 8,
              borderRadius: 4,
              background: lineColor,
              overflow: "hidden"
            }}>
                  <div style={{
                width: `${s.overall}%`,
                height: "100%",
                background: country === rec.rec.targetMarket ? palette.gold : palette.teal,
                borderRadius: 4
              }} />
                </div>
                {openCountry === country && renderCountryDetail(country, s)}
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {factorKeys.map(([k, label]) => <div key={k} className="text-center">
                      <div style={{
                  fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif",
                  fontSize: 11,
                  color: subtleInk
                }}>{s[k]}</div>
                      <div style={{
                  fontSize: 9,
                  color: subtleInk,
                  marginTop: 2
                }}>{label}</div>
                    </div>)}
                </div>
              </div>)}
          </div>

          {/* radar chart: all 5 factors, all 3 countries at once */}
          <div className="p-6 facet-card mb-8" style={{
          background: cardBg,
          border: `1px solid ${lineColor}`,
          boxShadow: dark ? '0 20px 45px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,242,208,0.08), 0 0 40px -18px rgba(124,92,252,0.35)' : '0 12px 30px rgba(10,17,40,0.07)'
        }}>
            <h3 style={{
            fontFamily: fontDisplay,
            color: ink,
            fontSize: 16,
            fontWeight: 600
          }}>{t.radarTitle}</h3>
            <p style={{
            color: subtleInk,
            fontSize: 10.5,
            marginBottom: 10
          }}>{t.radarSubtitle}</p>
            <div style={{
            width: "100%",
            height: 280
          }}>
              <ResponsiveContainer>
                <RadarChart data={factorKeys.map(([k, label]) => {
                const row = { factor: label };
                Object.keys(rec.scores).forEach(c => { row[c] = rec.scores[c][k]; });
                return row;
              })}>
                  <PolarGrid stroke={lineColor} />
                  <PolarAngleAxis dataKey="factor" tick={{
                  fill: subtleInk,
                  fontSize: 10,
                  fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif"
                }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{
                  fill: subtleInk,
                  fontSize: 9
                }} />
                  {Object.keys(rec.scores).map((c, i) => {
                  const radarColors = [palette.gold, palette.teal, palette.coral, "#7C9CBF", "#B98CE0", "#6BAF8C"];
                  const col = radarColors[i % radarColors.length];
                  return <Radar key={c} name={c} dataKey={c} stroke={col} fill={col} fillOpacity={0.14} strokeWidth={2} onClick={() => pickCountry({ country: c })} style={{ cursor: "pointer" }} />;
                })}
                  <Legend onClick={pickCountry} wrapperStyle={{
                  fontSize: 10.5,
                  color: subtleInk
                }} />
                  <Tooltip contentStyle={{
                  background: cardBg,
                  border: `1px solid ${lineColor}`,
                  borderRadius: 8,
                  fontSize: 11
                }} itemStyle={{ color: ink }} labelStyle={{ color: ink }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            {hintLine}{countryPanel}
          </div>

          {/* strategic positioning matrix */}
          <div className="p-6 facet-card mb-8" style={{
          background: cardBg,
          border: `1px solid ${lineColor}`,
          boxShadow: dark ? '0 20px 45px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,242,208,0.08), 0 0 40px -18px rgba(124,92,252,0.35)' : '0 12px 30px rgba(10,17,40,0.07)'
        }}>
            <h3 style={{
            fontFamily: fontDisplay,
            color: ink,
            fontSize: 16,
            fontWeight: 600
          }}>{t.positioningTitle}</h3>
            <p style={{
            color: subtleInk,
            fontSize: 10.5,
            marginBottom: 10
          }}>{t.positioningSubtitle}</p>
            <div style={{
            width: "100%",
            height: 280
          }}>
              <ResponsiveContainer>
                <ScatterChart margin={{
                top: 10,
                right: 20,
                bottom: 20,
                left: 0
              }}>
                  <CartesianGrid stroke={lineColor} strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="competition" domain={[0, 100]} name={t.positioningXLabel} tick={{
                  fill: subtleInk,
                  fontSize: 10
                }} axisLine={{
                  stroke: lineColor
                }} tickLine={false} label={{
                  value: t.positioningXLabel,
                  position: "insideBottom",
                  offset: -10,
                  fill: subtleInk,
                  fontSize: 10.5
                }} />
                  <YAxis type="number" dataKey="market" domain={[0, 100]} name={t.positioningYLabel} tick={{
                  fill: subtleInk,
                  fontSize: 10
                }} axisLine={{
                  stroke: lineColor
                }} tickLine={false} label={{
                  value: t.positioningYLabel,
                  angle: -90,
                  position: "insideLeft",
                  fill: subtleInk,
                  fontSize: 10.5
                }} />
                  <ZAxis type="number" dataKey="investment" range={[200, 900]} name={t.investmentPotential} />
                  <Tooltip cursor={{
                  strokeDasharray: "3 3"
                }} contentStyle={{
                  background: cardBg,
                  border: `1px solid ${lineColor}`,
                  borderRadius: 8,
                  fontSize: 11
                }} itemStyle={{ color: ink }} labelStyle={{ color: ink }} />
                  <Scatter onClick={pickCountry} cursor="pointer" data={Object.entries(rec.scores).map(([country, s]) => ({
                  country,
                  competition: s.competition,
                  market: s.market,
                  investment: s.investment
                }))}>
                    {Object.entries(rec.scores).map(([country], i) => <Cell key={i} fill={country === rec.rec.targetMarket ? palette.gold : palette.teal} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-1">
              {Object.keys(rec.scores).map(c => <span key={c} role="button" tabIndex={0} onClick={() => pickCountry({ country: c })} onKeyDown={e => { if (e.key === "Enter") pickCountry({ country: c }); }} className="flex items-center gap-1.5" style={{ cursor: "pointer", fontWeight: chartSel && chartSel.id === c ? 700 : 400,
              fontSize: 10.5,
              color: subtleInk
            }}>
                  <span style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                background: c === rec.rec.targetMarket ? palette.gold : palette.teal,
                display: "inline-block"
              }} />
                  {c}
                </span>)}
            </div>
            {hintLine}{countryPanel}
          </div>

          {/* executive score ring — premium crystalline "at a glance" score */}
          <div className="p-6 facet-card flex flex-col items-center" style={{
          background: cardBg,
          border: `1px solid ${palette.gold}`
        }}>
            <h3 style={{
            fontFamily: fontDisplay,
            color: ink,
            fontSize: 15,
            fontWeight: 600,
            marginBottom: 16,
            alignSelf: "flex-start"
          }}>{t.executiveScoreTitle}</h3>
            <ExecutiveScoreRing
              score={rec.scores[rec.rec.targetMarket]?.overall}
              label={t.executiveScoreLabel}
              sublabel={rec.rec.targetMarket}
              gold={palette.gold}
              teal={palette.teal}
            />
            <ScoreBreakdownBars
              scores={rec.scores[rec.rec.targetMarket]}
              labels={t.scoreDims}
              gold={palette.gold}
              teal={palette.teal}
            />
            {(() => {
            const dimScores = rec.scores[rec.rec.targetMarket];
            const bestKey = Object.entries(dimScores).filter(([k]) => k !== "overall").sort((a, b) => b[1] - a[1])[0][0];
            const topRiskKey = rec.rec.risks[0];
            const nextStepKey = rec.rec.steps[0];
            return <div className="w-full mt-5 pt-4" style={{
              borderTop: `1px solid ${palette.gold}33`,
              display: "flex",
              flexDirection: "column",
              gap: 8
            }}>
                <div className="flex items-start gap-2">
                  
                  <p style={{
                  fontSize: 11.5,
                  color: ink
                }}><span style={{ color: subtleInk }}>{t.scoreDims[bestKey]}: </span>{Math.round(dimScores[bestKey])}</p>
                </div>
                <div className="flex items-start gap-2">
                  
                  <p style={{
                  fontSize: 11.5,
                  color: ink
                }}>{t.riskText[topRiskKey]}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span aria-hidden="true" style={{ width: 8, height: 1, background: palette.teal, marginTop: 9, flexShrink: 0 }} />
                  <p style={{
                  fontSize: 11.5,
                  color: ink
                }}>{t.nextStepText[nextStepKey]}</p>
                </div>
              </div>;
          })()}
          </div>

          {/* recommendation */}
          <div className="p-6 facet-card" style={{
          background: cardBg,
          border: `1px solid ${palette.gold}`
        }}>
            <h3 style={{
            fontFamily: fontDisplay,
            color: ink,
            fontSize: 17,
            fontWeight: 600,
            marginBottom: 18
          }}>{t.recommendation}</h3>
            <div className="grid grid-cols-2 gap-5 mb-5">
              <div>
                <p className="text-xs" style={{
                color: subtleInk
              }}>{t.targetMarket}</p>
                <p style={{
                color: palette.gold,
                fontWeight: 700,
                fontFamily: fontDisplay,
                fontSize: 18
              }}>{rec.rec.targetMarket}</p>
              </div>
              <div>
                <p className="text-xs" style={{
                color: subtleInk
              }}>{t.timeline}</p>
                <p style={{
                color: ink,
                fontWeight: 600
              }}>{getTimelineLabel(rec.rec.timelineMonths, t)}</p>
              </div>
              <div>
                <p className="text-xs" style={{
                color: subtleInk
              }}>{t.entryStrategy}</p>
                <p style={{
                color: ink
              }}>{t.strategy[rec.rec.entryStrategy]}</p>
              </div>
              <div>
                <p className="text-xs" style={{
                color: subtleInk
              }}>{t.prioritySector}</p>
                <p style={{
                color: ink
              }}>{t.industries[rec.rec.prioritySector]}</p>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-xs flex items-center gap-1.5 mb-1.5" style={{
              color: subtleInk
            }}>{t.mainRisks}</p>
              {rec.rec.risks.map((k, i) => {
                const sc = rec.scores[rec.rec.targetMarket];
                const avg = Math.round(Object.values(rec.scores).reduce((a, x) => a + x[k], 0) / Object.keys(rec.scores).length);
                return <div key={i} style={{ marginBottom: 4 }}>
                  <button type="button" aria-expanded={openRisk === k} onClick={() => setOpenRisk(v => v === k ? null : k)} className="text-start" style={{ color: ink, fontSize: 13, cursor: "pointer", minHeight: 28 }}>· {t.riskText[k]} <span style={{ color: subtleInk }}>{openRisk === k ? <ChevronUp size={13} style={{ verticalAlign: "-2px" }} /> : <ChevronDown size={13} style={{ verticalAlign: "-2px" }} />}</span></button>
                  {openRisk === k && <p style={{ color: subtleInk, fontSize: 12, margin: "2px 0 4px", paddingInlineStart: 12 }}>{t.infoTrigger}: {t.scoreDims[k]} {Math.round(sc[k])}/100 · {t.infoAvg}: {avg}/100</p>}
                </div>;
              })}
            </div>
            <div className="mb-4">
              <p className="text-xs flex items-center gap-1.5 mb-1.5" style={{
              color: subtleInk
            }}>{t.potentialPartners}</p>
              <p style={{
              color: ink,
              fontSize: 13
            }}>{t.partnersText[rec.rec.prioritySector] || ""}</p>
            </div>
            <div>
              <p className="text-xs flex items-center gap-1.5 mb-1.5" style={{
              color: subtleInk
            }}>{t.nextSteps}</p>
              {rec.rec.steps.map((k, i) => {
                const ph = entryPlanDisplay[i];
                const phSteps = ph ? detailedSteps.filter(x => x.phase === ph.key) : [];
                return <div key={i} style={{ marginBottom: 4 }}>
                  <button type="button" aria-expanded={openNext === k} onClick={() => setOpenNext(v => v === k ? null : k)} className="text-start" style={{ color: ink, fontSize: 13, cursor: "pointer", minHeight: 28 }}>{i + 1}. {t.nextStepText[k]} <span style={{ color: subtleInk }}>{openNext === k ? <ChevronUp size={13} style={{ verticalAlign: "-2px" }} /> : <ChevronDown size={13} style={{ verticalAlign: "-2px" }} />}</span></button>
                  {openNext === k && ph && <div style={{ color: subtleInk, fontSize: 12, margin: "2px 0 4px", paddingInlineStart: 12 }}>
                    <p>{t.sumPhase}: {ph.label} · {t.month} {ph.startMonth} {RANGE[lang]} {ph.endMonth}</p>
                    {phSteps.map(x => <p key={x.key}>· {t.steps_[x.key]} ({t.weekLabel} {x.startWeek} {RANGE[lang]} {x.startWeek + x.durationWeeks})</p>)}
                  </div>}
                </div>;
              })}
            </div>
          </div>

          {/* entry plan visualization */}
          <div className="p-6 facet-card mt-6" style={{
          background: cardBg,
          border: `1px solid ${lineColor}`,
          boxShadow: dark ? '0 20px 45px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,242,208,0.08), 0 0 40px -18px rgba(124,92,252,0.35)' : '0 12px 30px rgba(10,17,40,0.07)'
        }}>
            <h3 className="flex items-center gap-2" style={{
            fontFamily: fontDisplay,
            color: ink,
            fontSize: 17,
            fontWeight: 600,
            marginBottom: 20
          }}>
              {t.entryPlanTitle}
            </h3>
            <p className="no-print" style={{ color: subtleInk, fontSize: 10.5, marginTop: -12, marginBottom: 14 }}>{t.planClickHint}</p>
            <div style={{
            position: "relative",
            height: 6,
            borderRadius: 3,
            background: lineColor,
            marginBottom: 8
          }}>
              {entryPlanDisplay.map((phase, i) => <div key={i} role="button" aria-label={phase.label} onClick={() => setSelPhase(p => p === phase.key ? null : phase.key)} style={{
              cursor: "pointer",
              position: "absolute",
              top: 0,
              height: "100%",
              [isRTL ? "right" : "left"]: `${phase.startPct}%`,
              width: `${phase.endPct - phase.startPct}%`,
              background: [palette.teal, palette.gold, palette.coral, palette.slate][i % 4],
              borderRadius: 3,
              opacity: selPhase && selPhase !== phase.key ? 0.25 : 0.95
            }} />)}
            </div>
            <div className="grid grid-cols-4 gap-3 mt-4">
              {entryPlanDisplay.map((phase, i) => <button type="button" key={i} aria-pressed={selPhase === phase.key} onClick={() => setSelPhase(p => p === phase.key ? null : phase.key)} className="text-start" style={{
              cursor: "pointer",
              padding: 6,
              borderRadius: 8,
              border: `1px solid ${selPhase === phase.key ? palette.gold : "transparent"}`,
              opacity: selPhase && selPhase !== phase.key ? 0.45 : 1,
              transition: "opacity .2s, border-color .2s"
            }}>
                  <div style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                background: [palette.teal, palette.gold, palette.coral, palette.slate][i % 4],
                marginBottom: 6
              }} />
                  <p style={{
                color: ink,
                fontSize: 11.5,
                fontWeight: 600,
                lineHeight: 1.3
              }}>{phase.label}</p>
                  <p style={{
                color: subtleInk,
                fontSize: 10,
                fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif",
                marginTop: 2
              }}>
                    {t.month} {phase.startMonth} {RANGE[lang]} {phase.endMonth}
                  </p>
                </button>)}
            </div>
          </div>

          {/* cultural intelligence */}
          <div className="p-6 facet-card mt-6" style={{
          background: cardBg,
          border: `1px solid ${lineColor}`
        }}>
            <h3 className="flex items-center gap-2" style={{
            fontFamily: fontDisplay,
            color: ink,
            fontSize: 15,
            fontWeight: 600,
            marginBottom: 14
          }}>
              {t.culturalIntelTitle}
            </h3>
            <ul style={{ margin: 0, paddingInlineStart: 18 }}>
              {(CULTURAL_INTEL[lang]?.[rec.rec.targetMarket] || CULTURAL_INTEL.en[rec.rec.targetMarket] || []).map((point, i) => <li key={i} style={{
              color: subtleInk,
              fontSize: 12.5,
              lineHeight: 1.6,
              marginBottom: 6
            }}>{point}</li>)}
            </ul>
            <p style={{ color: subtleInk, fontSize: 10, marginTop: 10, opacity: 0.7 }}>{t.culturalIntelNote}</p>
          </div>

          <ScoringSuite region="europe" rec={rec} A={intelA} th={intelTh} lang={lang} factorLabels={intelLabels} parts={intelParts} />
          <ScenarioCompare rec={rec} A={intelA} th={intelTh} lang={lang} t={t} factorLabels={intelLabels} data={intelData} simulate={intelSim} getTimelineLabel={getTimelineLabel} />
          <CompetitorBlock rec={rec} A={intelA} th={intelTh} lang={lang} data={intelData} t={t} />
          {/* sources */}
          <div id="ei-sources" className="p-6 facet-card mt-6" style={{
          background: cardBg,
          border: `1px solid ${lineColor}`
        }}>
            <h3 className="flex items-center gap-2" style={{
            fontFamily: fontDisplay,
            color: ink,
            fontSize: 15,
            fontWeight: 600,
            marginBottom: 14
          }}>
              {t.sourcesTitle}
            </h3>
            <div className="flex flex-col gap-2">
              {(SOURCES[rec.rec.targetMarket] || []).map((src, i) => <div key={i} className="flex items-center justify-between"><span style={{ color: ink, fontSize: 12.5 }}>{src.name}</span><a href={`https://${src.url}`} target="_blank" rel="noopener noreferrer" style={{ color: palette.gold, fontSize: 11, textDecoration: "underline" }}>{src.url}</a></div>)}
              <SourceLine source={[COUNTRY_FUNDAMENTALS[rec.rec.targetMarket]?.source, REGULATORY_CHECK[rec.rec.targetMarket]?.source, MARKET_OPPORTUNITY[rec.rec.targetMarket]?.source].filter(Boolean).join(" · ")} lang={lang} th={intelTh} />
            </div>
          </div>

          {/* detailed step-by-step roadmap */}
          <div className="p-6 facet-card mt-6" style={{
          background: cardBg,
          border: `1px solid ${lineColor}`,
          boxShadow: dark ? '0 20px 45px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,242,208,0.08), 0 0 40px -18px rgba(124,92,252,0.35)' : '0 12px 30px rgba(10,17,40,0.07)'
        }}>
            <h3 className="flex items-center gap-2" style={{
            fontFamily: fontDisplay,
            color: ink,
            fontSize: 17,
            fontWeight: 600,
            marginBottom: 18
          }}>
              {t.detailedRoadmapTitle}
              {selPhase && <button type="button" onClick={() => setSelPhase(null)} className="text-xs font-medium" style={{ marginInlineStart: "auto", border: `1px solid ${palette.gold}`, borderRadius: 4, padding: "2px 10px", color: ink }}>{t[selPhase]} · {phaseSteps.length} {t.planSteps}</button>}
            </h3>
            <div className="flex flex-col gap-2">
              {visibleSteps.map(({ step, idx }) => {
              const isOpen = openStep === step.key;
              const share = rec.input.budget ? Math.round(step.costEurM / Number(rec.input.budget) * 100) : 0;
              return <div key={step.key} className="rounded-md" style={{
              background: dark ? "#1A140D" : palette.parchment,
              border: `1px solid ${isOpen ? palette.gold : lineColor}`
            }}>
                  <button type="button" aria-expanded={isOpen} onClick={() => setOpenStep(v => v === step.key ? null : step.key)} className="flex items-center justify-between p-3 w-full text-start" style={{ cursor: "pointer" }}>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center rounded-md flex-shrink-0" style={{
                  width: 22,
                  height: 22,
                  background: lineColor,
                  color: ink,
                  fontSize: 10.5,
                  fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif"
                }}>{idx + 1}</div>
                    <div>
                      <p style={{
                    color: ink,
                    fontSize: 12.5,
                    fontWeight: 600
                  }}>{t.steps_[step.key]}</p>
                      <p style={{
                    color: subtleInk,
                    fontSize: 10.5,
                    marginTop: 1
                  }}>{t[step.phase]} · {t[step.category]}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0" style={{
                marginLeft: 10
              }}>
                    <p style={{
                  color: palette.gold,
                  fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif",
                  fontSize: 11.5,
                  fontWeight: 600
                }}>{step.costEurM} {t.costEurLabel}</p>
                    <p style={{
                  color: subtleInk,
                  fontSize: 10
                }}>{t.weekLabel} {step.startWeek} {RANGE[lang]} {step.startWeek + step.durationWeeks}</p>
                  </div>
                  </button>
                  {isOpen && <div className="grid grid-cols-3 gap-3 px-3 pb-3" style={{ borderTop: `1px solid ${lineColor}`, paddingTop: 10 }}>
                    <div><p style={{ color: subtleInk, fontSize: 10 }}>{t.planDuration}</p><p style={{ color: ink, fontSize: 12, fontWeight: 600 }}>{step.durationWeeks} {t.planWeeks}</p></div>
                    <div><p style={{ color: subtleInk, fontSize: 10 }}>{t.weekLabel}</p><p style={{ color: ink, fontSize: 12, fontWeight: 600 }}>{step.startWeek} {RANGE[lang]} {step.startWeek + step.durationWeeks}</p></div>
                    <div><p style={{ color: subtleInk, fontSize: 10 }}>{t.planShare}</p><p style={{ color: ink, fontSize: 12, fontWeight: 600 }}>{share}%</p></div>
                  </div>}
                </div>;
            })}
            </div>
            {!selPhase && detailedSteps.length > 5 && <button onClick={() => setShowAllSteps(v => !v)} className="flex items-center justify-center gap-1.5 w-full mt-3 py-2 rounded-md text-xs font-medium" style={{
            border: `1px solid ${lineColor}`,
            color: subtleInk
          }}>
                {showAllSteps ? <><ChevronUp size={13} /> {t.collapseSteps}</> : <><ChevronDown size={13} /> {t.expandSteps} ({detailedSteps.length})</>}
              </button>}
          </div>

          {/* financial model */}
          <div className="p-6 facet-card mt-6" style={{
          background: cardBg,
          border: `1px solid ${lineColor}`,
          boxShadow: dark ? '0 20px 45px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,242,208,0.08), 0 0 40px -18px rgba(124,92,252,0.35)' : '0 12px 30px rgba(10,17,40,0.07)'
        }}>
            <h3 className="flex items-center gap-2" style={{
            fontFamily: fontDisplay,
            color: ink,
            fontSize: 17,
            fontWeight: 600,
            marginBottom: 4
          }}>
              {t.financialModelTitle}
            </h3>
            <SourceNote kind="fin" lang={lang} th={intelTh} />
            <p style={{
            color: subtleInk,
            fontSize: 10.5,
            marginBottom: 16
          }}>{t.financialDisclaimer}</p>

            <p style={{
            color: ink,
            fontSize: 12.5,
            fontWeight: 600,
            marginBottom: 8
          }}>{t.costBreakdownTitle}</p>
            <div style={{
            width: "100%",
            height: 220
          }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie onClick={d => { const nm = d && (d.name || (d.payload && d.payload.name)); const cb = finModel.costBreakdown.find(c => t[c.category] === nm); if (cb) toggleSel("cat", cb.category); }} cursor="pointer" data={finModel.costBreakdown.map(c => ({
                  name: t[c.category],
                  value: c.amount
                }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={78} innerRadius={40}>
                    {finModel.costBreakdown.map((c, i) => <Cell key={i} fill={catColors[c.category]} />)}
                  </Pie>
                  <Tooltip contentStyle={{
                  background: cardBg,
                  border: `1px solid ${lineColor}`,
                  borderRadius: 8,
                  fontSize: 11
                }} itemStyle={{ color: ink }} labelStyle={{ color: ink }} formatter={value => [`${value}${t.costEurLabel}`, ""]} />
                  <Legend onClick={d => { const cb = finModel.costBreakdown.find(c => t[c.category] === d.value); if (cb) toggleSel("cat", cb.category); }} wrapperStyle={{
                  fontSize: 10.5,
                  color: subtleInk
                }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {catPanel}

            <p style={{
            color: ink,
            fontSize: 12.5,
            fontWeight: 600,
            margin: "18px 0 8px"
          }}>{t.projectionTitle}</p>
            <div style={{
            width: "100%",
            height: 220
          }}>
              <ResponsiveContainer>
                <ComposedChart data={finModel.projection} onClick={st => { if (st && st.activeLabel) toggleSel("year", st.activeLabel); }} style={{ cursor: "pointer" }}>
                  <CartesianGrid stroke={lineColor} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="year" tick={chartTick} axisLine={{
                  stroke: lineColor
                }} tickLine={false} />
                  <YAxis tick={chartTick} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{
                  background: cardBg,
                  border: `1px solid ${lineColor}`,
                  borderRadius: 8,
                  fontSize: 11
                }} itemStyle={{ color: ink }} labelStyle={{ color: ink }} />
                  <Legend wrapperStyle={{
                  fontSize: 10.5,
                  color: subtleInk
                }} />
                  <Bar dataKey="cumCost" name={t.costLabel} fill={palette.coral} radius={[4, 4, 0, 0]} barSize={28} />
                  <Line dataKey="cumRevenue" name={t.revenueLabel} stroke={palette.gold} strokeWidth={2.5} dot={{
                  r: 4,
                  fill: palette.gold
                }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {yearPanel}
            <div className="flex items-center justify-between mt-3 p-3 rounded-md" style={{
            background: dark ? "#10141B" : palette.parchment,
            border: `1px solid ${lineColor}`
          }}>
              <span style={{
              color: subtleInk,
              fontSize: 11.5
            }}>{t.breakEvenNote}</span>
              <span style={{
              color: finModel.breakEvenYear ? palette.teal : palette.coral,
              fontWeight: 700,
              fontSize: 13
            }}>
                {finModel.breakEvenYear || t.noBreakEven}
              </span>
            </div>
          </div>

          {/* budget sensitivity analysis */}
          <div className="p-6 facet-card mt-6" style={{
          background: cardBg,
          border: `1px solid ${lineColor}`,
          boxShadow: dark ? '0 20px 45px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,242,208,0.08), 0 0 40px -18px rgba(124,92,252,0.35)' : '0 12px 30px rgba(10,17,40,0.07)'
        }}>
            <h3 style={{
            fontFamily: fontDisplay,
            color: ink,
            fontSize: 16,
            fontWeight: 600
          }}>{t.sensitivityTitle}</h3>
            <p style={{
            color: subtleInk,
            fontSize: 10.5,
            marginBottom: 10
          }}>{t.sensitivitySubtitle}</p>
            <div style={{
            width: "100%",
            height: 220
          }}>
              <ResponsiveContainer>
                <ComposedChart data={sensData} onClick={st => { if (st && st.activeLabel !== undefined) toggleSel("sens", String(st.activeLabel)); }} style={{ cursor: "pointer" }}>
                  <CartesianGrid stroke={lineColor} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="budget" tick={chartTick} axisLine={{
                  stroke: lineColor
                }} tickLine={false} label={{
                  value: t.sensitivityXLabel,
                  position: "insideBottom",
                  offset: -5,
                  fill: subtleInk,
                  fontSize: 10.5
                }} />
                  <YAxis domain={["dataMin - 3", "dataMax + 3"]} tick={chartTick} axisLine={false} tickLine={false} width={30} label={{
                  value: t.sensitivityYLabel,
                  angle: -90,
                  position: "insideLeft",
                  fill: subtleInk,
                  fontSize: 10.5
                }} />
                  <Tooltip contentStyle={{
                  background: cardBg,
                  border: `1px solid ${lineColor}`,
                  borderRadius: 8,
                  fontSize: 11
                }} itemStyle={{ color: ink }} labelStyle={{ color: ink }} />
                  <ReferenceLine x={Number(rec.input.budget)} stroke={palette.coral} strokeDasharray="4 4" label={{
                  value: t.currentBudgetLabel,
                  fill: palette.coral,
                  fontSize: 9.5,
                  position: "top"
                }} />
                  <Line type="monotone" dataKey="overallScore" name={rec.rec.targetMarket} stroke={palette.gold} strokeWidth={2.5} dot={{
                  r: 4,
                  fill: palette.gold
                }} label={{
                  position: "top",
                  fill: subtleInk,
                  fontSize: 10
                }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {sensPanel}
          </div>

          {/* country fundamentals */}
          <div className="p-6 facet-card mt-6" style={{
          background: cardBg,
          border: `1px solid ${lineColor}`
        }}>
            <h3 className="flex items-center gap-2" style={{
            fontFamily: fontDisplay,
            color: ink,
            fontSize: 15,
            fontWeight: 600,
            marginBottom: 4
          }}>
              {t.countryFundamentalsTitle}
            </h3>
            <p style={{
            color: subtleInk,
            fontSize: 10,
            marginBottom: 14
          }}>
              <SourceLine source={[...new Set(Object.values(COUNTRY_FUNDAMENTALS).map(f => f.source))].join(" · ")} lang={lang} th={{ subtleInk, accent: palette.gold, dark, ink, lineColor }} />
            </p>
            <div style={{
            width: "100%",
            height: 200
          }}>
              <ResponsiveContainer>
                <BarChart data={Object.entries(COUNTRY_FUNDAMENTALS).map(([c, d]) => ({
                country: c,
                population: d.populationMillions
              }))}>
                  <CartesianGrid stroke={lineColor} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="country" tick={chartTick} axisLine={{
                  stroke: lineColor
                }} tickLine={false} />
                  <YAxis tick={chartTick} axisLine={false} tickLine={false} width={36} />
                  <Tooltip contentStyle={{
                  background: cardBg,
                  border: `1px solid ${lineColor}`,
                  borderRadius: 8,
                  fontSize: 11
                }} itemStyle={{ color: ink }} labelStyle={{ color: ink }} />
                  <Legend wrapperStyle={{
                  fontSize: 10.5,
                  color: subtleInk
                }} />
                  <Bar dataKey="population" name={t.populationLabel} fill={palette.teal} radius={[4, 4, 0, 0]} barSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              {Object.entries(COUNTRY_FUNDAMENTALS).map(([c, d]) => <div key={c} className="text-center">
                  <p style={{
                color: ink,
                fontSize: 12,
                fontWeight: 700,
                fontFamily: fontDisplay
              }}>{c}</p>
                  <p style={{
                color: subtleInk,
                fontSize: 9.5,
                marginTop: 4
              }}>{t.gdpPerCapitaLabel}</p>
                  <p style={{
                color: palette.gold,
                fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif",
                fontSize: 11.5
              }}>${d.gdpPerCapitaUsd.toLocaleString()}</p>
                  <p style={{
                color: subtleInk,
                fontSize: 9.5,
                marginTop: 4
              }}>{t.gdpGrowthLabel}</p>
                  <p style={{
                color: d.gdpGrowthPct < 0 ? palette.coral : ink,
                fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif",
                fontSize: 11.5
              }}>{d.gdpGrowthPct > 0 ? "+" : ""}{d.gdpGrowthPct}%</p>
                </div>)}
            </div>

            {/* GDP growth trend: historical + current + forecast, all countries */}
            {(() => {
              const years = Array.from(new Set(Object.values(COUNTRY_FUNDAMENTALS).flatMap(d => d.growthHistory.map(h => h.year)))).sort((a, b) => a - b);
              const trendData = years.map(year => {
                const row = { year };
                Object.entries(COUNTRY_FUNDAMENTALS).forEach(([c, d]) => {
                  const point = d.growthHistory.find(h => h.year === year);
                  row[c] = point ? point.pct : null;
                });
                return row;
              });
              const trendColors = [palette.gold, palette.teal, palette.coral, "#7C9CBF", "#B98CE0", "#6BAF8C"];
              const lastHistYear = Math.max(...Object.values(COUNTRY_FUNDAMENTALS).flatMap(d => d.growthHistory.filter(h => !h.forecast).map(h => h.year)));
              return <div className="mt-6 pt-5" style={{
                borderTop: `1px solid ${lineColor}`
              }}>
                <h4 style={{
                  fontFamily: fontDisplay,
                  color: ink,
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 2
                }}>{t.growthTrendTitle}</h4>
                <p style={{
                  color: subtleInk,
                  fontSize: 10,
                  marginBottom: 10
                }}>{t.growthTrendSubtitle}</p>
                <div style={{
                  width: "100%",
                  height: 220
                }}>
                  <ResponsiveContainer>
                    <ComposedChart data={trendData}>
                      <CartesianGrid stroke={lineColor} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="year" tick={chartTick} axisLine={{
                      stroke: lineColor
                    }} tickLine={false} />
                      <YAxis tick={chartTick} axisLine={false} tickLine={false} width={36} unit="%" />
                      <ReferenceLine y={0} stroke={lineColor} />
                      <ReferenceLine x={lastHistYear} stroke={palette.gold} strokeDasharray="4 4" label={{
                      value: t.forecastLabel,
                      position: "insideTopRight",
                      fill: palette.gold,
                      fontSize: 9
                    }} />
                      <Tooltip contentStyle={{
                      background: cardBg,
                      border: `1px solid ${lineColor}`,
                      borderRadius: 8,
                      fontSize: 11
                    }} itemStyle={{ color: ink }} labelStyle={{ color: ink }} />
                      <Legend wrapperStyle={{
                      fontSize: 10,
                      color: subtleInk
                    }} />
                      {Object.keys(COUNTRY_FUNDAMENTALS).map((c, i) => <Line key={c} type="monotone" dataKey={c} name={c} stroke={trendColors[i % trendColors.length]} strokeWidth={2} dot={{
                      r: 3
                    }} connectNulls />)}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <p style={{
                  fontSize: 9,
                  color: subtleInk,
                  marginTop: 6
                }}>{GROWTH_HISTORY_SOURCE}</p>
              </div>;
            })()}
          </div>

          {/* Market Opportunity — audience, demand drivers, trend per country */}
          <div className="p-6 facet-card mt-6" style={{
          background: cardBg,
          border: `1px solid ${lineColor}`
        }}>
            <h3 className="flex items-center gap-2" style={{
            fontFamily: fontDisplay,
            color: ink,
            fontSize: 15,
            fontWeight: 600,
            marginBottom: 4
          }}>
              {t.marketOpportunityTitle}
            </h3>
            <p style={{
            color: subtleInk,
            fontSize: 10,
            marginBottom: 16
          }}>{t.marketOpportunitySubtitle}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(MARKET_OPPORTUNITY).map(([country, mo]) => <div key={country} className="p-4 facet-card-sm" style={{
              background: bg,
              border: `1px solid ${lineColor}`
            }}>
                  <p style={{
                fontFamily: fontDisplay,
                color: country === rec.rec.targetMarket ? palette.gold : ink,
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 8
              }}>{country} {country === rec.rec.targetMarket && <span style={{ color: palette.gold }}>■</span>}</p>
                  <p style={{ color: subtleInk, fontSize: 9.5, marginBottom: 2 }}>{t.targetAudienceLabel}</p>
                  <p style={{ color: ink, fontSize: 12, marginBottom: 8 }}>{mo.audience}</p>
                  <p style={{ color: subtleInk, fontSize: 9.5, marginBottom: 2 }}>{t.demandDriversLabel}</p>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {mo.drivers.map((d, i) => <li key={i} style={{ color: ink, fontSize: 11.5, marginBottom: 3, display: "flex", gap: 6 }}>
                      <span style={{ color: palette.gold }}>·</span>{d}
                    </li>)}
                  </ul>
                  <p style={{ color: subtleInk, fontSize: 9.5, marginTop: 8, marginBottom: 2 }}>{t.trendLabel}</p>
                  <p style={{ color: ink, fontSize: 11.5 }}>{mo.trend}</p>
                  <SourceLine source={mo.source} lang={lang} th={intelTh} />
                </div>)}
            </div>
          </div>

          {/* Competitor Analysis — real market leaders + market gap note per country */}
          <div className="p-6 facet-card mt-6" style={{
          background: cardBg,
          border: `1px solid ${lineColor}`
        }}>
            <h3 className="flex items-center gap-2" style={{
            fontFamily: fontDisplay,
            color: ink,
            fontSize: 15,
            fontWeight: 600,
            marginBottom: 4
          }}>
              {t.competitorAnalysisTitle}
            </h3>
            <p style={{
            color: subtleInk,
            fontSize: 10,
            marginBottom: 16
          }}>{t.competitorAnalysisSubtitle}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(COMPETITOR_ANALYSIS).map(([country, ca]) => <div key={country} className="p-4 facet-card-sm" style={{
              background: bg,
              border: `1px solid ${lineColor}`
            }}>
                  <p style={{
                fontFamily: fontDisplay,
                color: country === rec.rec.targetMarket ? palette.gold : ink,
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 8
              }}>{country} {country === rec.rec.targetMarket && <span style={{ color: palette.gold }}>■</span>}</p>
                  <p style={{ color: subtleInk, fontSize: 9.5, marginBottom: 2 }}>{t.keyPlayersLabel}</p>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", marginBottom: 8 }}>
                    {ca.players.map((p, i) => <li key={i} style={{ color: ink, fontSize: 11.5, marginBottom: 3, display: "flex", gap: 6 }}>
                      <span style={{ color: palette.gold }}>·</span>{p}
                    </li>)}
                  </ul>
                  <p style={{ color: subtleInk, fontSize: 9.5, marginBottom: 2 }}>{t.marketGapLabel}</p>
                  <p style={{ color: ink, fontSize: 11.5 }}>{ca.gap}</p>
                </div>)}
            </div>
          </div>

          {/* Regulatory Check — corporate tax, VAT, licensing per country */}
          <div className="p-6 facet-card mt-6" style={{
          background: cardBg,
          border: `1px solid ${lineColor}`
        }}>
            <h3 className="flex items-center gap-2" style={{
            fontFamily: fontDisplay,
            color: ink,
            fontSize: 15,
            fontWeight: 600,
            marginBottom: 4
          }}>
              {t.regulatoryCheckTitle}
            </h3>
            <p style={{
            color: subtleInk,
            fontSize: 10,
            marginBottom: 16
          }}>{t.regulatoryCheckSubtitle}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(REGULATORY_CHECK).map(([country, rg]) => <div key={country} className="p-4 facet-card-sm" style={{
              background: bg,
              border: `1px solid ${lineColor}`
            }}>
                  <p style={{
                fontFamily: fontDisplay,
                color: country === rec.rec.targetMarket ? palette.gold : ink,
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 8
              }}>{country} {country === rec.rec.targetMarket && <span style={{ color: palette.gold }}>■</span>}</p>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <p style={{ color: subtleInk, fontSize: 9.5, marginBottom: 2 }}>{t.corporateTaxLabel}</p>
                      <p style={{ color: ink, fontSize: 11.5, fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif" }}>{rg.corporateTax}</p>
                    </div>
                    <div>
                      <p style={{ color: subtleInk, fontSize: 9.5, marginBottom: 2 }}>{t.vatLabel}</p>
                      <p style={{ color: ink, fontSize: 11.5, fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif" }}>{rg.vat}</p>
                    </div>
                  </div>
                  <p style={{ color: subtleInk, fontSize: 9.5, marginBottom: 2 }}>{t.licensingLabel}</p>
                  <p style={{ color: ink, fontSize: 11.5, marginBottom: 8 }}>{rg.licensing}</p>
                  <SourceLine source={rg.source} lang={lang} th={intelTh} />
                </div>)}
            </div>
          </div>

          {/* Germany & DACH section (secondary, below the neutral comparison) */}
          {(() => {
            const deScore = rec.scores.Germany;
            const deFund = COUNTRY_FUNDAMENTALS.Germany;
            const ranked = Object.entries(rec.scores).sort((a, b) => b[1].overall - a[1].overall).map(([c]) => c);
            const deRank = ranked.indexOf("Germany") + 1;
            const isWinner = rec.rec.targetMarket === "Germany";
            const noteText = isWinner ? t.germanyFocusWinner : t.germanyFocusNotWinner.replace("{country}", rec.rec.targetMarket);
            const rankText = t.germanyFocusRank.replace("{rank}", deRank).replace("{total}", ranked.length);
            return <div className="p-6 facet-card mt-6" style={{
              background: cardBg,
              border: `1px solid ${palette.gold}`,
              boxShadow: dark ? '0 20px 45px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,242,208,0.12), 0 0 40px -18px rgba(124,92,252,0.35)' : '0 12px 30px rgba(10,17,40,0.07)'
            }}>
              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <h3 className="flex items-center gap-2" style={{
                  fontFamily: fontDisplay,
                  color: ink,
                  fontSize: 17,
                  fontWeight: 600
                }}>
                  <span aria-hidden="true">🇩🇪</span> {t.germanyFocusTitle}
                </h3>
                <span style={{
                  fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif",
                  fontSize: 12,
                  color: palette.gold,
                  border: `1px solid ${palette.gold}`,
                  borderRadius: 4,
                  padding: "2px 10px"
                }}>{deScore.overall}/100 · {rankText}</span>
              </div>
              <p style={{ color: palette.gold, fontSize: 10.5, marginBottom: 8, fontWeight: 600 }}>{t.dachSubtitle}</p>
              <p style={{ color: ink, fontSize: 12.5, lineHeight: 1.7, marginBottom: 12 }}>{t.dachBody}</p>
              <p style={{
                color: isWinner ? palette.gold : subtleInk,
                fontSize: 12.5,
                fontWeight: isWinner ? 600 : 400,
                marginBottom: 16
              }}>{noteText}</p>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {factorKeys.map(([k, label]) => <div key={k} className="text-center">
                  <div style={{
                    fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif",
                    fontSize: 13,
                    color: ink,
                    fontWeight: 600
                  }}>{deScore[k]}</div>
                  <div style={{
                    fontSize: 9,
                    color: subtleInk,
                    marginTop: 2
                  }}>{label}</div>
                </div>)}
              </div>
              <div className="grid grid-cols-3 gap-3 pt-3" style={{
                borderTop: `1px solid ${lineColor}`
              }}>
                <div className="text-center">
                  <p style={{
                    color: subtleInk,
                    fontSize: 9.5
                  }}>{t.populationLabel}</p>
                  <p style={{
                    color: ink,
                    fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif",
                    fontSize: 12
                  }}>{deFund.populationMillions}</p>
                </div>
                <div className="text-center">
                  <p style={{
                    color: subtleInk,
                    fontSize: 9.5
                  }}>{t.gdpPerCapitaLabel}</p>
                  <p style={{
                    color: ink,
                    fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif",
                    fontSize: 12
                  }}>${deFund.gdpPerCapitaUsd.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p style={{
                    color: subtleInk,
                    fontSize: 9.5
                  }}>{t.gdpGrowthLabel}</p>
                  <p style={{
                    color: deFund.gdpGrowthPct < 0 ? palette.coral : ink,
                    fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif",
                    fontSize: 12
                  }}>{deFund.gdpGrowthPct > 0 ? "+" : ""}{deFund.gdpGrowthPct}%</p>
                </div>
              </div>
            </div>;
          })()}
        </div>
      </div>;
  }

  /* ---------------- THREE-MONTH REVIEW ---------------- */
  if (view === "threeMonthReview" && activeResult) {
    const rec = activeResult;
    const review = rec.threeMonthReview;
    return <div dir={isRTL ? "rtl" : "ltr"} style={{
      minHeight: "100vh",
      background: bg,
      fontFamily: fontBody
    }}>
        <style>{fontImport}</style>
        <Header onHub={onHub} session={session} lang={lang} setLang={setLang} dark={dark} setDark={setDark} onLogoClick={() => setView(session ? "dashboard" : "landing")} onLogout={handleLogout} t={t} ink={ink} subtleInk={subtleInk} lineColor={lineColor} fontDisplay={fontDisplay} isRTL={isRTL} />
        <div role="main" className="max-w-3xl mx-auto px-6 py-10">
          <button onClick={() => setView("dashboard")} className="flex items-center gap-1 text-sm mb-6" style={{
          color: subtleInk
        }}>
            <ChevronLeft size={14} style={{
            transform: isRTL ? "scaleX(-1)" : "none"
          }} /> {t.dashboard}
          </button>
          <h1 style={{
          fontFamily: fontDisplay,
          color: ink,
          fontSize: 24,
          fontWeight: 600,
          marginBottom: 4
        }}>{t.threeMonthReviewTitle}</h1>
          <p style={{
          color: subtleInk,
          fontSize: 13,
          marginBottom: 24
        }}>{rec.input.companyName} · {rec.rec.targetMarket}</p>

          {!review ? <form onSubmit={handleSubmitReview} className="facet-card p-6" style={{
          background: cardBg,
          border: `1px solid ${lineColor}`
        }}>
              <p style={{ color: subtleInk, fontSize: 12.5, marginBottom: 20, lineHeight: 1.6 }}>{t.threeMonthReviewIntro}</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label={t.fieldRevenueActual} subtleInk={subtleInk} fontBody={fontBody}>
                  <input required type="number" step="0.01" style={inputStyle} value={reviewForm.revenueActual} onChange={e => setReviewForm({ ...reviewForm, revenueActual: e.target.value })} />
                </Field>
                <Field label={t.fieldCostsActual} subtleInk={subtleInk} fontBody={fontBody}>
                  <input required type="number" step="0.01" style={inputStyle} value={reviewForm.costsActual} onChange={e => setReviewForm({ ...reviewForm, costsActual: e.target.value })} />
                </Field>
                <Field label={t.fieldNewCustomers} subtleInk={subtleInk} fontBody={fontBody}>
                  <input type="number" step="1" min="0" style={inputStyle} value={reviewForm.newCustomers} onChange={e => setReviewForm({ ...reviewForm, newCustomers: e.target.value })} />
                </Field>
                <Field label={t.fieldLeads} subtleInk={subtleInk} fontBody={fontBody}>
                  <input type="number" step="1" min="0" style={inputStyle} value={reviewForm.leads} onChange={e => setReviewForm({ ...reviewForm, leads: e.target.value })} />
                </Field>
                <Field label={t.fieldConversionActual} subtleInk={subtleInk} fontBody={fontBody}>
                  <input type="number" step="0.1" min="0" style={inputStyle} value={reviewForm.conversionActual} onChange={e => setReviewForm({ ...reviewForm, conversionActual: e.target.value })} />
                </Field>
              </div>
              <Field label={t.fieldReviewNotes} subtleInk={subtleInk} fontBody={fontBody}>
                <textarea rows={3} style={{ ...inputStyle, height: "auto" }} value={reviewForm.notes} onChange={e => setReviewForm({ ...reviewForm, notes: e.target.value })} />
              </Field>
              <button type="submit" className="w-full py-2.5 rounded-md font-medium mt-2" style={{
              background: palette.gold,
              color: palette.navyDeep
            }}>
                {t.submitReview}
              </button>
            </form> : <>
              <div className="flex justify-end mb-3">
                <button onClick={() => { setActiveResult({ ...rec, threeMonthReview: null }); }} className="text-xs px-3 py-1.5 rounded-md font-medium" style={{ border: `1px solid ${lineColor}`, color: subtleInk }}>
                  {t.editReview}
                </button>
              </div>
              <div className="facet-card p-6 mb-5" style={{ background: cardBg, border: `1px solid ${lineColor}` }}>
                <h3 style={{ fontFamily: fontDisplay, color: ink, fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{t.planVsRealityTitle}</h3>
                <table style={{ width: "100%", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ color: subtleInk, fontSize: 11 }}>
                      <th style={{ textAlign: "start", fontWeight: 500 }}></th>
                      <th style={{ textAlign: "end", fontWeight: 500 }}>{t.expectedLabel}</th>
                      <th style={{ textAlign: "end", fontWeight: 500 }}>{t.actualLabel}</th>
                      <th style={{ textAlign: "end", fontWeight: 500 }}>{t.deviationLabel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ color: ink }}>
                      <td style={{ padding: "4px 0" }}>{t.revenue}</td>
                      <td style={{ textAlign: "end" }}>{review.expectedRevenue}</td>
                      <td style={{ textAlign: "end" }}>{review.revenueActual}</td>
                      <td style={{ textAlign: "end", color: review.revenueStatus === "aboveExpectation" ? palette.teal : review.revenueStatus === "belowExpectation" ? palette.coral : subtleInk }}>{review.revenueDeviationPct > 0 ? "+" : ""}{review.revenueDeviationPct}%</td>
                    </tr>
                    <tr style={{ color: ink }}>
                      <td style={{ padding: "4px 0" }}>{t.budget}</td>
                      <td style={{ textAlign: "end" }}>{review.expectedCosts}</td>
                      <td style={{ textAlign: "end" }}>{review.costsActual}</td>
                      <td style={{ textAlign: "end", color: review.costsStatus === "aboveExpectation" ? palette.coral : review.costsStatus === "belowExpectation" ? palette.teal : subtleInk }}>{review.costsDeviationPct > 0 ? "+" : ""}{review.costsDeviationPct}%</td>
                    </tr>
                  </tbody>
                </table>
                <p style={{ fontSize: 12, color: subtleInk, marginTop: 14 }}>{t.fieldNewCustomers}: {review.newCustomers} · {t.fieldLeads}: {review.leads} · {t.fieldConversionActual}: {review.conversionActual}%</p>
              </div>

              <div className="facet-card p-6 mb-5" style={{ background: cardBg, border: `1px solid ${lineColor}` }}>
                <h3 style={{ fontFamily: fontDisplay, color: ink, fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{t.observationsTitle}</h3>
                <ul style={{ fontSize: 12.5, color: ink, paddingInlineStart: 18, lineHeight: 1.7 }}>
                  {review.observations.map((k, i) => <li key={i}>{t[k]}</li>)}
                </ul>
                {review.notes && <p style={{ fontSize: 12, color: subtleInk, marginTop: 10, fontStyle: "italic" }}>"{review.notes}"</p>}
              </div>

              <div className="facet-card p-6" style={{ background: cardBg, border: `1px solid ${lineColor}` }}>
                <h3 style={{ fontFamily: fontDisplay, color: ink, fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{t.recalibratedForecastTitle}</h3>
                <p style={{ fontSize: 11.5, color: subtleInk, marginBottom: 12, lineHeight: 1.6 }}>{t.recalibratedForecastNote}</p>
                <table style={{ width: "100%", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ color: subtleInk, fontSize: 11 }}>
                      <th style={{ textAlign: "start", fontWeight: 500 }}>{"Jahr"}</th>
                      <th style={{ textAlign: "end", fontWeight: 500 }}>{t.revenue}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {review.recalibratedProjection.map((row, i) => <tr key={i} style={{ color: ink }}>
                      <td style={{ padding: "3px 0" }}>{row.year}</td>
                      <td style={{ textAlign: "end" }}>{row.revenue}</td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
            </>}
        </div>
      </div>;
  }

  /* ---------------- OVERVIEW ---------------- */
  if (view === "overview") {
    const total = userAnalyses.length;
    const avgScore = total ? Math.round(userAnalyses.reduce((sum, r) => sum + r.scores[r.rec.targetMarket].overall, 0) / total) : 0;
    const marketCounts = {};
    userAnalyses.forEach(r => {
      marketCounts[r.rec.targetMarket] = (marketCounts[r.rec.targetMarket] || 0) + 1;
    });
    const topMarket = Object.keys(marketCounts).length ? Object.entries(marketCounts).sort((a, b) => b[1] - a[1])[0][0] : "n/a";
    return <div dir={isRTL ? "rtl" : "ltr"} style={{
      minHeight: "100vh",
      background: bg,
      fontFamily: fontBody
    }}>
        <style>{fontImport}</style>
        <Header onHub={onHub} session={session} lang={lang} setLang={setLang} dark={dark} setDark={setDark} onLogoClick={() => setView(session ? "dashboard" : "landing")} onLogout={handleLogout} t={t} ink={ink} subtleInk={subtleInk} lineColor={lineColor} fontDisplay={fontDisplay} isRTL={isRTL} />
        <div role="main" className="max-w-4xl mx-auto px-6 py-10">
          <button onClick={() => setView("dashboard")} className="flex items-center gap-1 text-sm mb-6" style={{
          color: subtleInk
        }}>
            <ChevronLeft size={14} style={{
            transform: isRTL ? "scaleX(-1)" : "none"
          }} /> {t.dashboard}
          </button>
          <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
            <h1 style={{
            fontFamily: fontDisplay,
            color: ink,
            fontSize: 26,
            fontWeight: 600
          }}>{t.overviewTitle}</h1>
            <button onClick={exportAllCSV} className="flex items-center gap-2 px-4 py-2.5 rounded-md font-medium text-sm" style={{
            border: `1px solid ${palette.gold}`,
            color: ink
          }}>
              {t.exportAllBtn}
            </button>
          </div>

          {/* stat cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[[t.totalAnalysesLabel, total], [t.avgScoreLabel, `${avgScore}/100`], [t.topMarketLabel, topMarket]].map(([label, val], i) => <div key={i} className="p-5 facet-card-sm" style={{
            background: cardBg,
            border: `1px solid ${lineColor}`
          }}>
                <p style={{
              color: subtleInk,
              fontSize: 11
            }}>{label}</p>
                <p style={{
              color: palette.gold,
              fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif",
              fontSize: 26,
              fontWeight: 600,
              marginTop: 4
            }}>{val}</p>
              </div>)}
          </div>

          {/* comparison bars across all analyses */}
          <div className="p-6 facet-card mb-6" style={{
          background: cardBg,
          border: `1px solid ${lineColor}`
        }}>
            <h3 style={{
            fontFamily: fontDisplay,
            color: ink,
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 16
          }}>{t.comparisonTitle}</h3>
            {userAnalyses.map(r => <div key={r.id} className="mb-4">
                <div className="flex justify-between mb-1" style={{
              fontSize: 12.5
            }}>
                  <span style={{
                color: ink
              }}>{r.input.companyName} <span style={{
                  color: subtleInk
                }}>· {r.rec.targetMarket}</span></span>
                  <span style={{
                color: palette.gold,
                fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif"
              }}>{r.scores[r.rec.targetMarket].overall}</span>
                </div>
                <div style={{
              height: 6,
              borderRadius: 3,
              background: lineColor,
              overflow: "hidden"
            }}>
                  <div style={{
                width: `${r.scores[r.rec.targetMarket].overall}%`,
                height: "100%",
                background: palette.gold,
                borderRadius: 3
              }} />
                </div>
              </div>)}
          </div>

          {/* table */}
          <div className="rounded-md overflow-hidden" style={{
          border: `1px solid ${lineColor}`
        }}>
            <table className="w-full" style={{
            borderCollapse: "collapse"
          }}>
              <thead>
                <tr style={{
                background: cardBg
              }}>
                  {[t.colCompany, t.colIndustry, t.colMarket, t.colScore, t.colDate].map((h, i) => <th key={i} style={{
                  textAlign: isRTL ? "right" : "left",
                  padding: "10px 14px",
                  fontSize: 11,
                  color: subtleInk,
                  borderBottom: `1px solid ${lineColor}`
                }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {userAnalyses.map(r => <tr key={r.id} onClick={() => {
                setActiveResult(r);
                setView("result");
              }} className="cursor-pointer" style={{
                background: bg
              }}>
                    <td style={{
                  padding: "10px 14px",
                  fontSize: 13,
                  color: ink,
                  borderBottom: `1px solid ${lineColor}`
                }}>{r.input.companyName}</td>
                    <td style={{
                  padding: "10px 14px",
                  fontSize: 13,
                  color: subtleInk,
                  borderBottom: `1px solid ${lineColor}`
                }}>{t.industries[r.input.industry]}</td>
                    <td style={{
                  padding: "10px 14px",
                  fontSize: 13,
                  color: ink,
                  borderBottom: `1px solid ${lineColor}`
                }}>{r.rec.targetMarket}</td>
                    <td style={{
                  padding: "10px 14px",
                  fontSize: 13,
                  color: palette.gold,
                  fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif",
                  borderBottom: `1px solid ${lineColor}`
                }}>{r.scores[r.rec.targetMarket].overall}</td>
                    <td style={{
                  padding: "10px 14px",
                  fontSize: 13,
                  color: subtleInk,
                  borderBottom: `1px solid ${lineColor}`
                }}>{r.createdAt}</td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>;
  }
  return null;
}
export default GCCMarketEntryApp;