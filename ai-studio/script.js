"use strict";

/*
 * GAMEZONE ARENA
 * AI CREATOR STUDIO
 *
 * REAL AI VIDEO CONNECTION
 *
 * Flow:
 * Phone Gallery
 *      ↓
 * Browser
 *      ↓
 * Cloudflare Worker /generate
 *      ↓
 * Wan 2.2 GPU Space
 *      ↓
 * SSE result stream
 *      ↓
 * Video Preview
 *      ↓
 * Download
 *
 * Existing features preserved:
 * - Photo preview
 * - Face style selection
 * - Voice style selection
 * - Text counter
 * - Creator preview
 * - Browser voice preview
 * - Save settings
 *
 * New:
 * - Real AI video generation
 * - Cloudflare Worker connection
 * - SSE stream handling
 * - Video result
 * - Download
 */


/* =========================================================
   CONFIG
========================================================= */

const WORKER_URL =
  "https://gamezone-ai-video.mishrwangajpal33.workers.dev";


/* =========================================================
   HELPERS
========================================================= */

const $ = (id) =>
  document.getElementById(id);


/* =========================================================
   STATE
========================================================= */

const creatorState = {

  /*
   Original File object.
   This is important because the real Worker needs
   the actual image file, not only the preview data URL.
  */
  photoFile: null,

  /*
   Used only for browser preview.
  */
  photoData: "",

  faceStyle: "original",

  voiceStyle: "original",

  script: "",

  busy: false,

  videoUrl: ""
};


/* =========================================================
   FACE / VOICE DISPLAY NAMES
========================================================= */

const faceNames = {

  original: "Original",

  cartoon: "Cartoon",

  "3d": "3D Cartoon",

  anime: "Anime",

  comic: "Comic",

  gaming: "Gaming Avatar",

  superhero: "Superhero",

  funny: "Funny Cartoon",

  fantasy: "Fantasy",

  robot: "AI Robot"
};


const voiceNames = {

  original: "Original",

  cartoon: "Cartoon",

  robot: "Robot",

  deep: "Deep",

  young: "Young",

  old: "Old",

  funny: "Funny",

  cinematic: "Cinematic",

  monster: "Monster",

  radio: "Announcer",

  gaming: "Gaming",

  character: "Character"
};


/* =========================================================
   PHOTO UPLOAD
========================================================= */

const photoInput =
  $("photoInput");

const photoPreview =
  $("photoPreview");


if (photoInput) {

  photoInput.addEventListener(
    "change",
    (event) => {

      const file =
        event.target.files &&
        event.target.files[0];

      if (!file) {
        return;
      }

      acceptPhoto(file);

    }
  );

}


/* =========================================================
   ACCEPT PHOTO
========================================================= */

function acceptPhoto(file) {

  if (!file.type.startsWith("image/")) {

    alert(
      "कृपया केवल Image Photo चुनें।"
    );

    if (photoInput) {
      photoInput.value = "";
    }

    return;
  }


  /*
   * Worker currently accepts maximum 8 MB.
   */
  const MAX_IMAGE_SIZE =
    8 * 1024 * 1024;


  if (file.size > MAX_IMAGE_SIZE) {

    alert(
      "Photo 8 MB से छोटी होनी चाहिए।\n\n" +
      "कृपया छोटी या compressed Photo चुनें।"
    );

    if (photoInput) {
      photoInput.value = "";
    }

    return;
  }


  /*
   * IMPORTANT:
   * Keep original File for real upload.
   */
  creatorState.photoFile =
    file;


  /*
   * Read only for browser preview.
   */
  const reader =
    new FileReader();


  reader.onload = (event) => {

    creatorState.photoData =
      event.target.result;


    if (photoPreview) {

      photoPreview.classList.add(
        "has-image"
      );


      photoPreview.innerHTML = `
        <img
          src="${creatorState.photoData}"
          alt="Uploaded Photo"
        >
      `;

    }


    updateCreatorPreview();

  };


  reader.onerror = () => {

    alert(
      "Photo पढ़ने में समस्या हुई। कृपया दूसरी Photo चुनें।"
    );

  };


  reader.readAsDataURL(file);

}


/* =========================================================
   FACE STYLE
========================================================= */

const faceButtons =
  document.querySelectorAll(
    "[data-face]"
  );


