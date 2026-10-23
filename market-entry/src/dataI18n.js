// English and Arabic versions of the market data excerpts (taxes, licensing, competitors, drivers).
// The facts and figures are identical to the German source data in each tool; only the wording is translated.
// Source names and years are not translated. Keys that are not listed fall back to the German original.

const r = (corporateTax, vat, licensing) => ({ corporateTax, vat, licensing });
const c = (players, gap) => ({ players, gap });
const o = (audience, drivers, trend, source) => (source ? { audience, drivers, trend, source } : { audience, drivers, trend });

export const GCC_I18N = {
  en: {
    REGULATORY_CHECK: {
      UAE: r("9% (0% on profits up to AED 375,000)", null, "Commercial registration plus choice of free zone vs. mainland. Since the reform of the Commercial Companies Law, 100% foreign ownership is usually possible."),
      Saudi: r("20% (on the non Saudi share of the company)", null, "Investment licence from MISA (Ministry of Investment Saudi Arabia) required; new Investment Law in force since 2024."),
      Qatar: r(null, "No VAT introduced yet (announced, timing open)", "Commercial licence via the Ministry of Commerce & Industry, alternatively a special regime via the Qatar Financial Centre (QFC)."),
      Kuwait: r("15% for foreign companies (Kuwaiti and GCC owned firms exempt)", "No VAT introduced yet (under review)", "The FDI law allows up to 100% foreign ownership in defined target sectors."),
      Bahrain: r("0% currently (a corporate tax under the OECD framework is being prepared)", null, "Considered a comparatively easy GCC entry point, supported by the Bahrain Economic Development Board."),
      Oman: r("15% (3% for defined small businesses)", "5% (since 2021)", "A licence from the Ministry of Commerce and Industry is mandatory for non Omani business activity."),
    },
    COMPETITOR_ANALYSIS: {
      UAE: c(["Emaar Properties (real estate)", "DP World (logistics)", "Emirates NBD / First Abu Dhabi Bank (banking)"], "Market dominated by a few very large, state linked groups. Room for specialised niche providers that do not compete head on with the large groups on scale."),
      Saudi: c(["Saudi Aramco (energy, by far the largest group)", "SABIC (industry/chemicals)", "Al Rajhi Bank (largest Islamic bank worldwide)"], "Vision 2030 driven diversification opens sectors outside oil/petrochemicals where the dominant incumbents are less established (e.g. leisure, tourism, specialised financial services)."),
      Qatar: c(["QNB Group (largest bank in the region)", "Ooredoo (telecom/digital)", "Qatar Duty Free (retail)"], "Strong concentration on a few state linked champions; the mid market and niche provider segment is comparatively thin."),
      Kuwait: c(["Kuwait Finance House (dominant Islamic bank, merged with Ahli United Bank in 2024)", "National Bank of Kuwait (largest conventional bank)"], "Banking sector highly consolidated (KFH/AUB merger 2024); outside financial services comparatively little international competition is established."),
      Bahrain: c(["Ahli United Bank (historically a large share of the banking sector, now part of the KFH group)", "Al Salam Bank (Islamic banking)"], "Bahrain deliberately positions itself as a regional finance/logistics hub with lower entry barriers than the larger neighbouring markets, an entry point for smaller foreign providers."),
      Oman: c(["Bank Muscat (flagship bank, since 1982)"], "Smaller, less saturated market focused on logistics positioning; lower competitive density than in Saudi Arabia or the UAE."),
    },
    MARKET_OPPORTUNITY: {
      UAE: o("Digitally savvy urban consumers, SMEs in the non oil sector", ["Mobile commerce is growing fastest of all channels", "Tourism and logistics hub of the region"], "B2C e commerce is expected to grow to about USD 9.2 bn by 2026, with the mobile share rising the most."),
      Saudi: o("Young, highly urbanised population with strong purchasing power (over 84% urban)", ["Vision 2030 and e commerce law since 2019", "Over USD 100 bn of planned logistics investment"], "The e commerce market is expected to grow to around USD 20 bn by 2027 (CAGR about 20.9%)."),
      Qatar: o("High spending consumers, state driven large projects", ["LNG expansion drives fiscal room", "Diversification into tourism, logistics and Islamic digital finance"], "E commerce revenue grew from about USD 1.3 bn to 3.2 bn (2018 to 2022); the Islamic fintech sector is actively expanding."),
      Kuwait: o("Mobile first consumers, growing fintech user base", ["Higher oil output as a fiscal tailwind", "Gradual pro business reforms"], "In 2024 Kuwait led the GCC in mobile shopping app downloads."),
      Bahrain: o("Logistics and financial services sector, regional hub", ["Airport modernisation (capacity 8 to 14 million passengers)", "Metro project (~USD 2 bn) and King Hamad Causeway (~USD 4 bn)"], "Stable growth base, but high public debt as structural context."),
      Oman: o("Logistics and industrial sector in a strategic location", ["Fiscal consolidation creates stability", "Expansion of the logistics hub positioning"], "Expanding, diversifying market economy focused on logistics."),
    },
  },
  ar: {
    REGULATORY_CHECK: {
      UAE: r("9% (0% على الأرباح حتى 375,000 درهم)", null, "التسجيل التجاري مع اختيار المنطقة الحرة أو البر الرئيسي. منذ إصلاح قانون الشركات التجارية أصبحت الملكية الأجنبية بنسبة 100% ممكنة في الغالب."),
      Saudi: r("20% (على الحصة غير السعودية من الشركة)", null, "رخصة استثمار من وزارة الاستثمار (MISA) مطلوبة، ويسري قانون الاستثمار الجديد منذ 2024."),
      Qatar: r(null, "لم تُطبَّق ضريبة القيمة المضافة بعد (أُعلن عنها والموعد غير محدد)", "رخصة تجارية عبر وزارة التجارة والصناعة، أو نظام خاص بديل عبر مركز قطر للمال (QFC)."),
      Kuwait: r("15% للشركات الأجنبية (الشركات الكويتية والمملوكة لدول الخليج معفاة)", "لم تُطبَّق ضريبة القيمة المضافة بعد (قيد الدراسة)", "يسمح قانون الاستثمار الأجنبي بملكية أجنبية تصل إلى 100% في قطاعات مستهدفة محددة."),
      Bahrain: r("0% حاليًا (يجري الإعداد لضريبة شركات وفق إطار منظمة التعاون الاقتصادي والتنمية)", null, "تُعد نقطة دخول خليجية سهلة نسبيًا، بدعم من مجلس التنمية الاقتصادية في البحرين."),
      Oman: r("15% (3% لمنشآت صغيرة محددة)", "5% (منذ 2021)", "ترخيص من وزارة التجارة والصناعة إلزامي للنشاط غير العُماني."),
    },
    COMPETITOR_ANALYSIS: {
      UAE: c(["إعمار العقارية (عقارات)", "موانئ دبي العالمية (لوجستيات)", "بنك الإمارات دبي الوطني / بنك أبوظبي الأول (مصرفية)"], "يهيمن على السوق عدد قليل من المجموعات الكبيرة المرتبطة بالدولة. توجد فرصة لمزودين متخصصين في شرائح ضيقة لا ينافسون المجموعات الكبرى مباشرة على الحجم."),
      Saudi: c(["أرامكو السعودية (طاقة، وهي الأكبر بفارق كبير)", "سابك (صناعة/كيماويات)", "مصرف الراجحي (أكبر بنك إسلامي في العالم)"], "يفتح التنويع المدفوع برؤية 2030 قطاعات خارج النفط والبتروكيماويات لا يزال اللاعبون المهيمنون فيها أقل رسوخًا (مثل الترفيه والسياحة والخدمات المالية المتخصصة)."),
      Qatar: c(["مجموعة QNB (أكبر بنك في المنطقة)", "أوريدو (اتصالات/رقمي)", "السوق الحرة القطرية (تجزئة)"], "تركّز قوي في عدد قليل من الشركات الرائدة المرتبطة بالدولة؛ وشريحة الشركات المتوسطة والمتخصصة ضعيفة نسبيًا."),
      Kuwait: c(["بيت التمويل الكويتي (البنك الإسلامي المهيمن، اندمج مع البنك الأهلي المتحد في 2024)", "بنك الكويت الوطني (أكبر بنك تقليدي)"], "القطاع المصرفي شديد التركّز (اندماج بيتك والأهلي المتحد 2024)؛ وخارج القطاع المالي لم تترسخ منافسة دولية تُذكر."),
      Bahrain: c(["البنك الأهلي المتحد (تاريخيًا حصة كبيرة من القطاع المصرفي، وهو الآن جزء من مجموعة بيتك)", "بنك السلام (مصرفية إسلامية)"], "تضع البحرين نفسها عمدًا كمركز إقليمي للمال والخدمات اللوجستية بعوائق دخول أقل من الأسواق المجاورة الأكبر، فهي نقطة دخول للمزودين الأجانب الأصغر."),
      Oman: c(["بنك مسقط (البنك الرائد، منذ 1982)"], "سوق أصغر وأقل تشبعًا يركز على التموضع اللوجستي؛ وكثافة المنافسة فيه أقل منها في السعودية أو الإمارات."),
    },
    MARKET_OPPORTUNITY: {
      UAE: o("مستهلكون حضريون ملمّون بالرقمنة، ومنشآت صغيرة ومتوسطة في القطاع غير النفطي", ["التجارة عبر الجوال هي الأسرع نموًا بين كل القنوات", "مركز السياحة والخدمات اللوجستية في المنطقة"], "يُتوقع أن تنمو التجارة الإلكترونية للمستهلكين إلى نحو 9.2 مليار دولار بحلول 2026، مع أكبر زيادة في حصة الجوال."),
      Saudi: o("سكان شباب وحضريون بدرجة عالية وبقدرة شرائية قوية (أكثر من 84% في المدن)", ["رؤية 2030 ونظام التجارة الإلكترونية منذ 2019", "أكثر من 100 مليار دولار من الاستثمارات اللوجستية المخططة"], "يُتوقع أن يصل سوق التجارة الإلكترونية إلى نحو 20 مليار دولار بحلول 2027 (معدل نمو سنوي مركب نحو 20.9%)."),
      Qatar: o("مستهلكون ذوو إنفاق مرتفع ومشاريع كبرى تقودها الدولة", ["توسع الغاز الطبيعي المسال يوفر هامشًا ماليًا", "التنويع نحو السياحة والخدمات اللوجستية والتمويل الرقمي الإسلامي"], "نمت إيرادات التجارة الإلكترونية من نحو 1.3 إلى 3.2 مليار دولار (2018 إلى 2022)؛ وقطاع التقنية المالية الإسلامية في توسع نشط."),
      Kuwait: o("مستهلكون يعتمدون الجوال أولًا وقاعدة مستخدمين متنامية للتقنية المالية", ["ارتفاع إنتاج النفط كدعم مالي", "إصلاحات تدريجية مؤيدة للأعمال"], "تصدّرت الكويت دول الخليج في 2024 في تنزيلات تطبيقات التسوق عبر الجوال."),
      Bahrain: o("قطاع الخدمات اللوجستية والمالية، ومركز إقليمي", ["تحديث المطار (الطاقة الاستيعابية من 8 إلى 14 مليون مسافر)", "مشروع المترو (نحو 2 مليار دولار) وجسر الملك حمد (نحو 4 مليارات دولار)"], "قاعدة نمو مستقرة، لكن الدين العام المرتفع يمثل سياقًا هيكليًا."),
      Oman: o("قطاع الخدمات اللوجستية والصناعة في موقع استراتيجي", ["التوحيد المالي يخلق الاستقرار", "توسيع التموضع كمركز لوجستي"], "اقتصاد سوق متوسع ومتنوع مع تركيز على الخدمات اللوجستية."),
    },
  },
};

