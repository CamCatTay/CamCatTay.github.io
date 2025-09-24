    // ---- Settings ----
    
    const mainBranchSettings = {
      amplitude: 50,
      frequency: 0.003,
      waveSpeed: 0.005,
      minWidth: 5,
      maxWidth: 30,
      profileExponent: 2.0, // higher = tighter to center
    };

    const subBranchSettings = {
      growthSpeed: 0.3, //default 0.05
      maxLength: 150,
      width: 10,
      baseOffsetFactor: 1, // how much to push branch base out from main branch
      curveFactor: 0.3, // how much branches bow outward (0 = straight)
      curveStretch: 1.5, // stretch the curve along its length
      color: "#f7871eff",
    };

    // ---- Setup Canvas ----

    const canvas = document.getElementById("branchCanvas");
    const context = canvas.getContext("2d");

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resizeCanvas();

    // ---- Main and Sub Branch Logic ----

    let time = 0;
    let branches = [];
    class Branch {
      constructor(xIndex, angleOffset = 0) {
        this.xIndex = xIndex;
        this.length = 0;
        this.angleOffset = angleOffset;
        this.baseX = 0;
        this.baseY = 0;
        this.endX = 0;
        this.endY = 0;
      }

      update(baseX, baseY, branchPoints) {

        this.baseX = baseX;
        // offset the sub branch y position so it doesn't start inside the main branch
        this.baseY = baseY + (branchPoints[this.xIndex] ? branchPoints[this.xIndex].thickness / 2 * subBranchSettings.baseOffsetFactor * this.angleOffset : 0);
        this.length = Math.min(this.length + subBranchSettings.growthSpeed, subBranchSettings.maxLength);

        // tangent angle of main branch
        let tangentAngle = 0;
        if (branchPoints[this.xIndex + 1] && branchPoints[this.xIndex - 1]) {
          const dx = branchPoints[this.xIndex + 1].x - branchPoints[this.xIndex - 1].x;
          const dy = branchPoints[this.xIndex + 1].y - branchPoints[this.xIndex - 1].y;
          tangentAngle = Math.atan2(dy, dx);
        }

        this.branchAngle = tangentAngle + this.angleOffset;
        
        // end point
        this.endX = this.baseX + this.length * Math.cos(this.branchAngle) * subBranchSettings.curveStretch;
        this.endY = this.baseY + this.length * Math.sin(this.branchAngle) * subBranchSettings.curveStretch;

      }

      // draw the branch
      drawSubBranch(context) {
        const midX = (this.baseX + this.endX) / 2;
        const midY = (this.baseY + this.endY) / 2;

        let nx = -Math.sin(this.branchAngle);
        let ny =  Math.cos(this.branchAngle);

        // flip the curve if the branch is growing downward
        if (this.angleOffset > 0) {
          nx *= -1;
          ny *= -1;
        }

        const controlX = midX + nx * this.length * subBranchSettings.curveFactor;
        const controlY = midY + ny * this.length * subBranchSettings.curveFactor;

        context.beginPath();
        context.moveTo(this.baseX, this.baseY);
        context.quadraticCurveTo(controlX, controlY, this.endX, this.endY);

        context.strokeStyle = subBranchSettings.color;
        context.lineWidth = subBranchSettings.width;
        context.lineCap = "round";
        context.stroke();
      }
    }

    // define sub branches here (index, angleOffset)
    branches.push(new Branch(200, -Math.PI / 4));
    branches.push(new Branch(400, Math.PI / 6));
    branches.push(new Branch(600, -Math.PI / 5));

    function thicknessAtX(x) {
      const center = canvas.width / 2;
      const distNorm = Math.abs((x - center) / center); // 0 at center, 1 at edges
      // profileExponent controls sharpness; clamp and invert
      const t = Math.max(0, 1 - Math.pow(distNorm, mainBranchSettings.profileExponent));
      return mainBranchSettings.minWidth + t * (mainBranchSettings.maxWidth - mainBranchSettings.minWidth);
    }

    function drawBranches() {
      context.clearRect(0, 0, canvas.width, canvas.height);

      // build branch points with thickness per x
      let branchPoints = [];
      for (let x = 0; x < canvas.width; x++) {
        const y =
          canvas.height / 2 +
          Math.sin(x * mainBranchSettings.frequency + time) * mainBranchSettings.amplitude;

        const thickness = thicknessAtX(x);
        branchPoints.push({ x, y, thickness });
      }

      // draw sub branches (before main branch so they appear behind)
      branches.forEach(function(branch) {
        const baseIdx = branch.xIndex;
        const base = branchPoints[baseIdx];
        if (base) {
          branch.update(base.x, base.y, branchPoints);
          branch.drawSubBranch(context);
        }
      });

      // draw main branch as many small segments so width can vary smoothly
      for (let i = 0; i < branchPoints.length - 1; i++) {
        const p0 = branchPoints[i];
        const p1 = branchPoints[i + 1];

        context.beginPath();
        context.moveTo(p0.x, p0.y);
        context.lineTo(p1.x, p1.y);
        context.lineWidth = (p0.thickness + p1.thickness) / 2;
        context.strokeStyle = "white";
        context.lineCap = "round";
        context.stroke();
      }

      time += mainBranchSettings.waveSpeed;
    }

    function animate() {
      drawBranches();
      requestAnimationFrame(animate);
    }

    animate();

    // Resize handling
    window.addEventListener("resize", function() {
      resizeCanvas();
    });