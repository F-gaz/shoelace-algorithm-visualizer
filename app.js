// ===== Shoelace Algorithm Visualizer — app.js =====

(function () {
    'use strict';

    // ===== State =====
    const state = {
        mode: '2d',           // '2d' or '3d'
        points: [],           // Array of {x, y, z}
        showGrid: true,
        showLabels: true,
        area: null,
        steps: [],
    };

    // ===== DOM Refs =====
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const btn2D = $('#btn-2d');
    const btn3D = $('#btn-3d');
    const toggleSlider = $('#toggle-slider');
    const coordRows = $('#coord-rows');
    const inputRowHeader = $('.input-row-header');
    const zHeader = $('#z-header');
    const pointCount = $('#point-count');
    const btnAddPoint = $('#btn-add-point');
    const btnClearAll = $('#btn-clear-all');
    const btnCalculate = $('#btn-calculate');
    const btnResetView = $('#btn-reset-view');
    const btnToggleGrid = $('#btn-toggle-grid');
    const btnToggleLabels = $('#btn-toggle-labels');
    const vizLabel = $('#viz-label');
    const vizContainer = $('#viz-container');
    const vizOverlay = $('#viz-overlay');
    const canvas2D = $('#canvas-2d');
    const threeContainer = $('#three-container');
    const areaValue = $('#area-value');
    const stepsContainer = $('#steps-container');
    const matrixContainer = $('#matrix-container');
    const formulaCard = $('#formula-card');
    const presetGrid = $('#preset-grid');

    const btnNT = $('#btn-nt');
    const ntInputPanel = $('#nt-input-panel');
    const ntResultPanel = $('#nt-result-panel');
    const ntViewToggle = $('#nt-view-toggle');
    const ntVizDivider = $('#nt-viz-divider');
    const ntBtnView2D = $('#nt-btn-view-2d');
    const ntBtnView3D = $('#nt-btn-view-3d');
    const inputPanel = $('#input-panel');
    const resultPanel = $('#result-panel');

    const ctx = canvas2D.getContext('2d');

    // ===== Three.js vars =====
    let threeScene, threeCamera, threeRenderer, threeControls;
    let threeInitialized = false;
    let threeAnimId = null;

    // ===== Color palette for points =====
    const POINT_COLORS = [
        '#a78bfa', '#818cf8', '#6366f1', '#8b5cf6', '#a855f7',
        '#c084fc', '#e879f9', '#f472b6', '#fb7185', '#f97316',
        '#fbbf24', '#34d399', '#22d3ee', '#38bdf8', '#60a5fa',
    ];

    function getPointColor(i) {
        return POINT_COLORS[i % POINT_COLORS.length];
    }

    // ===== Presets =====
    const PRESETS_2D = [
        {
            name: 'Triangle',
            points: [
                { x: 0, y: 0 },
                { x: 4, y: 0 },
                { x: 2, y: 3 },
            ],
        },
        {
            name: 'Square',
            points: [
                { x: 0, y: 0 },
                { x: 4, y: 0 },
                { x: 4, y: 4 },
                { x: 0, y: 4 },
            ],
        },
        {
            name: 'Pentagon',
            points: (() => {
                const pts = [];
                for (let i = 0; i < 5; i++) {
                    const angle = (Math.PI / 2) + (2 * Math.PI * i) / 5;
                    pts.push({
                        x: Math.round(3 * Math.cos(angle) * 100) / 100,
                        y: Math.round(3 * Math.sin(angle) * 100) / 100,
                    });
                }
                return pts;
            })(),
        },
        {
            name: 'Star',
            points: (() => {
                const pts = [];
                for (let i = 0; i < 10; i++) {
                    const angle = (Math.PI / 2) + (2 * Math.PI * i) / 10;
                    const r = i % 2 === 0 ? 4 : 1.8;
                    pts.push({
                        x: Math.round(r * Math.cos(angle) * 100) / 100,
                        y: Math.round(r * Math.sin(angle) * 100) / 100,
                    });
                }
                return pts;
            })(),
        },
        {
            name: 'L-Shape',
            points: [
                { x: 0, y: 0 },
                { x: 2, y: 0 },
                { x: 2, y: 3 },
                { x: 4, y: 3 },
                { x: 4, y: 5 },
                { x: 0, y: 5 },
            ],
        },
        {
            name: 'Arrow',
            points: [
                { x: 0, y: 1 },
                { x: 3, y: 1 },
                { x: 3, y: 0 },
                { x: 5, y: 2 },
                { x: 3, y: 4 },
                { x: 3, y: 3 },
                { x: 0, y: 3 },
            ],
        },
    ];

    const PRESETS_3D = [
        {
            name: 'Triangle (XY)',
            points: [
                { x: 0, y: 0, z: 0 },
                { x: 4, y: 0, z: 0 },
                { x: 2, y: 3, z: 0 },
            ],
        },
        {
            name: 'Square (XY)',
            points: [
                { x: 0, y: 0, z: 0 },
                { x: 4, y: 0, z: 0 },
                { x: 4, y: 4, z: 0 },
                { x: 0, y: 4, z: 0 },
            ],
        },
        {
            name: 'Tilted Triangle',
            points: [
                { x: 0, y: 0, z: 0 },
                { x: 4, y: 0, z: 1 },
                { x: 2, y: 3, z: 2 },
            ],
        },
        {
            name: 'Tilted Square',
            points: [
                { x: 0, y: 0, z: 0 },
                { x: 4, y: 0, z: 1 },
                { x: 4, y: 4, z: 3 },
                { x: 0, y: 4, z: 2 },
            ],
        },
        {
            name: 'Pentagon (XZ)',
            points: (() => {
                const pts = [];
                for (let i = 0; i < 5; i++) {
                    const angle = (Math.PI / 2) + (2 * Math.PI * i) / 5;
                    pts.push({
                        x: Math.round(3 * Math.cos(angle) * 100) / 100,
                        y: 0,
                        z: Math.round(3 * Math.sin(angle) * 100) / 100,
                    });
                }
                return pts;
            })(),
        },
        {
            name: 'Hexagon (3D)',
            points: (() => {
                const pts = [];
                for (let i = 0; i < 6; i++) {
                    const angle = (2 * Math.PI * i) / 6;
                    pts.push({
                        x: Math.round(3 * Math.cos(angle) * 100) / 100,
                        y: Math.round(1.5 * Math.sin(angle) * 100) / 100,
                        z: Math.round(3 * Math.sin(angle) * 100) / 100,
                    });
                }
                return pts;
            })(),
        },
    ];

    // ===== Initialize =====
    function init() {
        renderPresets();
        addInitialPoints();
        bindEvents();
        resizeCanvas2D();
        updatePointCount();
        render();

        btnToggleGrid.classList.add('active');
        btnToggleLabels.classList.add('active');

        if (btnNT) {
            btnNT.addEventListener('click', () => setMode('newtheory'));
            ntBtnView2D.addEventListener('click', () => setNTSubMode('2d'));
            ntBtnView3D.addEventListener('click', () => setNTSubMode('3d'));
        }
        if (typeof NewTheory !== 'undefined') NewTheory.init();

        window.addEventListener('newtheory-updated', () => {
            if (state.mode === 'newtheory') {
                renderNT();
            }
        });

        window.addEventListener('resize', onResize);
    }

    function addInitialPoints() {
        for (let i = 0; i < 3; i++) {
            addPointRow();
        }
    }

    // ===== Mode Toggle =====
    function setMode(mode) {
        if (state.mode === 'newtheory' && mode !== 'newtheory') {
            if (typeof NewTheory !== 'undefined') NewTheory.onDeactivate();
        }
        state.mode = mode;

        if (mode === '2d') {
            btn2D.classList.add('active');
            btn3D.classList.remove('active');
            if (btnNT) btnNT.classList.remove('active');
            toggleSlider.className = 'toggle-slider pos-0';
            vizLabel.textContent = '2D Polygon View';

            if (inputPanel) inputPanel.classList.remove('hidden');
            if (resultPanel) resultPanel.classList.remove('hidden');
            if (ntInputPanel) ntInputPanel.classList.add('hidden');
            if (ntResultPanel) ntResultPanel.classList.add('hidden');
            if (ntViewToggle) ntViewToggle.classList.add('hidden');
            if (ntVizDivider) ntVizDivider.classList.add('hidden');

            canvas2D.classList.remove('hidden');
            threeContainer.classList.add('hidden');
            inputRowHeader.classList.remove('show-z');

            document.querySelectorAll('.coord-row').forEach(r => r.classList.remove('show-z'));

            if (threeAnimId) {
                cancelAnimationFrame(threeAnimId);
                threeAnimId = null;
            }

            resizeCanvas2D();
        } else if (mode === '3d') {
            btn2D.classList.remove('active');
            btn3D.classList.add('active');
            if (btnNT) btnNT.classList.remove('active');
            toggleSlider.className = 'toggle-slider pos-1';
            vizLabel.textContent = '3D Polygon View';

            if (inputPanel) inputPanel.classList.remove('hidden');
            if (resultPanel) resultPanel.classList.remove('hidden');
            if (ntInputPanel) ntInputPanel.classList.add('hidden');
            if (ntResultPanel) ntResultPanel.classList.add('hidden');
            if (ntViewToggle) ntViewToggle.classList.add('hidden');
            if (ntVizDivider) ntVizDivider.classList.add('hidden');

            canvas2D.classList.add('hidden');
            threeContainer.classList.remove('hidden');
            inputRowHeader.classList.add('show-z');

            document.querySelectorAll('.coord-row').forEach(r => r.classList.add('show-z'));

            if (!threeInitialized) {
                initThreeJS();
            } else {
                onResize();
            }
            animateThree();
        } else if (mode === 'newtheory') {
            btn2D.classList.remove('active');
            btn3D.classList.remove('active');
            if (btnNT) btnNT.classList.add('active');
            toggleSlider.className = 'toggle-slider pos-2';
            vizLabel.textContent = 'ทฤษฎีใหม่ (New Theory)';

            if (inputPanel) inputPanel.classList.add('hidden');
            if (resultPanel) resultPanel.classList.add('hidden');
            if (ntInputPanel) ntInputPanel.classList.remove('hidden');
            if (ntResultPanel) ntResultPanel.classList.remove('hidden');
            if (ntViewToggle) ntViewToggle.classList.remove('hidden');
            if (ntVizDivider) ntVizDivider.classList.remove('hidden');

            if (typeof NewTheory !== 'undefined') {
                NewTheory.onActivate();
                setNTSubMode(NewTheory.getState().subMode || '2d');
            }
            return;
        }

        state.area = null;
        areaValue.textContent = '—';
        areaValue.classList.remove('calculated');
        stepsContainer.innerHTML = '<div class="step-placeholder">Calculate to see step-by-step breakdown</div>';
        matrixContainer.innerHTML = '<div class="step-placeholder">Calculate to see the matrix</div>';
        updateFormula();
        renderPresets();
        readPointsFromUI();
        render();
    }

    function updateFormula() {
        if (state.mode === '2d') {
            formulaCard.innerHTML = `
                <div class="formula-tex">
                    A = ½ |Σ (x<sub>i</sub> · y<sub>i+1</sub> − x<sub>i+1</sub> · y<sub>i</sub>)|
                </div>
            `;
        } else {
            formulaCard.innerHTML = `
                <div class="formula-tex">
                    A = ½ |Σ (P<sub>i</sub> × P<sub>i+1</sub>)|
                    <br><small style="color: var(--text-muted); font-size: 0.75em;">3D Cross Product Method</small>
                </div>
            `;
        }
    }

    // ===== Point Row Management =====
    function addPointRow(x = '', y = '', z = '') {
        const index = coordRows.children.length;
        const row = document.createElement('div');
        row.className = 'coord-row' + (state.mode === '3d' ? ' show-z' : '');
        row.innerHTML = `
            <div class="row-index" style="border-color: ${getPointColor(index)}; color: ${getPointColor(index)}">${index + 1}</div>
            <input type="number" class="coord-input x-input" placeholder="x" value="${x}" step="any" id="coord-x-${index}">
            <input type="number" class="coord-input y-input" placeholder="y" value="${y}" step="any" id="coord-y-${index}">
            <input type="number" class="coord-input z-input" placeholder="z" value="${z}" step="any" id="coord-z-${index}">
            <button class="btn-remove-row" title="Remove" id="btn-remove-${index}">✕</button>
        `;
        coordRows.appendChild(row);
        updatePointCount();

        // Bind events for the new row
        row.querySelector('.btn-remove-row').addEventListener('click', () => {
            row.style.animation = 'rowSlideIn 0.2s ease-in reverse';
            setTimeout(() => {
                row.remove();
                reindexRows();
                updatePointCount();
                readPointsFromUI();
                render();
            }, 180);
        });

        const inputs = row.querySelectorAll('.coord-input');
        inputs.forEach(inp => {
            inp.addEventListener('input', () => {
                readPointsFromUI();
                render();
            });
            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    btnCalculate.click();
                }
            });
        });

        return row;
    }

    function reindexRows() {
        const rows = coordRows.querySelectorAll('.coord-row');
        rows.forEach((row, i) => {
            const idx = row.querySelector('.row-index');
            idx.textContent = i + 1;
            idx.style.borderColor = getPointColor(i);
            idx.style.color = getPointColor(i);

            row.querySelector('.x-input').id = `coord-x-${i}`;
            row.querySelector('.y-input').id = `coord-y-${i}`;
            row.querySelector('.z-input').id = `coord-z-${i}`;
            row.querySelector('.btn-remove-row').id = `btn-remove-${i}`;
        });
    }

    function updatePointCount() {
        const count = coordRows.children.length;
        pointCount.textContent = `${count} point${count !== 1 ? 's' : ''}`;
    }

    function readPointsFromUI() {
        const rows = coordRows.querySelectorAll('.coord-row');
        state.points = [];
        rows.forEach(row => {
            const x = parseFloat(row.querySelector('.x-input').value);
            const y = parseFloat(row.querySelector('.y-input').value);
            const z = parseFloat(row.querySelector('.z-input').value);
            if (!isNaN(x) && !isNaN(y)) {
                state.points.push({
                    x,
                    y,
                    z: isNaN(z) ? 0 : z,
                });
            }
        });
    }

    function clearAllPoints() {
        coordRows.innerHTML = '';
        state.points = [];
        state.area = null;
        areaValue.textContent = '—';
        areaValue.classList.remove('calculated');
        stepsContainer.innerHTML = '<div class="step-placeholder">Calculate to see step-by-step breakdown</div>';
        matrixContainer.innerHTML = '<div class="step-placeholder">Calculate to see the matrix</div>';
        updatePointCount();
        addPointRow();
        addPointRow();
        addPointRow();
        render();
    }

    function loadPreset(preset) {
        coordRows.innerHTML = '';
        preset.points.forEach(p => {
            addPointRow(p.x, p.y, p.z !== undefined ? p.z : '');
        });
        readPointsFromUI();
        render();
    }

    // ===== Presets Rendering =====
    function renderPresets() {
        const presets = state.mode === '2d' ? PRESETS_2D : PRESETS_3D;
        presetGrid.innerHTML = '';
        presets.forEach((preset, i) => {
            const btn = document.createElement('button');
            btn.className = 'preset-btn';
            btn.textContent = preset.name;
            btn.id = `preset-${i}`;
            btn.addEventListener('click', () => loadPreset(preset));
            presetGrid.appendChild(btn);
        });
    }

    // ===== Shoelace Calculation =====
    function calculateShoelace2D() {
        const pts = state.points;
        if (pts.length < 3) return;

        const n = pts.length;
        let sum = 0;
        const steps = [];

        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const cross = pts[i].x * pts[j].y - pts[j].x * pts[i].y;
            sum += cross;
            steps.push({
                i: i,
                j: j,
                xi: pts[i].x,
                yi: pts[i].y,
                xj: pts[j].x,
                yj: pts[j].y,
                cross: cross,
            });
        }

        state.area = Math.abs(sum) / 2;
        state.steps = steps;
        return { area: state.area, sum, steps };
    }

    function calculateShoelace3D() {
        const pts = state.points;
        if (pts.length < 3) return;

        const n = pts.length;
        // Cross product method for 3D polygon area
        // Area = 0.5 * |sum of (Pi x Pi+1)|
        let cx = 0, cy = 0, cz = 0;
        const steps = [];

        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const crossX = pts[i].y * pts[j].z - pts[i].z * pts[j].y;
            const crossY = pts[i].z * pts[j].x - pts[i].x * pts[j].z;
            const crossZ = pts[i].x * pts[j].y - pts[i].y * pts[j].x;
            cx += crossX;
            cy += crossY;
            cz += crossZ;
            steps.push({
                i, j,
                pi: pts[i],
                pj: pts[j],
                crossX, crossY, crossZ,
            });
        }

        const area = 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
        state.area = area;
        state.steps = steps;
        return { area, cx, cy, cz, steps };
    }

    function calculate() {
        readPointsFromUI();

        if (state.points.length < 3) {
            areaValue.textContent = '—';
            areaValue.classList.remove('calculated');
            stepsContainer.innerHTML = '<div class="step-placeholder">Need at least 3 valid points</div>';
            matrixContainer.innerHTML = '<div class="step-placeholder">Need at least 3 valid points</div>';
            return;
        }

        let result;
        if (state.mode === '2d') {
            result = calculateShoelace2D();
            renderSteps2D(result);
            renderMatrix2D(result);
        } else {
            result = calculateShoelace3D();
            renderSteps3D(result);
            renderMatrix3D(result);
        }

        // Animate area display
        areaValue.textContent = result.area.toFixed(4);
        areaValue.classList.remove('calculated');
        void areaValue.offsetWidth; // force reflow
        areaValue.classList.add('calculated');

        render();
    }

    // ===== Render Steps =====
    function renderSteps2D(result) {
        const { steps, sum } = result;
        let html = '';
        steps.forEach((s, idx) => {
            html += `
                <div class="step-item" style="animation-delay: ${idx * 60}ms">
                    <div class="step-num">${idx + 1}</div>
                    <div class="step-content">
                        <div class="step-expr">
                            (${fmt(s.xi)} × ${fmt(s.yj)}) − (${fmt(s.xj)} × ${fmt(s.yi)})
                        </div>
                        <div class="step-result">= ${fmt(s.cross)}</div>
                    </div>
                </div>
            `;
        });

        html += `
            <div class="step-item step-total" style="animation-delay: ${steps.length * 60}ms">
                <div class="step-num">Σ</div>
                <div class="step-content">
                    <div class="step-expr">Sum = ${fmt(sum)}</div>
                    <div class="step-result">Area = ½ × |${fmt(sum)}| = ${fmt(result.area)}</div>
                </div>
            </div>
        `;
        stepsContainer.innerHTML = html;
    }

    function renderSteps3D(result) {
        const { steps, cx, cy, cz } = result;
        let html = '';
        steps.forEach((s, idx) => {
            html += `
                <div class="step-item" style="animation-delay: ${idx * 60}ms">
                    <div class="step-num">${idx + 1}</div>
                    <div class="step-content">
                        <div class="step-expr">
                            P${s.i + 1} × P${s.j + 1}
                        </div>
                        <div class="step-result">= (${fmt(s.crossX)}, ${fmt(s.crossY)}, ${fmt(s.crossZ)})</div>
                    </div>
                </div>
            `;
        });

        const mag = Math.sqrt(cx * cx + cy * cy + cz * cz);
        html += `
            <div class="step-item step-total" style="animation-delay: ${steps.length * 60}ms">
                <div class="step-num">Σ</div>
                <div class="step-content">
                    <div class="step-expr">Sum = (${fmt(cx)}, ${fmt(cy)}, ${fmt(cz)})</div>
                    <div class="step-expr">|Sum| = ${fmt(mag)}</div>
                    <div class="step-result">Area = ½ × ${fmt(mag)} = ${fmt(result.area)}</div>
                </div>
            </div>
        `;
        stepsContainer.innerHTML = html;
    }

    function renderMatrix2D(result) {
        const pts = state.points;
        const n = pts.length;
        let html = '<table class="shoelace-matrix"><thead><tr>';
        html += '<th>i</th><th>x<sub>i</sub></th><th>y<sub>i</sub></th>';
        html += '<th>x<sub>i</sub>·y<sub>i+1</sub></th><th>x<sub>i+1</sub>·y<sub>i</sub></th><th>Diff</th>';
        html += '</tr></thead><tbody>';

        result.steps.forEach((s, idx) => {
            const prod1 = s.xi * s.yj;
            const prod2 = s.xj * s.yi;
            html += `<tr>
                <td>${idx + 1}</td>
                <td class="val-coord">${fmt(s.xi)}</td>
                <td class="val-coord">${fmt(s.yi)}</td>
                <td class="${prod1 >= 0 ? 'val-positive' : 'val-negative'}">${fmt(prod1)}</td>
                <td class="${prod2 >= 0 ? 'val-positive' : 'val-negative'}">${fmt(prod2)}</td>
                <td class="${s.cross >= 0 ? 'val-positive' : 'val-negative'}">${fmt(s.cross)}</td>
            </tr>`;
        });

        html += '</tbody></table>';
        matrixContainer.innerHTML = html;
    }

    function renderMatrix3D(result) {
        const pts = state.points;
        let html = '<table class="shoelace-matrix"><thead><tr>';
        html += '<th>i</th><th>x</th><th>y</th><th>z</th>';
        html += '<th>Cross X</th><th>Cross Y</th><th>Cross Z</th>';
        html += '</tr></thead><tbody>';

        result.steps.forEach((s, idx) => {
            html += `<tr>
                <td>${idx + 1}</td>
                <td class="val-coord">${fmt(s.pi.x)}</td>
                <td class="val-coord">${fmt(s.pi.y)}</td>
                <td class="val-coord">${fmt(s.pi.z)}</td>
                <td class="${s.crossX >= 0 ? 'val-positive' : 'val-negative'}">${fmt(s.crossX)}</td>
                <td class="${s.crossY >= 0 ? 'val-positive' : 'val-negative'}">${fmt(s.crossY)}</td>
                <td class="${s.crossZ >= 0 ? 'val-positive' : 'val-negative'}">${fmt(s.crossZ)}</td>
            </tr>`;
        });

        html += '</tbody></table>';
        matrixContainer.innerHTML = html;
    }

    function fmt(val) {
        if (Number.isInteger(val)) return val.toString();
        return parseFloat(val.toFixed(4)).toString();
    }

    // ===== 2D Canvas Rendering =====
    function resizeCanvas2D() {
        const rect = vizContainer.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas2D.width = rect.width * dpr;
        canvas2D.height = rect.height * dpr;
        canvas2D.style.width = rect.width + 'px';
        canvas2D.style.height = rect.height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function render() {
        if (state.mode === 'newtheory') {
            renderNT();
            return;
        }

        if (state.mode === '2d') {
            render2D();
        } else {
            render3D();
        }

        // Show/hide overlay
        if (state.points.length < 3) {
            vizOverlay.classList.remove('hidden');
        } else {
            vizOverlay.classList.add('hidden');
        }
    }

    function render2D() {
        const w = vizContainer.clientWidth;
        const h = vizContainer.clientHeight;
        ctx.clearRect(0, 0, w, h);

        if (state.points.length < 2) return;

        // Calculate bounds
        const pts = state.points;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        pts.forEach(p => {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        });

        const rangeX = maxX - minX || 1;
        const rangeY = maxY - minY || 1;
        const padding = 80;
        const scaleX = (w - padding * 2) / rangeX;
        const scaleY = (h - padding * 2) / rangeY;
        const scale = Math.min(scaleX, scaleY);

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        function toScreen(px, py) {
            return {
                sx: w / 2 + (px - centerX) * scale,
                sy: h / 2 - (py - centerY) * scale, // flip y
            };
        }

        // Draw grid
        if (state.showGrid) {
            drawGrid2D(w, h, centerX, centerY, scale, toScreen);
        }

        // Draw filled polygon
        if (pts.length >= 3) {
            ctx.beginPath();
            const first = toScreen(pts[0].x, pts[0].y);
            ctx.moveTo(first.sx, first.sy);
            for (let i = 1; i < pts.length; i++) {
                const p = toScreen(pts[i].x, pts[i].y);
                ctx.lineTo(p.sx, p.sy);
            }
            ctx.closePath();

            // Gradient fill
            const grad = ctx.createLinearGradient(0, 0, w, h);
            grad.addColorStop(0, 'rgba(139, 92, 246, 0.12)');
            grad.addColorStop(0.5, 'rgba(99, 102, 241, 0.08)');
            grad.addColorStop(1, 'rgba(34, 211, 238, 0.06)');
            ctx.fillStyle = grad;
            ctx.fill();

            // Edge stroke
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw edges with direction arrows
        for (let i = 0; i < pts.length; i++) {
            const j = (i + 1) % pts.length;
            const from = toScreen(pts[i].x, pts[i].y);
            const to = toScreen(pts[j].x, pts[j].y);

            // Edge line
            ctx.beginPath();
            ctx.moveTo(from.sx, from.sy);
            ctx.lineTo(to.sx, to.sy);
            ctx.strokeStyle = getPointColor(i);
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.7;
            ctx.stroke();
            ctx.globalAlpha = 1;

            // Direction arrow
            const mx = (from.sx + to.sx) / 2;
            const my = (from.sy + to.sy) / 2;
            const angle = Math.atan2(to.sy - from.sy, to.sx - from.sx);
            const arrowSize = 8;
            ctx.beginPath();
            ctx.moveTo(mx + arrowSize * Math.cos(angle), my + arrowSize * Math.sin(angle));
            ctx.lineTo(mx + arrowSize * Math.cos(angle + 2.5), my + arrowSize * Math.sin(angle + 2.5));
            ctx.lineTo(mx + arrowSize * Math.cos(angle - 2.5), my + arrowSize * Math.sin(angle - 2.5));
            ctx.closePath();
            ctx.fillStyle = getPointColor(i);
            ctx.globalAlpha = 0.6;
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Draw points
        pts.forEach((p, i) => {
            const s = toScreen(p.x, p.y);

            // Outer glow
            const glow = ctx.createRadialGradient(s.sx, s.sy, 0, s.sx, s.sy, 18);
            glow.addColorStop(0, getPointColor(i) + '40');
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.fillRect(s.sx - 18, s.sy - 18, 36, 36);

            // Point circle
            ctx.beginPath();
            ctx.arc(s.sx, s.sy, 6, 0, Math.PI * 2);
            ctx.fillStyle = getPointColor(i);
            ctx.fill();

            // White inner
            ctx.beginPath();
            ctx.arc(s.sx, s.sy, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();

            // Label
            if (state.showLabels) {
                const label = `P${i + 1} (${fmt(p.x)}, ${fmt(p.y)})`;
                ctx.font = '600 11px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';

                // Background
                const metrics = ctx.measureText(label);
                const lw = metrics.width + 10;
                const lh = 18;
                const lx = s.sx - lw / 2;
                const ly = s.sy - 14 - lh;

                ctx.fillStyle = 'rgba(10, 10, 26, 0.85)';
                ctx.strokeStyle = getPointColor(i) + '60';
                ctx.lineWidth = 1;
                roundRect(ctx, lx, ly, lw, lh, 4);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = getPointColor(i);
                ctx.fillText(label, s.sx, s.sy - 14);
            }
        });

        // Draw area text if calculated
        if (state.area !== null && pts.length >= 3) {
            // Find centroid
            let cx_ = 0, cy_ = 0;
            pts.forEach(p => { cx_ += p.x; cy_ += p.y; });
            cx_ /= pts.length;
            cy_ /= pts.length;
            const centroid = toScreen(cx_, cy_);

            ctx.font = '700 16px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const areaText = `A = ${fmt(state.area)}`;
            const m = ctx.measureText(areaText);
            const bw = m.width + 20;
            const bh = 28;

            ctx.fillStyle = 'rgba(10, 10, 26, 0.9)';
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
            ctx.lineWidth = 1.5;
            roundRect(ctx, centroid.sx - bw / 2, centroid.sy - bh / 2, bw, bh, 6);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#a78bfa';
            ctx.fillText(areaText, centroid.sx, centroid.sy);
        }
    }

    function drawGrid2D(w, h, centerX, centerY, scale, toScreen) {
        // Determine grid spacing
        let gridStep = 1;
        const pixelsPerUnit = scale;
        if (pixelsPerUnit < 20) gridStep = 5;
        if (pixelsPerUnit < 10) gridStep = 10;
        if (pixelsPerUnit > 100) gridStep = 0.5;
        if (pixelsPerUnit > 200) gridStep = 0.25;

        const startX = Math.floor((centerX - w / (2 * scale)) / gridStep) * gridStep;
        const endX = Math.ceil((centerX + w / (2 * scale)) / gridStep) * gridStep;
        const startY = Math.floor((centerY - h / (2 * scale)) / gridStep) * gridStep;
        const endY = Math.ceil((centerY + h / (2 * scale)) / gridStep) * gridStep;

        ctx.strokeStyle = 'rgba(139, 92, 246, 0.06)';
        ctx.lineWidth = 1;

        for (let x = startX; x <= endX; x += gridStep) {
            const s = toScreen(x, 0);
            ctx.beginPath();
            ctx.moveTo(s.sx, 0);
            ctx.lineTo(s.sx, h);
            ctx.stroke();
        }

        for (let y = startY; y <= endY; y += gridStep) {
            const s = toScreen(0, y);
            ctx.beginPath();
            ctx.moveTo(0, s.sy);
            ctx.lineTo(w, s.sy);
            ctx.stroke();
        }

        // Axes
        const origin = toScreen(0, 0);
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.2)';
        ctx.lineWidth = 1.5;

        // X axis
        ctx.beginPath();
        ctx.moveTo(0, origin.sy);
        ctx.lineTo(w, origin.sy);
        ctx.stroke();

        // Y axis
        ctx.beginPath();
        ctx.moveTo(origin.sx, 0);
        ctx.lineTo(origin.sx, h);
        ctx.stroke();

        // Grid labels
        if (state.showLabels) {
            ctx.font = '400 10px "JetBrains Mono", monospace';
            ctx.fillStyle = 'rgba(139, 92, 246, 0.3)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';

            for (let x = startX; x <= endX; x += gridStep) {
                if (Math.abs(x) < 0.001) continue;
                const s = toScreen(x, 0);
                ctx.fillText(fmt(x), s.sx, origin.sy + 5);
            }

            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            for (let y = startY; y <= endY; y += gridStep) {
                if (Math.abs(y) < 0.001) continue;
                const s = toScreen(0, y);
                ctx.fillText(fmt(y), origin.sx - 6, s.sy);
            }
        }
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    // ===== Three.js 3D Rendering =====
    function initThreeJS() {
        const rect = vizContainer.getBoundingClientRect();

        threeScene = new THREE.Scene();

        threeCamera = new THREE.PerspectiveCamera(
            50,
            rect.width / rect.height,
            0.1,
            10000
        );
        threeCamera.position.set(8, 6, 10);

        threeRenderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });
        threeRenderer.setSize(rect.width, rect.height);
        threeRenderer.setPixelRatio(window.devicePixelRatio);
        threeRenderer.setClearColor(0x0a0a1a, 1);
        threeContainer.appendChild(threeRenderer.domElement);

        threeControls = new THREE.OrbitControls(threeCamera, threeRenderer.domElement);
        threeControls.enableDamping = true;
        threeControls.dampingFactor = 0.08;
        threeControls.rotateSpeed = 0.8;
        threeControls.zoomSpeed = 1.2;
        threeControls.panSpeed = 0.8;
        threeControls.minDistance = 2;
        threeControls.maxDistance = 500;

        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x6366f1, 0.3);
        threeScene.add(ambientLight);

        // Directional lights
        const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight1.position.set(5, 10, 5);
        threeScene.add(dirLight1);

        const dirLight2 = new THREE.DirectionalLight(0x8b5cf6, 0.4);
        dirLight2.position.set(-5, -5, -5);
        threeScene.add(dirLight2);

        threeInitialized = true;
    }

    function render3D() {
        if (!threeScene) return;

        // Clear old objects (keep lights)
        const toRemove = [];
        threeScene.traverse(child => {
            if (child.isMesh || child.isLine || child.isSprite || child.isPoints) {
                toRemove.push(child);
            }
        });
        toRemove.forEach(obj => {
            threeScene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });

        const pts = state.points;

        // Draw grid
        if (state.showGrid) {
            drawGrid3D();
        }

        if (pts.length < 2) return;

        // Draw polygon face
        if (pts.length >= 3) {
            // Create filled polygon using triangulation (fan from first vertex)
            const geometry = new THREE.BufferGeometry();
            const vertices = [];
            for (let i = 1; i < pts.length - 1; i++) {
                vertices.push(pts[0].x, pts[0].y, pts[0].z);
                vertices.push(pts[i].x, pts[i].y, pts[i].z);
                vertices.push(pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
            }
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.computeVertexNormals();

            const material = new THREE.MeshPhongMaterial({
                color: 0x8b5cf6,
                transparent: true,
                opacity: 0.25,
                side: THREE.DoubleSide,
                shininess: 80,
            });
            const mesh = new THREE.Mesh(geometry, material);
            threeScene.add(mesh);
        }

        // Draw edges
        const edgeGeometry = new THREE.BufferGeometry();
        const edgeVerts = [];
        for (let i = 0; i < pts.length; i++) {
            const j = (i + 1) % pts.length;
            edgeVerts.push(pts[i].x, pts[i].y, pts[i].z);
            edgeVerts.push(pts[j].x, pts[j].y, pts[j].z);
        }
        edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edgeVerts, 3));
        const edgeMaterial = new THREE.LineBasicMaterial({
            color: 0xa78bfa,
            linewidth: 2,
            transparent: true,
            opacity: 0.8,
        });
        const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        threeScene.add(edgeLines);

        // Draw points
        pts.forEach((p, i) => {
            const sphereGeo = new THREE.SphereGeometry(0.12, 16, 16);
            const color = new THREE.Color(getPointColor(i));
            const sphereMat = new THREE.MeshPhongMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.3,
            });
            const sphere = new THREE.Mesh(sphereGeo, sphereMat);
            sphere.position.set(p.x, p.y, p.z);
            threeScene.add(sphere);

            // Point glow
            const glowGeo = new THREE.SphereGeometry(0.25, 16, 16);
            const glowMat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.15,
            });
            const glowMesh = new THREE.Mesh(glowGeo, glowMat);
            glowMesh.position.set(p.x, p.y, p.z);
            threeScene.add(glowMesh);

            // Label sprite
            if (state.showLabels) {
                const label = createTextSprite(`P${i + 1} (${fmt(p.x)}, ${fmt(p.y)}, ${fmt(p.z)})`, getPointColor(i));
                label.position.set(p.x, p.y + 0.4, p.z);
                threeScene.add(label);
            }
        });

        // Area label at centroid
        if (state.area !== null && pts.length >= 3) {
            let cx = 0, cy = 0, cz = 0;
            pts.forEach(p => { cx += p.x; cy += p.y; cz += p.z; });
            cx /= pts.length; cy /= pts.length; cz /= pts.length;

            const areaLabel = createTextSprite(`A = ${fmt(state.area)}`, '#a78bfa', true);
            areaLabel.position.set(cx, cy + 0.6, cz);
            threeScene.add(areaLabel);
        }
    }

    function drawGrid3D() {
        // ===== Shader-based Infinite Grid =====
        // Uses GLSL to procedurally draw grid lines — no edges, truly infinite
        const gridVertexShader = `
            varying vec3 vWorldPos;
            void main() {
                vec4 worldPos = modelMatrix * vec4(position, 1.0);
                vWorldPos = worldPos.xyz;
                gl_Position = projectionMatrix * viewMatrix * worldPos;
            }
        `;

        const gridFragmentShader = `
            varying vec3 vWorldPos;
            uniform vec3 uCamPos;
            uniform float uTime;

            float gridLine(float coord, float spacing, float width) {
                float wrapped = mod(coord, spacing);
                float dist = min(wrapped, spacing - wrapped);
                float fw = fwidth(coord) * 1.5;
                return 1.0 - smoothstep(width - fw, width + fw, dist);
            }

            void main() {
                float distToCam = length(vWorldPos - uCamPos);

                // Three grid scales with smooth transitions
                float fine   = max(gridLine(vWorldPos.x, 1.0, 0.02), gridLine(vWorldPos.z, 1.0, 0.02));
                float medium = max(gridLine(vWorldPos.x, 5.0, 0.04), gridLine(vWorldPos.z, 5.0, 0.04));
                float coarse = max(gridLine(vWorldPos.x, 25.0, 0.08), gridLine(vWorldPos.z, 25.0, 0.08));

                // Scale visibility by distance — fine fades out first, coarse stays
                float fineFade   = 1.0 - smoothstep(15.0, 80.0, distToCam);
                float medFade    = 1.0 - smoothstep(60.0, 400.0, distToCam);
                float coarseFade = 1.0 - smoothstep(200.0, 1500.0, distToCam);

                float intensity = fine * 0.25 * fineFade
                                + medium * 0.3 * medFade
                                + coarse * 0.35 * coarseFade;

                // Overall distance fade to horizon
                float horizonFade = 1.0 - smoothstep(100.0, 2000.0, distToCam);
                intensity *= horizonFade;

                // Grid color — subtle purple
                vec3 gridColor = vec3(0.30, 0.25, 0.55);

                if (intensity < 0.005) discard;

                gl_FragColor = vec4(gridColor, intensity);
            }
        `;

        // Create a massive plane for the grid
        const planeSize = 10000;
        const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize, 1, 1);
        const gridMat = new THREE.ShaderMaterial({
            vertexShader: gridVertexShader,
            fragmentShader: gridFragmentShader,
            uniforms: {
                uCamPos: { value: threeCamera.position },
                uTime: { value: 0 },
            },
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            extensions: { derivatives: true },
        });
        const gridPlane = new THREE.Mesh(planeGeo, gridMat);
        gridPlane.rotation.x = -Math.PI / 2;
        gridPlane.position.y = -0.01;
        threeScene.add(gridPlane);

        // Axes — extend very far in both directions
        const axesLen = 5000;

        // X axis (rose)
        const xGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-axesLen, 0, 0),
            new THREE.Vector3(axesLen, 0, 0),
        ]);
        const xMat = new THREE.LineBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.5 });
        threeScene.add(new THREE.Line(xGeo, xMat));

        // Y axis (emerald)
        const yGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, -axesLen, 0),
            new THREE.Vector3(0, axesLen, 0),
        ]);
        const yMat = new THREE.LineBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.5 });
        threeScene.add(new THREE.Line(yGeo, yMat));

        // Z axis (sky blue)
        const zGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, -axesLen),
            new THREE.Vector3(0, 0, axesLen),
        ]);
        const zMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.5 });
        threeScene.add(new THREE.Line(zGeo, zMat));

        // Axis labels at visible distance
        if (state.showLabels) {
            const labelDist = 12;

            const xLabel = createTextSprite('X', '#f472b6');
            xLabel.position.set(labelDist, 0, 0);
            threeScene.add(xLabel);

            const yLabel = createTextSprite('Y', '#34d399');
            yLabel.position.set(0, labelDist, 0);
            threeScene.add(yLabel);

            const zLabel = createTextSprite('Z', '#38bdf8');
            zLabel.position.set(0, 0, labelDist);
            threeScene.add(zLabel);
        }
    }

    function createTextSprite(text, color, isLarge = false) {
        const canvas = document.createElement('canvas');
        const size = isLarge ? 512 : 256;
        canvas.width = size;
        canvas.height = isLarge ? 128 : 64;
        const ctx2 = canvas.getContext('2d');

        ctx2.fillStyle = 'rgba(10, 10, 26, 0.85)';
        roundRect2(ctx2, 2, 2, canvas.width - 4, canvas.height - 4, 8);
        ctx2.fill();

        ctx2.strokeStyle = color + '80';
        ctx2.lineWidth = 2;
        roundRect2(ctx2, 2, 2, canvas.width - 4, canvas.height - 4, 8);
        ctx2.stroke();

        ctx2.font = `${isLarge ? '700' : '600'} ${isLarge ? 36 : 24}px Inter, sans-serif`;
        ctx2.textAlign = 'center';
        ctx2.textBaseline = 'middle';
        ctx2.fillStyle = color;
        ctx2.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;

        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(isLarge ? 2 : 1.2, isLarge ? 0.5 : 0.3, 1);
        return sprite;
    }

    function roundRect2(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    function animateThree() {
        if (state.mode !== '3d' || !threeRenderer) return;
        threeAnimId = requestAnimationFrame(animateThree);
        threeControls.update();
        threeRenderer.render(threeScene, threeCamera);
    }

    function resetView() {
        if (state.mode === '2d') {
            render2D();
        } else if (threeCamera && threeControls) {
            threeCamera.position.set(8, 6, 10);
            threeControls.target.set(0, 0, 0);
            threeControls.update();
        }
    }

    // ===== Event Binding =====
    function bindEvents() {
        btn2D.addEventListener('click', () => setMode('2d'));
        btn3D.addEventListener('click', () => setMode('3d'));

        btnAddPoint.addEventListener('click', () => {
            addPointRow();
            // Focus the new x input
            const rows = coordRows.querySelectorAll('.coord-row');
            const lastRow = rows[rows.length - 1];
            lastRow.querySelector('.x-input').focus();
        });

        btnClearAll.addEventListener('click', clearAllPoints);
        btnCalculate.addEventListener('click', calculate);
        btnResetView.addEventListener('click', resetView);

        btnToggleGrid.addEventListener('click', () => {
            state.showGrid = !state.showGrid;
            btnToggleGrid.classList.toggle('active', state.showGrid);
            render();
        });

        btnToggleLabels.addEventListener('click', () => {
            state.showLabels = !state.showLabels;
            btnToggleLabels.classList.toggle('active', state.showLabels);
            render();
        });
    }

    function onResize() {
        if (state.mode === '2d') {
            resizeCanvas2D();
            render2D();
        } else if (state.mode === 'newtheory') {
            const ntState = typeof NewTheory !== 'undefined' ? NewTheory.getState() : { subMode: '2d' };
            if (ntState.subMode === '2d') {
                resizeCanvas2D();
                renderNT();
            } else if (threeRenderer) {
                const rect = vizContainer.getBoundingClientRect();
                threeCamera.aspect = rect.width / rect.height;
                threeCamera.updateProjectionMatrix();
                threeRenderer.setSize(rect.width, rect.height);
                renderNT();
            }
        } else if (threeRenderer) {
            const rect = vizContainer.getBoundingClientRect();
            threeCamera.aspect = rect.width / rect.height;
            threeCamera.updateProjectionMatrix();
            threeRenderer.setSize(rect.width, rect.height);
        }
    }

    // ===== New Theory Functions =====
    function setNTSubMode(subMode) {
        if (typeof NewTheory === 'undefined') return;
        NewTheory.setSubMode(subMode);
        if (subMode === '2d') {
            canvas2D.classList.remove('hidden');
            threeContainer.classList.add('hidden');
            ntBtnView2D.classList.add('active');
            ntBtnView3D.classList.remove('active');
            resizeCanvas2D();
            if (threeAnimId) { cancelAnimationFrame(threeAnimId); threeAnimId = null; }
        } else {
            canvas2D.classList.add('hidden');
            threeContainer.classList.remove('hidden');
            ntBtnView2D.classList.remove('active');
            ntBtnView3D.classList.add('active');
            if (!threeInitialized) initThreeJS();
            else onResize();
            animateNTThree();
        }
        renderNT();
    }

    function renderNT() {
        if (typeof NewTheory === 'undefined') return;
        const ntState = NewTheory.getState();
        if (ntState.subMode === '2d') {
            NewTheory.render2D(ctx, vizContainer.clientWidth, vizContainer.clientHeight);
        } else {
            // Clear scene objects (keep lights and grids)
            const toRemove = [];
            threeScene.traverse(child => {
                if (child.isMesh || child.isLine || child.isSprite || child.isPoints) {
                    if (child.geometry && child.geometry.type === 'PlaneGeometry' && child.geometry.parameters.width === 10000) return; // Keep grid
                    toRemove.push(child);
                }
            });
            toRemove.forEach(obj => {
                threeScene.remove(obj);
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                    else obj.material.dispose();
                }
            });
            NewTheory.render3D(threeScene, threeCamera);
        }
        vizOverlay.classList.add('hidden');
    }

    function animateNTThree() {
        if (state.mode !== 'newtheory' || !threeRenderer) return;
        threeAnimId = requestAnimationFrame(animateNTThree);
        threeControls.update();
        threeRenderer.render(threeScene, threeCamera);
    }

    // ===== Start =====
    document.addEventListener('DOMContentLoaded', init);
})();
