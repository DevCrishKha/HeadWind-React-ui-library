<<<<<<< HEAD
﻿# Simple Flask-SocketIO Backend for `@devcrish/headwind`
=======
# Simple Flask-SocketIO Backend for `@devcrish/headwind`
>>>>>>> Version2.1.1

This simple backend emits the component update payload to React over the `'renderReactUI'` event whenever you visit the `/send` route in your browser.

---

## 1. Run the Backend

```bash
cd example/backend
python app.py
```

The server will run on `http://localhost:5000`.

---

## 2. Trigger Updates in React

1. Open your React app in your browser (e.g. `http://localhost:5173`).
2. Open a new browser tab or navigate to:
   ```text
   http://localhost:5000/send
   ```
3. The backend immediately emits the SocketIO event `'renderReactUI'` with:
   ```json
   [
     {
       "id": "heading",
       "fontSize": 50,
       "fontWeight": 300,
       "solid": true
     },
     {
       "id": "formSubmitBtn",
       "varient": "Danger",
       "text": "Submit"
     }
   ]
   ```
4. Switch back to your React app tab: widget `heading` will now render with `fontSize: 50`, `fontWeight: 300`, and `solid: true`, and widget `formSubmitBtn` will render as a danger button with text `"Submit"`.
<<<<<<< HEAD
=======

---

## 3. Interacting with the AI Widget (`<UI.AIWidget />`)

The backend automatically listens for events emitted by `<UI.AIWidget />`:

* **Event received:** `'aiPrompt'`
  * Payload format:
    ```json
    {
      "prompt": "Change submit button color to red",
      "widgets": [
        {
          "id": "formSubmitBtn",
          "type": "Button",
          "position": { "x": 40, "y": 100 },
          "size": { "width": 140, "height": 44 }
        }
      ]
    }
    ```
* **Event emitted back:** `'aiResponse'`
  * Emits markdown response text to the AI Widget chat canvas:
    ```json
    {
      "markdown": "### 🤖 AI Assistant\nProcessed your prompt..."
    }
    ```
* **Saving UI (`💾 Save UI Changes to App.jsx`):**
  When clicked, the AI Widget emits the updated widget positions with the prompt `"Make this changes to the current UI"`. The backend logs the updated coordinates and replies with a summary.
>>>>>>> Version2.1.1
