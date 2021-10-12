
import { _decorator, Component, MeshRenderer, gfx, renderer } from 'cc';
const { ccclass, property } = _decorator;

 
@ccclass('Dissolve')
export class Dissolve extends Component {

    @property(MeshRenderer)
    mr: MeshRenderer | null = null;

    private dissolve: boolean = false;
    private dissolve2: boolean = false;

    private dissolveThresholdHandle: number = -1;
    private dissolveThresholdTyeHandle: number = -1;
    private dissolveThreshold: number = 0.0;

    start () {
    }

    update (deltaTime: number) {
        if (this.mr?.materials) {
            let pass = this.mr?.materials[0]?.passes[0];
            if (pass) {
                if (this.dissolve) {
                    this.dissolveThreshold += 0.5 * deltaTime;
                    if (this.dissolveThreshold > 1) {
                        this.dissolveThreshold = 0;
                    }
                }
                this.processPass(pass);
            }

            pass = this.mr?.materials[1]?.passes[0];
            if (pass) {
                this.processPass(pass);
            }

            if (0 == this.dissolveThreshold) {
                this.dissolve = false;
            }
        }
    }

    processPass(pass: renderer.Pass) {
        if (this.dissolve) {
            this.setDissolveThreshold(pass, this.dissolveThreshold);
        } else if (this.dissolve2) {
            this.setDissolveThreshold(pass, this.dissolveThreshold);
        }
    }

    preFetchDissolveThresholdHandle(pass: renderer.Pass) {
        if (-1 == this.dissolveThresholdHandle) {
            this.dissolveThresholdHandle = pass.getHandle('dissolveThreshold')
        }
    }

    preFetchDissolveTypeHandle(pass: renderer.Pass) {
        if (-1 == this.dissolveThresholdTyeHandle) {
            this.dissolveThresholdTyeHandle = pass.getHandle('dissolveOffsetDir', 3, gfx.Type.FLOAT);
        }
    }

    setDissolveThreshold(pass: renderer.Pass, value: number) {
        pass.setUniform(this.dissolveThresholdHandle, value);
        pass.update();
    }

    setFetchDissolveType(pass: renderer.Pass, value: number) {
        pass.setUniform(this.dissolveThresholdTyeHandle, value);
        pass.update();
    }

    onBtnDissolve() {
        this.dissolve = true;

        if (this.mr?.materials) {
            let pass = this.mr?.materials[0]?.passes[0];
            if (pass) {
                this.preFetchDissolveThresholdHandle(pass);
                this.preFetchDissolveTypeHandle(pass);
                this.setFetchDissolveType(pass, 0.0);
            }

            pass = this.mr?.materials[1]?.passes[0];
            if (pass) {
                this.setFetchDissolveType(pass, 0.0);
            }
        }
    }

    onBtnDissolveUp() {
        this.dissolve = true;
        if (this.mr?.materials) {
            let pass = this.mr?.materials[0]?.passes[0];
            if (pass) {
                this.preFetchDissolveThresholdHandle(pass);
                this.preFetchDissolveTypeHandle(pass);
                this.setFetchDissolveType(pass, 1.0);
            }

            pass = this.mr?.materials[1]?.passes[0];
            if (pass) {
                this.setFetchDissolveType(pass, 1.0);
            }
        }
    }

}