faceButtons.forEach(
  (button) => {

    button.addEventListener(
      "click",
      () => {

        faceButtons.forEach(
          (item) => {

            item.classList.remove(
              "active"
            );

          }
        );


        button.classList.add(
          "active"
        );


        creatorState.faceStyle =
          button.dataset.face ||
          "original";


        const selectedFace =
          $("selectedFace");


        if (selectedFace) {

          selectedFace.textContent =
            faceNames[
              creatorState.faceStyle
            ] ||
            "Original";

        }


        updateCreatorPreview();

      }
    );

  }
);


/* =========================================================
   VOICE STYLE
========================================================= */

const voiceButtons =
  document.querySelectorAll(
    "[data-voice]"
  );


voiceButtons.forEach(
  (button) => {

    button.addEventListener(
      "click",
      () => {

        voiceButtons.forEach(
          (item) => {

            item.classList.remove(
              "active"
            );

          }
        );


        button.classList.add(
          "active"
        );


        creatorState.voiceStyle =
          button.dataset.voice ||
          "original";


        const selectedVoice =
          $("selectedVoice");


        if (selectedVoice) {

          selectedVoice.textContent =
            voiceNames[
              creatorState.voiceStyle
            ] ||
            "Original";

        }

      }
    );

  }
);


/* =========================================================
   TEXT / SCRIPT
========================================================= */

const scriptText =
  $("scriptText");

const characterCount =
  $("characterCount");


if (scriptText) {

  scriptText.addEventListener(
    "input",
    () => {

      creatorState.script =
        scriptText.value;


      if (characterCount) {

        characterCount.textContent =
          scriptText.value.length;

      }

    }
  );

}


/* =========================================================
   CREATE AI PROMPT
========================================================= */

function buildAIPrompt() {

  const face =
    creatorState.faceStyle;


  const voice =
    creatorState.voiceStyle;


  const userText =
    creatorState.script.trim();


  const faceInstructions = {

    original:
      "preserve the person's original appearance",

    cartoon:
      "transform the person into a colorful cartoon character",

    "3d":
      "transform the person into a polished 3D cartoon character",

    anime:
      "transform the person into a detailed anime character",

    comic:
      "transform the person into a dynamic comic-book character",

    gaming:
      "transform the person into a modern gaming avatar",

    superhero:
      "transform the person into a cinematic superhero character",

    funny:
      "transform the person into a funny expressive cartoon character",

    fantasy:
      "transform the person into a fantasy character",

    robot:
      "transform the person into a futuristic AI robot character"
  };


  const selectedFaceInstruction =
    faceInstructions[face] ||
    faceInstructions.original;


  let prompt =
    `${selectedFaceInstruction}, ` +
    "keep the subject recognizable, " +
    "natural smooth motion, " +
    "cinematic animation, " +
    "high quality, " +
    "stable face and body, " +
    "smooth camera movement";


  /*
   * Voice style is included as context only.
   *
   * IMPORTANT:
   * The current Wan 2.2 image-to-video backend
   * does NOT create real voice/lip-sync audio.
   */
  if (voice && voice !== "original") {

    prompt +=
      `, intended character voice style is ${voiceNames[voice]}`;

  }


  if (userText) {

    prompt +=
      `. Character dialogue/context: ${userText}`;

  }


  return prompt;

}


/* =========================================================
   PREVIEW
========================================================= */

function updateCreatorPreview() {

  const preview =
    $("creatorPreview");


  if (!preview) {
    return;
  }


  if (!creatorState.photoData) {

    preview.innerHTML = `

      <div class="preview-placeholder">

        <div>📷</div>

        <strong>
          पहले अपनी Photo चुनें
        </strong>

        <span>
          फिर Face Style और Voice Style चुनें
        </span>

      </div>

    `;

    return;
  }


  const faceName =
    faceNames[
      creatorState.faceStyle
    ] ||
    "Original";


  const voiceName =
    voiceNames[
      creatorState.voiceStyle
    ] ||
    "Original";


  const text =
    creatorState.script.trim() ||
    "अपना Dialogue यहाँ दिखाई देगा...";


  preview.innerHTML = `

    <div style="
      padding:16px;
      text-align:center;
    ">

      <img
        src="${creatorState.photoData}"
        alt="Creator Preview"
        style="
          width:100%;
          max-height:360px;
          object-fit:contain;
          border-radius:15px;
          margin-bottom:14px;
        "
      >

      <div style="
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        justify-content:center;
        margin-bottom:12px;
      ">

        <span style="
          padding:7px 11px;
          border-radius:999px;
          background:rgba(124,92,255,.18);
          font-size:12px;
        ">
          🎭 ${escapeHtml(faceName)}
        </span>

        <span style="
          padding:7px 11px;
          border-radius:999px;
          background:rgba(0,212,255,.12);
          font-size:12px;
        ">
          🎙️ ${escapeHtml(voiceName)}
        </span>

      </div>


      <div style="
        padding:12px;
        border-radius:12px;
        background:#0b1020;
        color:#dfe5f5;
        line-height:1.6;
        font-size:14px;
      ">
        ${escapeHtml(text)}
      </div>

    </div>

  `;

}


