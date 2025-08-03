# 🔄 Update GitHub Build Commands

Run these commands in your terminal to fix the build and trigger a new deployment:

## Step 1: Remove Large Audio Files
```bash
rm frontend/public/*.m4a frontend/public/*.mp3
```

## Step 2: Add All Changes
```bash
git add .
```

## Step 3: Commit Changes
```bash
git commit -m "fix: Simplify index.html and add .gitignore for build"
```

## Step 4: Push to Main Branch
```bash
git push origin main
```

## Step 5: Monitor Build
1. Go to: https://github.com/usexfg/DIGM/actions
2. Look for the "Deploy to GitHub Pages" workflow
3. Click on it to see build progress
4. Wait for completion (2-5 minutes)

## Expected Result
- ✅ Build should complete successfully
- ✅ Site will be available at: https://usexfg.github.io/DIGM
- ✅ No more "Could not find index.html" errors

## If Build Still Fails
1. Check the Actions tab for specific error messages
2. Verify all files are properly committed
3. Try running the commands one by one to identify any issues

---
**Copy and paste these commands into your terminal to update the build.** 