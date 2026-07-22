# Shoelace Algorithm & New Theory Visualizer (2D / 3D)

An interactive web application designed to calculate polygon areas using the **Shoelace Algorithm** (2D & 3D) and simulate King Bhumibol Adulyadej's **New Theory (ทฤษฎีใหม่)** agricultural land division (30:30:30:10 ratio) on arbitrary quadrilaterals.

👉 **Live Demo:** [https://hot-signs-try.loca.lt](https://hot-signs-try.loca.lt) *(Temporary localtunnel link)*

---

## 🌟 Key Features

1. **Polygon Area Calculation (2D & 3D)**:
   - Dynamic point addition for any 2D polygon.
   - Interactive 2D Canvas with auto-scaling grids, arrows representing winding directions, and coordinate labels.
   - 3D coordinate space with **Orbit Controls** (scroll to zoom, drag to rotate) and an **infinite-feel procedural shader grid**.
   - Step-by-step math breakdowns and detailed Shoelace calculation matrices.

2. **King's New Theory (ทฤษฎีใหม่) Simulation**:
   - Split arbitrary quadrilaterals into zones: **Housing (10%)**, **Mixed Crops (30%)**, **Rice Paddy (30%)**, and **Water Reservoir (30%)** (default presets).
   - Fully customizable zones: Add, delete, rename, change percentages, rearrange heights, or select custom emoji icons/colors.
   - Adjustable terrain slope angle (0° to 89°) and directional sweep (W→E, E→W, N→S, S→N).
   - **Gravity-based water collection**: Water reservoir is positioned at the lowest elevation to collect runoff, visualized with a 3D water flow indicator arrow.

---

## 🚀 How to Run Locally

Since this is a client-side static web application, it does not require a complex build process.

1. Clone or download the files.
2. Open `index.html` in any modern web browser.
3. (Optional) Run a local static server:
   ```bash
   npx http-server . -p 8080
   ```

---

## 🌐 Deploy to GitHub Pages (Free Hosting)

To share this app with others permanently on GitHub:

1. **Create a GitHub Repository**:
   - Go to [github.new](https://github.new).
   - Name your repository (e.g., `shoelace-algorithm-visualizer`).
   - Keep it **Public** and click **Create repository**.

2. **Upload Files**:
   - Drag and drop these 5 files into your GitHub repository page:
     - `index.html`
     - `style.css`
     - `app.js`
     - `newtheory.js`
     - `README.md`
   - Click **Commit changes**.

3. **Enable GitHub Pages**:
   - In your repository, go to the **Settings** tab.
   - Click **Pages** in the left sidebar under the "Code and automation" section.
   - Under **Build and deployment** -> **Source**, select **Deploy from a branch**.
   - Set the branch dropdown to **`main`** (or `master`) and the folder to **`/ (root)`**.
   - Click **Save**.
   - Wait 1-2 minutes. GitHub will display a message at the top of the Pages section: *"Your site is live at..."*

---

## 📐 Mathematics Used

- **Shoelace Formula (Gauss's Area Formula)**:
  $$A = \frac{1}{2} \left| \sum_{i=1}^{n-1} (x_i y_{i+1} - x_{i+1} y_i) + (x_n y_1 - x_1 y_n) \right|$$

- **3D Polygon Cross Product Method**:
  $$\vec{A} = \frac{1}{2} \sum_{i=1}^{n} (\vec{P}_i \times \vec{P}_{i+1})$$
  $$Area = \|\vec{A}\|$$

- **Quadratic Zone Splitting Boundary Solver**:
  $$\left( \frac{m_{\text{upper}} - m_{\text{lower}}}{2} \right)u^2 + (c_{\text{upper}} - c_{\text{lower}})u - A_{\text{target}} = 0$$
