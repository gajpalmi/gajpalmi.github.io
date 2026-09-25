"use strict";

/*
 * GAMEZONE ARENA
 * AI CREATOR STUDIO
 *
 * This file handles:
 * - Photo preview
 * - Face style selection
 * - Voice style selection
 * - Text counter
 * - Creator preview
 * - Browser speech preview
 * - Basic save functionality
 *
 * Real AI image/video generation can be connected later
 * without changing the main GAMEZONE website.
 */

const $ = (id) => document.getElementById(id);


/* =========================================================
   STATE
========================================================= */

const creatorState = {
  photoData: "",
  faceStyle: "original",
  voiceStyle: "original",
  script: ""
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

const photoInput = $("photoInput");
const photoPreview = $("photoPreview");

if (photoInput) {

  photoInput.addEventListener("change", (event) => {

    const file = event.target.files && event.target.files[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("कृपया केवल Image Photo चुनें।");
      photoInput.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {

      creatorState.photoData = e.target.result;

      photoPreview.classList.add("has-image");

      photoPreview.innerHTML = `
        <img
          src="${creatorState.photoData}"
          alt="Uploaded Photo"
        >
      `;

      updateCreatorPreview();
    };

    reader.onerror = () => {
      alert("Photo पढ़ने में समस्या हुई। कृपया दूसरी Photo चुनें।");
    };

    reader.readAsDataURL(file);

  });

}


/* =========================================================
   FACE STYLE
========================================================= */

const faceButtons = document.querySelectorAll(
  "[data-face]"
);

faceButtons.forEach((button) => {

  button.addEventListener("click", () => {

    faceButtons.forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    creatorState.faceStyle =
      button.dataset.face || "original";

    const selectedFace = $("selectedFace");

    if (selectedFace) {
      selectedFace.textContent =
        faceNames[creatorState.faceStyle] ||
        "Original";
    }

    updateCreatorPreview();

  });

});


/* =========================================================
   VOICE STYLE
========================================================= */

const voiceButtons = document.querySelectorAll(
  "[data-voice]"
);

voiceButtons.forEach((button) => {

  button.addEventListener("click", () => {

    voiceButtons.forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    creatorState.voiceStyle =
      button.dataset.voice || "original";

    const selectedVoice = $("selectedVoice");

    if (selectedVoice) {
      selectedVoice.textContent =
        voiceNames[creatorState.voiceStyle] ||
        "Original";
    }

  });

});


/* =========================================================
   TEXT / SCRIPT
========================================================= */

const scriptText = $("scriptText");
const characterCount = $("characterCount");

if (scriptText) {

  scriptText.addEventListener("input", () => {

    creatorState.script = scriptText.value;

    if (characterCount) {
      characterCount.textContent =
        scriptText.value.length;
    }

  });

}


/* =========================================================
   PREVIEW
========================================================= */

function updateCreatorPreview() {

  const preview = $("creatorPreview");

  if (!preview) {
    return;
  }

  if (!creatorState.photoData) {

    preview.innerHTML = `
      <div class="preview-placeholder">
        <div>📷</div>
        <strong>पहले अपनी Photo चुनें</strong>
        <span>फिर Face Style और Voice Style चुनें</span>
      </div>
    `;

    return;
  }

  const faceName =
    faceNames[creatorState.faceStyle] ||
    "Original";

  const voiceName =
    voiceNames[creatorState.voiceStyle] ||
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
          🎭 ${faceName}
        </span>

        <span style="
          padding:7px 11px;
          border-radius:999px;
          background:rgba(0,212,255,.12);
          font-size:12px;
        ">
          🎙️ ${voiceName}
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

const previewBtn = $("previewBtn");

if (previewBtn) {

  previewBtn.addEventListener("click", () => {

    if (!creatorState.photoData) {
      alert("पहले अपनी Photo Upload करें।");
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

  });

}


/* =========================================================
   CREATE VIDEO BUTTON
========================================================= */

const createVideoBtn = $("createVideoBtn");

if (createVideoBtn) {

  createVideoBtn.addEventListener("click", () => {

    if (!creatorState.photoData) {
      alert("पहले अपनी Photo Upload करें।");
      return;
    }

    const videoResult = $("videoResult");

    if (!videoResult) {
      return;
    }

    videoResult.innerHTML = `
      <div class="preview-placeholder">

        <div>🎬</div>

        <strong>
          Creator Setup तैयार है
        </strong>

        <span>
          Face: ${escapeHtml(
            faceNames[creatorState.faceStyle] || "Original"
          )}
          <br>
          Voice: ${escapeHtml(
            voiceNames[creatorState.voiceStyle] || "Original"
          )}
        </span>

        <span style="
          margin-top:8px;
          max-width:500px;
        ">
          अगला चरण real AI image/video generation
          engine से जोड़ा जा सकता है।
        </span>

      </div>
    `;

    const videoSection =
      $("videoSection");

    if (videoSection) {
      videoSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }

  });

}


/* =========================================================
   SAVE CREATOR SETTINGS
========================================================= */

const saveBtn = $("saveBtn");

if (saveBtn) {

  saveBtn.addEventListener("click", () => {

    const data = {
      faceStyle: creatorState.faceStyle,
      voiceStyle: creatorState.voiceStyle,
      script: creatorState.script
    };

    try {

      localStorage.setItem(
        "gamezone_ai_creator_settings",
        JSON.stringify(data)
      );

      alert("✅ आपकी Creator Settings Save हो गईं।");

    } catch (error) {

      alert(
        "Settings Save नहीं हो सकीं।"
      );

    }

  });

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

    const data = JSON.parse(saved);

    if (data.faceStyle) {

      const faceButton =
        document.querySelector(
          `[data-face="${CSS.escape(data.faceStyle)}"]`
        );

      if (faceButton) {
        faceButton.click();
      }

    }

    if (data.voiceStyle) {

      const voiceButton =
        document.querySelector(
          `[data-voice="${CSS.escape(data.voiceStyle)}"]`
        );

      if (voiceButton) {
        voiceButton.click();
      }

    }

    if (
      typeof data.script === "string" &&
      scriptText
    ) {

      scriptText.value = data.script;

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
   BASIC BROWSER VOICE PREVIEW
========================================================= */

function speakPreview() {

  if (
    !("speechSynthesis" in window)
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
    new SpeechSynthesisUtterance(text);

  utterance.lang = "hi-IN";

  /*
   * Browser TTS में अलग-अलग AI voices
   * हर device पर उपलब्ध नहीं होतीं।
   *
   * इसलिए यहाँ safe browser-level
   * preview रखा गया है।
   */

  switch (creatorState.voiceStyle) {

    case "deep":
      utterance.pitch = 0.65;
      utterance.rate = 0.90;
      break;

    case "young":
      utterance.pitch = 1.35;
      utterance.rate = 1.05;
      break;

    case "cartoon":
      utterance.pitch = 1.55;
      utterance.rate = 1.10;
      break;

    case "robot":
      utterance.pitch = 0.75;
      utterance.rate = 0.82;
      break;

    case "old":
      utterance.pitch = 0.70;
      utterance.rate = 0.72;
      break;

    case "funny":
      utterance.pitch = 1.45;
      utterance.rate = 1.15;
      break;

    case "cinematic":
      utterance.pitch = 0.82;
      utterance.rate = 0.80;
      break;

    case "monster":
      utterance.pitch = 0.45;
      utterance.rate = 0.72;
      break;

    case "radio":
      utterance.pitch = 0.92;
      utterance.rate = 0.95;
      break;

    case "gaming":
      utterance.pitch = 1.05;
      utterance.rate = 1.08;
      break;

    case "character":
      utterance.pitch = 1.25;
      utterance.rate = 1.00;
      break;

    default:
      utterance.pitch = 1;
      utterance.rate = 1;
  }

  window.speechSynthesis.speak(
    utterance
  );

}


/* =========================================================
   VOICE PREVIEW — LONG PRESS / DOUBLE CLICK
========================================================= */

voiceButtons.forEach((button) => {

  button.addEventListener(
    "dblclick",
    () => {

      const voice =
        button.dataset.voice;

      creatorState.voiceStyle =
        voice || "original";

      const selectedVoice =
        $("selectedVoice");

      if (selectedVoice) {
        selectedVoice.textContent =
          voiceNames[creatorState.voiceStyle] ||
          "Original";
      }

      speakPreview();

    }
  );

});


/* =========================================================
   HTML SAFETY
========================================================= */

function escapeHtml(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

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
