#!/usr/bin/env node
/**
 * ContactLint Local Stdio MCP Server
 *
 * Bridges stdio MCP clients (Claude Desktop, Cursor, Windsurf, ToolSDK) to
 * the ContactLint MCP endpoint (https://contactlint.com/mcp), reading the API
 * key from the CONTACTLINT_API_KEY environment variable.
 */

const ENDPOINT = process.env.CONTACTLINT_MCP_URL || "https://contactlint.com/mcp";
const API_KEY = (process.env.CONTACTLINT_API_KEY || "").trim();

const TOOLS = [
  {
    name: "validate_email",
    description:
      "Check an email address: syntax, MX/A records via DNS-over-HTTPS, disposable domain, role address, free provider, typo suggestion for major providers. No SMTP probing. Uses 1 check.",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string", description: "Email address to validate" },
      },
      required: ["email"],
    },
  },
  {
    name: "validate_emails",
    description:
      "Check a list of up to 50 email addresses in one call, with the same checks as validate_email. Returns one result per address in the same order plus a summary of verdicts. Uses 1 check per address; addresses whose DNS lookup fails come back with reason dns_error and are not billed. If the key lacks checks for the whole list, nothing is checked or billed.",
    inputSchema: {
      type: "object",
      properties: {
        emails: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
          maxItems: 50,
          description: "List of 1 to 50 email addresses to validate",
        },
      },
      required: ["emails"],
    },
  },
  {
    name: "validate_phone",
    description:
      "Parse and validate a phone number: valid, possible, type, region, E.164 and national formats. Uses 1 check.",
    inputSchema: {
      type: "object",
      properties: {
        phone: { type: "string", description: "Phone number to validate" },
        country: {
          type: "string",
          description: "ISO 3166-1 alpha-2 default region, e.g. US",
        },
      },
      required: ["phone"],
    },
  },
];

let useContentLength = false;

function sendMessage(msg) {
  const json = JSON.stringify(msg);
  if (useContentLength) {
    const byteLen = Buffer.byteLength(json, "utf8");
    process.stdout.write(`Content-Length: ${byteLen}\r\n\r\n${json}`);
  } else {
    process.stdout.write(`${json}\n`);
  }
}

async function handleRpc(msg) {
  if (!msg || typeof msg !== "object" || msg.jsonrpc !== "2.0") {
    return;
  }

  // Notifications have no id
  if (msg.id === undefined) {
    return;
  }

  const id = msg.id;

  if (msg.method === "initialize") {
    sendMessage({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: msg.params?.protocolVersion || "2025-06-18",
        capabilities: {
          tools: { listChanged: false },
        },
        serverInfo: {
          name: "contactlint-mcp",
          version: "1.1.0",
        },
      },
    });
    return;
  }

  if (msg.method === "ping") {
    sendMessage({ jsonrpc: "2.0", id, result: {} });
    return;
  }

  if (msg.method === "tools/list") {
    sendMessage({
      jsonrpc: "2.0",
      id,
      result: { tools: TOOLS },
    });
    return;
  }

  if (msg.method === "tools/call") {
    if (!API_KEY) {
      sendMessage({
        jsonrpc: "2.0",
        id,
        result: {
          isError: true,
          content: [
            {
              type: "text",
              text: "missing_api_key: Set the CONTACTLINT_API_KEY environment variable. Get a free key (100 checks/month, no card) at https://contactlint.com/signup",
            },
          ],
        },
      });
      return;
    }

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(msg),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const errMsg =
          data?.error?.message ||
          `HTTP ${res.status} from ${ENDPOINT}`;
        sendMessage({
          jsonrpc: "2.0",
          id,
          result: {
            isError: true,
            content: [{ type: "text", text: errMsg }],
          },
        });
        return;
      }

      if (data && data.jsonrpc === "2.0") {
        sendMessage({ ...data, id });
      } else {
        sendMessage({
          jsonrpc: "2.0",
          id,
          error: { code: -32603, message: "Invalid JSON-RPC response from upstream" },
        });
      }
    } catch (err) {
      sendMessage({
        jsonrpc: "2.0",
        id,
        result: {
          isError: true,
          content: [
            {
              type: "text",
              text: `network_error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        },
      });
    }
    return;
  }

  sendMessage({
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: `Method not found: ${msg.method}` },
  });
}

let buffer = Buffer.alloc(0);

process.stdin.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  while (buffer.length > 0) {
    const str = buffer.toString("utf8");
    if (str.startsWith("Content-Length:")) {
      useContentLength = true;
      const headerEnd = buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) break;
      const header = buffer.subarray(0, headerEnd).toString("utf8");
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        buffer = buffer.subarray(headerEnd + 4);
        continue;
      }
      const len = Number(match[1]);
      const bodyStart = headerEnd + 4;
      if (buffer.length < bodyStart + len) break;
      const body = buffer.subarray(bodyStart, bodyStart + len).toString("utf8");
      buffer = buffer.subarray(bodyStart + len);
      try {
        handleRpc(JSON.parse(body));
      } catch {
        // ignore malformed packet
      }
    } else {
      const nl = buffer.indexOf(0x0a);
      if (nl === -1) break;
      const line = buffer.subarray(0, nl).toString("utf8").trim();
      buffer = buffer.subarray(nl + 1);
      if (!line) continue;
      try {
        handleRpc(JSON.parse(line));
      } catch {
        // ignore malformed line
      }
    }
  }
});
