# React-@devcrish/headwind Library Version 2.1.1
In this version we are going to add these following functionalities.

- #### A major update, looking at the vibe coding aspect while using this library. Adding an AI Widget where AI can now see the UI in real-time while being edited by the user just click the save button in the AIWidget and configure the socket events properly in the AIWidget.

## 1. AI Widget
- Added a special kind of widget called an AIWidget to help you vibe code your frontend on the go with a visual experience. Get the dragging & Resizing functionality of @devcrish/headwind along with the capability to vibe code your frontend where your AI agent can see the whole frontend and also the changes you make so you don't have to copy paste jsx from the InspectorPanel.
- Your AI listens on socketIO event `sendPromptEvent` & sends response on event `receiveResponseEvent`.
Your backend received logs in `getLogsEvent` which is what prompt you send from the frontend and what reply the AI gave.

## 2. InspectorPanel Color Pallete
- Inspector Pannel now gets a color pallete which is a handy feature to check different color combinations in not-deployed mode. You can then copy the jsx from the InspectorPanel or click save on the AIWidget.

## 3. Appearance of Canvas 
- Currently no other HTML element is visible on the page when added above or below the root-div in the index.html. Need to change that. Need to have options on how Canvas is presented on the webpage.
