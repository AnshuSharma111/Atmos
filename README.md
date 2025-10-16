# Atmos Monitoring System

Simple WebRTC-based multi-camera monitoring system.

## Setup

1. Install dependencies:
   ```
   npm install express socket.io cors multer
   ```

## Running

1. Start the server:
   ```
   node server.js
   ```

2. Open the web viewer:
   ```
   http://localhost:3001/viewer.html
   ```

## Deployment

This project is set up for automatic deployment when changes are pushed to the main branch.

### Deployment Options

The project is configured for multiple deployment platforms. Choose one based on your needs:

#### Option 1: Railway.app (Recommended for Node.js)

1. Create an account on [Railway.app](https://railway.app)
2. Create a new project
3. Add a GitHub integration to your Railway project
4. Generate a deployment token
5. Add the token as a secret in your GitHub repository:
   - Go to your GitHub repository → Settings → Secrets → New repository secret
   - Name: `RAILWAY_TOKEN`
   - Value: [Your Railway Token]
6. Set a repository variable:
   - Go to your GitHub repository → Settings → Variables → New repository variable
   - Name: `DEPLOY_TO_RAILWAY`
   - Value: `true`

#### Option 2: Render.com

1. Create an account on [Render.com](https://render.com)
2. Create a new Web Service linked to your GitHub repository
3. Generate a Render API key
4. Add the key as a secret in your GitHub repository:
   - Name: `RENDER_TOKEN`
   - Value: [Your Render API Key]
5. Set these repository variables:
   - `DEPLOY_TO_RENDER`: `true`
   - `RENDER_SERVICE_ID`: [Your Render Service ID]

### Manual Deployment

To manually deploy the project:

1. Push your changes to your repository
   ```
   git add .
   git commit -m "Your changes"
   git push upstream main
   ```

2. GitHub Actions will automatically deploy your application to the configured platform
   ```
   http://YOUR_SERVER_IP:3001
   ```

3. Run the mobile app on your device

## Features

- Multiple mobile devices can stream to a single web viewer
- Real-time video streaming using WebRTC
- Simple interface for mobile broadcasters
- Grid layout for monitoring multiple cameras

## React Native App Setup

1. Start Metro:
   ```
   npm start
   ```

2. Build and run the app:
   ```
   # For Android
   npm run android
   
   # For iOS
   npm run ios
   ```

First, you will need to run **Metro**, the JavaScript build tool for React Native.

## Troubleshooting

- Make sure all devices are on the same network
- Check that the SERVER_URL in App.tsx has the correct IP address
- Ensure camera and microphone permissions are granted on mobile devices
- If you encounter connection issues, restart the server and refresh the web viewer

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install


## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).

