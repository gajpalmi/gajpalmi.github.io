const fs = require("fs");

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("ERROR: GEMINI_API_KEY secret is missing.");
  process.exit(1);
}

const MODEL = "gemini-3.5-flash-lite";

const API_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const NEWS_URL =
  "https://news.google.com/rss?hl=hi&gl=IN&ceid=IN:hi";

const CONTENT_FILE =
  "content/auto-content.json";

const LOG_DIR =
  "content/logs";

const MAX_STORED_ITEMS = 300;
const TARGET_ITEMS = 20;
const MAX_NEWS_TOPICS = 15;

function cleanText(text) {
  return String(text || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => {
      try {
        return String.fromCodePoint(Number(n));
      } catch {
        return "";
      }
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => {
      try {
        return String.fromCodePoint(parseInt(n, 16));
      } catch {
        return "";
      }
    })
    .replace(/\s+/g, " ")
    .trim();
}

function makeMetaDescription(text) {
  return cleanText(text)
    .slice(0, 155);
}

function normalizeType(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase();

  const aliases = {
    joke: "jokes",
    jokes: "jokes",

    shayari: "shayari",
    poetry: "shayari",
    poem: "shayari",

    bhakti: "bhakti",
    devotional: "bhakti",

    bhajan: "bhajan",
    bhajans: "bhajan",

    kirtan: "kirtan",
    kirtans: "kirtan",

    spiritual: "bhakti",
    spirituality: "bhakti",

    knowledge: "knowledge",
    gk: "knowledge",
    "general knowledge": "knowledge",

    news: "news",

    technology: "technology",
    tech: "technology",

    mobile: "mobile",
    android: "mobile",

    internet: "internet",

    ai: "ai",

    google: "google",

    apps: "apps",
    app: "apps",

    gadgets: "gadgets",
    gadget: "gadgets",

    gaming: "gaming",
    game: "gaming",
    ludo: "gaming",
    "cricket gaming": "gaming",

    entertainment: "entertainment",

    dialogue: "dialogue",
    dialogues: "dialogue",

    tips: "tips",
    tip: "tips",
    "how-to": "tips",
    howto: "tips",

    blog: "blog",
    blogs: "blog",

    trending: "trends",
    trends: "trends",

    motivation: "motivation",
    motivational: "motivation",

    suvichar: "suvichar",
    "su-vichar": "suvichar",

    website: "website",
    seo: "seo",

    love: "shayari",
    friendship: "shayari"
  };

  return aliases[raw] || "blog";
}

function normalizeKeywords(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const result = [];

  for (const keyword of value) {
    const text = cleanText(keyword);

    if (!text) {
      continue;
    }

    if (!result.includes(text)) {
      result.push(text);
    }

    if (result.length >= 8) {
      break;
    }
  }

  return result;
}

function normalizeUrl(value) {
  const url = String(value || "").trim();

  if (!url) {
    return "";
  }

  if (/^https?:\/\/[^\s]+$/i.test(url)) {
    return url;
  }

  return "";
}

function normalizeItem(item, index, generatedAt) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const title = cleanText(item.title);
  const content = cleanText(item.content);

  if (!title || !content) {
    return null;
  }

  const type = normalizeType(item.type);

  const category =
    cleanText(item.category) ||
    "General";

  const keywords =
    normalizeKeywords(item.keywords);

  const seoTitle =
    cleanText(item.seoTitle) ||
    title;

  const metaDescription =
    cleanText(item.metaDescription) ||
    makeMetaDescription(content);

  let sourceNote =
    cleanText(item.sourceNote);

  if (!sourceNote) {
    sourceNote =
      type === "news" ||
      type === "trends"
        ? "Google News India के current topic से प्रेरित"
        : "मौलिक सामग्री";
  }

  const sourceUrl =
    normalizeUrl(item.sourceUrl);

  return {
    type,
    title,
    category,
    content,
    keywords,
    seoTitle,
    metaDescription:
      metaDescription.slice(0, 160),
    sourceNote,
    sourceUrl,
    generatedAt,
    contentId:
      `${Date.now()}-${index}-${Math.random()
        .toString(36)
        .slice(2, 8)}`
  };
}

