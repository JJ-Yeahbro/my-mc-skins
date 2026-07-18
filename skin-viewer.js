/**
 * Minecraft 3D Grid Skin Viewer Engine (Patched)
 */
class MinecraftSkinViewer {
    constructor(containerId) {
        this.containerId = containerId;
        this.skinViewer = null;
        this.activeAnimation = null;
        this.isDragging = false;
        this.dragTimeout = null;
        
        this.targetAlpha = Math.PI / 2;
        this.targetBeta = Math.PI / 2;
        this.snapSpeed = 0.08;
        this.autoRotateTime = Math.random() * 100;

        this._injectStyles();
        this._buildMarkup();
    }

    _injectStyles() {
        if (document.getElementById('skin-viewer-styles')) return;

        const styles = `
            .skin-canvas-wrapper {
                position: relative;
                width: 220px;
                height: 300px;
                background-color: #000000;
                border-radius: 6px;
                overflow: hidden;
                user-select: none;
            }
            .skin-canvas-wrapper canvas {
                width: 100%;
                height: 100%;
                display: block;
                cursor: grab;
            }
            .skin-canvas-wrapper canvas:active {
                cursor: grabbing;
            }
            .skin-canvas-wrapper .skin-controls {
                position: absolute;
                bottom: 10px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 5px;
                background: rgba(15, 15, 15, 0.85);
                padding: 4px 8px;
                border-radius: 20px;
                border: 1px solid #222;
                z-index: 10;
                opacity: 0;
                transition: opacity 0.2s ease;
            }
            .skin-canvas-wrapper:hover .skin-controls {
                opacity: 1;
            }
            .skin-canvas-wrapper .skin-btn {
                background: #111;
                color: #888;
                border: 1px solid #333;
                padding: 4px 8px;
                font-size: 9px;
                font-weight: bold;
                border-radius: 12px;
                cursor: pointer;
            }
            .skin-canvas-wrapper .skin-btn.active {
                background: #007acc;
                color: #fff;
                border-color: #0099ff;
            }
        `;

        const styleSheet = document.createElement("style");
        styleSheet.id = 'skin-viewer-styles';
        styleSheet.innerText = styles;
        document.head.appendChild(styleSheet);
    }

    _buildMarkup() {
        const parent = document.getElementById(this.containerId);
        if (!parent) return;

        parent.className = "skin-canvas-wrapper";
        parent.innerHTML = `
            <canvas class="skin-canvas"></canvas>
            <div class="skin-controls">
                <button class="skin-btn btn-walk active">Walk</button>
                <button class="skin-btn btn-sprint">Sprint</button>
                <button class="skin-btn btn-crouch">Crouch</button>
            </div>
        `;
    }

    display(imageLocation) {
        // Ensure the engine library exists globally before mounting canvas
        if (!window.skinview3d) return;

        const parent = document.getElementById(this.containerId);
        const canvas = parent.querySelector('.skin-canvas');

        this.skinViewer = new skinview3d.SkinViewer({
            canvas: canvas,
            width: 220,
            height: 300,
            skin: imageLocation
        });

        this.skinViewer.renderer.setClearColor(0x000000, 1.0);
        this.skinViewer.camera.position.z = 17;

        const orbitControls = skinview3d.createOrbitControls(this.skinViewer);
        orbitControls.enableZoom = false;
        orbitControls.enablePan = false;

        canvas.addEventListener('mousedown', () => { this.isDragging = true; });
        canvas.addEventListener('touchstart', () => { this.isDragging = true; });

        const releaseDrag = () => {
            if (!this.isDragging) return;
            this.dragTimeout = setTimeout(() => { this.isDragging = false; }, 50);
        };

        window.addEventListener('mouseup', releaseDrag);
        window.addEventListener('touchend', releaseDrag);

        this.skinViewer.on('update', () => {
            if (this.isDragging) {
                if (this.dragTimeout) clearTimeout(this.dragTimeout);
            } else {
                orbitControls.alpha += (this.targetAlpha - orbitControls.alpha) * this.snapSpeed;
                orbitControls.beta += (this.targetBeta - orbitControls.beta) * this.snapSpeed;

                if (Math.abs(orbitControls.alpha - this.targetAlpha) < 0.1) {
                    this.autoRotateTime += 0.006;
                    this.skinViewer.playerObject.rotation.y = Math.sin(this.autoRotateTime) * 0.4;
                }
            }
        });

        const walkBtn = parent.querySelector('.btn-walk');
        const sprintBtn = parent.querySelector('.btn-sprint');
        const crouchBtn = parent.querySelector('.btn-crouch');

        walkBtn.addEventListener('click', () => this.setAnimation('walk'));
        sprintBtn.addEventListener('click', () => this.setAnimation('sprint'));
        crouchBtn.addEventListener('click', () => this.setAnimation('crouch'));

        this.setAnimation('walk');
    }

    setAnimation(type) {
        if (!this.skinViewer) return;

        if (this.activeAnimation) {
            this.activeAnimation.remove();
            this.activeAnimation = null;
        }
        this.skinViewer.playerObject.position.y = 0;
        this.skinViewer.playerObject.position.z = 0;

        const parent = document.getElementById(this.containerId);
        parent.querySelectorAll('.skin-btn').forEach(b => b.classList.remove('active'));

        if (type === 'walk') {
            parent.querySelector('.btn-walk').classList.add('active');
            this.activeAnimation = this.skinViewer.animations.add(skinview3d.WalkingAnimation);
            this.activeAnimation.speed = 1.0;
        } 
        else if (type === 'sprint') {
            parent.querySelector('.btn-sprint').classList.add('active');
            this.activeAnimation = this.skinViewer.animations.add(skinview3d.RunningAnimation);
            this.activeAnimation.speed = 1.2;
        } 
        else if (type === 'crouch') {
            parent.querySelector('.btn-crouch').classList.add('active');
            this.skinViewer.playerObject.position.y = -1.5; 
            this.skinViewer.playerObject.position.z = -1;
            this.activeAnimation = this.skinViewer.animations.add(skinview3d.WalkingAnimation);
            this.activeAnimation.speed = 0.55; 
        }
    }
}
