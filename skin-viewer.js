/**
 * Minecraft 3D Grid Skin Viewer Engine (GitHub Pages & Control Patch)
 */
class MinecraftSkinViewer {
    constructor(containerId) {
        this.containerId = containerId;
        this.skinViewer = null;
        this.activeAnimation = null;
        this.isDragging = false;
        this.dragTimeout = null;
        
        // Base targets for front-facing positioning
        this.targetAlpha = 0; 
        this.targetBeta = Math.PI / 2;
        this.snapSpeed = 0.05;
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
                <button class="skin-btn btn-stand">Stand</button>
                <button class="skin-btn btn-walk active">Walk</button>
                <button class="skin-btn btn-sprint">Sprint</button>
                <button class="skin-btn btn-crouch">Crouch</button>
            </div>
        `;
    }

    display(imageLocation) {
        if (!window.skinview3d) return;

        const parent = document.getElementById(this.containerId);
        const canvas = parent.querySelector('.skin-canvas');

        // Create standard skinview3d object instance configuration
        this.skinViewer = new skinview3d.SkinViewer({
            canvas: canvas,
            width: 220,
            height: 300,
            skin: imageLocation
        });

        this.skinViewer.renderer.setClearColor(0x000000, 1.0);
        this.skinViewer.camera.position.z = 17;

        // Correct binding lookup targeting native canvas mouse engine controls
        const orbitControls = this.skinViewer.controls;
        orbitControls.enableZoom = false;
        orbitControls.enablePan = false;

        // Set drag listeners
        canvas.addEventListener('mousedown', () => { this.isDragging = true; });
        canvas.addEventListener('touchstart', () => { this.isDragging = true; });

        const releaseDrag = () => {
            if (!this.isDragging) return;
            if (this.dragTimeout) clearTimeout(this.dragTimeout);
            this.dragTimeout = setTimeout(() => { 
                this.isDragging = false; 
            }, 50);
        };

        window.addEventListener('mouseup', releaseDrag);
        window.addEventListener('touchend', releaseDrag);

        // Frame loop setup logic for gliding back and rotating smoothly
        this.skinViewer.on('update', () => {
            if (!this.isDragging) {
                // Smooth glide transition back to baseline camera view coordinates
                orbitControls.alpha += (this.targetAlpha - orbitControls.alpha) * this.snapSpeed;
                orbitControls.beta += (this.targetBeta - orbitControls.beta) * this.snapSpeed;

                // Only spin the model when the camera angle returns near front center orientation
                if (Math.abs(orbitControls.alpha - this.targetAlpha) < 0.2) {
                    this.autoRotateTime += 0.012;
                    this.skinViewer.playerObject.rotation.y = Math.sin(this.autoRotateTime) * 0.5;
                }
            } else {
                // Clear baseline rotation accumulation while user actively controls tracking orientation
                this.skinViewer.playerObject.rotation.y = 0;
            }
        });

        // Interface triggers map assignment parameters
        const standBtn = parent.querySelector('.btn-stand');
        const walkBtn = parent.querySelector('.btn-walk');
        const sprintBtn = parent.querySelector('.btn-sprint');
        const crouchBtn = parent.querySelector('.btn-crouch');

        standBtn.addEventListener('click', () => this.setAnimation('stand'));
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

        if (type === 'stand') {
            parent.querySelector('.btn-stand').classList.add('active');
            // Clean positional rotation configuration vectors
            this.skinViewer.playerObject.skin.leftArm.rotation.x = 0;
            this.skinViewer.playerObject.skin.rightArm.rotation.x = 0;
            this.skinViewer.playerObject.skin.leftLeg.rotation.x = 0;
            this.skinViewer.playerObject.skin.rightLeg.rotation.x = 0;
        }
        else if (type === 'walk') {
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
