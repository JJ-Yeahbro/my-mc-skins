/**
 * Minecraft 3D Skin Viewer Component
 */
class MinecraftSkinViewer {
    constructor(containerId = 'skin-viewer-container') {
        this.containerId = containerId;
        this.skinViewer = null;
        this.activeAnimation = null;
        this.isDragging = false;
        this.dragTimeout = null;
        
        // Elastic return settings
        this.targetAlpha = Math.PI / 2;
        this.targetBeta = Math.PI / 2;
        this.snapSpeed = 0.08;
        this.autoRotateTime = 0;

        this._injectStyles();
        this._buildMarkup();
    }

    _injectStyles() {
        if (document.getElementById('skin-viewer-styles')) return;

        const styles = `
            #${this.containerId} {
                position: relative;
                width: 400px;
                height: 500px;
                background-color: #000000;
                display: inline-block;
                border-radius: 8px;
                overflow: hidden;
                user-select: none;
            }
            #${this.containerId} canvas {
                width: 100%;
                height: 100%;
                display: block;
                cursor: grab;
            }
            #${this.containerId} canvas:active {
                cursor: grabbing;
            }
            #${this.containerId} .skin-controls {
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 8px;
                background: rgba(20, 20, 20, 0.85);
                padding: 6px 12px;
                border-radius: 30px;
                border: 1px solid #333;
                z-index: 10;
            }
            #${this.containerId} .skin-btn {
                background: #222;
                color: #ccc;
                border: 1px solid #444;
                padding: 6px 12px;
                font-size: 11px;
                font-weight: bold;
                border-radius: 20px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            #${this.containerId} .skin-btn:hover {
                background: #333;
                color: #fff;
                border-color: #666;
            }
            #${this.containerId} .skin-btn.active {
                background: #007acc;
                color: #fff;
                border-color: #0099ff;
                box-shadow: 0 0 8px rgba(0, 122, 204, 0.5);
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

        parent.innerHTML = `
            <canvas class="skin-canvas"></canvas>
            <div class="skin-controls">
                <button class="skin-btn btn-walk active">Walk</button>
                <button class="skin-btn btn-sprint">Sprint</button>
                <button class="skin-btn btn-crouch">Crouch</button>
            </div>
        `;
    }

    _loadEngine() {
        return new Promise((resolve) => {
            if (window.skinview3d) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/skinview3d@0.9.0/bundles/skinview3d.bundle.js';
            script.onload = () => resolve();
            document.head.appendChild(script);
        });
    }

    async display(imageLocation) {
        await this._loadEngine();

        const parent = document.getElementById(this.containerId);
        const canvas = parent.querySelector('.skin-canvas');

        this.skinViewer = new skinview3d.SkinViewer({
            canvas: canvas,
            width: 400,
            height: 500,
            skin: imageLocation
        });

        this.skinViewer.renderer.setClearColor(0x000000, 1.0);
        this.skinViewer.camera.position.z = 18;

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
                    this.autoRotateTime += 0.005;
                    this.skinViewer.playerObject.rotation.y = Math.sin(this.autoRotateTime) * 0.35;
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