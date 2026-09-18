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

const OUTPUT_FILE =
  "content/auto-content.json";

function cleanText(text) {
  return String(text || "")
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function getCurrentNews() {
  try {
    console.log("Getting current Hindi Google News...");

    const response = await fetch(NEWS_URL);

    if (!response.ok) {
      console.log(
        `Google News RSS unavailable: ${response.status}`
      );

      return [];
    }

    const xml = await response.text();

    const newsItems = [];

    const matches = xml.matchAll(
      /<item>([\s\S]*?)<\/item>/g
    );

    for (const match of matches) {
      const block = match[1];

      const titleMatch = block.match(
        /<title>([\s\S]*?)<\/title>/
      );

      const descriptionMatch = block.match(
        /<description>([\s\S]*?)<\/description>/
      );

      const linkMatch = block.match(
        /<link>([\s\S]*?)<\/link>/
      );

      if (!titleMatch) {
        continue;
      }

      const title =
        cleanText(titleMatch[1]);

      const description =
        cleanText(
          descriptionMatch
            ? descriptionMatch[1]
            : ""
        );

      const link =
        cleanText(
          linkMatch
            ? linkMatch[1]
            : ""
        );

      if (!title) {
        continue;
      }

      if (
        newsItems.some(
          item => item.title === title
        )
      ) {
        continue;
      }

      newsItems.push({
        title,
        description,
        link
      });

      if (newsItems.length >= 20) {
        break;
      }
    }

    console.log(
      `Current news items found: ${newsItems.length}`
    );

    return newsItems;
  } catch (error) {
    console.log(
      "Could not load Google News."
    );

    console.log(error.message);

    return [];
  }
}

function buildNewsContext(news) {
  if (!news.length) {
    return "आज कोई current Hindi Google News headline उपलब्ध नहीं है।";
  }

  return news
    .map((item, index) => {
      return [
        `NEWS ${index + 1}`,
        `Headline: ${item.title}`,
        `Available description: ${item.description || "उपलब्ध नहीं"}`,
        `Source link: ${item.link || "उपलब्ध नहीं"}`
      ].join("\n");
    })
    .join("\n\n");
}

async function generateContent(news) {
  const newsContext =
    buildNewsContext(news);

  const prompt = `
आप GAMEZONE ARENA वेबसाइट के लिए रोज़ नई,
मौलिक और उपयोगी हिंदी सामग्री तैयार करने वाले
professional automatic content editor हैं।

सभी user-facing सामग्री मुख्य रूप से सरल,
स्वाभाविक और साफ हिंदी देवनागरी में होनी चाहिए।

Brand name, app name, website name और जरूरी
technical terms English में रह सकते हैं।

आज के current topics के लिए नीचे दिए गए
Google News India Hindi data को केवल उपलब्ध
source/context के रूप में इस्तेमाल करें।

================ CURRENT NEWS DATA ================

${newsContext}

====================================================

EXACTLY 20 अलग-अलग content items बनाइए।

सबसे महत्वपूर्ण नियम:

किसी भी item को केवल headline,
title, एक-दो लाइन या बहुत छोटा snippet
बनाकर समाप्त नहीं करना है।

हर item का पूरा readable content
"content" field में देना है।

हर item ऐसा होना चाहिए कि visitor उसे
website पर खोलकर आराम से पढ़ सके।

NEWS:

News item में केवल headline दोहराकर
नहीं छोड़ना है।

Headline और उपलब्ध description/context
के आधार पर पूरा Hindi news explainer लिखें।

News को साफ तरीके से समझाएं:

- घटना/विषय क्या है
- headline में उपलब्ध मुख्य जानकारी क्या है
- उसका सामान्य context क्या है
- reader के लिए इसका क्या मतलब है
- उपलब्ध जानकारी से जो सुरक्षित निष्कर्ष निकाला जा सकता है

लेकिन source में उपलब्ध न होने वाली
specific information invent नहीं करनी है।

नाम, तारीख, समय, स्थान, संख्या,
आंकड़े, quotes, बयान, आरोप या घटना-details
अपनी तरफ से नहीं बनानी हैं।

अगर headline बहुत छोटी है तो
उसे लंबा fake news article न बनाएं।

ऐसी स्थिति में उपलब्ध information के आधार पर
पूरा लेकिन सावधान Hindi explainer लिखें।

News content को किसी दूसरी website से copy नहीं करना है।

NEWS SOURCE NOTE:

Current/news/trending item के लिए:

"Google News headlines से topic लिया गया"

अनावश्यक URLs को content में न डालें।

====================================================

CONTENT TYPES:

1. हिंदी चुटकुले
2. मजेदार संवाद
3. सुविचार
4. हिंदी शायरी
5. प्रेम शायरी
6. दोस्ती शायरी
7. जीवन शायरी
8. मोटिवेशनल विचार
9. भक्ति
10. भजन
11. कीर्तन
12. आध्यात्मिक जानकारी
13. ज्ञान
14. सामान्य ज्ञान
15. हिंदी न्यूज़ / current topics
16. मोबाइल और Android
17. Internet और online safety
18. AI, Google और Technology
19. Gaming, Ludo, Cricket और gaming tips
20. Blogging, How-to, Entertainment और Trending topics

अलग-अलग items में variety रखें।

हर दिन एक ही तरह के 20 items न बनाएं।

====================================================

JOKES:

पूरा joke लिखें।

Setup और punchline दोनों दें।

सिर्फ एक line का joke न दें।

====================================================

DIALOGUE:

Natural और readable dialogue दें।

कम से कम पर्याप्त बातचीत हो ताकि
visitor को पूरा dialogue समझ आए।

====================================================

SHAYARI:

पूरी मौलिक shayari दें।

केवल एक या दो पंक्तियां नहीं।

Love, Friendship, Life,
Motivational और Emotional themes
का उपयोग कर सकते हैं।

सम्मानजनक भाषा रखें।

====================================================

BHAKTI:

भक्ति content पूरा और उपयोगी होना चाहिए।

सिर्फ "जय श्री..." या कुछ छोटी lines
देकर समाप्त नहीं करना है।

विषय के अनुसार devotional explanation,
भावना, महत्व या practical spiritual जानकारी दें।

====================================================

BHAJAN:

मौलिक और सम्मानजनक bhajan-related content दें।

किसी प्रसिद्ध copyrighted भजन के पूरे lyrics
copy नहीं करने हैं।

====================================================

KIRTAN:

मौलिक और सम्मानजनक kirtan-related content दें।

====================================================

KNOWLEDGE / GK:

विषय को समझाने वाला पूरा content दें।

गलत तथ्य नहीं लिखें।

जहाँ factual certainty जरूरी हो,
वहाँ केवल reliable general knowledge का उपयोग करें।

====================================================

MOBILE / ANDROID:

Practical जानकारी दें।

उदाहरण:

- Android settings
- phone security
- battery tips
- storage
- apps
- privacy
- useful settings
- common problems

How-to हो तो steps दें।

====================================================

INTERNET / ONLINE SAFETY:

Practical और सुरक्षित जानकारी दें।

Fake links, scams, phishing,
password safety, privacy आदि पर
useful guidance दी जा सकती है।

====================================================

AI / GOOGLE / TECHNOLOGY:

Technology को सरल भाषा में समझाएं।

AI tools, Google features,
internet technology, apps और gadgets
पर practical information दें।

====================================================

GAMING:

Gaming, Ludo, Cricket,
mobile gaming और gaming tips
पर पूरा readable content दें।

Cheating या harmful activity promote न करें।

====================================================

BLOG / HOW-TO:

Blog content थोड़ा विस्तार से लिखें।

How-to content में:

1. समस्या/विषय
2. जरूरी तैयारी
3. step-by-step तरीका
4. जरूरी सावधानी
5. useful conclusion

दें।

====================================================

ENTERTAINMENT / TRENDING:

सिर्फ headline नहीं।

Available information के आधार पर
पूरा readable content दें।

Unsupported claims न बनाएं।

====================================================

GENERAL CONTENT RULES:

1. सभी content मौलिक होना चाहिए।

2. पुराने content की copy मत करें।

3. एक ही joke, shayari या idea दोबारा मत लिखें।

4. Family-friendly content रखें।

5. भाषा सरल और स्वाभाविक हिंदी रखें।

6. Content इतना छोटा न हो कि website पर
   उपयोगी न लगे।

7. हर item दूसरे item से अलग होना चाहिए।

8. हर content के लिए SEO-friendly title रखें।

9. हर content के लिए 3 से 8 useful keywords दें।

10. हर item में sourceNote जरूर दें।

11. Fake quotes नहीं।

12. Fake news नहीं।

13. Political persuasion नहीं।

14. बिना आधार किसी व्यक्ति या संस्था पर
    आरोप नहीं।

15. Health, money या investment में
    guaranteed claims नहीं।

16. Copyrighted article copy नहीं।

17. किसी दूसरे article को लगभग उसी रूप में
    rewrite नहीं करना है।

18. Current headline में उपलब्ध जानकारी से
    बाहर specific facts invent नहीं करने हैं।

====================================================

SOURCE NOTE RULES:

Current/news/trending:

"Google News headlines से topic लिया गया"

Original jokes/shayari/bhakti/dialogue:

"मौलिक सामग्री"

Knowledge/tips/how-to/blog:

"मौलिक सामग्री"

====================================================

SEO:

हर item में:

- title
- seoTitle
- metaDescription
- 3 से 8 keywords

जरूर दें।

====================================================

IMPORTANT OUTPUT RULE:

EXACTLY 20 ITEMS लौटाएं।

JSON के अलावा कोई text मत लौटाएं।

Markdown मत लौटाएं।

JSON format:

{
  "items": [
    {
      "type": "news",
      "title": "हिंदी शीर्षक",
      "category": "India",
      "content": "पूरा readable content",
      "keywords": [
        "हिंदी न्यूज़",
        "current news",
        "भारत"
      ],
      "seoTitle": "SEO title",
      "metaDescription": "छोटा SEO description",
      "sourceNote": "Google News headlines से topic लिया गया"
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
      temperature: 0.9,

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
                "sourceNote"
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

  const response = await fetch(
    API_URL,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        "x-goog-api-key":
          API_KEY
      },

      body: JSON.stringify(body)
    }
  );

  const result =
    await response.json();

  if (!response.ok) {
    console.error(
      "Gemini API request failed."
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
      "Gemini response does not contain items array."
    );

    process.exit(1);
  }

  return parsed.items;
}

async function main() {
  console.log(
    "================================"
  );

  console.log(
    "GAMEZONE ARENA DAILY CONTENT"
  );

  console.log(
    "================================"
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

  const cleanItems =
    generated
      .filter(
        item =>
          item &&
          typeof item.title === "string" &&
          typeof item.content === "string"
      )
      .map(item => ({
        type:
          allowedTypes.has(
            String(item.type || "").trim()
          )
            ? String(item.type).trim()
            : "blog",

        title:
          String(item.title).trim(),

        category:
          String(
            item.category || "General"
          ).trim(),

        content:
          String(item.content).trim(),

        keywords:
          Array.isArray(item.keywords)
            ? item.keywords
                .map(x =>
                  String(x).trim()
                )
                .filter(Boolean)
                .slice(0, 8)
            : [],

        seoTitle:
          String(
            item.seoTitle ||
            item.title
          ).trim(),

        metaDescription:
          String(
            item.metaDescription ||
            item.content
          )
            .trim()
            .slice(0, 160),

        sourceNote:
          String(
            item.sourceNote ||
            "मौलिक सामग्री"
          ).trim(),

        generatedAt:
          new Date().toISOString()
      }))
      .filter(
        item =>
          item.title &&
          item.content
      );

  if (cleanItems.length === 0) {
    console.error(
      "No valid content was generated."
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
    fs.existsSync(OUTPUT_FILE)
  ) {
    try {
      const raw =
        fs.readFileSync(
          OUTPUT_FILE,
          "utf8"
        );

      if (raw.trim()) {
        const parsed =
          JSON.parse(raw);

        if (Array.isArray(parsed)) {
          existing = parsed;
        } else if (
          Array.isArray(parsed.items)
        ) {
          existing = parsed.items;
        }
      }
    } catch (error) {
      console.log(
        "Existing content could not be read."
      );

      console.log(
        "Starting with empty existing content."
      );
    }
  }

  /*
    नया content सबसे ऊपर रहेगा।
    पुराना content delete नहीं होगा।
    कुल 300 items तक रखे जाएंगे।
  */

  const finalContent = [
    ...cleanItems,
    ...existing
  ].slice(0, 300);

  fs.writeFileSync(
    OUTPUT_FILE,

    JSON.stringify(
      finalContent,
      null,
      2
    ),

    "utf8"
  );

  console.log(
    `New Hindi items added: ${cleanItems.length}`
  );

  console.log(
    `Total stored items: ${finalContent.length}`
  );

  console.log(
    "================================"
  );

  console.log(
    "CONTENT GENERATION SUCCESS"
  );

  console.log(
    "================================"
  );
}

main().catch(error => {
  console.error(
    "Workflow script failed:"
  );

  console.error(error);

  process.exit(1);
});
