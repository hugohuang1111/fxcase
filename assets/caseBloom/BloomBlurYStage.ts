
import { _decorator } from 'cc';
import { BloomBaseStage } from './BloomBaseStage';
const { ccclass, property } = _decorator;

@ccclass('BloomBlurYStage')
export class BloomBlurYStage extends BloomBaseStage {
    constructor() {
        super();
        this._name = "BloomBlurYStage";
    }
}

