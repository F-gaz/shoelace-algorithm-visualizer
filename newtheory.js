const NewTheory = (function() {
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);
    
    // ==========================================
    // State & Constants
    // ==========================================
    
    const state = {
        vertices: [{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}],
        slopeAngle: 5,
        slopeDirection: 'W2E',
        zones: [
            {id:1, name:'ที่อยู่อาศัย', icon:'🏠', percent:10, color:'#fbbf24'},
            {id:2, name:'พืชผสม/สวน', icon:'🌿', percent:30, color:'#34d399'},
            {id:3, name:'นาข้าว', icon:'🌾', percent:30, color:'#22d3ee'},
            {id:4, name:'บ่อน้ำ', icon:'💧', percent:30, color:'#6366f1'},
        ],
        subMode: '2d',
        results: null,
        showGrid: true,
        showLabels: true,
        nextZoneId: 5,
    };

    const PRESETS = {
        'ทฤษฎีใหม่': [
            {name:'ที่อยู่อาศัย', icon:'🏠', percent:10, color:'#fbbf24'},
            {name:'พืชผสม/สวน', icon:'🌿', percent:30, color:'#34d399'},
            {name:'นาข้าว', icon:'🌾', percent:30, color:'#22d3ee'},
            {name:'บ่อน้ำ', icon:'💧', percent:30, color:'#6366f1'},
        ],
        'ฟาร์มผสม': [
            {name:'ที่อยู่อาศัย', icon:'🏠', percent:10, color:'#fbbf24'},
            {name:'ที่จอดรถ', icon:'🚗', percent:5, color:'#fb923c'},
            {name:'พืชผสม/สวน', icon:'🌿', percent:25, color:'#34d399'},
            {name:'นาข้าว', icon:'🌾', percent:30, color:'#22d3ee'},
            {name:'บ่อน้ำ', icon:'💧', percent:30, color:'#6366f1'},
        ],
        'เกษตรก้าวหน้า': [
            {name:'ที่อยู่อาศัย', icon:'🏠', percent:10, color:'#fbbf24'},
            {name:'โรงเรือน', icon:'🏭', percent:10, color:'#fb923c'},
            {name:'พืชผสม/สวน', icon:'🌿', percent:20, color:'#34d399'},
            {name:'นาข้าว', icon:'🌾', percent:30, color:'#22d3ee'},
            {name:'บ่อน้ำ', icon:'💧', percent:30, color:'#6366f1'},
        ],
    };

    const LAND_PRESETS = {
        'สี่เหลี่ยมผืนผ้า': [{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}],
        'สี่เหลี่ยมคางหมู': [{x:1,y:0},{x:9,y:0},{x:8,y:6},{x:2,y:6}],
        'สี่เหลี่ยมด้านขนาน': [{x:0,y:0},{x:10,y:0},{x:12,y:6},{x:2,y:6}],
        'ที่ดินเอียง': [{x:0,y:0},{x:12,y:2},{x:10,y:8},{x:1,y:7}],
    };

    const ZONE_PALETTE = [
        '#fbbf24','#34d399','#22d3ee','#6366f1','#f472b6',
        '#fb923c','#a78bfa','#4ade80','#f87171','#38bdf8',
    ];
    const ZONE_ICONS = ['🏠','🌿','🌾','💧','🚗','🏭','🐄','🌳','🏪','🌻','🐔','🐟','🏕️','⛽','🌽'];

    // Helper formatter
    const fmt = (val, dec=2) => Number(val).toLocaleString('en-US', {minimumFractionDigits:dec, maximumFractionDigits:dec});
    const round2 = (val) => Math.round(val * 100) / 100;

    // ==========================================
    // Math & Core Algorithms
    // ==========================================

    function shoelaceArea(vertices) {
        let area = 0;
        const n = vertices.length;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += vertices[i].x * vertices[j].y;
            area -= vertices[j].x * vertices[i].y;
        }
        return Math.abs(area / 2);
    }

    function ensureCCW(vertices) {
        let sum = 0;
        const n = vertices.length;
        for (let i = 0; i < n; i++) {
            const v1 = vertices[i];
            const v2 = vertices[(i + 1) % n];
            sum += (v2.x - v1.x) * (v2.y + v1.y);
        }
        return sum > 0 ? [...vertices].reverse() : [...vertices];
    }

    function getTransform(dir) {
        switch(dir) {
            case 'W2E': return { to: (x,y) => ({u: x, v: y}), from: (u,v) => ({x: u, y: v}) };
            case 'E2W': return { to: (x,y) => ({u: -x, v: y}), from: (u,v) => ({x: -u, y: v}) };
            case 'N2S': return { to: (x,y) => ({u: -y, v: x}), from: (u,v) => ({x: v, y: -u}) };
            case 'S2N': return { to: (x,y) => ({u: y, v: x}), from: (u,v) => ({x: v, y: u}) };
            default: return { to: (x,y) => ({u: x, v: y}), from: (u,v) => ({x: u, y: v}) };
        }
    }

    function getLineEquation(p1, p2) {
        if (Math.abs(p2.u - p1.u) < 1e-9) {
            return { type: 'vertical', u: p1.u, minY: Math.min(p1.v, p2.v), maxY: Math.max(p1.v, p2.v) };
        }
        const m = (p2.v - p1.v) / (p2.u - p1.u);
        const c = p1.v - m * p1.u;
        return { type: 'standard', m, c, minU: Math.min(p1.u, p2.u), maxU: Math.max(p1.u, p2.u) };
    }

    function findBoundsAtU(edges, u) {
        const bounds = [];
        for (const edge of edges) {
            if (edge.type === 'standard' && u >= edge.minU - 1e-9 && u <= edge.maxU + 1e-9) {
                bounds.push(edge.m * u + edge.c);
            }
        }
        bounds.sort((a,b) => a - b);
        if (bounds.length >= 2) {
            return { lower: bounds[0], upper: bounds[bounds.length - 1] };
        }
        return null;
    }

    function getActiveEdges(edges, uStart, uEnd) {
        const active = edges.filter(e => e.type === 'standard' && Math.max(uStart, e.minU) < Math.min(uEnd, e.maxU) + 1e-9);
        if (active.length < 2) return null;
        
        const midU = (uStart + uEnd) / 2;
        const evals = active.map(e => ({ edge: e, v: e.m * midU + e.c }));
        evals.sort((a, b) => a.v - b.v);
        
        return {
            lower: evals[0].edge,
            upper: evals[evals.length - 1].edge
        };
    }

    function computeSegmentArea(mUp, cUp, mLo, cLo, uStart, uEnd) {
        const vStartUp = mUp * uStart + cUp;
        const vStartLo = mLo * uStart + cLo;
        const vEndUp = mUp * uEnd + cUp;
        const vEndLo = mLo * uEnd + cLo;
        
        const h1 = Math.max(0, vStartUp - vStartLo);
        const h2 = Math.max(0, vEndUp - vEndLo);
        const w = uEnd - uStart;
        
        return (h1 + h2) * w / 2;
    }

    function solveForU(mUp, cUp, mLo, cLo, uStart, targetArea) {
        const m = (mUp - mLo) / 2;
        const c = (cUp - cLo) + (mUp - mLo) * uStart;
        
        const A = m;
        const B = cUp - cLo;
        const C = -targetArea;

        if (Math.abs(A) < 1e-9) {
            return uStart + (-C / B);
        }

        const discriminant = B*B - 4*A*C;
        if (discriminant < 0) return uStart;

        const root1 = (-B + Math.sqrt(discriminant)) / (2*A);
        const root2 = (-B - Math.sqrt(discriminant)) / (2*A);

        const du1 = root1;
        const du2 = root2;
        
        if (du1 >= -1e-9 && (A > 0 ? du1 <= du2 : true)) return uStart + du1;
        if (du2 >= -1e-9) return uStart + du2;
        
        return uStart + du1; // fallback
    }

    function computeZoneBoundaries() {
        const verts = ensureCCW(state.vertices);
        const tf = getTransform(state.slopeDirection);
        const tfVerts = verts.map(v => tf.to(v.x, v.y));
        
        const uValues = tfVerts.map(v => v.u).sort((a,b) => a - b);
        const minU = uValues[0];
        const maxU = uValues[uValues.length - 1];

        const edges = [];
        for (let i = 0; i < tfVerts.length; i++) {
            edges.push(getLineEquation(tfVerts[i], tfVerts[(i+1)%tfVerts.length]));
        }

        const breakpoints = [...new Set(uValues.map(u => round2(u)))].sort((a,b) => a - b);
        
        const totalArea = shoelaceArea(verts);
        
        let currentU = minU;
        const results = {
            totalArea,
            zones: []
        };

        const activeZones = state.zones.filter(z => z.percent > 0);
        let currentZoneIdx = 0;
        let currentZoneArea = 0;
        let currentZonePolygons = [];
        
        let currentTargetArea = (activeZones[0]?.percent || 0) / 100 * totalArea;
        let zoneStartU = currentU;

        const slopeRad = state.slopeAngle * Math.PI / 180;
        const zStart = Math.tan(slopeRad) * (maxU - minU);
        
        const getElevation = (u) => zStart - Math.tan(slopeRad) * (u - minU);

        let bpIdx = 0;

        while (currentZoneIdx < activeZones.length && currentU < maxU - 1e-5) {
            const nextBp = breakpoints.find(b => b > currentU + 1e-5) || maxU;
            const segmentEndU = nextBp;
            
            const active = getActiveEdges(edges, currentU, segmentEndU);
            if (!active) {
                currentU = segmentEndU;
                continue;
            }

            const { upper, lower } = active;
            const mUp = upper.m, cUp = upper.c;
            const mLo = lower.m, cLo = lower.c;

            const segmentArea = computeSegmentArea(mUp, cUp, mLo, cLo, currentU, segmentEndU);
            const remainingZoneArea = currentTargetArea - currentZoneArea;

            if (segmentArea <= remainingZoneArea + 1e-5) {
                // Consume entire segment
                currentZoneArea += segmentArea;
                currentU = segmentEndU;
                
                if (Math.abs(currentZoneArea - currentTargetArea) < 1e-5) {
                    // Zone finished exactly at breakpoint
                    finishZone();
                }
            } else {
                // Zone finishes inside this segment
                const uEndZone = solveForU(mUp, cUp, mLo, cLo, currentU, remainingZoneArea);
                currentU = uEndZone;
                finishZone();
            }

            function finishZone() {
                const zone = activeZones[currentZoneIdx];
                const uStart = zoneStartU;
                const uEnd = currentU;
                
                // Build polygon for this zone in UV space
                // Can span multiple breakpoints, so we trace lower bounds then upper bounds backwards
                const zoneUVs = [];
                
                // Collect breakpoints strictly inside [uStart, uEnd]
                const innerBps = breakpoints.filter(b => b > uStart + 1e-5 && b < uEnd - 1e-5);
                const uPoints = [uStart, ...innerBps, uEnd];
                
                // Lower edge (left to right)
                for (let i = 0; i < uPoints.length - 1; i++) {
                    const u1 = uPoints[i];
                    const u2 = uPoints[i+1];
                    const act = getActiveEdges(edges, u1, u2);
                    if (act) {
                        zoneUVs.push({u: u1, v: act.lower.m * u1 + act.lower.c});
                    }
                }
                const lastAct = getActiveEdges(edges, uPoints[uPoints.length-2], uPoints[uPoints.length-1]);
                if (lastAct) zoneUVs.push({u: uEnd, v: lastAct.lower.m * uEnd + lastAct.lower.c});
                
                // Upper edge (right to left)
                for (let i = uPoints.length - 1; i > 0; i--) {
                    const u1 = uPoints[i-1];
                    const u2 = uPoints[i];
                    const act = getActiveEdges(edges, u1, u2);
                    if (act) {
                        zoneUVs.push({u: u2, v: act.upper.m * u2 + act.upper.c});
                    }
                }
                const firstAct = getActiveEdges(edges, uPoints[0], uPoints[1]);
                if (firstAct) zoneUVs.push({u: uStart, v: firstAct.upper.m * uStart + firstAct.upper.c});
                
                // Convert back to XY and compute elevation
                const polygon = zoneUVs.map(uv => {
                    const xy = tf.from(uv.u, uv.v);
                    return { x: xy.x, y: xy.y, z: getElevation(uv.u), u: uv.u, v: uv.v };
                });

                // Remove duplicates
                const cleanPolygon = [];
                for(let p of polygon) {
                    if (cleanPolygon.length === 0 || 
                        Math.hypot(p.x - cleanPolygon[cleanPolygon.length-1].x, p.y - cleanPolygon[cleanPolygon.length-1].y) > 1e-5) {
                        cleanPolygon.push(p);
                    }
                }

                results.zones.push({
                    ...zone,
                    polygon: cleanPolygon,
                    actualArea: currentTargetArea
                });

                currentZoneIdx++;
                currentZoneArea = 0;
                zoneStartU = currentU;
                if (currentZoneIdx < activeZones.length) {
                    currentTargetArea = activeZones[currentZoneIdx].percent / 100 * totalArea;
                }
            }
        }

        // Catch any remaining zone due to floating point
        while (currentZoneIdx < activeZones.length) {
            results.zones.push({
                ...activeZones[currentZoneIdx],
                polygon: [],
                actualArea: 0
            });
            currentZoneIdx++;
        }

        return results;
    }

    // ==========================================
    // UI Management
    // ==========================================

    function renderZoneListUI() {
        const list = $('#nt-zone-list');
        if (!list) return;
        list.innerHTML = '';
        
        state.zones.forEach((zone, idx) => {
            const row = document.createElement('div');
            row.className = 'nt-zone-row flex items-center gap-2 p-2 bg-gray-800 rounded border border-gray-700 mb-2';
            row.dataset.id = zone.id;
            
            row.innerHTML = `
                <span class="nt-zone-drag cursor-grab text-gray-500">⋮⋮</span>
                <span class="nt-zone-icon-display cursor-pointer hover:bg-gray-700 p-1 rounded" title="เปลี่ยนไอคอน">${zone.icon}</span>
                <input class="nt-zone-name-input flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white" value="${zone.name}">
                <input class="nt-zone-pct-input w-16 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white text-right" type="number" value="${zone.percent}" min="0" max="100">
                <span class="nt-zone-pct-symbol text-gray-400">%</span>
                <span class="nt-zone-color-dot w-6 h-6 rounded-full cursor-pointer border border-gray-500 flex-shrink-0" style="background:${zone.color}" title="เปลี่ยนสี"></span>
                <div class="flex flex-col gap-1">
                    <button class="nt-zone-move-btn text-xs text-gray-400 hover:text-white leading-none px-1" data-dir="up" title="ขึ้น">▲</button>
                    <button class="nt-zone-move-btn text-xs text-gray-400 hover:text-white leading-none px-1" data-dir="down" title="ลง">▼</button>
                </div>
                <button class="nt-zone-remove-btn text-red-400 hover:text-red-300 ml-1 px-2 py-1 rounded hover:bg-red-900/30" title="ลบ">✕</button>
            `;

            // Bind events
            row.querySelector('.nt-zone-name-input').addEventListener('change', (e) => {
                zone.name = e.target.value;
                calculateAndRender();
            });
            row.querySelector('.nt-zone-pct-input').addEventListener('change', (e) => {
                zone.percent = parseFloat(e.target.value) || 0;
                updatePercentBar();
                calculateAndRender();
            });
            row.querySelector('.nt-zone-remove-btn').addEventListener('click', () => {
                removeZone(zone.id);
            });
            row.querySelectorAll('.nt-zone-move-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    moveZone(idx, e.target.dataset.dir);
                });
            });
            row.querySelector('.nt-zone-color-dot').addEventListener('click', () => {
                const currentIdx = ZONE_PALETTE.indexOf(zone.color);
                zone.color = ZONE_PALETTE[(currentIdx + 1) % ZONE_PALETTE.length];
                renderZoneListUI();
                calculateAndRender();
            });
            row.querySelector('.nt-zone-icon-display').addEventListener('click', () => {
                const currentIdx = ZONE_ICONS.indexOf(zone.icon);
                zone.icon = ZONE_ICONS[(currentIdx + 1) % ZONE_ICONS.length];
                renderZoneListUI();
                calculateAndRender();
            });

            list.appendChild(row);
        });

        updatePercentBar();
    }

    function moveZone(idx, dir) {
        if (dir === 'up' && idx > 0) {
            const temp = state.zones[idx];
            state.zones[idx] = state.zones[idx-1];
            state.zones[idx-1] = temp;
        } else if (dir === 'down' && idx < state.zones.length - 1) {
            const temp = state.zones[idx];
            state.zones[idx] = state.zones[idx+1];
            state.zones[idx+1] = temp;
        }
        renderZoneListUI();
        calculateAndRender();
    }

    function addZone() {
        const currentTotal = state.zones.reduce((sum, z) => sum + z.percent, 0);
        let rem = 100 - currentTotal;
        if (rem <= 0) rem = 10;

        const color = ZONE_PALETTE[state.zones.length % ZONE_PALETTE.length];
        const icon = '📌';
        
        state.zones.push({
            id: state.nextZoneId++,
            name: 'โซนใหม่',
            icon,
            percent: rem,
            color
        });
        
        renderZoneListUI();
        calculateAndRender();
    }

    function removeZone(id) {
        state.zones = state.zones.filter(z => z.id !== id);
        renderZoneListUI();
        calculateAndRender();
    }

    function updatePercentBar() {
        const total = state.zones.reduce((sum, z) => sum + z.percent, 0);
        const badge = $('#nt-total-pct');
        const warn = $('#nt-pct-warning');
        const bar = $('#nt-pct-bar');
        
        if (badge) badge.textContent = `${total}%`;
        
        if (warn) {
            if (Math.abs(total - 100) > 0.01) {
                warn.classList.remove('hidden');
                badge.className = 'text-sm font-bold text-red-400';
            } else {
                warn.classList.add('hidden');
                badge.className = 'text-sm font-bold text-green-400';
            }
        }

        if (bar) {
            bar.innerHTML = '';
            let acc = 0;
            state.zones.forEach(z => {
                const width = (z.percent / Math.max(100, total)) * 100;
                if (width > 0) {
                    const segment = document.createElement('div');
                    segment.style.width = `${width}%`;
                    segment.style.backgroundColor = z.color;
                    segment.title = `${z.name} (${z.percent}%)`;
                    bar.appendChild(segment);
                }
            });
        }
    }

    function readVerticesFromUI() {
        const newVerts = [];
        for(let i=0; i<4; i++) {
            const vx = parseFloat($(`#nt-vx-${i}`)?.value);
            const vy = parseFloat($(`#nt-vy-${i}`)?.value);
            if (!isNaN(vx) && !isNaN(vy)) {
                newVerts.push({x:vx, y:vy});
            }
        }
        if (newVerts.length === 4) {
            state.vertices = newVerts;
        }
    }

    function readSettingsFromUI() {
        const angle = parseFloat($('#nt-slope-angle')?.value);
        if (!isNaN(angle)) state.slopeAngle = angle;
        
        const dir = $('#nt-slope-dir')?.value;
        if (dir) state.slopeDirection = dir;
    }

    function renderPresets() {
        const grid = $('#nt-preset-grid');
        if (grid) {
            grid.innerHTML = '';
            Object.keys(PRESETS).forEach(key => {
                const btn = document.createElement('button');
                btn.className = 'px-2 py-1 text-xs bg-purple-900/50 hover:bg-purple-700 text-purple-200 border border-purple-500/50 rounded transition-colors';
                btn.textContent = key;
                btn.onclick = () => {
                    state.zones = PRESETS[key].map((p,i) => ({...p, id: state.nextZoneId+i}));
                    state.nextZoneId += PRESETS[key].length;
                    renderZoneListUI();
                    calculateAndRender();
                };
                grid.appendChild(btn);
            });
        }

        // Bind land presets to a select or buttons if requested, standard UI mapping
        const landSelect = $('#nt-land-preset');
        if (landSelect) {
            landSelect.innerHTML = '<option value="">-- เลือกรูปแปลงที่ดิน --</option>';
            Object.keys(LAND_PRESETS).forEach(key => {
                const opt = document.createElement('option');
                opt.value = key;
                opt.textContent = key;
                landSelect.appendChild(opt);
            });
            landSelect.onchange = (e) => {
                const preset = LAND_PRESETS[e.target.value];
                if (preset) {
                    state.vertices = JSON.parse(JSON.stringify(preset));
                    // Update inputs
                    for(let i=0; i<4; i++) {
                        if($(`#nt-vx-${i}`)) $(`#nt-vx-${i}`).value = state.vertices[i].x;
                        if($(`#nt-vy-${i}`)) $(`#nt-vy-${i}`).value = state.vertices[i].y;
                    }
                    calculateAndRender();
                }
            };
        }
    }

    function renderResultsUI(results) {
        const panel = $('#nt-result-panel');
        if (!panel) return;

        const totalAreaEl = $('#nt-total-area');
        if (totalAreaEl) totalAreaEl.textContent = `${fmt(results.totalArea)} ตร.ม.`;

        const zoneCards = $('#nt-zone-results');
        if (zoneCards) {
            zoneCards.innerHTML = '';
            results.zones.forEach(z => {
                if (z.polygon && z.polygon.length > 0) {
                    zoneCards.innerHTML += `
                        <div class="bg-gray-800 p-3 rounded border border-gray-700 flex items-center gap-3">
                            <div class="text-2xl">${z.icon}</div>
                            <div class="flex-1">
                                <div class="font-bold text-white">${z.name}</div>
                                <div class="text-sm text-gray-400">พื้นที่: ${fmt(z.actualArea)} ตร.ม. (${fmt(z.percent)}%)</div>
                            </div>
                            <div class="w-2 h-10 rounded-full" style="background:${z.color}"></div>
                        </div>
                    `;
                }
            });
        }
    }

    // ==========================================
    // Global Event Wiring
    // ==========================================

    function bindEvents() {
        $('#nt-add-zone-btn')?.addEventListener('click', addZone);
        
        ['nt-vx-0','nt-vx-1','nt-vx-2','nt-vx-3','nt-vy-0','nt-vy-1','nt-vy-2','nt-vy-3'].forEach(id => {
            $(`#${id}`)?.addEventListener('change', () => {
                readVerticesFromUI();
                calculateAndRender();
            });
        });

        $('#nt-slope-angle')?.addEventListener('input', () => {
            const valEl = $('#nt-slope-angle-val');
            if (valEl) valEl.textContent = $('#nt-slope-angle').value + '°';
            readSettingsFromUI();
            calculateAndRender();
        });

        $('#nt-slope-dir')?.addEventListener('change', () => {
            readSettingsFromUI();
            calculateAndRender();
        });

        $('#nt-calculate')?.addEventListener('click', () => {
            calculateAndRender();
        });
    }

    // ==========================================
    // 2D Rendering
    // ==========================================

    function render2D(ctx, width, height) {
        if (!state.results) return;
        
        ctx.clearRect(0, 0, width, height);

        const margin = 50;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        state.vertices.forEach(v => {
            minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
            minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
        });

        const dx = maxX - minX || 1;
        const dy = maxY - minY || 1;
        const scaleX = (width - margin * 2) / dx;
        const scaleY = (height - margin * 2) / dy;
        const scale = Math.min(scaleX, scaleY);

        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;

        const toScreen = (x, y) => {
            return {
                x: width / 2 + (x - cx) * scale,
                y: height / 2 - (y - cy) * scale
            };
        };

        // Draw Grid
        if (state.showGrid) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            
            const gridStart = toScreen(minX, minY);
            const gridEnd = toScreen(maxX, maxY);
            const step = scale; 
            
            for (let x = Math.floor(minX); x <= Math.ceil(maxX); x++) {
                const sx = toScreen(x, 0).x;
                ctx.moveTo(sx, 0); ctx.lineTo(sx, height);
            }
            for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
                const sy = toScreen(0, y).y;
                ctx.moveTo(0, sy); ctx.lineTo(width, sy);
            }
            ctx.stroke();
        }

        // Draw Zones
        state.results.zones.forEach(zone => {
            if (!zone.polygon || zone.polygon.length < 3) return;
            
            ctx.beginPath();
            const start = toScreen(zone.polygon[0].x, zone.polygon[0].y);
            ctx.moveTo(start.x, start.y);
            for (let i = 1; i < zone.polygon.length; i++) {
                const p = toScreen(zone.polygon[i].x, zone.polygon[i].y);
                ctx.lineTo(p.x, p.y);
            }
            ctx.closePath();
            
            ctx.fillStyle = zone.color;
            ctx.globalAlpha = 0.5;
            ctx.fill();
            ctx.globalAlpha = 1.0;

            // Dashed zone border
            ctx.strokeStyle = 'rgba(255,255,255,0.8)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        });

        // Draw Outline
        ctx.beginPath();
        const vStart = toScreen(state.vertices[0].x, state.vertices[0].y);
        ctx.moveTo(vStart.x, vStart.y);
        for(let i=1; i<state.vertices.length; i++) {
            const v = toScreen(state.vertices[i].x, state.vertices[i].y);
            ctx.lineTo(v.x, v.y);
        }
        ctx.closePath();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw Labels
        if (state.showLabels) {
            // Zone labels
            state.results.zones.forEach(zone => {
                if (!zone.polygon || zone.polygon.length < 3) return;
                
                let cxZ = 0, cyZ = 0;
                zone.polygon.forEach(p => { cxZ += p.x; cyZ += p.y; });
                cxZ /= zone.polygon.length;
                cyZ /= zone.polygon.length;

                const center = toScreen(cxZ, cyZ);
                
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                ctx.shadowColor = 'black';
                ctx.shadowBlur = 4;
                
                ctx.font = '24px Arial';
                ctx.fillText(zone.icon, center.x, center.y - 15);
                
                ctx.font = 'bold 14px "Sarabun", sans-serif';
                ctx.fillText(zone.name, center.x, center.y + 10);
                
                ctx.font = '12px Arial';
                ctx.fillText(`${fmt(zone.percent)}%`, center.x, center.y + 25);
                
                ctx.shadowBlur = 0;
            });

            // Vertex labels
            state.vertices.forEach((v, i) => {
                const sp = toScreen(v.x, v.y);
                ctx.fillStyle = '#10b981';
                ctx.beginPath(); ctx.arc(sp.x, sp.y, 6, 0, Math.PI*2); ctx.fill();
                
                ctx.fillStyle = '#ffffff';
                ctx.font = '12px Arial';
                ctx.textAlign = 'left';
                ctx.fillText(`V${i}(${fmt(v.x,1)},${fmt(v.y,1)})`, sp.x + 10, sp.y - 10);
            });
        }

        // Draw Slope Compass
        const compassCenter = { x: width - 60, y: height - 60 };
        ctx.beginPath();
        ctx.arc(compassCenter.x, compassCenter.y, 30, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.stroke();
        
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '10px Arial';
        ctx.fillText('N', compassCenter.x, compassCenter.y - 20);
        
        // Arrow based on direction
        let angle = 0;
        if (state.slopeDirection === 'W2E') angle = 0;
        else if (state.slopeDirection === 'S2N') angle = -Math.PI/2;
        else if (state.slopeDirection === 'E2W') angle = Math.PI;
        else if (state.slopeDirection === 'N2S') angle = Math.PI/2;

        ctx.save();
        ctx.translate(compassCenter.x, compassCenter.y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(-15, 0); ctx.lineTo(15, 0);
        ctx.lineTo(10, -5); ctx.moveTo(15, 0); ctx.lineTo(10, 5);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }

    // ==========================================
    // 3D Rendering
    // ==========================================

    function createTextSprite(message, opts={}) {
        const fontface = opts.fontface || 'Sarabun, Arial';
        const fontsize = opts.fontsize || 24;
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 256;
        
        context.font = `bold ${fontsize}px ${fontface}`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        if (opts.bg) {
            context.fillStyle = opts.bg;
            const w = context.measureText(message).width;
            context.roundRect(256 - w/2 - 10, 128 - fontsize/2 - 10, w + 20, fontsize + 20, 8);
            context.fill();
        }
        
        context.fillStyle = opts.color || 'rgba(255, 255, 255, 1.0)';
        context.fillText(message, 256, 128);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(4, 2, 1);
        return sprite;
    }

    function render3D(scene, camera) {
        if (!state.results || typeof THREE === 'undefined') return;

        // Clear existing newtheory objects
        const toRemove = [];
        scene.traverse(child => {
            if (child.userData.isNewTheory) toRemove.push(child);
        });
        toRemove.forEach(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) {
                if(Array.isArray(c.material)) c.material.forEach(m => m.dispose());
                else c.material.dispose();
            }
            scene.remove(c);
        });

        // Add Infinite Grid
        const gridGeo = new THREE.PlaneGeometry(200, 200);
        const gridMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.1 });
        const grid = new THREE.Mesh(gridGeo, gridMat);
        grid.position.z = -0.1;
        grid.userData.isNewTheory = true;
        scene.add(grid);

        // Center calculation
        let cx = 0, cy = 0;
        state.vertices.forEach(v => { cx+=v.x; cy+=v.y; });
        cx /= state.vertices.length;
        cy /= state.vertices.length;

        const ntGroup = new THREE.Group();
        ntGroup.userData.isNewTheory = true;
        ntGroup.position.set(-cx, -cy, 0); // Center to origin
        scene.add(ntGroup);

        // Zones
        state.results.zones.forEach(zone => {
            if (!zone.polygon || zone.polygon.length < 3) return;

            // Geometry
            const shape = new THREE.Shape();
            shape.moveTo(zone.polygon[0].x, zone.polygon[0].y);
            for(let i=1; i<zone.polygon.length; i++) {
                shape.lineTo(zone.polygon[i].x, zone.polygon[i].y);
            }

            // Manually triangulate and set Z
            const positions = [];
            const earcut = THREE.ShapeUtils.triangulateShape(zone.polygon.map(p => new THREE.Vector2(p.x, p.y)), []);
            
            for(let i=0; i<earcut.length; i++) {
                const tri = earcut[i];
                for(let j=0; j<3; j++) {
                    const p = zone.polygon[tri[j]];
                    positions.push(p.x, p.y, p.z);
                }
            }

            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geo.computeVertexNormals();

            const mat = new THREE.MeshPhongMaterial({
                color: zone.color,
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide
            });

            const mesh = new THREE.Mesh(geo, mat);
            ntGroup.add(mesh);

            // Wireframe borders
            const edges = new THREE.EdgesGeometry(geo);
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color: 0xffffff, linewidth: 2}));
            ntGroup.add(line);

            // Labels
            if (state.showLabels) {
                let zx=0, zy=0, zz=0;
                zone.polygon.forEach(p => { zx+=p.x; zy+=p.y; zz+=p.z; });
                const len = zone.polygon.length;
                const sprite = createTextSprite(`${zone.icon} ${zone.name}`, { fontsize: 32 });
                sprite.position.set(zx/len, zy/len, (zz/len) + 1);
                ntGroup.add(sprite);
            }
        });

        // Vertices spheres
        state.vertices.forEach((v, i) => {
            // Find Z for original vertex
            // It was transformed, so let's find the matching polygon vertex in results
            let z = 0;
            for (let zone of state.results.zones) {
                for (let p of zone.polygon) {
                    if (Math.abs(p.x - v.x) < 1e-3 && Math.abs(p.y - v.y) < 1e-3) {
                        z = p.z;
                        break;
                    }
                }
            }

            const sphere = new THREE.Mesh(
                new THREE.SphereGeometry(0.2),
                new THREE.MeshBasicMaterial({color: 0x10b981})
            );
            sphere.position.set(v.x, v.y, z);
            ntGroup.add(sphere);

            if (state.showLabels) {
                const sp = createTextSprite(`V${i}`, { fontsize: 24, bg: 'rgba(0,0,0,0.5)' });
                sp.position.set(v.x, v.y, z + 0.5);
                ntGroup.add(sp);
            }
        });

        // Add Water Flow arrow based on slope direction
        const arrowLen = 5;
        let pDir = new THREE.Vector3(1, 0, 0); // W2E
        if (state.slopeDirection === 'E2W') pDir = new THREE.Vector3(-1, 0, 0);
        if (state.slopeDirection === 'N2S') pDir = new THREE.Vector3(0, -1, 0);
        if (state.slopeDirection === 'S2N') pDir = new THREE.Vector3(0, 1, 0);
        
        // Add downward slope to arrow
        pDir.z = -Math.tan(state.slopeAngle * Math.PI / 180);
        pDir.normalize();

        const arrowHelper = new THREE.ArrowHelper(pDir, new THREE.Vector3(cx, cy, 5), arrowLen, 0x38bdf8, 1, 0.5);
        ntGroup.add(arrowHelper);
    }

    // ==========================================
    // API & Initialization
    // ==========================================

    function calculateAndRender() {
        const success = calculate();
        // Since we don't know the exact global app object, we just dispatch an event 
        // or let the caller decide. Usually, `app.requestRender()` would be called here.
        if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('newtheory-updated'));
        }
        return success;
    }

    function calculate() {
        try {
            readVerticesFromUI();
            readSettingsFromUI();
            
            const totalPct = state.zones.reduce((s, z) => s + z.percent, 0);
            if (Math.abs(totalPct - 100) > 0.01) {
                // We might still calculate, but visually flag it.
            }

            state.results = computeZoneBoundaries();
            renderResultsUI(state.results);
            return true;
        } catch (e) {
            console.error("NewTheory calculate error:", e);
            return false;
        }
    }

    function init() {
        renderPresets();
        renderZoneListUI();
        bindEvents();
        calculate();
    }

    function onActivate() {
        const panel = $('#newtheory-panel');
        if (panel) panel.classList.remove('hidden');
        calculateAndRender();
    }

    function onDeactivate() {
        const panel = $('#newtheory-panel');
        if (panel) panel.classList.add('hidden');
    }

    return {
        init,
        calculate,
        render2D,
        render3D,
        onActivate,
        onDeactivate,
        getState: () => state,
        setSubMode: (m) => { state.subMode = m; calculateAndRender(); },
        addZone,
        removeZone,
    };

})();

if (typeof window !== 'undefined') {
    window.NewTheory = NewTheory;
}