async function getCurrentNews() {
  console.log(
    "Getting current Google News India Hindi RSS..."
  );

  try {
    const response = await fetch(
      NEWS_URL,
      {
        headers: {
          "User-Agent":
            "GAMEZONE-ARENA-Auto-Content/1.0"
        }
      }
    );

    if (!response.ok) {
      console.log(
        `Google News RSS unavailable. HTTP ${response.status}`
      );

      return [];
    }

    const xml =
      await response.text();

    if (!xml) {
      return [];
    }

    const items = [];

    for (
      const match of xml.matchAll(
        /<item>([\s\S]*?)<\/item>/gi
      )
    ) {
      const block =
        match[1];

      const titleMatch =
        block.match(
          /<title>([\s\S]*?)<\/title>/i
        );

      const descriptionMatch =
        block.match(
          /<description>([\s\S]*?)<\/description>/i
        );

      const linkMatch =
        block.match(
          /<link>([\s\S]*?)<\/link>/i
        );

      const dateMatch =
        block.match(
          /<pubDate>([\s\S]*?)<\/pubDate>/i
        );

      const title =
        cleanText(
          titleMatch?.[1]
        );

      const description =
        cleanText(
          descriptionMatch?.[1]
        );

      const link =
        cleanText(
          linkMatch?.[1]
        );

      const published =
        cleanText(
          dateMatch?.[1]
        );

      if (!title) {
        continue;
      }

      const duplicate =
        items.some(
          item =>
            item.title
              .toLowerCase() ===
            title.toLowerCase()
        );

      if (duplicate) {
        continue;
      }

      items.push({
        title,
        description,
        link,
        published
      });

      if (
        items.length >=
        MAX_NEWS_TOPICS
      ) {
        break;
      }
    }

    console.log(
      `Current news topics found: ${items.length}`
    );

    return items;
  } catch (error) {
    console.log(
      "Google News RSS could not be loaded."
    );

    console.log(
      error.message
    );

    return [];
  }
}

function buildNewsContext(news) {
  if (!news.length) {
    return `
आज Google News RSS उपलब्ध नहीं है।

इस स्थिति में current news invent नहीं करनी है।

News/trending article तभी बनाएं जब पर्याप्त
विश्वसनीय current information उपलब्ध हो।

बाकी original evergreen content बनाएं।
`;
  }

  return news
    .map(
      (item, index) => `
NEWS ${index + 1}
Title: ${item.title}
Description: ${
        item.description ||
        "उपलब्ध नहीं"
      }
Source URL: ${
        item.link ||
        "उपलब्ध नहीं"
      }
Published: ${
        item.published ||
        "उपलब्ध नहीं"
      }
`
    )
    .join("\n");
}

