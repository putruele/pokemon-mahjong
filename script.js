document.addEventListener("DOMContentLoaded", () => {
    const boardEl = document.getElementById("board");
    const tilesLeftEl = document.getElementById("tiles-left");
    const btnRestart = document.getElementById("btn-restart");
    const btnHint = document.getElementById("btn-hint");
    const messageOverlay = document.getElementById("message-overlay");
    const btnPlayAgain = document.getElementById("btn-play-again");
    const messageTitle = document.getElementById("message-title");

    let tiles = [];
    let selectedTile = null;
    let tilesRemaining = 144;
    let comboCount = 0;
    let lastMatchTime = 0;
    let lastAnimTime = 0;
    let lastMeowthTauntTime = 0;
    let meowthTaunting = false;
    let idleLevel = 0;
    let shuffleCount = 2;
    const COMBO_TIMEOUT = 3000;
    
    // Board unit size in pixels (half a tile)
    const UNIT_X = 36; 
    const UNIT_Y = 50;
    const Z_OFFSET = 9; // pixels to shift up/right per layer

    let timerInterval = null;
    let secondsElapsed = 0;

    const layoutSelect = document.getElementById("layout-select");
    const difficultySelect = document.getElementById("difficulty-select");
    const btnShuffle = document.getElementById("btn-shuffle");

    // Initialize game
    initGame();

    btnRestart.addEventListener("click", initGame);
    btnPlayAgain.addEventListener("click", initGame);
    btnShuffle.addEventListener("click", shuffleBoard);
    layoutSelect.addEventListener("change", initGame);
    difficultySelect.addEventListener("change", initGame);

    function initGame() {
        messageOverlay.classList.add("hidden");
        document.getElementById("rocket-overlay").classList.remove("active");
        boardEl.innerHTML = "";
        tiles = [];
        selectedTile = null;
        tilesRemaining = 144;
        comboCount = 0;
        lastMatchTime = Date.now();
        lastMeowthTauntTime = Date.now();
        meowthTaunting = false;
        idleLevel = 0;
        shuffleCount = 2;
        
        btnShuffle.innerText = `Ã¢Å¡Â¡\nMezclar\n(${shuffleCount})`;
        btnShuffle.disabled = false;
        btnShuffle.style.opacity = "1";
        
        // Timer logic
        secondsElapsed = 0;
        document.getElementById("timer").innerText = "00:00";
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            secondsElapsed++;
            let m = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
            let s = (secondsElapsed % 60).toString().padStart(2, '0');
            document.getElementById("timer").innerText = `${m}:${s}`;
            
            // --- IDLE SYSTEM ---
            if (tilesRemaining > 0) {
                const now = Date.now();
                const idleTime = now - Math.max(lastMatchTime, lastMeowthTauntTime);
                
                // Zzz particles every roughly 3 seconds after 15s idle
                if (idleTime > 15000 && Math.random() < 0.3) {
                    spawnZzz();
                }

                // Escalating taunts every 30 seconds
                if (idleTime > 30000 && !meowthTaunting) {
                    meowthTaunting = true;
                    idleLevel++;
                    triggerTeamRocketTaunt(idleLevel);
                }
            }
        }, 1000);

        updateStats();

        const layoutType = layoutSelect.value;
        let layout;
        switch(layoutType) {
            case "wall": layout = generateWall(); break;
            case "temple": layout = generateTemple(); break;
            case "arena": layout = generateArena(); break;
            case "bridge": layout = generateBridge(); break;
            case "butterfly": layout = generateButterfly(); break;
            case "cross": layout = generateCross(); break;
            case "diamond": layout = generateDiamond(); break;
            case "pyramid": layout = generatePyramid(); break;
            case "classic":
            default: layout = generateClassic(); break;
        }

        // Difficulty logic
        const diff = difficultySelect.value;
        let uniqueCount = 36;
        let tileMultiplier = 4;
        if (diff === "easy") {
            uniqueCount = 18;
            tileMultiplier = 8;
        } else if (diff === "hard") {
            uniqueCount = 72;
            tileMultiplier = 2;
        }

        const pokemonIds = getPokemonIds(uniqueCount);
        
        let tileIds = [];
        pokemonIds.forEach(id => {
            for(let k=0; k<tileMultiplier; k++) tileIds.push(id);
        });
        tileIds = shuffle(tileIds);

        let maxX = 0;
        let maxY = 0;
        layout.forEach((pos, i) => {
            if (pos.x > maxX) maxX = pos.x;
            if (pos.y > maxY) maxY = pos.y;
            createTile(pos, tileIds[i], i);
        });

        boardEl.style.width = ((maxX + 2) * UNIT_X) + "px";
        boardEl.style.height = ((maxY + 2) * UNIT_Y) + "px";

        updateTileStates();
        checkWinLose();
    }

    function generateClassic() {
        const layout = [];
        const addRow = (z, y, xStart, xEnd) => {
            for(let x=xStart; x<=xEnd; x+=2) layout.push({z, y, x});
        };
        
        // Z=0 (87 tiles)
        addRow(0, 0, 2, 24);   // 12
        addRow(0, 2, 6, 20);   // 8
        addRow(0, 4, 4, 22);   // 10
        addRow(0, 6, 2, 24);   // 12
        addRow(0, 8, 2, 24);   // 12
        addRow(0, 10, 4, 22);  // 10
        addRow(0, 12, 6, 20);  // 8
        addRow(0, 14, 2, 24);  // 12
        layout.push({z:0, y:7, x:0});  // Head
        layout.push({z:0, y:7, x:26}); // Tail 1
        layout.push({z:0, y:7, x:28}); // Tail 2

        // Z=1 (36 tiles)
        for(let y=2; y<=12; y+=2) addRow(1, y, 8, 18);

        // Z=2 (16 tiles)
        for(let y=4; y<=10; y+=2) addRow(2, y, 10, 16);

        // Z=3 (4 tiles)
        for(let y=6; y<=8; y+=2) addRow(3, y, 12, 14);

        // Z=4 (1 tile) - centered over Z=3 with half-tile offsets
        layout.push({z:4, y:7, x:13});

        return layout;
    }

    function generatePyramid() {
        const layout = [];
        
        // Z = 0 (64 tiles)
        const z0Rows = {
            0: [2,4,6,8,10,12,14,16,18,20],
            2: [2,4,6,8,10,12,14,16,18,20],
            4: [0,2,4,6,8,10,12,14,16,18,20,22],
            6: [0,2,4,6,8,10,12,14,16,18,20,22],
            8: [2,4,6,8,10,12,14,16,18,20],
            10: [2,4,6,8,10,12,14,16,18,20]
        };
        for (let y in z0Rows) {
            z0Rows[y].forEach(x => layout.push({z: 0, y: parseInt(y), x}));
        }

        // Z = 1 (47 tiles)
        const z1Rows = {
            1: [3,5,7,9,11,13,15,17,19],
            3: [3,5,7,9,11,13,15,17,19],
            5: [1,3,5,7,9,11,13,15,17,19,21],
            7: [3,5,7,9,11,13,15,17,19],
            9: [3,5,7,9,11,13,15,17,19]
        };
        for (let y in z1Rows) {
            z1Rows[y].forEach(x => layout.push({z: 1, y: parseInt(y), x}));
        }

        // Z = 2 (24 tiles)
        const z2Rows = {
            2: [6,8,10,12,14,16],
            4: [6,8,10,12,14,16],
            6: [6,8,10,12,14,16],
            8: [6,8,10,12,14,16]
        };
        for (let y in z2Rows) {
            z2Rows[y].forEach(x => layout.push({z: 2, y: parseInt(y), x}));
        }

        // Z = 3 (6 tiles)
        const z3Rows = {
            4: [9,11,13],
            6: [9,11,13]
        };
        for (let y in z3Rows) {
            z3Rows[y].forEach(x => layout.push({z: 3, y: parseInt(y), x}));
        }

        // Z = 4 (2 tiles)
        layout.push({z: 4, y: 5, x: 10}, {z: 4, y: 5, x: 12});

        // Z = 5 (1 tile)
        layout.push({z: 5, y: 5, x: 11});

        return layout;
    }

    function generateWall() {
        const layout = [];
        // Z = 0: 18 cols x 4 rows = 72
        for(let r=0; r<4; r++) {
            for(let c=0; c<18; c++) {
                layout.push({z: 0, y: r*2, x: c*2});
            }
        }
        // Z = 1: 17 cols x 3 rows = 51
        for(let r=0; r<3; r++) {
            for(let c=0; c<17; c++) {
                layout.push({z: 1, y: r*2 + 1, x: c*2 + 1});
            }
        }
        // Z = 2: 16 cols x 1 row = 16
        for(let c=0; c<16; c++) {
            layout.push({z: 2, y: 3, x: c*2 + 2});
        }
        // Z = 3: 5 cols x 1 row = 5
        [13, 15, 17, 19, 21].forEach(x => {
            layout.push({z: 3, y: 3, x: x});
        });
        return layout;
    }

    function generateTemple() {
        const layout = [];
        for(let r=0; r<8; r++) { for(let c=0; c<8; c++) layout.push({z: 0, y: r*2+6, x: c*2+6}); }
        for(let r=0; r<7; r++) { for(let c=0; c<7; c++) layout.push({z: 1, y: r*2+7, x: c*2+7}); }
        for(let r=0; r<4; r++) { for(let c=0; c<4; c++) layout.push({z: 2, y: r*2+10, x: c*2+10}); }
        for(let r=0; r<3; r++) { for(let c=0; c<3; c++) layout.push({z: 3, y: r*2+11, x: c*2+11}); }
        for(let r=0; r<2; r++) { for(let c=0; c<2; c++) layout.push({z: 4, y: r*2+12, x: c*2+12}); }
        layout.push({z: 5, y: 13, x: 12}, {z: 5, y: 13, x: 14});
        return layout;
    }

    function generateArena() {
        const layout = [];
        // Z=0: 10x10 solid, remove inner 6x6 -> 64 tiles
        for(let r=0; r<10; r++) {
            for(let c=0; c<10; c++) {
                if (r>=2 && r<8 && c>=2 && c<8) continue;
                layout.push({z: 0, y: r*2, x: c*2});
            }
        }
        // Z=1: 8x8 solid, remove inner 4x4 -> 48 tiles
        for(let r=0; r<8; r++) {
            for(let c=0; c<8; c++) {
                if (r>=2 && r<6 && c>=2 && c<6) continue;
                layout.push({z: 1, y: r*2+2, x: c*2+2});
            }
        }
        // Z=2: 6x6 solid, remove inner 2x2 -> 32 tiles
        for(let r=0; r<6; r++) {
            for(let c=0; c<6; c++) {
                if (r>=2 && r<4 && c>=2 && c<4) continue;
                layout.push({z: 2, y: r*2+4, x: c*2+4});
            }
        }
        return layout;
    }

    function generateBridge() {
        const layout = [];
        // Z=0
        for(let r=0; r<6; r++) {
            for(let c=0; c<3; c++) {
                layout.push({z: 0, y: r*2, x: c*2}); // left base
                layout.push({z: 0, y: r*2, x: c*2+20}); // right base
            }
        }
        for(let r=0; r<4; r++) {
            for(let c=0; c<7; c++) layout.push({z: 0, y: r*2+2, x: c*2+6}); // water
        }
        // Z=1
        for(let r=0; r<6; r++) {
            for(let c=0; c<3; c++) {
                layout.push({z: 1, y: r*2, x: c*2});
                layout.push({z: 1, y: r*2, x: c*2+20});
            }
        }
        for(let r=0; r<2; r++) {
            for(let c=0; c<7; c++) layout.push({z: 1, y: r*2+4, x: c*2+6}); // bridge bottom
        }
        // Z=2: rails
        for(let r=0; r<2; r++) {
            for(let c=0; c<11; c++) layout.push({z: 2, y: r*2+4, x: c*2+2});
        }
        // Z=3: top
        for(let c=0; c<5; c++) layout.push({z: 3, y: 5, x: c*2+8});
        // Z=4: peaks
        for(let c=0; c<3; c++) layout.push({z: 4, y: 5, x: c*2+10});
        return layout;
    }

    function generateButterfly() {
        const layout = [];
        // Z=0
        for(let r=0; r<8; r++) {
            for(let c=0; c<4; c++) {
                layout.push({z: 0, y: r*2, x: c*2}); // left wing
                layout.push({z: 0, y: r*2, x: c*2+16}); // right wing
            }
        }
        for(let r=0; r<4; r++) {
            for(let c=0; c<4; c++) layout.push({z: 0, y: r*2+4, x: c*2+8}); // body
        }
        // Z=1
        for(let r=0; r<6; r++) {
            for(let c=0; c<3; c++) {
                layout.push({z: 1, y: r*2+2, x: c*2+2});
                layout.push({z: 1, y: r*2+2, x: c*2+16});
            }
        }
        for(let r=0; r<2; r++) {
            for(let c=0; c<2; c++) layout.push({z: 1, y: r*2+6, x: c*2+10});
        }
        // Z=2
        for(let r=0; r<4; r++) {
            for(let c=0; c<2; c++) {
                layout.push({z: 2, y: r*2+4, x: c*2+4});
                layout.push({z: 2, y: r*2+4, x: c*2+16});
            }
        }
        for(let r=0; r<2; r++) {
            for(let c=0; c<2; c++) layout.push({z: 2, y: r*2+6, x: c*2+10});
        }
        // Z=3
        for(let r=0; r<2; r++) {
            for(let c=0; c<2; c++) layout.push({z: 3, y: r*2+6, x: c*2+10});
        }
        return layout;
    }

    function generateCross() {
        const layout = [];
        // Z=0 (100)
        for(let r=0; r<6; r++) { for(let c=0; c<6; c++) layout.push({z: 0, y: r*2+8, x: c*2+8}); } // center 36
        for(let r=0; r<4; r++) { for(let c=0; c<4; c++) layout.push({z: 0, y: r*2, x: c*2+10}); } // top 16
        for(let r=0; r<4; r++) { for(let c=0; c<4; c++) layout.push({z: 0, y: r*2+20, x: c*2+10}); } // bot 16
        for(let r=0; r<4; r++) { for(let c=0; c<4; c++) layout.push({z: 0, y: r*2+10, x: c*2}); } // left 16
        for(let r=0; r<4; r++) { for(let c=0; c<4; c++) layout.push({z: 0, y: r*2+10, x: c*2+20}); } // right 16
        // Z=1 (32)
        for(let r=0; r<4; r++) { for(let c=0; c<4; c++) layout.push({z: 1, y: r*2+10, x: c*2+10}); }
        for(let r=0; r<2; r++) { for(let c=0; c<2; c++) layout.push({z: 1, y: r*2+4, x: c*2+12}); }
        for(let r=0; r<2; r++) { for(let c=0; c<2; c++) layout.push({z: 1, y: r*2+20, x: c*2+12}); }
        for(let r=0; r<2; r++) { for(let c=0; c<2; c++) layout.push({z: 1, y: r*2+12, x: c*2+4}); }
        for(let r=0; r<2; r++) { for(let c=0; c<2; c++) layout.push({z: 1, y: r*2+12, x: c*2+20}); }
        // Z=2 (12)
        for(let r=0; r<2; r++) { for(let c=0; c<2; c++) layout.push({z: 2, y: r*2+12, x: c*2+12}); }
        layout.push({z: 2, y: 6, x: 12}, {z: 2, y: 6, x: 14}); // top
        layout.push({z: 2, y: 20, x: 12}, {z: 2, y: 20, x: 14}); // bot
        layout.push({z: 2, y: 12, x: 6}, {z: 2, y: 14, x: 6}); // left
        layout.push({z: 2, y: 12, x: 20}, {z: 2, y: 14, x: 20}); // right
        return layout;
    }

    function generateDiamond() {
        const layout = [];
        const addRow = (z, y, xStart, count) => {
            for(let c=0; c<count; c++) layout.push({z, y, x: xStart + c*2});
        };
        // Z=0
        addRow(0, 0, 10, 2); addRow(0, 2, 8, 4); addRow(0, 4, 6, 6);
        addRow(0, 6, 4, 8); addRow(0, 8, 2, 10); addRow(0, 10, 0, 12);
        addRow(0, 12, 2, 10); addRow(0, 14, 4, 8); addRow(0, 16, 6, 6);
        addRow(0, 18, 8, 4); addRow(0, 20, 10, 2);
        // Z=1
        addRow(1, 2, 10, 2); addRow(1, 4, 8, 4); addRow(1, 6, 6, 6);
        addRow(1, 8, 4, 8); addRow(1, 10, 2, 10); addRow(1, 12, 4, 8);
        addRow(1, 14, 6, 6); addRow(1, 16, 8, 4); addRow(1, 18, 10, 2);
        // Z=2
        addRow(2, 6, 10, 2); addRow(2, 8, 8, 4); addRow(2, 10, 6, 6);
        addRow(2, 12, 8, 4); addRow(2, 14, 10, 2);
        // Z=3
        addRow(3, 8, 10, 2); addRow(3, 10, 10, 2);
        return layout;
    }

    function getPokemonIds(count = 36) {
        // Get 'count' random unique IDs from original 151
        let ids = [];
        for (let i = 1; i <= 151; i++) {
            ids.push(i);
        }
        ids = shuffle(ids);
        return ids.slice(0, count);
    }

    function shuffle(array) {
        let currentIndex = array.length, randomIndex;
        while (currentIndex !== 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    }

    function createTile(pos, pokemonId, index) {
        const tile = document.createElement("div");
        tile.className = "tile";
        tile.dataset.index = index;
        
        const img = document.createElement("img");
        img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;
        img.alt = `Pokemon ${pokemonId}`;
        tile.appendChild(img);

        // Position calculation
        // Board width ~ 24 units * 30px = 720px. 
        const leftPos = pos.x * UNIT_X - pos.z * Z_OFFSET;
        const topPos = pos.y * UNIT_Y - pos.z * Z_OFFSET;
        
        tile.style.left = leftPos + "px";
        tile.style.top = topPos + "px";
        tile.style.zIndex = pos.z * 100 + pos.y; // Proper overlapping
        tile.style.setProperty('--z', pos.z); // Export Z level to CSS for dynamic lighting/shadows

        boardEl.appendChild(tile);

        tiles.push({
            el: tile,
            id: pokemonId,
            x: pos.x,
            y: pos.y,
            z: pos.z,
            matched: false,
            free: false
        });

        tile.addEventListener("click", () => handleTileClick(index));
    }

    function isFree(t1) {
        let leftBlocked = false;
        let rightBlocked = false;
        let topBlocked = false;

        for (let t2 of tiles) {
            if (t2 === t1 || t2.matched) continue;

            // Check top
            if (t2.z > t1.z) {
                if (t2.x < t1.x + 2 && t2.x + 2 > t1.x &&
                    t2.y < t1.y + 2 && t2.y + 2 > t1.y) {
                    topBlocked = true;
                }
            }

            // Check same layer for left/right
            if (t2.z === t1.z) {
                if (t2.y < t1.y + 2 && t2.y + 2 > t1.y) {
                    // Left check
                    if (t2.x < t1.x && t2.x + 2 >= t1.x) {
                        leftBlocked = true;
                    }
                    // Right check
                    if (t2.x > t1.x && t2.x <= t1.x + 2) {
                        rightBlocked = true;
                    }
                }
            }
        }

        return !topBlocked && (!leftBlocked || !rightBlocked);
    }

    function updateTileStates() {
        tiles.forEach(t => {
            if (t.matched) return;
            
            t.free = isFree(t);
            if (t.free) {
                t.el.classList.remove("blocked");
            } else {
                t.el.classList.add("blocked");
            }
            t.el.classList.remove("hint");
        });
    }

    function handleTileClick(index) {
        const t = tiles[index];
        if (t.matched || !t.free) return;

        // Deselect if already selected
        if (selectedTile === t) {
            t.el.classList.remove("selected");
            selectedTile = null;
            return;
        }

        if (selectedTile == null) {
            // Select first tile
            t.el.classList.add("selected");
            selectedTile = t;
        } else {
            // Check for match
            if (selectedTile.id === t.id) {
                // MATCH!
                
                // Measure how many free tiles exist before the match
                const freeBefore = tiles.filter(tile => !tile.matched && tile.free).length;
                
                t.matched = true;
                selectedTile.matched = true;
                
                // Update states to see what this match unlocked
                updateTileStates();
                const freeAfter = tiles.filter(tile => !tile.matched && tile.free).length;
                
                // We removed 2 free tiles. Any extra free tiles are newly unlocked!
                const tilesUnlocked = freeAfter - (freeBefore - 2);
                
                const difficulty = parseInt(document.getElementById("difficulty-select").value);
                let requiredUnlocks = 3; // Dificil (72)
                if (difficulty === 18) {
                    requiredUnlocks = 5; // Facil: Needs massive structural move
                } else if (difficulty === 36) {
                    requiredUnlocks = 4; // Medio
                }

                // "Good choice" = we unlocked X or more tiles! (A truly strategic move)
                const nowTimestamp = Date.now();
                let doSpecialAnim = (tilesUnlocked >= requiredUnlocks);
                
                if (doSpecialAnim && (nowTimestamp - lastAnimTime < 1000)) {
                    // It's a great move, but we matched too fast, skip repetitive animation!
                    doSpecialAnim = false;
                }
                
                if (doSpecialAnim) {
                    lastAnimTime = nowTimestamp;
                }

                tilesRemaining -= 2;
                updateStats();

                const sel = selectedTile; // save reference for timeout
                selectedTile = null;

                // Handle Combo Logic
                const now = Date.now();
                if (now - lastMatchTime <= COMBO_TIMEOUT) {
                    comboCount++;
                } else {
                    comboCount = 1; // start new combo
                }
                lastMatchTime = now;
                
                // --- VISUAL JUICE ---
                // Spawn particles at center of both tiles
                const rect1 = t.el.getBoundingClientRect();
                const rect2 = sel.el.getBoundingClientRect();
                spawnParticles(rect1.left + rect1.width/2, rect1.top + rect1.height/2);
                spawnParticles(rect2.left + rect2.width/2, rect2.top + rect2.height/2);
                
                // Floating text and screen shake on fast match!
                if (comboCount >= 2) {
                    spawnFloatingCombo(comboCount, rect1.left + rect1.width/2, rect1.top - 20);
                    triggerShake(); // Small shake for every combo hit
                }
                // --------------------

                if (comboCount >= 4) {
                    triggerMegaCombo(comboCount);
                }

                let removeDelay = 300;

                if (doSpecialAnim) {
                    const gifUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${t.id}.gif`;
                    t.el.querySelector("img").src = gifUrl;
                    sel.el.querySelector("img").src = gifUrl;
                    
                    t.el.classList.add("matched-animated");
                    sel.el.classList.add("matched-animated");
                    
                    // Play the PokÃƒÂ©mon's unique cry!
                    const cryAudio = new Audio(`https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${t.id}.ogg`);
                    cryAudio.volume = 0.5;
                    cryAudio.play().catch(e => console.log("Audio prevented by browser:", e));
                    
                    removeDelay = 1700; // wait longer for animation
                } else {
                    t.el.classList.add("matched");
                    sel.el.classList.add("matched");
                }
                
                // Remove from DOM after animation
                setTimeout(() => {
                    t.el.style.display = 'none';
                    if (t.el.parentElement) t.el.parentElement.removeChild(t.el);
                    sel.el.style.display = 'none';
                    if (sel.el.parentElement) sel.el.parentElement.removeChild(sel.el);
                }, removeDelay);

                // Re-evaluate free tiles
                updateTileStates();
                checkWinLose();
            } else {
                // MISMATCH
                selectedTile.el.classList.remove("selected");
                t.el.classList.add("selected");
                selectedTile = t;
            }
        }
    }

    function updateStats() {
        tilesLeftEl.innerText = tilesRemaining;
    }

    function findPairs() {
        const freeTiles = tiles.filter(t => !t.matched && t.free);
        const idMap = {};
        freeTiles.forEach(t => {
            if (!idMap[t.id]) idMap[t.id] = [];
            idMap[t.id].push(t);
        });
        
        const pairs = [];
        for (let id in idMap) {
            const group = idMap[id];
            for (let i = 0; i < Math.floor(group.length / 2); i++) {
                pairs.push([group[i*2], group[i*2 + 1]]);
            }
        }
        return pairs;
    }

    function checkWinLose() {
        const movesLeftEl = document.getElementById("moves-left");

        if (tilesRemaining === 0) {
            triggerEpicWin();
            return;
        }

        const pairs = findPairs();
        if (movesLeftEl) movesLeftEl.innerText = pairs.length;
        
        if (pairs.length === 0) {
            if (timerInterval) clearInterval(timerInterval);
            
            const rocketOverlay = document.getElementById("rocket-overlay");
            if (rocketOverlay) {
                rocketOverlay.classList.add("active");
                setTimeout(() => {
                    rocketOverlay.classList.remove("active");
                    endGame("Ã‚Â¡No hay mÃƒÂ¡s movimientos! GAME OVER.");
                }, 4500);
            } else {
                endGame("Ã‚Â¡No hay mÃƒÂ¡s movimientos! GAME OVER.");
            }
        }
    }

    let winAnimFrame = null;

    function triggerEpicWin() {
        if (timerInterval) clearInterval(timerInterval);
        const winOverlay = document.getElementById("win-overlay");
        const bouncerContainer = document.getElementById("win-bouncers-container");
        const winTime = document.getElementById("win-time");
        const btnWinPlay = document.getElementById("btn-win-play-again");
        
        winTime.innerText = `TIEMPO: ${document.getElementById("timer").innerText}`;
        winOverlay.classList.remove("hidden");
        bouncerContainer.innerHTML = "";
        
        // Setup Bouncers
        let bouncers = [];
        for(let i=0; i<25; i++) {
            let img = document.createElement("img");
            img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${Math.floor(Math.random()*151 + 1)}.gif`;
            img.className = "bouncy-poke";
            bouncerContainer.appendChild(img);
            
            bouncers.push({
                el: img,
                x: Math.random() * (window.innerWidth - 80),
                y: Math.random() * (window.innerHeight - 80),
                vx: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 3 + 2),
                vy: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 3 + 2)
            });
        }
        
        function updateBouncers() {
            bouncers.forEach(b => {
                b.x += b.vx;
                b.y += b.vy;
                if (b.x <= 0 || b.x >= window.innerWidth - 80) b.vx *= -1;
                if (b.y <= 0 || b.y >= window.innerHeight - 80) b.vy *= -1;
                b.el.style.transform = `translate(${b.x}px, ${b.y}px)`;
            });
            winAnimFrame = requestAnimationFrame(updateBouncers);
        }
        updateBouncers();
        
        btnWinPlay.onclick = () => {
            winOverlay.classList.add("hidden");
            cancelAnimationFrame(winAnimFrame);
            initGame();
        };
    }

    function endGame(msg) {
        if (timerInterval) clearInterval(timerInterval);
        messageTitle.innerText = msg;
        messageOverlay.classList.remove("hidden");
    }

    function triggerMegaCombo(count) {
        const body = document.body;
        const thunder = document.getElementById("thunder-overlay");
        const overlay = document.getElementById("combo-overlay");
        const textEl = document.getElementById("combo-text");
        const imgEl = document.getElementById("combo-img");
        
        // Trigger arcade screen shake and thunder flash
        body.classList.add("shake");
        thunder.classList.add("active");
        
        setTimeout(() => {
            body.classList.remove("shake");
            thunder.classList.remove("active");
            
            // List of legendary/cool pokemon IDs
            const bosses = [6, 9, 65, 94, 130, 149, 150];
            const randomBoss = bosses[Math.floor(Math.random() * bosses.length)];
            
            imgEl.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${randomBoss}.gif`;
            textEl.innerText = `${count}X MEGA COMBO!`;
            
            overlay.classList.add("active");
            
            // Reset animations by forcing a reflow
            textEl.classList.remove("anim-text");
            imgEl.classList.remove("anim-slide");
            void textEl.offsetWidth;
            textEl.classList.add("anim-text");
            imgEl.classList.add("anim-slide");
            
            // Hide overlay after animation finishes
            setTimeout(() => {
                overlay.classList.remove("active");
            }, 1600);
        }, 500); // Wait for flash to end before showing combo
    }

    function shuffleBoard() {
        if (tilesRemaining === 0 || shuffleCount <= 0) return;
        
        shuffleCount--;
        const btnShuffle = document.getElementById("btn-shuffle");
        btnShuffle.innerText = `Ã¢Å¡Â¡\nMezclar\n(${shuffleCount})`;
        if (shuffleCount === 0) {
            btnShuffle.disabled = true;
            btnShuffle.style.opacity = "0.5";
        }
        
        // Clear selected tile if any before shuffling
        if (selectedTile) {
            selectedTile.el.classList.remove("selected");
            selectedTile = null;
        }
        
        const body = document.body;
        const thunder = document.getElementById("thunder-overlay");
        const pikachu = document.getElementById("pikachu-thunder");
        const boardEl = document.getElementById("board");
        
        pikachu.classList.add("active");
        body.classList.add("shake");
        thunder.classList.add("active");
        
        // --- VISUAL JUICE: Tornado Shuffle & Shake ---
        boardEl.style.pointerEvents = "none";
        triggerShake();
        const unmatchedTiles = tiles.filter(t => !t.matched);
        const centerX = boardEl.offsetWidth / 2 - 30; // 30 is approx half tile width
        const centerY = boardEl.offsetHeight / 2 - 40; // 40 is approx half tile height
        
        unmatchedTiles.forEach(t => {
            // Save original position
            t.origLeft = t.el.style.left;
            t.origTop = t.el.style.top;
            
            // Suck into center
            t.el.style.left = centerX + "px";
            t.el.style.top = centerY + "px";
            t.el.classList.add("tornado");
        });
        
        // Wait for tornado animation to reach center (600ms)
        setTimeout(() => {
            // Perform the shuffle logic while they are hidden/small
            let valid = false;
            let attempts = 0;
            
            while (!valid && attempts < 1000) {
                let ids = unmatchedTiles.map(t => t.id);
                ids = shuffle(ids);
                unmatchedTiles.forEach((t, i) => { t.id = ids[i]; });
                
                // check if valid
                const pairs = findPairs();
                if (pairs.length > 0) valid = true;
                attempts++;
            }
            
            // Reassign images based on new IDs
            unmatchedTiles.forEach(t => {
                t.el.querySelector("img").src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${t.id}.png`;
            });
            
            // Release the tornado (send them back to their spots)
            unmatchedTiles.forEach(t => {
                t.el.classList.remove("tornado");
                t.el.style.left = t.origLeft;
                t.el.style.top = t.origTop;
            });
            
            updateTileStates();
            checkWinLose(); // updates moves count
        }, 600);
        
        setTimeout(() => {
            pikachu.classList.remove("active");
            body.classList.remove("shake");
            thunder.classList.remove("active");
            boardEl.style.pointerEvents = "auto";
        }, 1200); // Wait for them to fly back out!
    }

    // --- Immersive Zoom on Scroll & Slider ---
    const boardWrapper = document.getElementById("board-wrapper");
    const zoomSlider = document.getElementById("board-zoom");
    
    let isZoomed = false;
    let zoomTimeout;
    let baseScale = parseFloat(zoomSlider.value);
    
    // Apply base scale from slider
    zoomSlider.addEventListener("input", (e) => {
        baseScale = parseFloat(e.target.value);
        if (!isZoomed) {
            // Remove transition when dragging slider for instant feedback
            boardEl.style.transition = "none";
            boardEl.style.transform = `scale(${baseScale})`;
            boardEl.style.transformOrigin = `center center`;
        }
    });

    zoomSlider.addEventListener("change", () => {
        // Restore transition after dragging
        if (!isZoomed) {
            boardEl.style.transition = `transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)`;
        }
    });

    boardWrapper.addEventListener("wheel", (e) => {
        // Prevent default scrolling on the page when zooming
        e.preventDefault();

        // If not already zoomed, calculate the transform origin based on mouse pos
        if (!isZoomed) {
            // Get unscaled coordinates relative to the board
            const rect = boardEl.getBoundingClientRect();
            // Since it's scaled by baseScale, we need to divide by baseScale to get the true origin pixel
            const x = (e.clientX - rect.left) / baseScale;
            const y = (e.clientY - rect.top) / baseScale;
            boardEl.style.transformOrigin = `${x}px ${y}px`;
        }

        // Apply a temporary 40% boost over the current base scale
        boardEl.style.transform = `scale(${baseScale * 1.4})`;
        boardEl.style.transition = `transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)`;
        isZoomed = true;

        if (zoomTimeout) clearTimeout(zoomTimeout);

        // Reset to base scale after 3 seconds
        zoomTimeout = setTimeout(() => {
            boardEl.style.transform = `scale(${baseScale})`;
            // Wait for CSS transition to end before allowing a new origin calculation
            setTimeout(() => { 
                isZoomed = false; 
                // Return origin to center after zoom finishes just in case they use slider
                boardEl.style.transformOrigin = `center center`;
            }, 400);
        }, 3000);
    }, { passive: false });

    function triggerShake() {
        document.body.classList.remove("shake");
        void document.body.offsetWidth;
        document.body.classList.add("shake");
        setTimeout(() => document.body.classList.remove("shake"), 400);
    }

    function spawnParticles(x, y) {
        const numParticles = 12;
        for (let i = 0; i < numParticles; i++) {
            const p = document.createElement("div");
            p.className = "particle";
            p.style.left = x + "px";
            p.style.top = y + "px";
            
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 80 + 40;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            
            document.body.appendChild(p);
            
            requestAnimationFrame(() => {
                p.style.transform = "translate(" + tx + "px, " + ty + "px) scale(0)";
                p.style.opacity = "0";
            });
            
            setTimeout(() => p.remove(), 800);
        }
    }

    function spawnFloatingCombo(comboCount, x, y) {
        if (comboCount < 2) return;
        
        const floaty = document.createElement("div");
        floaty.className = "floating-combo";
        let texts = ["", "", "¡COMBO x2!", "¡RÁFAGA x3!", "¡SÚPER x4!", "¡BRUTAL x5!"];
        floaty.innerText = texts[Math.min(comboCount, texts.length - 1)] || "¡DIOS x" + comboCount + "!";
        
        floaty.style.left = x + "px";
        floaty.style.top = y + "px";
        
        document.body.appendChild(floaty);
        setTimeout(() => floaty.remove(), 1000);
    }


    function spawnZzz() {
        const unmatched = tiles.filter(t => !t.matched && t.free);
        if (unmatched.length === 0) return;
        const target = unmatched[Math.floor(Math.random() * unmatched.length)];
        const rect = target.el.getBoundingClientRect();
        
        const zzz = document.createElement("div");
        zzz.innerText = "Zzz...";
        zzz.className = "zzz-particle";
        zzz.style.left = (rect.left + rect.width/2) + "px";
        zzz.style.top = (rect.top - 10) + "px";
        document.body.appendChild(zzz);
        
        setTimeout(() => zzz.remove(), 2500);
    }

    function triggerTeamRocketTaunt(level) {
        if (level === 1) {
            // Meowth Taunt
            const meowthEl = document.getElementById("meowth-taunt");
            if (meowthEl) {
                meowthEl.style.top = (Math.random() * 60 + 20) + "vh";
                meowthEl.style.left = (Math.random() * 60 + 20) + "vw";
                meowthEl.classList.add("peek");
                
                // Allow interaction
                meowthEl.style.pointerEvents = "auto";
                meowthEl.onclick = () => {
                    meowthEl.classList.add("blast-off");
                    setTimeout(() => {
                        meowthEl.classList.remove("peek");
                        meowthEl.classList.remove("blast-off");
                        meowthEl.style.pointerEvents = "none";
                    }, 1000);
                };

                setTimeout(() => {
                    if (meowthEl.classList.contains("peek") && !meowthEl.classList.contains("blast-off")) {
                        meowthEl.classList.remove("peek");
                        meowthEl.style.pointerEvents = "none";
                    }
                    lastMeowthTauntTime = Date.now();
                    meowthTaunting = false;
                }, 3500);
            }
        } else if (level === 2) {
            // Wobbuffet
            let wobb = document.createElement("img");
            wobb.src = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/202.gif";
            wobb.className = "team-rocket-wobbuffet";
            document.body.appendChild(wobb);
            
            setTimeout(() => {
                wobb.classList.add("peek");
                setTimeout(() => {
                    wobb.classList.remove("peek");
                    setTimeout(() => wobb.remove(), 1000);
                    lastMeowthTauntTime = Date.now();
                    meowthTaunting = false;
                }, 3000);
            }, 100);
        } else if (level === 3) {
            // Jessie & James
            let jj = document.createElement("img");
            jj.src = "https://i.makeagif.com/media/4-04-2014/gUa3XE.gif";
            jj.className = "team-rocket-jj";
            document.body.appendChild(jj);
            
            let jjText = document.createElement("div");
            jjText.innerText = "¡PREPÁRENSE PARA LOS PROBLEMAS!";
            jjText.className = "team-rocket-jj-text";
            document.body.appendChild(jjText);
            
            setTimeout(() => {
                jj.classList.add("peek");
                jjText.classList.add("peek");
                setTimeout(() => {
                    jj.classList.remove("peek");
                    jjText.classList.remove("peek");
                    setTimeout(() => { jj.remove(); jjText.remove(); }, 1000);
                    lastMeowthTauntTime = Date.now();
                    meowthTaunting = false;
                }, 4000);
            }, 100);
        } else {
            // Pay Day Hint
            let coin = document.createElement("div");
            coin.className = "pay-day-coin";
            
            // find a pair
            const pairs = findPairs();
            if (pairs.length > 0) {
                const pair = pairs[0];
                const rect = pair[0].el.getBoundingClientRect();
                coin.style.left = (rect.left + rect.width/2) + "px";
                coin.style.top = (rect.top - 50) + "px";
                document.body.appendChild(coin);
                
                setTimeout(() => {
                    coin.style.transform = "translateY(50px) rotateY(720deg)";
                    pair[0].el.classList.add("hint");
                    pair[1].el.classList.add("hint");
                }, 100);
                
                setTimeout(() => {
                    coin.remove();
                    pair[0].el.classList.remove("hint");
                    pair[1].el.classList.remove("hint");
                    lastMeowthTauntTime = Date.now();
                    meowthTaunting = false;
                }, 3000);
            } else {
                lastMeowthTauntTime = Date.now();
                meowthTaunting = false;
            }
        }
    }

});

