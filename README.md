# AnyWave Landing Page

Landing page for AnyWave - Fit Any Music to Your Edit.

## Setup

1. Clone this repository
2. Open `index.html` in a browser, or serve with a local server:
   ```bash
   python3 -m http.server 8080
   ```
3. Visit `http://localhost:8080`

## Deployment

This site is configured for GitHub Pages with custom domain support.

### GitHub Pages Setup

1. Go to repository Settings → Pages
2. Select "Deploy from a branch" → "main" branch → "/ (root)"
3. Add custom domain in Pages settings
4. Add DNS records at your domain registrar (see GITHUB_PAGES_CUSTOM_DOMAIN.md)

## Files

- `index.html` - Main landing page
- `demo-video.mp4` - Primary demo video
- `demo-video2.mp4` - Secondary demo video
- `icon.png` - Site favicon
- `grass.png`, `grass2.png` - Decorative assets

## Email Integration

Uses EmailJS for early access email collection. Configure in `index.html`:
- `EMAILJS_SERVICE_ID`
- `EMAILJS_TEMPLATE_ID`
- `EMAILJS_PUBLIC_KEY`
- `DOWNLOAD_LINK`

See `EMAIL_SETUP.md` for detailed instructions.

