# ContactLint MCP server

ContactLint is a hosted MCP server that checks email addresses and phone numbers before your agent saves or uses them. It runs at a public URL, so there is nothing to install.

- Endpoint: `https://contactlint.com/mcp` (Streamable HTTP, JSON-RPC over POST)
- Website: https://contactlint.com/
- Docs: https://contactlint.com/#mcp
- OpenAPI (REST API): https://contactlint.com/openapi.json
- MCP Registry: `com.contactlint/contactlint`

This repository holds the listing files only (this README, `server.json` and a client config example). The server itself is hosted by ContactLint.

## Tools

| Tool | Input | What it does |
|---|---|---|
| `validate_email` | `email` | Checks syntax, MX and A records over DNS-over-HTTPS, known disposable domains, role addresses (admin@, no-reply@) and free providers, and suggests a fix when the domain looks like a typo of a major provider (gmial.com). |
| `validate_emails` | `emails` (1 to 50 addresses) | Same checks as `validate_email` for up to 50 addresses in one call. Returns one result per address in the same order plus a summary of verdicts. |
| `validate_phone` | `phone`, optional `country` (ISO 3166-1 alpha-2 default region, for example `US`) | Parses and validates a phone number: valid and possible flags, line type, region, E.164, national and international formats. |

ContactLint does not connect to mail servers (no SMTP probing), so it cannot confirm that a mailbox exists or detect catch-all domains.

`initialize` and `tools/list` work without a key, so clients and directory scanners can read the tool list. `tools/call` needs an API key.

## Configuration

One setting is required:

| Name | Required | Description |
|---|---|---|
| `apiKey` | yes | Your ContactLint API key. Get a free key at https://contactlint.com/signup |

Send it as an `Authorization: Bearer <apiKey>` header (an `x-api-key` header also works).

Example client config (see `examples/mcp.json`):

```json
{
  "mcpServers": {
    "contactlint": {
      "type": "http",
      "url": "https://contactlint.com/mcp",
      "headers": { "Authorization": "Bearer YOUR_API_KEY" }
    }
  }
}
```

`examples/config-schema.json` describes the `apiKey` setting as JSON Schema, for directories and clients that ask for one.

## Billing

- One check per address or number checked. A `validate_emails` call with 20 addresses uses 20 checks.
- Addresses whose DNS lookup fails come back `unknown` and are not billed.
- If a key does not have enough checks for a whole `validate_emails` list, nothing is checked or billed.
- 100 checks per month are free, no card needed.
- Credit packs: 5,000 checks for $9, 25,000 for $35, 100,000 for $99.

## Free tools

Free browser tools (disposable email checker, phone number validator, disposable domain list) are at https://contactlint.com/tools

## License

MIT, see [LICENSE](LICENSE).
