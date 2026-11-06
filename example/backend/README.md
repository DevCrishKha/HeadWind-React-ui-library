# Simple Flask-SocketIO Backend for `@devcrish/headwind`

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