/* =========================================================
   PREVIEW BUTTON
========================================================= */

const previewBtn =
  $("previewBtn");


if (previewBtn) {

  previewBtn.addEventListener(
    "click",
    () => {

      if (!creatorState.photoFile) {

        alert(
          "पहले अपनी Photo Upload करें।"
        );

        return;
      }


      updateCreatorPreview();


      const previewSection =
        $("previewSection");


      if (previewSection) {

        previewSection.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

      }

    }
  );

}


/* =========================================================
   CREATE VIDEO BUTTON
========================================================= */

const createVideoBtn =
  $("createVideoBtn");


if (createVideoBtn) {

  createVideoBtn.addEventListener(
    "click",
    generateRealVideo
  );

}


/* =========================================================
   REAL AI VIDEO GENERATION
========================================================= */

async function generateRealVideo() {

  if (creatorState.busy) {
    return;
  }


  if (!creatorState.photoFile) {

    alert(
      "पहले अपनी Photo Upload करें।"
    );

    return;
  }


  const videoResult =
    $("videoResult");


  if (!videoResult) {
    return;
  }


  creatorState.busy =
    true;


  setCreateButtonBusy(
    true
  );


  /*
   * Show loading state.
   */
  videoResult.innerHTML = `

    <div class="preview-placeholder">

      <div>🎬</div>

      <strong>
        AI Video बन रही है...
      </strong>

      <span id="aiGenerationStatus">
        Photo GPU server पर भेजी जा रही है...
      </span>

      <span style="
        margin-top:10px;
        max-width:500px;
        opacity:.8;
      ">
        पहली generation में थोड़ा समय लग सकता है।
      </span>

    </div>

  `;


  scrollToVideo();


  const stopMessages =
    startGenerationMessages();


  try {

    /*
     * Build multipart request.
     */
    const form =
      new FormData();


    /*
     * IMPORTANT:
     * Send actual File object.
     */
    form.append(
      "image",
      creatorState.photoFile
    );


    /*
     * Send parameters to Worker.
     */
    const params = {

      prompt:
        buildAIPrompt(),

      duration_seconds:
        3.5,

      steps:
        6

    };


    form.append(
      "params",
      JSON.stringify(params)
    );


    updateGenerationStatus(
      "AI GPU job submit हो रहा है..."
    );


    /*
     * Cloudflare Worker request.
     */
    const response =
      await fetch(
        `${WORKER_URL}/generate`,
        {
          method: "POST",
          body: form
        }
      );


    /*
     * Handle HTTP errors.
     */
    if (
      !response.ok ||
      !response.body
    ) {

      const message =
        await readErrorMessage(
          response
        );


      throw new Error(
        message ||
        `Server error ${response.status}`
      );

    }


    updateGenerationStatus(
      "GPU queue में waiting..."
    );


    /*
     * Read Gradio SSE stream.
     */
    const videoUrl =
      await consumeSseUntilComplete(
        response.body
      );


    if (!videoUrl) {

      throw new Error(
        "Video URL नहीं मिला।"
      );

    }


    creatorState.videoUrl =
      videoUrl;


    /*
     * Show result.
     */
    showGeneratedVideo(
      videoUrl
    );


    updateGenerationStatus(
      "Video तैयार है ✅"
    );


  } catch (error) {

    console.error(
      "AI VIDEO ERROR:",
      error
    );


    const message =
      error instanceof Error
        ? error.message
        : String(error);


    showGenerationError(
      message
    );


  } finally {

    stopMessages();


    creatorState.busy =
      false;


    setCreateButtonBusy(
      false
    );

  }

}


/* =========================================================
   CREATE BUTTON BUSY STATE
========================================================= */

function setCreateButtonBusy(
  busy
) {

  if (!createVideoBtn) {
    return;
  }


  createVideoBtn.disabled =
    busy;


  if (busy) {

    createVideoBtn.dataset.oldText =
      createVideoBtn.textContent ||
      "";


    createVideoBtn.textContent =
      "⏳ AI Video बन रही है...";

  } else {

    createVideoBtn.textContent =
      createVideoBtn.dataset.oldText ||
      "🎬 Create Video";

  }

}


