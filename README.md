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

#### Option 1: Deploy to Render.com (Recommended)

Render.com is the easiest platform for deploying Node.js applications with WebSockets:

1. Create an account at [Render.com](https://render.com)
2. Create a new Web Service and connect to your GitHub repository
3. Use these settings:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. Add these environment variables:
   - `NODE_ENV`: production
   - `PORT`: 10000 (Render will use its own PORT internally)

To set up automatic deployments with GitHub Actions:
1. Get a Render API token from the dashboard
2. Add these secrets to your GitHub repository:
   - `RENDER_TOKEN`: Your Render API token
   - `RENDER_SERVICE_ID`: Your Render service ID

#### Option 2: Deploy to Heroku

Heroku is well-suited for Node.js applications with WebSockets:

1. Create an account at [Heroku](https://heroku.com)
2. Create a new app
3. Get your Heroku API key from Account Settings
4. Add these secrets to your GitHub repository:
   - `HEROKU_API_KEY`: Your Heroku API key
   - `HEROKU_APP_NAME`: Your Heroku app name

#### Option 3: Deploy Locally with Docker

You can run the application in a Docker container:

```sh
# Build the Docker image
docker build -t atmos-app .

# Run the container
docker run -p 3001:3000 atmos-app
```

#### Option 4: Deploy on a VPS (Digital Ocean, AWS, etc.)

For production use with multiple users, a VPS is recommended:

1. SSH into your server
2. Clone the repository
3. Install dependencies: `npm install --production`
4. Run with PM2: `pm2 start server.js --name atmos`

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

