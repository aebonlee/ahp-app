import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ICODE_HOST = "211.172.232.124";
const ICODE_PORT = 9201;
const SOCKET_TIMEOUT_MS = 10000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Calculate EUC-KR byte length (Korean = 2 bytes, ASCII = 1 byte)
 */
function eucKrByteLength(text: string): number {
  let len = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    len += code >= 0x80 ? 2 : 1;
  }
  return len;
}

/**
 * Build JSON for icode SMS API.
 * Uses JSON.stringify for safe JSON formation, then forces all
 * non-ASCII chars into \uXXXX JSON escapes so the entire body
 * is pure ASCII bytes — compatible with the icode TCP server.
 */
function buildRequestBody(
  token: string,
  tel: string,
  cb: string,
  msg: string
): Uint8Array {
  const cleanMsg = msg.replace(/\r\n/g, "\n");
  const byteLen = eucKrByteLength(cleanMsg);
  const title = byteLen <= 90 ? "" : "LMS";

  const json = JSON.stringify({
    key: token,
    tel: tel,
    cb: cb,
    date: "",
    msg: cleanMsg,
    title: title,
  });

  // Force non-ASCII characters into \uXXXX JSON escape sequences
  const asciiJson = json.replace(/[^\x00-\x7F]/g, (ch) => {
    return "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0");
  });

  return new TextEncoder().encode(asciiJson);
}

/**
 * Build TCP frame: [2-byte type][4-byte length][body bytes]
 */
function buildFrame(bodyBytes: Uint8Array): Uint8Array {
  const encoder = new TextEncoder();
  const typeBytes = encoder.encode("06");
  const lenStr = String(bodyBytes.length).padStart(4, "0");
  const lenBytes = encoder.encode(lenStr);

  const frame = new Uint8Array(
    typeBytes.length + lenBytes.length + bodyBytes.length
  );
  frame.set(typeBytes, 0);
  frame.set(lenBytes, 2);
  frame.set(bodyBytes, 6);
  return frame;
}

/**
 * Read exactly n bytes from a Deno.Conn.
 */
async function readExact(
  conn: Deno.Conn,
  n: number,
  timeoutMs: number
): Promise<Uint8Array> {
  const result = new Uint8Array(n);
  let offset = 0;
  const deadline = Date.now() + timeoutMs;

  while (offset < n) {
    if (Date.now() > deadline) {
      throw new Error(`TCP read timeout (${offset}/${n} bytes received)`);
    }
    const chunk = new Uint8Array(n - offset);
    const bytesRead = await conn.read(chunk);
    if (bytesRead === null) {
      throw new Error(`Connection closed (${offset}/${n} bytes received)`);
    }
    result.set(chunk.subarray(0, bytesRead), offset);
    offset += bytesRead;
  }
  return result;
}

/**
 * Read response from icodekorea TCP server.
 * Protocol: [2-byte type "02"][4-byte length][result body]
 */
async function readResponse(
  conn: Deno.Conn
): Promise<{ success: boolean; raw: string }> {
  const decoder = new TextDecoder();

  const typeBuf = await readExact(conn, 2, SOCKET_TIMEOUT_MS);
  const msgType = decoder.decode(typeBuf);

  const lenBuf = await readExact(conn, 4, SOCKET_TIMEOUT_MS);
  const lenStr = decoder.decode(lenBuf).trim();
  const bodyLen = parseInt(lenStr, 10);

  if (isNaN(bodyLen) || bodyLen <= 0) {
    return {
      success: false,
      raw: `Invalid response length: "${lenStr}", type: "${msgType}"`,
    };
  }

  const bodyBuf = await readExact(conn, bodyLen, SOCKET_TIMEOUT_MS);
  const body = decoder.decode(bodyBuf);

  if (msgType !== "02") {
    return {
      success: false,
      raw: `Unknown response type: ${msgType}, body: ${body}`,
    };
  }

  const resultCode = body.substring(0, 2);
  return {
    success: resultCode === "00",
    raw: body,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get("ICODE_TOKEN");
    const senderNumber = Deno.env.get("SMS_SENDER_NUMBER");

    if (!token || !senderNumber) {
      return new Response(
        JSON.stringify({ error: "SMS 환경변수가 설정되지 않았습니다." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { receiver, message } = await req.json();

    if (!receiver || !message) {
      return new Response(
        JSON.stringify({ error: "receiver와 message는 필수입니다." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const tel = receiver.replace(/\D/g, "");
    const bodyBytes = buildRequestBody(token, tel, senderNumber, message);
    const frame = buildFrame(bodyBytes);

    const conn = await Deno.connect({
      hostname: ICODE_HOST,
      port: ICODE_PORT,
    });

    try {
      await conn.write(frame);
      const result = await readResponse(conn);

      return new Response(
        JSON.stringify({
          success: result.success,
          message: result.success ? "발송 완료" : "발송 실패",
          detail: result.raw,
        }),
        {
          status: result.success ? 200 : 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } finally {
      try {
        conn.close();
      } catch {
        // already closed
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: `SMS 발송 오류: ${message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
