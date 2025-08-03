# DIGM Platform - GitHub Pages Deployment

This document outlines the deployment process for the DIGM Platform on GitHub Pages.

## Overview

The DIGM Platform is a decentralized audio marketplace and P2P radio application built with React and TypeScript. It's configured to deploy automatically to GitHub Pages when changes are pushed to the main branch.

## Deployment Configuration

### GitHub Pages Setup

1. **Repository Settings**: Go to your repository settings on GitHub
2. **Pages Section**: Navigate to Settings > Pages
3. **Source**: Select "GitHub Actions" as the source
4. **Branch**: The deployment will use the `gh-pages` branch automatically
5. **URL**: Your site will be available at https://usexfg.github.io/DIGM

### Automatic Deployment

The project uses GitHub Actions for continuous deployment:

- **Trigger**: Pushes to `main` or `master` branch
- **Build Process**: 
  - Installs Node.js 18
  - Installs dependencies from `frontend/package-lock.json`
  - Builds the React application
  - Deploys to GitHub Pages

### Manual Deployment

To deploy manually:

```bash
cd frontend
npm install
npm run build
npm run deploy
```

## Build Configuration

### Package.json Changes

The `frontend/package.json` has been updated with:

- `homepage`: Set to `https://usexfg.github.io/DIGM`
- `predeploy`: Script to build the application
- `deploy`: Script to deploy to GitHub Pages
- `gh-pages`: Development dependency for deployment

### Router Configuration

The application uses `HashRouter` instead of `BrowserRouter` for GitHub Pages compatibility, as GitHub Pages doesn't support client-side routing with `BrowserRouter`.

## Local Development

To run the application locally:

```bash
cd frontend
npm install
npm start
```

The application will be available at `http://localhost:3000`

## Production Build

To create a production build:

```bash
cd frontend
npm run build
```

The build artifacts will be stored in the `frontend/build/` directory.

## Troubleshooting

### Common Issues

1. **404 Errors on Refresh**: This is normal with HashRouter - the application handles routing client-side
2. **Build Failures**: Check that all dependencies are properly installed
3. **Deployment Delays**: GitHub Actions may take a few minutes to complete

### GitHub Pages Limitations

- No server-side rendering
- Limited to static file hosting
- No backend API support (use external APIs)
- HashRouter required for client-side routing

## Environment Variables

For production deployment, ensure any required environment variables are properly configured in the GitHub repository settings.

## Security Considerations

- API keys should be stored as GitHub Secrets
- Sensitive configuration should not be committed to the repository
- Use environment variables for configuration

## Monitoring

- Check GitHub Actions tab for deployment status
- Monitor GitHub Pages settings for any configuration issues
- Review build logs for any errors

## Support

For deployment issues:
1. Check GitHub Actions logs
2. Verify repository settings
3. Ensure all dependencies are properly configured
4. Review the build output for errors 