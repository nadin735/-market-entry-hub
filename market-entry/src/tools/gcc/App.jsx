import React, { useState, useEffect, useRef } from "react";
import * as backend from "../../backend.js";
import { readTheme, writeTheme } from "../../theme.js";
const RANGE = { de: "bis", en: "to", ar: "إلى" };
import ThemeToggle from "../../ThemeToggle.jsx";
import { COIN } from "../../hubAssets.js";
import { GCC_I18N, localizeIntel } from "../../dataI18n.js";
import { KpiStrip, WhyPanel, ScoringSuite, ScenarioCompare, MemoDoc, CompetitorBlock, IntelPrint, SourceLine, StatusLegend, analyze } from "../../intel.jsx";
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
  UAE: {
    market: 88,
    competition: 72,
    regulatory: 80,
    partner: 91,
    investment: 85,
    overall: 0
  },
  Saudi: {
    market: 94,
    competition: 61,
    regulatory: 65,
    partner: 76,
    investment: 95,
    overall: 0
  },
  Qatar: {
    market: 75,
    competition: 80,
    regulatory: 70,
    partner: 65,
    investment: 78,
    overall: 0
  },
  Kuwait: {
    market: 68,
    competition: 74,
    regulatory: 63,
    partner: 60,
    investment: 66,
    overall: 0
  },
  Bahrain: {
    market: 58,
    competition: 78,
    regulatory: 82,
    partner: 70,
    investment: 62,
    overall: 0
  },
  Oman: {
    market: 62,
    competition: 82,
    regulatory: 68,
    partner: 58,
    investment: 60,
    overall: 0
  }
};
const SECTOR_FIT = {
  medtech: {
    UAE: {
      market: 4,
      partner: 2
    },
    Saudi: {
      market: 6,
      regulatory: -4
    },
    Qatar: {
      market: 1
    },
    Kuwait: {
      market: 2
    },
    Bahrain: {
      market: 3,
      regulatory: 2
    },
    Oman: {
      market: 1
    }
  },
  manufacturing: {
    UAE: {
      market: 1
    },
    Saudi: {
      market: 5,
      partner: 3
    },
    Qatar: {
      market: 2
    },
    Kuwait: {
      market: 1
    },
    Bahrain: {
      market: 2
    },
    Oman: {
      market: 4,
      partner: 2
    }
  },
  software: {
    UAE: {
      market: 5,
      partner: 4,
      regulatory: 3
    },
    Saudi: {
      market: 3,
      regulatory: -2
    },
    Qatar: {
      market: 3,
      partner: 2
    },
    Kuwait: {
      market: 2
    },
    Bahrain: {
      market: 4,
      regulatory: 3
    },
    Oman: {
      market: 1
    }
  },
  consumer: {
    UAE: {
      market: 6,
      competition: -5
    },
    Saudi: {
      market: 4
    },
    Qatar: {
      market: 2
    },
    Kuwait: {
      market: 3
    },
    Bahrain: {
      market: 2
    },
    Oman: {
      market: 1
    }
  },
  energy: {
    UAE: {
      market: 2
    },
    Saudi: {
      market: 7,
      investment: 3
    },
    Qatar: {
      market: 4,
      investment: 2
    },
    Kuwait: {
      market: 6,
      investment: 3
    },
    Bahrain: {
      market: 1
    },
    Oman: {
      market: 5,
      investment: 2
    }
  },
  finance: {
    UAE: {
      market: 5,
      regulatory: 2
    },
    Saudi: {
      market: 2,
      regulatory: -5
    },
    Qatar: {
      market: 3,
      regulatory: 1
    },
    Kuwait: {
      market: 2
    },
    Bahrain: {
      market: 5,
      regulatory: 4
    },
    Oman: {
      market: 1
    }
  },
  logistics: {
    UAE: {
      market: 5,
      partner: 3
    },
    Saudi: {
      market: 4
    },
    Qatar: {
      market: 1,
      partner: -2
    },
    Kuwait: {
      market: 2
    },
    Bahrain: {
      market: 2,
      partner: 1
    },
    Oman: {
      market: 4,
      partner: 2
    }
  }
};

/** World Bank (current US$, 2024). Verified Aug 2026 — see README methodology note on Kuwait's 2024 contraction (oil-production cuts). */
const COUNTRY_FUNDAMENTALS = {
  UAE: {
    gdpBillionUsd: 552.3,
    populationMillions: 11.3,
    gdpPerCapitaUsd: 50274,
    gdpGrowthPct: 4.0,
    source: "World Bank / FCSC, 2024",
    growthHistory: [{ year: 2019, pct: 1.7 }, { year: 2020, pct: -6.1 }, { year: 2024, pct: 4.0 }, { year: 2025, pct: 4.8, forecast: true }, { year: 2026, pct: 5.0, forecast: true }]
  },
  Saudi: {
    gdpBillionUsd: 1239.8,
    populationMillions: 35.3,
    gdpPerCapitaUsd: 35122,
    gdpGrowthPct: 2.0,
    source: "World Bank / GASTAT, 2024",
    growthHistory: [{ year: 2019, pct: 0.3 }, { year: 2020, pct: -4.1 }, { year: 2024, pct: 2.0 }, { year: 2025, pct: 4.0, forecast: true }, { year: 2026, pct: 4.5, forecast: true }]
  },
  Qatar: {
    gdpBillionUsd: 219.2,
    populationMillions: 3.05,
    gdpPerCapitaUsd: 76689,
    gdpGrowthPct: 2.4,
    source: "World Bank / PSA, 2024",
    growthHistory: [{ year: 2019, pct: 0.8 }, { year: 2020, pct: -3.7 }, { year: 2024, pct: 2.4 }, { year: 2025, pct: 2.9, forecast: true }, { year: 2026, pct: 6.1, forecast: true }]
  },
  Kuwait: {
    gdpBillionUsd: 160.2,
    populationMillions: 4.85,
    gdpPerCapitaUsd: 33030,
    gdpGrowthPct: -2.7,
    source: "World Bank, 2024 (oil production cuts under OPEC+ quota)",
    growthHistory: [{ year: 2019, pct: 0.4 }, { year: 2020, pct: -5.4 }, { year: 2024, pct: -2.7 }, { year: 2025, pct: 2.7, forecast: true }]
  },
  Bahrain: {
    gdpBillionUsd: 47.1,
    populationMillions: 1.59,
    gdpPerCapitaUsd: 29620,
    gdpGrowthPct: 2.6,
    source: "World Bank, 2024",
    growthHistory: [{ year: 2019, pct: 2.0 }, { year: 2020, pct: -5.1 }, { year: 2024, pct: 2.6 }, { year: 2025, pct: 3.1, forecast: true }, { year: 2026, pct: 3.3, forecast: true }]
  },
  Oman: {
    gdpBillionUsd: 107.1,
    populationMillions: 5.28,
    gdpPerCapitaUsd: 20285,
    gdpGrowthPct: 1.0,
    source: "World Bank, 2024",
    growthHistory: [{ year: 2019, pct: -0.8 }, { year: 2020, pct: -6.3 }, { year: 2024, pct: 1.0 }, { year: 2025, pct: 2.9, forecast: true }]
  }
};
/** Historical (2019/2020) source: World Bank Gulf Economic Update, Aug 2021. Forecast (2025/2026) sources: IMF Article IV / World Economic Outlook updates and World Bank Global Economic Prospects, as reported through Jan 2026 (Deloitte MEcon compilations). Verified Aug 2026. */
const GROWTH_HISTORY_SOURCE = "World Bank Gulf Economic Update 2021 (hist.) · IMF / World Bank outlook updates through Jan 2026 (forecast)";
const clamp = n => Math.max(0, Math.min(100, Math.round(n)));

/** Regulatory Check — corporate tax, VAT and licensing per country. Real, sourced (Deloitte/KPMG Tax Highlights, Trading Economics, national tax authorities). Verified Aug 2026. */
const REGULATORY_CHECK = {
  UAE: {
    corporateTax: "9% (0% bis AED 375.000 Gewinn)",
    vat: "5%",
    licensing: "Handelsregistrierung + Wahl Freizone vs. Mainland. Seit Reform der Commercial Companies Law meist 100% ausländisches Eigentum möglich.",
    source: "UAE Ministry of Finance / Deloitte Tax Highlights, 2025"
  },
  Saudi: {
    corporateTax: "20% (auf nicht saudischen Unternehmensanteil)",
    vat: "15%",
    licensing: "Investitionslizenz der MISA (Ministry of Investment Saudi Arabia) erforderlich, neues Investment Law seit 2024 in Kraft.",
    source: "Deloitte Saudi Arabia Tax Highlights / MISA, 2024/2025"
  },
  Qatar: {
    corporateTax: "10%",
    vat: "Noch keine VAT eingeführt (angekündigt, Zeitpunkt offen)",
    licensing: "Gewerbelizenz über Ministry of Commerce & Industry, alternativ Sonderregime über das Qatar Financial Centre (QFC).",
    source: "Trading Economics / Gulf News Tax News, 2025/2026"
  },
  Kuwait: {
    corporateTax: "15% für ausländische Unternehmen (kuwaitisch und GCC eigene Firmen steuerbefreit)",
    vat: "Noch keine VAT eingeführt (in Prüfung)",
    licensing: "FDI Gesetz erlaubt bis 100% ausländisches Eigentum in definierten Zielsektoren.",
    source: "Wise / Kuwait Decree Corporate Tax Guide, 2025"
  },
  Bahrain: {
    corporateTax: "0% aktuell (Einführung einer Körperschaftsteuer laut OECD Rahmen in Vorbereitung)",
    vat: "10%",
    licensing: "Gilt als vergleichsweise einfacher GCC Einstiegspunkt, Unterstützung über die Bahrain Economic Development Board.",
    source: "Trading Economics / KPMG Bahrain Tax News, 2024\u20132026"
  },
  Oman: {
    corporateTax: "15% (3% für definierte Kleinunternehmen)",
    vat: "5% (seit 2021)",
    licensing: "Lizenz des Ministry of Commerce and Industry für nicht omanische Geschäftstätigkeit zwingend erforderlich.",
    source: "Deloitte Oman Tax Highlights, 2023"
  }
};

/** Competitor Analysis — real, named market leaders per country (verified via search, not invented), plus a qualitative market-structure/gap note. Aug 2026. */
const COMPETITOR_ANALYSIS = {
  UAE: {
    players: ["Emaar Properties (Immobilien)", "DP World (Logistik)", "Emirates NBD / First Abu Dhabi Bank (Banking)"],
    gap: "Markt von wenigen sehr großen, staatsnahen Konzernen dominiert. Lücke für spezialisierte Nischenanbieter, die nicht direkt mit den Großkonzernen um Skalierung konkurrieren."
  },
  Saudi: {
    players: ["Saudi Aramco (Energie, mit Abstand größter Konzern)", "SABIC (Industrie/Chemie)", "Al Rajhi Bank (größte Islamic Bank weltweit)"],
    gap: "Vision 2030 getriebene Diversifizierung öffnet Sektoren außerhalb Öl/Petrochemie, in denen die dominanten Platzhirsche noch weniger etabliert sind (z. B. Freizeit, Tourismus, spezialisierte Finanzdienstleistungen)."
  },
  Qatar: {
    players: ["QNB Group (größte Bank der Region)", "Ooredoo (Telekom/Digital)", "Qatar Duty Free (Retail)"],
    gap: "Starke Konzentration auf wenige staatsnahe Champions; Mittelstand/Nischenanbieter Segment vergleichsweise dünn besetzt."
  },
  Kuwait: {
    players: ["Kuwait Finance House (dominante Islamic Bank, fusioniert mit Ahli United Bank 2024)", "National Bank of Kuwait (größte konventionelle Bank)"],
    gap: "Bankensektor stark konsolidiert (KFH/AUB Fusion 2024); außerhalb Finanzsektor vergleichsweise wenig internationale Konkurrenz etabliert."
  },
  Bahrain: {
    players: ["Ahli United Bank (historisch ca. 21% des Bankensektors, jetzt Teil der KFH Gruppe)", "Al Salam Bank (Islamic Banking)"],
    gap: "Bahrain positioniert sich bewusst als regionaler Finanz und Logistik Hub mit niedrigeren Eintrittshürden als die größeren Nachbarmärkte, Einstiegspunkt für kleinere ausländische Anbieter."
  },
  Oman: {
    players: ["Bank Muscat (Flaggschiff Bank, seit 1982)"],
    gap: "Kleinerer, weniger gesättigter Markt mit Fokus auf Logistik Positionierung; geringere Wettbewerbsdichte als in Saudi Arabien oder den VAE."
  }
};

/** Market Opportunity — target audience, demand drivers, current trend per country. Real, sourced (see each entry), not modeled. Verified Aug 2026. */
const MARKET_OPPORTUNITY = {
  UAE: {
    audience: "Digital affine urbane Konsumenten, KMU im Non Oil Sektor",
    drivers: ["Mobile Commerce wächst am schnellsten aller Kanäle", "Tourismus & Logistik Drehscheibe der Region"],
    trend: "B2C E Commerce soll bis 2026 auf ca. 9,2 Mrd. USD wachsen, mobiler Anteil legt am stärksten zu.",
    source: "Dubai Chamber of Commerce / Euromonitor, 2022"
  },
  Saudi: {
    audience: "Junge, stark urbanisierte, kaufkräftige Bevölkerung (über 84% urban)",
    drivers: ["Vision 2030 & E Commerce Gesetz seit 2019", "Über 100 Mrd. USD geplante Logistik Investitionen"],
    trend: "E Commerce Markt soll bis 2027 auf rund 20 Mrd. USD wachsen (CAGR ca. 20,9%).",
    source: "ResearchAndMarkets / Vision 2030, 2023"
  },
  Qatar: {
    audience: "High Spending Konsumenten, staatlich getriebene Großprojekte",
    drivers: ["LNG Expansion treibt Fiskalspielraum", "Diversifizierung in Tourismus, Logistik, Islamic Digital Finance"],
    trend: "E Commerce Umsatz wuchs von rund 1,3 auf 3,2 Mrd. USD (2018\u20132022); Islamic FinTech Sektor aktiv im Ausbau.",
    source: "trade.gov / Qatar Islamic Finance Report, 2025"
  },
  Kuwait: {
    audience: "Mobile first Konsumenten, wachsende Fintech Nutzerbasis",
    drivers: ["Höhere Ölförderung als fiskalischer Rückenwind", "Graduelle pro business Reformen"],
    trend: "Kuwait führte 2024 GCC weit bei mobilen Shopping App Downloads.",
    source: "Allianz Trade GCC Country Risk Atlas 2026"
  },
  Bahrain: {
    audience: "Logistik & Finanzdienstleistungssektor, regionale Drehscheibe",
    drivers: ["Flughafen Modernisierung (Kapazität 8 bis 14 Mio. Passagiere)", "Metro Projekt (~2 Mrd. USD) & King Hamad Causeway (~4 Mrd. USD)"],
    trend: "Stabile Wachstumsbasis, aber hohe Staatsverschuldung als struktureller Kontext.",
    source: "US Commercial Guide Bahrain / Allianz Trade, 2026"
  },
  Oman: {
    audience: "Logistik & Industriesektor an strategischer Position",
    drivers: ["Fiskalische Konsolidierung schafft Stabilität", "Ausbau der Logistik Hub Positionierung"],
    trend: "Expandierende, diversifizierende Marktwirtschaft mit Fokus auf Logistik.",
    source: "Allianz Trade GCC Country Risk Atlas 2026"
  }
};

/** Market data excerpts in the active language (German source data with EN/AR wording laid over it). */
const _INTEL_CACHE = {};
function intelFor(lang) {
  return _INTEL_CACHE[lang] || (_INTEL_CACHE[lang] = localizeIntel({ REGULATORY_CHECK, COMPETITOR_ANALYSIS, MARKET_OPPORTUNITY }, GCC_I18N, lang));
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
  "companyName": "Nordlicht AI Systems GmbH",
  "industry": "software",
  "product": "Enterprise AI assistant platform, computer vision quality inspection and a data integration API (SaaS)",
  "revenue": 18.2,
  "budget": 1.1,
  "employees": 112,
  "certifications": [
    "ISO 27001",
    "SOC 2 Type II",
    "ISO 9001",
    "GDPR compliant"
  ],
  "customerSegments": [
    "Large Enterprises",
    "Government Digital Programs",
    "Industrial Manufacturers",
    "Telecom Operators"
  ],
  "salesChannels": [
    "Direct Sales",
    "System Integrators",
    "Cloud Marketplaces",
    "Reseller Partnerships"
  ],
  "products": [
    {
      "name": "NL Copilot Enterprise",
      "category": "AI Assistant Platform",
      "price": 38,
      "priceRaw": "EUR 38 per user per month",
      "usp": "Private LLM deployment, Arabic and English support, in region hosting possible, role based access",
      "targetCustomer": "Large Enterprises, Government Digital Programs",
      "performance": "Best seller, 44% YoY growth, 48% of total revenue"
    },
    {
      "name": "NL Vision QC",
      "category": "Computer Vision Software",
      "price": 2400,
      "priceRaw": "EUR 2,400 per production line per month",
      "usp": "Detects defects in real time, runs on edge devices, integrates with PLC and MES systems",
      "targetCustomer": "Industrial Manufacturers",
      "performance": "Fastest growing product, 61% YoY growth, 27% of total revenue"
    },
    {
      "name": "NL DataBridge API",
      "category": "Data Integration SaaS",
      "price": 1500,
      "priceRaw": "EUR 1,500 per month, usage based",
      "usp": "150 connectors, no-code pipelines, audit-ready data lineage",
      "targetCustomer": "Telecom Operators, Large Enterprises",
      "performance": "Recurring revenue line, 29% YoY growth, 25% of total revenue"
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
  const industry = validIndustries.includes(row.industry) ? row.industry : "medtech";
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
  gold: "#C8A96B",
  goldSoft: "#E0C58B",
  parchment: "#F6F1E7",
  parchmentCard: "#FFFFFF",
  ink: "#181410",
  teal: "#5F8BC3",
  coral: "#D56F55",
  slate: "#8C8172"
};
const CRYSTAL_STAR_GOLD = "data:image/png;base64,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";
const MARK_IMG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAACnCAYAAACrfWHaAABKnklEQVR42u29e5xk11Xf+11773Pq0a95aPT0Q7bxUxgM4gZiTCz7+sMncHnnMx2wgyHExEkg4RLIdV43PR0SAjfYJDEYBIltbLDz6eYVE2LAAQmIbSCWbbBGtiQjjfWWRvPu7qo6Z++17h/7VE33dI/EQ5a6u876uFSe7uqqU/vs/du/tfZvrQWttdZaa6211lprrbXW2h4wMxMzk3YkWnsqLbRD0Nrnxz7ahZEBw3YsWnuqzLVD0NpTy6xoWNUjfR4/VwAYtEyrtZZhtbYrIQsQGIz6DLxt/lFrrbUMq7XdaafP9KljcRHEWmutBazWdqtt1H1SKtqBaK0FrNZ2rx07lp2/FHqotYDVWgtYre1mwGqeNfSxbtkOSGstYLW2B2aW9TAttrCu1lprAau13TmzwgxQbmFdrbXWAlZru8pWb8hsKro+3rWymdZawGptD5jXLg7fDkRrLWC1themVpekzfxqfcLWnhprKXtrnx8TutAyrNZawGptN9vRsUtY9ukt9ABYXW1PCVtrXcLWdvPMKvuU0msHorUWsFrb/eZDBxe6W1hXa621gNXa7pxZoY9Jq3RvrQWs1vbCzHJdNLWA1VoLWK3tARM6mOu0A9FaC1it7X4z18W5bjsQrbWA1doeMN/F2lPC1lrAam1X21HNM0tmSTQMqz0mbK0FrNZ2oYmITRiWSI5h3XprKxxtrQWs1naXTTrmCIDroK51CVtrAau1XQtZ+b+fWikR14G2RHJrLWC1ttvthucHjAJrAau1FrBa2+123yMd0A6pbgGrtRawWtulNq7dHlOJpg5YjmHddLJtTNhaC1it7TbAap4How5KeVE4erwFrNZawGptl1qnUwIO75oCfsdawGqtBazWdqmFOgCGkwxYIhclD6211gJWa7vKJxxqgeKRojAzJ2BjyUNrrbWA1drusHEp5LLXo9txGDNwd3tS2NpTR97bIWjtiSy7cpZPAI9tIlLHjhkizS8bG6cM9udm6PZgOJzhsQcLYHTZ9+WSrtDNe19M8WmttdZa2wYgJmZLzlZW/Pjx53+P/Df26O9+tZ35Q7OHf/cuu/dXDozf/y/yfvlhzpaWXBsHa61lWNMITiAsLQk33CCZFR03EVF2CDTZ7W89xEZ1gN6BOQo3x3BU4upEmc5w4OCjcvV3P7r9E0aSOZVEfM/tAEQlnzt7HefXr4byEOI7+KKi4iRpcIqenZGX/cNTIotpyx8uXwRFVoGjR7VlYi1gtbZPGRSrq46jILKYWF7estDtD3/4MHMHriG453H6zEvAz9PtRioJCCNGG49inQeJ4TSddI7YOcNVC2d2/LA08qgH5xyV7DDHFmvcyiPYoEaLAbiDxHQAiV+OpRdg88FOvH/AqdNQdh5hZuZPOPn4CfzjD4gsbmz9XksObpCs9WpdyRawWtv7IAWISAImjMU+8VPXc2DhryJyI4PqBcz2upw/d5aR3k6Y/WOseoxQf1a+8AdO/7k/WDsz+AAp9SgawMoqeMvXgsHiAHigeWy/7kc/cCXl8KXMH7qSun41B498J93rvd39i2sU3EdVf5Sy/JTI33h4MwUzW/Et+2oBq7U9A1IIqyvbQMpu/4lZytlXQvHVoK+iU86T9EFC76O4+J85c+5j8kU7uXfj+NMxYfUG4ehxy4HxZcvAs4P5YoaiBBvOMBo2gJVdum3ve+yYcOwYsCqsrsLRlTHQPNo8AFYA7MQHr4ELXwzhr4B+D86us7ve8yjO/RH1+ofww9tEFkeb3t+xuioteLWA1dpuA6omSJ7jPjn2Y3/yjoP4ma/G9G/i/JeBcyT930j8WTbib8tL//aJLe+xtOS44YYc2D563JBlExi7WXZpPOnyFyN9nAe1DtFddo5N3nd585vJVpDkBsmMaVFFvuZh4GHgNzJL/PHrObDwSgb6TTj/7cghsTvf/VE0/gqP3P+7IvL4lvE5enQcq2utBazWnhGXj1UnsphksQEpWyn51CN/jVrfgPrXwqjAF7cQ6x/k0ft+R16z/Pilf7/JhXpqFrMwS0qAeQr/F9Jh7QSSm+Nw+aDg+08AJ4D32Yd++DDPvua1OHkDndl3c+1L1G5/5/8gdH+W0w9/VF65OJgwUFYcsqjSqllbwGrt6QCqJcfqDTJ2+cxM+Oz7voK0/jc4fuYbUHc93v0vuu5f0Fn77/K87z+7lWkAxyYng+kpv0AdzVMbpARWNK2+jj0JLfszg1jaxgjzQcIp8tnhqj3y365io34j3r2ZmblvJfRP2Ilf+69UfkXkaz8xYaC24mFRL+vatrbrrNW17DWgAkSWFcA+/b5rKYpvQOzb0fqVjDZqvLyH0t0sL/iu/33x756eQLTZihdZTPbAB98G4fuJ9YCifJVc97qPm5n7fLpjWw4YJmzz5oJ7D3wz2vl+Zme/gsEA6tEHCeGned7C/xB5TWyBq2VYrX2+geqPb345vvh2Unw98zPXcf7COSS+ndmFn5brF++YuD6rK64BqfS0XrBaHwcIgVD1n5addxP7sqUlx7EbRGSxBlYMVrnr/f8X6r6Xsvs1FMXX8OnHPmx3vOdnmO2uijTu4i1LgZuOpTZA3zKs1v6iQHUMZLkBqntXXsHauTdRp6P0Z66k0odx8k5m+S9y/Rvv3Qncnt7rNS8iye799fdS9v4WGhNz+jVy4K9/yFZW/Jj5PI3XM4nxTX529/tvwnW+D03fhEWohh+D9DPET79PXvHW9QnjamNcLcNq7c/n3owXmn32XV9JrW9m/fzrQK4B/wCjjWV6/f8sL/r2By7Gpo7bMwFUF211vA3OIB68eGKaBZ6R1oRj1nUJ27wVuNXuee9XMxy9hSK8luS/jOIL/54d/7mfpa/vFlkcjsH/mR3P1lrA2tVAhXDrkheRCCT79M+/HNIPUtvXkuwQajWheCf9+R+VF3zLXROgOn7cnm72sqMdayqLisxhBkUA5+afcTciC1XTRWA/qiLyW2Y338Kn/ffgOj9I4b+UOr2Dmjfb3StvkxcuvldkWTe9vmVbrUvY2gSsNrlMdtfKEXTtn5B4A8oVeAH0Hjz/Tl78d94zcVvYXQvJQATMHvzNW7HOq+mWkDa+V6563U+O3cXdsznkAwIAu2flxVTVv8P7byDMgzlgcCtp7V/JC9/4kUtf39ozZ209rF3g/pktOVlcTHb7Sml3vPNN6Ppvk+rvxlIPL2eBn4L4Wnnx33mP2ZLLrsrirgoOm1kGKzMh+E6WNBgoM8Cu6/48AStb8fL8xTvlJX/rWzD7u+joYagE5a8h/d+ye375x+zedx0QWUy5YoS1m3zrEk4xq8qsw+yu938dNnwLSb6EWs+BM3w4Tj/+U7n+uz988fW7fpcPmCuxaAgCzAFw0y51MWQxXTyoeP077RM/9TvMH/hxkK8nSQ3yAzD/TXbn+/+NvPjb3s3ycsu2WsCaMqBaak7/ZDHZnSvXodWPQFqEMET8Or5eIBQ/zQuffUzkNWub3L89sEiOdxB6OJ8QF4Duro+LjOUiGYhOAN9sd7/nB3HdJXAXwF3HTOddduKXvgaX/rHI4oO70SVvXcLWPj+sanlZRZbV7ln5m9jgwwivh3AS8R5Hold+t7zojT8o8pq1MavaMwvjoXu6GD1EDOfAXGev3Jsx2zIzkRe+8cdw8VsQXacIHWp/Ct9bJJUftc/98uL4nphZu4ZawNqHQGUm48C6nfzVa+3un3831cbPofUCqX6IanQNrv4Ys7xWnvf699vKijcz2RWnf38e8+YBjzhDBAhZOHrrXgGtZRURs1uWgrzg9R9CztyET79PiIfZOH+aanA1yvvtT3/1p+0P335YRHRSVLC1FrD2B1gtORExWVxMducvfCtn1z+M2reT7DzJKrArKdNP8oLyq+W6N3zGblkKsri4txTX467P52NBSgWgqIJoBqw91v1ZXrMcc0D+TXfyJx/6auoL76IMh3BhjVSvUcqbueq6W+zelVdkZmYtaD0N1sawPu9g1eTXPfiBPufO/jDO/0PEDXE8TlF0IPbolP9Mnrv4tovgthz33Bc9Rs5t7lhJSh3wGbA8uV09R/dcrEdkMdnKipevXRzB27/L7vy5xyjn3kJknVF1Fh++EN/9Hbv3l79HRN7fuIdt1dOWYe1xsLr9PV/A4MKv0+l8H7jzqAwxN09RFHTL75LnLr5t4gLudWV1CgVIB0MwgTCJYe3JRSyLYznDkpMXf8c/pT63ROH7FL0C/AVc0aXovc/u/bVjIpLdyebUsbXPw/1oh+DzAVS5+JzIstrd7/4GLLwdq6/G3DlEHOpn6RRnoP5Oef4bftNuWQrymj3IqrZ+Zyciavf/2hdj4eO4/oCynMGl35UrXnVTfg2yVysiNG3JRETU7v6F76Uz+2NYMDTViHj63T6j4buxu/6BPOcHBp/v6hQtw2rtKQQrIYPVz/8z6P4iLhxEivOYeZLOUhYPUvI1Gaxu2fNgBVxsouq6cyAOM0MVjJ7ZLWEPk6zGPcQQMVtZ8fLCN/wE6/f/PdJGI91QY6Naoz//nXRe/gH77C9d2QbjW8DaA2CVg+tgzu76hZvx5Q9jbh0LCdd1hP4MM3MP86yFb5RnLX4yg9Vr4r4ahNJ3QMGiodHwruDE/oiVCuSDE1vx8tLvfTcX7v+/sVHAFw4xx4Xz6/jydXRmftM+8f7rczC+Ba2n0tqg+1PtEj26Mstd73snpKPU+jjmC5w3XDlDb/YUC7PfLJ1X3Z7jW/sIrMbVGFzsIErDrhSl5PqD+2zRLmoTn/zP9rG3XcmRL/g3uGJIMmFjdJ6ifAVHFn7L7nj/14ks3rXb8ihbhtWCVQarz/33g6zVK1j6G6g+gtYBqxWRDr3+aWZ63yyzr/qk3bIU9m1qRxrN5xRoADHQkhP3FvvpKzbVH9TMnHzZP/5hzj/yQ5iVODG0KhltrCHuhcwf+A279xdfIiIt02oBa5eB1b3vuprq7Aeo9a8j/nG87+AKwxclM/MVvlyUA6/+o30Ts7qc1czRlBtFMPAdygP7jsln0JIsjv3Fv/tDXPjcO0B7iCSwQB3Po+56irnfsHs/8JLWPWwBa/eA1R3vvYZKfoUUvwKRxxBf4LuG6znmruiwcOA75arX/C+zfRizutQ09TO9MkEEVDsM075cqCKYqYosS+T07y8xOPkBimIGkYikkrixRozPwblft7ve/4KxrqtdOS1gPXNg9cDPHcbHFTS+ArXH0FigSUgCC1cssHDlW2TmK37V7Jawr2JWlwUs7UMCS2BmGDkoDRfV8PsKtMTM/pWTr3rfGU7+wVtYf+yTiMwSY8Sip14/Rxpdjy9+xW5/19U5aN/qtFrAelrBaimD1V3vnWfd/TzIl+CKkzhX4DzgamYPHGL2wI9L/xVvyzGrfQ5Wtx5vOqDKDKZgamCGacDrvmYVIstqtuTkVT99J2v3fS+j8/cgFGiKWCqI9VmSvpyi/z775HtmYNnaulotYD1dzErgmNl9Kz1i/U5i9ZUoj4MrcKUhrqY/d5iZ2V+m98U/YLbkuOnYFJwQ3dTMKNe7uJKdgRUUM2VmWFMAWl/yLz7MxufegtUXcEFwrsY7j+hJxG6iV/w0GKyutsUAW8B6GsBqdTVrrdbXfwzSa5H0KJo8Gg2tEhIWWDj8KeZf8t3jRIKpyi0z7WAOxOegtLlARdPq69g+//INc/qif/pLDB67GbTATFE1IGB6Euxv8Yl3/VCuwrHqrM02aQHr82arq7mU8R3veAsWvw14DAkF4gzFMCmYPzIilG8SOXAaVqan68q4GkO0OTTBBKTN03XlNAyBCMaxY5I3tNt+gsGZ38UXs4hEMMPhQB+lI2+x22/+DpHFxC1LbRD+z2GtcPTPzK6O5kTmO/7TtxD1+/D6CEiBqSHOMIyFa6/g4DVvlvKlH7NbpiTIPrGmY46zGVICP4ljCZ1YTssoyPKy5iR2ecQ+/Kx/jSu/gO7MldRpCAqqhrOTqPyIfeon75CXf8//bvMOW4b1FIPVkhNZTXbXT72MyL8BO0+MRoqGJiXWNTMHr6Q391+lfOnPmJnnNTdNmbL5WANYsUOsDY2CKmCQmooN43zDfc+0xMxM5Cv/7UdYv+/HqNcippBqzaEDHeXihuU77JPvuTJPsfbksAWspwSsmiD76ZsXqNKPAh5jRE5yVtCa0Jtn7sgJDjz7H+WsfkyYnrhVrsLQiChj7GMaAcU0R2hcyEr3o1M0cUTy3Ln2wfdw4aEVdNBB6xpSRNShugH2QtzoP4DAsWNNRYjWWsD6yzGHvBgfrf45qi8AO4uJIE4xDDNh9soZwvz3iFx7MsetppPem6rD1KMxs0sv4J1DtDNtYyE08azrfmaD6tSPMdq4A3ElIgkRCIXHh1M4+UY+/tP/j4goqyvtemwB6y/rCi6rffYd30rN16Ocw0LZHNcLlmo689fS6/+MHPiiD01v+6eGTN79nwrEPJYSBkghhA4E6Uzj/JHlZbWlJSev/PHPwuAnMElIEZBifCDhEHmU0v+AffK/vEoWWyV8C1h/WbC6+2e/gEH6HpRziHPN3imYJHw5w+yhBynCD+XWXcenuzRudU2BWYFQ5VNCD86DdBrAOjp9Y3Js2QyEq0/9Kjr8TcT1MTR3mTXDYg1xhNTL9pG39jh+vBWVPoG1p4Q78wUBsI/dXDDY+Jck7YPbyJTeFAio1sxccSWzs/9AFl55um2uCfTOeFInYBbRGBA1MNBUTuuQ5FCWiYis2+8v3czBcCNFb4GUKlBrUpjOgL2Y2YN/X5Z/4G12ww0eaMvRtAzrz4pYS7m2ulv/DtAvxLuzCNLsjAl0g87sEbpztzD/Vb+Qj6XbTsCce7wkVT00JUgJHUGsoB5NtZszPjXkVct/yOjCz1MPjbqKVKPUpO840DNY9ffsU+/54jbfsAWsPwdWNa7g7f/xZXj3bShnSAZIRCzmCYbSnRM6h/95q5/hYlJz1wJRS9CIpkSqjFRBrFsm37AtrHov9fofgXlUI2D4QnFFhCTU6z9kty+VcMxaFXwLWH820LrlloDKP8CSw6wmZ/NGTBMaNyi71+D8e+XwX2kqh7agBUCygBCacWpquqeLoYdbb53aBTjRZn3Zv3yY6uz7ER1SlIIPijjDOYeTc7j4xdSHv0NEjJX21LAFrCcCKltysrysHL7t64jxBpI7Bw5MEskMswihg++f59CBt5qZTH2gfcts6jpMQS2BkJN/PSQt28Fp5hgIV/dvReNt4DuIz5udqoIa3h6D9Eb7xE9dx9Gj2rqGLWBd1hWEY2a3v/UQyjfh5BxeDOcSImMF5IjQfw6hfJfMv+ZxVlczwLWWLXgPREQT3hu+FMo++JBPCW+adpdQDDPkuf/sDPXw14nVEI0O1YikGtNITAPQeWTwprYhawtYTxCHaSaUhm9C/CFMhhmoGpFRsAhujrJ7kkPhXWYmHJ8edmX3vqv7RGMHQDlTIi6Bj+ANKSAUIE+uwzKzYqrm2xXV/0SGH4EIWo1IsSalnCRt7hTI19rtP/OKcdmadoG2gLXVFZRltU//+PVoeh1qaxMGb6ogRmRI6FxNt/8uOfjNZ6eJXZmZJ9mzn/SF2imzviglLBliWdaQUudJ3l/gIwenhWXZ0pKT5y2fJQ4+gFbnsaiZZVlEnDYvhJT+kd1yS+DYRalNC1itMUncTfKtODo4pzgEE8NIEIegPYrOg8xe914zE44uTpEr+MFAkOc86csK7aBJUK2xmEhDoRpAnZ5ksX20y2OPXHMRvPb7dFvO860/+ANSvAPxuUSRiCDOCALGebR6OQuffY0sLyutmLQFrIvsSsyO//svR/XLMFnHOcktqixPLLUR5exhfO8X5IqvOA+rbq+2XP+L2ZWeGJ71pC+rYxdw2S20RBxlrKeSnce+YQ133jvD+fp5DQeZApaFmSHysh85hdrvAhHnBWuKHuITQsLZGrbxN21lqcxY3rKslmGxbLay4on+G0lao6qkmGUMguJJeOkhxRnK/i9lBnB0SlzB8QJ5wOPcgScHLC0xDNGEWa7WYCnLHXb+hPyUHpohxedN2VaZnzrp94ije1ERoAKtSTGimtB0DuLzeMHMa5uO4i1gtewK4+X3vQLjuWBrCJa7vRgghkqNlAdx8gF57tedmZRIniY7ax5XHrmsu7Z6R/65E58XnEbULEscEpjlEsm33nqJa9QITkezM9QNgzu2NEU1sxB5+f97P5pugTQixYRqDVZl3R8J8es4/412+1IprtX7TTnDampwm38dphEJiog2JUBSIxYFcWeR+MsAHD06RZOmweXzgz6d/nPh7rL56c6gUqdcK4w0gpRyXXcHzmYBOHnDVqA/1jzPFh0ch6du+o3BeebC76P1o3gHZppLF0kCZ3hbx7lnY4e+Esvt5VrAmmZ2dc9/fDkpvgTRIbK54aeCWcS5DsF+T176pody2s4UsatJH8H5Lq68Ch4sxr7ijqbJY1qjFlEMcYoKOMkM6+hlZCD+YGB2ZqH5zCka3yb4rn96gmp4B+IET079yhunkoBkFVp9tdmSY8q1WVOM1g27GtjrqFRQM6JC0qa/nrd8tixD+vE3tjCCqVlQzXMIJRquZK3sP+HrYwyIRdCIM8WSkBI4ip3Hr/mBeMdsf26zqzQdbmFTyeELVyvK6sNovICKgdZgNVo36WB6geiez/HrvkjAplmXNZVfPJf7wLj3J5+D6vMxzmOSMGqQmkTCiJg4HJ/huafvGoPcVCJW6HRBDlAVjZ7q0g7O4zpXVmImOJoT1tSsvSY153LsyRUB/IzZuHjdFJKIK3u3Q7wbZxGrKkgVwgiLFcQK08ho9FXN+FsLWFO1DpsFd3btK0m14KXCuYjzNVATXIWTGs8IF/9AZDlmd5DpnCiRWVQPUOkTV13wWmAI4nNCL85AEpZ6O7KncVOKIF3U5uBlU1eGRkRyVYbr/vlp6vOfQjVlV1qt6WeoiBlabaDDl9uJm6+ZlKtpAWsa2BUiy8tqn3vHQcS+kJSGJMsuoaiCKkkTqkZKj9Pp/snUxVYuIkpeFD4extI8ab3kiXzjaAEsNuOnmOUFl1LX7OgTgFHsY9LhkQeLaVyEeVJisHEnpmsY4yRygSSYOUQVSzOcXXv1ziy3Bax9as3JzIXhlxDjQj6NSQLRcvzKBEuCJI8M7+YFjz5uNF1hptXMd/FOSNUTMyy1klxDWjFLaK2kGLEkHH/Z5d29RJ9oHTqHp7RuVoM93cEJ4uhBFBCrEckhCppAPHqBqn6FfeStPZFlncZ0nekDLFk2sxVPPfhiVOs8AmIkyblvarlrcaojku4QWVaWlqZbsOeKDj5AWVy5xZXbbiWqHucEj0FStIqkGsrTlx9DjYewNEd9obfFZZ8atzAH33n5T53FV8cRHaCMMBsCI7AR3g1xrOGYZ9ZelrF/qQWsfU0UlpacgHH3PddgehXOr2dlIxGxlLuakDPmxV1gpr5net3BzYCSDlB6qKtrgSfoJWEBmriLGmjKNcRS8nSv3z7Xjk4A8SAmczA304z3dPIswZjtfxb0HOJTnpMoKvkZyXPV0pc0buHUzcvpDLqP4g0o4F2FDxFvEScRSQlLCURQ7ucFPN40EJhSwGoQReIcHhCO7PyycZt6F8BGWa2tTTnpWGPJc1rdE6zUGQrv8a7D1FpDlqx4ENVzCD6HKpLgGuav0aOxptYvsD95x8FpDL5PDWAZTbDdPlag8gUIQ9SMZNkdJGWhozhFY6BX3COyrNPmnmyxcUnjVC2QNDOhnezYpulkNiRVkVgnrI75oYFhefmge3SHKALUw9kncTn3N7sCePEfnkH0UTQKCYeSg++u+b0RkTRLPP/SaXSfp4dhjdXZd/3es0npaupkWPKYAgrJhJQcFj2C0pHPMu1208lx2Z0DpAR1nNsZsBp9WvAFSp1L8mjDVjUieDrzTzDXbA4R6Kb+NA93ZvOrCZ/uI9kQR0WQCkeW24ir8FSYjPD6wmkco+k5lck7kbG2/iKS5VbzAghCEiHRyBqsS5BT+IX7AVhenuL4VePqmVyRd/p04PLsQMC0h1nCmU1qiamBU8GX25nAxXr4fUwhxAObPdGptYJ7GKV1fOERM4qQszBMDEsJ4QIuXGUPv2dGrnnjuuVKWlMxT6eGYWV3cMXj/DXABo4KpCZqTiUJVgNVHhK5X573t4dmJgJTDFhNULeQfgYeDm4Bsi3sQAVNJQ4B7/CeTF0tYUmYkXJnFx3B2QyjIWysz043UjWYPuRsTnoGxCkJxVzWCDqnCBW1znH68esno9m6hPuLagNwz0NXkOwQUgwxp6SmKoNZIqkSpEacw9VNKs70xq/Ghw1m5nB0qWpAF/LPG6Bhc82sW31OwWnKIhsgEhFqMCg7xY4uOitdLPYzYI1mphquxizpRs5idoFaA3V0pCT5xFUVVUhJSMkziC+atjjWdDCs8Q29cO56JIXG9TOcGd4r3ileEiqC4SA8lP+O1ri1JNY9qmGN6gKf+S+zO+/qJ/NcUsvdX0g1GiOaKjRWyM5VRzl/sI/ILFonkKumfbSze7cc8eXpxh1PuT5byvmZqaluZDESeJbZUpimzk3TAVjLTWWGKM/Np4EqBGe5VIcaCiCGSAdhSO/xRzJgLbdtlk6c6BLrPliNhC5zh3buMXhi3TUzqkYsoSmhcUiqBxBHVM3vx5vH+Pn8+R4a+2hSlCumfrzHNbJ63YdxKE4rsBonNc7XeF8jPoEMSGmBTx08vMWLaAFrH+xYYDz0Mz3Qw5irMDNqNZCc7+bMQGqclAR/Wl767y9soejTbGlQovSy6yx9Ym9nwDpVOcx8ZgNYTs1JmWmZRny1VdYwZq8WusTYyU1qrdsy2sZ0eBLvFKTGu5iLSrqUm9RaQsIIS0I9eNY0uYVTwLAazBmeuQLxAedGiEuIKpJyINMkATVCl+Duz0A37b3gmgXg5nugXUQqrJpF1ntbfj+2bu0QHKjmeAsJJJIsYioMNnYGOh2VmBZoqkmjQ/mtp7ib9pjVz4WzmFg+tyC3mhNVvKUcG4wZuLAj0zQ8+39Rjnee9XglRMvpDknxrkl3cAlp9EJR5kn2IHCxTvm0m3R7aOqgqSbGgvPrO6vRy+QQFJMRzmokRUwrRGoUsM4lRfya/6NaAAHnKiTrsCanh9M43GNW/5wHTqFOwZWkJuCekmKiWMxA5qjw1RFbOeqnJY61/wFrrKNKdoikCik7ipYUUcWp5YXmHC71KIYnATj+stYdzIjSJcVAqkZYVHyntyOD9YN8kiVUQATqHHBPNaYVrto61ya1sPoHMjNzI7Cu3XxjMe0jnquDvH2E2QgXAqLjjtBNSWXAObLbLQd52ct64/BHC1h7/caD2crRkhSvQHwiWu45OC6JHCPElLDUxTnluqtObKHm02qrNzS1sFhA64BqhdYV7tzOKTau05ywIuDzGJslzCIiFaOws0jZSxdImI5Q6/PlN5VbgHAqEav57hIv4KRAZJRjV5orYIil3IrO1Zh4inphWsZsfzOs8f37qucUOCtymogmoipC7o7jXAStEDeLBZVDbz63hZrv2zWx0jP72OXZzKSSQlzI/fC0hlQjG70dX7+uDnUOo4lliYOmEYUBgct81qiH1hUaB5h16L+s/yTXXZrdvM9ZWBPGKIqT4OcQjTmrUCNYauJYCY01Zsaav3pL+KMFrD2OWOnAIaJ4lIiiiObSHZ58+hJ0BG4BH87kRbF/j4gn3+1suooHj88/qStR6UI+9atHWIpImN/CwLbMpqZiqyVp+G3CEbHkiHHn2NdwvU8a1sTBCNGCTndup8U3ue4THOLRqw/t6/s0jp9aeRpzB3IXHRSH5jmrEbM8h4MlQjk1gtvpOAk7ZQdwOCQpRXPzVZsjYlWS1oTyAL7TBNxX9/+4nI1Xc0HnntSVsNjBYk3UHJuq7cCOrwvmMDG8r8GnycmrWmZYUS7PsCzG3GzBFCkavdZlrifIlaTOwX19b4428dNRHOBkFlVHGotHmzQdT0SSkqzGdAHyYUULWPvBxGYRy8U6DCX4TLFdA16kiBQHoXgMgCPH9zG1bpjLxoVns3H+8Jaf7WT1RpFV6HXuRlx0d873m5nvYuZRBfGKkxq0RqzC2fCyafaqfUwVrEI1IrXsDFjNNdbpGlh78uveD1a4cyS6iHN4Is5nOY6hWfLgDLUadMZuXypbhrXXcWrcpUXjPClFLCnqEtEMaxxEs0RyhvN9nJ0H4KYb9m/8auzKqb8W1728eze2SB/TXIgPqzFXbIlxTZhY1cW7EhFBTHIGgSZSiqiOUHbe/aOWiFVAhSqcPXvgMoDVELJ0LbUc4Alp2J7fVPL8OzJ3ChcCrhNwVKglYlN9NCZtTroTSMHBa8OTuvctYO0Bu3XJU6cugYjzmVWFRjUcJKGScGp4X2CaAWt1P7sbzXN3rk+/23vS12tdolExKixWpLjVtZuk2NSzqPZypUwtsORBU66KQf0E7NeTbERMdQa50c5q97EMwrkrUNvnhf6ar/Ws554B5xG6qEZcUoiNJMelHJH1kToKZx6aCm9p/3/J6w55nPOZTUm+2VYp1IYkxSVFCsGFEhfO5UU9BUrr7myPon9kR7a0BbRtBrWmG7EOs5Zt0+/HJMeHgIhHLWDmcSLgsvuCJULa+QNUBbUhkkaYQhrmuNqlwt3xNXp/DUW3uOx17wvPoAkqHvvIAPMg0gWtMW1iV5byvG0kDmLCDLMtYO1hm1BjP+iiuEydo+G8kpwhLk0EpI6ASQAuMDXmD+TGD5f1HcerZwEnCj6iNoK0czQqVQ7TLMYVp7nPo+Xqo+Iild95rqkJQoVqlX9QLvBEaNTtzdOdDm2pLC9nJhWKArSeNKOwlCU5ElI+8UapRo0cxFrA2tPWSyVqgvm8kGJtk+C7NF1IXPAYAafrW2II+zKGNUb0dBDx1132dYurmUmZzCEu4oNiRFzKILe4uDUmJR0BqTEZgdXga0RHSMpNKbyzzZuJLK6mXFCRw4gNEcvq+KLs80R+eQgzOOsxLeaDQlGiVe5NGDVvukTLvTRjrjhi0gbd9zjHyk8X1ks8ZA2LWU7FsZySk/UtEQkeCYlweH3f3/GJu+sOQXHgcuxUaHrlicw0bFQQM2Ldn2QQbG7kGdRyrErqpl2aYtIAF3HHe3PPPbOk6mqcVdl1TDXeX6ZzTnPdqnNUg+mp6hBcQqyLmeLEJnFYE8v/FiMBFS1g7QuLvezCSGyOgzc9UgKLihOPmTJMGw1d2McDcmycW7lAigtPtr+Dlahlwa1qRMxzy6v9Nu8jjiSXoOFiFoFqxDSBRUS3D+q5VGLWQZ3hC8VMiep3BFBpNEaWDlLV+94nnIQ0zAykezGkkRpJQ9PxqUBxZpPx3edq9/0PWH7oJjfYmU70V9Y8a1LEO5wzzpP29yKYlD0WYj2Ha0Sgcol7N0ai+z9aIOKROETjCPNrOF9z5Kbt8yaZQ5PgxhUxMcQiTiOmkRi3X1BZeQyHWa5LZhpJlV2OLZt9rCDaPLVNgbJ7TIRFcBSYMyw0zT20eRYjNqxLfFsPa19YlYRQZ/mCNiVlDG0U2JoXlQPnBO6fGkcDtEOsF8xWfHb/dqCV63cEUhVIoyFSDfGsoSEys8O8sVSAFagLqHjMBN/UcTJ3eQW2xYRphdU1pgPQ5gRwh2oZ99zTJ6YFKpumhquCilDHHGwfP4RIiI22UC9utPu8S/l0KN1V8mmKxabtdyNnMM27lZqABcrZ6ajB9Mgfl5g5jCs4ceTy6Tn9KjTq9RF1FbG6gqT4+e3jpOoxKyAGJHlcElKd00kk2o5Kd1cIiUSKNamuMTbwWm5xXTe7ObP9HklncNIIXlf3/72yJlxYpJzwPHmYor7ZdDXhu37/hzOmAbCKTqMFcrmekAdcU8vd1IhqJBTnulw9FlLucxnW8IE5RAvU+gzP9S8b+zjpfS51oiOUmloTVQWndxApjh3t8bRSM1LKHYmMiLi8oI5t5g6FoCkh5NpPxpCYSshZChcBaxwn2yjRqkAazdE+rlk2+f4iHqSabLTjR6wUV+f4IFqj620Bv/3BrqJBnU8HTQ2LmsGqyKDVCeQqpM4Tin3eWLYBpRmZR5NHK0fXym1AMrZuGZqmswkvTTAdx5rbPm9EJedlSsq5gdRNOZ9IilWu5XQJY6rMkVvYVpircAwwFyzX1eLiKeSxMYu7lhgLVHvT4P40DKuD+BFYRDVRx+wC5vIyWaZTJZrE6Baw9rLrn+MwA81i0QhejQiYy1qsUCRiBKmHaPKclylp5NmZBUvUQ2FwYft3HgPKgs3hnEdKhUCTI1jQdTvPGycRIeJcflZXkZqOL5t0WBMbDHJbMND8P61xBI4f3bpxjFNwYjxIrrFVNuxjGpZoD2Q0KYvkJE1CGQnwYvjCqF09Dd7B/mdYR1ydb7BrbjAXY1eG4jtKqtfxPqHx0BYmshc3ZPtYYfbpyyjYG6ZisYvGCClSpCsu9zKizmbgd40GCEUc+K5sXxyFZHaFok2bemc5YTr3KrRtrGhu1ucOME1QPlnEpMuDzyl2XHvKQUQimgpEuOxhwV4nVeMmtbevlMAMVmV9oPOKd00vTd9IR4JitZE2ElNg+x+wkikuKLUaOgarsRYrKs4ZXFhHbIQLuc7SE1Uv2O32+ANdHj1+ZPPE385Uzs5hmnDeSOHKy37nOOgiFvFUoAkjoWYXAWsHlzDXalKcJNQaHZaLO15rX3pgitaNA1gn1PW47iWdHdnCsJ6HtIGOOnbPO/exeLT53jfMdpFYUI/WECfETXO4bjbhscRhoYgtYO0HK2cjKom+KWWjw/JqeDVEE6EwhoMBQoVILjW7B+thTcDpwYd6nDl76Andg/XR4Rys9QmTQ5eP/xUFySKqFWJ17tIiOy+M4CSDlcuglSynPQlKUkXjTtqtgKXMDJwZahGS0K13jiVK3UfjOkjJhcH+PyC55+QBonZw9RlCE8ZwlplVTxLlpn/HsgWs/RDCordRo5qwoFhQSp9jWnVhxOYkuKYm6RBn1+75XdlGfZJdsSUWdanVwy6qI4QaTZdPgI6xgDqhdZ275ugAz3D7IAPDKmuvaNJFgssKbMxwyUjjuSabY1iNS9go40WHYJHKb1W7Hz3apOVUM5gNqKMw0M7lwfvmwlaO+j17K8cVb9dG12LJGK3ltvVZM5jd7pos0XEuP1irto1vC1h7Cq/yJP/cFwyREElN6sLICeaMjhplUMwZhUWsXkNSTgbeiwX8xuDkFuYwObIlFjVZ+E0+XoolKQ1QrUnV5ROJbVRkl04rnN9AbQNsgzTcPj5ijcrdBDUh4lBtUkvMqEdu23qKQyFJghTRGEnVkFglwnAL2IiINp+xgMYNUM+hK2cvBeUJyzylV3Lj82d3dIv3gk0agHSP4GSADc4SAkhK+FopU5pkbDiUrkXm5kYtw9oXtPp/KtSZLteV4WM+MTQUIpOSvGn4IDE9p5kxe0/TMgYnbwu4cOiJ0Vw7WBqADdE667COb6oBNq5FNdKCZAmjRlN2CVWrHQELn/vl5VQbj0WXa12JIEkJO+QSOhyBCqQGKmCIWE2hYRNvzAFoMyGlPqojHNBpgPbYDixz7eBVuFcc3PMuY+mvwWQNq9aRTs4cUHI81tdKnQxqGFbG4/Uwgzut0n1P29FVpWyOfP04SKk2YVwmBhLQ6n7EXWu25Callfek6SxRM2BdGkgfL25nM4gMMTZAZ+EyDQxM/cWeeFLjqRuN1RPMKBNMHWPlg4tGEqPKHW7kUgQxrfAh4nyd67qnmvMXOhP2NH71/W/rgvTBKiwKA92hHVjDttSuwHUPP6FbvKtdwrHrXr0MHT2GuzBCNsUAfSOCDs6IEYLUhNm6ZVj7wTUUjCCjSWpIcgIRXFRGMbOuTtcj1QOk6iB3XntoT+7MY3DqdnuEyxTmG3fBVpsjWQQ2EAlm5nZ0n1ItiAyb1vOpqb0kzB4pto3RWMmuQJB8EqsxkXJV/dyr8BJbj4EYI67pFJ0sl6dJA7+NNdV1iVDgZAii1MOZy9JMCYfRNL+jW7wnNtmG4as9D3EPsxEkb7AxC0THD4cSSoNYc8Mdraxhr9tkAaZ6gODyjVbDO6PjDNcE4kM/wLn7c5/K3ou27NZ7zep0AJjbEgthUxdsMyHVXWJdk9KQFB38p63lWsaJx8E7LFXQtJDQhj3ZhXKb++jUNwTKEDGcGUaFswpiTblDEwoj5IoZ5B6GpKb87w7zcjDwaHIYNVZX6Gh7UH0i26gPEcelc47tsTnbVNS47609vH8uEu+hKw6tc+6g5+JD6ya25zZEVlvA2jdWlkOi5lQcZ7lSw5CsfC+HmhN3L5zK8QJ5Wf6jPabFGoOT6mFSvHpbLG5Chm7tIM7hOA/VOlYJn5nZ2h5+4joml2NWmgPnFrPmZ6beIfkZh0meUsmkEY5WOe1GRmjUCX8bv3/XGaQcX7SUTxfFG+q3g5GWRQ7i1yNSNcQsXHYMYnUQSQe3gNjeCUY2TT0OPA/zVxLPfRbXcVkPVyve8kGROcNJwqtRFBd2ZMgtYO1R6w0GiEu40OxOId/44CZFh4ixZnDhIar1L94SR9hztLLuk+JVBrI1Ftd81VMPlFmJrmuYrWMp0r2wFSDGanQfSywqpg7GQXMznOyQ/CwCKfuEKoZZLukzri7gCzO9pFOzmSeJwTgZfZSQlHYs9ucKAWqwESkNML28bMF0Hmwby9wb1myUUrwIsRF64X66XY9LiU6ZUFM6MT9bMtSUWTcV8at9D1iTE5NhXG9qhuc8QiJZLVxDLQaVMXKG1HfgQ2ZYRxf3Zva7ulks9bh9qdgxFne2380lX2yICwOcJgaX1Egf5+iNtJsLHUqWLDgxzIxzO8wbMUFcrobpnYID16TjODXqtP1vfAgEIDhr5A8JTXW+R5eCUGcGVUWaWvHJtpcEvrUR/JahiyvKJ3C7du+8H2+UZfhydPQAxekzeO+JwGAkiAp1M2aZBSf609M8ZToY1gsP1YRRhUY3OR2MQO1y99xajX4ocBt3gl5nZ3//oEgT79l1MY6PFWYr29nFsbEsQftYgsMv2LmMsG6UWBQgIimXPvbntgDW5CQv1AHRiJqhllmTWH0ZVtP83qdJtCoBmhxqQpXctrhgnXI1iBgFM8mup9Zb2hiOT/lKncuJvxbBapzrXTZE5cpA2F6Bc1L94dzqAbNbdmdqz1heYvoKJN1OfSZCBJ+MoshDE1WghgJwIfK5c1MhaZgawBJZVqp6DVRwdabSPlnTOAHUlFiW6Nl7MOty+tGXN/GPXTM+k8X20J0LPH7t9iP9Y80JoPMJoaLy5SVuXv77cGGGKnbR2hOjYarE1NsOjDgqEcxGOCJqqQEsxcXtQN54g/k/MT9ykNzlEjU7uHkaHXguSiDQrMnaAWvrbomSMI2gAzDZ4r7CRcFv0i5q3Z0GEYCNdBUPnpnZbXEfMxNZXlb7zC9cQbQXwejjFP1AlXLMqhpePCEEqILH+yE33jwVaTlTAVgX+xPKBSjzjd98e60yOijePGH4GOgjjOq/suviH+PFZoPDxEd7ly42EfK/1LokTZw7ubNLtFbPNiemHuqEiDBsKnhu0SwdFTwR54ZAhXNVbj1vW3fx8Yli4QOFGF6kqUMOZeO2eHKu4badxOW4lwJJG5amugXcxgxK6g4WFUkjsI2cjtLwwYsX01R90KsunhLuMIjD0RHkwsyOLvMz6g42G6RzX4qzknTyM9TFDAxAKiF5mYD5oPmbjl3Y27rBFrB2jmN158/jUJLKREDqTPHSVCJ1RukqtPoDUv3qLQtgNyHWhh68GHOyLaBs+q4uaAe0phgdaFa8bFn4NuwjZnif3S+1SKfc7mLedtDlmBQV6rM+SlJuly5hO6A466JWYBow8bncDBDIBRMVt/3kNZBL0ljTsqoR9dZph8VXlU1XniHGWm7bfhGvcmcdGTPmA9Q639zDHeJh5Ryx3H2ddyYnvfZqNH6O+r6TWBkmG2y3qTLiXaLjEs6UXrnBFJmbmm/6SH/ALAO6pdEdnxQ2DzXNpXpnOxTnP4rjxXbig9eIiNnS0u4ao9HoOlJ1SR7duM/fTAeiAwZEN7/zHe/2wBuqltNzdGMzo5m4njde02iuxonJlpAi4UOi2gQoY1dUpIdZgUqBUuSTRQ/qJD/vEHQngmjENZUIYsqVHXaqnlnHgEnESYXZCK39lnjbBLxvLkh1j9TUNttcannivg4XGFa7sI/foiICafhXYfARqo1IKYmiqHE+kiThTRm57BaWZU398Pq0xK+mBrDMEHnNcqT2a0QvjBotlo1yTlbQfDxc9zqU5+8m1Yn1819lIBzbJXqsMTglrmVjNLeF3UwW4oUSA7wboGFrXGrCsNwMohU+VAQ5j3dr1Lp9sp/AkQgIDtcAlBNDPTu2lHLicSIgHnEOwSNNem7+veO2/9nMtwbkep2ANBqviCIkisvUzqrVg0YsKj4l6ljseCjyyPkSo4DcWHRLKtB4DGM8iNYzWxjoMz5Hl5wIZnf87IuJ1fOpHv9Dekc6mVGFcX2xPG97piRxRN3g+nePpsUdnC6GBZBG5wkjIxRZg2XOGHrJQXgUTR45fwGqj2Hx6/JkP77Ldi47hNX9HcGs4+dJsURjxHbKtQOkcjndxlWYnsfZGmlTm6jN31Yps1Pnsptn5pHkqKsd5k3ITEoEMMGcQ71DRMAJ6h3ceCnBCiTvJmAomtA6UW8+iGzArXBdtGl8ayguBdjhUOTUgRzr0nT5lKNaD4LbXQxrnFrl+1+Jk9Ok++6mKAosGVGFJI6i8WLHw9MPG7ITg2wBa5/EseYOniOVCZJQ1xCS0bEcC4kjgQEoBZ3RrUi60f50ZUFkWXeVvEGZx19yjDZmT9VoAU0FxAijrUrwseuWAJUBzlc4t46kYe4fyNYTt/pQiZcSrCBqSYoFSQuSBkLwE6DcHPYfR/ycy6DlNjE3H4TuQ7I57oQjoJVkBXtsktKjTTRGxzbdO42zmCpmCaymTo7jx/3EjR2D9kyYRzWhsYBf625B4fH3C+4A9S7rHj0u/TNafy3ED9MdnIMCXJkI40RnlcxuCygKOGjntoxnC1j7zK4/NsLVAyrLCy56yUAFJC/UaoxmZ6g+9ynSwHPmQnYLd4O8YaI+p4ePOy+2VPezUjyuMdpoYljN340ntbcAGlEFYo2NRlQb2w8XZuoSkw7qAs48EEh1IGnYMdfPzDUNafPp31iq4D14kdzA4tK/UZdfO3kPDxJwpdv61ibgS8QpUmfA8s44uek6xqA9ivNZhlELxx/dWWtl9HIO5S7hzEtLTmRZ7fb/8BxqvRG98LvUBztYMmpgvZGmiRdqL1gKFL7iiv5gm9vbAtY+imOJGKU7dbFUR52V72NtSzU0VD0bj53DRn+Er75NwLbUinrGWKJkx8boT1Tel5aP0aqPpiG1XoDsEo6PvCeTOta9DB4m2b2ytDUmNTn695jkOBQmiDhwgpdcnG/7TArIGNg0oE0hP56AnUpySJP2oxqorcRpoLo0sfmYx6WAt4RKjbMKQTk467e5sTCHaUWMSh13VvCr9jHZPcLRG24Ytz27Ccd5inOfIYQ+1FCq0OluYlbOEBwxbYgsR5sqfjVNDGtSMvnMGURjBqtkY40j2uQWKorOdvFrv43Tv2offseVsvzMuoUXZQu3BCBQVzuXB65jL7d9twGGM1vazlQ0dbHa47TAOU80Tygm4DZ58XzwFLiGMSmu6ZyjIhfLHW/a3dWy+2jm8TjMBBcMFwwSOZZ1yf2Q0pHEowQcgVAWpOApZ7bGlz542pOkwEQwMRIRESEc2D4OzgVgHbEhZWdLk9iL1yp9isucoj4TNt4Qo3w9lj5KenBAFQrE59iVqFCrUDfeAAU8q3NqB7BuAWsf4ZUZCNf/3IhaNogUUGQpUK+AYhwfAIq5PumxT1GPLuB1sYmK7oKxOlkQ6xE26m6Z6JscuVx7yuocZ7rWb2FNHPN4KRDnSKlDlUqSFVjqTwB5HAuqXYGNqyY0OYTqyCrQS9ywjHYF4jzeBZz3BJcrisbk0CDQEbhhE8gJpKok+IC4gPMBV3jEPO4SXdhLDwmkQE1AFVKtxJFRPrZdPzasSlTXEYbIsLOJN44rlzpUS1Lq7Bp3cHlZ7aM/8lIIX4I7dwtWzCAjYRTDJNG8SEYwpaihWw442J0qOcN0xrCsucE+nsY1O1fykk9hmuc6BiwGRucrivq36Pqjmak8kyLSZk6eXe/gJhrnTUHy8bOfQVxCiGAFJy5Z+Hcf8kTpZL2mBFLMjCjGHrce29pKXsjsxztHcFCEXEMsAKXfzpbM5ZxBE0eiIEkgUeClJPgSqUvKhy/qvVQFfD59VEL+rKJAioLEVoZV4hAcAdCYcFLjXMLvMH89BaJroCPcpqTusUD/1AdnccmwBrCOPdOxyXHhxUPfRijug899BuZKNCUKb2NCNVG4S1foygWR5cgU2nQB1ni5zHdO413uMjKOX/mU1TsOxaWEm5vBzvw2os/htmv/D0SwlZVnthPL2fUuWD2p3jn2ssbPTgtMR7ksCY6ykR9MZA9FH2+zRFdilHgfCN6hoeTIJXNhXUN28VwGEysCzuVHKt32gXW5YoOmsf4q4EIHFzqo64Dv8OBp2fJH5vP7SfIIgUgH5wuCK7aAyclZyep5seZ0swIifoeqC6pdNA4xKiR1t4GSVbMYEWlyDZ/BdvdmCLKodstPzOLLb0JGH8RtRPA2kd1QwOYDzXxYcG4za2wBax+7hQDyoreP8OX5vFsVSiiytkctC/SQGikc6eTnsPQxQvFdu+Ik5vxayOkxWowD6ZOAupCD2I4BLlRY7Xhso9zKmgZ91GbBCrBiIk8QkcZb28RUoscRSLHEtKSqutSUREp0a99A03/lsBQwc80jq+SVkqglsS6J9Ln62ZtW3jEHlOCzK6nmESswKZFLWnitPZYbWwBITBSWu8aMNtyEgU6+Y+xBHCCpphr2NrHRvLjPnu9jmojDEgFxz6SOacUJGId6Xw/WIz3w+9jMAaR2JO8RL2ilk021KLI7+Pwb17bE5FrA2sde4VhEeLj3OKJCGNfHLnN+Vq/IE0SqSOgG7LFVqL/S/uC9z+Looj6jqTrFTD+3J9eS41vrXZneEoh1FyPXSDcJXLeeF+y4jHFyBUqYTPNEwJpTwLsPbd2tR+QGHRLGlUIDpiWqJYFLqn3eIJjrIs4jeBCPE4ezJiaFBy0p5zeN3U1ksBIPweUCfUGwppfOZruyLzlh2zwqguKoUqAuJox30kQjpR6mGxBH1JtamI0BzQ166KiCqjBd6mLPZMWGo5or3o/eSFr/IPLQ41ShmAhDQzK85WKT3U6i6BoLC6dFFtM0squpBKxJkPK6Pz2LpiFnYyDi8OaJhWPDCVo6pCvE3izpgU9D9QjF4DtFsMkR9NMa59hUE0ot4lzghl5vy+/uP1kQ6TcxcsGsIHW2Ht1XjQtlTUDHxGMu4IKnOH3J9+qA80pwMVdrdaDO5QTnELYA4W1nHE57iJSIDzgLkALmOph0EOkQrUeoL86347c6REvEFyAB7xzegfOyJbAP4HuNRMIZEoRIQMQTNwlYxwF10x4xJVQjUfw2l3B9vYPFIc6EU4eeMbW7rax4ROATP/llmD4Xf+6XkKtKQjHChUgnRLwpFGB+vKlGzs+eZYrNTeOXzpqs1cSwfpzgAqLCSDMrsCboPlwroS5IroOs/QpeX2+3/PgBji4+cxKHaD001dQJTlxSwK4+UzKqZqmr7IaZ9VgbZAA72pQBcOZyhxqpSSgigniHSZdT126dC93CIeIxcm5gcgEJDucC1SXlibsPSZY1BI/4gPmASUliNj9kBtE+Ye3i383gUJlB6WPWo9ZuTgUyj12SKH2+k6UUZobWjlQUGRxHW13e46uB1KQtqYHVzRgt26a4QAeN66jC6bXOZpb69NpqdumivhmrP0H3zAN416VXZKZYczEFR5KwVhWk4Ya86PtG0+oOTi1gTVjWFeXjhFij4qAAUUEqyadoKsQB2Mwcw7s/DnHAXPkmEexpV76PA8P1cGYSdF9jZgvLkfoAngWcliTt4n2HZFvzCW3WINS4UOU+gC67WlE6XHdetrxfVXdAZoE+ZjME6eGtgyuKbbKD8pBAANGseEc94PCuYVCuBNdnsAmIrr8ehC6OPmZ9hD7iZjC6uGKrS1jMulxjy0EIHk9AQ8nGJdKE4fFAVffRCCTD+e7kTGDiEmoX7ALJjJE+I+JRsyXH0VW1j/+HF+L0/8Q2/hu1nydoQRVLnHqcerQM1K6kTiWdosNVB89sCWu0gDVFLAtEXvT2EVY8hguKGyZcTDhJuJQoNOIkUaKIj9iF/wrpDXbL0ixHjz4zLKtOc9QDjww6uPPdLeyplj7JOjndxTIrch1/qZeHJsvKdbPsEnpPEM+pXvN9mvcbDXqkNA9pFq17VNUstc2g2sdLseW1xWkBC0TL7NRUIHlwJUJAKECEfn1JE1VXIlJiqURjiaYuQoem0sLFbtbSxSgz47MOSA9nPYpyq2s6fyhADLioWNSsvpfMRsagn2IXdANv9eRznqlNU+XvI/Yxwuk7GNQzk/LH0edHill6QyhQN+Tg4MKWDbcFrCliWWNK/aX+EURqoiTUNSU8gqJlQroRVw6ZXQjow78Do8fp9V/fKMKfVsAyM8FsHksFdeqQZD6D5nExQ6jXO3gxnIu5fpVTNAQzE249LmYmDDdKxOWyxSpjEWmJC13KlJXxzz+TnyMlaIkSkOCzu+ZKkC5CabbkONJ89rlZj1kP6GChBCmIdEnMozIHRR/xJae9N1tqFPiHHaHjEA8SIuIUfKPnSmWj0ne2tOQIwz5mc6Q0Q4zzIAtIOABuxsyEIy/L11HM97P7KjXej3Bhc03W5qDBzwARKYyZhdlnhF1xzOzOdzyfItyEjX4OHzwdyaWovUv5kfLDWcRQZq94SGRZpzXYPrawH5hShh7bOVA9+fdOYYQbBI7XdB8dIHqE6CMS8vs5D7EAnKEIZS8Sq1/E9d5g/+tH38/q6obdshQ4ecf23W5cNvhJXb3L/XzZNu+iOR9wxUOcya2dcFQbvQY4I4DdWYB0FUYVJgmcUjsTEbOVlfx8z48qJAEviAWqmN282jyczrXvm8rs9vFlw0zwDiRBkqwN0iRsjKLIsiKiGBj/ZIPbfiyiSXFqJAfUHqpuLjHTdAk7d6+KvHVcKXTDPv7/JTTkwD5W43zCRIjRb7mWb/9RgdgB60Lqk6JH6VP4rWNw39AjpeJ1iKCYJEsq4zxMM4Q/9h2kTGAllc7Z0pJjdVVsacme9L48RSRBRKL98c0/iFWfoXfqXqQzj/oEPjf7FQUjdx8SFYqwzgtfeWasAzS4WN3h0uud6MpkewikBaxdwpSEnQjP1pu0/ASgt8TdvO71sxRnc45h6OVjZAHCTF5gpRcG938I/6WvpNP9TllcfPvn7Ustb5viwIu6xM/0sVIRdSTrm32kx6k/LTj85SM++3s9fGWo5rJ7eE/JATv73w9yfqNvD3xoyOj+K5HTB/Ao4mcpvc+MadjBDr7EPveLj3N+vcPcgSHrJ58DF3qIOASjSHMgoJ05fP1se/i/PY/1wQy+H9FUsPbIPOJmwIp8UjjrKBcOgRmquWu0v/qL7NHfvpeaQFF2eei2ZxPcQXw5ojPrsLiByRzIdfbgh57D2rlA/3DFxj3PhXoeHwRxs+ACzs9B3TezEm4t4bqahz7pkbMeH3JnC6sKcblUzXie2Me1kyUS4lnb6E/kEH/GufIUmNqfvv9FDAZ/jTMPfD/hc0rdWadTZmYVZhWNuWltxyXqyvGFZ06I/Ls/W2fn5WX2s8nTiiyKNBUHtmPKsU21x8cxiXGc5EjTb+6uh4UbmyJw1VpgvuPprXnqUKCuYE0DaoHCeURLvPO4wpHMIUMhOQ9SoM6DD7gy4MuA0EXPvQDqfm7q6ceph0LSgCmI85gmpHwBlF+G598ibgPBIeYw9ZgFzAWQEu9LjB4igWglHg8Wmo7FAUsBfH4t0sk/E5dThqRApINIQFVw5sAXxPpKnK9yYrHWhGKdWDlSjKj1QPuI1IAhwQGKL0b5pC+AWAl0s1soubSLCJh6vFfEeVIKiEuYFohmdmSaxaASDHCIQSgSmkKOKoSA0wDO4UqhnHF0FiD08jBqgjTKXZtJiTTypAj1ukdEGx4F4iKuMMQ5is4aSXMqThxCHDiEREqG8zVmglbriDtFqgo0KYaBHgI/wnlD60TwD2NIfi9JWHo2RVHlsjlxA+QR6iRYAvEKVhP8EBHN7DpFnK/AImIxd+1xNVYPMBmiKREsp9CbS3nsLBFcRGNCYyK5GpVIrRXmaw7MvwmJX0U1+FVCKsElsAS++aw4IsWIiGF1jbn7sGJIXSfMGSGAuiFajBCpcZaggjRKVAxw9ZA0qFiYj5ypDDkdOT+sWDtkPP9a48JDeeGdbLoMsZq9gmPsoPyX8f9sKgDLzDyn/nCGwxpYP10yulBQ1QFX5DK6g1HBsCoIdcHQ95p0ioJYFTnOYoGYQsNtfU4NsUCSLmJdXChJ1gHXQ+ihro+jAOlgTc6K87lSJQhCwCSgrqAIDhc8Xpq74skq7QSpHmOWoqp4ibicsYv6DdA+SQ1nEVUDi2BgTggh59QJkps9iCGWuxtrNBTL79Vcn4ggTvIJW8aZybVrNMxBEMNSxIvm0jASUHO5CqcIjqYNlwimggsKrkCkwDtQ8bkRqjOceMSEJLnSJyI48STNwXjFNQ5ULmXiJDM2cx7nPME3309sArLOGSF4ip6n7Brdw5KzyjHEImmYqAdCGhijkeWqoCPN4Gv5O6vPPEgcqDpMjZhA64jFilQDkkviOKtR81iEOFJUhOAVsQpcxDBEAr7oUqeQq6GaQxiCi6Cahagx5AatarktmReca+p3ScrdeSRhkpHXUgRRRJteANY0NBEja3BzmClXUDUsCeryvJoUOLTI/MJz6M4fAc0MOhnEJBgKSamjYmqQmhr3mueRjeepyz0gTVIOEyQlxRpjHWxAsgGkCnEJ0hAYoZaTulIyXKoQIuJHoBUuVHSKEcgIsyHmhwSr8D7hOhHnI8EpQSNearSIlBopfc3MzAi+pIIrByKS9jzDak7UBFabzzty8XNvu0suVs49KNzdJMgW85eUtT1vvPCarSh/fHycfca48UWX7AAnbZywLM7ZjnGuaThakHGiMWytX75ZALsKjONuxy7nVjf37+jOH3R81XHDrEBPOHErlDc6+nMlNmes3VPx7FmFKxVuA/7upve9bYc5eBvwkGU1/LZ7usW9Euftkojm1qtuiPLkn81Y5DnxzM2HnEcILCEsA0uM/zNhOSLOLhfhyGtqLK85InCTXbxPxx3cl7/0ieb0158U/BnhZE8I57eOeRxcfPMj80ZaM9Kh/LPrrzLuBvJ/4IXXGMeBG84YtwE3Hmxg+Lg1ccd94hLuQ9tyYmNPzQjLVodZnuw1rT2D9/zPeT9b+8vb/w/6szkInFVolQAAAABJRU5ErkJggg==";

const CULTURAL_INTEL = {
  de: {
    UAE: ["Sehr internationale Geschäftskultur, Englisch ist Geschäftssprache. Dubai/Abu Dhabi sind schnell und abschlussorientiert, sobald Vertrauen besteht.", "Öffentlicher Sektor arbeitet Montag bis Freitag (seit 2022), viele Privatunternehmen behalten flexible Modelle bei."],
    Saudi: ["Formeller und hierarchischer als die VAE; persönliche Beziehungspflege vor Vertragsverhandlung ist entscheidend.", "Vision 2030 treibt schnelle regulatorische Modernisierung, Genehmigungsprozesse können sich dennoch über mehrere Monate ziehen."],
    Qatar: ["Kleiner, eng vernetzter Geschäftskreis; (halb)staatliche Institutionen spielen bei größeren Deals eine überproportionale Rolle.", "Persönliche Empfehlungen und Netzwerke öffnen oft mehr Türen als Kaltakquise."],
    Kuwait: ["Traditionell vorsichtigere, längere Freigabeprozesse als in VAE oder Katar.", "Familiengeführte Konglomerate dominieren große Teile des Privatsektors, Beziehung zur Familie oft wichtiger als zum Einzelkontakt."],
    Bahrain: ["Kleinster und traditionell liberalster Golf Markt, oft Testmarkt für Finanzdienstleistungen in der Region.", "Genehmigungsprozesse gelten als vergleichsweise unbürokratisch."],
    Oman: ["Konservativeres Tempo, langfristiger Vertrauensaufbau wird höher gewichtet als schnelle Abschlüsse.", "Weniger internationalisiert als VAE/Katar, persönliche Präsenz vor Ort zahlt sich aus."]
  },
  en: {
    UAE: ["Highly international business culture, English is the working language. Dubai/Abu Dhabi move fast and are deal oriented once trust is established.", "Public sector works Monday to Friday (since 2022); many private companies keep flexible schedules."],
    Saudi: ["More formal and hierarchical than the UAE; building a personal relationship before negotiating terms is essential.", "Vision 2030 is driving rapid regulatory modernization, though approval processes can still take several months."],
    Qatar: ["Small, tightly networked business circle; (semi)government entities play an outsized role in larger deals.", "Personal referrals and networks often open more doors than cold outreach."],
    Kuwait: ["Traditionally more cautious, longer approval processes than in the UAE or Qatar.", "Family owned conglomerates dominate large parts of the private sector, the relationship to the family often matters more than to an individual contact."],
    Bahrain: ["Smallest and traditionally most liberal Gulf market, often used as a regional testbed for financial services.", "Approval processes are seen as comparatively unbureaucratic."],
    Oman: ["More conservative pace; long term trust building is valued over fast closes.", "Less internationalized than the UAE/Qatar, an in person presence pays off."]
  },
  ar: {
    UAE: ["ثقافة أعمال دولية للغاية، الإنجليزية هي لغة العمل. دبي وأبوظبي سريعتا الوتيرة وتركزان على إتمام الصفقات بمجرد بناء الثقة.", "يعمل القطاع العام من الاثنين إلى الجمعة منذ عام 2022، بينما تحتفظ شركات القطاع الخاص بجداول مرنة."],
    Saudi: ["أكثر رسمية وتراتبية من الإمارات، بناء العلاقة الشخصية قبل التفاوض على الشروط أمر أساسي.", "تدفع رؤية 2030 نحو تحديث تنظيمي سريع، رغم أن إجراءات الموافقة قد تستغرق عدة أشهر."],
    Qatar: ["دائرة أعمال صغيرة ومترابطة بإحكام، تلعب الجهات الحكومية وشبه الحكومية دوراً كبيراً في الصفقات الكبرى.", "التوصيات الشخصية والشبكات غالباً ما تفتح أبواباً أكثر من التواصل المباشر بدون تمهيد."],
    Kuwait: ["إجراءات موافقة تقليدياً أكثر حذراً وأطول مقارنة بالإمارات أو قطر.", "تهيمن التكتلات العائلية على جزء كبير من القطاع الخاص، والعلاقة مع العائلة غالباً أهم من العلاقة مع فرد واحد."],
    Bahrain: ["أصغر أسواق الخليج وأكثرها انفتاحاً تقليدياً، وغالباً ما تُستخدم كسوق تجريبي إقليمي للخدمات المالية.", "تُعتبر إجراءات الموافقة غير بيروقراطية نسبياً."],
    Oman: ["وتيرة أكثر تحفظاً، وبناء الثقة على المدى الطويل يُقدَّر أكثر من إغلاق الصفقات السريعة.", "أقل انفتاحاً دولياً من الإمارات وقطر، والحضور الشخصي في الموقع يؤتي ثماره."]
  }
};
const fontImport = `@keyframes opalPulse { 0%, 100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.35); } }
@keyframes crystalShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
@keyframes crystalSpin { from { transform: rotateY(0deg) rotateX(-14deg); } to { transform: rotateY(360deg) rotateX(-14deg); } }
@keyframes crystalGlow { 0%, 100% { filter: brightness(1) drop-shadow(0 0 18px rgba(200,169,107,0.35)); } 50% { filter: brightness(1.08) drop-shadow(0 0 32px rgba(200,169,107,0.6)); } }
@keyframes archOrbit { 0% { transform: perspective(900px) rotateY(-8deg) rotateX(2deg) translateY(0px); } 50% { transform: perspective(900px) rotateY(8deg) rotateX(-2deg) translateY(-4px); } 100% { transform: perspective(900px) rotateY(-8deg) rotateX(2deg) translateY(0px); } }
@keyframes crystalDrift { from { transform: translateX(-15%); } to { transform: translateX(-55%); } }
@keyframes crystalDriftRev { from { transform: translateX(-55%); } to { transform: translateX(-15%); } }
@keyframes gemFloat { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-22px) rotate(8deg); } }
@keyframes crystalWobble3D { 0% { transform: rotateY(-16deg) rotateX(5deg); } 50% { transform: rotateY(16deg) rotateX(-5deg); } 100% { transform: rotateY(-16deg) rotateX(5deg); } }
.opal-live-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #C8A96B; box-shadow: 0 0 6px 1px rgba(200,169,107,0.9); animation: opalPulse 1.8s ease-in-out infinite; }
.facet-card { clip-path: polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 22px 100%, 0 calc(100% - 22px)); }
.facet-card-sm { clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px)); }

/* ---- Design layer: calm, matte, precise ---- */
:root { --accent: #C8A96B; --accent-soft: #E0C58B; --hair: #242832; }
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
function Crystal3D({ size = 120, color = "#C8A96B", colorLight = "#FFFFFF", spinDuration = 7 }) {
  const facets = 8;
  const radius = size * 0.42;
  const faceWidth = size * 0.44;
  const faceHeight = size * 0.66;
  return (
    <div style={{ width: size, height: size, perspective: size * 6 }}>
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
            border: "1px solid rgba(255,255,255,0.3)"
          }} />;
        })}
      </div>
    </div>
  );
}

/**
 * A large, centered, radially-symmetric crystal "flower" — real 3D
 * (perspective + preserve-3d + translateZ per petal), used as the
 * signature intro/login visual. Petals are arranged with in-plane
 * rotate() around a shared center (the flower silhouette) while the
 * whole flower also spins on Y via the shared crystalSpin keyframe,
 * so it genuinely tilts in 3D rather than just rotating flat.
 */
function CrystalFlower({ size = 260, color = "#C8A96B", colorLight = "#FFFFFF", petalCount = 8, spinDuration = 16 }) {
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
 * The signature hero visual — an 8-point faceted star burst (long
 * cardinal spikes + shorter diagonal spikes), matching the reference
 * "compass star" crystal. Real 3D via perspective + preserve-3d +
 * per-spike translateZ, spinning gently on Y so facets catch light
 * as they turn — not a flat SVG star.
 */
function CrystalStar({ size = 320, color = "#C8A96B", colorLight = "#FFFFFF", spinDuration = 22 }) {
  const longSpikes = 4;
  const shortSpikes = 4;
  const longLen = size * 0.48;
  const shortLen = size * 0.3;
  const spikeWidth = size * 0.1;
  return (
    <div style={{ width: size, height: size, perspective: size * 3.5 }}>
      <div style={{
        width: "100%",
        height: "100%",
        position: "relative",
        transformStyle: "preserve-3d",
        animation: `crystalSpin ${spinDuration}s linear infinite`
      }}>
        {Array.from({ length: longSpikes }).map((_, i) => <div key={`l${i}`} style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: spikeWidth,
          height: longLen,
          marginLeft: -spikeWidth / 2,
          marginTop: -longLen,
          transformOrigin: "50% 100%",
          background: `linear-gradient(180deg, ${colorLight}, ${color})`,
          clipPath: "polygon(50% 0%, 78% 62%, 100% 100%, 0% 100%, 22% 62%)",
          transform: `rotate(${90 * i}deg) translateZ(${i % 2 === 0 ? 16 : -16}px)`,
          border: "1px solid rgba(255,255,255,0.4)",
          opacity: 0.96
        }} />)}
        {Array.from({ length: shortSpikes }).map((_, i) => <div key={`s${i}`} style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: spikeWidth * 0.85,
          height: shortLen,
          marginLeft: -spikeWidth * 0.85 / 2,
          marginTop: -shortLen,
          transformOrigin: "50% 100%",
          background: `linear-gradient(180deg, ${color}, ${colorLight})`,
          clipPath: "polygon(50% 0%, 78% 62%, 100% 100%, 0% 100%, 22% 62%)",
          transform: `rotate(${45 + 90 * i}deg) translateZ(${i % 2 === 0 ? -10 : 10}px)`,
          border: "1px solid rgba(255,255,255,0.3)",
          opacity: 0.88
        }} />)}
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: size * 0.16,
          height: size * 0.16,
          marginLeft: -size * 0.08,
          marginTop: -size * 0.08,
          background: `radial-gradient(circle, #FFFFFF, ${color})`,
          clipPath: "polygon(50% 0%, 100% 38%, 50% 100%, 0% 38%)",
          transform: "translateZ(26px)",
          boxShadow: `0 0 40px ${color}`
        }} />
      </div>
    </div>
  );
}

/**
 * Real photographic crystal, not a CSS shape. A single macro crystal
 * photo (free-license, Unsplash), feathered into a soft circular
 * vignette so it blends into the dark background instead of reading
 * as a pasted rectangle, then colour-graded per tool via CSS filter
 * (warm gold vs. cool teal) so one source photo serves both brands.
 * Gently tilts on hover for a touch of interactivity without the
 * scattered "confetti" clutter of many small drawn shapes.
 */
function CrystalPhoto({ size = 300 }) {
  const small = size <= 100;
  return <div style={{ width: small ? size : Math.round(size * 1.45), maxWidth: "100%", margin: "0 auto" }}>
      <img src={small ? MARK_IMG : CRYSTAL_STAR_GOLD} alt="Gulf States and Europe, Market Entry" style={{ width: "100%", height: "auto", display: "block", objectFit: "contain" }} />
    </div>;
}

/**
 * Individually-positioned floating gem shards drifting slowly up and
 * down at staggered speeds — matching the reference's scattered
 * diamonds around the hero crystal, distinct from the horizontal
 * AmbientCrystalRows used behind list/dashboard content.
 */
function FloatingGems({ colorA = "#C8A96B", colorB = "#527FB8", count = 9 }) {
  const gems = Array.from({ length: count }).map((_, i) => ({
    left: `${(i * 37 + 8) % 92}%`,
    top: `${(i * 53 + 6) % 88}%`,
    size: 14 + i % 4 * 6,
    dur: 7 + i % 5 * 2,
    delay: i * 0.4,
    color: i % 2 === 0 ? colorA : colorB
  }));
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {gems.map((g, i) => <div key={i} style={{
      position: "absolute",
      left: g.left,
      top: g.top,
      width: g.size,
      height: g.size * 1.6,
      background: `linear-gradient(160deg, ${g.color}, transparent)`,
      clipPath: "polygon(50% 0%, 100% 40%, 50% 100%, 0% 40%)",
      opacity: 0.55,
      animation: `gemFloat ${g.dur}s ease-in-out ${g.delay}s infinite`,
      border: "1px solid rgba(255,255,255,0.2)"
    }} />)}
    </div>;
}

/**
 * Same 3D gem, gently self-rotating, sized for inline use next to
 * text (header logo, etc.) — no perspective container needed at this
 * scale, a slow full-element rotateY reads as "spinning crystal" and
 * is far cheaper to render continuously than the full facet rig.
 */
function CrystalMini({ size = 30, color = "#C8A96B" }) {
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
        border: "1px solid rgba(255,255,255,0.35)"
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
    appName: "GCC Market Entry",
    tagline: "Vom Unternehmensprofil zum GCC Markteintrittsplan",
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
    threeMonthReviewBtn: "3-Monats-Review",
    threeMonthReviewDoneBtn: "3 Monats Review ansehen",
    threeMonthReviewTitle: "Drei-Monats-Review",
    threeMonthReviewIntro: "Trage die tatsächliche Performance der ersten drei Monate ein. Als Vergleichsbasis dient ein Viertel der ursprünglichen Jahr 1 Prognose (lineare Annäherung, da das Tool keine eigene Quartalsprognose führt).",
    fieldRevenueActual: "Tatsächlicher Umsatz, 3 Monate (Mio. €)",
    fieldCostsActual: "Tatsächliche Kosten, 3 Monate (Mio. €)",
    fieldNewCustomers: "Neukunden",
    fieldLeads: "Generierte Leads",
    fieldConversionActual: "Conversion Rate (%)",
    fieldReviewNotes: "Notizen (was ist passiert, was war anders als erwartet?)",
    submitReview: "Review auswerten",
    planVsRealityTitle: "Plan vs. Realität",
    expectedLabel: "Erwartet (¼ Jahr 1)",
    actualLabel: "Tatsächlich",
    deviationLabel: "Abweichung",
    statusAboveExpectation: "Deutlich über Plan",
    statusInLine: "Im Rahmen des Plans",
    statusBelowExpectation: "Deutlich unter Plan",
    observationsTitle: "Was auffällt",
    obsLowConversion: "Umsatz liegt unter Plan bei gleichzeitig niedriger Conversion aus den generierten Leads, der Engpass scheint eher im Verkaufsprozess als in der Nachfrage zu liegen.",
    obsNoLeads: "Umsatz liegt unter Plan und es wurden keine Leads erfasst, vor der nächsten Prognose Anpassung zuerst die Lead Generierung prüfen.",
    obsCostOverrun: "Kosten liegen deutlich über Plan, während der Umsatz nicht im gleichen Maß mitgewachsen ist, Kostenkontrolle für die nächsten drei Monate priorisieren.",
    obsAheadOfPlan: "Umsatz liegt über Plan bei planmäßigen Kosten, ein positives Signal, das die nächste Phase eher beschleunigen als bremsen sollte.",
    obsOnTrack: "Umsatz und Kosten bewegen sich beide im Rahmen der ursprünglichen Prognose.",
    obsMixed: "Gemischtes Bild ohne eindeutiges Muster, Notizen unten für Kontext heranziehen.",
    recalibratedForecastTitle: "Angepasste Prognose",
    recalibratedForecastNote: "Einfache, transparente Neuskalierung: die verbleibenden Jahre werden im Verhältnis von tatsächlichem zu erwartetem Quartalsumsatz angepasst. Das ist keine neue Modellrechnung, sondern eine nachvollziehbare Korrektur der bestehenden Prognose.",
    reviewSavedNotice: "Review gespeichert.",
    editReview: "Review bearbeiten",
    culturalIntelTitle: "Geschäftskultur & Verhandlungsstil",
    culturalIntelNote: "Allgemeine Orientierung, kein Ersatz für lokale Beratung im Einzelfall.",
    saveNotice: "Analyse gespeichert im Dashboard.",
    industries: {
      medtech: "MedTech",
      manufacturing: "Maschinenbau",
      software: "Software / SaaS",
      consumer: "Konsumgüter",
      energy: "Erneuerbare Energien",
      finance: "Finanzdienstleistungen",
      logistics: "Logistik"
    },
    strategy: {
      distributorPartner: "Lokaler Distributor + strategischer Partner",
      freeZoneDirect: "Direkter Markteintritt über Free Zone",
      jointVenture: "Joint Venture mit lokalem Partner"
    },
    riskText: {
      market: "Marktnachfrage ist noch nicht validiert, Pilotprojekt empfohlen.",
      competition: "Hohe Wettbewerbsdichte in diesem Segment.",
      regulatory: "Regulatorische Anforderungen (Zulassung, Local Content) können den Zeitplan verzögern.",
      partner: "Geeignete lokale Partner sind begrenzt verfügbar.",
      investment: "Kapitalbedarf für nachhaltige Marktdurchdringung ist hoch."
    },
    nextStepText: {
      nextValidatePilot: "Marktvalidierung via Pilotkunde",
      nextLegalReview: "Rechtsform und Prüfung der Local Content Vorgaben",
      nextPartnerShortlist: "Partnerauswahl (2 bis 3 Kandidaten)",
      nextMarketEntry: "Markteintritt in Zielquartal"
    },
    partnersText: {
      medtech: "Regionale Healthcare Distributoren, Krankenhausgruppen, MedTech Cluster.",
      manufacturing: "Industrielle Zonen (KEZAD, Jubail), lokale EPC Unternehmen.",
      software: "Systemintegratoren, Free Zones und Tech Hubs (DIFC, Qatar Science & Tech Park).",
      consumer: "Retail Ketten, lokale Handelsagenten.",
      energy: "Staatliche Energieversorger, Sovereign Wealth Funds und deren Töchter.",
      finance: "Lokale Banken, Fintech Sandboxes der Zentralbanken.",
      logistics: "Freihafenbetreiber, 3PL Anbieter."
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
    csvPlaceholder: "companyName,industry,product,revenue,budget\nNovaDiagnostics GmbH,medtech,Diagnostikgerät,20,1",
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
    countryFundamentalsTitle: "Länderkennzahlen (echte Daten)",
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
    giiTitle: "GII, Islamic Finance Hinweis",
    giiSubtitle: "Relevant für Finanzierung & Kapitalstruktur im GCC",
    giiBody: "Wenn Investoren oder Partner im Zielmarkt Sharia konforme Strukturen erwarten (kein Riba/Zins, Kopplung an reale Vermögenswerte), sollte das bereits bei der Vertragsgestaltung und der Finanzierung berücksichtigt werden. GII (Gulf Islamic Investments) bezeichnet diesen wachsenden Kapitalpool. Praxisbeispiel: die KT Bank AG in Frankfurt zeigt, dass Sharia konforme Bankstrukturen auch europäisch seitig etabliert sind, das erleichtert die Anschlussfähigkeit an GCC Kapitalgeber.",
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
      stepJurisdiction: "Standortentscheidung: Free Zone vs. Mainland",
      stepCompanyReg: "Firmenregistrierung & Handelslizenz",
      stepBankAccount: "Eröffnung Firmenkonto",
      stepRegulatoryApproval: "Regulatorische Zulassung (z. B. MOH/SFDA)",
      stepInvestorVisa: "Investoren-Visum",
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
    appName: "GCC Market Entry",
    tagline: "From company profile to GCC market entry plan",
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
    threeMonthReviewBtn: "3-Month Review",
    threeMonthReviewDoneBtn: "View Three Month Review",
    threeMonthReviewTitle: "Three Month Review",
    threeMonthReviewIntro: "Enter the actual performance for the first three months. The comparison baseline is a quarter of the original Year 1 forecast (a linear approximation, since the tool does not maintain a separate quarterly forecast).",
    fieldRevenueActual: "Actual Revenue, 3 Months (€M)",
    fieldCostsActual: "Actual Costs, 3 Months (€M)",
    fieldNewCustomers: "New Customers",
    fieldLeads: "Leads Generated",
    fieldConversionActual: "Conversion Rate (%)",
    fieldReviewNotes: "Notes (what happened, what was different than expected?)",
    submitReview: "Evaluate Review",
    planVsRealityTitle: "Plan vs. Reality",
    expectedLabel: "Expected (¼ of Year 1)",
    actualLabel: "Actual",
    deviationLabel: "Deviation",
    statusAboveExpectation: "Well Above Plan",
    statusInLine: "In Line With Plan",
    statusBelowExpectation: "Well Below Plan",
    observationsTitle: "What Stands Out",
    obsLowConversion: "Revenue is below plan while conversion from the leads generated is low, the bottleneck looks more like the sales process than demand.",
    obsNoLeads: "Revenue is below plan and no leads were recorded, check lead generation before adjusting the forecast further.",
    obsCostOverrun: "Costs are well above plan while revenue has not grown to match, prioritize cost control for the next three months.",
    obsAheadOfPlan: "Revenue is above plan with costs on track, a positive signal that should accelerate rather than slow the next phase.",
    obsOnTrack: "Both revenue and costs are moving within the original forecast.",
    obsMixed: "Mixed picture with no clear pattern, use the notes below for context.",
    recalibratedForecastTitle: "Recalibrated Forecast",
    recalibratedForecastNote: "A simple, transparent recalibration: the remaining years are scaled by the ratio of actual to expected quarterly revenue. This is not a new modeling exercise, just a traceable correction to the existing forecast.",
    reviewSavedNotice: "Review saved.",
    editReview: "Edit Review",
    culturalIntelTitle: "Business Culture & Negotiation Style",
    culturalIntelNote: "General orientation, not a substitute for local advice in individual cases.",
    saveNotice: "Analysis saved to dashboard.",
    industries: {
      medtech: "MedTech",
      manufacturing: "Manufacturing",
      software: "Software / SaaS",
      consumer: "Consumer Goods",
      energy: "Renewable Energy",
      finance: "Financial Services",
      logistics: "Logistics"
    },
    strategy: {
      distributorPartner: "Local distributor + strategic partner",
      freeZoneDirect: "Direct market entry via free zone",
      jointVenture: "Joint venture with local partner"
    },
    riskText: {
      market: "Market demand is not yet validated, a pilot project is recommended.",
      competition: "High competitive density in this segment.",
      regulatory: "Regulatory requirements (licensing, local content) may delay the timeline.",
      partner: "Suitable local partners are in limited supply.",
      investment: "Capital requirement for sustained market penetration is high."
    },
    nextStepText: {
      nextValidatePilot: "Market validation via pilot customer",
      nextLegalReview: "Legal structure & local content review",
      nextPartnerShortlist: "Partner shortlisting (2 to 3 candidates)",
      nextMarketEntry: "Market entry in target quarter"
    },
    partnersText: {
      medtech: "Regional healthcare distributors, hospital groups, MedTech clusters.",
      manufacturing: "Industrial zones (KEZAD, Jubail), local EPC contractors.",
      software: "Systems integrators, free zone tech hubs (DIFC, Qatar Science & Tech Park).",
      consumer: "Retail chains, local trading agents.",
      energy: "State utilities, sovereign wealth fund subsidiaries.",
      finance: "Local banks, central bank fintech sandboxes.",
      logistics: "Free port operators, 3PL providers."
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
    csvPlaceholder: "companyName,industry,product,revenue,budget\nNovaDiagnostics GmbH,medtech,Diagnostic Device,20,1",
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
    countryFundamentalsTitle: "Country Fundamentals (Real Data)",
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
    giiTitle: "GII, Islamic Finance Note",
    giiSubtitle: "Relevant for financing & capital structure in the GCC",
    giiBody: "If investors or partners in the target market expect Sharia compliant structures (no riba/interest, transactions tied to real assets), this should be factored into contract and financing planning early. GII (Gulf Islamic Investments) refers to this growing capital pool. Example: KT Bank AG in Frankfurt shows that Sharia compliant banking structures are already established on the European side too, easing compatibility with GCC capital providers.",
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
      stepJurisdiction: "Jurisdiction decision: free zone vs. mainland",
      stepCompanyReg: "Company registration & trade license",
      stepBankAccount: "Corporate bank account opening",
      stepRegulatoryApproval: "Regulatory approval (e.g. MOH/SFDA)",
      stepInvestorVisa: "Investor visa",
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
    appName: "دخول السوق الخليجي",
    tagline: "من ملف الشركة إلى خطة دخول سوق الخليج",
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
    threeMonthReviewBtn: "مراجعة الثلاثة أشهر",
    threeMonthReviewDoneBtn: "عرض مراجعة الثلاثة أشهر",
    threeMonthReviewTitle: "مراجعة الثلاثة أشهر",
    threeMonthReviewIntro: "أدخل الأداء الفعلي للأشهر الثلاثة الأولى. أساس المقارنة هو ربع توقعات السنة الأولى الأصلية (تقريب خطي، لأن الأداة لا تحتفظ بتوقعات ربع سنوية منفصلة).",
    fieldRevenueActual: "الإيرادات الفعلية، 3 أشهر (مليون يورو)",
    fieldCostsActual: "التكاليف الفعلية، 3 أشهر (مليون يورو)",
    fieldNewCustomers: "عملاء جدد",
    fieldLeads: "العملاء المحتملون الذين تم توليدهم",
    fieldConversionActual: "معدل التحويل (%)",
    fieldReviewNotes: "ملاحظات (ماذا حدث، وما الذي كان مختلفاً عن المتوقع؟)",
    submitReview: "تقييم المراجعة",
    planVsRealityTitle: "الخطة مقابل الواقع",
    expectedLabel: "المتوقع (¼ السنة الأولى)",
    actualLabel: "الفعلي",
    deviationLabel: "الانحراف",
    statusAboveExpectation: "أعلى بكثير من الخطة",
    statusInLine: "ضمن حدود الخطة",
    statusBelowExpectation: "أقل بكثير من الخطة",
    observationsTitle: "ما يستحق الانتباه",
    obsLowConversion: "الإيرادات أقل من المخطط بينما التحويل من العملاء المحتملين منخفض، يبدو أن العائق في عملية البيع وليس في الطلب.",
    obsNoLeads: "الإيرادات أقل من المخطط ولم يتم تسجيل أي عملاء محتملين، راجع توليد العملاء المحتملين قبل تعديل التوقعات.",
    obsCostOverrun: "التكاليف أعلى بكثير من المخطط بينما لم تنمُ الإيرادات بنفس القدر، أعطِ الأولوية لضبط التكاليف في الأشهر الثلاثة القادمة.",
    obsAheadOfPlan: "الإيرادات أعلى من المخطط مع تكاليف ضمن الخطة، إشارة إيجابية يجب أن تُسرّع المرحلة التالية لا أن تبطئها.",
    obsOnTrack: "تتحرك الإيرادات والتكاليف كلاهما ضمن التوقعات الأصلية.",
    obsMixed: "صورة مختلطة دون نمط واضح، استخدم الملاحظات أدناه للسياق.",
    recalibratedForecastTitle: "التوقعات المعدّلة",
    recalibratedForecastNote: "إعادة معايرة بسيطة وشفافة: يتم تعديل السنوات المتبقية بنسبة الإيرادات الفعلية إلى المتوقعة ربع سنوياً. هذا ليس نموذجاً جديداً، بل تصحيح قابل للتتبع للتوقعات الحالية.",
    reviewSavedNotice: "تم حفظ المراجعة.",
    editReview: "تعديل المراجعة",
    culturalIntelTitle: "ثقافة الأعمال وأسلوب التفاوض",
    culturalIntelNote: "توجيه عام، وليس بديلاً عن استشارة محلية لكل حالة على حدة.",
    saveNotice: "تم حفظ التحليل في لوحة التحكم.",
    industries: {
      medtech: "التقنية الطبية",
      manufacturing: "الصناعة",
      software: "برمجيات",
      consumer: "سلع استهلاكية",
      energy: "الطاقة المتجددة",
      finance: "الخدمات المالية",
      logistics: "الخدمات اللوجستية"
    },
    strategy: {
      distributorPartner: "موزع محلي + شريك استراتيجي",
      freeZoneDirect: "دخول مباشر عبر منطقة حرة",
      jointVenture: "مشروع مشترك مع شريك محلي"
    },
    riskText: {
      market: "لم يتم التحقق من طلب السوق بعد، يُنصح بمشروع تجريبي.",
      competition: "كثافة تنافسية عالية في هذا القطاع.",
      regulatory: "قد تؤخر المتطلبات التنظيمية (الترخيص، المحتوى المحلي) الجدول الزمني.",
      partner: "توفر شركاء محليين مناسبين محدود.",
      investment: "متطلبات رأس المال لاختراق السوق المستدام مرتفعة."
    },
    nextStepText: {
      nextValidatePilot: "التحقق من السوق عبر عميل تجريبي",
      nextLegalReview: "مراجعة الهيكل القانوني والمحتوى المحلي",
      nextPartnerShortlist: "اختيار شركاء (٢ إلى ٣ مرشحين)",
      nextMarketEntry: "دخول السوق في الربع المستهدف"
    },
    partnersText: {
      medtech: "موزعو الرعاية الصحية الإقليميون، مجموعات المستشفيات، تجمعات التقنية الطبية.",
      manufacturing: "المناطق الصناعية (كيزاد، الجبيل)، مقاولو EPC المحليون.",
      software: "مكاملو الأنظمة، مراكز التقنية في المناطق الحرة (DIFC، حاضنة قطر للعلوم والتقنية).",
      consumer: "سلاسل التجزئة، الوكلاء التجاريون المحليون.",
      energy: "شركات المرافق الحكومية، الشركات التابعة لصناديق الثروة السيادية.",
      finance: "البنوك المحلية، بيئات اختبار التقنية المالية للبنوك المركزية.",
      logistics: "مشغلو الموانئ الحرة، مزودو الخدمات اللوجستية الخارجية."
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
    csvPlaceholder: "companyName,industry,product,revenue,budget\nNovaDiagnostics GmbH,medtech,جهاز تشخيص,20,1",
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
    countryFundamentalsTitle: "المؤشرات الاقتصادية للدول (بيانات حقيقية)",
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
    giiTitle: "GII, ملاحظة حول التمويل الإسلامي",
    giiSubtitle: "مهم لتخطيط التمويل وهيكل رأس المال في دول الخليج",
    giiBody: "إذا كان المستثمرون أو الشركاء في السوق المستهدف يتوقعون هياكل متوافقة مع الشريعة (بدون ربا، وارتباط المعاملات بأصول حقيقية)، ينبغي مراعاة ذلك مبكرًا عند تخطيط العقود والتمويل. يشير مصطلح GII (الاستثمارات الإسلامية الخليجية) إلى مجمع رأس المال المتنامي هذا. مثال عملي: بنك KT في فرانكفورت يوضح أن الهياكل المصرفية المتوافقة مع الشريعة راسخة أيضًا في أوروبا، ما يسهّل التوافق مع مزودي رأس المال الخليجيين.",
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
      stepJurisdiction: "قرار الموقع: منطقة حرة أم البر الرئيسي",
      stepCompanyReg: "تسجيل الشركة والرخصة التجارية",
      stepBankAccount: "فتح حساب مصرفي للشركة",
      stepRegulatoryApproval: "الموافقة التنظيمية (مثل وزارة الصحة/SFDA)",
      stepInvestorVisa: "تأشيرة المستثمر",
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
  UAE: [{
    name: "GTAI, Germany Trade & Invest",
    url: "gtai.de"
  }, {
    name: "Dubai Chamber of Commerce",
    url: "dubaichamber.com"
  }, {
    name: "Deutsche Bundesbank, Kapitalverkehrsstatistik",
    url: "bundesbank.de"
  }],
  Saudi: [{
    name: "GTAI, Germany Trade & Invest",
    url: "gtai.de"
  }, {
    name: "Saudi General Authority for Statistics",
    url: "stats.gov.sa"
  }, {
    name: "Vision 2030 Programmdokumentation",
    url: "vision2030.gov.sa"
  }],
  Qatar: [{
    name: "GTAI, Germany Trade & Invest",
    url: "gtai.de"
  }, {
    name: "Qatar Financial Centre Authority",
    url: "qfc.qa"
  }, {
    name: "Deutsche Bundesbank, Kapitalverkehrsstatistik",
    url: "bundesbank.de"
  }],
  Kuwait: [{
    name: "GTAI, Germany Trade & Invest",
    url: "gtai.de"
  }, {
    name: "Kuwait Direct Investment Promotion Authority (KDIPA)",
    url: "kdipa.gov.kw"
  }, {
    name: "Kuwait Central Statistical Bureau",
    url: "csb.gov.kw"
  }],
  Bahrain: [{
    name: "GTAI, Germany Trade & Invest",
    url: "gtai.de"
  }, {
    name: "Bahrain Economic Development Board (EDB)",
    url: "bahrainedb.com"
  }, {
    name: "Information & eGovernment Authority Bahrain",
    url: "iga.gov.bh"
  }],
  Oman: [{
    name: "GTAI, Germany Trade & Invest",
    url: "gtai.de"
  }, {
    name: "Invest in Oman (Ithraa)",
    url: "investinoman.om"
  }, {
    name: "National Centre for Statistics and Information Oman",
    url: "ncsi.gov.om"
  }]
};

/**
 * Real, client-side PDF text extraction via pdf.js (Mozilla's PDF renderer,
 * runs entirely in the browser, no server call). Reads the actual text layer
 * of the uploaded PDF and looks for the labeled fields used by this tool's
 * company-profile format (COMPANY NAME / INDUSTRY / PRODUCT / ANNUAL REVENUE /
 * EXPANSION BUDGET). This only works on PDFs that have a real text layer
 * (i.e. not a photographed/scanned image without OCR) and that roughly follow
 * this label:value structure — for anything else it returns as much as it
 * could find and leaves the rest for manual entry, rather than inventing data.
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
  medtech: ["medtech", "medical", "diagnostic", "health"],
  manufacturing: ["manufacturing", "maschinenbau", "industrial", "sensor"],
  software: ["software", "saas", "app", "platform", "plattform"],
  consumer: ["consumer", "konsumg", "retail", "fmcg"],
  energy: ["energy", "energie", "solar", "photovoltaik", "renewable"],
  finance: ["finance", "financial", "fintech", "bank"],
  logistics: ["logistics", "logistik", "transport", "supply chain"]
};

const BRAND_LOGO_IMG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnUAAAHNCAYAAAB4ho3RAAEAAElEQVR42uz9ebxlaVXfj7/XevY+59y5qqubhqaZpJmUGRU0jphoNFFE0RhNYjRBBc1PglETUKNG+alBoqLikGicUEQBRdSIGlQCIioz9DzPU413OGc/z1rfP57n3FuNXd01AXXrrrev7bl1u+pUsc6+e3/2Gj4LgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiAIgiD4OOH29ksiCkEQnO9ohCAIgvOeQ9ctRRCCIAhRFwRBsNsZbBJBCIIgRF0QBMFuZ322HEEIgiBEXRAEwW5HLERdEAQh6oIgCHY90xw9dUEQhKgLgiDYzbg/f5mUFiMSQRCEqAuCINjNbOxPGFF+DYIgRF0QBMGu5uhWR/YQdUEQhKgLgiDY1Wz2HSILEYggCELUBUEQ7GbSpMOipy4IghB1QRAEu5sjQ4dLTL8GQRCiLgiCYFczWEJiUCIIghB1QRAEu5u8TyHFmrAgCELUBUEQ7GpSSRC7X4MgCFEXBEGwuzHpcI/p1yAIQtQFQRDsarquR2QcgQiCIERdEATBbsZGPaQ+AhEEQYi6IAiCXX2VW1BcuwhEEAQh6oIgCHb1VU4T4iHqgiAIURcEQbCrsaHDGUUggiAIURcEQbCrr3Jdh4SoC4IgRF0QBMHuJqcRENOvQRCEqAuCINjVdGUCxPRrEAQh6oIgCHY1M51gUX4NgiBEXRAEwe7GWUDo3G9ajWAEQRCiLgiCYNfSraDaw03RVxcEQYi6IAiCXYt1S4gmNu6K/a9BEISoC4Ig2L1XubRAUuHueyYRjCAIQtQFQRDsVlJSUieoxLBEEAQh6oIgCHYv1iMCSaKnLgiCEHVBEAS7liJLIMJ6jp66IAhC1AVBEOxaRqM1VKAMixGMIAhC1AVBEOxWUr9KMcH7GJQIgiBEXRAEwa7FZRkzKNPoqQuCIERdEATBrkXSGHfHLaZfgyAIURcEQbB7r3JphGumhKVJEAQh6oIgCHYxMgacrg9RFwRBiLogCIJdLOpG4KBd9NQFQRCiLgiCYNdiMsYB85h+DYIgRF0QBMFuxP1/raLSgzukKL8GQRCiLgiCYHcyGoP3bfo1yq9BEISoC4Ig2JX4whjXDjeHEqIuCIIQdUEQBLuSTRuRkuKAW/TUBUEQoi4IgmBXMksTVAQRhxB1QRCEqAuCINidHM3LOIJQyPTuf7QcQQmCIERdEATBbsNZRAB3QzXBoeirC4IgRF0QBMHuE3U6wRHcHaNn40gfQQmCIERdEATBrhN1toAgAAiJQ+vRVxcEQYi6IAiC3SfqWAQVEBBN5BIGxEEQhKgLgiDYfaQlVEG1AIkSWyWCIAhRFwRBsPsoeYKotF/1TGOrRBAEIeqCIAh2I4tAquVXSQwleuqCIAhRFwRBsOswFut1zhLuHSUMiIMgCFEXBEGwC0WdLYK0QQkSMw1RFwRBiLogCIJdyAgBBMdJjProqQuCIERdEATBrkN0DCq4GIjiuhBBCYIgRF0QBMHuo1qYiDi4UIhMXRAEIeqCIAh2HSI9giFuuO+IvCAIghB1QRAEu0nU+QhwzKH+v9j9GgRBiLogCIJdh7OAmeMOJUPxyNQFQXDe0kUIgiD4uGstf/saB694GHfcfREiF7JZLiLJQ5i5kDAkZciAH2HQe8jcwz4Osbp2jzz8xdef/F9kY8zq10LB7KQzdd/4dr/w1htYk032W+bA8gIXLnVMlpdYEKHXRG9b2GRMZuBORhwaChvLqxzsl7j9yZ/C0a9ako34tIMgCFEXBMF5IN7+7hIOX/U47jn2VGZ2GYMfgHIhf//3i8AiMroL7e5k8DsxvRcvN1E2b6LbvJnLJvfI8ncfOsN/wAjcUBxzQ/WkRd0vfZbcDdx9f//tGW/3xUfewKWLR3js0gIXS+HifoFnoFx8dJMLktG94zrs217rRyY9h0fK7d2Im0aJa5Yv4cYnP407/7HI0ThDgiA4m0iEIAiCMxdv6ytc9cYns3Hk0xjr0yA9ipk/GtERo35G1jtI3a0Mw6345g2MZn/DEy+7XOSL7/6Y/rsu/413wOQp+HAXR26/Bve/luf8x+/9WP6d/+smX73lr9k/g8ffe5Sn03EpwoUZHuWwPykdhYPjCTdh3IZx62TgI2mFy3k+N71CIrsXBEGIuiAIPi4Czvdxw+88lek9zwF5PKafwiCPYdItsrk5Jdst9P0HKHY5Y/1rnvSQ94h8+b2fkH/r5a/9O+gfC/keDt96Jch75NkvfdknKnbP+xF/8vICz9SOh00mPKJkLht1XDpyOu05VBK398ptatywsI/rVlZ532d+Njd+Vgi9IAhC1AVBcMbC6PY/eAK33PgZLKVPY+AZ0D+VC5aUzo27j2yQpx+mlD+nW/oreeoL/+859W+//LXvhe6RUO7lyK0fwdOH5Nkv+c/n0r/xZf/bH3PsTh6xPuYpeYlP7joe23dclDo0OUeAu2eZW0rh1n6L6y/ZxxXf8zXynjgzgyAIURcEwQMLoYNvfirX3fRp9Po0GD0LSZ/KviVn2Mrce+Qukn2IYfY2hq2/ks982bvO6f8tV7zuQ5g8FPwQh2/+IJKulme/5DvO5X/zc3/Rl7iTT3roBTxzccwzRhMeQ+ai1LGiA0WVu3XMFSlxjTjXPfRhXHvZ07n+S5fkcJy9QRCiLgiCvSzi1n/j8dxw1+PYSp+JLnweo9GzWLsgoe4cuucYG8fez3j0u+xbeZtc+i8/sGv+d/mNK1z513+PyQVghzh88wdAbpbnvPTbdtPn88r3++qxG3nE+lE+9cgxnplGPK5f5ACJpWEDo+eYGXepccXCAn97YMSHvvqfcd1lUbINghB1QRCc5yLO37bK+/7+6ZA+lzT5R/TjZ7G4ssJokjhyeMrm5pUs9n/I0vgvediz/l7ksrt35//OP3ooVx17N8UWEDvM4Zs+gHCXfPp3vXA3f35f9dP+5MVlnpqUZ4xGXIbyyNmMMYaNEluLI4YR3Jw6/lacv544V33PV8rtceYHQYi6IAjOByG3/upHcU3+PGz8XFL/qfSLj2b/vkWGYkyPHmZr6++Q7q1c+PC3ykP+8XnRr+XHfvtx3J7ewVAE9SMcuvH9iB3m0/7Ri0Q+67zIYj37N/0hnzTw7HHhM/oFnpASF/UwshmiHaNRxzBKHLKBazrjnatj/uq7v1yui5+IIAhRFwTBbhI117z22Qwbn0WXPocZT6EbX8rKiuAmHD12GJd3wOgNPOEhfynyOdecd//7D77hqRzUv2AYDJEjHL7p/dhsk09/yLeJfMPd59v/3m99rV+ytcmnrS3x2SSe7Im12RaGQD8iLY2hV46ZccOC8q7HHOCvv+bZ8v74SQmCEHVBEJyLQua6X3gaU/3n+OS5IE+h75YZjZRcEiVvMsvvI5Xf47InvlG6Z19zXsfi0B9+GgfLnzIMBhzm6M0foGzM+JTV75ClU9hKsUsF3rjnC6YDz6XjsaqkVBARZNSxuNDTJ+FYnnF5Et7+kMTbvuXL5Mr4CQqCEHVBEHwixcsNf/AEjhz6EhJfjuiTGXdLaBI6lJwh2w106bdZvPS35SGf+d49E5c7/vDz2ZI3MxsK+BGO3vJ+hqPw6NXvkotf9KG9EocX/oJ/gXZ80dIKn6IdFychMbBuRknKSkos4hwumQ/3zp989gX86Rd+odwVP1lBEKIuCIKPh2Dxqy/kqr/8Uqb919CNn8OoV8gKCF56PB+jyNtx+XWe+Mw/EXniwT0Xo5v/4Hn4+LeYzgaEIxy96f3MjiYu7r9HHvWSd++1eLz6vX7h+97Dc/uOL1oc8aTRiMVc2MwZcmGxUyaThCe4vcBfuvLmH3mBvDt+2oIgRF0QBGddyPki1/zqP+VY/momk89iYXGFrUEoGcaj+rO8uXEDZfgdRhf9qjzpy67d0/G67g3/mtHaL7I5HVCOcuTm9zIcGrHAD8qTv+sv93JsvvHH/alLB/jqxSU+R3su3JqyNWQGK6BKP+pYGI/Y8MwHh463fO7zecuXiazHT2EQhKgLguBMxMldv/Es7rUvB30+XXoMYsKRjQFTZ2myAGwy3Xon5P8tT/2m10XEWtyuff23MDnwk2xuzcCOcvTm9zIcHtPPfkSe/r1vjQjBv/8d379/g68aLfL8QXnk1pTZLDMdHE/CuDNWF5eZeeGWvMWfLS3y+le8QK6JyAXBuUkXIQiCc1CQ+Fv3c90dX0Lpvo7D6TOY6ITpNHP02BaiynhhQpKDbB75TYbDvyCf+t2xNuofPrMuodoeXB1EHDGh2CRiU/mfL5CDwC8Av/CS1/qXaOLr15Z54tQYNgc2t6ZsTteZ9B0PX+j4hpx5wXf8ln+gDLz+J/61/GFEMAhC1AVBcCIxd/VvPAvjX3Hlvf+cfuExTLSwvjVj0zZImhhPlvB8Azr7TR5+4Fdl6WuvjaidgOIrIAIO7oA5jiAyjuD8Q37ia+UPgT/8T7/lnzsZ8a9GizxjNqbb2sI9M92CZM6kVz5zcYFPe/nv+AuHKb938aW8+Ts+V+6JCAZBiLogCAC/6Xe+mCkvZtx/DokltgZjNmwyaKabJDpdwfJV+NYv8vgnvlbkOXdG1B40qku1wcQF3DB3XJzMQsTmxLzya+QvgL94xe/5px0a+Pep43O8Q4sxRcgFSgZN8MSFRZ5071382+99vf+fR67yuhd+kcRDRhCEqAuCPSo7bvmdF7CpL8X6p7M4dgYbyHYQVyd1EyTvw6dXkuRneeynvlbksWE1cdLYYn0xwByk4BiJUcTmwXnZ8+TdwLtf9Ev+Bann28YTnoGyKTB1sGIM0wEXuFCFf3vjOl/28t/1//PIxK98c2ytCIIQdUGwZ8TcTb/x1Wzot7PFp9J5YWtzYJhltC+YdvRpP9gdTKc/xuMu+nmRLwwxd8qazpeOK71WYSc4xaP8egq85hvlz179dn/nlZfzzydrvLAf81h3jrkzw5EyUAwGySx2wr+4yfjC//I6/5Nl4Vdf/tWRuQuCEHVBcL6KuRt/+xvZmL2QrfRkOk1sbQ4kHbACpiMmtgzlCFN7NQ/f91Oy9HVXR9ROF2ll1tZPhzngaOojNqfGf/gs2QB++6/X/S2/92aex4Rv6TouGQr3WsKl0LtRCqyLsTBKvGDW809e+lr/P9fdxS+98dvl5ohiEISoC4LdL+R8fZGr3vhvsPJCZltPRM3ZnBZSGkgK5omFpVW8rHPk4C9zgbxSHvHCD0fkzhRdxA3cFPdahnUHj/Lr6fKcJVkHXvudr/W3HZ7yjQsrfE03Ig2ZQ+4gioqQN42pbDFZ7viapzyCL3rE6/wNd4z4xdc9X45EFIPgY/goGyEIgo+hoLv217+FIi/C7LF4gdmQESmIONrDeGEZd2Nr/Q9Z6X5UHvWvw8H/bMX+6t/5c5b2fTZHjwyU4S42bv9byvoyOf+VfOb3/VBE6Mz5ll/2Jy2MePF4zD82mObMMSCpIuZInjLqE93iCloyhw5u8Duv+VfyPyJyQRCiLgh2j6C45bX/nnX5FkQeD8WYDgPJDXCyC/14TEoLbB3+v6xtfb888tv/OqJ2lj+Da97wNyyuPIOjxwZsdicbt7+b2bFVsHfLc773eyJCZ48X/5b/kw6+tU98sjiHZoVBEyqOWqbTjjRKpAmMs3HtsQ1+9if/rfx+RC4IQtQFwbkrJO74va/l2OxbyPZ0lETOW0ie4QKzQXAZkVill/ezMvpBefjXvSmi9rESdW/6EAtLj2N9PWPT29m47W8Z1tfA3i+f/r3fGRE6u7zsel8+9Fd83fKEr5XEvqGwPgykLtGNEuqZ1AmkRD8akR3etTXwM6/4Sgnj7CA4S0RPXRCcDQFx2x98CVvTl7JRnoMmwT1jZYukBe+dIoV+vB8tR0gbP8Jlz3qNyDOORuQ+ps+si9XJpJrV4QDiSBfTrx8DXvFoOQb8/P/v9f6Xo4FvXUx87ixRDKYCnSSSK7gyy4WuVz5v3xLPfuVb/fceucarv/rT5Y6IYhCc4VUvQhAEZyDm7njTkzm09QOMui/Euw5nhpjVYUszcs5AR9dNwN7E4x76vSKfGzYPH+vPxX2Z6/7gKvr+AqYzo2zewsadf0deXyXJ9fLM735RROljyw+/yb9iK/MtWXiMCketoKok7SA5khKSEt04MSqFu46s80s/9FXycxG5IDh9NEIQBKcjGv78Av/Ar/0ox2ZvYzT+MgZXYIqmAp2DOiU52h9g3B1lefRCefy/+LoQdB8vNhYQmVSPunaZEwHEIaZfPx68/MvlDRvwos11/jgJS5MxY01kAaRrez6cPMtMS+GS1WV+4Id/39/80p/zz4roBcHpEZm6IDhVQXfV7/47JuPvQLvHsblVwAekM1SsWqJZRqUnsYZt/h6PXvxukX9+RUTu4ym6r3wEN1z9YcRHZDGGo7ewceffM2wsM9K75Bnf+fURpY8f3/0b/i/Hi3xLN+YRYhw1Q0XoEkACMiOBvu9ZVOfY0Q1e976H8oo3fpYcjugFwckTmbogOFmhcOMbn+3XvuGvWFn+GWT0aGY2RUczdOykpDiKmTBKF9JLoQz/iUc/82tD0H1CPq0xSRQRR4RqISN1o4RL9BJ/nPnRr5PfvPdOvvXIYf4MWO4TPY6nROqE1PWYdgzuHAMWDqzxws8+xu9/26/7P43oBUGIuiA4e/Jg/W2rfsXrf5J+8oeMJ89hOiuYzej7GZLAXRkGx0rPpFsjb/4lk9E/k0/6ih8XuWwjIvgJYOPoGFEBvJVdwV3q2jDr3K9ejCB9fPnpb5YPfuRqXnrobn48CZvLCyyKYTiignaCKJCEzSGz0Sc+5ZMv4Ve+93f8p/hR3xcRDIIQdUFwZoLuqt/4Ru5ZfxdLa9/KzJbJtgldhqTk3EMRILO0tEDvyrE7/v885mlfIRd9YfjOfUJF3bFFBMUREMERFBB1kia4PVaFfQJ4y/fK0R//t/KzH7qe/3JwnWtXV1kY9+QCqCJdh2sPXUcW4Vgy5NH7+YYfewJ/9sKf9a+MCAZBiLogOHUxd91bnuaXv+GtLF34M+joMZSyhTAFBTPFs1IAvNDZGuuH30Ov/1ye+A0vE3ncPRHBTzDrRxdqdg4HAXHHkJqtkw5unUSQPnH86ovlj8uYf3dwkzclYWnsqDuDgFtp5jMgxdmaZjZWl3ji05/Ia175Fn/Nd/6aXxoRDIIQdUFwcoLug6//ISbyVpZGz2VrJuTpgBWjuFCKQhGGoWAu2LCCbfwclz3qy+SSL/vTiN65giyjCrX86oha/bY4yIhbDoeo+wTzii+W6172RfLtt9/L/0CYjRKTksnmiBUwMFfwjsGEo2KMVpf4+sdewh/91O/510YEgyBEXRCcWMxd+5bn+E2//w4uXPkutob9zKYzJGesCF4UyyA4gxVUxixSWB29RB7zL14k8qm3RwTPIUzXkPl0f3UfprXYoZrYnIaoO0f44a+W/3HLXfzn6cCdo44L1Nly8FLQ4riDi5I1seHOMe155MJ+fvpn/tx/4lXX+3JEMAhC1AXBfQXdB974/Syl3yd1n8HmloPNqkWJCG5Se+eKMkwL47TK8vhWDiz9S7noS14d0TsXyWtIUqQDUZAkqNYDenwIUXcO8cp/LW+8/l5efGjKu0c9F3bKYF6HKNxxExylSGKKcATBFkb8u4Xref23/7I/LSIYBCHqggD/wG883i//nT/hoqX/wla5gOkwRTUjyragE8AcYMbywhpjfQcXPep5MvncP4wInqtXtjRBU+2nQwQRcBRUMOlRCQPic4yf/lfyN++/ihfdfZjfTSMumIzBIaOIG+LWfgwdxNkshc3VBf7Rs57Ir//A66McGwQh6oK9Leg+8htfz4G1P2H/6j9hc6oIM1JfkNSEAJASuGb6xcxkeR+z2S9z8RO/XOQJH4gIntMsIU3MiVTbGXNFULTr8BT7X89Bfvulcv0f3cR/vvp2fn6WWekSS2Zk1Sro2hZfDHBhNh1YH4245CmP5ZU//Vb/0YhgEKIuCPaamPP3rPi1v/dT7H/oT2LpUUxnM/rxDO0N7RxSdczSHrIX+n6Bydjo7CXy6Od/o8hj74oonuOYraAC6t466wT3hLvinpgOCxGkc5N3vkQOvupr5OW338b3a2G63LMkxhRIVpB5ti4p5o5vbrF5bMroYQf45t94l7/pxa/zJ0YUgxB1QbAXBN2h130619/4B4y7FzM9ukweNtHRgKg3PzNlvpwye2HtokVGkxtY0xfIxV/8kxHBXYLYGqkD0WZpW31tQQWRjqmtRpDObX7k38hP/92VfNc96xwZ91yAsYWgUj9Vb1K9mKMGw1amTDq+8B9/Er/5qj/xr4gIBiHqguB8FnS3vuVFbK6+jq77LDID2m/RjQuo057+aUsHwDL7V5fJh/+Ciy/4Mpl83p9FBHfVpW2ZbiSQBDpBOqkbJlQR7dAUU5O7gP/5rfJbV9/Cfzw6cP3KIhdMElsp4Um3xV3qBe2FlBzzwlbX8fjHP5SfetN7/GURwSBEXRCcb2LOL9/v177+NxFeySxfitkWUPAEc9cLl7ptAHcKmX0rK+T11/NQ+XqRp38korjLEBlXQTdvqqOKOm1lWE0rEaTdwS+8UN78/67hP91ymA+MOi6aJLIq3gn9SNBRQkaC9Ir0HebGTIz9SyNe9pb3+6/9wLt8f0QxCFEXBOeDoLv8tz6Nmy//Y8bjr2Fr2oNNAceL4kWwQbGsWE6UQVEvXLC4wmz6y1z0zBeJfPFNEcXd+MHbCBFHxZGWh20rYOsAhYalyS7it79J/uzvr+flNx/lHZ1yYCzQJ7zv6PqEjsfQd0hK6HiEp8S0GCyO+RfPWeX1r/wT/5SIYhCiLgh28339A7/5dexb+220+3SGsklKUxAwazXWIpgpFCXn2lS/OFkhz36CA1/wbSIPjXVfuxXRcdseMT8bdrJ1iGAeom6X8foXyV/+0Xv5wcvv5q+ScOE41UbJviP1dW+s9B2SOjQlUurI5kwXR3zusx7Db/zMn/oXRRSDEHVBsBsF3Qd/64fZf+BnmNojmeVN6BxPAgJJ6uoop1bmhuwsdLAwWcSm3ycH/vF/FJGNiOKuZlxNo32+77XNSqigCUgh6nYhb/tu+X9/+n5+8Jpj/J+uY208antila7TWmAXR5MgSUkqeC5sjUd8yjMu42d++W3+ryKKQYi6INgtYs7XV/3KN/wG+/Z/J2VYpuRZm5WrVhYqID1o73RjI0tmYRn6hQnKS+XCL/xvEcXz4USwRUpp2bl5a53K9rmgEj51u5S3v0ze9YZ38iMfuJ2/NOMCESgGpdC5tWVwrehuQgIkz9gadTzySY/ix3/1L/ylEcUgRF0QnOv38fW/fCy3vf0NTMZfS94oMGzWrIzOb+qOpYSJ4iSyw9JCoh8vMB6/RC74/P8RUTxPEBlve9S1pRKogtYTAQnz4d3M33yv/PVb/45XXHcvf9ULK51SzHF3JDtqXj/9BKiiJGQ6Y5YSBz7lk/iBN/6tx8NbEKIuCM5ZQXfD730ex+x3wb6AsrVJoWCigIH7/FaPOwjKYDAaKwtLCyyuvFRWnx0edOfVCSEjss3dzKqg17YHVhM4SxGk3c3bvkf+4rVv4wfeext/o8IFKZGLI8j2OIxKLcO6CoqigzPTxPKjLuE7f/9d/lMRxSBEXRCca/fv6//8G1hc+2Xy9MnMZusgpS1uBy9gBu6OWc3cDNlYXigsryww6V8qS0+LDN35hmiPOVibfbV2uZMeJIFI9NSdB/zND8n//b/v5wdvPMi7FiesTHpmveB9B121mkarlbjM3QqHzJYa/SMv5cX/9wr/pYhiEKIuCM4VQXfrn303C/YqZhuPIG9tgDkughe2O2s0GZIM7Y3ihcXFGQsrS/TyXTJ+Zgi68/LKpgn36jvoXjN18yydIJifVvn11eu+GME9t/g/r+Kv/vg9vOqmQ3xodYHVccfQV4NiSVqL7iqQwBN4J1hxNt3J+5f4hrdd4b/13B/2yNwGIeqC4BMq6K5+0/ch5fuYbS4zm25gJpgrzC1LTPB24IIVmIxnrOxbI/X/VRae9d8jiufrySE9VmB7VQiQEoDUTqvTy9Tddhcawu4c43bZeP1rees7PsjPHtzi+qVFVpKQk9Z2Sq+Pd5i3gQqDwWBzYLoxY3My5iv/8/P5X895nYchdRCiLgg+Iffsa970Y4zH/4Wt9TGzYQtXxaWezyI1G4MIboqXRBkSIgMXXbifMvyULD39ByOK5/MJwhj3nbVvKl73vqq00vzEff2Uxdnhnm6I6+a5xzvl4Ovewe//yXv5pUObHFxeZLEUMiAObuDF8cHxacG3prA1IBuZ6caUzX7EV3z3E/nlz3+1r0UwgxB1QfDxvF9f/qafoBu9hDxLoJtor6i2Vd/zrVAKCGjnaGd0400uuWQfxX5O1p797RHF8xyhw/wffhcVXKS2WW07E580m9fRrZ/Gnws+9tz9C3L7z72J3/6zD/DLW4X1lSW6Yszc8ZxhlvHZgM8GbJaxoWBDRtZnDMc22Foa8WXf/Bx+8XE/Gxm7IERdEHx8BN2Nb34Nk9G31gkIpmgnzVTWkc5JE0PH9bUb168Zb/HIy/Zh/a8yfsZ3RRTP83PE19dQ7bbNpavIr4JORHAElx6u6075gtmhfjCum+cqR39Lrnr17/Lrb34fbzq0jqYRsjXUUalcZ6ZsKHix+utcoBR0yAzTGZsry/zzH/40fuEZkbELQtQFwcf4Zn3DH/wv0G9E8xQtm3Rq1a3E2807tRm3UTMYHoGngUsfvR8f/TbjT36piByNSJ7v3LSMpJ55M932ujARiidKUZweZqcu6qbolkSm7lzm0K/L+//nH/Ar77uZP5WBPikUw8wgFwRrn9/80lHvhDJkZtMtppMRz/v2Z/Hz/+a/RcYu2H10EYLgnBdzx75uH3e+4OcRvhyfTTEykhRxQcRg7k3VVkKJgCah5MzDHr+G+Z+THvmdIhK7XPcEs0VSSojajuJH6vnSeufFerijP9V3TvfSzzYYIsbnNre8Rv7vrz/K9y8usu/JB3j6+gxzR9wQpJoUQ+u6VEwdiqLFGIohiz1f+VnPxn4VvjaiGewmIlMXnNuCbv1fLnHn838R1a/Ahk1KyRRLlKxkAyvt0uxg8z2fKEMxLn70Imrvp197iYjcGNHcK+QJOhIQr3oOgDoZLSg4qCi33rFwqu+8OdCzGdfN3cC73sWf/fGV/NrVd3EzMFbFtF4hHMfFQX1npRhez4whM5TC+soqz//5v/BfiEgGIeqC4Gxx51f9HNo/D8/rWMlVtJkjZtWkoJkKg+NWNwaYFy7+pJ40vou08h9E9n8gArmH2MirdF3bHtIGZiTN87ltHFZGbA2nLOpmhV6O0EeQdwFvlMNv/TB/9I4bed1dx7gdSCilFeXdvGXqfPux0LEq78zZdFhfm/DVr/kr/7EIZhCiLgjOEL/qN38a868mTzfJuVAstR46r63P5lhzoMpZEHGGwdl3sdAlIdlLRC78y4jkXhN15QAp1UzdvP1tvgXWPAEgjPD+lEWdZsY5kyLIu4NDr5Ab/urveMN7rudPDm9xUJzOCjkXvDhWCp4LXjJuBTfbtj+RwdjKxmxtzL/58bf490c0gxB1QXC6gu4jv/QjiH49ZTrFhoybIG07wLZThYObUIq2Tiln9aLCytoCOny3yKN/KyK5F0+esoaqbE+/Mp+AbcKuDk50zMopb5UYJUalhKjbTbz/R+W9f/YRfvPvb+Qdx2ZsApqNXBwf6vSrW83QFaOKOwRz0Flhaobs38eLv+91/j0RzSBEXRCc6j35fb/wX0iLL8aKoUxBBNXte3KzqZi3OguSHBT6pcKFFy+ztfGTki57VURyj5KH5Vpu1XpeqDpJARU0tclHSeTZqa8KS/RbR6P8utt49/fJn7/rcl5/1R28Z2ZkVcgZM6tlWGtedmJYUmz7aiOkWWFKobv0YfyH//Ir/q0RzSBEXRCcrKC7+pdezPK+l9bWZZ9B19Y6seM5NreocBE0QT+CtDjw8Mes4uXXWXjiyyKSexjRCSL3vbbNzx1v5dekoKcuzramjD2FqNuNfOha/vztV/AH197N1cXoRPCkmGhbOqLzZTT1UKkCTwQpxkaXGD3iEfynF/2if11EMwhRFwQPJuiu/d9fi668DBt61NcR9ba31XHmc2qtlVlAtHbADG489FGrDP4O5NEvF5GNiOZePpF8jGDtF3NVV4+dSUclp1MWZ2WgL0NYQe1Gbvt5uefdV/Anf389f3pwnVs7ocfrIrku4c3jRNopY+2x0VVAEz7MWO+UfY9/FN/9LT/tnxsRDULUBcGJ7sNX/uyXweSHGaZruG1ipLrOqRkNSNvI7bZjYVKKghQufMyEIjfSL/3HsC4JcF3c3gNcb9Kyk4NRqUYWInh3yuVXcXqVyNTtWmH3s3L5X13BH7/jJt5+dOBoP0LdKXMp164sGNBKsl6Mkh3PkAfn8GTEJZdewg983k/4YyOiQYi6IPjoe/CHXvP56PKPUfIB3I5VO1DTKuCaXcn82DYfMMGLsf/hUIqh9lKRi/4mohkgLOJu25PSgiPqSHK0q08IgiI+OQ1RN5Iwbd/VzB7Fe95+OX/497fwdxuFLVEkZzwbXhzPhVJKnYwtRsmFko2cCzYrDJtbHJ1MeMrnP4YfjGgGIeqC4HhBd8V/fwrdwqvI/nBKPrK9gMnNt33oqtGAIaWVYEstkIyWYWFxH8l/UCaPe2NEM6jnDkvb3oV1JhpQbwMTTkpWByb6UxZ15nQ+xPTrbub2/yAbt97C//ubj/CWD97B1dNM8gLFKCVjhSrkBqMMhk0HfMhYLpSS8cGYFuPg0pjP/uE3+8sjokGIuiAA3F+6Rln7cZzHUmaHMINSBBscL4ZlpwyOZcfa9u3cNjRJZ1x86T7K1mtl39N+JKIZbCO6XLN0x38PQKWaESfwJEh3yj51bnTMovy62zn2S3L3NXfyZ393DW+95h7unBb6WaHMCmU64NOCTwdsltvR/tssY4Nhg7O5ucXUjK//9tf6CyKiQYi6IPjQk34I6T+VMhyuO1wdsExVdzVDx/GmA+6kBJ7gokuXSd0HWf7k741ABvdVXqzUHJ3XfcDVm65tlUhsm1WonFKm7jmv85WUSN5Fpu584I6fkuuvuY23vPcm3nrnBncBDM5scPKQsaHUww2zguEUq/trvNR6wSaCXLSPb/vsH/VnRESDEHXB3r3vfvjV30nqX0CZHWte7oCV2gtFwT3jzWwYrzpvfsquHhjRTwpaXi6ydG1EM7jvyWVLdWVc+7XUdcB0fe2pS31BE0g6JVG3fDe9CKKy/c7BLueqV8j73nclb37/Tbxr0zmmis1m5HnptfXVmdfHSkQxpI3hCOrK5qjjYZ/1WF7OV/v+iGgQoi7Ye/fcK171JaSlb6ZsOe65+ri7t1ewUrMs7nUMzVtmRTplvKIcOLBMnr1S+qf9fkQz+AckGc9nXncOAel2snXaOSqnVH59mJLSQOo9rpvnE9ce42/e/UH+7IM3cZU5ooqZYd62SyPV9kSrlJckdYY6JcSNbjZg+xb41G/9Un4gohmEqAv2lqC77b8/Ht/3cnxQ1I7UwQevO1xFaom1Wk44IoWkdXJRe5BeuOjh+zm29X9YfdJPRDSDEzCuUk4FUrUzcRWkA1J1JkMd70an8qZDT0+POlF+Pa/4BTl2w3W88/3X8M67jnJr36MqDEnJnZLnzwStG3P7rOoUTwrF8NmM4WFrfOnX/by/NAIahKgL9g6HV19BmV1KzpuoGpoKIoZiiNcJRaEKOxFQNVIC7RMXP2qRwk3sW3u5yNI9EczgfjEWqj+dKnjb+NQ0nqZafk1dQdMp+dR1HZ0mxD1E3fnG9Pfkmutu5R1/fzMfOLrF1rhHXSkGOvevFoGkeBN2tWFTKSiWlakL+ZEH+PfP+yH/0ohoEKIuOO/xK37mxzD5VMpsAyMxeFf383QF7RxvGTqoL9KBKGjfsXTBCE0T3P6ryJP+LqIZPMBVbaH1Yu70vok4jED7nWEbOTVLk6NGj9B5+NSdn8LuAO+79hbefd29XONC6hVXwUTxlCjShJyDt9Js7fwt1XtpKGyNEpNHPpr/9Ozv80dHRIMQdcH5K+iufPW3wPj52LCFd6AqSKrZuLnbvzQvsZq9c8QN6RRGiYsuXmZj83/L6rN+OaIZPCCiK22w5jhRp0Y/KUhq1VMF5FR96pIJmjSum+cjB18hR6b38O4rr+c9tx3lDoNJNorVGgJmeCl4Lng2LBd8MNzrQEW1OjGOrSzyiGc+iu+PiAYh6oLzU9B94Ec/m2H0ImYzwzFEBNK8qLH921qZY/5qIE7OHRc8ZIHN9au5+NJXRDSDBzzX3BfRbgythD+fnkZqgk3HRhob2hfk1Mqvkyl9crroqTt/ufrn5CM33sxfX3ET7zk6ZQtIg5PnYm7WBF1xSi51oKI4VgwvGcyxPLC5sMRzX/zr0V8XhKgLzreb7N98ycX40veQh2XM806WhGY1IY6otdVNczuTOjDhIiyvdSgTpus/JPLoqyKiwYPQAwlXqzY5Tc8JkMZOGhnd2NDeSP0pibq0wKSDVHKYD5/PjBPvufIm3nX9nVxuIDglN486p/rWecHN6q/L/IolrTQrDCpsTcZ8w5e+xj8nIhqEqAvOHybPfRmqlyG2CW1ttshxd9v5Mte2er26xpZqZaJj9l24n0NHf10e8gW/EsEMToIOF73PzmCROkHdLxq6YDCCNDFkfEqWJmXK2AT1Epm685nLf1ruPXyUv73mLt551zq3Ar0Z2ZxSqqOmFac4dYGhCFmgiJPdKQhZhaNqjC5Z4aX7X+mrEdUgRF2w6/H3v+Lf0q9+EZRNpDOSFARD3MCt7XSte149z9eB1RVh0imrF6ywMb2ORz36+yOawcmxMa7XNbP6rGBAARenWzT6xUJaKHQLGdVTGnhIPSMBleipO++5+TVy9R138bfX3sMHjmWmKZFQiiTqA6mjIi1rV4cmSnPazAbZnJk7B5cmPO7LLuJFEdEgRF2wuwXdB172FEYXfQNDLpgUXKvvXBV0TlNzYKV2pbTLY8mGo3TjBWS0iA0/IPLEayKiwclx44RUNd3OKdY20HULhfHywGR1xmhpRjc6pc0QXWaCo12KjRJ74uZ4Fx+5+Vb+9rYjXOetymDWxJtjZjjSzjTDi2O51GNW8OzkMmNz3yL/7Kk/58+OiAYh6oLdi130nyn5AOJboDU7Z63EKhhCu+Myz9pVoScd0E3Yf+AAZfg9edgXRtk1OAWGRUS0biVpKwHcHe3LxhYj+qXCaC0zWhnoF8Tdl07hajlCwS3Kr3uBy39F7r3tIH93/UH+9p51DmcnDQNW2nBErntgrRhmYN6EXslYgTwYNjOOSaH/5J5v51+ewrkWBCHqgnMF//sfewn90lOwvIVQENod1h3zQmnFCtpABPOSrBraJVYOLEM6zMWTH45oBqfEui4hIojX8qsXoEAalYObTI5sMd4qSRnvn9IvKZz80IN3jFyQAt3r3Rcj2Oc/t71arrj9Xt514z18eOpsoJRs5FyvYDlbWykGpT22GrUs6+6YQBlmbFyYeMKXfzbfFBENQtQFu0vQXfGKZ7Ow/ysptoGnAWsTrVCoDU62XYI1nw9GAOpoSujCAqPF/eT8kzL+vHdHRINTw5YQhFIEL7X0agYmHBsYH27CbmNKT7csnKQ9yTe+2de8MBKvgxJ33RTZur3C6OG89+Z7eOcdR7hFFPdCNiM3K5OaqSs1Uzc/5lso3FFRCsb6JWv8sy/47/5pEdEgRF2wOwTdjf9xhWH12yl5hOQBim3fVd2dYoa7sK3k2rZ1SXW3a+oSK8sHmE3fy8Me8T8josEpM5uuICLNfNihnYLa+/oWk2Mz+qMzRoe2GDHZVzjJTF0vdAl6EcQULTEssWf4wDfLoYOHePfNd/GBYwOHpbZslqE0QVfLsF7a2JfX7cKGVJsTAxmUKYXRw/bxLRHRIERdsDu46xHfDPpYLG/WPrlqTLLdsC5Sb7LV1qRqOlWrwk46dLRCLomJ/jeRJ90aAQ1OGdElEEHF588MYKCdbw6Mp5l+a0Z/bEZ/dMoCJ7nyqzvCeKT0SfDkIer2Gle+Uq64627+9tZjXDeD4o5bNR92r9e54oI1MWcuGKWWYw3cFCvO5tICj33ez/o3R0SDEHXBOY2/9789h/Hil1CGTdxqAcKtFlzn+1xBcC1N0VX/MABJAqp0k4eRZ6+Th37JGyKiwWlhLNeNJSJ1cTDgJpAYCv1Q6GaObhl6dMoycFIGxF7oLdGjIAU9dHtcO/caufDe2+/lIwe3uKsf4SmRRcjeShIOpdQZfp+LPfO6QswKDFCKM92/xBd/zk/4EyOiQYi64NwUdP6yRVh7MT70dShiW8LtvEqylklRmC8Ec8FVQZRucgHGHVy4+OMR0eC0EVlARKueEzBrwk7EIbmjxdHB0M3CBFg5mbddh5E7HaAm6LGtuHbuNT783+WOu+/ig3cc5brsbHaKeTUenpdgt3vqzLEyn4il9d4VmA0MqbB40Yh/HxENQtQF5ybv2ff1pPRJSJkiKogKSUE6JyWvS9Sp5VcRQ7SAt0ydOFhC0kXY9FWy/5+9LwIanH46JY9Rqdc2R6jPEIImgK4YyYxUHJkVxodnnJTbv28xwei8oA6J5Qj1XuTgUT5y10GuvucYd4iCOmYFx3AvVCVn26vE6gqxerWrwxRCyQPDgvK0L/lJf15ENAhRF5xT+F983ZMZT56HlwHvqgudKBQUFfD7+LS2PrvWX+c4ZeZM1vYz2F/z+GfGcERwZlgeI9QssLjU0quBdlbq9U4dFAFzxseGk8vULfQs9B19l9AedN8spl/3Ine8Ru66Z50P3XKEG9cLMyB59anz4lDa0IR57aubZ+pcMZRiQFEGEmV1ga948i/6QyKqQYi64Nxh7ZO/icIiYBQE1Ofj/MynD6FtkKBe9tyMUoxSMi5KLhMW+DGRJ9wbAQ3OUNUtbw9Wc9xGiZTMHLVqYZJwUnH6TTu5TF1KTEiMBTqB5NMQdXv2DDvKFbcf4+q717nbElIUL1KXHc5X5bjjVqdfTZQibWhMqthzFzZVeeglG3xtRDQIURecE/j7/ttXMV59Cu5TXI3UPOgEQ6S0LYmGez3aDmyKG54NbGC8vMZ044/lMf/ijRHR4IwRVrDSNpZgqNQ8Sm0BSAjqQnJQg35rYN/JvO00s4AzwukFul5jVdhe5cafkUN3HeZDtx7h+vXCDCGJ4fM2TgQXae6cbfWwSPMCKNtXxOKFjbUFPvsJ/82fHFENQtQFn1hBt/4TD6FbfQHFhrrey+edJGBmlNofvL0V0du2RDMHq4YAKmMSM/ann4qIBmfnxByWtxe/ihk2OJbdaUawjkotvyYRdCisnczbdsIiygjo3Rj5ENfOPf3ssI+rj25x9T3r3AkkBVehCFXQtbIEOFKc7eKF0x5twb0wqDG5bI2viYgGIeqCTyzXlX9L4QKKDZjbcUbDBW8iz60ec9GHtF2vOEjBugPY1lvkEV//jgjoHtVgZ3vdlg+Tne6mAjmDZfPaFDB3rhOR6pIozv6TedveWBRhJE4vykj7KL/uZe58uaxvrfPhu49x3XphS5UEGIp723Dt3i54jmar4q40l6fsiCl4ZuOCVS578g/650RUgxB1wSfmRnzlf30aMvocStkCfLu8Oj90Z5N6NSGWZkLsjovhZFLXIRxixX4lIrqXeduK+20XnEWV2M9HEOu5Z0YevC6Y2E6XiHsVdh0n11NXOpaSMkLoEfreTs60ODh/WX4YVx3b4tp717nDUxvCOc60zqugq+dPaXt1aGbF1frETRnKDD7pQr48IhqEqAs+MWyufj1mgkgGCvOVETLPws27093aFokq5qRtj1A1dDSmy2+Wh3/zeyKge5h7jy7BHWcvW2c2Om5FWL3FlsHqsmHE57k6R0xwd5ZO5m1FWJTCSKAzo5/m+147/+Qqf0J8mHuL9/wH2RgSV9yzwa3rU9ZdEXNMFBNpE7C12prFMYWiRsEp85OzALOBsi9x6Wf8sL8gohqEqAs+rvgVP/JP0dETsLIFLrg4gtUFOW1LxHzOq91akfmpppCk0HUdyB3sG/1uRHSPc+ToChs3r529N7Qx21PX7niBMpQEw3Zf0/ycNCgnuVFClQWEzh1RQRcm9x2U2Bi4MD7MvcfyE7lqc+CGe49wT3EMoZiTC2SFjFMwCpBNKAbN1Y7i3jqQlVwKs0su4J/w+rPcjhCEqAuCEwo6//YlZv3XwGxKok67Ytt6rYm42oou8+WuH3WauTjeFVTeJg//pjAa3uuUYR+bed9ZFHVLeG5PE0a1z9n0pAzU0ld1vHaEmk05qTKqCAsiqAqKoP5RmbpBuehv3cOSeI/xt8+XI9PM5Xevc8fmjA2tU66DF7JRDzeKt3VibeNOmT8Ga90ja1NjGHUsPfc6viqiGoSoCz4+fPBhX4+k/XgpmCdcBFVHOkeS1bNJ5KNSHPMBCa8TskDJt3Hh/rdGQAMG1jBfPWvvZyxvNzLNL3FlANuU479rrUGgNbg/uKhzJhTUBTFIH11+nW7x0HdewyQ+0D3IJVx+2Lj+jg3uLlA8kV0YsjMgDAUyRqaQKRSB4tJKs/WKaKaYbTE9sMjnfu5P+qUR1CBEXfAxxe/5yceQlr+APFTD4BPZdImDY6jWHjqnejPVKf8Cvo7a38hDvjJ66QIQX2LKWRF17lcvommCu28bECcVugSW68Rr3SRBm0oEe3Ah9vqrfdGcsYFaqSf+7KN2vw5TLrC7QtTtRa78JrnHpnzk4Dq3bxY2BMCZSc3OZYSBlqkzyO4Ura8mUg+oZdsuoWsQ68OCEHXBx5g77F9RZlpLWi0bZy35UeYtv2WeA9lZcT23N4ECtoXmW1jr/l8ENGiibpWSV87Omy2MQBbwuaJT0AT9AihJBMxQM9Rb+lhg9GDvesMGnQh9e2QRgJLv+1SjwtpIT64/Lzj/mHRcub7FrXcf5V6pF8IiUvvqVGvZVbR+7YmMkJOQRchAtkIpHSUPTMc9T/28H4/BmyBEXfAxwu941ZNxeRYlzxApiBjby8DMaV6a2x7q5t6uazQTWIdsFDuGzz7II7/gQxHVoD4QyBpwlsqvwwT3RcwUR2tRS5Q0SZQ80ZpBqed0M97B6R/sXbtNkip9qvlpR2D00X9K2Le5xUJ8oHuT93+/3FW2uPbIBndsZqaqYJnSHmtNWlbOax9d7bfzdlgdoHChzDpmptjyAl8SUQ1C1AUfG+5O/4JSrG4uTPM9roZSqlWJ11KrquHuqLTfq1YdmcSATczuZLl/t8hlGxHUoComWUO6syTq1ieI9PWyJoomEIUuJbyMkiACqtTOz1Yme1BRd+dHWOyFPrXFsTgwfNSFVNgncnL2KMH5ydbAVetb3HFwnYOecG+CzXdEXHHIpT72GlAUijpFtH5PFEPZGguP/9Kf8U+OqAYh6oKzin/4Zc9A9UkMeYZR5wZdq8mwWR2CUDeSV4MIbRtfXQripWYxPGN+FB+u4LHP+XBENdg5wXQN789ShmtBQRIgqICj4G0jp9X1YNQ1YaptPluYvP5Btlp0i4yT0kmHpXZ+zz7q9yRlbbwUmbq9zK3/Q27yGXccPMq9s0JGcRLZBHPBvTaluLTdsOJ4EVwUU6kCDyhWsFTwkfCPI6pBiLrgLN90155PGaoXXZoLNnaWGdLsNQu1x642Ks3XgkESR2QLy3exKu8Rec56BDXYRrr9uJylXrR7FKzePu9zDpvQNkjITrZOFeiE8fKD9NXloywAXRJEBU/pH+b3usTq2CNTt9exGTdtZY5ubHI09dSyRluOKK1lpQ3okLW9UneflLo128SwGWyZctlzf80/KaIahKgLzo6e+/APPQMZP5YyzEC8OvXbvF9OcBNKlnoWudTtEdt369qknpIBG3RyLY//px+JqAb3vQLJAVTPUobrCHjr4zRrX9v873Go1VjVlrJTHGFy4EEMiFVYTEqXQJNyvAHjNn3HmsFKfKB7m6V93KDO3Yc3OZQNyKCGF8etLU30gpe6PNGlNqfsXDfnIq9jcHAO808iqkGIuuDsUFaez5AFE9s+UwzuK96agKMJO03NzB8FEqVkih1kefQhkaceiaAG931ySBfQydlx0c+z6iLng2PZ663Ua5ZZmlficadsSziPsQeZWh2xKEovqZoPm6Ef1VJH17PkHbENYI/znu+Tw9OeG6dwbH3KJkqat6RkrxdKEXx+yTQ97tWR5oNYfzQK04nyuCe8yh8dkQ1C1AVndq+98ZVPwnkCxcFVIdXMm6rXBvTOEHVS583pobo9GLDt5yqO+TE838RjF6+IqAb3OcfclxBdo3B2NjHMZh3uig9WLcFKtRi2WvByx3xnqTptIWy3tfXAwxLDwJK1bF5xkjt6/KDEH7kvj0aMu1GUXwNImWu8cHBji3VLqHs956obVJ0yu8/PgbSZnbKzPdsymFFSob94xOdHVIMQdcGZcVie13IZUn30j89xNIcvmLu41l+U4/68iINP8XyIBb1c5IV3RlCDf3D9ERbxcnYyXP2CogpWDG8rIyzvHPWWaU3guRtuRhoepKdOOhY7Ic1XhIkix6vArQ0WRiM68Si/BvDhH5A7zLhlNnBkNrBldXzM2qCESV2WaAWMDCUDubUlA7kg2VCDlGeUfT1PeMxP+EMiskGIuuD0MijX/u/H4Po0POd5L9JO83m7JEHtU0pYfRY1R2l2J+2wsgF2G/vHkaUL7oc7Rogvot6fnfcbOkDwUvvprNQ7Zkt7tMycm7etErVLVCcPIupSx0SUTgRNzSUlLeyUcg8fYjn1pNSxPz7TAGC0xHWaOLy+xboI7kLGKO2JOFeZVzN3olhdulOzeXOyI6bkzhktd3xORDUIURecHvfc82WAULyWVeebI0QctE610lyXrIDPd7ti21sk1GdQDjPK18ol33ZtBDX4h1yzgssEP0uibmNztG0cUQaw0qxfcTxZ23VSi7Lg5pg7KsMDr/dKHRO8bqHAEQE/vvwqd7MwUqRPrMVnGgC88yVyjSfunsHRbAw4LolMXQdmpZkRm+ysChOtzQOq971Dz2aUi52nrX6Hx0NDEKIuODXcf+EAvTwdmCJSPelEDdfWN0e7HTaxN18cATXv4dShCvMZlg+y3F8ZUQ3uX4Tdsx+nxx58VdfJIeOWi7PtfJzP5yN8PhjREnaYQTFDS//Af78qYxFcpZZtMSx1O5m63hl1AiOJQYlgBxu4vhQ2NjIz19Zb12xNpJ1HFLxUC3crhs1XE5vjAoYj2SirwtKlF/PpEdUgRF1warz3ri9EZIRba/Ewq8+V84yHG67Vsy6ZkdrX3kquSQ3VgpV1bHobjxpfF0EN7pdD6/vAlZIn7r998Rm/37HNA3iurejSbE1qtUtQr2KuLbSrkxNQBCn+oKJuNL9QimLaUWRhp1AmI5YUPCUWf989hiUCAC5e5trkrG9sMTVH3NDiO93J+XgB2F6L41KqoHNpfXf1VB0eNuKZEdUgRF1wismO7jOw2RZWCm5lR6zJvI/XEK9JD/Eq5tzrZglJpa4LkyleDtPL1SL/4XAENbhfvFtEAPGODT3zCdit2Rrmep/5wm37HS3mtVHdvWXc2r20kwfpqUv0orW5vUuYKnnU7Yg6dVZxZASrts44PtgA4I3fKvdOJtwqykYuZINkBbE2wwOtp64+ZJjM7duVQjWSMhWyCyUXZouw7/E/7E+JyAYh6oKTu8e++/ufB7qCl1nz96qrvkTaXKsXVGs9y4qTm2vEdkEhGaiRbQORe3nE4jUR1eDEJ5wsg4IgHBvOQulSJ2ia7x6uuyNo52bq81AwlCzShB2YZbR7MPPhRK+yfZabgnX9TvnVNjhgVdStbNwatibBDgtrXNmPmE1nTE1Butbp2cqr7QHDDEotxlLcKfPGliS1D29W14fNLhhHCTYIURecLKOVz8XKDDpHtWbdSF576+YrwgwwQ8Tr9KsaKlbFnteyVynHGMltcuA7YkAiODHFV+p5lWBWzjxTJ/2YJr7aSEPLhwikvuQdnzpTwaR13Fl5YFHnzkQcSa2p1AQ7fvlrLuxv2wJWNrYeeOgi2Fu8+evlanWODIUNE2YGxZTiSvGaOS6umJRqlV3atgmM4oZ5IbtRKGQXttY6Hva4H/eHR2SDEHXBAydNrnzlZ4LuaxaYO1hpvyrgLhw/c49SsyHzCpdBmQ6UYZNxH710wYOcdGUf4LgrabR65m9oC3WTibBzACSQzo8vfbXylzl4fhAh5jBCa6nMDTHHNoadnxJJrBRDcBYXhii/BvclT7lRIU9nbInUoYj5/0k14DFJ9UCrxYkrxZxsqWbximODU8TQfc7TI6pBiLrggdnIzyUPpXYbNTslK3WZkpfqtESZC7iaD5G5eZ1AMUEwfLZOL/dy2b6rIqjBA2uwsg9xARmxWc7criHnxbkKa691Tau64EIxpBjmzYzHqL1LWR5Y1InRW/UMqxdNv++8blJW2kzGwiIh6oL7MhOuMmFryGzJ3FXHcRMcx8l1aEIET7XHzuY9d+W4LRQZmDl5UXncQ1/tMWkdhKgLTpCJuPWXHovroymzWd0OcdxuV5VafhVxRK2NbPlx+1+r1YniuGeETUZys8g33BGRDR4Q6ZaRpMACg1xw5u/HqC0BO+5op6i7zM2H5z1Mg1WbxWH6wKLOoGsWd0iq2ZX79NTBajbEYTxZCFEX3Jd3fpfcUAYOojCrAxO44qUdonXiNbfRtHzcIEUbS9vZGQt5BAv7DvOEiGwQoi64f+46+nmYVfPgpFadzc1BC67WzIWtpSnq06VgtSuJ5qYkhg1buB3jIonSa/DgFFuhOJBGdN2+M386kW5btnlzgvDmSlecYnh2fFZgGKAUfMgwKw+8+1XmV8lSW0qzwfHlV4OVXJsWRhtTFuKDDT6aYcodPqB5YBBBSmnWJYYVxWgZOpf6dTuvnDp1vd334vXXZf+IJ0dUgxB1wT+8D/qvXUDKn4KVKaS5zYOhqeAYYnXfkku1NpnvzyylWWSaNV+wjPsmlHu5cOnGiGzwoFh6OF3vjEZjVB925lczlyrbsuOlbtckO6UAYqVANjwXGArkXH9tme4BRZ0gWvvv8GrDfZ/ya9cxaZmVJF0MSgT38/ySuSHXi6tY3sm+zZ8KXDBSK8kC3jLC7nipYs48VcHnyrCoPPQ5PxsDE0GIuuCjueK6J1PKBGSGSEHbYeLVm87rRgmh4J5xrd51jiFecC10msEGsm+xkG4SedFdEdjggR8mfJHUPYyuEzrtcTsLK7amdZTBSxV25LpVQoojsr00LFstc9l80tBJD6g9BXXqTRarZbBF3ym/JmHspf46WViaBP+QR17ILcVYF0VJDKpgrVdOvHrUIXUqm2pvYghF2yGl9t+5bz+2JNZ5YkQ2CFEXfNQjpDyTYkP18mq7W4tVByWlrgmbb5ZIqSCe60FBtPrYOYUiM5JtsjwJG5PgJK8+MsE9Y2ZnZf9rLqO6ws5qS4DRGutwVKzs9Ct5dnxwvG0qfkBRJ05nQKnDEskdyceVX1PHJDe7RhP2xQcbfDRvfKkc29riFkt0pQ7oZK8DE7m06VZvq8JoPnVSvRQLUDxVX8UCWAIzMsplEdkgRF1wXLbkxy6G7uFYmdX9rtRhCNG6AqxuxqybI0RLLb2aI1JInkmSSWTcSivfHuXSi2+IyAYngeA2wizX8qiehf2vuri9BEzmC8HE695i9dKaBUrdDGvNEwz3B+6pc0hUHzpFUHN0lneunWIsltz+RkLUBfdPX/jg3EoHpaAUVYqmlo1zighFBNNaaq1mxGBZ8CJYcYoVcGHWJ1b+0a/5J0VkgxB1QeXD02eSPeGlkOa9dFJF3Hx8cO5/bgYu1sRfW2jj1ZI4SSZJYTK6WeRfH4vABidBB75Uc2YmlHzm5sMqC3VKu0mx2p/UzIjFrPYn1aPUmVgzMDmxqHvZui+aoMWo7iggBoxG8wcjX8ZZym2yVgoXxEcb3B/veYV8RApHUkLIZHVKp5SOKu7m5dfaM8B8+Ta1YoJT6t4ec3z+PZnyuIhsEKIuqAz6FNyaSUkrMJmx3ekB1EwHIFgty0q9wGzPw4pTqKvELuqvjqAGJ8eH9lFsieKZnBXnwrNwOZvg2va9NvNhh1rB2nE3aUXZbenn5cTDDQfvpSu2M0jhiqQO11H985dvsNolJl4nwt0kRF1wYtY3uE0S4zL3qnN81l6PP4pVAYdWMZcc1/kNe8f/fZoLl0ZUgxB1AV5e+wiKPKyaDR+3KWJukCRScw9JDW8mw8c5m6Dm80FZrDhJjnHRZTH1GpwcG3ddhKQxzSKY1K+6/9G+M3pP0UlVbgokcBVcBHPFi5jX3J2Aq2LeGgsonLD0O6zXHrr5r7PVP5M26vfuPcKSwKj52JkqK/HhBidiNuNaEXpSPX927OjABTl+X899lvcc9+skeFJQpeiMlct+yR8bkQ1C1O11PnzD0xETijt63GkwNxs2aEn/5k1XZHvThBep4s+lFp1Qerld5IsPRWCDk2Jr2E/fp+1VXiklOHBmxr0ik9o2oHOR54jUVXaibrXnzUWYZ5/nZdgTll9ti9Qc74oZ7kbx2tjuANMtFhA6ILthxVlx9+X4gIP7Y2mBawaY9YmRt5rIPzyPdwRfyTur7VrNhLkDIwYMsN9iYCIIURfY9FO2S6/mVaTNX5l77hchm2yXWk2c4rL9Z7y5RqgIliJLF5w8WffRJWreTECkg/UzW32kOq5WOwWkSbjaY+eQvJTqupibgbBZbTgYuM+24/uweQ/qtXs0F8gqZDPyutW8iQ0sJ0Hnc+MCS7fywL53wd7lXS+XOzcPc3efWKKAtIYWqT4Dpla/51LL+anmmr3tiEW85p7bYwkJhm7GwyKyQYi6PYzbmy6pPUyeEanZtnl/HOLbwi5JIVXvy+3hiflUIeJInSoEnfGQcfTTBacg6krLZmndxqrScejwmXm8mY/wtt3Vfd5v7nWHsZhVO2IrVvVcdkoxipcTi7qtQ6gZ5jDgDOKUbJQ096kbWBGhzxnKgDksXLcRoi44MYeOcdV4Qt93daOEVA/E6lVXH5tN2tCEtq9dMO3qZCyO51yzzBRKt8XSJW/0R0RkgxB1e5X3fuipoOBet0a4GiLN2tLrCjCdT78azLdmWsv+m3vNX+BoUjTdKRd+S2TqglN4spgtVws5q96HiLKVVs/sTUtXz+km37wtd5U6yFMgl2o+bEP1rLPiZCsP8I4JbbtTsjch6EberDPgrA8cMKPzunu94Cwdvie2SgQnJo24Eif3YyYGRbrmkp3qMV8LJjWZbGLtqHPi7l73xVrthraRYIv3ENYmQYi6PYvwOIrMMDVcCyKGYqhWSxOOE3g06xJXIzVfc8EoVKGnSeg1snTBKYq6YbGun8uOFQNTctl3Ru+ZLVXZtj1HWLdLFAelWF0YVkpdFea54INhOZ/YfLhMEReKQS6CFasNCXet1+xeLlxYDC1QSsbzwNq9d8b+1+DEfOD75LrZlEN9z37zlnE7bgaN4yZg51uMYef3pHlZVluPnTHsn3FxRDYIUbcX76X+pgvouotQZkiqWyQ6DBfbztLNy7Ak3xZ5dSCiedlpqaOwTfStTULUBad4Iso+RBxtDxQiHfQPO/3z2pdQ15qaKwUpRinNvMQca26L9b+6WTUftmrmesLr4NYmaTAYCm65LiArhtm0CkF3LjYnedvfacJyTizGBxw8ELPMzaqsqTKWmnGrFu9Nu6Xt8xqheZkU6oq6AlizOgFww5anrF78a35RRDYIUbfX+MhHnsisdBRKLamKU9pSJVqiX8R2MnTtdkhrFxcpuFEb0hWSbfDwlZsisMEpYfawlhmmvqaE9Wfg8XZLh1k39xrGtU5xe+sRVUp2KDXz4W1Owtwp5ie+Di5Qbblb5qRmRsqO2USXWLPSHn3AFSb7FqP8GjwwW5mrmdGNhGVmVaB5y9ApVcB5G5CYn39ynI8dpQq70n6vFvqHH+WREdkgRN3ey5A8HjzvDEY0DzptJVdp3xM3ZN5fN/9vXr3ptn+fjBC7TeRrDkVgg1O89FyKiSOq0AmaOjrdf/rvd+MI1Q4EJNVLm6jvGEHgVmhTQa2xgJa98xOXX9NydWREqn8PgCRsmmv5VRKrTi2JCdApneYovwYPzEUP53p31jWxj3plNVM8C14SNrcLrX7vO4JOWr2kfNRdXIRhycKIOAhRt7f0nP/pCrN8CclnqFInWo83FD5OtOHVzbxa8M9/Xc8YlVoUEFmk45qIbHBq56Evov0BXBySIgmMBOUM/N0uGCGaEOpUdtJc7UyaqGsmEN78vqofCeC424nNh5mS2iYKaw3qJXUUq2v1cFhp68jE6xL2tDGwFJ9y8EC8/qvlDnPu7nsuyELKRvba9zlfnFdFXBN089Ir7VUUFyhidY+swdBl9kdkgxB1e4kPvOPxuC0wm4EVwV13zoD7s8E8zoRYte17BUyhyARPHZQQdcGp0oGsoFJQrfu8HAU5g/Jr7gCpXXNebYJdagu6FbA2wy1ti7FjltoeWDlxpq5TxB33euOsTzm1lJsBBJZK2RaMLgKDsxofcfBgTDPXqrKkHWNkp0euXXmrcGvDEKK4aZ12lUSR+ZqxVHfEakdRY/TJv+VRgg1RF+wZtrYe32atWlZufhbM/elc6tdN41nbAdvGJ+rXqQ1N+Cr4jEd2t0Zgg1O+7nhZqtOpSL2hZWXIjzr9tzzUV43lBW9tc2JW7YbNTao5cDFsPiSRM3jdFHHijRKKuNRy2Py1A8/O9Fvf6fsQFqxtRTZvc7cDB+IjDh6MQbg8dWg/YsUcTy2LrKWKOIDSeufYKb3avAzbTIkNgwHQQl6+h0sisiHqgj2A+9sXmSw8HJUZIk4nTvJMomyXYZPk7d2vSQ10vpSwTcDWd8KtI6V99NwhSy85GNENThEBn9TFW1kohWo9Mj396b2Noz0F2ZFtxx1iZeZYruu9LBcsO2ZGKYViw4kzdaMRFAdP2PwxKDvuU2aL97Js3kRd9b1zg1ISF8ZHHDwYT/piruk6NiRxYHDEuuY/1wYgrGXr5kMUGNbKrkZ9vN4Wd+6ICXk84+ER2RB1wV7ArjhA9kWKZUycweuR2wSsSG4D9AWXXDdGtCEJpQ5KzPvpzEekbhHNV0Rgg9NQYGPMx1ibJ6154IKKu5/uqjBP1OpoBi9VvnmhznaXXKoVSZlbExe8HZbLiUXdVq7l11JnwL00B8e7Rmz6BiuzGQvm5Pl0rBWsDKzFZxw8GD91mdytxt0CDxEjuWG0Hjqpe7e3DYaFumlinqXT1L6e99k5TiKTWXvGqz0eKkLUBec9tx1+DDqqH3mSgnTViEHmpsLzbJzUbRHuVdDN14Kp1e/Vs2YZXBnlD0dgg1Pn2otw76o9Dm0/q4PnCfzl6fajdQiOl1zFos8d6QruVdRlvNTs3E4Jthn1PODz0PbuY5CCoPiTns50NGGlOKPi5NbFh9eb7kp8xsHJUAo39z1rqWexZPLOrDbuVchlg2LStkkoxdo2CWnCrp3LzAp0mU6Fh0ZkQ9QF5zv3bD4KtwFJhqqjGH1XSFrq/tZ5xqSVWVXrbSpJJqVShaCUmr1La2g6wqV+XQQ2OGUO3nRp7RpyqyYjAGKILLCxcXrDEhvTcZVfTcxRMm4FyHjJ5ju5u1L3THgGy7nmoH9/3e93YtVqpk7a443gpE7wX7pMNiawnAudGcVpZdrqNrEcH3JwUjdg57oEo0nPKlZFnQvZj5t8bevBbN5X52BmO55120eBoWOmUx4SkQ1RF5z3yIXknHd65Jr1qlFN+OcbIkqpreOlOO6F7NVz31NGUoaxoP0qIvfK0svvjLgGp4wNqwgCUupDhBpoIcmIe4bT6wmark9qfsPyTnHVMljGrFjdJuHzudjWdFBVoJPu4v5LsLqFmqHmiAHFdn7fzFk1q5Yn1oxTvBaUl909tkoED8riEjf0CVtoK8O8J7tg0pGr6wCO4F0rudZsdPs+c4eptnUiQRJy37EvIhuiLjiP8Xte9WjydIJ4qVOvrUgELbnR9rxW5y3/B8f8zwiG+giXRSCmXoPTFHV5goqBlWpiXWq3Gtox2zy9HZauE6zlMMTnq8JK7bGz0mxHarmqGp94mwlyM9LRE4g60+NsuHXbtbHOgmdWrP10YNWcuEARWNzgxH16QTBn+TJuwjiWOi7MoJ4pUiepHaWoYdr86zguK7edxZMdQ2IAOrJnlh7/mx4T2CHqgvOW27ceDUm2t0fs3LLmp4Fve5Sr1H2vx1ueeNsoYWLksozSQb4lAhucFjNbaXKqiTn3akVCoqTTuxkZ47ZQad5TV7PNpdTCVJuxte0qadNntVM0cccJbE2OtyWerxPbMfhZNUOt1GxKqV51RZXxoRB1wUnwE58qtye4Q5X9o56JWc3UKRil9tC5YC7Nl27ec9e2Ssz7QaVl8MzqmrH+ILEHNkRdcN6yufVQbHDMpLptZanlV6pfnbqj6ohYXa0EmNTm8brAhu3DbQ1zoxuujsAGp8UwLINXK506i1pL/eCYnt6KrSH37aGl5jSs7ZFQz9QGA/e6dan21NWya71JCjKa3b+o04QjrRnBKe5IsfoEJMJycaTZpFCc4kYuRn84PuXgJPHMrZ2w1icWkVp2tToJW+b9c1J3wlpX19GZgXUJc63GQEVxUhV5vVL25/BKDFEXnL+k/sI65OA1x6Dqx2U4dl7nWTppAg+vs4E6H6CQMSntB7Y4sHRtBDY4LcpsBUoVcza0YpM5xRT89FZsiXStraAgktF2gKNSs3PSepKkzbLWV3dH+mN093uBbBYmzdTHDWy+TQJhpcwNjOeCEQYrjG+44/7fLwg+mhncprA4TuyXoWbpZN43p628qu0hROqOWFN8mD+UNC+7Qj3E8VRiAjtEXXB+PgX6j1xA9gVy2yTBccMR8146d4dcM3J5qLct5t9vq8EojrMAvh/xgzz0stsjusFpMeSlKuhyLcFiGW+bICxPTus9p0OHatk5b7G6rbVJspqpM2jfZVukZYBpuv9y6YxqfueGFwOrtdsMkJTFYpRilJzxkiFnyjAwts0ovwYneY3uuLYT8uISa7lg3lM8bT/quHW1W1Slir37HPMdsW36tRTIYFszlp77+x47iEPUBecdV20+AuaeYOKI7ZRbt5/t3HH1OgU7H4woOxk9TSCdk1jAWQPuFfniYxHc4PTuYrbS+t9qD5wPjuQBL0avp2cH0qXUhn+OG/KRZkai3qW2n5U60ADbWTo3R2YnEHV5C88Fy9YMkoWiuYq6TljOc0NjwbxurBhc6Acnpl+Dk+KCfVzXwfqk56LRuJoQF6/ZOLF2aBVwqZ53nmhNm7azUqw9vJCrv10/DJGtC1EXnH8c3XgoGGiyOnGoXltuvYAYRWy7xCqpHq6OaS29JkrNfBQQXUJkgWKRpQtOH7O1nbbvUmdSsQxmFDm9G5EPI0QUSSAjkB6kA+kdUU/HTQm1nZk7/XegkxNk1nxEKXXvyuCQzckzmPFNvkxiwYxtD7zBW/nV0aPHzo6o++tb/ZPihDm/GV3I7Uk5PElc2MHYp61n0+67XaI4PpTmV9eeiESq6LOP8rCTGd1wKKxNQtQF5x99t78+vLXLQyeFrpWpkhe6lsGrOQvbznD0UkjUy4o0ASi6gqvS5ZsjsMFpI7JGad0/UM+vLI6LITo+PVFnY0AQrRlmSZDUEQFE+gQiqNAc8pq4m+c3hhOsChtPajpbnOxUB0fLTB86YSLK2GAoVCdHq7tfczFkY/PsiLq7YX+cMOc3r/k8OULhYNezNh6xbMO2uVQdVis7R6J6Ipq3bF3L0ongluqfU0eko4xmce6EqAvOPwZZIMkM9yroSpvhq43pbafrXMz5jrizj/aq68C7/QgbJL0yArs3cP+7S9x9/9l7P19CdA1pwwZzB646CWuInd6AwXx6VaVe1lITdlJl3LaOU+67E6xmNyTbCcyHa546l2qQkkWZlcTsggmLDiODWc4Mpe2TzXW3LF4Yn414HTzMfnePMtp5Ti7crcLKZMRqNgoFrO113T4zjztDU4L5urDjByqkq5m6pJRuSvTU7UFiQuu8viH/yAV8cLbIZs4oOxptfuOb25Zoy5gYul2lKiYkrTYoKo7Tk+QCXO/lgvE1Ed09wh03r3HhkTFw8Oy84W0jRPbhXqrMmk9Wex0ezZundyNyS7VTrr5pfV71Ku7avZG5p1fLbGg1+HF3xPX+H3AHw0fOgIAYgwuz2ZStcceSOWOc7IJLoUgilVL7n8qIhbMRrTJw4Or7uuUF52d25Y4u0U3G7C+Ka4KSq+G1SLUroUBJIG17hFTbHkyxZIgLtceuw3oF0zhv9ui5FJy3XJUvxD3heWd7xPzVZCcL5+KgoBiqVq1NaJmT7ddFRPaR9B4u+fRYD7ZnUgibB5jmtbP3hgdHqKzUFeQCIrZT+reBYqeXlRLvcCmoVL87pw5J2NxnuD3n+LbpMG361c2Qyei+Cbw5i2OyGbPkzKQeuZ8x27/GBOgESmtst1InZPNgMDvG6lkRdYWLbnAmcSKe5z9mA7chpMUJFw7rJDUkCSKOSkG1oEj9Xjsvqsg7rudOBJM2IWswSKF77rUxARuiLjh/cB7OYEDXJlvrfQ0xnw//bVucuDuefH6HrNm7Jvwcw/plPC3jfrfIZ21EcPcI6/ZQ1oeHnr03nC7iPgFmrRuoeSLidf+wrHn5xUed+pVMOoQ24S1WD6y9t6nW6VTq3jDP1VOuNhoI5vkEFiRLFBGGIswMhlLIx4TZuGPRIRUnWx31sGxYttbcUFg+G9FKhYceuzEmac93rHArmdR3XDwe0bVuUEUQFcSluocCuLUHkLmHHdsd067z4QmhWEL1atYiuiHqgvOFjWF/FWallVitiTatwq7e9OqrU/vqShNx5Tifujo+u4p2PYV7IrB76W5jF7I1fcjZe8PNBXDFLSMtp1AfQKoJsapy1/qply7de8DqJG0xvNRzGS2ghZZNG2o2zc2wkmsPXDak5PvP1JWeIkK2GVYyVupgxDAZMXJHrGBt50o1KK4bbRn87NhJpMJFs1mIuvOdXrkRYzpSLvSeUS7tMXxubSJ4oWXooJoRtGEJcVwTJrTJWMFmVs/rfjNEXYi64PzB0xKjrk236tyUtd2soXaR1ztie9kZlphn6rR5ffVpmS4leu6OwO6R08evXsSGhzIrl561N50dXKluceS6dEvqvjoBVAuCYnbqWS6RDndDrO59NTOklLYHNidlyAXLBcsZG4bqP1eM7AUv5f5FHRtgBW/7N80dHyt5MTF2Q23HvtusWpoY4Hl25uXX16/7ojsHip+d/rzg3GXpWdzhmUOdcmBxxGLOlLbzRLztPpn30AFIh7sgpRnWFeqraRV/GCKKzzbPTsY4CFEXfMJvyL+/BGXEzEs1G6b2yiUymNNh9XvzJbBe1zbJcb+ui2kMLwK6hhmo3RbR3StsdLheiHVnL1OXfRXDoAy4W91cabWvzopRSmLmp5Op62r+Amvzp1XYYYZlGynZCyXnJuwMmxUsO6UUPKWdG+ZHizqvGThr/Xio4X3HuFSbbi+teOx1WwWloMXPPEPS3UsH7GOIhvfznZ/5DDkkwh29srZvzEoeyKll6VQwkzbhWk2urXgzJG6vsJPFK4YVrYbYZTPOnRB1wfnB+nsfQik94nU7pVJwzZg7o5TryvNibea1ll5riZbjVi21rqOU0G4FozDyWyO4e4VZR9cdIPX7ztpbHrP94IbP29rMtg8zR0Tw7tTLjSpahWFbh+65rWO1gpKTkM2wYthQ8GHAB8NLqftcu/7+33aR+q8Tx6nNeAKgXSu/HicF5657UtsZzjhDcuhqFjSxUjRcCvYExh2aGC+OWBmGuipMpP5wqFbzHzE8HbcmrFPmm4h3nE8UbR52uWycHWudIERd8Inmdr8QVJpwK1XEUb/OVs2ESXWxuWv9b6Jt+lUNE8e0Gp2QepBV8AGdHY7g7hWO9iAXkOTsTdD5dKU+NORaWPLi2+dmHc820FMXdW4dVgzy3B6llmFrjq1uO24DDeZY9urn1fa5ejmBT93RhBaD4kgxxJr1iSZGuZC2WwLnpbFqkYI5S396hv5yo8yyO6vDJn2ci+c/yblbBEYTlrMyc6UAWeuWiCrsutoGIFqzeKXexWsWT3eyzQUwwQaLTF2IuuD8IJcFctHaLM5xHbaAKZTjP3pv5Vjf6RCal2d9GEiMkbQCvslSH6Juz1A6tFvDzqKoK7O1OoEt1gZ3yrYAwwsi4ONT//vEFfeMUyhmGIXSDI3NtvvevFpum8v2Q47hmJxA1LFBUtmeNiQpaI86LVMnO714MjeLNUxhfPf6Cd7zZBM3zgRnIY3ixrw3LtkcRPCFnuXZgPdSt5ggVdhpVw+RuiZMwDhulVg5XiDSsstG//kf9BiW2ENEWv+8vUL0Y0aaKWW+3Pz42wVoa7ud33ZMFIqjWm951ascRAquiySdIHoXFz8qPOr2jqhLiK4gbJ61t9yyfbRUVk3MtRyXmyGSMXqO5VO/LplqLbeW2hPq4tBGG0RKzjg0Qdc2vppWH1er1sX3+3emKuCkPfqICzIxVJWRgaiBS3s63tmYbAjj4QwfmjN0C8rI+9gMsEe4RwUbjVjqE+ZWhZsJLoohtZ7S9S3PXfBkSGl38vkVPmfotA5WqCJyR5RgQ9QF58Enq0sMc9NhcUBqUoR6a1K8DcM3y0pAk2GurTuo3pIMkG4B7ca4HRF5wcEI7l5h0tGtL5F89ay9ZfE1oI4YIDsrwkQK5oKYkU4jwyUu9TbopfqjFEeZy7GSFfO6mqy0M5vtjWGGeb7/a6HN6MQRKaiCy4DSkdyZuJPcmT81GY5QG9mzw5gzzNSJMh6PSTKKCcY9Qc+9Aj4esZjYFmWF+tzgIvXp3GqmTrqav3XN1bsub1/6QRQv1TjI3WJ6ei8R5dfzlU2fUKibKL1Nv+Lelp3btnCbr44mtwzHdimsetUphnYTUieoHovA7iWWDUmJTpP7q8+OV5qU1Toq6jI/+ZhPrdasXWE2nHq50QZBS8aLIVZqv57bvNTr1TXFmLvu7zzKuApu5f5LnNMpyUC9SU9V6HsQZVTN6epohpdaxs1WRZ0Ves7wp2Urs5ASnUpkWvYCJXOnwNALy9qT2vlJ3yZgt/0VhzrZaqV+XZpPgUu11Zm/0rZOyOE4f0LUBefBFaKMkLzTZlGoBsRWqjtq+4GnFHCrYq82mdejAEm8PScuIiTcpxHYvUROaBqDCrddf8Y3BndfJHsdlBD15pVo27a94hlxI/npZRbM52vt2toxbwbbyWrGuWY7RDEVHNlpLB9OIJyKo15QF8Sbo/+4rm4aezMztoJnsKFgpVCKM7jRn3F+zVh1oXci07InWOAgxmzcs7g4YWSGdaP7t9rpjlsRVryKPByX2gu9PTjRd5Qux5q5EHXBrsb9rfuRmeJaqig7fluEz0urdRCikwLq5GKYtClZa1slxNBkUMYgQvGtiO5eou9wGYP03LZ0NpqtBXwRZyAX6uxpLvXJopS638Ecun2nftKLgLa1YNoy0TuHaJ3nxnG1OhcOdbjBHeEE5Vc11AxKE4SmeFLEnVEpmDll1nzvciFnw0phao4c2TjD66uwIqBbU/bFuXj+s3/EkSQMfWJlrExmguXjy6rHHaJ4r9WOZ1Q7ord961QwbROyxfCwNQlRF+x2Nq5aJKmgGEmriEtASpA6r0Jt+5stU9fKsXNr8nT82ZHGVQbmEHV7idndK6CLuI4YX3g2DIgF8QluM4SM53yc+XABKYgUOI0cl9C1DZgAjjSB57V/T7vthWQ1YzdfhG5gdSzofvvfRlWJWnLcqmN/MehE6IqQrVCyY0OmDE7JTrHCzB0Oygm2VJz8xXnVHC0DF8XJeP6z/BQ2u448UhYXF1mYVpv45Ia41nNJ+torV5p9SddB0epfp9XXwMTqr6Vl8IYSvfMh6oLdzaGjI8ykZunMSfP9ruZo22teFws6pbAt/AB6c7RUh383Q7OTujHV0fxIBHcPcbhcQN93mHdsjS88K6LOywhj1oRcFXPmO1+jGZXTEEOSas5NHE1O0vqgknSn1CvbzebMBV6bv+VEom6qbQRD6iSiFFyndNKR3BisUMwpuZZdrThlMGYG7kfOzF9OF1gqBfLAxe903xcn5PnNaINZMrxTFicdi7O6c0XQnYeDwXa+Ls0+XlLL0qWdQ/uaqVPBdIj7fIi6YHdjaZGiO9m37Z2vcx+6drM73rsOb9877m5HAROBbgIiCEcjuHuIGRcx6sF9xGRyNkSdYj7fctJEXKkDEuJ12ZZ7ATv1qVGzfrugWhfJAglkZ5LbvU4HGWCONKMfN3Dk/q+FQzVcsbZqpaCUVJvY1Y1szmD11YZMyRl3ZygFFjjDspewmuu044FbbooJ2POd//RUOZISZdQzXlxgUqwZCiv3eeTw+T5YIFMtTOS4NXeieG7/TRS3FPf5vUSkZc9H1tcX0QJFoHOnIG3yFcxle69rzYg42SB1tM2W7cbogNYlYprG1d2rrEdw9xDDdD8Ly+DWk0b7z8KJWXNlhbY5ooBLwUtdsIUWlEK2U89wJekwcSS1EmyiOsy5ICI0+5LSpljr80q9R/ZKPtFdr1NMYFBFrFRr4zJDZYw4DMUYVKAYCaGoIqWWwnzj2JkJMXfWSkHLjP2jHAbEe4GRUsYdabFnPBsoKhQvWBuEQADp2mowrTfw0oTdXNBh9bX1ixYpZ2atE+wuQsGfj6RuVPvi+p0pVsR39rtSb3q4gzrpuJ/543/8CyCqCH2952r01O0lRFbqaWI92p2FTN3tHXhCpY7vzM/J5nFSF3a5oXY6Ga6EiCMKqiCJbTvWOjrRWhDqmjCXubCsZsHN1e4fUIY6K16MIq2Hbmp07khxiktdP1ackuvGWS9QcoZj65yRv58mVocZqsLiZglRtydwrFO6hcSCdFindb+rKK4dVubDD20qVkZ4d9wEhdt9+zgl4QLpueseBtYh6oJdSykJxSil2pj48UMQrfyq1r5f2LYxmffaFffaf4dVQ1hJOE7ZHsQK9oaoW8YcnMRodBbKf7MOKx2OVQudJrcEq7uIMYQB11PKLLi/cRURrb50Uvvq5pOvru1r3LxlPJqQc+pOZDdMTzDUUBQTI1ObFQrCUBytO5rIpVBM6m5O2n7Z7PhQYMaZZepUWbaCW2FBotl9T9BLzQpPRowVsmgddtD68ODavOvE8ZLwuWlVKu38/aizRAyng42414eoC3azqLME0rJy6rVtSZqLP5CaCXGiiT6rB16HJLQYyR3PTicOoog4nZYI7l7KGqTVunmrJDydBUuTe/eDjMAL7lI95LzuXxVqUVS04J7c33YKWa5DI6CJOnPMDKy9rxREDW2mrHVcyLxm37z9bi92/9fCWcFxskvdmOyK2xgV0ONWjll7DNreJetGmU5ZOZNombMyZEygz7PwGtsbz1GYKtp3jNdnlGZEVcpQJ1rngo4MXW4a7vieuvt57M5AfyhKsCHqgl18ZaA6Fo3mdiZzcadsmzlYoTYdzQ/3nQXn81XQUkgJVBKShK4PUbe3TqQlcjOrpjtzA1zb3AfeAXW/g6RqDFztR3xb5KkK3HUq5cZ2S7OCWbMyaVtRzA2zIoVS6raHYo4ZmGv9um2CuN9M3UJXvelE2sL0AmVKXwy1XMuupWz73WEGpdl4D1unv7P1bW/z1WIsGEzF0ckortV76fotwji3K3FR3HrM+nreSrMzmQ9JuCBDNQnaVnE+Q7wg81676bE4f0LUBbuXmSUwmNl9b1RpLuDmmRjbydK5HDcZ23rvXJyhEzzVm6ZHpm6v4O4ruC1hlinm5OHMM0XHDi3jXkv5iDLf6pCaWbDPS6ambBw8+b/Pu76dz6WKuWLbhg919ZjpvOTqtbfO515e4CYUSfcv6iwj5sd53CmehM4crWnB+jhU1WKbpPW2KsxOP7t2+5R9DhM3sibYGKKnbk/ckKu5NZpqEm6Q+fbi+jqvrs7Nh3utGyV6rU9L2ybEzc5EUr2yd9PI1O0Vok/jfGSwVA0cmrGwIfTWdr2qgNbpV5w6UFFqBs9ESE5bsq7U1ZbV7sGhNbgHe4LbOoov4aVgBTo9c1f62bBQ81jQJq9rlq5amTSDETcMZctPfgL24FCvYy4ZyYZRM394W4FeS6ze9mK2OXCfj2g0I5X7vRYWQ0uBlDBxPGdcBVFHSy3NemsINHOMgkg1AsrJT9+nbn1ghQldMWbmTEax6mlPUB2GkTbYSqobJeT47ByKd5lt9yll56FD+1qaFa09d5qrGfHkDI2wg130YBAhOA+xrCi2vctVj18Tlv0+GyTqzbDdaH3Hp25eptV2C1SBSNTtIaYjpOynWKZq+cUzf8vZcsucVcFFy9TJto8i7XxV1sspiMhxqp6KrY/OvQ5dmDvU2VRr47XS1oN5M2sl4S6UYvcv6iy1G+pAXY7ueMloNa2jWP1b6vCF1cqrQcGYyRk8NGdlsYBmZygZ3xLW4pzcAzdkRUQRkY/KrOWdYz4kMT/uYzg8z0AnvLcdIThM416/V4hM3fnIqGvlp84o8zk9IGkzFXYoIiB1iCLVlARJqtGlN/+6kp2EIeqICDOL82XPMOspZQU1QySRWHT3fSJy6LTfcmtYay5aNSsnUrWRCW0Cu8oty8rW+smLOiFVuSbzKdpaaJX5Homq41oe0I+XlU3kZT+Bl1efm6/dcXkOl20ZaibNnLg+PmU3RIVizpDL6Wfq3BlTkNI8/cy4NM7JPXBD7pAEIoJSmwmk05aVq9k5J0M/fygBbICub89E7OwpJtVHGnc8aq8h6oLdTM5UIaY10yYipESzOKkGxKll5eY/7Unue0tJgKvXmzpG6kBS9PXsGY4mhEmzjxOMEfy/NeD0RV2ZraI+1GydzBXSfLeDgwkidWRB5RQHJVygeGsdcESM0u5lmsyqvCttylZoylLq8omiJ9goYRnpBRNHrdobmysyn3ql9uRZE5dmghfDPDGYn/71tRuztGn0XnfJMhzmIXFOnv+oIknq87ccNxQhqWbg5k8JkmofHUBO9ZkctnvqyC1Lp942UgQh6oLdTBt0UKnbJHze6u0CyWkLlXCg+P30Wuh8NL6WbEWtXmq6EHV7ho0F0DXMjCQgeczGxpl51eW8gGvGpaAiuNm2PMLqSq/alSb4KTxAiNUUdFJDSvWps3lKGgHxobrsV2+6tl9lnn+TOhF7v6JumpGRtKnD1pNXtWjdruwZUhWLDHW61qWVYsmnf32dzbjAOzqzunpsllmIc3IPYPSpGlJ5LpS25quWVeW+4ixnkHHNTwPk9pNUfyR2dsLufDfYEw8GEYLz8VNtTv2lsOPar46m6syVrWbpCmybtM4PTdWjLnkzKC5zHzHBbDGCe67L+bO1+L1fwMoqeagG1C4jDq4fOLP3zItIySS3trAr480lDgrWbEiKCHYqWWHTNtPjLZfmNSsnNWOnUn3q5i7b1qx7quGJt43I91uhGt33UUmoOy/ErRqouNQBiVzXjplZtTnB7pMHP2UKXFgKnVfLlWyw8kfusf/1PCclUqd4SmQpZBVMC1ZKneCWGS6zlrVTvBtqZka8ZvG2e+qalx15J2sXhKgLdiuFOvWqrfyqfXXWz7bjS5ePtzNph7YJWdfmxK9OZwX3giggsWrm3BZ0K3Dl2bnxz1gGn2A513KpdxQ/w/2vMsE9t1KrtQVbzU+uvZZiiBmnMjk6kOrCrrmJdpNgNt8pS/X4acY9O0mRakfS+uzuV4BZaq6P1bzYNdUdK21QwnP9l5sJ5gUzJ8+NiL0gP+ynt56pDCxng1wo7gxmrN69HrYm5zudokla6bWvmyTEqj1Jdrz0WOl3NkwUr+V/aSvqOF7YafW40x6LyO6hcyhCcB5STYfbDU5qiTWJQyfbgxHzG1/66HvZ/OffpA7LFwPPqAqiqxHcc5kPLsDhlbPyVutHl0kJhpLbztQxrme4/zVNsGKtz7P2uM3HFua9bu51MMPk5K9Nma5NaJdtyTZfpkSBWlt1aU0IBqhv99VR6u+6/0EJbT51DrT9m24kaU0N7hSRNvJR36quZnGwgrJxms9lPQvmuBmWjaLO2tGrogR7vpOaqHOn0M5mGeOSaznVSzUZzl3bLAHbzlTzPhpp7TWa8CT4DNCFyNbtFSJTd16mbKzgyXYybubbvXN9Mx8eqdPPrUza73Orr6o7u2BzMdwzKQma4qZyLrPxkWXuvunsWF/Mpguog8gAMuAkzM9Q1PuoPmy06VRza4bBmZpfHhDJuLeJnpMVdTk1U5HSZgYzSax66tcyrM5Lr81iuwmy6sJYhxvuNwu2VRBrK5G3X0FLaX0NbZds21JR5iKsCNkU7r7n9K6x2Rjn+l6WC3kw9s/OcFXYy9yjfeJcvyErnQNm5GFW++byrD6QjAwfOT5K+Fiw0XyIQlvptWWUAbT11M23UqQowYaoC3YxQq4irvaF1z2vVo8q+mpPnalUt637pj12HhsT9F4QHagtTnFTOJeZTRdY39h3Vt6rzFbBacLIgA660/783X0R8772zQHSjK3V6quXuq9VvCCST/EfK0j7s/P3AEO1Dk1oGxM6LlNHe7Uq1k5YfvVS++jE6w3T6rCEiODSNJ47xesQhrmQcYoZBYOt0zR9zcak1EnbXOpwx+KM07dIAbj9/8XP77nMr637miqjloHLjGBefhXFtwyfZmyasWK17JrAtG4yMTV8fuSED0O7yQs2lCjBhqgLdvHNfTMjx68IyztCrhzfN9fWg207W87vdiaQYKbCkI0hF+oUYdwUzmU2NkZsbpydEvnABc3fLbe9CYrNzqBfb0OxMqatXa1dZ+2o3zOKG4WCneINSES2M3yuVqdg1bbn/lyqkqxl5ObSUhXdfHjCTiDqxqn2M6lScFzbzdG9ibj5vuTSdpMZBaUoDAYcOXp619gCk+zkAkMxskGfN89s1dPBTaIn9hxm8/2sOLXsXpwpszp8U1IdVxNvvXKGF8GOP3KzlR9ym4LN1faEDCXhXEaOCIeoC3Yrk/F9e+XsONuSBKSOmrlTJ3U7t5FS7vsqImCG5xmWwXPcFM5pUSeLTMsFZ+W9rBxAZUCrSMFM0DMSBQrWY9S1Y3VbavV6mws8oaBuqBckn7yAyYO2Xrzar3d8Oq6mKuqqCmm7X2uvGt6c5tr37vdauJHwAWywqgUHxXPNvhlWd7S44yQKrQRbDHNlMMe6jdO7xs4KE5RBlcGMLEqyfGaDEqMpy6+KCdpzljywbDCyQsmZzX6hWe7YTplVxvXogT7DKO1kkec2Jgzt9xqelupPwuoSsQ4oRF2wez9VLdWkoeUktBksbE+65nrLS630ldSh96b46k3QpfbWCRkvx9okYYi6c5mRj9F0dgYlSlmtyt6dqmug2BlkAQ8n3Ltq54sjUhCt5VK8IFJQqtE14picvKibt8zNs2a4I2bbZsSOoU3QSfs7hOxCsWZJYifIDUq3vTBvbhPh/x97fx5nWXbVd6LftfY+594bEZlZWaUaJKFSSUhCEiAEyMzGmMZMxgbs9oQnPHRju5v2e9jPY792u23z/Prznvm0ee0BGrttt0eMMbItG4QFAoFGEBqQhKSSalKNOWcM956z91rvj7VvRGSpKjMis4RTledXOro3I+Kee+8+5+z9O2v4/SAEWcybkIq2iJ1QRaiqVHcKBnbu+NG1v/pmP12N3isjEaUb1Ek+3lijxELZuHyDKdwJnzlIZcuNzgyzyuWO8AWK+xKspIjGrbea8KXjuiZ2TZdu7TQBMAJk2GNKv06kbsJnL9Is7so0xWMlGiOSHxTLViK9uq9XB0HutEXwWh2eukHdacIPt/nZf3rfNMA3KVZsofn0je7GfWcLr6exCKnR8vdYuQHCqAlUwQutWC/05HStqtUU4NrZeBxJEyz6BaHlVQ/YHir7dXWuBzIQ3uKDza81lO2e6VO3CJ0oboqvjfbkwB3ZvX0DXzdLQBWjWsWtHp/UXTzLbcWYm0djrhtjNfqxckNRtg628u5E6m7aaVs4RSKbUfZW7NBBlZAvKY2odW3T+cG/TZCn61jsW4gVpDj+FpGdaYRvDUySJs9Lqm5DW+TDLkwtbMYlNU9Xk6etfpGiVYto3b4sRAqiV8sudXTMTnFpOcma3KwovoU9F8bvH+4xP0FiwCzSmm4D1W8gUrSX8ApuIyZds/Kq+x6tKqE9Yo1caXeMVKNI7MODwIXf69qHzMFdwz91nYKV9htFmqPEs+y5dlQv1CLU1IFVRtH9sjypjokhkoP2esE8IWMXnhZn7fhz7Grkthn0NVHUqaMxtsrXG4qUd8LJYXfSurtZ4YW7JJGGQr1c2B6BIVG1RvRFfe2QAowgCcsVHUOrTshQClfKaBdauG7CLbP8T0PwPIQNhf2whR04SqzTUz3hGtHXeKSu647aSrYfsgkC6HWnKSQtkHJqGuCbdVXIJ5F023NwAnV4PYH7EPVtPoCvsKFzf/g6Sf0qI+qUWvHqQIiFCBWnhiKbr8WCAT06+ehUIhFqLZtr61q92ITapRb1Cu2vcLNt1Xc1ImLPKPkwVrx4+4xQ6UK2e30tKZHabSZ8bgoWTrRuwOx6bpxXnDYnVwvvlwqjOXUoN9a9Op9xsteJ1N2smGdelDN4Zbm9x+XuZNxOMQY5s9p60YnnaqRPi7vm0Kdbi1QBWJlSr7cSpkjd8xELBsYUNUXVDASyxV2bqFLcic4oadZgHs0UGmuqysHdnmC4XaQWA+3YrqenAb5JUdNJnOcgkrrdgS+grFqZ9oh6oZDgl7aAS8ff59mupUkrSEG8Yt7cSsSay4RQhYi81aOTj1pTeMc2I6+QkBOQaFkwceKd1pE6zNsdrbd2oGfZdVJMoIqHol4X9XnBBiVSuibhZIuEuGM1yCm8YvHr6FjtWFQwMQaHIUX9VMk3Hqm7bTYymy6Um/Re3LnLBR+N3fOXuNApUh3vZs/g3pqjYnR9/z2Wg9XcakTtklLdyDZnmEZ3InUTPquPahpRjKJ+xaEWUxIRiasS1UvrOjs9NG2kddxiHb0bL+Ne6NIc6V8yDfBNCk2ncH8OGiU84ywwH6ICrQkD48oTT17v/rvmnlra/q3tNyLJJuFgt3YyScfIItTaagba+eru7amE/6tbpbVSrOvnot/VIAhaKc9cUyehYWcGlkK5v2IgEgbr5riCa5A68+hEpHXXStk5fg2bC5vu2FijmcOdlI0qHTd0bHvlZKpTpO5mhfS8wMGHyqUzSy6dmJFFo16zJjw1sjYUpM94i3PHxZUbsXuGVd2YOl9vqWVgGoLnIXpWrBp5o7lDrFahxrVq13dxD/V9O0hT7f97nRKrxkqFMlyk2IqcwHUidTftrT5baJ4/BztKuHUYA0YkfbwO4IkLl68z/e452g4oEamTRujWriYeynHWYhZSj0HqmknSvpSJ0QSTw7grmihcpNm9rqNqErUJClWeJf1aIrVqFcbaMTpUFWx9hYSQSZA/i55zkxo6YhLvcewb5y6FVpkbpVaqOaUaxUduu5GjmjKncmU+XSg36704L8Cx1cCFsxfYyRpNDmWMmHM1fDk0nbohtOvW21gi7dpmfNemaecrZG+YSN1E6iZ8duPOkwOdlUj81HX0Q6+4YUvPJuKgflBTZ4Z6gp1trO7SZUfzvdMA37SrwhZJZ+4/cmMp2HKhB+/xOkYCyAruI5AY03Xu+9IM8doaIqx5vrYbCm83EzX03jCnHIPUmWWqBzFUb521RDo2YSS1QkuXepA7IdKj64ibgHz8GWy0tMbfW476udrii6bBBr3t0zUInR8UsloFz+X4pM5h051iylA8av5KxczYfKP7dadge+EENqVfb9rFuOMF1fEBzu1dYDihSJ/CFqxrba+5a52v6zbYDmSO7RO6hIthEsZ5dB0sZKqpm0jdhM9qiPyFc61WSUjStOhKULVExUsN4nZ4DbqCzLVC8GpYUoZLO6hdQLOD3DWN8M164HWOpszucGML97A7w0m4r0AtVA5bi4HMro9U+Gq236izH6VbP3cLH1ipOCU8Jfzo9lrSlEYcR6LbNUSI10LEEanTZ1raGimrjlx4lvlQ1qIrtSn8E+lXmuqjSYvWtaaLIb6NuVFtefz0a1HmZpRaGFWwWiilMo6V2WOPXr8kiQqbySZJk5sR73nMb3fnzlrw1ZJz46r1rI6NvI3QpwPy1s5LK4aNY/xeDJO1G8u4Xw3LyqeauonUTfjsh3UHpuhr54hEM0PK8TM/tB0sKYcezckqSNmjlguQHdG7/QaiBRM+M3D/xCZJ5iTNnF/ekEgtl5cnGuEZG/dyrMnuul3fsT+3M49Uq0Q8C13bdoVbpUjrhK0GtRyL1IHud3gjHj2D7k+f6FQ/fcLz1jBbDX2MZ2lqKITBioev5vqPWjfGPlnUdEi/TqLDtnD8RgmvLCrUYpRqVASrxlidfnv3+q3C+sRMxqmm7mbEox/jxW7cbkZdDpz1bWSffY/B7cZnkCbJFc312dfx2mM+m0jdrYSpUeJ5S+pWBdcZQsU09Ok0OaJCMqFUyK1rotC8YfeXoEb2EhiCF6OUc7g5o92Dv+k0MIlZ3lRYdkiaoaKkEzcWqTu/cxu+aRQpiGaqG2IFLDFep1bdsJyDGbIWHTb2myXUW4SNJqPjRj5G+nVZFKtGTc0twkOM2MXCMCkidtLswZrnRAjNSfhbuKHzZ7nJ9US1TDJgrNhMiX+sU6/sd76aR1Wf1xZ7LOX4JGy0sIpyodSKiiIIo1dmZ5+8/po4FTbFp/TrzYgz29zXbzIvlbI78MRsA20+r1bDf9hXUYm6X0OTE1ISlhUdR/Y7fSRi6swU9yWydQ+raYRvHUyRuucrutzuzszRtiVztETJbVLHqmGhs7W/rb044z4PUgV1w/bOUVZO1hM8eunl0wDfbLjUI7JA6bDuxiKpZXUCs7UICNEr6kFjcro+rbSxLBppE8QEtTivtDXpVLOmwlVQH0GOHqmzMe5OxIxqfqB3544UA/N5d2VdkYC4HOp4FXj8E898k1sNt4qNgvniUOFC0wwLGZVIya7TsSa4ClWuw1GiGtmd4lBMQgPPhOLQl3J9pOyvvddPJNgow0TqbkYM8DJROnfKzsCT3e3kVY8dtvzqiUysZLzroaSwBKtCXdfQXXHJ0ZwlXjjJD0+kbsLzAL4iSUutWhSM4yFlytr/1Vr34SEP2PW2dpxwDO2U1epxyu5IFmW3vnYa35sMtpzhtsDp2L1B03avW4iP4ftrNcyGPPow7TojRV5mGKFFZ9biWc2vdd8HVgquFfcRO8bUJCqIGOKFJEEMk7aonTQdPMwEJ5obZD35uSAeZCxduPDp9WY2ItXwoRG7Wqg14oy4h8Bw9ZbF9YNonUtYi9VjRur+0n/0LXekGoMZVRJuUKgUMXpbXV9N3O3n6brEjInU3ZwLsfBiUdJQ2Xv4Cc7obXR7I3VoJE4SLhkvOUheiShe/Hz9WGPz1G42OlgtKO/9Grk4jfBE6iZ8tqOrSwBm2SKnKgIJUiL+vd542r9TK6tLkZJFHclKt3qUcViSslP986cBvslw8cIc8U3Ee2y8Ma26UVukzoL4ezWsjpGklOuryRrGOVZ9v65OxdFGvFSMJBVoj+mYEgyq4YiihpihjLgfkkwRr3WtSnegfLIObTTdOpXu0wnYMi4FZ72IGq5Aam611qJ07ogJsp5RLTpizZXj1Aayvc28CupKFahYXI0OtVbS5e3rI2X5JH1y5mospovlJsSM+zThZeTCk+c5e+IEneRG5AwfG5G7YooHGCFrq7/rYU3oJHrKJedJzmQidROeJ5NE2aMOrZO1RURigQprMH/a1lyQaE2yuDt9an18KTHsPUUZLgKCpCn9erNhb2cDlw2qKynd2MJdywKRinsJXTkq1VZYHSnl+gr1x7JAUqtza53WfoV9XWuUsBH3ciCregQI2l5vuJQWQ6stres4lkKxzq0JBHv0SOAWsiQV9NwzyY8s2wLpVM/UOjYlvEhGCzWidhbMy5u+nIkEJa7HTL8+dYHNWhFv1mVjiSxaMUpx0ri8vkYHnTMDepUpUnczIideaVBH41MXnmTnZNzyuLYonDarr2K4LONnxfCu/awYzg6UESsjVlp0b2n7nW8TJlI34bMad5/cRbpKPrROuTmr1lWYgSRRZwfRDbtGsrAPr6OEL+wi0e1dwO18dCr6pFV305F43UJ0EwVqvW5S5/62DaTbBBmbxuHap3WAMpCuk9SJ9KFTp4aIoWrN4yEebZ2KxUgUGI4haVJ1n3rR2llpenXRhGGkA+mRuBSiQWJNyNyR8iydpQYmHeZCqTPM9CDKt260aH+HhQ9a+wh4leORun5gUww1p1gQQ0NxV4YapmPXlX61XTZU6F2mSN3Nhh9/v3++d7zUKmU58vCyMizmLeLWaupc4zarrzh9kyvp4vfrCHKdYWq4ZpwBvCJdmkjdROomPD+w8dA2apWVCfXQdZ3EQ3ShWYWvy76LOKXV1rWg3X6sRLOi4y7D8CQ2OrW+0Hd+biJ2NxPqbIGQKVXIixuQrbjcI+lUROm8IuJRU8eI15F6naTOybg031cMmvgwzcFEpEKL4rmXY9XUFUsHEibi+9OaNLmUJgTsdmA4weFHR6homn96qnQ+hyqYFiw7dW8VVal65XfzNaMTw0UjNVsFMz/eHCvOJo5SqLVQPbTGzIziDna9kiQz5ir0Gbami+XmwlOf4gvmc06aU7dXPGAZGZuwsNeDdKq0ejptYsJi+F4jd/tNET0wNLKX8NUkZzKRugnPD4j80DbJKtmEpAcNEmumVlVCx65p2VG5olHiig3wbNjeI9hgeD3Jo4+/ahrlmwiWF9Sq1KqQbqD71WZoPtmIXJAwUqH6iOvyWF2pVxAfSy3ZeSjlL4ZIifSrR5QuHCY8nLuOQxgPxdXUo2YPAw1V4NSF7Ii1dKsrXhXzJiLsjugzRerm7Ae7u4QvTmIpHb7O9l2SRXkaWQTcjxepW2Y2TJB9ezKlmsZtVzHM6vVF2mbKpiqdyETqbrr7MeU1qSdboTx1jgcWp4O454qsiZ1rbPQHBK4kXGfY0qmlx0bDi2Blhkmrv9Pboyx0wkTqJjwfMIxLqrbevjWhkys7YL1YE2KIjcL+87UbxVgsTJbGT1DGQnKh1i+aBvgmQvENSk0Mg1CH09e/o70OZwNjhbmBj5FMtBG3ERv9+u4yPCqD3KOE29aew81BVa1F7SxkTkoR9yN38aZ9nTuVK2NjZq16jnU3dxC7Q9E1D19Yr88QqdMadXhWsLGj7rW7Imn+saxtxiJW6OZ4kf1YuOsx59gM8xJk0KpjVuL9qjNWx+Q6u4+HyoYoPTqRupsNXc/nAqwKl584zwP5JLNxjJRrbptrCP6MxM/XLhLDQETm7KD7dR2lY4TZqYnUTaRuwvMHi9ku1YLUFdhfatSvJHLJD7TpDrtLrH+vWhlKRoaHGYc9NBvo66YBvokw704hEnIhY70BKzdPJI0kTtjTBw0SKeG74Lj/+PH9Xw0l+7CfZhVp1MoOadW17ljHItL2a0erH8ut+zXZsxFKJ7Wzfx1JW3fCOu6Cu2CDfvp8uCp4La2mrjLmGRVtTRbrftpW0IAGAaREXZ0IXo+vU7eIIr6oL3SloiAStmNery/9KsqGQzZh4+/s+Inpgrl5kOZ8nhllOfCpXzvHUxtKX1IUP6yjdLkiXRfRu64Ru/Xre6A/nGRtz3ULm+RMJlI34fmE02yHPkmrl1u17ta1g0ROV/EUKVc+T4uMLp/E65OtuP2+aYBvIpR8ChFHfETrDXQ4VsVNqb5sUbqod/M6gg/BhpbHL9Z3ElVjX8qISImtiQ6vGya8EbxSgIeO5nhTyM3jVbDa5Hqbq8S6YWI4IHOurUuVg/o3F5zy6fOhdLhAdY9tW6imh6J8jrnup2DDH7bdLlFxrcebY03JRIduMYNSoxawEg4T6PU1SuSRhUDnI1uLx6YO2JsFv3C/39d1vMiMcTnwifOPsZ3n4SahEinVcRn1mcUOul7X2nSthO6gcK4PXbu+hyFPTRITqZvw/MI93Wq/Lm4mLZ26FhteN0ZIRPFya6BI+4kjP7Q8GZKVvHMJr58K0Yb6UvdfvXsa5JsEo9+BUzF3ar3+mrpKouIwDJiFzAhuiNXoN6Bjd/v4KTwnhU0YhugBgRNf6+FZ+L6W5rCKwXi0+ck9t9JxaWROomfV5VAN4H5kQyW05nSdQm2/nMszp1/F8N7wxRzb6Jv3qzRC2NKvLZrmou3n8Wlc9ZikzulCKRl8nU5zRA2vThnsOhslhAWCOmxKP5G6mwWfeJA3dDO2gLI78Mm9C9hiQant9iSNWFo3RrQ6OloTBcCY8VmrKJXcdBQzXh1FJyeJidRNeH5BHrvAsCxUEwohVZIOpV3Dy9VRml2YRcQkpShct1bAvk7N1mFk2LsfqyNW7uSJD7xyGuT/8nD30yyXd2A+YNUp44b7j5y8vp2NGS8FYwVeQjNOKlZH3AbM4Myl49d1WdHoIcWinm6/KSLOOfGKWDRN1GKkWuHc0ZolpAkLi8tBxK7RKjuUkk14aiQOjU2JBohGzD5tPswai6olShqxaoys21/XtXnrryi4J4wKCtWVelxJEyqd11CHHCtmtaV4DTOnmF4fqXPjJEYSY9N2r98/dsJzfC9mvC4LqYyszl/m4/1JumXBVLDUUdNmbNWpRVszhMbVNFpIl6xdJzTjA7AaoplitMnzdSJ1E55fnE5+aBtWIyJKanV1hwPyrq05wg7ZgrUGiqRO1iCBCSObszkXsE/gdWQ+z1wqXzGN8s2AD56A8TZSXZFlQDjBue07rmtXF86eQKWQWKJagthRMRsxGyN96vk4u3R/42YIBFtFWperEhpya3eJapHg9BqROx8Nv5yO+AZp/8QW1xbyimidAqqQ2mSnhzb2NepCnvsZ6t/2emxvQa2CrU5S9ypuGjV0687XRu5EcnhvWD6Q/D52pA66elDn5yW6c9UFcxjN6P/kz/qxCbsNnKyFZMZGWk2Ruptmjt7iC4vQjZULD57loY176JdQq2JVsaSY9dQ0j+fZqWk80KPTjfbYonXzjHclIs79afamEZ5I3YTnG2Z1BzfHag03ibZ5CaKWPBI7bSUM8QSgmLMsgK4XLmOcz8nDJxiX24iC+5dMA/ycRds2rv/VT82QusBtRFghac55br+uXV3yrXB1kLgF0BxEzm2EukKoFMvH2+mDubmsRum31+ZD3KJ1dYjuV21erYpRxdnTI0a51kSuyaD4+t9NJdgsGr7Dc4K1UuN6Izpj3Z+hpm4xoDML0dfFbvTvqiHusa0bLpSmntLswzS15oZ0TJ06pcei85U14Yy0cI0SO3qT49fVaWJRohG41zn5es+0v/bQ1GTxXKJXXuuG7RUe+/CHeWy2oNsdsSIRrSuCScW1OUVIjtsdqfhQ8dU2VxTV2S4yb+LDv/RtcnYa4YnUTXi+YbGxA4QGndeDLfW+3+maNJ6v/+31QKNuHc0r5ozS43tP4uXJsI/S17nvTBIJN0zo3noH9p/uuO4djKXH6HFZUn2ksqD215d+HewkSQfEanNoMJIWYIXIgFdnlo9JKoaM19a4EOE0XJwsQeR07SZhdsgBAij5iAOY9nd9BUNyQSKxmgxRhaRrBvj0fSD6bJpyA2iOtJfMm6KetJijEvV1a1eJVlMXWeAggF//CT9yjeOqojVhXqhriebGOt2NMo7Mts8cn9QVZ17jiHYzu75mC4BPPjRF+Z4r/Og7/A0y40XmlO0Vn3zkES7OTx0i3MOVhK1f/6yPWjptVmDrHKvUKJ4YAE5M9XQTqZvw/MRtw0VydXK2feKWsh0QPG1yJ+3flo00a8SvRfFcHR+cmhWxy6zGTzAOFU/38qF//IppkG8QZ5/c4szjp6779V2XMTrM9hBWqArk66ubGusi6igprdbSm5dBwWulKOz4MRf2s/NGnCIC514jUtdSrrXJmFRxwjA1kpeXhiOmX01DfsUO+UYY+y4TJazxhGj58EO2XhACKy1L+2nvpz1mRpWE14RpaS0fh2ZPVaKL3Ig21RLVgQWqVXQ8x5GFlB3UIhFstVLcqFah1qiW9EK/eur4dXVlj42xUIaR2bmnrt8q7MkzTJG65wjnLvLVKdGVynD2Mh/aKtiabXcF8fWmB8/HHB2v++dnxtOsRfTCs8XpYbefUq8TqZvw/MSdt+1gWqGDrM5cQ2A4m8emTgZy+30GqPHzQvyMpnRZB2E2Kux+GHzAdEHtvm4a5Bu9CpcLLu9ev2Dwzs4casbqCmfAa4J8felcGxataSEiZupOqgZNQy65MB4zWnOOPhojqOR1B+xaArhF7RAjSdiYa+vSnh3RVSLq5w55yLYIIC1BqlFe4PuBvSB24ohIRNtcEfdnTkvONkJSYrPDOQFIxAD3H4MkxjM9VGsX1FX3to82z37fv/NTBLEsDlYzbpmKYia4O6VAGvvritSdqpXBnSyJ64ri/iX3jTs6Tv6I+8npor1x9Kf4cg/5mssPPMZHbv9CFiPQ1/0rUK1D18SOHjpFRsNnbVMN94jZoZq6rIjOJtHhidRNeF5C5Pu3yWVFKbrf7RosjgOROnWoYSFOq68rJmBCMYk/66DXyqgLZOeD+HCBOoz0m181jfINouzN2LXrlyEp2/Ow4bJVsG8FyrEjde4f32AsW7iGl5xZ0B6I6Jl5VHppPR6pkFluRloj1Q3zEB/21NKvYs3aoTa309gGPYYlmVdUKkmjLs/VcK24RBVcDY+yRurie0hQV4Lg+fIZVBtnA8oAZQyDPC7D0/1cP03yWLBWB4cKspgdbZ59+AG6UqIHvYzRf15GvNSI2lmlIMheOV5N3P/+V/xur5yoxnKs6O4et13Pabb3MMkvsfXEE/TTRftczM28plTG1Yqn3vVhPq5bbJSCWSNwpogVxBOyvo0aWip2zJFqhYO0a1GsDNFgYV/GzjTCE6mb8HzFibyNqBzUzO03Q8SiWUp73h5rUaoJkiSmCFGk/T6f6JntfArGR8kiiH6x7/zEvdMg3wCWZUa6/pQYg23iJngZwCu4oH4dtU9vn+NsYl72BXylBkXZpy9V0HK8QvtRO6rHjYOqIXLQ9Yrbvn6dh4sCaLhO9Ef8CqpERE5t3wSMtf+rR5dtar/hkKQJkXp1QQzUyqdHwGwIcjYjNOvaIqrSqv8EkkhE/dZGFTXCghKXGqno0dKvK+iDazbrMQ/BPYfqNbpfx4qwdzxSt7yT28bKfKzsWcXG8fqaaMY9ur5j05bX32gxIfCT9/trdc7nGAw7I/c//D7OnLiNvO5q7YG+jy0fSsX2V6HTo+HMoDr1I/fJ9jTKE6mb8HzFrGxHavVQXZ03qZLDQsMcapwAWK1JX4varYpiJcNqxWr716jVkNkL+OTqi6dBvpFIXU0sV9dP6lbjSaQayh4iA+JGvZ5u2tJhbOIlulGbJvA6jhf1au6IHy9SV/Y6Mgd1nNRW/2bWWgwM19YwIZUk4Txx9JCHoljU0Inv19K5GeZCCUsGOaQpd1BQd/DfOHx6BGqPqE0fG6FrFWVJBE2KSnObddDqsfASb4dZROqGp444z26QNFLBJila0cUwFUYRCsaYHNeNY3bUdmwMI7kYy9EZDa4rKnwyoQk2b988tvXZhKfhwUf4CkJzcPnUDu9jFmlUSfis4pJbrLmRPGk/u+KyX7WtPQfIjtrkJDGRugnPc7z47ktxxXfQtZvszJWademwZl37RVpLnaybKdrjrE+wfD+dbuN1QZ598zTINwCrPcj1F6CvhpN4qfg4InUEDKvXQepWM8gz3CpWGi0Rx2pEwKzZyu+Nx4sCFutjf34QJROPztFOHFWn01azl0CTxczkeuRZbG3cJRiSQrxEWzRQxElQ1x2rLeXqFhE0McQLCXvm+VASPush9bjtIZJIBuqKiASx05DwDnoISSCJxuMdtx9tnrVCdkeFcNxFcc9NQ0+pQK0JG48paGzzkDMpxp4Zq2W9vkjdpYeY98LJS5+YxItv+D4u85tWFa/O8LHHef8r30DvXQgMW09NEqLXUvEkQfj2O2FX4DvIDOgT0hdkNot6OxXS+LKpSWIidROe1xD5K+exVY2S8KfdxJX2f+sU7NhIXLImaSIHHbMpG8NQGecz7NyvUffOhqBs+ZpplG/kKtzIlHQDpK5sYbVQqQgD2MhYriMa0ytqmSwjQvNjjZAXtVl6iRfcjhep2yl9WHc1nnjY9WF0wWRf7y2IWFOTG/XojRLWJIRpaV43a120rdMWJ5xmP23mc0eqI6V8Olla9i1a0uGrirMd0TdxVApKxLuTaNBHJ9o93FGvQfhWq6PNs2VJVyU+o/mV6Vec6jB6xWU8XvqzzpgXgzKyrJXlUDj5rx/1YzfmbG/Tm3JS++uXRJkAD7hvaeYLa2EYRh79yXfx0f4u5oMwpkUIC4+GD4aXeavlPHyVzsJBwgvCCpiBF8R3oqFiPM3uNMoTqZvwfEdOe4xDTMZPn5KTRPNEl6MrFlrXa4vgrfXqZhi9VmyzY773BL78GMkLxsv8w//oN06DfJ0Ya4/obe5vO7asifvHN6hlM+zjDSqtOcCOH6k7f27RyrNbWrRGLCt5E+rQaGw4ZqE+Th9CwOvaPI8+UfHoHzUXqq2FgyO65uLsrPTI09haVnj9SCOHsiZ6NNm3Z7nxAanP5P6wXh5X0GeqznGBJIbSyB2KupNdURXEo8ovFPcEWdWjjdfgzBxUQj7ZLVwlrLYiQTNKhVqOGalbJRa1ImOhlMJola2zw/H15vqOlOHkcm+K1N0I/uN/4kty5iUqlIsDv3LpZzi3tYjUv20ja925tebc0BMidW0bCCInmwdkTzLepeiMvf91cmka5YnUTXi+Y1EvRSRuhKXJgcBwdeiCvKkbOYO6kdzQtQvFGP9GnRxO6Vhn7F54L3UcUUtY/oZpkK8Ts14R3YCt64iAfHJGlY0gczhuFfcBs5lv/79vO9auahdEcGzCpdUKpErRESHkcM1r2DMcB9IfInThkbD+t0IreIvWAAP2OctRI3Xr+rzaGiNaxE/E93/fYcURXwsDP9PXf4b06wYg5Wn1TIJaI2/7qdzD2nfRQKEYYoWU6hFJmJEZI0pHBa+41bjaxjDFMBU82/FIdd8xM8GrMZizLMZsdzx+B+vpjtTDqZLYmC7a68cA35Qy89xR7j/LuzZeQy+5+cEc3EOwtvvqmj6dZDwtQo9u/4/W9007SLdAZrNJdHgidRNuDbzs3otkcySFRElt0ZGa5ECHLgml/W7ZFt198eG2tJgbnY0svEfP/zI2XkB8JM++fhrk68Rqb4EzZ3d5/OvRn1qALZBSoDpiFasFascnzx5PT+zi3lY4MFghi6N5DHmRseA2oDJSreBm7m88enp3b5WhNB251k0r63SsK6lxHinRkGMesagj0w6RlvyUK/OqEi4WapCuIGVh5kVTsmsE7elSJU/HsuKXlohDJ4oI0TULJG10Vdf7j9nVEUTtaKQuZ7rWcLH/n0QiGZTqUKXizvHSn0WYm+AFRhNWJHS1c10p1JwSp2a7U6TuRjC/ja9HMCtc/M/v4gOnX8+Jy6uQyvGEJEO7ggxrQtfq6YYBljuN+DVCJ5tB9tZET++eUq8TqZtwS0Dkz5yFFCpHJVYQKIeaIThwlRibhl3hgOitmyUwZ8SoG5mtM58k1Y+BLUFf6w/8i6kL9vouwxma5uyW40tFmPeIzTBbgRtjNbwMlCGzysdLsS1Xs6hDoyKU/fq2lApJRnQYwcaoeds7+tyRXRGJijbBsAhyxY0C8ajuVBVUHYpQUDii+HBqBFHQ/eeIRNxMomavom5XNkoE7zsQIh6fIU2qYxSsZ8FywWWOi6DeRIu1jUJklw/Su05ru1BI+YiNEtFFa7SyQ3d8HRMVw5JQVKnlmJG6sbCIYCbFjdGc7vwTx0+/lsvM1DnR5amm7nrxd97hXzjreZVUyt6KX/v4m3nqnhPMsqO5Q5OQXKM2rtODSN3Tb3C0e1q0bhaSOx/9HKbU60TqJtwysOUOFSWto28SzhFrKZN9TeJmEXZ46SiH5U1GKFlRRry8F8FJsuBi+ZZpkK8DrjOQGRvl+FIRTo/Q4zXkarWVT5sLZTheRKXmOSLRg1ml1aYpSCpB7LqCUkKQ+OLR03dVJWzALDKfnVqbfYxMDWuw9Tlq6wieUPyoNXVKkzHe39yCcrkn1IX2ZbQRsfWWNe5vkiLKp0fUciN0nWKbJ6hacGlcrlmLIS0KaC1CV1vabO1pMe4dLVKnKfwkJDgineBJcQnRFkcaycvHlBQxFl7BCtWNEafbG4+vi6hCp8qmpkmn7npRL/CbNbPVZeyJi7yfO2BzQe40RImyIjqSsqPZI3rsinRNo26tU2eKjB0+dviqNUsMGT/3xXJ5GuWJ1E24VXDH6izDSsNVohG7saVWnaiZi3hDuEuM1nTFxpAzOVyt4cXYOD1Dl2+n7G3jdSTJN02DfD0zvc3Aey49efy01rA7w7Wj+tBEfCu1DGBQ5XgLt9cekRpCwcVClw6wKtQmdyNSGVHOrI4R6UkgUklaMAkTpDC9Mmrr87QasSorwliEWoRyVPIiGVdFVBkto56CbnlCiJ8nRFOzBRPC7DXieBHa82css6M/iY0aSeONGSYjniqa9GD2FG/7rDgjiOK1tto4g1SPNs+6k9cyK75Ou1qLb7YaOxHcy/Hq4QZjUS0S9LRIXR2OXxeXlE6MRZJJp+66F9w5v6UWrAzsfvBT/NLLv4iNKpit0E4RWwWJs5Z+PXygV7vIOgW7WoGNiI2IdvgMqCcOV9lNmEjdhOc95KX/4FE6K3QZUmfMuwPx4awe9u160P16eJOVXJF0KVVY9QsWZz6JL+9HreD19f7hv/v500gfE+M4w8qCS3vz63jtAi8KdRUyJLVAHRCU+YnjLdxmM0RqdJ/SPBNaOIoKxYXS6uH08jGIRQpPhKBpIb2iauQUUr26dn8w9oWDAcpwtPnJvUNMMcsgaT9Cl1URTSRVFE1NMBjac4m6OCL0Ziqf7vww04jUzefUkwss34l5QvyQkPE6Yrf24FCFpHgSPCv2TBHAZw6otStMwQytNKnnRvRMME+Y+/FI3WjMioR1R4FaC9mNreOeajbQ4cyG1ZR+vR7881/2z8s9X2nOsFv42Ds/yP133sV8BHIKwaCsTThI4/nBPXSzDCuhT+cF6VNYiJnGpgsmF4kJE6m79aJCvhuJouqMY5A3r87Q6unWmnRuTjnUfZi7SL0WE0oJvbsLXebJj8By+93U0cBnXPbfOQ3ysdGhmpl3x7f2WjY7MPMl+Ar1FcIKx0jz4y2+njpMS6RJPbxe1+0Ea9qhBlaVs93xuidVg9ClMKgLF4nQ8I1onTd9Om8C2O5Hv1uxjFjEzsJbogM6jA4nU8kYqkJSSH2IA+8Tu9TIXJJPnw93Rnw2p5QV9XSmpCcj+uZ2UENXBREjaaRLEcFTjiaHZnp25Jq6WhErBzOzh/adjwMMBW3Ru/wtHz+6Y8hozC1EaSiVWgtqO8cndVlRM7rlHrPpkj0+ts/wrbnnlFXGxy/wnvMPs9v19OsMSK4HxC6t0LRCq6HJ0S4hsz4Ehj01QldCeLhvRO+Xvk3OTqM8YSJ1txrmy4uslrrf8breYhmMTUyQRuhKkthofwv7xXfFHHnhgrT8OZQz5LRivvWd7j5JHhwHkjKiid2941uFjbMNwLFScK+YFlSG5lB6ZFLn/o5NKD2JkSSRHg1XhkZ1WnZy3WWaxqMTRkHJGvt0qWSpoXlXWwWcehMIjv27+n5H7DU/98+eBO8QSeA9SgfSIZpxzUheV4pqCo2UtRSJts5VFUGSIqKfXis2nqBeMmpaUr7/a2RXt3BxVBRE0UQUtCcFlVbN502KRHFLeE1Hm2erkUnhIatxBYok0tptVwhfCRuZLT989GhZMea1ghleC9Z6kI9NzMxJq5HZanUDPsW3MErH7zBjEGfv1x7l3ffcx6IjorJmkXZdFWSoyJCQEWhy37IsyLLG1rXI3Dpe64ocqkqdMJG6CbcU7ixnSaMxtjq5dep1nXY9LGGSml9n8nhcCxJjTjanr5WtrY7hoYdZLj+I+UDyV/HJf/aV00AflUz9yxOkltDDjh8BWdUtqhVUR2qzxnIv1DrSHbP2qYpQsTDOSgVSc39Qp+aofQu3B6Eujl4sL0lZi8O5OJ7CckzX3sNYo0pB7ERkzSCPEP+IiFwhw5rIkXFJCAnzTJVEJWlLv64f2zuuaavKM3SVLu+knocx39WsWM5GitVaxyytexaNqkAUNEfkTwXJjsw4YmOB03kNJ9s6oh6LfVpr37mFdIoU+u6Ro6Vgv/gH/ZQZndeg/YPhpcKqHN//dVgxGyvd7nLSqTsuPvQJf1nqeN1YGYfCQ7/8MT54z4vYWAo1p1ZHWRpha402rlFX5y0qBzCjNbwOYCWEiruEnJ+zM43yhInU3YpBoZf8y0ukfg+Zyz6RG7uDoN06AJDcyNWZ1Uo2p+siarcmdpGGhRVK3U749jvIOLiya98xjfSRL8EZ1btmdH/8CIj5CcTHZnIV5gMiFSnO7t4xSOL2ujInomgisS9r4hqC4VSWa7eG4RiRuqqMJvulZQr7wsBJnQSkBCaCZAk5EhFqPQIp3c2RdBVBNfppXVKz78qoaoiPROpVw5NVcTQrKuGXGRE8+/To1wd/u+yc/mLG+akgdXfcERG6FoFE2zsjaJM40U7IKkHOgGzLo0XVpKPfJ5oasimt4wPxaPJwwZLSdYujkbq7ehbVyMUpFi6+VpyauuNH2/YKmwUYZKqpOy7e/jF+Szdno8vUC5d5++5H2Z6dJInhUnnWUoNOkXGtsdgfEDrNYV83I5wnzuxO9XQTAlNr+q2IF+o5ztgLqe4H07MKXWeMVcgpqp6A/TQs1cmpNVCsyV8VxsE5fccm48V344snsJShfJO7nxKRi9NgXwtjj1uKyNhw/EYJ8UxixSiG1ErKIKrhQZCPsfhejuoyq3W/ScI0at8MQ61SkyHVcbUr6i2vhWKZTh0zabEmgQw2C5oiRLerIXgNwlTpML02qfNVR5WEEyQwayvH8xRCIO6kkDxJGuRLBU053lmV/V4Ql2eeD9/7NbL73nVgdAOVvSCDHnp3iDa5uuYkUStCT5YRc31m/btn5OdC3ymdGyNKUsNIZD/kdOGGiZGW548WhZU9NkehFw2LMS1U6RgoLP7Wjm9936YcmQzs7HFyFr3W07pxTOzCd24YVYSddz/Om/s3sLFSqiV8TFyhLLCWyRHD6aKbmgwsYYzbFSSD7OG+QLpMOfP7ZSJ1E6ZI3S2LF9czlFUIvI4q+yKvY2334G2GkUMLt6QDnbpl06rLyZlJZbitIz1xhrJ6b0R07F4+8A+/fRroI6DqLKZsc8bxWGkt951NbIx+UjwiaIY03cEK4zEidTlEertcyCk06tQdTU18OBVEKj2FYnZkYeCYZjqQkOsVkyCxRaEqpWbMEtIial2OCreUBZlde37aI0X1mTprhibKvrtEVMyxdpqVVlfXEtWi3v4N64jeVTGsIsqXEqLrxgwhNbKY1eiSomJIS/VKHo5GghQ6VZIKqZmdZYEkofIXUsoJc9DlEQWIFzPmVdAqDOKUIpSxMpTK4vLDx4u4ubFZCqUW+v/Pw35yuniPhh99l79mtuA3lcqwO/CBH/95PnL7KTZXA7VYkDftMe0xSe35DCszTJqbhFpE63pgbvhsaMekIHIPkzbdhInU3coQ+Qe7VN+Ncm87cB16+hSfW+0ctFq7VWjW5eqUdb62EPtIC3YvvAUrYSUl+vumkT4CVt5Hl6Y5y3rMSN17M0PJaB2otQkG0+wN6kgdjxFRyUG61rVvkQS0qPVzR6WQvCBa6LVwHIvJKh21JKonikda1D1Fe0GN566JnBOeFEkJV8XkCNGojaBq6xCHa6vJ0xAwdtknn9J+IxIydd06Uhe0T45C6mpG3FqaVJHkaFISwaS7BJ0ISYXOWwpYjmh4ViudRHo4iZE8Uq7q0ZoSfcjxrUTnR6yXVPoCjJVxNGwsuBnFoDt34XikzoyN4uysBhZPfPj43bO3Kh5+lO+ZzViosHrgKX5qPuC5IimuWF9vRYPElYIlxTQqTmsSTGorKngaeuDJzamebsJE6iZ87qnzVJSu4woNOrFIw+3/W+WKztiY3gWSICbUooyDU+YL5hc+gO99FNUR4cv9oX/25dNAXwMXzm5Qxh7RgeTHNFnf7aHMsDoG4RoMcLIS5dZjcn/bEaN/2xmTFJ2oBHUwiWZRSdGlmrViWlH1iLQd9S7CM9YiYe4Jp0NQxtJTc4tL1BlVetx63DrEMrq6NulY7ir4QY3e+jGey9MlhdeETpWEkpKimiLSlo5A6m53UgpnhdQluqz0CXLzZsmi9O70KJ0LvQgz7GheqcnpDLJY1P3lJpasqfm/RNWhqSByRAHgzTm9C17Dz6Np1VBdmA3Lo3fA/uH/3e82Z8OFy2bMz59nitQdAZ90v7u/g99rwrY7T7zj1/iFL3g9J1wpsoHrDMsdNffUNGLdgtItKGXEqlNrH5sqlsYge1JxVtAvkH6T8uRXyETqJkyk7paP1r3gBx7GctTQjRxo0I3AOMa/ReVKbToVuiRUUTprmSwNE/ZRO9KlwnDpZ8lmYJtsL3/vNNLXwFi3cO8pQ4HjykysekQyKiuSVETHKJ9WQ2QJ1eF9R4z+bSfcE1YkKsGIBJ9781Ddb3IIF4iVHL2zVjxEPdSFJEJCWw9pQmvGLaOWoXYYPeYdpfSUI0qyOFBtX3WlGaeGJ4OvvWZxNxKt4UDCFgyHJIbiJDtCSjPNSUnIOOoVRUmNKKasdBJkL2slZ6WTRBY5WqTOUgyyO0oONUnV5iSRKG7RrKIFYXn0jloTpAjFYpRqjcdu3D66iHHJbBh0tbJToN8bODFdvNfGz/w037q1yd0VxnPbvOeXf5kn5qeYV8EYIGlccWXEck/dW1LV8G5GTRrt8Gr4WPEh48MuLhnXOdYVZOuuqUFiwkTqJqwxsx20v/IcEDuoldobDtVNdTB4YmUJMWGVUtO3T5glKKAnTtDtvg0fHwcfIX+Hn/nRl04DfbXV0jbJnsAGap27/+Cpo7/4bE/1hDCiGOKVpEYSI+uAJgE7Iqm71OGWQIROpFEfAY8E4GEKYS5HamJYo+aEtyjduBYDtox5R60deIdLh3mHWka9Q6TD5Qiko9V96lqtdz8XeyXrs5AfISRMkkQ7ibaqOwUS9dokJxdmKJ1ConXRipBFUIWUnW4d287rVKwfMc1pLWLYQw4vjHUbiWBRTycJIwGro5E6z/S1kqiY1yC81ahWmNnesZwpNoG+whIjux9fEuVWxEX4Qzi166n3P8nPvOBOero4vj3QNeHgWTsSsxloF2nWGQfPtcOTYmmBjRaRujHjP/8t8vg0yhMmUjch8JLhTPi62pUadR3R5drlNfEQ6iGyN3jClsqqKLVE8TsFVv2CcXiK5eV3gBRqvZczl//raaCvRurqnFoFbEWSnt3+6FITJWWsCMVCeFjS2pEBGEvYh3VHrKubdyiZUiMq656ojQVYC4GZSAgEJziyn+kbN4P+KHhKQRhdg4x6As37m9B05lKK5/XaZGiwdXdEKwlYd9ceMmetLlTEjCxr94dwlUjqB04TcgTyNVuRFXqUlDOaFEnxWlUinSugnUazg0LycjQC1oWhGa1+TrXuy5vgYCmBtkhj2TpiR60xc0fdcJPWFxxeIV09ht2YZDZNyLUyjIVcdyZSdy388E/6l843+eqhMOwMPPiWX+Td976GrdVA6QF6sFaX6Sk06joNP1cbkdUMVqtnvI0xZuCL4xS2TphI3YTnPeSuH3qcoTq9hv5c19a0fSHiRvbWy0dqP0/SLMRUqE37vriwGoWZbmLnfhrqBfAVY/rD7n56Gu1nvQK76NZkpPqcT106eq3S9sUZZjAWo7almuRYcmqpiCp1+2gL9/nLc7xkEpFyLaYRkfOmG9dFV6qjeFV0OGKkbk8RSVHeL+G5sNaUky5FUwQZkYTmIHRB8jokH+E9xmby1bprkzaVONWIxUmkeUPgNRH1b0kkmhFEyO7RZcoRSN2Jjl6jlk66qMlLa607FRJOTkbWdb0eJNUj6tSF4t7+xKzBPA8aPQoihoijmaPt04y5OVKa6VtTHfTqdJ6Pke5PzE1Rh712FPvp4r3G5el878YJunnP6sHHecunHuayZ3oxfNWcIryEOmRdotXRvSVqGg4S+8SO2NptkPgGYh26+cop9TphInUTno6N4SKWE5lK5AWcPPN9twlXB3VS9f1oXXUhZ5rGPpSyXkEqw3wDvfQR6uVfwlmCvpIP/LNvngb62VZdzySpKLu4C65H74DdHTrMheQVdce97qdLNY1U4HI92uK7WzqqHMwHemhqqM2ZwcZmiAWRcj8KhiCC0VkbETpc4rvWqONLIlHP5/Ho3jpix2u/hyTZJ3SIxP5hv27Pm+V5JSUaCUshYyIpqvxUyA69H4HU5ZGchJyis1WTtiifNLLV9ieCZA1p5XxEsV4xkjatuzUBayljWXvMVlBNYbx2pEipMfOQa6l4aOs1R988Vo5+rhXmEg69g0UKdyJ1V8G/+rC/vNvit5Y9thUu/twH+E/3fQknTbHc/F1zI3TeZL/LQNKRlEZSp0g2NFd0HcFbR/HyHmoFeedXyJPTSE+YSN2EK/EFd59pi+Ohc2HtMK3OIjVi1x38LPXNdD0cwkPWtACDUwche089+9OIL3E3htUfmgb6WbBkgVvBbIgo2TGswgZdrJnhfpOAKkFmJIyxxtXRFt9lmoW+va+t4KJ71Ik+0XWNXW/R7CD5iHPHXjRCSAqhYVfFPGrsSNKcH1qEam3Y1baj0MadIe0TuuQacQ6JCKPqWqYkbMAyKUlsqmRVctL2HDJXISo/uBN+xlrI6aDdQxE0K1kUJZM0hbCxhuTxumbvSMdAmrNFOuh6DRcJmlByQqRr3rVH1KkrzswNsbUzaPRHQ3TYHlnSZDTm7rgJgwlV9fjesbcSHrqfb+sXnEyJ1ZkLvPvt7+WTt5/mhKyiDck1PGC0kGQk9ZWc50jq0EJoFZZG8NJAKgPJlmjnaBlJ0jFMozxhInUTnmEh+f5z+Lik0DTrCDswMaFP0Q3bAajT9zXM1t1QN5IbqUYUL2zMHVsV/NQWPPEeGN9F0m1y+jJ/4J+9fhrtp0VR/L0nqLIJeQBbRSrVjh492fMFY1FsXfdWw6rdXfCh4KOylKOROlt2YIS1uAjuFW82YcUize6eWDWtubEckRB4h2tmtIx4JrtgrfZNXMjeauwitrZfv6catXvXQp+D0KkL1RVfR+tcEFNawR2gjcylJvCbJWrpsnqkS+1ZUpp/9G2+cYnm55pI7hHtS0pK1vYVTRJBGkGzhDSJZkSPGNXqBMmhEChdQrOTs5JSk1cWUC8kAWU8YverMbMWnXNwgapOQXA7hqOQODOUilMExlQnq7Cr3m9lfq9VlgjDex/kjffdR7+YU7vWJKFC1p5cY0tVIkrniuToY09rH9gykrKjOpKKkDST9aWT4PCEidRNeDbcvnmBVUpQQ65EmpzJclTqqKFLN0JZRUPEft4VSNlIc6PvKn1X6bxQiHq81WM/jQ8D2Tc5s/s900A/HR/boNMZyoqU9ui6EU9HL0CvZSOIkEeXKhJuDeYKohRNDOPRSKJJh4rjyZs5azhKJCpqIGO8h4hQPFGOSggud60SKDxZq2eoKYinZ+p+jR24KyJB0hwNH9hrsQ0VXBTzjMqBb6wnpUpGSI0dBglTsgqdhB5cp0LnjeCJP3P06R98jey+aiO6ENuiHJrFLYqZNMhce/OEkkiohtacZjnaWEnzohVHLSRWEq0Jg4jOdVrJGVJ/xJq6WphZRQQcxyWS4ebgPhyd1O0WZtXxYlScWpz5X5pcJZ4R/983+jdsnuT1q4F69jIf/bE38567X87WzhiS7RH6bNNnQXQVBRS1kLWQLKNLR/dKkD1PRKx3K7xgywns/d8oT00jPWEidROeeTH53L/9AOwdyJkcljVhzeFSiBKLCkWjG7a6POPNvg0VPblg96FfweoncNlG02/1cz/6mmm0D49T6TESKS1JDJAKujp6rVIdZofInAYpShGhMiC5MA5HS5NZymgPZG+WYyE8TCONhlJQChm1RKrZfefawsa1y8DanzVSoxCUyJPtE0gRi+5dpZm3Qj3C596cRTIUFUQSpIxovKdLOFW4JLCUQ4okC1EH16RHUhJU/erSI79LZBcgK3Ut+IIgyUPzLixtww2iReykCy28pMpR5V9yI8tJHLVo3tBk0bFL1Nxlr/TVj5b+rJWZgLfWpuLSxIcjldod/VRjZka1SilGHZ3ME5MH7DPOpx1/uk/Uec/w4cd54zgy6BytEo4RYlc6Q4yACTICg6KrvYgK54LYCrVV1NX1wMLRfovdaZQnTKRuwtXRy2VWkiMiZ0IZWnzBInpnlqhoPBe9wgv28IYKbs6YM6d8h7T8GZSBLp3mwUv/zTTQh+Cao26tFlwrZkYZj7TQur9jE5g1v1Nt3mBRryae9qNdrkdbuItE0wUm++4PeEtdimCeUO1I1uFk3Dt497UX9eVepnpImdAiiinKxMLtNDUpln1HCNtv/eySXTuENCaEiLW5J/AEtUM8ox4ET0VJKjlFo0RO5JTIqkjW5tlKpGCvOe4Va00WpGhqkMT+o+YWbcsSnrCJ/a7ba5MBRyWTie7cnJUsiUx02Ko09wuJasEjkX+tRLhTo/vVDQMqhpUjRhC/8Uf8pBnzWnHXfaln/dTlKQX7dPzTn/IvWpzg68TYceOBN/0yb/miL2dzXDFK3F74SGgOMraAXUt+eA0y1/f755qsmypsFelXc9Rew4VppCdMpG7C1fGFpx9jlEOTfHOTqC7k1gSRgbLHQfq1yZkc3qpFZ2xfjP62LfLZtyKrB1H2cH6vP/ZPXjkNdsOqdlQ6XCuVUDSr6YiRuss95nPMwrEBmuO7JUprFBgkUY5Y0F7KLMQu0H2tOyF0CH1tWuWhHyfWU8nw2BF05MZoKKitOULXOnLrKKAcEg9eW3y13oZ6BC5Uxky1RKkZJ4MFkRNy9Il6jhYDckp0SejW5C5F1C5LxDSzH4F8NbsuFW+OsxqesRI0OOEk0divGcmU5HK0Y+BCbrp0HUF9QxMPkteIMhokhzw6/be4XzNSWp3sjmO4gaNUjOpg4+qIpCyidJ0L5gUpBqXQX3iUxXQRX4nHL/FHNhak2Yzy8Hl++tFHubw4RZ+cOkuHfF4NH8cDMueCqKMuSC3kVMhekcNbcjSdZPWB18pE6iZMpG7CNaIE8v3n0NWSoWYyrd/OD8gajbB1saZFVO7wDkywdRSvvWanm7PzyDarS79ISku6dJpH96baujV2bI5o19wghOqOyIb7PziCrt/jMwbbiNQl0SAgreZNZa0nKFQ/GqmrGmSyW0frmkCwiiA14zUIEymDdLjP2T1zhH2n9pnadGONsIlE4jKq07T5zEYCc12edpT4Vq2ZlGLTlJH2XHJGcod08W/oZomu6+i6RNdnct+Tk5I1onZZjpCO7DpQbTV5rT5PowYhq9DlMNLrNJH7TCfQZ7+2dMjf2vGtFF6xOWl4ybqQm3+EtsdOCSuynOn14WuPkAnZI91nCiYe/ceaqHrESB09c1W6JmkiCpaVPJtNsiaH8TO/6nd3p/h9Vlla5eybPsRPfuHns9iT1qna6ug6IFeu9MBr98k6omsS16ozde1A4Yrs9VODxISJ1E04Kl5+4lFEdL+ct9rBtJ9ziA/7RhMkbkLE5dCkVFoeoQ4SzRJu6O0LypmfRsbHELlA1t/tO//o86bBBla7W+CZul/DZlTZYHe4tq/m7sUO6GOpbleyi8c2RpODiuOS3H/62vtLLZVb0CBtpoglqinFlOpdmBV51KkhHeeP4FYxW4TTQ/gteBP5gJQqJAkyl8EJTX1LUR+43/RwzRks7MQkZTR3pK4Lb4Y+k7oUUbvc4d7PMt2sI3c5tj6T+hy6c6pkP0pKc4ykcSNznQaZyxJNGF2X6ZPQJ2UmwqzL9KLMf9j9qg0wZ97fav00RJE1Uq9hYabgGSXtv1dOzuy27auTuj/5434SJ3vISFdPVJxofpGjkzpbMq+Jbm225oqpknb3jqFzdwvgw5/gD568jdtFGB46w8++95d55M676LRgdOEekWuQs/GA4yEpauzE8Hqo3m5N5NZRupyp7/s98qlppCdMpG7C0aJ1d/7Ap9ChhAjt2EhckyqhbamGpMlalBjCgUKz0Umlk9riCobYiOUMn3oM33sbWVZ0ehsfG/7ANNpA8RMRAauOjYp7RZlx9ty1O2CXNWMWMiRBgpzcatVSrpAdkRpNBBeuuni7f3wD8zluHV5b+jJnXHq81abBDEsdaCalSGCeTtcmXYMeImcuaJMc8RrPo3FC0RT0RVTRrHiT2L3mSSsRnUO7/U1yfAdPHZpzq0RLs0zOQtcnUp9IazKnQt+ib7O/cQ3yNQzRYNF8K9ZbSor2KergOm2ET+kcehfmn9y9OgF7+HE6EbqmmycpqlY7TeRWs6cJOkp0xCLk3d2rj8+ukBGSSytmjOS6mbVEux2xgzaxMGE2Ag6pOlKN+cym9OsaO4/7Hbrgex12cM7//Ef4t695A4tieKdNbFgPCF0jc6YHrTxe26MYnjTq6zqgM9QVLbdxaRrpCROpm3A8nPbHqVUxqQeRH3FSDiKXs8Xz5hPba8UbiUtuqFRMKlZjq7sj3ak5yzP/CS+PUewi1X6vn/nRl97yYz2sTjCOiTpYkLPq+KikfO2I0aDhxiBSETVGj8YDbXZhWSuWanQon7/G4r2bqXUTo8foqZ4Rn2O1i7o6MngXdWrSRcxHM0s72vwR9mDgEhp60uwq3FJsrd6uesIlt37ShB1B4Fgs4/ThhkmPaAcyw1MXhE/DoVXR3O/T0aRKykrKQs4pNOxSItk1iNJsEW4MEula1SBY4mE51qlHOrfp1aWckCSkBVd2PH4aR+9RhZlYkM1Wm5dSRBBFKzlFXDLRPGYXylVJdZqhjUa7hOyzI80gPh77HzxCXR6FLXH6WtAms4JDsmESIF7j37yL7+5PcO9QKI+e421veR8P3nWKkyMwjPS1kGohm5OkhIS7OilVJK3r5pYt7QoH2icjiGIpUxYv4cw00hMmUjfheNG6z/3HD2ClIkn2U6yUmF2yOmMJDbqUjU2pqNSI3LnhObZZX5n1lV4rvRfyRo889CmGc28FW5HlDj76+OQyMZYFiuO1YhWSFbw6NR3Hk7MganSpYupN/KLgOVxIRQSu1VH7qx3JZggJ8TnqXahj1YyXjHvU0Ynkg67SmljtXXv+6HsarfA1wyM3OzJHmytDWIOpNHswMomE1COQOs2odkB8viCF6YrNJTfnB+2jM3XtKqHrLSWkE/y+a5Cv+UlcU0TArHlYOKiBVicTZI+192tSyE7m7NW/xn1d1MnlRE5dpF9z3q+vUxey5hAjViFnIZ+4RlL99lNhhSZATngSPLecsSo1CfnCEZpDUmGrQmeCu6IWtmWaJleJOI0f9xfsLPi/l8pecbbf9lF+/KteywlfISzpJFwjcjW0FJIN6Hpb18+J4TmichGpSxTtqSlRJOGp59JbvkJ2ptGeMJG6CcfHFk8ySKYQPq/VQuGqDHJFEd1YgujNssWGkZtf7AjkmTPPhuXC7OQmy0f/E6k8DHaBRf+7/ZEfvrWjdSaJWiueKp4rxkCWSr187bRYXx3xSrHSonXx6Gq41v3L2zxxTfX/c2GRVU1xTxTvWFnGyKEtZwpk3FrzhK7dKq+dfqVEBVcYdUWq2Cwkdt0TJgnzBCkhKZE03gsyVq89Dsthtk/koIkNr9tnRXFVKsoYJE6ITtUUHq2pKS9K2DUgpzauTupODOFAIRGhSxads8kiBhbequHPSlIkA8no9i5cPaoml+nVmaswS9CnHHVzSZhJaOpldTorJI8O2O5aFfN35dDfkxahi1LG+JxSQwhm7wikToyT5mQMMSeJR2RSZaqpA/jnH+S/PXk7L3YYnjjHz7zjPXzi1GlOFWtmfQNqjlprgjg0rl4MN4k0rAlmUBWqRqdxsUxNTn3qbiax4QkTqZtwndG61/+T+5lh1NrcJVIQu2sic4XbBMCeCjYa42LO7MIT+OW3oD7S5zt5fOfW1q0TEoJFU4M7bkZNYPNrp1/nG5H8k87IOfoSc4oNhYziljGZc+Yai693HcgcPFKfqWndSUoosp8aFW21byKkrAxb154/hqxUS1QRioSCiCSNVHGL3NFJawmQqDDShDYX1WszjoTVHuhAQsokOi9yEx9WBC3h9ZpaDV122a9NCxcH4ttdMyqj9KLMUutSbU4Sad3kkCC1ujrpUquzE+Z3veDq5Ok8bKiwhTBXZaYwk/XziM4lWvSvS2gvpGt1v/gQfb+dQgpP2ZQFbfFLEsy2jyAgnBInspHFgsy1KGsynyJ1HzzjL7UNvg8YpXLmlz/BP/uSz2drNeC1hiNE7UlSSZrRte8rRIOEBvGz1oBTVbAqmEWRQykFW57k8ke+RbanlWnCROomXD9uH5+A2u8LEGf2AyjrQF1E5Fo61i0idK4OBbIdpG47wIfK4vRJdO8taH2YWvbo5t/l7/+bX3ArDq/7h26jlk0QoTSxXxGhoqzk2nVOqxKkRVwYLYFmzMMizEuieo95R9Ke5eWrF7Tv7nW4zSOU1tpTJYehlIuEJ6wInoLYVVVcEmXv2qRr71Imqe/PNJoEyY5BkDmV9bcP0WOPCjdTwfQIpE61Se4oomEJ5k3mFVespqbOzFoIeJ0uddYiy6R1FOt916ip88pGynS5i+7ZrifnSLOmLFFPl5WsMBdljtCbsHn+kat31u6tOIEwT4leE7OcWOTETEMiRdVD0Li9j3RCf8fZqxPF4XK4ZUiMTApuF8Suy5CNWdm7+j7+zDv9tAgn67pwf10R6aSjSLU83/H29/KnFqe4ozh7j5/nTR/7FA/mU2zuLLFCq40bIyonFjZt6whdjX9bMdxnjClTraOmTM1OXQjWzSnv+6PywLQgTZhI3YQbCyK97P+4n+qFYTdF+tUOonVeows2V4fD28op46Fg3RiErpgw7sF2WnD5zGWG829D3RA9xXDi+27NEf7QFi5bEW3zxODRMJCqMi6v3f26u9ejdFQN0d3qXUSsSo9YBuvJmqHMSenqpG6Yta5REcxy+LKaNiHi6F4VVXIGl4SSkZRY7l47PbrRtVmmOayKaZTvRxAo0rtE2heJ1Kl7JknCV9dWqutS3ZdKcZVINK5LBqzV8s0rYzhA4ES3bUSasleyO9mNTCXvPXX19OswsJGFfpZJ8548T/R9Is8SXZ/oe6XXSJkuqCxwFjgbu9tXT4HLKiJyKYXgcJfos9AlyEnQlEjJ6NTICZIYs93V1efvPULvjogkZpH9f3fJyWIsZg9enWw++ElO1MRmi86JO6I1CGI1tv7JI37qVp0j//37/fPzFn9iuWS4vOTJn/plfuLuF3Dq3B61Oq5LTGtsJpiVeO6ZmgRTqDWuuGoWhC47NSmWhrjtmX3OpEs3YSJ1E54r9PIEutUW1hY0yerRQNG2rC3l15C7iOzVoqwsxeYJSwkKpK3TXHzy5/HhIZAVafbt/rb/7dtvvcG9NAspDsDHjJSEoVgVSs3X1Jar0lNSh1hCpUNbw4Bbwugw6ajSY9qzt3d1UiddFwk51Yj4aaZqwqWLaB1KbU0ISMa7jMicnSP4yp6fz5AuRxRQGnlMGaFDvEOkQ7QjdTk6V7UHesx7xvHaaWjf6pEcJQIqYWvmJkgNMWZNIEmskpPTJafDmInTK/QqjTz1dFnpX7jHFSb1D7hv/bT7iR993F8AMBPuyMpGn5nNErO50s1TkLuNTD9X+l6Yd8KsV2ZJ6ZIyu2vkqtHXbmQjKXMVuk7IndDNOnTR4X2GWUa7ROrCKowq6OPnrz5/r861SsYmFIPTe2XmRm+GWqXfqVeP1G1X5sVYuIEbKoaahVbduKJ/9wduXauwBz/Fnz95mpNjZfng47z5Y7/GY7lnPlZKSlTtMO2iqlXjlss8UxSqzxgtU82jZk4MryM2Vrwadch4v0H5xe+QR6eFaMJE6iY8N9G6N/zQx9C6pIoyk1gOvIZe3TrlmmjyJhbNEft9FI3YSVH6oqhFxM/qnMXeHrtP/FQkKFhg/ud959/fcUsN7u5iA2QLJJNnidxF16dLYhhP8+j7rz4evrkAZqh3qPRBksi4bFJsE+gQn+HlFHv19quT96yU0oE1r1Ujqqe84E3dOHr4BO0jnuQ+p5Nrk7rbFtuUEmlibfZjbgol5FfUAA+HCSwekxg2KKtybe/XxekzlNEiiVUr1IqNhhWnDo5KQUsZRxhHVApiFanWlBfDP0MgfDW/9zVXLqL3iWx/g8jl33WPnAG4cBa6FDVzfUJmGWnSKKk1NGgWcqfkpMyS089mdPfcd3UT9uxoFqTrKH2P9QnvEtLNICuGU12iJWQs9Bm2vuhFV6+Hu3uDbmtOniWSCr3m5nmbyVbppXIq7XDVm4fbdzkxc+baXicazSUyosmZv2h2a6Zgf/hn/Gs37+J37+2xurTD/e/8FX7ii1/N5mAMKUcErhYsOdWd6juUbo8xbVNtoNqKSqLkJTWNWBpDRGps294ltD896dJNOD7yNAQTrr7gzy+Ryr2ULKRICeD5QHR4bKeRFUV6QRqZ6zqJipGVYk2ANmuI7HYveAGXzryT+T1fSpp/HZtbb+ADH/2dwA/dMuN6+VJhbzfhdZfsl1FxujTiGOIrXtSdv+rrtx+5SKmJ3FcoS8RH2BBISxIj2g+kDcOKcnLj6ovDY7mnOzHHSyJRQ54GRXMHOZPzgppP0eVNUMMsIcsVJ/TazTNn/G7ybItaHekc1UySniJBDs1BXbDiINGfWlKHywa5bLm/625YOH5/hsuKJ2HZO+fPKC96lfGQvxqdnaTz1vmLkyp4lBmi856hbiy68fKL7uzSPJFKdHGqGZ0JaoJ4gY05+rZH/De99sU8fjkMcP2hXdKsB87Tf9mdnP2/foEXjonOnU2MsRakSXzUlMgrw4jaNa8h+KNkbOcJXgw88mnc3H1DRHbv2mBDTiHqjOYUr5gb0vfUbNS6QIsibpFcHo1L//Txqwul7PwK52f3sifKojpLc6omMIsOWk0MT+1y8Wr72HuS8zmzs8p0q8qya07FAhvzjr03vOLqr3++oir/zR2nmJ07w1OPPsK/YMXjJ+5lq8vUMYSGMMHUICk+gvYGavhewjtQNZy7wRQbYp+2dzkCLbf38KbvlKnjdcLxgzHTEEy4Fvzj/8Nr2BszyQtdcbwzGMCbukKfHKnCsj0OZ5XdMRTB5kXZnSszUVZkxhFOnZpxYTiH3flK7vmiv0rVV7N3+RN86Rd+o8jX3PTpBnffhF2FCwmeSDAk2O7C8muVWQ2ZYczgib3tnuodXSvcl5yYnRx5fPvLWW5/PVZ3yN0lOjWKOuYdsjJm/QfYeMGjyDhnWPZUCQGNbgZ0mUsXPp/V7peg/Sq6RkXCUIEFXgV0QFJHLZmue4zZifupVGzVdOdKQpMhc7DyUobhNYjavuiCi4MkxDRInlYUAa94Ba+G6BP0i8ep44JVUTIZpNmWpRLGRuPdyHgHlio5BNKAnupCamn7sDgDaR2xVRQpHX2/zYk7niAlZ1lC7kQUXCOamDec1XAX48W7QtKl8/CZjcZWpAedASWz+erdh4bFnKB91BppZYsuCgeYZ8rJOY9JYmUek2MBsQoCaSOx+9g2d57f4R53LAnmQYHNoe5VvBg2jtHyMlQEQ1aOntrgk7MFZ6wgClJryKgUQU8olx+5wOfsjrw0CaPAgIfzAxFQLMuRUsHGSrURL3Bxc84HTm/xpIykThnSjKGHkZ6SO7Y/+SCvfPQSXzs6yYw9NJx7idTrZspcmCfevHmCB2aOzRTLii2EsZtTbcH4kU/w+U9c5Et3QmdtpZnqlVFhY2OTh18w52c2T/PoiRnD+CTLO17G6g0vYbxv8/nbrfn2h/wrzo78590l/vCj/Lu/9D/yF1/xX5GGTXxV8bFQ58CwgcklXDeoq0LdGXAfELkdd0e3Zvj2CmEHuAvYgYWj813Sb/gdXPzxN0wdrxMmUjfh6MRkA3YTfLiDixnf7djTjksXekrJDEXYvaxIFXZXr2TcOYFYIVlEk6gwolBDqcs9UcloH/VWqh0pK+SwnEo5I33CRVFPsADLlcX8NzOWl2LjCfLw/8P5WeYbyt5edHPmpEhN4V45RrH9OIZPqGuI4XrKGEoSJacOlwUiHZ6be6a2nj3RkIEiPrNpArroHiV6IgFMBKej1g41BXfMokNTUpAiaYX9YVGVUEkgGZW1N2pCVSilayK7gpmAGpoct028LlCpSLbQvPWoB7MhgznSjXjpsDHjQqQpk6FZQQT32vrpJIyk0Ni/hIuDZqPWGEfRcJsyF7CEmMeYJSNJwaigTVrFFSTaCpxQXovpwrEK4kKtCpZx7+KjW6iTOK3ZVDz07GQIm/Ic6m0Crb6uqcPF/zCPJKhqfHZcomez66N/ov3OW4MuEgzFbIUwQqdozlFbl4XUAVnQJOQE3T1lVzZktFDvq0HUHMGtMScRfN8hwsGjMQBzFAMX0t7IuByoQizMFmIyVMMrYK2rsYx4cRgqOoDgdNWRWtuRC0M3ccElYbVQaqFkoTZTtchVexQpWBQ5mBu1GhRDzEgCBQsa7oqpY02wtixHZjsreoGSoBKcWtxQD50+F2clypA8HCc0oksmHUN1ZG9gc6+SykhRoTpQ21mBUqRyWWBHoWQokhjVKFWoCCOGGRR3Ks5Ix4hjOa4+y0JVKC5UgZITNQulONZlRndGjGoweqKYY1IwyRQzapcpKBWjakfplMqM2iWqGMUSZczx++RYdbxzfAWwbFG3JW49rhVLp7B6Bj9xmjpf4Du7cFvF2ISvvoflm9/Mict38T+fuJPvPnuBTzx1jp9//HF+aetUSLNXgGh2KAVqrZQERbsYCyzSrkS8OzQDxqgCpYAZMs8Md76QC694GZdP3Ib15/HRqCdnjNWxfouytUm9A+pjwCtEdqcVbcJE6m6IEP3oBjys0IWEwu5eYudcQl6o7O3ofuH2ak+RTUF6Zb6njJoYS6I283EjtrF01BqWSdJrKPl7RnKKDkc6kAWUniodXkODrEoGehBByaQuY5yE1JPoQv9dmr6YZtyV5JHCWsujapeRpOSQ2EJz1HXlkFIK4Vmbhc8ohlilsq6NEmqNldytdUyKgkRUxVJCRNrPtNXhC6igkuk7Y7ln7O4ImOJlwP1iW/bS/kK/rusSD2JTCZ38kNzQ9j2jq5Gk4XcqGtEfYulWvfJsX/9cXKhE5Accb/xKsfbdPCJT7fd6qAxV1BEEbdpweJArbzK3kmgLLs3XNIq4grQUhDFS2g41OBPiGsfX44+tNusvoY0L0ceZSkSn3OLLSHwWUVAJZ4mgKUFRXLwt/fFV3eLvcXAXVIyKkKkhBYKFQLAS1KW9vhY9YG+Vli523NuPhbAvU41jnQSRTFLC/ktpaVZvtCo+U3wQGisUhPiukiut/yHG7dBY52x4JyRPaPbwhUiNzGWP766KJti6d/dc3VrE3QjmjlmI6Hpp5E0EE2FUjVHyGnFLUXBDqqPFyGMlN5JFdXyMq8KrB6GrBlbw0WE0pBhiUARKXZMzxyTiit74ulLptB3htV8r1jonwcwxq0h1xBzcMFeKG241UspOCLyIxxVZC+LgSaiSAA9ZE3GSJFRiNqAJELmvSxxTGM8NoTFuFapbHBGjiS03Lu9gKWK3Kg4qWDsjkCDNuj6aIiFfk0BSE8wRDv62XbFoXJ3mIX7j1TEkxoA4U6s7lSCrxT0IMHE1m0DFqRa3aJWIrLpbnPXSzipvUdpmhmia429zwmr8rdYKo9OrkPpMZ5WXSiIDY8osKMxyYtTDK6pEyWaNK8jcMY8Ys7tTVeN7afu7dgMhhKBQcRhVGJQgsRjmUVdZcapofHcBk7ixEIlbaFOhijIijOqhEOlKMViJMroxYjBThm7GACxVKFJjEhShapDlUkdKFkqeszJl6JQiTkkZm2XKfJMiM8atDcptUBzszrjGSkwQMVHIRDwnUnd9kadf7WCZ4GKGU4ptd+ztZVhlxhripHvSgSekZGpO1KHDSqLWFGKw0lG8wyRjoRpPTgmzDrdM8YxYIpGiI9CCgNWaUQ2z8ogeRam0ExZLXpvqvShuIa4K0VFo1qEWUSwRbRNvPIolzHNEniyH7bMHSTISSRRzDZmJtRq/rNc9QV1jYaWxmtoIlgjR8KhY0lh0g9fhGiZK4qBueLtAvYkalDFUxdxi6rYq+2Qopm6LxbV5uYs4JEOTRWpMYj9JjGEYKGWPaquoyyMiP+tlC6nQ3gtqLMPtMaazIEPevASifm+9tEVUicZDdB3P8DXRimW9urfP3uInFmuXtxiNWZC9eKNYg1TasW1GUy4ZmiG9k5qcrbd7cENSiHdUVZKE7ynSxJ3b8uS1jdU6ViQVIZbxYhFHcQn5UpoQMMSxw2Vf0kOCN8UzXRPYIHK4Uz2YaZDL9fkWpCvOLWn+CO0cog1yGyPBGxVpZMzWS3j7STC3OAaZOAdFIlon3pb11qnalOJif0FxnCYHjECCpMZajkRUiC+spC5IYteCsF0fv9IUjbYh/hFpWO5tb9dY3aGt7vNK9kNktf2y1FZcZyHaYx4rl69fW6FY/P1YCfbTXleD1FHbz6ydSY2AeLuVEHGkESJPSpUWIXX2zzyzOEtLcaxGWwgS0a0qQaiQg6MTcWFrll6Oy/rrRtOF4iGEm+LWJ04MP3QFxPVh44CWGjWDQDXHXBrhiT0ZjolgteIe5NVaNNIkPqBgsD4rJGK1+1S9ZbqlncXabl+skci4fQSnggexi/EJNwb3+Ns4e3z/pAxyau3KSHFbkgRqJacm+50ihh5nm6FNmTGu4qZrWMMRJRenS4rXFZcsjBTns56TKTHrEtZm1ShfaDdztTlwWDs27azH4+yW9c3lmsy6ti8bsW6T6IwtKMVrfD9vs6yyf3slGr3fIuHVIu17ODXGB2EsNchuESqGqGG5ixrOJFSv7Saj6eeJR1RY4pQfijNYbcTZsaRUjehplfh8BcFaVeyyFEYVqo/xmpIppXX4qkdjiCq1JqrGTZYplBrfu7TPaSoR3fRKrYnRhaqVqoVaLKRhvFBHxZJQa9cixRWjo7CL+QnKOFDzJnVnpA4Vn29R7v7NjLdB/d7nEel8XkfqWu1TggcjgsNee1y1VWBQbFR0XfA96n5qCBVKURiEISldEXZmQr+2Rgq2wlAExvbv/WEV+uzQSyNRwth+30FzgwzslYOfrwV+rzRlcMY9ocvOOELn0ZzQrV+XfX/fmUh0dOlQ16Bq/D3xMccSlTyL7KHwX9pnq9JE5YTSR5qTtat0bvPI0ByKSihdjU1YOPbZHrv43f4YtfEsGRbZye375bGVhAPdLLoWMdt/r64lvroNgxRL4v7Sa8+gJTZeOf7M4/jlUdgXvh8FehjXfztA17WlesOuXNYPo3dYPe19JNKYiMBM4tzqYSxK1x/6284Z1+8zRGB1//WjMLTUr2SH3YMh39DKmNuxbD8cIY7VMs7H3ZToRFhscHAcD6HUdl4cOqfG/fbkdrzXrylxDhQJQQ1qRGFzvvK8zKPvf5ZOjTE77LXzgTg/6dq5UMMtYv+87w5+VkzB4tqYzaAOuv9ZSg2duaRxvuW14HW7lqpmasnMOo34U2lyLHRIznFc5kF6yzKzuA3mr0ofvcBphdpFitBcY1GoFv2yWanumDbztjH6adfBK7MxztJhRVqbkdUIINexBjlSxVDq2OKdNchddTB1vIB3JVK1qXkz1CGoPYA63vUR6arR7+Gl4F6wqtSuY9wbg2dqwmd+oKuXcrstqIhmZFWRutq/bXAKdJtYKSClvWcb2lrD0ixOxXi+LFBXQdnHgueOmsJ0rQ6O9wlLi3j/5PgIzDI2jpAyljwihcuClhHJXSOyGdOCdh2MIWspiw5nhH5OdXDNjdA6rl0jcgNYj6/Wl+IAtoWzOrg6r8DQvlt3MEazAUrkUUQFcUXHPVIt8e8qyHxEqqJ0UPcQOqggqzG+T1/opNINqzjbyLAxw2cJHzLeGda1prKhHR+ZYSnja/2XWtp+CzLW6MqOczz2Z4J0M6zPmFik1VcezhPLpvLYdVCjflO0xGdXQTqABQyrKPQowLrJzdtxqkskpfhsXdcu8fU6sd53Qeqhz2Xt71PGyxi3fik/TddxjKKMjTnFHF+fAynj1uG7OwfHpB/aMWzHp3ZxjLPjstGO+QqkHf9qeF3isoV1e7h0mJ7C2INUqWWB94bnO7HxMp43sdHxwfF0GvscsN++OfnnTpgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECRMmTJgwYcKECf/lIb/eb+j+Cy+G7sWw9QKq38vu3p2obJA9gUKthTrusrFxBl88yXDhHMO5s9z2ikdFXnl2OmQTjn/O+Ythdw6McHlH5J7pPJowYcKECROpu65F9cI73kDnX0R/+kuo/AbGy69kHG+DBKWuEBkARegw60kKuQcFiq3Ii4dQ+zjl0ofZ2/0QJ+RDbLzwQyJfcHE6hBOegcS9muEDv53C61C9l2HvBZjN0FzR2SUkP4wOH2Z5+d2c3n6fyDd9Yhq1CRM+667zU8BXEivFtkFR8PbrZCAK5dA6p0/b5Gnb/q7Xf78CVoW5CC84kfiYiPzcNPITbklS5/6f7+LR5bey+eJvZH7bb2TG57B3Adh8J2n8BMtLDyP9r3Hi9Keg28OKoNZRxh7qBkM9he2+lNS/mtq/nlReyeIkjAOsxo8ybL+PcvmdzNP72Z3P2Vh0nHz9W0VkisLcqpP8hY98Gf3mH2bvyd8FqznzzQ/R95/AV2exWmA2QxYvZCivYYPPY+iA7p0sL7wTF0XLxzn1RT8iItvTaE6YcNOTutuAryuFb9hd8u2549KyQhKSgyZBHbbMWYiykoogqAbz00MUTkUQd0QUzBF3ZlnJSdkbK7vVuMPh/7x9Q/7INPITbmbk5/xCK2/+XM7mb+f8Hd/A3d23kLag8E52L/4Tyrm3kYdfktmXPXGsfT75b15H2XoNe7uvZ37im9g6+cVwz6vYe/R3sbv7GIvTW6x2HmR86x8EJlJ3y03uO6c4f/8fQe0vI6WS9Uc5ufWvRV73M8/y9y9l+eHfRHfXtzLI7+G2u74c5vDkx94GH/lRYCJ1Eybc7BEJkQvAv3X39wzCpgrfPYysHDwJ/axnSPCWfsY7izPTjj0M14wrmBmoYi2itx+xK5AYWXSJ23C+dD7jy0ZjPLtkmEZ9wi20sH7wlD/xtj/tl973VreH3P0J9/Jrb/VLv/gn/OEff8lz9j7nf/zz/ZGf+p/8/Ls/5OUB98sfqV4fcb/4wff4w//y86cjcaudd//hbj/3/r/v/oB7/dib3T/yG471+uV7fodf/tW3e3nC/bF3/2v3//iCaVQnTPhsmwf8vgcf9wcfPufnPv64P/DJp/zCE5f9kzvuv+VG9/vEZf/h3dH9U7v+v00jPeFmx3MSqfMH3vQbefzSf8di63dy4uWZ4czD8MQPkc/9Izn5dQ8/p3dnp7/zV4Ff9Yff9GZGvhftvpN+o2MchNmJbjqktxgeP/0/84IT/y27y3/Bxuf9cRHZOdb5NH/Dv3F//4Nc3v4JVF8G98ymQZ0w4bMONScezImv9MQqJ/qcyAq339B6I/KAu/+Zc5f4wsUGJ6ZhnnCzQ2+Y0D345j/F1p3/kHvu+T2cuj2zff+78Ev/vcxe99clPbeE7oqL7SXf+nbuPP3HseXfR7Mw63v2nsrTIb2F7s4/9m//PLff+Qe4dPHn2fi8P3FcQncwcb/ul9DV/wq1wAtOTSM7YcJnHUZxBlGk6/CUUCBnqDe81ohcuu0kPzATNqdhnnCz47pJkLtvce4X/jKVP8vJk5lSYPfCWzl5538n8pJf/fX48CKv2AX+b37hV14KvIFTJ3Q6pLcIoXvwp97A4uT3sHtpxqmt/0lEbqgTWrZe+7f9/Hs+Dy6/EPjQNMITJnx2TQldZhQliUcjhCgpH3Sy3mj04x3VuW8a5gk3O66LBLn7SR7/+f+VxF+gpzLuwfblt3Ly877714vQXYFTd/11xp0Ps/myF0+H9Fa5HdH/gZOb97B97u2kV73vOdnnbad+GnxnGtwJEz7rkAREBUQggbQu1+dE4UFEHjyR+T+mYZ5w0y+N10HoNnjqF/8anX4Pu8vLbM1PsLz0Pm5/yR8T2Xzgv8SXEHnRL/ne2/8pZTWFx2+FW/LHf+U1zIYvw8qCWffTInL+udnzK37qelO4EyZMuAnmBo0iik4wd+S51Oya5LImPC9JHY///F8kyfewu7PDyZNCloeY2X8v8rL7/4t+k/lX/Af42GI6pLfCzL39W9GtOygFUn3oOZy0J0I3YcJnKVTx6pCE6gAWs8U0MhMmUvdsa+njb/mjqHwvu7tOlwe6fJK98v+SO772bf+lv4iInJkO5y2Cvv9ChuUWnYLO96YBmTBhAgAVJOici0yEbsIteHNzZEK3894vwuT/yTCcwOtFTm7dweW9H+f2r/zH0zBO+PWduO1zqJZJCVLqpwGZMGGCgbpSUUwUE8F8itRNmEjdMxA69y22d7+f1N3HWC6xMd9iHC5yIv9dEdmdhnHCry9kQamOJ9hbvnoajwkTJk7nAE71iNTZ+nEamgm3Eo6Wfn30F/8kvX4ty+UK8crWydvY3f1HsvnVPzsN4Wc33HdOwMUs8qLznzUfOsmAu7K3Gtkdfrv7Q39P5N5HPmNjdPHHvo6zjyzl5X/6Hb8+x+TH7oHbFyK/+ZO/fufBe1/MJ996Oy978n74G3ymb9b87I/dx+2vm4u88iOfue/0d06I/KnLx3/dk/fAk/dCOhlT5Ogw34G7HxLZfHSaNW5OUidOrZWKUHGqJupE6j7b1iO/CzgFbBKdyxXYA3ZEZLr2ngtS5/Xn7uWJ+ocpskWpF+nygt3lihO3/5vPzpPmk5/L7mO/iR15IdTE7vlKyh0pF8yFy8stMh/lFa//VyL3Xr6+93jX3Zy7/NvYLvfRm1BWlb5TVjZDu8vMFx/ljq994zMtnO6/+p2cv/gFJJ2z2rvEcmdGztAlpYyJUfeY51+Su77hJ5+TAdn9hXu5mH+HP/TvX03Sc6j3aDK6ReHyxQWbW4m6rCDKWCWyGWGaCJ3gtUOTk8RJXUX0EmW34/wT/04+74+86TNyEOt4hpQTq91t5osv5NzD/xXwjz5jJ80Tu7+D/MJv9qfe9C7ooA5CHT0qd1QQcaoLZQB3ZdZVZukyQxlADdWMcQJMESuYJsQVRSAppSQMp++M2cZlzu6+hCce/CDw54513u2889Xc/+Dr5XW/+18c+zuee/w7uP0L/gSPXv44+c0zf/RNlSQVc6OKQTFwZxidmpSZjvRyjpUbqkKpc0RPk33ASghLJGunS1GqG0khdUbfjwz6Yj7+/l8E/srB5//Ib+DSQ3+IeQIru+TOWK4qkLm83GCWCikJLhnNGaxDslKHHu0E0YQmIc+c2eZFzpzr/aH/6+/KvX/gXUcaP/vFL+eh8/81j7/nN1N0gSTwfsTLBq4wf+S877z7PzOTn+GJB8/wohc+IvJVT03LyM2BCtWcAphAqU4ZngPx4SMQkQ3gK4CXAx2wWyEBijNLwgr4qIj83A28x2uBNwB3AzvElbV2v3m/iLzlGV5zN/D1BV6GoQYrA2bKqhbUEo6QMDqU2ViZ1YGNWc9qlngA+BXgfhF56jM4dncAX7SErx4GXn1p5MXi3OnOSUCyMohwsRpPXN71jy3mfCQJHwY+JCKPX+d7vgD4YuA1RLZytz2KGRsoWSHVGN9s0HdBMHeAjwEfbeNy9gjv9a3AFwHZg2+JgdsYY64Js0pWxRCqgWTfrweV9vdZ4pyetff9gRuL1D24830sNl5BWQ1gwtaJDUp5J7P7PvDZeenfd4F+fIKd819MGb6b2+7a4tIObG3BhQu7uPwEG1vvuF5CByDyZU/4zi89yc7FrwX5g7z4hXDpEmyfeRubJ/8jnVx+9kjI7Y/C3uezXP4+tk6+jOIwy7A1hyeefD/diX/Ind1zd8ey8VseQD/wMc489h3cfvJLWBVQgcUMzj72ThZbD2CeUYVOHXPDcIQQDHDtEUnkbkaXF1S9lzvvfRmfevQC8JkhdYyPkGaVVYUuL1mOf879I28TefVnpgNb5vczv/0+un6PsvNxrCpSoMtRvaMCnRi1y0heMi5vZ698FVsnelKCSxcuk9K76OfbjLsJkQIuiIKXREIQFEgk/3IWmy/nzLn3Hvtzbo/fxeaJP+kP/K2flfu+73gT3q5scPr2L6Dz8/R5m7HO2/eDWkE6p1QHNXJeMu59DkW+i62TMfWcO/cEi62fgdUdISpRBcdxcZIL4hUfE+Jzqn8xeTbjqYf+6pXn4uwcF/sd9pZ/grvuOMXOALdtwOOPP8w8v5M6LqhegxwqIAmqoJ4RF7ImOsnkfJKkr+cFL4b3vOcnrj3xPnySM7/2Z3n4/Pew6C/g/l6cdzDvHibN9hg5hcmdKF/J9sXv4szOnyVtPc67PvT3gb8x0amb5IYdatuKO5VK5deB1InIrrsvlwN37iz5Ywj3FWdPMwut/OptJ/jBBDcqh3LJYNxZ8s0n5nz9sgDOT8073gIsn+U1A3B2NL58WPKnzaieSCvhsU75OzlzUSGj5KGyORROiPOSYeQVLrx6XPGYJN4+uL+pF/mR55jMvRz45gJfu1zywgoDwuMufEiFqsqCymaGF1jlXuC3bC34pr0RhsInVfjVYv7vk/BvroN07gIXgZetBv6YOXMRahLeN8I7S0VmCSrkUthU4YQId5rxqr7nrrHylMPPu/tPAv/yGsL3jzl89XLgjy167l4Z1JEdMf5zVbaT0SVh9EpBGd1wV4o7qKJuJDHmg3PvrOM34vwCcP2kzv2f3MNji68n9TPKahtHmCVIs58W2frkZ+OF39j1fwD+g5976ydZ1r9J5UkuXj4J/H157W/7fzwn77P5pW8E3uiferO5zL5LLu3+HC//8LeL/OWdq3++F74TeKef+fc/z+Xy7xh8xbDbMZRt8vk/Li/8tnc/x+OxA/wL95038cBb3w95Cy+OivKKb/tWka1zx7pYz/3kq3jg7A+TFp9BeRD9IOK7CDN293Y4eeK1PPLoX3H3P/kZkSVJs7vY2/k/eeHGnxP55gtHGof7f+zHuLD9zUhO5PzP5XO+43uO9LrxF1/Fxz/2Ayz6J4817mff+HKG+m2cvu02Hrj9u4G/eTyeLBd54OF/KF/w7X/0aJPyzmk+9MZ3Uef3UIeB2eLvy4u/+a8c6bXv/BvfSF78Vfmq73vblefiy+4H/oJ/8F/tMt/8i5zf2ebkoqPW75eXfsffO9Z4fOLf/gF6/9vocO3u6POf+AE8/346+3vc9ZofEPmcB5/lL/+2+9tewRPlu+i2/hyz+W+YqNTNw+nEMDRSrw5VlZJ/HUhdm0d/EfjF8+f9MZ/xt2XkUwqzU1v8L1nkx56D/T8C/HN3f/PuyEdxLmz0/LH282d7zXngp4CfurzyV3rhi92xJPzK5kz++lUI1727hd+P8KdK5betdvnW3epfslD+x+dCE9Td/4jDN+7s0s/n/MrWnB8UkV+4ShT0VYPzFZf2+CpVvjwpr+ozL7u8x9fl/3975x2nV1Xn//f3nHufMi2TSggJREIvggIKiKCCFCsK1hV1sbDquuq6uu7qqqvu2tuiP8sKLGJBcFVwAUVUQLAgKkIoIUAgBdLLZGaecs85398f904SMMnMM/M8mYDn/XrNizDzPLece8rnfO+3JLxIVf9LRH7aQlsOA7cAt7igs5qO00XI0oTvl0Q+s5PrPhh4aWp5I/DS4YyXJpZTVPVDInL3Ds71J+BPLqjbVON9COtLlrurZd62s2e33Sla9T0SOGzU1XGnf12SvAjYhyzzBJ9HGg4MO0xy6xNiGuiacgdDw5ZU+oEMmy5q+zm6q7eI9ykh/Gk0Qfcopj/7LhqNQWzSjVKl4ZQ9j7mvc5NS9wAhLCWVEqKGoAa6W644ItNOu5dScj69M5sde24zD7kWcQ+jziIYhuvrMfYcHv7ZJ1S1p+3n89kq5s38L5HjNo5x0uom7XJgU5K0TPfUsbdfevy97DnlU1SqLdZNnvYsCE9heEDo7z9DB6/pb+nrs/a8j0P3//TYv3B/D2kVxCbYkoFKOuZ7fPr7r8Wkl6tq33Y/MLV3OT6rkGgXGsqUelvOISv7nvktBjfcwOx9d9ofdOn/fgKx59Lb9bcy59R37kTQFePkhPtk9ukfYcP9/0g5jbWmd6cNu8WTO0UggiusdLvUp25KP3cpKEJJwSXC4jaLx7UhsJqEJa2IAmN4xFgShLKOInRFZGl3Kh/vqfC2AHdmGSvqTc4baPDZCYq5A4PqN5uBVwlc3dstZ6VWProjQTciwETktrKRr07pktf2lHl7mvLVRoN7NeC855ThOl9pZPoP49sJsE5Bg1IGekdpl7tF5D+AV9c8vxUBMbxsc52vq+p+O21/YTUQvNLloTLauXZggbvICvcWr4/HKepKU45GtY8Qmqj3lJOU4cbDdJkHnhCzwPBACQnNIkgqw/v2TwBGBD8MBNfaF1dUAIcGC2owIjCvw7VtwxAhOEKW4WoKj4xvlzvnedeTJos6dZUiM5YyvOkaksQhztCsQ7O+Ds/f8+CV/0/1+gPaesL9+i+V0nELW7J+ZjWHOo96qA+19Nyk/8wbZPaZPxj7ZDk4jZp/Hon1eJ9RTp7M4kde1Nrm4/DfixxydwtKN6BZBo2AOvCN1oTXkWddJCID2x+Xw4J6AEvIDPXN40sqPm/uJfTsWNPp2sufQWXmuxkYvlCqT/tuS89ov9d+nSS5S/W6WJpwN7HUeUXIfZG0EFbe7eKUJgKC0rQp3hgCbSpT9qglxdIQw0Ar37GKF3LHmZD7+41l6brSWi4UQYYa3OcC53jVc8Yp6I5XzwUBKBleIiKXjFPUXlux8pbeLv69UuYuYFWtSanu+OhQUz/R8gEDJiigWKA0xmv4TdXyz40mD24eZpMqJzSVD47SLxyCM2bLRmM8a2sNw82M8obV7HgH+9m98PapqAaCa4JmlKzByl2QPDHKpdhQR2jkvojGkZbab6of2mSwBry0uKt3GSF4NIAxihh2wa6zjohHJOST455+nANvLXs9+2cdvdK9pn2R1CwE7YIMsqbQyFah9hyWbrpA1/zk7MJ03wYRefLq1ieL4FDxeNf5p7b+V0eTNE/NAy6CB9tPpfuZLT6zFn1Iy/m9ZU7RoJRSae18O4m2NnhG1manEMa2CP0FXc/9GX0LfrPjTV3ybmxaY+99vjg+sX/MhXBsTH69mxjqjGwVUAIqOimRr00xqBWCtZ0RlCI0VElbmo6g4TV3xlcz9vy0/WU53xgeVKWMsmYg4293aGHfsaA7QpWLxHJjIvLadrjIiMh3qilvqKbcJWCajtWZ4x2bNuvHWxacbJHe0sL5b6yWuViVKQ3HukaTU1T17B1ugfNIMy/gxYyvX4rIkIhcP1qAyI4fbn2P44G5eNckOI9qPolLY5HIQSueENNAMqUJkuG8EtRjkvaLOi8BB0irVsB9MhQHqmyZnFQ62yAmI3gIGYWlxE9g0HU0JYYkz3gQ0/gApGuRpERCAyEQzBK8PZyB+gUsu+rzOvSrYyenc6UB7yGEjKTD1oLN7tlkGdTqd5FWUgKetHyM/unKfTt30hkQjCHzgUAgaPvuUVNX9PiQe0c1zDj74GaRg7cbVKRD9+1D0nUC61eshQPuG9/x976nVZ/TSOemhJIlJEIwoMbijeDLuzqlSUYAnAEviqcDlkLnqBvZYXDE9odUQEXIgMxKa23SXeL7PWXSpqMWHIfA6H5d2wi6J9Uzvi/Cd0XkX9srbuWeUsJru6rcAfRlnqVqeEetMfZXsVq0DePIaVi2/CIEHgK0kdFdczx7J6LaqeJdwIcObzZ2PFkauzf4KuobhJChzjA8DGly9xNmGqiUPaJu68P0nWhhR/CQSIuDu8uBZBhxoA5VD5s72x6JeEQlF4+i7ObZ2GXWGddimh8mSYawaZVEG9hg8boWSTbQ1Nfx8Prv6OLLP6orrnnKLr04m3gwCokn2I6dRrMbD8JxAoON/0el/CWq3SW8aSKlfbHZC+j07KGaL1zBt2/DUa66fNNsA2ICuPZvZpbd/1T6pydUqw/HBOpPCIyAWou3hmACI7uMcbusqOq00Xyl/nIvR7CCQ/K48Y7MoUpTIGvJUmdQGbEUWVpyBeoq8UsDwwg2KL2tiLqG43tpykIR+XBH1gCR1ZWUv+su8wCB3syzMWvyLlU9cWwNQ2400XH5X95dSvgjQskHas6xv6rus/1ugVdFAVdYkDtmoNlxh1fTh88s3nnUuzxPWdbAJEueOPOAg6AOLQaehPb7rJngc3c6afUheow28DiUZu6Tt6mzIiuooipsmQ+R3f0Jyj4v+Dq9yb9g0rWomY4KpBaMCSAPYdNuQvkDbGp8T+/7yQd1zS92jeVOJN//qUDWQVW3cvWJaGMKB535afY84AaGB9aQWFDtoqd6XOdusGbAjKQtzF2G27dqKT6AakA1YMtZ+68/m4MvGXzSS+QJIepGOo+YPMdXketr3Dv1pudVwPEtS64iQMOC64Sos4amtChArMGFkFfZMNpymyw3nnWS+51Z8sTAowu6hn7QGg6y8P7OTrWypJrykcTQ9IFawzDVe96oqlNG7TR5XsOmL/IbtnjeNdawKOQZPGte6AVmbV87ohrA+eLd26SIOnQG3ie5JSuvwII1Q8zoGXjCTAP5kAto3tKYDqy9xijOgzWh5ckhaCCoz9+FqocNnRV1Xg3eGUKwubjDPB4eo0x/zkV0yzswpT8C/Qg9GKskaQoyTFJZTLkyjSz7EGs2fUfvvuyTuqHTljthq29iB6n740jMHXmqnrnLKJkrMa4KWQ3NjtF7v3N8Z05cE8QW94lgkvZNUtYEnA+IyUAcNmm/qDOuQlY32PKT9M5LjuUJhKqepqpT23zMWap6ZpHQdnfEky9UjpBbySRfqEvF9XeN8T67VXVqpvqiTTVeB6wYx9D3BDyGrBOiLgSa2qpVKa+F64ISQmjtmkRkEEMdk69CYQyCRFXnm4T3Joavichdnd9DyzVJyo8QZjSarNzU4HTg+WNoFydC0xhq5Hn9WqKUshbFGyGTPIK2ZwedUwpTiYbQWYPJjp33XdgDoyDB56/iguKDo+ayJ8zsV1JFfdHUHdIvASUE8mCMcVjOTPBoUDwhz6vZQWyQQsxJYVm0j5dHKdOec7W6P9zFw6vfQ5AzcDoT8YPYpEYIKcJGKqU1BDOFZngvDw88X5de8VnZ+8UXdea5F/6PeUSeqGpXu1/z6dDVx7F88zymTPlMMbFt1jVXX8ng8CuRZBDvZ0Pl+cCv23+D3Sa3hajJX2C0cQAZ8fmWSzMwYKT9c443QwwNG6xJsX3vA858Aoi52eRWkU1AW0vaichqVV0AnK2qHxeRO3ez288jCgMZBqcwZJXy+kHesn5IX7GpRrJmowoW4z0YiwbAewQwjty+/cgm0gB9qeFIsdSBtS1LOsWLkBU+bJ2Ys32rljojeZUCEbTVrbqqdm0eBIEMoWlg1GS/w44PJ3ngyrd2VQfoKXNBM3CSb9Bbz6DhOU1VrxglMMOpkhHwQKPVc6ZCZiTfUJj8lfh2n0tK0efCFttRxwwmO/Op60U0gLq8egCaO0NbzxOF4CQXXJr7j2VZ+9Wzam6pC9p6u0kI+dQjYcsr4l0jkfInzrB9PD1OSY56UPY+4210p+8h0ZsRLN5NIzibz60uRd0QaXonSTqdevZ5feCHX9ahnx7Q/otBEJFcG4t0ZGe2fvMJpLpJpp38ky2/m9H1J7y7FQkpIdRROUHvuXBq+1t7miBGt/QVaaOos6UMJCNohuByi12b2XP2HQTXZGCgQan6Yr3zso88zgXd8cC3PJwDXDpKlvvxCrvPAlXgx6p6+m5qrfOBorhdvqnao9Zgr3qDmc2MGZmj33v6Go5e5+kJnh7n6NNAnzr6CUxPDL2qBB+ok9cdbW3kF5Ut6NDrV2MI2uJ8kuQXpgawrc9EUzXPrUZiWQcsGqUv7psoZ4jlBmCXpT8TkTtKhp8aSwqsbmQcChw6ytcycvHdpEU/RYCsQS95yFgisBHYYbUnC5paQtH+HVtbd2ypE80K1yrNRY8o1mStBVLv5rghgwZBbS7s0g5Ev6Kal1lqucMUdVYL5a/ouIZjy5eLYqTwkxo0j8fHKjNP/l/VoetZfsPryPxLMHIA3pVQtxnxSqACYQOBdThezYrBQ/XBH35S5r/kmrYKYxkxeNJ2Uad6yWwWDR5N/+zrHn3WZy3TB6+8kqzxVKysRvUAkp4X0fbauBVFjEeCYoySJu2L6DI08RoQyZ2X07Ttok76n3azPnT1XZSSo6gNrqU6/d/0nh8aDjzgfJFDVz2OxFw38NrM897UMt/CR0VkYQdP+cGg/EDhm6r6EeDb7agy0JZnavOar+LxRZ3Nlf29fMTuJLntDtq0Z2Ods7zjLeMQZaK51cZrGHcynlFNktLifOJyETEyD7V6VQc5pctAVQ2/HE3U1ZucDUytwPWtp0qaGNWEnww1OcUYrApl8nq8t+xklnaALzzeXatjb2CQfRCaFkhT7hGRHSWbtsYU+RM7sB6MzVKnYQA1ihpLEEUAVSEbfOJkUXclAxhUBdXOFJTJilroLXaYYtwqISjBK94r9HY6UEJQVXQkUGK1PF4frUj3Opn3vM/xpAWvxZivAQ8hVAmhjG9m4BKCWoJfjE33Ysh/Re+9/O/aqem2jF1r2//clrpnUzZl9njW9//ib/tMvQErKzCJYlPBTjmp/S1cB0LI3QrEE2xo66DREAiSH1+Szrh8TO37MuU0I0ktjWwZpd73s/jur+q6nz6rXTkOOyzoDlf4osv4pFVmu8Afge932BpypxE+4jI21zP+TeFzqnrC7jDkTZGaQkwuqoKAGcfiKSKDU6tycbfh++zA8X1na6pXlLxAe0eiHEdeGbc0tQes5tt1UaWlNXxgmJOC0g0Md5f51mhWYDEc1QwMQ3uraYwFa/m9FRZbwfpAswmjRi+bPHfceKyq+wXDAYklmISN5dwyucPTSF5JOxQRCpMRKMEGjPXYJH8JHAANJTbXqzxhcLkPWQgG9ULoQGUr9R6XBbLMtfzd4PMCJkrIN4CbOyuycldOj4yE4m963At4kUOWyD7P+yCzp76NxF6GyDqM7SUECHWH0SpZfS2lZD2Z/Lsu+v6b2/n0c2uTtj89TN08g55pt4l0b8e/5YR7EL0R0SkIG3F6jN59RZsX3upIIE/hXhDaeH8mYMRjJQM8pbQjeZ2k74TvotmXKVdSxBtc837oOZkVmy5n0WX/qY2fHac61L279WlV3UNVX9dwfEeVVwdlpYOaKj8Wkds7eN6+wjJ4mzX8LsC6RpMTHHy1ofo+VZ03me0SimjXwvrithq1xkeli/8FWk60L/k1hKJ6QEceRav3lZgR315EWrAfquqBznGSKmUSLqmIXD3K54/JPHuLYRXjCTKZ+KZjyMAikyeBbjQD+6rqDqu+GIO3lqzoM63yVGAvIwiWPwCjJdxXI3jT4VRhyU4k76bcf9TkwyV/fdjD5oFJKYujG3/4dIZ5EsNpH5Vyis0GqNU91kJqPbYEvqLUBy0hSyFUkNom9p11k8gpO+hcPk8lpBacgpoOlAnD4bynbJrjGrwjnc2I77ilLq8m4QjiQTw8ozb2wf/I/tDYLDJ/5W4p7rpPuBW4VZf98HSCeSMNc3SeEFrrWNtDyBqkrKTJu/Xe762UA15x5QTFvBZWz9BuQafrvvUc1oUFzJh70Y4mNl11+c/Z3DiLgEH9HNLyGcBN7buKmo7sOgAPvo0LmGrh8REKf1I39m8+PJX1v54m08++f0z9Yu7p/6IPXG1JzRvQRjdZeJBKuUy9fi6LV7+Q8IMf6sPXXCZzzrhlNxBzs4CDFf6umXEChlojsBCLKeW5x+ar6nnbbNi1mONHNhWm+JHHbOxlB/9OyJMtVqT4m1ckCIkmlI2yPgQGmo6+RHlT03K0ql4I3CIia3d584APSmaUIBZn7MSSvIrIeNJ3aVK80tNOJZkdj391QJC8ooTkgVs9IjI4Sn+bsmmYf1NhriZ8Z2aVz41qRYRDjNAlls3kATu7nK4uFg0P8xygbGAKO4hI3XLJW4WWtjAWD6llnG0M/cby+56UC0Z51awi+GLr21KqnaLW674iMqY5aCfRr42HsdVGkX9KgQYi08nYd1JmtK7ZQzQGAmXmkPmXUNfDCImjiaMmYJzAcBnvDK55G0m4GZPdBtmOrZHOC17BUlgGOiDqStbRdC4XyC1u+EQUFZ+njDAepnQ4pUkAsQ7BY0wTft0FbBi90z0yjUf++AGm9HwB2C1F3ZZGnfeSn6gO/YZHfvlWMs6iGaag2RBICbRJuVQhc/+oQzfeK90n3jP+iTdoYfGEgLajNM4W1jVPwOuQyFF/2OFnpid/ZHN2N9bsT6BJVnu23vW1J8kh57Upz+SQR0MD0QwjWeH/1h5cQ1BsHuCCoUF1jJNfD3d+/00ktbXA/WPuE/s+77163w9XI+Zc0jCXkG0k8XeD9OLta1m17gy97dtXcMgBl0npmNsmSdAdpHBOvcGzMTRVuUnzpDmpGGyWUbYpB7kmR1sDQRExWwSappagiohss3Ll9h5V3ZJ4R4ukuVujxxS8YtXlC5GCYKmrYb0RVhhBmp6NDu4vBfZyhn+28EtVvXicomjcvcZCg4ALkBU54joSqDCqfALnA8FYPB14zSa0bu1xeQ6LzAohBGQMgu6I4WHODcLe1S4+3Z3IV8e4hOzpFZPAIDApSb0rhiXDhgGUeYyek0+lxWoSqnokynsIHCGWG7pS/msMgksNeBWa3hNIx/b6XFV7gbOALnbiGzg2UVdJbyeY9aifRfCN3HKjYEoLVG+dJnL0Li2PUxRUX5jf6KJv8NB9XyAzz8WwBoPk5jY/C+EWenveLnPPuGP0p1/yYDwqiqjHhvaLOuc9QT2+1UVveOv0qyO7iGkdbmUT8rx92oRQYvED/6QPXLGO4A1Kknd9L2jDYFXJnMENdXPntYdSrR7Gnr3/xuMAke5NwMd1zbV34t0/oswhZMO5sAubsPZgVqx7ATB+UWdwoD5P7NS+ABxd+fUDWVU7ga5pO7UkSvKS+/Shy68nhKdikkcQM59kzxcBX2zPlXR7xDfxNFGTYYJr3xNKQJwhBIMEQ8bpuvBHR9JTCjScYpIE7/LS5F4UV0/xzYSFl09HslOw8qaW+8R+L/mMLvvRbxgObwCOw4a9CDqI0QeRtJtm41zuvPN5etuFP+Cwfb4jycn37eJuu0rgpmqZTTWYGzLKeFL1eGtJVLHq2WQSEqe5VQCbe8fafOuqI/Jiy8SyNekORaLekcg4KRy6VSAYQUKKGUlLboXMOzJyT2RNEiohUNHAA8BSgT/QeiqQic9eI75RAYfig05KRRyvhswqTfIUGW1/BVtYILXF73hCXukigFHVw8lLFJW31QIe5jQcR2aemZUuVnbBW1pJX+OFXs3FSwaTUnsXYH1qqGVb720UwycaRrHUFYmM5wAnZoGXhECvKfONXrhQRJaOcZvvRRjCUgrwIlU9jkA3DjBIocbsthb1ZpMDVTi4nPKZFmbPHUxy8191oy7+wX2InY1Yn+d1lGE8C/DJVGDSah6KHLhcV1x1KU09lbScEpzDJl1kzpFWfyBzn3vH2I6U5S8UjPGoBFwHLHVkAcRhXIvHLjYQIwGwugvGhxFPEIcaj6SBalJBembiGqCSYJJc1Pk03yxKA2ySYJJViO0D87gqtyQzT71Sh65by0r9NCKzIAwjmuC1gXKC6vLLROYuHdfBVT0afF6lI2uf4NnkT0dDN3Nm/nB03ZVexyb/GlKbr+M+PEuXXXCRzHtDGxKId3mMaaDO4YPD075ghiTJ12jFkGmFUmk63YkiakiNwSYBTRVxQuZBsQiWxAols4psfL6xMu/Mm4Gb9aGLX8wQr0LtYSTMwGd1ymYJ0EMzvJWFS0/RB37wEdn3pdftujlPNgDXqOpNVXh+ZjjKKXuqgaKWZyrCmtSwMM1TK+SRw7LFeqTbLLLbWiaCPGp925KkMo/yEcQU6aWL/1dgryzlwABdKEkilI1hQwI3isjlkzegUSN5eJ8IamVyRB3gEJqiZNBRv7qxDynBe0uWOWxiMQ3Pa3ygKYHUJCRBqW5uMNd7ppcM0ysJ/2ETGU+OuVSgIZNbYtKJkG0TJCOjWFa95hY9s42I25s8vVwfMBXYK1MODo6ecsoVGH4uIve2JPYh856QCBICszNPP3mdYh3xcjS5dWrEbm680hRhdYtb4p0t8o3bCaWn58NZAsgGhCexcXAuLbze6AxZQE0NQoUQhpHQA2YlXdWxN7QrHmpQzf13XAfq9GkewUqrgrG7mIr91n1zxzIkb91MYIwD6zEyJHNf/JaxW5B+9F50Q5nHGdJ9yq91/c2fYWDzv+OyLoIOYnWYoPux6cG5wPhEXQge7z3Wau6j2I6u9ItpLLzv6SSl30j3KaM7IU+fcg8b1t+Kl1Nwfh2qhzLUczLwwzZ1F4/gUHW00ynceSF4ITiLpJZS5X9kznMuHdMlbbju5axZOyERLfu87grgCl36/bMZbr4Yw1MIYQ4wQFJaAmZPNg1foPdf8R5Z8OLLdu2GVjYDl6rqwhRe4ODwoKQoXXhqmM7kqHvMlHYycGiahz6rgT8Y+NEuft36l5QgcSApKuTZhJmEUofeo2K2BJy1naKig7Y8I4E3xU7twgAALsBJREFUufW2Xkn4KZah4jhlwA5mnEVgloMlg8Kpqvq7naTo2JG1VICGelIMkxVBbgpRJBia7DzzxEiN3sCjU72M+KB68tfIi1Lh51KShycg9usIBmVVYvhQasfmd6qqzwWmt3bzO7zd2q9QvxaXJQSnhFBDtIuBtU9hsjGhkVe7CILRkHuRhGFKduy+S4kNYF0RINChig1FZKDXFo89lIt72dYttls6PBvlO3hVh/OiumbOmL+7x4JLkRds5HGITHvGDynZn4FW0JBCaKChn3Xr9x73QS0O0YB3gdAmI9bDK54Dugcz+y8cmwB49ir6qj+ApsOaDKNdGPv09lzMEKB5uh1pfzAIIViCk9w3Uce+Weg/+Sr272lLBQ3Z++zvy0GvPoeurs+j8gCS9JPYmSQyQJIMUqt/Wh/+xamT0mdFForIJxK4XIT1eEoK84H9Oyzo5gBPt1BVWJMIl1qRz0+6oAPBYQVMHhyEaIfzge1k8Q4hjxzqZOF2bf3R4QkErzRE5Bci8jsRuUVEfiUi18+s8pmSZWNQuuqeJ22scc54Vjun1Hxenm3GZMn7LBQZSQPryP37dtaOTsM2Fc/z8bVMRBaLyO0i8tuinR6eUL/QonxcvqL3tfDdXwO/b4ulTvY/91pd9O3bUXMiPtViZz5Elh2nuvq7IrMmL0mn875IkJzmEYYB1HmyWgsrqM0TK2/ZURnt0PDTR3eZsTCQe8JIyCemoJ3fdSp5jdngPeo8/G7MZVNEDl/K45mu6hXUGich2UyCW0swZazOGvfxAnkE50i6yXbQNMeS2AWsvu9JuvR7e7JxzRSag2CNkqlnSleT1GbU0kD31ED/tEE2D0zB+02IlAje4fwx+qfP7itPeXebMr1Lfp/tdJ8RLzBSodJlZIM69n4oQ4XibN/lzD/zAh36+c9ZvfnvaTReAGYPxK/GJiXWrfmi6vLTReY+NEni7keqeicpr6xnPBs4Bbi1g6c8CThQ4E8GfjBGf6Jdgc0Te+avjo0pQvx2vahTMXgxtH+jM3KCgIQWB5wVMitkXvHVEkOq2v3Y4C0ReSgL+rX1Q7xHPWu0zAmqeoKI3NTCvJcFJfP5Ne4P/GYyZnMMRpQGwlIR2Vnwng+KlyI6tZNiXxIaOIKxNGmhzmzxnMb8ZjQZQw+6HDGHEVwJH+pY3YjYQ9h02wHA5Ik6xaM4Qgh47zF4NNRJXAtlXVxeqS8AorJlGmgnNWfyhW8c5dXyV95aZBfyefBER1eIorP53HrJvk+cknCj3Xr/CTfqgz9aiHOnok4QG1AtTcSmASgSQjvK/OmqCw5lfeNY0m5Pg7excahKVi6TZRavDaDBsBlGxBOsEgaVoeEKJq0R7DLw80ntZsTMoTLnNOArE7uibvIyYSFgrCcL7eubFod3vmg7hylNfv/oPvlB4J/0wctuJUvfi5GZZH41QQ5k8a1/A/znpF1b/orso6q6XOG5qvq0saY/aNHUcyBwCHCNEbl0dxvCFFsLaybVn0vF4hMI1nQm+hUF02Iy+wBNDA1rMV5pJGb70fipkR/VMn3yUMbxzQYDNcPrVfXOsVYNKVnW1UCspaFw0CQ9g6pRrMD6LjNqsJsPeVSw0NnADmeUprV5hDkd9DkcVdTJQef8UO/69gtQfQ4m1HCujkn2YM3G5wK/mjzLSqVBvdGE4DHaQDOP+iY9fuxe0jWrqAnb1LZtf1EXUYMLgs9aFEhTQIJSmOiwBDrtoiDBIaEJwRHEjZTC+KvB1+8h6LPQkBCCIJXx3781HiMeNXkwzkRZ614MSUJX3ytY8MzVuI1VkoMaYOvFZLRt+gbD1rJADe7/9rFo9eMYsfgQ8Ppc1csvFnnZ8EQ7d+5LFxQj7esrmjokOAKe4C3Z0G7TRWT+yy/Vldc8zID7KoQebPkRxD5XVb8mIusm9dpELlLVlcB+qrpQRNoduLQA+L6I/Hk3HL0K+MTiNa+UnW/77SRcRyBIQihSxrTdUCB2xCLRkqhzomSqpGJ2HtRUSfhsCOxd8/TXMmZWhdcA549RUDxUSpCg1AIcoKr7iMiutmL3GaU3KbEMuHeUThM0oJiOW3R9ABccYpMt/nodYWwHntn/38AKXFbFZQHf3ERWP1k3XH3k5I3hZkbwTUSbaMgILsM3HM362BfQqvEY9Xk+OBUy34EpQIQQlMZw687bGnLBqaq5tlvd2UAJ531uoJdA0Cb0T+aOd9dj7ApE6gSfoNoksWvGfywpvDQKa+tEVomhj82m6U+mp/cmmfP8W0XmLpX0sEUiyYMislJEVovIehHZUPysK363SkQ2yn6v+QmueS2B2QRXR/Rg7uWMNvRtw0iOM6dtnBRNIJDlqSmkgXFud+omMvuMG+lPP4MguCGPc3syfMteu8W1iVxDnmQ66cCxr95NBR2AashnSkIR0dhi/rG2zSK5sCPkkrITsjLfrLW20GdaFK0cTRCKyFBXiS8leb7D4c0ZJ6rq8WM81cLEMGQ8NadMAybD/34WULWWP48W6CHgMW3NnL7j/pmXj2tNe3VK1MnM5/+WSvWywjesgm8OEPx0Vm14+aQN4cwqqhmqDsjQkKeQaMV3rWQcIk0kKMEX47Hdwy9LCJmSms2t9gGCekLIxV2WyS7odrmIzFOXuhYCbp4YSKmBhibWJJSS9UztH7/zt4qiornL9AQFz8q+Z5Iksyn1/XLcx5iW/hRlmEqlgjEVmu60CS8see5CQ8Aivn2TlHoPhSuAaBNn3W7XVWa9+EJC9hAhA3UVBgdm7DbXJrJURAb+ugYvHoMLeWoKX4i6kX/v0uY3BlHFGLOlKkdbCR5rdu78v/3vBdSHXNmNoQ/dVk74uQT6mg7dVON1Oyu3tc337k0sy8RQ8o5aA56tqv278gHUPPtJicFSHmAw6mxDyFPh0Fn/Swm5e7VsTRc5iaIOQBac9V+kpV9gpYoxiuojKKfp+l+8eFKGcFU80ES9R4qcYFJEwY5ZGGoDdBgNmkc2h/a/33S2B2MdPaXVrXcDAuo1tyaqbz3YokUSAppXuMn9+bp2K0udLrnsNP3Tl07p4B67AlmGahmT3EPX4RMLJtiSpT+dWDtuyp6B6hrZ8/Srxn2MmXsuQsKtYPoIvo76o/S+y48e/0WttqgmECwaEoy0b0M0pSvDaJaXJpQM53dP386S+T1Chngl8UJkMgmSp6/IVHKLVDCjW6U6QCN4lDxwI6XNPjOq2uUDlbTFVEtmZPEw6Fg9x6tl+UrVsiIoqVP2aAZePZbvpXCjEfAZm0RZADx9VzW+qh4kcJCF20TkN2PqNxYV0zGr6tZnYB6V9HvyRR0A+8z5PLbyZ5LSFJSMEIZYueZtuuG6XW9iTRPFFIXudaRgeouW9nTWIMasx4QMvOCac9p+nbX6vkhaY8qMFq0+G0JusVBfvIbtqHNlIT80T5ZbeKRMbgLJ7fRWV0aqL1Z9pDOlNcTtiXpDcClGbxWZOf4QdjEWVQMqqE9UdVyTu6796DycP4Jq1/UTMx88YwW93deBL2NNHWv78MkEBLIIBAtq85S0oY0WCQ1bSuQpoeObmXFfplmFiKDBYyt/bZax3e5paMitcwpeQ15/lV3/+nWzUYZFSUMgof1pPfa0uVC8vSXFO1LXN7QWDdhV5YLUIgSyWo0Tipxpo/HzUspyk5A6zyaFs8di5WsTJ2ugu2r5v1Y0UKetZyMHt1uTze4eok66T76P+dM/DeYhhJk0h4dxjWksf+Qd6n+69y4dOllWWJQKo6Yh5HN/K68p912L2AdxXnHB02wcpnrD9PbNMtfOxDWfQgiLpfuMFsvmzPUE7/JXsLi8eHqHLRZZZoo0HMUieseudzPeGTOq95KaJzN8+9yOHL9emw+mQmIfZu7UGyd0LK8pInnJF8HCQ+N7Pbmh7wQqZWX6jO9N+P6m6U2EsASDhZriasepDnWPc7diC2EH6oXQxsTYWc2gKluKIGh7Uw3p4DXtyeWWb7pSglvFlKPvJzK5hC2F0lUMofj/XbohEJENFh5SqBTepu3OG3hQktCgKJnZgqgbydknLd7P77pK3GChp+lo1Jq8RlX3GeU7mxP4cVLCOE8tC/QDHXfVUtV9602eq5afisjYc1UWMfwdFnW5T53gQ4cNNC1PxNL9gj8wpfJpkFXYdC5ZYwPOHcXtD35Qh74zb5eNnjTJxZx3QlApyqUJjWBa6LCDVCt/RoNF3TA+7Muy9c9u2zUuWf5kpHwkVb45jslhCDF5VKNoBmTQHzo8IyWMlGcSLJR2L1HXNXMtIetlyYpXtX3EPfSDF+OzBZikC5H/k/Kpv53gEC6hWIwxJMZuyW/fKkN6IpoukWln3D3hx1t63kKsuR60m+AG8Y0DWHTpON0nVlqCs3k+viC4NvrU0bCEkBBcAmqQNvuTPrDivPaMFzcLKzMQ93uRnvVEJlfTGaTINxYm07SbGv4AlH3AOzhCVdtmKBjIeIEtc6uItORTFwJ2REa0uoiUEi4whhXWktSa9NUyzh3D+nV1Ce4QYUYtY2Pdc6KqvrLDTf9mNTzcZVpab4V8d9ppnzoNSkBxRrZYkXcPUQcgc195E936YSRZhqR7QdiAJiexaOATuv6SXZSbxpi8wl/hD6dBIAhl19qD6ecWVFaBDXgnDDXOaNslrq2dA3alHPT674xv0cgLMEPw+X1OrNOpXj9P9Y/TdzLyS6i3SLD5q7WlCbsV+zQRvwzkFbr2hye29dCucTpeDsRlt7OgfPHEu6caDLbwYLFgWxZ1+tDXjsHJgfT1X9O2++zrvgrvG4gZwgRLSE8e7w4g30yhqJF8E9Culaue5FG1Kh2JSk/KXXrL14+Y+DTtj8C7MuVwDZHJRqxBtnFTUduh6FdV3UtVn7XDoZ9ys1XWGfDOMwU4s03nPTI4Dq8KLddkTfIawR5wJrTWJiIy0NfFV22eUHnIK4er6t+M9j0LF1USHlGlv+ZYV/Ocpaov7ZAZ7A0NZUY14bMtphaSbUx0HX39agWPkBWirmMGmnHvrmXfc39Lf+PdGHMHaXk21qzHlI9laf1LuvSbJ++CMSxIEvIksQhBwFgh7WvNvNx9ykIq6TUkdjo0B8jcUXr/pW+bcCe7+6K/o1R9PlN63zf+XkAgMU2Map7rbIJRlIuWv57h2ys7ueoyIaRISJBgCQ9Ud695u+GwqYfgWTPwEd04EUf/be561fffSSangx2kp/oZSV458ZJHGgwiAt7kvnWzW392A/oCyiWYv+DnbWvC6XPvAe4iLU0l6AaCPUKXXvrc1g9UyctNEwQt/tu2oW0MxgSsCRhRrJmQFVBVe1SHerZe+pQKvTP+dkLHXP7d52PkVEzzWhYcdhORSRd1SZJv9VXzxVktQgeiTxXOYidlnkRkebnEj1GmB89wzXGqqh4+4dnP885KmStbLCQ/stD7oj5zZsZROUFEbu3t4gpr6fGezY0mz1PVU0b5zkOp4WvVMkNpid7Ms7mW8UpVfb2qTmmjoDs3g6eWhU+LyP0tP06Lmjx3X2cNvCb3VndtsAqqareqTm2rqAOQeW+6iyPSt2L0MpJygjVDmNJ8BvQLuvh/3qF61+yONVBmA6pJ7vqZBpLUIWUlK7feWAsW/A9W78Wm0yEbpunO0od+MO6oXl1+xasxvR+ip/eLst/Lfzr+J2fKqNdimrLw2+5xH8rf8gzSrgOk+/UrdvKhEhIEDYbgymxqVHarWVv2G8Z4CG4IKxVW1z+rD/73hCyruvbqV7E5ezPB1yjbf5L5r7yhPRdbAiMZVnyeKmfYtDZor51DWj6e3unXiTx9Q/va8PDVVLuvwdGL6jD4PurmZa0fqQZBPMZkGPFkvn2L59SpYI3DSJM08aRJOqHjLb3271n/yz22/sIPUUlepUsuf9v4JtQ/TqdW+xjOr2JB8z0ixw4RmWxMcJQFSFKQ3J+tE9GnZzVqPBMYbZ64opTy5xDodU2kAW9S1f3Hec4up/pRo9SqVj413msPmpcwC+O0EVmRS7rL/F6g3HDUm/AKVT1qFGF3W1n471QZSqDqlaF64HnAW1X1gAk+i5le9d8CHJvCp0Vk0fiOkzusd7h/JoW1Liv898oTPN6LgH3bLuryh/aqdXLIOR9gavLPVCp3Y816hBJ1/pXbb/6W3nHBuTp01fy2N9Hm4f3RrIfgBaELMSWs9JENTm39Ho5czl6zPkxS3kRa6iJoD0P1f9V7L36X6s/2GXvnuHm+PnDZfzLsPk/KV2S/l31s/B126Vw0zMANOXxd8EM9PPTgM8Z3rLvnsGrde7GyeZRu1wsu799GLGuGprLbEQyJduGzFG/7qPd+Ru++6MOqP923NevcLw/Rxd/+dwaHPopzg/SaN8l+r2jLazRVnYaGKeCbGFNHNG05cfSKoTMx6SxC85dtb8I51d+hfiVJ0ocJQ/jG0XrfJWe3dpDZPn9dH+qY4DGufbW8Ng32ku+c66hkqBl3VLred8VZNDYdJdNfsHUH32w2qdc3YCvv0qWXvL2VYBHVm+ezZOHFwHT2nHqmdL8zBkjsHvQgTDXgRbHW4JK8qPxhbRrTU1T15YNN3ppWWS4im0YRM4MWzk8THhShK3j2aQTeoarPVdWeFs57WAM+pjA3TfjABG6hHHLhkvkJVLlIDBdUS6xKEirNJmkj8EZVPXKUtri5bPhiWuJhY+kLGbVmxtFN5Z9U9VWqOrvFZ9GvqqcH+JSBYEXeLCIPjlPQVX2egqbZzDcBnaJMQDDUEqF3R4JsjPd/tipHi8gfdqge22IBmPPy64DrdNFFr4FwBk3ZG+yBBP0MDyy/R+/4ys/psb9i76mLMMesE5k/2NqN3DqbTSsXMFx7CnX/DIZrTyFIDxjFqsPVFOMcUuod1/V3P+v3OvSj83jYfYyG7oNrlmnyD/z5oRfqPRf+H/3V37HHgvvAZHBwUWZlUwIPz+ChZQuQ+gk8sPR01EyhKm+XeWddNoGH1sWdl5wL2VQ0Ww82RSkzkJ2rd37Jccj+C6FvGGZnMFLsvEdgeMswguEyw+t7WLvmyTzwh9dBchTN+gU7POfG64/nkaXz0QZgUkKo4LueAfxut5q6S90P0BjeTFqdh0/6CcGi1Tdy98qX6sILbkL9rfSaP7LP0cvhiOGRUkmq2gcL+7nvzqdSGziFlfefRlruxQ5fzf5d/y72Ze0rZbPsimeR1Q/FBId3EJjP6jsPY4y1knXJpSeQub/HynrW3Lm8/Rui6hBqNmLD/ji3GutmMezepEu/dqfsfd7YAjIGlh0COgvj1xCo0vQLVO+bIbLf2glf3+rVx1A2SmhYnEvxepreecFiDnnqLWCbeS7KiofebV6XTAG6AQSGUzbeOouN608kuH/F+M8/6viNZoUQSlgdRqof4O7vnqJ3fuViDpn7O3jOBpHu4cdYTWeyujGTDetOZ/Hil5E1DdPLz5WpZy8isrvwNK/MFmFAoawBG4S0bjjZq041+Ty2AagBdSBjq8/diB+eLQwdKbkgLANTs4z5g45nZhmHiVDPYOXYjAWyXFU/ZBPeUq9zRMMxK5Q4z5Y4TlV/Rx7BuuGx5dxUdSawfxOePljjxLTEHWki/ziB9aS/UWM+KeINSmCKqs4RkZZTNonISlW9JChvDhldDU9vqPIWVb1ERG7ayff+rKr/mVhetdlxTBAaNOnzwstNwtNV9TfA73YkzopXjTOAp3o4WmC6gW+LyHUTaJe9Gw32VpDMo2qYraoLxvEKd7Tz9OHY3+YFI30IdGE5XVWHgLvZWuJxxIa6vbeNFpgKPKvheH052bGluGOOgbrwqycR9DScHo3YvQnMIGQewoMk5l4wS0iTpaR2OZXqWvaeNYgrweo1VTTro+mn0qjNJmvOJcj+lMoHE+x8TKlKQo3gB3FsoLuymKS6EGvuYmbvnyQ9YcJRgnrfd9+Jcy+g1pyGkRl434u4ARK7BNXNYGoIJYyZgrXz8MkUKtX1DG/+HodVPy3yis3jPvfQ9Qfw8NrX0Nh0HmrXUjKCD4bMVdBQRh2IrMbIEN40MN7lVg2jOCcICT6kIFMITKNSmoWkNZKKww1+SQ5700cf3eGu2Z8H1h+EL52HGz4A0YwgHnXd4Adp+C9w0B6/lu6X7hYLmKpOE5H1uvbHxzPUeCa17Eicn4EJexFMP1m9TAjrSMIjOFmHMcPgFVuajjIb0Wl4HaKc3sjUKRfLnmf+tn3X9sN5LN70FEJyHoZDQTahIjQb/ZjwJ3q7LmbenNtETnpgO/fVjV4xhUX1E3DD76Bij8S5e8kGPyFPfsf32th+3Sz58Zn45vtobqygpkbmKoSsh8QswuiX2HfuHdL9ont3eI/LGk9j2L6NbGg+yCDOVXChQn/Xzyib/2bewfeJHNmyuFN3zZNYtPYkEvM6fNZNknoyn9JsdhO8oeQfQOwaPI5AnZJ1BANGU7xYRMp4UkKYiep+TOuehqQbGVz5Wjns77dMgvrAFR+gMbw35bAU7d4LGTyN9YPTKWWL8cntiFmHz9ZjrWW4KVTtoSj7YcrdVMKFctB5n44aavdAVecDT6t7zg6eqghNDxYlMYJRwaZ5WnUJQlPzGqhNBK+KtzZPTJMfDOMDViEJnopXKg76fEYlTahrwoAVqFS5vFvky61cp1M9vdbgJGuZmWVUS5aKGIYwbPSeDaWUBg7vhaneM9N7ppqERd0p3xKRO8fZNr3ATAd/M1TjOBUGg6CpUq5WuD6BK0XkgXEe+6iG5+XBM009plwlsfkr6T8Um9fNIjK0I+ujwilNZQ+UKcEx1UJVYcCkLEuERwSGCuFdAXo8zPGBGVZYa4WrROSGCfabqcCrNzd5blAaBCgnlCopvwF+NB6/xR2cZy5wWuZ5kfNkasgyhy2nSGJpSGBNUxhMleaIX5/JddmI350ESFXpyzL2bjr2KpXwlYRvisg3dqmo23JT4ZK5LBvcn+H0QDJ5KsEfhMp0kAredeGDzQOubYaalKAVUkmwiZDaQGKbqBmmka3HmEVUe+6hUV+LyCPM3ucumXr8nR257rVX7M3GTSfiwmE4vzeeeajpx1JFBKw46mEdleRuJP05B77wxyLdgxM6Z+OPx7Bmxck0ZBqlsJaGlDDegAZKI0reQBYq5Jn5AjbzuKBgPFmWF1bX4q09EjDO0/QW4ypkm66Uw99zx9YOt3IGw3edwco1c0lLg7hmivNVsqYnEcE3PE0tY2Qjh+/5TZEXbtotJ/YVVz4FzQ7F+Rk0shnAVLJsLs70Y3wZH+qY9GFKyZ9J7e0sWPAnkaNXtndxeXA2a/90HBtqczCakVhPEMF4j7Ee57vImmV0eCkH9t4gcs76R4v5W45g1eJDGKzNo97MEK3R3zWVmktAfyFPfvPNbbnO+u3PYfWKQ5BanUY9wbkEEcFYQUIPtXoFaS7noDk/k+TMJY+ZoHpYfeXz2bhxPqY8jHMGmyaQaJFRqIdGs0m//aXs+bLftTj5zWTzjSezaqAHcU0kTUgtgCdJMxCPG+yi1ighmsfypRaCCKjBeTCquNRBQ7DJMF7rpI2UBeHqx7b3o8694buHs1KPxOgRhGQWvj4T30xRTQnJKqxbgg7dIke+63+jjNqtBN0c4DSgCjSLXxu2qSKR5VGwGUA9wxiLhvxDgiI2T/QhHrBFuneb5kmLLfgmaJInNE6A7gykC34x/td9eozCnAzmuYwZzYxZHiqJxYSMTd1drMwMi7vhtyKyfILt8zTgSUC5nt9P3j4eSS0JsB5YJCJ3TUAYHQv0FpakvkKMrATuHq3uavH89gNmAntmnlmiTM083daSaEZGmU0aWCkJ95XzKhEPtKHfzAeOHukrWX7tkubXXirE5O0ics8Ez7MH8MyifWqFJW4kqmykj5azQJKBpEXFieI6tgTlBrA+v7464EMezHyLiCyZFFH3l5aoz05HD+ljTeijVJpOlk1HpYqGElkAaToajSaZGSZtbsa69djaIFPCBpn99rWTNoH4a+Zx79o+Ul+hVB1i3oLVIkfH3FSRSCQSibRHqHcVwkpEZENskUgkEolEIpFIJBKJRCKRSCQSiUQikUgkEolEIpFIJBKJRCKRSCQSiUQikUgkEolEIpFIJBKJRCKRSCQSiUQikUgkEolEIpFIJBKJRCKRSCQSiUQikUgkEolEIpFIJBKJRCKRSCQSiUQikUgkEolEIpFIJBKJRCKRSCQSiUQikUgkEolEIpFIJBKJRCKRSCQSiUQikUgkEolEIpFIJBKJRCKRSCQSiUQikUgkEolEIpFIJBKJRCKRSCQSiUQikUgkEolEIpFIJBKJRCKRSCQSiUQikUgkEolEIpFIJBKJRCKRSCQSiUQikUgkEolEIpFIJBKJRCKRSCQSiUQikUgkEolEIpFIJBKJRCKRSCQSiUQikUgkEolEIpFIJBKJRCKRSCTy14HEJohMFqo6G5guIneO8/sHAQ0RWdKBazsEyERkcQeOvQB4CtAA/Dbj0AMBcMCDIvJAm843DZgqIveP8fNzgDkicus4z/cU4ODiPmzxo8W9jfz44ncN4FcisrnFc8wDjgaaQLk4Vnmb4yrQVVxDGGljEbl0N+n7zwTmFdenI7/ezn+luKdrRWR4nOd6MrBURDa2OLbWisjaFs81BTgR6Cuum236eFY8C1v8Nyv+XgbuE5Hbx3l/TwemAzUgLX6S4pwG2AwsFpEHJ/jMDgMGRGRpi997PvBbEVkXZ/1Ip0liE0Qmkdej7kOqesi4hJnqTxC5EviHDlzbfwY4XFWf3eokPgb+GcJLwFwN9Gyz6I38dAFTVHUz8FkRuXaC53sr8EzgtDEsQE8D/TbIB4BbW38kugdwEQGLsAzRFAgoFsGAgDoF41CTQBjEmMXFwtsK+wLPKxbtaiEM+oCSokcJco0qVREU8HgtYWVIVa9rVah0iG8BKwk8giEtJFwhfjUXpSJNgpYxrAL5NTA8jufRB/yg+HlvC6L+G8CFxU8rzAZOBfYqRFtX8ZMozBdlEOGObURfVjzD64Hbx3F/hwKfBx4EVgL9xZ9KQKXoG73AbFW9AXiXiAyOT9XxMkRfChzewvW9BM0+L6Y0P073kUjkCY2qvlE1DKjq9eP47tc055MduK6T6k5vLo7/Nx04/kWq+tExfO7NGvwaVX3rBM/3AVW9bgyfO1ZV71bVN0zgXPNU9SZVfc0k9al9VHXJ46DvP6SqR+6C8/Sp6nVFX37jGL8zU1V/qaqva/O1XKyqH2/zMY9S1e+p6n6jfG6WBr1Ug/vDBM7VX7Tl+WP8/N7q/GpVPSnO9pFdhYlNEJlE+kGu9LCvqr69hcn11AxOQvkzMKCqPe28qADvL1u+AfwL8FpV3afN9+3G8iER+Tpi3g28Q1WPn8D5ki0v9Hbcps/C6zeBT4jIBRNrPhJg2iT1qW7Q8uNhSwOFha6zlIA1wM0KH1fV543xezXyV+PtEl9dwExyq1k78eQWuWmjjKXVCG9A7O2q+r3xnKh4ff3PqL5qLOPRwxex5nIRuSFO9ZEo6iJ/DaTAJgtvAvevxauUsfClFM5HuAYojft1yvYXn2PVMxu4D/gf0IPIX122W9SFMS4k30T9vcCrJ3A+y078Z1X1FDzfxMpnReTiiTYhj/aX2tUMgjR2+56v4scq7idIA5gDvEPgGyHwqTFsUmSbZ9kWCn/ArJ3H3KbH7bR/b3MNQ8B/gx6qqvuO8z7+gMgn8rlhp/PIuTaEA0TkbXGaj0RRF/lrYRCYLyI/heR7Cp8bzerWUH13yPvtxcBQB67ptdZyE/BnEVkJchtwZputgSOBAmNcSez9QPeERJ1sf9FT1dMIfBfLx0Xka226N53EPhW0lbadRFU3VmHfBix54Mu/GBOGgPdP4nrT7jUnQUiKexwLq0HWAkdO4Jz/DSxU1a/tYEwdSvD/gTFnxSk+EkVd5K+JDGiq6hQReafgDgSev7MvlOAtBj5SWOeSdgoIVZ2G8iTgKhEZKH59foC9gePbeN9jttRtYzGpTcRQsr2xrqovxnM5hveLyFfaeG9ucoWdNh8Hfb/Brsk+IKjKVtFjng8cO4qfpnZQbvr239+WKOGxDiZXbCjHd0KRTcD7IDxNVY97zJjqw/NljP2siNwTp/hIFHWRvyYsBL9V4CTnBeXDRQTl9kTXt1F+A/xoG1HYzldYf49wN3DjNhP4dQbuRzl5Mha2IhJxL2AiC0SJPDp02+OeGeA7WN4nIl9v83N1QH2S+pTTNvqCdU5qCbuojSwiOtLnisjftym8TVXP2PG41KQDorNJ+1/LB/II57FmcjhYguubaES5iNwL5hOgX3rMn/4Vy6CIfCZO75HJIKY0iUwmAUxtmwXnp6p6r8I7yYMUthUhRzvH8UnCGdtY0RqPFSsT5GnAN7aTM+1CL/xrkd7kl20SdWO1hZyHUhUj/zWB82WFsBtpy38APm/gYhH5f+1/pjhgvqoeDMwoFnN5jEgIQG28ucl2vlOV+m7f8zV4xDxLVSFP72G3aRcp+nYKrBtrfsFRnr/fRpD8qnh1+EFVXS4id/ylqOvIht8VfaGt8ri41lEtw6o6R+HdYpIr2nTuq0BeqKrfEJE3qurrcNlrJS3NiVN7JIq6v2KKyDC2l1xUVbtEZHjkM9vZPesEkpJ2wUMG6qnIQRsm4dbtdq7/9QF/h6peKiJ/3ub3FyUJX3jMKw1HngOrHc/gn4B72cZKt80i+DNV/y4wpwDtEHWBPBJwe9fRVwjVw1E+gHclbPKmid0c4kUHATQL/xPQ4w3yj8ArVPV1bQiOeKxgBcJpYI4DrRStmFt+QsgDP61NgKXA2W3XdLvOV20CUsQMQ/hbMGcCFUIog1Zyq5oKYofx2VRsulBV/05E1k+oBzxG9IjIfxXJdD+iqq8vXiluHZcBi+mIpa4Tr8bLFNGvqtq/bZJlVe0mz113HIH3iOEuEfmPtjxCkUFV/RiEb6rquQTeTpK+nUjkr0nUqQ714q7diw3DZUrlKg2tIiHF+wrOV1GtoKELlQpIFypVfEixmqCS4m2KkGCtQawFEoLkGcQFA2pALCIWlZTgS6hLELUoCUpSTFggFlQEUSEgW/SSzXOkErSIqhKBIFumR8LWKVK2WUdUCnd0I1gRxBhUc+dgM/I3yc8jAFYQEVZcDSC6/KqtU/DIZx6+Bl1+NTx8NaBS/E23eJKoqC67upi0VUGKVTNv7fy+NP+bBlAVVBSjypIrwKaepLuka294r8w46bu7emkD0hHhWkyUG1T1/ACfVtXXiMjqZtAPB1ht4NvbEUd22+9PgBOAb+948TTfDvAaVT1KRP4wwXMNgv5DYcmailLRQNLMMFmTKWLoJXBvUuJibPKtCS7oIAwKUlXVT6EcY+BEEVlZCMiPqOo1IrK6jULdg/mWiHx5svZJj4O5txfMKzphqdxOW2zXh1NE3qwafg7yQeDdj36G0gl/P0f7ferqqM4C+Xzw+mGFbg3qvOKCYpxjnjXUCfxZEr4sIt9s6wQmco+qfpLgL8TYL4vI/+4WhoI1v70XkWmg9VykqxBQRMGYrb3BbFnERtY32bK2hKDFq/tQLCkjibFD8bt8HRLRLdsGKf4VBIwoYhQtjr2lRxXrFyhIXgFGJUDIg6xEPMjWjcjIcTVscw0jax0BEY/gi+8H0FBElyuYfD20mh87BDAoQRQjxRsTCaiGrf0zBEgcqEezANaRmAy8R8lwmcdoE/VNjNQxUkepYaUGtkGiTTJtoqFBqbtJqZyRTGvCXutbrZzzeLHUJWxoVPGlEnWTMpwZxAvBKQ3vMDRJLTjJG9nKME4TGpIiqUVDisXiMEWGeoNRASOoCAYhYBDJ/4bkv0cNJhT/NuSdVRRsQCXvNkHzzxsBL7kgM+SHyaPVCmGlucgTUwyKUAwSzX83EtcmtuhEolvyprPlWAZji18IW4WjyUWmmGIUaHGtRVChyjaTtSiinqB5xxwZjPlnBTFbxZ6qbPm+aEBRjM0Q8WSZob/77knaVKQ8JnJNRD4ZVN8MnKCqP0H9eWDP2U4lACV/rTihBUhV3wssB362k8n726r+bWBOBSYq6npBfiwi56pqtxgZ2uZanuYyzk9KfEtEzm9TO282cBRQQ3hRHtULIvJRVT8bzP+Rv3pul1BvAqsnaT17nPgJa7NY0DrNKNHI8npCuFpV37JNsMxIROnj4fmk5BuSi0W4AuhHWG+FLMnfcHwAeCOGc0VkWYfu6WaMXQh8abfpXlOm/YDBbC7qIajBGsWGEUEFRkaElmwRXSNrSlAQVaxunWVN0Hx1CYysMqCSr4+SGwsC+VoXvGDMVsOEsUUoi8m/Z0Qf1RVEFB/YKtb0sVuQ4u8jf7DFf03+XyMelYCasKUay0ivt5Ivzk3AaMi/o9ucIAFTXJdqIWYlXyutBLwBawIuFK/5Q5lgA5qlYMpoqOKlSUnquGaDjDplWyMLdYxvUGrWCaZB2JAxN6vTeuWc3V/UiXRvADYQiWwVY7KdP7w3BP42wJcSYz8nItftYIH4C1E4Dp7n8UdZ7L6qarZMDLmyThVNJPfTOiQEhlT1EhFZPkFr1rpCWA09RjzeoqpfB95SlLRqh9ieTl5G6RUjgm6bJvwQcIGqfktE2lIFIoA3kxes0Im0GZ3q+rviNbHu7Dwisix3PfCfLfzrfgxUkQ4kRla1SNstgKawsKwSke2tLeeT19h9B/BPHWrjhgY2i9l93JmkdMD74vLy10n0qYtM9som2xV1Iv+rqqdKXhv1f3YijsxERF1REmvYYt8FLAMqIBlbzKSo5K8CBoDEGD4HPAf4ZhvufUcL7QWqenyALzCGeq1joATc/peCLo+GVNX34t3Fqvr+dvgbmfx5VCZR1JV2+56voRsxu6LyRWCU5NNFgNLBwD+r6h3AyqIerW3zcO9MAIbuKAtjnn5EVb/hAxeo6gsL0dr+iSz3P0yJRKKoi/yVU/g+bHdCPm8MC1ZLOar+8gj+pRh7kYhcPkYReA1wzARFXYnRrTQfM1n9KlX9lIi8d0ItrDhkx3nuRGSRqr4DsotUdYmIfGdCZ9sawTlZ2N2+1+e+SnYXtofZ+eXIF1T1WPKo838DNwBJe4W5bBHd7T1qftxsJ/f2e1X9Msr5QCdE3Ugeyd0/lU7kCU/MUxeZ1KWtmAgnJVpRVV+JsTVa85H7JDC1hRqaOxp3ySiL7BLSygdBT91JPrGxtrKHUBrlfL+D9D2ofmiCdWZHRGt/nNd2tpkIugvH2JislyLyypCnoPk4JMMdECmhA89mpNxaNsq9fQ0N/6eqP+rkU41TeiSKushfMyNWnfEucLUJ9WPV1wA/FpEHxrxC5pUslgKHTHChTcdwru+DXAX6gQm2czMPphn1fFch8inQr6nq7HGeywKbgIWTN6fp7h/9aswQu8Bpmq0+hjLGD/8LcDDoc4CVbR/taLvXnIDq2Cq0GHM+MFtV39iBeawZRV1kdyC+fo1MJnbb6X6cC1Yf43jVp6rvCJCZ8eWd+ybwBVVdKCI/Gcf3S4yxbq2IvF81XKUafixiXjjOdkox1o7xfBeoahX0BlV9gYgsbvFcGfh54L+j6h4C6QUzlC94aoo0BCN+lCML/JWSF0lvBynqp+z+XT9UCPpzVbcCTAOkDuqL9oHc+pTk7ck84JxxBs2MWIVljM//3jxQRy4CZrf1lsV3gXS1uSEVETfGe1ukqp9D/deLsfvbNoo6T3sToUci47YYRCKTQpEYNN02WWiL3+8DekTk4XF8dwGwaTtpUsb6/TnAQGG5G89161hzFqnqXsDc/BXpuK51CjBFRJa28J0jgIdFZM04zvc08nq5vhDuKVujFEMhVEYsGw5Ympddalu/eoqI/Gk37/sHAXO2IwxGcrlt+2/zmETcrZ7rMGDZYxIMj/adQ4FHJpwj8dHH3B9oishDbW7LWa3kWVTVo4HVrYyHdl9DJBKJRCKRSCQSiUQikUgkEolEIpFIJBKJRCKRSCQSiUQikUgkEolEIpFIJBIZhf8PQLWBMqiMt48AAAAASUVORK5CYII=";
const TOOL_LOGO_IMG = "data:image/png;base64,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";

function guessIndustryKey(text) {
  const lower = text.toLowerCase();
  for (const [key, words] of Object.entries(INDUSTRY_KEYWORDS)) {
    if (words.some(w => lower.includes(w))) return key;
  }
  return null;
}

function extractLabeledField(text, label, stopLabels) {
  // Field values in this document format always sit on a single line
  // ("LABEL: value"), so the simplest and most robust approach is to
  // capture everything from the label to the end of that line. An earlier
  // version tried to look ahead to the next known label instead, but that
  // breaks in two common cases: (1) free-text narrative sections (e.g. a
  // market-performance paragraph) sitting between two labeled fields, where
  // there's no whitespace-only gap for the lookahead to cross, and (2) a
  // field's own value happening to contain the literal text of a stop
  // label (e.g. the word "product" inside a performance note), which then
  // gets misread as the start of the next field and truncates the value.
  // stopLabels is kept in the signature for call-site compatibility but is
  // no longer used.
  const re = new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*[:\\-]?\\s*(.+)", "i");
  const m = text.match(re);
  return m ? m[1].trim() : "";
}

/** Parses the fields this tool understands out of a company-profile PDF's raw text. Returns { data, fieldsFound, confidence } so the caller can tell the user exactly what was and wasn't recognized, instead of silently filling in guesses. */
function parseCompanyProfileText(rawTextIn) {
  const rawText = healLabels(rawTextIn);
  const labels = ["COMPANY NAME", "INDUSTRY", "PRODUCT / SERVICE", "HEADQUARTERS", "ANNUAL REVENUE", "EXPANSION BUDGET", "EXPANSION OBJECTIVE", "EMPLOYEES", "CURRENT MARKETS", "CERTIFICATIONS", "CUSTOMER SEGMENTS", "SALES CHANNELS"];
  const companyName = extractLabeledField(rawText, "COMPANY NAME", labels.slice(1));
  const industryRaw = extractLabeledField(rawText, "INDUSTRY", labels.slice(2));
  const product = extractLabeledField(rawText, "PRODUCT / SERVICE", ["HEADQUARTERS", "ANNUAL REVENUE", "EXPANSION BUDGET", "EXPANSION OBJECTIVE", "EMPLOYEES", "CURRENT MARKETS", "CERTIFICATIONS", "CUSTOMER SEGMENTS", "SALES CHANNELS"]);
  const revenueRaw = extractLabeledField(rawText, "ANNUAL REVENUE", ["EXPANSION BUDGET", "EXPANSION OBJECTIVE", "EMPLOYEES", "CURRENT MARKETS", "CERTIFICATIONS", "CUSTOMER SEGMENTS", "SALES CHANNELS"]);
  const budgetRaw = extractLabeledField(rawText, "EXPANSION BUDGET", ["EXPANSION OBJECTIVE", "EMPLOYEES", "CURRENT MARKETS", "CERTIFICATIONS", "CUSTOMER SEGMENTS", "SALES CHANNELS"]);
  const employeesRaw = extractLabeledField(rawText, "EMPLOYEES", ["CURRENT MARKETS", "CERTIFICATIONS", "CUSTOMER SEGMENTS", "SALES CHANNELS"]);
  const currentMarkets = parseListField(rawText, "CURRENT MARKETS", ["CERTIFICATIONS", "CUSTOMER SEGMENTS", "SALES CHANNELS"]);
  const certifications = parseListField(rawText, "CERTIFICATIONS", ["CUSTOMER SEGMENTS", "SALES CHANNELS", "PRODUCT"]);
  const customerSegments = parseListField(rawText, "CUSTOMER SEGMENTS", ["SALES CHANNELS", "PRODUCT"]);
  const salesChannels = parseListField(rawText, "SALES CHANNELS", ["PRODUCT"]);
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
      industry: industry || "software",
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

/**
 * Splits the raw PDF text into one block per "PRODUCT N" section and parses
 * NAME / CATEGORY / PRICE / USP / TARGET CUSTOMER / PERFORMANCE out of each.
 * Returns an array of product objects; unmatched fields stay empty strings
 * rather than throwing, so a partially-filled document still yields whatever
 * could be read.
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
    const name = extractLabeledField(block, "NAME", ["CATEGORY", "PRICE", "USP", "TARGET CUSTOMER", "PERFORMANCE"]);
    const category = extractLabeledField(block, "CATEGORY", ["PRICE", "USP", "TARGET CUSTOMER", "PERFORMANCE"]);
    const priceRaw = extractLabeledField(block, "PRICE", ["USP", "TARGET CUSTOMER", "PERFORMANCE"]);
    const usp = extractLabeledField(block, "USP", ["TARGET CUSTOMER", "PERFORMANCE"]);
    const targetCustomer = extractLabeledField(block, "TARGET CUSTOMER", ["PERFORMANCE"]);
    const performance = extractLabeledField(block, "PERFORMANCE", ["PRODUCT"]);
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
 * Splits a comma/semicolon-separated labeled field ("CERTIFICATIONS: ISO
 * 9001, CE") into a clean array. Returns [] rather than [""] when the field
 * is absent or empty.
 */
function parseListField(rawText, label, stopLabels) {
  const raw = extractLabeledField(rawText, label, stopLabels);
  if (!raw) return [];
  return raw.split(/[,;]/).map(s => s.trim()).filter(Boolean);
}

/**
 * Confidence classification for every field this scanner can populate.
 * VERIFIED   - the exact label was found in the document and a value was read.
 * ESTIMATED  - a numeric value was found but required cleanup/parsing (e.g.
 *              currency symbols, thousand separators) to become usable.
 * INFERRED   - no explicit label matched, but the value was guessed from
 *              surrounding context (e.g. industry keyword matching).
 * MISSING    - nothing usable was found at all.
 * This mirrors section 6 of the brief: never present an inference as a
 * verified fact.
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
        fontSize: 22
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
      const freqs = [523.25, 659.25, 783.99, 1046.5];
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
          const angle = i / shardCount * 360;
          const dist = phase === "assembling" ? 300 : 0;
          return <div key={i} style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 22,
            height: 38,
            background: "linear-gradient(135deg, #E0C58B, #C8A96B)",
            clipPath: "polygon(50% 0%, 100% 35%, 82% 100%, 18% 100%, 0% 35%)",
            transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${dist}px)`,
            transition: "transform 1.15s cubic-bezier(.16,1,.3,1), opacity 0.4s ease",
            opacity: phase === "assembling" ? 0.92 : 0,
            boxShadow: "none"
          }} />;
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
      {isRTL && phase !== "assembling" && <p style={{
        position: "absolute",
        bottom: "16%",
        color: palette.gold,
        fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif",
        fontSize: 40,
        letterSpacing: 0.5,
        opacity: phase === "fading" ? 0 : 1,
        transition: "opacity 0.4s ease"
      }}>{appName}</p>}
    </div>
  );
}

/**
 * Ambient background — small faceted crystals drifting sideways in a
 * few staggered rows, purely decorative and behind all content. Used
 * on the intro/landing/login screens for a "beweglich" background
 * feel without competing with the main hero crystal.
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
        background: i % 2 === 0 ? "linear-gradient(135deg, #C8A96B, transparent)" : "linear-gradient(135deg, #527FB8, transparent)",
        clipPath: "polygon(50% 0%, 100% 38%, 50% 100%, 0% 38%)",
        opacity: 0.5
      }} />)}
        </div>)}
    </div>;
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
    try { window.history.replaceState(null, "", `#gcc/rechtliches${anchor ? "-" + anchor : ""}`); } catch (e) { /* sandboxed preview */ }
  }
  function closeLegal() {
    try { window.history.replaceState(null, "", window.location.pathname + window.location.search + "#gcc"); } catch (e) { /* sandboxed preview */ }
    const from = legalFromRef.current;
    setView(session ? "dashboard" : from === "register" || from === "login" ? from : "landing");
  }
  useEffect(() => {
    const apply = () => {
      const m = /^#gcc\/rechtliches(?:-([a-z]+))?$/.exec(window.location.hash || "");
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
    industry: "medtech",
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
    a.download = `${record.input.companyName || "analysis"}-gcc-market-entry.csv`;
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
    a.download = "gcc-market-entry-all-analyses.csv";
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
      industry: "medtech",
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

  /* ---------------- LANDING ---------------- */
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
        <LegalPage hashPrefix="gcc/" lang={lang} appName={t.appName} th={legalTh} anchor={legalAnchor} onBack={closeLegal} />
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
        background: dark ? "radial-gradient(circle at 50% 0%, rgba(200,169,107,0.05), transparent 60%)" : "radial-gradient(circle at 50% 0%, rgba(200,169,107,0.10), transparent 55%)"
      }}>
          <div style={{ position: "relative", zIndex: 1 }}>
            <React.Suspense fallback={<CrystalPhoto size={230} />}><HeroObject><CrystalPhoto size={230} /></HeroObject></React.Suspense>
          </div>
          {isRTL && <p style={{
          position: "relative",
          zIndex: 1,
          fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif",
          color: palette.gold,
          fontSize: 44,
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
              <img src={CRYSTAL_STAR_GOLD} alt="" style={{
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
            fontSize: 34,
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

          {/* right: login/register form panel */}
          <div role="main" className="flex items-center justify-center px-6 py-16">
            <div className="w-full max-w-sm p-8 facet-card" style={{
            background: cardBg,
            border: `1px solid ${lineColor}`,
            boxShadow: dark ? '0 20px 45px rgba(0,0,0,0.5), 0 0 0 1px rgba(200,169,107,0.10), 0 0 40px -18px rgba(82,127,184,0.3)' : '0 12px 30px rgba(10,17,40,0.07)'
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
                {authError && <p className="text-xs mb-3" style={{
                color: palette.coral, lineHeight: 1.6
              }}>{authError}</p>}
                {authNotice && <p className="text-xs mb-3" style={{
                color: palette.gold, lineHeight: 1.6
              }}>{authNotice}</p>}
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
              {!backend.enabled && <p className="text-center text-xs mt-5" style={{
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
              </p>}
              {!backend.enabled && <p className="text-center mt-4">
                <button type="button" onClick={resetLocalAccounts} style={{
                color: resetArmed ? palette.coral : subtleInk,
                fontSize: 11,
                opacity: resetArmed ? 1 : 0.7,
                textDecoration: "underline",
                textUnderlineOffset: 3
              }}>{resetArmed ? AUTH_TEXT[lang].resetSure : AUTH_TEXT[lang].reset}</button>
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
              boxShadow: '0 8px 22px rgba(212,175,55,0.45)'
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
            boxShadow: dark ? '0 20px 45px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.10), 0 0 40px -18px rgba(31,191,176,0.3)' : '0 12px 30px rgba(10,17,40,0.07)'
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
                <textarea rows={3} style={{
              ...inputStyle,
              fontFamily: "'Inter','Noto Sans Arabic',system-ui,sans-serif",
              fontSize: 11.5
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
          boxShadow: dark ? '0 20px 45px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.10), 0 0 40px -18px rgba(31,191,176,0.3)' : '0 12px 30px rgba(10,17,40,0.07)'
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
            boxShadow: '0 8px 22px rgba(212,175,55,0.45)'
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
          <p style={{
          color: subtleInk,
          marginBottom: 28
        }}>{t.industries[rec.input.industry]} · {t.resultTitle}</p>

          <KpiStrip A={intelA} rec={rec} th={intelTh} lang={lang} t={t} getTimelineLabel={getTimelineLabel} breakEven={intelBE} />
          <WhyPanel A={intelA} th={intelTh} lang={lang} />
          <div className="mb-4"><StatusLegend lang={lang} th={intelTh} /></div>
          {/* comparison */}
          <div className="p-6 facet-card mb-8" style={{
          background: cardBg,
          border: `1px solid ${lineColor}`,
          boxShadow: dark ? '0 20px 45px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.10), 0 0 40px -18px rgba(31,191,176,0.3)' : '0 12px 30px rgba(10,17,40,0.07)'
        }}>
            <h3 style={{
            fontFamily: fontDisplay,
            color: ink,
            fontSize: 17,
            fontWeight: 600,
            marginBottom: 18
          }}>{t.comparisonTitle}</h3>
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
          boxShadow: dark ? '0 20px 45px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.10), 0 0 40px -18px rgba(31,191,176,0.3)' : '0 12px 30px rgba(10,17,40,0.07)'
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
          boxShadow: dark ? '0 20px 45px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.10), 0 0 40px -18px rgba(31,191,176,0.3)' : '0 12px 30px rgba(10,17,40,0.07)'
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
          boxShadow: dark ? '0 20px 45px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.10), 0 0 40px -18px rgba(31,191,176,0.3)' : '0 12px 30px rgba(10,17,40,0.07)'
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

          <ScoringSuite region="gcc" rec={rec} A={intelA} th={intelTh} lang={lang} factorLabels={intelLabels} parts={intelParts} />
          <ScenarioCompare rec={rec} A={intelA} th={intelTh} lang={lang} t={t} factorLabels={intelLabels} data={intelData} simulate={intelSim} getTimelineLabel={getTimelineLabel} />
          <CompetitorBlock rec={rec} A={intelA} th={intelTh} lang={lang} data={intelData} t={t} />
          {/* sources */}
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
          boxShadow: dark ? '0 20px 45px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.10), 0 0 40px -18px rgba(31,191,176,0.3)' : '0 12px 30px rgba(10,17,40,0.07)'
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
          boxShadow: dark ? '0 20px 45px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.10), 0 0 40px -18px rgba(31,191,176,0.3)' : '0 12px 30px rgba(10,17,40,0.07)'
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
            background: dark ? "#1A140D" : palette.parchment,
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
          boxShadow: dark ? '0 20px 45px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.10), 0 0 40px -18px rgba(31,191,176,0.3)' : '0 12px 30px rgba(10,17,40,0.07)'
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
                gdp: d.gdpBillionUsd,
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
                  <Bar dataKey="gdp" name={t.gdpLabel} fill={palette.gold} radius={[4, 4, 0, 0]} barSize={26} />
                  <Bar dataKey="population" name={t.populationLabel} fill={palette.teal} radius={[4, 4, 0, 0]} barSize={26} />
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

          {/* GII — short Islamic Finance note */}
          <div className="p-6 facet-card mt-6" style={{
          background: cardBg,
          border: `1px solid ${palette.gold}`
        }}>
            <h3 className="flex items-center gap-2" style={{
            fontFamily: fontDisplay,
            color: ink,
            fontSize: 15,
            fontWeight: 600,
            marginBottom: 4
          }}>
              {t.giiTitle}
            </h3>
            <p style={{
            color: palette.gold,
            fontSize: 10.5,
            marginBottom: 10,
            fontWeight: 600
          }}>{t.giiSubtitle}</p>
            <p style={{
            color: ink,
            fontSize: 12.5,
            lineHeight: 1.7
          }}>{t.giiBody}</p>
          </div>
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