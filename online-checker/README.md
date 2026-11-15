# Online AI answer checker setup

The Android app works offline for lessons, MCQ checking, progress and the local reference-point self-check. Online written-answer feedback uses the Cloudflare Worker in `online-checker/worker.js`.

## Deploy from a phone

1. Sign in to Cloudflare and open Workers & Pages.
2. Create a Worker and paste the contents of `online-checker/worker.js`.
3. In Worker Settings → Variables and Secrets, add:
   - `OPENAI_API_KEY` as a **Secret** (never put this in the Android app or GitHub source).
   - `OPENAI_MODEL` as a text variable set to a model enabled for your API project.
4. Deploy the Worker.
5. Open `https://YOUR-WORKER.workers.dev/health`. It should return `{"ok":true,...}`.
6. In A/L Smart Study → Online AI answer assessment, paste the Worker URL and save it.

## Important safeguards

- API key stays on the Worker, not in the APK.
- The Worker uses the OpenAI Responses API and requests `store: false`.
- AI feedback is indicative tutoring feedback, not an official Department of Examinations mark.
- Configure Cloudflare rate limiting and usage/budget limits before sharing the Worker publicly. The starter Worker has input-size checks but does not implement per-student authentication or rate limiting.
- Never commit API keys to GitHub.
