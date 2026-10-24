const UPSTREAM = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export default async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST")
    return new Response(JSON.stringify({ ok: true, msg: "Lyra proxy alive" }), {
      status: 200, headers: { ...CORS, "Content-Type": "application/json" },
    });

  const code = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const ACCESS_CODE = Deno.env.get("ACCESS_CODE");
  const GLM_KEY = Deno.env.get("GLM_KEY");

  if (!ACCESS_CODE || code !== ACCESS_CODE)
    return new Response(JSON.stringify({ error: { message: "访问码不对：在 Lyra 设置的 Key 栏填你设的 ACCESS_CODE" } }), {
      status: 401, headers: { ...CORS, "Content-Type": "application/json" },
    });

  if (!GLM_KEY)
    return new Response(JSON.stringify({ error: { message: "服务器未配置 GLM_KEY" } }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });

  const payload = await req.text();
  let upstream;
  try {
    upstream = await fetch(UPSTREAM, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + GLM_KEY },
      body: payload,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: { message: "连接上游失败：" + e.message } }), {
      status: 502, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      ...CORS,
      "Content-Type": upstream.headers.get("content-type") || "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
};