/* =========================================================
   GENERATION STATUS
========================================================= */

function updateGenerationStatus(
  message
) {

  const status =
    $("aiGenerationStatus");


  if (status) {

    status.textContent =
      message;

  }

}


/* =========================================================
   ROTATING LOADING MESSAGES
========================================================= */

function startGenerationMessages() {

  const messages = [

    "Photo GPU server पर भेजी जा रही है...",

    "AI GPU queue में waiting...",

    "Wan 2.2 AI model काम कर रहा है...",

    "Frames generate हो रहे हैं...",

    "Video animation तैयार हो रही है...",

    "लगभग तैयार है..."

  ];


  let index = 0;


  updateGenerationStatus(
    messages[0]
  );


  const timer =
    window.setInterval(
      () => {

        index =
          Math.min(
            index + 1,
            messages.length - 1
          );


        updateGenerationStatus(
          messages[index]
        );

      },
      8000
    );


  return () => {

    window.clearInterval(
      timer
    );

  };

}


/* =========================================================
   SSE STREAM
========================================================= */

async function consumeSseUntilComplete(
  stream
) {

  const reader =
    stream.getReader();


  const decoder =
    new TextDecoder();


  let buffer = "";


  while (true) {

    const {
      value,
      done
    } =
      await reader.read();


    if (done) {
      break;
    }


    buffer +=
      decoder.decode(
        value,
        {
          stream: true
        }
      );


    /*
     * SSE events are separated
     * by a blank line.
     */
    const parts =
      buffer.split(/\r?\n\r?\n/);


    buffer =
      parts.pop() || "";


    for (
      const rawEvent of parts
    ) {

      const event =
        parseSseEvent(
          rawEvent
        );


      if (!event) {
        continue;
      }


      /*
       * Generation complete.
       */
      if (
        event.name ===
        "complete"
      ) {

        let payload;


        try {

          payload =
            JSON.parse(
              event.data
            );

        } catch {

          throw new Error(
            "AI server ने invalid result भेजा।"
          );

        }


        const first =
          Array.isArray(payload)
            ? payload[0]
            : null;


        const url =
          extractVideoUrl(
            first
          );


        if (!url) {

          throw new Error(
            "Generation complete हुई लेकिन video URL नहीं मिला।"
          );

        }


        return url;

      }


      /*
       * Upstream error.
       */
      if (
        event.name ===
        "error"
      ) {

        let message =
          event.data;


        try {

          const parsed =
            JSON.parse(
              event.data
            );


          if (
            typeof parsed ===
            "string"
          ) {

            message =
              parsed;

          }

        } catch {
          /*
           * Keep raw error.
           */
        }


        throw new Error(
          message ||
          "AI server ने error दिया।"
        );

      }


      /*
       * Generating / heartbeat /
       * estimation events.
       */
      if (
        event.name ===
        "generating"
      ) {

        updateGenerationStatus(
          "AI frames generate हो रहे हैं..."
        );

      }

    }

  }


  throw new Error(
    "Connection video पूरा होने से पहले बंद हो गया। कृपया फिर कोशिश करें।"
  );

}


/* =========================================================
   SSE PARSER
========================================================= */

function parseSseEvent(
  raw
) {

  let name =
    "message";


  const dataLines =
    [];


  const lines =
    raw.split(/\r?\n/);


  for (
    const line of lines
  ) {

    if (
      line.startsWith(
        "event:"
      )
    ) {

      name =
        line
          .slice(6)
          .trim();

    } else if (
      line.startsWith(
        "data:"
      )
    ) {

      dataLines.push(
        line
          .slice(5)
          .trim()
      );

    }

  }


  if (
    dataLines.length === 0
  ) {

    return null;

  }


  return {

    name,

    data:
      dataLines.join("\n")

  };

}


/* =========================================================
   VIDEO URL EXTRACTION
========================================================= */

const HF_SPACE_BASE =
  "https://cbensimon-wan2-2-fp8da-aoti-preview2.hf.space";