function buildPrompt(news) {
  const newsContext =
    buildNewsContext(news);

  return `
आप GAMEZONE ARENA वेबसाइट के लिए रोज नई,
मौलिक, उपयोगी और family-friendly हिंदी सामग्री
तैयार करने वाले professional automatic editor हैं।

EXACTLY ${TARGET_ITEMS} अलग-अलग content items बनाइए।

सभी user-facing content मुख्य रूप से सरल
हिंदी देवनागरी में होना चाहिए।

जरूरी technical terms English में रह सकते हैं।

==================================================
CURRENT GOOGLE NEWS INDIA CONTEXT
==================================================

${newsContext}

ऊपर दिए गए Google News topics केवल current
topic context के रूप में उपयोग करें।

किसी भी current घटना की ऐसी जानकारी मत बनाएं
जो दिए गए source information में मौजूद नहीं है।

==================================================
CONTENT VARIETY
==================================================

इन विषयों में variety रखें:

1. हिंदी चुटकुले
2. मजेदार संवाद
3. सुविचार
4. मोटिवेशन
5. प्रेम शायरी
6. दोस्ती शायरी
7. जीवन शायरी
8. भक्ति
9. भजन
10. कीर्तन
11. आध्यात्मिक जानकारी
12. सामान्य ज्ञान
13. Knowledge
14. Current-topic news
15. Mobile
16. Android
17. Internet
18. Online Safety
19. AI
20. Google
21. Technology
22. Apps
23. Gadgets
24. Gaming
25. Ludo
26. Cricket Gaming
27. Gaming Tips
28. Blogging
29. SEO
30. Website
31. How-To
32. Entertainment
33. Trending Topics
34. Internet searches से जुड़े सामान्य उपयोगी विषय

हर दिन topics और ideas में variety रखें।

एक ही प्रकार के 20 items मत बनाएं।

==================================================
CONTENT LENGTH
==================================================

Jokes:
80-180 शब्द।

Dialogue:
100-220 शब्द।

Shayari:
छोटी, original और meaningful रखें।

Bhakti/Bhajan/Kirtan:
150-400 शब्द।

Knowledge/GK/Tips:
250-450 शब्द।

Mobile/Android/AI/Technology/Gaming:
350-650 शब्द।

Blog/current-topic article:
450-800 शब्द, लेकिन केवल तभी जब
उपलब्ध जानकारी पर्याप्त हो।

==================================================
CURRENT NEWS RULES
==================================================

Current news के लिए केवल दिए गए RSS context
का उपयोग करें।

Headline को देखकर unsupported details
invent मत करें।

नाम invent मत करें।

आंकड़े invent मत करें।

घटना की तारीख invent मत करें।

किसी व्यक्ति पर आरोप invent मत करें।

किसी source की बात को fact से ज्यादा बड़ा
बनाकर प्रस्तुत मत करें।

यदि information सीमित है तो content में साफ
बताएं कि उपलब्ध जानकारी सीमित है।

External article को copy मत करें।

News एक original Hindi summary/explanation
होनी चाहिए।

Political topic आने पर केवल neutral factual
भाषा रखें।

किसी पार्टी, नेता, उम्मीदवार या political
position के पक्ष या विपक्ष में persuasion नहीं।

किसी को winner/best/worst घोषित नहीं करें।

==================================================
ORIGINAL CONTENT
==================================================

सभी jokes original हों।

सभी shayari original हों।

सभी dialogues original हों।

Bhakti content respectful और original हो।

Bhajan/Kirtan में copyrighted lyrics copy
नहीं करने हैं।

किसी प्रसिद्ध व्यक्ति के नाम से fake quote
नहीं बनाना है।

Knowledge में गलत तथ्य नहीं लिखना है।

Family-friendly सामग्री रखें।

==================================================
HEALTH / FINANCE SAFETY
==================================================

Health और financial topics में:

- dangerous medical advice नहीं
- guaranteed result नहीं
- guaranteed income नहीं
- investment profit guarantee नहीं
- बीमारी का diagnosis नहीं
- unsafe treatment नहीं

General educational information हो तो
सावधानी वाली भाषा रखें।

==================================================
SEO
==================================================

हर item में ये fields जरूरी हैं:

type
title
category
content
keywords
seoTitle
metaDescription
sourceNote
sourceUrl

keywords 3 से 8 हों।

SEO title natural हो।

Meta description 160 characters के अंदर हो।

==================================================
SOURCE NOTE
==================================================

Current news/trending:

Google News India के current topic से प्रेरित

Original content:

मौलिक सामग्री

==================================================
TYPE VALUES
==================================================

type में इनमें से suitable value इस्तेमाल करें:

jokes
shayari
bhakti
bhajan
kirtan
suvichar
motivation
knowledge
news
technology
mobile
internet
ai
google
apps
gadgets
gaming
entertainment
dialogue
tips
blog
seo
website
trends

==================================================
IMPORTANT
==================================================

EXACTLY ${TARGET_ITEMS} items।

JSON के अलावा कोई text नहीं।

Markdown नहीं।

हर item दूसरे item से अलग होना चाहिए।

Content खाली नहीं होना चाहिए।

Read More के लिए content field में पूरा
readable content रखना है।

==================================================
OUTPUT JSON
==================================================

{
  "items": [
    {
      "type": "news",
      "title": "पूरा शीर्षक",
      "category": "India",
      "content": "पूरा विस्तृत content",
      "keywords": [
        "हिंदी न्यूज़",
        "आज की खबर",
        "current news"
      ],
      "seoTitle": "SEO title",
      "metaDescription": "SEO description",
      "sourceNote": "Google News India के current topic से प्रेरित",
      "sourceUrl": ""
    }
  ]
}
`;
}

async function generateContent(news) {
  const prompt =
    buildPrompt(news);

  const body = {
    contents: [
      {
        parts: [
          {
            text: prompt
          }
        ]
      }
    ],

    generationConfig: {
      temperature: 0.85,

      responseMimeType:
        "application/json",

      responseSchema: {
        type: "OBJECT",

        properties: {
          items: {
            type: "ARRAY",

            items: {
              type: "OBJECT",

              properties: {
                type: {
                  type: "STRING"
                },

                title: {
                  type: "STRING"
                },

                category: {
                  type: "STRING"
                },

                content: {
                  type: "STRING"
                },

                keywords: {
                  type: "ARRAY",

                  items: {
                    type: "STRING"
                  }
                },

                seoTitle: {
                  type: "STRING"
                },

                metaDescription: {
                  type: "STRING"
                },

                sourceNote: {
                  type: "STRING"
                },

                sourceUrl: {
                  type: "STRING"
                }
              },

              required: [
                "type",
                "title",
                "category",
                "content",
                "keywords",
                "seoTitle",
                "metaDescription",
                "sourceNote",
                "sourceUrl"
              ]
            }
          }
        },

        required: [
          "items"
        ]
      }
    }
  };

  console.log(
    "Sending request to Gemini..."
  );

  const response =
    await fetch(
      API_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "x-goog-api-key":
            API_KEY
        },

        body:
          JSON.stringify(body)
      }
    );

  const result =
    await response.json();

  if (!response.ok) {
    console.error(
      "Gemini API error:"
    );

    console.error(
      JSON.stringify(
        result,
        null,
        2
      )
    );

    process.exit(1);
  }

  const text =
    result
      ?.candidates?.[0]
      ?.content?.parts?.[0]
      ?.text;

  if (!text) {
    console.error(
      "Gemini returned no content."
    );

    console.error(
      JSON.stringify(
        result,
        null,
        2
      )
    );

    process.exit(1);
  }

  let parsed;

  try {
    parsed =
      JSON.parse(text);
  } catch (error) {
    console.error(
      "Gemini returned invalid JSON."
    );

    console.error(text);

    process.exit(1);
  }

  if (
    !parsed ||
    !Array.isArray(
      parsed.items
    )
  ) {
    console.error(
      "Gemini response does not contain items array."
    );

    process.exit(1);
  }

  console.log(
    `Gemini returned ${parsed.items.length} items.`
  );

  return parsed.items;
}

