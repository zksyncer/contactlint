# ContactLint MCP Server (`contactlint-mcp`)

ContactLint checks email addresses and phone numbers before your AI agent saves or uses them. You can run it as a **local stdio MCP server** (`contactlint-mcp`, reading `CONTACTLINT_API_KEY` from the environment) or connect directly to the **hosted Streamable HTTP endpoint** (`https://contactlint.com/mcp`).

- Local stdio binary: `contactlint-mcp` (`./bin/contactlint-mcp.mjs`)
- Hosted endpoint: `https://contactlint.com/mcp` (Streamable HTTP, JSON-RPC over POST)
- Website: https://contactlint.com/
- MCP guide: https://contactlint.com/email-validation-mcp-server
- OpenAPI (REST API): https://contactlint.com/openapi.json
- MCP Registry: `com.contactlint/contactlint`

## Tools

| Tool | Input | What it does |
|---|---|---|
| `validate_email` | `email` | Checks syntax, MX and A records over DNS-over-HTTPS, known disposable domains, role addresses (`admin@`, `no-reply@`) and free providers, and suggests a fix when the domain looks like a typo of a major provider (`gmial.com`). |
| `validate_emails` | `emails` (1 to 50 addresses) | Same checks as `validate_email` for up to 50 addresses in one call. Returns one result per address in the same order plus a summary of verdicts. |
| `validate_phone` | `phone`, optional `country` (ISO 3166-1 alpha-2 default region, for example `US`) | Parses and validates a phone number: valid and possible flags, line type, region, E.164, national and international formats. |

ContactLint does not connect to mail servers (no SMTP probing), so it cannot confirm that a mailbox exists or detect catch-all domains.

`initialize` and `tools/list` work without a key, so clients and directory scanners can read the tool list. `tools/call` requires a ContactLint API key (100 free checks per month, no card required).

## Option 1: Local stdio MCP server (recommended for registries & desktop clients)

The local stdio server (`bin/contactlint-mcp.mjs`) reads your API key from the `CONTACTLINT_API_KEY` secret environment variable and forwards authenticated tool calls to `https://contactlint.com/mcp`.

### Environment variables

| Variable | Required | Secret | Description |
|---|---|---|---|
| `CONTACTLINT_API_KEY` | Yes | Yes | Your ContactLint API key, sent as `Authorization: Bearer <key>`. Get a free key (100 checks/month, no card) at https://contactlint.com/signup |
| `CONTACTLINT_MCP_URL` | No | No | Optional endpoint override (defaults to `https://contactlint.com/mcp`) |

### Client configuration (stdio via `npx`)

```json
{
  "mcpServers": {
    "contactlint": {
      "command": "npx",
      "args": ["-y", "github:zksyncer/contactlint"],
      "env": {
        "CONTACTLINT_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

Or when installed locally (`npm install -g github:zksyncer/contactlint` or `pnpm add contactlint-mcp`):

```json
{
  "mcpServers": {
    "contactlint": {
      "command": "contactlint-mcp",
      "env": {
        "CONTACTLINT_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

## Option 2: Hosted Streamable HTTP MCP server

If your MCP client supports custom HTTP headers on remote `streamable-http` servers, you can connect directly without installing anything:

```json
{
  "mcpServers": {
    "contactlint": {
      "type": "http",
      "url": "https://contactlint.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

## Billing

- One check per address or number checked. A `validate_emails` call with 20 addresses uses 20 checks.
- Addresses whose DNS lookup fails come back `unknown` (`dns_error`) and are not billed.
- If a key does not have enough checks for a whole `validate_emails` list, nothing is checked or billed.
- 100 checks per month are free, no card needed.
- Credit packs: 5,000 checks for $9, 25,000 for $35, 100,000 for $99.

## Free tools

Free browser tools (disposable email checker, phone number validator, disposable domain list) are at https://contactlint.com/tools

## License

MIT, see [LICENSE](LICENSE).
