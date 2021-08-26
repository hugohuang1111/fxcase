
import { _decorator } from 'cc';
import { BloomBaseStage } from './BloomBaseStage';
const { ccclass, property } = _decorator;
@ccclass('BloomBlurXStage')

export class BloomBlurXStage extends BloomBaseStage {
    constructor() {
        super();
        this._name = "BloomBlurXStage";
    }
}

