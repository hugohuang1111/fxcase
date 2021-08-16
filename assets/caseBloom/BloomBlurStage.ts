
import { _decorator } from 'cc';
import { BloomBaseStage } from './BloomBaseStage';
const { ccclass, property } = _decorator;
@ccclass('BloomBlurStage')
export class BloomBlurStage extends BloomBaseStage {
    constructor() {
        super();
        this._name = "BloomBlurStage";
    }
}

