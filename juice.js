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
