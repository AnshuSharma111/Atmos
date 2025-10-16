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

This project is automatically deployed to GitHub Pages when changes are pushed to the main branch.

### Manual Deployment

If you need to manually deploy the project:

1. Install development dependencies:
   ```
   npm install
   ```

2. Deploy to GitHub Pages:
   ```
   npm run deploy
   ```

### Automatic Deployment

The project uses GitHub Actions for automatic deployment:

1. Push your changes to the main branch
   ```
   git add .
   git commit -m "Your message"
   git push origin main
   ```

2. GitHub Actions will automatically build and deploy the project
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