export const EUROPE_I18N = {
  en: {
    REGULATORY_CHECK: {
      Germany: r("30% (corporate tax and trade tax combined)", null, "GmbH incorporation and commercial register entry; trade registration depending on the activity."),
      France: r(null, null, "Company registration via the Guichet Unique, choice of legal form (e.g. SAS, SARL)."),
      UK: r("19 to 25% (tiered: 19% up to £50,000 profit, 25% above £250,000)", null, "Registration with Companies House; VAT registration from £90,000 annual turnover (non UK companies: regardless of turnover)."),
      Italy: r(null, null, "Commercial register entry (Registro delle Imprese), Partita IVA (tax number) required."),
      Spain: r(null, null, "Entry in the commercial register (Registro Mercantil), NIE/CIF tax number required."),
      Netherlands: r("25.8%", null, "Registration with the Kamer van Koophandel (Chamber of Commerce); a BV is the most common legal form."),
    },
    COMPETITOR_ANALYSIS: {
      Germany: c(["Volkswagen (automotive, Europe's largest group by revenue)", "Allianz (insurance/financial services)", "SAP (software, Europe's largest software company)"], "Large groups dominate industry and finance; the Mittelstand is actively modernising towards AI and digitalisation, an entry point for specialised B2B solutions."),
      France: c(["TotalEnergies (energy)", "BNP Paribas (banking)", "AXA (insurance)"], "Highly consolidated finance and energy sector; according to industry surveys, expansion into new geographies/languages is one of the biggest challenges for French B2B marketers, an opportunity for international partners with local expertise."),
      UK: c(["Shell (energy, second largest in Europe by revenue)", "HSBC (banking)"], "Highest willingness to invest among the large EU economies (82% plan budget increases above 10%), strongly technology driven, open to new tech/digital providers."),
      Italy: c(["UniCredit / Intesa Sanpaolo (the two dominant banking groups)", "Eni (energy)", "Generali (insurance, market leader)"], "Advanced industrial clusters, but according to the UK DBT assessment (2026) digital ecosystems are still growing, with room for cybersecurity, automation and smart city providers."),
      Spain: c(["Banco Santander (banking)", "Inditex (retail/fashion, incl. Zara)"], "Very diversified, fast growing economy; one of the largest EU funding rates drives renewable energy and digital infrastructure, sectors whose competitive landscape is not yet fully occupied."),
      Netherlands: c(["ASML (semiconductors, most valuable company in the Netherlands)", "ING Group (banking)", "Heineken (consumer goods)"], "Open, competitive economy with a strong services sector; growing demand for sustainability and healthtech solutions is not yet fully served by established players."),
    },
    MARKET_OPPORTUNITY: {
      Germany: o("Mittelstand looking for AI and digitalisation solutions", ["Industrial core is modernising for AI and quantum applications", "International e commerce platforms are actively expanding into Germany"], "Global e commerce providers increasingly use Germany as their entry point into the EU market."),
      France: o("B2B decision makers with a growing tech investment focus", ["Technology is the top investment focus across industries in 2024", "Expansion into new geographies/languages as a stated priority"], "Marketing and tech budgets are growing across industries in 2024, with a focus on international expansion."),
      UK: o("B2B marketers with the highest willingness to invest in Europe", ["82% plan marketing budget increases above 10%", "Technology as a clear top investment focus"], "Highest willingness to invest in marketing/tech among the five large EU economies."),
      Italy: o("Tech sector focused on cybersecurity, automation and smart cities", ["Advanced industrial clusters", "Growing digital ecosystems"], "Active international cooperation formats (2026) show growing investor interest.", "UK Department for Business & Trade, March 2026"),
      Spain: o("Tourism, healthcare, tech and security sectors", ["One of the largest EU funding rates for regeneration (renewable energy, digital infrastructure)", "Second most visited country in the world in 2023"], "Broad opportunities across retail, healthcare, tech, education and security."),
      Netherlands: o("Sustainability minded consumers and digital demand", ["Strong demand for sustainable products", "Growing e commerce and healthtech segment"], "Health technology and digital services as emerging growth areas.", "Market analysis Netherlands, various industry sources 2025/26"),
    },
  },
  ar: {
    REGULATORY_CHECK: {
      Germany: r("30% (ضريبة الشركات وضريبة التجارة معًا)", null, "تأسيس شركة GmbH وقيدها في السجل التجاري؛ وتسجيل النشاط التجاري بحسب طبيعة العمل."),
      France: r(null, null, "تسجيل الشركة عبر Guichet Unique مع اختيار الشكل القانوني (مثل SAS وSARL)."),
      UK: r("19 إلى 25% (متدرجة: 19% حتى أرباح 50,000 جنيه، و25% فوق 250,000 جنيه)", null, "التسجيل لدى Companies House؛ وتسجيل ضريبة القيمة المضافة اعتبارًا من مبيعات سنوية 90,000 جنيه (الشركات غير البريطانية: بصرف النظر عن المبيعات)."),
      Italy: r(null, null, "القيد في السجل التجاري (Registro delle Imprese)، والرقم الضريبي Partita IVA مطلوب."),
      Spain: r(null, null, "القيد في السجل التجاري (Registro Mercantil)، والرقم الضريبي NIE/CIF مطلوب."),
      Netherlands: r("25.8%", null, "التسجيل لدى غرفة التجارة (Kamer van Koophandel)؛ وشركة BV هي الشكل القانوني الأكثر شيوعًا."),
    },
    COMPETITOR_ANALYSIS: {
      Germany: c(["فولكس فاجن (سيارات، أكبر مجموعة في أوروبا من حيث الإيرادات)", "أليانز (تأمين/خدمات مالية)", "SAP (برمجيات، أكبر شركة برمجيات في أوروبا)"], "تهيمن الشركات الكبرى على الصناعة والمالية؛ والشركات المتوسطة (Mittelstand) تقوم حاليًا بالتحديث نحو الذكاء الاصطناعي والرقمنة، وهي نقطة دخول لحلول B2B متخصصة."),
      France: c(["توتال إنرجيز (طاقة)", "بي إن بي باريبا (مصرفية)", "أكسا (تأمين)"], "قطاعا المال والطاقة شديدا التركّز؛ ويُعد التوسع إلى جغرافيات ولغات جديدة، بحسب استطلاعات القطاع، من أكبر التحديات لدى مسوّقي B2B الفرنسيين، وهي فرصة لشركاء دوليين بخبرة محلية."),
      UK: c(["شل (طاقة، ثاني أكبر مجموعة في أوروبا من حيث الإيرادات)", "HSBC (مصرفية)"], "أعلى استعداد للاستثمار بين اقتصادات الاتحاد الأوروبي الكبرى (82% يخططون لزيادة الميزانية بأكثر من 10%)، ويقودها الجانب التقني بقوة، ومنفتحة على مزودي التقنية والرقمي الجدد."),
      Italy: c(["يونيكريديت / إنتيسا سان باولو (مجموعتا البنوك المهيمنتان)", "إيني (طاقة)", "جنرالي (تأمين، رائدة السوق)"], "عناقيد صناعية متقدمة، لكن النظم الرقمية لا تزال في نمو بحسب تقييم وزارة الأعمال والتجارة البريطانية (2026)، فثمة مجال لمزودي الأمن السيبراني والأتمتة والمدن الذكية."),
      Spain: c(["بنكو سانتاندير (مصرفية)", "إنديتكس (تجزئة/أزياء، ومنها زارا)"], "اقتصاد متنوع جدًا وسريع النمو؛ ويدفع أحد أعلى معدلات التمويل في الاتحاد الأوروبي الطاقة المتجددة والبنية الرقمية، وهي قطاعات لم يكتمل فيها المشهد التنافسي بعد."),
      Netherlands: c(["ASML (أشباه موصلات، أغلى شركة في هولندا)", "مجموعة ING (مصرفية)", "هاينكن (سلع استهلاكية)"], "اقتصاد مفتوح وتنافسي بقطاع خدمات قوي؛ والطلب المتنامي على حلول الاستدامة والتقنية الصحية لم تستوعبه الشركات الراسخة بالكامل بعد."),
    },
    MARKET_OPPORTUNITY: {
      Germany: o("شركات متوسطة (Mittelstand) تبحث عن حلول الذكاء الاصطناعي والرقمنة", ["القلب الصناعي يتحدّث لتطبيقات الذكاء الاصطناعي والحوسبة الكمية", "منصات التجارة الإلكترونية الدولية تتوسع بنشاط في ألمانيا"], "يستخدم مزودو التجارة الإلكترونية العالميون ألمانيا بشكل متزايد كنقطة دخول إلى سوق الاتحاد الأوروبي."),
      France: o("صنّاع قرار B2B بتركيز متنامٍ على الاستثمار التقني", ["التقنية هي أول محور استثمار في 2024 عبر القطاعات", "التوسع إلى جغرافيات ولغات جديدة أولوية معلنة"], "تنمو ميزانيات التسويق والتقنية في 2024 عبر القطاعات، مع تركيز على التوسع الدولي."),
      UK: o("مسوّقو B2B بأعلى استعداد للاستثمار في أوروبا", ["82% يخططون لزيادة ميزانية التسويق بأكثر من 10%", "التقنية محور استثمار أول بوضوح"], "أعلى استعداد للاستثمار في التسويق والتقنية بين اقتصادات الاتحاد الأوروبي الخمسة الكبرى."),
      Italy: o("قطاع تقني يركز على الأمن السيبراني والأتمتة والمدن الذكية", ["عناقيد صناعية متقدمة", "نظم رقمية متنامية"], "تدل صيغ التعاون الدولي النشطة (2026) على اهتمام متزايد من المستثمرين.", "UK Department for Business & Trade, March 2026"),
      Spain: o("قطاعات السياحة والصحة والتقنية والأمن", ["أحد أعلى معدلات التمويل في الاتحاد الأوروبي للتجديد (الطاقة المتجددة والبنية الرقمية)", "ثاني أكثر دول العالم زيارة في 2023"], "فرص واسعة عبر التجزئة والصحة والتقنية والتعليم والأمن."),
      Netherlands: o("مستهلكون يهتمون بالاستدامة وطلب رقمي", ["طلب قوي على المنتجات المستدامة", "قطاعا التجارة الإلكترونية والتقنية الصحية في نمو"], "التقنية الصحية والخدمات الرقمية كمجالات نمو ناشئة.", "تحليل السوق الهولندي، مصادر قطاعية متنوعة 2025/26"),
    },
  },
};

/** Returns the German base data with English/Arabic wording laid over it. Null entries keep the original (numbers). */
export function localizeIntel(base, i18n, lang) {
  const ov = i18n[lang];
  if (!ov) return base;
  const out = {};
  Object.keys(base).forEach((set) => {
    out[set] = {};
    Object.keys(base[set]).forEach((country) => {
      const merged = { ...base[set][country] };
      const o2 = ov[set] && ov[set][country];
      if (o2) Object.keys(o2).forEach((k) => { if (o2[k] !== null && o2[k] !== undefined) merged[k] = o2[k]; });
      out[set][country] = merged;
    });
  });
  return out;
}
