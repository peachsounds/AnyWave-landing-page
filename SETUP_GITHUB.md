# Setup GitHub Repository

Your landing page is ready to push to GitHub! Follow these steps:

## Step 1: Create GitHub Repository

1. **Go to GitHub:** https://github.com/new
2. **Repository name:** `dynamicmusicvst-landing` (or any name you prefer)
3. **Description:** "Landing page for AnyWave"
4. **Visibility:** Public (for free GitHub Pages) or Private
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. **Click "Create repository"**

## Step 2: Push Your Code

After creating the repository, GitHub will show you commands. Use these:

```bash
cd /Users/sarelduanis/Projects/dynamic_music_vst/landing-page

# Add the remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/dynamicmusicvst-landing.git

# Rename branch to main (if not already)
git branch -M main

# Push to GitHub
git push -u origin main
```

## Step 3: Enable GitHub Pages

1. **Go to your repository on GitHub**
2. **Settings** → **Pages** (left sidebar)
3. **Source:** Select "Deploy from a branch"
4. **Branch:** Select "main" and "/ (root)"
5. **Click Save**

Your site will be live at:
- `https://YOUR_USERNAME.github.io/dynamicmusicvst-landing/`

## Step 4: Add Custom Domain (Optional)

1. **Still in Settings → Pages**
2. **Custom domain:** Enter `peachsounds.com` (or your domain)
3. **Click Save**
4. **Add DNS records** at your domain registrar (see GITHUB_PAGES_CUSTOM_DOMAIN.md)

## Quick Command Reference

```bash
# Navigate to landing page directory
cd /Users/sarelduanis/Projects/dynamic_music_vst/landing-page

# Check status
git status

# Add changes
git add .

# Commit changes
git commit -m "Your commit message"

# Push to GitHub
git push
```

## Repository is Ready!

Your local repository is initialized and ready. Just:
1. Create the GitHub repo (Step 1)
2. Push the code (Step 2)
3. Enable Pages (Step 3)

That's it! 🚀