function extractVideoUrl(
  fileData
) {

  if (!fileData) {
    return null;
  }


  /*
   * Some Gradio versions return
   * a direct string path.
   */
  if (
    typeof fileData ===
    "string"
  ) {

    if (
      fileData.startsWith(
        "http://"
      ) ||
      fileData.startsWith(
        "https://"
      )
    ) {

      return fileData;

    }


    return (
      `${HF_SPACE_BASE}/gradio_api/file=${fileData}`
    );

  }


  /*
   * Normal Gradio FileData.
   */
  if (
    typeof fileData ===
    "object"
  ) {

    const file =
      fileData;


    if (
      typeof file.url ===
      "string" &&
      file.url
    ) {

      return file.url;

    }


    if (
      typeof file.path ===
      "string" &&
      file.path
    ) {

      if (
        file.path.startsWith(
          "http://"
        ) ||
        file.path.startsWith(
          "https://"
        )
      ) {

        return file.path;

      }


      return (
        `${HF_SPACE_BASE}/gradio_api/file=${file.path}`
      );

    }

  }


  return null;

}


/* =========================================================
   SHOW GENERATED VIDEO
========================================================= */

function showGeneratedVideo(
  videoUrl
) {

  const videoResult =
    $("videoResult");


  if (!videoResult) {
    return;
  }


  videoResult.innerHTML = `

    <div style="
      padding:16px;
      text-align:center;
    ">

      <div style="
        margin-bottom:12px;
        font-size:18px;
        font-weight:700;
      ">
        🎬 AI Video Ready
      </div>


      <video
        id="generatedAIvideo"
        controls
        playsinline
        preload="metadata"
        style="
          width:100%;
          max-height:520px;
          border-radius:15px;
          background:#000;
          display:block;
        "
      ></video>


      <div style="
        margin-top:14px;
      ">

        <a
          id="downloadAIVideo"
          class="btn"
          href="${escapeAttribute(videoUrl)}"
          download="gamezone-ai-video.mp4"
          target="_blank"
          rel="noopener"
          style="
            display:inline-block;
            text-decoration:none;
          "
        >
          ⬇️ Download Video
        </a>

      </div>


      <div style="
        margin-top:12px;
        font-size:12px;
        line-height:1.5;
        opacity:.72;
      ">
        Video आपके browser में temporary result के रूप में दिखाई जा रही है।
        Download करने के बाद आप इसे अपने phone में रख सकते हैं।
      </div>

    </div>

  `;


  const video =
    $("generatedAIvideo");


  if (video) {

    video.src =
      videoUrl;

    video.load();

  }

}


/* =========================================================
   GENERATION ERROR
========================================================= */

function showGenerationError(
  message
) {

  const videoResult =
    $("videoResult");


  if (!videoResult) {
    return;
  }


  videoResult.innerHTML = `

    <div class="preview-placeholder">

      <div>⚠️</div>

      <strong>
        Video generate नहीं हो सकी
      </strong>

      <span style="
        margin-top:8px;
        max-width:520px;
        line-height:1.6;
      ">
        ${escapeHtml(message)}
      </span>

      <button
        type="button"
        id="retryAIVideo"
        class="btn"
        style="
          margin-top:14px;
        "
      >
        🔄 फिर कोशिश करें
      </button>

    </div>

  `;


  const retry =
    $("retryAIVideo");


  if (retry) {

    retry.addEventListener(
      "click",
      () => {

        generateRealVideo();

      }
    );

  }

}


/* =========================================================
   READ WORKER ERROR
========================================================= */

async function readErrorMessage(
  response
) {

  try {

    const clone =
      response.clone();


    const json =
      await clone.json();


    if (
      json &&
      typeof json.error ===
      "string"
    ) {

      return json.error;

    }

  } catch {
    /*
     * Not JSON.
     */
  }


  try {

    const text =
      await response.text();


    if (text) {
      return text;
    }

  } catch {
    /*
     * Ignore.
     */
  }


  return (
    `${response.status} ${response.statusText}`
  );

}


/* =========================================================
   SCROLL TO VIDEO
========================================================= */

function scrollToVideo() {

  const videoSection =
    $("videoSection");


  if (videoSection) {

    videoSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  }

}


/* =========================================================
   SAVE CREATOR SETTINGS
========================================================= */

const saveBtn =
  $("saveBtn");


if (saveBtn) {

  saveBtn.addEventListener(
    "click",
    () => {

      const data = {

        faceStyle:
          creatorState.faceStyle,

        voiceStyle:
          creatorState.voiceStyle,

        script:
          creatorState.script

      };


      try {

        localStorage.setItem(
          "gamezone_ai_creator_settings",
          JSON.stringify(data)
        );


        alert(
          "✅ आपकी Creator Settings Save हो गईं।"
        );


      } catch (error) {

        alert(
          "Settings Save नहीं हो सकीं।"
        );

      }

    }
  );

}