function readExistingContent() {
  if (
    !fs.existsSync(
      CONTENT_FILE
    )
  ) {
    return [];
  }

  try {
    const raw =
      fs.readFileSync(
        CONTENT_FILE,
        "utf8"
      );

    if (!raw.trim()) {
      return [];
    }

    const parsed =
      JSON.parse(raw);

    if (
      Array.isArray(parsed)
    ) {
      return parsed;
    }

    if (
      parsed &&
      Array.isArray(
        parsed.items
      )
    ) {
      return parsed.items;
    }

    return [];
  } catch (error) {
    console.log(
      "Existing auto-content.json could not be parsed."
    );

    console.log(
      error.message
    );

    return [];
  }
}

function removeDuplicateTitles(items) {
  const seen =
    new Set();

  const result = [];

  for (const item of items) {
    const key =
      cleanText(
        item.title
      )
        .toLowerCase()
        .replace(
          /\s+/g,
          " "
        )
        .trim();

    if (!key) {
      continue;
    }

    if (
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);

    result.push(item);
  }

  return result;
}

async function main() {
  console.log("");
  console.log(
    "=============================================="
  );
  console.log(
    "GAMEZONE ARENA DAILY CONTENT"
  );
  console.log(
    "=============================================="
  );

  const generatedAt =
    new Date().toISOString();

  console.log(
    `Generated at: ${generatedAt}`
  );

  const news =
    await getCurrentNews();

  const generated =
    await generateContent(
      news
    );

  const normalized =
    generated
      .map(
        (item, index) =>
          normalizeItem(
            item,
            index,
            generatedAt
          )
      )
      .filter(Boolean);

  if (
    normalized.length === 0
  ) {
    console.error(
      "No valid content generated."
    );

    process.exit(1);
  }

  const uniqueNew =
    removeDuplicateTitles(
      normalized
    );

  if (
    uniqueNew.length === 0
  ) {
    console.error(
      "All generated items were duplicates or invalid."
    );

    process.exit(1);
  }

  const existing =
    readExistingContent();

  const finalContent =
    removeDuplicateTitles([
      ...uniqueNew,
      ...existing
    ])
      .slice(
        0,
        MAX_STORED_ITEMS
      );

  fs.mkdirSync(
    "content",
    {
      recursive: true
    }
  );

  fs.writeFileSync(
    CONTENT_FILE,

    JSON.stringify(
      finalContent,
      null,
      2
    ),

    "utf8"
  );

  fs.mkdirSync(
    LOG_DIR,
    {
      recursive: true
    }
  );

  const logDate =
    generatedAt
      .slice(
        0,
        10
      );

  const logFile =
    `${LOG_DIR}/${logDate}.json`;

  const logData = {
    generatedAt,

    requestedItems:
      TARGET_ITEMS,

    generatedItems:
      generated.length,

    validItems:
      normalized.length,

    newUniqueItems:
      uniqueNew.length,

    totalStoredItems:
      finalContent.length,

    newsTopics:
      news.length,

    model:
      MODEL,

    status:
      "success"
  };

  fs.writeFileSync(
    logFile,

    JSON.stringify(
      logData,
      null,
      2
    ),

    "utf8"
  );

  console.log("");
  console.log(
    "=============================================="
  );
  console.log(
    "SUCCESS"
  );
  console.log(
    "=============================================="
  );

  console.log(
    `News topics: ${news.length}`
  );

  console.log(
    `Gemini items: ${generated.length}`
  );

  console.log(
    `Valid items: ${normalized.length}`
  );

  console.log(
    `New unique items: ${uniqueNew.length}`
  );

  console.log(
    `Total stored items: ${finalContent.length}`
  );

  console.log(
    `Content file: ${CONTENT_FILE}`
  );

  console.log(
    `Log file: ${logFile}`
  );

  console.log(
    "=============================================="
  );
}

main().catch(
  error => {
    console.error("");
    console.error(
      "=============================================="
    );
    console.error(
      "WORKFLOW FAILED"
    );
    console.error(
      "=============================================="
    );

    console.error(
      error?.stack ||
      error?.message ||
      error
    );

    process.exit(1);
  }
);
