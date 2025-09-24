    // ---- Settings ----
    
    const mainBranchSettings = {
      amplitude: 50,
      frequency: 0.003,
      waveSpeed: 0.001,
      minWidth: 5,
      maxWidth: 30,
      profileExponent: 2.0, // higher = tighter to center
    };

    const subBranchSettings = {
      growthSpeed: 0.05,
      maxLength: 150,
      repulsionStrength: 50, // higher = stronger push
      safeDistance: 25,      // distance before branch pushes
      width: 5,
      baseOffsetFactor: 1, // how much to push branch base out by half-thickness
      color: "orange",
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
        this.xIndex = xIndex;   // where along branch it attaches (pixel x)
        this.length = 0;
        this.angleOffset = angleOffset; // offset relative to branch tangent
        this.baseX = 0;
        this.baseY = 0;
        this.endX = 0;
        this.endY = 0;
      }

      update(baseX, baseY, branchPoints) {
        // baseX/Y provided from anchor point before offseting by thickness
        this.baseX = baseX;
        this.baseY = baseY;

        // grow sub branches
        this.length = Math.min(
          this.length + subBranchSettings.growthSpeed,
          subBranchSettings.maxLength
        );

        // get branch tangent at this point
        let tangentAngle = 0;
        const index = this.xIndex;
        if (branchPoints[index + 1] && branchPoints[index - 1]) {
          const dx = branchPoints[index + 1].x - branchPoints[index - 1].x;
          const dy = branchPoints[index + 1].y - branchPoints[index - 1].y;
          tangentAngle = Math.atan2(dy, dx);
        } else if (branchPoints[index + 1]) {
          tangentAngle = Math.atan2(branchPoints[index + 1].y - branchPoints[index].y, branchPoints[index + 1].x - branchPoints[index].x);
        } else if (branchPoints[index - 1]) {
          tangentAngle = Math.atan2(branchPoints[index].y - branchPoints[index - 1].y, branchPoints[index].x - branchPoints[index - 1].x);
        }

        // base branch angle = branch tangent + user offset
        let branchAngle = tangentAngle + this.angleOffset;

        // adjust base by branch thickness (push out along normal)
        const thickness = branchPoints[index] ? branchPoints[index].thickness : (mainBranchSettings.minWidth + mainBranchSettings.maxWidth) / 2;

        // normal (perp of tangent) pointing "outward" (one side)
        const nx = -Math.sin(tangentAngle);
        const ny =  Math.cos(tangentAngle);

        // offset the sub branch so it doesn't start inside the main branch
        const offsetAmount = (thickness / 2) * subBranchSettings.baseOffsetFactor * this.angleOffset;
        this.baseX += nx * offsetAmount;
        this.baseY += ny * offsetAmount;

        // repulsion adjustment (avoid overlapping branch nearby)
        for (let i = -5; i <= 5; i++) {
          const rp = branchPoints[this.xIndex + i];
          if (rp) {
            const dx = rp.x - this.baseX;
            const dy = rp.y - this.baseY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < subBranchSettings.safeDistance) {
              // calculate push away vector
              const awayAngle = Math.atan2(-dy, -dx);
              const influence =
                (1 - dist / subBranchSettings.safeDistance) *
                subBranchSettings.repulsionStrength;

              // blend angle with repulsion
              branchAngle += influence * 0.001 * Math.sin(awayAngle - branchAngle);
            }
          }
        }

        // compute endpoint
        this.endX = this.baseX + this.length * Math.cos(branchAngle);
        this.endY = this.baseY + this.length * Math.sin(branchAngle);
      }

      draw(context) {
        context.beginPath();
        context.moveTo(this.baseX, this.baseY);
        context.lineTo(this.endX, this.endY);

        context.strokeStyle = subBranchSettings.color;
        context.lineCap = "round";
        context.lineWidth = subBranchSettings.width;
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

    function drawbranch() {
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

      // draw branch as many small segments so width can vary smoothly
      for (let i = 0; i < branchPoints.length - 1; i++) {
        const p0 = branchPoints[i];
        const p1 = branchPoints[i + 1];

        context.beginPath();
        context.moveTo(p0.x, p0.y);
        context.lineTo(p1.x, p1.y);
        // average thickness for the segment for smoothness
        // main branch glow
        context.lineWidth = (p0.thickness + p1.thickness) / 2;
        context.strokeStyle = "white";
        context.lineCap = "round";
        context.stroke();
      }

      // update + draw branches
      branches.forEach((branch) => {
        const baseIdx = branch.xIndex;
        const base = branchPoints[baseIdx];
        if (base) {
          branch.update(base.x, base.y, branchPoints);
          branch.draw(context);
        }
      });

      time += mainBranchSettings.waveSpeed;
    }

    function animate() {
      drawbranch();
      requestAnimationFrame(animate);
    }

    animate();

    // Resize handling
    window.addEventListener("resize", () => {
      resizeCanvas();
    });