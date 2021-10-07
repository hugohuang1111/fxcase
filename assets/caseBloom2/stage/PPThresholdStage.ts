
import { _decorator, RenderPipeline } from 'cc';
import { PPBaseStage } from '../../postprocess/PPBaseStage';
import { PPMgr } from '../../postprocess/PPMgr';
const { ccclass } = _decorator;

@ccclass('PPThresholdStage')
export class PPThresholdStage extends PPBaseStage {

    constructor() {
        super();
        this._name = "PPThresholdStage";
    }

    public initWithStageDesc(mgr: PPMgr, pl: RenderPipeline) {
        this.paramTexs = ['screenTex'];
        this.outputTexName = 'tempTex';

        super.initWithStageDesc(mgr, pl);
    }

}
