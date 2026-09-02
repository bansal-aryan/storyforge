# Deployment and submission checklist

## Deploy to Vercel

1. Push a clean `main` branch to the public GitHub repository.
2. In Vercel, choose **Add New → Project** and import `bansal-aryan/storyforge`.
3. Use the Vite preset.
4. Set the install command to `pnpm install --frozen-lockfile`.
5. Set the build command to `pnpm build`.
6. Set the output directory to `dist`.
7. Deploy. No environment variables are required.

## Production verification

- The first page loads without login.
- The lore crawl can be skipped.
- `/?demo=1` opens directly on gameplay with the Agent panel visible.
- The WebMCP status reads available in a supported browser.
- The agent discovers `inspect_battlefield`, `explain_next_objective`, and `command_elias`.
- A `command_elias` call changes the HUD stance and appears in Agent activity.
- The full Sylvara → Seal → Portal path works.
- Refreshing preserves progress.
- A fresh profile begins from a clean save.

## Devpost hard gates

- Public live URL
- Public GitHub repository
- Detectable MIT license
- Public YouTube video under three minutes
- Audio explains the project and WebMCP implementation
- English project description
- Judge testing instructions
- Team members listed correctly

Finish and submit before September 3, 2026 at 1:00 PM Pacific Time.
