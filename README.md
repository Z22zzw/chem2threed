# ChemScene Agent

A chemistry 3D teaching-scene agent built on EdgeOne Makers and the OpenAI Agents SDK runtime. Teachers can describe a molecule, reaction, crystal, orbital, process equipment, or lab apparatus; the app asks optional spec-card questions, then renders an interactive Three.js HTML scene with live preview.

## Features

- Text, image, PDF, TXT, and DOCX inputs.
- Optional clarification cards with defaults and direct-generation flow.
- Model-generated Scene Spec with six renderer families: molecule, reaction, crystal, orbital, equipment, apparatus.
- Single-file Three.js HTML output with orbit controls, labels, animation, preview, and download.
- EdgeOne Makers SSE status events, tool indicators, stop generation, and scene links.
- `/scene?...` public scene route when Makers Store/Blob is available; iframe preview remains available locally.

## Development

```bash
npm install
edgeone makers dev --name chemscene-agent --skip-env-sync
```

With a fixed local port:

```bash
edgeone makers dev --name chemscene-agent --skip-env-sync --port 8095
```

## Build

```bash
npm run build
```

## Key Files

```text
agents/chat/index.ts       Main SSE Agent route
agents/_chemScene.ts       Chemistry parsing, scene specs, Three.js HTML renderer
agents/_tools.ts           ChemScene tool registration
cloud-functions/upload     Attachment upload and extraction
cloud-functions/scene      Public scene HTML route
src/components             Chat, clarification cards, preview panel
```

## Notes

Scene generation calls an OpenAI-compatible model first and then renders the returned Scene Spec into Three.js HTML. Configure `AI_GATEWAY_API_KEY`, `AI_GATEWAY_BASE_URL`, and optionally `AI_GATEWAY_MODEL`; `OPENAI_API_KEY`, `OPENAI_BASE_URL`, and `OPENAI_MODEL` are also accepted. If the model endpoint is unavailable, the app falls back to local chemistry templates so the preview flow still works. Persistent `/scene` links depend on EdgeOne Makers Store/Blob permissions; without them, local preview and HTML download still work.
