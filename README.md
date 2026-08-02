# Typeframe

Typeframe is a deterministic poster typography and mask editor. An MCP-compatible LLM can create the complete layout while the browser renders and exports exact SVG and PNG assets.

## Run locally

Install dependencies, then run the app and MCP server in separate terminals:

```bash
npm install
npm run dev
```

```bash
npm run mcp
```

Open `http://localhost:5173`. The header changes from `MCP offline` to `MCP connected`. Layout updates made by an MCP tool appear in the editor automatically.

## MCP endpoint

The Streamable HTTP endpoint is:

```text
http://127.0.0.1:7331/mcp
```

Add that URL as a Streamable HTTP MCP server in a compatible local client. The server provides:

- `inspect_template_capabilities`: lists fonts, formats, coordinate semantics, and layout guidance.
- `set_template`: replaces the canvas and all text layers.
- `update_text_element`: changes selected properties of one layer.
- `update_image_element`: changes the normalized bounds of a subject or image guide.
- `get_template`: returns the complete current layout.
- `typeframe://template/current`: read-only current-template resource.

### LM Studio stdio configuration

For clients that spawn local MCP processes, use the stdio mode instead of running `npm run mcp` separately. On Windows, add this server to the client's `mcp.json`:

```json
{
  "mcpServers": {
    "typeframe": {
      "command": "cmd",
      "args": ["/c", "npm", "--prefix", "M:\\Posters", "run", "mcp:stdio"]
    }
  }
}
```

The spawned process exposes MCP over stdio and starts the same browser bridge on port `7331`. Do not run `npm run mcp` at the same time, because both modes use that port.

Example instruction for the connected model:

```text
Use Typeframe to design an A3 portrait poster for an experimental film festival.
Include a dominant two-line title, date, venue, and compact credits. Reserve generous
mask padding around the title. Add a main-character image guide and compose the text
around its bounds. Keep every normalized coordinate between 0 and 1.
Inspect Typeframe's capabilities first, then set the complete template.
```

LM Studio can use the endpoint when its MCP integration supports Streamable HTTP. ChatGPT remote connectors cannot access `127.0.0.1`; expose the endpoint through an authenticated HTTPS deployment or tunnel before configuring it as a remote connector.

To use a different bridge address in the browser, set `VITE_MCP_BRIDGE_URL` before starting Vite.
