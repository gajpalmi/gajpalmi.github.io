const fs = require("fs");

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("GEMINI_API_KEY secret is missing.");
  process.exit(1);
}

const MODEL = "gemini-3.5-flash-lite";

const API_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const NEWS_URL =
  "https://news.google.com/rss?hl=hi&gl=IN&ceid=IN:hi";

const CONTENT_FILE =
  "content/auto-content.json";

function cleanText(text) {
  return String(text || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => {
      try {
        return String.fromCodePoint(Number(n));
      } catch {
        return "";
      }
    })
    .replace(/\s+/g, " ")
    .trim();
}

function makeMetaDescription(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 155);
}

async function getCurrentNews() {
  console.log("Getting current Google News India...");

  try {
    const response = await fetch(NEWS_URL, {
      headers: {
        "User-Agent":
          "GAMEZONE-ARENA-Auto-Content/1.0"
      }
    });

    if (!response.ok) {
      console.log(
        `Google News RSS unavailable: ${response.status}`
      );
      return [];
    }

    const xml = await response.text();

    const items = [];

    for (
      const match of xml.matchAll(
        /<item>([\s\S]*?)<\/item>/gi
      )
    ) {
      const block = match[1];

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

      const title = cleanText(
        titleMatch?.[1] || ""
      );

      const description = cleanText(
        descriptionMatch?.[1] || ""
      );

      const link = cleanText(
        linkMatch?.[1] || ""
      );

      const published = cleanText(
        dateMatch?.[1] || ""
      );

      if (!title) {
        continue;
      }

      if (
        items.some(
          item => item.title === title
        )
      ) {
        continue;
      }

      items.push({
        title,
        description,
        link,
        published
      });

      if (items.length >= 15) {
        break;
      }
    }

    console.log(
      `Current news topics found: ${items.length}`
    );

    return items;
  } catch (error) {
    console.log(
      "Google News could not be loaded."
    );

    console.log(error.message);

    return [];
  }
}

