# Sunderta Dental 3D POC

This standalone FastAPI POC:

- accepts a mouth image or short video;
- samples video frames;
- estimates monocular depth with Depth Anything V2;
- exports an approximate coloured point cloud (`.ply`) and PNG preview;
- optionally asks Azure OpenAI for cautious, non-diagnostic appearance observations.

## Start

```bash
cp .env.example .env
# Add AZURE_OPENAI_API_KEY if findings are required.
./start.sh
```

API docs: `http://localhost:8010/docs`

Example:

```bash
curl -X POST http://localhost:8010/analyze \
  -F "file=@mouth-video.mp4"
```

## Important limitation

The generated map is pseudo-3D from monocular depth, not dental-grade geometry. It must not be used to confirm cavities, crown/cap fit, infection, or treatment decisions. Reliable crown alignment and caries assessment normally require calibrated multi-view capture and/or professional intraoral scanners and clinical examination.
