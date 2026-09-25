const DEFAULT_NEGATIVE_PROMPT =
  "色调艳丽, 过曝, 静态, 细节模糊不清, 字幕, 风格, 作品, 画作, 画面, 静止, 整体发灰, " +
  "最差质量, 低质量, JPEG压缩残留, 丑陋的, 残缺的, 多余的手指, 画得不好的手部, " +
  "画得不好的脸部, 畸形的, 毁容的, 形态畸形的肢体, 手指融合, 静止不动的画面, " +
  "杂乱的背景, 三条腿, 背景人很多, 倒着走";

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get("Origin") || "";

    if (req.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }), origin, env);
    }

    if (req.method === "POST" && url.pathname === "/generate") {
      try {
        const result = await handleGenerate(req, env);
        return withCors(result, origin, env);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return withCors(jsonResponse({ error: msg }, 500), origin, env);
      }
    }

    if (req.method === "GET" && url.pathname === "/health") {
      return withCors(jsonResponse({ ok: true }), origin, env);
    }

    return withCors(
      jsonResponse({ error: "Not found" }, 404),
      origin,
      env
    );
  }
};

async function handleGenerate(req, env) {
  const form = await req.formData();

  const image = form.get("image");
  const paramsRaw = form.get("params");

  if (!(image instanceof File)) {
    return jsonResponse(
      { error: "Missing 'image' form field" },
      400
    );
  }

  if (image.size > 8 * 1024 * 1024) {
    return jsonResponse(
      { error: "Image must be 8 MB or smaller" },
      413
    );
  }

  let parsed = null;

  if (typeof paramsRaw === "string") {
    try {
      parsed = JSON.parse(paramsRaw);
    } catch {
      parsed = null;
    }
  }

  const userParams =
    parsed &&
    typeof parsed === "object"
      ? parsed
      : {};

  const imageRef = await uploadImageToSpace(image, env);

  const eventId = await submitJob(
    imageRef,
    image.name,
    userParams,
    env
  );

  const upstream = await fetch(
    `${env.HF_SPACE_BASE}/gradio_api/call/${env.HF_FN_NAME}/${eventId}`,
    {
      method: "GET",
      headers: {
        Accept: "text/event-stream"
      }
    }
  );

  if (!upstream.ok || !upstream.body) {
    throw new Error(
      `Could not open result stream (${upstream.status}).`
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no"
    }
  });
}

async function uploadImageToSpace(file, env) {
  const fd = new FormData();

  fd.append(
    "files",
    file,
    file.name || "input.png"
  );

  const res = await fetch(
    `${env.HF_SPACE_BASE}/gradio_api/upload`,
    {
      method: "POST",
      body: fd
    }
  );

  if (!res.ok) {
    throw new Error(
      `Image upload failed (${res.status}). The AI Space may be sleeping or rate-limited.`
    );
  }

  const paths = await res.json();

  if (!Array.isArray(paths) || !paths[0]) {
    throw new Error(
      "Upload returned an unexpected response."
    );
  }

  return paths[0];
}

async function submitJob(
  imagePath,
  origName,
  params,
  env
) {
  const inputImage = {
    path: imagePath,
    url: `${env.HF_SPACE_BASE}/gradio_api/file=${imagePath}`,
    orig_name: origName,
    size: null,
    mime_type: null,
    meta: {
      _type: "gradio.FileData"
    }
  };

  const data = [
    inputImage,
    null,

    params.prompt?.trim() ||
      "make this image come alive, cinematic motion, smooth animation",

    clampInt(params.steps ?? 6, 1, 12),

    DEFAULT_NEGATIVE_PROMPT,

    clampFloat(
      params.duration_seconds ?? 3.5,
      0.5,
      4.5
    ),

    1,
    1,

    42,
    true,

    6,

    "UniPCMultistep",

    3.0,

    16,

    false,

    true
  ];

  const res = await fetch(
    `${env.HF_SPACE_BASE}/gradio_api/call/${env.HF_FN_NAME}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ data })
    }
  );

  if (!res.ok) {
    throw new Error(
      `Job submission failed (${res.status}).`
    );
  }

  const body = await res.json();

  if (!body.event_id) {
    throw new Error(
      "Job submission returned no event_id."
    );
  }

  return body.event_id;
}

function clampInt(n, min, max) {
  return Math.max(
    min,
    Math.min(max, Math.round(Number(n)))
  );
}

function clampFloat(n, min, max) {
  return Math.max(
    min,
    Math.min(max, Number(n))
  );
}

function jsonResponse(body, status = 200) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}

function withCors(res, origin, env) {
  const allowed = (
    env.ALLOWED_ORIGINS || ""
  )
    .split(",")
    .map(s => s.trim());

  const headers = new Headers(res.headers);

  if (
    origin &&
    allowed.includes(origin)
  ) {
    headers.set(
      "Access-Control-Allow-Origin",
      origin
    );

    headers.set(
      "Vary",
      "Origin"
    );
  }

  headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );

  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  headers.set(
    "Access-Control-Max-Age",
    "86400"
  );

  return new Response(
    res.body,
    {
      status: res.status,
      statusText: res.statusText,
      headers
    }
  );
}
