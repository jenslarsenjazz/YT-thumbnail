# Thumbnail Face/Head Swap App (Gemini)

A small full-stack web app for YouTube thumbnail editing. It lets you upload:

1. A **base thumbnail image**
2. A **portrait/head image**

Then it asks Gemini to replace the face/head in the base thumbnail with the uploaded portrait while keeping the thumbnail composition and style as intact as possible.

## Tech Stack

- Backend: Node.js + Express
- Uploads: Multer (memory storage)
- AI API: Google Gemini via `@google/genai`
- Frontend: plain HTML, CSS, and vanilla JS

## Features

- Upload base thumbnail + portrait image
- Extra instructions textbox to steer edits (optional)
- Server-side validation for file type and size
- Loading state + friendly error messages
- Result preview in browser
- Download generated image
- In-memory upload/edit flow (no required disk write for generated image)

## Project Structure

- `server.js`
- `public/index.html`
- `public/styles.css`
- `public/script.js`
- `.env.example`
- `package.json`
- `README.md`

## Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Add your Gemini API key in `.env`:

```env
GEMINI_API_KEY=your_real_api_key
GEMINI_MODEL=gemini-3-pro-image-preview
PORT=3000
```

> `GEMINI_MODEL` is configurable and defaults to `gemini-3-pro-image-preview` if omitted.

### 3) Run the app

```bash
npm start
```

Open:

- `http://localhost:3000`

## API Endpoint

### `POST /api/swap-face`

Multipart form fields:

- `baseImage` (required): thumbnail/base image
- `portraitImage` (required): portrait/head source image
- `extraInstructions` (optional): user prompt add-on

Server behavior:

- Validates file type (`jpeg/png/webp`) and size (max 10MB per file)
- Builds a robust default thumbnail face-swap prompt
- Appends `extraInstructions` if provided
- Sends both images and prompt to Gemini image model
- Parses image from Gemini response (with defensive fallback parsing)
- Returns `{ imageDataUrl }` for browser preview/download

## Prompting Strategy

The backend uses a strong default prompt:

> Edit the base thumbnail image by replacing the visible face/head of the person in the thumbnail with the face/head from the uploaded portrait image. Preserve the thumbnail composition, camera angle, crop, background, body pose, clothing, and overall thumbnail style as much as possible. Blend the new head naturally so it looks like a cohesive thumbnail image.

If the user adds extra instructions, they are appended under an "Extra instructions" section.

## Limitations

- Image editing quality may vary by source image quality, angle mismatch, occlusion, and model behavior.
- The model may occasionally return no editable image output; the app surfaces a helpful error in that case.
- Exact identity preservation is not guaranteed by generative systems.

## Responsible Use

Only upload images you have rights to use.

When editing people, respect:

- Consent
- Privacy
- Local laws and platform policies

Avoid deceptive or harmful uses.
