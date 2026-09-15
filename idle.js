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