async function generateContent(news) {
  const newsContext =
    news.length > 0
      ? news
          .map(
            (item, index) => `
NEWS ${index + 1}
Title: ${item.title}
Description: ${item.description || "उपलब्ध नहीं"}
Source URL: ${item.link || "उपलब्ध नहीं"}
Published: ${item.published || "उपलब्ध नहीं"}
`
          )
          .join("\n")
      : `
आज current Google News उपलब्ध नहीं है।
Current news invent मत करें।
बाकी original evergreen content बनाएं।
`;

  const prompt = `
आप GAMEZONE ARENA वेबसाइट के लिए रोज नई,
मौलिक, विस्तृत और उपयोगी हिंदी सामग्री तैयार
करने वाले professional automatic editor हैं।

EXACTLY 20 अलग-अलग content items बनाइए।

सभी user-facing content मुख्य रूप से सरल
हिंदी देवनागरी में होना चाहिए।

जरूरी technical terms English में रह सकते हैं।

==================================================
CURRENT NEWS
==================================================

नीचे Google News India Hindi RSS से मिले current
topics दिए गए हैं:

${newsContext}

इनका उपयोग current topic समझने के लिए करें।

==================================================
CONTENT CATEGORIES
==================================================

इन विषयों को मिलाकर रोज variety बनाएं:

- हिंदी चुटकुले
- मजेदार संवाद
- सुविचार
- हिंदी शायरी
- प्रेम शायरी
- दोस्ती शायरी
- जीवन शायरी
- मोटिवेशन
- भक्ति
- भजन
- कीर्तन
- आध्यात्मिक जानकारी
- ज्ञान
- सामान्य ज्ञान
- हिंदी current-topic news
- Mobile
- Android
- Internet
- Online Safety
- AI
- Google
- Technology
- Apps
- Gadgets
- Gaming
- Ludo
- Cricket Gaming
- Gaming Tips
- Blogging
- SEO
- Website
- How-To
- Entertainment
- Trending Topics

हर दिन अलग topics और अलग ideas इस्तेमाल करें।

==================================================
FULL CONTENT
==================================================

सिर्फ headline मत बनाएं।

हर item का content पूरा और पढ़ने योग्य होना चाहिए।

Joke/dialogue/short shayari:
80-180 शब्द।

Knowledge/GK/Bhakti/Tips:
250-450 शब्द।

Mobile/Android/AI/Technology/Gaming/How-To:
350-650 शब्द।

Blog/current-topic article:
450-800 शब्द, जब उपलब्ध जानकारी अनुमति दे।

==================================================
NEWS
==================================================

News के लिए केवल उपलब्ध RSS headline,
description और source information का उपयोग करें।

सिर्फ headline को article न बनाएं।

News में उपलब्ध जानकारी को सरल हिंदी में
विस्तार से समझाएं।

लेकिन:

- unsupported facts मत जोड़ें
- नाम/आंकड़े invent मत करें
- fake news मत बनाएं
- आरोप invent मत करें
- headline से आगे अनुमान को fact की तरह मत लिखें

यदि उपलब्ध information कम है तो साफ बताएं कि
उपलब्ध जानकारी सीमित है।

पूरा external article copy मत करें।

News मौलिक summary/explanation होनी चाहिए।

==================================================
POLITICAL SAFETY
==================================================

राजनीतिक विषय आने पर:

- केवल factual और neutral भाषा
- persuasion नहीं
- किसी पार्टी/उम्मीदवार के पक्ष या विपक्ष में
  campaign language नहीं
- ranking या winner घोषित नहीं करें
- उपलब्ध source information से आगे अनुमान नहीं

==================================================
ORIGINAL CONTENT
==================================================

सभी jokes original हों।

सभी shayari original हों।

Bhakti content respectful और original हो।

Bhajan/Kirtan में copyrighted lyrics copy न करें।

किसी प्रसिद्ध व्यक्ति के नाम से fake quote न बनाएं।

Knowledge/GK में गलत facts न लिखें।

Family-friendly content रखें।

==================================================
SEO
==================================================

हर item में:

title
category
content
keywords
seoTitle
metaDescription
sourceNote
sourceUrl

देना है।

Keywords 3 से 8 हों।

==================================================
SOURCE NOTE
==================================================

Current news/trending:

Google News India के current topic से प्रेरित

Original:

मौलिक सामग्री

==================================================
IMPORTANT
==================================================

JSON के अलावा कोई text नहीं।

Markdown नहीं।

EXACTLY 20 items।

हर item दूसरे item से अलग होना चाहिए।

हर content पूरा होना चाहिए।

Read More के लिए content field में पूरा article/content रखें।

JSON:

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
      responseMimeType: "application/json",

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

  console.log("Sending request to Gemini...");

  const response = await fetch(
    API_URL,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY
      },

      body: JSON.stringify(body)
    }
  );

  const result = await response.json();

  if (!response.ok) {
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

    process.exit(1);
  }

  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    console.error(
      "Gemini returned invalid JSON."
    );

    console.error(text);

    process.exit(1);
  }

  if (
    !parsed ||
    !Array.isArray(parsed.items)
  ) {
    console.error(
      "Gemini response does not contain items."
    );

    process.exit(1);
  }

  return parsed.items;
}

async function main() {
  console.log("");
  console.log(
    "=========================================="
  );
  console.log(
    "GAMEZONE ARENA DAILY CONTENT"
  );
  console.log(
    "=========================================="
  );

  const news =
    await getCurrentNews();

  const generated =
    await generateContent(news);

  const allowedTypes =
    new Set([
      "jokes",
      "shayari",
      "bhakti",
      "knowledge",
      "news",
      "technology",
      "mobile",
      "gaming",
      "entertainment",
      "dialogue",
      "internet",
      "ai",
      "tips",
      "blog"
    ]);

  const items =
    generated
      .filter(
        item =>
          item &&
          typeof item.title ===
            "string" &&
          typeof item.content ===
            "string"
      )
      .map(
        (item, index) => {
          const rawType =
            String(
              item.type || ""
            )
              .trim()
              .toLowerCase();

          const type =
            allowedTypes.has(
              rawType
            )
              ? rawType
              : "blog";

          const title =
            String(
              item.title || ""
            ).trim();

          const content =
            String(
              item.content || ""
            ).trim();

          const keywords =
            Array.isArray(
              item.keywords
            )
              ? item.keywords
                  .map(
                    x =>
                      String(
                        x
                      ).trim()
                  )
                  .filter(Boolean)
                  .slice(0, 8)
              : [];

          let sourceUrl =
            String(
              item.sourceUrl || ""
            ).trim();

          if (
            !/^https?:\/\//i.test(
              sourceUrl
            )
          ) {
            sourceUrl = "";
          }

          return {
            type,

            title,

            category:
              String(
                item.category ||
                  "General"
              ).trim(),

            content,

            keywords,

            seoTitle:
              String(
                item.seoTitle ||
                  title
              ).trim(),

            metaDescription:
              String(
                item.metaDescription ||
                  makeMetaDescription(
                    content
                  )
              )
                .trim()
                .slice(0, 160),

            sourceNote:
              String(
                item.sourceNote ||
                  (
                    type === "news"
                      ? "Google News India के current topic से प्रेरित"
                      : "मौलिक सामग्री"
                  )
              ).trim(),

            sourceUrl,

            generatedAt:
              new Date().toISOString(),

            contentId:
              `${Date.now()}-${index}`
          };
        }
      )
      .filter(
        item =>
          item.title &&
          item.content
      );

  if (items.length === 0) {
    console.error(
      "No valid content generated."
    );

    process.exit(1);
  }

  fs.mkdirSync(
    "content",
    {
      recursive: true
    }
  );

  let existing = [];

  if (
    fs.existsSync(
      CONTENT_FILE
    )
  ) {
    try {
      const raw =
        fs.readFileSync(
          CONTENT_FILE,
          "utf8"
        );

      const parsed =
        JSON.parse(raw);

      if (
        Array.isArray(parsed)
      ) {
        existing = parsed;
      } else if (
        Array.isArray(
          parsed.items
        )
      ) {
        existing =
          parsed.items;
      }
    } catch {
      console.log(
        "Existing content could not be parsed."
      );
    }
  }

  const seen =
    new Set();

  const uniqueNew =
    items.filter(
      item => {
        const key =
          item.title
            .toLowerCase()
            .replace(
              /\s+/g,
              " "
            )
            .trim();

        if (
          seen.has(key)
        ) {
          return false;
        }

        seen.add(key);

        return true;
      }
    );

  const finalContent =
    [
      ...uniqueNew,
      ...existing
    ].slice(
      0,
      300
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
    "content/logs",
    {
      recursive: true
    }
  );

  const logName =
    new Date()
      .toISOString()
      .slice(
        0,
        10
      );

  fs.writeFileSync(
    `content/logs/${logName}.json`,

    JSON.stringify(
      {
        generatedAt:
          new Date().toISOString(),

        newItems:
          uniqueNew.length,

        totalItems:
          finalContent.length,

        newsTopics:
          news.length,

        status:
          "success"
      },
      null,
      2
    ),

    "utf8"
  );

  console.log("");
  console.log(
    "=========================================="
  );
  console.log(
    "SUCCESS"
  );
  console.log(
    `News topics: ${news.length}`
  );
  console.log(
    `New items: ${uniqueNew.length}`
  );
  console.log(
    `Total stored: ${finalContent.length}`
  );
  console.log(
    "=========================================="
  );
}

main().catch(error => {
  console.error(
    "Workflow failed:"
  );

  console.error(error);

  process.exit(1);
});
