# 🚀 Easy GitHub Pages Setup

Since the branch setup is tricky, here's the SIMPLEST way:

## Option 1: Use GitHub Actions (Recommended)

I've created a GitHub Actions workflow file. Just merge it:

1. Go to your repo: https://github.com/masaitrevis/fleet-system
2. Click **"Actions"** tab
3. Click **"New workflow"**
4. Click **"set up a workflow yourself"**
5. Paste this:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ master ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Build Frontend
        run: |
          cd frontend
          npm install
          npm run build
          
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./frontend/dist
```

6. Click **"Commit changes"**
7. GitHub will automatically build and deploy!

---

## Option 2: Manual Upload (Fastest)

1. Go to https://github.com/masaitrevis/fleet-system
2. Click **"Settings"** → **"Pages"**
3. Select **"Deploy from a branch"**
4. Select **"main"** branch (not master)
5. Select **"/ (root)"** folder
6. Click **Save**

Then create a `docs` folder:
```bash
# On your computer:
mkdir docs
cp -r frontend/dist/* docs/
git add docs
git commit -m "Add docs for GitHub Pages"
git push
```

Then in GitHub Pages settings, change folder to **"/docs"**

---

## Option 3: Netlify (Easiest - No GitHub Pages needed)

1. Go to https://app.netlify.com/drop
2. Drag and drop your `frontend/dist` folder
3. Get instant URL!

---

## Option 4: Use Vercel CLI (Bypass Limits)

```bash
npm i -g vercel
vercel --version  # Check if you have deploys left

# If not, create new account with different email
```

---

**I recommend Option 1 (GitHub Actions) - it's automatic!**

Want me to create the Actions file for you? ❤️‍🔥