/* =========================================================
   LOAD SAVED SETTINGS
========================================================= */

function loadSavedSettings() {

  try {

    const saved =
      localStorage.getItem(
        "gamezone_ai_creator_settings"
      );


    if (!saved) {
      return;
    }


    const data =
      JSON.parse(saved);


    if (data.faceStyle) {

      const faceButton =
        document.querySelector(
          `[data-face="${cssEscape(data.faceStyle)}"]`
        );


      if (faceButton) {

        faceButton.click();

      }

    }


    if (data.voiceStyle) {

      const voiceButton =
        document.querySelector(
          `[data-voice="${cssEscape(data.voiceStyle)}"]`
        );


      if (voiceButton) {

        voiceButton.click();

      }

    }


    if (
      typeof data.script ===
      "string" &&
      scriptText
    ) {

      scriptText.value =
        data.script;


      creatorState.script =
        data.script;


      if (characterCount) {

        characterCount.textContent =
          data.script.length;

      }

    }

  } catch (error) {

    console.warn(
      "Creator settings could not be loaded."
    );

  }

}


/* =========================================================
   CSS ESCAPE FALLBACK
========================================================= */

function cssEscape(
  value
) {

  if (
    window.CSS &&
    typeof window.CSS.escape ===
    "function"
  ) {

    return window.CSS.escape(
      value
    );

  }


  return String(value)
    .replace(
      /"/g,
      '\\"'
    );

}


/* =========================================================
   BROWSER VOICE PREVIEW
========================================================= */

function speakPreview() {

  if (
    !(
      "speechSynthesis" in
      window
    )
  ) {

    alert(
      "इस Browser में Voice Preview उपलब्ध नहीं है।"
    );

    return;

  }


  const text =
    creatorState.script.trim();


  if (!text) {

    alert(
      "पहले अपना Dialogue लिखें।"
    );

    return;

  }


  window.speechSynthesis.cancel();


  const utterance =
    new SpeechSynthesisUtterance(
      text
    );


  utterance.lang =
    "hi-IN";


  switch (
    creatorState.voiceStyle
  ) {

    case "deep":

      utterance.pitch =
        0.65;

      utterance.rate =
        0.90;

      break;


    case "young":

      utterance.pitch =
        1.35;

      utterance.rate =
        1.05;

      break;


    case "cartoon":

      utterance.pitch =
        1.55;

      utterance.rate =
        1.10;

      break;


    case "robot":

      utterance.pitch =
        0.75;

      utterance.rate =
        0.82;

      break;


    case "old":

      utterance.pitch =
        0.70;

      utterance.rate =
        0.72;

      break;


    case "funny":

      utterance.pitch =
        1.45;

      utterance.rate =
        1.15;

      break;


    case "cinematic":

      utterance.pitch =
        0.82;

      utterance.rate =
        0.80;

      break;


    case "monster":

      utterance.pitch =
        0.45;

      utterance.rate =
        0.72;

      break;


    case "radio":

      utterance.pitch =
        0.92;

      utterance.rate =
        0.95;

      break;


    case "gaming":

      utterance.pitch =
        1.05;

      utterance.rate =
        1.08;

      break;


    case "character":

      utterance.pitch =
        1.25;

      utterance.rate =
        1.00;

      break;


    default:

      utterance.pitch =
        1;

      utterance.rate =
        1;

  }


  window.speechSynthesis.speak(
    utterance
  );

}


/* =========================================================
   VOICE PREVIEW — DOUBLE CLICK
========================================================= */

voiceButtons.forEach(
  (button) => {

    button.addEventListener(
      "dblclick",
      () => {

        const voice =
          button.dataset.voice;


        creatorState.voiceStyle =
          voice ||
          "original";


        const selectedVoice =
          $("selectedVoice");


        if (selectedVoice) {

          selectedVoice.textContent =
            voiceNames[
              creatorState.voiceStyle
            ] ||
            "Original";

        }


        speakPreview();

      }
    );

  }
);


/* =========================================================
   HTML SAFETY
========================================================= */

function escapeHtml(
  value
) {

  return String(value)

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );

}


/* =========================================================
   ATTRIBUTE SAFETY
========================================================= */

function escapeAttribute(
  value
) {

  return String(value)

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    );

}


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    loadSavedSettings();

    updateCreatorPreview();

  }
);
